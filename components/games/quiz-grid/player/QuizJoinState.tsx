"use client";
import React from "react";
import { LogIn, Loader2, AlertCircle } from "lucide-react";
import { QUIZ_GAME } from "@/constants/quiz-grid";
import { QuizCardIcon } from "@/components/games/quiz-grid/shared/QuizCardIcon";
import { QZ_BTN_PRIMARY, QZ_GLASS, QZ_INPUT } from "@/components/games/quiz-grid/shared/quizUi";
import type { useQuizPlayer } from "@/hooks/games/quiz-grid/useQuizPlayer";

type Ctx = ReturnType<typeof useQuizPlayer>;

export default function QuizJoinState({ ctx }: { ctx: Ctx }) {
  const {
    roomCode, setRoomCode, displayName, setDisplayName,
    team, setTeam, roomInfo, isJoining, error, join,
  } = ctx;

  const codeComplete = roomCode.length === 5;

  return (
    <section className={`w-full max-w-md mx-auto ${QZ_GLASS} border-2 border-cyan-300/40 rounded-[2rem] p-6 md:p-8 animate-in zoom-in-95`}>
      <QuizCardIcon kind="double" className="block w-20 h-20 mx-auto mb-4 ring-2 ring-cyan-300/60 shadow-[0_0_30px_-4px_rgba(236,72,153,0.8)]" />

      <h1 className="text-2xl md:text-3xl font-black text-center text-white mb-2">
        {QUIZ_GAME.title}
      </h1>
      <p className="text-center font-bold text-slate-300 mb-7 text-sm">
        انضم للغرفة من جوالك وتابع اللعب على الشاشة الكبيرة
      </p>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="room" className="font-bold text-sm text-slate-300">
            رمز الغرفة
          </label>
          <input
            id="room"
            type="text"
            value={roomCode}
            maxLength={5}
            dir="ltr"
            autoCapitalize="characters"
            onChange={(e) => setRoomCode(e.target.value.toUpperCase().trim())}
            placeholder="Q1A2B"
            className={`w-full p-4 rounded-2xl font-black text-2xl text-center tracking-[0.3em] focus:border-cyan-300 ${QZ_INPUT}`}
          />
          {codeComplete && !roomInfo && (
            <p className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
              <AlertCircle size={14} /> لم نجد غرفة بهذا الرمز.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="font-bold text-sm text-slate-300">
            اسمك
          </label>
          <input
            id="name"
            type="text"
            value={displayName}
            maxLength={20}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="اكتب اسمك هنا"
            className={`w-full p-4 rounded-2xl font-black text-lg focus:border-cyan-300 ${QZ_INPUT}`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-bold text-sm text-slate-300">اختر فريقك</span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setTeam(1)}
              className={`flex-1 py-4 px-3 rounded-2xl font-black border-b-4 transition-all ${
                team === 1
                  ? "bg-sky-500 border-sky-700 text-white scale-[1.02] shadow-[0_0_24px_-4px_rgba(56,189,248,0.9)]"
                  : "bg-black/30 border-sky-400/40 text-sky-200"
              }`}
            >
              {roomInfo?.t1Name || "الفريق الأول"}
            </button>
            <button
              type="button"
              onClick={() => setTeam(2)}
              className={`flex-1 py-4 px-3 rounded-2xl font-black border-b-4 transition-all ${
                team === 2
                  ? "bg-rose-500 border-rose-700 text-white scale-[1.02] shadow-[0_0_24px_-4px_rgba(251,113,133,0.9)]"
                  : "bg-black/30 border-rose-400/40 text-rose-200"
              }`}
            >
              {roomInfo?.t2Name || "الفريق الثاني"}
            </button>
          </div>
        </div>

        {error && (
          <p className="flex items-center gap-2 text-sm font-bold text-rose-200 bg-rose-500/15 border border-rose-400/40 rounded-xl p-3">
            <AlertCircle size={18} className="shrink-0" /> {error}
          </p>
        )}

        <button
          onClick={join}
          disabled={isJoining || !roomInfo}
          className={`w-full py-4 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:border-b-4 font-black text-lg rounded-2xl flex items-center justify-center gap-2 ${QZ_BTN_PRIMARY}`}
        >
          {isJoining ? <Loader2 className="animate-spin" size={24} /> : <LogIn size={24} />}
          انضم للعبة
        </button>
      </div>
    </section>
  );
}
