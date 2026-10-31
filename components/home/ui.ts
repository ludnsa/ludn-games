/** كلاسات مشتركة للواجهة العامة (الرئيسية والصفحات الداخلية) — نفس الشكل بكل مكان */

export const CARD = "rounded-[22px] bg-ludn-surface border border-ludn-line";

const BTN =
  "min-h-[52px] px-6 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
export const BTN_GOLD = `${BTN} bg-ludn-gold text-ludn-gold-ink`;
export const BTN_SOFT = `${BTN} bg-ludn-surface border border-ludn-line text-ludn-fg`;

// 16px عشان الآيفون ما يكبّر الصفحة لما تضغط على الخانة
export const FIELD =
  "w-full min-h-12 rounded-xl border border-ludn-line bg-ludn-surface-2 px-3.5 py-2.5 text-base font-bold text-ludn-fg outline-none transition-colors placeholder:text-ludn-muted placeholder:font-semibold focus:border-ludn-gold disabled:opacity-60 disabled:cursor-not-allowed";
export const LABEL = "block text-[13px] font-bold text-ludn-muted mb-1.5";

export const SPINNER = "rounded-full border-4 border-ludn-surface-2 border-t-ludn-gold animate-spin";
