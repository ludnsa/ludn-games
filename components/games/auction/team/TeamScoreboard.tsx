"use client";
import React from "react";
import { Coins, Trophy, ShieldAlert, BadgeDollarSign } from "lucide-react";

export default function TeamScoreboard({ teamId, myName, myBalance, myPoints, myAmbush, mySellCards }: any) {
  return (
    <div className={`bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border-2 shadow-md relative overflow-hidden ${teamId === 1 ? "border-cyan-300 dark:border-cyan-800" : "border-rose-300 dark:border-rose-800"}`}>
       <div className={`absolute top-0 right-0 w-2 h-full ${teamId === 1 ? "bg-cyan-500" : "bg-rose-500"}`}></div>
       <div className="flex justify-between items-center pr-4">
          <div>
             <p className="text-xs font-black text-slate-500 dark:text-slate-400 mb-1">أهلاً بك،</p>
             <h2 className={`text-2xl md:text-3xl font-black ${teamId === 1 ? "text-cyan-600 dark:text-cyan-400" : "text-rose-600 dark:text-rose-400"}`}>{myName}</h2>
          </div>
          <div className="text-left">
             <p className="text-[10px] font-bold text-slate-500 mb-1">رصيدك الحالي</p>
             <p className="font-black text-2xl md:text-3xl text-slate-800 dark:text-white flex items-center gap-2 justify-end">
               {myBalance <= 0 ? <span className="text-rose-500 text-lg">مفلس 0</span> : myBalance.toLocaleString()} <Coins size={24} className="text-yellow-500" />
             </p>
             <div className="flex items-center justify-end gap-3 mt-1">
               <p className="font-black text-lg text-slate-600 dark:text-slate-300 flex items-center gap-1">
                 {myPoints} <Trophy size={16} className={teamId === 1 ? "text-cyan-500" : "text-rose-500"} />
               </p>
               <div className="flex gap-2 border-r-2 border-slate-200 dark:border-slate-800 pr-3">
                 <div className="flex gap-0.5" title="بطاقات الكمين">
                   {Array.from({ length: 3 }).map((_, i) => (
                     <ShieldAlert key={i} size={14} className={i < myAmbush ? "text-purple-500" : "text-slate-300 dark:text-slate-700 opacity-30"} />
                   ))}
                 </div>
                 <div className="flex gap-0.5" title="بطاقات بيع السؤال">
                   {Array.from({ length: 3 }).map((_, i) => (
                     <BadgeDollarSign key={i} size={14} className={i < (mySellCards || 0) ? "text-emerald-500" : "text-slate-300 dark:text-slate-700 opacity-30"} />
                   ))}
                 </div>
               </div>
             </div>
          </div>
       </div>
    </div>
  );
}