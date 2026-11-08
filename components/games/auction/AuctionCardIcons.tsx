/* eslint-disable @next/next/no-img-element */
import React from "react";
import { AUCTION_CARDS, type AuctionCardKey } from "./auctionCards";

/**
 * أيقونة الكرت المدورة مع عددها — عرض بس. الكرت اللي خلص يصير رمادي والرقم يبقى مقروء.
 * دائرة الرقم فاتحة والرقم غامق عن قصد (نفس السيطرة على العالم): الوضع الليلي في بعض المتصفحات
 * يقلب الألوان بالقوة، والفاتح مع الغامق ينقلب صح ويبقى واضح بالحالتين.
 */
export function AuctionCardIcon({
  card,
  count,
  className = "",
}: {
  card: AuctionCardKey;
  count: number;
  className?: string;
}) {
  const art = AUCTION_CARDS[card];
  return (
    <span className={`relative inline-block shrink-0 ${className}`}>
      <img
        src={art.icon}
        alt=""
        draggable={false}
        className={`block w-full h-full rounded-full ${count <= 0 ? "grayscale opacity-40" : ""}`}
      />
      <span className={`absolute -bottom-1 -left-1 min-w-5 h-5 px-1 rounded-full border border-[#0a0704]/60 text-[11px] font-black leading-none grid place-items-center tabular-nums ${count <= 0 ? "bg-slate-300 text-slate-800" : "bg-amber-200 text-slate-950"}`}>
        {count}
      </span>
    </span>
  );
}

/** بطاقات البيع والكمين لفريق: أيقونة وعددها واسم الكرت تحتها (نفس صفّ بطاقات السيطرة على العالم) */
export function AuctionCardCounts({
  sell,
  ambush,
  className = "",
  iconClassName = "w-8 h-8 md:w-10 md:h-10",
  labelClassName = "text-[10px] md:text-xs",
}: {
  sell: number;
  ambush: number;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
}) {
  const items: { key: AuctionCardKey; count: number }[] = [
    { key: "sell", count: sell },
    { key: "ambush", count: ambush },
  ];
  return (
    <div className={`flex justify-center gap-4 md:gap-6 ${className}`}>
      {items.map(({ key, count }) => (
        <div key={key} role="img" aria-label={`${AUCTION_CARDS[key].label}: ${count}`} className="flex flex-col items-center gap-1 min-w-0">
          <AuctionCardIcon card={key} count={count} className={iconClassName} />
          <span className={`font-bold leading-tight text-slate-300 whitespace-nowrap ${labelClassName} ${count <= 0 ? "opacity-60" : ""}`}>
            {AUCTION_CARDS[key].label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** صورة أيقونة الكرت داخل الأزرار مكان الرمز القديم */
export function AuctionCardGlyph({ card, className = "", off = false }: { card: AuctionCardKey; className?: string; off?: boolean }) {
  return (
    <img
      src={AUCTION_CARDS[card].icon}
      alt=""
      draggable={false}
      className={`shrink-0 rounded-full ${off ? "grayscale opacity-60" : ""} ${className}`}
    />
  );
}
