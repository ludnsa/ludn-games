"use client";
import React from "react";
import { Handshake, ShieldAlert, Trophy } from "lucide-react";

export default function TeamActionStates({ ctx }: { ctx: any }) {
  if (!ctx.liveData) return null;
  const state = ctx.liveData.game_state;

  if (state === "buyOffer") {
    return (
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[2rem] shadow-xl border-4 border-purple-500 text-center w-full animate-in zoom-in flex flex-col items-center justify-center min-h-[30vh]">
         <Handshake className="w-16 h-16 text-purple-500 mb-4 animate-bounce" />
         <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">عرض الشراء!</h2>
         <p className="text-sm font-bold text-slate-500 dark:text-slate-400">هناك عرض على الطاولة لشراء السؤال، الرجاء الانتباه لقرار الحكم.</p>
      </div>
    );
  }

  if (["preRisk", "optionsDecision", "rewardChoice", "result"].includes(state)) {
    return (
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[2rem] shadow-xl border-4 border-slate-200 dark:border-slate-800 text-center w-full animate-in zoom-in flex flex-col items-center justify-center min-h-[30vh]">
         <ShieldAlert className="w-16 h-16 text-slate-400 mb-4 animate-bounce" />
         <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">إجراءات تحكيمية جارية</h2>
         <p className="text-sm font-bold text-slate-500 dark:text-slate-400">الرجاء الانتباه للحكم والشاشة الرئيسية للاستماع للقرارات والمفاوضات.</p>
      </div>
    );
  }

  if (state === "gameOver") {
    const t1P = ctx.liveData.t1_points || 0;
    const t2P = ctx.liveData.t2_points || 0;
    const t1N = ctx.liveData.t1_name || "الفريق الأول";
    const t2N = ctx.liveData.t2_name || "الفريق الثاني";

    return (
      <div className="bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] shadow-2xl border-4 border-yellow-500 text-center w-full animate-in zoom-in duration-700">
         <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6 animate-pulse" />
         <h2 className="text-4xl font-black mb-4 text-slate-800 dark:text-white">انتهت الحرب!</h2>
         <div className="text-xl md:text-3xl font-black text-slate-600 dark:text-slate-300 mb-6">
           الـفـائـز الـنـهـائـي: {t1P > t2P ? <span className="text-cyan-600 dark:text-cyan-400">{t1N}</span> : t1P < t2P ? <span className="text-rose-600 dark:text-rose-400">{t2N}</span> : <span className="text-amber-500">تعادل عادل</span>}
         </div>
         <p className="text-xl font-bold text-slate-500 mb-8">الرجاء النظر للشاشة الرئيسية للتفاصيل.</p>
      </div>
    );
  }

  return null;
}