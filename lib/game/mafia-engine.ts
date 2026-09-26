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

/** عدد المواطنين العاديين حسب الإعداد (الباقي بعد كل الفئات الخاصة) */
export function mafiaCitizenCount(s: MafiaSettings): number {
  return s.maxPlayers - s.mafiaCount - 2 - s.optionalRoles.length;
}

/** يرجع رسالة خطأ إذا الإعداد غير صالح، أو null إذا تمام */
export function validateMafiaSettings(s: MafiaSettings): string | null {
  if (s.maxPlayers < MAFIA_CONFIG.MIN_PLAYERS) return `أقل عدد ${MAFIA_CONFIG.MIN_PLAYERS} لاعبين.`;
  if (s.maxPlayers > MAFIA_CONFIG.MAX_PLAYERS) return `أكثر عدد ${MAFIA_CONFIG.MAX_PLAYERS} لاعب.`;
  if (s.mafiaCount < MAFIA_CONFIG.MIN_MAFIA) return `أقل عدد للمافيا ${MAFIA_CONFIG.MIN_MAFIA}.`;
  if (new Set(s.optionalRoles).size !== s.optionalRoles.length) return "كل فئة اختيارية مرة وحدة بس.";
  if (mafiaCitizenCount(s) < MAFIA_CONFIG.MIN_CITIZENS) {
    return `لازم يبقى ${MAFIA_CONFIG.MIN_CITIZENS} مواطنين على الأقل — زد عدد اللاعبين أو قلّل الفئات.`;
  }
  if (s.mafiaCount >= s.maxPlayers - s.mafiaCount) return "عدد المافيا لازم يكون أقل من باقي اللاعبين.";
  return null;
}

/** أكثر عدد مافيا مسموح لعدد لاعبين وفئات معيّنة */
export function mafiaMaxMafia(maxPlayers: number, optionalCount: number): number {
  return Math.max(
    MAFIA_CONFIG.MIN_MAFIA,
    Math.min(maxPlayers - 2 - optionalCount - MAFIA_CONFIG.MIN_CITIZENS, Math.ceil(maxPlayers / 2) - 1)
  );
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
export function canActOnStep(p: EnginePlayer, step: MafiaNightStep, leaderId: string | null): boolean {
  if (!p.alive || p.role !== step) return false;
  if (step === "mafia") return p.id === leaderId;
  if (step === "magician" || step === "journalist") return !p.abilityUsed;
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
  lastProtected: { doctorId: string; targetId: string | null }[];
  notes: { playerId: string; text: string }[];
}

export function resolveNight(players: EnginePlayer[], actions: EngineAction[]): NightResolution {
  const byId = new Map(players.map((p) => [p.id, p]));
  const aliveActor = (a: EngineAction) => byId.get(a.actorId)?.alive === true;
  const acts = (step: MafiaNightStep) => actions.filter((a) => a.step === step && aliveActor(a) && a.targetId);
  const name = (id: string) => byId.get(id)?.name ?? "لاعب";

  const out: NightResolution = {
    deaths: [],
    announcements: [],
    shieldUsedBy: [],
    abilityUsedBy: [],
    roleChanges: [],
    lastProtected: [],
    notes: [],
  };

  // الدكتور (ممكن يكونون أكثر من واحد لو الساحر أخذ فئة الدكتور)
  const protectedIds = new Set<string>();
  players
    .filter((p) => p.alive && p.role === "doctor")
    .forEach((doc) => {
      const act = acts("doctor").find((a) => a.actorId === doc.id);
      if (act?.targetId) protectedIds.add(act.targetId);
      out.lastProtected.push({ doctorId: doc.id, targetId: act?.targetId ?? null });
    });

  // الذبح
  const killTargetId = acts("mafia")[0]?.targetId ?? null;
  const victim = killTargetId ? byId.get(killTargetId) : undefined;

  if (!victim || !victim.alive) {
    out.announcements.push({ kind: "quiet", emoji: "🌙", text: "ليلة هادئة… المافيا ما ذبحوا أحد" });
  } else if (protectedIds.has(victim.id)) {
    out.announcements.push({ kind: "saved", emoji: "✨", text: "حماية ناجحة! الدكتور أنقذ أحد اللاعبين الليلة" });
  } else if (victim.role === "soldier" && !victim.soldierShieldUsed) {
    out.shieldUsedBy.push(victim.id);
    // الجندي ينكشف اسمه لما ينجو — مكافأة للمواطنين
    out.announcements.push({ kind: "soldier", emoji: "🪖", text: `المافيا حاولوا يذبحون ${victim.name}… بس طلع الجندي ودافع عن نفسه ونجا!` });
  } else {
    out.deaths.push(victim.id);
    out.announcements.push({ kind: "kill", emoji: "🗡️", text: `حماية فاشلة… المافيا ذبحوا ${victim.name}` });

    // الانتحاري ينفجر بس لو انذبح (مو بالتصويت)، وهدفه يموت حتى لو محمي
    const boomId = victim.role === "suicide" ? victim.suicideTarget : null;
    const boom = boomId ? byId.get(boomId) : undefined;
    if (boom && boom.alive && boom.id !== victim.id) {
      out.deaths.push(boom.id);
      out.announcements.push({
        kind: "bomb",
        emoji: "💣",
        text: `الانتحاري فجّر نفسه وأخذ معه ${boom.name}!`,
      });
    }
  }

  // المحقق — النتيجة الخاصة وصلته فوراً، هنا بس الإعلان العام
  const investigations = acts("detective");
  if (investigations.length === 0) {
    out.announcements.push({ kind: "investigate_none", emoji: "🔍", text: "المحقق ما حقق مع أحد الليلة" });
  } else {
    investigations.forEach((a) => {
      const hit = byId.get(a.targetId!)?.role === "mafia";
      out.announcements.push(
        hit
          ? { kind: "investigate_hit", emoji: "🎯", text: "تحقيق صحيح! المحقق وصل لواحد من المافيا" }
          : { kind: "investigate_miss", emoji: "❌", text: "تحقيق خاطئ… اللي حقق معه المحقق مو مافيا" }
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

  // الساحر — ياخذ فئة الهدف، بشرط إنه نجا من الليلة
  acts("magician").forEach((a) => {
    const magician = byId.get(a.actorId);
    const target = byId.get(a.targetId!);
    if (!magician || !target) return;
    out.abilityUsedBy.push(magician.id);
    if (out.deaths.includes(magician.id)) return;

    const newRole = target.role;
    out.roleChanges.push({ playerId: magician.id, role: newRole });
    out.announcements.push({ kind: "magic", emoji: "🎩", text: "الساحر انتحل شخصية وانضم لفئة جديدة!" });
    out.notes.push({
      playerId: magician.id,
      text: `🎩 سحرك نجح! صرت ${MAFIA_ROLES[newRole].label} ${MAFIA_ROLES[newRole].emoji}`,
    });

    if (newRole === "mafia") {
      players
        .filter((p) => p.alive && p.role === "mafia" && !out.deaths.includes(p.id))
        .forEach((m) => out.notes.push({ playerId: m.id, text: `🎩 ${name(magician.id)} صار معكم في المافيا!` }));
    }
  });

  return out;
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

/** المواطنين يفوزون إذا ما بقى مافيا، والمافيا يفوزون إذا صاروا نفس عدد الباقين أو أكثر */
export function checkWinner(players: { alive: boolean; role: MafiaRole }[]): MafiaTeam | null {
  const alive = players.filter((p) => p.alive);
  const mafia = alive.filter((p) => p.role === "mafia").length;
  if (mafia === 0) return "town";
  if (mafia >= alive.length - mafia) return "mafia";
  return null;
}

// ---------------------------------------------------------------------
// مدد المراحل
// ---------------------------------------------------------------------

export function mafiaPhaseSeconds(phase: MafiaPhase): number | null {
  switch (phase) {
    case "reveal":
      return MAFIA_CONFIG.ROLE_REVEAL_SECONDS;
    case "night_act":
      return MAFIA_CONFIG.NIGHT_ACTION_SECONDS;
    case "night_done":
      return MAFIA_CONFIG.NIGHT_DONE_SECONDS;
    case "morning":
      return MAFIA_CONFIG.MORNING_SECONDS;
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

export function mafiaDeadline(phase: MafiaPhase, from = Date.now()): string | null {
  const secs = mafiaPhaseSeconds(phase);
  return secs === null ? null : new Date(from + secs * 1000).toISOString();
}

/** اختيار عشوائي لبوت، وأحياناً ما يختار أحد */
export function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}
