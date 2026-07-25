"use client";
import React from "react";
import { Zap, Eye, Handshake } from "lucide-react";

export default function RiskAndDecisionStates({ ctx }: { ctx: any }) {
  const {
    gameState, winner, getWinnerName, getWinnerBid, getWinnerCurrentBalance,
    handlePreRiskDecision, triggerAlert, setPlayMode, setGameState,
    getLoserBid, handleBuyQuestion, isDoubleRisk
  } = ctx;

  return (
    <>
      {/* تفعيل الدبل قبل السؤال */}
      {gameState === "preRisk" && (
        <div className="bg-white dark:bg-slate-900 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-4 border-yellow-500 text-center w-full max-w-3xl animate-in zoom-in">
           <Zap className="w-16 h-16 md:w-20 md:h-20 text-yellow-500 mx-auto mb-4 md:mb-6 animate-pulse" />
           <h2 className="text-xl md:text-3xl font-black mb-3 md:mb-4 text-slate-800 dark:text-white">الفائز: <span className={winner === 1 ? "text-cyan-600" : "text-rose-600"}>{getWinnerName()}</span></h2>
           <p className="text-lg md:text-xl font-black text-yellow-600 dark:text-yellow-500 mb-6 md:mb-8">المبلغ المخصوم: {getWinnerBid()} 💰</p>
           <div className="bg-slate-50 dark:bg-slate-950 p-5 md:p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-800 mb-6 md:mb-8 shadow-inner">
             <h3 className="font-black text-lg md:text-2xl mb-4 text-slate-800 dark:text-white">تفعيل مخاطرة الدبل قبل كشف السؤال؟</h3>
             <p className="text-xs md:text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mx-auto">
               بالتفعيل سيُخصم مبلغ إضافي (<span className="text-rose-500">{getWinnerBid()}</span>) للدخول في السؤال.<br/>وستتضاعف النقاط والمكافآت في حال الإجابة بدون خيارات.
             </p>
           </div>
           <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <button onClick={() => handlePreRiskDecision(false)} className="flex-1 py-4 md:py-5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-black text-base md:text-xl rounded-xl border-b-4 border-slate-400 dark:border-slate-950 active:border-b-0 active:translate-y-[4px] transition-all shadow-md">
                 لعب عادي <br className="hidden sm:block"/><span className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-bold">(بدون تدبيل)</span>
              </button>
              {(() => {
                const canDouble = getWinnerCurrentBalance() >= getWinnerBid();
                return (
                  <button 
                    onClick={() => {
                      if (!canDouble) { triggerAlert("الرصيد لا يكفي لتفعيل الدبل (تحتاج لمبلغ إضافي يعادل مزايدتك)."); return; }
                      handlePreRiskDecision(true);
                    }} 
                    disabled={!canDouble}
                    className={`flex-1 py-4 md:py-5 font-black text-base md:text-xl rounded-xl border-b-4 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex flex-col items-center justify-center gap-1 ${canDouble ? "bg-yellow-500 hover:bg-yellow-400 text-slate-900 border-yellow-700" : "bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 border-slate-400 dark:border-slate-900 cursor-not-allowed opacity-50"}`}
                  >
                     <span>{canDouble ? "تفعيل الدبل ⚡" : "الرصيد لا يكفي للدبل 🔒"}</span>
                     <span className="text-[10px] md:text-sm font-bold opacity-80">(خصم إضافي {getWinnerBid()})</span>
                  </button>
                );
              })()}
           </div>
        </div>
      )}


      {/* شراء السؤال المرتد */}
      {gameState === "buyOffer" && (
        <div className="bg-white dark:bg-slate-900 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-4 border-purple-500 text-center w-full max-w-3xl animate-in zoom-in">
           <Handshake className="w-16 h-16 md:w-20 md:h-20 text-purple-500 mx-auto mb-4 md:mb-6" />
           <h2 className="text-2xl md:text-3xl font-black mb-3 md:mb-4 text-slate-800 dark:text-white">شراء السؤال المرتد</h2>
           <p className="text-sm md:text-lg font-bold text-slate-600 dark:text-slate-300 mb-8 md:mb-10 leading-relaxed">
             عرض السؤال للبيع على الخصم بدبل قيمة مزايدته، وقدرها كاش: <br className="sm:hidden"/>
             <span className="text-purple-600 dark:text-purple-400 font-black text-2xl md:text-3xl mx-2 md:mx-3">
               {getLoserBid() * 2} 💰
             </span>
           </p>
           <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <button onClick={() => handleBuyQuestion(true)} className="flex-1 py-4 md:py-5 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-base md:text-xl rounded-xl border-b-4 border-emerald-700 active:border-b-0 active:translate-y-[4px] transition-all shadow-md">
                تم البيع (الخصم وافق)
              </button>
              <button onClick={() => handleBuyQuestion(false)} className="flex-1 py-4 md:py-5 bg-slate-800 hover:bg-slate-700 text-white font-black text-base md:text-xl rounded-xl border-b-4 border-slate-950 active:border-b-0 active:translate-y-[4px] transition-all shadow-md">
                الرفض (نرجع للسؤال)
              </button>
           </div>
        </div>
      )}
    </>
  );
}