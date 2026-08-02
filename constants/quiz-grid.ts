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
  description: "لوحة فئات ومعلومات، فريقان يتنافسان مع وسائل مساعدة تقلب الموازين.",
  path: "/games/quiz-grid",
  /** مسار انضمام اللاعبين — لاحظ أن /join معفى من تسجيل الدخول في middleware.ts */
  joinPath: "/games/quiz-grid/join",
  adminPath: "/admin/quiz-grid",
  color: "violet",
} as const;

export const QUIZ_CONFIG = {
  /** أقل وأكثر عدد فئات يمكن للحكم اختياره، والقيمة الافتراضية عند الإعداد */
  MIN_CATEGORIES: 2,
  MAX_CATEGORIES: 6,
  DEFAULT_CATEGORIES: 6,
  /** الفئات السعرية للأسئلة */
  TIERS: [200, 400, 600] as readonly QuizPoints[],
  /** عدد الأسئلة لكل فئة سعرية داخل كل عمود */
  PER_TIER: 2,
  /** ترتيب الخلايا داخل العمود من أعلى لأسفل: 200,200,400,400,600,600 */
  COLUMN_LAYOUT: [200, 200, 400, 400, 600, 600] as readonly QuizPoints[],
  /** خيارات سريعة لمدة السؤال في شاشة الإعداد (بالثواني) */
  TIMER_PRESETS: [30, 45, 60, 90, 120] as readonly number[],
  /** الحدود الدنيا والعليا لمدة السؤال، ومدة السؤال الافتراضية */
  TIMER_MIN: 15,
  TIMER_MAX: 300,
  TIMER_DEFAULT: 60,
  /** الثواني الإضافية عند استخدام "اتصال بصديق" */
  CALL_FRIEND_BONUS: 30,
  /** صلاحية الروابط الموقّعة لصور اللعبة (بالثواني) */
  SIGNED_URL_TTL: 60 * 60 * 4,
  /** اسم الـ bucket الخاص بصور اللعبة */
  MEDIA_BUCKET: "quiz-media",
} as const;

/** إجمالي عدد الخلايا في اللوحة حسب عدد الفئات المختارة (كل فئة = 6 خلايا) */
export function quizTotalCells(categoryCount: number): number {
  return categoryCount * QUIZ_CONFIG.COLUMN_LAYOUT.length;
}

/**
 * عتبة "الخطر" (الأحمر + النبض) للمؤقت، نسبةً لمدة السؤال المختارة.
 * بحد أقصى 10 ثوانٍ، حتى لا يظل المؤقت أحمر لمعظم مدته عند اختيار
 * مدة قصيرة (مثلاً 15 ثانية).
 */
export function quizTimerDangerAt(timerSeconds: number): number {
  return Math.min(10, Math.ceil(timerSeconds / 4));
}

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
