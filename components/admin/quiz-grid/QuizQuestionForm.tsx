/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useRef } from "react";
import { Edit, Plus, Save, Loader2, ImagePlus, X, Info } from "lucide-react";
import { QUIZ_CONFIG } from "@/constants/quiz-grid";
import type { QuizPoints } from "@/types";
import type { useQuizAdmin } from "@/hooks/admin/quiz-grid/useQuizAdmin";
import {
  PANEL, PANEL_TITLE, TITLE_ICON, FIELD, LABEL, BTN_GOLD, BTN_SOFT,
} from "@/components/admin/layout/adminUi";

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
    <div>
      <label className={LABEL}>
        {label} <span className="font-normal">(اختياري)</span>
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
        <div className="flex flex-col gap-3 p-3 rounded-2xl bg-ludn-surface-2 border border-ludn-line">
          <div className="flex items-start gap-3">
            <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-ludn-surface grid place-items-center">
              {previewUrl ? (
                <img src={previewUrl} alt={alt || label} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-bold text-ludn-muted text-center px-1">
                  صورة محفوظة
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-ludn-muted truncate mb-2" dir="ltr">
                {path}
              </p>
              <button
                type="button"
                onClick={onClear}
                className="flex items-center gap-1.5 text-xs font-black text-rose-500 hover:underline"
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
            className={`${FIELD} bg-ludn-surface`}
          />
        </div>
      ) : (
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="w-full h-[104px] flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ludn-line bg-ludn-surface-2 text-ludn-muted hover:border-ludn-gold hover:text-ludn-gold-text transition-colors disabled:opacity-50"
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
    <section className={`${PANEL} grid gap-5`}>
      <h2 className={`${PANEL_TITLE} pb-4 border-b border-ludn-line`}>
        <span className={TITLE_ICON}>{form.id ? <Edit size={20} /> : <Plus size={20} />}</span>
        {form.id ? "تعديل السؤال" : "إضافة سؤال جديد"}
      </h2>

      {activeCategories.length === 0 ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <Info size={22} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="font-bold text-sm text-amber-800 dark:text-amber-300">
            لا توجد فئات مفعّلة بعد. افتح &laquo;إدارة الفئات&raquo; وأضف فئة أولاً.
          </p>
        </div>
      ) : (
        <form onSubmit={submitQuestion} className="grid gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={LABEL} htmlFor="quiz-category">
                الفئة
              </label>
              <select
                id="quiz-category"
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className={FIELD}
              >
                <option value="">اختر الفئة...</option>
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL}>قيمة السؤال</label>
              <div className="flex gap-2">
                {QUIZ_CONFIG.TIERS.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setForm({ ...form, points: tier as QuizPoints })}
                    className={`flex-1 min-h-12 rounded-xl font-black border transition-colors tabular-nums ${
                      form.points === tier
                        ? "bg-ludn-gold border-ludn-gold text-ludn-gold-ink"
                        : "bg-ludn-surface-2 border-ludn-line text-ludn-muted hover:text-ludn-fg"
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className={LABEL} htmlFor="quiz-question">
                نص السؤال
              </label>
              <textarea
                id="quiz-question"
                value={form.question_text}
                onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                rows={3}
                placeholder="اكتب السؤال هنا..."
                className={`${FIELD} resize-none leading-relaxed`}
              />
            </div>

            <div className="md:col-span-2">
              <label className={`${LABEL} text-ludn-green!`} htmlFor="quiz-answer">
                نص الإجابة
              </label>
              <textarea
                id="quiz-answer"
                value={form.answer_text}
                onChange={(e) => setForm({ ...form, answer_text: e.target.value })}
                rows={2}
                placeholder="اكتب الإجابة الصحيحة هنا..."
                className={`${FIELD} resize-none leading-relaxed border-ludn-green/40 focus:border-ludn-green`}
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

            <div>
              <label className={LABEL} htmlFor="quiz-ref">
                المرجع الخارجي <span className="font-normal">(اختياري)</span>
              </label>
              <input
                id="quiz-ref"
                type="text"
                dir="ltr"
                value={form.external_ref}
                onChange={(e) => setForm({ ...form, external_ref: e.target.value })}
                placeholder="مثال: GEN-001"
                className={FIELD}
              />
              <p className="text-[11px] font-bold text-ludn-muted mt-1.5">
                يمنع تكرار السؤال عند إعادة الاستيراد من ملف.
              </p>
            </div>

            <div>
              <label className={LABEL}>حالة السؤال</label>
              <button
                type="button"
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className={`w-full min-h-12 px-3 rounded-xl font-black border transition-colors ${
                  form.is_active
                    ? "bg-ludn-green/15 border-ludn-green text-ludn-green"
                    : "bg-ludn-surface-2 border-ludn-line text-ludn-muted"
                }`}
              >
                {form.is_active ? "مفعّل — يدخل في السحب" : "معطّل — خارج السحب"}
              </button>
            </div>
          </div>

          <div className="flex gap-2.5 pt-4 border-t border-ludn-line">
            <button
              type="submit"
              disabled={isSaving || isUploading !== null}
              className={`${BTN_GOLD} flex-1 text-lg`}
            >
              {isSaving ? <Loader2 className="animate-spin" size={22} /> : <Save size={22} />}
              {form.id ? "حفظ التعديلات" : "إضافة السؤال"}
            </button>

            {form.id && (
              <button
                type="button"
                onClick={resetForm}
                className={BTN_SOFT}
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
