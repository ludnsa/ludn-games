"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Globe } from "lucide-react";
import { WD_CARDS, WD_CARD_ORDER, wdCardCount, type WDCardKey } from "./wdCards";
import "./wd-card-reveal.css";

/** مدة الكشف — لازم تطابق مدة wdr-layer في wd-card-reveal.css */
const REVEAL_MS = 3000;

export interface WDRevealState {
  card: WDCardKey;
  team: 1 | 2;
  /** يتغير مع كل كشف عشان الحركة تبدأ من جديد لو انستخدم كرتين ورا بعض */
  seq: number;
}

type Counts = Partial<Record<WDCardKey, number>>;

function countsOf(cards: Record<string, unknown> | null | undefined): Counts {
  const out: Counts = {};
  for (const key of WD_CARD_ORDER) {
    const n = wdCardCount(cards, key);
    if (n !== undefined) out[key] = n;
  }
  return out;
}

/** أول كرت نقص عدده — الزيادة (لعبة جديدة) ما تنحسب */
function usedCard(before: Counts, after: Counts): WDCardKey | null {
  for (const key of WD_CARD_ORDER) {
    const b = before[key];
    const a = after[key];
    if (b !== undefined && a !== undefined && a < b) return key;
  }
  return null;
}

/**
 * يقرأ أعداد البطاقات ويقرر متى يطلع الكشف. عرض بس: ما يستدعي شي من اللعبة ولا يغيّر حالتها.
 * enabled: الشاشة جاهزة وتعرض اللعب — اللي يفتح الصفحة أو يحدّثها ما يطلع له كشف قديم.
 */
export function useWDCardReveal({
  enabled,
  cards1,
  cards2,
}: {
  enabled: boolean;
  cards1: Record<string, unknown> | null | undefined;
  cards2: Record<string, unknown> | null | undefined;
}): WDRevealState | null {
  const c1 = countsOf(cards1);
  const c2 = countsOf(cards2);
  const sig = JSON.stringify([c1, c2]);
  const [seen, setSeen] = useState({ enabled, sig, c1, c2, seq: 0 });
  const [reveal, setReveal] = useState<WDRevealState | null>(null);

  if (seen.enabled !== enabled || seen.sig !== sig) {
    const seq = seen.seq + 1;
    setSeen({ enabled, sig, c1, c2, seq });
    if (seen.enabled && enabled) {
      const card1 = usedCard(seen.c1, c1);
      const card2 = card1 ? null : usedCard(seen.c2, c2);
      if (card1) setReveal({ card: card1, team: 1, seq });
      else if (card2) setReveal({ card: card2, team: 2, seq });
    }
  }

  useEffect(() => {
    if (!reveal) return;
    const timer = setTimeout(() => setReveal(null), REVEAL_MS);
    return () => clearTimeout(timer);
  }, [reveal]);

  // الكشف ثواني بس، فصور الكروت تنحمّل بعد ما تفتح الصفحة عشان ما تتأخر
  useEffect(() => {
    for (const key of WD_CARD_ORDER) {
      const img = new Image();
      img.src = WD_CARDS[key].card;
    }
  }, []);

  return reveal;
}

/** شرارات حول الكرت — قيم ثابتة عشان الرسم ما يتغير مع كل تحديث (نفس كشف حرب القلاع) */
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
 * شاشة كشف البطاقة فوق شاشة الحكم وشاشة الجمهور. الضغط يمر من خلالها،
 * وفوق رسائل اللعبة عشان رسالة التأكيد تبين بعدها.
 */
export default function WDCardReveal({
  reveal,
  team1Name,
  team2Name,
}: {
  reveal: WDRevealState | null;
  team1Name: string;
  team2Name: string;
}) {
  if (!reveal) return null;
  const art = WD_CARDS[reveal.card];
  const teamName = reveal.team === 1 ? team1Name : team2Name;

  return createPortal(
    <div key={reveal.seq} className="wdr-layer" dir="rtl" role="status" style={{ "--glow": art.glow } as React.CSSProperties}>
      <div className="wdr-card">
        <div aria-hidden className="wdr-glow" />
        {EMBERS.map((e, i) => (
          <span
            key={i}
            aria-hidden
            className="wdr-ember"
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
        <div className="wdr-inner">
          <div aria-hidden className="wdr-face wdr-back">
            <span className="wdr-back-badge">
              <Globe strokeWidth={1.6} />
            </span>
            <span className="font-display text-[clamp(20px,4.2dvh,38px)] text-center leading-tight">السيطرة على العالم</span>
          </div>
          <div className="wdr-face wdr-front">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art.card} alt={`بطاقة ${art.label}`} draggable={false} />
            <span aria-hidden className="wdr-shine" />
          </div>
        </div>
      </div>
      <div className="wdr-copy">
        <p className="wdr-text font-display">{art.title}</p>
        {teamName && <p className={`wdr-team ${reveal.team === 1 ? "wdr-team-1" : "wdr-team-2"}`}>{teamName}</p>}
      </div>
    </div>,
    document.body
  );
}
