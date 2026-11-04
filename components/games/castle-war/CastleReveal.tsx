"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Swords } from "lucide-react";
import { CASTLE_CARDS } from "@/constants/castle-war";
import "./castle-reveal.css";

/** مدة الكشف — لازم تطابق مدة cwr-layer في castle-reveal.css */
const REVEAL_MS = 3000;

type RevealKind = "commander" | "trap" | "spy";

export interface CastleRevealState {
  kind: RevealKind;
  /** حدث القائد: الجنود المخصومين فعلياً (فرق عدد الجنود قبل الضربة وبعدها) */
  lost: number;
}

const REVEALS: Record<RevealKind, { title: string; sub?: string }> = {
  commander: { title: "صيدة القائد!" },
  trap: { title: "طيحة الفخ!", sub: "الخصم بيقرر: يصفّي 20 جندي أو يأسرهم" },
  spy: { title: "الجاسوس الذيب وصل!" },
};

/** الحدث من حالة اللعبة كما هي — قراءة بس */
function revealKindOf(battleStep?: string, resultType?: string): RevealKind | null {
  if (battleStep === "trapChoice") return "trap";
  if (battleStep === "result" && resultType === "commander") return "commander";
  if (battleStep === "result" && resultType === "spy") return "spy";
  return null;
}

/**
 * يقرأ حالة اللعبة ويقرر متى يطلع الكشف. عرض بس: ما يستدعي شي من اللعبة، ووقته مستقل عن سيرها.
 * enabled: الشاشة جاهزة وتعرض اللعبة — اللي يفتح الصفحة أو يحدّثها وسط الحدث ما يعاد له.
 * الصفحة تأخر صناديق النتيجة ما دام الكشف شغال (الناتج مو null).
 */
export function useCastleReveal({
  enabled,
  battleStep,
  resultType,
  attackingTeam,
  hp1,
  hp2,
}: {
  enabled: boolean;
  battleStep?: string;
  resultType?: string;
  attackingTeam?: number;
  hp1?: number;
  hp2?: number;
}): CastleRevealState | null {
  const kind = revealKindOf(battleStep, resultType);
  const [seen, setSeen] = useState({ enabled, kind, hp1, hp2 });
  const [reveal, setReveal] = useState<CastleRevealState | null>(null);

  if (seen.enabled !== enabled || seen.kind !== kind || seen.hp1 !== hp1 || seen.hp2 !== hp2) {
    setSeen({ enabled, kind, hp1, hp2 });
    if (seen.enabled && enabled && kind && kind !== seen.kind) {
      const before = attackingTeam === 1 ? seen.hp2 : seen.hp1;
      const after = attackingTeam === 1 ? hp2 : hp1;
      setReveal({ kind, lost: (before ?? 0) - (after ?? 0) });
    }
  }

  useEffect(() => {
    if (!reveal) return;
    const timer = setTimeout(() => setReveal(null), REVEAL_MS);
    return () => clearTimeout(timer);
  }, [reveal]);

  // الكشف ثواني بس، فالصور تنحمّل من البداية عشان ما تتأخر
  useEffect(() => {
    for (const art of Object.values(CASTLE_CARDS)) {
      const img = new Image();
      img.src = art.card;
    }
  }, []);

  return reveal;
}

/** شرارات حول الكرت — قيم ثابتة عشان الرسم ما يتغير مع كل تحديث (نفس المافيا) */
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
 * شاشة كشف الأحداث فوق شاشة الحكم وشاشة الجمهور. الضغط يمر من خلالها.
 * على body مباشرة عشان ما تهتز مع اهتزاز الشاشة (التحريك على main يغيّر مرجع fixed).
 */
export default function CastleReveal({ reveal }: { reveal: CastleRevealState | null }) {
  if (!reveal) return null;
  const text = REVEALS[reveal.kind];
  const art = CASTLE_CARDS[reveal.kind];

  return createPortal(
    <div className="cwr-layer" dir="rtl" role="status" style={{ "--glow": art.glow } as React.CSSProperties}>
      <div className="cwr-card">
        <div aria-hidden className="cwr-glow" />
        {EMBERS.map((e, i) => (
          <span
            key={i}
            aria-hidden
            className="cwr-ember"
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
        <div className="cwr-inner">
          <div aria-hidden className="cwr-face cwr-back">
            <span className="cwr-back-badge">
              <Swords strokeWidth={1.6} />
            </span>
            <span className="font-display text-[clamp(24px,5dvh,44px)]">حرب القلاع</span>
          </div>
          <div className="cwr-face cwr-front">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art.card} alt={`كرت ${art.label}`} draggable={false} />
            <span aria-hidden className="cwr-shine" />
          </div>
        </div>
      </div>
      <div className="cwr-copy">
        <p className="cwr-text font-display">
          {text.title}
          {reveal.kind === "commander" && reveal.lost > 0 && (
            <>
              {" "}
              <span className="cwr-detail">خسارة {reveal.lost} جندي</span>
            </>
          )}
        </p>
        {text.sub && <p className="cwr-sub">{text.sub}</p>}
      </div>
    </div>,
    document.body
  );
}
