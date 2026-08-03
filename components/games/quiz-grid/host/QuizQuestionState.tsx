/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useState } from "react";
import { Armchair, Eye, ImageOff, X } from "lucide-react";
import { QUIZ_CONFIG, QUIZ_LIFELINE_LIST, quizTimerDangerAt } from "@/constants/quiz-grid";
import { QUIZ_LIFELINE_ICONS } from "@/components/games/quiz-grid/shared/quizLifelineIcons";
import type { QuizLifelineKey, QuizRoom } from "@/types";
import type { useQuizHost } from "@/hooks/games/quiz-grid/useQuizHost";

type Ctx = ReturnType<typeof useQuizHost>;

/**
 * مؤقت دائري كبير — يتحول للأحمر وينبض قرب النهاية.
 * عتبة الخطر نسبية لمدة السؤال المختارة (بحد أقصى 10 ثوانٍ) حتى لا يظل
 * أحمر لمعظم مدته عند اختيار مدة قصيرة.
 */
function Timer({ seconds, totalSeconds }: { seconds: number; totalSeconds: number }) {
  const isDanger = seconds <= quizTimerDangerAt(totalSeconds);
  const progress = Math.min(1, seconds / totalSeconds);

  return (
    <div
      className={`relative shrink-0 w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center border-8 transition-colors duration-500 ${
        isDanger
          ? "border-rose-500 bg-rose-50 dark:bg-rose-950/40 animate-pulse"
          : "border-violet-500 bg-violet-50 dark:bg-violet-950/40"
      }`}
      style={{ opacity: seconds === 0 ? 0.7 : 1 }}
      role="timer"
      aria-live="off"
    >
      <div
        className="absolute inset-0 rounded-full opacity-20"
        style={{
          background: `conic-gradient(currentColor ${progress * 360}deg, transparent 0deg)`,
          color: isDanger ? "#f43f5e" : "#8b5cf6",
        }}
      />
      <span
        className={`relative text-3xl md:text-5xl font-black tabular-nums ${
          isDanger ? "text-rose-600 dark:text-rose-400" : "text-violet-700 dark:text-violet-300"
        }`}
      >
        {seconds}
      </span>
    </div>
  );
}

// رهانات اللوحة (الحفرة، مضاعفة، دور إضافي) تظل مُعلَنة أثناء عرض السؤال أيضاً — نعرضها كشارات هنا
const BOARD_PHASE_LIFELINES = QUIZ_LIFELINE_LIST.filter((def) => def.phase === "board");
// وسائل تُستخدم أثناء عرض السؤال ويفعّلها الفريق صاحب الدور (اتصال بصديق، استشارة الجمهور)
const ACTIVE_QUESTION_LIFELINES = QUIZ_LIFELINE_LIST.filter(
  (def) => def.phase === "question" && def.activator === "active"
);

function armedTeamField(kind: QuizLifelineKey): keyof QuizRoom | null {
  if (kind === "pit") return "pit_active_team";
  if (kind === "double") return "double_active_team";
  if (kind === "extraTurn") return "extra_turn_team";
  return null;
}

export default function QuizQuestionState({ ctx }: { ctx: Ctx }) {
  const {
    room, activeQuestion, remaining, reveal, isBusy,
    activateLifeline, isLifelineOwned, isLifelineUsed,
    waitingTeam, answeringTeamPlayers,
    restPickerOpen, setRestPickerOpen, restTargetName,
  } = ctx;

  const [imageFailed, setImageFailed] = useState(false);

  if (!room || !activeQuestion) return null;

  const armedBoardBets = BOARD_PHASE_LIFELINES.filter((def) => {
    const field = armedTeamField(def.key);
    return field && room[field] === room.turn;
  });

  const waitingTeamName = waitingTeam === 1 ? room.t1_name : room.t2_name;
  const restOwnedByWaitingTeam = waitingTeam !== null && isLifelineOwned(waitingTeam, "rest");
  const restUsedByWaitingTeam = waitingTeam !== null && isLifelineUsed(waitingTeam, "rest");

  return (
    <section className="w-full max-w-5xl mx-auto flex flex-col gap-5 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="px-4 py-2 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-black text-base md:text-xl">
          {activeQuestion.category_name_ar}
        </span>
        <span className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-white text-white dark:text-slate-900 font-black text-base md:text-xl">
          {activeQuestion.points} نقطة
        </span>
        {armedBoardBets.map((def) => {
          const Icon = QUIZ_LIFELINE_ICONS[def.key];
          return (
            <span
              key={def.key}
              className="px-4 py-2 rounded-xl bg-orange-500 text-white font-black text-base md:text-xl flex items-center gap-2"
            >
              <Icon size={20} /> {def.label} مُفعّلة
            </span>
          );
        })}
      </div>

      {room.call_friend_active && (
        <div className="flex items-center justify-center gap-3 bg-emerald-500 text-white font-black text-lg md:text-2xl rounded-2xl py-4 px-6 animate-pulse">
          {React.createElement(QUIZ_LIFELINE_ICONS.call, { size: 28 })}
          جاري الاتصال بصديق — أُضيفت {QUIZ_CONFIG.CALL_FRIEND_BONUS} ثانية
        </div>
      )}

      {room.audience_active && (
        <div className="flex items-center justify-center gap-3 bg-fuchsia-500 text-white font-black text-lg md:text-2xl rounded-2xl py-4 px-6 animate-pulse">
          {React.createElement(QUIZ_LIFELINE_ICONS.audience, { size: 28 })}
          استشارة الجمهور — شاركونا آراءكم!
        </div>
      )}

      {restTargetName && (
        <div className="flex items-center justify-center gap-3 bg-amber-500 text-white font-black text-lg md:text-2xl rounded-2xl py-4 px-6">
          <Armchair size={28} /> {restTargetName} ممنوع من الإجابة على هذا السؤال
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center gap-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
        <Timer seconds={remaining} totalSeconds={room.timer_seconds} />

        <div className="flex-1 w-full flex flex-col items-center gap-5">
          <p className="text-2xl md:text-4xl lg:text-5xl font-black text-center text-slate-900 dark:text-white leading-snug">
            {activeQuestion.question_text}
          </p>

          {activeQuestion.question_image_url && !imageFailed && (
            <img
              src={activeQuestion.question_image_url}
              alt={activeQuestion.question_image_alt || "صورة السؤال"}
              onError={() => setImageFailed(true)}
              className="max-h-[38vh] w-auto max-w-full rounded-2xl object-contain shadow-md"
            />
          )}

          {activeQuestion.question_image_url && imageFailed && (
            <div className="flex items-center gap-2 text-sm font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3">
              <ImageOff size={18} /> تعذّر تحميل صورة السؤال — اعتمد على النص.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {ACTIVE_QUESTION_LIFELINES.filter((def) => isLifelineOwned(room.turn, def.key)).map((def) => {
          const Icon = QUIZ_LIFELINE_ICONS[def.key];
          const used = isLifelineUsed(room.turn, def.key);
          const alreadyActive = def.key === "call" ? room.call_friend_active : room.audience_active;

          return (
            <button
              key={def.key}
              onClick={() => activateLifeline(def.key)}
              disabled={used || alreadyActive || isBusy}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-4 px-4 rounded-2xl border-b-4 border-emerald-700 active:border-b-0 active:translate-y-[4px] disabled:active:translate-y-0 disabled:active:border-b-4 transition-all"
            >
              <Icon size={22} />
              {used
                ? `${def.label} — استُخدمت`
                : def.key === "call"
                  ? `${def.label} +${QUIZ_CONFIG.CALL_FRIEND_BONUS}ث`
                  : def.label}
            </button>
          );
        })}

        {restOwnedByWaitingTeam && (
          <button
            onClick={() => activateLifeline("rest")}
            disabled={restUsedByWaitingTeam || Boolean(restTargetName) || isBusy}
            title={`استريح يُفعّلها ${waitingTeamName} ضد الفريق الذي يجيب الآن`}
            className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-4 px-4 rounded-2xl border-b-4 border-amber-700 active:border-b-0 active:translate-y-[4px] disabled:active:translate-y-0 disabled:active:border-b-4 transition-all"
          >
            <Armchair size={22} />
            {restUsedByWaitingTeam ? "استريح — استُخدمت" : `استريح — ${waitingTeamName}`}
          </button>
        )}

        <button
          onClick={reveal}
          disabled={isBusy}
          className="flex-[2] flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-black text-lg md:text-xl py-4 px-4 rounded-2xl border-b-4 border-violet-800 active:border-b-0 active:translate-y-[4px] transition-all shadow-md"
        >
          <Eye size={24} /> كشف الإجابة
        </button>
      </div>

      {/* اختيار اللاعب الممنوع من الإجابة — من الفريق الذي يجيب الآن، يختاره الفريق المنتظر */}
      {restPickerOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border-4 border-amber-500 p-6 md:p-8 rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">
                من يستريح من {room.turn === 1 ? room.t1_name : room.t2_name}؟
              </h2>
              <button
                onClick={() => setRestPickerOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
              {answeringTeamPlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => activateLifeline("rest", player.id)}
                  disabled={isBusy}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 hover:bg-amber-50 dark:hover:bg-amber-900/20 border-2 border-slate-200 dark:border-slate-800 hover:border-amber-400 rounded-xl font-black text-lg text-slate-800 dark:text-white transition-colors text-right"
                >
                  {player.display_name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
