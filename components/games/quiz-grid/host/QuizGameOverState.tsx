"use client";
import React from "react";
import Link from "next/link";
import { Trophy, Handshake, RotateCcw, Home } from "lucide-react";
import type { useQuizHost } from "@/hooks/games/quiz-grid/useQuizHost";
import { QZ_BTN_GLASS, QZ_BTN_PRIMARY, QZ_GLASS, QZ_TEAM } from "@/components/games/quiz-grid/shared/quizUi";

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
          isDraw
            ? "bg-slate-500 shadow-[0_0_44px_-6px_rgba(148,163,184,0.8)]"
            : winnerTeam === 1
              ? `bg-sky-500 ${QZ_TEAM[1].glow}`
              : `bg-rose-500 ${QZ_TEAM[2].glow}`
        }`}
      >
        {isDraw ? <Handshake size={56} /> : <Trophy size={56} />}
      </div>

      <div className="text-center">
        <p className="text-lg md:text-xl font-black text-slate-300 mb-2">
          انتهت المباراة
        </p>
        <h2 className="text-3xl md:text-5xl font-black text-white [text-shadow:0_0_24px_rgba(236,72,153,0.6),0_2px_6px_#000]">
          {isDraw ? "تعادل الفريقان!" : `فاز ${winnerName}!`}
        </h2>
      </div>

      <div className="w-full flex items-stretch gap-3">
        <div
          className={`flex-1 rounded-2xl border-b-8 p-6 text-center ${
            !isDraw && winnerTeam === 1
              ? `bg-sky-500 border-sky-700 text-white ${QZ_TEAM[1].glow}`
              : `${QZ_GLASS} border-sky-400/40 text-white`
          }`}
        >
          <p className="text-lg md:text-2xl font-black truncate mb-2">{room.t1_name}</p>
          <p className="text-5xl md:text-7xl font-black tabular-nums">{room.t1_score}</p>
        </div>
        <div
          className={`flex-1 rounded-2xl border-b-8 p-6 text-center ${
            !isDraw && winnerTeam === 2
              ? `bg-rose-500 border-rose-700 text-white ${QZ_TEAM[2].glow}`
              : `${QZ_GLASS} border-rose-400/40 text-white`
          }`}
        >
          <p className="text-lg md:text-2xl font-black truncate mb-2">{room.t2_name}</p>
          <p className="text-5xl md:text-7xl font-black tabular-nums">{room.t2_score}</p>
        </div>
      </div>

      <div className="w-full flex flex-col sm:flex-row gap-3">
        <button
          onClick={newSession}
          className={`flex-1 flex items-center justify-center gap-2 font-black text-lg py-4 px-6 rounded-2xl ${QZ_BTN_PRIMARY}`}
        >
          <RotateCcw size={22} /> جلسة جديدة
        </button>
        <Link href="/my-games" className="flex-1">
          <button className={`w-full flex items-center justify-center gap-2 font-black text-lg py-4 px-6 rounded-2xl ${QZ_BTN_GLASS}`}>
            <Home size={22} /> ألعابي
          </button>
        </Link>
      </div>
    </section>
  );
}
