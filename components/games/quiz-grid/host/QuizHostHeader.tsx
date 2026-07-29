"use client";
import React from "react";
import { QrCode, Link2, RotateCcw, Flag } from "lucide-react";
import { QUIZ_GAME } from "@/constants/quiz-grid";

export default function QuizHostHeader({
  roomCode,
  gameState,
  onShowQR,
  onCopyLink,
  onNewSession,
  onFinish,
}: {
  roomCode: string;
  gameState?: string;
  onShowQR: () => void;
  onCopyLink: () => void;
  onNewSession: () => void;
  onFinish: () => void;
}) {
  const isPlaying = gameState && gameState !== "setup" && gameState !== "gameOver";

  return (
    <header className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-3 md:p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="px-4 py-2 bg-violet-100 dark:bg-violet-500/20 rounded-xl">
          <span className="text-xs font-bold text-violet-600 dark:text-violet-400 block leading-tight">
            رمز الغرفة
          </span>
          <span
            className="text-2xl md:text-3xl font-black text-violet-700 dark:text-violet-300 tracking-[0.2em]"
            dir="ltr"
          >
            {roomCode || "..."}
          </span>
        </div>
        <h1 className="hidden lg:block text-xl font-black text-slate-800 dark:text-white">
          {QUIZ_GAME.title}
        </h1>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={onShowQR}
          className="flex items-center gap-2 bg-violet-500 hover:bg-violet-400 text-white font-black py-2.5 px-4 rounded-xl border-b-4 border-violet-700 active:border-b-0 active:translate-y-[4px] transition-all text-sm"
        >
          <QrCode size={18} /> باركود الانضمام
        </button>
        <button
          onClick={onCopyLink}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2.5 px-4 rounded-xl border-b-4 border-slate-300 dark:border-slate-950 active:border-b-0 active:translate-y-[4px] transition-all text-sm"
        >
          <Link2 size={18} /> نسخ الرابط
        </button>

        {isPlaying && (
          <button
            onClick={onFinish}
            className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 font-bold py-2.5 px-4 rounded-xl border-b-4 border-amber-200 dark:border-amber-950 active:border-b-0 active:translate-y-[4px] transition-all text-sm"
          >
            <Flag size={18} /> إنهاء الجلسة
          </button>
        )}

        <button
          onClick={onNewSession}
          className="flex items-center gap-2 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 font-bold py-2.5 px-4 rounded-xl border-b-4 border-rose-200 dark:border-rose-950 active:border-b-0 active:translate-y-[4px] transition-all text-sm"
        >
          <RotateCcw size={18} /> جلسة جديدة
        </button>
      </div>
    </header>
  );
}
