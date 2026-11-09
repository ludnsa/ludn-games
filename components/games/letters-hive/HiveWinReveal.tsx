"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LETTERS_HIVE_GAME, LETTERS_HIVE_TEAMS } from "@/constants/letters-hive";
import { HIVE_TEAMS, type HiveTeam } from "@/lib/game/letters-hive-engine";
import { HIVE_ICON, HIVE_WIN_ART } from "./hiveUi";
import "./hive-reveal.css";

/** مدة الكشف — لازم تطابق مدة hvr-layer في hive-reveal.css */
const REVEAL_MS = 3000;

export interface HiveWinRevealState {
  team: HiveTeam;
  /** يتغير مع كل كشف عشان الحركة تبدأ من جديد */
  seq: number;
}

/**
 * يطلع كشف الفوز لما الفائز يتغير من "ما فيه" لفريق (نفس حالة اللوحة اللي تعرضها الشاشة). عرض بس:
 * ما يغيّر حالة اللعبة. اللي يفتح الصفحة أو يحدّثها والجولة فيها فائز من قبل، ما يطلع له كشف قديم.
 * لو انشال الفوز (تراجع) والكشف ظاهر، يختفي على طول.
 */
export function useHiveWinReveal(winner: HiveTeam | null, enabled: boolean): HiveWinRevealState | null {
  const [seen, setSeen] = useState({ winner, enabled, seq: 0 });
  const [current, setCurrent] = useState<HiveWinRevealState | null>(null);

  if (seen.winner !== winner || seen.enabled !== enabled) {
    let seq = seen.seq;
    if (seen.enabled && enabled && winner && winner !== seen.winner) setCurrent({ team: winner, seq: ++seq });
    else if (!winner || !enabled) setCurrent(null);
    setSeen({ winner, enabled, seq });
  }

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(null), REVEAL_MS);
    return () => clearTimeout(timer);
  }, [current]);

  // الكشف ثواني بس، فصور الكروت تنحمّل بعد ما تفتح الصفحة عشان ما تتأخر
  useEffect(() => {
    for (const team of HIVE_TEAMS) {
      const img = new Image();
      img.src = HIVE_WIN_ART[team].card;
    }
  }, []);

  return current;
}

/** شرارات حول الكرت — قيم ثابتة (نفس كشف تحدي الفئات) */
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

/** شاشة كشف الفوز فوق شاشة المقدم وشاشة العرض. الضغط يمر من خلالها، وفوق كل شي ثاني */
export default function HiveWinReveal({ reveal, teams }: { reveal: HiveWinRevealState | null; teams: Record<HiveTeam, string> }) {
  if (!reveal) return null;
  const art = HIVE_WIN_ART[reveal.team];
  const name = teams[reveal.team];

  return createPortal(
    <div key={reveal.seq} className="hvr-layer" dir="rtl" role="status" style={{ "--glow": art.glow } as React.CSSProperties}>
      <div className="hvr-card">
        <div aria-hidden className="hvr-glow" />
        {EMBERS.map((e, i) => (
          <span
            key={i}
            aria-hidden
            className="hvr-ember"
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
        <div className="hvr-inner">
          <div aria-hidden className="hvr-face hvr-back">
            <span className="hvr-back-badge">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={HIVE_ICON} alt="" draggable={false} />
            </span>
            <span className="font-display text-[clamp(18px,3.8dvh,34px)] text-center leading-tight">{LETTERS_HIVE_GAME.title}</span>
          </div>
          <div className="hvr-face hvr-front">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art.card} alt={`فاز ${name}`} draggable={false} />
            <span aria-hidden className="hvr-shine" />
          </div>
        </div>
      </div>
      <div className="hvr-copy">
        <p className={`hvr-text font-display hvr-team-${reveal.team}`}>فاز {name}!</p>
        <p className="hvr-team text-amber-50/90">وصّلوا {LETTERS_HIVE_TEAMS[reveal.team].goal}</p>
      </div>
    </div>,
    document.body
  );
}
