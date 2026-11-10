/**
 * ثيم مداقش — شكل بس، ملف واحد للوحات والأزرار والألوان والصور (نفس فكرة quizUi لتحدي الفئات).
 * كحلي غامق (#0f1526 / #1b2338) وأحمر (#b3202a) وذهبي (#d6a531)، مع توهج نيون خفيف أحمر وذهبي.
 * اللوحات زجاج غامق شبه شفاف فوق خلفية المسرح (app/games/madaqesh/layout.tsx).
 */

const IMG = "/games/madaqesh";

/** شعار اللعبة (الشخصية في دائرة) */
export const MQ_ICON = `${IMG}/madaqesh_icon.webp`;

/** غلاف الصفحة: الخلفية من layout.tsx، فهنا بدون أي لون */
export const MQ_MAIN = "min-h-[100dvh] text-white p-4 md:p-6 flex flex-col relative z-10";

/** زجاج غامق بدون حد */
export const MQ_GLASS =
  "bg-[#0f1526]/75 backdrop-blur-md shadow-[0_0_30px_-10px_rgba(214,165,49,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]";

/** اللوحة الأساسية: زجاج كحلي بحد ذهبي خفيف */
export const MQ_PANEL = `${MQ_GLASS} border border-[#d6a531]/30`;

/** لوحة "دورك" (السوم والقرار والرد): حد أحمر وتوهج أحمر */
export const MQ_PANEL_HOT = "!border-[#b3202a]/90 shadow-[0_0_34px_-8px_rgba(179,32,42,0.85),inset_0_1px_0_rgba(255,255,255,0.06)]";

/** لوحة المداقشة */
export const MQ_PANEL_FIGHT = "!border-[#b3202a]/70 shadow-[0_0_30px_-10px_rgba(179,32,42,0.75),inset_0_1px_0_rgba(255,255,255,0.06)]";

/** صف داخل اللوحة (لاعب، رد، إعداد) */
export const MQ_TILE = "bg-[#1b2338]/85 border border-white/5";

/** خانة أغمق (ملخص، مبلغ، شرح) */
export const MQ_WELL = "bg-[#0b1020]/80 border border-white/5";

/** النص الثانوي (مقروء فوق الزجاج) */
export const MQ_MUTED = "text-slate-300/80";

/** الذهبي للأرقام والعناوين المهمة */
export const MQ_GOLD = "text-[#e9bd4c]";
export const MQ_GOLD_GLOW = "text-[#e9bd4c] [text-shadow:0_0_18px_rgba(214,165,49,0.6)]";

/** مختار / مفعّل (أزرار الخيارات، الترتيب، الفايز) */
export const MQ_SELECTED = "bg-[#d6a531] border-[#8a6414] text-[#1a1204] shadow-[0_0_18px_-4px_rgba(214,165,49,0.8)]";

/** غير مختار */
export const MQ_UNSELECTED = "bg-[#1b2338]/90 border-[#070a14] text-white";

/** صف فيه خطر/مداقشة (ثابت، اعترض) */
export const MQ_DANGER_TILE = "bg-[#b3202a]/20 border border-[#b3202a]/60";

/** نافذة من تحت (الترتيب، السجل، قائمة المنشئ) */
export const MQ_MODAL =
  "bg-[#0f1526]/95 backdrop-blur-xl border border-[#d6a531]/35 shadow-[0_0_60px_-12px_rgba(179,32,42,0.6)]";

/** خلفية النوافذ */
export const MQ_BACKDROP = "bg-[#05070f]/80 backdrop-blur-md";

/** زر صغير مربع (الترتيب، السجل، الخروج) */
export const MQ_ICON_BTN =
  "w-11 h-11 rounded-2xl bg-[#1b2338]/90 border border-white/10 border-b-4 border-b-[#070a14] flex items-center justify-center text-slate-100 shadow-[0_0_16px_-6px_rgba(214,165,49,0.5)]";

/** زر صغير ثانوي (سحب عشوائي، تعديل، تبويب) */
export const MQ_SMALL_BTN = "bg-[#1b2338]/90 border border-white/10 border-b-4 border-b-[#070a14]";

/** حقل كتابة */
export const MQ_INPUT =
  "bg-[#0b1020]/85 border-2 border-white/10 focus:border-[#d6a531] text-white placeholder:text-slate-500 outline-none transition-colors";

const PRESS = "active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed";

/** الأزرار الكبيرة: ذهبي (الأساسي)، أحمر (الخطر)، زجاجي (الثانوي) */
export const MQ_BTN = {
  primary: `w-full py-4 bg-linear-to-b from-[#f0c75a] to-[#d6a531] hover:brightness-110 text-[#1a1204] font-black text-lg rounded-2xl border-b-4 border-[#8a6414] shadow-[0_0_24px_-6px_rgba(214,165,49,0.8)] ${PRESS}`,
  danger: `w-full py-4 bg-linear-to-b from-[#d1323c] to-[#b3202a] hover:brightness-110 text-white font-black text-lg rounded-2xl border-b-4 border-[#6e1218] shadow-[0_0_24px_-6px_rgba(179,32,42,0.85)] ${PRESS}`,
  ghost: `w-full py-3.5 bg-white/10 hover:bg-white/15 text-white font-black rounded-2xl border border-white/15 border-b-4 border-b-black/40 ${PRESS}`,
} as const;
