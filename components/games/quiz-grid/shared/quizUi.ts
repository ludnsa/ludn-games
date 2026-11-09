/**
 * ثيم الاستوديو لتحدي الفئات — شكل بس، ملف واحد للوحات والأزرار والألوان.
 * لوحات داكنة شبه شفافة مع blur، وحدود نيون خفيفة (أزرق ووردي).
 * الفريق الأول أزرق (sky) والثاني وردي (rose). خانات اللوحة بألوان بعيدة عن الفريقين:
 * 200 أخضر نيون، 400 ذهبي، 600 بنفسجي.
 */

/** زجاج داكن بدون حد — للوحات اللي حدها بلون فريق */
export const QZ_GLASS =
  "bg-[#090b1f]/70 backdrop-blur-md shadow-[0_0_30px_-10px_rgba(236,72,153,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]";

/** لوحة زجاج داكنة: حد أزرق خفيف وتوهج وردي */
export const QZ_PANEL = `${QZ_GLASS} border border-cyan-300/25`;

/** نافذة فوق الشاشة (الباركود، الرسائل، اختيار لاعب "استريح") */
export const QZ_MODAL =
  "bg-[#0b0d26]/95 backdrop-blur-xl border border-cyan-300/30 shadow-[0_0_60px_-12px_rgba(236,72,153,0.6)]";

/** خلفية النوافذ */
export const QZ_BACKDROP = "bg-[#03040d]/80 backdrop-blur-md";

/** الزر الأساسي: تدرّج من الأزرق للوردي (ما يخص فريق) */
export const QZ_BTN_PRIMARY =
  "bg-linear-to-l from-fuchsia-600 to-cyan-600 hover:brightness-110 text-white border-b-4 border-[#140a33] shadow-[0_0_24px_-6px_rgba(217,70,239,0.7)] active:border-b-0 active:translate-y-[4px] transition-all";

/** زر ثانوي زجاجي */
export const QZ_BTN_GLASS =
  "bg-white/10 hover:bg-white/15 text-slate-100 border border-white/15 border-b-4 border-b-black/40 active:border-b active:translate-y-[3px] transition-all";

/** حقل كتابة */
export const QZ_INPUT =
  "bg-black/35 border-2 border-white/10 text-white placeholder:text-slate-500 outline-none transition-colors";

/** ألوان الفريقين */
export const QZ_TEAM = {
  1: {
    text: "text-sky-300",
    border: "border-sky-400/60",
    ring: "ring-sky-400",
    solid: "bg-sky-500 border-sky-700 text-white",
    glow: "shadow-[0_0_36px_-6px_rgba(56,189,248,0.85)]",
    active: "bg-sky-500/25 border-sky-300 text-white",
    chip: "bg-sky-400 text-slate-950",
    soft: "bg-sky-500/15 text-sky-100",
  },
  2: {
    text: "text-rose-300",
    border: "border-rose-400/60",
    ring: "ring-rose-400",
    solid: "bg-rose-500 border-rose-700 text-white",
    glow: "shadow-[0_0_36px_-6px_rgba(251,113,133,0.85)]",
    active: "bg-rose-500/25 border-rose-300 text-white",
    chip: "bg-rose-400 text-slate-950",
    soft: "bg-rose-500/15 text-rose-100",
  },
} as const;

/** خانات اللوحة (نيون) حسب القيمة */
export const QZ_TIER: Record<number, { cell: string; chip: string }> = {
  200: {
    cell: "bg-emerald-400/10 hover:bg-emerald-400/20 border-emerald-400/80 text-emerald-300 shadow-[0_0_18px_-4px_rgba(52,211,153,0.75)] [text-shadow:0_0_14px_rgba(52,211,153,0.9)]",
    chip: "bg-emerald-400/15 border border-emerald-400/70 text-emerald-200",
  },
  400: {
    cell: "bg-yellow-300/10 hover:bg-yellow-300/20 border-yellow-300/80 text-yellow-200 shadow-[0_0_18px_-4px_rgba(253,224,71,0.7)] [text-shadow:0_0_14px_rgba(253,224,71,0.85)]",
    chip: "bg-yellow-300/15 border border-yellow-300/70 text-yellow-100",
  },
  600: {
    cell: "bg-purple-400/10 hover:bg-purple-400/20 border-purple-400/80 text-purple-300 shadow-[0_0_18px_-4px_rgba(192,132,252,0.8)] [text-shadow:0_0_14px_rgba(192,132,252,0.95)]",
    chip: "bg-purple-400/15 border border-purple-400/70 text-purple-200",
  },
};
