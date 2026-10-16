"use server";

import { randomUUID } from "crypto";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { MAFIA_BOT_NAMES, MAFIA_CONFIG, MAFIA_NIGHT_ORDER, MAFIA_ROLES } from "@/constants/mafia";
import {
  MafiaCreateSchema,
  MafiaJoinSchema,
  MafiaNameSchema,
  MafiaRoomCodeSchema,
  MafiaSessionSchema,
  MafiaSettingsSchema,
} from "@/lib/schemas";
import {
  allowedTargets,
  buildRoleDeck,
  canActOnStep,
  checkWinner,
  countVotes,
  groupVoters,
  mafiaDeadline,
  mafiaLeaderId,
  mafiaNightShortcut,
  mafiaNightSteps,
  pickMafiaSuggestion,
  pickRandom,
  resolveNight,
  resolveVotes,
  silencedPlayerId,
  validateMafiaSettings,
  voteBombTarget,
  MAFIA_SKIP_KEY,
  type EnginePlayer,
  type NightResolution,
} from "@/lib/game/mafia-engine";
import type {
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

/** صف في mafia_actions: فعل دور، أو اقتراح مافيا لزميله القائد */
const MAFIA_SUGGEST_STEP = "mafia_suggest";
/** اختيار سؤال التمويه لباقي اللاعبين — ينحفظ عشان الدور ما يمشي إلا لما الكل يختارون */
type DecoyStep = `decoy:${MafiaNightStep}`;
const decoyStep = (step: MafiaNightStep): DecoyStep => `decoy:${step}`;
type ActionStep = MafiaNightStep | typeof MAFIA_SUGGEST_STEP | DecoyStep;
/** أفعال الأدوار الحقيقية بس (بدون الاقتراحات واختيارات التمويه) */
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

/** يدمج اللاعبين مع أسرارهم بالشكل اللي يفهمه المحرك */
async function loadEngine(admin: Admin, roomCode: string) {
  const [players, secrets] = await Promise.all([loadPlayers(admin, roomCode), loadSecrets(admin, roomCode)]);
  const secretOf = new Map(secrets.map((s) => [s.player_id, s]));
  const engine: EnginePlayer[] = players.map((p) => {
    const s = secretOf.get(p.id);
    return {
      id: p.id,
      name: p.display_name,
      seat: p.seat,
      alive: p.is_alive,
      role: (s?.role ?? "citizen") as MafiaRole,
      soldierShieldUsed: s?.soldier_shield_used ?? false,
      abilityUsed: s?.ability_used ?? false,
      suicideTarget: s?.suicide_target ?? null,
      lastProtected: s?.last_protected ?? null,
    };
  });
  return { players, secrets, engine, secretOf };
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

  const userClient = await getSupabaseServer();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { ok: false, error: "يجب تسجيل الدخول." };

  const admin = getSupabaseServiceRole();
  const room = await loadRoom(admin, roomCode);
  if (!room) return { ok: false, error: "الغرفة غير موجودة." };
  if (room.host_user_id !== user.id) return { ok: false, error: "هذا الزر لمنشئ اللعبة فقط." };

  return { ok: true, admin, room, roomCode, userId: user.id };
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

async function nextSeat(admin: Admin, roomCode: string): Promise<number> {
  const { data } = await admin
    .from("mafia_players")
    .select("seat")
    .eq("room_code", roomCode)
    .order("seat", { ascending: false })
    .limit(1);
  return (data?.[0]?.seat ?? 0) + 1;
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

  const userClient = await getSupabaseServer();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return fail("يجب تسجيل الدخول لإنشاء غرفة.");

  const created = await createRoomInternal(getSupabaseServiceRole(), user.id, displayName, settings);
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

  const joined = await insertPlayer(admin, roomCode, displayName, await nextSeat(admin, roomCode), false);
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

export interface MafiaTask {
  step: MafiaNightStep;
  /** pick = صاحب الدور يختار، suggest = مافيا يقترح على قائد الليلة */
  mode: "pick" | "suggest";
  options: MafiaTargetOption[];
  /** اختياري (أو اقتراحي) المحفوظ */
  selectedId: string | null;
  /** اخترت وضغطت "استمرار" — ما يتغير */
  locked: boolean;
  leaderName?: string;
  /** للمقترح: اللي حسمه القائد (اسمه، ومعرّفه عشان يضغط "استمرار" عليه) */
  leaderPickName?: string;
  leaderPickId?: string;
  /** للقائد: اقتراحات زملائه */
  suggestions?: { targetId: string; targetName: string; by: string[] }[];
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
  notes: string[];
}

export async function getMafiaMyView(input: {
  roomCode: string;
  token: string;
}): Promise<ActionResult<MafiaMyView>> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, player, secret } = ctx;

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
    notes: Array.isArray(secret.notes) ? secret.notes : [],
  };

  if (room.phase === "night_act" && room.night_step && player.is_alive) {
    const { data: decoy } = await admin
      .from("mafia_actions")
      .select("target_id")
      .eq("room_code", room.room_code)
      .eq("night", room.night_number)
      .eq("step", decoyStep(room.night_step))
      .eq("actor_id", player.id)
      .maybeSingle();
    view.decoyId = decoy?.target_id ?? null;
  }

  if (!role) return { success: true, data: view };

  const myStepNow = (room.phase === "night_act" || room.phase === "night_done") && room.night_step === role;
  const needsEngine = role === "mafia" || myStepNow;
  if (needsEngine) {
    const { engine } = await loadEngine(admin, room.room_code);

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
        .map((p) => ({ id: p.id, name: p.alive ? p.name : `${p.name} ☠️` }));
    }

    if (room.phase === "night_act" && room.night_step && player.is_alive) {
      view.task = await buildTask(admin, room, room.night_step, engine, player.id);
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
  if (!me || !me.alive || me.role !== step) return null;

  const leaderId = mafiaLeaderId(engine, room.night_number);
  const nameOf = (id: string | null) => engine.find((p) => p.id === id)?.name ?? "";
  const options = allowedTargets(me, step, engine).map((p) => ({
    id: p.id,
    // الساحر يختار فئة (المحقق/الدكتور/الجندي)، مو اسم اللاعب الميت
    name: step === "magician" ? `${MAFIA_ROLES[p.role].emoji} ${MAFIA_ROLES[p.role].label}` : p.name,
  }));

  const { data } = await admin
    .from("mafia_actions")
    .select("*")
    .eq("room_code", room.room_code)
    .eq("night", room.night_number)
    .in("step", step === "mafia" ? ["mafia", MAFIA_SUGGEST_STEP] : [step]);
  const rows = (data as ActionRow[]) ?? [];
  const leaderRow = rows.find((r) => r.step === "mafia");

  // مافيا مو قائد الليلة: يقترح، والقائد يقرر
  if (step === "mafia" && me.id !== leaderId) {
    const mine = rows.find((r) => r.step === MAFIA_SUGGEST_STEP && r.actor_id === me.id);
    return {
      step,
      mode: "suggest",
      options,
      selectedId: mine?.target_id ?? null,
      locked: Boolean(leaderRow),
      leaderName: nameOf(leaderId),
      leaderPickName: leaderRow?.target_id ? nameOf(leaderRow.target_id) : undefined,
      leaderPickId: leaderRow?.target_id ?? undefined,
    };
  }

  if (!canActOnStep(me, step, leaderId, engine)) return null;
  const mine = rows.find((r) => r.step === step && r.actor_id === me.id);

  const task: MafiaTask = {
    step,
    mode: "pick",
    options,
    selectedId: mine?.target_id ?? (step === "suicide" ? me.suicideTarget : null),
    locked: Boolean(mine),
  };

  if (step === "mafia") {
    const byTarget = new Map<string, string[]>();
    rows
      .filter((r) => r.step === MAFIA_SUGGEST_STEP && r.target_id)
      .forEach((r) => byTarget.set(r.target_id!, [...(byTarget.get(r.target_id!) ?? []), nameOf(r.actor_id)]));
    task.suggestions = [...byTarget.entries()]
      .map(([targetId, by]) => ({ targetId, targetName: nameOf(targetId), by }))
      .sort((a, b) => b.by.length - a.by.length);
  }

  return task;
}

// ---------------------------------------------------------------------
// أفعال الليل
// ---------------------------------------------------------------------

/**
 * صاحب الدور يختار ويضغط "استمرار" — الاختيار نهائي.
 * targetId = null: الساحر أو الصحفي يعدّي الليلة بدون ما يستخدم قدرته.
 * لو كل أصحاب الدور خلّصوا، الدور ينتهي للكل على طول.
 */
export async function submitMafiaNightAction(input: {
  roomCode: string;
  token: string;
  targetId: string | null;
}): Promise<ActionResult<{ detectiveResult: { targetName: string; isMafia: boolean } | null }>> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, player } = ctx;

  if (room.phase !== "night_act" || !room.night_step) return fail("انتهى وقت هذا الدور.");
  if (room.phase_ends_at && Date.now() > Date.parse(room.phase_ends_at) + 1000) return fail("انتهى الوقت.");
  const step = room.night_step;

  const { engine } = await loadEngine(admin, room.room_code);
  const me = engine.find((p) => p.id === player.id);
  const leaderId = mafiaLeaderId(engine, room.night_number);
  if (!me || !canActOnStep(me, step, leaderId, engine)) return fail("مو دورك الحين.");

  let target: EnginePlayer | undefined;
  if (input.targetId === null) {
    if (step !== "magician" && step !== "journalist") return fail("لازم تختار لاعب.");
  } else {
    target = allowedTargets(me, step, engine).find((p) => p.id === input.targetId);
    if (!target) return fail("ما تقدر تختار هذا اللاعب.");
  }

  const { error } = await admin.from("mafia_actions").insert({
    room_code: room.room_code,
    night: room.night_number,
    step,
    actor_id: me.id,
    target_id: target?.id ?? null,
  });
  if (error) {
    if (error.code === "23505") return fail("خلاص اخترت، ما تقدر تغيّر.");
    console.error("submitMafiaNightAction error:", error);
    return fail("تعذّر حفظ اختيارك.");
  }

  if (step === "suicide" && target) {
    await admin.from("mafia_secrets").update({ suicide_target: target.id }).eq("player_id", me.id);
  }

  await finishStepIfAllDone(admin, room.room_code, room.phase_seq);

  return {
    success: true,
    data: {
      detectiveResult:
        step === "detective" && target ? { targetName: target.name, isMafia: target.role === "mafia" } : null,
    },
  };
}

/**
 * دور الليل يخلص بس لما **كل الأحياء** يختارون — عشان الكل ماسكين جوالاتهم
 * ومحد يعرف مين صاحب الدور من اللي ماسك جواله:
 * - صاحب الدور: يختار ويضغط "استمرار" (أو يعدّي: الساحر والصحفي)
 * - المافيا غير القائد (دور المافيا): يقترح على قائده
 * - الباقين: يجاوبون سؤال التمويه
 * ما فيه مؤقت — لو أحد غايب، المنشئ يتخطى.
 */
async function nightProgress(
  admin: Admin,
  room: MafiaRoom
): Promise<{ done: number; total: number; waiting: string[] }> {
  const step = room.night_step!;
  const [{ engine }, { data }] = await Promise.all([
    loadEngine(admin, room.room_code),
    admin
      .from("mafia_actions")
      .select("actor_id, step")
      .eq("room_code", room.room_code)
      .eq("night", room.night_number)
      .in("step", [step, MAFIA_SUGGEST_STEP, decoyStep(step)]),
  ]);
  const rows = (data ?? []) as { actor_id: string; step: string }[];
  const has = (id: string, s: string) => rows.some((r) => r.actor_id === id && r.step === s);
  const leaderId = mafiaLeaderId(engine, room.night_number);
  const alive = engine.filter((p) => p.alive);
  const isDone = (p: EnginePlayer) => {
    if (canActOnStep(p, step, leaderId, engine)) return has(p.id, step);
    if (step === "mafia" && p.role === "mafia") return has(p.id, MAFIA_SUGGEST_STEP);
    return has(p.id, decoyStep(step));
  };
  const waiting = alive.filter((p) => !isDone(p)).map((p) => p.id);
  return { done: alive.length - waiting.length, total: alive.length, waiting };
}

async function finishStepIfAllDone(admin: Admin, roomCode: string, seq: number): Promise<void> {
  const room = await loadRoom(admin, roomCode);
  if (!room || room.phase_seq !== seq || room.phase !== "night_act" || !room.night_step) return;

  const progress = await nightProgress(admin, room);
  if (progress.done >= progress.total) {
    await runTransition(admin, room);
    return;
  }
  // مين باقي ما اختار (تحديث مستقل: لو ملف 0007 ما انشغّل، اللعبة تمشي عادي بدون القائمة)
  const { error } = await admin
    .from("mafia_rooms")
    .update({ night_ready: { night: room.night_number, step: room.night_step, ...progress } })
    .eq("room_code", roomCode)
    .eq("phase_seq", seq);
  if (error) console.warn("mafia night_ready (شغّل supabase/migrations/0007_mafia_night_ready.sql):", error.message);
}

/** باقي اللاعبين: يجاوبون سؤال التمويه — ينحفظ بس ما ينحسب بشي */
export async function submitMafiaDecoy(input: {
  roomCode: string;
  token: string;
  targetId: string;
}): Promise<ActionResult> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, player } = ctx;
  if (room.phase !== "night_act" || !room.night_step) return fail("انتهى هذا الدور.");
  const step = room.night_step;

  const { engine } = await loadEngine(admin, room.room_code);
  const me = engine.find((p) => p.id === player.id);
  if (!me || !me.alive) return fail("الموتى ما يختارون 👻");
  const leaderId = mafiaLeaderId(engine, room.night_number);
  if (canActOnStep(me, step, leaderId, engine)) return fail("اختر من مهمتك.");
  if (step === "mafia" && me.role === "mafia") return fail("اقترح على قائدك.");
  if (!engine.some((p) => p.alive && p.id === input.targetId && p.id !== me.id)) return fail("اختر لاعب ثاني.");

  const { error } = await admin.from("mafia_actions").upsert(
    { room_code: room.room_code, night: room.night_number, step: decoyStep(step), actor_id: me.id, target_id: input.targetId },
    { onConflict: "room_code,night,step,actor_id", ignoreDuplicates: true }
  );
  if (error) {
    console.error("submitMafiaDecoy error:", error);
    return fail("تعذّر حفظ اختيارك.");
  }
  await finishStepIfAllDone(admin, room.room_code, room.phase_seq);
  return { success: true };
}

/** مافيا (غير القائد) يقترح ضحية — يقدر يغيّر اقتراحه لين القائد يحسم */
export async function suggestMafiaTarget(input: {
  roomCode: string;
  token: string;
  targetId: string;
}): Promise<ActionResult> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, player } = ctx;

  if (room.phase !== "night_act" || room.night_step !== "mafia") return fail("انتهى وقت المافيا.");

  const { engine } = await loadEngine(admin, room.room_code);
  const me = engine.find((p) => p.id === player.id);
  if (!me || !me.alive || me.role !== "mafia") return fail("مو دورك.");
  if (me.id === mafiaLeaderId(engine, room.night_number)) return fail("أنت القائد الليلة — اختر واضغط استمرار.");

  const target = allowedTargets(me, "mafia", engine).find((p) => p.id === input.targetId);
  if (!target) return fail("ما تقدر تقترح هذا اللاعب.");

  const { error } = await admin.from("mafia_actions").upsert(
    {
      room_code: room.room_code,
      night: room.night_number,
      step: MAFIA_SUGGEST_STEP,
      actor_id: me.id,
      target_id: target.id,
    },
    { onConflict: "room_code,night,step,actor_id" }
  );
  if (error) {
    console.error("suggestMafiaTarget error:", error);
    return fail("تعذّر حفظ اقتراحك.");
  }
  await finishStepIfAllDone(admin, room.room_code, room.phase_seq);
  return { success: true };
}

// ---------------------------------------------------------------------
// التصويت
// ---------------------------------------------------------------------

async function recountVotes(admin: Admin, room: MafiaRoom): Promise<Record<string, number>> {
  const { data } = await admin
    .from("mafia_votes")
    .select("voter_id, target_id")
    .eq("room_code", room.room_code)
    .eq("round", room.night_number);
  const votes = (data ?? []).map((v: { voter_id: string; target_id: string | null }) => ({
    voterId: v.voter_id,
    targetId: v.target_id,
  }));

  // مين صوّت على مين — في تحديث مستقل، عشان لو عمود vote_voters مو موجود
  // (ملف 0005 ما انشغّل) يظل العداد والتصويت شغّالين عادي
  const { error } = await admin
    .from("mafia_rooms")
    .update({ vote_voters: groupVoters(votes) })
    .eq("room_code", room.room_code);
  if (error) console.warn("mafia vote_voters (شغّل supabase/migrations/0005_mafia_vote_voters.sql):", error.message);

  return countVotes(votes);
}

export async function castMafiaVote(input: {
  roomCode: string;
  token: string;
  /** null = تخطي */
  targetId: string | null;
}): Promise<ActionResult> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, player } = ctx;

  if (room.phase !== "voting") return fail("التصويت مو مفتوح الحين.");
  if (room.phase_ends_at && Date.now() > Date.parse(room.phase_ends_at) + 1000) return fail("انتهى وقت التصويت.");
  if (!player.is_alive) return fail("الموتى ما يصوّتون 👻");

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

  const counts = await recountVotes(admin, room);
  await admin
    .from("mafia_rooms")
    .update({ vote_counts: counts })
    .eq("room_code", room.room_code)
    .eq("phase_seq", room.phase_seq);

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

function enterNight(room: MafiaRoom, night: number): Partial<MafiaRoom> {
  return {
    phase: "night_act",
    night_step: mafiaNightSteps(room.settings)[0],
    night_number: night,
    // أدوار الليل بدون مؤقت: تمشي لما الكل يختارون
    phase_ends_at: null,
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
}

async function runTransition(admin: Admin, room: MafiaRoom): Promise<void> {
  const steps = mafiaNightSteps(room.settings);

  switch (room.phase) {
    case "reveal": {
      if (await guardedRoomUpdate(admin, room, enterNight(room, 1))) await afterStepStart(admin, room.room_code);
      return;
    }

    case "night_act": {
      // اللي ما اختار، يختار له النظام (إلا الساحر والصحفي: قدرتهم تظل لليلة الجاية)
      if (room.night_step) await fillMissingActions(admin, room, room.night_step);
      await guardedRoomUpdate(admin, room, {
        phase: "night_done",
        phase_ends_at: mafiaDeadline("night_done"),
      });
      return;
    }

    case "night_done": {
      const idx = room.night_step ? steps.indexOf(room.night_step) : -1;
      const remaining = idx >= 0 ? steps.slice(idx + 1) : [];

      const { engine, secretOf } = await loadEngine(admin, room.room_code);
      const { data: acts } = await admin
        .from("mafia_actions")
        .select("*")
        .eq("room_code", room.room_code)
        .eq("night", room.night_number);
      const actions = ((acts as ActionRow[]) ?? [])
        .filter((a) => isRoleStep(a.step))
        .map((a) => ({ step: a.step as MafiaNightStep, actorId: a.actor_id, targetId: a.target_id }));

      // بعد دور المافيا: لو الليلة حسمت اللعبة ننهيها على طول
      const shortcut = idx >= steps.indexOf("mafia") ? mafiaNightShortcut(engine, actions, remaining) : null;
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
        phase_ends_at: mafiaDeadline("morning"),
      });
      if (won) await applyNight(admin, resolution, secretOf);
      return;
    }

    case "morning": {
      const nightKill = (room.announcements ?? []).some((a) => a.kind === "kill");
      const winner = await currentWinner(admin, room.room_code, nightKill);
      if (winner) {
        await endGame(admin, room, winner);
        return;
      }
      await guardedRoomUpdate(admin, room, {
        phase: "discussion",
        phase_ends_at: mafiaDeadline("discussion", Date.now(), room.settings),
      });
      return;
    }

    case "discussion": {
      const won = await guardedRoomUpdate(admin, room, {
        phase: "voting",
        vote_counts: {},
        vote_result: null,
        phase_ends_at: mafiaDeadline("voting"),
      });
      if (won) {
        // نصفّر أسماء المصوّتين من الجولة اللي قبل (تحديث مستقل — شوف recountVotes)
        await admin.from("mafia_rooms").update({ vote_voters: {} }).eq("room_code", room.room_code);
        await castBotVotes(admin, { ...room, phase_seq: room.phase_seq + 1 });
      }
      return;
    }

    case "voting": {
      const [counts, { engine }] = await Promise.all([recountVotes(admin, room), loadEngine(admin, room.room_code)]);
      const result = resolveVotes(counts);
      const bombId = voteBombTarget(engine, result.eliminatedId);
      if (bombId) result.bombId = bombId;
      const won = await guardedRoomUpdate(admin, room, {
        phase: "vote_result",
        vote_counts: counts,
        vote_result: result,
        phase_ends_at: mafiaDeadline("vote_result"),
      });
      const out = [result.eliminatedId, bombId].filter((id): id is string => Boolean(id));
      if (won && out.length > 0) {
        await admin.from("mafia_players").update({ is_alive: false }).in("id", out);
      }
      return;
    }

    case "vote_result": {
      const winner = await currentWinner(admin, room.room_code);
      if (winner) {
        await endGame(admin, room, winner);
        return;
      }
      const started = await guardedRoomUpdate(admin, room, {
        ...enterNight(room, room.night_number + 1),
        announcements: [],
      });
      if (started) await afterStepStart(admin, room.room_code);
      return;
    }

    default:
      return;
  }
}

async function applyNight(admin: Admin, res: NightResolution, secretOf: Map<string, SecretRow>): Promise<void> {
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
  await Promise.all(jobs);

  if (res.abilityUsedBy.length > 0) {
    await admin.from("mafia_secrets").update({ ability_used: true }).in("player_id", res.abilityUsedBy);
  }

  // الساحر ياخذ الفئة بقدراتها كاملة (درع جديد، قدرة صحفي جديدة...)
  await Promise.all(
    res.roleChanges.map(({ playerId, role }) =>
      admin
        .from("mafia_secrets")
        .update({
          role,
          ability_used: role === "journalist" ? false : true,
          soldier_shield_used: false,
          suicide_target: null,
          last_protected: null,
        })
        .eq("player_id", playerId)
    )
  );

  const notesByPlayer = new Map<string, string[]>();
  res.notes.forEach(({ playerId, text }) => {
    notesByPlayer.set(playerId, [...(notesByPlayer.get(playerId) ?? []), text]);
  });
  await Promise.all(
    Array.from(notesByPlayer.entries()).map(([playerId, texts]) =>
      admin
        .from("mafia_secrets")
        .update({ notes: [...(secretOf.get(playerId)?.notes ?? []), ...texts] })
        .eq("player_id", playerId)
    )
  );
}

/** nightKill: الصباح بعد ليلة فيها ذبح ناجح — التساوي هنا يحسمها للمافيا */
async function currentWinner(admin: Admin, roomCode: string, nightKill = false): Promise<MafiaTeam | null> {
  const { engine } = await loadEngine(admin, roomCode);
  return checkWinner(engine, { nightKill });
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
  const changedRole = new Map((night?.resolution.roleChanges ?? []).map((c) => [c.playerId, c.role]));
  const finalRoles: MafiaFinalRole[] = secrets.map((s) => ({
    playerId: s.player_id,
    role: (changedRole.get(s.player_id) ?? s.role ?? "citizen") as MafiaRole,
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
  if (won && night) await applyNight(admin, night.resolution, night.secretOf);
}

// ---------------------------------------------------------------------
// اللاعبون الوهميون (وضع التجربة)
// ---------------------------------------------------------------------

/**
 * المنشئ تخطى الدور: صاحب الدور اللي ما اختار، يختار له النظام عشوائي.
 * - قائد المافيا: ياخذ الاقتراح الأكثر من زملائه، وإلا عشوائي.
 * - الساحر والصحفي: يعدّي دورهم بدون استخدام (قدرتهم مرة وحدة، ما نضيعها عليهم).
 */
async function fillMissingActions(admin: Admin, room: MafiaRoom, step: MafiaNightStep): Promise<void> {
  const [{ engine }, actsRes] = await Promise.all([
    loadEngine(admin, room.room_code),
    admin
      .from("mafia_actions")
      .select("actor_id, step, target_id")
      .eq("room_code", room.room_code)
      .eq("night", room.night_number)
      .in("step", [step, MAFIA_SUGGEST_STEP]),
  ]);

  const rows = (actsRes.data ?? []) as Pick<ActionRow, "actor_id" | "step" | "target_id">[];
  const acted = new Set(rows.filter((r) => r.step === step).map((r) => r.actor_id));
  const leaderId = mafiaLeaderId(engine, room.night_number);

  for (const p of engine) {
    if (acted.has(p.id) || !canActOnStep(p, step, leaderId, engine)) continue;
    if (step === "magician" || step === "journalist") continue;

    const allowed = allowedTargets(p, step, engine);
    let targetId: string | null = null;
    if (step === "mafia") {
      const suggested = rows.filter((r) => r.step === MAFIA_SUGGEST_STEP && r.target_id).map((r) => r.target_id!);
      targetId = pickMafiaSuggestion(suggested, new Set(allowed.map((a) => a.id)));
    }
    // الانتحاري: يظل على آخر هدف اختاره بنفسه، والعشوائي بس لو ما اختار أبد (أو هدفه مات)
    if (step === "suicide" && p.suicideTarget && allowed.some((a) => a.id === p.suicideTarget)) {
      targetId = p.suicideTarget;
    }
    targetId ??= pickRandom(allowed)?.id ?? null;
    if (!targetId) continue;

    await admin.from("mafia_actions").upsert(
      { room_code: room.room_code, night: room.night_number, step, actor_id: p.id, target_id: targetId },
      { onConflict: "room_code,night,step,actor_id", ignoreDuplicates: true }
    );
    if (step === "suicide") {
      await admin.from("mafia_secrets").update({ suicide_target: targetId }).eq("player_id", p.id);
    }
  }
}

/** البوتات (وضع التجربة): أول ما يبدأ الدور يختارون كلهم — صاحب دور، مقترح، أو تمويه */
async function botsNightTurn(admin: Admin, room: MafiaRoom): Promise<void> {
  const step = room.night_step;
  if (!step) return;
  const { engine, players } = await loadEngine(admin, room.room_code);
  const bots = new Set(players.filter((p) => p.is_bot).map((p) => p.id));
  if (bots.size === 0) return;
  const leaderId = mafiaLeaderId(engine, room.night_number);
  const alive = engine.filter((p) => p.alive);

  for (const p of alive.filter((x) => bots.has(x.id))) {
    let row: { step: ActionStep; target_id: string | null } | null = null;
    if (canActOnStep(p, step, leaderId, engine)) {
      const allowed = allowedTargets(p, step, engine);
      const skip = (step === "magician" || step === "journalist") && Math.random() < 0.6;
      row = { step, target_id: skip ? null : pickRandom(allowed)?.id ?? null };
      if (step === "suicide" && row.target_id) {
        await admin.from("mafia_secrets").update({ suicide_target: row.target_id }).eq("player_id", p.id);
      }
    } else if (step === "mafia" && p.role === "mafia") {
      row = { step: MAFIA_SUGGEST_STEP, target_id: pickRandom(allowedTargets(p, "mafia", engine))?.id ?? null };
    } else {
      row = { step: decoyStep(step), target_id: pickRandom(alive.filter((x) => x.id !== p.id))?.id ?? null };
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

  const counts = await recountVotes(admin, room);
  await admin
    .from("mafia_rooms")
    .update({ vote_counts: counts })
    .eq("room_code", room.room_code)
    .eq("phase_seq", room.phase_seq);
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

export async function startMafiaGame(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase !== "lobby") return fail("اللعبة بدأت أصلاً.");

  const settingsError = validateMafiaSettings(room.settings);
  if (settingsError) return fail(settingsError);

  const players = await loadPlayers(admin, room.room_code);
  if (players.length !== room.settings.maxPlayers) {
    return fail(`لازم يكتمل العدد: ${players.length} من ${room.settings.maxPlayers}.`);
  }

  const deck = buildRoleDeck(room.settings);
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

  const ok = await guardedRoomUpdate(admin, room, {
    phase: "reveal",
    night_step: null,
    night_number: 0,
    announcements: [],
    vote_counts: {},
    vote_result: null,
    winner: null,
    final_roles: null,
    phase_ends_at: mafiaDeadline("reveal"),
  });
  return ok ? { success: true } : fail("تعذّر بدء اللعبة، حاول مرة ثانية.");
}

/** المنشئ اختار وقت النقاش وضغط "ابدأ النقاش" (الصباح ما له مؤقت — يظل لين يضغط) */
export async function startMafiaDiscussion(input: { roomCode: string; seconds: number }): Promise<ActionResult> {
  const ctx = await requireHost(input.roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (!MAFIA_CONFIG.DISCUSSION_OPTIONS.includes(input.seconds)) return fail("وقت النقاش غير صحيح.");
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
  if (room.phase === "discussion") patch.phase_ends_at = mafiaDeadline("discussion", Date.now(), patch.settings);

  await admin.from("mafia_rooms").update(patch).eq("room_code", room.room_code);
  return { success: true };
}

/**
 * "غرفة جديدة": كود جديد بنفس الإعدادات والمنشئ لحاله فيها.
 * الغرفة القديمة تنقفل وتدل اللاعبين على الكود الجديد عشان يدخلونه من جديد.
 */
export async function newMafiaRoom(roomCode: string): Promise<ActionResult<{ roomCode: string; token: string }>> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, userId } = ctx;
  if (room.phase === "closed") return fail("هذي الغرفة انقفلت أصلاً.");

  const { data: hostPlayer } = await admin
    .from("mafia_players")
    .select("display_name")
    .eq("id", room.host_player_id ?? "")
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { movedTo, ...settings } = room.settings;

  const created = await createRoomInternal(admin, userId, hostPlayer?.display_name ?? "المنشئ", settings);
  if ("error" in created) return fail(created.error);

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

  return { success: true, data: created };
}

/** المنشئ ينهي المرحلة الحالية فوراً (مثل: إنهاء النقاش والتصويت الحين) */
export async function skipMafiaPhase(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase === "lobby" || room.phase === "ended") return fail("ما فيه مرحلة شغالة الحين.");

  await runTransition(admin, room);
  return { success: true };
}

/**
 * الممنوع من الكلام (المسكت) تكلم: المنشئ يقتله. يظل بالغرفة كميت، ويطلع للكل إعلان،
 * وبعدها نفحص الفوز على طول. لو صار وقت التصويت، ينشال صوته والأصوات اللي عليه.
 * ما ينفجر لو كان انتحاري (الانفجار بس بالذبح أو التصويت).
 */
export async function killSilencedMafiaPlayer(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase !== "morning" && room.phase !== "discussion" && room.phase !== "voting") {
    return fail("المنع من الكلام بس وقت النهار.");
  }

  const players = await loadPlayers(admin, room.room_code);
  const targetId = silencedPlayerId(room.announcements, players);
  const target = players.find((p) => p.id === targetId);
  if (!target) return fail("ما فيه أحد ممنوع من الكلام الحين.");

  const { error } = await admin.from("mafia_players").update({ is_alive: false }).eq("id", target.id).eq("is_alive", true);
  if (error) {
    console.error("killSilencedMafiaPlayer error:", error);
    return fail("تعذّر تنفيذها، حاول مرة ثانية.");
  }

  if (room.phase === "voting") {
    await admin
      .from("mafia_votes")
      .delete()
      .eq("room_code", room.room_code)
      .eq("round", room.night_number)
      .or(`voter_id.eq.${target.id},target_id.eq.${target.id}`);
    const counts = await recountVotes(admin, room);
    await admin.from("mafia_rooms").update({ vote_counts: counts }).eq("room_code", room.room_code).eq("phase_seq", room.phase_seq);
  }

  const announcements = [
    ...(room.announcements ?? []),
    { kind: "hushed_kill" as const, emoji: "☠️", text: `${target.display_name} تكلم وهو ممنوع… وانقتل! 🤐`, targetId: target.id },
  ];
  await admin.from("mafia_rooms").update({ announcements }).eq("room_code", room.room_code).eq("phase_seq", room.phase_seq);

  const winner = await currentWinner(admin, room.room_code);
  if (winner) await endGame(admin, { ...room, announcements }, winner);
  return { success: true };
}

/** المنشئ ينهي اللعبة الحين ويكشف كل الأدوار بدون فائز */
export async function endMafiaGameNow(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase === "lobby" || room.phase === "ended") return fail("ما فيه لعبة شغالة الحين.");

  await endGame(admin, room, null);
  return { success: true };
}

/**
 * المنشئ طالع ويقفل الغرفة: تنتهي عند الكل، وأجهزتهم تنسى الغرفة،
 * فأي واحد منهم يقدر يسجّل دخول ويسوي غرفة جديدة.
 */
export async function closeMafiaRoom(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase === "closed") return { success: true };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { movedTo, ...settings } = room.settings;
  await guardedRoomUpdate(admin, room, {
    phase: "closed",
    night_step: null,
    phase_ends_at: null,
    settings,
  });
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
  if (input.playerId === room.host_player_id) return fail("ما تقدر تطرد نفسك 😅");

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
  if (!removed || removed.length === 0) return fail("اللاعب مو موجود في الغرفة.");

  // يمكن هو اللي كان الكل ينتظرونه بدور الليل
  if (room.phase === "night_act") await finishStepIfAllDone(admin, room.room_code, room.phase_seq);

  // صوته انحذف — نحدّث العداد ومين صوّت على مين
  if (room.phase === "voting") {
    const counts = await recountVotes(admin, room);
    await admin
      .from("mafia_rooms")
      .update({ vote_counts: counts })
      .eq("room_code", room.room_code)
      .eq("phase_seq", room.phase_seq);
  }

  return { success: true };
}

/** يرجّع الكل لغرفة الانتظار بنفس اللاعبين — بعد نهاية اللعبة أو في نصها */
export async function playMafiaAgain(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase === "lobby") return fail("أنتم أصلاً في غرفة الانتظار.");

  await Promise.all([
    admin.from("mafia_actions").delete().eq("room_code", room.room_code),
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

  await guardedRoomUpdate(admin, room, {
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

  let seat = (players[players.length - 1]?.seat ?? 0) + 1;
  let added = 0;
  for (const name of names.slice(0, Math.max(0, missing))) {
    const res = await insertPlayer(admin, room.room_code, name, seat++, true);
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

/** هل وضع التجربة متاح؟ (الواجهة تسأل السيرفر بدل ما تعتمد على متغيرات المتصفح) */
export async function isMafiaDevMode(): Promise<boolean> {
  return IS_DEV;
}
