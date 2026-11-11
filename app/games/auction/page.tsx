/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { Cairo } from "next/font/google";

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
import AuctionReveal, { useAuctionReveal } from "@/components/games/auction/AuctionReveal";
import { useSingleTab } from "@/hooks/shared/useSingleTab";
import OtherTabScreen from "@/components/games/shared/OtherTabScreen";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

/** تبويب واحد يتحكم بالمزاد: لو انفتحت نفس الغرفة بتبويب ثاني، هذا يوقف ويشيل المزاد كله لين يرجع التحكم له */
export default function AuctionRefereeScreen() {
  const [room, setRoom] = React.useState<string | null>(null);
  const { active, takeOver } = useSingleTab("auction", room);
  return active ? <AuctionReferee onRoom={setRoom} /> : <OtherTabScreen onTakeOver={takeOver} />;
}

function AuctionReferee({ onRoom }: { onRoom: (room: string) => void }) {
  const ctx = useAuctionReferee();

  // كود الغرفة يتعرف بعد ما تجهز (جديدة أو مسترجعة)، وبه يتحدد مين يتحكم
  React.useEffect(() => {
    if (ctx.roomCode) onRoom(ctx.roomCode);
  }, [ctx.roomCode, onRoom]);

  // شاشة الكشف تتابع نفس القيم اللي تعرضها اللوحة. ما تشتغل إلا بعد ما تجهز الغرفة واللعبة بدأت،
  // عشان اللي يحدّث الصفحة وسط اللعب ما يطلع له كشف قديم
  const reveal = useAuctionReveal({
    enabled: ctx.mounted && !ctx.isAccessChecking && !!ctx.roomCode && ctx.gameState !== "setup",
    snap: {
      double: !!ctx.isDoubleRisk,
      sell1: ctx.t1SellCards ?? 3,
      sell2: ctx.t2SellCards ?? 3,
      ambush1: ctx.t1Ambush,
      ambush2: ctx.t2Ambush,
      bal1: ctx.t1Balance,
      bal2: ctx.t2Balance,
      sudden: !!ctx.isSuddenDeath,
      winner: ctx.winner,
    },
  });

  if (!ctx.mounted) return null;

  if (ctx.isAccessChecking) {
    return <AccessLoadingScreen />;
  }

  return (
    <main className={`min-h-[100dvh] overflow-x-hidden overflow-y-auto text-slate-900 dark:text-white p-3 md:p-6 flex flex-col relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${cairo.className}`} dir="rtl">
      <QRModal roomCode={ctx.roomCode} showQRModal={ctx.showQRModal} setShowQRModal={ctx.setShowQRModal} />
      <RefereeAlertModal alertConfig={ctx.alertConfig} closeAlert={ctx.closeAlert} />
      <AuctionReveal reveal={reveal} t1Name={ctx.t1Name} t2Name={ctx.t2Name} />

      <div className="w-full max-w-5xl mx-auto flex flex-col gap-3 md:gap-4 mb-4 md:mb-6 shrink-0">
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
