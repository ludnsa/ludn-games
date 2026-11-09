"use client";
import React from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { QZ_BACKDROP, QZ_BTN_GLASS, QZ_BTN_PRIMARY, QZ_MODAL } from "@/components/games/quiz-grid/shared/quizUi";

export default function QuizAlertModal({
  alert,
  onClose,
}: {
  alert: { show: boolean; message: string; isConfirm?: boolean; onConfirm?: () => void };
  onClose: () => void;
}) {
  if (!alert.show) return null;

  return (
    <div className={`fixed inset-0 z-[2100] flex items-center justify-center p-4 animate-in fade-in ${QZ_BACKDROP}`}>
      <div className={`${QZ_MODAL} p-6 md:p-8 rounded-3xl max-w-md w-full animate-in zoom-in-95`}>
        <div
          className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5 ${
            alert.isConfirm
              ? "bg-cyan-400/15 text-cyan-200 border border-cyan-300/40"
              : "bg-amber-400/15 text-amber-300 border border-amber-300/40"
          }`}
        >
          {alert.isConfirm ? <HelpCircle size={32} /> : <AlertTriangle size={32} />}
        </div>

        <p className="text-center font-black text-lg text-white mb-7 leading-relaxed">
          {alert.message}
        </p>

        <div className="flex gap-3">
          {alert.isConfirm && (
            <button
              onClick={onClose}
              className={`flex-1 py-3.5 font-black rounded-xl ${QZ_BTN_GLASS}`}
            >
              إلغاء
            </button>
          )}
          <button
            onClick={() => {
              if (alert.isConfirm && alert.onConfirm) alert.onConfirm();
              else onClose();
            }}
            className={`flex-1 py-3.5 font-black rounded-xl ${QZ_BTN_PRIMARY}`}
          >
            {alert.isConfirm ? "تأكيد" : "حسناً"}
          </button>
        </div>
      </div>
    </div>
  );
}
