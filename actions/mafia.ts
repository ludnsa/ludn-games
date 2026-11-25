"use server";

import { randomUUID } from "crypto";
import { getGameUserId, getSupabaseServiceRole } from "@/lib/supabase/server";
import { checkAccessAction } from "@/app/actions/gameAccess";
import { beginGameSession, cancelGameSession, countGameSession, endGameSession, pingGameSession } from "@/lib/game-sessions";
import { MAFIA_BOT_NAMES, MAFIA_CONFIG, MAFIA_GAME, MAFIA_NIGHT_ORDER, MAFIA_ROLES } from "@/constants/mafia";
import {
  MafiaCreateSchema,
  MafiaJoinSchema,
  MafiaNameSchema,
  MafiaRoomCodeSchema,
  MafiaSessionSchema,
  MafiaSettingsSchema,
} from "@/lib/schemas";
import {
  activeNightSteps,
  allowedTargets,
  buildRoleDeck,
  canActOnStep,
  checkWinner,
  countVotes,
  fastNightStep,
  groupVoters,
  isFastMafia,
  isSecretVote,
  mafiaDeadline,
  mafiaLeaderId,
  mafiaNightShortcut,
  mafiaNightSteps,
  mafiaStandIn,
  magicianCardTargets,
  magicianSwitchPatch,
  pickRandom,
  resolveNight,
  resolveVotes,
  validateMafiaSettings,
  voteBlast,
  MAFIA_MAGICIAN_ROLES,
  MAFIA_SKIP_KEY,
  type EnginePlayer,
  type NightResolution,
} from "@/lib/game/mafia-engine";
import type {
  MafiaAnnouncement,
  MafiaFinalRole,
  MafiaNightStep,
  MafiaPlayer,
  MafiaRole,
  MafiaRoom,
  MafiaSettings,
  MafiaTeam,
} from "@/types";

/**
 * كل تعديل على لعبة المافيا يمر من هنا.
 *
 * الأدوار والأفعال والأصوات محفوظة في جداول مغلقة على العميل (شوف
 * supabase/migrations/0004_mafia.sql). كل جهاز يثبت هويته بمفتاح سري
 * يستلمه عند الانضمام، ويطلب "اللي يخصه فقط" عبر getMafiaMyView.
 *
 * انتقال المراحل: أي جهاز يوصل مؤقته للصفر يطلب advanceMafiaPhase،
 * والسيرفر يقبل أول طلب بس (شرط phase_seq) — فاللعبة تكمل حتى لو
 * جوال المنشئ انطفى.
 */

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string };

type Admin = ReturnType<typeof getSupabaseServiceRole>;

function fail(error: string): { success: false; error: string } {
  return { success: false, error };
}

const IS_DEV = process.env.NODE_ENV !== "production";

// ---------------------------------------------------------------------
// أدوات مساعدة داخلية
// ---------------------------------------------------------------------

function generateMafiaRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = MAFIA_CONFIG.ROOM_CODE_PREFIX;
  for (let i = 1; i < MAFIA_CONFIG.ROOM_CODE_LENGTH; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function newToken(): string {
  return (randomUUID() + randomUUID()).replace(/-/g, "");
}

interface SecretRow {
  player_id: string;
  room_code: string;
  token: string;
  role: MafiaRole | null;
  original_role: MafiaRole | null;
  soldier_shield_used: boolean;
  ability_used: boolean;
  suicide_target: string | null;
  last_protected: string | null;
  notes: string[];
}

/**
 * صف في mafia_actions: فعل دور، أو اختيار سؤال التمويه لباقي اللاعبين (ومنهم المافيا غير القائد) —
 * ينحفظ عشان الدور ما يمشي إلا لما الكل يختارون
 */
type DecoyStep = `decoy:${MafiaNightStep}`;
const decoyStep = (step: MafiaNightStep): DecoyStep => `decoy:${step}`;
/** النمط السريع: سؤال التمويه مرة وحدة لليلة كلها */
const FAST_DECOY = "decoy:fast";
/** اختيار الشيخ لنوع نقاش اليوم (night = رقم الليلة اللي قبل الصباح). target_id = الشيخ نفسه لو منظم، null لو عشوائي */
const SHEIKH_STEP = "sheikh";
/**
 * علامات توصيل (ما تنحسب بأي نتيجة — المحرك يقرا أفعال الأدوار بس):
 * - SEEN_ROLE: اللاعب ضغط "شفت دوري" بكشف الأدوار (night = 0)
 * - got:<دور>: مهمة الليل وصلت جوال صاحبها (got:fast للنمط السريع)
 * - missed:<دور>: صاحب الدور ما وصلته مهمته أبداً، فما سوى شي هالليلة (والنظام ما اختار عنه)
 */
const SEEN_ROLE = "seen:reveal";
const REVEAL_NIGHT = 0;
type GotStep = `got:${MafiaNightStep | "fast"}`;
const gotStep = (step: MafiaNightStep | null): GotStep => `got:${step ?? "fast"}`;
/** عضو مافيا (مو القائد) وصلته شاشة الليل — يقدر ياخذ القرار لو القائد ما وصلته مهمته */
type ViewStep = "view:mafia" | "view:fast";
const viewStep = (fast: boolean): ViewStep => (fast ? "view:fast" : "view:mafia");
/** القرار انتقل من قائد المافيا (actor_id) لعضو ثاني (target_id) — مرة وحدة بالليلة */
const LEAD_STEP = "lead:mafia";
/** النمط السريع: شاشة الليل وصلت جوال لاعب ما عنده مهمة — المؤقت ينتظر كل الجوالات، مو بس أصحاب المهام */
const NIGHT_SEEN = "seen:night";
/**
 * هذا اللاعب (actor_id) مات بليلة night (ذبح المافيا أو انفجار المنتقم) وهو محقق/طبيب/جندي —
 * تنكتب مع تطبيق نتائج الليل. منها يعرف الساحر أي فئة يقدر ياخذ مكانها: اللي مات بالليل بس،
 * مو اللي طلع بالتصويت أو ذبحه المنشئ بالنهار.
 */
const SLAIN_STEP = "slain:night";
type MissedStep = `missed:${MafiaNightStep}`;
type ActionStep =
  | MafiaNightStep
  | DecoyStep
  | typeof FAST_DECOY
  | typeof SHEIKH_STEP
  | typeof SEEN_ROLE
  | GotStep
  | ViewStep
  | typeof LEAD_STEP
  | typeof NIGHT_SEEN
  | typeof SLAIN_STEP
  | MissedStep;

/**
 * قائد المافيا الفعلي الليلة: القائد بالدور (ترتيب عشوائي ثابت للجولة من بذرتها، وبالمقاعد للغرف القديمة)،
 * إلا لو القرار انتقل منه لعضو ثاني لأن مهمته ما وصلته (claimMafiaLead)
 */
async function nightLeaderId(admin: Admin, room: MafiaRoom, engine: EnginePlayer[]): Promise<string | null> {
  const base = mafiaLeaderId(engine, room.night_number, room.settings.leadSeed);
  if (!base) return null;
  const { data } = await admin
    .from("mafia_actions")
    .select("target_id")
    .eq("room_code", room.room_code)
    .eq("night", room.night_number)
    .eq("step", LEAD_STEP)
    .eq("actor_id", base)
    .maybeSingle();
  const to = (data as { target_id: string | null } | null)?.target_id;
  return to && engine.some((p) => p.id === to && p.alive && p.role === "mafia") ? to : base;
}
/** أفعال الأدوار الحقيقية بس (بدون اختيارات التمويه) */
const isRoleStep = (step: string): step is MafiaNightStep => (MAFIA_NIGHT_ORDER as readonly string[]).includes(step);

interface ActionRow {
  id: string;
  night: number;
  step: ActionStep;
  actor_id: string;
  target_id: string | null;
  confirmed_by: string[];
}

async function loadRoom(admin: Admin, roomCode: string): Promise<MafiaRoom | null> {
  const { data } = await admin.from("mafia_rooms").select("*").eq("room_code", roomCode).maybeSingle();
  return (data as MafiaRoom) ?? null;
}

async function loadPlayers(admin: Admin, roomCode: string): Promise<MafiaPlayer[]> {
  const { data } = await admin
    .from("mafia_players")
    .select("*")
    .eq("room_code", roomCode)
    .order("seat", { ascending: true });
  return (data as MafiaPlayer[]) ?? [];
}

async function loadSecrets(admin: Admin, roomCode: string): Promise<SecretRow[]> {
  const { data } = await admin.from("mafia_secrets").select("*").eq("room_code", roomCode);
  return (data as SecretRow[]) ?? [];
}

/**
 * يدمج اللاعبين مع أسرارهم بالشكل اللي يفهمه المحرك.
 * settings: لو الساحر من فئات اللعبة، نقرا بعد مين مات بالليل (علامات slain:night) —
 * قراءة ثالثة بس للغرف اللي فيها ساحر.
 */
async function loadEngine(admin: Admin, roomCode: string, settings?: MafiaSettings) {
  const withSlain = Boolean(settings?.optionalRoles?.includes("magician"));
  const [players, secrets, slainRes] = await Promise.all([
    loadPlayers(admin, roomCode),
    loadSecrets(admin, roomCode),
    withSlain ? admin.from("mafia_actions").select("actor_id").eq("room_code", roomCode).eq("step", SLAIN_STEP) : null,
  ]);
  const slain = new Set((((slainRes?.data ?? []) as { actor_id: string }[]) ?? []).map((r) => r.actor_id));
  const secretOf = new Map(secrets.map((s) => [s.player_id, s]));
  const engine: EnginePlayer[] = players.map((p) => {
    const s = secretOf.get(p.id);
    return {
      id: p.id,
      name: p.display_name,
      seat: p.seat,
      alive: p.is_alive,
      role: (s?.role ?? "citizen") as MafiaRole,
      originalRole: (s?.original_role ?? s?.role ?? "citizen") as MafiaRole,
      soldierShieldUsed: s?.soldier_shield_used ?? false,
      abilityUsed: s?.ability_used ?? false,
      suicideTarget: s?.suicide_target ?? null,
      lastProtected: s?.last_protected ?? null,
      diedAtNight: slain.has(p.id),
    };
  });
  return { players, secrets, engine, secretOf };
}

/**
 * موعد نهاية بعد ms، ومعه لحظة حسابه (updated_at). القاعدة (0019_mafia_deadline_at_write) تعيد الموعد
 * = لحظة الكتابة نفسها + نفس المدة: لو تأخرت الكتابة بالطريق، المرحلة تاخذ وقتها كامل من لحظة ما تنكتب.
 * بدون 0019: الموعد ينكتب مثل ما انحسب هنا، و updated_at ينكتب فوقه الحين (الـ trigger القديم) — مثل قبل بالضبط.
 */
function deadlineIn(ms: number): Pick<MafiaRoom, "phase_ends_at" | "updated_at"> {
  const from = Date.now();
  return { phase_ends_at: new Date(from + ms).toISOString(), updated_at: new Date(from).toISOString() };
}

/** موعد نهاية المرحلة (mafiaDeadline) على نفس الطريقة. مرحلة بدون مؤقت: phase_ends_at = null بس */
function phaseDeadline(phase: MafiaRoom["phase"], settings?: MafiaSettings): Pick<MafiaRoom, "phase_ends_at" | "updated_at"> {
  const from = Date.now();
  const ends = mafiaDeadline(phase, from, settings);
  return ends === null ? { phase_ends_at: null } : { phase_ends_at: ends, updated_at: new Date(from).toISOString() };
}

/**
 * يحدّث الغرفة بشرط إن المرحلة ما تغيرت من جهاز ثاني.
 * يرجع true إذا هذا الطلب هو اللي نفّذ الانتقال.
 */
async function guardedRoomUpdate(
  admin: Admin,
  room: MafiaRoom,
  patch: Partial<MafiaRoom>
): Promise<boolean> {
  const { data, error } = await admin
    .from("mafia_rooms")
    .update({ ...patch, phase_seq: room.phase_seq + 1 })
    .eq("room_code", room.room_code)
    .eq("phase_seq", room.phase_seq)
    .select("room_code");

  if (error) {
    console.error("mafia guardedRoomUpdate error:", error);
    return false;
  }
  return Boolean(data && data.length > 0);
}

// ---------------------------------------------------------------------
// جلسات اللعب: حساب التجربة المجانية والرصيد القديم بالسيرفر (lib/game-sessions.ts)
// ---------------------------------------------------------------------

const SESSION_BUSY_MESSAGE = "عندك لعبة مافيا ثانية شغالة بنفس الحساب. كمّلها أو أنهها، وبعدها ابدأ هذي.";

/** اللعبة وقفت فعلاً (رجعت للانتظار أو انتهت أو انقفلت): الجلسة ترجع لو قبل أول صباح */
async function endSessionIfStopped(admin: Admin, roomCode: string): Promise<void> {
  const room = await loadRoom(admin, roomCode);
  if (room && (room.phase === "lobby" || room.phase === "ended" || room.phase === "closed")) {
    await endGameSession(admin, MAFIA_GAME.id, roomCode);
  }
}

/** غرف قديمة طلع منها منشئها قبل أول صباح، ورجعت تجربتها مع البدء الجديد: تنقفل عشان ما تكمل ببلاش */
async function closeAbandonedRooms(admin: Admin, roomCodes: string[]): Promise<void> {
  await Promise.all(
    roomCodes.map(async (code) => {
      const room = await loadRoom(admin, code);
      if (!room || room.phase === "lobby" || room.phase === "ended" || room.phase === "closed") return;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { movedTo, ...settings } = room.settings;
      await guardedRoomUpdate(admin, room, { phase: "closed", night_step: null, phase_ends_at: null, settings });
    })
  );
}

/** يتحقق من مفتاح اللاعب ويرجع الغرفة واللاعب وسرّه */
type PlayerContext =
  | { ok: false; error: string }
  | { ok: true; admin: Admin; room: MafiaRoom; player: MafiaPlayer; secret: SecretRow; roomCode: string };

async function requirePlayer(input: { roomCode: string; token: string }): Promise<PlayerContext> {
  const parsed = MafiaSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات الجلسة غير صحيحة." };
  const { roomCode, token } = parsed.data;

  const admin = getSupabaseServiceRole();
  const { data: secret } = await admin
    .from("mafia_secrets")
    .select("*")
    .eq("token", token)
    .eq("room_code", roomCode)
    .maybeSingle();
  if (!secret) return { ok: false, error: "انتهت جلستك في هذه الغرفة." };

  const [room, playerRes] = await Promise.all([
    loadRoom(admin, roomCode),
    admin.from("mafia_players").select("*").eq("id", secret.player_id).maybeSingle(),
  ]);
  if (!room || !playerRes.data) return { ok: false, error: "الغرفة غير موجودة." };

  return {
    ok: true,
    admin,
    room,
    player: playerRes.data as MafiaPlayer,
    secret: secret as SecretRow,
    roomCode,
  };
}

/** يتحقق إن المستخدم المسجّل هو منشئ الغرفة */
type HostContext =
  | { ok: false; error: string }
  | { ok: true; admin: Admin; room: MafiaRoom; roomCode: string; userId: string };

async function requireHost(rawRoomCode: string): Promise<HostContext> {
  const parsed = MafiaRoomCodeSchema.safeParse(rawRoomCode);
  if (!parsed.success) return { ok: false, error: "رمز الغرفة غير صحيح." };
  const roomCode = parsed.data;

  const userId = await getGameUserId();
  if (!userId) return { ok: false, error: "يجب تسجيل الدخول." };

  const admin = getSupabaseServiceRole();
  const room = await loadRoom(admin, roomCode);
  if (!room) return { ok: false, error: "الغرفة غير موجودة." };
  if (room.host_user_id !== userId) return { ok: false, error: "هذا الزر لمنشئ اللعبة فقط." };

  return { ok: true, admin, room, roomCode, userId };
}

async function insertPlayer(
  admin: Admin,
  roomCode: string,
  displayName: string,
  seat: number,
  isBot: boolean
): Promise<{ playerId: string; token: string } | { error: string }> {
  const { data: player, error } = await admin
    .from("mafia_players")
    .insert({ room_code: roomCode, display_name: displayName, seat, is_bot: isBot })
    .select("id")
    .single();

  if (error || !player) {
    if (error?.code === "23505") return { error: "هذا الاسم مستخدم في الغرفة، اختر اسم ثاني." };
    console.error("mafia insertPlayer error:", error);
    return { error: "تعذّر الانضمام للغرفة." };
  }

  const token = newToken();
  const { error: secretError } = await admin
    .from("mafia_secrets")
    .insert({ player_id: player.id, room_code: roomCode, token });

  if (secretError) {
    console.error("mafia insert secret error:", secretError);
    await admin.from("mafia_players").delete().eq("id", player.id);
    return { error: "تعذّر الانضمام للغرفة." };
  }

  return { playerId: player.id, token };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** أكبر مقعد بالغرفة (null = القاعدة ما ردت) */
async function maxSeat(admin: Admin, roomCode: string): Promise<number | null> {
  const { data, error } = await admin
    .from("mafia_players")
    .select("seat")
    .eq("room_code", roomCode)
    .order("seat", { ascending: false })
    .limit(1);
  if (error) return null;
  return data?.[0]?.seat ?? 0;
}

/**
 * رقم مقعد ما يتكرر حتى لو دخل كذا لاعب بنفس اللحظة (بدون أي تعديل بالقاعدة):
 * آخر رقم انعطى ينحفظ بالغرفة (night_ready.lastSeat — العمود ما ينستخدم وقت الانتظار، وأول ما تبدأ
 * اللعبة ينكتب فوقه)، وكل لاعب ياخذ الرقم اللي بعده بتحديث مشروط: "بشرط إن آخر رقم لسا هو اللي قريته".
 * لو سبقه أحد، التحديث ما يمشي، فيقرا من جديد ويحاول — فكل رقم ينعطى لواحد بس.
 * "started" = اللعبة بدأت. "failed" = القاعدة ما ردت بعد كل المحاولات (أحسن من رقم ممكن يتكرر).
 */
async function allocateSeat(admin: Admin, roomCode: string): Promise<number | "started" | "failed"> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const { data: room, error: readError } = await admin
      .from("mafia_rooms")
      .select("phase, night_ready")
      .eq("room_code", roomCode)
      .maybeSingle();
    if (readError) {
      await sleep(150 + Math.random() * 250);
      continue;
    }
    if (!room || room.phase !== "lobby") return "started";
    const ready = (room.night_ready && typeof room.night_ready === "object" ? room.night_ready : {}) as Record<
      string,
      unknown
    >;
    const stored = typeof ready.lastSeat === "number" ? ready.lastSeat : null;
    // ما فيه رقم محفوظ (غرفة جديدة أو جولة جديدة): نبدأ من أكبر مقعد موجود
    const last = stored ?? (await maxSeat(admin, roomCode));
    if (last === null) {
      await sleep(150 + Math.random() * 250);
      continue;
    }
    const next = last + 1;

    const update = admin
      .from("mafia_rooms")
      .update({ night_ready: { ...ready, lastSeat: next } })
      .eq("room_code", roomCode)
      .eq("phase", "lobby");
    const { data: won, error } = await (stored === null
      ? update.is("night_ready->>lastSeat", null)
      : update.eq("night_ready->>lastSeat", String(stored))
    ).select("room_code");
    if (error) {
      // العمود ناقص (0007 ما انشغّل): نرجع للطريقة القديمة بدل ما يتعطل الدخول
      if (error.code === "42703" || error.code === "PGRST204") {
        console.warn("mafia allocateSeat (شغّل 0007_mafia_night_ready.sql):", error.message);
        return next;
      }
      // انقطاع أو خطأ مؤقت: نعيد (ما نعطي رقم بدون حجز — ممكن يتكرر)
      console.warn("mafia allocateSeat retry:", error.message);
      await sleep(150 + Math.random() * 250);
      continue;
    }
    if (won && won.length > 0) return next;
    await sleep(15 + Math.random() * 60);
  }
  console.warn("mafia allocateSeat: ما انحجز مقعد بعد 40 محاولة", roomCode);
  return "failed";
}

/**
 * شبكة أمان قبل التوزيع: لو فيه مقاعد مكررة (غرف قديمة قبل هالإصلاح)، نرقّمها من جديد
 * بنفس الترتيب (المقعد ثم وقت الدخول) — ترتيب الأدوار وقائد المافيا يعتمد عليها
 */
async function renumberDuplicateSeats(admin: Admin, players: MafiaPlayer[]): Promise<MafiaPlayer[]> {
  if (new Set(players.map((p) => p.seat)).size === players.length) return players;
  const ordered = [...players].sort(
    (a, b) => a.seat - b.seat || String(a.joined_at ?? "").localeCompare(String(b.joined_at ?? "")) || a.id.localeCompare(b.id)
  );
  await Promise.all(
    ordered.map((p, i) => (p.seat === i + 1 ? null : admin.from("mafia_players").update({ seat: i + 1 }).eq("id", p.id)))
  );
  return ordered.map((p, i) => ({ ...p, seat: i + 1 }));
}

// ---------------------------------------------------------------------
// الإنشاء والانضمام
// ---------------------------------------------------------------------

/** ينشئ غرفة ويدخل المنشئ فيها كأول لاعب — مشترك بين "إنشاء" و"غرفة جديدة" */
async function createRoomInternal(
  admin: Admin,
  userId: string,
  displayName: string,
  settings: MafiaSettings
): Promise<{ roomCode: string; token: string } | { error: string }> {
  let roomCode = "";
  for (let attempt = 0; attempt < 8 && !roomCode; attempt++) {
    const code = generateMafiaRoomCode();
    const { error } = await admin.from("mafia_rooms").insert({
      room_code: code,
      host_user_id: userId,
      phase: "lobby",
      settings,
    });
    if (!error) roomCode = code;
    else if (error.code !== "23505") {
      console.error("createMafiaRoom error:", error);
      return { error: "تعذّر إنشاء الغرفة." };
    }
  }
  if (!roomCode) return { error: "تعذّر توليد رمز غرفة فريد، حاول مرة أخرى." };

  const joined = await insertPlayer(admin, roomCode, displayName, 1, false);
  if ("error" in joined) return joined;

  await admin.from("mafia_rooms").update({ host_player_id: joined.playerId }).eq("room_code", roomCode);
  return { roomCode, token: joined.token };
}

export async function createMafiaRoom(input: {
  displayName: string;
  settings: MafiaSettings;
}): Promise<ActionResult<{ roomCode: string; token: string }>> {
  const parsed = MafiaCreateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة.");
  const { displayName, settings } = parsed.data;

  const settingsError = validateMafiaSettings(settings);
  if (settingsError) return fail(settingsError);

  const userId = await getGameUserId();
  if (!userId) return fail("يجب تسجيل الدخول لإنشاء غرفة.");

  // الاشتراك يتفحص هنا بدري (بدون ما ينحسب شي) عشان المنشئ ما يجمع الشباب على الفاضي
  if (!MAFIA_CONFIG.IS_FREE && !(await checkAccessAction(MAFIA_GAME.id)).allowed) {
    return fail(MAFIA_CONFIG.NO_ACCESS_MESSAGE);
  }

  const created = await createRoomInternal(getSupabaseServiceRole(), userId, displayName, settings);
  if ("error" in created) return fail(created.error);
  return { success: true, data: created };
}

export async function getMafiaRoomPublicInfo(
  rawRoomCode: string
): Promise<ActionResult<{ phase: MafiaRoom["phase"]; joined: number; maxPlayers: number }>> {
  const parsed = MafiaRoomCodeSchema.safeParse(rawRoomCode);
  if (!parsed.success) return fail("رمز الغرفة غير صحيح.");

  const admin = getSupabaseServiceRole();
  const room = await loadRoom(admin, parsed.data);
  if (!room) return fail("لم نجد غرفة بهذا الرمز.");

  const { count } = await admin
    .from("mafia_players")
    .select("id", { count: "exact", head: true })
    .eq("room_code", room.room_code);

  return {
    success: true,
    data: { phase: room.phase, joined: count ?? 0, maxPlayers: room.settings.maxPlayers },
  };
}

export async function joinMafiaRoom(input: {
  roomCode: string;
  displayName: string;
}): Promise<ActionResult<{ roomCode: string; token: string }>> {
  const parsed = MafiaJoinSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة.");
  const { roomCode, displayName } = parsed.data;

  const admin = getSupabaseServiceRole();
  const room = await loadRoom(admin, roomCode);
  if (!room) return fail("لم نجد غرفة بهذا الرمز.");
  if (room.phase === "closed") return fail("هذي الغرفة انقفلت، اطلب الكود الجديد من المنشئ.");
  if (room.phase !== "lobby") return fail("اللعبة بدأت، ما تقدر تدخل الحين.");

  // نفس الاسم في الانتظار = نفس الشخص رجع (سكّر المتصفح مثلاً): ياخذ مكانه بمفتاح جديد
  // بدل ما يعلق اسمه القديم ويقول له "الغرفة ممتلئة"
  const { data: sameName } = await admin
    .from("mafia_players")
    .select("id")
    .eq("room_code", roomCode)
    .eq("display_name", displayName)
    .maybeSingle();
  if (sameName) {
    if (sameName.id === room.host_player_id) return fail("هذا اسم المنشئ، اختر اسم ثاني.");
    const token = newToken();
    await admin.from("mafia_secrets").update({ token }).eq("player_id", sameName.id);
    return { success: true, data: { roomCode, token } };
  }

  const { count } = await admin
    .from("mafia_players")
    .select("id", { count: "exact", head: true })
    .eq("room_code", roomCode);
  if ((count ?? 0) >= room.settings.maxPlayers) return fail("الغرفة ممتلئة.");

  const seat = await allocateSeat(admin, roomCode);
  if (seat === "started") return fail("اللعبة بدأت، ما تقدر تدخل الحين.");
  if (seat === "failed") return fail("تعذّر الانضمام للغرفة، حاول مرة ثانية.");
  const joined = await insertPlayer(admin, roomCode, displayName, seat, false);
  if ("error" in joined) return fail(joined.error);

  return { success: true, data: { roomCode, token: joined.token } };
}

/** لاعب يطلع من غرفة الانتظار (المنشئ ما يطلع — يسكّر الصفحة بس) */
export async function leaveMafiaRoom(input: { roomCode: string; token: string }): Promise<ActionResult> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return { success: true };
  const { admin, room, player } = ctx;
  if (room.phase !== "lobby" || room.host_player_id === player.id) return { success: true };

  await admin.from("mafia_players").delete().eq("id", player.id);
  return { success: true };
}

/** اللاعب يغيّر اسمه في غرفة الانتظار */
export async function renameMafiaPlayer(input: {
  roomCode: string;
  token: string;
  displayName: string;
}): Promise<ActionResult> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, player } = ctx;
  if (room.phase !== "lobby") return fail("تقدر تغيّر اسمك في غرفة الانتظار بس.");

  const parsed = MafiaNameSchema.safeParse(input.displayName);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "الاسم غير صحيح.");

  const { error } = await admin.from("mafia_players").update({ display_name: parsed.data }).eq("id", player.id);
  if (error) {
    if (error.code === "23505") return fail("هذا الاسم مستخدم في الغرفة، اختر اسم ثاني.");
    console.error("renameMafiaPlayer error:", error);
    return fail("تعذّر تغيير الاسم.");
  }
  return { success: true };
}

// ---------------------------------------------------------------------
// شاشة اللاعب الخاصة: "وش أشوف أنا؟"
// ---------------------------------------------------------------------

export interface MafiaTargetOption {
  id: string;
  name: string;
}

/**
 * النمط السريع، الساحر: بطاقة فاضية (المحقق/الطبيب/الجندي مات بالليل) وأهداف فئتها —
 * يختار البطاقة والشخص بضغطة وحدة وطلب واحد.
 */
export interface MafiaMagicianCard {
  /** معرّف صاحب الفئة اللي مات (هو "البطاقة" — نفس معرّف الخيار في options) */
  id: string;
  role: MafiaRole;
  label: string;
  /** أهداف الفئة لو صارها، بقواعدها (الطبيب حتى نفسه، المحقق غيره). فاضية للجندي: زر "خذ الدرع" */
  options: MafiaTargetOption[];
}

/** مهمة صاحب الدور الليلة (ومنهم قائد المافيا بس — زملاؤه يجاوبون سؤال التمويه مثل الكل) */
export interface MafiaTask {
  step: MafiaNightStep;
  options: MafiaTargetOption[];
  /** اختياري المحفوظ */
  selectedId: string | null;
  /** اخترت — ما يتغير */
  locked: boolean;
  /** النمط السريع، الساحر قبل ما يختار: البطاقات المتاحة وأهداف كل واحدة (شاشة وحدة) */
  cards?: MafiaMagicianCard[];
  /** قرار القتل انتقل لي من القائد (ما وصلته مهمته) — شاشتي كانت على سؤال التمويه وتبدلت */
  handover?: boolean;
}

export interface MafiaMyView {
  serverNow: number;
  /** رقم المرحلة وقت ما انحسبت هذي الحالة — الجهاز يربط فيه المؤثرات بالمرحلة الصحيحة */
  phaseSeq: number;
  me: {
    id: string;
    name: string;
    alive: boolean;
    isHost: boolean;
    role: MafiaRole | null;
    soldierShieldUsed: boolean;
    abilityUsed: boolean;
  };
  /** أسماء المافيا — يشوفها المافيا بس */
  mafiaTeam: MafiaTargetOption[];
  task: MafiaTask | null;
  /** نتيجة تحقيقي الليلة — تظل ظاهرة لي لين يخلص دور المحقق (حتى لو النظام اختار عني) */
  detectiveResult: { targetName: string; isMafia: boolean } | null;
  /** صوتي في التصويت الحالي: معرّف لاعب، أو "skip"، أو null */
  myVote: string | null;
  /** اختياري في سؤال التمويه لدور الليل الحالي (null = ما اخترت للحين) */
  decoyId: string | null;
  /** الشيخ بالصباح: true = نقاش منظم، false = عشوائي، null = ما اختار للحين */
  sheikhLed: boolean | null;
  notes: string[];
}

export async function getMafiaMyView(input: {
  roomCode: string;
  token: string;
}): Promise<ActionResult<MafiaMyView>> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, player } = ctx;
  let { secret } = ctx;
  // اللعبة توها بدأت والسر انقرا قبل توزيع الأدوار بلحظة (السر ينقرا قبل الغرفة):
  // نقراه من جديد عشان الجوال ما ياخذ "كشف الأدوار" بدون دور
  if (room.phase !== "lobby" && room.phase !== "closed" && !secret.role) {
    const { data: again } = await admin
      .from("mafia_secrets")
      .select("*")
      .eq("player_id", player.id)
      .eq("room_code", room.room_code)
      .maybeSingle();
    if (again) secret = again as SecretRow;
  }

  const role = room.phase === "lobby" ? null : secret.role;
  const view: MafiaMyView = {
    serverNow: Date.now(),
    phaseSeq: room.phase_seq,
    me: {
      id: player.id,
      name: player.display_name,
      alive: player.is_alive,
      isHost: room.host_player_id === player.id,
      role,
      soldierShieldUsed: secret.soldier_shield_used,
      abilityUsed: secret.ability_used,
    },
    mafiaTeam: [],
    task: null,
    detectiveResult: null,
    myVote: null,
    decoyId: null,
    sheikhLed: null,
    notes: Array.isArray(secret.notes) ? secret.notes : [],
  };

  if (role === "sheikh" && room.phase === "morning" && player.is_alive) {
    const { data: pick } = await admin
      .from("mafia_actions")
      .select("target_id")
      .eq("room_code", room.room_code)
      .eq("night", room.night_number)
      .eq("step", SHEIKH_STEP)
      .eq("actor_id", player.id)
      .maybeSingle();
    view.sheikhLed = pick ? Boolean(pick.target_id) : null;
  }

  // النمط السريع: الليل دور واحد للكل — مهمة كل واحد حسب فئته، وسؤال تمويه واحد لليلة
  const fast = isFastMafia(room.settings);

  if (room.phase === "night_act" && (room.night_step || fast) && player.is_alive) {
    const { data: decoy } = await admin
      .from("mafia_actions")
      .select("target_id")
      .eq("room_code", room.room_code)
      .eq("night", room.night_number)
      .eq("step", fast ? FAST_DECOY : decoyStep(room.night_step!))
      .eq("actor_id", player.id)
      .maybeSingle();
    view.decoyId = decoy?.target_id ?? null;
  }

  if (!role) return { success: true, data: view };

  // الساحر الأصلي بدور الساحر: حتى لو أخذ فئة توه (فئته تغيّرت)، نبني له بطاقة "تم" من اختياره
  const magicianNow =
    secret.original_role === "magician" && room.phase === "night_act" && (fast || room.night_step === "magician");
  const myStepNow =
    ((room.phase === "night_act" || room.phase === "night_done") && (fast ? isRoleStep(role) : room.night_step === role)) ||
    magicianNow;
  const needsEngine = role === "mafia" || myStepNow;
  if (needsEngine) {
    const { engine } = await loadEngine(admin, room.room_code, room.settings);

    if (myStepNow && role === "detective" && player.is_alive) {
      const { data: inv } = await admin
        .from("mafia_actions")
        .select("target_id")
        .eq("room_code", room.room_code)
        .eq("night", room.night_number)
        .eq("step", "detective")
        .eq("actor_id", player.id)
        .maybeSingle();
      const target = inv?.target_id ? engine.find((p) => p.id === inv.target_id) : undefined;
      if (target) view.detectiveResult = { targetName: target.name, isMafia: target.role === "mafia" };
    }

    if (role === "mafia") {
      view.mafiaTeam = engine
        .filter((p) => p.role === "mafia")
        .map((p) => ({ id: p.id, name: p.alive ? p.name : `${p.name} (ميت)` }));
    }

    if (room.phase === "night_act" && room.night_step && player.is_alive) {
      view.task = await buildTask(admin, room, room.night_step, engine, player.id);
    } else if (room.phase === "night_act" && fast && player.is_alive) {
      if (isRoleStep(role)) view.task = await buildTask(admin, room, role, engine, player.id);
      // السريع: الساحر أخذ فئة ما لها دور بالليل (الجندي) — تظل بطاقة "تم" عنده بدل سؤال التمويه
      if (!view.task && magicianNow && role !== "magician") {
        view.task = await buildTask(admin, room, "magician", engine, player.id);
      }
    }
  }

  if (room.phase === "voting") {
    const { data: vote } = await admin
      .from("mafia_votes")
      .select("target_id")
      .eq("room_code", room.room_code)
      .eq("round", room.night_number)
      .eq("voter_id", player.id)
      .maybeSingle();
    if (vote) view.myVote = vote.target_id ?? MAFIA_SKIP_KEY;
  }

  return { success: true, data: view };
}

async function buildTask(
  admin: Admin,
  room: MafiaRoom,
  step: MafiaNightStep,
  engine: EnginePlayer[],
  meId: string
): Promise<MafiaTask | null> {
  const me = engine.find((p) => p.id === meId);
  if (!me || !me.alive) return null;

  const { data: mine } = await admin
    .from("mafia_actions")
    .select("target_id")
    .eq("room_code", room.room_code)
    .eq("night", room.night_number)
    .eq("step", step)
    .eq("actor_id", me.id)
    .maybeSingle();

  // الساحر اختار فئة وتغيّرت فئته بنفس اللحظة: بطاقته تظل "تم" باختياره، مو سؤال التمويه
  if (mine && step === "magician" && me.originalRole === "magician" && me.role !== "magician") {
    const target = mine.target_id ? engine.find((p) => p.id === mine.target_id) : undefined;
    const options = target ? [{ id: target.id, name: MAFIA_ROLES[target.role].label }] : [];
    return { step, options, selectedId: mine.target_id ?? null, locked: true };
  }
  if (me.role !== step) return null;

  // مافيا مو قائد الليلة: ما عنده مهمة — يجاوب سؤال التمويه مثل الكل
  const leaderId = await nightLeaderId(admin, room, engine);
  if (!canActOnStep(me, step, leaderId, engine)) return null;

  const targets = allowedTargets(me, step, engine);
  const options = targets.map((p) => ({
    id: p.id,
    // الساحر يختار فئة (المحقق/الطبيب/الجندي)، مو اسم اللاعب الميت
    name: step === "magician" ? MAFIA_ROLES[p.role].label : p.name,
  }));

  const task: MafiaTask = {
    step,
    options,
    selectedId: mine?.target_id ?? null,
    locked: Boolean(mine),
  };
  if (step === "mafia" && leaderId !== mafiaLeaderId(engine, room.night_number, room.settings.leadSeed)) task.handover = true;
  // السريع: الساحر يختار البطاقة والشخص بشاشة وحدة وطلب واحد — نرسل مع كل بطاقة أهداف فئتها
  if (step === "magician" && !mine && isFastMafia(room.settings)) {
    task.cards = targets.map((v) => ({
      id: v.id,
      role: v.role,
      label: MAFIA_ROLES[v.role].label,
      options: magicianCardTargets(me, v.role, engine).map((p) => ({ id: p.id, name: p.name })),
    }));
  }
  return task;
}

// ---------------------------------------------------------------------
// أفعال الليل
// ---------------------------------------------------------------------

/**
 * الساحر اختار فئة: تصير فئته من هذي اللحظة (بقدراتها كاملة: درع جديد للجندي) عشان يلعب بها بنفس الليلة.
 * سري: ينكتب بسرّه بس، والإعلان العام بالصباح يقول "اختار فئة" بدون ما يقول أي فئة.
 * شرط ability_used = false: لو وصل طلبين بنفس اللحظة، الأول بس يغيّر.
 */
async function applyMagicianSwitch(admin: Admin, playerId: string, role: MafiaRole, notes: string[] | null | undefined): Promise<void> {
  const label = MAFIA_ROLES[role].label;
  const note = `جاء دورك! صرت ${label} — ${label} الأصلي ودّع الملاعب`;
  await admin
    .from("mafia_secrets")
    .update({ ...magicianSwitchPatch(role), notes: [...(notes ?? []), note] })
    .eq("player_id", playerId)
    .eq("ability_used", false);
}

type DetectiveResult = { targetName: string; isMafia: boolean };
type NightActResult = ActionResult<{ detectiveResult: DetectiveResult | null }>;
const investigation = (p: EnginePlayer | undefined): DetectiveResult | null =>
  p ? { targetName: p.name, isMafia: p.role === "mafia" } : null;

/** اختياري المسجّل الليلة بدور معيّن (null = ما فيه) */
async function myNightRow(admin: Admin, room: MafiaRoom, playerId: string, step: MafiaNightStep): Promise<{ target_id: string | null } | null> {
  const { data } = await admin
    .from("mafia_actions")
    .select("target_id")
    .eq("room_code", room.room_code)
    .eq("night", room.night_number)
    .eq("step", step)
    .eq("actor_id", playerId)
    .maybeSingle();
  return (data as { target_id: string | null } | null) ?? null;
}

/**
 * الجوال يعيد إرسال اختياره لو الرد ما وصله خلال المهلة (4 ثواني) — والأول ممكن يكون وصل وانحفظ.
 * لو نفس الاختيار مسجّل الليلة: الإعادة تنجح مثل الأول (والمحقق ياخذ نفس النتيجة)، بدون ما يتغير شي.
 * null = مو مسجّل، فالرفض الأصلي هو الصحيح.
 */
async function resentNightChoice(
  admin: Admin,
  room: MafiaRoom,
  playerId: string,
  input: { targetId: string | null; card?: string | null }
): Promise<NightActResult | null> {
  const { data } = await admin
    .from("mafia_actions")
    .select("step, target_id")
    .eq("room_code", room.room_code)
    .eq("night", room.night_number)
    .eq("actor_id", playerId)
    .in("step", [...MAFIA_NIGHT_ORDER]);
  const rows = (data ?? []) as { step: string; target_id: string | null }[];
  let hit: { step: string; target_id: string | null } | undefined;
  if (input.card) {
    if (!rows.some((r) => r.step === "magician" && r.target_id === input.card)) return null;
    hit = input.targetId === null ? undefined : rows.find((r) => r.step !== "magician" && r.target_id === input.targetId);
    if (input.targetId !== null && !hit) return null;
  } else {
    hit = rows.find((r) => r.target_id === input.targetId);
    if (!hit) return null;
  }
  let detectiveResult: DetectiveResult | null = null;
  if (hit?.step === "detective" && hit.target_id) {
    const { engine } = await loadEngine(admin, room.room_code, room.settings);
    detectiveResult = investigation(engine.find((p) => p.id === hit.target_id));
  }
  return { success: true, data: { detectiveResult } };
}

/**
 * الساحر: يسجّل اختياره (البطاقة، أو null = عدّى) — وبالسريع مع فعل فئته الجديدة على الشخص بنفس الطلب.
 * كل كتابة تتحمل التكرار (الجوال يعيد الإرسال): البطاقة تنحفظ مرة، والشخص المسجّل أول هو المعتمد.
 * played = الشخص المعتمد (المحقق: نتيجته).
 */
async function recordMagicianPick(
  admin: Admin,
  room: MafiaRoom,
  me: EnginePlayer,
  engine: EnginePlayer[],
  vacancyId: string | null,
  play: { role: MafiaNightStep; person: EnginePlayer } | null
): Promise<{ ok: true; played?: EnginePlayer } | { ok: false; error: string }> {
  const { error } = await admin
    .from("mafia_actions")
    .upsert(
      { room_code: room.room_code, night: room.night_number, step: "magician", actor_id: me.id, target_id: vacancyId },
      { onConflict: "room_code,night,step,actor_id", ignoreDuplicates: true }
    );
  if (error) {
    console.error("submitMafiaNightAction (magician) error:", error);
    return { ok: false, error: "تعذّر حفظ اختيارك." };
  }
  if (!play) return { ok: true };
  const { error: playError } = await admin.from("mafia_actions").insert({
    room_code: room.room_code,
    night: room.night_number,
    step: play.role,
    actor_id: me.id,
    target_id: play.person.id,
  });
  if (!playError) return { ok: true, played: play.person };
  if (playError.code !== "23505") {
    console.error("submitMafiaNightAction (magician card) error:", playError);
    return { ok: false, error: "تعذّر حفظ اختيارك." };
  }
  // مسجّل قبل: إعادة إرسال، أو الليل خلص بين البطاقة والشخص (ضغط بآخر لحظة) والنظام اختار عنه — المعتمد هو المسجّل
  const kept = await myNightRow(admin, room, me.id, play.role);
  return { ok: true, played: kept?.target_id ? engine.find((p) => p.id === kept.target_id) : undefined };
}

/**
 * صاحب الدور يضغط على اسم — الاختيار نهائي.
 * targetId = null: الساحر أو الصحفي يعدّي الليلة بدون ما يستخدم قدرته.
 * card (النمط السريع، الساحر): البطاقة اللي يصيرها (صاحب الفئة اللي مات بالليل) — ومعها targetId الشخص
 * اللي يلعب عليه بفئته الجديدة (null للجندي: ياخذ الدرع بس). الاثنين بطلب واحد، بدون خطوة ثانية.
 * seq (الجوال): رقم المرحلة وقت الضغطة — طلب متأخر ما ينحسب على دور ثاني.
 * الجوال يعيد نفس الطلب لو رده ما وصل بالمهلة: الإعادة تنجح لو الأول انحفظ (resentNightChoice)، وما تغيّر شي.
 * لو كل أصحاب الدور خلّصوا، الدور ينتهي للكل على طول.
 */
export async function submitMafiaNightAction(input: {
  roomCode: string;
  token: string;
  targetId: string | null;
  card?: string | null;
  seq?: number;
}): Promise<NightActResult> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, player } = ctx;
  const resentOr = async (error: string): Promise<NightActResult> =>
    (await resentNightChoice(admin, room, player.id, input)) ?? fail(error);

  const fast = isFastMafia(room.settings);
  if (room.phase !== "night_act" || (!room.night_step && !fast) || (input.seq !== undefined && input.seq !== room.phase_seq)) {
    return resentOr("انتهى وقت هذا الدور.");
  }
  if (room.phase_ends_at && Date.now() > Date.parse(room.phase_ends_at) + 1000) return resentOr("انتهى الوقت.");

  const { engine } = await loadEngine(admin, room.room_code, room.settings);
  const me = engine.find((p) => p.id === player.id);
  if (!me) return fail("مو دورك الحين.");

  // إعادة إرسال لاختيار الساحر اللي غيّر فئته (الطلب الأول وصل، أو للحين يكتب): نكمّل تسجيله بدل ما نرفضه.
  // نفس البطاقة ونفس الشخص — ما يتغير شي
  const switchedBy = input.card ?? input.targetId;
  const resentSwitch =
    me.alive &&
    me.originalRole === "magician" &&
    me.role !== "magician" &&
    (fast || room.night_step === "magician") &&
    engine.some((p) => p.id === switchedBy && !p.alive && p.role === me.role && MAFIA_MAGICIAN_ROLES.includes(p.role));
  if (resentSwitch) {
    let play: { role: MafiaNightStep; person: EnginePlayer } | null = null;
    const roleStep = MAFIA_NIGHT_ORDER.find((s) => s === me.role);
    if (input.card && roleStep) {
      const person = magicianCardTargets(me, me.role, engine).find((p) => p.id === input.targetId);
      if (!person) return resentOr("ما تقدر تختار هذا اللاعب.");
      play = { role: roleStep, person };
    }
    const rec = await recordMagicianPick(admin, room, me, engine, switchedBy, play);
    if (!rec.ok) return fail(rec.error);
    await finishStepIfAllDone(admin, room.room_code, room.phase_seq);
    return { success: true, data: { detectiveResult: play?.role === "detective" ? investigation(rec.played) : null } };
  }

  const leaderId = await nightLeaderId(admin, room, engine);
  // النمط السريع: الكل بنفس الوقت — دور كل واحد حسب فئته
  const step = fast ? fastNightStep(me, leaderId, engine) : room.night_step;
  if (!step || !canActOnStep(me, step, leaderId, engine)) return resentOr("مو دورك الحين.");

  let target: EnginePlayer | undefined;
  // السريع، الساحر: البطاقة والشخص بطلب واحد — نتحقق من الاثنين قبل ما نكتب أي شي
  let cardPlay: { role: MafiaNightStep; person: EnginePlayer } | null = null;
  if (fast && step === "magician" && input.card) {
    const vacancy = allowedTargets(me, step, engine).find((p) => p.id === input.card);
    if (!vacancy) return resentOr("ما تقدر تختار هذي الفئة.");
    const roleStep = MAFIA_NIGHT_ORDER.find((s) => s === vacancy.role);
    if (roleStep) {
      if (input.targetId === null) return fail("لازم تختار لاعب.");
      const person = magicianCardTargets(me, vacancy.role, engine).find((p) => p.id === input.targetId);
      if (!person) return resentOr("ما تقدر تختار هذا اللاعب.");
      cardPlay = { role: roleStep, person };
    }
    target = vacancy;
  } else if (input.targetId === null) {
    if (step !== "magician" && step !== "journalist") return fail("لازم تختار لاعب.");
  } else {
    target = allowedTargets(me, step, engine).find((p) => p.id === input.targetId);
    if (!target) return resentOr("ما تقدر تختار هذا اللاعب.");
  }

  if (step === "magician") {
    // اختار قبل شي ثاني (عدّى مثلاً): ما يتغير، وما نغيّر فئته. نفس الاختيار (إعادة إرسال وصلت مع الأول) يكمل عادي
    const prior = await myNightRow(admin, room, me.id, "magician");
    if (prior && prior.target_id !== (target?.id ?? null)) return fail("خلاص اخترت، ما تقدر تغيّر.");
    // الساحر اختار فئة: التغيير قبل تسجيل الاختيار عمداً — لو حسب جوال ثاني "الكل اختار؟" بنفس اللحظة،
    // يشوفه بفئته الجديدة ومهمتها الباقية (مو ساحر خلّص)، وإلا ينتهي الليل قبل ما يلعب بها.
    if (!prior && target && MAFIA_MAGICIAN_ROLES.includes(target.role)) await applyMagicianSwitch(admin, me.id, target.role, ctx.secret.notes);
    const rec = await recordMagicianPick(admin, room, me, engine, target?.id ?? null, cardPlay);
    if (!rec.ok) return fail(rec.error);
    await finishStepIfAllDone(admin, room.room_code, room.phase_seq);
    return { success: true, data: { detectiveResult: cardPlay?.role === "detective" ? investigation(rec.played) : null } };
  }

  const { error } = await admin.from("mafia_actions").insert({
    room_code: room.room_code,
    night: room.night_number,
    step,
    actor_id: me.id,
    target_id: target?.id ?? null,
  });
  if (error) {
    if (error.code !== "23505") {
      console.error("submitMafiaNightAction error:", error);
      return fail("تعذّر حفظ اختيارك.");
    }
    // مسجّل قبل: نفس الاختيار (الجوال أعاد الإرسال) يكمل عادي، واختيار ثاني مرفوض
    const kept = await myNightRow(admin, room, me.id, step);
    if (!kept || kept.target_id !== (target?.id ?? null)) return fail("خلاص اخترت، ما تقدر تغيّر.");
  }

  if (step === "suicide" && target) {
    await admin.from("mafia_secrets").update({ suicide_target: target.id }).eq("player_id", me.id);
  }

  await finishStepIfAllDone(admin, room.room_code, room.phase_seq);

  return { success: true, data: { detectiveResult: step === "detective" ? investigation(target) : null } };
}

/**
 * دور الليل يخلص بس لما **كل الأحياء** يختارون — عشان الكل ماسكين جوالاتهم
 * ومحد يعرف مين صاحب الدور من اللي ماسك جواله:
 * - صاحب الدور: يضغط على اسم (أو يعدّي: الساحر والصحفي)
 * - الباقين (ومنهم المافيا غير القائد): يجاوبون سؤال التمويه
 * ما فيه مؤقت — لو أحد غايب، المنشئ يتخطى.
 */
/**
 * done/total/waiting = اللي ينعرض للكل (night_ready عام)، وallDone = الشرط الحقيقي لانتهاء الدور.
 * يختلفون بحالة وحدة: القرار انتقل لعضو مافيا كان جاوب سؤال التمويه — ينعرض إنه اختار
 * (لو رجع اسمه لـ"باقي ما اختار" انكشف إنه مافيا)، بس الدور ما يمشي إلا لما يختار القتل فعلاً.
 * (صاحب المهمة ما يقدر يجاوب التمويه — submitMafiaDecoy يرفضه — فهذي الحالة الوحيدة.)
 */
async function nightProgress(
  admin: Admin,
  room: MafiaRoom
): Promise<{ done: number; total: number; waiting: string[]; allDone: boolean }> {
  const step = room.night_step!;
  const [{ engine }, { data }] = await Promise.all([
    loadEngine(admin, room.room_code, room.settings),
    admin
      .from("mafia_actions")
      .select("actor_id, step")
      .eq("room_code", room.room_code)
      .eq("night", room.night_number)
      .in("step", [step, decoyStep(step)]),
  ]);
  const rows = (data ?? []) as { actor_id: string; step: string }[];
  const has = (id: string, s: string) => rows.some((r) => r.actor_id === id && r.step === s);
  const leaderId = await nightLeaderId(admin, room, engine);
  const alive = engine.filter((p) => p.alive);
  // اللي سوى فعل الدور خلّص حتى لو فئته تغيّرت بعده (الساحر صار طبيب لحظة اختياره)
  const isDone = (p: EnginePlayer) =>
    has(p.id, step) || (canActOnStep(p, step, leaderId, engine) ? false : has(p.id, decoyStep(step)));
  const shownDone = (p: EnginePlayer) => isDone(p) || has(p.id, decoyStep(step));
  const waiting = alive.filter((p) => !shownDone(p)).map((p) => p.id);
  return { done: alive.length - waiting.length, total: alive.length, waiting, allDone: alive.every(isDone) };
}

/**
 * النمط السريع: الليل كله دور واحد، ويخلص لما كل الأحياء يختارون — صاحب المهمة من مهمته
 * (كل واحد حسب فئته)، والباقين سؤال التمويه مرة وحدة. أو لما يخلص المؤقت، أو المنشئ ينهيه.
 */
async function fastNightProgress(
  admin: Admin,
  room: MafiaRoom
): Promise<{ done: number; total: number; allDone: boolean }> {
  const [{ engine }, { data }] = await Promise.all([
    loadEngine(admin, room.room_code, room.settings),
    admin.from("mafia_actions").select("actor_id, step").eq("room_code", room.room_code).eq("night", room.night_number),
  ]);
  const rows = (data ?? []) as { actor_id: string; step: string }[];
  const has = (id: string, s: string) => rows.some((r) => r.actor_id === id && r.step === s);
  const leaderId = await nightLeaderId(admin, room, engine);
  const alive = engine.filter((p) => p.alive);
  // صاحب مهمة: خلّص لما يسويها (الساحر اللي صار طبيب: مهمته الحين الطبيب). بدون مهمة: سؤال التمويه،
  // أو إنه الساحر اختار فئة ما لها دور بالليل (الجندي) — اختياره هو مهمته
  const isDone = (p: EnginePlayer) => {
    const stepNow = fastNightStep(p, leaderId, engine);
    return stepNow ? has(p.id, stepNow) : has(p.id, FAST_DECOY) || has(p.id, "magician");
  };
  // نفس nightProgress: القائد الجديد اللي جاوب التمويه ينحسب بالعدد المعروض، والليل ينتظر اختياره
  const done = alive.filter((p) => isDone(p) || has(p.id, FAST_DECOY)).length;
  return { done, total: alive.length, allDone: alive.every(isDone) };
}

async function finishStepIfAllDone(admin: Admin, roomCode: string, seq: number): Promise<void> {
  const room = await loadRoom(admin, roomCode);
  const fast = room ? isFastMafia(room.settings) : false;
  if (!room || room.phase_seq !== seq || room.phase !== "night_act" || (!room.night_step && !fast)) return;

  const { allDone, ...progress } = fast ? await fastNightProgress(admin, room) : await nightProgress(admin, room);
  if (allDone) {
    await runTransition(admin, room);
    return;
  }
  // مين باقي ما اختار (تحديث مستقل: لو ملف 0007 ما انشغّل، اللعبة تمشي عادي بدون القائمة)
  // النمط السريع: العدد بس، بدون أسماء اللي باقين
  const { error } = await admin
    .from("mafia_rooms")
    .update({ night_ready: { night: room.night_number, step: room.night_step, ...progress } })
    .eq("room_code", roomCode)
    .eq("phase_seq", seq);
  if (error) console.warn("mafia night_ready (شغّل supabase/migrations/0007_mafia_night_ready.sql):", error.message);
}

/** باقي اللاعبين (ومنهم المافيا غير القائد): يجاوبون سؤال التمويه — ينحفظ بس ما ينحسب بشي */
export async function submitMafiaDecoy(input: {
  roomCode: string;
  token: string;
  targetId: string;
  /** الدور اللي جاوب عليه — عشان الطلب المتأخر ما ينحسب على الدور اللي بعده */
  seq?: number;
}): Promise<ActionResult> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, player } = ctx;
  // طلب متأخر (الدور خلص أو بدأ دور ثاني): سؤال التمويه ما ينحسب بشي، فنتجاهله بصمت
  const fast = isFastMafia(room.settings);
  if (
    room.phase !== "night_act" ||
    (!room.night_step && !fast) ||
    (input.seq !== undefined && input.seq !== room.phase_seq)
  ) {
    return { success: true };
  }
  const step = room.night_step;

  const { engine } = await loadEngine(admin, room.room_code, room.settings);
  const me = engine.find((p) => p.id === player.id);
  if (!me || !me.alive) return fail("الموتى ما يختارون");
  const leaderId = await nightLeaderId(admin, room, engine);
  // النمط السريع: اللي عنده مهمة (حسب فئته) يختار منها، مو من سؤال التمويه
  const hasTask = fast ? fastNightStep(me, leaderId, engine) !== null : canActOnStep(me, step!, leaderId, engine);
  if (hasTask) return fail("اختر من مهمتك.");
  if (!engine.some((p) => p.alive && p.id === input.targetId && p.id !== me.id)) return fail("اختر لاعب ثاني.");

  const { error } = await admin.from("mafia_actions").upsert(
    {
      room_code: room.room_code,
      night: room.night_number,
      step: fast ? FAST_DECOY : decoyStep(step!),
      actor_id: me.id,
      target_id: input.targetId,
    },
    { onConflict: "room_code,night,step,actor_id", ignoreDuplicates: true }
  );
  if (error) {
    console.error("submitMafiaDecoy error:", error);
    return fail("تعذّر حفظ اختيارك.");
  }
  await finishStepIfAllDone(admin, room.room_code, room.phase_seq);
  return { success: true };
}

// ---------------------------------------------------------------------
// كشف الأدوار ("شفت دوري") ووصول مهمة الليل
// ---------------------------------------------------------------------

const isSeq = (seq: unknown): seq is number => typeof seq === "number" && Number.isInteger(seq);

/** مين باقي ما ضغط "شفت دوري" (اللاعبين الحقيقيين بس — البوتات ما يضغطون) */
async function revealProgress(admin: Admin, roomCode: string): Promise<{ done: number; total: number; waiting: string[] }> {
  const [players, { data }] = await Promise.all([
    loadPlayers(admin, roomCode),
    admin
      .from("mafia_actions")
      .select("actor_id")
      .eq("room_code", roomCode)
      .eq("night", REVEAL_NIGHT)
      .eq("step", SEEN_ROLE),
  ]);
  const seen = new Set(((data ?? []) as { actor_id: string }[]).map((r) => r.actor_id));
  const humans = players.filter((p) => !p.is_bot);
  const waiting = humans.filter((p) => !seen.has(p.id)).map((p) => p.id);
  return { done: humans.length - waiting.length, total: humans.length, waiting };
}

/**
 * الكل شافوا أدوارهم: الليل يبدأ على طول. وإلا نكتب مين باقي (المنشئ يشوف الأسماء، والباقين العدد).
 * لو ضغط اثنين بنفس اللحظة وكتبنا عدد قديم، نعيد الحساب بعد الكتابة ونكتب الأحدث.
 * known = الغرفة لو توها انقرت (ضغطة "شفت دوري") — نوفّر قراءة؛ الانتقال نفسه مشروط برقم المرحلة.
 */
async function finishRevealIfAllSeen(admin: Admin, roomCode: string, seq: number, known?: MafiaRoom): Promise<void> {
  const room = known ?? (await loadRoom(admin, roomCode));
  if (!room || room.phase !== "reveal" || room.phase_seq !== seq) return;
  let progress = await revealProgress(admin, roomCode);
  // كل واحد يضغط يكتب القائمة، فلو ضغط كذا واحد بنفس اللحظة ممكن تنكتب قائمة قديمة بعد الجديدة:
  // نعيد القراءة بعد كل كتابة ونكتب الأحدث لين تثبت (وآخر محاولة تنكتب على كل حال).
  // والجوالات من جهتها ما ترجّع اسم اختفى من القائمة (useMafiaGame: stableWaiting)
  for (let i = 0; i < 8; i++) {
    if (progress.done >= progress.total) {
      await runTransition(admin, room);
      return;
    }
    const { error } = await admin
      .from("mafia_rooms")
      .update({ night_ready: { night: REVEAL_NIGHT, step: null, seq, ...progress } })
      .eq("room_code", roomCode)
      .eq("phase_seq", seq);
    if (error) {
      console.warn("mafia reveal night_ready:", error.message);
      return;
    }
    const again = await revealProgress(admin, roomCode);
    if (again.waiting.join() === progress.waiting.join()) return;
    progress = again;
  }
}

/** اللاعب شاف دوره وضغط "شفت دوري" */
export async function markMafiaRoleSeen(input: { roomCode: string; token: string; seq: number }): Promise<ActionResult> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, player, secret } = ctx;
  // الكشف خلص (الكل ضغطوا أو خلص الوقت): ما نحتاج شي
  if (room.phase !== "reveal" || !isSeq(input.seq) || room.phase_seq !== input.seq) return { success: true };
  if (!secret.role) return fail("دورك ما وصل للحين.");

  const { error } = await admin.from("mafia_actions").upsert(
    { room_code: room.room_code, night: REVEAL_NIGHT, step: SEEN_ROLE, actor_id: player.id, target_id: null },
    { onConflict: "room_code,night,step,actor_id", ignoreDuplicates: true }
  );
  if (error) {
    console.error("markMafiaRoleSeen error:", error);
    return fail("ما وصلت ضغطتك، اضغط مرة ثانية.");
  }
  await finishRevealIfAllSeen(admin, room.room_code, room.phase_seq, room);
  return { success: true };
}

/**
 * النمط السريع: مين وصلته شاشة الليل — صاحب مهمة (got)، مافيا مو القائد (view)، أو ما عنده مهمة (seen:night)،
 * أو اختار (يعني أكيد وصلته). علامة انتقال القرار (lead) ما تنحسب: صاحبها القائد اللي ما وصلته.
 */
async function fastNightReceivers(admin: Admin, room: MafiaRoom): Promise<Set<string>> {
  const { data } = await admin
    .from("mafia_actions")
    .select("actor_id")
    .eq("room_code", room.room_code)
    .eq("night", room.night_number)
    .in("step", [gotStep(null), viewStep(true), NIGHT_SEEN, FAST_DECOY, ...mafiaNightSteps(room.settings)]);
  return new Set(((data ?? []) as { actor_id: string }[]).map((r) => r.actor_id));
}

/**
 * النمط السريع: الليل يبدأ بمهلة = أقصى انتظار + المؤقت. أول ما توصل شاشة الليل لكل الجوالات (كل لاعب حي،
 * عنده مهمة أو لا — عشان بداية المؤقت ما تكشف مين عنده دور) يبدأ المؤقت من الحين.
 * يبدأ مرة وحدة بس: الكتابة مشروطة إن الموعد لسا نفسه اللي انقرا (مهلة الانتظار). لو انطلبت من جوالين بنفس
 * اللحظة، أول كتابة توصل تنكتب، والثانية ما تلقى نفس الموعد فما تغيّر شي — حتى لو وصلت بعدها بثواني
 * (مع 0019 كل كتابة تنحسب من لحظة وصولها، فالمتأخرة كانت بتطوّل المؤقت).
 */
async function armFastNightIfReady(admin: Admin, roomCode: string, seq: number): Promise<void> {
  const room = await loadRoom(admin, roomCode);
  if (!room || room.phase !== "night_act" || room.phase_seq !== seq || !isFastMafia(room.settings)) return;
  if (!room.phase_ends_at) return;
  // المؤقت شغال أصلاً (الباقي أقل من مدته)
  if (Date.parse(room.phase_ends_at) <= Date.now() + MAFIA_CONFIG.FAST_NIGHT_SECONDS * 1000) return;

  const [players, received] = await Promise.all([loadPlayers(admin, roomCode), fastNightReceivers(admin, room)]);
  const pending = players.filter((p) => p.is_alive && !p.is_bot && !received.has(p.id));
  if (pending.length > 0) return;

  const { error } = await admin
    .from("mafia_rooms")
    .update(deadlineIn(MAFIA_CONFIG.FAST_NIGHT_SECONDS * 1000))
    .eq("room_code", roomCode)
    .eq("phase_seq", seq)
    .eq("phase_ends_at", room.phase_ends_at);
  if (error) console.error("mafia armFastNight error:", error);
}

/** هل الليلة (السريع) أو الدور الحالي (الحماسي) فيه قرار المافيا؟ */
const isMafiaTurn = (room: MafiaRoom, fast: boolean) => fast || room.night_step === "mafia";

/**
 * الجوال يأكد إن شاشة الليل وصلته وانعرضت له (السريع: من تأكيدات كل الجوالات يبدأ مؤقت الليل):
 * - صاحب المهمة (got): والنظام ما يختار عن اللي ما وصلته مهمته أبداً
 * - عضو مافيا مو القائد (view): يقدر ياخذ القرار لو القائد ما وصلته مهمته
 * - السريع، ما عنده مهمة (seen:night): بس عشان المؤقت ينتظره مثل الباقين
 */
export async function ackMafiaNightTask(input: { roomCode: string; token: string; seq: number }): Promise<ActionResult> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, player } = ctx;
  const fast = isFastMafia(room.settings);
  if (room.phase !== "night_act" || !isSeq(input.seq) || room.phase_seq !== input.seq) return { success: true };
  if (!room.night_step && !fast) return { success: true };

  const { engine } = await loadEngine(admin, room.room_code, room.settings);
  const me = engine.find((p) => p.id === player.id);
  if (!me || !me.alive) return { success: true };
  const leaderId = await nightLeaderId(admin, room, engine);
  const step = fast ? fastNightStep(me, leaderId, engine) : room.night_step;
  const hasTask = Boolean(step && canActOnStep(me, step, leaderId, engine));
  const mark: ActionStep | null = hasTask
    ? gotStep(fast ? null : step)
    : me.role === "mafia" && isMafiaTurn(room, fast)
      ? viewStep(fast)
      : fast
        ? NIGHT_SEEN
        : null;
  if (!mark) return { success: true };

  const { error } = await admin.from("mafia_actions").upsert(
    { room_code: room.room_code, night: room.night_number, step: mark, actor_id: me.id, target_id: null },
    { onConflict: "room_code,night,step,actor_id", ignoreDuplicates: true }
  );
  if (error) {
    console.error("ackMafiaNightTask error:", error);
    return fail("تعذّر التأكيد.");
  }
  if (fast) await armFastNightIfReady(admin, room.room_code, room.phase_seq);
  return { success: true };
}

/**
 * قائد المافيا ما وصلته مهمته: بعد أقصى انتظار (FAST_ROLE_WAIT_SECONDS) يطلب أي عضو مافيا ثاني
 * وصلته شاشة الليل القرار، وأول واحد ياخذه. الانتقال مرة وحدة بالليلة، وما يصير لو القائد وصلته مهمته.
 * leader = صرت أنا القائد. stop = ما فيه داعي تطلب مرة ثانية (القائد وصلته، أو القرار راح لغيرك).
 */
export async function claimMafiaLead(input: {
  roomCode: string;
  token: string;
  seq: number;
}): Promise<ActionResult<{ leader: boolean; stop: boolean }>> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, player } = ctx;
  const fast = isFastMafia(room.settings);
  const no = (stop: boolean) => ({ success: true as const, data: { leader: false, stop } });
  if (room.phase !== "night_act" || !isSeq(input.seq) || room.phase_seq !== input.seq) return no(true);
  if (!isMafiaTurn(room, fast)) return no(true);

  const { engine } = await loadEngine(admin, room.room_code, room.settings);
  const me = engine.find((p) => p.id === player.id);
  if (!me || !me.alive || me.role !== "mafia") return no(true);
  const base = mafiaLeaderId(engine, room.night_number, room.settings.leadSeed);
  const leader = await nightLeaderId(admin, room, engine);
  if (leader === me.id) return { success: true, data: { leader: true, stop: true } };
  if (!base || leader !== base) return no(true);

  const { data } = await admin
    .from("mafia_actions")
    .select("actor_id, step, created_at")
    .eq("room_code", room.room_code)
    .eq("night", room.night_number)
    .in("step", [
      "mafia",
      gotStep(fast ? null : "mafia"),
      viewStep(fast),
      fast ? FAST_DECOY : decoyStep("mafia"),
    ]);
  const rows = (data ?? []) as { actor_id: string; step: string; created_at: string }[];
  // القائد وصلته مهمته (أو اختار): القرار له
  if (rows.some((r) => r.actor_id === base && (r.step === "mafia" || r.step.startsWith("got:")))) return no(true);

  // أقصى انتظار للقائد: السريع لين يبدأ المؤقت، والحماسي من أول ما وصلت شاشة هالدور لأي جوال
  const waitMs = MAFIA_CONFIG.FAST_ROLE_WAIT_SECONDS * 1000;
  if (fast) {
    if (!room.phase_ends_at || Date.now() < Date.parse(room.phase_ends_at) - MAFIA_CONFIG.FAST_NIGHT_SECONDS * 1000 - 500) {
      return no(false);
    }
  } else {
    const first = rows.length ? Math.min(...rows.map((r) => Date.parse(r.created_at))) : null;
    if (first === null || Date.now() < first + waitMs) return no(false);
  }

  // أنا وصلتني الشاشة (أطلب منها): ينحفظ. والقرار ينتقل للي بعد القائد بترتيب التبادل من اللي وصلتهم
  // الشاشة (أنا منهم) — مو لأول واحد يطلب، عشان يكون عادل ومو مربوط بسرعة الجوال
  const online = new Set([me.id, ...rows.filter((r) => r.actor_id !== base && r.step !== "mafia").map((r) => r.actor_id)]);
  const standIn = mafiaStandIn(engine, base, online, room.settings.leadSeed) ?? me;
  await admin.from("mafia_actions").upsert(
    [
      { room_code: room.room_code, night: room.night_number, step: viewStep(fast), actor_id: me.id, target_id: null },
      { room_code: room.room_code, night: room.night_number, step: LEAD_STEP, actor_id: base, target_id: standIn.id },
    ],
    { onConflict: "room_code,night,step,actor_id", ignoreDuplicates: true }
  );
  const now = await nightLeaderId(admin, room, engine);
  // ما نحدّث الغرفة هنا: "باقي ما اختار" المعروضة ما تتغير بانتقال القرار (nightProgress)، والدور
  // ما يخلص قبل ما القائد الجديد يختار — وأي تحديث للغرفة لحظة الانتقال يوصل لكل الجوالات
  return { success: true, data: { leader: now === me.id, stop: true } };
}

// ---------------------------------------------------------------------
// التصويت
// ---------------------------------------------------------------------

type VoteRow = { voterId: string; targetId: string | null };

async function readVotes(admin: Admin, room: MafiaRoom): Promise<VoteRow[]> {
  const { data } = await admin
    .from("mafia_votes")
    .select("voter_id, target_id")
    .eq("room_code", room.room_code)
    .eq("round", room.night_number);
  return (data ?? []).map((v: { voter_id: string; target_id: string | null }) => ({
    voterId: v.voter_id,
    targetId: v.target_id,
  }));
}

const votesKey = (votes: VoteRow[]) =>
  votes
    .map((v) => `${v.voterId}>${v.targetId ?? ""}`)
    .sort()
    .join(",");

/** مين صوّت على مين — في تحديث مستقل، عشان لو عمود vote_voters مو موجود (ملف 0005 ما انشغّل) يظل العداد والتصويت شغّالين عادي */
async function writeVoteVoters(admin: Admin, room: MafiaRoom, votes: VoteRow[]): Promise<void> {
  // التصويت السري: الأسماء ما تنكتب بالغرفة أصلاً (الغرفة توصل لكل الجوالات)، وتظل فاضية من بداية
  // التصويت. العداد والنتيجة ينحسبون من الأصوات نفسها مثل المكشوف
  if (isSecretVote(room.settings)) return;
  const { error } = await admin
    .from("mafia_rooms")
    .update({ vote_voters: groupVoters(votes) })
    .eq("room_code", room.room_code);
  if (error) console.warn("mafia vote_voters (شغّل supabase/migrations/0005_mafia_vote_voters.sql):", error.message);
}

async function recountVotes(admin: Admin, room: MafiaRoom): Promise<Record<string, number>> {
  const votes = await readVotes(admin, room);
  await writeVoteVoters(admin, room, votes);
  return countVotes(votes);
}

/**
 * العداد ومين صوّت على مين، اللي تشوفه كل الجوالات. لو صوّت كذا واحد بنفس اللحظة ممكن ينكتب عداد قديم
 * بعد الجديد (كل واحد حسب قبل ما يوصل صوت الثاني): نعيد القراءة بعد الكتابة ونكتب الأحدث لين يثبت.
 * (النتيجة نفسها بنهاية التصويت تنحسب من الأصوات مباشرة، مو من هالعداد.)
 */
async function syncVoteTally(admin: Admin, room: MafiaRoom): Promise<void> {
  let votes = await readVotes(admin, room);
  for (let i = 0; i < 4; i++) {
    await Promise.all([
      writeVoteVoters(admin, room, votes),
      admin
        .from("mafia_rooms")
        .update({ vote_counts: countVotes(votes) })
        .eq("room_code", room.room_code)
        .eq("phase_seq", room.phase_seq),
    ]);
    const again = await readVotes(admin, room);
    if (votesKey(again) === votesKey(votes)) return;
    votes = again;
  }
}

/**
 * التصويت (من الجوال بطلب عادي يتعاد لو ما رد — app/api/mafia/[op]). كل لاعب له صوت واحد بالجولة
 * (صف واحد لكل مصوّت)، فالصوت المكرر ينحسب مرة وحدة. seq = رقم مرحلة التصويت اللي صوّت فيها:
 * لو وصل بعد ما خلص التصويت وصوته نفسه مسجّل (الأول وصل وضاع رده) يرجع نجاح مثل الأول.
 */
export async function castMafiaVote(input: {
  roomCode: string;
  token: string;
  /** null = تخطي */
  targetId: string | null;
  seq?: number;
}): Promise<ActionResult> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, player } = ctx;

  // إعادة لصوت انحفظ قبل (والتصويت خلص بعده، أو المرحلة تغيّرت): نفس الرد الأول
  const resentOr = async (error: string): Promise<ActionResult> => {
    const { data } = await admin
      .from("mafia_votes")
      .select("target_id")
      .eq("room_code", room.room_code)
      .eq("round", room.night_number)
      .eq("voter_id", player.id)
      .maybeSingle();
    const stored = data as { target_id: string | null } | null;
    return stored && stored.target_id === (input.targetId ?? null) ? { success: true } : fail(error);
  };

  if (input.seq !== undefined && input.seq !== room.phase_seq) return resentOr("انتهى وقت التصويت.");
  if (room.phase !== "voting") return resentOr("التصويت مو مفتوح الحين.");
  if (room.phase_ends_at && Date.now() > Date.parse(room.phase_ends_at) + 1000) return resentOr("انتهى وقت التصويت.");
  if (!player.is_alive) return fail("الموتى ما يصوّتون");

  if (input.targetId) {
    if (input.targetId === player.id) return fail("ما تقدر تصوّت على نفسك.");
    const { data: target } = await admin
      .from("mafia_players")
      .select("id, is_alive")
      .eq("id", input.targetId)
      .eq("room_code", room.room_code)
      .maybeSingle();
    if (!target || !target.is_alive) return fail("هذا اللاعب مو موجود في اللعبة.");
  }

  const { error } = await admin.from("mafia_votes").upsert(
    { room_code: room.room_code, round: room.night_number, voter_id: player.id, target_id: input.targetId },
    { onConflict: "room_code,round,voter_id" }
  );
  if (error) {
    console.error("castMafiaVote error:", error);
    return fail("تعذّر حفظ صوتك.");
  }

  await syncVoteTally(admin, room);
  return { success: true };
}

// ---------------------------------------------------------------------
// انتقال المراحل
// ---------------------------------------------------------------------

export async function advanceMafiaPhase(input: {
  roomCode: string;
  token: string;
  seq: number;
}): Promise<ActionResult> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;

  // طلب متأخر من جهاز ثاني، أو المؤقت فعلاً ما خلص
  if (room.phase_seq !== input.seq) return { success: true };
  if (!room.phase_ends_at || Date.now() < Date.parse(room.phase_ends_at) - 300) return { success: true };

  await runTransition(admin, room);
  return { success: true };
}

/**
 * firstStep: أول دور بالليلة (الحماسي) — أول دور لسا شغال (activeNightSteps): الساحر اللي أخذ فئة
 * ما يجي دوره من جديد. بدونه: أول دور بالترتيب.
 */
function enterNight(room: MafiaRoom, night: number, firstStep?: MafiaNightStep): Partial<MafiaRoom> {
  // النمط السريع: كل الأدوار بدور واحد (بدون night_step) ومؤقت قصير
  const fast = isFastMafia(room.settings);
  return {
    phase: "night_act",
    night_step: fast ? null : firstStep ?? mafiaNightSteps(room.settings)[0],
    night_number: night,
    // الحماسي: أدوار الليل بدون مؤقت، تمشي لما الكل يختارون. السريع: تمشي لما الكل يختارون أو يخلص المؤقت.
    // السريع يبدأ بمهلة الانتظار + المؤقت، وأول ما توصل شاشة الليل لكل الجوالات يبدأ المؤقت (armFastNightIfReady)
    ...(fast
      ? deadlineIn((MAFIA_CONFIG.FAST_ROLE_WAIT_SECONDS + MAFIA_CONFIG.FAST_NIGHT_SECONDS) * 1000)
      : { phase_ends_at: null }),
    vote_counts: {},
    vote_result: null,
  };
}

/** بداية دور ليل جديد: البوتات (وضع التجربة) يختارون على طول، ونحدّث العداد */
async function afterStepStart(admin: Admin, roomCode: string): Promise<void> {
  const room = await loadRoom(admin, roomCode);
  if (!room || room.phase !== "night_act") return;
  await botsNightTurn(admin, room);
  await finishStepIfAllDone(admin, roomCode, room.phase_seq);
  // النمط السريع: لو كل أصحاب المهام بوتات (وضع التجربة)، المؤقت يبدأ على طول
  if (isFastMafia(room.settings)) await armFastNightIfReady(admin, roomCode, room.phase_seq);
}

/**
 * الشيخ يختار نوع نقاش اليوم بالصباح (يقدر يغيّره لين يبدأ النقاش).
 * led = true: منظم — الكل ساكت، وهو يسأل ويعطي الإذن بالكلام، واسمه يطلع للكل.
 * seq = رقم الصباح اللي اختار فيه: طلب وصل متأخر (بعد ما بدأ النقاش، أو بصباح يوم ثاني) ما ينحفظ.
 * الإعادة بنفس الاختيار ما تغيّر شي (صف واحد للشيخ بكل ليلة).
 */
export async function chooseMafiaSheikhMode(input: {
  roomCode: string;
  token: string;
  led: boolean;
  seq?: number;
}): Promise<ActionResult> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, player, secret } = ctx;
  if (room.phase !== "morning" || (isSeq(input.seq) && room.phase_seq !== input.seq)) {
    return fail("الاختيار بس بالصباح قبل ما يبدأ النقاش.");
  }
  if (secret.role !== "sheikh" || !player.is_alive) return fail("مو دورك.");

  const { error } = await admin.from("mafia_actions").upsert(
    {
      room_code: room.room_code,
      night: room.night_number,
      step: SHEIKH_STEP,
      actor_id: player.id,
      target_id: input.led ? player.id : null,
    },
    { onConflict: "room_code,night,step,actor_id" }
  );
  if (error) {
    console.error("chooseMafiaSheikhMode error:", error);
    return fail("تعذّر حفظ اختيارك، حاول مرة ثانية.");
  }
  return { success: true };
}

/**
 * إعلان نوع النقاش لما يبدأ (بس لو الشيخ ضمن الفئات): منظم باسم الشيخ لو هو حي واختاره،
 * وإلا عشوائي — نفس النص حتى لو الشيخ ميت أو ما اختار، عشان محد يعرف.
 */
async function sheikhAnnouncement(admin: Admin, room: MafiaRoom): Promise<MafiaAnnouncement | null> {
  if (!room.settings.optionalRoles?.includes("sheikh")) return null;
  const [{ engine }, { data }] = await Promise.all([
    loadEngine(admin, room.room_code, room.settings),
    admin
      .from("mafia_actions")
      .select("actor_id, target_id")
      .eq("room_code", room.room_code)
      .eq("night", room.night_number)
      .eq("step", SHEIKH_STEP),
  ]);
  const rows = (data ?? []) as { actor_id: string; target_id: string | null }[];
  const leader = engine.find(
    (p) => p.alive && p.role === "sheikh" && rows.some((r) => r.actor_id === p.id && r.target_id)
  );
  return leader
    ? { kind: "sheikh_led", emoji: "", text: `النقاش منظم: الشيخ ${leader.name} يدير النقاش`, targetId: leader.id }
    : { kind: "sheikh_open", emoji: "", text: "نقاش عشوائي: الكل يتكلم" };
}

/** اللي حماهم الطبيب الليلة اللي قبل — حمايته تظل للتصويت اللي بعدها (انفجار المنتقم) */
async function lastNightProtections(admin: Admin, room: MafiaRoom): Promise<string[]> {
  const { data } = await admin
    .from("mafia_actions")
    .select("target_id")
    .eq("room_code", room.room_code)
    .eq("night", room.night_number)
    .eq("step", "doctor");
  return ((data ?? []) as { target_id: string | null }[]).map((r) => r.target_id).filter((id): id is string => Boolean(id));
}

async function runTransition(admin: Admin, room: MafiaRoom): Promise<void> {
  switch (room.phase) {
    case "reveal": {
      if (await guardedRoomUpdate(admin, room, enterNight(room, 1))) await afterStepStart(admin, room.room_code);
      return;
    }

    case "night_act": {
      // اللي ما اختار، يختار له النظام (إلا الساحر والصحفي: قدرتهم تظل لليلة الجاية)
      if (room.night_step) await fillMissingActions(admin, room, room.night_step);
      // النمط السريع: نفس الشي لكل الأدوار مرة وحدة
      else if (isFastMafia(room.settings)) {
        await Promise.all(mafiaNightSteps(room.settings).map((step) => fillMissingActions(admin, room, step)));
      }
      await guardedRoomUpdate(admin, room, {
        phase: "night_done",
        ...phaseDeadline("night_done"),
      });
      return;
    }

    case "night_done": {
      const { engine, secretOf } = await loadEngine(admin, room.room_code, room.settings);
      // مكان الدور الحالي من الترتيب الثابت (الدور نفسه ممكن يكون انتهى توه: الساحر اختار فئة بهذا الدور،
      // فما عاد من الأدوار الشغالة — لو حسبناه منها ضاع الليل كله). والباقي: الأدوار اللي لسا شغالة بعده
      // (الساحر اللي اختار والمنتقم اللي انفجر ما يجون بالليالي اللي بعدها)
      const order = mafiaNightSteps(room.settings);
      const active = activeNightSteps(room.settings, engine);
      const idx = room.night_step ? order.indexOf(room.night_step) : -1;
      const remaining = idx >= 0 ? order.slice(idx + 1).filter((s) => active.includes(s)) : [];

      const { data: acts } = await admin
        .from("mafia_actions")
        .select("*")
        .eq("room_code", room.room_code)
        .eq("night", room.night_number);
      const actions = ((acts as ActionRow[]) ?? [])
        .filter((a) => isRoleStep(a.step))
        .map((a) => ({ step: a.step as MafiaNightStep, actorId: a.actor_id, targetId: a.target_id }));

      // بعد دور المافيا: لو الليلة حسمت اللعبة ننهيها على طول
      // (النمط السريع: كل الأدوار خلصت مع بعض — remaining فاضي، مثل آخر دور بالحماسي)
      const shortcut =
        isFastMafia(room.settings) || idx >= order.indexOf("mafia")
          ? mafiaNightShortcut(engine, actions, remaining)
          : null;
      if (shortcut) {
        await endGame(admin, room, shortcut.winner, { resolution: shortcut.resolution, secretOf });
        return;
      }

      const nextStep = remaining[0];
      if (nextStep) {
        const started = await guardedRoomUpdate(admin, room, {
          phase: "night_act",
          night_step: nextStep,
          phase_ends_at: null,
        });
        if (started) await afterStepStart(admin, room.room_code);
        return;
      }

      const resolution = resolveNight(engine, actions);

      const won = await guardedRoomUpdate(admin, room, {
        phase: "morning",
        night_step: null,
        announcements: resolution.announcements,
        ...phaseDeadline("morning"),
      });
      if (won) {
        await applyNight(admin, room, resolution, secretOf);
        // أول صباح = الجزء الحقيقي: التجربة (أو لعبة الرصيد) تنحسب. بعده ما يتغير شي
        await countGameSession(admin, MAFIA_GAME.id, room.room_code);
      }
      return;
    }

    case "morning": {
      const winner = await currentWinner(admin, room.room_code);
      if (winner) {
        await endGame(admin, room, winner);
        return;
      }
      const sheikh = await sheikhAnnouncement(admin, room);
      await guardedRoomUpdate(admin, room, {
        phase: "discussion",
        ...phaseDeadline("discussion", room.settings),
        ...(sheikh ? { announcements: [...(room.announcements ?? []), sheikh] } : {}),
      });
      return;
    }

    case "discussion": {
      const won = await guardedRoomUpdate(admin, room, {
        phase: "voting",
        vote_counts: {},
        vote_result: null,
        ...phaseDeadline("voting"),
      });
      if (won) {
        // نصفّر أسماء المصوّتين من الجولة اللي قبل (تحديث مستقل — شوف recountVotes)
        await admin.from("mafia_rooms").update({ vote_voters: {} }).eq("room_code", room.room_code);
        await castBotVotes(admin, { ...room, phase_seq: room.phase_seq + 1 });
      }
      return;
    }

    case "voting": {
      const [counts, { engine }, protectedIds] = await Promise.all([
        recountVotes(admin, room),
        loadEngine(admin, room.room_code, room.settings),
        lastNightProtections(admin, room),
      ]);
      const result = resolveVotes(counts);
      const blast = voteBlast(engine, result.eliminatedId, protectedIds);
      if (blast?.fate === "killed") result.bombId = blast.targetId;
      else if (blast) result.bombBlocked = { targetId: blast.targetId, fate: blast.fate };
      const won = await guardedRoomUpdate(admin, room, {
        phase: "vote_result",
        vote_counts: counts,
        vote_result: result,
        ...phaseDeadline("vote_result"),
      });
      const out = [result.eliminatedId, result.bombId].filter((id): id is string => Boolean(id));
      if (won && out.length > 0) {
        await admin.from("mafia_players").update({ is_alive: false }).in("id", out);
      }
      if (won && blast && result.eliminatedId) {
        // المنتقم انفجر قدام الكل (حتى لو هدفه نجا) — دوره بالليل ينشال من الليالي الجاية
        await admin.from("mafia_secrets").update({ ability_used: true }).eq("player_id", result.eliminatedId);
        if (blast.fate === "shield") {
          await admin.from("mafia_secrets").update({ soldier_shield_used: true }).eq("player_id", blast.targetId);
        }
      }
      return;
    }

    case "vote_result": {
      const { engine } = await loadEngine(admin, room.room_code, room.settings);
      const winner = checkWinner(engine);
      if (winner) {
        await endGame(admin, room, winner);
        return;
      }
      // الليلة الجاية تبدأ بأول دور لسا شغال (الساحر اللي أخذ فئة ما يجي دوره من جديد)
      const started = await guardedRoomUpdate(admin, room, {
        ...enterNight(room, room.night_number + 1, activeNightSteps(room.settings, engine)[0]),
        announcements: [],
      });
      if (started) await afterStepStart(admin, room.room_code);
      return;
    }

    default:
      return;
  }
}

async function applyNight(admin: Admin, room: MafiaRoom, res: NightResolution, secretOf: Map<string, SecretRow>): Promise<void> {
  const jobs: PromiseLike<unknown>[] = [];

  if (res.deaths.length > 0) {
    jobs.push(admin.from("mafia_players").update({ is_alive: false }).in("id", res.deaths));
  }
  if (res.shieldUsedBy.length > 0) {
    jobs.push(admin.from("mafia_secrets").update({ soldier_shield_used: true }).in("player_id", res.shieldUsedBy));
  }
  res.lastProtected.forEach(({ actorId, targetId }) => {
    jobs.push(admin.from("mafia_secrets").update({ last_protected: targetId }).eq("player_id", actorId));
  });
  // مات بالليل (ذبح المافيا أو انفجار المنتقم) وهو محقق/طبيب/جندي: علامة سرية (بجدول الأفعال المقفول) —
  // منها الساحر ياخذ مكانه الليلة الجاية. تنكتب بس لو الساحر من فئات اللعبة، عشان ما نكتب على الفاضي
  if (room.settings.optionalRoles?.includes("magician")) {
    const slain = res.deaths.filter((id) => {
      const role = secretOf.get(id)?.role;
      return Boolean(role && MAFIA_MAGICIAN_ROLES.includes(role));
    });
    if (slain.length > 0) {
      jobs.push(
        admin.from("mafia_actions").upsert(
          slain.map((id) => ({ room_code: room.room_code, night: room.night_number, step: SLAIN_STEP, actor_id: id, target_id: null })),
          { onConflict: "room_code,night,step,actor_id", ignoreDuplicates: true }
        )
      );
    }
  }
  await Promise.all(jobs);

  if (res.abilityUsedBy.length > 0) {
    await admin.from("mafia_secrets").update({ ability_used: true }).in("player_id", res.abilityUsedBy);
  }
}

async function currentWinner(admin: Admin, roomCode: string): Promise<MafiaTeam | null> {
  const { engine } = await loadEngine(admin, roomCode);
  return checkWinner(engine);
}

/**
 * winner = null يعني المنشئ أنهى اللعبة قبل ما يفوز أحد.
 * night = اللعبة انحسمت بالليل: نطبّق نتائجها ونعرض مين مات على شاشة النهاية.
 */
async function endGame(
  admin: Admin,
  room: MafiaRoom,
  winner: MafiaTeam | null,
  night?: { resolution: NightResolution; secretOf: Map<string, SecretRow> }
): Promise<void> {
  const secrets = await loadSecrets(admin, room.room_code);
  // الساحر اللي أخذ فئة: فئته متغيّرة بسرّه من لحظة اختياره
  const finalRoles: MafiaFinalRole[] = secrets.map((s) => ({
    playerId: s.player_id,
    role: (s.role ?? "citizen") as MafiaRole,
    originalRole: (s.original_role ?? s.role ?? "citizen") as MafiaRole,
  }));
  const won = await guardedRoomUpdate(admin, room, {
    phase: "ended",
    night_step: null,
    phase_ends_at: null,
    winner,
    final_roles: finalRoles,
    announcements: (night?.resolution.announcements ?? []).filter((a) => a.kind === "kill" || a.kind === "bomb"),
  });
  if (won && night) await applyNight(admin, room, night.resolution, night.secretOf);
  // انتهت بفائز (حتى لو قبل أول صباح): لعبة كاملة، تنحسب
  if (won && winner) await countGameSession(admin, MAFIA_GAME.id, room.room_code);
}

// ---------------------------------------------------------------------
// اللاعبون الوهميون (وضع التجربة)
// ---------------------------------------------------------------------

/**
 * اختيار النظام أو البوت عن صاحب الدور: من المسموح، والمافيا من غير زملائهم بس —
 * ذبح الزميل تمويه، قرار القائد نفسه
 */
function autoTargets(step: MafiaNightStep, actor: EnginePlayer, engine: EnginePlayer[]): EnginePlayer[] {
  const allowed = allowedTargets(actor, step, engine);
  return step === "mafia" ? allowed.filter((t) => t.role !== "mafia") : allowed;
}

/**
 * المنشئ تخطى الدور (أو خلص وقت الليل بالسريع): صاحب الدور اللي ما اختار، يختار له النظام عشوائي.
 * - قائد المافيا: عشوائي من غير المافيا.
 * - الساحر والصحفي: يعدّي دورهم بدون استخدام (قدرتهم مرة وحدة، ما نضيعها عليهم).
 * - صاحب الدور اللي مهمته ما وصلت جواله أبداً: ما نختار عنه — ينحفظ إنه ما سوى شي هالليلة.
 * - قائد المافيا اللي ما وصلته مهمته: القرار لعضو مافيا ثاني وصلته شاشة الليل (والنظام يختار عنه).
 *   القتل يضيع بس لو ولا واحد من المافيا وصلته.
 */
async function fillMissingActions(admin: Admin, room: MafiaRoom, step: MafiaNightStep): Promise<void> {
  const fast = isFastMafia(room.settings);
  const mafiaMarks = step === "mafia" ? [viewStep(fast), fast ? FAST_DECOY : decoyStep("mafia")] : [];
  const [{ engine, players }, actsRes] = await Promise.all([
    loadEngine(admin, room.room_code, room.settings),
    admin
      .from("mafia_actions")
      .select("actor_id, step")
      .eq("room_code", room.room_code)
      .eq("night", room.night_number)
      .in("step", [step, gotStep(fast ? null : step), ...mafiaMarks]),
  ]);

  const rows = (actsRes.data ?? []) as Pick<ActionRow, "actor_id" | "step">[];
  const acted = new Set(rows.filter((r) => r.step === step).map((r) => r.actor_id));
  const received = new Set(rows.filter((r) => r.step.startsWith("got:")).map((r) => r.actor_id));
  // أعضاء المافيا اللي وصلتهم شاشة الليل (تأكيد، أو جاوبوا سؤال التمويه، أو وصلتهم المهمة)
  const mafiaOnline = new Set(rows.filter((r) => r.step !== step).map((r) => r.actor_id));
  const bots = new Set(players.filter((p) => p.is_bot).map((p) => p.id));
  const leaderId = await nightLeaderId(admin, room, engine);

  for (const p of engine) {
    if (acted.has(p.id) || !canActOnStep(p, step, leaderId, engine)) continue;
    let actor = p;
    if (!received.has(p.id) && !bots.has(p.id)) {
      // البديل: اللي بعد القائد بترتيب التبادل من اللي وصلتهم الشاشة (مو أقل مقعد)
      const standIn =
        step === "mafia"
          ? mafiaStandIn(engine, p.id, new Set([...mafiaOnline, ...bots]), room.settings.leadSeed) ?? undefined
          : undefined;
      if (!standIn) {
        await admin.from("mafia_actions").upsert(
          { room_code: room.room_code, night: room.night_number, step: `missed:${step}`, actor_id: p.id, target_id: null },
          { onConflict: "room_code,night,step,actor_id", ignoreDuplicates: true }
        );
        continue;
      }
      // القرار انتقل (ينحفظ للمراجعة) والنظام يختار عن العضو اللي وصلته الشاشة
      await admin.from("mafia_actions").upsert(
        { room_code: room.room_code, night: room.night_number, step: LEAD_STEP, actor_id: p.id, target_id: standIn.id },
        { onConflict: "room_code,night,step,actor_id", ignoreDuplicates: true }
      );
      actor = standIn;
    }
    if (step === "magician" || step === "journalist") continue;

    // عشوائي من المسموح — والمنتقم ما يرجع لهدف الليلة اللي قبل
    const targetId = pickRandom(autoTargets(step, actor, engine))?.id ?? null;
    if (!targetId) continue;

    const { data: inserted } = await admin
      .from("mafia_actions")
      .upsert(
        { room_code: room.room_code, night: room.night_number, step, actor_id: actor.id, target_id: targetId },
        { onConflict: "room_code,night,step,actor_id", ignoreDuplicates: true }
      )
      .select("id");
    // هدف المنتقم: بس الطلب اللي انسجّل اختياره يكتبه — لو انتهى الدور من جهازين بنفس اللحظة (تخطي المنشئ
    // ومعه إعادته، أو انتقال المؤقت)، كل واحد يختار عشوائي، والمسجّل هو الأول فقط
    if (step === "suicide" && inserted && inserted.length > 0) {
      await admin.from("mafia_secrets").update({ suicide_target: targetId }).eq("player_id", p.id);
    }
  }
}

/** البوتات (وضع التجربة): أول ما يبدأ الدور يختارون كلهم — صاحب دور أو تمويه */
async function botsNightTurn(admin: Admin, room: MafiaRoom): Promise<void> {
  if (isFastMafia(room.settings)) return botsFastNight(admin, room);
  const step = room.night_step;
  if (!step) return;
  const { engine, players, secretOf } = await loadEngine(admin, room.room_code, room.settings);
  const bots = new Set(players.filter((p) => p.is_bot).map((p) => p.id));
  if (bots.size === 0) return;
  const leaderId = mafiaLeaderId(engine, room.night_number, room.settings.leadSeed);
  const alive = engine.filter((p) => p.alive);

  for (const p of alive.filter((x) => bots.has(x.id))) {
    let row: { step: ActionStep; target_id: string | null };
    if (canActOnStep(p, step, leaderId, engine)) {
      const skip = (step === "magician" || step === "journalist") && Math.random() < 0.6;
      const targetId = skip ? null : pickRandom(autoTargets(step, p, engine))?.id ?? null;
      row = { step, target_id: targetId };
      if (step === "suicide" && targetId) {
        await admin.from("mafia_secrets").update({ suicide_target: targetId }).eq("player_id", p.id);
      }
      // بوت ساحر اختار بطاقة: فئته تتغيّر مثل اللاعب الحقيقي
      const vacancy = step === "magician" && targetId ? engine.find((x) => x.id === targetId) : undefined;
      if (vacancy) await applyMagicianSwitch(admin, p.id, vacancy.role, secretOf.get(p.id)?.notes);
    } else {
      row = { step: decoyStep(step), target_id: pickRandom(alive.filter((x) => x.id !== p.id))?.id ?? null };
    }
    await admin.from("mafia_actions").upsert(
      { room_code: room.room_code, night: room.night_number, step: row.step, actor_id: p.id, target_id: row.target_id },
      { onConflict: "room_code,night,step,actor_id", ignoreDuplicates: true }
    );
  }
}

/** النمط السريع: البوتات يختارون كلهم أول ما يبدأ الليل — كل بوت مهمته حسب فئته، أو التمويه */
async function botsFastNight(admin: Admin, room: MafiaRoom): Promise<void> {
  const { engine, players, secretOf } = await loadEngine(admin, room.room_code, room.settings);
  const bots = new Set(players.filter((p) => p.is_bot).map((p) => p.id));
  if (bots.size === 0) return;
  const leaderId = mafiaLeaderId(engine, room.night_number, room.settings.leadSeed);
  const alive = engine.filter((p) => p.alive);

  for (const p of alive.filter((x) => bots.has(x.id))) {
    const step = fastNightStep(p, leaderId, engine);
    let row: { step: ActionStep; target_id: string | null };
    if (step) {
      const skip = (step === "magician" || step === "journalist") && Math.random() < 0.6;
      row = { step, target_id: skip ? null : pickRandom(autoTargets(step, p, engine))?.id ?? null };
      if (step === "suicide" && row.target_id) {
        await admin.from("mafia_secrets").update({ suicide_target: row.target_id }).eq("player_id", p.id);
      }
      // بوت ساحر اختار بطاقة: فئته تتغيّر مثل اللاعب الحقيقي (فعلها يختاره النظام مع نهاية الليل)
      const vacancy = step === "magician" && row.target_id ? engine.find((x) => x.id === row.target_id) : undefined;
      if (vacancy) await applyMagicianSwitch(admin, p.id, vacancy.role, secretOf.get(p.id)?.notes);
    } else {
      row = { step: FAST_DECOY, target_id: pickRandom(alive.filter((x) => x.id !== p.id))?.id ?? null };
    }
    await admin.from("mafia_actions").upsert(
      { room_code: room.room_code, night: room.night_number, step: row.step, actor_id: p.id, target_id: row.target_id },
      { onConflict: "room_code,night,step,actor_id", ignoreDuplicates: true }
    );
  }
}

async function castBotVotes(admin: Admin, room: MafiaRoom): Promise<void> {
  const players = await loadPlayers(admin, room.room_code);
  const alive = players.filter((p) => p.is_alive);
  const bots = alive.filter((p) => p.is_bot);
  if (bots.length === 0) return;

  const rows = bots.map((bot) => {
    const target = Math.random() < 0.2 ? null : pickRandom(alive.filter((p) => p.id !== bot.id));
    return { room_code: room.room_code, round: room.night_number, voter_id: bot.id, target_id: target?.id ?? null };
  });
  await admin.from("mafia_votes").upsert(rows, { onConflict: "room_code,round,voter_id" });
  await syncVoteTally(admin, room);
}

// ---------------------------------------------------------------------
// أزرار منشئ اللعبة
// ---------------------------------------------------------------------

export async function updateMafiaSettings(input: {
  roomCode: string;
  settings: MafiaSettings;
}): Promise<ActionResult> {
  const ctx = await requireHost(input.roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase !== "lobby") return fail("ما تقدر تغيّر الإعدادات بعد بداية اللعبة.");

  const parsed = MafiaSettingsSchema.safeParse(input.settings);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "إعدادات غير صحيحة.");
  const settingsError = validateMafiaSettings(parsed.data);
  if (settingsError) return fail(settingsError);

  const players = await loadPlayers(admin, room.room_code);
  if (players.length > parsed.data.maxPlayers) {
    return fail(`داخل الغرفة ${players.length} لاعبين، ما تقدر تخلي العدد أقل منهم.`);
  }

  await admin.from("mafia_rooms").update({ settings: parsed.data }).eq("room_code", room.room_code);
  return { success: true };
}

/**
 * devHostRole: وضع التجربة (localhost بس) — المنشئ يختار فئته عشان يجربها.
 * لازم تكون من فئات اللعبة، وإلا تنتجاهل والتوزيع عشوائي.
 */
export async function startMafiaGame(roomCode: string, devHostRole?: MafiaRole | null, seq?: number): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (staleHostPress(room, seq)) return { success: true };
  if (room.phase !== "lobby") return fail("اللعبة بدأت أصلاً.");

  const settingsError = validateMafiaSettings(room.settings);
  if (settingsError) return fail(settingsError);

  // التوزيع والحجز قبل الانتقال: لو وصلت "ابدأ" مرتين بنفس اللحظة، وحدة بس توزّع وتحجز
  // (وإلا ممكن ينكتب توزيعين فوق بعض، أو تنحجز لعبتين)
  const claimed = await claimHostOp(admin, room, "start");
  if (claimed === null) return fail("تعذّر بدء اللعبة، حاول مرة ثانية.");
  if (!claimed) return { success: true };
  const refuse = async (error: string): Promise<ActionResult> => {
    await releaseHostOp(admin, room, "start");
    return fail(error);
  };

  const loaded = await loadPlayers(admin, room.room_code);
  if (loaded.length !== room.settings.maxPlayers) {
    return refuse(`لازم يكتمل العدد: ${loaded.length} من ${room.settings.maxPlayers}.`);
  }
  const players = await renumberDuplicateSeats(admin, loaded);

  // كل جولة تنحجز لها لعبة بالسيرفر: اشتراك (تنحسب على طول)، أو التجربة المجانية أو لعبة من الرصيد
  // القديم (ما تنحسب إلا مع أول صباح، وترجع لو انتهت قبله). لو ما انحجزت، اللعبة ما تبدأ
  let sessionId: string | null = null;
  if (!MAFIA_CONFIG.IS_FREE) {
    const session = await beginGameSession(admin, ctx.userId, MAFIA_GAME.id, room.room_code);
    if (session.releasedRooms.length > 0) await closeAbandonedRooms(admin, session.releasedRooms);
    if (!session.ok) {
      return refuse(
        session.reason === "no_access"
          ? MAFIA_CONFIG.NO_ACCESS_MESSAGE
          : session.reason === "busy"
            ? SESSION_BUSY_MESSAGE
            : "تعذّر بدء اللعبة، حاول مرة ثانية."
      );
    }
    sessionId = session.sessionId;
  }

  const deck = buildRoleDeck(room.settings);
  if (IS_DEV && devHostRole) {
    const hostIdx = players.findIndex((p) => p.id === room.host_player_id);
    const roleIdx = deck.indexOf(devHostRole);
    if (hostIdx >= 0 && roleIdx >= 0) [deck[hostIdx], deck[roleIdx]] = [deck[roleIdx], deck[hostIdx]];
  }
  await Promise.all(
    players.map((p, i) =>
      admin
        .from("mafia_secrets")
        .update({
          role: deck[i],
          original_role: deck[i],
          soldier_shield_used: false,
          ability_used: false,
          suicide_target: null,
          last_protected: null,
          notes: [],
        })
        .eq("player_id", p.id)
    )
  );
  // ضغطات "شفت دوري" من جولة قبل (لو فيه) ما تنحسب على هالجولة
  await admin.from("mafia_actions").delete().eq("room_code", room.room_code).eq("night", REVEAL_NIGHT);

  const ok = await guardedRoomUpdate(admin, room, {
    phase: "reveal",
    night_step: null,
    night_number: 0,
    announcements: [],
    vote_counts: {},
    vote_result: null,
    winner: null,
    final_roles: null,
    ...phaseDeadline("reveal"),
    // بذرة جديدة كل جولة: مين من المافيا يبدأ بالقرار عشوائي، وبعدها يتبادلون بالدور (mafiaLeaderOrder)
    settings: { ...room.settings, leadSeed: randomUUID() },
  });
  // البدء ما صار (جهاز ثاني سبقه أو خطأ): الحجز ينلغى كأنه ما صار
  if (!ok && sessionId) await cancelGameSession(admin, sessionId);
  if (!ok) return refuse("تعذّر بدء اللعبة، حاول مرة ثانية.");
  // مين باقي ما شاف دوره (المنشئ يشوف القائمة من أول لحظة)
  await finishRevealIfAllSeen(admin, room.room_code, room.phase_seq + 1);
  return { success: true };
}

/**
 * صفحة المنشئ مفتوحة قبل أول صباح (ترسل كل دقيقة): منها يفرّق السيرفر بين منشئ ينتظر
 * (بعد 10 دقايق تنحسب) ومنشئ طلع (ترجع تجربته لو بدأ لعبة ثانية).
 */
export async function pingMafiaSession(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok || MAFIA_CONFIG.IS_FREE) return { success: true };
  await pingGameSession(ctx.admin, ctx.userId, MAFIA_GAME.id, ctx.room.room_code);
  return { success: true };
}

/** المنشئ اختار وقت النقاش وضغط "ابدأ النقاش" (الصباح ما له مؤقت — يظل لين يضغط) */
export async function startMafiaDiscussion(input: { roomCode: string; seconds: number; seq?: number }): Promise<ActionResult> {
  const ctx = await requireHost(input.roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (!MAFIA_CONFIG.DISCUSSION_OPTIONS.includes(input.seconds)) return fail("وقت النقاش غير صحيح.");
  if (staleHostPress(room, input.seq)) return { success: true };
  if (room.phase !== "morning") return { success: true };

  const settings = { ...room.settings, discussionSeconds: input.seconds };
  await admin.from("mafia_rooms").update({ settings }).eq("room_code", room.room_code);
  await runTransition(admin, { ...room, settings });
  return { success: true };
}

/** المنشئ يحدد وقت النقاش (2/3/5 دقائق أو مفتوح). لو النقاش شغّال، المؤقت يبدأ من جديد بالوقت الجديد. */
export async function setMafiaDiscussionTime(input: { roomCode: string; seconds: number }): Promise<ActionResult> {
  const ctx = await requireHost(input.roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (!MAFIA_CONFIG.DISCUSSION_OPTIONS.includes(input.seconds)) return fail("وقت النقاش غير صحيح.");
  if (room.phase === "ended" || room.phase === "closed") return fail("اللعبة خلصت.");

  const patch: Partial<MafiaRoom> = { settings: { ...room.settings, discussionSeconds: input.seconds } };
  if (room.phase === "discussion") {
    const timed = phaseDeadline("discussion", patch.settings);
    const deadline = timed.phase_ends_at;
    // إعادة لنفس الضغطة (نفس الوقت، والمؤقت توه انضبط عليه قبل أقل من 15 ثانية): ما نرجّع المؤقت من جديد
    const resent =
      room.settings.discussionSeconds === input.seconds &&
      Boolean(room.phase_ends_at && deadline && Date.parse(deadline) - Date.parse(room.phase_ends_at) < 15_000);
    if (resent) return { success: true };
    Object.assign(patch, timed);
  }

  await admin.from("mafia_rooms").update(patch).eq("room_code", room.room_code);
  return { success: true };
}

/**
 * "غرفة جديدة": كود جديد بنفس الإعدادات والمنشئ لحاله فيها.
 * الغرفة القديمة تنقفل وتدل اللاعبين على الكود الجديد عشان يدخلونه من جديد.
 */
/** الغرفة الجديدة اللي انتقل لها المنشئ من هالغرفة (لو هي له): كودها ومفتاحه فيها — رد الضغطة الأولى نفسه */
async function movedRoomFor(admin: Admin, room: MafiaRoom, userId: string): Promise<{ roomCode: string; token: string } | null> {
  const code = room.settings.movedTo;
  if (!code) return null;
  const next = await loadRoom(admin, code);
  if (!next || next.host_user_id !== userId || !next.host_player_id) return null;
  const { data } = await admin.from("mafia_secrets").select("token").eq("player_id", next.host_player_id).maybeSingle();
  const token = (data as { token: string } | null)?.token;
  return token ? { roomCode: code, token } : null;
}

export async function newMafiaRoom(roomCode: string): Promise<ActionResult<{ roomCode: string; token: string }>> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, userId } = ctx;
  // الضغطة انعادت بعد ما فتحت الأولى الغرفة الجديدة: نرجّع نفس الغرفة، ما نفتح ثانية
  if (room.phase === "closed") {
    const moved = await movedRoomFor(admin, room, userId);
    return moved ? { success: true, data: moved } : fail("هذي الغرفة انقفلت أصلاً.");
  }
  // وصلت مرتين بنفس اللحظة: وحدة بس تفتح غرفة، والثانية تنتظرها وترجّع نفس الغرفة
  const claimed = await claimHostOp(admin, room, "newroom");
  if (claimed === null) return fail("تعذّر إنشاء الغرفة، حاول مرة ثانية.");
  if (!claimed) {
    for (let i = 0; i < 20; i++) {
      await sleep(400);
      const now = await loadRoom(admin, room.room_code);
      if (now?.phase === "closed") {
        const moved = await movedRoomFor(admin, now, userId);
        if (moved) return { success: true, data: moved };
      }
    }
    return fail("تعذّر إنشاء الغرفة، حاول مرة ثانية.");
  }

  const { data: hostPlayer } = await admin
    .from("mafia_players")
    .select("display_name")
    .eq("id", room.host_player_id ?? "")
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { movedTo, ...settings } = room.settings;

  const created = await createRoomInternal(admin, userId, hostPlayer?.display_name ?? "المنشئ", settings);
  if ("error" in created) {
    await releaseHostOp(admin, room, "newroom");
    return fail(created.error);
  }

  await admin
    .from("mafia_rooms")
    .update({
      phase: "closed",
      night_step: null,
      phase_ends_at: null,
      settings: { ...room.settings, movedTo: created.roomCode },
      phase_seq: room.phase_seq + 1,
    })
    .eq("room_code", room.room_code);
  await endSessionIfStopped(admin, room.room_code);

  return { success: true, data: created };
}

/**
 * ضغطة منشئ وصلت بعد ما تغيّرت المرحلة (seq = رقم المرحلة اللي ضغط فيها): نتجاهلها ونرجع نجاح.
 * الضغطة نفسها تنعاد تلقائياً لو ما رد السيرفر بالمهلة، فلو الأولى وصلت ونقلت المرحلة، الإعادة
 * ما تنقلها مرة ثانية. بدون seq (جوال بالنسخة القديمة وقت التحديث): مثل قبل.
 */
const staleHostPress = (room: MafiaRoom, seq: number | undefined) => seq !== undefined && room.phase_seq !== seq;

/**
 * ضغطات المنشئ اللي فيها شغل قبل الانتقال نفسه (ابدأ: توزيع الأدوار، جولة جديدة: تصفير، غرفة جديدة: إنشاء):
 * لو وصلت نفس الضغطة مرتين بنفس اللحظة (الأولى بطّت فانعادت)، وحدة بس تنفّذ. الحجز صف بجدول الأفعال
 * (ليلة -1، ما تمسحه "جولة جديدة") مفتاحه نوع الضغطة ورقم المرحلة — زي باقي العلامات، بدون تعديل بالقاعدة.
 * حجز أقدم من 30 ثانية = الطلب اللي حجزه طاح بالنص: ينشال وينحجز من جديد.
 * true = هذا الطلب ينفّذ، false = نفس الضغطة شغالة أو خلصت، null = القاعدة ما ردت.
 */
const HOST_OP_NIGHT = -1;
const HOST_OP_STALE_MS = 30_000;
const hostOpRow = (room: MafiaRoom, key: string) => ({
  room_code: room.room_code,
  night: HOST_OP_NIGHT,
  step: `host:${key}:${room.phase_seq}`,
  actor_id: room.host_player_id ?? "",
  target_id: null,
});
async function claimHostOp(admin: Admin, room: MafiaRoom, key: string): Promise<boolean | null> {
  if (!room.host_player_id) return true;
  const row = hostOpRow(room, key);
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await admin
      .from("mafia_actions")
      .upsert(row, { onConflict: "room_code,night,step,actor_id", ignoreDuplicates: true })
      .select("id");
    if (error) {
      console.error("mafia claimHostOp error:", error);
      return null;
    }
    if (data && data.length > 0) return true;
    const { data: held } = await admin
      .from("mafia_actions")
      .select("id, created_at")
      .eq("room_code", row.room_code)
      .eq("night", HOST_OP_NIGHT)
      .eq("step", row.step)
      .eq("actor_id", row.actor_id)
      .maybeSingle();
    const h = held as { id: string; created_at: string } | null;
    if (!h) continue;
    if (Date.now() - Date.parse(h.created_at) < HOST_OP_STALE_MS) return false;
    await admin.from("mafia_actions").delete().eq("id", h.id).eq("created_at", h.created_at);
  }
  return false;
}
/** الضغطة ما نفّذت (رفض أو خطأ): نشيل الحجز عشان ضغطته الجاية تنفّذ */
async function releaseHostOp(admin: Admin, room: MafiaRoom, key: string): Promise<void> {
  if (!room.host_player_id) return;
  const row = hostOpRow(room, key);
  await admin
    .from("mafia_actions")
    .delete()
    .eq("room_code", row.room_code)
    .eq("night", HOST_OP_NIGHT)
    .eq("step", row.step)
    .eq("actor_id", row.actor_id);
}

/** المنشئ ينهي المرحلة الحالية فوراً (مثل: إنهاء النقاش والتصويت الحين) */
export async function skipMafiaPhase(roomCode: string, seq?: number): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (staleHostPress(room, seq)) return { success: true };
  if (room.phase === "lobby" || room.phase === "ended") return fail("ما فيه مرحلة شغالة الحين.");

  // الانتقال نفسه مشروط برقم المرحلة (guardedRoomUpdate): لو وصلت الضغطة مرتين بنفس اللحظة، وحدة بس تنقلها
  await runTransition(admin, room);
  return { success: true };
}

const isDayPhase = (room: MafiaRoom) =>
  room.phase === "morning" || room.phase === "discussion" || room.phase === "voting";

/** الممنوع من الكلام (المسكت) تكلم: المنشئ يقتله */
export async function killSilencedMafiaPlayer(roomCode: string, seq?: number): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (staleHostPress(room, seq)) return { success: true };
  // إعادة لضغطة نفّذت: الممنوع انقتل وإعلانه طلع (ممنوع واحد بس باليوم)
  if ((room.announcements ?? []).some((a) => a.kind === "hushed_kill")) return { success: true };
  if (!isDayPhase(room)) return fail("المنع من الكلام بس وقت النهار.");

  const players = await loadPlayers(admin, room.room_code);
  const silencedId = (room.announcements ?? []).find((a) => a.kind === "silence")?.targetId;
  const target = players.find((p) => p.id === silencedId);
  if (!target) return fail("ما فيه أحد ممنوع من الكلام الحين.");
  // انقتل توه (نفس الضغطة وصلت مرتين بنفس اللحظة، والثانية قرت الغرفة قبل إعلان الأولى): نفس الرد
  if (!target.is_alive) return { success: true };

  return hostDayKill(admin, room, target, {
    kind: "hushed_kill",
    emoji: "☠️",
    text: `${target.display_name} تكلم وهو ممنوع… وانقتل!`,
    targetId: target.id,
  });
}

/**
 * لاعب غشّ: المنشئ يذبحه. مو طرد — يظل بالغرفة كميت ويكمل يتفرج.
 */
export async function killCheaterMafiaPlayer(input: { roomCode: string; playerId: string; seq?: number }): Promise<ActionResult> {
  const ctx = await requireHost(input.roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (staleHostPress(room, input.seq)) return { success: true };
  // إعادة لضغطة نفّذت: نفس اللاعب انذبح وإعلانه طلع
  if ((room.announcements ?? []).some((a) => a.kind === "cheat_kill" && a.targetId === input.playerId)) return { success: true };
  if (!isDayPhase(room)) return fail("ذبح الغشاش بس وقت النهار.");
  if (input.playerId === room.host_player_id) return fail("ما تقدر تذبح نفسك");

  const players = await loadPlayers(admin, room.room_code);
  const target = players.find((p) => p.id === input.playerId);
  if (!target) return fail("اللاعب مو موجود في الغرفة.");
  // انذبح توه (نفس الضغطة وصلت مرتين بنفس اللحظة، والثانية قرت الغرفة قبل إعلان الأولى): نفس الرد
  if (!target.is_alive) return { success: true };

  return hostDayKill(admin, room, target, {
    kind: "cheat_kill",
    emoji: "",
    text: `${target.display_name} غشّ… وانذبح!`,
    targetId: target.id,
  });
}

/**
 * المنشئ يقتل لاعب وسط النهار (الممنوع تكلم، أو غشاش): يظل بالغرفة كميت، ويطلع للكل إعلان،
 * وبعدها نفحص الفوز على طول. لو صار وقت التصويت، ينشال صوته والأصوات اللي عليه.
 * ما ينفجر لو كان المنتقم (الانفجار بس بالذبح أو التصويت).
 */
async function hostDayKill(
  admin: Admin,
  room: MafiaRoom,
  target: MafiaPlayer,
  announcement: MafiaAnnouncement
): Promise<ActionResult> {
  // "بشرط إنه حي": لو الضغطة انعادت (أو وصلت مرتين بنفس اللحظة)، وحدة بس تقتله وتكتب الإعلان،
  // والثانية تلقاه ميت فترجع نجاح بدون ما تعيد شي
  const { data: killed, error } = await admin
    .from("mafia_players")
    .update({ is_alive: false })
    .eq("id", target.id)
    .eq("is_alive", true)
    .select("id");
  if (error) {
    console.error("hostDayKill error:", error);
    return fail("تعذّر تنفيذها، حاول مرة ثانية.");
  }
  if (!killed || killed.length === 0) return { success: true };

  if (room.phase === "voting") {
    await admin
      .from("mafia_votes")
      .delete()
      .eq("room_code", room.room_code)
      .eq("round", room.night_number)
      .or(`voter_id.eq.${target.id},target_id.eq.${target.id}`);
    await syncVoteTally(admin, room);
  }

  // الإعلانات من آخر نسخة للغرفة (لو انكتب إعلان ثاني بين ما قرينا الغرفة والحين، ما يضيع)
  const latest = (await loadRoom(admin, room.room_code)) ?? room;
  const announcements = [...((latest.phase_seq === room.phase_seq ? latest : room).announcements ?? []), announcement];
  await admin.from("mafia_rooms").update({ announcements }).eq("room_code", room.room_code).eq("phase_seq", room.phase_seq);

  const winner = await currentWinner(admin, room.room_code);
  if (winner) await endGame(admin, { ...room, announcements }, winner);
  return { success: true };
}

/** المنشئ ينهي اللعبة الحين ويكشف كل الأدوار بدون فائز */
export async function endMafiaGameNow(roomCode: string, seq?: number): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (staleHostPress(room, seq)) return { success: true };
  if (room.phase === "lobby" || room.phase === "ended") return fail("ما فيه لعبة شغالة الحين.");

  await endGame(admin, room, null);
  await endSessionIfStopped(admin, room.room_code);
  return { success: true };
}

/**
 * المنشئ طالع ويقفل الغرفة: تنتهي عند الكل، وأجهزتهم تنسى الغرفة،
 * فأي واحد منهم يقدر يسجّل دخول ويسوي غرفة جديدة.
 */
export async function closeMafiaRoom(roomCode: string, seq?: number): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  // انقفلت أصلاً (الضغطة الأولى وصلت): نفس الرد
  if (room.phase === "closed") return { success: true };
  if (staleHostPress(room, seq)) return { success: true };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { movedTo, ...settings } = room.settings;
  await guardedRoomUpdate(admin, room, {
    phase: "closed",
    night_step: null,
    phase_ends_at: null,
    settings,
  });
  await endSessionIfStopped(admin, room.room_code);
  return { success: true };
}

/**
 * طرد لاعب — في أي وقت، حتى وسط اللعبة، عشان محد يخرب.
 * نحذف اللاعب كامل: دوره وأفعاله وصوته تنحذف معه (on delete cascade)،
 * ومفتاحه يبطل فجهازه يطلع من الغرفة تلقائياً وما يقدر يرجع لين تخلص الجولة.
 * لو كان مافيا أو آخر مواطن، الفوز ينحسب في نهاية الصباح أو التصويت الجاي.
 */
export async function kickMafiaPlayer(input: { roomCode: string; playerId: string }): Promise<ActionResult> {
  const ctx = await requireHost(input.roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (input.playerId === room.host_player_id) return fail("ما تقدر تطرد نفسك");

  const { data: removed, error } = await admin
    .from("mafia_players")
    .delete()
    .eq("id", input.playerId)
    .eq("room_code", room.room_code)
    .select("id");
  if (error) {
    console.error("kickMafiaPlayer error:", error);
    return fail("تعذّر طرد اللاعب.");
  }
  // انطرد قبل (الضغطة انعادت بعد ما وصلت الأولى): نفس الرد. الطرد ما ينقل المرحلة، فما يحتاج رقمها
  if (!removed || removed.length === 0) return { success: true };

  // يمكن هو اللي كان الكل ينتظرونه بدور الليل، أو بكشف الأدوار
  if (room.phase === "night_act") {
    await finishStepIfAllDone(admin, room.room_code, room.phase_seq);
    if (isFastMafia(room.settings)) await armFastNightIfReady(admin, room.room_code, room.phase_seq);
  }
  if (room.phase === "reveal") await finishRevealIfAllSeen(admin, room.room_code, room.phase_seq);

  // صوته انحذف — نحدّث العداد ومين صوّت على مين
  if (room.phase === "voting") await syncVoteTally(admin, room);

  return { success: true };
}

/** يرجّع الكل لغرفة الانتظار بنفس اللاعبين — بعد نهاية اللعبة أو في نصها */
export async function playMafiaAgain(roomCode: string, seq?: number): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (staleHostPress(room, seq)) return { success: true };
  if (room.phase === "lobby") return fail("أنتم أصلاً في غرفة الانتظار.");
  // التصفير قبل الانتقال: لو وصلت الضغطة مرتين بنفس اللحظة، وحدة بس تصفّر (وإلا ممكن تصفّر الثانية
  // متأخرة بعد ما بدأت الجولة الجديدة)
  const claimed = await claimHostOp(admin, room, "again");
  if (claimed === null) return fail("تعذّر تنفيذها، حاول مرة ثانية.");
  if (!claimed) return { success: true };

  await Promise.all([
    // حجوزات ضغطات المنشئ (ليلة -1) تظل: لو انمسحت، ضغطة متأخرة ممكن تنحجز من جديد وتنفّذ
    admin.from("mafia_actions").delete().eq("room_code", room.room_code).neq("night", HOST_OP_NIGHT),
    admin.from("mafia_votes").delete().eq("room_code", room.room_code),
    admin.from("mafia_players").update({ is_alive: true }).eq("room_code", room.room_code),
    admin
      .from("mafia_secrets")
      .update({
        role: null,
        original_role: null,
        soldier_shield_used: false,
        ability_used: false,
        suicide_target: null,
        last_protected: null,
        notes: [],
      })
      .eq("room_code", room.room_code),
  ]);

  const ok = await guardedRoomUpdate(admin, room, {
    phase: "lobby",
    night_step: null,
    night_number: 0,
    phase_ends_at: null,
    announcements: [],
    vote_counts: {},
    vote_result: null,
    winner: null,
    final_roles: null,
  });
  if (!ok) await releaseHostOp(admin, room, "again");
  await endSessionIfStopped(admin, room.room_code);
  return { success: true };
}

/** وضع التجربة: يعبّي الغرفة بلاعبين وهميين. يشتغل على localhost بس. */
export async function addMafiaBots(roomCode: string): Promise<ActionResult<{ added: number }>> {
  if (!IS_DEV) return fail("وضع التجربة متاح على localhost فقط.");
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase !== "lobby") return fail("اللعبة بدأت.");

  const players = await loadPlayers(admin, room.room_code);
  const taken = new Set(players.map((p) => p.display_name));
  const names = MAFIA_BOT_NAMES.filter((n) => !taken.has(n));
  const missing = room.settings.maxPlayers - players.length;

  let added = 0;
  for (const name of names.slice(0, Math.max(0, missing))) {
    const seat = await allocateSeat(admin, room.room_code);
    if (typeof seat !== "number") break;
    const res = await insertPlayer(admin, room.room_code, name, seat, true);
    if (!("error" in res)) added++;
  }
  return { success: true, data: { added } };
}

/** وضع التجربة: يكشف كل الأدوار للمنشئ. يشتغل على localhost بس. */
export async function devGetMafiaRoles(
  roomCode: string
): Promise<ActionResult<{ playerId: string; role: MafiaRole | null }[]>> {
  if (!IS_DEV) return fail("وضع التجربة متاح على localhost فقط.");
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);

  const secrets = await loadSecrets(ctx.admin, ctx.roomCode);
  return { success: true, data: secrets.map((s) => ({ playerId: s.player_id, role: s.role })) };
}

/**
 * الجوال حافظ غرفة على إنه منشئها، بس الحساب المسجّل الحين غير اللي سوّاها:
 * أزرار المنشئ يرفضها السيرفر، فالواجهة تخيّره يسوي غرفة جديدة بدل ما يعلق.
 */
export async function isMafiaRoomFromOtherAccount(rawRoomCode: string): Promise<boolean> {
  const parsed = MafiaRoomCodeSchema.safeParse(rawRoomCode);
  if (!parsed.success) return false;
  const userId = await getGameUserId();
  if (!userId) return false;
  const room = await loadRoom(getSupabaseServiceRole(), parsed.data);
  return Boolean(room && room.host_user_id !== userId);
}
