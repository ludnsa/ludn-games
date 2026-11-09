/* eslint-disable @next/next/no-img-element */
"use client";
import React from "react";
import { QUIZ_GAME } from "@/constants/quiz-grid";
import { QZ_BACKDROP, QZ_BTN_GLASS, QZ_MODAL } from "@/components/games/quiz-grid/shared/quizUi";

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
    <div className={`fixed inset-0 z-[2000] flex items-center justify-center p-4 animate-in fade-in ${QZ_BACKDROP}`}>
      <div className={`${QZ_MODAL} p-8 rounded-3xl max-w-sm w-full text-center animate-in zoom-in-95`}>
        <h2 className="text-2xl font-black text-white mb-6">
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
          className="text-3xl font-black tracking-[0.3em] text-cyan-200 mb-2 [text-shadow:0_0_14px_rgba(34,211,238,0.8)]"
          dir="ltr"
        >
          {roomCode}
        </p>
        <p className="text-xs font-bold text-slate-300 mb-8">
          أو ادخلوا الرمز يدوياً من صفحة الانضمام
        </p>

        <button
          onClick={onClose}
          className={`w-full py-3 font-black rounded-xl ${QZ_BTN_GLASS}`}
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}
