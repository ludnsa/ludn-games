/**
 * صور كروت المزاد — شكل بس.
 * الدبل والبيع والكمين أدوات بيد الفرق، والإفلاس والفرصة الأخيرة أحداث تطلع لها شاشة كشف.
 */
export type AuctionCardKey = "double" | "sell" | "ambush" | "bankrupt" | "lastchance";

const BASE = "/games/auction/cards/";

export interface AuctionCardArt {
  /** الاسم المكتوب على الكرت */
  label: string;
  /** عنوان شاشة الكشف */
  title: string;
  icon: string;
  card: string;
  /** لون التوهج في الكشف */
  glow: string;
}

export const AUCTION_CARDS: Record<AuctionCardKey, AuctionCardArt> = {
  double: { label: "دبل", title: "دبل!", icon: `${BASE}double_icon.webp`, card: `${BASE}double.webp`, glow: "#facc15" },
  sell: { label: "بيع السؤال", title: "بيع السؤال!", icon: `${BASE}sell_icon.webp`, card: `${BASE}sell.webp`, glow: "#f59e0b" },
  ambush: { label: "كمين", title: "كمين!", icon: `${BASE}ambush_icon.webp`, card: `${BASE}ambush.webp`, glow: "#a855f7" },
  bankrupt: { label: "إفلاس", title: "إفلاس!", icon: `${BASE}bankrupt_icon.webp`, card: `${BASE}bankrupt.webp`, glow: "#ef4444" },
  lastchance: { label: "الفرصة الأخيرة", title: "الفرصة الأخيرة!", icon: `${BASE}lastchance_icon.webp`, card: `${BASE}lastchance.webp`, glow: "#f97316" },
};

export const AUCTION_CARD_ORDER: AuctionCardKey[] = ["double", "sell", "ambush", "bankrupt", "lastchance"];
