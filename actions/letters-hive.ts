"use server";

import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { beginGameSession, countGameSession, endGameSession, pingGameSession } from "@/lib/game-sessions";
import { LETTERS_HIVE_CONFIG, LETTERS_HIVE_GAME } from "@/constants/letters-hive";
import { HiveRevSchema, HiveRoomCodeSchema, HiveStateSchema } from "@/lib/schemas";
import { hiveScores, type HiveState } from "@/lib/game/letters-hive-engine";

// =====================================================================
// غرفة خلية الحروف الأونلاين (جدول hive_rooms، migration 0014)
//
// - كل حساب له غرفة وحدة (hive_room_hosts)، وكودها يظل نفسه ما دام تحدثت آخر 24 ساعة.
// - الكتابة كلها من هنا بمفتاح الخدمة، بعد ما نتأكد إن اللي يكتب صاحب الغرفة.
//   المتصفح يقرا بس (شاشة العرض بالكود).
// - جلسات اللعب (lib/game-sessions.ts): "ابدأ الجلسة" يحجز التجربة أو لعبة من الرصيد القديم (المشترك
//   تنحسب على طول). تنحسب مرة وحدة لما يفوز فريق بأول جولة (أو 10 دقايق والمقدم موجود)، والجولات بعدها
//   ما تنحسب. وترجع لو انتهت الجلسة قبلها. الحفظ ما يقدر يبدأ جلسة.
// - لو الجدول مو موجود أو فيه مشكلة: الغرفة ترجع null واللعبة تكمل على نفس الجهاز مثل قبل.
//
// الأخطاء اللي يفهمها الجهاز: login (مو مسجّل)، no_access (خلصت التجربة)، busy (فيه جلسة شغالة لنفس
// الحساب، مثلاً "ابدأ" الأول وصل للسيرفر ورده ما وصل)، invalid، error (مؤقت).
// =====================================================================

type Admin = ReturnType<typeof getSupabaseServiceRole>;
type Fail = { success: false; error: "login" | "no_access" | "busy" | "invalid" | "error" };
type Ok<T> = { success: true; data: T };

const fail = (error: Fail["error"]): Fail => ({ success: false, error });

type RoomRow = { room_code: string; state: unknown; rev: number | string; status: "playing" | "ended"; updated_at: string };

export type HiveRoomInfo = {
  code: string;
  state: HiveState;
  rev: number;
  /** تحدثت آخر 24 ساعة (الكود ينفع للشاشات) */
  fresh: boolean;
  /** فيه جلسة شغالة يكمل منها المقدم */
  active: boolean;
};

/**
 * جلسة اللعب مربوطة بالحساب نفسه: كل حساب له غرفة وحدة، والجلسة تمشي حتى لو الغرفة الأونلاين
 * مو متاحة (نفس الجهاز بس)
 */
const sessionRef = (userId: string) => userId;

/** نترك دقيقة احتياط عشان الغرفة ما تختفي عن الشاشات وسط الحفظ */
const FRESH_MS = LETTERS_HIVE_CONFIG.ROOM_FRESH_HOURS * 3_600_000 - 60_000;
const isFresh = (updatedAt: string) => Date.now() - new Date(updatedAt).getTime() < FRESH_MS;

function generateRoomCode(): string {
  const { ROOM_CODE_PREFIX, ROOM_CODE_LENGTH, ROOM_CODE_ALPHABET } = LETTERS_HIVE_CONFIG;
  let code = ROOM_CODE_PREFIX;
  for (let i = 1; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

async function currentUserId(): Promise<string | null> {
  const userClient = await getSupabaseServer();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  return user?.id ?? null;
}

/** غرفة الحساب. ok: false = الجدول مو موجود أو مشكلة بالقاعدة (نكمل على نفس الجهاز) */
async function loadMyRoom(admin: Admin, userId: string): Promise<{ ok: true; room: RoomRow | null } | { ok: false }> {
  const { data: host, error } = await admin.from("hive_room_hosts").select("room_code").eq("host_user_id", userId).maybeSingle();
  if (error) {
    console.error("letters-hive loadMyRoom (hosts) error:", error);
    return { ok: false };
  }
  if (!host) return { ok: true, room: null };
  const { data: room, error: roomError } = await admin
    .from("hive_rooms")
    .select("room_code, state, rev, status, updated_at")
    .eq("room_code", host.room_code)
    .maybeSingle();
  if (roomError) {
    console.error("letters-hive loadMyRoom (rooms) error:", roomError);
    return { ok: false };
  }
  return { ok: true, room: (room as RoomRow | null) ?? null };
}

/**
 * غرفة الحساب: نفس الكود لو تحدثت آخر 24 ساعة، وإلا تنشال القديمة وينعطى كود جديد.
 * overwrite = نكتب الحالة فوق الموجودة (بدء الجلسة). بدونها (فتح شاشة العرض قبل البدء) نرجّع الكود بس.
 * null = ما قدرنا (الجدول مو موجود مثلاً) — اللعبة تكمل على نفس الجهاز.
 */
async function ensureRoom(
  admin: Admin,
  userId: string,
  state: HiveState,
  overwrite: boolean,
  retried = false
): Promise<{ code: string; rev: number } | null> {
  const mine = await loadMyRoom(admin, userId);
  if (!mine.ok) return null;
  const rev = state.updatedAt;
  const status = state.status === "playing" ? "playing" : "ended";
  const room = mine.room;

  if (room && isFresh(room.updated_at)) {
    if (!overwrite) return { code: room.room_code, rev: Number(room.rev) };
    const { error } = await admin.from("hive_rooms").update({ state, rev, status }).eq("room_code", room.room_code);
    if (error) {
      console.error("letters-hive ensureRoom update error:", error);
      return null;
    }
    return { code: room.room_code, rev };
  }

  // قديمة (أكثر من 24 ساعة): تنشال وصاحبها معها، والجلسة الجاية بكود جديد
  if (room) await admin.from("hive_rooms").delete().eq("room_code", room.room_code);

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateRoomCode();
    const { error } = await admin.from("hive_rooms").insert({ room_code: code, state, rev, status });
    if (error) {
      if (error.code === "23505") continue; // الكود مأخوذ: نجرب غيره
      console.error("letters-hive ensureRoom insert error:", error);
      return null;
    }
    const { error: hostError } = await admin.from("hive_room_hosts").insert({ room_code: code, host_user_id: userId });
    if (!hostError) return { code, rev };
    await admin.from("hive_rooms").delete().eq("room_code", code);
    // جهاز ثاني لنفس الحساب سبقنا وسوّى غرفة (غرفة وحدة لكل حساب): نستخدمها
    if (hostError.code === "23505" && !retried) return ensureRoom(admin, userId, state, overwrite, true);
    console.error("letters-hive ensureRoom host error:", hostError);
    return null;
  }
  return null;
}

/**
 * أول ما تنفتح شاشة المقدم: غرفة حسابي — منها يكمل الجلسة من أي جهاز بدون ما تنحسب.
 * online: false = الغرفة الأونلاين مو متاحة الحين (نفس الجهاز بس).
 */
export async function getMyHiveRoom(): Promise<Ok<{ userId: string; online: boolean; room: HiveRoomInfo | null }> | Fail> {
  const userId = await currentUserId();
  if (!userId) return fail("login");
  const mine = await loadMyRoom(getSupabaseServiceRole(), userId);
  if (!mine.ok) return { success: true, data: { userId, online: false, room: null } };
  const row = mine.room;
  const parsed = row ? HiveStateSchema.safeParse(row.state) : null;
  if (!row || !parsed?.success) return { success: true, data: { userId, online: true, room: null } };

  const fresh = isFresh(row.updated_at);
  const state = parsed.data as HiveState;
  return {
    success: true,
    data: {
      userId,
      online: true,
      room: {
        code: row.room_code,
        state,
        rev: Number(row.rev),
        fresh,
        active: fresh && row.status === "playing" && state.status === "playing",
      },
    },
  };
}

/** فتح شاشة العرض قبل البدء: يجهّز الغرفة (أو يرجّع كودها) بدون ما ينحسب شي */
export async function openHiveRoom(input: { state: HiveState }): Promise<Ok<{ roomCode: string | null; rev: number }> | Fail> {
  const parsed = HiveStateSchema.safeParse(input?.state);
  // قبل البدء بس: الجلسة ما تبدأ إلا من "ابدأ الجلسة"
  if (!parsed.success || parsed.data.status !== "setup") return fail("invalid");
  const userId = await currentUserId();
  if (!userId) return fail("login");
  const room = await ensureRoom(getSupabaseServiceRole(), userId, parsed.data as HiveState, false);
  return { success: true, data: { roomCode: room?.code ?? null, rev: room?.rev ?? 0 } };
}

/**
 * "ابدأ الجلسة": هنا بس تنحجز اللعبة، مرة وحدة لكل جلسة (نفس قواعد gameAccess).
 * جولة جديدة، وتحديث الصفحة، والرجوع من جهاز ثاني ما تنحجز من جديد.
 * roomCode: null = الغرفة الأونلاين ما تجهزت، واللعبة تبدأ على نفس الجهاز (والحجز صار).
 */
export async function startHiveRoom(input: { state: HiveState }): Promise<Ok<{ roomCode: string | null; rev: number }> | Fail> {
  const parsed = HiveStateSchema.safeParse(input?.state);
  if (!parsed.success) return fail("invalid");
  const s = parsed.data as HiveState;
  const fresh = s.status === "playing" && s.round === 1 && s.history.length === 0 && s.wins.green === 0 && s.wins.red === 0;
  if (!fresh || s.owners.some((o) => o !== null)) return fail("invalid");

  const userId = await currentUserId();
  if (!userId) return fail("login");

  // الحجز قبل ما تنكتب الجلسة بالغرفة. لو ما انحجزت، الجلسة ما تبدأ
  const admin = getSupabaseServiceRole();
  const session = await beginGameSession(admin, userId, LETTERS_HIVE_GAME.id, sessionRef(userId));
  if (!session.ok) return fail(session.reason === "no_access" ? "no_access" : session.reason === "busy" ? "busy" : "error");

  const room = await ensureRoom(admin, userId, s, true);
  return { success: true, data: { roomCode: room?.code ?? null, rev: room?.rev ?? s.updatedAt } };
}

/**
 * صفحة المقدم مفتوحة والجلسة شغالة (ترسل كل دقيقة): منها يفرّق السيرفر بين مقدم موجود
 * (بعد 10 دقايق تنحسب) ومقدم طلع (ترجع تجربته لو بدأ جلسة ثانية بعد 3 دقايق).
 */
export async function pingHiveSession(): Promise<Ok<null> | Fail> {
  const userId = await currentUserId();
  if (!userId) return fail("login");
  await pingGameSession(getSupabaseServiceRole(), userId, LETTERS_HIVE_GAME.id, sessionRef(userId));
  return { success: true, data: null };
}

/**
 * حفظ اللوحة بعد كل حركة (والإنهاء). اللي يحفظ لازم يكون صاحب الغرفة.
 * - saved: انحفظت، والشاشات بتتحدث
 * - older: فيه نسخة أحدث من جهاز ثاني (الجهاز يرجع ياخذ اللي بالسيرفر)
 * - ended: الجلسة انتهت (أو ما بدأت) — اللعب ما يبدأ إلا من "ابدأ الجلسة"
 * - gone: الغرفة مو موجودة أو مو لهالحساب (نكمل على نفس الجهاز)
 */
export async function saveHiveRoom(input: {
  roomCode: string;
  state: HiveState;
  rev: number;
}): Promise<Ok<{ result: "saved" | "older" | "ended" | "gone" }> | Fail> {
  const code = HiveRoomCodeSchema.safeParse(input?.roomCode);
  const state = HiveStateSchema.safeParse(input?.state);
  const rev = HiveRevSchema.safeParse(input?.rev);
  if (!code.success || !state.success || !rev.success) return fail("invalid");

  // التأكد من الدخول وقراءة صاحب الغرفة مع بعض (أسرع)، وبعدها نقارن — ما ينحفظ شي قبل ما يتأكد الاثنين
  const admin = getSupabaseServiceRole();
  const [userId, { data: host, error: hostError }] = await Promise.all([
    currentUserId(),
    admin.from("hive_room_hosts").select("host_user_id").eq("room_code", code.data).maybeSingle(),
  ]);
  if (!userId) return fail("login");
  if (hostError) {
    console.error("letters-hive saveHiveRoom host error:", hostError);
    return fail("error");
  }
  if (!host || host.host_user_id !== userId) return { success: true, data: { result: "gone" } };

  const playing = state.data.status === "playing";
  let query = admin
    .from("hive_rooms")
    .update({ state: state.data, rev: rev.data, status: playing ? "playing" : "ended" })
    .eq("room_code", code.data)
    .lt("rev", rev.data);
  // اللعب يكمل جلسة شغالة بس — ما يقدر يبدأ جلسة بدون ما تنحسب
  if (playing) query = query.eq("status", "playing");
  const { data, error } = await query.select("rev");
  if (error) {
    console.error("letters-hive saveHiveRoom update error:", error);
    return fail("error");
  }
  if (data && data.length > 0) {
    // جلسات اللعب (بعد ما تأكدنا إنها انحفظت وإن اللي حفظ صاحب الغرفة):
    // فاز فريق بجولة = الجلسة تنحسب (مرة وحدة، والجولات بعدها ما تنحسب). انتهت قبلها = ترجع
    if (!playing) {
      await endGameSession(admin, LETTERS_HIVE_GAME.id, sessionRef(userId));
    } else {
      const scores = hiveScores(state.data as HiveState);
      if (scores.green + scores.red > 0) await countGameSession(admin, LETTERS_HIVE_GAME.id, sessionRef(userId));
    }
    return { success: true, data: { result: "saved" } };
  }

  const { data: row } = await admin.from("hive_rooms").select("status").eq("room_code", code.data).maybeSingle();
  if (!row) return { success: true, data: { result: "gone" } };
  if (playing && row.status !== "playing") return { success: true, data: { result: "ended" } };
  return { success: true, data: { result: "older" } };
}
