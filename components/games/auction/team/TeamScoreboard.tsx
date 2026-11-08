"use client";
import React from "react";
import { Coins, Trophy } from "lucide-react";
import { AuctionCardCounts } from "../AuctionCardIcons";

export default function TeamScoreboard({ teamId, myName, myBalance, myPoints, myAmbush, mySellCards }: any) {
  return (
    <div className={`bg-[#0e0a06]/85 backdrop-blur-sm p-5 md:p-6 rounded-2xl border-2 shadow-md relative overflow-hidden ${teamId === 1 ? "border-cyan-300 dark:border-cyan-800" : "border-rose-300 dark:border-rose-800"}`}>
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
             </div>
          </div>
       </div>
       {/* بطاقات البيع والكمين: أيقونة الكرت وعددها كرقم، بصف لحالها عشان تبان على الجوال */}
       <AuctionCardCounts
         sell={Number(mySellCards) || 0}
         ambush={Number(myAmbush) || 0}
         className="mt-3 pt-3 pr-4 border-t border-[#d4af37]/15"
         iconClassName="w-10 h-10 md:w-11 md:h-11"
         labelClassName="text-[11px] md:text-xs"
       />
    </div>
  );
}