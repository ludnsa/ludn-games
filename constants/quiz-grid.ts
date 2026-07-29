import type { QuizPoints } from "@/types";

/**
 * المصدر الوحيد لهوية لعبة "تحدي الفئات".
 *
 * ⚠️ الاسم والـ slug مؤقتان بانتظار اعتماد المالك.
 * لتغييرهما لاحقاً عدّل هذا الملف فقط — بقية المنصة تقرأ من هنا.
 * ملاحظة: تغيير `id` يعني أن سجلات user_games القديمة لن تُطابق،
 * وتغيير `slug` يتطلب إعادة تسمية مجلدات app/games و app/admin.
 */
export const QUIZ_GAME = {
  /** يُستخدم كـ user_games.game_id في نظام الباقات والرصيد */
  id: "quiz-grid",
  slug: "quiz-grid",
  title: "تحدي الفئات",
  description: "لوحة فئات ومعلومات، فريقان يتنافسان على 36 سؤالاً مع وسائل مساعدة تقلب الموازين.",
  path: "/games/quiz-grid",
  /** مسار انضمام اللاعبين — لاحظ أن /join معفى من تسجيل الدخول في middleware.ts */
  joinPath: "/games/quiz-grid/join",
  adminPath: "/admin/quiz-grid",
  color: "violet",
} as const;

export const QUIZ_CONFIG = {
  /** عدد الفئات التي يختارها الحكم في كل جلسة */
  CATEGORIES_PER_SESSION: 6,
  /** الفئات السعرية للأسئلة */
  TIERS: [200, 400, 600] as readonly QuizPoints[],
  /** عدد الأسئلة لكل فئة سعرية داخل كل عمود */
  PER_TIER: 2,
  /** ترتيب الخلايا داخل العمود من أعلى لأسفل: 200,200,400,400,600,600 */
  COLUMN_LAYOUT: [200, 200, 400, 400, 600, 600] as readonly QuizPoints[],
  /** مدة السؤال بالثواني */
  TIMER_SECONDS: 60,
  /** الثواني الإضافية عند استخدام "اتصال بصديق" */
  CALL_FRIEND_BONUS: 30,
  /** عند هذه الثواني يتحول المؤقت للأحمر مع نبض */
  TIMER_DANGER_SECONDS: 10,
  /** صلاحية الروابط الموقّعة لصور اللعبة (بالثواني) */
  SIGNED_URL_TTL: 60 * 60 * 4,
  /** اسم الـ bucket الخاص بصور اللعبة */
  MEDIA_BUCKET: "quiz-media",
} as const;

/** إجمالي عدد الخلايا في اللوحة (6 فئات × 6 أسئلة) */
export const QUIZ_TOTAL_CELLS =
  QUIZ_CONFIG.CATEGORIES_PER_SESSION * QUIZ_CONFIG.COLUMN_LAYOUT.length;

/** الأسماء العربية لوسائل المساعدة كما تظهر على الشاشات */
export const QUIZ_LIFELINE_LABELS = {
  call: "اتصال بصديق",
  pit: "الحفرة",
  rest: "استريح",
} as const;

export const QUIZ_LIFELINE_HINTS = {
  call: "بعد كشف السؤال — يضيف 30 ثانية",
  pit: "قبل كشف السؤال — الإجابة الصحيحة تكسبكم النقاط وتخصمها من الخصم",
  rest: "بعد كشف السؤال — يمنع لاعباً من الفريق الخصم من الإجابة",
} as const;
