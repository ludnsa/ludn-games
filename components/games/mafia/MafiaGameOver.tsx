"use client";

import React, { useState } from "react";
import Link from "next/link";
import { RotateCcw, Loader2, Home, DoorOpen } from "lucide-react";
import { MAFIA_ROLES } from "@/constants/mafia";
import type { MafiaGameCtx } from "@/hooks/games/mafia/useMafiaGame";
import { Panel } from "./MafiaParts";

export default function MafiaGameOver({ ctx }: { ctx: MafiaGameCtx }) {
  const { room, players, me, isHost, host, busy } = ctx;
  const [confirmNew, setConfirmNew] = useState(false);
  if (!room) return null;
  const mafiaWon = room.winner === "mafia";
  const stopped = room.winner === null;
  const roleOf = new Map((room.final_roles ?? []).map((r) => [r.playerId, r]));

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`relative overflow-hidden rounded-[2rem] p-8 text-center shadow-2xl animate-in zoom-in-50 duration-500 bg-gradient-to-br ${
          stopped ? "from-slate-600 to-slate-800" : mafiaWon ? "from-red-600 to-red-900" : "from-emerald-500 to-sky-700"
        }`}
      >
        {mafiaWon && <BloodDrips />}
        <p className="relative text-8xl mb-3">{stopped ? "🛑" : mafiaWon ? "🔪" : "🏆"}</p>
        <h2 className="relative text-4xl font-black mb-2">
          {stopped ? "انتهت اللعبة" : mafiaWon ? "المافيا فازوا!" : "المواطنين فازوا!"}
        </h2>
        <p className="relative font-bold opacity-90">
          {stopped
            ? "المنشئ أنهى الجولة… شوفوا مين كان مين 👀"
            : mafiaWon
              ? "خلصوا على المدينة وما أحد كشفهم 😈"
              : "طلّعوا كل المافيا والمدينة بأمان 🎉"}
        </p>
      </div>

      <Panel>
        <h3 className="font-black text-xl mb-3">🎭 كشف كل الأدوار</h3>
        <ul className="flex flex-col gap-2">
          {players.map((p) => {
            const r = roleOf.get(p.id);
            if (!r) return null;
            const def = MAFIA_ROLES[r.role];
            const changed = r.originalRole !== r.role;
            return (
              <li
                key={p.id}
                className={`flex items-center gap-3 p-3 rounded-2xl ${
                  p.id === me?.id ? "bg-slate-700" : "bg-slate-800"
                } ${p.is_alive ? "" : "opacity-60"}`}
              >
                <span className="text-3xl shrink-0">{def.emoji}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-black break-words leading-tight">
                    {p.display_name} {p.is_alive ? "" : "☠️"}
                  </span>
                  <span className={`block text-sm font-bold ${def.team === "mafia" ? "text-red-400" : "text-slate-400"}`}>
                    {changed ? `${MAFIA_ROLES[r.originalRole].label} ← ` : ""}
                    {def.label}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      {isHost ? (
        <button
          type="button"
          onClick={() => host.playAgain()}
          disabled={busy}
          className="w-full py-5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-black text-xl rounded-2xl border-b-4 border-red-800 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="animate-spin" size={24} /> : <RotateCcw size={24} />}
          جولة جديدة بنفس اللاعبين
        </button>
      ) : null}

      {isHost && (
        <button
          type="button"
          onClick={() => (confirmNew ? host.newRoom() : setConfirmNew(true))}
          disabled={busy}
          className={`w-full py-4 font-black text-lg rounded-2xl border-b-4 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2 disabled:opacity-40 ${
            confirmNew ? "bg-red-600 border-red-800 animate-pulse" : "bg-slate-800 border-slate-950"
          }`}
        >
          <DoorOpen size={22} />
          {confirmNew ? "متأكد؟ الكل بيطلع ويدخلون بكود جديد" : "غرفة جديدة بكود جديد"}
        </button>
      )}

      {isHost ? null : (
        <p className="text-center font-bold text-slate-400">بانتظار المنشئ يبدأ جولة جديدة...</p>
      )}

      <Link
        href="/"
        className="w-full py-3 bg-slate-800 rounded-2xl border-b-4 border-slate-950 font-black flex items-center justify-center gap-2"
      >
        <Home size={18} /> الصفحة الرئيسية
      </Link>
    </div>
  );
}

/** دم ثابت يسيل من أعلى بطاقة فوز المافيا — قيم ثابتة عشان الرسم ما يتغير مع كل تحديث */
const DRIPS = [
  { left: 6, width: 10, height: 38, delay: 0.2 },
  { left: 17, width: 7, height: 22, delay: 0.6 },
  { left: 29, width: 14, height: 55, delay: 0.1 },
  { left: 43, width: 8, height: 30, delay: 0.9 },
  { left: 55, width: 12, height: 46, delay: 0.4 },
  { left: 68, width: 6, height: 18, delay: 1.1 },
  { left: 79, width: 13, height: 60, delay: 0.3 },
  { left: 91, width: 9, height: 28, delay: 0.7 },
];

function BloodDrips() {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none">
      <div className="mfx-blood-top" />
      {DRIPS.map((d, i) => (
        <span
          key={i}
          className="mfx-drip"
          style={{
            left: `${d.left}%`,
            width: d.width,
            height: `${d.height}%`,
            animationDelay: `${d.delay}s`,
            animationDuration: "2.4s",
          }}
        />
      ))}
    </div>
  );
}
