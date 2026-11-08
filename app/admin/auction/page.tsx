"use client";
import React from "react";
import { useAuctionQuestions } from "@/hooks/admin/auction/useAuctionQuestions";
import AdminShell from "@/components/admin/layout/AdminShell";
import AuctionHeader from "@/components/admin/auction/AuctionHeader";
import AuctionQuestionForm from "@/components/admin/auction/AuctionQuestionForm";
import AuctionQuestionsList from "@/components/admin/auction/AuctionQuestionsList";

import GamingLoadingScreen from "@/components/admin/layout/GamingLoadingScreen";

export default function AuctionAdminPage() {
  const ctx = useAuctionQuestions();

  if (ctx.isLoading) {
    return (
      <GamingLoadingScreen
        title="جاري تجهيز مزاد الأسئلة وتحديد المستويات..."
        subtitle="يتم تحميل مجالات وبنك أسئلة المزاد من السيرفر..."
      />
    );
  }

  return (
    <AdminShell>
      <AuctionHeader
        questionsCount={ctx.questions.length}
        exportCSV={ctx.exportCSV}
        importCSV={ctx.importCSV}
      />
      <AuctionQuestionForm ctx={ctx} />
      <AuctionQuestionsList
        questions={ctx.questions}
        handleEdit={ctx.handleEdit}
        handleDelete={ctx.handleDelete}
        updateQuestionDifficulty={ctx.updateQuestionDifficulty}
        updateQuestionAnswer={ctx.updateQuestionAnswer}
        setCategoryForNewQuestion={ctx.setCategoryForNewQuestion}
      />
    </AdminShell>
  );
}
