/* eslint-disable @next/next/no-img-element */
import React from "react";
import { WD_CARDS, WD_CARD_ORDER, wdCardCount, type WDCardKey } from "./wdCards";

/** أيقونة البطاقة المدورة مع عددها — عرض بس. البطاقة اللي خلصت تصير رمادية والرقم يبقى مقروء. */
export function WDCardIcon({
  card,
  count,
  showCount = true,
  className = "",
}: {
  card: WDCardKey;
  count?: number;
  /** false: الرقم مكتوب بجنبها، فالأيقونة بس تصير رمادية لما تخلص */
  showCount?: boolean;
  className?: string;
}) {
  const art = WD_CARDS[card];
  return (
    <span className={`relative inline-block shrink-0 ${className}`}>
      <img
        src={art.icon}
        alt=""
        draggable={false}
        className={`block w-full h-full rounded-full ${count === 0 ? "grayscale opacity-40" : ""}`}
      />
      {showCount && count !== undefined && (
        <span className="absolute -bottom-1 -left-1 min-w-5 h-5 px-1 rounded-full bg-slate-950 border border-white/25 text-white text-[11px] font-black leading-none grid place-items-center tabular-nums">
          {count}
        </span>
      )}
    </span>
  );
}

/** البطاقات الست لفريق: أيقونة وعدد واسم البطاقة تحتها */
export function WDCardTray({
  cards,
  className = "",
  iconClassName = "w-9 h-9 lg:w-10 lg:h-10",
  labelClassName = "text-[10px] lg:text-[11px]",
}: {
  cards: Record<string, unknown> | null | undefined;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
}) {
  return (
    <div className={`grid gap-x-1.5 gap-y-2 ${className}`}>
      {WD_CARD_ORDER.map((key) => {
        const count = wdCardCount(cards, key);
        return (
          <div
            key={key}
            role="img"
            aria-label={`${WD_CARDS[key].name ?? WD_CARDS[key].label}: ${count ?? 0}`}
            className="flex flex-col items-center gap-1 min-w-0"
          >
            <WDCardIcon card={key} count={count} className={iconClassName} />
            <span className={`font-bold leading-tight text-slate-600 dark:text-slate-300 truncate max-w-full ${labelClassName} ${count === 0 ? "opacity-60" : ""}`}>
              {WD_CARDS[key].label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** صورة أيقونة البطاقة داخل الأزرار مكان الرمز القديم */
export function WDCardGlyph({ card, className = "" }: { card: WDCardKey; className?: string }) {
  return <img src={WD_CARDS[card].icon} alt="" draggable={false} className={`shrink-0 rounded-full ${className}`} />;
}
