"use client";
import React from "react";
import { Edit, Plus, ChevronDown, Save, Loader2 } from "lucide-react";
import {
  PANEL, PANEL_TITLE, TITLE_ICON, FIELD, LABEL, BTN_GOLD, BTN_SOFT, CORRECT, DIFFICULTY_ACTIVE,
} from "@/components/admin/layout/adminUi";

const OPTION_BTN = "flex-1 min-h-12 px-4 rounded-xl font-black text-sm border transition-colors";
const OPTION_IDLE = "bg-ludn-surface-2 border-ludn-line text-ludn-muted hover:text-ludn-fg";

export default function AuctionQuestionForm({ ctx }: { ctx: any }) {
  const {
    editingId, setEditingId, formData, setFormData, handleSubmit, isSaving,
    categoryRef, isAddingCategory, setIsAddingCategory, newCategory, setNewCategory,
    isCategoryDropdownOpen, setIsCategoryDropdownOpen, uniqueCategories
  } = ctx;

  return (
    <section className={`${PANEL} grid gap-5`}>
      <h2 className={`${PANEL_TITLE} pb-4 border-b border-ludn-line`}>
        <span className={TITLE_ICON}>{editingId ? <Edit size={20} /> : <Plus size={20} />}</span>
        {editingId ? "تعديل السؤال" : "إضافة سؤال جديد"}
      </h2>

      <form onSubmit={handleSubmit} className="grid gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="relative" ref={categoryRef}>
            <label className={LABEL}>فئة السؤال (المجال)</label>
            <div
              onClick={() => !isAddingCategory && setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className={`${FIELD} flex justify-between items-center gap-2 cursor-pointer focus-within:border-ludn-gold`}
            >
              {isAddingCategory ? (
                <div className="flex gap-2 w-full">
                  <input
                    autoFocus
                    type="text"
                    placeholder="اكتب الفئة الجديدة..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent border-none outline-none placeholder:text-ludn-muted text-base"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newCategory.trim()) {
                          setFormData({ ...formData, category: newCategory.trim() });
                          setIsAddingCategory(false);
                          setNewCategory("");
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (newCategory.trim()) {
                        setFormData({ ...formData, category: newCategory.trim() });
                        setIsAddingCategory(false);
                        setNewCategory("");
                      }
                    }}
                    className="shrink-0 bg-ludn-green text-white px-3 py-1 rounded-lg text-xs font-bold"
                  >تم</button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddingCategory(false);
                      setNewCategory("");
                    }}
                    className="shrink-0 bg-rose-500 text-white px-3 py-1 rounded-lg text-xs font-bold"
                  >إلغاء</button>
                </div>
              ) : (
                <span className={formData.category ? "" : "text-ludn-muted font-semibold"}>
                  {formData.category || "اختر الفئة أو أضف جديدة..."}
                </span>
              )}
              {!isAddingCategory && (
                <ChevronDown size={20} className={`shrink-0 text-ludn-muted transition-transform ${isCategoryDropdownOpen ? "rotate-180" : ""}`} />
              )}
            </div>

            {isCategoryDropdownOpen && !isAddingCategory && (
              <div className="absolute top-full inset-x-0 mt-2 rounded-2xl bg-ludn-surface border border-ludn-line ludn-shadow z-40 overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                {uniqueCategories.map((cat: string) => (
                  <div
                    key={cat}
                    onClick={() => { setFormData({ ...formData, category: cat }); setIsCategoryDropdownOpen(false); }}
                    className="px-4 py-3 hover:bg-ludn-surface-2 cursor-pointer font-bold text-sm border-b last:border-b-0 border-ludn-line transition-colors"
                  >
                    {cat}
                  </div>
                ))}
                <div
                  onClick={() => { setIsAddingCategory(true); setIsCategoryDropdownOpen(false); }}
                  className="px-4 py-3 bg-ludn-gold/10 hover:bg-ludn-gold/20 text-ludn-gold-text cursor-pointer font-black text-sm transition-colors flex items-center gap-2 border-t border-ludn-line"
                >
                  <Plus size={16} /> إضافة فئة جديدة...
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className={LABEL}>نص السؤال</label>
            <textarea
              placeholder="اكتب السؤال هنا..."
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              rows={3}
              className={`${FIELD} resize-none leading-relaxed`}
            />
          </div>

          {[
            { id: "opt1", label: "الخيار الأول", value: formData.opt1 },
            { id: "opt2", label: "الخيار الثاني", value: formData.opt2 },
            { id: "opt3", label: "الخيار الثالث", value: formData.opt3 }
          ].map((opt, idx) => (
            <div key={idx}>
              <label className={LABEL}>{opt.label}</label>
              <input
                type="text"
                value={opt.value}
                onChange={(e) => setFormData({ ...formData, [opt.id]: e.target.value })}
                className={FIELD}
              />
            </div>
          ))}

          <div className="md:col-span-2">
            <label className={`${LABEL} text-ludn-green!`}>حدد الإجابة الصحيحة</label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setFormData({ ...formData, correctOption: num as 1 | 2 | 3 })}
                  className={`${OPTION_BTN} ${formData.correctOption === num ? CORRECT : OPTION_IDLE}`}
                >
                  الخيار رقم {num}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className={LABEL}>مستوى صعوبة السؤال</label>
            <div className="grid grid-cols-3 gap-2">
              {(["سهل", "متوسط", "صعب"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData({ ...formData, difficulty: level })}
                  className={`${OPTION_BTN} ${formData.difficulty === level ? DIFFICULTY_ACTIVE[level] : OPTION_IDLE}`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 pt-4 border-t border-ludn-line">
          <button
            type="submit"
            disabled={isSaving}
            className={`${BTN_GOLD} flex-1 text-lg`}
          >
            {isSaving ? <Loader2 className="animate-spin" size={22} /> : <Save size={22} />}
            {editingId ? "حفظ التعديلات" : "إضافة للسيرفر"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setFormData({ category: formData.category, question: "", opt1: "", opt2: "", opt3: "", correctOption: 1, difficulty: "متوسط" });
              }}
              className={BTN_SOFT}
            >
              إلغاء
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
