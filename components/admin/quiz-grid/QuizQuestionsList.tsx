/* eslint-disable @next/next/no-img-element */
"use client";
import React from "react";
import { Search, Pencil, Trash2, Eye, EyeOff, Image as ImageIcon, Inbox } from "lucide-react";
import { QUIZ_CONFIG } from "@/constants/quiz-grid";
import type { QuizPoints } from "@/types";
import type { useQuizAdmin } from "@/hooks/admin/quiz-grid/useQuizAdmin";

type Ctx = ReturnType<typeof useQuizAdmin>;

const TIER_STYLES: Record<number, string> = {
  200: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400",
  400: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400",
  600: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400",
};

export default function QuizQuestionsList({ ctx }: { ctx: Ctx }) {
  const {
    questions, totalQuestions, categories, categoryNameById,
    filterCategory, setFilterCategory,
    filterPoints, setFilterPoints,
    filterActive, setFilterActive,
    search, setSearch,
    editQuestion, removeQuestion, toggleQuestionActive,
  } = ctx;

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 border-b-2 border-slate-100 dark:border-slate-800 pb-5">
        <h2 className="text-xl font-black text-slate-800 dark:text-white shrink-0">
          الأسئلة
          <span className="text-sm font-bold text-slate-400 mr-2">
            ({questions.length}{questions.length !== totalQuestions ? ` من ${totalQuestions}` : ""})
          </span>
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في النصوص..."
              className="w-full py-2.5 pr-9 pl-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm focus:border-violet-500 outline-none transition-colors"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            aria-label="تصفية حسب الفئة"
            className="py-2.5 px-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm focus:border-violet-500 outline-none"
          >
            <option value="">كل الفئات</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name_ar}</option>
            ))}
          </select>

          <select
            value={filterPoints}
            onChange={(e) => setFilterPoints(e.target.value ? (Number(e.target.value) as QuizPoints) : "")}
            aria-label="تصفية حسب النقاط"
            className="py-2.5 px-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm focus:border-violet-500 outline-none"
          >
            <option value="">كل القيم</option>
            {QUIZ_CONFIG.TIERS.map((t) => (
              <option key={t} value={t}>{t} نقطة</option>
            ))}
          </select>

          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as "all" | "active" | "inactive")}
            aria-label="تصفية حسب الحالة"
            className="py-2.5 px-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm focus:border-violet-500 outline-none"
          >
            <option value="all">الكل</option>
            <option value="active">المفعّلة</option>
            <option value="inactive">المعطّلة</option>
          </select>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Inbox size={48} className="mb-4 opacity-50" />
          <p className="font-black">
            {totalQuestions === 0 ? "بنك الأسئلة فارغ." : "لا نتائج مطابقة للتصفية."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {questions.map((q) => (
            <article
              key={q.id}
              className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-colors ${
                q.is_active
                  ? "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  : "bg-slate-100/60 dark:bg-slate-950/40 border-dashed border-slate-300 dark:border-slate-700 opacity-70"
              }`}
            >
              {q.question_image_url ? (
                <img
                  src={q.question_image_url}
                  alt={q.question_image_alt || "صورة السؤال"}
                  className="w-16 h-16 shrink-0 rounded-xl object-cover bg-slate-200 dark:bg-slate-800"
                />
              ) : (
                <div className="w-16 h-16 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-700">
                  <ImageIcon size={22} />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${TIER_STYLES[q.points]}`}>
                    {q.points} نقطة
                  </span>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400">
                    {categoryNameById.get(q.category_id) || "بلا فئة"}
                  </span>
                  {q.external_ref && (
                    <span className="text-[11px] font-bold text-slate-400" dir="ltr">
                      {q.external_ref}
                    </span>
                  )}
                  {!q.is_active && (
                    <span className="text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-md">
                      معطّل
                    </span>
                  )}
                  {q.answer_image && (
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <ImageIcon size={12} /> صورة إجابة
                    </span>
                  )}
                </div>

                <p className="font-black text-slate-800 dark:text-white leading-relaxed mb-1">
                  {q.question_text}
                </p>
                <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400 leading-relaxed">
                  {q.answer_text}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleQuestionActive(q)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  title={q.is_active ? "تعطيل" : "تفعيل"}
                >
                  {q.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
                <button
                  onClick={() => editQuestion(q)}
                  className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  title="تعديل"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => removeQuestion(q)}
                  className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                  title="حذف"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
