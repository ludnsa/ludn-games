"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LayoutGrid } from "lucide-react";
import { QUIZ_GAME, QUIZ_LIFELINE_KEYS, QUIZ_LIFELINES } from "@/constants/quiz-grid";
import { QUIZ_CARDS } from "./quizCards";
import type { QuizLifelineKey, QuizTeam } from "@/types";
import "./quiz-reveal.css";

/** مدة الكشف — لازم تطابق مدة qzr-layer في quiz-reveal.css */
const REVEAL_MS = 3000;
/** لو تراكمت أحداث كثيرة (مثلاً جوال صحى من النوم) نعرض آخرها بس */
const MAX_QUEUE = 3;

export interface QuizRevealState {
  card: QuizLifelineKey;
  team: QuizTeam;
  /** يتغير مع كل كشف عشان الحركة تبدأ من جديد لو جا كشفين ورا بعض */
  seq: number;
}

/**
 * يقرأ الوسائل المستخدمة لكل فريق (نفس صف الغرفة اللي تعرضه الشاشة) ويطلع كشف لكل وسيلة جديدة.
 * عرض بس: ما يستدعي شي من اللعبة ولا يغيّر حالتها.
 * enabled: الشاشة جاهزة واللعب بدأ — اللي يفتح الصفحة أو يحدّثها ما يطلع له كشف قديم.
 */
export function useQuizReveal({
  enabled,
  used1,
  used2,
}: {
  enabled: boolean;
  used1: readonly QuizLifelineKey[] | null | undefined;
  used2: readonly QuizLifelineKey[] | null | undefined;
}): QuizRevealState | null {
  const snap = { u1: [...(used1 ?? [])], u2: [...(used2 ?? [])] };
  const sig = JSON.stringify(snap);
  const [seen, setSeen] = useState({ enabled, sig, snap, seq: 0 });
  const [queue, setQueue] = useState<QuizRevealState[]>([]);

  if (seen.enabled !== enabled || seen.sig !== sig) {
    let seq = seen.seq;
    const items: QuizRevealState[] = [];
    if (seen.enabled && enabled) {
      for (const key of snap.u1) if (!seen.snap.u1.includes(key)) items.push({ card: key, team: 1, seq: ++seq });
      for (const key of snap.u2) if (!seen.snap.u2.includes(key)) items.push({ card: key, team: 2, seq: ++seq });
    }
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
    for (const key of QUIZ_LIFELINE_KEYS) {
      const img = new Image();
      img.src = QUIZ_CARDS[key].card;
    }
  }, []);

  return current;
}

/** شرارات حول الكرت — قيم ثابتة عشان الرسم ما يتغير مع كل تحديث (نفس كشف المزاد) */
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
 * شاشة كشف الكرت فوق شاشة الحكم وجوال اللاعب. الضغط يمر من خلالها،
 * وفوق نوافذ اللعبة عشان أي رسالة تبين بعدها.
 */
export default function QuizReveal({
  reveal,
  t1Name,
  t2Name,
}: {
  reveal: QuizRevealState | null;
  t1Name: string;
  t2Name: string;
}) {
  if (!reveal) return null;
  const art = QUIZ_CARDS[reveal.card];
  const label = QUIZ_LIFELINES[reveal.card].label;
  const teamName = reveal.team === 1 ? t1Name : t2Name;

  return createPortal(
    <div key={reveal.seq} className="qzr-layer" dir="rtl" role="status" style={{ "--glow": art.glow } as React.CSSProperties}>
      <div className="qzr-card">
        <div aria-hidden className="qzr-glow" />
        {EMBERS.map((e, i) => (
          <span
            key={i}
            aria-hidden
            className="qzr-ember"
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
        <div className="qzr-inner">
          <div aria-hidden className="qzr-face qzr-back">
            <span className="qzr-back-badge">
              <LayoutGrid strokeWidth={1.6} />
            </span>
            <span className="font-display text-[clamp(18px,3.8dvh,34px)] text-center leading-tight">{QUIZ_GAME.title}</span>
          </div>
          <div className="qzr-face qzr-front">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art.card} alt={`بطاقة ${label}`} draggable={false} />
            <span aria-hidden className="qzr-shine" />
          </div>
        </div>
      </div>
      <div className="qzr-copy">
        <p className="qzr-text font-display">{art.title}</p>
        {teamName && <p className={`qzr-team ${reveal.team === 1 ? "qzr-team-1" : "qzr-team-2"}`}>{teamName}</p>}
      </div>
    </div>,
    document.body
  );
}
