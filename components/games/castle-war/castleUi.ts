import { BTN_GOLD, BTN_SOFT, ERROR, INSET } from "@/components/games/mafia/mafiaUi";

/**
 * شكل حرب القلاع بهوية لدن: نفس mafiaUi قدر الإمكان، وكل صفحة عليها كلاس dark مثل المافيا.
 * هنا بس اللي ما له مقابل هناك: الخطر بحد أحمر بدل التعبئة، والصناديق بدون حشوة ثابتة،
 * لأن كل صندوق له حشوته.
 */
export { BTN_GOLD, BTN_SOFT, ERROR, INSET };

const PRESS = "flex items-center justify-center gap-2 font-black transition-[transform,background-color,border-color] active:scale-[0.98]";
const BIG = "w-full min-h-[54px] px-5 rounded-2xl text-[17px]";

/** الصندوق الداكن الشفاف، مثل صندوق صفحة الإعداد */
export const PANEL = "bg-ludn-surface/90 border border-ludn-line rounded-[22px] shadow-[var(--ludn-shadow)]";
/** النوافذ: لون صلب عشان اللي وراها ما يشوش على النص */
export const MODAL = "bg-ludn-surface border border-ludn-line rounded-[26px] shadow-[var(--ludn-shadow)]";
export const MODAL_GOLD = "bg-ludn-surface border border-ludn-gold/50 rounded-[26px] shadow-[0_0_40px_var(--ludn-glow)]";
export const BACKDROP = "bg-black/70 backdrop-blur-sm";

/** زر ثانوي كبير بنفس مقاس الذهبي */
export const BTN_DARK = `${PRESS} ${BIG} bg-ludn-surface-2 border border-ludn-line text-ludn-fg hover:border-white/20`;
/** زر الخطر: حد أحمر بدل التعبئة */
export const BTN_DANGER_LINE = `${PRESS} ${BIG} bg-rose-500/10 border border-rose-500/60 text-rose-200 hover:bg-rose-500/20 hover:border-rose-400`;

/** أزرار الشريط العلوي: نفس لون BAR_BTN في المافيا، بمقاسات الشريط القديمة عشان أماكنها ما تتحرك */
const BAR_BASE = "h-[38px] rounded-xl border flex items-center justify-center gap-1.5 text-xs md:text-sm font-black select-none transition-colors";
const BAR_DARK = `${BAR_BASE} bg-ludn-surface-2 border-ludn-line text-ludn-fg hover:border-white/20`;
export const BAR = `${BAR_DARK} px-3 md:px-4 md:gap-2`;
export const BAR_TIGHT = `${BAR_DARK} px-3`;
export const BAR_DANGER = `${BAR_BASE} px-3 md:px-4 md:gap-2 bg-rose-500/10 border-rose-500/60 text-rose-200 hover:bg-rose-500/20`;

/** لون الفريق لمسة: حد علوي وتوهج واسم الفريق بلونه */
const TEAM1_EDGE = "border-t-cyan-400 text-cyan-300 shadow-[0_-6px_22px_-6px_rgba(34,211,238,0.6)]";
const TEAM2_EDGE = "border-t-rose-400 text-rose-300 shadow-[0_-6px_22px_-6px_rgba(251,113,133,0.6)]";
const TEAM_NAME = "bg-ludn-surface border border-ludn-line border-t-2 font-display text-2xl md:text-[28px] leading-tight py-3 px-6 rounded-2xl w-[85%] text-center -mb-4 z-10";
export const TEAM1_NAME = `${TEAM_NAME} ${TEAM1_EDGE}`;
export const TEAM2_NAME = `${TEAM_NAME} ${TEAM2_EDGE}`;
const TEAM_HP = `${PANEL} font-display text-[22px] py-4 px-4 w-[65%] text-center pt-6 flex items-center justify-center gap-2`;
export const TEAM1_HP = `${TEAM_HP} text-cyan-300`;
export const TEAM2_HP = `${TEAM_HP} text-rose-300`;

/** عدد الجنود فوق قلعة شاشة الجمهور */
const AUDIENCE_HP = "bg-ludn-surface border border-ludn-line border-t-2 font-display text-3xl md:text-4xl leading-tight py-3 px-6 rounded-[22px] text-center flex items-center justify-center gap-3 w-full";
export const TEAM1_AUDIENCE_HP = `${AUDIENCE_HP} ${TEAM1_EDGE}`;
export const TEAM2_AUDIENCE_HP = `${AUDIENCE_HP} ${TEAM2_EDGE}`;

/** أزرار "فاز فلان" في تحدي التوقع */
const TEAM_WIN = "flex-1 py-3 font-black text-sm rounded-[14px] border flex items-center justify-center gap-2 transition-colors active:scale-[0.98]";
export const TEAM1_WIN = `${TEAM_WIN} bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-400/60 text-cyan-200`;
export const TEAM2_WIN = `${TEAM_WIN} bg-rose-500/10 hover:bg-rose-500/20 border-rose-400/60 text-rose-200`;

/** عدّاد التحدي: يحمر في آخر 5 ثواني */
export const timerTone = (seconds: number) =>
  seconds <= 5 ? "bg-rose-500/15 border-rose-500/50 text-rose-300 animate-pulse" : "bg-ludn-surface-2 border-ludn-line text-amber-300";

/** جوال الفريق: مربع الأيقونة فوق العنوان */
export const ICON_BOX = "w-24 h-24 rounded-[2rem] mx-auto flex items-center justify-center mb-6 border";

/** جوال الفريق: اختيار الفريق بحد بلون الفريق، والمقفل رمادي بنص مقروء */
const TEAM_PICK = "w-full group bg-ludn-surface-2 border rounded-2xl p-5 font-black text-xl flex items-center gap-4 transition-colors active:scale-[0.98]";
export const TEAM1_PICK = `${TEAM_PICK} border-cyan-400/50 text-cyan-300 hover:border-cyan-300 hover:bg-cyan-500/10`;
export const TEAM2_PICK = `${TEAM_PICK} border-rose-400/50 text-rose-300 hover:border-rose-300 hover:bg-rose-500/10`;
export const TEAM_LOCKED = "w-full bg-ludn-surface-2 border border-ludn-line text-ludn-muted rounded-2xl p-5 font-black text-xl flex items-center gap-4 cursor-not-allowed";
const PICK_ICON = "w-14 h-14 rounded-xl border flex items-center justify-center";
export const TEAM1_PICK_ICON = `${PICK_ICON} bg-cyan-500/10 border-cyan-400/40 group-hover:scale-110 transition-transform`;
export const TEAM2_PICK_ICON = `${PICK_ICON} bg-rose-500/10 border-rose-400/40 group-hover:scale-110 transition-transform`;
export const LOCKED_PICK_ICON = `${PICK_ICON} bg-ludn-surface border-ludn-line`;
export const LOCKED_TAG = "text-sm font-bold text-rose-200 border border-rose-500/40 bg-rose-500/10 px-2 py-1 rounded-lg mt-1 sm:mt-0 w-fit";

/** جوال الفريق: زيادة ونقص الجنود */
const STEP = "w-12 h-12 shrink-0 rounded-xl border flex items-center justify-center transition-colors active:scale-[0.98] disabled:opacity-30";
export const STEP_MINUS = `${STEP} bg-rose-500/10 border-rose-500/60 text-rose-300`;
export const STEP_PLUS = `${STEP} bg-emerald-500/10 border-emerald-400/60 text-emerald-300`;

/** جوال الفريق: تعيين القائد والفخ. المختار بحد وتوهج بدل التعبئة */
const ROLE = "w-full h-full rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-colors border active:scale-[0.98]";
export const ROLE_COMMANDER_ON = `${ROLE} bg-amber-500/15 border-amber-400 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.25)]`;
export const ROLE_COMMANDER_OFF = `${ROLE} bg-ludn-surface-2 border-ludn-line text-amber-300 hover:border-amber-400/50`;
export const ROLE_TRAP_ON = `${ROLE} bg-purple-500/15 border-purple-400 text-purple-200 shadow-[0_0_18px_rgba(192,132,252,0.25)]`;
export const ROLE_TRAP_OFF = `${ROLE} bg-ludn-surface-2 border-ludn-line text-purple-300 hover:border-purple-400/50`;
