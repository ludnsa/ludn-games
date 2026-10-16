import { MAFIA_CONFIG, MAFIA_NIGHT_ORDER, MAFIA_ROLES } from "@/constants/mafia";
import { shuffleArray } from "@/lib/game/shuffle";
import type {
  MafiaAnnouncement,
  MafiaNightStep,
  MafiaPhase,
  MafiaRole,
  MafiaSettings,
  MafiaTeam,
  MafiaVoteResult,
} from "@/types";

/**
 * قواعد لعبة المافيا — منطق صافي بدون قاعدة بيانات.
 * السيرفر (actions/mafia.ts) يقرأ الحالة، يمررها هنا، ويحفظ النتيجة.
 */

// ---------------------------------------------------------------------
// الإعداد وتوزيع الأدوار
// ---------------------------------------------------------------------

/**
 * خانات المواطنين: كل اللاعبين ناقص المافيا والمحقق والدكتور.
 * الفئات الاختيارية (الساحر، الصحفي…) من صف المواطنين، فكل وحدة تاخذ مكان مواطن عادي —
 * ما تحتاج لاعب زيادة.
 */
export function mafiaTownSlots(maxPlayers: number, mafiaCount: number): number {
  return maxPlayers - mafiaCount - 2;
}

/** عدد المواطنين العاديين حسب الإعداد (خانات المواطنين ناقص الفئات الاختيارية) */
export function mafiaCitizenCount(s: MafiaSettings): number {
  return mafiaTownSlots(s.maxPlayers, s.mafiaCount) - s.optionalRoles.length;
}

/** يرجع رسالة خطأ إذا الإعداد غير صالح، أو null إذا تمام */
export function validateMafiaSettings(s: MafiaSettings): string | null {
  if (s.maxPlayers < MAFIA_CONFIG.MIN_PLAYERS) return `أقل عدد ${MAFIA_CONFIG.MIN_PLAYERS} لاعبين.`;
  if (s.maxPlayers > MAFIA_CONFIG.MAX_PLAYERS) return `أكثر عدد ${MAFIA_CONFIG.MAX_PLAYERS} لاعب.`;
  if (s.mafiaCount < MAFIA_CONFIG.MIN_MAFIA) return `أقل عدد للمافيا ${MAFIA_CONFIG.MIN_MAFIA}.`;
  if (new Set(s.optionalRoles).size !== s.optionalRoles.length) return "كل فئة اختيارية مرة وحدة بس.";
  if (mafiaTownSlots(s.maxPlayers, s.mafiaCount) < MAFIA_CONFIG.MIN_CITIZENS) {
    return `لازم يبقى ${MAFIA_CONFIG.MIN_CITIZENS} مواطنين على الأقل (مع الفئات الاختيارية) — زد عدد اللاعبين أو قلّل المافيا.`;
  }
  if (mafiaCitizenCount(s) < 0) return "الفئات الاختيارية أكثر من المواطنين — زد عدد اللاعبين أو شيل فئة.";
  if (s.mafiaCount >= s.maxPlayers - s.mafiaCount) return "عدد المافيا لازم يكون أقل من باقي اللاعبين.";
  return null;
}

/** أكثر عدد مافيا مسموح لعدد لاعبين وفئات معيّنة */
export function mafiaMaxMafia(maxPlayers: number, optionalCount: number): number {
  const townNeeded = Math.max(MAFIA_CONFIG.MIN_CITIZENS, optionalCount);
  return Math.max(MAFIA_CONFIG.MIN_MAFIA, Math.min(maxPlayers - 2 - townNeeded, Math.ceil(maxPlayers / 2) - 1));
}

/** مجموعة الأدوار مخلوطة وجاهزة للتوزيع على اللاعبين بالترتيب */
export function buildRoleDeck(s: MafiaSettings): MafiaRole[] {
  const deck: MafiaRole[] = ["detective", "doctor", ...s.optionalRoles];
  for (let i = 0; i < s.mafiaCount; i++) deck.push("mafia");
  for (let i = 0; i < mafiaCitizenCount(s); i++) deck.push("citizen");
  return shuffleArray(deck);
}

/**
 * أدوار الليل في هذه اللعبة. تنحسب من الإعداد مرة وحدة وتظل ثابتة
 * حتى لو مات صاحب الدور — عشان التوقيت ما يكشف مين مات.
 */
export function mafiaNightSteps(s: MafiaSettings): MafiaNightStep[] {
  return MAFIA_NIGHT_ORDER.filter((step) => {
    if (step === "doctor" || step === "mafia" || step === "detective") return true;
    return s.optionalRoles.includes(step);
  });
}

// ---------------------------------------------------------------------
// اللاعبون كما يراهم المحرك
// ---------------------------------------------------------------------

export interface EnginePlayer {
  id: string;
  name: string;
  seat: number;
  alive: boolean;
  role: MafiaRole;
  soldierShieldUsed: boolean;
  abilityUsed: boolean;
  suicideTarget: string | null;
  /** آخر واحد اختاره الليلة اللي قبل: الدكتور (حماه) أو المسكت (سكّته) — ما يختارونه ليلتين ورا بعض */
  lastProtected: string | null;
}

export interface EngineAction {
  step: MafiaNightStep;
  actorId: string;
  targetId: string | null;
}

/** قائد المافيا الليلة: يتبادلون الدور كل ليلة بين الأحياء حسب ترتيب الدخول */
export function mafiaLeaderId(players: EnginePlayer[], night: number): string | null {
  const mafia = players
    .filter((p) => p.alive && p.role === "mafia")
    .sort((a, b) => a.seat - b.seat);
  if (mafia.length === 0) return null;
  return mafia[(Math.max(night, 1) - 1) % mafia.length].id;
}

/** هل هذا اللاعب يملك دوراً يتصرف فيه في خطوة الليل الحالية؟ */
/** الفئات اللي يقدر الساحر ياخذ مكانها — لما يموت صاحبها */
export const MAFIA_MAGICIAN_ROLES: readonly MafiaRole[] = ["detective", "doctor", "soldier"] as const;

/**
 * الفئات الفاضية للساحر: فئة موجودة في اللعبة وكل أصحابها ماتوا.
 * يرجع لكل فئة لاعب ميت واحد كان عليها — الساحر "ياخذ مكانه".
 */
export function magicianVacancies(players: EnginePlayer[]): EnginePlayer[] {
  return MAFIA_MAGICIAN_ROLES.flatMap((role) => {
    const holders = players.filter((p) => p.role === role);
    if (holders.length === 0 || holders.some((p) => p.alive)) return [];
    return [holders[0]];
  });
}

/** هل هذا اللاعب يملك دوراً يتصرف فيه في خطوة الليل الحالية؟ */
export function canActOnStep(
  p: EnginePlayer,
  step: MafiaNightStep,
  leaderId: string | null,
  players: EnginePlayer[]
): boolean {
  if (!p.alive || p.role !== step) return false;
  if (step === "mafia") return p.id === leaderId;
  if (step === "journalist") return !p.abilityUsed;
  // الساحر يتصرف بس لو فيه فئة فاضية ياخذ مكانها، وقدرته ما انستخدمت
  if (step === "magician") return !p.abilityUsed && magicianVacancies(players).length > 0;
  return true;
}

/** الأهداف المسموحة لصاحب الدور */
export function allowedTargets(actor: EnginePlayer, step: MafiaNightStep, players: EnginePlayer[]): EnginePlayer[] {
  const alive = players.filter((p) => p.alive);
  switch (step) {
    case "doctor":
      // يقدر يحمي نفسه، بس مو نفس الشخص ليلتين ورا بعض
      return alive.filter((p) => p.id !== actor.lastProtected);
    case "mafia":
      return alive.filter((p) => p.role !== "mafia");
    case "magician":
      // الساحر ما يختار لاعب حي — يختار فئة فاضية (ممثلة بصاحبها الميت)
      return magicianVacancies(players);
    case "silencer":
      // المسكت: غيره، وبس مو نفس اللي سكّته الليلة اللي قبل
      return alive.filter((p) => p.id !== actor.id && p.id !== actor.lastProtected);
    default:
      return alive.filter((p) => p.id !== actor.id);
  }
}

// ---------------------------------------------------------------------
// نتائج الليل
// ---------------------------------------------------------------------

export interface NightResolution {
  deaths: string[];
  announcements: MafiaAnnouncement[];
  shieldUsedBy: string[];
  abilityUsedBy: string[];
  roleChanges: { playerId: string; role: MafiaRole }[];
  /** آخر اختيار للدكتور والمسكت — ينحفظ عشان ما يكررونه الليلة الجاية */
  lastProtected: { actorId: string; targetId: string | null }[];
  notes: { playerId: string; text: string }[];
}

/** مصير ضحية المافيا الليلة — ينعرف أول ما يخلص دور المافيا، لأن الدكتور قبلهم */
export interface MafiaKillOutcome {
  victimId: string | null;
  /** killed = انذبح، saved = الدكتور حماه، shield = درع الجندي أنقذه */
  fate: "killed" | "saved" | "shield" | null;
}

export function mafiaKillOutcome(players: EnginePlayer[], actions: EngineAction[]): MafiaKillOutcome {
  const byId = new Map(players.map((p) => [p.id, p]));
  const aliveActor = (a: EngineAction) => byId.get(a.actorId)?.alive === true;

  const killTargetId = actions.find((a) => a.step === "mafia" && aliveActor(a) && a.targetId)?.targetId ?? null;
  const victim = killTargetId ? byId.get(killTargetId) : undefined;
  if (!victim || !victim.alive) return { victimId: null, fate: null };

  const protectedByDoctor = actions.some(
    (a) => a.step === "doctor" && a.targetId === victim.id && byId.get(a.actorId)?.alive && byId.get(a.actorId)?.role === "doctor"
  );
  if (protectedByDoctor) return { victimId: victim.id, fate: "saved" };
  if (victim.role === "soldier" && !victim.soldierShieldUsed) return { victimId: victim.id, fate: "shield" };
  return { victimId: victim.id, fate: "killed" };
}

export function resolveNight(players: EnginePlayer[], actions: EngineAction[]): NightResolution {
  const byId = new Map(players.map((p) => [p.id, p]));
  const outcome = mafiaKillOutcome(players, actions);
  // ضحية الذبح تكمل دورها تلك الليلة عادي (المحقق يحقق، الصحفي يكشف، الانتحاري يختار)
  const aliveActor = (a: EngineAction) => byId.get(a.actorId)?.alive === true;
  const acts = (step: MafiaNightStep) => actions.filter((a) => a.step === step && aliveActor(a) && a.targetId);

  const out: NightResolution = {
    deaths: [],
    announcements: [],
    shieldUsedBy: [],
    abilityUsedBy: [],
    roleChanges: [],
    lastProtected: [],
    notes: [],
  };

  // الدكتور (ممكن يكونون أكثر من واحد لو الساحر أخذ فئة الدكتور) — نحفظ مين حمى عشان الليلة الجاية
  players
    .filter((p) => p.alive && p.role === "doctor")
    .forEach((doc) => {
      const act = acts("doctor").find((a) => a.actorId === doc.id);
      out.lastProtected.push({ actorId: doc.id, targetId: act?.targetId ?? null });
    });
  players
    .filter((p) => p.alive && p.role === "silencer")
    .forEach((s) => {
      const act = acts("silencer").find((a) => a.actorId === s.id);
      out.lastProtected.push({ actorId: s.id, targetId: act?.targetId ?? null });
    });

  // الذبح (نفس منطق mafiaKillOutcome — مصدر واحد)
  const victim = outcome.victimId ? byId.get(outcome.victimId) : undefined;

  if (!victim || !outcome.fate) {
    out.announcements.push({ kind: "quiet", emoji: "🌙", text: "ليلة هادئة… المافيا ما ذبحوا أحد" });
  } else if (outcome.fate === "saved") {
    out.announcements.push({ kind: "saved", emoji: "💉", text: "حماية ناجحة! الدكتور أنقذ أحد اللاعبين الليلة" });
  } else if (outcome.fate === "shield") {
    out.shieldUsedBy.push(victim.id);
    // الجندي ينكشف اسمه لما ينجو — مكافأة للمواطنين
    out.announcements.push({ kind: "soldier", emoji: "🪖", text: `المافيا حاولوا يذبحون ${victim.name}… بس طلع الجندي ودافع عن نفسه ونجا!` });
  } else {
    out.deaths.push(victim.id);
    out.announcements.push({
      kind: "kill",
      emoji: "🗡️",
      text: `حماية فاشلة… المافيا ذبحوا ${victim.name}`,
      targetId: victim.id,
    });

    // الانتحاري ينفجر بس لو انذبح (مو بالتصويت)، وهدفه يموت حتى لو محمي
    const boomId = victim.role === "suicide" ? victim.suicideTarget : null;
    const boom = boomId ? byId.get(boomId) : undefined;
    if (boom && boom.alive && boom.id !== victim.id) {
      out.deaths.push(boom.id);
      out.announcements.push({
        kind: "bomb",
        emoji: "💣",
        text: `الانتحاري فجّر نفسه وأخذ معه ${boom.name}!`,
        targetId: boom.id,
      });
    }
  }

  // المحقق — النتيجة الخاصة وصلته فوراً، هنا بس الإعلان العام.
  // المحقق الحي دايماً يحقق (لو ما اختار، النظام يختار عنه)، فـ"ما فيه تحقيق" معناها إنه ميت.
  // عشان كذا الحالتين يطلع لهم نفس النص بالضبط: "تحقيق فاشل" — محد يقدر يعرف إنه مات.
  const failed: MafiaAnnouncement = {
    kind: "investigate_miss",
    emoji: "❌",
    text: "تحقيق فاشل… المحقق ما وصل للمافيا الليلة",
  };
  const investigations = acts("detective");
  if (investigations.length === 0) {
    out.announcements.push(failed);
  } else {
    investigations.forEach((a) => {
      const hit = byId.get(a.targetId!)?.role === "mafia";
      out.announcements.push(
        hit ? { kind: "investigate_hit", emoji: "🎯", text: "تحقيق صحيح! المحقق وصل لواحد من المافيا" } : failed
      );
    });
  }

  // الصحفي — يكشف فئة اللاعب كما كانت بداية الليلة
  acts("journalist").forEach((a) => {
    const target = byId.get(a.targetId!);
    if (!target) return;
    const def = MAFIA_ROLES[target.role];
    out.abilityUsedBy.push(a.actorId);
    out.announcements.push({
      kind: "journalist",
      emoji: "📰",
      text: `الصحفي كشف: ${target.name} فئته ${def.label} ${def.emoji}`,
    });
  });

  // الساحر — ياخذ مكان المحقق أو الدكتور أو الجندي اللي مات، بشرط إنه نجا من الليلة.
  // ما يطلع أي إعلان للكل: هو يحاول يقنعهم بدوره وقت النقاش.
  acts("magician").forEach((a) => {
    const magician = byId.get(a.actorId);
    const target = byId.get(a.targetId!);
    if (!magician || !target || !MAFIA_MAGICIAN_ROLES.includes(target.role) || target.alive) return;
    out.abilityUsedBy.push(magician.id);
    if (out.deaths.includes(magician.id)) return;

    const newRole = target.role;
    const def = MAFIA_ROLES[newRole];
    out.roleChanges.push({ playerId: magician.id, role: newRole });
    out.notes.push({
      playerId: magician.id,
      text: `🎩 جاء دورك! صرت ${def.label} ${def.emoji} — ${def.label} الأصلي ودّع الملاعب`,
    });
  });

  // المسكت — اللي اختاره ممنوع من الكلام اليوم (لو مات الليلة، ما له داعي)
  acts("silencer").forEach((a) => {
    const target = byId.get(a.targetId!);
    if (!target || !target.alive || out.deaths.includes(target.id)) return;
    out.announcements.push({
      kind: "silence",
      emoji: "🤐",
      text: `${target.name} ممنوع من الكلام اليوم — إذا تكلم ينقتل!`,
      targetId: target.id,
    });
  });

  return out;
}

/** الممنوع من الكلام اليوم (لو للحين حي) — من إعلانات الصباح */
export function silencedPlayerId(
  announcements: MafiaAnnouncement[] | null | undefined,
  players: { id: string; is_alive: boolean }[]
): string | null {
  const id = (announcements ?? []).find((a) => a.kind === "silence")?.targetId;
  return id && players.some((p) => p.id === id && p.is_alive) ? id : null;
}

// ---------------------------------------------------------------------
// التصويت والفوز
// ---------------------------------------------------------------------

export const MAFIA_SKIP_KEY = "skip";

export function countVotes(votes: { targetId: string | null }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  votes.forEach((v) => {
    const key = v.targetId ?? MAFIA_SKIP_KEY;
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return counts;
}

/** مين صوّت على مين — التصويت مكشوف للكل */
export function groupVoters(votes: { voterId: string; targetId: string | null }[]): Record<string, string[]> {
  const voters: Record<string, string[]> = {};
  votes.forEach((v) => {
    const key = v.targetId ?? MAFIA_SKIP_KEY;
    (voters[key] ??= []).push(v.voterId);
  });
  return voters;
}

/** طلع بالتصويت وهو انتحاري: يطير معه آخر واحد اختاره (لو للحين حي)، وإلا يطلع لحاله */
export function voteBombTarget(players: EnginePlayer[], eliminatedId: string | null): string | null {
  const out = players.find((p) => p.id === eliminatedId);
  if (!out || out.role !== "suicide" || !out.suicideTarget) return null;
  const boom = players.find((p) => p.id === out.suicideTarget);
  return boom && boom.alive && boom.id !== out.id ? boom.id : null;
}

/** الأكثر أصواتاً يعتمد (لاعب أو تخطي). التعادل = محد يطلع. */
export function resolveVotes(counts: Record<string, number>): MafiaVoteResult {
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  if (entries.length === 0) return { eliminatedId: null, reason: "none" };

  const top = Math.max(...entries.map(([, n]) => n));
  const leaders = entries.filter(([, n]) => n === top);
  if (leaders.length > 1) return { eliminatedId: null, reason: "tie" };
  if (leaders[0][0] === MAFIA_SKIP_KEY) return { eliminatedId: null, reason: "skip" };
  return { eliminatedId: leaders[0][0], reason: "player" };
}

/**
 * المواطنين يفوزون إذا ما بقى مافيا، والمافيا يفوزون إذا صاروا أكثر من الباقين.
 * التساوي = فوز المافيا، إلا لو الدكتور حي (يقدر يكسر التعادل بحماية ناجحة) — بشرطين:
 * - مو واحد ضد واحد: التصويت بينهم تعادل دايماً، فما فيه شي يتغير
 * - التساوي ما جا من ذبح ناجح الليلة (nightKill): الدكتور ما حمى، فخلاص انحسمت
 */
export function checkWinner(
  players: { alive: boolean; role: MafiaRole }[],
  opts: { nightKill?: boolean } = {}
): MafiaTeam | null {
  const alive = players.filter((p) => p.alive);
  const mafia = alive.filter((p) => p.role === "mafia").length;
  const rest = alive.length - mafia;
  if (mafia === 0) return "town";
  if (mafia > rest) return "mafia";
  if (mafia === rest) {
    const doctorAlive = alive.some((p) => p.role === "doctor");
    if (!doctorAlive || rest === 1 || opts.nightKill) return "mafia";
  }
  return null;
}

/** حالة اللاعبين لو انطبقت نتائج الليل الحين (الموتى + الساحر اللي أخذ فئة) */
export function playersAfterNight(players: EnginePlayer[], res: NightResolution): { alive: boolean; role: MafiaRole }[] {
  return players.map((p) => ({
    alive: p.alive && !res.deaths.includes(p.id),
    role: res.roleChanges.find((c) => c.playerId === p.id)?.role ?? p.role,
  }));
}

export type MafiaNightShortcut = { kind: "end"; winner: MafiaTeam; resolution: NightResolution } | null;

/**
 * الحسم بالليل (يُستدعى بعد ما يخلص دور المافيا أو أي دور بعده):
 * لو نتيجة الليل تحسم اللعبة، ننهيها على طول بدون باقي الأدوار وبدون صباح.
 * إلا لو فيه دور باقي ممكن يغيّر النتيجة — نكمل الليل بترتيبه العادي (ولا نتخطى أي دور،
 * حتى أدوار الموتى، عشان محد يعرف مين حي)، ونفحص من جديد بعد كل دور:
 * - الانتحاري المذبوح: يختار هدفه الليلة (الضحية يكمل دوره)، وانفجاره ممكن يطلّع آخر مافيا.
 * - الساحر: لو المافيا فايزين بالتعادل، ممكن يصير دكتور ويكسره.
 */
export function mafiaNightShortcut(
  players: EnginePlayer[],
  actions: EngineAction[],
  remaining: MafiaNightStep[]
): MafiaNightShortcut {
  const resolution = resolveNight(players, actions);
  const outcome = mafiaKillOutcome(players, actions);
  const nightKill = outcome.fate === "killed";
  const winner = checkWinner(playersAfterNight(players, resolution), { nightKill });
  if (!winner) return null;

  const pending = new Set<MafiaNightStep>();
  const victim = players.find((p) => p.id === outcome.victimId);
  if (nightKill && victim?.role === "suicide") pending.add("suicide");
  // بعد ذبح ناجح، الساحر لو صار دكتور ما ينفع (التساوي من ذبح = انحسمت)
  if (
    winner === "mafia" &&
    !nightKill &&
    players.some((p) => p.alive && p.role === "magician" && !p.abilityUsed && !resolution.deaths.includes(p.id)) &&
    magicianVacancies(players).some((v) => v.role === "doctor")
  ) {
    pending.add("magician");
  }

  return remaining.some((s) => pending.has(s)) ? null : { kind: "end", winner, resolution };
}

// ---------------------------------------------------------------------
// مدد المراحل
// ---------------------------------------------------------------------

export function mafiaPhaseSeconds(phase: MafiaPhase): number | null {
  switch (phase) {
    case "reveal":
      return MAFIA_CONFIG.ROLE_REVEAL_SECONDS;
    case "night_done":
      return MAFIA_CONFIG.NIGHT_DONE_SECONDS;
    case "discussion":
      return MAFIA_CONFIG.DISCUSSION_SECONDS;
    case "voting":
      return MAFIA_CONFIG.VOTING_SECONDS;
    case "vote_result":
      return MAFIA_CONFIG.VOTE_RESULT_SECONDS;
    default:
      return null;
  }
}

export function mafiaDeadline(phase: MafiaPhase, from = Date.now(), settings?: MafiaSettings): string | null {
  const secs =
    phase === "discussion" ? (settings?.discussionSeconds ?? MAFIA_CONFIG.DISCUSSION_SECONDS) : mafiaPhaseSeconds(phase);
  // null أو 0 = بدون مؤقت (الصباح، والنقاش المفتوح) — المنشئ هو اللي يكمّل
  return !secs ? null : new Date(from + secs * 1000).toISOString();
}

/**
 * لو قائد المافيا ما اختار: الاسم اللي عليه اقتراحات أكثر من زملائه،
 * وإذا تعادلوا عشوائي بينهم، وإذا ما فيه اقتراح يرجع null (والنظام يختار عشوائي).
 */
export function pickMafiaSuggestion(suggestedTargetIds: string[], allowedIds: Set<string>): string | null {
  const counts = new Map<string, number>();
  suggestedTargetIds
    .filter((id) => allowedIds.has(id))
    .forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
  if (counts.size === 0) return null;
  const top = Math.max(...counts.values());
  return pickRandom([...counts.entries()].filter(([, n]) => n === top).map(([id]) => id));
}

/** اختيار عشوائي لبوت، وأحياناً ما يختار أحد */
export function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}
