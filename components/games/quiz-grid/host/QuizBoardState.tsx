"use client";
import React from "react";
import { Check } from "lucide-react";
import { QUIZ_LIFELINE_HINTS, QUIZ_LIFELINE_LIST } from "@/constants/quiz-grid";
import { QUIZ_LIFELINE_ICONS } from "@/components/games/quiz-grid/shared/quizLifelineIcons";
import type { QuizLifelineKey, QuizRoom } from "@/types";
import type { useQuizHost } from "@/hooks/games/quiz-grid/useQuizHost";

type Ctx = ReturnType<typeof useQuizHost>;

const TIER_STYLES: Record<number, string> = {
  200: "bg-sky-500 border-sky-700 hover:bg-sky-400",
  400: "bg-amber-500 border-amber-700 hover:bg-amber-400",
  600: "bg-rose-500 border-rose-700 hover:bg-rose-400",
};

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
            ? "bg-orange-500 border-orange-700 text-white"
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        }`}
      >
        <div className="text-center sm:text-right">
          <p className={`font-black text-lg ${anyArmed ? "text-white" : "text-slate-800 dark:text-white"}`}>
            دور {activeTeamName} — اختاروا خلية
          </p>
        </div>

        {ownedBoardLifelines.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {ownedBoardLifelines.map((def) => {
              const Icon = QUIZ_LIFELINE_ICONS[def.key];
              const field = armedTeamField(def.key);
              const isArmed = Boolean(field && room[field] === room.turn);
              const isUsed = isLifelineUsed(room.turn, def.key);

              return (
                <button
                  key={def.key}
                  onClick={() => activateLifeline(def.key)}
                  disabled={isUsed || isArmed || isBusy}
                  title={def.hint}
                  className={`flex items-center gap-2 font-black py-3 px-5 rounded-xl border-b-4 active:border-b-0 active:translate-y-[4px] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:border-b-4 ${
                    isArmed
                      ? "bg-white text-orange-600 border-orange-200"
                      : "bg-orange-500 hover:bg-orange-400 text-white border-orange-700"
                  }`}
                >
                  {isArmed ? <Check size={20} /> : <Icon size={20} />}
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
            <div className="h-16 md:h-20 flex items-center justify-center text-center bg-violet-600 text-white rounded-xl md:rounded-2xl px-1 md:px-2 border-b-4 border-violet-800">
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
                  className={`h-14 md:h-20 rounded-xl md:rounded-2xl font-black text-lg md:text-3xl text-white border-b-4 transition-all ${
                    isConsumed
                      ? "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                      : `${TIER_STYLES[cell.points]} active:border-b-0 active:translate-y-[4px] shadow-sm`
                  }`}
                >
                  {isConsumed ? (
                    <span className="text-xs md:text-base">
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
