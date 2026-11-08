"use client";
import React from "react";
import { User, Gavel } from "lucide-react";

export default function BiddingState({ ctx }: { ctx: any }) {
  const {
    gameState, questions, currentIndex, turn,
    t1Name, t2Name, t1Balance, t2Balance,
    t1Bid, setT1Bid, t2Bid, setT2Bid,
    calculateMinBid, handleBidsSubmit
  } = ctx;

  if (gameState !== "bidding" || !questions[currentIndex]) return null;

  return (
    <div className="bg-[#0e0a06]/85 backdrop-blur-sm p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-4 border-yellow-500 text-center w-full max-w-3xl animate-in slide-in-from-bottom-8">
      <div className="inline-flex items-center gap-2 px-4 md:px-5 py-1.5 md:py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 rounded-full text-yellow-600 dark:text-yellow-400 font-black text-xs md:text-sm mb-4 md:mb-6 shadow-sm">
        <User size={14} className="md:w-4 md:h-4" />
        <span>الدور الآن في إعلان المزايدة على: {turn === 1 ? t1Name : t2Name}</span>
      </div>
      <h3 className="text-xs md:text-sm font-black text-slate-500 dark:text-slate-400 mb-1 md:mb-2">فئة السؤال والمجال</h3>
      <h2 className="text-4xl md:text-7xl font-black mb-6 md:mb-10 tracking-wide text-[#e8c766] drop-shadow-sm">{questions[currentIndex].category}</h2>
      
      <div className="flex justify-center mb-6">
        <button 
          onClick={ctx.handleChangeQuestion} 
          className="text-sm font-bold bg-[#2b1e11] hover:bg-[#3a2916] text-slate-700 dark:text-slate-300 py-2 px-6 rounded-full transition-colors border border-[#d4af37]/25 shadow-sm"
        >
          تغيير الفئة / السؤال 🎲
        </button>
      </div>

      <div className="bg-[#120c07] p-5 md:p-8 rounded-3xl mb-6 md:mb-8 border-2 border-[#d4af37]/30 text-right shadow-inner">
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-xs md:text-sm font-black text-cyan-600 dark:text-cyan-400 mb-1 md:mb-2">{t1Name}</label>
              {t1Balance <= 0 ? (
                <div className="w-full p-3 md:p-4 bg-[#2b1e11] border-2 border-[#d4af37]/25 rounded-xl font-black text-center text-slate-500 dark:text-slate-400 text-sm md:text-lg cursor-not-allowed">
                  لا تستطيع المزايدة
                </div>
              ) : (
                <div className="flex items-center bg-[#120c07] border-2 border-cyan-200 dark:border-cyan-800 rounded-xl focus-within:border-cyan-500 transition-colors overflow-hidden">
                  <button onClick={() => setT1Bid((p: any) => (Number(p) || 0) + 100)} className="px-3 py-3 md:px-4 md:py-4 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 transition-colors font-black text-xl">+</button>
                  <input type="number" placeholder={`الأدنى: ${calculateMinBid(1)}`} value={t1Bid} onChange={e => setT1Bid(e.target.value === "" ? "" : Number(e.target.value))} step={100} className="w-full text-center bg-transparent font-black outline-none text-lg md:text-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  <button onClick={() => setT1Bid((p: any) => Math.max(0, (Number(p) || 0) - 100))} className="px-3 py-3 md:px-4 md:py-4 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 transition-colors font-black text-xl">-</button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs md:text-sm font-black text-rose-600 dark:text-rose-400 mb-1 md:mb-2">{t2Name}</label>
              {t2Balance <= 0 ? (
                <div className="w-full p-3 md:p-4 bg-[#2b1e11] border-2 border-[#d4af37]/25 rounded-xl font-black text-center text-slate-500 dark:text-slate-400 text-sm md:text-lg cursor-not-allowed">
                  لا تستطيع المزايدة
                </div>
              ) : (
                <div className="flex items-center bg-[#120c07] border-2 border-rose-200 dark:border-rose-800 rounded-xl focus-within:border-rose-500 transition-colors overflow-hidden">
                  <button onClick={() => setT2Bid((p: any) => (Number(p) || 0) + 100)} className="px-3 py-3 md:px-4 md:py-4 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors font-black text-xl">+</button>
                  <input type="number" placeholder={`الأدنى: ${calculateMinBid(2)}`} value={t2Bid} onChange={e => setT2Bid(e.target.value === "" ? "" : Number(e.target.value))} step={100} className="w-full text-center bg-transparent font-black outline-none text-lg md:text-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  <button onClick={() => setT2Bid((p: any) => Math.max(0, (Number(p) || 0) - 100))} className="px-3 py-3 md:px-4 md:py-4 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors font-black text-xl">-</button>
                </div>
              )}
            </div>
         </div>
      </div>
      <button onClick={handleBidsSubmit} className="w-full py-4 md:py-5 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black text-base md:text-xl rounded-xl border-b-4 border-yellow-700 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex items-center justify-center gap-2">
         اعتماد المزايدات وتحديد الفائز <Gavel size={20} />
      </button>
    </div>
  );
}