import React from "react";
import { WDCardIcon, WDCardTray } from "../WDCardIcons";
import { WD_CARDS, WD_CARD_ORDER, wdCardCount, type WDCardKey } from "../wdCards";

/** نفس ألوان الشارات القديمة لكل بطاقة */
const CHIP: Record<WDCardKey, string> = {
  capture: "bg-slate-100 dark:bg-slate-950/60 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300",
  protect: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400",
  airStrike: "bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-800/50 text-orange-700 dark:text-orange-400",
  capitalCapture: "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/50 text-amber-700 dark:text-amber-400",
  spy: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-400",
  nuke: "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800/50 text-red-700 dark:text-red-400",
};

/**
 * بطاقات الفريق في شاشة الجمهور — عرض بس.
 * - الجوال والتابلت: البطاقات الست بصف واحد وتحت كل وحدة عددها.
 * - الشاشات الصغيرة من lg (صندوق الفريق ضيق): نفس الأيقونات بصفين عشان الأسماء ما تنقص.
 * - من xl: نفس الشبكة القديمة بصور البطاقات، والاسم نفس المكتوب على الكرت.
 */
export default function AudienceCards({ cards }: { cards: Record<string, unknown> }) {
  return (
    <>
      <WDCardTray
        cards={cards}
        className="xl:hidden grid-cols-6 lg:grid-cols-3 mt-4 w-full"
        iconClassName="w-10 h-10 sm:w-12 sm:h-12"
        labelClassName="text-[10px] sm:text-xs"
      />

      <div className="hidden xl:grid grid-cols-2 gap-2 mt-4 w-full">
        {WD_CARD_ORDER.map((key) => {
          const count = wdCardCount(cards, key);
          return (
            <div
              key={key}
              aria-label={`${WD_CARDS[key].name ?? WD_CARDS[key].label}: ${count ?? 0}`}
              className={`flex items-center justify-between gap-1 px-2 2xl:px-3 py-1.5 rounded-xl border transition-colors ${CHIP[key]}`}
            >
              <div className="flex items-center gap-1.5 2xl:gap-2 min-w-0">
                <WDCardIcon card={key} count={count} showCount={false} className="w-6 h-6 2xl:w-9 2xl:h-9" />
                <span className="font-bold text-sm truncate">{WD_CARDS[key].label}</span>
              </div>
              <span className="font-black text-base tabular-nums shrink-0">{count}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
