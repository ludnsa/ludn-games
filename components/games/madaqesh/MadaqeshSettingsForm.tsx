"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { MADAQESH_CONFIG, formatMoney } from "@/constants/madaqesh";
import type { MadaqeshSettings } from "@/types/madaqesh";
import { btn, MoneyInput } from "./MadaqeshParts";

export const DEFAULT_MADAQESH_SETTINGS: MadaqeshSettings = {
  startBalance: MADAQESH_CONFIG.DEFAULT_START_BALANCE,
  targetAmount: MADAQESH_CONFIG.DEFAULT_TARGET,
  maxBankrupts: MADAQESH_CONFIG.DEFAULT_MAX_BANKRUPTS,
};

function shortMoney(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000} مليون`;
  if (n >= 1000) return `${n / 1000} ألف`;
  return formatMoney(n);
}

/** خيارات جاهزة + خانة لأي رقم */
function AmountPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly number[];
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <p className="font-bold text-sm text-slate-400 mb-2">{label}</p>
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={value === o}
            className={`py-2.5 rounded-2xl font-black text-sm border-b-4 ${
              value === o ? "bg-amber-500 border-amber-700 text-slate-950" : "bg-slate-800 border-slate-950"
            }`}
          >
            {shortMoney(o)}
          </button>
        ))}
      </div>
      <MoneyInput value={value} onChange={onChange} steps={[]} placeholder="أو اكتب المبلغ" />
    </div>
  );
}

export default function MadaqeshSettingsForm({
  initial,
  busy,
  submitLabel,
  onSubmit,
  children,
}: {
  initial: MadaqeshSettings;
  busy: boolean;
  submitLabel: string;
  onSubmit: (s: MadaqeshSettings) => void;
  children?: React.ReactNode;
}) {
  const [s, setS] = useState<MadaqeshSettings>(initial);
  const invalid = s.targetAmount <= s.startBalance || s.startBalance < 1000;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!invalid) onSubmit(s);
      }}
    >
      {children}
      <AmountPicker
        label="💰 رصيد البداية لكل لاعب"
        options={MADAQESH_CONFIG.START_BALANCE_OPTIONS}
        value={s.startBalance}
        onChange={(startBalance) => setS((x) => ({ ...x, startBalance }))}
      />
      <AmountPicker
        label="🏆 مبلغ الفوز"
        options={MADAQESH_CONFIG.TARGET_OPTIONS}
        value={s.targetAmount}
        onChange={(targetAmount) => setS((x) => ({ ...x, targetAmount }))}
      />
      <div>
        <p className="font-bold text-sm text-slate-400 mb-2">
          💸 كم مرة يقدر يفلس؟ (يرجع رصيده {formatMoney(MADAQESH_CONFIG.REVIVE_BALANCE)})
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {[0, ...MADAQESH_CONFIG.BANKRUPT_OPTIONS].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setS((x) => ({ ...x, maxBankrupts: n }))}
              aria-pressed={s.maxBankrupts === n}
              className={`py-2.5 rounded-2xl font-black border-b-4 ${
                s.maxBankrupts === n ? "bg-amber-500 border-amber-700 text-slate-950" : "bg-slate-800 border-slate-950"
              }`}
            >
              {n === 0 ? "ولا مرة" : n}
            </button>
          ))}
        </div>
      </div>
      {s.targetAmount <= s.startBalance && (
        <p className="text-sm font-bold text-red-400">مبلغ الفوز لازم يكون أكبر من رصيد البداية.</p>
      )}
      <button type="submit" disabled={busy || invalid} className={btn.primary}>
        {busy && <Loader2 className="animate-spin" size={22} />}
        {submitLabel}
      </button>
    </form>
  );
}
