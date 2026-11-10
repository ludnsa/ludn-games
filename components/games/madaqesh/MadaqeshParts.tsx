"use client";

import React from "react";
import { MADAQESH_CONFIG, formatMoney } from "@/constants/madaqesh";
import type { MadaqeshGameCtx } from "@/hooks/games/madaqesh/useMadaqeshGame";
import { MQ_BTN, MQ_INPUT, MQ_MUTED, MQ_PANEL, MQ_SMALL_BTN, MQ_TILE } from "./madaqeshUi";

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`w-full ${MQ_PANEL} rounded-[2rem] p-5 md:p-6 animate-in zoom-in-95 ${className}`}
    >
      {children}
    </section>
  );
}

export function Money({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`tabular-nums ${className}`} dir="ltr">
      {formatMoney(value)}
    </span>
  );
}

/** تغيّر الرصيد: +2,000 أخضر / -6,000 أحمر */
export function Delta({ value, className = "" }: { value: number; className?: string }) {
  if (!value) return null;
  return (
    <span className={`tabular-nums font-black ${value > 0 ? "text-emerald-400" : "text-red-400"} ${className}`} dir="ltr">
      {value > 0 ? "+" : "−"}
      {formatMoney(Math.abs(value))}
    </span>
  );
}

/** الأزرار الكبيرة بألوان مداقش (madaqeshUi.ts) */
export const btn = MQ_BTN;

/**
 * خانة مبلغ: أرقام بس، وتحتها المبلغ مكتوب بالفواصل،
 * ومعها أزرار زيادة سريعة.
 */
export function MoneyInput({
  value,
  onChange,
  steps = MADAQESH_CONFIG.RAISE_STEPS,
  base = 0,
  placeholder = "المبلغ",
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  steps?: readonly number[];
  /** أزرار الزيادة تبدأ من هذا الرقم لو الخانة فاضية (مثلاً أعلى سومة) */
  base?: number;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        inputMode="numeric"
        dir="ltr"
        disabled={disabled}
        value={value ? formatMoney(value) : ""}
        placeholder={placeholder}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/[^\d]/g, ""));
          onChange(Number.isFinite(n) ? Math.min(n, 1_000_000_000) : 0);
        }}
        className={`w-full p-4 ${MQ_INPUT} rounded-2xl font-black text-3xl text-center tabular-nums disabled:opacity-50`}
      />
      {steps.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5">
          {steps.map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => onChange((value || base) + s)}
              className={`py-2.5 rounded-xl ${MQ_SMALL_BTN} font-black text-sm tabular-nums active:translate-y-[2px] active:border-b-2 disabled:opacity-40`}
              dir="ltr"
            >
              +{s >= 1000 ? `${s / 1000}K` : s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** لوحة الأرصدة: دايماً قدام الكل */
export function BalanceBoard({ ctx }: { ctx: MadaqeshGameCtx }) {
  const { room, players, me } = ctx;
  if (!room) return null;
  const round = room.round;
  const target = room.settings.targetAmount;
  const bidderId = room.phase === "bidding" && round ? round.order[round.turn] : null;
  const showDeltas = room.phase === "result" || room.phase === "ended";
  // الأسماء ثابتة بترتيب الجلسة — ما تتحرك مع تبديل البادئ كل جولة
  const ranked = [...players].sort((a, b) => a.seat - b.seat);

  return (
    <Panel className="!p-3 md:!p-4">
      <ul className="flex flex-col gap-1.5">
        {ranked.map((p) => {
          const pct = Math.min(100, Math.max(0, (p.balance / target) * 100));
          const isBidder = p.id === bidderId;
          const isDecider = round?.deciderId === p.id && room.phase !== "bidding";
          const delta = showDeltas ? round?.result?.deltas[p.id] ?? 0 : 0;
          return (
            <li
              key={p.id}
              className={`relative overflow-hidden rounded-2xl px-3 py-2.5 ${
                p.is_out ? "bg-[#0b1020]/80 opacity-45 grayscale" : isBidder ? "bg-[#b3202a]/30 ring-2 ring-[#d6a531] shadow-[0_0_18px_-4px_rgba(214,165,49,0.7)]" : MQ_TILE
              } ${p.id === me?.id ? "!border-2 !border-sky-300/70" : ""}`}
            >
              {/* شريط التقدم نحو مبلغ الفوز */}
              <span
                aria-hidden
                className="absolute inset-y-0 right-0 bg-[#d6a531]/20 transition-[width] duration-700"
                style={{ width: `${pct}%` }}
              />
              <span className="relative flex items-center gap-2">
                <span className="flex-1 min-w-0">
                  <span className="block font-black leading-tight break-words">
                    {isDecider && "👑 "}
                    {isBidder && "🎯 "}
                    {p.display_name}
                    {p.id === me?.id && <span className="text-sky-300 text-xs"> (أنت)</span>}
                  </span>
                  {(p.bankrupts > 0 || p.is_out) && (
                    <span className="block text-[11px] font-bold text-red-300">
                      {p.is_out ? "☠️ طلع من اللعبة" : `💸 إفلاس ${p.bankrupts} من ${room.settings.maxBankrupts}`}
                    </span>
                  )}
                </span>
                <span className="text-end shrink-0">
                  <Money value={p.balance} className="block font-black text-lg leading-tight" />
                  <Delta value={delta} className="block text-xs animate-in fade-in slide-in-from-bottom-1" />
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className={`text-center text-[11px] font-bold ${MQ_MUTED} mt-2`}>
        🏆 الفوز عند <Money value={target} />
      </p>
    </Panel>
  );
}
