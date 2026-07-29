"use client";
import React from "react";
import {
  PhoneCall, Armchair, Shovel, Hourglass, Eye, Trophy, Handshake, LogOut, Monitor, Ban,
} from "lucide-react";
import { QUIZ_CONFIG, QUIZ_LIFELINE_LABELS } from "@/constants/quiz-grid";
import type { useQuizPlayer } from "@/hooks/games/quiz-grid/useQuizPlayer";

type Ctx = ReturnType<typeof useQuizPlayer>;

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
  const pitIsMine = room?.pit_active_team === me.team;

  return (
    <section className="w-full max-w-md mx-auto flex flex-col gap-4">
      {/* بطاقة اللاعب */}
      <div
        className={`rounded-[2rem] border-b-8 p-6 text-white shadow-xl transition-colors ${
          teamColor === "sky" ? "bg-sky-500 border-sky-700" : "bg-rose-500 border-rose-700"
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
        <div className="flex items-center gap-3 bg-amber-500 text-white font-black text-lg rounded-2xl p-5 shadow-lg animate-pulse">
          <Ban size={32} className="shrink-0" />
          <span>أنت ممنوع من الإجابة على هذا السؤال ({QUIZ_LIFELINE_LABELS.rest})</span>
        </div>
      )}

      {/* حالة اللعب */}
      {state === "gameOver" && room ? (
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 text-center shadow-sm">
          {room.t1_score === room.t2_score ? (
            <>
              <Handshake size={44} className="mx-auto mb-3 text-slate-500" />
              <p className="text-2xl font-black text-slate-800 dark:text-white">تعادل!</p>
            </>
          ) : (
            <>
              <Trophy
                size={44}
                className={`mx-auto mb-3 ${
                  (room.t1_score > room.t2_score ? 1 : 2) === me.team
                    ? "text-amber-500"
                    : "text-slate-400"
                }`}
              />
              <p className="text-2xl font-black text-slate-800 dark:text-white">
                {(room.t1_score > room.t2_score ? 1 : 2) === me.team ? "فزتم! 🎉" : "انتهت المباراة"}
              </p>
              <p className="font-bold text-slate-500 mt-1">
                {room.t1_score > room.t2_score ? room.t1_name : room.t2_name} هو الفائز
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 text-center shadow-sm">
          {state === "setup" ? (
            <>
              <Hourglass size={40} className="mx-auto mb-3 text-violet-500 animate-pulse" />
              <p className="text-xl font-black text-slate-800 dark:text-white mb-1">
                في انتظار بدء اللعبة
              </p>
              <p className="font-bold text-sm text-slate-500">الحكم يجهّز الفئات الآن...</p>
            </>
          ) : isMyTurn ? (
            <>
              <Monitor size={40} className="mx-auto mb-3 text-emerald-500" />
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mb-1">
                الدور دوركم!
              </p>
              <p className="font-bold text-sm text-slate-500">
                {state === "board"
                  ? "اختاروا الخلية من الشاشة الكبيرة"
                  : state === "answer"
                    ? "الحكم يكشف الإجابة الآن"
                    : "أجيبوا قبل انتهاء الوقت"}
              </p>
            </>
          ) : (
            <>
              <Hourglass size={40} className="mx-auto mb-3 text-slate-400" />
              <p className="text-xl font-black text-slate-800 dark:text-white mb-1">
                دور الفريق الخصم
              </p>
              <p className="font-bold text-sm text-slate-500">تابعوا الشاشة الكبيرة</p>
            </>
          )}
        </div>
      )}

      {/* تنبيهات وسائل المساعدة الجارية */}
      {state !== "setup" && state !== "gameOver" && (
        <div className="flex flex-col gap-2">
          {room?.call_friend_active && (
            <div className="flex items-center gap-3 bg-emerald-500 text-white font-black rounded-2xl p-4 animate-pulse">
              <PhoneCall size={24} className="shrink-0" />
              <span>
                {QUIZ_LIFELINE_LABELS.call} — أُضيفت {QUIZ_CONFIG.CALL_FRIEND_BONUS} ثانية
              </span>
            </div>
          )}

          {restTargetName && !isRestedOut && (
            <div className="flex items-center gap-3 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 font-black rounded-2xl p-4">
              <Armchair size={24} className="shrink-0" />
              <span>{restTargetName} ممنوع من الإجابة</span>
            </div>
          )}

          {room?.pit_active_team && (
            <div
              className={`flex items-center gap-3 font-black rounded-2xl p-4 ${
                pitIsMine
                  ? "bg-orange-500 text-white"
                  : "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300"
              }`}
            >
              <Shovel size={24} className="shrink-0" />
              <span>
                {pitIsMine
                  ? `فعّلتم ${QUIZ_LIFELINE_LABELS.pit} — الإجابة الصحيحة تخصم من الخصم!`
                  : `الخصم فعّل ${QUIZ_LIFELINE_LABELS.pit}`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* زملاء الفريق */}
      {teammates.length > 1 && (
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-black text-slate-400 mb-2">فريقك ({teammates.length})</p>
          <div className="flex flex-wrap gap-2">
            {teammates.map((p) => (
              <span
                key={p.id}
                className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                  p.id === me.id
                    ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                {p.display_name}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 text-center px-4">
        <Eye size={14} /> الأسئلة والإجابات تظهر على الشاشة الكبيرة فقط
      </p>
    </section>
  );
}
