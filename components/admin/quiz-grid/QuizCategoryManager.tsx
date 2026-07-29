"use client";
import React from "react";
import { Layers, Plus, Save, Pencil, Trash2, Eye, EyeOff, Loader2, X, AlertTriangle } from "lucide-react";
import { QUIZ_CONFIG } from "@/constants/quiz-grid";
import type { QuizCategory, QuizPoints } from "@/types";

interface Props {
  ctx: {
    categories: QuizCategory[];
    coverage: Map<string, Record<QuizPoints, number>>;
    isCoverageReliable: boolean;
    isSaving: boolean;
    isCategoryPanelOpen: boolean;
    setIsCategoryPanelOpen: (open: boolean) => void;
    categoryDraft: { id: string | null; name_ar: string; slug: string };
    setCategoryDraft: (draft: { id: string | null; name_ar: string; slug: string }) => void;
    submitCategory: (e: React.FormEvent) => void;
    editCategory: (c: QuizCategory) => void;
    toggleCategoryActive: (c: QuizCategory) => void;
    removeCategory: (c: QuizCategory) => void;
  };
}

export default function QuizCategoryManager({ ctx }: Props) {
  const {
    categories, coverage, isCoverageReliable, isSaving,
    isCategoryPanelOpen, setIsCategoryPanelOpen,
    categoryDraft, setCategoryDraft,
    submitCategory, editCategory, toggleCategoryActive, removeCategory,
  } = ctx;

  if (!isCategoryPanelOpen) return null;

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-violet-200 dark:border-violet-900/60 rounded-3xl p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-6 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/30 text-violet-600 rounded-lg">
            <Layers size={20} />
          </div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">الفئات</h2>
        </div>
        <button
          onClick={() => setIsCategoryPanelOpen(false)}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="إغلاق لوحة الفئات"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={submitCategory} className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          type="text"
          value={categoryDraft.name_ar}
          onChange={(e) => setCategoryDraft({ ...categoryDraft, name_ar: e.target.value })}
          placeholder="اسم الفئة بالعربية (مثال: تاريخ)"
          className="flex-1 p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-black focus:border-violet-500 outline-none transition-colors"
        />
        <input
          type="text"
          value={categoryDraft.slug}
          onChange={(e) => setCategoryDraft({ ...categoryDraft, slug: e.target.value })}
          placeholder="المعرّف (اختياري)"
          dir="ltr"
          className="md:w-56 p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-black focus:border-violet-500 outline-none transition-colors text-sm"
        />
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white font-black rounded-xl border-b-4 border-violet-700 active:border-b-0 active:translate-y-[4px] transition-all"
        >
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : categoryDraft.id ? <Save size={20} /> : <Plus size={20} />}
          {categoryDraft.id ? "حفظ" : "إضافة"}
        </button>
        {categoryDraft.id && (
          <button
            type="button"
            onClick={() => setCategoryDraft({ id: null, name_ar: "", slug: "" })}
            className="px-5 py-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-black rounded-xl transition-all"
          >
            إلغاء
          </button>
        )}
      </form>

      {categories.length === 0 ? (
        <p className="text-center font-bold text-slate-400 py-8">
          لا توجد فئات بعد. أضف أول فئة من النموذج أعلاه.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categories.map((category) => {
            const counts = coverage.get(category.id) || { 200: 0, 400: 0, 600: 0 };
            const isPlayable = QUIZ_CONFIG.TIERS.every((t) => counts[t] >= QUIZ_CONFIG.PER_TIER);

            return (
              <div
                key={category.id}
                className={`flex items-center justify-between gap-3 p-4 rounded-2xl border-2 transition-colors ${
                  category.is_active
                    ? "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                    : "bg-slate-100/60 dark:bg-slate-950/40 border-dashed border-slate-300 dark:border-slate-700 opacity-70"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-slate-800 dark:text-white truncate">
                      {category.name_ar}
                    </span>
                    {!category.is_active && (
                      <span className="text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-md shrink-0">
                        معطّلة
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-400" dir="ltr">
                      {category.slug}
                    </span>
                    {QUIZ_CONFIG.TIERS.map((tier) => (
                      <span
                        key={tier}
                        className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                          counts[tier] >= QUIZ_CONFIG.PER_TIER
                            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                            : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        {tier}: {counts[tier]}
                      </span>
                    ))}
                  </div>
                  {isCoverageReliable && !isPlayable && (
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      <AlertTriangle size={13} />
                      تحتاج {QUIZ_CONFIG.PER_TIER} أسئلة من كل قيمة لتصبح قابلة للاختيار
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleCategoryActive(category)}
                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    title={category.is_active ? "تعطيل" : "تفعيل"}
                  >
                    {category.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button
                    onClick={() => editCategory(category)}
                    className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    title="تعديل"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => removeCategory(category)}
                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
