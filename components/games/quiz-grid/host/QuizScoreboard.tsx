"use client";
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { QUIZ_LIFELINE_LABELS } from "@/constants/quiz-grid";
import { QuizCardIcon } from "@/components/games/quiz-grid/shared/QuizCardIcon";
import { QZ_GLASS, QZ_TEAM } from "@/components/games/quiz-grid/shared/quizUi";
import type { QuizLifelineKey, QuizRoom, QuizTeam } from "@/types";

/**
 * لوحة النتائج الثابتة أعلى شاشة الحكم.
 * مصممة لتُقرأ من آخر الغرفة: خط ضخم، تباين عالٍ، ومؤشر دور لا يمكن تفويته.
 * الفريق صاحب الدور: لوحة بلونه وحد نيون وتوهج. وكل وسيلة: أيقونة كرتها واسمها تحتها (يبين على الجوال بعد).
 */

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
  const styles = QZ_TEAM[team];
  const Arrow = team === 1 ? ChevronLeft : ChevronRight;

  return (
    <div
      className={`flex-1 min-w-0 flex flex-col gap-3 rounded-2xl p-3 md:p-5 transition-all duration-300 ${
        isActive ? `border-2 backdrop-blur-md ${styles.active} ${styles.glow} scale-[1.02]` : `${QZ_GLASS} border-2 border-cyan-300/25`
      }`}
    >
      {/* اسم الفريق ياخذ السطر كامل، وشارة الدور تنزل تحته لو ما كفى المكان (الجوال) */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className={`min-w-0 max-w-full text-lg md:text-2xl font-black truncate ${isActive ? "text-white" : styles.text}`}>{name}</span>
        {showTurn && isActive && (
          <span className={`flex items-center gap-1 shrink-0 text-xs md:text-sm font-black px-2.5 py-1 rounded-lg animate-pulse ${styles.chip}`}>
            <Arrow size={16} /> الدور الآن
          </span>
        )}
      </div>

      {/* بالشاشة الكبيرة الوسائل جنب النقاط عشان اللوحة ما تطول، ولو ما كفى المكان تنزل تحتها */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="text-4xl md:text-6xl font-black tabular-nums leading-none text-white">{score}</div>

      <div className="grid grid-cols-3 gap-1.5 md:gap-2 w-full md:w-52 lg:w-64">
        {owned.map((kind) => {
          const isUsed = used.includes(kind);
          return (
            <span
              key={kind}
              title={QUIZ_LIFELINE_LABELS[kind]}
              className="flex flex-col items-center gap-1 min-w-0 text-center"
            >
              <QuizCardIcon kind={kind} off={isUsed} className="w-9 h-9 md:w-11 md:h-11 ring-1 ring-white/20" />
              <span
                className={`max-w-full text-[9px] md:text-[11px] font-black leading-tight ${
                  isUsed ? "line-through text-slate-500" : "text-slate-200"
                }`}
              >
                {QUIZ_LIFELINE_LABELS[kind]}
              </span>
            </span>
          );
        })}
      </div>
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
        <p className="text-center text-sm font-bold text-slate-300 [text-shadow:0_1px_3px_#000]">
          متبقٍ {remainingCells} سؤال من أصل {totalCells}
        </p>
      )}
    </div>
  );
}
