"use client";
import React from "react";
import { Shovel, Check } from "lucide-react";
import { QUIZ_LIFELINE_LABELS, QUIZ_LIFELINE_HINTS } from "@/constants/quiz-grid";
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

export default function QuizBoardState({ ctx }: { ctx: Ctx }) {
  const { board, columns, room, pickCell, isBusy, activateLifeline, isLifelineUsed } = ctx;
  if (!room) return null;

  const activeTeamName = room.turn === 1 ? room.t1_name : room.t2_name;
  const pitUsed = isLifelineUsed(room.turn, "pit");
  const pitArmed = room.pit_active_team === room.turn;

  return (
    <section className="w-full flex flex-col gap-5">
      {/* "الحفرة" رهان يُعلن قبل رؤية السؤال، فمكانها الطبيعي هو شاشة اللوحة */}
      <div
        className={`flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border-2 p-4 transition-colors ${
          pitArmed
            ? "bg-orange-500 border-orange-700 text-white"
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        }`}
      >
        <div className="text-center sm:text-right">
          <p className={`font-black text-lg ${pitArmed ? "text-white" : "text-slate-800 dark:text-white"}`}>
            {pitArmed ? `${activeTeamName} فعّل ${QUIZ_LIFELINE_LABELS.pit}!` : `دور ${activeTeamName} — اختاروا خلية`}
          </p>
          <p className={`text-xs font-bold ${pitArmed ? "text-white/80" : "text-slate-400"}`}>
            {pitArmed
              ? "إجابة صحيحة تكسبهم النقاط وتخصم نفس القيمة من الخصم. الخطأ لا يغيّر شيئاً."
              : QUIZ_LIFELINE_HINTS.pit}
          </p>
        </div>

        <button
          onClick={() => activateLifeline("pit")}
          disabled={pitUsed || pitArmed || isBusy}
          className={`shrink-0 flex items-center gap-2 font-black py-3 px-5 rounded-xl border-b-4 active:border-b-0 active:translate-y-[4px] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:border-b-4 ${
            pitArmed
              ? "bg-white text-orange-600 border-orange-200"
              : "bg-orange-500 hover:bg-orange-400 text-white border-orange-700"
          }`}
        >
          {pitArmed ? <Check size={20} /> : <Shovel size={20} />}
          {pitArmed ? "مُفعّلة" : pitUsed ? "استُخدمت" : QUIZ_LIFELINE_LABELS.pit}
        </button>
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
