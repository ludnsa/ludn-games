/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useRef } from "react";
import {
  Layers, Plus, Save, Pencil, Trash2, Eye, EyeOff, Loader2, X, AlertTriangle, ImagePlus, Image as ImageIcon,
} from "lucide-react";
import { QUIZ_CONFIG } from "@/constants/quiz-grid";
import type { useQuizAdmin } from "@/hooks/admin/quiz-grid/useQuizAdmin";
import {
  PANEL, PANEL_TITLE, TITLE_ICON, FIELD, LABEL, BTN_GOLD, BTN_SOFT, ICON_BTN, ICON_BTN_DANGER,
} from "@/components/admin/layout/adminUi";

type Ctx = ReturnType<typeof useQuizAdmin>;

export default function QuizCategoryManager({ ctx }: { ctx: Ctx }) {
  const {
    categories, coverage, isCoverageReliable, isSaving, isUploading,
    isCategoryPanelOpen, setIsCategoryPanelOpen,
    categoryDraft, setCategoryDraft, categoryImageUrl,
    submitCategory, editCategory, toggleCategoryActive, removeCategory, resetCategoryDraft,
    uploadCategoryImage, clearCategoryImage,
  } = ctx;

  const imageInputRef = useRef<HTMLInputElement>(null);
  const isUploadingImage = isUploading === "category";

  if (!isCategoryPanelOpen) return null;

  return (
    <section className={`${PANEL} border-ludn-gold/50 grid gap-5`}>
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-ludn-line">
        <h2 className={PANEL_TITLE}>
          <span className={TITLE_ICON}><Layers size={20} /></span>
          الفئات
        </h2>
        <button
          onClick={() => setIsCategoryPanelOpen(false)}
          className={ICON_BTN}
          aria-label="إغلاق لوحة الفئات"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={submitCategory} className="grid gap-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={categoryDraft.name_ar}
            onChange={(e) => setCategoryDraft({ ...categoryDraft, name_ar: e.target.value })}
            placeholder="اسم الفئة بالعربية (مثال: تاريخ)"
            className={`${FIELD} flex-1`}
          />
          <input
            type="text"
            value={categoryDraft.slug}
            onChange={(e) => setCategoryDraft({ ...categoryDraft, slug: e.target.value })}
            placeholder="المعرّف (اختياري)"
            dir="ltr"
            className={`${FIELD} md:w-56`}
          />
        </div>

        {/* صورة الفئة — تظهر كبطاقة في شاشة الإعداد؛ بدونها تظهر بطاقة متدرّجة اللون */}
        <div>
          <label className={LABEL}>
            صورة الفئة <span className="font-normal">(اختياري)</span>
          </label>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadCategoryImage(file);
              e.target.value = "";
            }}
          />

          {categoryDraft.image_path ? (
            <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-2xl bg-ludn-surface-2 border border-ludn-line">
              <div className="w-full sm:w-32 h-32 shrink-0 rounded-xl overflow-hidden bg-ludn-surface grid place-items-center">
                {categoryImageUrl ? (
                  <img
                    src={categoryImageUrl}
                    alt={categoryDraft.image_alt || "صورة الفئة"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon size={28} className="text-ludn-muted" />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <input
                  type="text"
                  value={categoryDraft.image_alt}
                  onChange={(e) => setCategoryDraft({ ...categoryDraft, image_alt: e.target.value })}
                  placeholder="وصف الصورة بالعربية (مطلوب لقارئات الشاشة)"
                  className={`${FIELD} bg-ludn-surface`}
                />
                <button
                  type="button"
                  onClick={clearCategoryImage}
                  className="self-start flex items-center gap-1.5 text-xs font-black text-rose-500 hover:underline"
                >
                  <X size={14} /> إزالة الصورة
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={isUploadingImage}
              onClick={() => imageInputRef.current?.click()}
              className="w-full h-[104px] flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ludn-line bg-ludn-surface-2 text-ludn-muted hover:border-ludn-gold hover:text-ludn-gold-text transition-colors disabled:opacity-50"
            >
              {isUploadingImage ? (
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
        </div>

        <div className="flex gap-2.5">
          <button
            type="submit"
            disabled={isSaving || isUploadingImage}
            className={`${BTN_GOLD} flex-1 sm:flex-none`}
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : categoryDraft.id ? <Save size={20} /> : <Plus size={20} />}
            {categoryDraft.id ? "حفظ" : "إضافة"}
          </button>
          {categoryDraft.id && (
            <button
              type="button"
              onClick={resetCategoryDraft}
              className={BTN_SOFT}
            >
              إلغاء
            </button>
          )}
        </div>
      </form>

      {categories.length === 0 ? (
        <p className="text-center font-bold text-ludn-muted py-8">
          لا توجد فئات بعد. أضف أول فئة من النموذج أعلاه.
        </p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {categories.map((category) => {
            const counts = coverage.get(category.id) || { 200: 0, 400: 0, 600: 0 };
            const isPlayable = QUIZ_CONFIG.TIERS.every((t) => counts[t] >= QUIZ_CONFIG.PER_TIER);

            return (
              <div
                key={category.id}
                className={`grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3.5 rounded-2xl border transition-colors ${
                  category.is_active
                    ? "bg-ludn-surface-2 border-ludn-line"
                    : "bg-ludn-surface-2/50 border-dashed border-ludn-line opacity-70"
                }`}
              >
                <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-ludn-surface grid place-items-center">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.image_alt || category.name_ar}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon size={20} className="text-ludn-muted" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black truncate">
                      {category.name_ar}
                    </span>
                    {!category.is_active && (
                      <span className="text-[10px] font-black bg-ludn-surface text-ludn-muted px-2 py-0.5 rounded-md shrink-0">
                        معطّلة
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-ludn-muted" dir="ltr">
                      {category.slug}
                    </span>
                    {QUIZ_CONFIG.TIERS.map((tier) => (
                      <span
                        key={tier}
                        className={`text-[11px] font-black px-2 py-0.5 rounded-md tabular-nums ${
                          counts[tier] >= QUIZ_CONFIG.PER_TIER
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {tier}: {counts[tier]}
                      </span>
                    ))}
                  </div>
                  {isCoverageReliable && !isPlayable && (
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      <AlertTriangle size={13} className="shrink-0" />
                      تحتاج {QUIZ_CONFIG.PER_TIER} أسئلة من كل قيمة لتصبح قابلة للاختيار
                    </div>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1 flex items-center justify-end gap-1.5 pt-3 sm:pt-0 border-t sm:border-t-0 border-ludn-line">
                  <button
                    onClick={() => toggleCategoryActive(category)}
                    className={ICON_BTN}
                    title={category.is_active ? "تعطيل" : "تفعيل"}
                    aria-label={category.is_active ? "تعطيل" : "تفعيل"}
                  >
                    {category.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button
                    onClick={() => editCategory(category)}
                    className={ICON_BTN}
                    title="تعديل"
                    aria-label="تعديل"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => removeCategory(category)}
                    className={ICON_BTN_DANGER}
                    title="حذف"
                    aria-label="حذف"
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
