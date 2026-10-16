"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { Cairo } from "next/font/google";
import { Maximize } from "lucide-react";
import { LETTERS_HIVE_GAME, LETTERS_HIVE_TEAMS } from "@/constants/letters-hive";
import { hiveScores, hiveWinner, type HiveTeam } from "@/lib/game/letters-hive-engine";
import { useLettersHiveDisplay } from "@/hooks/games/letters-hive/useLettersHive";
import HiveBoard from "./HiveBoard";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });
const noopSubscribe = () => () => {};

const TEAM_BG: Record<HiveTeam, string> = { green: "bg-green-600 border-green-800", red: "bg-red-600 border-red-800" };

/** شاشة العرض للشاشة الكبيرة — عرض بس، والتحكم كله من شاشة المقدم */
export default function LettersHiveDisplay() {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return (
    <main className={`fixed inset-0 z-50 bg-[#141518] text-white flex flex-col ${cairo.className}`} dir="rtl">
      {mounted && <DisplayBody />}
    </main>
  );
}

function DisplayBody() {
  const state = useLettersHiveDisplay();
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const fullscreenButton = !fullscreen && (
    <button
      type="button"
      onClick={toggleFullscreen}
      className="fixed bottom-4 left-4 z-10 px-4 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 border-b-4 border-slate-950 font-black text-sm flex items-center gap-2"
    >
      <Maximize size={18} /> ملء الشاشة
    </button>
  );

  if (!state || state.status !== "playing") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6" onDoubleClick={toggleFullscreen}>
        <p className="text-8xl mb-4 animate-in zoom-in-50 duration-700">🐝</p>
        <h1 className="text-6xl font-black mb-3">{LETTERS_HIVE_GAME.title}</h1>
        <p className="text-2xl font-bold text-slate-400 animate-pulse">بانتظار المقدم يبدأ الجلسة…</p>
        {fullscreenButton}
      </div>
    );
  }

  const win = hiveWinner(state.owners);
  const scores = hiveScores(state);
  const activeLetter = state.active !== null ? state.letters[state.active] : null;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 p-3 md:p-5" onDoubleClick={toggleFullscreen}>
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-6">
        <TeamScore team="green" name={state.teams.green} score={scores.green} winner={win?.team === "green"} />
        <div className="text-center min-w-28">
          <p className="text-lg md:text-2xl font-black text-slate-300">الجولة {state.round}</p>
          {activeLetter ? (
            <p className="mt-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-yellow-300 text-[#1e1b8f] font-black text-2xl md:text-4xl animate-in zoom-in-75">
              {activeLetter}
            </p>
          ) : (
            <p className="mt-1 text-sm md:text-lg font-bold text-slate-500">🐝 {LETTERS_HIVE_GAME.title}</p>
          )}
        </div>
        <TeamScore team="red" name={state.teams.red} score={scores.red} winner={win?.team === "red"} />
      </header>

      <div className="flex-1 min-h-0 relative flex items-center justify-center">
        <HiveBoard letters={state.letters} owners={state.owners} active={state.active} path={win?.path} className="w-full h-full" />
        {win && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`px-10 py-6 rounded-[2rem] border-b-8 text-center shadow-2xl shadow-black/60 animate-in zoom-in-50 duration-500 ${TEAM_BG[win.team]}`}
            >
              <p className="text-6xl md:text-8xl mb-2">🏆</p>
              <p className="text-4xl md:text-6xl font-black">فاز {state.teams[win.team]}!</p>
            </div>
          </div>
        )}
      </div>
      {fullscreenButton}
    </div>
  );
}

function TeamScore({ team, name, score, winner }: { team: HiveTeam; name: string; score: number; winner: boolean }) {
  return (
    <div
      className={`rounded-3xl border-b-8 px-4 py-3 md:px-6 md:py-4 flex items-center gap-4 ${TEAM_BG[team]} ${
        winner ? "ring-8 ring-yellow-300 animate-pulse" : ""
      } ${team === "red" ? "flex-row-reverse text-left" : ""}`}
    >
      <span className="flex-1 min-w-0">
        <span className="block font-black text-xl md:text-3xl leading-tight break-words">{name}</span>
        <span className="block text-xs md:text-base font-bold opacity-85">
          {LETTERS_HIVE_TEAMS[team].emoji} يوصّل {LETTERS_HIVE_TEAMS[team].goal}
        </span>
      </span>
      <span className="text-5xl md:text-7xl font-black tabular-nums">{score}</span>
    </div>
  );
}
