"use client";
import React from "react";

import { useQuizAdmin } from "@/hooks/admin/quiz-grid/useQuizAdmin";
import AdminShell from "@/components/admin/layout/AdminShell";
import QuizAdminHeader from "@/components/admin/quiz-grid/QuizAdminHeader";
import QuizCategoryManager from "@/components/admin/quiz-grid/QuizCategoryManager";
import QuizQuestionForm from "@/components/admin/quiz-grid/QuizQuestionForm";
import QuizQuestionsList from "@/components/admin/quiz-grid/QuizQuestionsList";
import GamingLoadingScreen from "@/components/admin/layout/GamingLoadingScreen";

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
    <AdminShell>
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
    </AdminShell>
  );
}
