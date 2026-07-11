"use client";
import React from "react";
import { ShieldAlert, Timer as TimerIcon, Eye, Play, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const supabase = getSupabaseBrowser();

export default function QuestionAndOptionsStates({ ctx }: { ctx: any }) {
  const {
    gameState, isDoubleRisk, timer, isQuestionVisible, setIsQuestionVisible,
    questions, currentIndex, isTimerRunning, setIsTimerRunning, setPlayMode, setGameState,
    selectedOption, setSelectedOption, handleAnswer, triggerConfirm, roomCode, playMode, nextQuestion
  } = ctx;

  return (
    <>
      {/* كشف السؤال والقرار */}
      {gameState === "questionReveal" && (
        <div className="bg-white dark:bg-slate-900 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-4 border-slate-200 dark:border-slate-800 text-center w-full max-w-4xl flex flex-col min-h-[40vh] md:min-h-[50vh] animate-in fade-in transition-all">
           <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <ShieldAlert className={`w-6 h-6 ${isDoubleRisk ? "text-yellow-500 animate-pulse" : "text-slate-400"}`} />
                <span className={`font-black text-sm md:text-lg ${isDoubleRisk ? "text-yellow-500" : "text-slate-500"}`}>
                  {isDoubleRisk ? "وضع الدبل مفعل ⚡" : "مخاطرة عادية"}
                </span>
              </div>
              <div className={`text-4xl md:text-5xl font-black font-mono flex items-center gap-2 ${timer <= 5 ? "text-rose-500 animate-pulse" : "text-yellow-500"}`}>
                <TimerIcon size={32} /> {timer}
              </div>
           </div>
           
           <div className="flex-1 flex flex-col items-center justify-center py-4 md:py-8 border-y-2 border-slate-100 dark:border-slate-800/50 my-4 bg-slate-50 dark:bg-slate-950/30 rounded-3xl relative">
              {!isQuestionVisible ? (
                <button onClick={() => setIsQuestionVisible(true)} className="px-6 py-4 md:px-10 md:py-6 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl border-b-4 border-slate-950 active:border-b-0 active:translate-y-[4px] transition-all text-xl md:text-3xl shadow-xl flex items-center gap-3">
                   <Eye size={32} /> إظهار السؤال للفرق
                </button>
              ) : (
                <>
                  <h2 className="text-xl sm:text-2xl md:text-4xl font-black leading-relaxed text-slate-800 dark:text-white px-4 mb-6">
                    {questions[currentIndex].question}
                  </h2>
                  {!isTimerRunning && timer === 25 && (
                    <button onClick={() => setIsTimerRunning(true)} className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-xl border-b-4 border-emerald-700 active:border-b-0 active:translate-y-[4px] transition-all text-base md:text-xl shadow-md flex items-center gap-2">
                       <Play size={24} /> بدء المؤقت (25ث)
                    </button>
                  )}
                </>
              )}
           </div>

           {isQuestionVisible && (
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mt-4 md:mt-6 animate-in slide-in-from-bottom-4">
                <button onClick={() => { setPlayMode("no_options"); setGameState("options"); }} className="p-3 md:p-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl border-b-4 border-cyan-800 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex flex-col items-center justify-center gap-1">
                   <span className="text-sm md:text-lg">إجابة بدون خيارات</span>
                   <span className="text-[10px] md:text-xs font-bold opacity-90 bg-cyan-800/40 px-2 py-1 rounded-lg">مكافأة أو كمين</span>
                </button>
                <button onClick={() => { setPlayMode("with_options"); setGameState("options"); }} className="p-3 md:p-4 bg-slate-700 hover:bg-slate-600 text-white font-black rounded-xl border-b-4 border-slate-900 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex flex-col items-center justify-center gap-1">
                   <span className="text-sm md:text-lg">إجابة مع الخيارات</span>
                   <span className="text-[10px] md:text-xs font-bold opacity-90 bg-slate-900/40 px-2 py-1 rounded-lg">مكافأة أو كمين</span>
                </button>
                {!isDoubleRisk ? (
                  <button onClick={() => { setGameState("buyOffer"); setIsTimerRunning(false); }} className="p-3 md:p-4 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl border-b-4 border-purple-800 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex flex-col items-center justify-center gap-1">
                     <span className="text-sm md:text-lg">بيع السؤال للخصم</span>
                     <span className="text-[10px] md:text-xs font-bold opacity-90 bg-purple-800/40 px-2 py-1 rounded-lg">بدبل مزايدتهم</span>
                  </button>
                ) : (
                  <div className="p-3 md:p-4 bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-black rounded-xl border-b-4 border-slate-300 dark:border-slate-900 flex flex-col items-center justify-center gap-1 cursor-not-allowed">
                     <span className="text-sm md:text-lg">بيع السؤال (مغلق)</span>
                     <span className="text-[10px] md:text-xs font-bold opacity-90">غير متاح مع الدبل</span>
                  </div>
                )}
             </div>
           )}

           {timer <= 0 && (
             <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
               <button 
                 onClick={() => triggerConfirm("هل أنت متأكد من إلغاء السؤال لأن الوقت انتهى والانتقال للسؤال التالي؟", nextQuestion)} 
                 className="w-full py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black rounded-xl border-b-4 border-slate-400 dark:border-slate-900 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex items-center justify-center gap-2"
               >
                 <XCircle size={20} /> إلغاء السؤال لانقضاء الوقت
               </button>
             </div>
           )}
        </div>
      )}

      {/* شاشة الخيارات والإجابة */}
      {gameState === "options" && (
        <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-4 border-slate-200 dark:border-slate-800 w-full max-w-4xl flex flex-col animate-in fade-in">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black leading-relaxed text-slate-800 dark:text-white flex-1 text-right">
                {questions[currentIndex].question}
              </h2>
              <div className={`text-3xl md:text-5xl font-black font-mono flex items-center gap-2 shrink-0 mr-4 ${timer <= 5 ? "text-rose-500 animate-pulse" : "text-yellow-500"}`}>
                <TimerIcon size={28} /> {timer}
              </div>
           </div>
           
           {playMode !== "no_options" ? (
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 w-full mb-6 md:mb-10">
                {questions[currentIndex].options.map((opt: string, i: number) => {
                   const isSelected = selectedOption === opt;
                   const isCorrect = opt === questions[currentIndex].answer;
                   const showResult = selectedOption !== null;

                   let optClass = "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400 cursor-pointer";

                   if (showResult) {
                      if (isCorrect) optClass = "bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-500 dark:text-emerald-400 scale-105";
                      else if (isSelected && !isCorrect) optClass = "bg-rose-100 border-rose-500 text-rose-800 dark:bg-rose-900/40 dark:border-rose-500 dark:text-rose-400 scale-105";
                      else optClass = "opacity-40 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 cursor-not-allowed";
                   }

                   return (
                     <button
                       key={i}
                       disabled={showResult}
                       onClick={async () => {
                         setSelectedOption(opt);
                         setIsTimerRunning(false); 
                         await supabase.from("auction_rooms").update({ selected_option: opt }).eq("room_code", roomCode);
                       }}
                       className={`p-4 md:p-5 border-2 rounded-xl md:rounded-2xl font-black text-sm md:text-lg text-center shadow-sm transition-all ${!showResult && 'active:scale-95'} ${optClass}`}
                     >
                       {opt}
                     </button>
                   );
                })}
             </div>
           ) : (
             <div className="py-8 md:py-12 flex justify-center items-center">
               <p className="text-xl md:text-3xl font-black text-cyan-600 dark:text-cyan-500 animate-pulse bg-cyan-50 dark:bg-cyan-900/20 px-6 py-4 rounded-2xl border border-cyan-200 dark:border-cyan-800">
                 يتم الإجابة شفهياً بدون خيارات 🎤
               </p>
             </div>
           )}

           <div className="bg-yellow-50 dark:bg-yellow-500/10 p-4 md:p-6 rounded-xl md:rounded-2xl border border-yellow-200 dark:border-yellow-500/30 text-center mb-6 md:mb-8">
             <p className="text-xs md:text-sm font-bold text-yellow-600 dark:text-yellow-500 mb-1 md:mb-2">الإجابة الصحيحة بالكنترول:</p>
             <p className="text-xl md:text-2xl font-black text-yellow-700 dark:text-yellow-400">{questions[currentIndex].answer}</p>
           </div>

           {playMode === "no_options" ? (
             <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <button onClick={() => handleAnswer(true)} className="flex-1 py-4 md:py-5 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-base md:text-xl rounded-xl border-b-4 border-emerald-700 active:border-b-0 active:translate-y-[4px] flex items-center justify-center gap-2 md:gap-3 transition-all shadow-md">
                   <CheckCircle2 size={20} className="md:w-6 md:h-6" /> إجابة صحيحة
                </button>
                <button onClick={() => triggerConfirm("هل أنت متأكد من تسجيل الإجابة كخاطئة وتطبيق الخصم؟", () => handleAnswer(false))} className="flex-1 py-4 md:py-5 bg-rose-500 hover:bg-rose-400 text-white font-black text-base md:text-xl rounded-xl border-b-4 border-rose-700 active:border-b-0 active:translate-y-[4px] flex items-center justify-center gap-2 md:gap-3 transition-all shadow-md">
                   <XCircle size={20} className="md:w-6 md:h-6" /> إجابة خاطئة
                </button>
             </div>
           ) : (
             selectedOption !== null && (
               <button 
                 onClick={() => handleAnswer(selectedOption === questions[currentIndex].answer)} 
                 className="w-full py-4 md:py-5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-lg md:text-xl rounded-xl border-b-4 border-amber-700 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex items-center justify-center gap-2"
               >
                 اعتماد النتيجة والانتقال <ArrowRight size={24} />
               </button>
             )
           )}

           {timer <= 0 && (
             <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
               <button 
                 onClick={() => triggerConfirm("هل أنت متأكد من إلغاء السؤال لأن الوقت انتهى والانتقال للسؤال التالي؟", nextQuestion)} 
                 className="w-full py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black rounded-xl border-b-4 border-slate-400 dark:border-slate-900 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex items-center justify-center gap-2"
               >
                 <XCircle size={20} /> إلغاء السؤال لانقضاء الوقت
               </button>
             </div>
           )}
        </div>
      )}
    </>
  );
}