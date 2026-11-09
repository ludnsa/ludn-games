/**
 * ثيم الحلبة لخلية الحروف — شكل بس، ملف واحد للوحات والأزرار والألوان والصور.
 * لوحات داكنة شبه شفافة مع blur وحدود ذهبية خفيفة. الفريقين بنفس ألوانهم (أخضر وأحمر) مع لمعة وتوهج.
 */
import type { HiveTeam } from "@/lib/game/letters-hive-engine";

const IMG = "/games/letters-hive/cards";

/** الشعار وكروت الفوز */
export const HIVE_ICON = `${IMG}/hive_icon.webp`;
export const HIVE_WIN_ART: Record<HiveTeam, { card: string; icon: string; glow: string }> = {
  green: { card: `${IMG}/green_wins.webp`, icon: `${IMG}/green_wins_icon.webp`, glow: "#22c55e" },
  red: { card: `${IMG}/red_wins.webp`, icon: `${IMG}/red_wins_icon.webp`, glow: "#ef4444" },
};

/** زجاج داكن بدون حد */
export const HV_GLASS =
  "bg-[#0e0a04]/65 backdrop-blur-md shadow-[0_0_34px_-12px_rgba(251,191,36,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]";

/** لوحة زجاج داكنة بحد ذهبي خفيف */
export const HV_PANEL = `${HV_GLASS} border border-amber-300/25`;

/** نافذة فوق الشاشة (الإعدادات) */
export const HV_MODAL =
  "bg-[#140e05]/95 backdrop-blur-xl border border-amber-300/35 shadow-[0_0_60px_-12px_rgba(251,191,36,0.55)]";

/** خلفية النوافذ */
export const HV_BACKDROP = "bg-[#060402]/80 backdrop-blur-md";

/** الزر الأساسي: عسلي لامع */
export const HV_BTN_PRIMARY =
  "bg-linear-to-b from-amber-200 via-amber-400 to-amber-500 hover:brightness-110 text-[#2a1503] border-b-4 border-amber-800 shadow-[0_0_26px_-6px_rgba(251,191,36,0.75)] active:border-b-0 active:translate-y-1 transition-all";

/** زر ثانوي زجاجي */
export const HV_BTN_GLASS =
  "bg-white/10 hover:bg-white/15 text-amber-50 border border-white/15 border-b-4 border-b-black/40 backdrop-blur-sm active:border-b active:translate-y-[3px] transition-all";

/** حقل كتابة */
export const HV_INPUT =
  "bg-black/40 border-2 border-white/10 text-white placeholder:text-white/35 focus:border-amber-400 outline-none transition-colors";

/** النص الثانوي */
export const HV_MUTED = "text-amber-50/65";

/**
 * ألوان الفريقين:
 * - card: بطاقة الفريق (النتيجة والفوز) — لوحة غامقة شبه شفافة بحد بلون الفريق وتوهج خفيف (مثل تحدي الفئات)
 * - score: الرقم بلون الفريق ويتوهج، goal: سطر "يوصّل من..."
 * - button: أزرار التلوين عند المقدم (تبقى بلون الفريق المليان عشان تنضغط بسرعة)
 */
export const HV_TEAM: Record<HiveTeam, { card: string; score: string; goal: string; button: string; text: string }> = {
  green: {
    card: "bg-[#06120a]/70 backdrop-blur-md border-2 border-green-400/70 shadow-[0_0_30px_-8px_rgba(74,222,128,0.75),inset_0_1px_0_rgba(255,255,255,0.06)]",
    score: "text-green-400 [text-shadow:0_0_18px_rgba(74,222,128,0.85)]",
    goal: "text-green-200/75",
    button:
      "bg-linear-to-b from-green-500 to-green-700 border-green-900 shadow-[0_0_24px_-6px_rgba(34,197,94,0.8),inset_0_1px_0_rgba(255,255,255,0.35)]",
    text: "text-green-300",
  },
  red: {
    card: "bg-[#140606]/70 backdrop-blur-md border-2 border-red-400/70 shadow-[0_0_30px_-8px_rgba(248,113,113,0.75),inset_0_1px_0_rgba(255,255,255,0.06)]",
    score: "text-red-400 [text-shadow:0_0_18px_rgba(248,113,113,0.85)]",
    goal: "text-red-200/75",
    button:
      "bg-linear-to-b from-red-500 to-red-700 border-red-900 shadow-[0_0_24px_-6px_rgba(239,68,68,0.8),inset_0_1px_0_rgba(255,255,255,0.35)]",
    text: "text-red-300",
  },
};

/** الحرف المختار (مربع الحرف عند المقدم وفوق في شاشة العرض): أبيض/ذهبي فاتح يتوهج، مختلف عن الخلايا العسلية */
export const HV_ACTIVE_LETTER =
  "bg-linear-to-b from-white to-amber-100 text-[#3b1f04] border-2 border-white hv-letter-glow";
