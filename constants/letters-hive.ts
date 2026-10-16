/**
 * المصدر الوحيد لهوية لعبة "خلية الحروف".
 * لوحة للمقدم بس: يسأل من عنده، ويلوّن الخلية للفريق اللي جاوب صح.
 * وشاشة العرض تنفتح بنافذة ثانية من نفس الجهاز (اللابتوب) وتنعرض على الشاشة الكبيرة.
 */
export const LETTERS_HIVE_GAME = {
  id: "letters-hive",
  slug: "letters-hive",
  title: "خلية الحروف",
  description: "لوحة خلية الحروف للمقدم: سؤال لكل حرف، والفريق اللي يوصّل خطه أول يفوز — مع شاشة عرض للشاشة الكبيرة.",
  path: "/games/letters-hive",
  /** شاشة العرض — /display معفى من تسجيل الدخول في middleware.ts */
  displayPath: "/games/letters-hive/display",
  color: "emerald",
} as const;

export const LETTERS_HIVE_CONFIG = {
  ROWS: 5,
  COLS: 5,
  TEAM_NAME_MAX: 20,
  /** الحروف الأساسية (25 حرف = عدد الخلايا) — بدون الحروف الصعبة */
  LETTERS: [
    "أ", "ب", "ت", "ج", "ح", "خ", "د", "ر", "ز", "س", "ش", "ص", "ض",
    "ط", "ع", "غ", "ف", "ق", "ك", "ل", "م", "ن", "هـ", "و", "ي",
  ] as readonly string[],
  /** الحروف الصعبة — لو المنشئ فعّلها، تنخلط مع الباقي والنظام يختار منها 25 */
  HARD_LETTERS: ["ث", "ذ", "ظ"] as readonly string[],
} as const;

export const LETTERS_HIVE_TEAMS = {
  green: {
    defaultName: "الفريق الأخضر",
    emoji: "🟩",
    /** ضلعه فوق وتحت: يوصّل من الأعلى للأسفل */
    goal: "من فوق لتحت",
    fill: "#16a34a",
    frame: "#15803d",
  },
  red: {
    defaultName: "الفريق الأحمر",
    emoji: "🟥",
    /** ضلعه يمين ويسار: يوصّل من اليمين لليسار */
    goal: "من اليمين لليسار",
    fill: "#dc2626",
    frame: "#dc2626",
  },
} as const;
