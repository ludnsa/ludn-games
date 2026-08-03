import type { QuizLifelineKey, QuizPoints } from "@/types";

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

// ---------------------------------------------------------------
// سجل وسائل المساعدة — مصدر واحد تقرأ منه الواجهة والسيرفر قواعد
// التوقيت والتفعيل، حتى لا يتكرر منطق "من يملك حق التفعيل ومتى"
// في كل مكان.
// ---------------------------------------------------------------

export const QUIZ_LIFELINE_KEYS: readonly QuizLifelineKey[] = [
  "call",
  "pit",
  "rest",
  "double",
  "extraTurn",
  "audience",
] as const;

/** كل فريق يختار 3 من أصل 6 وسائل مساعدة عند الإعداد */
export const QUIZ_LIFELINES_PER_TEAM = 3;

export interface QuizLifelineDef {
  key: QuizLifelineKey;
  label: string;
  hint: string;
  /**
   * "board" = رهان أعمى يُعلن من شاشة اللوحة قبل عرض السؤال (الحفرة، مضاعفة، دور إضافي).
   * "question" = وسيلة تُستخدم أثناء عرض السؤال (اتصال بصديق، استريح، استشارة الجمهور).
   */
  phase: "board" | "question";
  /**
   * "active" = يفعّلها الفريق صاحب الدور.
   * "waiting" = يفعّلها الفريق المنتظر، ضد الفريق صاحب الدور — الحالة الوحيدة هي "استريح":
   * الفريق الذي لا يجيب هو من يستفيد من تعطيل لاعب في الفريق المُجيب.
   */
  activator: "active" | "waiting";
}

export const QUIZ_LIFELINES: Record<QuizLifelineKey, QuizLifelineDef> = {
  call: {
    key: "call",
    label: "اتصال بصديق",
    hint: "أثناء عرض السؤال — يضيف 30 ثانية للتفكير",
    phase: "question",
    activator: "active",
  },
  pit: {
    key: "pit",
    label: "الحفرة",
    hint: "قبل عرض السؤال — إجابة صحيحة تكسبكم النقاط وتخصمها من الخصم، والخطأ بلا تغيير",
    phase: "board",
    activator: "active",
  },
  rest: {
    key: "rest",
    label: "استريح",
    hint: "أثناء عرض السؤال — يمنع لاعباً من الفريق المُجيب من الإجابة",
    phase: "question",
    activator: "waiting",
  },
  double: {
    key: "double",
    label: "مضاعفة",
    hint: "قبل عرض السؤال — إجابة صحيحة تُضاعف النقاط، والخطأ بلا تغيير",
    phase: "board",
    activator: "active",
  },
  extraTurn: {
    key: "extraTurn",
    label: "دور إضافي",
    hint: "قبل عرض السؤال — إجابة صحيحة تُبقي الدور لنفس الفريق",
    phase: "board",
    activator: "active",
  },
  audience: {
    key: "audience",
    label: "استشارة الجمهور",
    hint: "أثناء عرض السؤال — دعوة الجميع في المجلس للمشاركة بالرأي لمدة 15 ثانية",
    phase: "question",
    activator: "active",
  },
};

export const QUIZ_LIFELINE_LIST: QuizLifelineDef[] = QUIZ_LIFELINE_KEYS.map(
  (key) => QUIZ_LIFELINES[key]
);

/** وصول سريع بالمفتاح — نفس الشكل الذي كان مستخدماً قبل السجل الموحّد */
export const QUIZ_LIFELINE_LABELS: Record<QuizLifelineKey, string> = QUIZ_LIFELINE_KEYS.reduce(
  (acc, key) => ({ ...acc, [key]: QUIZ_LIFELINES[key].label }),
  {} as Record<QuizLifelineKey, string>
);

export const QUIZ_LIFELINE_HINTS: Record<QuizLifelineKey, string> = QUIZ_LIFELINE_KEYS.reduce(
  (acc, key) => ({ ...acc, [key]: QUIZ_LIFELINES[key].hint }),
  {} as Record<QuizLifelineKey, string>
);
