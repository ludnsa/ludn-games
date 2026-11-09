/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useState } from "react";
import { Eye, ImageOff, X } from "lucide-react";
import { QUIZ_CONFIG, QUIZ_LIFELINE_LIST, quizTimerDangerAt } from "@/constants/quiz-grid";
import { QuizCardIcon } from "@/components/games/quiz-grid/shared/QuizCardIcon";
import { QZ_BACKDROP, QZ_BTN_PRIMARY, QZ_MODAL, QZ_PANEL, QZ_TIER } from "@/components/games/quiz-grid/shared/quizUi";
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
          ? "border-red-500 bg-red-950/60 animate-pulse shadow-[0_0_34px_-4px_rgba(239,68,68,0.9)]"
          : "border-slate-100 bg-[#0b0d26]/80 shadow-[0_0_30px_-6px_rgba(34,211,238,0.8),0_0_44px_-10px_rgba(236,72,153,0.7)]"
      }`}
      style={{ opacity: seconds === 0 ? 0.7 : 1 }}
      role="timer"
      aria-live="off"
    >
      <div
        className="absolute inset-0 rounded-full opacity-20"
        style={{
          background: `conic-gradient(currentColor ${progress * 360}deg, transparent 0deg)`,
          color: isDanger ? "#ef4444" : "#22d3ee",
        }}
      />
      <span
        className={`relative text-3xl md:text-5xl font-black tabular-nums ${
          isDanger ? "text-red-300" : "text-white [text-shadow:0_0_14px_rgba(34,211,238,0.8)]"
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
        <span className="px-4 py-2 rounded-xl bg-[#0b0d26]/80 backdrop-blur-md border border-cyan-300/30 text-white font-black text-base md:text-xl">
          {activeQuestion.category_name_ar}
        </span>
        <span className={`px-4 py-2 rounded-xl backdrop-blur-md font-black text-base md:text-xl ${QZ_TIER[activeQuestion.points]?.chip ?? ""}`}>
          {activeQuestion.points} نقطة
        </span>
        {armedBoardBets.map((def) => (
          <span
            key={def.key}
            className="ps-1.5 pe-4 py-1.5 rounded-xl bg-orange-500 text-white font-black text-base md:text-xl flex items-center gap-2 shadow-[0_0_24px_-6px_rgba(251,146,60,0.9)]"
          >
            <QuizCardIcon kind={def.key} className="w-8 h-8 md:w-9 md:h-9 ring-2 ring-white/50" /> {def.label} مُفعّلة
          </span>
        ))}
      </div>

      {room.call_friend_active && (
        <div className="flex items-center justify-center gap-3 bg-emerald-500/90 backdrop-blur-md border border-emerald-300 text-white font-black text-lg md:text-2xl rounded-2xl py-3 px-6 animate-pulse shadow-[0_0_30px_-6px_rgba(52,211,153,0.9)]">
          <QuizCardIcon kind="call" className="w-10 h-10 md:w-12 md:h-12 ring-2 ring-white/60" />
          جاري الاتصال بصديق — أُضيفت {QUIZ_CONFIG.CALL_FRIEND_BONUS} ثانية
        </div>
      )}

      {room.audience_active && (
        <div className="flex items-center justify-center gap-3 bg-fuchsia-500/90 backdrop-blur-md border border-fuchsia-300 text-white font-black text-lg md:text-2xl rounded-2xl py-3 px-6 animate-pulse shadow-[0_0_30px_-6px_rgba(217,70,239,0.9)]">
          <QuizCardIcon kind="audience" className="w-10 h-10 md:w-12 md:h-12 ring-2 ring-white/60" />
          استشارة الجمهور — شاركونا آراءكم!
        </div>
      )}

      {restTargetName && (
        <div className="flex items-center justify-center gap-3 bg-amber-500/90 backdrop-blur-md border border-amber-300 text-white font-black text-lg md:text-2xl rounded-2xl py-3 px-6 shadow-[0_0_30px_-6px_rgba(245,158,11,0.9)]">
          <QuizCardIcon kind="rest" className="w-10 h-10 md:w-12 md:h-12 ring-2 ring-white/60" /> {restTargetName} ممنوع من الإجابة على هذا السؤال
        </div>
      )}

      <div className={`flex flex-col md:flex-row items-center gap-5 rounded-3xl p-6 md:p-8 ${QZ_PANEL}`}>
        <Timer seconds={remaining} totalSeconds={room.timer_seconds} />

        <div className="flex-1 w-full flex flex-col items-center gap-5">
          <p className="text-2xl md:text-4xl lg:text-5xl font-black text-center text-white leading-snug">
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
            <div className="flex items-center gap-2 text-sm font-bold text-slate-300 bg-white/10 rounded-xl px-4 py-3">
              <ImageOff size={18} /> تعذّر تحميل صورة السؤال — اعتمد على النص.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {ACTIVE_QUESTION_LIFELINES.filter((def) => isLifelineOwned(room.turn, def.key)).map((def) => {
          const used = isLifelineUsed(room.turn, def.key);
          const alreadyActive = def.key === "call" ? room.call_friend_active : room.audience_active;

          return (
            <button
              key={def.key}
              onClick={() => activateLifeline(def.key)}
              disabled={used || alreadyActive || isBusy}
              className="flex-1 flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-2.5 px-4 rounded-2xl border-b-4 border-emerald-700 active:border-b-0 active:translate-y-[4px] disabled:active:translate-y-0 disabled:active:border-b-4 transition-all"
            >
              <QuizCardIcon kind={def.key} off={used} className="w-10 h-10 md:w-11 md:h-11 ring-2 ring-white/50" />
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
            className="flex-1 flex items-center justify-center gap-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-2.5 px-4 rounded-2xl border-b-4 border-amber-700 active:border-b-0 active:translate-y-[4px] disabled:active:translate-y-0 disabled:active:border-b-4 transition-all"
          >
            <QuizCardIcon kind="rest" off={restUsedByWaitingTeam} className="w-10 h-10 md:w-11 md:h-11 ring-2 ring-white/50" />
            {restUsedByWaitingTeam ? "استريح — استُخدمت" : `استريح — ${waitingTeamName}`}
          </button>
        )}

        <button
          onClick={reveal}
          disabled={isBusy}
          className={`flex-[2] flex items-center justify-center gap-2 disabled:opacity-40 font-black text-lg md:text-xl py-4 px-4 rounded-2xl ${QZ_BTN_PRIMARY}`}
        >
          <Eye size={24} /> كشف الإجابة
        </button>
      </div>

      {/* اختيار اللاعب الممنوع من الإجابة — من الفريق الذي يجيب الآن، يختاره الفريق المنتظر */}
      {restPickerOpen && (
        <div className={`fixed inset-0 z-[2000] flex items-center justify-center p-4 animate-in fade-in ${QZ_BACKDROP}`}>
          <div className={`${QZ_MODAL} border-2 border-amber-400 p-6 md:p-8 rounded-3xl max-w-md w-full animate-in zoom-in-95`}>
            <div className="flex items-center justify-between gap-3 mb-5">
              <h2 className="flex items-center gap-3 text-xl md:text-2xl font-black text-white">
                <QuizCardIcon kind="rest" className="w-10 h-10 ring-2 ring-amber-300/60" />
                من يستريح من {room.turn === 1 ? room.t1_name : room.t2_name}؟
              </h2>
              <button
                onClick={() => setRestPickerOpen(false)}
                className="p-2 rounded-lg text-slate-300 hover:bg-white/10"
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
                  className="w-full p-4 bg-black/30 hover:bg-amber-500/15 border-2 border-white/10 hover:border-amber-400 rounded-xl font-black text-lg text-white transition-colors text-right"
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
