"use client";
import React from "react";
import { Timer as TimerIcon, Eye } from "lucide-react";

export default function TeamQuestionState({ ctx }: { ctx: any }) {
  if (!ctx.liveData || (ctx.liveData.game_state !== "questionReveal" && ctx.liveData.game_state !== "options")) return null;

  return (
    <div className="bg-[#0e0a06]/85 backdrop-blur-sm p-6 md:p-10 rounded-[2rem] shadow-xl border-4 border-[#d4af37]/30 text-center w-full animate-in fade-in">
       <div className="flex justify-between items-center mb-6">
          <span className="bg-[#1f160c] px-3 py-1 rounded-lg text-xs font-black text-slate-500 border border-[#d4af37]/25">
            سؤال الجولة {(ctx.liveData.current_index || 0) + 1}
          </span>
          <div className={`text-3xl md:text-4xl font-black font-mono flex items-center gap-2 ${ctx.liveData.timer <= 5 ? "text-rose-500 animate-pulse" : "text-yellow-500"}`}>
            <TimerIcon size={24} /> {ctx.liveData.timer || 0}
          </div>
       </div>

       <div className="py-6 md:py-10 border-y-2 border-[#d4af37]/15 my-4 bg-[#0a0704]/60 rounded-2xl">
          {!ctx.liveData.is_question_visible ? (
            <div className="text-slate-400 dark:text-slate-500 flex flex-col items-center gap-3 animate-pulse">
              <Eye size={40} />
              <p className="font-black text-lg">بانتظار إظهار السؤال من الحكم...</p>
            </div>
          ) : (
            <h2 className="text-xl md:text-3xl font-black leading-relaxed text-slate-800 dark:text-white px-4">
              {ctx.activeQuestion?.question || "جاري تحميل السؤال..."}
            </h2>
          )}
       </div>

       {ctx.liveData.game_state === "options" && ctx.liveData.play_mode === "with_options" && ctx.liveData.is_question_visible && (
         <div className="flex flex-col gap-3 mt-6">
            {ctx.activeQuestion?.options?.map((opt: string, i: number) => {
               const isSelected = ctx.liveData.selected_option === opt;
               const isCorrect = opt === ctx.activeQuestion.answer;
               const showResult = ctx.liveData.selected_option !== null && ctx.liveData.selected_option !== undefined;

               let optClass = "bg-[#1f160c] border-[#d4af37]/30 text-slate-700 dark:text-slate-300";

               if (showResult) {
                  if (isCorrect) optClass = "bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-500 dark:text-emerald-400 scale-105";
                  else if (isSelected && !isCorrect) optClass = "bg-rose-100 border-rose-500 text-rose-800 dark:bg-rose-900/40 dark:border-rose-500 dark:text-rose-400 scale-105";
                  else optClass = "opacity-40 bg-[#120c07] border-[#d4af37]/30 text-slate-500";
               }

               return (
                 <div key={i} className={`p-4 border-2 rounded-xl font-black text-sm md:text-lg text-right transition-all duration-300 shadow-sm ${optClass}`}>
                   {opt}
                 </div>
               );
            })}
         </div>
       )}

       {ctx.liveData.game_state === "options" && ctx.liveData.play_mode === "no_options" && ctx.liveData.is_question_visible && (
         <div className="mt-6 p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-400 font-black">
           يتم الإجابة شفهياً بدون خيارات 🎤
         </div>
       )}
    </div>
  );
}