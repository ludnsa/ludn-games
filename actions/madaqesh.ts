"use server";

import { randomUUID } from "crypto";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { MADAQESH_BOT_NAMES, MADAQESH_CONFIG } from "@/constants/madaqesh";
import {
  MadaqeshCreateSchema,
  MadaqeshDecisionSchema,
  MadaqeshJoinSchema,
  MadaqeshRoomCodeSchema,
  MadaqeshSessionSchema,
  MadaqeshSettingsSchema,
} from "@/lib/schemas";
import {
  canAllIn,
  checkMadaqeshWinner,
  contestants,
  currentBidderId,
  currentHighBid,
  equalShares,
  newRound,
  nextRoundOrder,
  pickDecider,
  respondersFor,
  settleRound,
  stakedOpponents,
  stakeOf,
  validateBid,
  validateDecision,
} from "@/lib/game/madaqesh-engine";
import type {
  MadaqeshBidKind,
  MadaqeshDecision,
  MadaqeshHistoryRow,
  MadaqeshPlayer,
  MadaqeshResponse,
  MadaqeshRoom,
  MadaqeshRound,
  MadaqeshSettings,
} from "@/types/madaqesh";

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string };

type Admin = ReturnType<typeof getSupabaseServiceRole>;

function fail(error: string): { success: false; error: string } {
  return { success: false, error };
}

const IS_DEV = process.env.NODE_ENV !== "production";

// ---------------------------------------------------------------------
// أدوات مساعدة
// ---------------------------------------------------------------------

function generateRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = MADAQESH_CONFIG.ROOM_CODE_PREFIX;
  for (let i = 1; i < MADAQESH_CONFIG.ROOM_CODE_LENGTH; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function newToken(): string {
  return (randomUUID() + randomUUID()).replace(/-/g, "");
}

async function loadRoom(admin: Admin, roomCode: string): Promise<MadaqeshRoom | null> {
  const { data } = await admin.from("madaqesh_rooms").select("*").eq("room_code", roomCode).maybeSingle();
  return (data as MadaqeshRoom) ?? null;
}

async function loadPlayers(admin: Admin, roomCode: string): Promise<MadaqeshPlayer[]> {
  const { data } = await admin
    .from("madaqesh_players")
    .select("*")
    .eq("room_code", roomCode)
    .order("seat", { ascending: true });
  return ((data as MadaqeshPlayer[]) ?? []).map((p) => ({ ...p, balance: Number(p.balance) }));
}

/** تحديث محمي برقم التسلسل: لو جهاز ثاني سبقنا، ما يتنفذ مرتين */
async function guardedUpdate(admin: Admin, room: MadaqeshRoom, patch: Partial<MadaqeshRoom>): Promise<boolean> {
  const { data, error } = await admin
    .from("madaqesh_rooms")
    .update({ ...patch, phase_seq: room.phase_seq + 1 })
    .eq("room_code", room.room_code)
    .eq("phase_seq", room.phase_seq)
    .select("room_code");
  if (error) {
    console.error("madaqesh guardedUpdate error:", error);
    return false;
  }
  return Boolean(data && data.length > 0);
}

type PlayerContext =
  | { ok: false; error: string }
  | { ok: true; admin: Admin; room: MadaqeshRoom; player: MadaqeshPlayer; isHost: boolean };

async function requirePlayer(input: { roomCode: string; token: string }): Promise<PlayerContext> {
  const parsed = MadaqeshSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات الجلسة غير صحيحة." };
  const { roomCode, token } = parsed.data;

  const admin = getSupabaseServiceRole();
  const { data: secret } = await admin
    .from("madaqesh_secrets")
    .select("player_id")
    .eq("token", token)
    .eq("room_code", roomCode)
    .maybeSingle();
  if (!secret) return { ok: false, error: "انتهت جلستك في هذه الغرفة." };

  const [room, playerRes] = await Promise.all([
    loadRoom(admin, roomCode),
    admin.from("madaqesh_players").select("*").eq("id", secret.player_id).maybeSingle(),
  ]);
  if (!room || !playerRes.data) return { ok: false, error: "الغرفة غير موجودة." };
  const player = { ...(playerRes.data as MadaqeshPlayer), balance: Number(playerRes.data.balance) };
  return { ok: true, admin, room, player, isHost: room.host_player_id === player.id };
}

type HostContext = { ok: false; error: string } | { ok: true; admin: Admin; room: MadaqeshRoom; userId: string };

async function requireHost(rawRoomCode: string): Promise<HostContext> {
  const parsed = MadaqeshRoomCodeSchema.safeParse(rawRoomCode);
  if (!parsed.success) return { ok: false, error: "رمز الغرفة غير صحيح." };

  const userClient = await getSupabaseServer();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { ok: false, error: "يجب تسجيل الدخول." };

  const admin = getSupabaseServiceRole();
  const room = await loadRoom(admin, parsed.data);
  if (!room) return { ok: false, error: "الغرفة غير موجودة." };
  if (room.host_user_id !== user.id) return { ok: false, error: "هذا الزر لمنشئ اللعبة فقط." };
  return { ok: true, admin, room, userId: user.id };
}

async function insertPlayer(
  admin: Admin,
  roomCode: string,
  displayName: string,
  seat: number,
  balance: number,
  isBot: boolean
): Promise<{ playerId: string; token: string } | { error: string }> {
  const { data: player, error } = await admin
    .from("madaqesh_players")
    .insert({ room_code: roomCode, display_name: displayName, seat, balance, is_bot: isBot })
    .select("id")
    .single();
  if (error || !player) {
    if (error?.code === "23505") return { error: "هذا الاسم مستخدم في الغرفة، اختر اسم ثاني." };
    console.error("madaqesh insertPlayer error:", error);
    return { error: "تعذّر الانضمام للغرفة." };
  }

  const token = newToken();
  const { error: secretError } = await admin.from("madaqesh_secrets").insert({ player_id: player.id, room_code: roomCode, token });
  if (secretError) {
    console.error("madaqesh insert secret error:", secretError);
    await admin.from("madaqesh_players").delete().eq("id", player.id);
    return { error: "تعذّر الانضمام للغرفة." };
  }
  return { playerId: player.id, token };
}

async function nextSeat(admin: Admin, roomCode: string): Promise<number> {
  const { data } = await admin
    .from("madaqesh_players")
    .select("seat")
    .eq("room_code", roomCode)
    .order("seat", { ascending: false })
    .limit(1);
  return (data?.[0]?.seat ?? 0) + 1;
}

// ---------------------------------------------------------------------
// سير الجولة
// ---------------------------------------------------------------------

/** جولة جديدة: الدور يبدأ من اللي بعد بادئ الجولة اللي قبل */
async function startRound(admin: Admin, room: MadaqeshRoom, prevStarterId: string | null): Promise<boolean> {
  const players = await loadPlayers(admin, room.room_code);
  const order = nextRoundOrder(players, prevStarterId);
  return guardedUpdate(admin, room, {
    phase: "bidding",
    phase_ends_at: null,
    round_number: room.round_number + 1,
    round: newRound(order),
  });
}

/** انتهى السوم: أعلى سومة تقرر — ولو الكل انسحبوا، الجولة تعدّي */
async function finishBidding(admin: Admin, room: MadaqeshRoom, round: MadaqeshRound): Promise<boolean> {
  const deciderId = pickDecider(round);
  if (!deciderId) {
    return guardedUpdate(admin, room, {
      phase: "result",
      phase_ends_at: null,
      round: {
        ...round,
        result: { deltas: {}, winnerId: null, revived: [], eliminated: [], void: true },
      },
    });
  }
  return guardedUpdate(admin, room, { phase: "deciding", round: { ...round, deciderId } });
}

/** بعد القرار أو الردود: لو فيه أحد يداقش نروح للمداقشة، وإلا تنحسب الجولة على طول */
async function afterResponses(admin: Admin, room: MadaqeshRoom, round: MadaqeshRound): Promise<void> {
  if (contestants(round).length > 0) {
    await guardedUpdate(admin, room, { phase: "showdown", round });
    return;
  }
  await settle(admin, room, round, null);
}

/** حساب الجولة: الأرصدة الجديدة + الإفلاس + الفوز، ونحفظ اللي قبل للتراجع */
async function settle(admin: Admin, room: MadaqeshRoom, round: MadaqeshRound, winnerId: string | null): Promise<boolean> {
  const players = await loadPlayers(admin, room.room_code);
  const s = settleRound(round, players, winnerId, room.settings);
  const after = s.updates;
  const champion = checkMadaqeshWinner(after, room.settings.targetAmount);

  const result = { deltas: s.deltas, winnerId, revived: s.revived, eliminated: s.eliminated };
  const won = await guardedUpdate(admin, room, {
    phase: champion ? "ended" : "result",
    phase_ends_at: null,
    round: { ...round, result },
    winner_id: champion,
  });
  if (!won) return false;

  await admin.from("madaqesh_rounds").insert({
    room_code: room.room_code,
    round: room.round_number,
    data: {
      round: { ...round, result },
      before: players.map((p) => ({ id: p.id, balance: p.balance, bankrupts: p.bankrupts, is_out: p.is_out })),
    },
  });
  await Promise.all(
    after
      .filter((u) => {
        const p = players.find((x) => x.id === u.id)!;
        return p.balance !== u.balance || p.bankrupts !== u.bankrupts || p.is_out !== u.is_out;
      })
      .map((u) =>
        admin.from("madaqesh_players").update({ balance: u.balance, bankrupts: u.bankrupts, is_out: u.is_out }).eq("id", u.id)
      )
  );
  return true;
}

/** تسجيل سومة (أو انسحاب) لصاحب الدور، وإذا خلصت الدورة ننتقل للقرار */
async function applyBid(admin: Admin, room: MadaqeshRoom, player: MadaqeshPlayer, kind: MadaqeshBidKind, amount: number) {
  const round = room.round;
  if (room.phase !== "bidding" || !round) return fail("مو وقت السوم.");
  if (currentBidderId(round) !== player.id) return fail("مو دورك.");

  const v = validateBid(round, player.balance, kind, amount);
  if (!v.ok) return fail(v.error);

  const next: MadaqeshRound = { ...round, bids: { ...round.bids, [player.id]: v.bid }, turn: round.turn + 1 };
  const ok = next.turn >= next.order.length
    ? await finishBidding(admin, room, next)
    : await guardedUpdate(admin, room, { round: next });
  return ok ? null : fail("تغيّر شي بنفس اللحظة، حاول مرة ثانية.");
}

async function applyDecision(admin: Admin, room: MadaqeshRoom, raw: MadaqeshDecision) {
  const round = room.round;
  if (room.phase !== "deciding" || !round) return fail("مو وقت القرار.");
  const parsed = MadaqeshDecisionSchema.safeParse(raw);
  if (!parsed.success) return fail("القرار غير صحيح.");
  const v = validateDecision(round, parsed.data);
  if (!v.ok) return fail(v.error);

  const next: MadaqeshRound = { ...round, decision: v.decision, responses: {} };
  if (respondersFor(next).length === 0) {
    await afterResponses(admin, room, next);
    return null;
  }
  const ok = await guardedUpdate(admin, room, { phase: "responding", round: next });
  return ok ? null : fail("تغيّر شي بنفس اللحظة، حاول مرة ثانية.");
}

/** لو كل اللي لازم يردون ردّوا، نكمل */
async function finishRespondingIfDone(admin: Admin, roomCode: string, force = false): Promise<void> {
  const room = await loadRoom(admin, roomCode);
  if (!room || room.phase !== "responding" || !room.round) return;
  const pending = respondersFor(room.round).filter((r) => !room.round!.responses[r.id]);
  if (pending.length > 0 && !force) return;
  await afterResponses(admin, room, room.round);
}

// ---------------------------------------------------------------------
// اللاعبون الوهميون (وضع التجربة على localhost)
// ---------------------------------------------------------------------

function randomOf<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** البوتات يلعبون دورهم لحالهم (السوم، القرار، الرد). المداقشة يسجلها إنسان. */
async function runBots(admin: Admin, roomCode: string): Promise<void> {
  if (!IS_DEV) return;
  for (let i = 0; i < 30; i++) {
    const room = await loadRoom(admin, roomCode);
    if (!room?.round) return;
    const players = await loadPlayers(admin, roomCode);
    const bots = new Map(players.filter((p) => p.is_bot).map((p) => [p.id, p]));
    if (bots.size === 0) return;
    const round = room.round;

    if (room.phase === "bidding") {
      const bot = bots.get(currentBidderId(round) ?? "");
      if (!bot) return;
      const high = currentHighBid(round);
      const raise = high + randomOf(MADAQESH_CONFIG.RAISE_STEPS.slice(0, 2));
      if (raise <= bot.balance && Math.random() < 0.55) await applyBid(admin, room, bot, "bid", raise);
      else if (canAllIn(round, bot.balance) && Math.random() < 0.3) await applyBid(admin, room, bot, "allin", 0);
      else await applyBid(admin, room, bot, "pass", 0);
      continue;
    }

    if (room.phase === "deciding") {
      const bot = bots.get(round.deciderId ?? "");
      if (!bot) return;
      const total = stakeOf(round, bot.id);
      const others = stakedOpponents(round);
      const mode = randomOf(["distribute", "distribute", "withdraw", "all_fixed"] as const);
      const fixed = mode === "distribute" && Math.random() < 0.4 ? stakedOpponents(round).slice(0, 1) : [];
      await applyDecision(admin, room, {
        mode,
        shares: mode === "distribute" ? equalShares(total, others.filter((id) => !fixed.includes(id))) : {},
        fixed,
      });
      continue;
    }

    if (room.phase === "responding") {
      const todo = respondersFor(round).filter((r) => bots.has(r.id) && !round.responses[r.id]);
      if (todo.length === 0) return;
      for (const r of todo) {
        const pick = r.options[0] === "accept" ? (Math.random() < 0.75 ? "accept" : "object") : Math.random() < 0.6 ? "withdraw" : "stay";
        await admin.rpc("madaqesh_set_response", {
          p_room_code: roomCode,
          p_round: room.round_number,
          p_player_id: r.id,
          p_response: pick,
        });
      }
      await finishRespondingIfDone(admin, roomCode);
      continue;
    }
    return;
  }
}

// ---------------------------------------------------------------------
// الإنشاء والانضمام
// ---------------------------------------------------------------------

export async function createMadaqeshRoom(input: {
  displayName: string;
  settings: MadaqeshSettings;
}): Promise<ActionResult<{ roomCode: string; token: string }>> {
  const parsed = MadaqeshCreateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة.");
  const { displayName, settings } = parsed.data;
  if (settings.targetAmount <= settings.startBalance) return fail("مبلغ الفوز لازم يكون أكبر من رصيد البداية.");

  const userClient = await getSupabaseServer();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return fail("يجب تسجيل الدخول لإنشاء غرفة.");

  const admin = getSupabaseServiceRole();
  let roomCode = "";
  for (let attempt = 0; attempt < 8 && !roomCode; attempt++) {
    const code = generateRoomCode();
    const { error } = await admin.from("madaqesh_rooms").insert({ room_code: code, host_user_id: user.id, phase: "lobby", settings });
    if (!error) roomCode = code;
    else if (error.code !== "23505") {
      console.error("createMadaqeshRoom error:", error);
      return fail("تعذّر إنشاء الغرفة.");
    }
  }
  if (!roomCode) return fail("تعذّر توليد رمز غرفة فريد، حاول مرة أخرى.");

  const joined = await insertPlayer(admin, roomCode, displayName, 1, settings.startBalance, false);
  if ("error" in joined) return fail(joined.error);
  await admin.from("madaqesh_rooms").update({ host_player_id: joined.playerId }).eq("room_code", roomCode);
  return { success: true, data: { roomCode, token: joined.token } };
}

export async function getMadaqeshRoomPublicInfo(
  rawRoomCode: string
): Promise<ActionResult<{ phase: MadaqeshRoom["phase"]; joined: number }>> {
  const parsed = MadaqeshRoomCodeSchema.safeParse(rawRoomCode);
  if (!parsed.success) return fail("رمز الغرفة غير صحيح.");
  const admin = getSupabaseServiceRole();
  const room = await loadRoom(admin, parsed.data);
  if (!room) return fail("لم نجد غرفة بهذا الرمز.");
  const { count } = await admin
    .from("madaqesh_players")
    .select("id", { count: "exact", head: true })
    .eq("room_code", room.room_code);
  return { success: true, data: { phase: room.phase, joined: count ?? 0 } };
}

/**
 * الانضمام بالكود والاسم. نفس الاسم = نفس الشخص رجع (سكّر المتصفح مثلاً):
 * ياخذ مكانه ورصيده بمفتاح جديد — حتى وسط اللعبة.
 */
export async function joinMadaqeshRoom(input: {
  roomCode: string;
  displayName: string;
}): Promise<ActionResult<{ roomCode: string; token: string }>> {
  const parsed = MadaqeshJoinSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة.");
  const { roomCode, displayName } = parsed.data;

  const admin = getSupabaseServiceRole();
  const room = await loadRoom(admin, roomCode);
  if (!room) return fail("لم نجد غرفة بهذا الرمز.");
  if (room.phase === "closed") return fail("هذي الغرفة انقفلت.");

  const { data: sameName } = await admin
    .from("madaqesh_players")
    .select("id")
    .eq("room_code", roomCode)
    .eq("display_name", displayName)
    .maybeSingle();
  if (sameName) {
    if (sameName.id === room.host_player_id) return fail("هذا اسم المنشئ، اختر اسم ثاني.");
    const token = newToken();
    await admin.from("madaqesh_secrets").update({ token }).eq("player_id", sameName.id);
    return { success: true, data: { roomCode, token } };
  }

  if (room.phase !== "lobby") return fail("اللعبة بدأت — إذا كنت داخل قبل، اكتب نفس اسمك بالضبط.");
  const { count } = await admin
    .from("madaqesh_players")
    .select("id", { count: "exact", head: true })
    .eq("room_code", roomCode);
  if ((count ?? 0) >= MADAQESH_CONFIG.MAX_PLAYERS) return fail("الغرفة ممتلئة.");

  const joined = await insertPlayer(
    admin,
    roomCode,
    displayName,
    await nextSeat(admin, roomCode),
    room.settings.startBalance,
    false
  );
  if ("error" in joined) return fail(joined.error);
  return { success: true, data: { roomCode, token: joined.token } };
}

export async function leaveMadaqeshRoom(input: { roomCode: string; token: string }): Promise<ActionResult> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return { success: true };
  const { admin, room, player, isHost } = ctx;
  if (room.phase !== "lobby" || isHost) return { success: true };
  await admin.from("madaqesh_players").delete().eq("id", player.id);
  return { success: true };
}

/** مين أنا في هالغرفة + وقت السيرفر (للمؤقت) */
export async function getMadaqeshMe(input: {
  roomCode: string;
  token: string;
}): Promise<ActionResult<{ playerId: string; isHost: boolean; serverNow: number }>> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  return { success: true, data: { playerId: ctx.player.id, isHost: ctx.isHost, serverNow: Date.now() } };
}

// ---------------------------------------------------------------------
// أفعال اللاعبين
// ---------------------------------------------------------------------

export async function placeMadaqeshBid(input: {
  roomCode: string;
  token: string;
  kind: MadaqeshBidKind;
  amount: number;
}): Promise<ActionResult> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  if (!["bid", "allin", "pass"].includes(input.kind)) return fail("اختيار غير صحيح.");
  const err = await applyBid(ctx.admin, ctx.room, ctx.player, input.kind, Math.floor(Number(input.amount) || 0));
  if (err) return err;
  await runBots(ctx.admin, ctx.room.room_code);
  return { success: true };
}

/** قرار صاحب أعلى سومة (والمنشئ يقدر يقرر عنه لو غايب) */
export async function decideMadaqesh(input: {
  roomCode: string;
  token: string;
  decision: MadaqeshDecision;
}): Promise<ActionResult> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, player, isHost } = ctx;
  if (room.round?.deciderId !== player.id && !isHost) return fail("القرار لصاحب أعلى سومة.");
  const err = await applyDecision(admin, room, input.decision);
  if (err) return err;
  await runBots(admin, room.room_code);
  return { success: true };
}

export async function respondMadaqesh(input: {
  roomCode: string;
  token: string;
  response: MadaqeshResponse;
}): Promise<ActionResult> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, player } = ctx;
  if (room.phase !== "responding" || !room.round) return fail("مو وقت الرد.");

  const mine = respondersFor(room.round).find((r) => r.id === player.id);
  if (!mine || !mine.options.includes(input.response)) return fail("ما تقدر تختار هذا.");

  const { data, error } = await admin.rpc("madaqesh_set_response", {
    p_room_code: room.room_code,
    p_round: room.round_number,
    p_player_id: player.id,
    p_response: input.response,
  });
  if (error) {
    console.error("respondMadaqesh error:", error);
    return fail("تعذّر حفظ ردك.");
  }
  if (!data) return fail("انتهى وقت الرد.");

  await finishRespondingIfDone(admin, room.room_code);
  await runBots(admin, room.room_code);
  return { success: true };
}

/** صاحب أقوى ورق في المداقشة — يسجله صاحب القرار أو المنشئ */
export async function setMadaqeshShowdownWinner(input: {
  roomCode: string;
  token: string;
  winnerId: string;
}): Promise<ActionResult> {
  const ctx = await requirePlayer(input);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, player, isHost } = ctx;
  const round = room.round;
  if (room.phase !== "showdown" || !round) return fail("مو وقت المداقشة.");
  if (round.deciderId !== player.id && !isHost) return fail("النتيجة يسجلها صاحب القرار أو المنشئ.");

  const allowed = [round.deciderId, ...contestants(round)];
  if (!allowed.includes(input.winnerId)) return fail("هذا اللاعب مو في المداقشة.");

  const ok = await settle(admin, room, round, input.winnerId);
  return ok ? { success: true } : fail("تغيّر شي بنفس اللحظة، حاول مرة ثانية.");
}

/** المنشئ يبدأ الجولة الجاية (ما فيه مؤقت — هو اللي يتحكم) */
export async function nextMadaqeshRound(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase !== "result") return { success: true };
  const ok = await startRound(admin, room, room.round?.order[0] ?? null);
  if (!ok) return fail("تغيّر شي بنفس اللحظة، حاول مرة ثانية.");
  await runBots(admin, room.room_code);
  return { success: true };
}

// ---------------------------------------------------------------------
// أزرار المنشئ
// ---------------------------------------------------------------------

export async function updateMadaqeshSettings(input: { roomCode: string; settings: MadaqeshSettings }): Promise<ActionResult> {
  const ctx = await requireHost(input.roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase !== "lobby") return fail("تقدر تعدّل الإعدادات قبل البدء بس.");
  const parsed = MadaqeshSettingsSchema.safeParse(input.settings);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "إعدادات غير صحيحة.");
  if (parsed.data.targetAmount <= parsed.data.startBalance) return fail("مبلغ الفوز لازم يكون أكبر من رصيد البداية.");

  await admin.from("madaqesh_rooms").update({ settings: parsed.data }).eq("room_code", room.room_code);
  // رصيد البداية الجديد للكل
  await admin.from("madaqesh_players").update({ balance: parsed.data.startBalance }).eq("room_code", room.room_code);
  return { success: true };
}

/** ترتيب اللاعبين: يرفع لاعب أو ينزله خانة */
export async function moveMadaqeshPlayer(input: { roomCode: string; playerId: string; dir: -1 | 1 }): Promise<ActionResult> {
  const ctx = await requireHost(input.roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase !== "lobby") return fail("الترتيب قبل البدء بس.");
  const players = await loadPlayers(admin, room.room_code);
  const i = players.findIndex((p) => p.id === input.playerId);
  const j = i + input.dir;
  if (i < 0 || j < 0 || j >= players.length) return { success: true };
  const a = players[i];
  const b = players[j];
  // نبدّل المقاعد على مرحلتين عشان ما يتصادمون
  await admin.from("madaqesh_players").update({ seat: -1 }).eq("id", a.id);
  await admin.from("madaqesh_players").update({ seat: a.seat }).eq("id", b.id);
  await admin.from("madaqesh_players").update({ seat: b.seat }).eq("id", a.id);
  return { success: true };
}

/** خلط الترتيب عشوائي (بالسحب) */
export async function shuffleMadaqeshPlayers(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase !== "lobby") return fail("الترتيب قبل البدء بس.");
  const players = await loadPlayers(admin, room.room_code);
  const seats = players.map((p) => p.seat).sort(() => Math.random() - 0.5);
  await Promise.all(players.map((p, i) => admin.from("madaqesh_players").update({ seat: seats[i] }).eq("id", p.id)));
  return { success: true };
}

export async function startMadaqeshGame(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase !== "lobby") return fail("اللعبة بدأت أصلاً.");
  const players = await loadPlayers(admin, room.room_code);
  if (players.length < MADAQESH_CONFIG.MIN_PLAYERS) return fail(`لازم ${MADAQESH_CONFIG.MIN_PLAYERS} لاعبين على الأقل.`);

  await admin.from("madaqesh_rounds").delete().eq("room_code", room.room_code);
  await admin
    .from("madaqesh_players")
    .update({ balance: room.settings.startBalance, bankrupts: 0, is_out: false })
    .eq("room_code", room.room_code);
  const ok = await startRound(admin, { ...room, round_number: 0 }, null);
  if (!ok) return fail("تعذّر بدء اللعبة، حاول مرة ثانية.");
  await runBots(admin, room.room_code);
  return { success: true };
}

/** صاحب الدور غايب: نعتبره انسحب من السوم */
export async function skipMadaqeshTurn(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase !== "bidding" || !room.round) return fail("مو وقت السوم.");
  const id = currentBidderId(room.round);
  const players = await loadPlayers(admin, room.room_code);
  const player = players.find((p) => p.id === id);
  if (!player) return fail("ما فيه أحد عليه الدور.");
  const err = await applyBid(admin, room, player, "pass", 0);
  if (err) return err;
  await runBots(admin, room.room_code);
  return { success: true };
}

/** اعتماد الحين: اللي ما ردوا ينحسبون على الرد الافتراضي (رضى / انسحب) */
export async function forceMadaqeshResponses(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  await finishRespondingIfDone(ctx.admin, ctx.room.room_code, true);
  return { success: true };
}

/** تراجع عن آخر جولة انحسبت: الأرصدة ترجع، والجولة تنعاد من أولها بنفس الترتيب */
export async function undoMadaqeshRound(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase === "lobby" || room.phase === "closed") return fail("ما فيه جولة تتراجع عنها.");

  const { data } = await admin
    .from("madaqesh_rounds")
    .select("*")
    .eq("room_code", room.room_code)
    .order("round", { ascending: false })
    .limit(1);
  const last = (data as MadaqeshHistoryRow[] | null)?.[0];
  if (!last) return fail("ما فيه جولة انحسبت للحين.");

  const ok = await guardedUpdate(admin, room, {
    phase: "bidding",
    phase_ends_at: null,
    round_number: last.round,
    round: newRound(last.data.round.order),
    winner_id: null,
  });
  if (!ok) return fail("تغيّر شي بنفس اللحظة، حاول مرة ثانية.");

  await Promise.all(
    last.data.before.map((b) =>
      admin.from("madaqesh_players").update({ balance: b.balance, bankrupts: b.bankrupts, is_out: b.is_out }).eq("id", b.id)
    )
  );
  await admin.from("madaqesh_rounds").delete().eq("id", last.id);
  await runBots(admin, room.room_code);
  return { success: true };
}

/** تعديل رصيد لاعب يدوياً (تصحيح على الطاولة) */
export async function setMadaqeshBalance(input: { roomCode: string; playerId: string; balance: number }): Promise<ActionResult> {
  const ctx = await requireHost(input.roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const balance = Math.floor(Number(input.balance));
  if (!Number.isFinite(balance) || balance < 0 || balance > 1_000_000_000) return fail("رصيد غير صحيح.");
  await ctx.admin
    .from("madaqesh_players")
    .update({ balance, ...(balance > 0 ? { is_out: false } : {}) })
    .eq("id", input.playerId)
    .eq("room_code", ctx.room.room_code);
  return { success: true };
}

/**
 * طرد حقيقي (في أي وقت): اللاعب ينحذف وجواله يطلع من الغرفة.
 * لو كان داخل الجولة الحالية:
 * - وقت السوم: ينشال من الترتيب (وسومته لو سام) والدور يكمل عادي.
 * - بعد السوم: لو له دخل بالجولة (صاحب القرار، أو سام، أو له نصيب) الجولة تنعاد
 *   من أولها بدونه، وإلا ينشال بس.
 */
export async function kickMadaqeshPlayer(input: { roomCode: string; playerId: string }): Promise<ActionResult> {
  const ctx = await requireHost(input.roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  const id = input.playerId;
  if (id === room.host_player_id) return fail("ما تقدر تطرد نفسك.");

  const round = room.round;
  const live = ["bidding", "deciding", "responding", "showdown"].includes(room.phase);
  if (live && round && round.order.includes(id)) {
    const order = round.order.filter((x) => x !== id);
    let ok: boolean;
    if (room.phase === "bidding") {
      const idx = round.order.indexOf(id);
      const bids = { ...round.bids };
      delete bids[id];
      const next: MadaqeshRound = { ...round, order, bids, turn: idx < round.turn ? round.turn - 1 : round.turn };
      ok = next.turn >= order.length ? await finishBidding(admin, room, next) : await guardedUpdate(admin, room, { round: next });
    } else {
      const involved = round.deciderId === id || stakeOf(round, id) > 0 || (round.decision?.shares[id] ?? 0) > 0;
      if (involved) {
        ok = await guardedUpdate(admin, room, { phase: "bidding", phase_ends_at: null, round: newRound(order) });
      } else {
        ok = await guardedUpdate(admin, room, { round: { ...round, order } });
      }
    }
    if (!ok) return fail("تغيّر شي بنفس اللحظة، حاول مرة ثانية.");
  }

  await admin.from("madaqesh_players").delete().eq("id", id).eq("room_code", room.room_code);

  // بقى لاعب واحد بس؟ هو الفايز
  if (room.phase !== "lobby" && room.phase !== "ended") {
    const fresh = await loadRoom(admin, room.room_code);
    const players = await loadPlayers(admin, room.room_code);
    const winner = checkMadaqeshWinner(players, room.settings.targetAmount);
    if (fresh && winner && players.filter((p) => !p.is_out).length <= 1) {
      await guardedUpdate(admin, fresh, { phase: "ended", phase_ends_at: null, winner_id: winner });
    }
  }
  await runBots(admin, room.room_code);
  return { success: true };
}

/** إخراج: اللاعب يظل بالغرفة ويتفرج، وما يدخل الجولات الجاية */
export async function outMadaqeshPlayer(input: { roomCode: string; playerId: string }): Promise<ActionResult> {
  const ctx = await requireHost(input.roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase === "lobby") return fail("قبل البدء استخدم الطرد.");
  await admin.from("madaqesh_players").update({ is_out: true }).eq("id", input.playerId).eq("room_code", room.room_code);
  // لو عليه الدور في السوم، نعدّيه
  if (room.phase === "bidding" && room.round && currentBidderId(room.round) === input.playerId) {
    const players = await loadPlayers(admin, room.room_code);
    const p = players.find((x) => x.id === input.playerId);
    if (p) await applyBid(admin, room, p, "pass", 0);
  }
  await runBots(admin, room.room_code);
  return { success: true };
}

/**
 * "غرفة جديدة": كود جديد بنفس الإعدادات والمنشئ لحاله فيها.
 * الغرفة القديمة تنقفل وتدل اللاعبين على الكود الجديد.
 */
export async function newMadaqeshRoom(roomCode: string): Promise<ActionResult<{ roomCode: string; token: string }>> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, userId } = ctx;
  if (room.phase === "closed") return fail("هذي الغرفة انقفلت أصلاً.");

  const { data: hostPlayer } = await admin
    .from("madaqesh_players")
    .select("display_name")
    .eq("id", room.host_player_id ?? "")
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { movedTo, ...settings } = room.settings;

  let newCode = "";
  for (let attempt = 0; attempt < 8 && !newCode; attempt++) {
    const code = generateRoomCode();
    const { error } = await admin.from("madaqesh_rooms").insert({ room_code: code, host_user_id: userId, phase: "lobby", settings });
    if (!error) newCode = code;
    else if (error.code !== "23505") {
      console.error("newMadaqeshRoom error:", error);
      return fail("تعذّر إنشاء الغرفة.");
    }
  }
  if (!newCode) return fail("تعذّر توليد رمز غرفة فريد، حاول مرة أخرى.");

  const joined = await insertPlayer(admin, newCode, hostPlayer?.display_name ?? "المنشئ", 1, settings.startBalance, false);
  if ("error" in joined) return fail(joined.error);
  await admin.from("madaqesh_rooms").update({ host_player_id: joined.playerId }).eq("room_code", newCode);

  await admin
    .from("madaqesh_rooms")
    .update({ phase: "closed", phase_ends_at: null, settings: { ...room.settings, movedTo: newCode }, phase_seq: room.phase_seq + 1 })
    .eq("room_code", room.room_code);
  return { success: true, data: { roomCode: newCode, token: joined.token } };
}

export async function endMadaqeshGame(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase === "lobby" || room.phase === "ended" || room.phase === "closed") return fail("ما فيه لعبة شغالة.");
  const players = await loadPlayers(admin, room.room_code);
  const top = players.filter((p) => !p.is_out).sort((a, b) => b.balance - a.balance)[0];
  await guardedUpdate(admin, room, { phase: "ended", phase_ends_at: null, winner_id: top?.id ?? null });
  return { success: true };
}

/** لعبة جديدة بنفس اللاعبين (رجوع لغرفة الانتظار) */
export async function playMadaqeshAgain(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase === "lobby" || room.phase === "closed") return fail("الغرفة جاهزة أصلاً.");
  await admin.from("madaqesh_rounds").delete().eq("room_code", room.room_code);
  await admin
    .from("madaqesh_players")
    .update({ balance: room.settings.startBalance, bankrupts: 0, is_out: false })
    .eq("room_code", room.room_code);
  await guardedUpdate(admin, room, {
    phase: "lobby",
    phase_ends_at: null,
    round_number: 0,
    round: null,
    winner_id: null,
  });
  return { success: true };
}

/** المنشئ طالع ويقفل الغرفة */
export async function closeMadaqeshRoom(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase === "closed") return { success: true };
  await guardedUpdate(admin, room, { phase: "closed", phase_ends_at: null });
  return { success: true };
}

// ---------------------------------------------------------------------
// وضع التجربة (localhost فقط)
// ---------------------------------------------------------------------

export async function isMadaqeshDevMode(): Promise<boolean> {
  return IS_DEV;
}

export async function addMadaqeshBots(roomCode: string): Promise<ActionResult> {
  if (!IS_DEV) return fail("وضع التجربة غير متاح.");
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;
  if (room.phase !== "lobby") return fail("قبل البدء بس.");

  const players = await loadPlayers(admin, room.room_code);
  const taken = new Set(players.map((p) => p.display_name));
  let seat = await nextSeat(admin, room.room_code);
  let count = players.length;
  for (const name of MADAQESH_BOT_NAMES) {
    if (taken.has(name) || count >= 7) continue;
    await insertPlayer(admin, room.room_code, name, seat++, room.settings.startBalance, true);
    count++;
  }
  return { success: true };
}

