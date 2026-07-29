"use client";
import React from "react";
import { Cairo } from "next/font/google";

import { useQuizAdmin } from "@/hooks/admin/quiz-grid/useQuizAdmin";
import QuizAdminHeader from "@/components/admin/quiz-grid/QuizAdminHeader";
import QuizCategoryManager from "@/components/admin/quiz-grid/QuizCategoryManager";
import QuizQuestionForm from "@/components/admin/quiz-grid/QuizQuestionForm";
import QuizQuestionsList from "@/components/admin/quiz-grid/QuizQuestionsList";
import GamingLoadingScreen from "@/components/admin/layout/GamingLoadingScreen";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

export default function QuizGridAdminPage() {
  const ctx = useQuizAdmin();

  if (ctx.isLoading) {
    return (
      <GamingLoadingScreen
        title="جاري تجهيز لوحة الفئات والأسئلة..."
        subtitle="يتم تحميل بنك أسئلة تحدي الفئات من السيرفر..."
      />
    );
  }

  return (
    <main
      className={`min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 ${cairo.className}`}
      dir="rtl"
    >
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <QuizAdminHeader
          questionsCount={ctx.totalQuestions}
          categoriesCount={ctx.categories.length}
          exportCSV={ctx.exportCSV}
          importCSV={ctx.importCSV}
          toggleCategories={() => ctx.setIsCategoryPanelOpen(!ctx.isCategoryPanelOpen)}
        />
        <QuizCategoryManager ctx={ctx} />
        <QuizQuestionForm ctx={ctx} />
        <QuizQuestionsList ctx={ctx} />
      </div>
    </main>
  );
}
