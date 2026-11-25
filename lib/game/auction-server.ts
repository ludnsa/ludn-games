import { createHmac, timingSafeEqual } from "node:crypto";
import { getSupabaseServiceRole } from "@/lib/supabase/server";

/**
 * كتابة غرف المزاد (auction_rooms) من السيرفر بس — app/api/auction/[op]/route.ts.
 *
 * المتصفح يقرا الغرفة مثل قبل (البث اللحظي والقراءة الاحتياطية والمؤقتات ما تغيّرت)، بس ما يكتب فيها أبد:
 * كل كتابة تمر من هنا بمفتاح الخدمة، بعد ما نتأكد مين يكتب ووش يكتب.
 *
 *  - الحكم: مسجّل دخول، ولازم يكون صاحب الغرفة (created_by أو player1_id أو player2_id) — نفس اللي له
 *    الغرفة اليوم. يكتب الأعمدة اللي يكتبها الكود بس، وكل قيمة بنوعها وحدودها. الحكم هو اللي يمشي اللعبة
 *    (القوانين بجهازه مثل قبل)، فالسيرفر ما يعيد حساب القوانين: يتحقق من الأعمدة والقيم بس.
 *  - جوال الفريق: بدون تسجيل مثل قبل. لما يحجز الفريق ياخذ token مربوط بالغرفة والفريق والجهاز
 *    (HMAC بمفتاح السيرفر، ما ينحفظ بالغرفة). كل مزايدة معها الـ token، والسيرفر يتأكد إن الجهاز للحين
 *    ماسك الفريق، وإن المرحلة مزايدة، وإن المبلغ بنفس شروط الجوال، ويكتب عمود مزايدة فريقه بس.
 *
 * كل كتابة جملة update وحدة على الغرفة (atomic)، تلمس الأعمدة اللي انطلبت بس.
 */

type Admin = ReturnType<typeof getSupabaseServiceRole>;
export type AuctionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string; code?: AuctionErrorCode };
/** للجوال: lost = ما عاد ماسك الفريق (يطلع لشاشة الدخول)، closed = المزايدة انقفلت */
export type AuctionErrorCode = "bad" | "auth" | "no_room" | "over" | "full" | "lost" | "closed" | "busy";

const fail = (error: string, code: AuctionErrorCode = "bad"): AuctionResult<never> => ({ success: false, error, code });

const ROOM_CODE_RE = /^A[A-Z0-9]{4}$/;
const DEVICE_RE = /^[a-z0-9]{6,64}$/i;

const MSG = {
  bad: "بيانات غير صحيحة.",
  noRoom: "رمز الغرفة غير صحيح أو اللعبة غير موجودة.",
  over: "هذه الجلسة قديمة وانتهت! الرجاء مسح الباركود الجديد من شاشة الحكم.",
  full: "عذراً، هذا الفريق ممتلئ! لقد دخل قائد آخر مسبقاً.",
  lost: "عذراً! لقد تم تسجيل دخول قائد آخر لهذا الفريق وتم سحب الصلاحية منك.",
  closed: "المزايدة انقفلت عند الحكم.",
  login: "يجب تسجيل الدخول لإنشاء الغرفة.",
  notReferee: "هذي الغرفة لحكم ثاني.",
  save: "تعذّر الحفظ، حاول مرة ثانية.",
};

// ---------------------------------------------------------------------
// token جوال الفريق
// ---------------------------------------------------------------------

/** مفتاح الـ token مشتق من مفتاح الخدمة (موجود بالسيرفر بس)، بغرض خاص فيه */
function tokenKey(): Buffer {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  return createHmac("sha256", k).update("ludn:auction-team-token:v1").digest();
}

export function auctionTeamToken(roomCode: string, team: 1 | 2, deviceId: string): string {
  return createHmac("sha256", tokenKey()).update(`${roomCode}|${team}|${deviceId}`).digest("base64url");
}

function tokenMatches(token: unknown, roomCode: string, team: 1 | 2, deviceId: string): boolean {
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return false;
  const want = Buffer.from(auctionTeamToken(roomCode, team, deviceId));
  const got = Buffer.from(token);
  return got.length === want.length && timingSafeEqual(got, want);
}

// ---------------------------------------------------------------------
// الحكم: الأعمدة المسموحة وقيمها
// ---------------------------------------------------------------------

const GAME_STATES = [
  "setup", "bidding", "preRisk", "questionReveal", "optionsDecision", "buyOffer", "options", "rewardChoice", "result", "gameOver",
] as const;
const PLAY_MODES = ["no_options", "options_normal", "options_ambush", "with_options"] as const;

type Check = (v: unknown) => boolean;
const int = (min: number, max: number): Check => (v) => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const nullable = (c: Check): Check => (v) => v === null || c(v);
const bool: Check = (v) => typeof v === "boolean";
const oneOf = (...xs: readonly unknown[]): Check => (v) => xs.includes(v);
const text = (max: number): Check => (v) => typeof v === "string" && v.length <= max;
/** وقت انتهاء المؤقت: تاريخ صحيح وقريب من الحين (مو بعد سنة) */
const nearIso: Check = (v) => {
  if (typeof v !== "string" || v.length > 40) return false;
  const t = Date.parse(v);
  return Number.isFinite(t) && Math.abs(t - Date.now()) <= 24 * 3600e3;
};
/** أسئلة الجولة (من بنك الأسئلة عند الحكم): قائمة كائنات، بحجم معقول */
const questionList: Check = (v) =>
  Array.isArray(v) &&
  v.length <= 300 &&
  v.every((q) => q !== null && typeof q === "object" && !Array.isArray(q)) &&
  JSON.stringify(v).length <= 1_000_000;
const MONEY = int(0, 1_000_000_000);
const COUNT = int(0, 10);

/** كل عمود يكتبه الحكم اليوم (hooks/games/auction/useAuctionReferee.ts وشاشة الخيارات) ونوع قيمته */
const REFEREE_COLUMNS: Record<string, Check> = {
  game_state: oneOf(...GAME_STATES),
  t1_name: text(200),
  t2_name: text(200),
  t1_balance: MONEY,
  t2_balance: MONEY,
  t1_points: int(0, 1_000_000),
  t2_points: int(0, 1_000_000),
  t1_ambush: COUNT,
  t2_ambush: COUNT,
  t1_sell_cards: COUNT,
  t2_sell_cards: COUNT,
  is_sudden_death: bool,
  is_double_risk: bool,
  is_question_visible: bool,
  is_timer_running: bool,
  current_index: int(0, 1000),
  turn: oneOf(1, 2),
  winner: oneOf(1, 2, null),
  buyer: oneOf(1, 2, null),
  play_mode: oneOf(null, ...PLAY_MODES),
  timer: int(0, 3600),
  timer_ends_at: nullable(nearIso),
  t1_bid: nullable(MONEY),
  t2_bid: nullable(MONEY),
  selected_option: nullable(text(2000)),
  questions: questionList,
  // الحكم يفك جهاز الفريق بس (يصفّره)، ما يحط جهاز
  t1_device_id: (v) => v === null,
  t2_device_id: (v) => v === null,
};

function cleanPatch(patch: unknown): Record<string, unknown> | null {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return null;
  const entries = Object.entries(patch as Record<string, unknown>);
  if (entries.length === 0 || entries.length > Object.keys(REFEREE_COLUMNS).length) return null;
  for (const [k, v] of entries) {
    const check = REFEREE_COLUMNS[k];
    if (!check || !check(v)) return null;
  }
  return Object.fromEntries(entries);
}

async function loadOwnedRoom(admin: Admin, roomCode: string, userId: string): Promise<AuctionResult> {
  const { data, error } = await admin
    .from("auction_rooms")
    .select("created_by, player1_id, player2_id")
    .eq("room_code", roomCode)
    .maybeSingle();
  if (error) return fail(MSG.save, "busy");
  if (!data) return fail(MSG.noRoom, "no_room");
  const owners = [data.created_by, data.player1_id, data.player2_id];
  if (!owners.includes(userId)) return fail(MSG.notReferee, "auth");
  return { success: true };
}

/** الحكم ينشئ غرفة جديدة (إعداد الفريقين والرصيد). الرمز من السيرفر، وما يكتب فوق غرفة موجودة */
export async function createAuctionRoom(
  userId: string | null,
  input: { t1Name?: unknown; t2Name?: unknown; startBalance?: unknown }
): Promise<AuctionResult<{ roomCode: string }>> {
  if (!userId) return fail(MSG.login, "auth");
  if (!text(200)(input.t1Name) || !text(200)(input.t2Name) || !MONEY(input.startBalance)) return fail(MSG.bad);
  const admin = getSupabaseServiceRole();
  for (let i = 0; i < 8; i++) {
    const roomCode = "A" + Array.from({ length: 4 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)]).join("");
    const { error } = await admin.from("auction_rooms").insert({
      room_code: roomCode,
      game_state: "setup",
      t1_name: input.t1Name,
      t2_name: input.t2Name,
      t1_balance: input.startBalance,
      t2_balance: input.startBalance,
      created_by: userId,
    });
    if (!error) return { success: true, data: { roomCode } };
    if (error.code !== "23505") {
      console.error("auction create error:", error);
      return fail(MSG.save, "busy");
    }
  }
  return fail(MSG.save, "busy");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * الحكم يكتب أعمدة بغرفته: جملة update وحدة، فيها شرط إن الحساب صاحب الغرفة (التحقق والكتابة مع بعض،
 * بطلب واحد للقاعدة). لو ما انكتب ولا صف نعرف السبب (الغرفة مو موجودة أو مو له)
 */
export async function refereeWrite(
  userId: string | null,
  input: { roomCode?: unknown; patch?: unknown }
): Promise<AuctionResult> {
  if (!userId || !UUID_RE.test(userId)) return fail(MSG.login, "auth");
  if (typeof input.roomCode !== "string" || !ROOM_CODE_RE.test(input.roomCode)) return fail(MSG.bad);
  const patch = cleanPatch(input.patch);
  if (!patch) return fail(MSG.bad);
  const roomCode = input.roomCode;
  const admin = getSupabaseServiceRole();
  const ownerFilter = `created_by.eq.${userId},player1_id.eq.${userId},player2_id.eq.${userId}`;
  const write = (p: Record<string, unknown>) =>
    admin.from("auction_rooms").update(p).eq("room_code", roomCode).or(ownerFilter).select("room_code");

  let { data, error } = await write(patch);
  if (error && "timer_ends_at" in patch && error.message.includes("timer_ends_at")) {
    // ملف القاعدة 0017 ما انشغّل (العمود مو موجود): نكتب بدونه عشان المؤقت والحالة ما يتعطلون (مثل قبل)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { timer_ends_at, ...withoutEnd } = patch;
    if (Object.keys(withoutEnd).length === 0) return { success: true };
    ({ data, error } = await write(withoutEnd));
  }
  if (error) {
    console.error("auction referee write error:", error);
    return fail(MSG.save, "busy");
  }
  if (!data || data.length === 0) {
    const owned = await loadOwnedRoom(admin, roomCode, userId);
    return owned.success ? fail(MSG.save, "busy") : owned;
  }
  return { success: true };
}

// ---------------------------------------------------------------------
// جوال الفريق
// ---------------------------------------------------------------------

function teamInput(input: { roomCode?: unknown; team?: unknown; deviceId?: unknown }) {
  const { roomCode, team, deviceId } = input;
  if (typeof roomCode !== "string" || !ROOM_CODE_RE.test(roomCode)) return null;
  if (team !== 1 && team !== 2) return null;
  if (typeof deviceId !== "string" || !DEVICE_RE.test(deviceId)) return null;
  return { roomCode, team: team as 1 | 2, deviceId };
}

/**
 * الجوال يحجز الفريق (نفس طريقة الدخول): لو الفريق فاضي ياخذه (مقارنة وتبديل بجملة وحدة)،
 * ولو هو أصلاً ماسكه (حدّث الصفحة) لازم يرجّع الـ token اللي معه — رقم الجهاز مكتوب بالغرفة واللي يقراها يشوفه،
 * فرقم الجهاز لحاله ما يكفي.
 */
export async function teamJoin(input: {
  roomCode?: unknown;
  team?: unknown;
  deviceId?: unknown;
  token?: unknown;
}): Promise<AuctionResult<{ token: string }>> {
  const t = teamInput(input);
  if (!t) return fail(MSG.bad);
  const col = t.team === 1 ? "t1_device_id" : "t2_device_id";
  const admin = getSupabaseServiceRole();
  const { data: room, error } = await admin
    .from("auction_rooms")
    .select(`${col}, game_state`)
    .eq("room_code", t.roomCode)
    .maybeSingle();
  if (error) return fail(MSG.save, "busy");
  if (!room) return fail(MSG.noRoom, "no_room");
  const row = room as Record<string, unknown>;
  if (row.game_state === "gameOver") return fail(MSG.over, "over");

  if (row[col] === t.deviceId) {
    if (tokenMatches(input.token, t.roomCode, t.team, t.deviceId)) return { success: true, data: { token: input.token as string } };
    return fail(MSG.full, "full");
  }

  const { data: claimed, error: claimError } = await admin
    .from("auction_rooms")
    .update({ [col]: t.deviceId })
    .eq("room_code", t.roomCode)
    .is(col, null)
    .neq("game_state", "gameOver")
    .select("room_code");
  if (claimError) return fail(MSG.save, "busy");
  if (!claimed || claimed.length === 0) return fail(MSG.full, "full");
  return { success: true, data: { token: auctionTeamToken(t.roomCode, t.team, t.deviceId) } };
}

/** أقل مزايدة: نفس حساب الجوال والحكم بالضبط (1000، أو لو رصيد الخصم خلص: رصيدي على الأسئلة الباقية) */
function minBid(myBalance: number, oppBalance: number, remainingQs: number): number {
  if (oppBalance <= 0 && remainingQs > 0) {
    const calculated = Math.floor(myBalance / remainingQs);
    return Math.max(100, Math.floor(calculated / 100) * 100);
  }
  return 1000;
}

/** مزايدة الجوال: عمود مزايدة فريقه بس، ووقت المزايدة بس، وهو للحين ماسك الفريق */
export async function teamBid(input: {
  roomCode?: unknown;
  team?: unknown;
  deviceId?: unknown;
  token?: unknown;
  bid?: unknown;
}): Promise<AuctionResult> {
  const t = teamInput(input);
  if (!t || !MONEY(input.bid)) return fail(MSG.bad);
  if (!tokenMatches(input.token, t.roomCode, t.team, t.deviceId)) return fail(MSG.lost, "lost");
  const bid = input.bid as number;
  const deviceCol = t.team === 1 ? "t1_device_id" : "t2_device_id";
  const bidCol = t.team === 1 ? "t1_bid" : "t2_bid";

  const admin = getSupabaseServiceRole();
  const { data: room, error } = await admin
    .from("auction_rooms")
    .select(`${deviceCol}, game_state, t1_balance, t2_balance, questions, current_index`)
    .eq("room_code", t.roomCode)
    .maybeSingle();
  if (error) return fail(MSG.save, "busy");
  if (!room) return fail(MSG.noRoom, "no_room");
  const row = room as Record<string, unknown>;
  if (row[deviceCol] !== t.deviceId) return fail(MSG.lost, "lost");
  if (row.game_state !== "bidding") return fail(MSG.closed, "closed");

  // نفس شروط الجوال (useAuctionTeam.handleSendBid)
  const myBalance = Number((t.team === 1 ? row.t1_balance : row.t2_balance) ?? 0);
  const oppBalance = Number((t.team === 1 ? row.t2_balance : row.t1_balance) ?? 0);
  const total = Array.isArray(row.questions) ? row.questions.length : 0;
  const remainingQs = total - Number(row.current_index ?? 0);
  if (bid <= 0) return fail("الرجاء إدخال مبلغ مزايدة صحيح.");
  if (bid % 100 !== 0) return fail("يجب أن تكون المزايدة من مضاعفات 100.");
  const min = minBid(myBalance, oppBalance, remainingQs);
  if (bid < min) return fail(`عفواً، أقل مبلغ مسموح للمزايدة هو ${min} 💰`);
  if (bid > myBalance) return fail("لا يمكنك المزايدة بأكثر من رصيدك الحالي.");

  // جملة وحدة: عمود فريقه بس، وبشرط إنه للحين ماسك الفريق والمرحلة مزايدة
  const { data: saved, error: saveError } = await admin
    .from("auction_rooms")
    .update({ [bidCol]: bid })
    .eq("room_code", t.roomCode)
    .eq(deviceCol, t.deviceId)
    .eq("game_state", "bidding")
    .select("room_code");
  if (saveError) return fail(MSG.save, "busy");
  if (!saved || saved.length === 0) {
    // تغيّر شي بين القراءة والكتابة: مين ماسك الفريق، أو المرحلة
    const { data: now } = await admin.from("auction_rooms").select(`${deviceCol}, game_state`).eq("room_code", t.roomCode).maybeSingle();
    const r = (now ?? {}) as Record<string, unknown>;
    if (r[deviceCol] !== t.deviceId) return fail(MSG.lost, "lost");
    return fail(MSG.closed, "closed");
  }
  return { success: true };
}
