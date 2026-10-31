import React from "react";

/**
 * أغلفة مؤقتة للألعاب اللي ما لها رسمة للحين — خطوط بسيطة فيها تفاصيل من كل لعبة.
 * الألوان والتظليل في globals.css (ludn-art).
 */
export type GameArtKind = "castle" | "world" | "auction" | "quiz" | "madaqesh" | "hive";

const SVG = {
  viewBox: "0 0 120 120",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

// خلية الحروف: سداسيات حول حرف بالنص
const HEX_R = 17;
const HEX = `M0 ${-HEX_R} L${HEX_R * 0.866} ${-HEX_R / 2} L${HEX_R * 0.866} ${HEX_R / 2} L0 ${HEX_R} L${-HEX_R * 0.866} ${HEX_R / 2} L${-HEX_R * 0.866} ${-HEX_R / 2} Z`;
const HIVE: [number, number, string][] = [
  [60, 60, "ل"],
  [89.4, 60, "ب"],
  [74.7, 85.5, "ت"],
  [45.3, 85.5, "ج"],
  [30.6, 60, "ح"],
  [45.3, 34.5, "س"],
  [74.7, 34.5, "ع"],
];

// تحدي الفئات: لوحة نقاط 200 و400 و600
const QUIZ_ROWS = [200, 400, 600];
const QUIZ_COLS = [10, 45, 80];

const ART: Record<GameArtKind, React.ReactNode> = {
  castle: (
    <svg {...SVG} strokeWidth={4}>
      <path d="M14 104V46h8v-9h8v9h8v-9h8v9v14h28V46h8v-9h8v9h8v-9h8v9v58Z" />
      <path d="M50 104V86a10 10 0 0 1 20 0v18" />
      <path d="M60 60V20l18 7-18 7" />
      <path d="M26 64v10M94 64v10" />
    </svg>
  ),
  world: (
    <svg {...SVG} strokeWidth={4}>
      <circle cx="56" cy="64" r="40" />
      <ellipse cx="56" cy="64" rx="17" ry="40" />
      <path d="M16 64h80M22 44h68M22 84h68" />
      <path d="M88 22c0-7 5-12 11-12s11 5 11 12c0 9-11 20-11 20S88 31 88 22z" fill="currentColor" fillOpacity={0.25} />
      <circle cx="99" cy="22" r="3.5" />
    </svg>
  ),
  auction: (
    <svg {...SVG} strokeWidth={4}>
      <g transform="rotate(-38 62 52)">
        <rect x="34" y="30" width="56" height="22" rx="5" />
        <path d="M28 34v14M96 34v14" />
        <path d="M62 52v46" />
      </g>
      <path d="M22 104h52" />
      <path d="M30 104v-8h36v8" />
    </svg>
  ),
  quiz: (
    <svg {...SVG} strokeWidth={3.5}>
      {QUIZ_ROWS.map((points, r) =>
        QUIZ_COLS.map((x, c) => {
          const y = 14 + r * 33;
          const lit = (r === 1 && c === 1) || (r === 2 && c === 2);
          return (
            <g key={`${r}-${c}`}>
              <rect x={x} y={y} width="30" height="26" rx="5" {...(lit ? { fill: "currentColor", fillOpacity: 0.22 } : {})} />
              <text x={x + 15} y={y + 18} fontSize="11" textAnchor="middle">
                {points}
              </text>
            </g>
          );
        })
      )}
    </svg>
  ),
  madaqesh: (
    <svg {...SVG} strokeWidth={4}>
      <rect x="26" y="10" width="68" height="100" rx="12" />
      <rect x="36" y="22" width="48" height="22" rx="4" fill="currentColor" fillOpacity={0.2} />
      <text x="78" y="39" fontSize="15" textAnchor="end">
        152
      </text>
      <path d="M40 60h.01M60 60h.01M80 60h.01M40 76h.01M60 76h.01M80 76h.01M40 92h.01M60 92h.01" strokeWidth={9} />
      <path d="M80 88v8" strokeWidth={9} />
    </svg>
  ),
  hive: (
    <svg {...SVG} strokeWidth={3}>
      {HIVE.map(([x, y, letter], i) => (
        <g key={letter} transform={`translate(${x} ${y})`}>
          <path d={HEX} {...(i === 0 ? { fill: "currentColor", fillOpacity: 0.25 } : {})} />
          <text y="5" fontSize="15" textAnchor="middle">
            {letter}
          </text>
        </g>
      ))}
    </svg>
  ),
};

export function GameArt({ kind, wide = false }: { kind: GameArtKind; wide?: boolean }) {
  return (
    <div aria-hidden className={`ludn-art ludn-art-${kind} ${wide ? "ludn-art-wide" : ""}`}>
      {ART[kind]}
    </div>
  );
}
