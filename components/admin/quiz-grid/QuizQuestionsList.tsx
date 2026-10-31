/* eslint-disable @next/next/no-img-element */
"use client";
import React from "react";
import { Search, Pencil, Trash2, Eye, EyeOff, Image as ImageIcon, Inbox, ListOrdered } from "lucide-react";
import { QUIZ_CONFIG } from "@/constants/quiz-grid";
import type { QuizPoints } from "@/types";
import type { useQuizAdmin } from "@/hooks/admin/quiz-grid/useQuizAdmin";
import {
  PANEL, PANEL_TITLE, TITLE_ICON, FIELD, ICON_BTN, ICON_BTN_DANGER, EMPTY,
} from "@/components/admin/layout/adminUi";

type Ctx = ReturnType<typeof useQuizAdmin>;

const TIER_STYLES: Record<number, string> = {
  200: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  400: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  600: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

const FILTER = `${FIELD} min-h-11 py-2 text-sm`;

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
    <section className={`${PANEL} grid gap-5`}>
      <div className="grid gap-4 pb-5 border-b border-ludn-line">
        <h2 className={PANEL_TITLE}>
          <span className={TITLE_ICON}><ListOrdered size={20} /></span>
          الأسئلة
          <span className="text-base text-ludn-muted tabular-nums">
            ({questions.length}{questions.length !== totalQuestions ? ` من ${totalQuestions}` : ""})
          </span>
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-[minmax(0,1fr)_repeat(3,auto)] gap-2">
          <div className="relative col-span-2 lg:col-span-1">
            <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-ludn-muted pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في النصوص..."
              className={`${FILTER} ps-10`}
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            aria-label="تصفية حسب الفئة"
            className={`${FILTER} col-span-2 sm:col-span-1`}
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
            className={FILTER}
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
            className={FILTER}
          >
            <option value="all">الكل</option>
            <option value="active">المفعّلة</option>
            <option value="inactive">المعطّلة</option>
          </select>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className={EMPTY}>
          <Inbox size={44} className="opacity-50" />
          <p className="font-black">
            {totalQuestions === 0 ? "بنك الأسئلة فارغ." : "لا نتائج مطابقة للتصفية."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {questions.map((q) => (
            <article
              key={q.id}
              className={`grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 sm:gap-4 p-3.5 rounded-2xl border transition-colors ${
                q.is_active
                  ? "bg-ludn-surface-2 border-ludn-line"
                  : "bg-ludn-surface-2/50 border-dashed border-ludn-line opacity-70"
              }`}
            >
              {q.question_image_url ? (
                <img
                  src={q.question_image_url}
                  alt={q.question_image_alt || "صورة السؤال"}
                  className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-xl object-cover bg-ludn-surface"
                />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-xl bg-ludn-surface grid place-items-center text-ludn-muted/50">
                  <ImageIcon size={22} />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${TIER_STYLES[q.points]}`}>
                    {q.points} نقطة
                  </span>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-ludn-gold/15 text-ludn-gold-text">
                    {categoryNameById.get(q.category_id) || "بلا فئة"}
                  </span>
                  {q.external_ref && (
                    <span className="text-[11px] font-bold text-ludn-muted" dir="ltr">
                      {q.external_ref}
                    </span>
                  )}
                  {!q.is_active && (
                    <span className="text-[10px] font-black bg-ludn-surface text-ludn-muted px-2 py-0.5 rounded-md">
                      معطّل
                    </span>
                  )}
                  {q.answer_image && (
                    <span className="text-[10px] font-bold text-ludn-muted flex items-center gap-1">
                      <ImageIcon size={12} /> صورة إجابة
                    </span>
                  )}
                </div>

                <p className="font-black leading-relaxed mb-1 break-words">
                  {q.question_text}
                </p>
                <p className="font-bold text-sm text-ludn-green leading-relaxed break-words">
                  {q.answer_text}
                </p>
              </div>

              <div className="col-span-2 sm:col-span-1 flex sm:flex-col items-center justify-end gap-1.5 pt-3 sm:pt-0 border-t sm:border-t-0 border-ludn-line">
                <button
                  onClick={() => toggleQuestionActive(q)}
                  className={ICON_BTN}
                  title={q.is_active ? "تعطيل" : "تفعيل"}
                  aria-label={q.is_active ? "تعطيل" : "تفعيل"}
                >
                  {q.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
                <button
                  onClick={() => editQuestion(q)}
                  className={ICON_BTN}
                  title="تعديل"
                  aria-label="تعديل"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => removeQuestion(q)}
                  className={ICON_BTN_DANGER}
                  title="حذف"
                  aria-label="حذف"
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
