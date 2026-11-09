"use client";

import React, { useState } from "react";
import { LETTERS_HIVE_CONFIG, LETTERS_HIVE_TEAMS } from "@/constants/letters-hive";
import { HIVE_TEAMS, cellPos, type HiveTeam } from "@/lib/game/letters-hive-engine";
import "./hive.css";

// هندسة اللوحة (وحدات SVG): سداسيات رأسها لفوق، والصفوف الفردية مزاحة لليمين نص خلية
const R = 50;
const W = Math.sqrt(3) * R;
const STEP_Y = 1.5 * R;
/** المسافة حول الخلايا: تكفي خطوط النيون وتوهجها بس، عشان الخلايا تعبّي اللوحة */
const PAD = 30;
/** بُعد خط النيون عن الخلايا */
const GAP = 12;
const { ROWS, COLS } = LETTERS_HIVE_CONFIG;
const BOARD_W = COLS * W + W / 2;
const BOARD_H = 2 * R + (ROWS - 1) * STEP_Y;
const VW = BOARD_W + 2 * PAD;
const VH = BOARD_H + 2 * PAD;

/** شكل خلية النحل: جدران بنية فاتحة رفيعة، والخلية الفاضية عسلية والحرف بني */
const STROKE = "#8a5a1e";
const STROKE_W = 3;
const LETTER = "#3b1f04";
/** لمعة وتوهج الفريقين — اللون الأساسي نفسه من ثوابت اللعبة. neon: لون خط الإطار (قلبه فاتح وتوهجه بلون الفريق) */
const TEAM_SHADE: Record<HiveTeam, { light: string; dark: string; glow: string; neonCore: string; neonGlow: string }> = {
  green: { light: "#86efac", dark: "#14532d", glow: "#4ade80", neonCore: "#bbf7d0", neonGlow: "#22c55e" },
  red: { light: "#fca5a5", dark: "#7f1d1d", glow: "#f87171", neonCore: "#fecaca", neonGlow: "#ef4444" },
};

function center(i: number) {
  const { r, c } = cellPos(i);
  return { x: PAD + W / 2 + c * W + (r % 2 === 1 ? W / 2 : 0), y: PAD + R + r * STEP_Y };
}

function hexPoints(cx: number, cy: number, size: number) {
  return Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 180) * (60 * k - 90);
    return `${(cx + size * Math.cos(a)).toFixed(1)},${(cy + size * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

type Flip = { seq: number; from: HiveTeam | null; fromActive: boolean };

/**
 * الخلايا اللي تغيّر لونها داخل نفس الجولة (تلوين، مسح، تراجع) — عشان تنقلب. عرض بس.
 * أول ما تنفتح الشاشة، أو تبدأ جولة جديدة (الحروف تتغير)، ما ينقلب شي.
 */
function useCellFlips(letters: string[], owners: (HiveTeam | null)[], active: number | null) {
  const [track, setTrack] = useState({ letters, owners, active, flips: {} as Record<number, Flip>, seq: 0 });
  if (track.letters !== letters || track.owners !== owners || track.active !== active) {
    const sameRound = track.letters.length === letters.length && track.letters.every((l, i) => l === letters[i]);
    let seq = track.seq;
    const flips = sameRound ? { ...track.flips } : {};
    if (sameRound) {
      owners.forEach((o, i) => {
        const before = track.owners[i] ?? null;
        if ((o ?? null) !== before) flips[i] = { seq: ++seq, from: before, fromActive: track.active === i };
      });
    }
    setTrack({ letters, owners, active, flips, seq });
    return flips;
  }
  return track.flips;
}

/** وجه الخلية: السداسي واللمعة والحرف */
function CellFace({
  x,
  y,
  letter,
  owner,
  isActive,
  className = "",
}: {
  x: number;
  y: number;
  letter: string;
  owner: HiveTeam | null;
  isActive: boolean;
  className?: string;
}) {
  const fill = owner ? `url(#hv-${owner})` : isActive ? "url(#hv-active)" : "url(#hv-honey)";
  const glow = owner ? `url(#hv-glow-${owner})` : isActive ? "url(#hv-glow-active)" : undefined;
  return (
    <g className={`hv-face ${className}`}>
      <polygon points={hexPoints(x, y, R - 2)} fill={fill} stroke={STROKE} strokeWidth={STROKE_W} strokeLinejoin="round" filter={glow} />
      <ellipse cx={x} cy={y - R * 0.44} rx={R * 0.56} ry={R * 0.26} fill="url(#hv-gloss)" style={{ pointerEvents: "none" }} />
      <text
        x={x}
        y={y}
        dy="0.08em"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={R * 0.88}
        fontWeight={900}
        fill={owner ? "#ffffff" : LETTER}
        stroke={owner ? "rgba(0,0,0,0.35)" : "rgba(255,244,214,0.45)"}
        strokeWidth={owner ? 3 : 2}
        paintOrder="stroke"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {letter}
      </text>
    </g>
  );
}

/**
 * لوحة خلية الحروف — نفسها عند المقدم وعلى شاشة العرض.
 * الإطار مثل البرنامج: الأخضر فوق وتحت، والأحمر يمين ويسار.
 */
export default function HiveBoard({
  letters,
  owners,
  active,
  path,
  onCellClick,
  className = "",
}: {
  letters: string[];
  owners: (HiveTeam | null)[];
  active: number | null;
  /** مسار الفوز — يتوهج */
  path?: number[] | null;
  /** المقدم بس: يختار الحرف */
  onCellClick?: (index: number) => void;
  className?: string;
}) {
  const x0 = PAD;
  const x1 = PAD + BOARD_W;
  const y0 = PAD;
  const y1 = PAD + BOARD_H;
  // خطوط الإطار: الأخضر فوق وتحت (يوصّل من فوق لتحت)، والأحمر يمين ويسار
  const neon: { team: HiveTeam; x1: number; y1: number; x2: number; y2: number }[] = [
    { team: "green", x1: x0 + 6, y1: y0 - GAP, x2: x1 - 6, y2: y0 - GAP },
    { team: "green", x1: x0 + 6, y1: y1 + GAP, x2: x1 - 6, y2: y1 + GAP },
    { team: "red", x1: x0 - GAP, y1: y0 + 6, x2: x0 - GAP, y2: y1 - 6 },
    { team: "red", x1: x1 + GAP, y1: y0 + 6, x2: x1 + GAP, y2: y1 - 6 },
  ];
  const onPath = new Set(path ?? []);
  const flips = useCellFlips(letters, owners, active);

  return (
    <svg viewBox={`0 0 ${VW.toFixed(0)} ${VH.toFixed(0)}`} className={className} role="img" aria-label="لوحة خلية الحروف">
      <defs>
        <radialGradient id="hv-honey" cx="50%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffe9a3" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b8730c" />
        </radialGradient>
        <radialGradient id="hv-active" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#fff8e1" />
          <stop offset="100%" stopColor="#f3e0a6" />
        </radialGradient>
        {HIVE_TEAMS.map((team) => (
          <radialGradient key={team} id={`hv-${team}`} cx="50%" cy="30%" r="75%">
            <stop offset="0%" stopColor={TEAM_SHADE[team].light} />
            <stop offset="50%" stopColor={LETTERS_HIVE_TEAMS[team].fill} />
            <stop offset="100%" stopColor={TEAM_SHADE[team].dark} />
          </radialGradient>
        ))}
        <linearGradient id="hv-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {HIVE_TEAMS.map((team) => (
          <filter key={team} id={`hv-glow-${team}`} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={TEAM_SHADE[team].glow} floodOpacity="0.9" />
          </filter>
        ))}
        <filter id="hv-glow-active" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#ffffff" floodOpacity="0.95" />
        </filter>
        <filter id="hv-glow-path" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#fde68a" floodOpacity="1" />
        </filter>
        {/* توهج خطوط النيون: بوحدات اللوحة نفسها، لأن الخط الأفقي أو العمودي ما له عرض أو طول يحسب عليه المتصفح منطقة التوهج */}
        <filter id="hv-neon" filterUnits="userSpaceOnUse" x="0" y="0" width={VW} height={VH}>
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {/* خلفية غامقة شبه شفافة */}
      <rect x={1} y={1} width={VW - 2} height={VH - 2} rx={18} fill="#0b0703" fillOpacity={0.55} stroke="#fcd34d" strokeOpacity={0.16} strokeWidth={1.5} />
      {/* الإطار: خطوط نيون رفيعة متوهجة */}
      {neon.map((l, k) => (
        <g key={k} style={{ pointerEvents: "none" }}>
          <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={TEAM_SHADE[l.team].neonGlow} strokeWidth={8} strokeLinecap="round" filter="url(#hv-neon)" />
          <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={TEAM_SHADE[l.team].neonGlow} strokeWidth={4.5} strokeLinecap="round" />
          <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={TEAM_SHADE[l.team].neonCore} strokeWidth={2} strokeLinecap="round" />
        </g>
      ))}

      {letters.map((letter, i) => {
        const { x, y } = center(i);
        const owner = owners[i] ?? null;
        const isActive = active === i;
        const clickable = Boolean(onCellClick);
        const flip = flips[i];
        return (
          <g
            key={i}
            onClick={clickable ? () => onCellClick?.(i) : undefined}
            className={clickable ? "cursor-pointer group" : undefined}
            role={clickable ? "button" : undefined}
            aria-label={clickable ? `الحرف ${letter}` : undefined}
          >
            {/* المفتاح يتغير مع كل قلبة، فالحركة تبدأ من جديد */}
            <CellFace key={`in-${flip?.seq ?? 0}`} x={x} y={y} letter={letter} owner={owner} isActive={isActive} className={flip ? "hv-flip-in" : ""} />
            {flip && <CellFace key={`out-${flip.seq}`} x={x} y={y} letter={letter} owner={flip.from} isActive={flip.fromActive} className="hv-flip-out" />}
            {clickable && !owner && !isActive && (
              <polygon
                points={hexPoints(x, y, R - 6)}
                fill="#ffffff"
                fillOpacity={0.2}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ pointerEvents: "none" }}
              />
            )}
            {isActive && (
              <polygon points={hexPoints(x, y, R - 8)} fill="none" stroke="#ffffff" strokeWidth={6} filter="url(#hv-glow-active)" className="hv-active-ring" />
            )}
            {onPath.has(i) && (
              <polygon points={hexPoints(x, y, R - 9)} fill="none" stroke="#fff1a8" strokeWidth={7} filter="url(#hv-glow-path)" className="hv-path-ring" />
            )}
          </g>
        );
      })}
    </svg>
  );
}
