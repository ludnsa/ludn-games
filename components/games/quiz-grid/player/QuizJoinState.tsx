"use client";
import React from "react";
import { LogIn, Loader2, AlertCircle, Users } from "lucide-react";
import { QUIZ_GAME } from "@/constants/quiz-grid";
import type { useQuizPlayer } from "@/hooks/games/quiz-grid/useQuizPlayer";

type Ctx = ReturnType<typeof useQuizPlayer>;

export default function QuizJoinState({ ctx }: { ctx: Ctx }) {
  const {
    roomCode, setRoomCode, displayName, setDisplayName,
    team, setTeam, roomInfo, isJoining, error, join,
  } = ctx;

  const codeComplete = roomCode.length === 5;

  return (
    <section className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 border-4 border-violet-500 rounded-[2rem] p-6 md:p-8 shadow-2xl animate-in zoom-in-95">
      <div className="w-16 h-16 mx-auto mb-5 bg-violet-100 dark:bg-violet-900/40 text-violet-600 rounded-2xl flex items-center justify-center">
        <Users size={32} />
      </div>

      <h1 className="text-2xl md:text-3xl font-black text-center text-slate-900 dark:text-white mb-2">
        {QUIZ_GAME.title}
      </h1>
      <p className="text-center font-bold text-slate-500 dark:text-slate-400 mb-7 text-sm">
        انضم للغرفة من جوالك وتابع اللعب على الشاشة الكبيرة
      </p>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="room" className="font-bold text-sm text-slate-500 dark:text-slate-400">
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
            className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl font-black text-2xl text-center tracking-[0.3em] focus:border-violet-500 outline-none transition-colors"
          />
          {codeComplete && !roomInfo && (
            <p className="flex items-center gap-1.5 text-xs font-bold text-rose-500">
              <AlertCircle size={14} /> لم نجد غرفة بهذا الرمز.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="font-bold text-sm text-slate-500 dark:text-slate-400">
            اسمك
          </label>
          <input
            id="name"
            type="text"
            value={displayName}
            maxLength={20}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="اكتب اسمك هنا"
            className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl font-black text-lg focus:border-violet-500 outline-none transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-bold text-sm text-slate-500 dark:text-slate-400">اختر فريقك</span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setTeam(1)}
              className={`flex-1 py-4 px-3 rounded-2xl font-black border-b-4 transition-all ${
                team === 1
                  ? "bg-sky-500 border-sky-700 text-white scale-[1.02]"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {roomInfo?.t1Name || "الفريق الأول"}
            </button>
            <button
              type="button"
              onClick={() => setTeam(2)}
              className={`flex-1 py-4 px-3 rounded-2xl font-black border-b-4 transition-all ${
                team === 2
                  ? "bg-rose-500 border-rose-700 text-white scale-[1.02]"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {roomInfo?.t2Name || "الفريق الثاني"}
            </button>
          </div>
        </div>

        {error && (
          <p className="flex items-center gap-2 text-sm font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-xl p-3">
            <AlertCircle size={18} className="shrink-0" /> {error}
          </p>
        )}

        <button
          onClick={join}
          disabled={isJoining || !roomInfo}
          className="w-full py-4 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-lg rounded-2xl border-b-4 border-violet-700 active:border-b-0 active:translate-y-[4px] disabled:active:translate-y-0 disabled:active:border-b-4 transition-all flex items-center justify-center gap-2"
        >
          {isJoining ? <Loader2 className="animate-spin" size={24} /> : <LogIn size={24} />}
          انضم للعبة
        </button>
      </div>
    </section>
  );
}
