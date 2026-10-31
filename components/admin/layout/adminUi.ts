/** كلاسات لوحة التحكم — نفس ألوان وأشكال الواجهة العامة (components/home/ui.ts) بمقاسات أصغر للأدوات */

export { CARD, FIELD, LABEL, BTN_GOLD, BTN_SOFT, SPINNER } from "@/components/home/ui";

export const PANEL = "rounded-[22px] bg-ludn-surface border border-ludn-line p-4 md:p-6";
export const INSET = "rounded-2xl bg-ludn-surface-2 border border-ludn-line";
export const PANEL_TITLE = "font-display text-[22px] md:text-[24px] leading-tight flex items-center gap-2.5";
export const TITLE_ICON = "w-10 h-10 shrink-0 rounded-xl bg-ludn-surface-2 text-ludn-gold-text grid place-items-center";

const BTN_SM =
  "min-h-10 px-3.5 rounded-xl font-bold text-sm whitespace-nowrap flex items-center justify-center gap-1.5 transition-transform active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
export const BTN_SM_GOLD = `${BTN_SM} bg-ludn-gold text-ludn-gold-ink`;
export const BTN_SM_SOFT = `${BTN_SM} bg-ludn-surface border border-ludn-line text-ludn-fg hover:bg-ludn-surface-2`;
export const BTN_SM_GREEN = `${BTN_SM} bg-ludn-green text-white`;
export const BTN_SM_DANGER = `${BTN_SM} bg-rose-500/10 border border-rose-500/25 text-rose-500 hover:bg-rose-500 hover:text-white`;

export const ICON_BTN =
  "w-10 h-10 shrink-0 rounded-xl grid place-items-center border border-ludn-line bg-ludn-surface text-ludn-muted hover:text-ludn-fg transition-colors";
export const ICON_BTN_DANGER =
  "w-10 h-10 shrink-0 rounded-xl grid place-items-center border border-rose-500/25 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors";

/** فلتر/تبويب صغير على شكل حبة */
export const chip = (active: boolean) =>
  `shrink-0 min-h-9 px-3.5 rounded-full border text-[13px] font-bold flex items-center gap-1.5 transition-colors ${
    active ? "bg-ludn-fg text-ludn-bg border-ludn-fg" : "bg-ludn-surface text-ludn-muted border-ludn-line hover:text-ludn-fg"
  }`;

/** تبويبات كبيرة داخل إطار رمادي (على الجوال شبكة بعمودين عشان كلها تبان) */
export const SEGMENTS = "grid grid-cols-2 sm:flex gap-1 p-1 rounded-2xl bg-ludn-surface-2";
export const segment = (active: boolean) =>
  `flex-1 shrink-0 min-h-11 px-3 rounded-xl font-black text-sm whitespace-nowrap flex items-center justify-center gap-2 transition-colors ${
    active ? "bg-ludn-surface text-ludn-fg shadow-sm" : "text-ludn-muted hover:text-ludn-fg"
  }`;

export const EMPTY =
  "rounded-2xl border-2 border-dashed border-ludn-line py-12 px-4 grid justify-items-center gap-3 text-center text-ludn-muted font-bold";

/** الخيار الصحيح والصعوبة: ألوان لها معنى (أخضر صح، وسهل/متوسط/صعب) */
export const CORRECT = "bg-ludn-green border-ludn-green text-white";
export const DIFFICULTY_ACTIVE: Record<"سهل" | "متوسط" | "صعب", string> = {
  سهل: "bg-emerald-500 border-emerald-500 text-white",
  متوسط: "bg-amber-500 border-amber-500 text-white",
  صعب: "bg-rose-500 border-rose-500 text-white",
};
