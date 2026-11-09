"use client";

import React from "react";
import { Cairo } from "next/font/google";
import { Loader2 } from "lucide-react";

import { useQuizHost } from "@/hooks/games/quiz-grid/useQuizHost";
import AccessLoadingScreen from "@/components/games/shared/AccessLoadingScreen";
import QuizHostHeader from "@/components/games/quiz-grid/host/QuizHostHeader";
import QuizScoreboard from "@/components/games/quiz-grid/host/QuizScoreboard";
import QuizSetupState from "@/components/games/quiz-grid/host/QuizSetupState";
import QuizBoardState from "@/components/games/quiz-grid/host/QuizBoardState";
import QuizQuestionState from "@/components/games/quiz-grid/host/QuizQuestionState";
import QuizAnswerState from "@/components/games/quiz-grid/host/QuizAnswerState";
import QuizGameOverState from "@/components/games/quiz-grid/host/QuizGameOverState";
import QuizQRModal from "@/components/games/quiz-grid/host/QuizQRModal";
import QuizAlertModal from "@/components/games/quiz-grid/host/QuizAlertModal";
import QuizReveal, { useQuizReveal } from "@/components/games/quiz-grid/shared/QuizReveal";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

/** شاشة الحكم — تُعرض على شاشة كبيرة في المجلس. */
export default function QuizGridHostScreen() {
  const ctx = useQuizHost();

  // شاشة الكشف تتابع الوسائل المستخدمة في نفس صف الغرفة اللي تعرضه الشاشة. ما تشتغل إلا بعد ما تجهز
  // الغرفة واللعب بدأ، عشان اللي يحدّث الصفحة وسط اللعب ما يطلع له كشف قديم
  const reveal = useQuizReveal({
    enabled: ctx.mounted && !ctx.isAccessChecking && !ctx.isBooting && !!ctx.room && ctx.room.game_state !== "setup",
    used1: ctx.room?.t1_lifelines_used,
    used2: ctx.room?.t2_lifelines_used,
  });

  if (!ctx.mounted) return null;
  if (ctx.isAccessChecking) return <AccessLoadingScreen />;

  const state = ctx.room?.game_state ?? "setup";

  return (
    <main
      className={`min-h-[100dvh] overflow-x-hidden text-white p-3 md:p-6 flex flex-col gap-4 md:gap-6 relative z-10 ${cairo.className}`}
      dir="rtl"
    >
      <QuizQRModal
        roomCode={ctx.roomCode}
        show={ctx.showQRModal}
        onClose={() => ctx.setShowQRModal(false)}
      />
      <QuizAlertModal alert={ctx.alert} onClose={ctx.closeAlert} />
      <QuizReveal reveal={reveal} t1Name={ctx.room?.t1_name ?? ""} t2Name={ctx.room?.t2_name ?? ""} />

      <div className="w-full max-w-7xl mx-auto flex flex-col gap-3 md:gap-4 shrink-0">
        <QuizHostHeader
          roomCode={ctx.roomCode}
          gameState={ctx.room?.game_state}
          onShowQR={() => ctx.setShowQRModal(true)}
          onCopyLink={ctx.copyJoinLink}
          onNewSession={ctx.newSession}
          onFinish={ctx.finishGame}
        />
        {ctx.room && ctx.room.game_state !== "setup" && (
          <QuizScoreboard room={ctx.room} remainingCells={ctx.remainingCells} totalCells={ctx.totalCells} />
        )}
      </div>

      <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col justify-center pb-6">
        {ctx.isBooting ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-slate-300">
            <Loader2 size={40} className="animate-spin text-cyan-300" />
            <p className="font-black">جاري تجهيز الغرفة...</p>
          </div>
        ) : (
          <>
            {state === "setup" && <QuizSetupState ctx={ctx} />}
            {state === "board" && <QuizBoardState ctx={ctx} />}
            {state === "question" && <QuizQuestionState ctx={ctx} />}
            {state === "answer" && <QuizAnswerState ctx={ctx} />}
            {state === "gameOver" && <QuizGameOverState ctx={ctx} />}
          </>
        )}
      </div>
    </main>
  );
}
