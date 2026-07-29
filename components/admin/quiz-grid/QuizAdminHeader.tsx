"use client";
import React, { useRef } from "react";
import Link from "next/link";
import { LayoutGrid, Database, ArrowLeft, Download, Upload, Layers } from "lucide-react";
import { QUIZ_GAME } from "@/constants/quiz-grid";

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
    <header className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm gap-4">
      <div className="flex items-center gap-4">
        <div className="p-4 bg-violet-100 dark:bg-violet-500/20 rounded-2xl text-violet-600">
          <LayoutGrid size={32} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-1">
            بنك أسئلة {QUIZ_GAME.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-500">
            <span className="flex items-center gap-2">
              <Database size={16} />
              {questionsCount} سؤال
            </span>
            <span className="flex items-center gap-2">
              <Layers size={16} />
              {categoriesCount} فئة
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          onClick={toggleCategories}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/30 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 font-bold py-3 px-4 rounded-xl transition-all border-b-4 border-violet-200 dark:border-violet-950 active:border-b-0 active:translate-y-[4px] text-sm"
        >
          <Layers size={16} />
          <span>إدارة الفئات</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 px-4 rounded-xl transition-all border-b-4 border-slate-300 dark:border-slate-950 active:border-b-0 active:translate-y-[4px] text-sm"
        >
          <Upload size={16} className="text-violet-500" />
          <span>استيراد CSV</span>
        </button>

        <button
          onClick={exportCSV}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-400 text-white font-black py-3 px-4 rounded-xl transition-all border-b-4 border-violet-700 active:border-b-0 active:translate-y-[4px] text-sm shadow-sm"
        >
          <Download size={16} />
          <span>تصدير CSV</span>
        </button>

        <Link href="/admin" className="flex-1 md:flex-none">
          <button className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 px-4 rounded-xl transition-all border-b-4 border-slate-300 dark:border-slate-950 active:border-b-0 active:translate-y-[4px] text-sm">
            <ArrowLeft size={16} />
            <span>رجوع</span>
          </button>
        </Link>
      </div>
    </header>
  );
}
