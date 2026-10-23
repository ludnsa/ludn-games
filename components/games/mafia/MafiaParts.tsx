"use client";

import React, { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Volume2, VolumeX, Eye, Users, VenetianMask, Moon } from "lucide-react";
import { MAFIA_CONFIG, MAFIA_ROLES, mafiaCardSrc, mafiaIconSrc } from "@/constants/mafia";
import { isMafiaMuted, setMafiaMuted, subscribeMafiaMuted, unlockMafiaAudio } from "@/lib/game/mafia-sounds";
import type { MafiaAnnouncementKind, MafiaRole } from "@/types";

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

/** أيقونة الدور الدائرية (بدون كلام) */
export function RoleIcon({ role, className = "w-10 h-10" }: { role: MafiaRole; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mafiaIconSrc(role)}
      alt={MAFIA_ROLES[role].label}
      draggable={false}
      className={`shrink-0 object-contain select-none ${className}`}
    />
  );
}

/** كل إعلان من إعلانات الصباح بأيقونة الدور اللي سوّاه */
const ANNOUNCEMENT_ROLE: Partial<Record<MafiaAnnouncementKind, MafiaRole>> = {
  kill: "mafia",
  saved: "doctor",
  soldier: "soldier",
  bomb: "suicide",
  investigate_hit: "detective",
  investigate_miss: "detective",
  investigate_none: "detective",
  magic: "magician",
  journalist: "journalist",
  silence: "silencer",
  hushed_kill: "silencer",
  // المنشئ ذبح غشاش: أيقونة المافيا علامة اللعبة نفسها
  cheat_kill: "mafia",
};

export function AnnouncementIcon({ kind, className = "w-12 h-12" }: { kind: MafiaAnnouncementKind; className?: string }) {
  const role = ANNOUNCEMENT_ROLE[kind];
  if (role) return <RoleIcon role={role} className={className} />;
  // ليلة هادئة: ما أحد سوّى شي
  return (
    <span
      className={`shrink-0 rounded-full bg-indigo-950 border-2 border-indigo-700 text-indigo-200 flex items-center justify-center ${className}`}
    >
      <Moon className="w-1/2 h-1/2" />
    </span>
  );
}

let artPreloaded = false;
/** البطاقات والأيقونات تنحمّل من أول ما يدخل الغرفة — كشف الدور ثواني بس، فما نبي الصورة تتأخر */
export function preloadMafiaArt() {
  if (artPreloaded || typeof window === "undefined") return;
  artPreloaded = true;
  for (const role of Object.keys(MAFIA_ROLES) as MafiaRole[]) {
    for (const src of [mafiaCardSrc(role), mafiaIconSrc(role)]) {
      const img = new Image();
      img.src = src;
    }
  }
}

/** شرارات تطلع حول البطاقة بعد ما تنقلب — قيم ثابتة عشان الرسم ما يتغير مع كل تحديث */
const EMBERS = [
  { left: -4, dx: -14, delay: 1.1, dur: 2.2 },
  { left: 8, dx: 10, delay: 1.6, dur: 2.6 },
  { left: 22, dx: -8, delay: 1.3, dur: 2.0 },
  { left: 38, dx: 12, delay: 1.9, dur: 2.4 },
  { left: 55, dx: -10, delay: 1.2, dur: 2.3 },
  { left: 70, dx: 8, delay: 1.7, dur: 2.1 },
  { left: 86, dx: -12, delay: 1.4, dur: 2.5 },
  { left: 100, dx: 14, delay: 2.0, dur: 2.2 },
];

/** ظهر البطاقة — يطلع أول شي وبعدين تنقلب على الدور */
function CardBack() {
  return (
    <div aria-hidden className="mfx-card-face mfx-card-back">
      <span className="absolute top-[4%] right-[7%] text-xl text-[#e9dcc3]/80">{"\u2660\uFE0E"}</span>
      <span className="absolute top-[4%] left-[7%] text-xl text-red-500/80">{"\u2665\uFE0E"}</span>
      <span className="absolute bottom-[4%] right-[7%] text-xl text-red-500/80">{"\u2666\uFE0E"}</span>
      <span className="absolute bottom-[4%] left-[7%] text-xl text-[#e9dcc3]/80">{"\u2663\uFE0E"}</span>
      <div className="w-[46%] aspect-square rounded-full border-[3px] border-[#e9dcc3] flex items-center justify-center bg-black/50 shadow-[0_0_0_6px_rgba(0,0,0,0.6),0_0_0_8px_rgba(185,28,28,0.9),0_0_40px_rgba(220,38,38,0.5)]">
        <VenetianMask className="w-[55%] h-[55%] text-[#e9dcc3]" strokeWidth={1.6} />
      </div>
      <p className="mt-[8%] text-4xl font-black text-[#e9dcc3] [text-shadow:0_0_18px_rgba(220,38,38,0.9),0_3px_0_#7f1d1d]">
        المافيا
      </p>
      <p className="mt-1 text-xs font-black tracking-[0.5em] text-red-500/90" dir="ltr">
        MAFIA
      </p>
    </div>
  );
}

/**
 * بطاقة الدور بالصورة.
 * flip: كشف الدور — يطلع ظهر البطاقة وتنقلب بحركة، وبعدها لمعة وتوهج بلون الدور.
 * بدونه (زر "دوري"): البطاقة تطلع على طول.
 */
export function RoleCard({
  role,
  teammates = [],
  flip = false,
  small = false,
}: {
  role: MafiaRole;
  /** المافيا: أسماء زملائه — تطلع تحت البطاقة عشان ما تفوته */
  teammates?: string[];
  flip?: boolean;
  /** زر "دوري": بطاقة أصغر */
  small?: boolean;
}) {
  const def = MAFIA_ROLES[role];
  const isMafia = def.team === "mafia";
  return (
    <div
      className={`flex flex-col items-center w-full ${small ? "gap-3 max-w-xs" : "gap-4"}`}
      style={{ "--glow": def.glow } as React.CSSProperties}
    >
      <div className={`mfx-card ${flip ? "mfx-card-flip" : "mfx-card-static"} ${small ? "mfx-card-sm" : ""}`}>
        <div aria-hidden className="mfx-card-glow" />
        {flip &&
          EMBERS.map((e, i) => (
            <span
              key={i}
              aria-hidden
              className="mfx-ember"
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
        <div className="mfx-card-inner">
          {flip && <CardBack />}
          <div className="mfx-card-face mfx-card-front">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mafiaCardSrc(role)} alt={def.label} draggable={false} className="w-full h-full select-none" />
            <span aria-hidden className="mfx-card-shine" />
          </div>
        </div>
      </div>

      <div className={`flex flex-col items-center gap-3 text-center w-full max-w-sm ${flip ? "mfx-card-after" : ""}`}>
        <span
          className={`px-4 py-1 rounded-full text-sm font-black border ${
            isMafia ? "bg-red-950/80 border-red-700 text-red-200" : "bg-amber-950/50 border-amber-700/60 text-amber-100"
          }`}
        >
          {isMafia ? "فريق المافيا" : "فريق المدينة"}
        </span>
        {teammates.length > 0 && (
          <div className="w-full p-3 rounded-2xl bg-red-950/60 border border-red-800">
            <p className="font-black text-sm mb-2 flex items-center justify-center gap-1.5 text-red-200">
              <Users size={16} /> عصابتك
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {teammates.map((n) => (
                <span key={n} className="px-3 py-1.5 rounded-xl bg-white text-red-800 font-black text-base">
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}
        <p className={`font-bold text-slate-300 leading-relaxed ${small ? "text-xs" : "text-sm"}`}>{def.description}</p>
      </div>
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
      {/* على body مباشرة: بنص الشاشة فوق كل شي، وصغيرة عشان اللي جنبك ما يشوفها */}
      {show &&
        createPortal(
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-slate-950/95 text-white pointer-events-none animate-in fade-in duration-150">
            <RoleCard small role={role} teammates={teammates} />
          </div>,
          document.body
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

/** اسم وقت النقاش: 0 = مفتوح */
export function discussionLabel(secs: number): string {
  if (secs === 0) return "مفتوح";
  return secs === 120 ? "دقيقتين" : `${secs / 60} دقائق`;
}

/** اختيار وقت النقاش: 2 / 3 / 5 دقائق / مفتوح */
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
    <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="وقت النقاش">
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
            className={`min-h-11 py-2.5 px-1 rounded-2xl font-black text-sm border-b-4 transition-all disabled:opacity-50 ${
              on ? "bg-amber-500 border-amber-700 text-slate-950" : "bg-slate-800 border-slate-950 text-slate-200"
            }`}
          >
            {discussionLabel(secs)}
          </button>
        );
      })}
    </div>
  );
}
