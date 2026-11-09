"use client";
import React from "react";
import { Hourglass, Eye, Trophy, Handshake, LogOut, Monitor } from "lucide-react";
import { QUIZ_CONFIG, QUIZ_LIFELINE_LABELS, QUIZ_LIFELINE_LIST } from "@/constants/quiz-grid";
import { QuizCardIcon } from "@/components/games/quiz-grid/shared/QuizCardIcon";
import { QZ_GLASS, QZ_PANEL, QZ_TEAM } from "@/components/games/quiz-grid/shared/quizUi";
import type { QuizLifelineKey, QuizRoom, QuizTeam } from "@/types";
import type { useQuizPlayer } from "@/hooks/games/quiz-grid/useQuizPlayer";

type Ctx = ReturnType<typeof useQuizPlayer>;

const BOARD_PHASE_LIFELINES = QUIZ_LIFELINE_LIST.filter((def) => def.phase === "board");

function armedTeamField(kind: QuizLifelineKey): keyof QuizRoom | null {
  if (kind === "pit") return "pit_active_team";
  if (kind === "double") return "double_active_team";
  if (kind === "extraTurn") return "extra_turn_team";
  return null;
}

function describeArmedBet(kind: QuizLifelineKey, isMine: boolean): string {
  if (kind === "pit") return isMine ? "فعّلتم الحفرة — الإجابة الصحيحة تخصم من الخصم!" : "الخصم فعّل الحفرة";
  if (kind === "double") return isMine ? "فعّلتم مضاعفة — إجابة صحيحة تُضاعف نقاطكم!" : "الخصم فعّل مضاعفة";
  if (kind === "extraTurn") return isMine ? "فعّلتم دور إضافي — ستحتفظون بالدور!" : "الخصم فعّل دور إضافي";
  return "";
}

/**
 * شاشة اللاعب بعد الانضمام.
 *
 * لا تعرض نص السؤال ولا الإجابة إطلاقاً — فقط الحالة، الدور،
 * وتنبيهات وسائل المساعدة. المحتوى مكانه الشاشة الكبيرة.
 */
export default function QuizPlayerState({ ctx }: { ctx: Ctx }) {
  const { me, room, myTeamName, myScore, isMyTurn, isRestedOut, restTargetName, teammates, leave } = ctx;

  if (!me) return null;

  const teamColor = me.team === 1 ? "sky" : "rose";
  const opponentScore = room ? (me.team === 1 ? room.t2_score : room.t1_score) : 0;
  const state = room?.game_state ?? "setup";

  const armedBets = room
    ? BOARD_PHASE_LIFELINES.filter((def) => {
        const field = armedTeamField(def.key);
        return field && room[field] !== null;
      })
    : [];

  return (
    <section className="w-full max-w-md mx-auto flex flex-col gap-4">
      {/* بطاقة اللاعب */}
      <div
        className={`rounded-[2rem] border-b-8 p-6 text-white transition-colors ${
          teamColor === "sky" ? `bg-sky-500 border-sky-700 ${QZ_TEAM[1].glow}` : `bg-rose-500 border-rose-700 ${QZ_TEAM[2].glow}`
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-sm font-bold opacity-80">أهلاً</p>
            <p className="text-2xl font-black truncate">{me.display_name}</p>
            <p className="text-sm font-bold opacity-90 truncate">{myTeamName}</p>
          </div>
          <button
            onClick={leave}
            className="shrink-0 p-2.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
            aria-label="خروج"
          >
            <LogOut size={20} />
          </button>
        </div>

        <div className="flex items-end gap-4">
          <div>
            <p className="text-xs font-bold opacity-80 mb-1">نقاط فريقك</p>
            <p className="text-5xl font-black tabular-nums leading-none">{myScore}</p>
          </div>
          <div className="opacity-70">
            <p className="text-xs font-bold mb-1">الخصم</p>
            <p className="text-2xl font-black tabular-nums leading-none">{opponentScore}</p>
          </div>
        </div>
      </div>

      {/* منع الإجابة — أهم تنبيه على جهاز اللاعب */}
      {isRestedOut && (
        <div className="flex items-center gap-3 bg-amber-500 border border-amber-300 text-white font-black text-lg rounded-2xl p-4 shadow-[0_0_30px_-6px_rgba(245,158,11,0.9)] animate-pulse">
          <QuizCardIcon kind="rest" className="w-14 h-14 ring-2 ring-white/60" />
          <span>أنت ممنوع من الإجابة على هذا السؤال ({QUIZ_LIFELINE_LABELS.rest})</span>
        </div>
      )}

      {/* حالة اللعب */}
      {state === "gameOver" && room ? (
        <div className={`rounded-[2rem] p-6 text-center ${QZ_PANEL}`}>
          {room.t1_score === room.t2_score ? (
            <>
              <Handshake size={44} className="mx-auto mb-3 text-slate-300" />
              <p className="text-2xl font-black text-white">تعادل!</p>
            </>
          ) : (
            <>
              <Trophy
                size={44}
                className={`mx-auto mb-3 ${
                  (room.t1_score > room.t2_score ? 1 : 2) === me.team
                    ? "text-amber-300 drop-shadow-[0_0_14px_rgba(252,211,77,0.8)]"
                    : "text-slate-400"
                }`}
              />
              <p className="text-2xl font-black text-white">
                {(room.t1_score > room.t2_score ? 1 : 2) === me.team ? "فزتم! 🎉" : "انتهت المباراة"}
              </p>
              <p className="font-bold text-slate-300 mt-1">
                {room.t1_score > room.t2_score ? room.t1_name : room.t2_name} هو الفائز
              </p>
            </>
          )}
        </div>
      ) : (
        <div className={`rounded-[2rem] p-6 text-center ${QZ_PANEL}`}>
          {state === "setup" ? (
            <>
              <Hourglass size={40} className="mx-auto mb-3 text-cyan-300 animate-pulse" />
              <p className="text-xl font-black text-white mb-1">
                في انتظار بدء اللعبة
              </p>
              <p className="font-bold text-sm text-slate-300">الحكم يجهّز الفئات الآن...</p>
            </>
          ) : isMyTurn ? (
            <>
              <Monitor size={40} className="mx-auto mb-3 text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              <p className="text-2xl font-black text-emerald-300 mb-1 [text-shadow:0_0_16px_rgba(52,211,153,0.7)]">
                الدور دوركم!
              </p>
              <p className="font-bold text-sm text-slate-300">
                {state === "board"
                  ? "اختاروا الخلية من الشاشة الكبيرة"
                  : state === "answer"
                    ? "الحكم يكشف الإجابة الآن"
                    : "أجيبوا قبل انتهاء الوقت"}
              </p>
            </>
          ) : (
            <>
              <Hourglass size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-xl font-black text-white mb-1">
                دور الفريق الخصم
              </p>
              <p className="font-bold text-sm text-slate-300">تابعوا الشاشة الكبيرة</p>
            </>
          )}
        </div>
      )}

      {/* تنبيهات وسائل المساعدة الجارية */}
      {state !== "setup" && state !== "gameOver" && (
        <div className="flex flex-col gap-2">
          {room?.call_friend_active && (
            <div className="flex items-center gap-3 bg-emerald-500 border border-emerald-300 text-white font-black rounded-2xl p-3 animate-pulse shadow-[0_0_24px_-6px_rgba(52,211,153,0.9)]">
              <QuizCardIcon kind="call" className="w-11 h-11 ring-2 ring-white/60" />
              <span>
                {QUIZ_LIFELINE_LABELS.call} — أُضيفت {QUIZ_CONFIG.CALL_FRIEND_BONUS} ثانية
              </span>
            </div>
          )}

          {room?.audience_active && (
            <div className="flex items-center gap-3 bg-fuchsia-500 border border-fuchsia-300 text-white font-black rounded-2xl p-3 animate-pulse shadow-[0_0_24px_-6px_rgba(217,70,239,0.9)]">
              <QuizCardIcon kind="audience" className="w-11 h-11 ring-2 ring-white/60" />
              <span>استشارة الجمهور — شاركوا برأيكم!</span>
            </div>
          )}

          {restTargetName && !isRestedOut && (
            <div className={`flex items-center gap-3 border border-amber-400/50 text-amber-200 font-black rounded-2xl p-3 ${QZ_GLASS}`}>
              <QuizCardIcon kind="rest" className="w-11 h-11 ring-2 ring-amber-300/50" />
              <span>{restTargetName} ممنوع من الإجابة</span>
            </div>
          )}

          {armedBets.map((def) => {
            const field = armedTeamField(def.key);
            const team = field && room ? (room[field] as QuizTeam | null) : null;
            if (!team) return null;
            const isMine = team === me.team;
            return (
              <div
                key={def.key}
                className={`flex items-center gap-3 font-black rounded-2xl p-3 ${
                  isMine
                    ? "bg-orange-500 border border-orange-300 text-white shadow-[0_0_24px_-6px_rgba(251,146,60,0.9)]"
                    : `border border-orange-400/50 text-orange-200 ${QZ_GLASS}`
                }`}
              >
                <QuizCardIcon kind={def.key} className="w-11 h-11 ring-2 ring-white/50" />
                <span>{describeArmedBet(def.key, isMine)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* زملاء الفريق */}
      {teammates.length > 1 && (
        <div className={`rounded-2xl p-4 ${QZ_PANEL}`}>
          <p className="text-xs font-black text-slate-300 mb-2">فريقك ({teammates.length})</p>
          <div className="flex flex-wrap gap-2">
            {teammates.map((p) => (
              <span
                key={p.id}
                className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                  p.id === me.id
                    ? `${QZ_TEAM[me.team].soft} border border-white/20`
                    : "bg-white/10 text-slate-200"
                }`}
              >
                {p.display_name}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="flex items-center justify-center gap-2 text-xs font-bold text-slate-300 text-center px-4 [text-shadow:0_1px_3px_#000]">
        <Eye size={14} /> الأسئلة والإجابات تظهر على الشاشة الكبيرة فقط
      </p>
    </section>
  );
}
