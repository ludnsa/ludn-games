import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { getSupabaseServiceRole } from "@/lib/supabase/server";

/**
 * كتابة غرف حرب القلاع من السيرفر بس — app/api/castle/[op]/route.ts.
 *
 * المتصفح يقرا الغرفة (cw_rooms) مثل قبل: البث اللحظي والقراءة الاحتياطية والمؤقتات ما تغيّرت. بس:
 *  - خطط الفرق (توزيع الجنود والقائد والفخ) والتوقعات قبل كشفها ما تنحفظ بالغرفة أبد. تنحفظ بجدول
 *    cw_room_secrets (ملف 0022)، ما يقراه إلا السيرفر بمفتاح الخدمة.
 *  - live_sync اللي يوصل للشاشة والجوالات (والمضيف) يكتبه السيرفر "منظّف": من كل خطة النوافذ المكشوفة بس،
 *    والتوقعات فاضية لين تنكشف، وجواب السؤال العام لين ينكشف.
 *  - المضيف ما عنده الخطط: لما يهاجم نافذة يسأل السيرفر (ref-attack)، والسيرفر يرد بمحتوى هذي النافذة بس
 *    ويسجّل إنها انكشفت. والجاسوس يختار نافذته السيرفر (نفس القاعدة: أكثر جنود من المخفية). والأسر يوزّع
 *    الأسرى على النوافذ المخفية بالسيرفر.
 *
 *  - المضيف: مسجّل دخول، وصاحب الغرفة (created_by — السيرفر يحطه وقت الإنشاء). قوانين اللعبة عنده مثل قبل
 *    (الدور والتحديات والنقاط)، والسيرفر يتحقق من شكل الحالة وقيمها بس، وما يعيد حساب القوانين.
 *  - جوال الفريق: بدون تسجيل مثل قبل. لما يختار فريقه ياخذ token مربوط بالغرفة والفريق والجهاز
 *    (HMAC بمفتاح مشتق من مفتاح الخدمة، ما ينحفظ بالغرفة). الخطة تنقبل بس من الجهاز الماسك الفريق.
 *
 * فحص الاشتراك (لما نسويه من السيرفر): مكانه createCastleRoom تحت، قبل إنشاء الغرفة — userId موجود هناك.
 */

type Admin = ReturnType<typeof getSupabaseServiceRole>;
export type CastleErrorCode = "bad" | "auth" | "no_room" | "full" | "lost" | "closed" | "busy";
export type CastleResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string; code?: CastleErrorCode };

const fail = (error: string, code: CastleErrorCode = "bad"): CastleResult<never> => ({ success: false, error, code });

export const ROOMS_COUNT = 15;
export const TOTAL_SOLDIERS = 120;
const ROOM_CODE_RE = /^C[A-Z0-9]{4}$/;
const DEVICE_RE = /^[a-z0-9]{6,64}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** نفس حروف الكود القديمة (بدون O و I و 0 و 1). الكود: C + 4 حروف عشوائية = مليون كود (قبل: CC + 3 = 32768) */
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const MSG = {
  bad: "بيانات غير صحيحة.",
  noRoom: "الكود غير صحيح أو الغرفة غير موجودة!",
  login: "يجب تسجيل الدخول لبدء اللعبة.",
  notHost: "هذي الغرفة لمضيف ثاني.",
  full: "هذا الفريق اختاره جوال ثاني، اختر الفريق الثاني.",
  lost: "ما عاد هذا الجوال ماسك الفريق (المضيف صفّر اللعبة أو دخل جوال ثاني). اختر فريقك من جديد.",
  closed: "بدأت الحرب، ما تقدر تغيّر الخطة الحين.",
  noPlan: "خطة الفريق ما وصلت. صفّر اللعبة ووزّعوا الجنود من جديد.",
  save: "تعذّر الحفظ، حاول مرة ثانية.",
};

// ---------------------------------------------------------------------
// token جوال الفريق
// ---------------------------------------------------------------------

function tokenKey(): Buffer {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  return createHmac("sha256", k).update("ludn:castle-team-token:v1").digest();
}

export function castleTeamToken(roomCode: string, team: 1 | 2, deviceId: string): string {
  return createHmac("sha256", tokenKey()).update(`${roomCode}|${team}|${deviceId}`).digest("base64url");
}

function tokenMatches(token: unknown, roomCode: string, team: 1 | 2, deviceId: string): boolean {
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return false;
  const want = Buffer.from(castleTeamToken(roomCode, team, deviceId));
  const got = Buffer.from(token);
  return got.length === want.length && timingSafeEqual(got, want);
}

// ---------------------------------------------------------------------
// الخطط والأسرار
// ---------------------------------------------------------------------

export type Plan = { rooms: number[]; commanderRoom: number; trapRoom: number };
type Secrets = {
  owner_id: string | null;
  team1_plan: Plan | null;
  team2_plan: Plan | null;
  team1_device: string | null;
  team2_device: string | null;
  revealed1: boolean[] | null;
  revealed2: boolean[] | null;
  guesses: { guessT1?: string; guessT2?: string } | null;
};
const SECRET_COLS = "owner_id, team1_plan, team2_plan, team1_device, team2_device, revealed1, revealed2, guesses";
const emptyRevealed = () => Array<boolean>(ROOMS_COUNT).fill(false);
const revealedOf = (s: Secrets, team: 1 | 2) => {
  const r = team === 1 ? s.revealed1 : s.revealed2;
  return Array.isArray(r) && r.length === ROOMS_COUNT ? r : emptyRevealed();
};
const planOf = (s: Secrets, team: 1 | 2) => (team === 1 ? s.team1_plan : s.team2_plan);

/** خطة الجوال: 15 نافذة أعداد صحيحة مجموعها 120، والقائد والفخ نافذتين مختلفتين فاضيتين (نفس شروط صفحة التوزيع) */
function cleanPlan(p: unknown): Plan | null {
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  const { rooms, commanderRoom, trapRoom } = p as Record<string, unknown>;
  if (!Array.isArray(rooms) || rooms.length !== ROOMS_COUNT) return null;
  if (!rooms.every((n) => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= TOTAL_SOLDIERS)) return null;
  const nums = rooms as number[];
  if (nums.reduce((a, b) => a + b, 0) !== TOTAL_SOLDIERS) return null;
  const isRoom = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v < ROOMS_COUNT;
  if (!isRoom(commanderRoom) || !isRoom(trapRoom) || commanderRoom === trapRoom) return null;
  if (nums[commanderRoom] !== 0 || nums[trapRoom] !== 0) return null;
  return { rooms: [...nums], commanderRoom, trapRoom };
}

/** نوافذ تستقبل الأسرى: مخفية، ومو نافذة القائد ولا الفخ (نفس captureRoomsOf القديمة عند المضيف) */
const captureRoomsOf = (plan: Plan, revealed: boolean[]) =>
  Array.from({ length: ROOMS_COUNT }, (_, i) => i).filter((i) => !revealed[i] && i !== plan.commanderRoom && i !== plan.trapRoom);

/** أكثر شي تقدر الضربات تنقصه: جنود النوافذ المخفية (الفخ ما ينقص صاحبه)، والقائد المخفي +30 (نفس reachableDamageOf القديمة) */
function reachableDamageOf(plan: Plan, revealed: boolean[]): number {
  let total = 0;
  for (let i = 0; i < ROOMS_COUNT; i++) {
    if (revealed[i] || i === plan.trapRoom) continue;
    total += (plan.rooms[i] || 0) + (i === plan.commanderRoom ? 30 : 0);
  }
  return total;
}

/** اللي يحتاجه المضيف بدون الخطة: هل بقى شي تقدر الضربات تنقصه، وهل فيه نافذة تستقبل أسرى، ومجموع الجنود (120 + الأسرى) */
export type TeamStatus = { reachable: boolean; capture: boolean; total: number };
export type CastleStatus = { 1: TeamStatus; 2: TeamStatus };
function statusOf(s: Secrets): CastleStatus {
  const one = (team: 1 | 2): TeamStatus => {
    const plan = planOf(s, team);
    if (!plan) return { reachable: true, capture: false, total: TOTAL_SOLDIERS };
    const rev = revealedOf(s, team);
    return {
      reachable: reachableDamageOf(plan, rev) > 0,
      capture: captureRoomsOf(plan, rev).length > 0,
      total: plan.rooms.reduce((a, b) => a + b, 0),
    };
  };
  return { 1: one(1), 2: one(2) };
}

/** خطة الفريق للشاشة والجوالات: النوافذ اللي انكشفت بس (عند المضيف وبسجل السيرفر)، والباقي صفر */
function publicTeam(plan: Plan | null, hostRevealed: unknown, serverRevealed: boolean[], name: unknown) {
  if (!plan) return null;
  const shown = Array.isArray(hostRevealed) ? hostRevealed : [];
  const rooms = Array<number>(ROOMS_COUNT).fill(0);
  let commanderRoom: number | null = null;
  let trapRoom: number | null = null;
  for (let i = 0; i < ROOMS_COUNT; i++) {
    if (shown[i] !== true || !serverRevealed[i]) continue;
    rooms[i] = plan.rooms[i];
    if (plan.commanderRoom === i) commanderRoom = i;
    if (plan.trapRoom === i) trapRoom = i;
  }
  return { name: typeof name === "string" ? name : undefined, rooms, commanderRoom, trapRoom, total: plan.rooms.reduce((a, b) => a + b, 0) };
}

async function loadSecrets(admin: Admin, roomCode: string): Promise<Secrets | CastleResult<never>> {
  const { data, error } = await admin.from("cw_room_secrets").select(SECRET_COLS).eq("room_code", roomCode).maybeSingle();
  if (error) {
    console.error("castle secrets read error:", error);
    return fail(MSG.save, "busy");
  }
  if (!data) return fail(MSG.noRoom, "no_room");
  return data as unknown as Secrets;
}
const isFail = (x: unknown): x is CastleResult<never> => !!x && typeof x === "object" && "success" in x;

/** المضيف: حسابه صاحب الغرفة */
async function hostSecrets(userId: string | null, roomCode: unknown): Promise<{ admin: Admin; s: Secrets; roomCode: string } | CastleResult<never>> {
  if (!userId || !UUID_RE.test(userId)) return fail(MSG.login, "auth");
  if (typeof roomCode !== "string" || !ROOM_CODE_RE.test(roomCode)) return fail(MSG.bad);
  const admin = getSupabaseServiceRole();
  const s = await loadSecrets(admin, roomCode);
  if (isFail(s)) return s;
  if (s.owner_id !== userId) return fail(MSG.notHost, "auth");
  return { admin, s, roomCode };
}

const newRev = () => randomBytes(6).toString("base64url");

// ---------------------------------------------------------------------
// المضيف
// ---------------------------------------------------------------------

/** إنشاء الغرفة (زر "إنشاء الغرفة"). الكود من السيرفر، وما يكتب فوق غرفة موجودة */
export async function createCastleRoom(
  userId: string | null,
  input: { team1Name?: unknown; team2Name?: unknown }
): Promise<CastleResult<{ roomCode: string }>> {
  if (!userId || !UUID_RE.test(userId)) return fail(MSG.login, "auth");
  if (!text(200)(input.team1Name) || !text(200)(input.team2Name)) return fail(MSG.bad);
  // فحص الاشتراك من السيرفر (لما ننفذه) يجي هنا، قبل الإدخال
  const admin = getSupabaseServiceRole();
  for (let i = 0; i < 8; i++) {
    const roomCode = "C" + Array.from({ length: 4 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");
    const { error } = await admin.from("cw_rooms").insert({
      room_code: roomCode,
      live_sync: { team1Name: input.team1Name, team2Name: input.team2Name, rev: newRev() },
      created_by: userId,
    });
    if (error) {
      if (error.code === "23505") continue; // الكود مستخدم: نجرب غيره
      console.error("castle create error:", error);
      return fail(MSG.save, "busy");
    }
    const { error: secretError } = await admin.from("cw_room_secrets").insert({
      room_code: roomCode,
      owner_id: userId,
      revealed1: emptyRevealed(),
      revealed2: emptyRevealed(),
    });
    if (secretError) {
      console.error("castle secrets create error:", secretError);
      await admin.from("cw_rooms").delete().eq("room_code", roomCode);
      return fail(MSG.save, "busy");
    }
    return { success: true, data: { roomCode } };
  }
  return fail(MSG.save, "busy");
}

type Check = (v: unknown) => boolean;
const int = (min: number, max: number): Check => (v) => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const num: Check = (v) => typeof v === "number" && Number.isFinite(v);
const nullable = (c: Check): Check => (v) => v === null || c(v);
const bool: Check = (v) => typeof v === "boolean";
const oneOf = (...xs: readonly unknown[]): Check => (v) => xs.includes(v);
const text = (max: number): Check => (v) => typeof v === "string" && v.length <= max;
const ROOM = int(0, ROOMS_COUNT - 1);
const CHALLENGES = ["30sec", "5sec", "general", "team", "guess"] as const;
const boolList: Check = (v) => Array.isArray(v) && v.length === ROOMS_COUNT && v.every((x) => typeof x === "boolean");
const usedList: Check = (v) => Array.isArray(v) && v.length <= 10 && v.every((x) => CHALLENGES.includes(x));
/** وقت انتهاء المؤقت (ملي ثانية): قريب من الحين */
const nearMs: Check = (v) => num(v) && Math.abs((v as number) - Date.now()) <= 24 * 3600e3;
/** التحدي الحالي: نص (موضوع)، أو سؤال عام { q, options, a } */
const challengeData: Check = (v) => {
  if (v === null) return true;
  if (typeof v === "string") return v.length <= 2000;
  if (typeof v !== "object" || Array.isArray(v)) return false;
  return JSON.stringify(v).length <= 8000;
};

/** حالة المضيف (live_sync) — نفس الحقول اللي يكتبها hooks/useCastleWar.ts، وكل وحدة بنوعها */
const LIVE_FIELDS: Record<string, Check> = {
  gameState: oneOf("lobby", "playing", "gameOver"),
  hp1: int(0, 100_000),
  hp2: int(0, 100_000),
  revealed1: boolList,
  revealed2: boolList,
  attackingTeam: oneOf(1, 2),
  turn: oneOf(1, 2),
  spiedTarget1: nullable(ROOM),
  spiedTarget2: nullable(ROOM),
  team1Name: text(200),
  team2Name: text(200),
  battleStep: oneOf("roll", "challenge", "target", "trapChoice", "result"),
  activeChallengeName: text(100),
  activeChallengeType: oneOf("", ...CHALLENGES),
  activeChallengeData: challengeData,
  isChallengeRevealed: bool,
  genTimer: int(0, 3600),
  resultType: oneOf("hit", "miss", "trap", "commander", "idle", "spy", "team1Win", "team2Win", "draw"),
  resultMsg: text(500),
  explosionRoomIndexHit: nullable(ROOM),
  targetRoomIndex: nullable(ROOM),
  usedChallengesT1: usedList,
  usedChallengesT2: usedList,
  timerStarted: bool,
  timestamp: num,
  showGenAnswer: bool,
  guessesRevealed: bool,
  guessT1: text(30),
  guessT2: text(30),
  targetEndTime: nullable(nearMs),
  selectedOption: nullable(text(1000)),
};

function cleanLive(live: unknown): Record<string, unknown> | null {
  if (!live || typeof live !== "object" || Array.isArray(live)) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(live as Record<string, unknown>)) {
    const check = LIVE_FIELDS[k];
    if (!check) continue; // الخطط والعلامات (team1Data / team1Joined ...) يحسبها السيرفر نفسه
    if (v === undefined) continue;
    if (!check(v)) {
      console.warn("castle sync: bad field", k);
      return null;
    }
    out[k] = v;
  }
  return out;
}

/** live_sync النهائي: حالة المضيف + الخطط المنظّفة + علامات "الفريق دخل" من السيرفر، والتوقعات والجواب مخفية لين تنكشف */
function buildLiveSync(live: Record<string, unknown>, s: Secrets) {
  const out: Record<string, unknown> = { ...live };
  if (!live.guessesRevealed) {
    out.guessT1 = "";
    out.guessT2 = "";
  }
  const cd = live.activeChallengeData;
  if (cd && typeof cd === "object" && !live.showGenAnswer) {
    const { a, ...rest } = cd as Record<string, unknown>;
    void a;
    out.activeChallengeData = rest;
  }
  out.team1Data = publicTeam(s.team1_plan, live.revealed1, revealedOf(s, 1), live.team1Name);
  out.team2Data = publicTeam(s.team2_plan, live.revealed2, revealedOf(s, 2), live.team2Name);
  out.team1Joined = !!s.team1_device;
  out.team2Joined = !!s.team2_device;
  out.rev = newRev();
  return out;
}

/**
 * المضيف يكتب حالته (live_sync كامل، مثل قبل). السيرفر ينظّفها قبل ما تنكتب.
 * بعد الكتابة نعيد قراءة مين ماسك الفرق: لو جوال اختار فريقه وهي بالطريق، نكتب مرة ثانية بعلامته
 * (عشان علامة "الفريق دخل" ما تضيع تحت كتابة المضيف).
 */
export async function hostSync(userId: string | null, input: { roomCode?: unknown; live?: unknown }): Promise<CastleResult> {
  const h = await hostSecrets(userId, input.roomCode);
  if (isFail(h)) return h;
  const live = cleanLive(input.live);
  if (!live) return fail(MSG.bad);
  const { admin, s, roomCode } = h;

  // التوقعات قبل كشفها: عند السيرفر بس (عشان المضيف يرجعها لو حدّث الصفحة)
  if (!live.guessesRevealed) {
    const g1 = typeof live.guessT1 === "string" ? live.guessT1 : "";
    const g2 = typeof live.guessT2 === "string" ? live.guessT2 : "";
    if ((s.guesses?.guessT1 ?? "") !== g1 || (s.guesses?.guessT2 ?? "") !== g2) {
      const { error } = await admin.from("cw_room_secrets").update({ guesses: { guessT1: g1, guessT2: g2 }, updated_at: new Date().toISOString() }).eq("room_code", roomCode);
      if (error) return fail(MSG.save, "busy");
    }
  }

  const write = (sec: Secrets) =>
    admin.from("cw_rooms").update({ live_sync: buildLiveSync(live, sec) }).eq("room_code", roomCode).eq("created_by", userId!).select("room_code");
  const { data, error } = await write(s);
  if (error) {
    console.error("castle sync error:", error);
    return fail(MSG.save, "busy");
  }
  if (!data || data.length === 0) return fail(MSG.notHost, "auth");

  const { data: claims } = await admin.from("cw_room_secrets").select("team1_device, team2_device").eq("room_code", roomCode).maybeSingle();
  if (claims && (!!claims.team1_device !== !!s.team1_device || !!claims.team2_device !== !!s.team2_device)) {
    await write({ ...s, team1_device: claims.team1_device, team2_device: claims.team2_device });
  }
  return { success: true };
}

/** تصفير: الخطط ومين ماسك الفرق والكشف والتوقعات تنمسح، وبعدها الغرفة (الثلاثة فاضية بجملة وحدة مثل قبل) */
export async function hostReset(userId: string | null, input: { roomCode?: unknown }): Promise<CastleResult> {
  const h = await hostSecrets(userId, input.roomCode);
  if (isFail(h)) return h;
  const { admin, roomCode } = h;
  const { error } = await admin
    .from("cw_room_secrets")
    .update({
      team1_plan: null, team2_plan: null, team1_device: null, team2_device: null,
      revealed1: emptyRevealed(), revealed2: emptyRevealed(), guesses: null, updated_at: new Date().toISOString(),
    })
    .eq("room_code", roomCode)
    .eq("owner_id", userId!);
  if (error) return fail(MSG.save, "busy");
  const { error: roomError } = await admin
    .from("cw_rooms")
    .update({ team1_setup: null, team2_setup: null, live_sync: null })
    .eq("room_code", roomCode)
    .eq("created_by", userId!);
  if (roomError) return fail(MSG.save, "busy");
  return { success: true };
}

/** المضيف يغيّر اسم فريق جاهز: الاسم بعلامة الفريق بالغرفة (مثل قبل، كان ينكتب مع الخطة) */
export async function hostName(userId: string | null, input: { roomCode?: unknown; team?: unknown; name?: unknown }): Promise<CastleResult> {
  if (!userId || !UUID_RE.test(userId)) return fail(MSG.login, "auth");
  if (typeof input.roomCode !== "string" || !ROOM_CODE_RE.test(input.roomCode)) return fail(MSG.bad);
  if ((input.team !== 1 && input.team !== 2) || !text(200)(input.name)) return fail(MSG.bad);
  const col = input.team === 1 ? "team1_setup" : "team2_setup";
  const { error } = await getSupabaseServiceRole()
    .from("cw_rooms")
    .update({ [col]: { ready: true, name: input.name } })
    .eq("room_code", input.roomCode)
    .eq("created_by", userId)
    .not(col, "is", null);
  if (error) return fail(MSG.save, "busy");
  return { success: true };
}

export type AttackReply = { room: number | null; soldiers: number; commander: boolean; trap: boolean; status: CastleStatus };

/**
 * هجوم على نافذة (أو الجاسوس): السيرفر يرد بمحتوى النافذة اللي انضربت بس، ويسجّل إنها انكشفت.
 * الجاسوس: أكثر نافذة جنود من المخفية (أول وحدة لو تساوت) — نفس اللي كان يحسبه المضيف.
 */
export async function hostAttack(
  userId: string | null,
  input: { roomCode?: unknown; defender?: unknown; room?: unknown; spy?: unknown }
): Promise<CastleResult<AttackReply>> {
  if (input.defender !== 1 && input.defender !== 2) return fail(MSG.bad);
  const spy = input.spy === true;
  if (!spy && !ROOM(input.room)) return fail(MSG.bad);
  const h = await hostSecrets(userId, input.roomCode);
  if (isFail(h)) return h;
  const { admin, s, roomCode } = h;
  const defender = input.defender as 1 | 2;
  const plan = planOf(s, defender);
  if (!plan) return fail(MSG.noPlan, "closed");
  const revealed = [...revealedOf(s, defender)];

  let room: number | null = spy ? null : (input.room as number);
  if (spy) {
    let max = -1;
    for (let i = 0; i < ROOMS_COUNT; i++) {
      if (!revealed[i] && plan.rooms[i] > max) {
        max = plan.rooms[i];
        room = i;
      }
    }
    if (room === null) return { success: true, data: { room: null, soldiers: 0, commander: false, trap: false, status: statusOf(s) } };
  }

  const target = room as number;
  if (!revealed[target]) {
    revealed[target] = true;
    const col = defender === 1 ? "revealed1" : "revealed2";
    const { error } = await admin.from("cw_room_secrets").update({ [col]: revealed, updated_at: new Date().toISOString() }).eq("room_code", roomCode).eq("owner_id", userId!);
    if (error) return fail(MSG.save, "busy");
  }
  const after: Secrets = { ...s, [defender === 1 ? "revealed1" : "revealed2"]: revealed };
  return {
    success: true,
    data: { room: target, soldiers: plan.rooms[target], commander: plan.commanderRoom === target, trap: plan.trapRoom === target, status: statusOf(after) },
  };
}

/** الأسر: الأسرى (lost) ينضافون عشوائياً لنوافذ صاحب الفخ المخفية (غير القائد والفخ) — نفس resolveTrap القديمة */
export async function hostTrap(
  userId: string | null,
  input: { roomCode?: unknown; defender?: unknown; lost?: unknown }
): Promise<CastleResult<{ captured: boolean; status: CastleStatus }>> {
  if ((input.defender !== 1 && input.defender !== 2) || !int(0, 20)(input.lost)) return fail(MSG.bad);
  const h = await hostSecrets(userId, input.roomCode);
  if (isFail(h)) return h;
  const { admin, s, roomCode } = h;
  const defender = input.defender as 1 | 2;
  const plan = planOf(s, defender);
  if (!plan) return fail(MSG.noPlan, "closed");
  const rooms = captureRoomsOf(plan, revealedOf(s, defender));
  if (rooms.length === 0) return { success: true, data: { captured: false, status: statusOf(s) } };
  const next = [...plan.rooms];
  for (let i = 0; i < (input.lost as number); i++) next[rooms[randomInt(rooms.length)]]++;
  const newPlan: Plan = { ...plan, rooms: next };
  const col = defender === 1 ? "team1_plan" : "team2_plan";
  const { error } = await admin.from("cw_room_secrets").update({ [col]: newPlan, updated_at: new Date().toISOString() }).eq("room_code", roomCode).eq("owner_id", userId!);
  if (error) return fail(MSG.save, "busy");
  return { success: true, data: { captured: true, status: statusOf({ ...s, [col]: newPlan }) } };
}

/** المضيف حدّث الصفحة وسط الحرب: يرجع التوقعات اللي كتبها (لو ما انكشفت) وحالة الفريقين */
export async function hostLoad(
  userId: string | null,
  input: { roomCode?: unknown }
): Promise<CastleResult<{ guesses: { guessT1: string; guessT2: string }; status: CastleStatus }>> {
  const h = await hostSecrets(userId, input.roomCode);
  if (isFail(h)) return h;
  const { s } = h;
  return {
    success: true,
    data: { guesses: { guessT1: s.guesses?.guessT1 ?? "", guessT2: s.guesses?.guessT2 ?? "" }, status: statusOf(s) },
  };
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

/** علامة "الفريق دخل" بـ live_sync (تقفل الفريق عند باقي الجوالات). كتابة مشروطة بنفس النسخة اللي قريناها، فما تكتب فوق حالة أحدث من المضيف */
async function markJoined(admin: Admin, roomCode: string, team: 1 | 2): Promise<void> {
  const key = team === 1 ? "team1Joined" : "team2Joined";
  for (let i = 0; i < 5; i++) {
    const { data } = await admin.from("cw_rooms").select("live_sync").eq("room_code", roomCode).maybeSingle();
    const live = data?.live_sync as Record<string, unknown> | null | undefined;
    // ما فيه حالة (بعد التصفير): أول كتابة من المضيف تحط العلامة (السيرفر يحسبها من مين ماسك الفريق)
    if (!live || typeof live !== "object" || live[key] === true) return;
    let q = admin.from("cw_rooms").update({ live_sync: { ...live, [key]: true, rev: newRev() } }).eq("room_code", roomCode);
    q = typeof live.rev === "string" ? q.eq("live_sync->>rev", live.rev) : q.is("live_sync->>rev", null);
    const { data: done } = await q.select("room_code");
    if (done && done.length > 0) return;
  }
}

/**
 * الجوال يختار فريقه: لو الفريق فاضي ياخذه (مقارنة وتبديل بجملة وحدة)، ولو هو أصلاً ماسكه (حدّث الصفحة
 * أو رجع بعد التصفير) لازم الـ token اللي معه.
 */
export async function teamJoin(input: {
  roomCode?: unknown;
  team?: unknown;
  deviceId?: unknown;
  token?: unknown;
}): Promise<CastleResult<{ token: string }>> {
  const t = teamInput(input);
  if (!t) return fail(MSG.bad);
  const col = t.team === 1 ? "team1_device" : "team2_device";
  const admin = getSupabaseServiceRole();
  const s = await loadSecrets(admin, t.roomCode);
  if (isFail(s)) return s;

  const holder = t.team === 1 ? s.team1_device : s.team2_device;
  if (holder === t.deviceId) {
    if (!tokenMatches(input.token, t.roomCode, t.team, t.deviceId)) return fail(MSG.full, "full");
  } else {
    const { data: claimed, error } = await admin
      .from("cw_room_secrets")
      .update({ [col]: t.deviceId, updated_at: new Date().toISOString() })
      .eq("room_code", t.roomCode)
      .is(col, null)
      .select("room_code");
    if (error) return fail(MSG.save, "busy");
    if (!claimed || claimed.length === 0) return fail(MSG.full, "full");
  }
  await markJoined(admin, t.roomCode, t.team);
  return { success: true, data: { token: castleTeamToken(t.roomCode, t.team, t.deviceId) } };
}

/**
 * الجوال يعتمد خطته: تنحفظ بالأسرار بشرط إنه للحين ماسك الفريق، وبالغرفة علامة "جاهز" واسم الفريق بس.
 * بعدها نتأكد إن الخطة باقية (لو المضيف صفّر بنفس اللحظة نشيل العلامة، والجوال يرجع يوزّع).
 */
export async function teamPlan(input: {
  roomCode?: unknown;
  team?: unknown;
  deviceId?: unknown;
  token?: unknown;
  plan?: unknown;
  name?: unknown;
}): Promise<CastleResult> {
  const t = teamInput(input);
  if (!t) return fail(MSG.bad);
  const plan = cleanPlan(input.plan);
  if (!plan || !text(200)(input.name)) return fail(MSG.bad);
  if (!tokenMatches(input.token, t.roomCode, t.team, t.deviceId)) return fail(MSG.lost, "lost");
  const admin = getSupabaseServiceRole();
  const deviceCol = t.team === 1 ? "team1_device" : "team2_device";
  const planCol = t.team === 1 ? "team1_plan" : "team2_plan";
  const setupCol = t.team === 1 ? "team1_setup" : "team2_setup";

  const { data: room, error: roomError } = await admin.from("cw_rooms").select("state:live_sync->>gameState").eq("room_code", t.roomCode).maybeSingle();
  if (roomError) return fail(MSG.save, "busy");
  if (!room) return fail(MSG.noRoom, "no_room");
  const state = (room as { state?: string | null }).state;
  if (state === "playing" || state === "gameOver") return fail(MSG.closed, "closed");

  const { data: saved, error } = await admin
    .from("cw_room_secrets")
    .update({ [planCol]: plan, updated_at: new Date().toISOString() })
    .eq("room_code", t.roomCode)
    .eq(deviceCol, t.deviceId)
    .select("room_code");
  if (error) return fail(MSG.save, "busy");
  if (!saved || saved.length === 0) return fail(MSG.lost, "lost");

  const { error: markError } = await admin.from("cw_rooms").update({ [setupCol]: { ready: true, name: input.name } }).eq("room_code", t.roomCode);
  if (markError) return fail(MSG.save, "busy");

  const { data: check } = await admin.from("cw_room_secrets").select(`${deviceCol}, ${planCol}`).eq("room_code", t.roomCode).maybeSingle();
  const c = (check ?? {}) as Record<string, unknown>;
  if (c[deviceCol] !== t.deviceId || !c[planCol]) {
    await admin.from("cw_rooms").update({ [setupCol]: null }).eq("room_code", t.roomCode);
    return fail(MSG.lost, "lost");
  }
  return { success: true };
}
