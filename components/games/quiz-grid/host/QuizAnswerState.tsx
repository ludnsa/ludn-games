/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useState } from "react";
import { CheckCircle2, XCircle, ImageOff, Shovel } from "lucide-react";
import { QUIZ_LIFELINE_LABELS } from "@/constants/quiz-grid";
import type { useQuizHost } from "@/hooks/games/quiz-grid/useQuizHost";

type Ctx = ReturnType<typeof useQuizHost>;

export default function QuizAnswerState({ ctx }: { ctx: Ctx }) {
  const { room, activeQuestion, answerContent, award, isBusy } = ctx;
  const [imageFailed, setImageFailed] = useState(false);

  if (!room || !activeQuestion || !answerContent) return null;

  const pitTeam = room.pit_active_team;
  const pitTeamName = pitTeam === 1 ? room.t1_name : pitTeam === 2 ? room.t2_name : null;

  return (
    <section className="w-full max-w-5xl mx-auto flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="px-4 py-2 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-black text-base md:text-xl">
          {activeQuestion.category_name_ar}
        </span>
        <span className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-white text-white dark:text-slate-900 font-black text-base md:text-xl">
          {activeQuestion.points} نقطة
        </span>
      </div>

      <p className="text-center text-lg md:text-2xl font-bold text-slate-500 dark:text-slate-400 leading-snug">
        {activeQuestion.question_text}
      </p>

      <div className="flex flex-col items-center gap-5 bg-emerald-50 dark:bg-emerald-950/30 border-4 border-emerald-500 rounded-3xl p-6 md:p-10 shadow-lg">
        <span className="text-sm md:text-base font-black text-emerald-600 dark:text-emerald-400 tracking-widest">
          الإجابة الصحيحة
        </span>
        <p className="text-3xl md:text-5xl lg:text-6xl font-black text-center text-emerald-800 dark:text-emerald-300 leading-snug">
          {answerContent.answer_text}
        </p>

        {answerContent.answer_image_url && !imageFailed && (
          <img
            src={answerContent.answer_image_url}
            alt={answerContent.answer_image_alt || "صورة الإجابة"}
            onError={() => setImageFailed(true)}
            className="max-h-[35vh] w-auto max-w-full rounded-2xl object-contain shadow-md"
          />
        )}

        {answerContent.answer_image_url && imageFailed && (
          <div className="flex items-center gap-2 text-sm font-bold text-slate-400 bg-white dark:bg-slate-800 rounded-xl px-4 py-3">
            <ImageOff size={18} /> تعذّر تحميل صورة الإجابة.
          </div>
        )}
      </div>

      {pitTeamName && (
        <div className="flex items-center justify-center gap-3 bg-orange-500 text-white font-black text-base md:text-xl rounded-2xl py-3 px-6">
          <Shovel size={24} />
          {QUIZ_LIFELINE_LABELS.pit} لصالح {pitTeamName}: إن كانت إجابتهم صحيحة يكسبون {activeQuestion.points} ويخسر
          الخصم {activeQuestion.points}.
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        <button
          onClick={() => award(1)}
          disabled={isBusy}
          className="flex-1 flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white font-black text-lg md:text-xl py-5 px-4 rounded-2xl border-b-8 border-sky-700 active:border-b-0 active:translate-y-[8px] transition-all shadow-md"
        >
          <CheckCircle2 size={26} /> {room.t1_name} أجاب صح
        </button>

        <button
          onClick={() => award(null)}
          disabled={isBusy}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-500 hover:bg-slate-400 disabled:opacity-40 text-white font-black text-lg md:text-xl py-5 px-4 rounded-2xl border-b-8 border-slate-700 active:border-b-0 active:translate-y-[8px] transition-all shadow-md"
        >
          <XCircle size={26} /> لا أحد أجاب
        </button>

        <button
          onClick={() => award(2)}
          disabled={isBusy}
          className="flex-1 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white font-black text-lg md:text-xl py-5 px-4 rounded-2xl border-b-8 border-rose-700 active:border-b-0 active:translate-y-[8px] transition-all shadow-md"
        >
          <CheckCircle2 size={26} /> {room.t2_name} أجاب صح
        </button>
      </div>
    </section>
  );
}
