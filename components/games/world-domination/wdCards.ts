/**
 * صور البطاقات التكتيكية في السيطرة على العالم — شكل بس.
 * المفاتيح نفس مفاتيح cards1 / cards2 في حالة اللعبة، والترتيب نفس ترتيبها القديم في الصناديق.
 */
export type WDCardKey = "capture" | "protect" | "airStrike" | "capitalCapture" | "spy" | "nuke";

const BASE = "/games/world-domination/cards/";

export interface WDCardArt {
  /** الاسم المكتوب على الكرت */
  label: string;
  /** الاسم الكامل لو يختلف عن المكتوب على الكرت */
  name?: string;
  /** عنوان شاشة الكشف */
  title: string;
  icon: string;
  card: string;
  /** لون التوهج في الكشف */
  glow: string;
}

export const WD_CARDS: Record<WDCardKey, WDCardArt> = {
  capture: { label: "احتلال", title: "احتلال!", icon: `${BASE}occupy_icon.webp`, card: `${BASE}occupy.webp`, glow: "#60a5fa" },
  protect: { label: "حماية", title: "درع الحماية!", icon: `${BASE}shield_icon.webp`, card: `${BASE}shield.webp`, glow: "#34d399" },
  airStrike: { label: "قصف", title: "قصف مدمّر!", icon: `${BASE}bombard_icon.webp`, card: `${BASE}bombard.webp`, glow: "#fb923c" },
  capitalCapture: { label: "غزو", name: "غزو العاصمة", title: "غزو العاصمة!", icon: `${BASE}invasion_icon.webp`, card: `${BASE}invasion.webp`, glow: "#fbbf24" },
  spy: { label: "تجسس", title: "عملية تجسس!", icon: `${BASE}spy_icon.webp`, card: `${BASE}spy.webp`, glow: "#818cf8" },
  nuke: { label: "نووي", title: "ضربة نووية!", icon: `${BASE}nuke_icon.webp`, card: `${BASE}nuke.webp`, glow: "#ef4444" },
};

export const WD_CARD_ORDER: WDCardKey[] = ["capture", "protect", "airStrike", "capitalCapture", "spy", "nuke"];

/** العدد للعرض: النووي ما ينحفظ أحياناً في بداية اللعبة، واللعبة تعامله كواحد (نفس ?? 1 في منطق البطاقات) */
export function wdCardCount(cards: Record<string, unknown> | null | undefined, key: WDCardKey): number | undefined {
  const value = key === "nuke" ? (cards?.nuke ?? 1) : cards?.[key];
  return typeof value === "number" ? value : undefined;
}
