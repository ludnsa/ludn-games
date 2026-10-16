"use client";

import React from "react";
import { LETTERS_HIVE_CONFIG, LETTERS_HIVE_TEAMS } from "@/constants/letters-hive";
import { cellPos, type HiveTeam } from "@/lib/game/letters-hive-engine";

// هندسة اللوحة (وحدات SVG): سداسيات رأسها لفوق، والصفوف الفردية مزاحة لليمين نص خلية
const R = 50;
const W = Math.sqrt(3) * R;
const STEP_Y = 1.5 * R;
const PAD = 64;
const { ROWS, COLS } = LETTERS_HIVE_CONFIG;
const BOARD_W = COLS * W + W / 2;
const BOARD_H = 2 * R + (ROWS - 1) * STEP_Y;
const VW = BOARD_W + 2 * PAD;
const VH = BOARD_H + 2 * PAD;

const EMPTY_FILL = "#f4f2f1";
const ACTIVE_FILL = "#fde047";
const STROKE = "#26262b";
const LETTER = "#1e1b8f";

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
  const green = LETTERS_HIVE_TEAMS.green.frame;
  const red = LETTERS_HIVE_TEAMS.red.frame;
  const onPath = new Set(path ?? []);

  return (
    <svg viewBox={`0 0 ${VW.toFixed(0)} ${VH.toFixed(0)}`} className={className} role="img" aria-label="لوحة خلية الحروف">
      <rect width={VW} height={VH} rx={12} fill="#1f2023" />
      {/* الإطار */}
      <polygon points={`6,6 ${VW - 6},6 ${x1},${y0} ${x0},${y0}`} fill={green} />
      <polygon points={`6,${VH - 6} ${VW - 6},${VH - 6} ${x1},${y1} ${x0},${y1}`} fill={green} />
      <polygon points={`6,6 ${x0},${y0} ${x0},${y1} 6,${VH - 6}`} fill={red} />
      <polygon points={`${VW - 6},6 ${x1},${y0} ${x1},${y1} ${VW - 6},${VH - 6}`} fill={red} />
      {/* ورا الخلايا: الأطراف حمراء، والفراغات بين رؤوس الصف الأول والأخير خضراء */}
      <rect x={x0} y={y0} width={BOARD_W} height={BOARD_H} fill={red} />
      <rect x={x0} y={y0} width={BOARD_W} height={R / 2} fill={green} />
      <rect x={x0} y={y1 - R / 2} width={BOARD_W} height={R / 2} fill={green} />

      {letters.map((letter, i) => {
        const { x, y } = center(i);
        const owner = owners[i] ?? null;
        const isActive = active === i;
        const fill = owner ? LETTERS_HIVE_TEAMS[owner].fill : isActive ? ACTIVE_FILL : EMPTY_FILL;
        const clickable = Boolean(onCellClick);
        return (
          <g
            key={i}
            onClick={clickable ? () => onCellClick?.(i) : undefined}
            className={clickable ? "cursor-pointer group" : undefined}
            role={clickable ? "button" : undefined}
            aria-label={clickable ? `الحرف ${letter}` : undefined}
          >
            <polygon
              points={hexPoints(x, y, R - 3)}
              fill={fill}
              stroke={STROKE}
              strokeWidth={6}
              strokeLinejoin="round"
              className={`transition-[fill] duration-300 ${clickable && !owner && !isActive ? "group-hover:fill-[#e2e8f0]" : ""}`}
            />
            {isActive && (
              <polygon points={hexPoints(x, y, R - 8)} fill="none" stroke="#f59e0b" strokeWidth={7} className="animate-pulse" />
            )}
            {onPath.has(i) && (
              <polygon points={hexPoints(x, y, R - 9)} fill="none" stroke="#facc15" strokeWidth={7} className="animate-pulse" />
            )}
            <text
              x={x}
              y={y}
              dy="0.08em"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={R * 0.82}
              fontWeight={900}
              fill={owner ? "#ffffff" : LETTER}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {letter}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
