export const MADAQESH_GAME = {
  id: "madaqesh",
  slug: "madaqesh",
  title: "حاسبة مداقش",
  description: "حاسبة ذكية للمداقشة: سوم، توزيع، تثبيت ومداقشة — والأرصدة تنحسب لحالها على جوالات الكل.",
  path: "/games/madaqesh",
  /** مسار انضمام اللاعبين — /join معفى من تسجيل الدخول في middleware.ts */
  joinPath: "/games/madaqesh/join",
  color: "amber",
} as const;

export const MADAQESH_CONFIG = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 12,

  /** خيارات رصيد البداية ومبلغ الفوز (والمنشئ يقدر يكتب أي رقم) */
  START_BALANCE_OPTIONS: [30_000, 50_000, 100_000] as readonly number[],
  TARGET_OPTIONS: [500_000, 1_000_000, 2_000_000] as readonly number[],
  BANKRUPT_OPTIONS: [1, 2, 3] as readonly number[],

  DEFAULT_START_BALANCE: 30_000,
  DEFAULT_TARGET: 1_000_000,
  DEFAULT_MAX_BANKRUPTS: 2,

  /** اللي يفلس يرجع رصيده لهذا المبلغ */
  REVIVE_BALANCE: 5_000,

  /** التقسيم بالتساوي ينقرّب لهذي الوحدة، والباقي لصاحب أقل رصيد */
  SPLIT_UNIT: 500,

  /** أقل فتح للسوم، وكل سومة لازم تكون من مضاعفات BID_STEP */
  MIN_OPEN_BID: 1_000,
  BID_STEP: 500,

  /** أزرار الرفع السريع في السوم */
  RAISE_STEPS: [500, 1_000, 5_000, 10_000] as readonly number[],

  ROOM_CODE_PREFIX: "D",
  ROOM_CODE_LENGTH: 5,
} as const;

/** ترتيب القوى في المداقشة — من الأقوى للأضعف */
export const MADAQESH_HAND_RANKS = [
  { title: "أربع متشابهة", example: "أربع إكك، أربع شيبان، أربع بنات…" },
  { title: "نوعين / نوعين", example: "إكتين + شايبين، عشرتين + بنتين…" },
  { title: "ثلاث متشابهة", example: "ثلاث إكك، ثلاث شيبان، ثلاث بنات…" },
  { title: "نوع واحد", example: "إكتين، شايبين، بنتين…" },
  { title: "ولا شي متشابه", example: "يفوز الأعلى ورق" },
] as const;

/** ترتيب الورق من الأكبر للأصغر */
export const MADAQESH_CARD_ORDER = ["إكة", "شايب", "بنت", "ولد", "10", "9", "8", "7", "6", "5", "4", "3", "2"] as const;

/** ترتيب اللاعبين في الإعدادات */
export const MADAQESH_ORDINALS = [
  "الأول",
  "الثاني",
  "الثالث",
  "الرابع",
  "الخامس",
  "السادس",
  "السابع",
  "الثامن",
  "التاسع",
  "العاشر",
  "الحادي عشر",
  "الثاني عشر",
] as const;

export const MADAQESH_BOT_NAMES =["بوت فهد", "بوت سعد", "بوت نورة", "بوت ريم", "بوت ماجد", "بوت هيا"] as const;

/** تنسيق المبالغ: 1,250,000 */
export function formatMoney(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
