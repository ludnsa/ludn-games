/**
 * محاكي المافيا: يلعب جولات كاملة على كود اللعبة الحقيقي (actions/mafia.ts + lib/game/mafia-engine.ts)
 * فوق قاعدة وهمية في الذاكرة (fakes/fake-supabase.ts) وساعة وهمية — بدون أي اتصال بقاعدة حقيقية.
 *
 * كل "جهاز" (لاعب) يستدعي نفس الدوال اللي يستدعيها الجوال: جلب حالته، "شفت دوري"، تأكيد وصول شاشة الليل،
 * الاختيار أو سؤال التمويه، طلب القرار (مافيا)، الانتقال عند نهاية المؤقت، التصويت. والمنشئ أزراره.
 *
 * يتأكد في كل خطوة:
 *  - اللعبة ما تعلق: كل مرحلة تمشي لما يسوي الكل اللي عليهم، أو يخلص المؤقت، أو يتخطى المنشئ.
 *  - كل جولة تنتهي بفائز.
 *  - ما فيه دور ينكشف لغير صاحبه: حالة كل لاعب (view) فيها دوره هو بس، وأسماء المافيا للمافيا بس،
 *    ونتيجة التحقيق للمحقق بس، والصفوف العامة (الغرفة واللاعبين) ما فيها أدوار قبل النهاية.
 *  - التوزيع عادل (يتجمّع عبر الألعاب ويتقيّم بـ z).
 *  - الساحر بكل حالاته (سيناريوهات موجّهة).
 */
import { randomUUID } from "node:crypto";
import { MAFIA_CONFIG, MAFIA_NIGHT_ORDER } from "@/constants/mafia";
import { checkWinner, isFastMafia, mafiaLeaderId, mafiaNightSteps, type EnginePlayer } from "@/lib/game/mafia-engine";
import type { MafiaNightStep, MafiaRole, MafiaRoom, MafiaSettings } from "@/types";
import * as mafia from "@/actions/mafia";
import { FakeSupabase } from "./fakes/fake-supabase";
import { asUser, setFakeSupabase } from "./fakes/supabase-server";
import { sessionLog } from "./fakes/game-sessions";

// ---------------------------------------------------------------------
// الساعة الوهمية والعشوائية
// ---------------------------------------------------------------------

export const clock = {
  now: Date.UTC(2026, 0, 1, 20, 0, 0),
  advance(ms: number) {
    this.now += Math.max(0, Math.round(ms));
  },
  to(ms: number) {
    if (ms > this.now) this.now = Math.round(ms);
  },
};
const realNow = Date.now;
export function installClock() {
  Date.now = () => clock.now;
}
export function uninstallClock() {
  Date.now = realNow;
}

/** مولّد عشوائي بذرة (للمحاكي بس — اللعبة نفسها تستخدم Math.random الحقيقي إلا لو طلبت --seed) */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

// ---------------------------------------------------------------------
// أنواع
// ---------------------------------------------------------------------

export type Behavior = {
  /** احتمال إن الجوال يتأخر توصله الشاشة (الحماسي: أكثر من 15 ثانية، السريع: بعد بداية المؤقت) */
  lateAck: number;
  /** احتمال إن الجوال ما توصله الشاشة أبداً بهذي المرحلة */
  offline: number;
  /** احتمال إن اللاعب ما يختار (مع إن الشاشة وصلته) */
  noPick: number;
  /** احتمال إن المنشئ يتخطى الدور بدري (قبل ما يختار الكل) */
  hostSkip: number;
  /** احتمال إن اللاعب ما يضغط "شفت دوري" */
  noSeen: number;
  /**
   * احتمال إن رد اختيار الليل أو التمويه ما يوصل الجوال بالمهلة (4 ثواني) فيعيد نفس الطلب:
   * نصها بنفس اللحظة (السيرفر بطيء والأول للحين يكتب)، ونصها بعد المهلة. الإعادة لازم تنجح مثل الأول.
   */
  resend: number;
};

export const CALM: Behavior = { lateAck: 0, offline: 0, noPick: 0, hostSkip: 0, noSeen: 0, resend: 0 };
export const MESSY: Behavior = { lateAck: 0.15, offline: 0.08, noPick: 0.12, hostSkip: 0.1, noSeen: 0.1, resend: 0.15 };

export interface Truth {
  id: string;
  name: string;
  seat: number;
  token: string;
  isHost: boolean;
}

/** توجيه السيناريو: المحاكي (مو اللعبة) يعرف الأدوار ويقدر يوجّه اختيارات أجهزة معيّنة */
export interface Scenario {
  name: string;
  /** فئة المنشئ (وضع التجربة بالسيرفر: startMafiaGame(devHostRole)) */
  hostRole?: MafiaRole;
  /** اختيار موجّه لصاحب دور: يرجع معرّف الهدف، أو null = يعدّي (الساحر/الصحفي)، أو undefined = عشوائي */
  pick?: (ctx: PickCtx) => string | null | undefined;
  /** تأخير وصول الشاشة لجوال معيّن بالليلة (ملي ثانية)، أو Infinity = ما توصل أبداً، أو undefined = حسب السلوك */
  ackDelay?: (p: Truth, night: number, roles: Record<string, MafiaRole>) => number | undefined;
  /** لاعب ما يختار (مع إن الشاشة وصلته) */
  noPick?: (p: Truth, night: number, step: MafiaNightStep | null, roles: Record<string, MafiaRole>) => boolean;
  /** تصويت موجّه: معرّف لاعب، أو null = تخطي، أو undefined = عشوائي */
  vote?: (p: Truth, round: number, roles: Record<string, MafiaRole>, alive: Truth[]) => string | null | undefined;
  /**
   * ضغطة تمويه بلحظة انتقال قرار المافيا: عضو مافيا شاشته على سؤال التمويه، وضغطته توصل السيرفر كتمويه
   * (بدون ما يجيب حالته قبل) بفرق offsetMs عن طلبه للقرار (سالب = قبله، 0 = بنفس اللحظة، موجب = بعده).
   * undefined = عادي.
   */
  decoyAtClaim?: (p: Truth, night: number, roles: Record<string, MafiaRole>) => { target: string; offsetMs: number } | undefined;
}

export interface PickCtx {
  player: Truth;
  step: MafiaNightStep;
  options: { id: string; name: string }[];
  night: number;
  roles: Record<string, MafiaRole>;
  originalRoles: Record<string, MafiaRole>;
  alive: Set<string>;
}

export interface GameResult {
  config: string;
  settings: MafiaSettings;
  winner: "mafia" | "town" | null;
  nights: number;
  hang: string | null;
  violations: string[];
  /** الدور حسب المقعد */
  rolesBySeat: Record<number, MafiaRole>;
  /** مقعد قائد المافيا بالليلة الأولى */
  leaderSeatNight1: number | null;
  /** كم مرة انتقل قرار المافيا لعضو ثاني (القائد ما وصلته مهمته) */
  leadMoves: number;
  /** الساحر: وش صار */
  magician: MagicianStat | null;
  /** ضغطات التمويه بلحظة انتقال القرار: انحفظت تمويه أو رفضها السيرفر ("اختر من مهمتك") */
  decoyAtClaim: { night: number; playerId: string; target: string; outcome: "saved" | "rejected" }[];
  /** إعادات الإرسال اللي صارت (بنفس اللحظة / بعد المهلة) — كلها لازم تنجح مثل الأول */
  resends: { together: number; later: number };
  /** إعلانات كل صباح (رقم الليلة اللي قبله) — لفحص إعلان الساحر */
  /** shieldUsed: لكل جندي (حتى الساحر اللي صار جندي) وقت الصباح — true = درعه راح، false = درعه باقي */
  mornings: { night: number; kinds: string[]; texts: string[]; targets: (string | undefined)[]; shieldUsed: Record<string, boolean> }[];
  dbOps: number;
  /** الصفوف المتبقية بجدول الأفعال للغرفة (تنظيف) */
  notes: string[];
}

export interface MagicianStat {
  /** عُرض عليه اختيار فئة (فيه فئة فاضية مات صاحبها بالليل) */
  offered: boolean;
  /** الفئة اللي اختارها (null = ما اختار) */
  picked: MafiaRole | null;
  pickedNight: number | null;
  /** استخدم فئته الجديدة بنفس ليلة الاختيار */
  actedSameNight: boolean;
  /** مات بنفس ليلة الاختيار */
  diedSameNight: boolean;
  /** مهمته ما وصلت جواله أبداً بليلة من الليالي (missed:magician) */
  missed: boolean;
  /** السريع: كم بطاقة انعرضت عليه بشاشة الاختيار (آخر عرض). null = الحماسي أو ما انعرض */
  fastCards: number | null;
  /** السريع: اختار البطاقة والشخص بطلب واحد (false للجندي: الدرع بس) */
  pickedWithPerson: boolean;
}

const ALL_ROLES: MafiaRole[] = ["mafia", "detective", "doctor", "citizen", "magician", "journalist", "soldier", "suicide", "silencer", "sheikh"];

// ---------------------------------------------------------------------
// المشغّل
// ---------------------------------------------------------------------

export class MafiaSim {
  db: FakeSupabase;
  rnd: () => number;
  /** jitterTurns: يخلط ترتيب الطلبات المتزامنة (شوف FakeDbOptions) */
  constructor(public behavior: Behavior = CALM, rnd: () => number = Math.random, latencyMs = 0, jitterTurns = 0) {
    this.rnd = rnd;
    this.db = new FakeSupabase({ maxLatencyMs: latencyMs, random: rnd, jitterTurns });
    setFakeSupabase(this.db);
  }

  private chance(p: number): boolean {
    return this.rnd() < p;
  }
  private pickOne<T>(items: T[]): T {
    return items[Math.floor(this.rnd() * items.length)];
  }

  room(code: string): MafiaRoom {
    const r = this.db.rows("mafia_rooms").find((x) => x.room_code === code);
    if (!r) throw new Error("room vanished " + code);
    return r as unknown as MafiaRoom;
  }
  roles(code: string): Record<string, MafiaRole> {
    const out: Record<string, MafiaRole> = {};
    for (const s of this.db.rows("mafia_secrets")) if (s.room_code === code && s.role) out[s.player_id as string] = s.role as MafiaRole;
    return out;
  }
  originalRoles(code: string): Record<string, MafiaRole> {
    const out: Record<string, MafiaRole> = {};
    for (const s of this.db.rows("mafia_secrets")) if (s.room_code === code && s.original_role) out[s.player_id as string] = s.original_role as MafiaRole;
    return out;
  }
  aliveIds(code: string): Set<string> {
    return new Set(this.db.rows("mafia_players").filter((p) => p.room_code === code && p.is_alive).map((p) => p.id as string));
  }
  engineOf(code: string): EnginePlayer[] {
    const roles = this.roles(code);
    return this.db
      .rows("mafia_players")
      .filter((p) => p.room_code === code)
      .map((p) => ({
        id: p.id as string,
        name: p.display_name as string,
        seat: p.seat as number,
        alive: p.is_alive as boolean,
        role: roles[p.id as string] ?? "citizen",
        originalRole: roles[p.id as string] ?? "citizen",
        soldierShieldUsed: false,
        abilityUsed: false,
        suicideTarget: null,
        lastProtected: null,
      }));
  }

  /** ينشئ الغرفة ويدخل اللاعبين */
  async setup(settings: MafiaSettings, hostUser: string): Promise<{ code: string; players: Truth[] }> {
    const created = await asUser(hostUser, () => mafia.createMafiaRoom({ displayName: "المنشئ", settings }));
    if (!created.success) throw new Error("create: " + created.error);
    const code = created.data.roomCode;
    const tokens: Record<string, string> = { المنشئ: created.data.token };
    for (let i = 2; i <= settings.maxPlayers; i++) {
      const name = `لاعب ${i}`;
      const j = await mafia.joinMafiaRoom({ roomCode: code, displayName: name });
      if (!j.success) throw new Error("join: " + j.error);
      tokens[name] = j.data.token;
    }
    const room = this.room(code);
    const players: Truth[] = this.db
      .rows("mafia_players")
      .filter((p) => p.room_code === code)
      .map((p) => ({
        id: p.id as string,
        name: p.display_name as string,
        seat: p.seat as number,
        token: tokens[p.display_name as string],
        isHost: p.id === room.host_player_id,
      }))
      .sort((a, b) => a.seat - b.seat);
    return { code, players };
  }

  /**
   * يلعب جولة كاملة من "ابدأ" لين "انتهت". الغرفة لازم تكون بالانتظار (جديدة أو بعد "جولة جديدة").
   */
  async playRound(code: string, players: Truth[], hostUser: string, scenario: Scenario = { name: "random" }, label = ""): Promise<GameResult> {
    const settings = this.room(code).settings;
    const violations: string[] = [];
    const notes: string[] = [];
    const opsBefore = Object.values(this.db.stats).reduce((a, b) => a + b, 0);
    const host = players.find((p) => p.isHost)!;
    const result: GameResult = {
      config: label,
      settings,
      winner: null,
      nights: 0,
      hang: null,
      violations,
      rolesBySeat: {},
      leaderSeatNight1: null,
      leadMoves: 0,
      magician: null,
      decoyAtClaim: [],
      resends: { together: 0, later: 0 },
      mornings: [],
      dbOps: 0,
      notes,
    };
    const v = (msg: string) => {
      if (violations.length < 20) violations.push(msg);
    };

    const sessionsBefore = sessionLog.filter((s) => s.room === code && s.op === "count").length;
    const started = await asUser(hostUser, () => mafia.startMafiaGame(code, scenario.hostRole ?? null));
    if (!started.success) throw new Error("start: " + started.error);

    const roles = this.roles(code);
    const originalRoles = this.originalRoles(code);
    for (const p of players) result.rolesBySeat[p.seat] = roles[p.id];
    if (settings.optionalRoles.includes("magician")) {
      result.magician = { offered: false, picked: null, pickedNight: null, actedSameNight: false, diedSameNight: false, missed: false, fastCards: null, pickedWithPerson: false };
    }
    const magicianId = players.find((p) => originalRoles[p.id] === "magician")?.id ?? null;

    // الأدوار العامة (الصفوف المبثوثة) ما فيها أدوار
    const checkPublic = () => {
      const room = this.room(code);
      if (room.phase !== "ended" && room.final_roles) v(`final_roles ظاهرة قبل النهاية (${room.phase})`);
      for (const p of this.db.rows("mafia_players").filter((x) => x.room_code === code)) {
        for (const k of Object.keys(p)) if (/role/i.test(k)) v(`عمود دور في mafia_players: ${k}`);
      }
      // قائمة "باقي ما اختار" اللي تنعرض فعلاً (نفس الليلة ونفس الدور) ما فيها ميت
      const nr = room.night_ready;
      if (nr?.waiting && room.phase === "night_act" && nr.night === room.night_number && nr.step === room.night_step) {
        const alive = this.aliveIds(code);
        for (const id of nr.waiting) if (!alive.has(id)) v("قائمة الانتظار فيها ميت/مطرود");
      }
    };

    // حالة لاعب: دوره هو بس
    const checkView = async (p: Truth): Promise<Awaited<ReturnType<typeof mafia.getMafiaMyView>>> => {
      const res = await mafia.getMafiaMyView({ roomCode: code, token: p.token });
      if (!res.success) return res;
      const view = res.data;
      const room = this.room(code);
      const liveRoles = this.roles(code);
      const myRole = liveRoles[p.id];
      if (room.phase !== "lobby" && view.me.role !== myRole) v(`${p.name}: شاف دور ${view.me.role} وهو ${myRole}`);
      if (view.mafiaTeam.length > 0 && myRole !== "mafia") v(`${p.name}: شاف أسماء المافيا وهو ${myRole}`);
      if (myRole === "mafia" && room.phase !== "lobby" && room.phase !== "reveal" && view.mafiaTeam.length === 0 && (room.phase === "night_act" || room.phase === "night_done")) {
        // المافيا يشوف عصابته وقت الليل (needsEngine)
        v(`${p.name}: مافيا بدون أسماء العصابة بالليل`);
      }
      if (view.task) {
        const step = view.task.step;
        const okStep = step === myRole || (step === "magician" && originalRoles[p.id] === "magician");
        if (!okStep) v(`${p.name}: مهمة ${step} وهو ${myRole}`);
      }
      if (view.detectiveResult && myRole !== "detective") v(`${p.name}: نتيجة تحقيق وهو ${myRole}`);
      if (view.notes.length && originalRoles[p.id] !== "magician") v(`${p.name}: رسائل خاصة وهو ${myRole}`);
      return res;
    };

    const advanceBy = async (p: Truth) => {
      const room = this.room(code);
      await mafia.advanceMafiaPhase({ roomCode: code, token: p.token, seq: room.phase_seq });
    };
    const skipByHost = () => asUser(hostUser, () => mafia.skipMafiaPhase(code));

    let guard = 0;
    let lastSeq = -1;
    let sameSeq = 0;
    const alivePlayers = () => {
      const alive = this.aliveIds(code);
      return players.filter((p) => alive.has(p.id));
    };

    while (true) {
      const room = this.room(code);
      checkPublic();
      if (room.phase === "ended" || room.phase === "closed") break;
      if (++guard > 400) {
        result.hang = `أكثر من 400 دورة (${room.phase} seq=${room.phase_seq} night=${room.night_number} step=${room.night_step})`;
        break;
      }
      if (room.phase_seq === lastSeq) {
        if (++sameSeq > 6) {
          result.hang = `علقت: ${room.phase} seq=${room.phase_seq} night=${room.night_number} step=${room.night_step} ends=${room.phase_ends_at}`;
          break;
        }
      } else {
        sameSeq = 0;
        lastSeq = room.phase_seq;
      }

      switch (room.phase) {
        case "reveal": {
          const seq = room.phase_seq;
          let anyMissing = false;
          for (const p of players) {
            await checkView(p);
            if (this.chance(this.behavior.noSeen)) {
              anyMissing = true;
              continue;
            }
            clock.advance(50 + this.rnd() * 300);
            await mafia.markMafiaRoleSeen({ roomCode: code, token: p.token, seq });
          }
          if (this.room(code).phase === "reveal") {
            if (!anyMissing) v("الكشف ما خلص مع إن الكل ضغطوا");
            clock.to(Date.parse(room.phase_ends_at!) + 500);
            await advanceBy(this.pickOne(players));
          }
          break;
        }

        case "night_act": {
          result.nights = Math.max(result.nights, room.night_number);
          if (room.night_number === 1 && result.leaderSeatNight1 === null) {
            // البذرة من الغرفة بعد البدء (startMafiaGame يكتبها)، مو من الإعدادات اللي قبل البدء
            const leader = mafiaLeaderId(this.engineOf(code), 1, room.settings.leadSeed);
            result.leaderSeatNight1 = players.find((p) => p.id === leader)?.seat ?? null;
          }
          await this.playNightStep(code, players, host, hostUser, scenario, result, v, checkView, advanceBy, skipByHost);
          break;
        }

        case "night_done": {
          clock.to(Date.parse(room.phase_ends_at!) + 500);
          await advanceBy(this.pickOne(alivePlayers()));
          break;
        }

        case "morning": {
          result.mornings.push({
            night: room.night_number,
            kinds: (room.announcements ?? []).map((a) => a.kind),
            texts: (room.announcements ?? []).map((a) => a.text),
            targets: (room.announcements ?? []).map((a) => a.targetId),
            shieldUsed: Object.fromEntries(
              this.db
                .rows("mafia_secrets")
                .filter((s) => s.room_code === code && s.role === "soldier")
                .map((s) => [s.player_id as string, Boolean(s.soldier_shield_used)])
            ),
          });
          // الشيخ يختار، والمنشئ يبدأ النقاش
          const liveRoles = this.roles(code);
          for (const p of alivePlayers()) {
            await checkView(p);
            if (liveRoles[p.id] === "sheikh") await mafia.chooseMafiaSheikhMode({ roomCode: code, token: p.token, led: this.chance(0.5) });
          }
          // الساحر: مات بنفس ليلة اختياره؟
          if (result.magician?.picked && magicianId && !this.aliveIds(code).has(magicianId) && result.magician.pickedNight === room.night_number) {
            result.magician.diedSameNight = true;
          }
          await asUser(hostUser, () => mafia.startMafiaDiscussion({ roomCode: code, seconds: 120 }));
          break;
        }

        case "discussion": {
          if (this.chance(0.5)) await skipByHost();
          else {
            clock.to(Date.parse(room.phase_ends_at!) + 500);
            await advanceBy(this.pickOne(alivePlayers()));
          }
          break;
        }

        case "voting": {
          const alive = alivePlayers();
          const liveRoles = this.roles(code);
          for (const p of alive) {
            await checkView(p);
            let target: string | null | undefined = scenario.vote?.(p, room.night_number, liveRoles, alive);
            if (target === p.id) target = null; // السيناريو وجّه التصويت على نفسه: يتخطى
            if (target === undefined) {
              // عشوائي، مع ميل بسيط يخلي اللعبة تنتهي: المدينة تصوّت على مافيا 40%، والمافيا على مواطن
              const others = alive.filter((x) => x.id !== p.id);
              const mafiaIds = others.filter((x) => liveRoles[x.id] === "mafia");
              const townIds = others.filter((x) => liveRoles[x.id] !== "mafia");
              if (this.chance(0.15)) target = null;
              else if (liveRoles[p.id] === "mafia") target = this.pickOne(townIds.length ? townIds : others).id;
              else target = this.chance(0.4) && mafiaIds.length ? this.pickOne(mafiaIds).id : this.pickOne(others).id;
            }
            if (this.chance(0.1)) continue; // ما صوّت
            const res = await mafia.castMafiaVote({ roomCode: code, token: p.token, targetId: target });
            if (!res.success) v(`تصويت مرفوض: ${res.error}`);
          }
          clock.to(Date.parse(room.phase_ends_at!) + 500);
          await advanceBy(this.pickOne(alive));
          break;
        }

        case "vote_result": {
          clock.to(Date.parse(room.phase_ends_at!) + 500);
          await advanceBy(this.pickOne(alivePlayers()));
          break;
        }

        default:
          result.hang = `مرحلة غير متوقعة ${room.phase}`;
          break;
      }
      if (result.hang) break;
    }

    const finalRoom = this.room(code);
    result.winner = finalRoom.winner;
    result.leadMoves = this.db.rows("mafia_actions").filter((a) => a.room_code === code && a.step === "lead:mafia").length;

    // إعلان الساحر: مرة وحدة بس، بصباح ليلة اختياره، بدون ذكر أي فئة (ولو مات بنفس الليلة يطلع مع إعلان موته).
    // لو انتهت اللعبة بتلك الليلة ما فيه صباح أصلاً.
    if (result.magician) {
      const m = result.magician;
      const withMagic = result.mornings.filter((x) => x.kinds.includes("magic"));
      if (m.picked && m.pickedNight !== null) {
        const morning = result.mornings.find((x) => x.night === m.pickedNight);
        if (morning) {
          const magic = morning.kinds.filter((k) => k === "magic").length;
          if (magic !== 1) v(`إعلان الساحر طلع ${magic} مرة بصباح ليلة اختياره`);
          const text = morning.texts[morning.kinds.indexOf("magic")] ?? "";
          if (/المحقق|الطبيب|الجندي|محقق|طبيب|جندي/.test(text)) v(`إعلان الساحر يذكر الفئة: ${text}`);
          if (text !== "الساحر اختار فئة") v(`نص إعلان الساحر: ${text}`);
          if (m.diedSameNight && !morning.targets.includes(magicianId ?? "")) v("الساحر مات بليلة اختياره بدون إعلان موته");
        }
        if (withMagic.some((x) => x.night !== m.pickedNight)) v("إعلان الساحر طلع بصباح غير ليلة اختياره");
      } else if (withMagic.length) {
        v("إعلان الساحر طلع وهو ما اختار");
      }
    }
    if (finalRoom.phase === "ended") {
      // الفائز لازم يطابق الحالة
      const expected = checkWinner(this.engineOf(code));
      if (finalRoom.winner !== expected) v(`الفائز ${finalRoom.winner} والمتوقع ${expected}`);
      if (!finalRoom.final_roles || finalRoom.final_roles.length !== players.length) v("final_roles ناقصة");
      // تنحسب مع أول صباح (وتنعاد كل صباح — الدالة بالقاعدة ما تحسب إلا مرة): لازم مرة على الأقل
      const counted = sessionLog.filter((s) => s.room === code && s.op === "count").length - sessionsBefore;
      if (counted < 1) v("اللعبة ما انحسبت");
    } else if (!result.hang) {
      result.hang = `انتهت الحلقة والمرحلة ${finalRoom.phase}`;
    }
    result.dbOps = Object.values(this.db.stats).reduce((a, b) => a + b, 0) - opsBefore;
    return result;
  }

  /**
   * دور ليل واحد (الحماسي: دور واحد من الأدوار، السريع: الليل كله). كل جهاز: يأكد وصول الشاشة
   * (أو يتأخر أو ما توصله)، ثم يختار أو يجاوب التمويه (أو ما يختار). المافيا غير القائد يطلبون القرار
   * لو القائد ما وصلته. ولو ما خلص الدور: المنشئ يتخطى (الحماسي) أو المؤقت يخلص (السريع).
   */
  private async playNightStep(
    code: string,
    players: Truth[],
    host: Truth,
    hostUser: string,
    scenario: Scenario,
    result: GameResult,
    v: (m: string) => void,
    checkView: (p: Truth) => Promise<Awaited<ReturnType<typeof mafia.getMafiaMyView>>>,
    advanceBy: (p: Truth) => Promise<void>,
    skipByHost: () => Promise<unknown>
  ) {
    const room = this.room(code);
    const seq = room.phase_seq;
    const fast = isFastMafia(room.settings);
    const night = room.night_number;
    const step = room.night_step;
    const roles = this.roles(code);
    const originalRoles = this.originalRoles(code);
    const alive = this.aliveIds(code);
    const aliveP = players.filter((p) => alive.has(p.id));
    const t0 = clock.now;

    // run = حدث جاهز (ضغطة تمويه بلحظة انتقال القرار، أو إعادة إرسال بعد المهلة)
    // inflight = إعادة إرسال انرسلت فعلاً: لو تغيّرت المرحلة قبل موعدها توصل متأخرة (مثل طلب كان بالطريق)
    type Ev = { at: number; kind: "ack" | "act" | "claim" | "run"; p: Truth; run?: () => Promise<unknown>; inflight?: boolean };
    const events: Ev[] = [];
    const ackAt = new Map<string, number>();
    for (const p of aliveP) {
      let delay = scenario.ackDelay?.(p, night, roles);
      if (delay === undefined) {
        delay = this.chance(this.behavior.offline) ? Infinity : this.chance(this.behavior.lateAck) ? 16000 + this.rnd() * 6000 : 200 + this.rnd() * 2500;
      }
      if (delay === Infinity) continue;
      ackAt.set(p.id, t0 + delay);
      events.push({ at: t0 + delay, kind: "ack", p });
      const noPick = scenario.noPick?.(p, night, step, roles) ?? this.chance(this.behavior.noPick);
      if (!noPick) events.push({ at: t0 + delay + 500 + this.rnd() * 3000, kind: "act", p });
    }
    // المافيا غير القائد: يطلبون القرار بعد أقصى انتظار (مثل الجوال: 15 ثانية من أول ما شافوا المرحلة)
    const leaderId = mafiaLeaderId(this.engineOf(code), night, room.settings.leadSeed);
    if (step === "mafia" || fast) {
      for (const p of aliveP) {
        if (roles[p.id] !== "mafia" || p.id === leaderId || !ackAt.has(p.id)) continue;
        // مثل الجوال: أول طلب بعد أقصى انتظار من لحظة ما وصلته الشاشة، وبعدها كل 4 ثواني لين ينحسم (runClaim)
        const claimAt = ackAt.get(p.id)! + MAFIA_CONFIG.FAST_ROLE_WAIT_SECONDS * 1000 + 300;
        events.push({ at: claimAt, kind: "claim", p });
        // ضغطة تمويه بلحظة انتقال القرار (شاشته على سؤال التمويه): بدل اختياره العادي
        const spec = scenario.decoyAtClaim?.(p, night, roles);
        if (spec) {
          for (let i = events.length - 1; i >= 0; i--) if (events[i].kind === "act" && events[i].p.id === p.id) events.splice(i, 1);
          events.push({
            at: claimAt + spec.offsetMs,
            kind: "run",
            p,
            run: async () => {
              const cur = this.room(code);
              if (cur.phase !== "night_act" || cur.phase_seq !== seq) return;
              const outcome = await sendDecoy(p, spec.target);
              if (outcome !== "error") result.decoyAtClaim.push({ night, playerId: p.id, target: spec.target, outcome });
            },
          });
        }
      }
    }
    events.sort((a, b) => a.at - b.at);

    const hostSkipsEarly = !fast && this.chance(this.behavior.hostSkip);
    const skipAt = hostSkipsEarly ? t0 + 4000 + this.rnd() * 8000 : Infinity;
    const acted = new Set<string>();
    const executed = new Set<Ev>();
    const magicianId = players.find((x) => originalRoles[x.id] === "magician")?.id ?? "";

    const runAck = (p: Truth) => mafia.ackMafiaNightTask({ roomCode: code, token: p.token, seq });
    const runClaim = async (p: Truth) => {
      const r = await mafia.claimMafiaLead({ roomCode: code, token: p.token, seq });
      // صار القائد: ياخذ مهمته ويختار — بعد ما يمر تجاهل الضغط (ثانية ونص) على شاشته اللي تبدلت
      if (r.success && r.data.leader && !acted.has(p.id)) events.push({ at: clock.now + 1600, kind: "act", p });
      // بدري للحين: يعيد الطلب بعد 4 ثواني (مثل الجوال)
      else if (r.success && !r.data.stop) events.push({ at: clock.now + 4000, kind: "claim", p });
    };
    const resendMode = (): "together" | "later" | null =>
      this.chance(this.behavior.resend) ? (this.chance(0.5) ? "together" : "later") : null;
    type Investigation = { targetName: string; isMafia: boolean } | null | undefined;
    const sameInvestigation = (a: Investigation, b: Investigation) =>
      (a?.targetName ?? null) === (b?.targetName ?? null) && (a?.isMafia ?? null) === (b?.isMafia ?? null);
    /**
     * جواب التمويه (ومعه إعادة الإرسال لو الرد ما وصل). rejected = انتقل له قرار المافيا قبل ما يوصل:
     * الجوال يبدّل الشاشة ("انتقل لك قرار القتل") ويتجاهل الضغط ثانية ونص، وبعدها يختار من مهمته.
     */
    const sendDecoy = async (p: Truth, targetId: string): Promise<"saved" | "rejected" | "error"> => {
      const send = () => mafia.submitMafiaDecoy({ roomCode: code, token: p.token, targetId, seq });
      const mode = resendMode();
      let r: Awaited<ReturnType<typeof send>>;
      if (mode === "together") {
        result.resends.together++;
        const [a, b] = await Promise.all([send(), send()]);
        const moved = (x: typeof a) => !x.success && x.error.includes("اختر من مهمتك");
        if (a.success !== b.success && !moved(a) && !moved(b)) v(`${p.name}: إعادة التمويه بنفس اللحظة ما رجعت نفس الرد`);
        r = a.success ? b : a;
      } else r = await send();
      if (!r.success) {
        if (r.error.includes("اختر من مهمتك")) {
          result.notes.push(`${p.name}: انتقل له القرار وهو على التمويه`);
          events.push({ at: clock.now + 1600, kind: "act", p });
          return "rejected";
        }
        v(`${p.name}: تمويه مرفوض: ${r.error}`);
        return "error";
      }
      if (mode === "later") {
        events.push({
          at: clock.now + 4000,
          kind: "run",
          p,
          inflight: true,
          run: async () => {
            result.resends.later++;
            const again = await send();
            if (!again.success && !again.error.includes("اختر من مهمتك")) v(`${p.name}: إعادة التمويه بعد المهلة رُفضت: ${again.error}`);
          },
        });
      }
      return "saved";
    };
    const runAct = async (ev: Ev): Promise<void> => {
      const cur = this.room(code);
      if (cur.phase !== "night_act" || cur.phase_seq !== seq) return;
      const res = await checkView(ev.p);
      if (!res.success) {
        v(`${ev.p.name}: جلب الحالة فشل: ${res.error}`);
        return;
      }
      const view = res.data;
      const liveRoles = this.roles(code);
      if (view.task && !view.task.locked) {
        const task = view.task;
        let target: string | null | undefined = scenario.pick?.({ player: ev.p, step: task.step, options: task.options, night, roles: liveRoles, originalRoles, alive });
        if (target === undefined) {
          if ((task.step === "magician" || task.step === "journalist") && this.chance(0.3)) target = null;
          else if (task.options.length === 0) target = null;
          else {
            // المافيا ما يذبحون زميلهم بالعشوائي (التمويه نادر)، والباقي عشوائي
            const opts = task.step === "mafia" ? task.options.filter((o) => liveRoles[o.id] !== "mafia") : task.options;
            target = this.pickOne(opts.length ? opts : task.options).id;
          }
        }
        if (target === null && task.step !== "magician" && task.step !== "journalist") target = task.options[0]?.id ?? null;

        // السريع، الساحر: شاشة وحدة — البطاقة (target) والشخص بطلب واحد. الشخص من أهداف البطاقة بنفس
        // توجيه السيناريو لفئتها (الطبيب يحمي فلان…)، والجندي بدون شخص (الدرع بس)
        let card: string | undefined;
        let person: string | null = null;
        if (task.step === "magician") {
          if (fast !== Boolean(task.cards)) v(`الساحر بالسريع=${fast} وبطاقات الشاشة الواحدة=${Boolean(task.cards)}`);
          if (task.cards) {
            result.magician!.fastCards = task.cards.length;
            if (task.cards.length !== task.options.length) v("بطاقات الساحر ما تطابق خياراته");
            if (target) {
              const c = task.cards.find((x) => x.id === target);
              if (!c) v("الساحر اختار بطاقة مو موجودة");
              else {
                card = c.id;
                if (c.role === "soldier" && c.options.length) v("بطاقة الجندي معها أهداف");
                if (c.options.length) {
                  let who = scenario.pick?.({ player: ev.p, step: c.role as MafiaNightStep, options: c.options, night, roles: liveRoles, originalRoles, alive });
                  if (who === undefined || who === null || !c.options.some((o) => o.id === who)) who = this.pickOne(c.options).id;
                  person = who;
                }
              }
            }
          }
        }
        // مثل الجوال: الطلب معه رقم المرحلة، ولو رده ما وصل بالمهلة يعيده (بنفس اللحظة أو بعد المهلة)
        const payload = card ? { targetId: person, card } : { targetId: target ?? null };
        const send = () => mafia.submitMafiaNightAction({ roomCode: code, token: ev.p.token, seq, ...payload });
        const mode = resendMode();
        let r: Awaited<ReturnType<typeof send>>;
        if (mode === "together") {
          result.resends.together++;
          const [a, b] = await Promise.all([send(), send()]);
          if (a.success !== b.success || (a.success && b.success && !sameInvestigation(a.data.detectiveResult, b.data.detectiveResult))) {
            v(`${ev.p.name} (${task.step}): إعادة الإرسال بنفس اللحظة ما رجعت نفس الرد: ${a.success ? "نجح" : a.error} / ${b.success ? "نجح" : b.error}`);
          }
          r = a.success ? a : b;
        } else r = await send();
        if (!r.success) {
          v(`${ev.p.name} (${task.step}): اختيار مرفوض: ${r.error}`);
          return;
        }
        if (mode === "later") {
          const first = r.data.detectiveResult;
          const stepName = task.step;
          events.push({
            at: clock.now + 4000,
            kind: "run",
            p: ev.p,
            inflight: true,
            run: async () => {
              result.resends.later++;
              const again = await send();
              if (!again.success) v(`${ev.p.name} (${stepName}): إعادة الإرسال بعد المهلة رُفضت: ${again.error}`);
              else if (!sameInvestigation(first, again.data.detectiveResult)) v(`${ev.p.name}: نتيجة التحقيق اختلفت بإعادة الإرسال`);
            },
          });
        }
        acted.add(ev.p.id);
        if (task.step === "magician") {
          result.magician!.offered = true;
          if (target) {
            const picked = this.roles(code)[ev.p.id];
            result.magician!.picked = picked;
            result.magician!.pickedNight = night;
            if (picked === "magician") v("الساحر اختار فئة وما تغيّرت فئته");
            if (card) {
              // السريع: فعل فئته الجديدة لازم يكون مسجّل بنفس الطلب (المحقق/الطبيب)، وما فيه مهمة ثانية
              result.magician!.pickedWithPerson = Boolean(person);
              if (person) {
                const row = this.db.rows("mafia_actions").find((a) => a.room_code === code && a.night === night && a.actor_id === ev.p.id && a.step === picked && a.target_id === person);
                if (!row) v("السريع: اختيار الساحر للشخص ما انسجّل مع البطاقة");
                result.magician!.actedSameNight = true;
                if (picked === "detective") {
                  const truth = liveRoles[person] === "mafia";
                  if (!r.data.detectiveResult || r.data.detectiveResult.isMafia !== truth) v("السريع: نتيجة تحقيق الساحر غلط أو ناقصة");
                }
              }
              const again = await checkView(ev.p);
              if (again.success && again.data.task && !again.data.task.locked) v(`السريع: بعد اختيار البطاقة طلعت للساحر مهمة ثانية (${again.data.task.step})`);
            } else if (fast && MAFIA_NIGHT_ORDER.includes(picked as MafiaNightStep)) {
              // طلب بدون بطاقة (الطريقة القديمة): فئته الجديدة لها دور — يختار له بعد شوي بنفس الليل
              events.push({ at: clock.now + 1500 + this.rnd() * 2000, kind: "act", p: ev.p });
            }
          }
        } else if (ev.p.id === magicianId && result.magician?.picked && result.magician.pickedNight === night) {
          result.magician.actedSameNight = true;
        }
        if (task.step === "detective" && r.data.detectiveResult) {
          const target2 = players.find((x) => x.id === target);
          const truth = target2 ? liveRoles[target2.id] === "mafia" : false;
          if (r.data.detectiveResult.isMafia !== truth) v("نتيجة التحقيق غلط");
        }
      } else if (!view.task && view.decoyId === null) {
        const others = [...alive].filter((id) => id !== ev.p.id);
        if (others.length) await sendDecoy(ev.p, this.pickOne(others));
      }
    };

    // الأحداث اللي وقتها متقارب (أقل من 300 ملي ثانية) تنفّذ مع بعض — طلبات متزامنة فعلاً، والقاعدة الوهمية
    // تتداخل بينها — عشان نصيد سباقات التزامن (مثل اختيار الساحر مع اختيار لاعب ثاني بنفس اللحظة)
    for (;;) {
      events.sort((a, b) => a.at - b.at);
      const pending = events.filter((e) => !executed.has(e));
      if (pending.length === 0) break;
      const cur = this.room(code);
      if (cur.phase !== "night_act" || cur.phase_seq !== seq) break; // الدور خلص
      const deadline = cur.phase_ends_at ? Date.parse(cur.phase_ends_at) : Infinity;
      const first = pending[0];
      if (first.at > deadline || first.at > skipAt) break;
      clock.to(first.at);
      // نفس اللاعب ما يرسل اختيارين بنفس اللحظة (الجوال الحقيقي يمنعها بنفسه): اختياره الثاني ينتظر الدفعة الجاية
      const actors = new Set<string>();
      const batch = pending.filter((e) => {
        if (e.at > first.at + 300 || e.at > deadline || e.at > skipAt) return false;
        if (e.kind !== "act") return true;
        if (actors.has(e.p.id)) return false;
        actors.add(e.p.id);
        return true;
      });
      for (const e of batch) executed.add(e);
      await Promise.all(
        batch.map((e) => {
          if (e.kind === "ack") return runAck(e.p);
          if (e.kind === "claim") return runClaim(e.p);
          if (e.kind === "run") return e.run!();
          return runAct(e);
        })
      );
    }

    // إعادات الإرسال اللي كانت بالطريق لما خلص الدور: توصل متأخرة — لازم تنجح مثل الأول
    const flushInflight = async () => {
      for (const e of events) {
        if (executed.has(e) || !e.inflight) continue;
        executed.add(e);
        await e.run!();
      }
    };

    // الدور ما خلص لحاله: السريع ينتهي بالمؤقت، والحماسي بتخطي المنشئ
    const cur = this.room(code);
    if (cur.phase !== "night_act" || cur.phase_seq !== seq) {
      await flushInflight();
      return;
    }
    if (fast) {
      const deadline = Date.parse(cur.phase_ends_at!);
      clock.to(deadline + 500);
      await advanceBy(this.pickOne(aliveP.length ? aliveP : players));
    } else {
      clock.to(Math.min(skipAt, clock.now + 20000));
      await skipByHost();
    }
    const after = this.room(code);
    if (after.phase === "night_act" && after.phase_seq === seq) v(`الدور ${step ?? "fast"} ما مشى بعد التخطي/المؤقت`);
    await flushInflight();
    // الساحر: مهمته ما وصلته أبداً (missed)
    if (result.magician && !result.magician.picked) {
      const missed = this.db.rows("mafia_actions").some((a) => a.room_code === code && a.night === night && a.step === "missed:magician");
      if (missed) result.magician.missed = true;
    }
  }
}

export const ROLE_LABELS: Record<MafiaRole, string> = {
  mafia: "مافيا",
  detective: "المحقق",
  doctor: "الطبيب",
  citizen: "مواطن",
  magician: "الساحر",
  journalist: "الصحفي",
  soldier: "الجندي",
  suicide: "المنتقم",
  silencer: "المسكت",
  sheikh: "الشيخ",
};
export { ALL_ROLES, mafiaNightSteps, randomUUID };
