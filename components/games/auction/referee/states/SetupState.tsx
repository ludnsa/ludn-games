"use client";
import React, { useState } from "react";
import { ChevronDown, Play, RefreshCw } from "lucide-react";
import { AuctionCardGlyph } from "../../AuctionCardIcons";

export default function SetupState({ ctx }: { ctx: any }) {
  const [isBalanceDropdownOpen, setIsBalanceDropdownOpen] = useState(false);
  const {
    gameState, t1Name, setT1Name, t2Name, setT2Name,
    qCount, setQCount, isDropdownOpen, setIsDropdownOpen,
    dropdownRef, startGame, resetTeamDevice,
    startBalance, setStartBalance
  } = ctx;

  if (gameState !== "setup") return null;

  return (
    <div className="bg-[#0e0a06]/85 backdrop-blur-sm p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-2 border-[#d4af37]/30 text-center w-full max-w-2xl animate-in zoom-in-95">
      <AuctionCardGlyph card="double" className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 ring-2 ring-[#d4af37]/40" />
      <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 text-[#e8c766]">إعدادات الغرفة</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 text-right mb-6 md:mb-8">
        <div>
          <div className="flex justify-between items-center mb-1 md:mb-2">
            <label className="block text-[10px] md:text-xs font-black text-slate-500 dark:text-slate-400">الفريق الأول</label>
            <button onClick={() => resetTeamDevice(1)} title="إعادة تعيين جهاز القائد" className="text-slate-400 hover:text-rose-500 transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
          <input value={t1Name} onChange={e => setT1Name(e.target.value)} className="w-full p-3 md:p-4 bg-[#120c07] border-2 border-[#d4af37]/30 rounded-xl font-black focus:border-cyan-500 outline-none transition-colors text-sm md:text-base" />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1 md:mb-2">
            <label className="block text-[10px] md:text-xs font-black text-slate-500 dark:text-slate-400">الفريق الثاني</label>
            <button onClick={() => resetTeamDevice(2)} title="إعادة تعيين جهاز القائد" className="text-slate-400 hover:text-rose-500 transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
          <input value={t2Name} onChange={e => setT2Name(e.target.value)} className="w-full p-3 md:p-4 bg-[#120c07] border-2 border-[#d4af37]/30 rounded-xl font-black focus:border-rose-500 outline-none transition-colors text-sm md:text-base" />
        </div>
        <div className="relative">
          <label className="block text-[10px] md:text-xs font-black text-slate-500 dark:text-slate-400 mb-1 md:mb-2">الرصيد المبدئي</label>
          <div onClick={() => setIsBalanceDropdownOpen(!isBalanceDropdownOpen)} className="w-full p-3 md:p-4 bg-[#120c07] border-2 border-[#d4af37]/30 rounded-xl font-black flex justify-between items-center cursor-pointer select-none transition-colors text-sm md:text-base">
            <span>{startBalance?.toLocaleString()} 💰</span>
            <ChevronDown size={18} className={`text-slate-400 transition-transform ${isBalanceDropdownOpen ? "rotate-180" : ""}`} />
          </div>
          {isBalanceDropdownOpen && (
            <div className="absolute top-full left-0 w-full mt-2 bg-[#1a120a] border-2 border-[#d4af37]/30 rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2">
              {[50000, 75000, 100000].map(val => (
                <div key={val} onClick={() => { setStartBalance(val); setIsBalanceDropdownOpen(false); }} className="p-3 md:p-4 hover:bg-[#d4af37]/10 cursor-pointer font-black text-xs md:text-sm border-b last:border-b-0 border-[#d4af37]/15 transition-colors flex justify-between items-center">
                  <span>{val.toLocaleString()}</span>
                  <span>💰</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="relative" ref={dropdownRef}>
          <label className="block text-[10px] md:text-xs font-black text-slate-500 dark:text-slate-400 mb-1 md:mb-2">عدد الأسئلة</label>
          <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full p-3 md:p-4 bg-[#120c07] border-2 border-[#d4af37]/30 rounded-xl font-black flex justify-between items-center cursor-pointer select-none transition-colors text-sm md:text-base">
            <span>{qCount} سؤال عشوائي</span>
            <ChevronDown size={18} className={`text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
          </div>
          {isDropdownOpen && (
            <div className="absolute top-full left-0 w-full mt-2 bg-[#1a120a] border-2 border-[#d4af37]/30 rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2">
              {[15, 20, 30].map(num => (
                <div key={num} onClick={() => { setQCount(num); setIsDropdownOpen(false); }} className="p-3 md:p-4 hover:bg-[#d4af37]/10 cursor-pointer font-black text-xs md:text-sm border-b last:border-b-0 border-[#d4af37]/15 transition-colors">
                  {num} سؤال عشوائي
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <button onClick={startGame} className="w-full py-4 md:py-5 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black text-lg md:text-xl rounded-xl border-b-4 border-yellow-700 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex items-center justify-center gap-3">
         بدء اللعبة <Play size={20} className="md:w-6 md:h-6" />
      </button>
    </div>
  );
}