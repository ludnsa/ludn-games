"use client";

import React from "react";
import { Loader2, LogOut, AlertCircle, X } from "lucide-react";
import { MAFIA_CONFIG, MAFIA_GAME, MAFIA_ROLES } from "@/constants/mafia";
import type { MafiaGameCtx } from "@/hooks/games/mafia/useMafiaGame";
import type { MafiaPhase } from "@/types";
import {
  Panel,
  RoleCard,
  RolePeek,
  SoundToggle,
  TimerBadge,
} from "./MafiaParts";
import MafiaLobby from "./MafiaLobby";
import { MafiaNightAct, MafiaNightDone } from "./MafiaNight";
import {
  MafiaDiscussion,
  MafiaMorning,
  MafiaVoteResult,
  MafiaVoting,
} from "./MafiaDay";
import MafiaGameOver from "./MafiaGameOver";
import MafiaHostMenu from "./MafiaHostMenu";
import { cueMafia, type MafiaFxKind } from "@/lib/game/mafia-fx";
import { unlockMafiaAudio, type MafiaSound } from "@/lib/game/mafia-sounds";

const NIGHT_PHASES: MafiaPhase[] = ["night_act", "night_done"];

function phaseLabel(phase: MafiaPhase, night: number): string {
  switch (phase) {
    case "lobby":
      return "غرفة الانتظار";
    case "reveal":
      return "🎭 كشف الأدوار";
    case "night_act":
    case "night_done":
      return `🌙 الليلة ${night}`;
    case "morning":
      return "🌅 الصباح";
    case "discussion":
      return "🗣️ النقاش";
    case "voting":
      return "🗳️ التصويت";
    case "vote_result":
      return "⚖️ نتيجة التصويت";
    case "ended":
      return "🏁 انتهت اللعبة";
  }
}

/** الشاشة الرئيسية للعبة — نفسها للمنشئ ولكل لاعب */
export default function MafiaScreen({
  ctx,
  onLeave,
}: {
  ctx: MafiaGameCtx;
  onLeave: () => void;
}) {
  const { room, me, view, error, setError, secondsLeft } = ctx;

  if (!room || !me) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-slate-400">
        <Loader2 size={40} className="animate-spin text-red-500" />
        <p className="font-black">جاري الدخول للغرفة...</p>
      </div>
    );
  }

  const phase = room.phase;
  const isNight = NIGHT_PHASES.includes(phase);
  const isDead = !me.alive && phase !== "lobby" && phase !== "ended";
  const showTimer =
    phase !== "discussion" && phase !== "lobby" && phase !== "ended";

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4">
      {/* الشريط العلوي */}
      {/* على الجوال: العنوان والمؤقت بسطر، والأزرار بسطر تحته — عشان ما ينقص شي */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-500 break-words">
              {MAFIA_GAME.title} · {me.name}
              {me.isHost ? " 👑" : ""}
            </p>
            <h1
              className={`text-xl font-black leading-tight break-words ${isNight ? "text-indigo-200" : ""}`}
            >
              {phaseLabel(phase, room.night_number)}
            </h1>
          </div>
          {showTimer && <TimerBadge seconds={secondsLeft} danger={3} />}
        </div>
        <div className="flex items-center gap-2 justify-end shrink-0">
          {phase !== "lobby" && <RolePeek role={me.role} />}
          <SoundToggle />
          {me.isHost && <MafiaHostMenu ctx={ctx} />}
          {phase === "lobby" && !me.isHost && (
            <button
              type="button"
              onClick={onLeave}
              aria-label="خروج"
              className="w-11 h-11 rounded-2xl bg-slate-800 border-b-4 border-slate-950 flex items-center justify-center text-slate-400"
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 text-sm font-bold text-red-200 bg-red-950/70 border border-red-800 rounded-xl p-3 animate-in fade-in">
          <AlertCircle size={18} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="إغلاق"
            className="shrink-0 w-10 h-10 -my-2 -me-2 rounded-xl flex items-center justify-center hover:bg-red-900/60"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {isDead && (
        <div className="text-center p-4 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 animate-in zoom-in-95">
          <p className="text-4xl mb-1">
            <span className="mfx-ghost">👻</span>
          </p>
          <p className="font-black text-lg">{MAFIA_CONFIG.DEAD_MESSAGE}</p>
          <p className="text-xs font-bold text-slate-500 mt-1">
            تقدر تتفرج بس لا تفضح أحد 🤐
          </p>
        </div>
      )}

      {/* محتوى المرحلة */}
      {phase === "lobby" && <MafiaLobby ctx={ctx} />}
      {phase === "reveal" && <MafiaReveal ctx={ctx} />}
      {phase === "night_act" && !isDead && <MafiaNightAct ctx={ctx} />}
      {phase === "night_act" && isDead && (
        <p className="text-center font-black text-indigo-300 py-10 animate-pulse">
          🌙 الليل شغال… نام وارتاح
        </p>
      )}
      {phase === "night_done" && <MafiaNightDone ctx={ctx} />}
      {phase === "morning" && <MafiaMorning ctx={ctx} />}
      {phase === "discussion" && <MafiaDiscussion ctx={ctx} />}
      {phase === "voting" && <MafiaVoting ctx={ctx} />}
      {phase === "vote_result" && <MafiaVoteResult ctx={ctx} />}
      {phase === "ended" && <MafiaGameOver ctx={ctx} />}

      {/* رسائل خاصة (الساحر، انضمام للمافيا) */}
      {view &&
        view.notes.length > 0 &&
        phase !== "lobby" &&
        phase !== "night_act" && (
          <Panel className="border-purple-800">
            <h3 className="font-black mb-2">🔒 رسائل لك بس</h3>
            <ul className="flex flex-col gap-1.5">
              {view.notes.map((n, i) => (
                <li key={i} className="font-bold text-purple-200">
                  {n}
                </li>
              ))}
            </ul>
          </Panel>
        )}

      {ctx.devMode && me.isHost && phase !== "lobby" && (
        <DevRolesPanel ctx={ctx} />
      )}
      {ctx.devMode && me.isHost && <DevFxPanel />}
    </div>
  );
}

function MafiaReveal({ ctx }: { ctx: MafiaGameCtx }) {
  const { me, view } = ctx;
  if (!me?.role) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={40} className="animate-spin text-red-500" />
      </div>
    );
  }
  const teammates = (view?.mafiaTeam ?? []).filter((m) => m.id !== me.id);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center font-black text-slate-400">
        🤫 غطّ جوالك… هذا دورك
      </p>
      <RoleCard role={me.role} />
      {me.role === "mafia" && teammates.length > 0 && (
        <Panel className="border-red-900 text-center">
          <p className="font-bold text-slate-400 mb-2">عصابتك 🔪</p>
          <div className="flex flex-wrap justify-center gap-2">
            {teammates.map((m) => (
              <span
                key={m.id}
                className="px-4 py-2 rounded-xl bg-red-900/60 font-black"
              >
                {m.name}
              </span>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

/** وضع التجربة (localhost فقط): المنشئ يشوف كل الأدوار عشان يختبر */
function DevRolesPanel({ ctx }: { ctx: MafiaGameCtx }) {
  return (
    <details className="bg-indigo-950/60 border-2 border-dashed border-indigo-600 rounded-2xl p-3 text-sm">
      <summary className="font-black text-indigo-200 cursor-pointer">
        🧪 الأدوار (وضع التجربة — localhost فقط)
      </summary>
      <ul className="grid grid-cols-2 gap-1.5 mt-3">
        {ctx.players.map((p) => {
          const role = ctx.devRoles[p.id];
          return (
            <li
              key={p.id}
              className={`font-bold ${p.is_alive ? "" : "line-through opacity-50"}`}
            >
              {role ? MAFIA_ROLES[role].emoji : "❔"} {p.display_name}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

const DEV_CUES: { label: string; sound: MafiaSound; fx?: MafiaFxKind }[] = [
  { label: "🩸 ذبح", sound: "horror", fx: "kill" },
  { label: "🗡️ سيف", sound: "slash", fx: "slash" },
  { label: "🔍 تحقيق", sound: "dramatic", fx: "investigate" },
  { label: "🚨 كشف مافيا", sound: "dramatic", fx: "reveal_mafia" },
  { label: "🤷 تحقيق خاطئ", sound: "womp", fx: "miss" },
  { label: "✨ حماية", sound: "sparkle", fx: "saved" },
  { label: "🛡️ جندي", sound: "shield", fx: "shield" },
  { label: "💣 انتحاري", sound: "bomb", fx: "bomb" },
  { label: "🎩 ساحر", sound: "magic", fx: "magic" },
  { label: "📸 صحفي", sound: "camera", fx: "flash" },
  { label: "⚖️ تصويت", sound: "horror", fx: "doom" },
  { label: "🏆 فوز المدينة", sound: "win", fx: "win_town" },
  { label: "😈 فوز المافيا", sound: "evil", fx: "win_mafia" },
  { label: "🦉 بومة", sound: "owl" },
  { label: "🌙 الليل", sound: "night" },
  { label: "🐓 الصبح", sound: "rooster" },
];

/** وضع التجربة (localhost فقط): زر لكل صوت وحركة عشان تجربها فوراً */
function DevFxPanel() {
  return (
    <details className="bg-indigo-950/60 border-2 border-dashed border-indigo-600 rounded-2xl p-3 text-sm">
      <summary className="font-black text-indigo-200 cursor-pointer">
        🧪 تجربة الأصوات والحركات (localhost فقط)
      </summary>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {DEV_CUES.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => {
              unlockMafiaAudio();
              cueMafia(c.sound, c.fx);
            }}
            className="py-2.5 px-2 rounded-xl bg-indigo-900/70 hover:bg-indigo-800 font-black"
          >
            {c.label}
          </button>
        ))}
      </div>
    </details>
  );
}
