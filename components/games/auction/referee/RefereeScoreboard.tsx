"use client";
import React from "react";
import { RefreshCw } from "lucide-react";
import { AuctionCardCounts } from "../AuctionCardIcons";

export default function RefereeScoreboard({
  gameState, currentIndex, questions, t1Name, t2Name,
  t1Balance, t2Balance, t1Points, t2Points, t1Ambush, t2Ambush, t1SellCards, t2SellCards,
  resetTeamDevice
}: any) {
  if (gameState === "setup") return null;
  return (
      <div className="flex flex-col gap-3 mt-3">
         <div className="flex justify-between items-center px-1">
            <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full text-[10px] md:text-xs font-black border border-yellow-200 dark:border-yellow-800 shadow-sm">
              الجولة {currentIndex + 1} من {questions.length}
            </span>
            <span className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 bg-[#2b1e11] px-3 py-1 rounded-full">
              المتبقي: {questions.length - currentIndex} أسئلة
            </span>
         </div>
         <div className="grid grid-cols-2 gap-3 md:gap-4 bg-[#0e0a06]/85 backdrop-blur-sm p-3 md:p-4 rounded-2xl border-2 border-[#d4af37]/30 shadow-sm">
           <div className="text-center p-2 md:p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800/50 shadow-inner flex flex-col justify-center relative group">
              <button onClick={() => resetTeamDevice(1)} title="إعادة تعيين جهاز القائد" className="absolute top-2 left-2 p-1.5 bg-[#1a120a] rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors shadow-sm opacity-50 hover:opacity-100 border border-[#d4af37]/30">
                <RefreshCw size={12} />
              </button>
              <p className="text-[10px] md:text-xs font-black text-cyan-600 dark:text-cyan-400 mb-1 truncate px-6">{t1Name}</p>
              <p className="font-black text-base md:text-xl text-slate-800 dark:text-white">
                {t1Balance <= 0 ? <span className="text-rose-500">إفلاس 0 💰</span> : `${t1Balance.toLocaleString()} 💰`} 
                <span className="text-slate-300 dark:text-slate-700 mx-1 md:mx-2">|</span> 
                <span className="text-cyan-600 dark:text-cyan-400">{t1Points}</span> 🏆
              </p>
              {/* بطاقات البيع والكمين: أيقونة الكرت وعددها كرقم */}
              <AuctionCardCounts sell={t1SellCards ?? 3} ambush={t1Ambush} className="mt-2 pt-2 border-t border-[#d4af37]/15" />
           </div>
           <div className="text-center p-2 md:p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800/50 shadow-inner flex flex-col justify-center relative group">
              <button onClick={() => resetTeamDevice(2)} title="إعادة تعيين جهاز القائد" className="absolute top-2 right-2 p-1.5 bg-[#1a120a] rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors shadow-sm opacity-50 hover:opacity-100 border border-[#d4af37]/30">
                <RefreshCw size={12} />
              </button>
              <p className="text-[10px] md:text-xs font-black text-rose-600 dark:text-rose-400 mb-1 truncate px-6">{t2Name}</p>
              <p className="font-black text-base md:text-xl text-slate-800 dark:text-white">
                {t2Balance <= 0 ? <span className="text-rose-500">إفلاس 0 💰</span> : `${t2Balance.toLocaleString()} 💰`} 
                <span className="text-slate-300 dark:text-slate-700 mx-1 md:mx-2">|</span> 
                <span className="text-rose-600 dark:text-rose-400">{t2Points}</span> 🏆
              </p>
              {/* بطاقات البيع والكمين: أيقونة الكرت وعددها كرقم */}
              <AuctionCardCounts sell={t2SellCards ?? 3} ambush={t2Ambush} className="mt-2 pt-2 border-t border-[#d4af37]/15" />
           </div>
         </div>
      </div>
  );
}