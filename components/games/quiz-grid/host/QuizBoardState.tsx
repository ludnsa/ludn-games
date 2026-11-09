"use client";
import React from "react";
import { Check } from "lucide-react";
import { QUIZ_LIFELINE_HINTS, QUIZ_LIFELINE_LIST } from "@/constants/quiz-grid";
import { QuizCardIcon } from "@/components/games/quiz-grid/shared/QuizCardIcon";
import { QZ_GLASS, QZ_TEAM, QZ_TIER } from "@/components/games/quiz-grid/shared/quizUi";
import type { QuizLifelineKey, QuizRoom } from "@/types";
import type { useQuizHost } from "@/hooks/games/quiz-grid/useQuizHost";

type Ctx = ReturnType<typeof useQuizHost>;

/**
 * Tailwind لا يستطيع بناء صنف grid-cols-N من متغيّر وقت التشغيل، لذا نحتاج
 * خريطة صريحة بكل القيم الممكنة (عدد الفئات بين 2 و6).
 */
const GRID_COLS_BY_COUNT: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

/** رهانات اللوحة تُعلن قبل عرض السؤال — كلها يفعّلها الفريق صاحب الدور فقط. */
const BOARD_PHASE_LIFELINES = QUIZ_LIFELINE_LIST.filter((def) => def.phase === "board");

/** الحقل في صف الغرفة الذي يُخزَّن فيه الفريق المُفعِّل لهذا الرهان، إن وُجد. */
function armedTeamField(kind: QuizLifelineKey): keyof QuizRoom | null {
  if (kind === "pit") return "pit_active_team";
  if (kind === "double") return "double_active_team";
  if (kind === "extraTurn") return "extra_turn_team";
  return null;
}

export default function QuizBoardState({ ctx }: { ctx: Ctx }) {
  const { board, columns, room, pickCell, isBusy, activateLifeline, isLifelineOwned, isLifelineUsed } = ctx;
  if (!room) return null;

  const activeTeamName = room.turn === 1 ? room.t1_name : room.t2_name;
  const ownedBoardLifelines = BOARD_PHASE_LIFELINES.filter((def) => isLifelineOwned(room.turn, def.key));
  const anyArmed = ownedBoardLifelines.some((def) => {
    const field = armedTeamField(def.key);
    return field && room[field] === room.turn;
  });

  return (
    <section className="w-full flex flex-col gap-5">
      {/* رهانات اللوحة تُعلن قبل رؤية السؤال، فمكانها الطبيعي هو هذه الشاشة */}
      <div
        className={`flex flex-col gap-3 rounded-2xl border-2 p-4 transition-colors ${
          anyArmed
            ? "bg-orange-500/30 backdrop-blur-md border-orange-400 text-white shadow-[0_0_34px_-6px_rgba(251,146,60,0.85)]"
            : `${QZ_GLASS} border-cyan-300/25`
        }`}
      >
        <div className="text-center sm:text-right">
          <p className="font-black text-lg text-white">
            دور {activeTeamName} — اختاروا خلية
          </p>
        </div>

        {ownedBoardLifelines.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {ownedBoardLifelines.map((def) => {
              const field = armedTeamField(def.key);
              const isArmed = Boolean(field && room[field] === room.turn);
              const isUsed = isLifelineUsed(room.turn, def.key);

              return (
                <button
                  key={def.key}
                  onClick={() => activateLifeline(def.key)}
                  disabled={isUsed || isArmed || isBusy}
                  title={def.hint}
                  className={`flex items-center gap-2.5 font-black py-2 ps-2 pe-5 rounded-xl border-b-4 active:border-b-0 active:translate-y-[4px] transition-all disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:border-b-4 ${
                    isArmed
                      ? "bg-white text-orange-600 border-orange-200"
                      : isUsed
                        ? "bg-black/30 text-slate-400 border-black/40 opacity-60"
                        : "bg-orange-500 hover:bg-orange-400 text-white border-orange-700 disabled:opacity-40"
                  }`}
                >
                  <span className="relative shrink-0">
                    <QuizCardIcon kind={def.key} off={isUsed} className="w-10 h-10 md:w-11 md:h-11 ring-2 ring-white/40" />
                    {isArmed && (
                      <span className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-orange-500 text-white grid place-items-center">
                        <Check size={13} strokeWidth={3} />
                      </span>
                    )}
                  </span>
                  {isArmed ? `${def.label} مُفعّلة` : isUsed ? `${def.label} — استُخدمت` : def.label}
                </button>
              );
            })}
          </div>
        )}

        {anyArmed && (
          <p className="text-xs font-bold text-white/80">
            إجابة صحيحة تفعّل الرهان، والخطأ لا يغيّر شيئاً.{" "}
            {ownedBoardLifelines
              .filter((def) => {
                const field = armedTeamField(def.key);
                return field && room[field] === room.turn;
              })
              .map((def) => QUIZ_LIFELINE_HINTS[def.key])
              .join(" ")}
          </p>
        )}
      </div>

      <div className={`grid ${GRID_COLS_BY_COUNT[columns.length] || "grid-cols-6"} gap-1.5 md:gap-3`}>
        {columns.map((name, columnIndex) => (
          <div key={columnIndex} className="flex flex-col gap-1.5 md:gap-3">
            <div className="h-16 md:h-20 flex items-center justify-center text-center bg-[#0b0d26]/80 backdrop-blur-md text-white rounded-xl md:rounded-2xl px-1 md:px-2 border border-cyan-300/40 border-b-4 border-b-fuchsia-500/70 shadow-[0_0_20px_-8px_rgba(34,211,238,0.8)]">
              <span className="font-black text-[11px] sm:text-sm md:text-lg leading-tight line-clamp-3">
                {name}
              </span>
            </div>

            {(board[columnIndex] || []).map((cell) => {
              if (!cell) return null;
              const isConsumed = cell.status === "consumed";

              return (
                <button
                  key={cell.id}
                  onClick={() => pickCell(cell.id)}
                  disabled={isConsumed || isBusy}
                  aria-label={`${name} — ${cell.points} نقطة${isConsumed ? " (مستخدم)" : ""}`}
                  className={`h-14 md:h-20 rounded-xl md:rounded-2xl font-black text-lg md:text-3xl border-2 backdrop-blur-sm transition-all ${
                    isConsumed
                      ? "bg-black/40 border-white/5 text-slate-500 cursor-not-allowed"
                      : `${QZ_TIER[cell.points]?.cell ?? ""} active:scale-95`
                  }`}
                >
                  {isConsumed ? (
                    <span
                      className={`block truncate px-1 text-xs md:text-base ${
                        cell.awarded_team === 1 ? QZ_TEAM[1].text : cell.awarded_team === 2 ? QZ_TEAM[2].text : ""
                      }`}
                    >
                      {cell.awarded_team === 1 ? room.t1_name : cell.awarded_team === 2 ? room.t2_name : "—"}
                    </span>
                  ) : (
                    cell.points
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
