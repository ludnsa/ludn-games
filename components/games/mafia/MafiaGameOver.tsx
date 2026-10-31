"use client";

import React, { useState } from "react";
import Link from "next/link";
import { RotateCcw, Loader2, Home, DoorOpen, Moon, VenetianMask, Ghost } from "lucide-react";
import { MAFIA_ROLES } from "@/constants/mafia";
import type { MafiaGameCtx } from "@/hooks/games/mafia/useMafiaGame";
import { AnnouncementIcon, Panel, RoleIcon } from "./MafiaParts";
import MafiaHomeButton from "./MafiaHomeButton";
import { BTN_DANGER, BTN_GOLD, BTN_SOFT, NOTE } from "./mafiaUi";

export default function MafiaGameOver({ ctx }: { ctx: MafiaGameCtx }) {
  const { room, players, me, isHost, host, busy } = ctx;
  const [confirmNew, setConfirmNew] = useState(false);
  if (!room) return null;
  const mafiaWon = room.winner === "mafia";
  const stopped = room.winner === null;
  const roleOf = new Map((room.final_roles ?? []).map((r) => [r.playerId, r]));

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`relative overflow-hidden rounded-[22px] p-5 text-center shadow-2xl animate-in zoom-in-50 duration-500 bg-gradient-to-br ${
          stopped ? "from-ludn-surface-2 to-ludn-surface border border-ludn-line" : mafiaWon ? "from-red-600 to-red-900" : "from-emerald-500 to-sky-700"
        }`}
      >
        {mafiaWon && <BloodDrips />}
        <div className="relative flex justify-center mb-2">
          {stopped ? (
            // المنشئ أنهى اللعبة: أيقونة المافيا علامة اللعبة
            <RoleIcon role="mafia" className="w-24 h-24 drop-shadow-[0_0_24px_rgba(0,0,0,0.6)]" />
          ) : mafiaWon ? (
            <RoleIcon role="mafia" className="w-24 h-24 drop-shadow-[0_0_24px_rgba(0,0,0,0.6)]" />
          ) : (
            // فوز المدينة: أيقونات المحقق والمواطن والطبيب مع بعض
            (["detective", "citizen", "doctor"] as const).map((r, i) => (
              <RoleIcon
                key={r}
                role={r}
                className={`drop-shadow-[0_0_18px_rgba(0,0,0,0.5)] ${i === 1 ? "w-20 h-20 relative z-10" : "w-14 h-14 self-end -mx-2"}`}
              />
            ))
          )}
        </div>
        <h2 className="relative font-display text-[38px] leading-tight mb-0.5">
          {stopped ? "انتهت اللعبة" : mafiaWon ? "المافيا فازوا!" : "المواطنين فازوا!"}
        </h2>
        <p className="relative text-[15px] font-bold opacity-90">
          {stopped
            ? "المنشئ أنهى الجولة… شوفوا مين كان مين"
            : mafiaWon
              ? "خلصوا على المدينة وما أحد كشفهم"
              : "طلّعوا كل المافيا والمدينة بأمان"}
        </p>
      </div>

      {/* اللعبة انحسمت بالليل: مين مات في ليلة الحسم */}
      {(room.announcements ?? []).length > 0 && (
        <Panel className="border-rose-500/40">
          <h3 className="text-[15px] font-black mb-2 flex items-center gap-2">
            <Moon size={18} className="text-ludn-gold-text" /> ليلة الحسم
          </h3>
          <ul className="flex flex-col gap-1.5">
            {room.announcements.map((a, i) => (
              <li key={i} className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-rose-950/50 border border-rose-500/25 text-[15px] font-black">
                <AnnouncementIcon kind={a.kind} className="w-9 h-9" />
                <span className="flex-1 min-w-0 break-words leading-snug">{a.text}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel>
        <h3 className="text-[15px] font-black mb-2 flex items-center gap-2">
          <VenetianMask size={18} className="text-ludn-gold-text" /> كشف كل الأدوار
        </h3>
        {/* عمودين بأيقونات أصغر — القائمة تنقص للنص تقريباً على الجوال */}
        <ul className="grid grid-cols-2 gap-1.5">
          {players.map((p) => {
            const r = roleOf.get(p.id);
            if (!r) return null;
            const def = MAFIA_ROLES[r.role];
            const changed = r.originalRole !== r.role;
            return (
              <li
                key={p.id}
                className={`rounded-2xl bg-ludn-surface-2 border flex items-center gap-2 p-2 ${p.id === me?.id ? "border-ludn-gold/60" : "border-ludn-line"} ${
                  p.is_alive ? "" : "opacity-60"
                }`}
              >
                <RoleIcon role={r.role} className="w-9 h-9" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-black break-words leading-tight">
                    {p.display_name}
                    {!p.is_alive && <Ghost size={13} className="inline -mt-1 ms-1 text-ludn-muted" />}
                  </span>
                  <span className={`block text-xs font-bold ${def.team === "mafia" ? "text-rose-400" : "text-ludn-muted"}`}>
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
          className={BTN_GOLD}
        >
          {busy ? <Loader2 className="animate-spin" size={20} /> : <RotateCcw size={20} />}
          جولة جديدة بنفس اللاعبين
        </button>
      ) : null}

      {isHost && (
        <button
          type="button"
          onClick={() => (confirmNew ? host.newRoom() : setConfirmNew(true))}
          disabled={busy}
          className={confirmNew ? `${BTN_DANGER} animate-pulse` : `${BTN_SOFT} w-full`}
        >
          <DoorOpen size={18} />
          {confirmNew ? "متأكد؟ الكل بيطلع ويدخلون بكود جديد" : "غرفة جديدة بكود جديد"}
        </button>
      )}

      {isHost ? null : (
        <p className={`${NOTE} text-[13px]`}>بانتظار المنشئ يبدأ جولة جديدة...</p>
      )}

      {isHost ? (
        <MafiaHomeButton
          ctx={ctx}
          className={`${BTN_SOFT} w-full`}
        >
          <Home size={18} /> الصفحة الرئيسية
        </MafiaHomeButton>
      ) : (
        <Link
          href="/"
          className={`${BTN_SOFT} w-full`}
        >
          <Home size={18} /> الصفحة الرئيسية
        </Link>
      )}
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
