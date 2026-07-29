"use client";
import React from "react";
import Link from "next/link";
import { Trophy, Handshake, RotateCcw, Home } from "lucide-react";
import type { useQuizHost } from "@/hooks/games/quiz-grid/useQuizHost";

type Ctx = ReturnType<typeof useQuizHost>;

export default function QuizGameOverState({ ctx }: { ctx: Ctx }) {
  const { room, newSession } = ctx;
  if (!room) return null;

  const isDraw = room.winner_team === 0 || room.t1_score === room.t2_score;
  const winnerName = room.t1_score > room.t2_score ? room.t1_name : room.t2_name;
  const winnerTeam = room.t1_score > room.t2_score ? 1 : 2;

  return (
    <section className="w-full max-w-3xl mx-auto flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
      <div
        className={`w-24 h-24 md:w-32 md:h-32 rounded-3xl flex items-center justify-center text-white shadow-2xl ${
          isDraw ? "bg-slate-500" : winnerTeam === 1 ? "bg-sky-500" : "bg-rose-500"
        }`}
      >
        {isDraw ? <Handshake size={56} /> : <Trophy size={56} />}
      </div>

      <div className="text-center">
        <p className="text-lg md:text-xl font-black text-slate-500 dark:text-slate-400 mb-2">
          انتهت المباراة
        </p>
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white">
          {isDraw ? "تعادل الفريقان!" : `فاز ${winnerName}!`}
        </h2>
      </div>

      <div className="w-full flex items-stretch gap-3">
        <div
          className={`flex-1 rounded-2xl border-b-8 p-6 text-center ${
            !isDraw && winnerTeam === 1
              ? "bg-sky-500 border-sky-700 text-white"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white"
          }`}
        >
          <p className="text-lg md:text-2xl font-black truncate mb-2">{room.t1_name}</p>
          <p className="text-5xl md:text-7xl font-black tabular-nums">{room.t1_score}</p>
        </div>
        <div
          className={`flex-1 rounded-2xl border-b-8 p-6 text-center ${
            !isDraw && winnerTeam === 2
              ? "bg-rose-500 border-rose-700 text-white"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white"
          }`}
        >
          <p className="text-lg md:text-2xl font-black truncate mb-2">{room.t2_name}</p>
          <p className="text-5xl md:text-7xl font-black tabular-nums">{room.t2_score}</p>
        </div>
      </div>

      <div className="w-full flex flex-col sm:flex-row gap-3">
        <button
          onClick={newSession}
          className="flex-1 flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-400 text-white font-black text-lg py-4 px-6 rounded-2xl border-b-4 border-violet-700 active:border-b-0 active:translate-y-[4px] transition-all"
        >
          <RotateCcw size={22} /> جلسة جديدة
        </button>
        <Link href="/my-games" className="flex-1">
          <button className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-lg py-4 px-6 rounded-2xl border-b-4 border-slate-300 dark:border-slate-950 active:border-b-0 active:translate-y-[4px] transition-all">
            <Home size={22} /> ألعابي
          </button>
        </Link>
      </div>
    </section>
  );
}
