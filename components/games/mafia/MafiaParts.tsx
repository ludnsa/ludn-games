"use client";

import React, { useState, useSyncExternalStore } from "react";
import { Volume2, VolumeX, Eye } from "lucide-react";
import { MAFIA_CONFIG, MAFIA_ROLES } from "@/constants/mafia";
import { isMafiaMuted, setMafiaMuted, subscribeMafiaMuted, unlockMafiaAudio } from "@/lib/game/mafia-sounds";
import type { MafiaRole } from "@/types";

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`w-full bg-slate-900/80 border-2 border-slate-800 rounded-[2rem] p-5 md:p-6 shadow-2xl animate-in zoom-in-95 ${className}`}
    >
      {children}
    </section>
  );
}

export function TimerBadge({ seconds, danger = 5 }: { seconds: number | null; danger?: number }) {
  if (seconds === null) return null;
  const hot = seconds <= danger;
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return (
    <span
      className={`min-w-16 px-3 py-1.5 rounded-2xl font-black text-xl tabular-nums text-center border-b-4 ${
        hot ? "bg-red-600 border-red-800 animate-pulse" : "bg-slate-800 border-slate-950"
      }`}
      dir="ltr"
      aria-live="off"
    >
      {mm > 0 ? `${mm}:${String(ss).padStart(2, "0")}` : ss}
    </span>
  );
}

export function SoundToggle() {
  const muted = useSyncExternalStore(subscribeMafiaMuted, isMafiaMuted, () => false);
  return (
    <button
      type="button"
      onClick={() => {
        unlockMafiaAudio();
        setMafiaMuted(!muted);
      }}
      aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
      title={muted ? "تشغيل الصوت" : "كتم الصوت"}
      className={`w-11 h-11 rounded-2xl flex items-center justify-center border-b-4 transition-colors ${
        muted ? "bg-slate-800 border-slate-950 text-slate-400" : "bg-emerald-600 border-emerald-800 text-white"
      }`}
    >
      {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
    </button>
  );
}

export function RoleCard({
  role,
  compact = false,
  teammates = [],
}: {
  role: MafiaRole;
  compact?: boolean;
  /** المافيا: أسماء زملائه — تطلع داخل البطاقة نفسها عشان ما تفوته */
  teammates?: string[];
}) {
  const def = MAFIA_ROLES[role];
  return (
    <div
      className={`rounded-[2rem] bg-gradient-to-br ${def.accent} text-white text-center shadow-2xl ${
        compact ? "p-4" : "p-7 mfx-flip-in"
      }`}
    >
      <div className={`${compact ? "text-5xl" : "text-8xl"} mb-2 drop-shadow-lg`}>{def.emoji}</div>
      <p className={`${compact ? "text-2xl" : "text-4xl"} font-black mb-2`}>{def.label}</p>
      {teammates.length > 0 && (
        <div className={`${compact ? "mb-3 p-3" : "mb-4 p-4"} rounded-2xl bg-black/35 border border-white/20`}>
          <p className="font-black text-sm mb-2">🤝 عصابتك</p>
          <div className="flex flex-wrap justify-center gap-2">
            {teammates.map((n) => (
              <span key={n} className={`px-3 py-1.5 rounded-xl bg-white text-red-800 font-black ${compact ? "text-base" : "text-lg"}`}>
                {n}
              </span>
            ))}
          </div>
        </div>
      )}
      <p className={`${compact ? "text-xs" : "text-sm"} font-bold opacity-90 leading-relaxed`}>{def.description}</p>
    </div>
  );
}

/** زر "دوري" — اضغط مطوّل عشان تشوف دورك، وأول ما ترفع إصبعك يختفي */
export function RolePeek({ role, teammates = [] }: { role: MafiaRole | null; teammates?: string[] }) {
  const [show, setShow] = useState(false);
  if (!role) return null;
  return (
    <>
      <button
        type="button"
        onPointerDown={() => setShow(true)}
        onPointerUp={() => setShow(false)}
        onPointerLeave={() => setShow(false)}
        onContextMenu={(e) => e.preventDefault()}
        className="h-11 px-3 rounded-2xl bg-slate-800 border-b-4 border-slate-950 font-black text-sm flex items-center gap-1.5 select-none touch-none"
      >
        <Eye size={18} /> دوري
      </button>
      {show && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-slate-950/90 pointer-events-none">
          <div className="w-full max-w-sm">
            <RoleCard role={role} compact teammates={teammates} />
          </div>
        </div>
      )}
    </>
  );
}

/** عدد الأصوات داخل الزر نفسه — ما ينقص حتى على الشاشات الصغيرة */
export function VoteCount({ count }: { count: number }) {
  return (
    <span
      key={count}
      className="shrink-0 min-w-9 h-8 px-2 rounded-xl bg-amber-400 text-slate-950 text-base font-black flex items-center justify-center gap-0.5 shadow-md animate-in zoom-in-50"
      aria-label={`${count} أصوات`}
    >
      ✓ {count}
    </span>
  );
}

/** أسماء المصوّتين تحت الاسم — التصويت مكشوف عشان الكل يحلل */
export function VoterNames({ names, className = "" }: { names: string[]; className?: string }) {
  return (
    <span className={`flex flex-wrap gap-1 justify-start ${className}`}>
      {names.map((n) => (
        <span
          key={n}
          className="px-1.5 py-0.5 rounded-md bg-black/30 text-[11px] font-bold leading-tight animate-in fade-in zoom-in-95"
        >
          {n}
        </span>
      ))}
    </span>
  );
}

export interface PickerOption {
  id: string;
  name: string;
}

/** قائمة اللاعبين للاختيار — تُستخدم في أدوار الليل وفي التصويت */
export function PlayerPicker({
  options,
  selectedId,
  disabled,
  onPick,
  badge,
  voters,
  accent = "red",
}: {
  options: PickerOption[];
  selectedId: string | null;
  disabled?: boolean;
  onPick: (id: string) => void;
  /** رقم صغير جنب الاسم (عدد الأصوات) */
  badge?: (id: string) => number | undefined;
  /** أسماء اللي صوّتوا على هذا اللاعب — تطلع تحت اسمه */
  voters?: (id: string) => string[];
  accent?: "red" | "emerald" | "sky" | "purple" | "amber" | "orange";
}) {
  const selectedStyle: Record<string, string> = {
    red: "bg-red-600 border-red-800",
    emerald: "bg-emerald-600 border-emerald-800",
    sky: "bg-sky-600 border-sky-800",
    purple: "bg-purple-600 border-purple-800",
    amber: "bg-amber-600 border-amber-800",
    orange: "bg-orange-600 border-orange-800",
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => {
        const selected = o.id === selectedId;
        const count = badge?.(o.id);
        const names = voters?.(o.id) ?? [];
        return (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(o.id)}
            aria-pressed={selected}
            className={`flex flex-col items-stretch gap-1.5 py-3.5 px-3 rounded-2xl font-black border-b-4 transition-all text-base ${
              selected
                ? `${selectedStyle[accent]} text-white scale-[1.03]`
                : "bg-slate-800 border-slate-950 text-slate-100 hover:bg-slate-700"
            } disabled:cursor-not-allowed ${disabled && !selected ? "opacity-50" : ""}`}
          >
            {/* الاسم بسطر كامل عشان ما ينكسر، والعدد والمصوّتين تحته */}
            <span className="w-full break-words leading-tight text-right">{o.name}</span>
            {((count ?? 0) > 0 || names.length > 0) && (
              <span className="flex flex-wrap items-center gap-1">
                {count !== undefined && count > 0 && <VoteCount count={count} />}
                {names.length > 0 && <VoterNames names={names} />}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** اختيار وقت النقاش: 2 / 3 / 5 دقائق */
export function DiscussionTimePicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (seconds: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="وقت النقاش">
      {MAFIA_CONFIG.DISCUSSION_OPTIONS.map((secs) => {
        const on = secs === value;
        return (
          <button
            key={secs}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(secs)}
            className={`min-h-11 py-2.5 rounded-2xl font-black border-b-4 transition-all disabled:opacity-50 ${
              on ? "bg-amber-500 border-amber-700 text-slate-950" : "bg-slate-800 border-slate-950 text-slate-200"
            }`}
          >
            {secs === 120 ? "دقيقتين" : `${secs / 60} دقائق`}
          </button>
        );
      })}
    </div>
  );
}
