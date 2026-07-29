"use server";

import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { shuffleArray } from "@/lib/game/shuffle";
import { QUIZ_CONFIG, QUIZ_GAME, QUIZ_TOTAL_CELLS } from "@/constants/quiz-grid";
import {
  QuizJoinSchema,
  QuizLifelineSchema,
  QuizResolveSchema,
  QuizRoomCodeSchema,
  QuizSelectCellSchema,
  QuizStartSessionSchema,
} from "@/lib/schemas";
import { checkAccessAction, consumeGameSessionAction } from "@/app/actions/gameAccess";
import type {
  QuizBoardCell,
  QuizCategory,
  QuizPoints,
  QuizQuestion,
  QuizRoom,
  QuizSessionCell,
  QuizSessionPlayer,
  QuizTeam,
} from "@/types";

/**
 * كل تعديل على جلسة "تحدي الفئات" يمر من هنا.
 *
 * سببان لذلك:
 *  1. النقاط لا يُوثق بها من المتصفح إطلاقاً — تُحسب على السيرفر من نقاط الخلية المخزّنة.
 *  2. جدول quiz_session_questions مغلق تماماً على العميل (RLS بدون سياسات)،
 *     فهو المكان الوحيد الذي تعيش فيه نصوص الإجابات.
 */

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string };

function fail(error: string): { success: false; error: string } {
  return { success: false, error };
}

// ---------------------------------------------------------------------
// أدوات مساعدة داخلية
// ---------------------------------------------------------------------

/** اسم عمود "تم استخدام الوسيلة" لفريق معيّن، مثل t1_pit_used */
function lifelineColumn(team: QuizTeam, kind: "call" | "pit" | "rest") {
  return `t${team}_${kind}_used` as keyof QuizRoom;
}

function generateQuizRoomCode(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "Q";
  for (let i = 0; i < 4; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

/**
 * يتحقق أن المستخدم مسجّل دخول وأنه هو حكم هذه الغرفة تحديداً.
 * نستخدم الحقل `ok` كمُميِّز صريح ليعمل تضييق النوع في كل مواضع الاستدعاء.
 */
type HostContext =
  | { ok: false; error: string }
  | {
      ok: true;
      admin: ReturnType<typeof getSupabaseServiceRole>;
      room: QuizRoom;
      userId: string;
      roomCode: string;
    };

async function requireHost(rawRoomCode: string): Promise<HostContext> {
  const parsed = QuizRoomCodeSchema.safeParse(rawRoomCode);
  if (!parsed.success) {
    return { ok: false, error: "رمز الغرفة غير صحيح." };
  }
  const roomCode = parsed.data;

  const userClient = await getSupabaseServer();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return { ok: false, error: "يجب تسجيل الدخول." };
  }

  const admin = getSupabaseServiceRole();
  const { data: room } = await admin
    .from("quiz_rooms")
    .select("*")
    .eq("room_code", roomCode)
    .maybeSingle();

  if (!room) {
    return { ok: false, error: "الغرفة غير موجودة." };
  }

  if (room.host_user_id !== user.id) {
    return { ok: false, error: "لا تملك صلاحية التحكم بهذه الغرفة." };
  }

  return { ok: true, admin, room: room as QuizRoom, userId: user.id, roomCode };
}

/** يحوّل مسارات الصور في التخزين الخاص إلى روابط موقّعة مؤقتة. */
async function signMedia(
  admin: ReturnType<typeof getSupabaseServiceRole>,
  paths: (string | null | undefined)[]
): Promise<Record<string, string>> {
  const wanted = paths.filter((p): p is string => Boolean(p));
  if (wanted.length === 0) return {};

  const { data, error } = await admin.storage
    .from(QUIZ_CONFIG.MEDIA_BUCKET)
    .createSignedUrls(wanted, QUIZ_CONFIG.SIGNED_URL_TTL);

  if (error || !data) {
    console.error("signMedia error:", error);
    return {};
  }

  const map: Record<string, string> = {};
  data.forEach((item) => {
    if (item.signedUrl && item.path) map[item.path] = item.signedUrl;
  });
  return map;
}

// ---------------------------------------------------------------------
// الإعداد: الفئات المتاحة وإنشاء الغرفة
// ---------------------------------------------------------------------

export interface QuizCategoryOption extends QuizCategory {
  counts: Record<QuizPoints, number>;
  /** هل تملك الفئة 2 أسئلة على الأقل في كل فئة سعرية؟ */
  isPlayable: boolean;
}

/** قائمة الفئات مع عدد الأسئلة في كل فئة سعرية، لشاشة الإعداد. */
export async function getQuizCategories(): Promise<ActionResult<QuizCategoryOption[]>> {
  const admin = getSupabaseServiceRole();

  const { data: categories, error } = await admin
    .from("quiz_categories")
    .select("*")
    .eq("is_active", true)
    .order("name_ar", { ascending: true });

  if (error) {
    console.error("getQuizCategories error:", error);
    return fail("تعذّر جلب الفئات.");
  }

  const { data: questions } = await admin
    .from("quiz_questions")
    .select("category_id, points")
    .eq("is_active", true);

  const options: QuizCategoryOption[] = (categories || []).map((c) => {
    const counts = { 200: 0, 400: 0, 600: 0 } as Record<QuizPoints, number>;
    questions?.forEach((q: { category_id: string; points: number }) => {
      if (q.category_id === c.id) counts[q.points as QuizPoints] += 1;
    });
    const isPlayable = QUIZ_CONFIG.TIERS.every((t) => counts[t] >= QUIZ_CONFIG.PER_TIER);
    return { ...(c as QuizCategory), counts, isPlayable };
  });

  return { success: true, data: options };
}

/** ينشئ غرفة جديدة بحالة "إعداد" ويعيد رمزها. */
export async function createQuizRoom(): Promise<ActionResult<{ roomCode: string }>> {
  const userClient = await getSupabaseServer();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) return fail("يجب تسجيل الدخول لإنشاء غرفة.");

  const admin = getSupabaseServiceRole();

  // نحاول عدة مرات تجنباً لتصادم نادر في الرموز
  for (let attempt = 0; attempt < 8; attempt++) {
    const roomCode = generateQuizRoomCode();
    const { error } = await admin.from("quiz_rooms").insert({
      room_code: roomCode,
      host_user_id: user.id,
      game_state: "setup",
    });

    if (!error) return { success: true, data: { roomCode } };
    // 23505 = تعارض مفتاح فريد، نجرّب رمزاً آخر
    if (error.code !== "23505") {
      console.error("createQuizRoom error:", error);
      return fail("تعذّر إنشاء الغرفة.");
    }
  }

  return fail("تعذّر توليد رمز غرفة فريد، حاول مرة أخرى.");
}

// ---------------------------------------------------------------------
// قراءة الجلسة
// ---------------------------------------------------------------------

export interface QuizSessionView {
  room: QuizRoom;
  cells: QuizBoardCell[];
  players: QuizSessionPlayer[];
  /** ترتيب أعمدة اللوحة بأسماء الفئات */
  columns: string[];
}

/**
 * حالة الجلسة لشاشة الحكم.
 * تُرجع اللوحة بدون أي نص سؤال أو إجابة — المحتوى يأتي من getQuizActiveCell فقط.
 */
export async function getQuizSession(roomCode: string): Promise<ActionResult<QuizSessionView>> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);

  const { admin, room } = ctx;

  const { data: cells } = await admin
    .from("quiz_session_questions")
    .select("id, column_index, row_index, category_name_ar, points, status, awarded_team")
    .eq("room_code", ctx.roomCode)
    .order("column_index", { ascending: true })
    .order("row_index", { ascending: true });

  const { data: players } = await admin
    .from("quiz_session_players")
    .select("*")
    .eq("room_code", ctx.roomCode)
    .order("joined_at", { ascending: true });

  const columns: string[] = [];
  (cells || []).forEach((c: QuizBoardCell) => {
    columns[c.column_index] = c.category_name_ar;
  });

  return {
    success: true,
    data: {
      room,
      cells: (cells || []) as QuizBoardCell[],
      players: (players || []) as QuizSessionPlayer[],
      columns,
    },
  };
}

export interface QuizActiveCellView {
  id: string;
  category_name_ar: string;
  points: QuizPoints;
  question_text: string;
  question_image_url: string | null;
  question_image_alt: string | null;
  /** لا يُرسل إلا بعد أن يضغط الحكم "كشف الإجابة" */
  answer_text: string | null;
  answer_image_url: string | null;
  answer_image_alt: string | null;
}

/**
 * محتوى السؤال الحالي — لشاشة الحكم فقط.
 * نص الإجابة لا يُضمَّن في الرد إطلاقاً قبل أن ينتقل السؤال لحالة "answer".
 */
export async function getQuizActiveCell(
  roomCode: string
): Promise<ActionResult<QuizActiveCellView | null>> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);

  const { admin, room } = ctx;
  if (!room.active_cell_id) return { success: true, data: null };

  const { data: cell } = await admin
    .from("quiz_session_questions")
    .select("*")
    .eq("id", room.active_cell_id)
    .eq("room_code", ctx.roomCode)
    .maybeSingle();

  if (!cell) return { success: true, data: null };

  const typed = cell as QuizSessionCell;
  const isAnswerPhase = room.game_state === "answer";

  const signed = await signMedia(admin, [
    typed.question_image,
    isAnswerPhase ? typed.answer_image : null,
  ]);

  return {
    success: true,
    data: {
      id: typed.id,
      category_name_ar: typed.category_name_ar,
      points: typed.points,
      question_text: typed.question_text,
      question_image_url: typed.question_image ? signed[typed.question_image] ?? null : null,
      question_image_alt: typed.question_image_alt,
      answer_text: isAnswerPhase ? typed.answer_text : null,
      answer_image_url:
        isAnswerPhase && typed.answer_image ? signed[typed.answer_image] ?? null : null,
      answer_image_alt: isAnswerPhase ? typed.answer_image_alt : null,
    },
  };
}

// ---------------------------------------------------------------------
// بداية الجلسة: سحب 36 سؤالاً مرة واحدة
// ---------------------------------------------------------------------

export async function startQuizSession(input: {
  roomCode: string;
  categoryIds: string[];
  t1Name: string;
  t2Name: string;
}): Promise<ActionResult> {
  const parsed = QuizStartSessionSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || "بيانات غير صحيحة.");
  }

  const ctx = await requireHost(parsed.data.roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room, userId } = ctx;

  if (room.game_state !== "setup") {
    return fail("الجلسة بدأت بالفعل.");
  }

  const uniqueIds = Array.from(new Set(parsed.data.categoryIds));
  if (uniqueIds.length !== QUIZ_CONFIG.CATEGORIES_PER_SESSION) {
    return fail("لا يمكن اختيار الفئة نفسها أكثر من مرة.");
  }

  // بوابة الرصيد — تُفحص على السيرفر حتى لا يمكن تجاوزها من المتصفح
  const access = await checkAccessAction(QUIZ_GAME.id);
  if (!access.allowed) {
    return fail("رصيدك غير كافٍ لبدء لعبة جديدة.");
  }

  const { data: categories } = await admin
    .from("quiz_categories")
    .select("id, name_ar")
    .in("id", uniqueIds)
    .eq("is_active", true);

  if (!categories || categories.length !== uniqueIds.length) {
    return fail("إحدى الفئات المختارة غير متاحة.");
  }

  const { data: pool } = await admin
    .from("quiz_questions")
    .select("*")
    .in("category_id", uniqueIds)
    .eq("is_active", true);

  if (!pool || pool.length === 0) {
    return fail("بنك الأسئلة فارغ. أضف أسئلة من لوحة التحكم أولاً.");
  }

  const nameById = new Map(categories.map((c) => [c.id, c.name_ar as string]));
  const rows: Record<string, unknown>[] = [];

  // العمود = ترتيب الفئة كما اختارها الحكم، والصفوف 200/200/400/400/600/600
  for (let columnIndex = 0; columnIndex < uniqueIds.length; columnIndex++) {
    const categoryId = uniqueIds[columnIndex];
    const categoryName = nameById.get(categoryId) || "";

    const picked: QuizQuestion[] = [];
    for (const tier of QUIZ_CONFIG.TIERS) {
      const tierPool = (pool as QuizQuestion[]).filter(
        (q) => q.category_id === categoryId && q.points === tier
      );
      if (tierPool.length < QUIZ_CONFIG.PER_TIER) {
        return fail(
          `الفئة "${categoryName}" تحتاج ${QUIZ_CONFIG.PER_TIER} أسئلة على الأقل بقيمة ${tier} نقطة (الموجود: ${tierPool.length}).`
        );
      }
      picked.push(...shuffleArray(tierPool).slice(0, QUIZ_CONFIG.PER_TIER));
    }

    // ترتيب الخلايا داخل العمود حسب التخطيط المعتمد
    const byTier: Record<number, QuizQuestion[]> = { 200: [], 400: [], 600: [] };
    picked.forEach((q) => byTier[q.points].push(q));

    QUIZ_CONFIG.COLUMN_LAYOUT.forEach((tier, rowIndex) => {
      const q = byTier[tier].shift();
      if (!q) return;
      rows.push({
        room_code: ctx.roomCode,
        question_id: q.id,
        column_index: columnIndex,
        row_index: rowIndex,
        category_id: categoryId,
        category_name_ar: categoryName,
        points: tier,
        // نسخة ثابتة من المحتوى: اللوحة تبقى كما هي حتى لو عُدّل البنك أثناء اللعب
        question_text: q.question_text,
        answer_text: q.answer_text,
        question_image: q.question_image,
        question_image_alt: q.question_image_alt,
        answer_image: q.answer_image,
        answer_image_alt: q.answer_image_alt,
        status: "available",
      });
    });
  }

  if (rows.length !== QUIZ_TOTAL_CELLS) {
    return fail("تعذّر تجهيز اللوحة كاملة، راجع بنك الأسئلة.");
  }

  // تنظيف أي لقطة سابقة لنفس الغرفة قبل السحب الجديد
  await admin.from("quiz_session_questions").delete().eq("room_code", ctx.roomCode);

  const { error: insertError } = await admin.from("quiz_session_questions").insert(rows);
  if (insertError) {
    console.error("startQuizSession insert error:", insertError);
    return fail("تعذّر تجهيز اللوحة.");
  }

  const { error: updateError } = await admin
    .from("quiz_rooms")
    .update({
      game_state: "board",
      t1_name: parsed.data.t1Name,
      t2_name: parsed.data.t2Name,
      t1_score: 0,
      t2_score: 0,
      turn: 1,
      t1_call_used: false,
      t1_pit_used: false,
      t1_rest_used: false,
      t2_call_used: false,
      t2_pit_used: false,
      t2_rest_used: false,
      active_cell_id: null,
      is_question_revealed: false,
      call_friend_active: false,
      pit_active_team: null,
      rest_target_player_id: null,
      question_deadline_at: null,
      is_timer_running: false,
      winner_team: null,
      ended_at: null,
    })
    .eq("room_code", ctx.roomCode);

  if (updateError) {
    console.error("startQuizSession update error:", updateError);
    return fail("تعذّر بدء الجلسة.");
  }

  await consumeGameSessionAction(QUIZ_GAME.id, userId, access.reason);

  return { success: true };
}

// ---------------------------------------------------------------------
// دورة السؤال
// ---------------------------------------------------------------------

/** الفريق صاحب الدور يختار خلية — يبدأ عرض السؤال والمؤقت. */
export async function selectQuizCell(input: {
  roomCode: string;
  cellId: string;
}): Promise<ActionResult> {
  const parsed = QuizSelectCellSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "بيانات غير صحيحة.");

  const ctx = await requireHost(parsed.data.roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;

  if (room.game_state !== "board") {
    return fail("لا يمكن اختيار سؤال في هذه المرحلة.");
  }

  const { data: cell } = await admin
    .from("quiz_session_questions")
    .select("id, status")
    .eq("id", parsed.data.cellId)
    .eq("room_code", ctx.roomCode)
    .maybeSingle();

  if (!cell) return fail("الخلية غير موجودة.");
  if (cell.status === "consumed") return fail("تم استخدام هذا السؤال مسبقاً.");

  const deadline = new Date(Date.now() + QUIZ_CONFIG.TIMER_SECONDS * 1000).toISOString();

  const { error } = await admin
    .from("quiz_rooms")
    .update({
      game_state: "question",
      active_cell_id: cell.id,
      is_question_revealed: true,
      question_deadline_at: deadline,
      is_timer_running: true,
      call_friend_active: false,
      rest_target_player_id: null,
    })
    .eq("room_code", ctx.roomCode);

  if (error) {
    console.error("selectQuizCell error:", error);
    return fail("تعذّر فتح السؤال.");
  }

  return { success: true };
}

/** كشف الإجابة على شاشة الحكم. */
export async function revealQuizAnswer(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;

  if (room.game_state !== "question") return fail("لا يوجد سؤال معروض حالياً.");

  const { error } = await admin
    .from("quiz_rooms")
    .update({ game_state: "answer", is_timer_running: false })
    .eq("room_code", ctx.roomCode);

  if (error) return fail("تعذّر كشف الإجابة.");
  return { success: true };
}

/**
 * احتساب نتيجة السؤال وتمرير الدور.
 * النقاط تُقرأ من الخلية المخزّنة في قاعدة البيانات، لا من المتصفح.
 */
export async function resolveQuizQuestion(input: {
  roomCode: string;
  awardedTeam: QuizTeam | null;
}): Promise<ActionResult> {
  const parsed = QuizResolveSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "بيانات غير صحيحة.");

  const ctx = await requireHost(parsed.data.roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;

  if (room.game_state !== "answer") return fail("يجب كشف الإجابة أولاً.");
  if (!room.active_cell_id) return fail("لا يوجد سؤال نشط.");

  const { data: cell } = await admin
    .from("quiz_session_questions")
    .select("id, points, status")
    .eq("id", room.active_cell_id)
    .eq("room_code", ctx.roomCode)
    .maybeSingle();

  if (!cell) return fail("الخلية غير موجودة.");

  const awarded = parsed.data.awardedTeam;
  const points = cell.points as number;

  let t1Score = room.t1_score;
  let t2Score = room.t2_score;

  if (awarded) {
    const usedPit = room.pit_active_team === awarded;
    if (awarded === 1) {
      t1Score += points;
      if (usedPit) t2Score -= points;
    } else {
      t2Score += points;
      if (usedPit) t1Score -= points;
    }
  }
  // لا أحد أجاب، أو أخطأ صاحب "الحفرة" => لا تغيير في النقاط

  await admin
    .from("quiz_session_questions")
    .update({ status: "consumed", awarded_team: awarded })
    .eq("id", cell.id);

  const { count: remaining } = await admin
    .from("quiz_session_questions")
    .select("*", { count: "exact", head: true })
    .eq("room_code", ctx.roomCode)
    .eq("status", "available");

  const isOver = (remaining || 0) === 0;
  const winner = t1Score === t2Score ? 0 : t1Score > t2Score ? 1 : 2;

  const { error } = await admin
    .from("quiz_rooms")
    .update({
      t1_score: t1Score,
      t2_score: t2Score,
      turn: room.turn === 1 ? 2 : 1,
      game_state: isOver ? "gameOver" : "board",
      active_cell_id: null,
      is_question_revealed: false,
      call_friend_active: false,
      pit_active_team: null,
      rest_target_player_id: null,
      question_deadline_at: null,
      is_timer_running: false,
      winner_team: isOver ? winner : null,
      ended_at: isOver ? new Date().toISOString() : null,
    })
    .eq("room_code", ctx.roomCode);

  if (error) {
    console.error("resolveQuizQuestion error:", error);
    return fail("تعذّر احتساب النتيجة.");
  }

  return { success: true };
}

// ---------------------------------------------------------------------
// وسائل المساعدة — التوقيت مفروض هنا، لا في الواجهة
// ---------------------------------------------------------------------

export async function activateQuizLifeline(input: {
  roomCode: string;
  team: QuizTeam;
  kind: "call" | "pit" | "rest";
  targetPlayerId?: string | null;
}): Promise<ActionResult> {
  const parsed = QuizLifelineSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "بيانات غير صحيحة.");

  const ctx = await requireHost(parsed.data.roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;

  const { team, kind, targetPlayerId } = parsed.data;
  const usedColumn = lifelineColumn(team, kind);

  if (room.turn !== team) {
    return fail("وسائل المساعدة تُستخدم في دور الفريق نفسه فقط.");
  }

  if (room[usedColumn] === true) {
    return fail("تم استخدام وسيلة المساعدة هذه مسبقاً.");
  }

  const patch: Record<string, unknown> = { [usedColumn]: true };

  if (kind === "pit") {
    // "الحفرة" رهان أعمى: يجب أن يُعلن قبل عرض السؤال
    if (room.game_state !== "board") {
      return fail("الحفرة تُستخدم من شاشة اللوحة قبل عرض السؤال.");
    }
    patch.pit_active_team = team;
  } else {
    if (room.game_state !== "question") {
      return fail("هذه الوسيلة تُستخدم بعد عرض السؤال فقط.");
    }

    if (kind === "call") {
      const current = room.question_deadline_at
        ? new Date(room.question_deadline_at).getTime()
        : Date.now();
      const base = Math.max(current, Date.now());
      patch.question_deadline_at = new Date(
        base + QUIZ_CONFIG.CALL_FRIEND_BONUS * 1000
      ).toISOString();
      patch.call_friend_active = true;
      patch.is_timer_running = true;
    }

    if (kind === "rest") {
      if (!targetPlayerId) return fail("اختر لاعباً من الفريق الخصم.");

      const { data: target } = await admin
        .from("quiz_session_players")
        .select("id, team")
        .eq("id", targetPlayerId)
        .eq("room_code", ctx.roomCode)
        .maybeSingle();

      if (!target) return fail("اللاعب غير موجود في هذه الغرفة.");
      if (target.team === team) return fail("يجب اختيار لاعب من الفريق الخصم.");

      patch.rest_target_player_id = targetPlayerId;
    }
  }

  const { error } = await admin.from("quiz_rooms").update(patch).eq("room_code", ctx.roomCode);
  if (error) {
    console.error("activateQuizLifeline error:", error);
    return fail("تعذّر تفعيل وسيلة المساعدة.");
  }

  return { success: true };
}

/** إخفاء حالة "جاري الاتصال" بعد انتهاء المكالمة. */
export async function clearQuizCallState(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);

  const { error } = await ctx.admin
    .from("quiz_rooms")
    .update({ call_friend_active: false })
    .eq("room_code", ctx.roomCode);

  if (error) return fail("تعذّر تحديث الحالة.");
  return { success: true };
}

// ---------------------------------------------------------------------
// إنهاء الجلسة
// ---------------------------------------------------------------------

export async function endQuizSession(roomCode: string): Promise<ActionResult> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;

  const winner = room.t1_score === room.t2_score ? 0 : room.t1_score > room.t2_score ? 1 : 2;

  const { error } = await admin
    .from("quiz_rooms")
    .update({
      game_state: "gameOver",
      winner_team: winner,
      ended_at: new Date().toISOString(),
      is_timer_running: false,
      active_cell_id: null,
      is_question_revealed: false,
    })
    .eq("room_code", ctx.roomCode);

  if (error) return fail("تعذّر إنهاء الجلسة.");
  return { success: true };
}

// ---------------------------------------------------------------------
// انضمام اللاعبين — المسار الوحيد المتاح بدون تسجيل دخول
// ---------------------------------------------------------------------

export interface QuizJoinView {
  roomCode: string;
  t1Name: string;
  t2Name: string;
  gameState: string;
  player: QuizSessionPlayer | null;
}

/** معلومات الغرفة التي يحتاجها اللاعب قبل الانضمام. */
export async function getQuizRoomPublicInfo(
  roomCode: string,
  deviceId?: string
): Promise<ActionResult<QuizJoinView>> {
  const parsed = QuizRoomCodeSchema.safeParse(roomCode);
  if (!parsed.success) return fail("رمز الغرفة غير صحيح.");

  const admin = getSupabaseServiceRole();
  const { data: room } = await admin
    .from("quiz_rooms")
    .select("room_code, t1_name, t2_name, game_state")
    .eq("room_code", parsed.data)
    .maybeSingle();

  if (!room) return fail("لم نجد غرفة بهذا الرمز.");

  let player: QuizSessionPlayer | null = null;
  if (deviceId) {
    const { data } = await admin
      .from("quiz_session_players")
      .select("*")
      .eq("room_code", parsed.data)
      .eq("device_id", deviceId)
      .maybeSingle();
    player = (data as QuizSessionPlayer) || null;
  }

  return {
    success: true,
    data: {
      roomCode: room.room_code,
      t1Name: room.t1_name,
      t2Name: room.t2_name,
      gameState: room.game_state,
      player,
    },
  };
}

export async function joinQuizRoom(input: {
  roomCode: string;
  deviceId: string;
  displayName: string;
  team: QuizTeam;
}): Promise<ActionResult<{ player: QuizSessionPlayer }>> {
  const parsed = QuizJoinSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "بيانات غير صحيحة.");

  const admin = getSupabaseServiceRole();
  const { roomCode, deviceId, displayName, team } = parsed.data;

  const { data: room } = await admin
    .from("quiz_rooms")
    .select("room_code, game_state")
    .eq("room_code", roomCode)
    .maybeSingle();

  if (!room) return fail("لم نجد غرفة بهذا الرمز.");
  if (room.game_state === "gameOver") return fail("هذه الجلسة انتهت.");

  const { data, error } = await admin
    .from("quiz_session_players")
    .upsert(
      { room_code: roomCode, device_id: deviceId, display_name: displayName, team },
      { onConflict: "room_code,device_id" }
    )
    .select()
    .single();

  if (error || !data) {
    console.error("joinQuizRoom error:", error);
    return fail("تعذّر الانضمام للغرفة.");
  }

  return { success: true, data: { player: data as QuizSessionPlayer } };
}
