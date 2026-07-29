/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useRef } from "react";
import { Edit, Plus, Save, Loader2, ImagePlus, X, Info } from "lucide-react";
import { QUIZ_CONFIG } from "@/constants/quiz-grid";
import type { QuizPoints } from "@/types";
import type { useQuizAdmin } from "@/hooks/admin/quiz-grid/useQuizAdmin";

type Ctx = ReturnType<typeof useQuizAdmin>;

/** حقل صورة اختياري: رفع + معاينة + وصف عربي إلزامي عند وجود صورة. */
function ImageField({
  label,
  kind,
  path,
  previewUrl,
  alt,
  isUploading,
  onUpload,
  onClear,
  onAltChange,
}: {
  label: string;
  kind: "question" | "answer";
  path: string | null;
  previewUrl: string | null;
  alt: string;
  isUploading: boolean;
  onUpload: (file: File) => void;
  onClear: () => void;
  onAltChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <label className="font-bold text-sm text-slate-500 dark:text-slate-400">
        {label} <span className="text-slate-400 font-normal">(اختياري)</span>
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />

      {path ? (
        <div className="flex flex-col gap-3 p-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
              {previewUrl ? (
                <img src={previewUrl} alt={alt || label} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-bold text-slate-400 text-center px-1">
                  صورة محفوظة
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-slate-400 truncate mb-2" dir="ltr">
                {path}
              </p>
              <button
                type="button"
                onClick={onClear}
                className="flex items-center gap-1.5 text-xs font-black text-rose-600 dark:text-rose-400 hover:underline"
              >
                <X size={14} /> إزالة الصورة
              </button>
            </div>
          </div>

          <input
            type="text"
            value={alt}
            onChange={(e) => onAltChange(e.target.value)}
            placeholder="وصف الصورة بالعربية (مطلوب لقارئات الشاشة)"
            className="w-full p-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-lg font-bold text-sm focus:border-violet-500 outline-none transition-colors"
          />
        </div>
      ) : (
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="w-full h-[104px] flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-400 hover:border-violet-400 hover:text-violet-500 transition-colors disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              <span className="text-xs font-bold">جاري التحويل والرفع...</span>
            </>
          ) : (
            <>
              <ImagePlus size={24} />
              <span className="text-xs font-bold">اختر صورة — تُحوَّل تلقائياً إلى WebP</span>
            </>
          )}
        </button>
      )}
      <input type="hidden" name={`${kind}_image`} value={path || ""} readOnly />
    </div>
  );
}

export default function QuizQuestionForm({ ctx }: { ctx: Ctx }) {
  const { form, setForm, categories, isSaving, isUploading, previews, submitQuestion, resetForm, uploadImage, clearImage } = ctx;

  const activeCategories = categories.filter((c) => c.is_active);

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
        <div className="p-2 bg-violet-100 dark:bg-violet-900/30 text-violet-600 rounded-lg">
          {form.id ? <Edit size={20} /> : <Plus size={20} />}
        </div>
        <h2 className="text-xl font-black text-slate-800 dark:text-white">
          {form.id ? "تعديل السؤال" : "إضافة سؤال جديد"}
        </h2>
      </div>

      {activeCategories.length === 0 ? (
        <div className="flex items-center gap-3 p-5 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-900/50 rounded-2xl">
          <Info size={22} className="text-amber-600 shrink-0" />
          <p className="font-bold text-sm text-amber-800 dark:text-amber-300">
            لا توجد فئات مفعّلة بعد. افتح &laquo;إدارة الفئات&raquo; وأضف فئة أولاً.
          </p>
        </div>
      ) : (
        <form onSubmit={submitQuestion} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-bold text-sm text-slate-500 dark:text-slate-400" htmlFor="quiz-category">
                الفئة
              </label>
              <select
                id="quiz-category"
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-black focus:border-violet-500 outline-none transition-colors"
              >
                <option value="">اختر الفئة...</option>
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-bold text-sm text-slate-500 dark:text-slate-400">قيمة السؤال</label>
              <div className="flex gap-3">
                {QUIZ_CONFIG.TIERS.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setForm({ ...form, points: tier as QuizPoints })}
                    className={`flex-1 py-4 rounded-xl font-black border-2 transition-all ${
                      form.points === tier
                        ? "bg-violet-500 border-violet-600 text-white ring-2 ring-violet-500/30"
                        : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 hover:border-violet-300"
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="font-bold text-sm text-slate-500 dark:text-slate-400" htmlFor="quiz-question">
                نص السؤال
              </label>
              <textarea
                id="quiz-question"
                value={form.question_text}
                onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                rows={3}
                placeholder="اكتب السؤال هنا..."
                className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-black focus:border-violet-500 outline-none transition-colors resize-none"
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="font-bold text-sm text-emerald-600 dark:text-emerald-500" htmlFor="quiz-answer">
                نص الإجابة
              </label>
              <textarea
                id="quiz-answer"
                value={form.answer_text}
                onChange={(e) => setForm({ ...form, answer_text: e.target.value })}
                rows={2}
                placeholder="اكتب الإجابة الصحيحة هنا..."
                className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-emerald-200 dark:border-emerald-900/50 rounded-xl font-black focus:border-emerald-500 outline-none transition-colors resize-none"
              />
            </div>

            <ImageField
              label="صورة السؤال"
              kind="question"
              path={form.question_image}
              previewUrl={previews.question}
              alt={form.question_image_alt}
              isUploading={isUploading === "question"}
              onUpload={(file) => uploadImage("question", file)}
              onClear={() => clearImage("question")}
              onAltChange={(v) => setForm({ ...form, question_image_alt: v })}
            />

            <ImageField
              label="صورة الإجابة"
              kind="answer"
              path={form.answer_image}
              previewUrl={previews.answer}
              alt={form.answer_image_alt}
              isUploading={isUploading === "answer"}
              onUpload={(file) => uploadImage("answer", file)}
              onClear={() => clearImage("answer")}
              onAltChange={(v) => setForm({ ...form, answer_image_alt: v })}
            />

            <div className="flex flex-col gap-2">
              <label className="font-bold text-sm text-slate-500 dark:text-slate-400" htmlFor="quiz-ref">
                المرجع الخارجي <span className="text-slate-400 font-normal">(اختياري)</span>
              </label>
              <input
                id="quiz-ref"
                type="text"
                dir="ltr"
                value={form.external_ref}
                onChange={(e) => setForm({ ...form, external_ref: e.target.value })}
                placeholder="مثال: GEN-001"
                className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-black text-sm focus:border-violet-500 outline-none transition-colors"
              />
              <p className="text-[11px] font-bold text-slate-400">
                يمنع تكرار السؤال عند إعادة الاستيراد من ملف.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-bold text-sm text-slate-500 dark:text-slate-400">حالة السؤال</label>
              <button
                type="button"
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className={`w-full p-4 rounded-xl font-black border-2 transition-all ${
                  form.is_active
                    ? "bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : "bg-slate-100 border-slate-300 text-slate-500 dark:bg-slate-950 dark:border-slate-700"
                }`}
              >
                {form.is_active ? "مفعّل — يدخل في السحب" : "معطّل — خارج السحب"}
              </button>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t-2 border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={isSaving || isUploading !== null}
              className="flex-1 py-4 bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white font-black text-lg rounded-xl border-b-4 border-violet-700 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
              {form.id ? "حفظ التعديلات" : "إضافة السؤال"}
            </button>

            {form.id && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-black text-lg rounded-xl border-b-4 border-slate-300 dark:border-slate-950 active:border-b-0 active:translate-y-[4px] transition-all"
              >
                إلغاء
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
