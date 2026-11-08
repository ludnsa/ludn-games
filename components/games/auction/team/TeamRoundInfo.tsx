"use client";
import React from "react";
import { Gavel } from "lucide-react";
import { AuctionCardGlyph } from "../AuctionCardIcons";

const CHIP = "inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/30 bg-[#0e0a06]/85 backdrop-blur-sm px-3 py-1.5 text-xs md:text-sm font-black text-white shadow-sm";
const SHOWN_IN = ["questionReveal", "options", "rewardChoice", "result"];

/** الأعمدة اللي يقراها من بيانات الغرفة (auction_rooms) */
interface RoundLive {
  game_state?: string;
  t1_name?: string;
  t2_name?: string;
  winner?: number | null;
  buyer?: number | null;
  is_double_risk?: boolean;
  is_sudden_death?: boolean;
}

/**
 * حالة الجولة في جوال القائد — عرض بس من بيانات الغرفة: مين كسب المزايدة، والدبل، وإذا السؤال انباع.
 * (شاشة "بعد المزايدة" تعرض الفائز بنفسها، فهنا من بعد ما يطلع السؤال)
 */
export default function TeamRoundInfo({ live }: { live: RoundLive | null }) {
  if (!live || !SHOWN_IN.includes(live.game_state ?? "")) return null;

  const name = (t: 1 | 2) => (t === 1 ? live.t1_name : live.t2_name) || (t === 1 ? "الفريق الأول" : "الفريق الثاني");
  const color = (t: 1 | 2) => (t === 1 ? "text-cyan-400" : "text-rose-400");
  const winner: 1 | 2 | null = live.winner === 1 || live.winner === 2 ? live.winner : null;
  const buyer: 1 | 2 | null = live.buyer === 1 || live.buyer === 2 ? live.buyer : null;

  return (
    <div className="w-full flex flex-wrap justify-center gap-2 mb-4" role="status">
      {winner && (live.is_sudden_death ? (
        <span className={CHIP}>
          <AuctionCardGlyph card="lastchance" className="w-6 h-6" />
          الفرصة الأخيرة: <span className={color(winner)}>{name(winner)}</span>
        </span>
      ) : (
        <span className={CHIP}>
          <Gavel size={16} className="text-yellow-500" />
          كسب المزايدة: <span className={color(winner)}>{name(winner)}</span>
        </span>
      ))}
      {!!live.is_double_risk && (
        <span className={`${CHIP} border-yellow-500/60`}>
          <AuctionCardGlyph card="double" className="w-6 h-6" />
          الدبل مفعّل
        </span>
      )}
      {buyer && (
        <span className={`${CHIP} border-amber-500/60`}>
          <AuctionCardGlyph card="sell" className="w-6 h-6" />
          انباع السؤال على <span className={color(buyer)}>{name(buyer)}</span>
        </span>
      )}
    </div>
  );
}
