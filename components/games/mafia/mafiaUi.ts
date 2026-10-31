/**
 * شكل لعبة المافيا بهوية لدن — اللعبة ليلية دايماً (الصفحة والنوافذ عليها كلاس dark).
 * مقاسات موحدة لكل الشاشات، فنفس الشي يطلع بنفس المقاس بكل مكان:
 *
 * الخط: العناوين والأرقام بخط لالزار (font-display)
 *   عنوان الصفحة 46 · سؤال الدور 27 · عنوان المرحلة والمربعات 24 · النص 15 · التسميات 13 · الملاحظات 12
 * المربعات: الكبيرة 22 · الداخلية 16 · أزرار الأسماء 14
 * الأزرار: الأساسي ذهبي 54 · الثانوي 44 · أزرار الشريط العلوي 38
 */

export const CARD = "rounded-[22px] bg-ludn-surface/90 border border-ludn-line p-4";
export const INSET = "rounded-2xl bg-ludn-surface-2 border border-ludn-line";

export const H_PAGE = "font-display text-[46px] leading-[1.1]";
export const H_PROMPT = "font-display text-[27px] leading-tight text-center text-balance";
export const H_CARD = "font-display text-2xl leading-tight";
export const TEXT = "text-[15px] font-black leading-snug";
export const LABEL = "text-[13px] font-bold text-ludn-muted";
export const NOTE = "text-center text-xs font-bold text-ludn-muted";

const BTN_BASE =
  "flex items-center justify-center gap-2 font-black transition-[transform,background-color,border-color] active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100";
// المعطّل لونه صلب (مو شفاف) — الزر الثابت تحت الشاشة ما يبان اللي وراه
const BTN_BIG_DISABLED = "disabled:bg-ludn-surface-2 disabled:text-ludn-muted disabled:shadow-none";
export const BTN_GOLD = `${BTN_BASE} w-full min-h-[54px] px-5 rounded-2xl text-[17px] bg-ludn-gold text-ludn-gold-ink shadow-[0_8px_22px_var(--ludn-glow)] ${BTN_BIG_DISABLED}`;
export const BTN_DANGER = `${BTN_BASE} w-full min-h-[54px] px-5 rounded-2xl text-[17px] bg-rose-600 text-white ${BTN_BIG_DISABLED}`;
export const BTN_SOFT = `${BTN_BASE} min-h-11 px-3 rounded-[14px] text-sm bg-ludn-surface-2 border border-ludn-line text-ludn-fg hover:border-white/20 disabled:opacity-40`;
export const BAR_BTN =
  "h-[38px] min-w-[38px] px-2.5 rounded-xl bg-ludn-surface-2 border border-ludn-line text-ludn-fg flex items-center justify-center gap-1.5 text-[13px] font-black select-none";

export const FIELD =
  "w-full min-h-12 rounded-[14px] border border-ludn-line bg-ludn-surface-2 px-3.5 text-base font-bold text-ludn-fg outline-none transition-colors placeholder:text-ludn-muted placeholder:font-semibold focus:border-ludn-gold";

export const CHIP =
  "inline-flex items-center gap-1.5 ps-1 pe-2.5 py-0.5 rounded-full bg-ludn-surface-2 border border-ludn-line text-[12.5px] font-black";

/** سطر تنبيه ذهبي (انتظار، تعليمات) */
export const INFO = "rounded-2xl p-2.5 text-center text-[13px] font-black text-ludn-gold-text bg-ludn-gold/8 border border-ludn-gold/25";
/** سطر خطأ */
export const ERROR = "flex items-center gap-2 rounded-2xl p-2.5 text-[13px] font-bold text-rose-200 bg-rose-500/10 border border-rose-500/30";

/** الزر الأساسي ثابت تحت الشاشة وقت السكرول (يمتد على حواف الصفحة: p-4) */
export const CTA_BAR =
  "sticky bottom-0 z-10 -mx-4 px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom,0px))] bg-linear-to-t from-ludn-bg from-55% to-transparent";

/** ألوان دوائر اللاعبين (أول حرف من الاسم) — حسب الترتيب، ثابتة لكل لاعب */
const AVATAR_COLORS = ["#e2b84a", "#e59a6b", "#7fc8a9", "#9fb5f0", "#e58fa8", "#c7a7ef", "#8fd0e0", "#f0c987", "#a9d58b", "#efa3a3"];
export const avatarColor = (seat: number) => AVATAR_COLORS[Math.abs(seat) % AVATAR_COLORS.length];
