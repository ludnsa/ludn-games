"use client";

import React from "react";
import { Cairo } from "next/font/google";

import { useQuizPlayer } from "@/hooks/games/quiz-grid/useQuizPlayer";
import QuizJoinState from "@/components/games/quiz-grid/player/QuizJoinState";
import QuizPlayerState from "@/components/games/quiz-grid/player/QuizPlayerState";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

/**
 * شاشة اللاعب — متاحة بدون تسجيل دخول.
 * مسار /join مستثنى في middleware.ts مثل بقية مسارات انضمام الألعاب.
 */
export default function QuizGridJoinScreen() {
  const ctx = useQuizPlayer();

  if (!ctx.mounted) return null;

  return (
    <main
      className={`min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 md:p-6 flex flex-col justify-center relative z-10 ${cairo.className}`}
      dir="rtl"
    >
      {ctx.me ? <QuizPlayerState ctx={ctx} /> : <QuizJoinState ctx={ctx} />}
    </main>
  );
}
