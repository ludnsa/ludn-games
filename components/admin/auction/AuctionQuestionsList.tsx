import React, { useState } from "react";
import { ListOrdered, Database, Edit, Trash2, Check, Folder, Plus } from "lucide-react";
import { AuctionQuestion } from "@/hooks/admin/auction/useAuctionQuestions";
import {
  PANEL, PANEL_TITLE, TITLE_ICON, ICON_BTN, ICON_BTN_DANGER, EMPTY, CORRECT, DIFFICULTY_ACTIVE, chip,
} from "@/components/admin/layout/adminUi";

export default function AuctionQuestionsList({
  questions, handleEdit, handleDelete, updateQuestionDifficulty, updateQuestionAnswer, setCategoryForNewQuestion
}: {
  questions: AuctionQuestion[],
  handleEdit: (q: AuctionQuestion) => void,
  handleDelete: (id: string) => void,
  updateQuestionDifficulty?: (id: string, difficulty: "سهل" | "متوسط" | "صعب") => void,
  updateQuestionAnswer?: (id: string, answer: string) => void,
  setCategoryForNewQuestion?: (category: string) => void
}) {
  const [activeTab, setActiveTab] = useState<string>("الكل");

  // استخراج الفئات المتوفرة في الأسئلة
  const allCategories = Array.from(new Set(questions.map((q) => q.category || "عام")));

  // التصفية حسب الفئة المختارة
  const filteredQuestions = activeTab === "الكل"
    ? questions
    : questions.filter((q) => (q.category || "عام") === activeTab);

  // تجميع الأسئلة حسب الفئات للعرض المنظم
  const groupedCategories = activeTab === "الكل" ? allCategories : [activeTab];

  return (
    <section className={`${PANEL} grid gap-5`}>
      {/* هيدر بنك الأسئلة مع التصفية */}
      <div className="grid gap-4 pb-4 border-b border-ludn-line">
        <h2 className={PANEL_TITLE}>
          <span className={TITLE_ICON}><ListOrdered size={20} /></span>
          الأسئلة المضافة حسب الفئات ({questions.length})
        </h2>

        {/* تبويبات التصفية حسب الفئة */}
        {allCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap pb-1">
            <button
              onClick={() => setActiveTab("الكل")}
              className={chip(activeTab === "الكل")}
            >
              الكل ({questions.length})
            </button>
            {allCategories.map((cat) => {
              const count = questions.filter((q) => (q.category || "عام") === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={chip(activeTab === cat)}
                >
                  <Folder size={13} />
                  <span>{cat}</span>
                  <span className="opacity-70 tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* عرض الأسئلة مقسمة داخل بطاقات الفئات */}
      {questions.length === 0 ? (
        <div className={EMPTY}>
          <Database className="w-11 h-11 opacity-50" />
          <p>لا توجد أسئلة مضافة حتى الآن.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {groupedCategories.map((catName) => {
            const catQs = questions.filter((q) => (q.category || "عام") === catName);
            if (catQs.length === 0) return null;

            return (
              <div key={catName} className="grid gap-3">
                {/* هيدر الفئة */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ludn-surface-2 p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 shrink-0 rounded-xl bg-ludn-surface text-ludn-gold-text grid place-items-center">
                      <Folder size={19} />
                    </span>
                    <div>
                      <h3 className="font-black">{catName}</h3>
                      <span className="text-xs font-bold text-ludn-muted">إجمالي أسئلة الفئة: {catQs.length}</span>
                    </div>
                  </div>

                  {setCategoryForNewQuestion && (
                    <button
                      onClick={() => setCategoryForNewQuestion(catName)}
                      className="min-h-10 flex items-center gap-1.5 text-xs font-black text-ludn-gold-text bg-ludn-gold/10 hover:bg-ludn-gold/20 px-3.5 rounded-xl transition-colors border border-ludn-gold/30"
                    >
                      <Plus size={14} /> إضافة سؤال لهذه الفئة
                    </button>
                  )}
                </div>

                {/* أسئلة الفئة */}
                <div className="grid gap-3">
                  {catQs.map((q, index) => (
                    <div key={q.id} className="p-4 rounded-2xl border border-ludn-line bg-ludn-surface grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center hover:border-ludn-gold/50 transition-colors">
                      <div className="min-w-0 grid gap-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="bg-ludn-gold/15 text-ludn-gold-text px-2.5 py-0.5 rounded-lg text-xs font-black">سؤال {index + 1}</span>

                          {/* تصنيف الصعوبة التفاعلي للأسئلة السابقة */}
                          {updateQuestionDifficulty && (
                            <div className="flex items-center gap-1 bg-ludn-surface-2 p-1 rounded-xl">
                              <span className="text-[11px] font-black text-ludn-muted px-1.5">الصعوبة:</span>
                              {(["سهل", "متوسط", "صعب"] as const).map((level) => {
                                const active = (q.difficulty || "متوسط") === level;
                                return (
                                  <button
                                    key={level}
                                    type="button"
                                    onClick={() => updateQuestionDifficulty(q.id, level)}
                                    className={`min-h-8 px-2.5 text-[11px] font-black rounded-lg border transition-colors ${
                                      active ? DIFFICULTY_ACTIVE[level] : "border-transparent text-ludn-muted hover:text-ludn-fg"
                                    }`}
                                  >
                                    {level}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <p className="font-black leading-relaxed break-words">{q.question}</p>
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="w-full text-[11px] font-bold text-ludn-muted">انقر لتحديد الإجابة الصحيحة:</span>
                          {q.options.map((opt, i) => {
                            const isCorrect = opt === q.answer;
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => updateQuestionAnswer && updateQuestionAnswer(q.id, opt)}
                                title="انقر لتحديد هذا الخيار كإجابة صحيحة"
                                className={`min-h-9 text-xs font-bold px-3.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1 ${
                                  isCorrect ? CORRECT : "bg-ludn-surface-2 border-ludn-line text-ludn-fg/80 hover:border-ludn-green"
                                }`}
                              >
                                {opt} {isCorrect && <Check size={14} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex md:flex-col gap-2 justify-end pt-3 md:pt-0 border-t md:border-t-0 border-ludn-line">
                        <button onClick={() => handleEdit(q)} className={ICON_BTN} title="تعديل" aria-label="تعديل"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(q.id)} className={ICON_BTN_DANGER} title="حذف" aria-label="حذف"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
