/* eslint-disable @next/next/no-img-element */
"use client";
import React from "react";
import { QUIZ_GAME } from "@/constants/quiz-grid";

export default function QuizQRModal({
  roomCode,
  show,
  onClose,
}: {
  roomCode: string;
  show: boolean;
  onClose: () => void;
}) {
  if (!show) return null;

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${QUIZ_GAME.joinPath}?room=${roomCode}`
      : "";

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border-4 border-violet-500 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-6">
          امسح الباركود للانضمام
        </h2>

        <div className="bg-white p-4 rounded-2xl mx-auto w-fit mb-6 shadow-inner">
          {roomCode && (
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`}
              alt={`باركود الانضمام لغرفة ${roomCode}`}
              className="w-48 h-48"
            />
          )}
        </div>

        <p
          className="text-3xl font-black tracking-[0.3em] text-violet-600 dark:text-violet-400 mb-2"
          dir="ltr"
        >
          {roomCode}
        </p>
        <p className="text-xs font-bold text-slate-400 mb-8">
          أو ادخلوا الرمز يدوياً من صفحة الانضمام
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-black rounded-xl border-b-4 border-slate-300 dark:border-slate-950 active:border-b-0 active:translate-y-[4px] transition-all"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}
