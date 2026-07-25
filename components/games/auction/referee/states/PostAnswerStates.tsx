"use client";
import React from "react";
import { CheckCircle2, Target, ShieldAlert, ArrowRight, Trophy } from "lucide-react";

export default function PostAnswerStates({ ctx }: { ctx: any }) {
  const {
    gameState, handleRewardChoice, playMode, isDoubleRisk,
    winner, t1Ambush, t2Ambush, getWinnerBid, nextQuestion,
    t1Points, t2Points, t1Name, t2Name
  } = ctx;

  return (
    <>
      {/* اختيار المكافأة */}
      {gameState === "rewardChoice" && (
        <div className="bg-white dark:bg-slate-900 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-4 border-emerald-500 text-center w-full max-w-4xl animate-in zoom-in">
           <CheckCircle2 className="w-16 h-16 md:w-20 md:h-20 text-emerald-500 mx-auto mb-4 md:mb-6" />
           <h2 className="text-2xl md:text-3xl font-black mb-2 text-slate-800 dark:text-white">إجابة صحيحة! 🎉</h2>
           <p className="text-sm md:text-lg font-bold text-slate-500 dark:text-slate-400 mb-6 md:mb-10">اختر المكافأة التي تناسب تكتيكك:</p>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <button onClick={() => handleRewardChoice("points")} className="p-6 md:p-8 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-800/40 border-b-4 border-cyan-400 dark:border-cyan-700 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-3 transition-all active:border-b-0 active:translate-y-[4px] group shadow-md">
                 <Target className="w-10 h-10 md:w-14 md:h-14 text-cyan-500 group-hover:scale-110 transition-transform" />
                 <span className="font-black text-xl md:text-2xl text-cyan-700 dark:text-cyan-400">النقاط العادية</span>
                 <span className="text-xs md:text-sm font-bold bg-cyan-100 dark:bg-cyan-950 px-3 py-1 rounded-full text-cyan-800 dark:text-cyan-300">
                   إضافة {ctx.isSuddenDeath ? (playMode === "no_options" ? 30 : 20) : playMode === "no_options" ? (isDoubleRisk ? 20 : 10) : (isDoubleRisk ? 10 : 5)} نقطة لرصيدك
                 </span>
              </button>
              {(() => {
                const ambushesLeft = winner === 1 ? t1Ambush : t2Ambush;
                const loserBid = ctx.getLoserBid();
                
                if (ambushesLeft <= 0) {
                  return (
                    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-800 border-b-4 border-slate-300 dark:border-slate-700 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-3 shadow-md opacity-70 cursor-not-allowed">
                       <ShieldAlert className="w-10 h-10 md:w-14 md:h-14 text-slate-400" />
                       <span className="font-black text-xl md:text-2xl text-slate-500">كمين (نفدت البطاقات)</span>
                       <span className="text-[10px] md:text-xs font-bold leading-relaxed bg-slate-200 dark:bg-slate-700 p-2 rounded-xl text-slate-500">
                         لا يمكنك استخدام هذا الخيار<br/>لأنك استنفدت المحاولات الـ 3
                       </span>
                    </div>
                  );
                }
                
                if (ctx.isSuddenDeath) {
                  return (
                    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-800 border-b-4 border-slate-300 dark:border-slate-700 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-3 shadow-md opacity-70 cursor-not-allowed">
                       <ShieldAlert className="w-10 h-10 md:w-14 md:h-14 text-slate-400" />
                       <span className="font-black text-xl md:text-2xl text-slate-500">الكمين معطل</span>
                       <span className="text-[10px] md:text-xs font-bold leading-relaxed bg-slate-200 dark:bg-slate-700 p-2 rounded-xl text-rose-500 font-black">
                         لا يمكنك تفعيل الكمين في الفرصة الأخيرة
                       </span>
                    </div>
                  );
                }
                
                return (
                  <button onClick={() => handleRewardChoice("ambush")} className="p-6 md:p-8 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-800/40 border-b-4 border-purple-400 dark:border-purple-700 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-3 transition-all active:border-b-0 active:translate-y-[4px] group shadow-md">
                     <ShieldAlert className="w-10 h-10 md:w-14 md:h-14 text-purple-500 group-hover:scale-110 transition-transform" />
                     <span className="font-black text-xl md:text-2xl text-purple-700 dark:text-purple-400">كمين وتخريب ⚔️</span>
                     <span className="text-[10px] md:text-xs font-bold leading-relaxed bg-purple-100 dark:bg-purple-950 p-2 rounded-xl text-purple-800 dark:text-purple-300">
                       استرد مبلغ مزايدتك ({getWinnerBid()})<br/>
                       واخصم ({loserBid}) من الخصم!<br/>
                       <span className="text-purple-600 font-black">متبقي: {ambushesLeft} كمائن</span>
                     </span>
                  </button>
                );
              })()}
           </div>
        </div>
      )}

      {/* شاشة احتساب النتيجة الوسطية */}
      {gameState === "result" && (
        <div className="bg-white dark:bg-slate-900 p-8 md:p-16 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-4 border-slate-200 dark:border-slate-800 text-center w-full max-w-2xl animate-in zoom-in flex flex-col items-center justify-center">
           <CheckCircle2 className="w-16 h-16 md:w-20 md:h-20 text-emerald-500 mb-4 md:mb-6" />
           <h2 className="text-2xl md:text-3xl font-black mb-3 md:mb-4 text-slate-800 dark:text-white">تم التحديث</h2>
           <p className="text-sm md:text-lg font-bold text-slate-500 dark:text-slate-400 mb-8 md:mb-10">جميع الحسابات (من مزايدة وخصومات ونقاط) تمت بنجاح.</p>
           <button onClick={nextQuestion} className="w-full py-4 md:py-5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-lg md:text-xl rounded-xl border-b-4 border-amber-700 active:border-b-0 active:translate-y-[4px] flex items-center justify-center gap-2 md:gap-3 transition-all shadow-lg">
              بدء الجولة التالية <ArrowRight size={20} className="md:w-6 md:h-6" />
           </button>
        </div>
      )}

      {/* النهاية */}
      {gameState === "gameOver" && (
        <div className="bg-white dark:bg-slate-900 p-10 md:p-20 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl border-4 border-amber-500 text-center w-full max-w-3xl animate-in zoom-in duration-700">
           <Trophy className="w-24 h-24 md:w-32 md:h-32 text-amber-500 mx-auto mb-6 md:mb-8 animate-bounce" />
           <h2 className="text-4xl md:text-5xl font-black mb-4 md:mb-6 text-slate-800 dark:text-white">انتهت الحرب!</h2>
           <div className="text-xl md:text-3xl font-black text-slate-600 dark:text-slate-300">
             الـفـائـز الـنـهـائـي: {t1Points > t2Points ? <span className="text-cyan-600 dark:text-cyan-400">{t1Name}</span> : t1Points < t2Points ? <span className="text-rose-600 dark:text-rose-400">{t2Name}</span> : <span className="text-amber-500">تعادل عادل</span>}
           </div>
        </div>
      )}
    </>
  );
}