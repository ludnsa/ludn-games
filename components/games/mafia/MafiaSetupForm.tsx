"use client";

import React, { useState } from "react";
import { Loader2, Minus, Plus, AlertCircle, Users, MessagesSquare, Check, Play } from "lucide-react";
import { MAFIA_CONFIG, MAFIA_OPTIONAL_ROLES, MAFIA_ROLES, mafiaCardSrc } from "@/constants/mafia";
import { mafiaCitizenCount, mafiaMaxMafia, validateMafiaSettings } from "@/lib/game/mafia-engine";
import type { MafiaOptionalRole, MafiaRole, MafiaSettings } from "@/types";
import { DiscussionTimePicker, RoleIcon } from "./MafiaParts";
import { BTN_GOLD, CARD, CHIP, CTA_BAR, INSET, LABEL, NOTE } from "./mafiaUi";

export const DEFAULT_MAFIA_SETTINGS: MafiaSettings = {
  maxPlayers: MAFIA_CONFIG.MIN_PLAYERS,
  mafiaCount: MAFIA_CONFIG.DEFAULT_MAFIA,
  optionalRoles: [],
};

function Stepper({
  label,
  icon,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const btn =
    "w-[34px] h-[34px] shrink-0 rounded-[11px] bg-ludn-surface border border-ludn-line flex items-center justify-center disabled:opacity-30";
  return (
    <div className={`${INSET} p-2.5 grid gap-1.5`}>
      <span className={`${LABEL} flex items-center gap-1.5`}>
        {icon}
        {label}
      </span>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={`زيادة ${label}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className={btn}
        >
          <Plus size={18} />
        </button>
        <span className="font-display text-[32px] leading-none tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`إنقاص ${label}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className={btn}
        >
          <Minus size={18} />
        </button>
      </div>
    </div>
  );
}

/**
 * نموذج إعداد الفئات — يُستخدم عند إنشاء الغرفة، وداخل غرفة الانتظار لتعديلها.
 * المحقق والطبيب والمافيا إجباريين، والباقي مواطنين تلقائياً.
 * sticky: زر الحفظ ثابت تحت الشاشة (شاشة إنشاء الغرفة)
 */
export default function MafiaSetupForm({
  initial,
  submitLabel,
  busy,
  minPlayers = MAFIA_CONFIG.MIN_PLAYERS,
  sticky = false,
  onSubmit,
  children,
}: {
  initial: MafiaSettings;
  submitLabel: string;
  busy: boolean;
  /** في غرفة الانتظار: ما ينفع العدد يكون أقل من اللي داخلين */
  minPlayers?: number;
  sticky?: boolean;
  onSubmit: (settings: MafiaSettings) => void;
  children?: React.ReactNode;
}) {
  const [settings, setSettings] = useState<MafiaSettings>(initial);

  const maxMafia = mafiaMaxMafia(settings.maxPlayers, settings.optionalRoles.length);
  const citizens = mafiaCitizenCount(settings);
  const problem = validateMafiaSettings(settings);
  // كل فئة اختيارية تاخذ مكان مواطن — فما ننزل العدد لين تصير الفئات أكثر من المواطنين
  const minForRoles = settings.mafiaCount + 2 + settings.optionalRoles.length;

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

  const fixedRows: { role: MafiaRole; label: string; count: number }[] = [
    { role: "mafia", label: MAFIA_ROLES.mafia.label, count: settings.mafiaCount },
    { role: "detective", label: MAFIA_ROLES.detective.label, count: 1 },
    { role: "doctor", label: MAFIA_ROLES.doctor.label, count: 1 },
    { role: "citizen", label: "مواطنين", count: citizens },
  ];

  const submit = (
    <button type="submit" disabled={busy || Boolean(problem)} className={BTN_GOLD}>
      {busy ? <Loader2 className="animate-spin" size={20} /> : <Play size={18} className="fill-current" />}
      {submitLabel}
    </button>
  );

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!problem) onSubmit(settings);
      }}
    >
      <div className={`${CARD} grid gap-4`}>
        {children}

        <div className="grid grid-cols-2 gap-2">
          <Stepper
            label="اللاعبين"
            icon={<Users size={16} />}
            value={settings.maxPlayers}
            min={Math.max(MAFIA_CONFIG.MIN_PLAYERS, minPlayers, minForRoles)}
            max={MAFIA_CONFIG.MAX_PLAYERS}
            onChange={setPlayers}
          />
          <Stepper
            label="المافيا"
            icon={<RoleIcon role="mafia" className="w-[22px] h-[22px]" />}
            value={settings.mafiaCount}
            min={MAFIA_CONFIG.MIN_MAFIA}
            max={maxMafia}
            onChange={(mafiaCount) => setSettings((s) => ({ ...s, mafiaCount }))}
          />
        </div>

        <div>
          <p className={`${LABEL} flex items-center justify-between mb-2`}>
            الفئات الإضافية
            <span className="text-ludn-gold-text">
              {settings.optionalRoles.length} من {MAFIA_OPTIONAL_ROLES.length}
            </span>
          </p>
          {/* بطاقات الفئات نفسها: المختارة بإطار ذهبي وعلامة ✓، والباقي باهت */}
          <div className="grid grid-cols-3 gap-2">
            {MAFIA_OPTIONAL_ROLES.map((role) => {
              const def = MAFIA_ROLES[role];
              const on = settings.optionalRoles.includes(role);
              // ما بقى مواطن عادي يتحول لها
              const full = !on && citizens <= 0;
              return (
                <button
                  key={role}
                  type="button"
                  aria-pressed={on}
                  aria-label={def.label}
                  disabled={full}
                  onClick={() => toggleRole(role)}
                  className="relative rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mafiaCardSrc(role)}
                    alt=""
                    draggable={false}
                    className={`block w-full aspect-[512/752] rounded-[11px] select-none transition-[filter,box-shadow] ${
                      on
                        ? "shadow-[0_0_0_2px_var(--ludn-gold),0_10px_24px_rgba(226,184,74,0.22)]"
                        : "grayscale-[55%] brightness-[0.55]"
                    }`}
                  />
                  {on && (
                    <span className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-ludn-gold text-ludn-gold-ink grid place-items-center shadow-md">
                      <Check size={14} strokeWidth={3.2} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className={`${NOTE} mt-2`}>
            {citizens <= 0 ? "ما بقى مواطن — زد اللاعبين عشان تضيف فئة" : "كل فئة تاخذ مكان مواطن"}
          </p>
        </div>

        <div>
          <p className={`${LABEL} flex items-center gap-1.5 mb-2`}>
            <MessagesSquare size={16} className="shrink-0" /> وقت النقاش
            <span className="font-semibold">(تقدر تغيّره بالصباح)</span>
          </p>
          <DiscussionTimePicker
            value={settings.discussionSeconds ?? MAFIA_CONFIG.DISCUSSION_SECONDS}
            onChange={(discussionSeconds) => setSettings((s) => ({ ...s, discussionSeconds }))}
          />
        </div>

        <div>
          <p className={`${LABEL} mb-2`}>التوزيعة</p>
          <div className="flex flex-wrap gap-1.5">
            {fixedRows.map((r) => (
              <span key={r.label} className={CHIP}>
                <RoleIcon role={r.role} className="w-[22px] h-[22px]" /> {r.label}
                {(r.role === "mafia" || r.role === "citizen") && ` ×${r.count}`}
              </span>
            ))}
            {settings.optionalRoles.map((role) => (
              <span key={role} className={`${CHIP} border-ludn-gold/35 text-ludn-gold-text`}>
                <RoleIcon role={role} className="w-[22px] h-[22px]" /> {MAFIA_ROLES[role].label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {problem && (
        <p className="flex items-center gap-2 text-[13px] font-bold text-ludn-gold-text bg-ludn-gold/8 border border-ludn-gold/25 rounded-2xl p-2.5">
          <AlertCircle size={18} className="shrink-0" /> {problem}
        </p>
      )}

      {sticky ? <div className={CTA_BAR}>{submit}</div> : submit}
    </form>
  );
}
