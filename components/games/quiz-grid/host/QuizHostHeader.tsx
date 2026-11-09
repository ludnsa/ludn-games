"use client";
import React from "react";
import { QrCode, Link2, RotateCcw, Flag } from "lucide-react";
import { QUIZ_GAME } from "@/constants/quiz-grid";
import { QZ_BTN_GLASS, QZ_BTN_PRIMARY, QZ_PANEL } from "@/components/games/quiz-grid/shared/quizUi";

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
    <header className={`flex flex-col md:flex-row items-center justify-between gap-3 rounded-2xl p-3 md:p-4 ${QZ_PANEL}`}>
      <div className="flex items-center gap-3">
        <div className="px-4 py-2 bg-cyan-400/10 border border-cyan-300/30 rounded-xl">
          <span className="text-xs font-bold text-cyan-200/80 block leading-tight">
            رمز الغرفة
          </span>
          <span
            className="text-2xl md:text-3xl font-black text-cyan-200 tracking-[0.2em] [text-shadow:0_0_14px_rgba(34,211,238,0.8)]"
            dir="ltr"
          >
            {roomCode || "..."}
          </span>
        </div>
        <h1 className="hidden lg:block text-xl font-black text-white">
          {QUIZ_GAME.title}
        </h1>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={onShowQR}
          className={`flex items-center gap-2 font-black py-2.5 px-4 rounded-xl text-sm ${QZ_BTN_PRIMARY}`}
        >
          <QrCode size={18} /> باركود الانضمام
        </button>
        <button
          onClick={onCopyLink}
          className={`flex items-center gap-2 font-bold py-2.5 px-4 rounded-xl text-sm ${QZ_BTN_GLASS}`}
        >
          <Link2 size={18} /> نسخ الرابط
        </button>

        {isPlaying && (
          <button
            onClick={onFinish}
            className="flex items-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-400/40 font-bold py-2.5 px-4 rounded-xl border-b-4 border-b-amber-950/70 active:border-b active:translate-y-[3px] transition-all text-sm"
          >
            <Flag size={18} /> إنهاء الجلسة
          </button>
        )}

        <button
          onClick={onNewSession}
          className="flex items-center gap-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-400/40 font-bold py-2.5 px-4 rounded-xl border-b-4 border-b-rose-950/70 active:border-b active:translate-y-[3px] transition-all text-sm"
        >
          <RotateCcw size={18} /> جلسة جديدة
        </button>
      </div>
    </header>
  );
}
