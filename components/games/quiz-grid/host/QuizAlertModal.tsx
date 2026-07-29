"use client";
import React from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";

export default function QuizAlertModal({
  alert,
  onClose,
}: {
  alert: { show: boolean; message: string; isConfirm?: boolean; onConfirm?: () => void };
  onClose: () => void;
}) {
  if (!alert.show) return null;

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 p-6 md:p-8 rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95">
        <div
          className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5 ${
            alert.isConfirm
              ? "bg-violet-100 dark:bg-violet-900/40 text-violet-600"
              : "bg-amber-100 dark:bg-amber-900/40 text-amber-600"
          }`}
        >
          {alert.isConfirm ? <HelpCircle size={32} /> : <AlertTriangle size={32} />}
        </div>

        <p className="text-center font-black text-lg text-slate-800 dark:text-white mb-7 leading-relaxed">
          {alert.message}
        </p>

        <div className="flex gap-3">
          {alert.isConfirm && (
            <button
              onClick={onClose}
              className="flex-1 py-3.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-black rounded-xl border-b-4 border-slate-300 dark:border-slate-950 active:border-b-0 active:translate-y-[4px] transition-all"
            >
              إلغاء
            </button>
          )}
          <button
            onClick={() => {
              if (alert.isConfirm && alert.onConfirm) alert.onConfirm();
              else onClose();
            }}
            className="flex-1 py-3.5 bg-violet-500 hover:bg-violet-400 text-white font-black rounded-xl border-b-4 border-violet-700 active:border-b-0 active:translate-y-[4px] transition-all"
          >
            {alert.isConfirm ? "تأكيد" : "حسناً"}
          </button>
        </div>
      </div>
    </div>
  );
}
