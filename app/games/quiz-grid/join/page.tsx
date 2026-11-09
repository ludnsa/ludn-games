"use client";

import React from "react";
import { Cairo } from "next/font/google";

import { useQuizPlayer } from "@/hooks/games/quiz-grid/useQuizPlayer";
import QuizJoinState from "@/components/games/quiz-grid/player/QuizJoinState";
import QuizPlayerState from "@/components/games/quiz-grid/player/QuizPlayerState";
import QuizReveal, { useQuizReveal } from "@/components/games/quiz-grid/shared/QuizReveal";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

/**
 * شاشة اللاعب — متاحة بدون تسجيل دخول.
 * مسار /join مستثنى في middleware.ts مثل بقية مسارات انضمام الألعاب.
 */
export default function QuizGridJoinScreen() {
  const ctx = useQuizPlayer();

  // نفس كشف شاشة الحكم: يطلع لما أي فريق يستخدم وسيلة، بعد ما ينضم اللاعب واللعب بدأ
  const reveal = useQuizReveal({
    enabled: ctx.mounted && !!ctx.me && !!ctx.room && ctx.room.game_state !== "setup",
    used1: ctx.room?.t1_lifelines_used,
    used2: ctx.room?.t2_lifelines_used,
  });

  if (!ctx.mounted) return null;

  return (
    <main
      className={`min-h-[100dvh] text-white p-4 md:p-6 flex flex-col justify-center relative z-10 ${cairo.className}`}
      dir="rtl"
    >
      <QuizReveal reveal={reveal} t1Name={ctx.room?.t1_name ?? ""} t2Name={ctx.room?.t2_name ?? ""} />
      {ctx.me ? <QuizPlayerState ctx={ctx} /> : <QuizJoinState ctx={ctx} />}
    </main>
  );
}
