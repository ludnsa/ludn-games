/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { Cairo } from "next/font/google";

import { useAuctionTeam } from "@/hooks/games/auction/useAuctionTeam";
import TeamAlertModal from "@/components/games/auction/team/TeamAlertModal";
import TeamHeader from "@/components/games/auction/team/TeamHeader";
import TeamScoreboard from "@/components/games/auction/team/TeamScoreboard";

import TeamJoinState from "@/components/games/auction/team/states/TeamJoinState";
import TeamWaitingState from "@/components/games/auction/team/states/TeamWaitingState";
import TeamBiddingState from "@/components/games/auction/team/states/TeamBiddingState";
import TeamQuestionState from "@/components/games/auction/team/states/TeamQuestionState";
import TeamActionStates from "@/components/games/auction/team/states/TeamActionStates";
import TeamRoundInfo from "@/components/games/auction/team/TeamRoundInfo";
import AuctionReveal, { useAuctionReveal } from "@/components/games/auction/AuctionReveal";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

export default function AuctionTeamScreen() {
  const ctx = useAuctionTeam();
  const live = ctx.liveData;

  // شاشة الكشف تتابع نفس بيانات الغرفة اللي يعرضها الجوال. أول بيانات توصل بعد الدخول هي البداية،
  // فاللي يدخل أو يحدّث وسط اللعب ما يطلع له كشف قديم
  const reveal = useAuctionReveal({
    enabled: ctx.isJoined && !!live && live.game_state !== "setup",
    snap: {
      double: !!live?.is_double_risk,
      sell1: live?.t1_sell_cards ?? 3,
      sell2: live?.t2_sell_cards ?? 3,
      ambush1: live?.t1_ambush ?? 3,
      ambush2: live?.t2_ambush ?? 3,
      bal1: live?.t1_balance ?? 0,
      bal2: live?.t2_balance ?? 0,
      sudden: !!live?.is_sudden_death,
      winner: live?.winner ?? null,
    },
  });

  if (!ctx.mounted) return null;

  return (
    <main className={`min-h-[100dvh] overflow-x-hidden overflow-y-auto text-slate-900 dark:text-white p-3 md:p-6 flex flex-col relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${cairo.className}`} dir="rtl">
      <TeamAlertModal alertConfig={ctx.alertConfig} closeAlert={ctx.closeAlert} />
      <AuctionReveal reveal={reveal} t1Name={live?.t1_name ?? ""} t2Name={live?.t2_name ?? ""} />

      {/* شاشة تسجيل الدخول */}
      <TeamJoinState ctx={ctx} />

      {/* شاشة الانتظار */}
      <TeamWaitingState ctx={ctx} />

      {/* لوحة التحكم الرئيسية بعد الدخول */}
      {ctx.isJoined && ctx.liveData && ctx.liveData.game_state !== "setup" && (
        <>
          <div className="w-full max-w-3xl mx-auto flex flex-col gap-3 md:gap-4 mb-6 shrink-0">
            <TeamHeader handleLeave={ctx.handleLeave} roomCode={ctx.roomCode} />
            <TeamScoreboard
              teamId={ctx.teamId} myName={ctx.myName}
              myBalance={ctx.myBalance} myPoints={ctx.myPoints} myAmbush={ctx.myAmbush} mySellCards={ctx.mySellCards}
            />
          </div>

          <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col items-center">
            <TeamRoundInfo live={ctx.liveData} />
            <TeamBiddingState ctx={ctx} />
            <TeamQuestionState ctx={ctx} />
            <TeamActionStates ctx={ctx} />
          </div>
        </>
      )}
    </main>
  );
}
