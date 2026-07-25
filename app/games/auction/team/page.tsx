/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { Cairo } from "next/font/google";
import { Moon, Sun } from "lucide-react";

import { useAuctionTeam } from "@/hooks/games/auction/useAuctionTeam";
import TeamAlertModal from "@/components/games/auction/team/TeamAlertModal";
import TeamHeader from "@/components/games/auction/team/TeamHeader";
import TeamScoreboard from "@/components/games/auction/team/TeamScoreboard";

import TeamJoinState from "@/components/games/auction/team/states/TeamJoinState";
import TeamWaitingState from "@/components/games/auction/team/states/TeamWaitingState";
import TeamBiddingState from "@/components/games/auction/team/states/TeamBiddingState";
import TeamQuestionState from "@/components/games/auction/team/states/TeamQuestionState";
import TeamActionStates from "@/components/games/auction/team/states/TeamActionStates";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

export default function AuctionTeamScreen() {
  const ctx = useAuctionTeam();

  if (!ctx.mounted) return null;

  return (
    <main className={`min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-3 md:p-6 flex flex-col relative z-10 transition-colors duration-500 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${cairo.className}`} dir="rtl">
      
      <button onClick={() => ctx.setIsDark(!ctx.isDark)} className="absolute top-4 left-4 md:top-6 md:left-6 z-[110] p-2 md:p-3 rounded-xl bg-white dark:bg-slate-800 text-yellow-500 shadow-lg border-b-4 border-slate-200 dark:border-slate-900 active:border-b-0 active:translate-y-[4px] transition-all">
        {ctx.isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <TeamAlertModal alertConfig={ctx.alertConfig} closeAlert={ctx.closeAlert} />

      {/* شاشة تسجيل الدخول */}
      <TeamJoinState ctx={ctx} />

      {/* شاشة الانتظار */}
      <TeamWaitingState ctx={ctx} />

      {/* لوحة التحكم الرئيسية بعد الدخول */}
      {ctx.isJoined && ctx.liveData && ctx.liveData.game_state !== "setup" && (
        <>
          <div className="w-full max-w-3xl mx-auto flex flex-col gap-3 md:gap-4 mb-6 shrink-0 mt-14 md:mt-0">
            <TeamHeader handleLeave={ctx.handleLeave} roomCode={ctx.roomCode} />
            <TeamScoreboard 
              teamId={ctx.teamId} myName={ctx.myName} 
              myBalance={ctx.myBalance} myPoints={ctx.myPoints} myAmbush={ctx.myAmbush} mySellCards={ctx.mySellCards}
            />
          </div>

          <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col items-center">
            <TeamBiddingState ctx={ctx} />
            <TeamQuestionState ctx={ctx} />
            <TeamActionStates ctx={ctx} />
          </div>
        </>
      )}
    </main>
  );
}