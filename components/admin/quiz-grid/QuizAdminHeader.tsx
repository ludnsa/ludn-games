"use client";
import React, { useRef } from "react";
import { Database, Download, Upload, Layers } from "lucide-react";
import { QUIZ_GAME } from "@/constants/quiz-grid";
import { AdminPageHeader } from "@/components/admin/layout/AdminShell";
import { BTN_SM_GOLD, BTN_SM_SOFT } from "@/components/admin/layout/adminUi";

export default function QuizAdminHeader({
  questionsCount,
  categoriesCount,
  exportCSV,
  importCSV,
  toggleCategories,
}: {
  questionsCount: number;
  categoriesCount: number;
  exportCSV: () => void;
  importCSV: (file: File) => void;
  toggleCategories: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importCSV(file);
      e.target.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <AdminPageHeader
        back
        art="quiz"
        title={`بنك أسئلة ${QUIZ_GAME.title}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5">
              <Database size={15} />
              {questionsCount} سؤال
            </span>
            <span className="flex items-center gap-1.5">
              <Layers size={15} />
              {categoriesCount} فئة
            </span>
          </span>
        }
        actions={
          <>
            <button onClick={toggleCategories} className={BTN_SM_SOFT}>
              <Layers size={16} className="text-ludn-gold-text" />
              <span>إدارة الفئات</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className={BTN_SM_SOFT}>
              <Upload size={16} className="text-ludn-gold-text" />
              <span>استيراد CSV</span>
            </button>
            <button onClick={exportCSV} className={BTN_SM_GOLD}>
              <Download size={16} />
              <span>تصدير CSV</span>
            </button>
          </>
        }
      />
    </>
  );
}
