"use client";

import React, { useState } from "react";
import { Loader2, Minus, Plus, AlertCircle } from "lucide-react";
import { MAFIA_CONFIG, MAFIA_OPTIONAL_ROLES, MAFIA_ROLES } from "@/constants/mafia";
import { mafiaCitizenCount, mafiaMaxMafia, validateMafiaSettings } from "@/lib/game/mafia-engine";
import type { MafiaOptionalRole, MafiaSettings } from "@/types";
import { DiscussionTimePicker } from "./MafiaParts";

export const DEFAULT_MAFIA_SETTINGS: MafiaSettings = {
  maxPlayers: MAFIA_CONFIG.MIN_PLAYERS,
  mafiaCount: MAFIA_CONFIG.MIN_MAFIA,
  optionalRoles: [],
};

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-slate-900 border-2 border-slate-800 rounded-2xl p-3">
      <span className="font-black text-slate-200">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`زيادة ${label}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 flex items-center justify-center"
        >
          <Plus size={20} />
        </button>
        <span className="w-8 text-center text-2xl font-black tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`إنقاص ${label}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 flex items-center justify-center"
        >
          <Minus size={20} />
        </button>
      </div>
    </div>
  );
}

/**
 * نموذج إعداد الفئات — يُستخدم عند إنشاء الغرفة، وداخل غرفة الانتظار لتعديلها.
 * المحقق والدكتور والمافيا (2 على الأقل) إجباريين، والباقي مواطنين تلقائياً.
 */
export default function MafiaSetupForm({
  initial,
  submitLabel,
  busy,
  minPlayers = MAFIA_CONFIG.MIN_PLAYERS,
  onSubmit,
  children,
}: {
  initial: MafiaSettings;
  submitLabel: string;
  busy: boolean;
  /** في غرفة الانتظار: ما ينفع العدد يكون أقل من اللي داخلين */
  minPlayers?: number;
  onSubmit: (settings: MafiaSettings) => void;
  children?: React.ReactNode;
}) {
  const [settings, setSettings] = useState<MafiaSettings>(initial);

  const maxMafia = mafiaMaxMafia(settings.maxPlayers, settings.optionalRoles.length);
  const citizens = mafiaCitizenCount(settings);
  const problem = validateMafiaSettings(settings);

  const setPlayers = (maxPlayers: number) =>
    setSettings((s) => ({
      ...s,
      maxPlayers,
      mafiaCount: Math.min(s.mafiaCount, mafiaMaxMafia(maxPlayers, s.optionalRoles.length)),
    }));

  const toggleRole = (role: MafiaOptionalRole) =>
    setSettings((s) => {
      const optionalRoles = s.optionalRoles.includes(role)
        ? s.optionalRoles.filter((r) => r !== role)
        : [...s.optionalRoles, role];
      return { ...s, optionalRoles };
    });

  const fixedRows: { emoji: string; label: string; count: number }[] = [
    { emoji: MAFIA_ROLES.detective.emoji, label: MAFIA_ROLES.detective.label, count: 1 },
    { emoji: MAFIA_ROLES.doctor.emoji, label: MAFIA_ROLES.doctor.label, count: 1 },
    { emoji: MAFIA_ROLES.mafia.emoji, label: MAFIA_ROLES.mafia.label, count: settings.mafiaCount },
    { emoji: MAFIA_ROLES.citizen.emoji, label: "مواطنين", count: citizens },
  ];

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!problem) onSubmit(settings);
      }}
    >
      {children}

      <Stepper
        label="👥 عدد اللاعبين"
        value={settings.maxPlayers}
        min={Math.max(MAFIA_CONFIG.MIN_PLAYERS, minPlayers)}
        max={MAFIA_CONFIG.MAX_PLAYERS}
        onChange={setPlayers}
      />
      <Stepper
        label="🔪 عدد المافيا"
        value={settings.mafiaCount}
        min={MAFIA_CONFIG.MIN_MAFIA}
        max={maxMafia}
        onChange={(mafiaCount) => setSettings((s) => ({ ...s, mafiaCount }))}
      />

      <div>
        <p className="font-bold text-sm text-slate-400 mb-2">فئات اختيارية (وحدة من كل فئة بالكثير)</p>
        <div className="grid grid-cols-2 gap-2">
          {MAFIA_OPTIONAL_ROLES.map((role) => {
            const def = MAFIA_ROLES[role];
            const on = settings.optionalRoles.includes(role);
            return (
              <button
                key={role}
                type="button"
                aria-pressed={on}
                onClick={() => toggleRole(role)}
                className={`p-3 rounded-2xl border-2 border-b-4 text-right transition-all ${
                  on
                    ? "bg-red-600/20 border-red-500 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600"
                }`}
              >
                <span className="text-2xl block mb-1">{def.emoji}</span>
                <span className="font-black block">{def.label}</span>
                <span className="text-[11px] font-bold opacity-70">{on ? "مضاف ✓" : "اضغط للإضافة"}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="font-bold text-sm text-slate-400 mb-2">🗣️ وقت النقاش (تقدر تغيّره بعدين لحظة نتائج الصباح)</p>
        <DiscussionTimePicker
          value={settings.discussionSeconds ?? MAFIA_CONFIG.DISCUSSION_SECONDS}
          onChange={(discussionSeconds) => setSettings((s) => ({ ...s, discussionSeconds }))}
        />
      </div>

      <div className="bg-slate-900/60 border-2 border-dashed border-slate-800 rounded-2xl p-3">
        <p className="font-bold text-xs text-slate-500 mb-2">التوزيعة</p>
        <div className="flex flex-wrap gap-2">
          {fixedRows.map((r) => (
            <span key={r.label} className="px-3 py-1.5 rounded-xl bg-slate-800 font-black text-sm">
              {r.emoji} {r.label} × {r.count}
            </span>
          ))}
          {settings.optionalRoles.map((role) => (
            <span key={role} className="px-3 py-1.5 rounded-xl bg-red-900/40 font-black text-sm">
              {MAFIA_ROLES[role].emoji} {MAFIA_ROLES[role].label} × 1
            </span>
          ))}
        </div>
      </div>

      {problem && (
        <p className="flex items-center gap-2 text-sm font-bold text-amber-300 bg-amber-950/40 rounded-xl p-3">
          <AlertCircle size={18} className="shrink-0" /> {problem}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || Boolean(problem)}
        className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-lg rounded-2xl border-b-4 border-red-800 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
      >
        {busy && <Loader2 className="animate-spin" size={22} />}
        {submitLabel}
      </button>
    </form>
  );
}
