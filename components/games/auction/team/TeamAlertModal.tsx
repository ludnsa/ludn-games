"use client";
import React from "react";
import { AlertTriangle } from "lucide-react";

export default function TeamAlertModal({ alertConfig, closeAlert }: any) {
  if (!alertConfig.show) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0e0a06]/85 backdrop-blur-sm border border-[#d4af37]/30 border-b-4 border-b-yellow-500 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-2xl font-black text-[#e8c766] mb-2">تنبيه</h3>
        <p className="text-slate-600 dark:text-slate-300 font-bold text-sm mb-6 whitespace-pre-line">{alertConfig.message}</p>
        <button onClick={closeAlert} className="w-full py-3 bg-yellow-500 text-slate-900 font-black rounded-xl border-b-4 border-yellow-700 active:border-b-0 active:translate-y-[4px] transition-all">حسناً</button>
      </div>
    </div>
  );
}