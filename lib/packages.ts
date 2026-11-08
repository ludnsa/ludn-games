import { MAFIA_GAME } from "@/constants/mafia";
import { QUIZ_GAME } from "@/constants/quiz-grid";
import { MADAQESH_GAME } from "@/constants/madaqesh";
import { LETTERS_HIVE_GAME } from "@/constants/letters-hive";

/**
 * الباقات: اشتراك بمدة (شهر / 3 شهور / سنة) مفتوح لكل الألعاب.
 * الباقات القديمة (رصيد ألعاب) مخفية: ما تطلع بصفحة الباقات، بس تظل هنا عشان
 * أي دفعة قديمة بالطريق تنحسب صح — والرصيد القديم يظل شغال لين يخلص.
 */
export interface PackageData {
  id: number;
  name: string;
  price: number;
  kind: "subscription" | "tokens";
  /** الاشتراك: مدته بالأيام */
  days?: number;
  /** الاشتراك: كم شهر (للعرض: السعر بالشهر والتوفير) */
  months?: number;
  /** الرصيد القديم: كم لعبة */
  tokens?: number;
  /** شارة فوق الباقة */
  badge?: string;
  /** باقة قديمة: ما تطلع بصفحة الباقات */
  legacy?: boolean;
}

export const GAME_PACKAGES: PackageData[] = [
  { id: 4, name: "شهر", kind: "subscription", days: 30, months: 1, price: 25 },
  { id: 5, name: "3 شهور", kind: "subscription", days: 90, months: 3, price: 65 },
  { id: 6, name: "سنة", kind: "subscription", days: 365, months: 12, price: 125, badge: "الأوفر" },

  { id: 1, name: "لعبة واحدة", kind: "tokens", tokens: 1, price: 10, legacy: true },
  { id: 2, name: "ثلاث ألعاب", kind: "tokens", tokens: 3, price: 30, legacy: true },
  { id: 3, name: "خمسة ألعاب", kind: "tokens", tokens: 5, price: 45, legacy: true },
];

/** الباقات اللي تطلع للناس */
export const SUBSCRIPTION_PLANS = GAME_PACKAGES.filter((p) => !p.legacy);

/** الألعاب اللي يفتحها الاشتراك (كلها) — وكل وحدة منها لها تجربة مجانية */
export const PAID_GAME_TITLES = [
  QUIZ_GAME.title,
  "المزاد",
  "حرب القلاع",
  "السيطرة على العالم",
  MAFIA_GAME.title,
  MADAQESH_GAME.title,
  LETTERS_HIVE_GAME.title,
];

export const getPackageById = (id: number): PackageData | undefined => {
  return GAME_PACKAGES.find((pkg) => pkg.id === id);
};

/** سعر الاشتراك الشهري — أساس حساب التوفير */
const MONTHLY_PRICE = SUBSCRIPTION_PLANS.find((p) => p.months === 1)?.price ?? 0;

/** كم يطلع بالشهر (رقم عشري وحد) */
export const pricePerMonth = (p: PackageData): number => Math.round((p.price / (p.months ?? 1)) * 10) / 10;

/** كم يوفر مقارنة بالشهري (0 = ما فيه توفير) */
export const planSaving = (p: PackageData): number => Math.max(0, MONTHLY_PRICE * (p.months ?? 1) - p.price);

/** الاشتراك فعّال؟ */
export const isSubscriptionActive = (endsAt: string | null | undefined): boolean =>
  Boolean(endsAt && Date.parse(endsAt) > Date.now());

/** كم يوم باقي على نهاية الاشتراك (0 لو منتهي) */
export const subscriptionDaysLeft = (endsAt: string | null | undefined): number =>
  endsAt ? Math.max(0, Math.ceil((Date.parse(endsAt) - Date.now()) / 86_400_000)) : 0;

/** تاريخ نهاية الاشتراك بتوقيت السعودية: "3 ديسمبر 2026" */
export const formatPlanDate = (iso: string): string =>
  new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(new Date(iso));
