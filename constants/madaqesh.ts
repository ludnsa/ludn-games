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

  /** التقسيم بالتساوي ينقرّب لهذي الوحدة، والباقي لصاحب القرار */
  SPLIT_UNIT: 100,

  /** أزرار الرفع السريع في السوم */
  RAISE_STEPS: [1_000, 5_000, 10_000, 50_000] as readonly number[],

  ROOM_CODE_PREFIX: "D",
  ROOM_CODE_LENGTH: 5,
} as const;

export const MADAQESH_BOT_NAMES = ["بوت فهد", "بوت سعد", "بوت نورة", "بوت ريم", "بوت ماجد", "بوت هيا"] as const;

/** تنسيق المبالغ: 1,250,000 */
export function formatMoney(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
