"use server";

import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { shuffleArray } from "@/lib/game/shuffle";
import { QUIZ_CONFIG, QUIZ_GAME, QUIZ_LIFELINES, quizTotalCells } from "@/constants/quiz-grid";
import {
  QuizJoinSchema,
  QuizLifelineSchema,
  QuizPrepareSessionSchema,
  QuizResolveSchema,
  QuizRoomCodeSchema,
  QuizSelectCellSchema,
  QuizStartSessionSchema,
} from "@/lib/schemas";
import { checkAccessAction, consumeGameSessionAction } from "@/app/actions/gameAccess";
import type {
  QuizBoardCell,
  QuizCategory,
  QuizLifelineKey,
  QuizPoints,
  QuizPreparedCell,
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

/** اسم عمود مصفوفة معيّنة لفريق معيّن، مثل t1_lifelines أو t2_lifelines_used */
function teamColumn(team: QuizTeam, suffix: "lifelines" | "lifelines_used") {
  return `t${team}_${suffix}` as keyof QuizRoom;
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
  /** رابط موقّع لصورة الفئة، أو null إن لم تُرفع صورة — الواجهة تعرض بطاقة متدرّجة اللون بدلاً منها */
  image_url: string | null;
}

/** قائمة الفئات مع عدد الأسئلة في كل فئة سعرية وصورتها، لشاشة الإعداد. */
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

  const signed = await signMedia(
    admin,
    (categories || []).map((c) => c.image_path as string | null)
  );

  const options: QuizCategoryOption[] = (categories || []).map((c) => {
    const counts = { 200: 0, 400: 0, 600: 0 } as Record<QuizPoints, number>;
    questions?.forEach((q: { category_id: string; points: number }) => {
      if (q.category_id === c.id) counts[q.points as QuizPoints] += 1;
    });
    const isPlayable = QUIZ_CONFIG.TIERS.every((t) => counts[t] >= QUIZ_CONFIG.PER_TIER);
    const typed = c as QuizCategory;
    return {
      ...typed,
      counts,
      isPlayable,
      image_url: typed.image_path ? signed[typed.image_path] ?? null : null,
    };
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
// بداية الجلسة — على مرحلتين حتى لا يشعر الحكم بأي انتظار:
//   1) prepareQuizSession: يسحب الأسئلة ويجهّز الصور (ثقيلة، بلا تحصيل)
//   2) startQuizSession: يكتب الأسماء والمدة ويبدأ اللعب فعلياً (خفيفة)
// ---------------------------------------------------------------------

export interface QuizPreparedBoard {
  cells: QuizPreparedCell[];
  /** ترتيب أعمدة اللوحة بأسماء الفئات */
  columns: string[];
}

/** يبني حمولة اللوحة المُجهَّزة من اللقطة المخزّنة، بروابط صور موقّعة لصور السؤال فقط. */
async function buildPreparedBoard(
  admin: ReturnType<typeof getSupabaseServiceRole>,
  roomCode: string
): Promise<QuizPreparedBoard> {
  const { data: cells } = await admin
    .from("quiz_session_questions")
    .select(
      "id, column_index, row_index, category_id, category_name_ar, points, question_text, question_image, question_image_alt"
    )
    .eq("room_code", roomCode)
    .order("column_index", { ascending: true })
    .order("row_index", { ascending: true });

  type Row = {
    id: string;
    column_index: number;
    row_index: number;
    category_id: string;
    category_name_ar: string;
    points: QuizPoints;
    question_text: string;
    question_image: string | null;
    question_image_alt: string | null;
  };
  const rows = (cells || []) as Row[];

  const signed = await signMedia(
    admin,
    rows.map((r) => r.question_image)
  );

  const columns: string[] = [];
  const preparedCells: QuizPreparedCell[] = rows.map((r) => {
    columns[r.column_index] = r.category_name_ar;
    return {
      id: r.id,
      column_index: r.column_index,
      row_index: r.row_index,
      category_id: r.category_id,
      category_name_ar: r.category_name_ar,
      points: r.points,
      question_text: r.question_text,
      question_image_url: r.question_image ? signed[r.question_image] ?? null : null,
      question_image_alt: r.question_image_alt,
    };
  });

  return { cells: preparedCells, columns };
}

/**
 * المرحلة الثقيلة: يسحب الأسئلة ويحفظها كلقطة، دون تحصيل أي رمز لعبة —
 * الحكم قد يتراجع لتغيير الفئات بعدها. آمن لإعادة الاستدعاء: يحذف أي
 * لقطة سابقة لنفس الغرفة قبل السحب الجديد.
 */
export async function prepareQuizSession(input: {
  roomCode: string;
  categoryIds: string[];
}): Promise<ActionResult<QuizPreparedBoard>> {
  const parsed = QuizPrepareSessionSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || "بيانات غير صحيحة.");
  }

  const ctx = await requireHost(parsed.data.roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;

  if (room.game_state !== "setup") {
    return fail("الجلسة بدأت بالفعل.");
  }

  const uniqueIds = Array.from(new Set(parsed.data.categoryIds));
  if (uniqueIds.length !== parsed.data.categoryIds.length) {
    return fail("لا يمكن اختيار الفئة نفسها أكثر من مرة.");
  }

  // بوابة الرصيد — تُفحص هنا لإيقاف الحكم مبكراً، لكن بلا أي تحصيل
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

  if (rows.length !== quizTotalCells(uniqueIds.length)) {
    return fail("تعذّر تجهيز اللوحة كاملة، راجع بنك الأسئلة.");
  }

  // تنظيف أي لقطة سابقة لنفس الغرفة قبل السحب الجديد — يسمح بالتراجع وتغيير الفئات
  await admin.from("quiz_session_questions").delete().eq("room_code", ctx.roomCode);

  const { error: insertError } = await admin.from("quiz_session_questions").insert(rows);
  if (insertError) {
    console.error("prepareQuizSession insert error:", insertError);
    return fail("تعذّر تجهيز اللوحة.");
  }

  const board = await buildPreparedBoard(admin, ctx.roomCode);
  return { success: true, data: board };
}

/**
 * إعادة قراءة اللوحة المُجهَّزة بدون سحب جديد — تُستخدم عند استئناف
 * شاشة الحكم بعد تحديث الصفحة أثناء الإعداد.
 */
export async function getQuizPreparedBoard(
  roomCode: string
): Promise<ActionResult<QuizPreparedBoard>> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);

  const board = await buildPreparedBoard(ctx.admin, ctx.roomCode);
  return { success: true, data: board };
}

/**
 * المرحلة الخفيفة: تكتب أسماء الفرق، مدة السؤال، ووسائل المساعدة التي
 * اختارها كل فريق (3 من أصل 6، ويجوز أن تختلف بين الفريقين)، ثم تبدأ
 * اللعب فعلياً وتحصّل رمز اللعبة. تتطلب لقطة أسئلة جاهزة من prepareQuizSession.
 */
export async function startQuizSession(input: {
  roomCode: string;
  t1Name: string;
  t2Name: string;
  timerSeconds: number;
  t1Lifelines: QuizLifelineKey[];
  t2Lifelines: QuizLifelineKey[];
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

  const { count } = await admin
    .from("quiz_session_questions")
    .select("*", { count: "exact", head: true })
    .eq("room_code", ctx.roomCode);

  if (!count || count === 0) {
    return fail("لم يتم تجهيز الأسئلة بعد — ارجع لخطوة اختيار الفئات.");
  }

  // بوابة الرصيد — تُفحص من جديد هنا لأن التحصيل الفعلي يحدث الآن
  const access = await checkAccessAction(QUIZ_GAME.id);
  if (!access.allowed) {
    return fail("رصيدك غير كافٍ لبدء لعبة جديدة.");
  }

  const { error: updateError } = await admin
    .from("quiz_rooms")
    .update({
      game_state: "board",
      t1_name: parsed.data.t1Name,
      t2_name: parsed.data.t2Name,
      timer_seconds: parsed.data.timerSeconds,
      t1_score: 0,
      t2_score: 0,
      turn: 1,
      t1_lifelines: parsed.data.t1Lifelines,
      t2_lifelines: parsed.data.t2Lifelines,
      t1_lifelines_used: [],
      t2_lifelines_used: [],
      active_cell_id: null,
      is_question_revealed: false,
      call_friend_active: false,
      pit_active_team: null,
      double_active_team: null,
      extra_turn_team: null,
      audience_active: false,
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

  const deadline = new Date(Date.now() + room.timer_seconds * 1000).toISOString();

  const { error } = await admin
    .from("quiz_rooms")
    .update({
      game_state: "question",
      active_cell_id: cell.id,
      is_question_revealed: true,
      question_deadline_at: deadline,
      is_timer_running: true,
      call_friend_active: false,
      audience_active: false,
      rest_target_player_id: null,
    })
    .eq("room_code", ctx.roomCode);

  if (error) {
    console.error("selectQuizCell error:", error);
    return fail("تعذّر فتح السؤال.");
  }

  return { success: true };
}

export interface QuizAnswerContent {
  answer_text: string;
  answer_image_url: string | null;
  answer_image_alt: string | null;
}

/**
 * كشف الإجابة على شاشة الحكم. يعيد محتوى الإجابة في نفس الطلب — لا حاجة
 * لجولة ثانية، وصورة الإجابة عادة ما تكون مُحمَّلة مسبقاً بفعل
 * getQuizAnswerMedia فيكون الكشف فورياً على الشاشة.
 */
export async function revealQuizAnswer(
  roomCode: string
): Promise<ActionResult<QuizAnswerContent>> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;

  if (room.game_state !== "question") return fail("لا يوجد سؤال معروض حالياً.");
  if (!room.active_cell_id) return fail("لا يوجد سؤال نشط.");

  const { data: cell } = await admin
    .from("quiz_session_questions")
    .select("answer_text, answer_image, answer_image_alt")
    .eq("id", room.active_cell_id)
    .eq("room_code", ctx.roomCode)
    .maybeSingle();

  if (!cell) return fail("الخلية غير موجودة.");

  const { error } = await admin
    .from("quiz_rooms")
    .update({ game_state: "answer", is_timer_running: false })
    .eq("room_code", ctx.roomCode);

  if (error) return fail("تعذّر كشف الإجابة.");

  const signed = await signMedia(admin, [cell.answer_image]);

  return {
    success: true,
    data: {
      answer_text: cell.answer_text,
      answer_image_url: cell.answer_image ? signed[cell.answer_image] ?? null : null,
      answer_image_alt: cell.answer_image_alt,
    },
  };
}

/**
 * يُحضِّر رابط صورة الإجابة فقط، أثناء عرض السؤال — لتكون جاهزة عند الكشف.
 *
 * لا يُعاد أي نص إجابة هنا إطلاقاً. هذا هو المسار الوحيد الذي يرسل شيئاً
 * متعلقاً بالإجابة قبل أن يضغط الحكم "كشف الإجابة"، لذا نطاقه مقصود أن
 * يبقى بحقل واحد فقط — حتى يسهل التحقق أنه لا يسرّب نص الإجابة أبداً.
 */
export async function getQuizAnswerMedia(
  roomCode: string
): Promise<ActionResult<{ answer_image_url: string | null }>> {
  const ctx = await requireHost(roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;

  if (room.game_state !== "question" || !room.active_cell_id) {
    return { success: true, data: { answer_image_url: null } };
  }

  const { data: cell } = await admin
    .from("quiz_session_questions")
    .select("answer_image")
    .eq("id", room.active_cell_id)
    .eq("room_code", ctx.roomCode)
    .maybeSingle();

  if (!cell?.answer_image) return { success: true, data: { answer_image_url: null } };

  const signed = await signMedia(admin, [cell.answer_image]);
  return { success: true, data: { answer_image_url: signed[cell.answer_image] ?? null } };
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
    // "مضاعفة": إجابة صحيحة من صاحبها تضاعف نقاط هذا السؤال فقط
    const isDoubled = room.double_active_team === awarded;
    const gain = isDoubled ? points * 2 : points;
    // "الحفرة": إجابة صحيحة من صاحبها تخصم نفس قيمة السؤال (غير مضاعفة) من الخصم
    const usedPit = room.pit_active_team === awarded;

    if (awarded === 1) {
      t1Score += gain;
      if (usedPit) t2Score -= points;
    } else {
      t2Score += gain;
      if (usedPit) t1Score -= points;
    }
  }
  // لا أحد أجاب، أو أخطأ صاحب رهان أعمى (الحفرة/مضاعفة/دور إضافي) => لا تغيير في النقاط

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

  // "دور إضافي": إجابة صحيحة من صاحبها تُبقي الدور له؛ غير ذلك ينتقل الدور كالمعتاد
  const keepsTurn = awarded !== null && room.extra_turn_team === awarded;
  const nextTurn = keepsTurn ? room.turn : room.turn === 1 ? 2 : 1;

  const { error } = await admin
    .from("quiz_rooms")
    .update({
      t1_score: t1Score,
      t2_score: t2Score,
      turn: nextTurn,
      game_state: isOver ? "gameOver" : "board",
      active_cell_id: null,
      is_question_revealed: false,
      call_friend_active: false,
      pit_active_team: null,
      double_active_team: null,
      extra_turn_team: null,
      audience_active: false,
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

/**
 * تفعيل وسيلة مساعدة. القواعد الحاكمة (من يفعّل، ومتى) مصدرها سجل
 * QUIZ_LIFELINES في constants/quiz-grid.ts — لا يوجد منطق توقيت هنا
 * غير مرتبط بذلك السجل، حتى لا يتباعد تعريف القاعدة عن تطبيقها.
 *
 * ملاحظة على "استريح": نشاطها المعكوس (activator: "waiting") يعني أن
 * الفريق الذي يستدعي الدالة هو الفريق **المنتظر**، لا صاحب الدور —
 * فهو من يعطّل لاعباً في الفريق المُجيب.
 */
export async function activateQuizLifeline(input: {
  roomCode: string;
  team: QuizTeam;
  kind: QuizLifelineKey;
  targetPlayerId?: string | null;
}): Promise<ActionResult> {
  const parsed = QuizLifelineSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "بيانات غير صحيحة.");

  const ctx = await requireHost(parsed.data.roomCode);
  if (!ctx.ok) return fail(ctx.error);
  const { admin, room } = ctx;

  const { team, kind, targetPlayerId } = parsed.data;
  const def = QUIZ_LIFELINES[kind];

  const owned = room[teamColumn(team, "lifelines")] as QuizLifelineKey[];
  const used = room[teamColumn(team, "lifelines_used")] as QuizLifelineKey[];
  const opponent: QuizTeam = team === 1 ? 2 : 1;

  if (!owned.includes(kind)) {
    return fail("هذا الفريق لم يختر هذه الوسيلة عند الإعداد.");
  }
  if (used.includes(kind)) {
    return fail("تم استخدام وسيلة المساعدة هذه مسبقاً.");
  }

  // من يملك حق التفعيل: صاحب الدور لمعظم الوسائل، والفريق المنتظر لـ"استريح"
  const requiredActivator = def.activator === "waiting" ? opponent : room.turn;
  if (team !== requiredActivator) {
    return fail(
      def.activator === "waiting"
        ? "استريح يُفعّلها الفريق المنتظر فقط، ضد الفريق الذي يجيب الآن."
        : "وسائل المساعدة تُستخدم في دور الفريق نفسه فقط."
    );
  }

  // التوقيت: رهانات اللوحة تُعلن قبل عرض السؤال، ووسائل السؤال أثناء عرضه
  if (def.phase === "board" && room.game_state !== "board") {
    return fail(`${def.label} تُستخدم من شاشة اللوحة قبل عرض السؤال.`);
  }
  if (def.phase === "question" && room.game_state !== "question") {
    return fail(`${def.label} تُستخدم أثناء عرض السؤال فقط.`);
  }

  const patch: Record<string, unknown> = {
    [teamColumn(team, "lifelines_used")]: [...used, kind],
  };

  if (kind === "pit") {
    patch.pit_active_team = team;
  }

  if (kind === "double") {
    patch.double_active_team = team;
  }

  if (kind === "extraTurn") {
    patch.extra_turn_team = team;
  }

  if (kind === "audience") {
    patch.audience_active = true;
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
    if (!targetPlayerId) return fail("اختر لاعباً من الفريق المُجيب.");

    const { data: target } = await admin
      .from("quiz_session_players")
      .select("id, team")
      .eq("id", targetPlayerId)
      .eq("room_code", ctx.roomCode)
      .maybeSingle();

    if (!target) return fail("اللاعب غير موجود في هذه الغرفة.");
    // "استريح" يستهدف لاعباً في الفريق المُجيب (صاحب الدور)، لا فريق المُفعِّل نفسه
    if (target.team !== room.turn) {
      return fail("يجب اختيار لاعب من الفريق الذي يجيب الآن.");
    }

    patch.rest_target_player_id = targetPlayerId;
  }

  const { error } = await admin.from("quiz_rooms").update(patch).eq("room_code", ctx.roomCode);
  if (error) {
    console.error("activateQuizLifeline error:", error);
    return fail("تعذّر تفعيل وسيلة المساعدة.");
  }

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
