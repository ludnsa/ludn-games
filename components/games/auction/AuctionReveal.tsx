"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Gavel } from "lucide-react";
import { AUCTION_CARDS, AUCTION_CARD_ORDER, type AuctionCardKey } from "./auctionCards";
import "./auction-reveal.css";

/** مدة الكشف — لازم تطابق مدة aur-layer في auction-reveal.css */
const REVEAL_MS = 3000;
/** لو تراكمت أحداث كثيرة (مثلاً جوال صحى من النوم) نعرض آخرها بس */
const MAX_QUEUE = 3;

type RevealTeam = 1 | 2 | "both" | null;

export interface AuctionRevealState {
  card: AuctionCardKey;
  team: RevealTeam;
  /** يتغير مع كل كشف عشان الحركة تبدأ من جديد لو جا كشفين ورا بعض */
  seq: number;
}

/** القيم اللي يتابعها الكشف — من نفس حالة اللعبة اللي تعرضها الشاشة، بدون أي حساب جديد */
export interface AuctionSnapshot {
  double: boolean;
  sell1: number;
  sell2: number;
  ambush1: number;
  ambush2: number;
  bal1: number;
  bal2: number;
  sudden: boolean;
  winner: 1 | 2 | null;
}

/** الأحداث بين لقطتين، بالترتيب اللي صارت فيه */
function eventsBetween(a: AuctionSnapshot, b: AuctionSnapshot): Omit<AuctionRevealState, "seq">[] {
  // الفرصة الأخيرة: صاحبها يراهن بكل رصيده فيصير صفر، وهذا مو إفلاس. صاحبها هو الفريق اللي كان عنده رصيد
  if (!a.sudden && b.sudden) {
    const team: RevealTeam = a.bal1 > 0 && a.bal2 <= 0 ? 1 : a.bal2 > 0 && a.bal1 <= 0 ? 2 : b.winner;
    return [{ card: "lastchance", team }];
  }
  const out: Omit<AuctionRevealState, "seq">[] = [];
  if (!a.double && b.double) out.push({ card: "double", team: b.winner });
  if (b.sell1 < a.sell1) out.push({ card: "sell", team: 1 });
  if (b.sell2 < a.sell2) out.push({ card: "sell", team: 2 });
  if (b.ambush1 < a.ambush1) out.push({ card: "ambush", team: 1 });
  if (b.ambush2 < a.ambush2) out.push({ card: "ambush", team: 2 });
  const broke1 = a.bal1 > 0 && b.bal1 <= 0;
  const broke2 = a.bal2 > 0 && b.bal2 <= 0;
  if (broke1 && broke2) out.push({ card: "bankrupt", team: "both" });
  else if (broke1) out.push({ card: "bankrupt", team: 1 });
  else if (broke2) out.push({ card: "bankrupt", team: 2 });
  return out;
}

/**
 * يقرأ حالة اللعبة ويقرر متى يطلع الكشف. عرض بس: ما يستدعي شي من اللعبة ولا يغيّر حالتها.
 * enabled: الشاشة جاهزة وتعرض اللعب — اللي يفتح الصفحة أو يحدّثها ما يطلع له كشف قديم.
 * لو صار حدثين مع بعض (مثلاً كمين يفلّس الخصم) يطلعون ورا بعض، كل واحد 3 ثواني.
 */
export function useAuctionReveal({ enabled, snap }: { enabled: boolean; snap: AuctionSnapshot }): AuctionRevealState | null {
  const sig = JSON.stringify(snap);
  const [seen, setSeen] = useState({ enabled, sig, snap, seq: 0 });
  const [queue, setQueue] = useState<AuctionRevealState[]>([]);

  if (seen.enabled !== enabled || seen.sig !== sig) {
    let seq = seen.seq;
    const found = seen.enabled && enabled ? eventsBetween(seen.snap, snap) : [];
    const items = found.map((e) => ({ ...e, seq: ++seq }));
    setSeen({ enabled, sig, snap, seq });
    if (items.length) setQueue((q) => [...q, ...items].slice(-MAX_QUEUE));
  }

  const current = queue[0] ?? null;
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setQueue((q) => q.slice(1)), REVEAL_MS);
    return () => clearTimeout(timer);
  }, [current]);

  // الكشف ثواني بس، فصور الكروت تنحمّل بعد ما تفتح الصفحة عشان ما تتأخر
  useEffect(() => {
    for (const key of AUCTION_CARD_ORDER) {
      const img = new Image();
      img.src = AUCTION_CARDS[key].card;
    }
  }, []);

  return current;
}

/** شرارات حول الكرت — قيم ثابتة عشان الرسم ما يتغير مع كل تحديث (نفس كشف السيطرة على العالم) */
const EMBERS = [
  { left: -4, dx: -14, delay: 1.1, dur: 1.7 },
  { left: 8, dx: 10, delay: 1.5, dur: 1.5 },
  { left: 22, dx: -8, delay: 1.2, dur: 1.6 },
  { left: 38, dx: 12, delay: 1.6, dur: 1.4 },
  { left: 55, dx: -10, delay: 1.2, dur: 1.7 },
  { left: 70, dx: 8, delay: 1.5, dur: 1.5 },
  { left: 86, dx: -12, delay: 1.3, dur: 1.6 },
  { left: 100, dx: 14, delay: 1.6, dur: 1.4 },
];

/**
 * شاشة كشف الكرت فوق شاشة الحكم وجوال القائد. الضغط يمر من خلالها،
 * وفوق رسائل اللعبة عشان رسالة التأكيد تبين بعدها.
 */
export default function AuctionReveal({
  reveal,
  t1Name,
  t2Name,
}: {
  reveal: AuctionRevealState | null;
  t1Name: string;
  t2Name: string;
}) {
  if (!reveal) return null;
  const art = AUCTION_CARDS[reveal.card];
  const teamName = reveal.team === 1 ? t1Name : reveal.team === 2 ? t2Name : reveal.team === "both" ? `${t1Name} و${t2Name}` : "";
  const teamClass = reveal.team === 1 ? "aur-team-1" : reveal.team === 2 ? "aur-team-2" : "aur-team-both";

  return createPortal(
    <div key={reveal.seq} className="aur-layer" dir="rtl" role="status" style={{ "--glow": art.glow } as React.CSSProperties}>
      <div className="aur-card">
        <div aria-hidden className="aur-glow" />
        {EMBERS.map((e, i) => (
          <span
            key={i}
            aria-hidden
            className="aur-ember"
            style={
              {
                left: `${e.left}%`,
                "--dx": `${e.dx}px`,
                animationDelay: `${e.delay}s`,
                animationDuration: `${e.dur}s`,
              } as React.CSSProperties
            }
          />
        ))}
        <div className="aur-inner">
          <div aria-hidden className="aur-face aur-back">
            <span className="aur-back-badge">
              <Gavel strokeWidth={1.6} />
            </span>
            <span className="font-display text-[clamp(20px,4.2dvh,38px)] text-center leading-tight">المزاد</span>
          </div>
          <div className="aur-face aur-front">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art.card} alt={`بطاقة ${art.label}`} draggable={false} />
            <span aria-hidden className="aur-shine" />
          </div>
        </div>
      </div>
      <div className="aur-copy">
        <p className="aur-text font-display">{art.title}</p>
        {teamName && <p className={`aur-team ${teamClass}`}>{teamName}</p>}
      </div>
    </div>,
    document.body
  );
}
