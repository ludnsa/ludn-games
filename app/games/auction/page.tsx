/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { Cairo } from "next/font/google";
import { Moon, Sun } from "lucide-react";

import { useAuctionReferee } from "@/hooks/games/auction/useAuctionReferee";
import QRModal from "@/components/games/auction/referee/QRModal";
import RefereeAlertModal from "@/components/games/auction/referee/RefereeAlertModal";
import RefereeHeader from "@/components/games/auction/referee/RefereeHeader";
import RefereeScoreboard from "@/components/games/auction/referee/RefereeScoreboard";

import SetupState from "@/components/games/auction/referee/states/SetupState";
import BiddingState from "@/components/games/auction/referee/states/BiddingState";
import RiskAndDecisionStates from "@/components/games/auction/referee/states/RiskAndDecisionStates";
import QuestionAndOptionsStates from "@/components/games/auction/referee/states/QuestionAndOptionsStates";
import PostAnswerStates from "@/components/games/auction/referee/states/PostAnswerStates";
import AccessLoadingScreen from "@/components/games/shared/AccessLoadingScreen";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

export default function AuctionRefereeScreen() {
  const ctx = useAuctionReferee();

  if (!ctx.mounted) return null;

  if (ctx.isAccessChecking) {
    return <AccessLoadingScreen />;
  }

  return (
    <main className={`min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-3 md:p-6 flex flex-col relative z-10 transition-colors duration-500 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${cairo.className}`} dir="rtl">
      
      <button onClick={() => ctx.setIsDark(!ctx.isDark)} className="absolute top-4 left-4 md:top-6 md:left-6 z-[110] p-2 md:p-3 rounded-xl bg-white dark:bg-slate-800 text-yellow-500 shadow-lg border-b-4 border-slate-200 dark:border-slate-900 active:border-b-0 active:translate-y-[4px] transition-all">
        {ctx.isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <QRModal roomCode={ctx.roomCode} showQRModal={ctx.showQRModal} setShowQRModal={ctx.setShowQRModal} />
      <RefereeAlertModal alertConfig={ctx.alertConfig} closeAlert={ctx.closeAlert} />

      <div className="w-full max-w-5xl mx-auto flex flex-col gap-3 md:gap-4 mb-4 md:mb-6 shrink-0 mt-14 md:mt-0">
        <RefereeHeader roomCode={ctx.roomCode} setShowQRModal={ctx.setShowQRModal} copyLink={ctx.copyLink} resetGame={ctx.resetGame} triggerConfirm={ctx.triggerConfirm} />
        <RefereeScoreboard 
          gameState={ctx.gameState} currentIndex={ctx.currentIndex} questions={ctx.questions} 
          t1Name={ctx.t1Name} t2Name={ctx.t2Name} t1Balance={ctx.t1Balance} t2Balance={ctx.t2Balance} 
          t1Points={ctx.t1Points} t2Points={ctx.t2Points} t1Ambush={ctx.t1Ambush} t2Ambush={ctx.t2Ambush} 
          t1SellCards={ctx.t1SellCards} t2SellCards={ctx.t2SellCards}
          resetTeamDevice={ctx.resetTeamDevice}
        />
      </div>

      <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col justify-center items-center pb-8">
        <SetupState ctx={ctx} />
        <BiddingState ctx={ctx} />
        <RiskAndDecisionStates ctx={ctx} />
        <QuestionAndOptionsStates ctx={ctx} />
        <PostAnswerStates ctx={ctx} />
      </div>
    </main>
  );
}