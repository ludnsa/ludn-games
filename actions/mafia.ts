"use server";

import { randomUUID } from "crypto";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { MAFIA_BOT_NAMES, MAFIA_CONFIG } from "@/constants/mafia";
import {
  MafiaCreateSchema,
  MafiaJoinSchema,
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
  mafiaNightSteps,
  pickRandom,
  resolveNight,
  resolveVotes,
  validateMafiaSettings,
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

interface ActionRow {
  id: string;
  night: number;
  step: MafiaNightStep;
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
  | { ok: true; admin: Admin; room: MafiaRoom; roomCode: string };

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

  return { ok: true, admin, room, roomCode };
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

  const admin = getSupabaseServiceRole();

  let roomCode = "";
  for (let attempt = 0; attempt < 8 && !roomCode; attempt++) {
    const code = generateMafiaRoomCode();
    const { error } = await admin.from("mafia_rooms").insert({
      room_code: code,
      host_user_id: user.id,
      phase: "lobby",
      settings,
    });
    if (!error) roomCode = code;
    else if (error.code !== "23505") {
      console.error("createMafiaRoom error:", error);
      return fail("تعذّر إنشاء الغرفة.");
    }
  }
  if (!roomCode) return fail("تعذّر توليد رمز غرفة فريد، حاول مرة أخرى.");

  const joined = await insertPlayer(admin, roomCode, displayName, 1, false);
  if ("error" in joined) return fail(joined.error);

  await admin.from("mafia_rooms").update({ host_player_id: joined.playerId }).eq("room_code", roomCode);

  return { success: true, data: { roomCode, token: joined.token } };
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
  if (room.phase !== "lobby") return fail("اللعبة بدأت، ما تقدر تدخل الحين.");

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

// ---------------------------------------------------------------------
// شاشة اللاعب الخاصة: "وش أشوف أنا؟"
// ---------------------------------------------------------------------

export interface MafiaTargetOption {
  id: string;
  name: string;
}

export interface MafiaTask {
  step: MafiaNightStep;
  /** pick = يختار بنفسه، confirm = مافيا يصادق على اختيار القائد */
  mode: "pick" | "confirm";
  options: MafiaTargetOption[];
  selectedId: string | null;
  /** المحقق والساحر والصحفي: الاختيار نهائي */
  locked: boolean;
  leaderName?: string;
  confirmedBy?: string[];
  iConfirmed?: boolean;
  detectiveResult?: { targetName: string; isMafia: boolean } | null;
}

export interface MafiaMyView {
  serverNow: number;
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
  /** صوتي في التصويت الحالي: معرّف لاعب، أو "skip"، أو null */
  myVote: string | null;
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
    myVote: null,
    notes: Array.isArray(secret.notes) ? secret.notes : [],
  };

  if (!role) return { success: true, data: view };

  const needsEngine = role === "mafia" || (room.phase === "night_act" && room.night_step === role);
  if (needsEngine) {
    const { engine } = await loadEngine(admin, room.room_code);

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
  const toOption = (p: EnginePlayer) => ({ id: p.id, name: p.name });

  // المافيا اللي مو قائد الليلة: يشوف اختيار القائد ويصادق عليه
  if (step === "mafia" && me.id !== leaderId) {
    const leader = engine.find((p) => p.id === leaderId);
    const { data: act } = await admin
      .from("mafia_actions")
      .select("*")
      .eq("room_code", room.room_code)
      .eq("night", room.night_number)
      .eq("step", "mafia")
      .maybeSingle();
    const row = act as ActionRow | null;
    const confirmedBy = row?.confirmed_by ?? [];
    return {
      step,
      mode: "confirm",
      options: allowedTargets(me, step, engine).map(toOption),
      selectedId: row?.target_id ?? null,
      locked: true,
      leaderName: leader?.name,
      confirmedBy,
      iConfirmed: confirmedBy.includes(me.name),
    };
  }

  if (!canActOnStep(me, step, leaderId)) return null;

  const { data: act } = await admin
    .from("mafia_actions")
    .select("*")
    .eq("room_code", room.room_code)
    .eq("night", room.night_number)
    .eq("step", step)
    .eq("actor_id", me.id)
    .maybeSingle();
  const row = act as ActionRow | null;

  const task: MafiaTask = {
    step,
    mode: "pick",
    options: allowedTargets(me, step, engine).map(toOption),
    selectedId: row?.target_id ?? (step === "suicide" ? me.suicideTarget : null),
    locked: Boolean(row) && (step === "detective" || step === "magician" || step === "journalist"),
  };

  if (step === "mafia") task.confirmedBy = row?.confirmed_by ?? [];

  if (step === "detective" && row?.target_id) {
    const target = engine.find((p) => p.id === row.target_id);
    task.detectiveResult = target ? { targetName: target.name, isMafia: target.role === "mafia" } : null;
  }

  return task;
}

// ---------------------------------------------------------------------
// أفعال الليل
// ---------------------------------------------------------------------

export async function submitMafiaNightAction(input: {
  roomCode: string;
  token: string;
  targetId: string;
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
  if (!me || !canActOnStep(me, step, leaderId)) return fail("مو دورك الحين.");

  const target = allowedTargets(me, step, engine).find((p) => p.id === input.targetId);
  if (!target) return fail("ما تقدر تختار هذا اللاعب.");

  const oneShot = step === "detective" || step === "magician" || step === "journalist";
  if (oneShot) {
    const { data: existing } = await admin
      .from("mafia_actions")
      .select("id")
      .eq("room_code", room.room_code)
      .eq("night", room.night_number)
      .eq("step", step)
      .eq("actor_id", me.id)
      .maybeSingle();
    if (existing) return fail("خلاص اخترت، ما تقدر تغيّر.");
  }

  // الدكتور والمافيا والانتحاري يقدرون يغيّرون رأيهم لين ينتهي الوقت
  const { error } = await admin.from("mafia_actions").upsert(
    {
      room_code: room.room_code,
      night: room.night_number,
      step,
      actor_id: me.id,
      target_id: target.id,
      confirmed_by: [],
    },
    { onConflict: "room_code,night,step,actor_id" }
  );
  if (error) {
    console.error("submitMafiaNightAction error:", error);
    return fail("تعذّر حفظ اختيارك.");
  }

  if (step === "suicide") {
    await admin.from("mafia_secrets").update({ suicide_target: target.id }).eq("player_id", me.id);
  }

  return {
    success: true,
    data: {
      detectiveResult: step === "detective" ? { targetName: target.name, isMafia: target.role === "mafia" } : null,
    },
  };
}

/** المافيا غير القائد يصادق على اختيار القائد — المصادقة إجبارية وما فيه رفض */
export async function confirmMafiaKill(input: { roomCode: string; token: string }): Promise<ActionResult> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, player } = ctx;

  if (room.phase !== "night_act" || room.night_step !== "mafia") return fail("انتهى وقت المافيا.");

  const { engine } = await loadEngine(admin, room.room_code);
  const me = engine.find((p) => p.id === player.id);
  if (!me || !me.alive || me.role !== "mafia") return fail("مو دورك.");

  const { data: act } = await admin
    .from("mafia_actions")
    .select("*")
    .eq("room_code", room.room_code)
    .eq("night", room.night_number)
    .eq("step", "mafia")
    .maybeSingle();
  const row = act as ActionRow | null;
  if (!row) return fail("القائد ما اختار أحد للحين.");

  const confirmedBy = row.confirmed_by ?? [];
  if (!confirmedBy.includes(me.name)) {
    await admin.from("mafia_actions").update({ confirmed_by: [...confirmedBy, me.name] }).eq("id", row.id);
  }
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
  const steps = mafiaNightSteps(room.settings);
  return {
    phase: "night_act",
    night_step: steps[0],
    night_number: night,
    phase_ends_at: mafiaDeadline("night_act"),
    vote_counts: {},
    vote_result: null,
  };
}

async function runTransition(admin: Admin, room: MafiaRoom): Promise<void> {
  const steps = mafiaNightSteps(room.settings);

  switch (room.phase) {
    case "reveal": {
      await guardedRoomUpdate(admin, room, enterNight(room, 1));
      return;
    }

    case "night_act": {
      if (room.night_step) await fillBotActions(admin, room, room.night_step);
      await guardedRoomUpdate(admin, room, {
        phase: "night_done",
        phase_ends_at: mafiaDeadline("night_done"),
      });
      return;
    }

    case "night_done": {
      const idx = room.night_step ? steps.indexOf(room.night_step) : -1;
      if (idx >= 0 && idx < steps.length - 1) {
        await guardedRoomUpdate(admin, room, {
          phase: "night_act",
          night_step: steps[idx + 1],
          phase_ends_at: mafiaDeadline("night_act"),
        });
        return;
      }

      const { engine, secretOf } = await loadEngine(admin, room.room_code);
      const { data: acts } = await admin
        .from("mafia_actions")
        .select("*")
        .eq("room_code", room.room_code)
        .eq("night", room.night_number);
      const resolution = resolveNight(
        engine,
        ((acts as ActionRow[]) ?? []).map((a) => ({ step: a.step, actorId: a.actor_id, targetId: a.target_id }))
      );

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
      const winner = await currentWinner(admin, room.room_code);
      if (winner) {
        await endGame(admin, room, winner);
        return;
      }
      await guardedRoomUpdate(admin, room, {
        phase: "discussion",
        phase_ends_at: mafiaDeadline("discussion"),
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
      const counts = await recountVotes(admin, room);
      const result = resolveVotes(counts);
      const won = await guardedRoomUpdate(admin, room, {
        phase: "vote_result",
        vote_counts: counts,
        vote_result: result,
        phase_ends_at: mafiaDeadline("vote_result"),
      });
      if (won && result.eliminatedId) {
        await admin.from("mafia_players").update({ is_alive: false }).eq("id", result.eliminatedId);
      }
      return;
    }

    case "vote_result": {
      const winner = await currentWinner(admin, room.room_code);
      if (winner) {
        await endGame(admin, room, winner);
        return;
      }
      await guardedRoomUpdate(admin, room, { ...enterNight(room, room.night_number + 1), announcements: [] });
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
  res.lastProtected.forEach(({ doctorId, targetId }) => {
    jobs.push(admin.from("mafia_secrets").update({ last_protected: targetId }).eq("player_id", doctorId));
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

async function currentWinner(admin: Admin, roomCode: string): Promise<MafiaTeam | null> {
  const { engine } = await loadEngine(admin, roomCode);
  return checkWinner(engine);
}

/** winner = null يعني المنشئ أنهى اللعبة قبل ما يفوز أحد */
async function endGame(admin: Admin, room: MafiaRoom, winner: MafiaTeam | null): Promise<void> {
  const secrets = await loadSecrets(admin, room.room_code);
  const finalRoles: MafiaFinalRole[] = secrets.map((s) => ({
    playerId: s.player_id,
    role: (s.role ?? "citizen") as MafiaRole,
    originalRole: (s.original_role ?? s.role ?? "citizen") as MafiaRole,
  }));
  await guardedRoomUpdate(admin, room, {
    phase: "ended",
    night_step: null,
    phase_ends_at: null,
    winner,
    final_roles: finalRoles,
  });
}

// ---------------------------------------------------------------------
// اللاعبون الوهميون (وضع التجربة)
// ---------------------------------------------------------------------

async function fillBotActions(admin: Admin, room: MafiaRoom, step: MafiaNightStep): Promise<void> {
  const [{ engine }, botsRes, actsRes] = await Promise.all([
    loadEngine(admin, room.room_code),
    admin.from("mafia_players").select("id").eq("room_code", room.room_code).eq("is_bot", true),
    admin
      .from("mafia_actions")
      .select("actor_id")
      .eq("room_code", room.room_code)
      .eq("night", room.night_number)
      .eq("step", step),
  ]);

  const botIds = new Set((botsRes.data ?? []).map((b: { id: string }) => b.id));
  if (botIds.size === 0) return;
  const acted = new Set((actsRes.data ?? []).map((a: { actor_id: string }) => a.actor_id));
  const leaderId = mafiaLeaderId(engine, room.night_number);

  for (const bot of engine) {
    if (!botIds.has(bot.id) || acted.has(bot.id) || !canActOnStep(bot, step, leaderId)) continue;
    // الساحر والصحفي البوت ما يستعجلون على قدرتهم
    if ((step === "magician" || step === "journalist") && Math.random() < 0.6) continue;

    const target = pickRandom(allowedTargets(bot, step, engine));
    if (!target) continue;

    await admin.from("mafia_actions").upsert(
      { room_code: room.room_code, night: room.night_number, step, actor_id: bot.id, target_id: target.id },
      { onConflict: "room_code,night,step,actor_id", ignoreDuplicates: true }
    );
    if (step === "suicide") {
      await admin.from("mafia_secrets").update({ suicide_target: target.id }).eq("player_id", bot.id);
    }
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

/** المنشئ ينهي المرحلة الحالية فوراً (مثل: إنهاء النقاش والتصويت الحين) */
export async function skipMafiaPhase(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase === "lobby" || room.phase === "ended") return fail("ما فيه مرحلة شغالة الحين.");

  await runTransition(admin, room);
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

export async function kickMafiaPlayer(input: { roomCode: string; playerId: string }): Promise<ActionResult> {
  const ctx = await requireHost(input.roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase !== "lobby") return fail("ما تقدر تطرد أحد بعد بداية اللعبة.");
  if (input.playerId === room.host_player_id) return fail("ما تقدر تطرد نفسك 😅");

  await admin.from("mafia_players").delete().eq("id", input.playerId).eq("room_code", room.room_code);
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
