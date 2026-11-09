/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useState } from "react";
import { CheckCircle2, XCircle, ImageOff } from "lucide-react";
import { QUIZ_LIFELINE_LIST } from "@/constants/quiz-grid";
import { QuizCardIcon } from "@/components/games/quiz-grid/shared/QuizCardIcon";
import { QZ_TIER } from "@/components/games/quiz-grid/shared/quizUi";
import type { QuizLifelineKey, QuizRoom, QuizTeam } from "@/types";
import type { useQuizHost } from "@/hooks/games/quiz-grid/useQuizHost";

type Ctx = ReturnType<typeof useQuizHost>;

const BOARD_PHASE_LIFELINES = QUIZ_LIFELINE_LIST.filter((def) => def.phase === "board");

function armedTeamField(kind: QuizLifelineKey): keyof QuizRoom | null {
  if (kind === "pit") return "pit_active_team";
  if (kind === "double") return "double_active_team";
  if (kind === "extraTurn") return "extra_turn_team";
  return null;
}

function describeArmedBet(kind: QuizLifelineKey, teamName: string, points: number): string {
  if (kind === "pit") return `لصالح ${teamName}: إجابة صحيحة تكسبهم ${points} وتخصم ${points} من الخصم.`;
  if (kind === "double") return `لصالح ${teamName}: إجابة صحيحة تضاعف نقاطهم إلى ${points * 2}.`;
  if (kind === "extraTurn") return `لصالح ${teamName}: إجابة صحيحة تُبقي الدور لهم.`;
  return "";
}

export default function QuizAnswerState({ ctx }: { ctx: Ctx }) {
  const { room, activeQuestion, answerContent, award, isBusy } = ctx;
  const [imageFailed, setImageFailed] = useState(false);

  if (!room || !activeQuestion || !answerContent) return null;

  const teamName = (team: QuizTeam) => (team === 1 ? room.t1_name : room.t2_name);
  const armedBets = BOARD_PHASE_LIFELINES.filter((def) => {
    const field = armedTeamField(def.key);
    return field && room[field] !== null;
  });

  return (
    <section className="w-full max-w-5xl mx-auto flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="px-4 py-2 rounded-xl bg-[#0b0d26]/80 backdrop-blur-md border border-cyan-300/30 text-white font-black text-base md:text-xl">
          {activeQuestion.category_name_ar}
        </span>
        <span className={`px-4 py-2 rounded-xl backdrop-blur-md font-black text-base md:text-xl ${QZ_TIER[activeQuestion.points]?.chip ?? ""}`}>
          {activeQuestion.points} نقطة
        </span>
      </div>

      <p className="text-center text-lg md:text-2xl font-bold text-slate-200 leading-snug [text-shadow:0_2px_6px_#000]">
        {activeQuestion.question_text}
      </p>

      <div className="flex flex-col items-center gap-5 bg-[#04140f]/80 backdrop-blur-md border-4 border-emerald-400 rounded-3xl p-6 md:p-10 shadow-[0_0_44px_-8px_rgba(52,211,153,0.85)]">
        <span className="text-sm md:text-base font-black text-emerald-300 tracking-widest">
          الإجابة الصحيحة
        </span>
        <p className="text-3xl md:text-5xl lg:text-6xl font-black text-center text-emerald-200 leading-snug [text-shadow:0_0_18px_rgba(52,211,153,0.7)]">
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
          <div className="flex items-center gap-2 text-sm font-bold text-slate-300 bg-white/10 rounded-xl px-4 py-3">
            <ImageOff size={18} /> تعذّر تحميل صورة الإجابة.
          </div>
        )}
      </div>

      {armedBets.length > 0 && (
        <div className="flex flex-col gap-2">
          {armedBets.map((def) => {
            const field = armedTeamField(def.key);
            const team = field ? (room[field] as QuizTeam | null) : null;
            if (!team) return null;
            return (
              <div
                key={def.key}
                className="flex items-center justify-center gap-3 bg-orange-500/90 backdrop-blur-md border border-orange-300 text-white font-black text-base md:text-xl rounded-2xl py-2.5 px-4 md:px-6 text-center shadow-[0_0_26px_-6px_rgba(251,146,60,0.9)]"
              >
                <QuizCardIcon kind={def.key} className="w-9 h-9 md:w-11 md:h-11 ring-2 ring-white/50" />
                {describeArmedBet(def.key, teamName(team), activeQuestion.points)}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        <button
          onClick={() => award(1)}
          disabled={isBusy}
          className="flex-1 flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white font-black text-lg md:text-xl py-5 px-4 rounded-2xl border-b-8 border-sky-700 active:border-b-0 active:translate-y-[8px] transition-all shadow-[0_0_28px_-6px_rgba(56,189,248,0.85)]"
        >
          <CheckCircle2 size={26} /> {room.t1_name} أجاب صح
        </button>

        <button
          onClick={() => award(null)}
          disabled={isBusy}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-600/80 backdrop-blur-md hover:bg-slate-500/80 disabled:opacity-40 text-white font-black text-lg md:text-xl py-5 px-4 rounded-2xl border-b-8 border-slate-800 active:border-b-0 active:translate-y-[8px] transition-all"
        >
          <XCircle size={26} /> لا أحد أجاب
        </button>

        <button
          onClick={() => award(2)}
          disabled={isBusy}
          className="flex-1 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white font-black text-lg md:text-xl py-5 px-4 rounded-2xl border-b-8 border-rose-700 active:border-b-0 active:translate-y-[8px] transition-all shadow-[0_0_28px_-6px_rgba(251,113,133,0.85)]"
        >
          <CheckCircle2 size={26} /> {room.t2_name} أجاب صح
        </button>
      </div>
    </section>
  );
}
