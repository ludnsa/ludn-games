"use client";
import React from "react";
import { ShieldAlert, LogOut } from "lucide-react";
import { GuideButton } from "@/components/guides/GuideButton";

export default function TeamWaitingState({ ctx }: { ctx: any }) {
  if (!ctx.isJoined || (ctx.liveData && ctx.liveData.game_state !== "setup")) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="text-center animate-pulse">
        <ShieldAlert className="w-20 h-20 text-slate-300 dark:text-slate-700 mx-auto mb-6" />
        <h2 className="text-3xl font-black mb-2 text-[#e8c766]">بانتظار الحكم...</h2>
        <p className="text-slate-500 font-bold">الرجاء الانتظار حتى يقوم الحكم ببدء اللعبة.</p>
      </div>
      {/* طريقة اللعب وهم ينتظرون الحكم */}
      <div className="mt-10"><GuideButton gameId="auction" className="px-4 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl gap-2 text-xs border-b-4 border-blue-200 dark:border-blue-900 active:border-b-0 active:translate-y-[4px] transition-all" /></div>
      <button onClick={ctx.handleLeave} className="mt-4 px-6 py-3 bg-[#2b1e11] text-slate-600 dark:text-slate-300 font-black rounded-xl border-b-4 border-[#0a0704] flex items-center gap-2 hover:bg-[#3a2916] active:border-b-0 active:translate-y-[4px] transition-all">
        <LogOut size={18} /> خروج
      </button>
    </div>
  );
}