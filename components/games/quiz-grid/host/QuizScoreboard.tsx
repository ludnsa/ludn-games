"use client";
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { QUIZ_LIFELINE_LABELS } from "@/constants/quiz-grid";
import { QUIZ_LIFELINE_ICONS } from "@/components/games/quiz-grid/shared/quizLifelineIcons";
import type { QuizLifelineKey, QuizRoom, QuizTeam } from "@/types";

/**
 * لوحة النتائج الثابتة أعلى شاشة الحكم.
 * مصممة لتُقرأ من آخر الغرفة: خط ضخم، تباين عالٍ، ومؤشر دور لا يمكن تفويته.
 */

const TEAM_STYLES = {
  1: {
    active: "bg-sky-500 border-sky-700 text-white",
    idle: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white",
    accent: "text-sky-600 dark:text-sky-400",
    pip: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",
  },
  2: {
    active: "bg-rose-500 border-rose-700 text-white",
    idle: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white",
    accent: "text-rose-600 dark:text-rose-400",
    pip: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
  },
} as const;

function TeamPanel({
  team,
  name,
  score,
  isActive,
  owned,
  used,
  showTurn,
}: {
  team: QuizTeam;
  name: string;
  score: number;
  isActive: boolean;
  owned: QuizLifelineKey[];
  used: QuizLifelineKey[];
  showTurn: boolean;
}) {
  const styles = TEAM_STYLES[team];
  const Arrow = team === 1 ? ChevronLeft : ChevronRight;

  return (
    <div
      className={`flex-1 flex flex-col gap-3 rounded-2xl border-b-8 p-4 md:p-5 transition-all duration-300 ${
        isActive ? `${styles.active} scale-[1.02] shadow-xl` : `${styles.idle} shadow-sm`
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-lg md:text-2xl font-black truncate">{name}</span>
        {showTurn && isActive && (
          <span className="flex items-center gap-1 shrink-0 text-xs md:text-sm font-black bg-white/25 px-2.5 py-1 rounded-lg animate-pulse">
            <Arrow size={16} /> الدور الآن
          </span>
        )}
      </div>

      <div className="text-4xl md:text-6xl font-black tabular-nums leading-none">{score}</div>

      <div className="flex items-center gap-2 flex-wrap">
        {owned.map((kind) => {
          const Icon = QUIZ_LIFELINE_ICONS[kind];
          const isUsed = used.includes(kind);
          return (
            <span
              key={kind}
              title={QUIZ_LIFELINE_LABELS[kind]}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] md:text-xs font-black transition-opacity ${
                isActive ? "bg-white/25" : styles.pip
              } ${isUsed ? "opacity-30 line-through" : ""}`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{QUIZ_LIFELINE_LABELS[kind]}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function QuizScoreboard({
  room,
  remainingCells,
  totalCells,
}: {
  room: QuizRoom;
  remainingCells: number;
  totalCells: number;
}) {
  const showTurn = room.game_state !== "setup" && room.game_state !== "gameOver";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-stretch gap-3">
        <TeamPanel
          team={1}
          name={room.t1_name}
          score={room.t1_score}
          isActive={showTurn && room.turn === 1}
          showTurn={showTurn}
          owned={room.t1_lifelines}
          used={room.t1_lifelines_used}
        />
        <TeamPanel
          team={2}
          name={room.t2_name}
          score={room.t2_score}
          isActive={showTurn && room.turn === 2}
          showTurn={showTurn}
          owned={room.t2_lifelines}
          used={room.t2_lifelines_used}
        />
      </div>

      {showTurn && (
        <p className="text-center text-sm font-bold text-slate-500 dark:text-slate-400">
          متبقٍ {remainingCells} سؤال من أصل {totalCells}
        </p>
      )}
    </div>
  );
}
