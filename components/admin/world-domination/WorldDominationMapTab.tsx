"use client";
import React from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { Globe, MapPin, MousePointerClick, HelpCircle, Check, Trash2, Edit, Plus, FolderPlus, X } from "lucide-react";
import {
  PANEL, PANEL_TITLE, TITLE_ICON, FIELD, LABEL, BTN_GOLD, BTN_SOFT, BTN_SM_SOFT, ICON_BTN, ICON_BTN_DANGER,
  EMPTY, CORRECT, DIFFICULTY_ACTIVE, chip,
} from "@/components/admin/layout/adminUi";

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

// خانة الخيار: تتلون بالأخضر لو هي الإجابة الصحيحة
const optField = (correct: boolean) =>
  `${FIELD} ${correct ? "border-ludn-green bg-ludn-green/10" : "bg-ludn-surface"}`;
// مجموعة أزرار صغيرة داخل إطار (الإجابة/الصعوبة)
// على الجوال: العنوان بسطر والأزرار الثلاثة تحته بعرض متساوي
const GROUP = "grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1 p-1 rounded-xl bg-ludn-surface border border-ludn-line";
const GROUP_LABEL = "col-span-3 text-xs font-black text-ludn-muted px-2 py-1 sm:py-0";
const GROUP_IDLE = "border-transparent text-ludn-muted hover:text-ludn-fg";

export default function WorldDominationMapTab({ ctx }: { ctx: any }) {
  if (ctx.wdActiveSubTab !== "map") return null;

  return (
    <div className="grid gap-5 w-full">
      {/* الخريطة */}
      <div className="w-full bg-[#287cb5] rounded-[22px] border border-ludn-line overflow-hidden relative ludn-shadow aspect-[4/3] lg:aspect-auto lg:h-[520px]">
        <ComposableMap projectionConfig={{ scale: 160 }} className="w-full h-full">
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo: any) => {
                const isAdded = ctx.wdCountries.find((c: any) => c.geoId === geo.id);
                const isSelected = ctx.selectedGeoId === geo.id;
                let fillColor = "#f1f5f9";
                if (isSelected) fillColor = "#facc15";
                else if (isAdded) fillColor = "#10b981";

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => {
                      // 1. سحب كود الدولة الرسمي المربوط بالخريطة (geoId)
                      ctx.setSelectedGeoId(geo.id);

                      // 2. سحب اسم الدولة
                      ctx.setNewWdCountryName(geo.properties.name || geo.properties.NAME);

                      // 3. النزول تلقائياً لنموذج الإضافة
                      ctx.scrollToForm();
                    }}
                    style={{
                      default: { fill: fillColor, outline: "none", stroke: "#0f172a", strokeWidth: 0.5 },
                      hover: { fill: "#3b82f6", outline: "none", cursor: "pointer" },
                      pressed: { fill: "#2563eb", outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
        <div className="absolute bottom-3 inset-x-3 sm:inset-x-auto sm:start-4 sm:bottom-4 bg-black/70 backdrop-blur-md text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 pointer-events-none">
          <MousePointerClick size={18} className="shrink-0 text-ludn-gold animate-pulse" />
          اضغط على الخريطة لاختيار الدولة مباشرة
        </div>
      </div>

      {/* نموذج الدولة */}
      <div ref={ctx.formRef} className={`${PANEL} grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)_auto] md:items-end scroll-mt-24`}>
        <div>
          <label className={`${LABEL} flex items-center gap-1.5 text-ludn-gold-text!`}>
            <Globe size={16} /> {ctx.editingCountryId ? "تعديل بيانات دولة" : "إضافة دولة جديدة"}
          </label>
          <input
            type="text"
            value={ctx.newWdCountryName}
            onChange={(e) => ctx.setNewWdCountryName(e.target.value)}
            className={FIELD}
            placeholder="اسم الدولة..."
          />
        </div>
        <div className="min-h-12 px-3.5 py-2 rounded-xl bg-ludn-surface-2 flex flex-col justify-center">
          <span className="text-[11px] font-bold text-ludn-muted">المعرف المربوط بالخريطة:</span>
          <span className={`font-black text-sm ${ctx.selectedGeoId ? "text-ludn-green" : "text-ludn-muted"}`}>
            {ctx.selectedGeoId || "اضغط على الخريطة أولاً"}
          </span>
        </div>
        <div className="flex gap-2">
          {ctx.editingCountryId ? (
            <>
              <button onClick={ctx.addWdCountry} disabled={!ctx.selectedGeoId || !ctx.newWdCountryName.trim()} className={`${BTN_GOLD} flex-1`}>حفظ التعديل</button>
              <button onClick={ctx.cancelEditWdCountry} className={BTN_SOFT}>إلغاء</button>
            </>
          ) : (
            <button onClick={ctx.addWdCountry} disabled={!ctx.selectedGeoId || !ctx.newWdCountryName.trim()} className={`${BTN_GOLD} flex-1`}>حفظ وتثبيت الدولة</button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-3 px-1 mt-2">
        <h3 className={PANEL_TITLE}>
          <span className={TITLE_ICON}><MapPin size={20} /></span>
          الدول المضافة للنظام
        </h3>
        <span className="bg-ludn-gold/15 text-ludn-gold-text px-3.5 py-1.5 rounded-xl text-sm font-black tabular-nums">
          المجموع: {ctx.wdCountries.length}
        </span>
      </div>

      {/* قائمة الدول */}
      {ctx.wdCountries.length === 0 ? (
        <div className={EMPTY}>
          <Globe size={52} className="opacity-30" />
          <p className="text-lg">لا توجد دول مضافة حالياً. اختر من الخريطة وابدأ البناء.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 w-full">
          {ctx.wdCountries.map((c: any, cIdx: number) => (
            <div key={c.id} className={`p-4 rounded-2xl border bg-ludn-surface flex flex-col gap-3 transition-colors ${ctx.managingQuestionsFor === c.id ? "border-ludn-gold ring-4 ring-ludn-gold/15" : "border-ludn-line hover:border-ludn-gold/50"}`}>
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-ludn-muted text-xs font-black tabular-nums">{cIdx + 1}-</span>
                  <span className="font-black truncate" title={c.name}>{c.name}</span>
                </div>
                <span className="text-ludn-muted text-[11px] font-bold shrink-0" dir="ltr">{c.geoId}</span>
              </div>
              <button
                onClick={() => { ctx.setManagingQuestionsFor(c.id); ctx.scrollToQuestions(); }}
                className={`w-full min-h-10 text-sm font-black rounded-xl transition-colors border ${ctx.managingQuestionsFor === c.id ? "bg-ludn-gold text-ludn-gold-ink border-ludn-gold" : "bg-ludn-surface-2 border-ludn-line hover:border-ludn-gold/60"}`}
              >
                إدارة الأسئلة ({c.questions?.length || 0})
              </button>
              <div className="flex gap-2 border-t border-ludn-line pt-3">
                <button onClick={() => ctx.startEditingWdCountry(c)} className={`${BTN_SM_SOFT} flex-1 text-xs`}>تعديل الاسم</button>
                <button onClick={() => ctx.deleteWdCountry(c.id)} className="flex-1 min-h-10 rounded-xl text-xs font-bold border border-rose-500/25 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors">حذف الدولة</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* بنك أسئلة الدولة */}
      {ctx.managingQuestionsFor && (
        <div ref={ctx.questionsRef} className={`${PANEL} border-ludn-gold/60 grid gap-5 animate-in fade-in slide-in-from-bottom-8 scroll-mt-24`}>
          <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-ludn-line">
            <h3 className={`${PANEL_TITLE} flex-wrap`}>
              <span className={TITLE_ICON}><HelpCircle size={20} /></span>
              بنك أسئلة:
              <span className="bg-ludn-gold/15 text-ludn-gold-text px-3 py-1 rounded-xl">{ctx.wdCountries.find((c: any) => c.id === ctx.managingQuestionsFor)?.name}</span>
            </h3>
            <button onClick={() => ctx.setManagingQuestionsFor(null)} className={BTN_SM_SOFT}>إغلاق البنك</button>
          </div>

          <div className="grid gap-4 rounded-2xl bg-ludn-surface-2 p-3.5 md:p-5">
            {/* اختيار فئة السؤال (المجال) */}
            <div className="grid gap-2">
              <span className="text-sm font-black text-ludn-muted">فئة السؤال (المجال):</span>
              <div className="flex flex-wrap gap-2 items-center">
                {(ctx.allWdCategories || ctx.defaultWdCategories || ["رياضة", "دين", "تاريخ", "علوم", "جغرافيا", "معلومات عامة"]).map((cat: string) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => ctx.setWdCategory(cat)}
                    className={chip(ctx.wdCategory === cat)}
                  >
                    {cat}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => ctx.openAddCategoryModal(null)}
                  className="shrink-0 min-h-9 px-3.5 rounded-full text-[13px] font-black text-ludn-gold-text bg-ludn-gold/10 hover:bg-ludn-gold/20 border border-ludn-gold/30 flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={14} /> إضافة فئة جديدة...
                </button>
              </div>
            </div>

            <input value={ctx.newWdQ} onChange={(e) => ctx.setNewWdQ(e.target.value)} className={`${FIELD} bg-ludn-surface font-black`} placeholder="اكتب نص السؤال الاستراتيجي هنا..." />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <input value={ctx.wdOpt1} onChange={(e) => ctx.setWdOpt1(e.target.value)} className={optField(ctx.wdCorrectOpt === 1)} placeholder="الخيار الأول" />
              <input value={ctx.wdOpt2} onChange={(e) => ctx.setWdOpt2(e.target.value)} className={optField(ctx.wdCorrectOpt === 2)} placeholder="الخيار الثاني" />
              <input value={ctx.wdOpt3} onChange={(e) => ctx.setWdOpt3(e.target.value)} className={optField(ctx.wdCorrectOpt === 3)} placeholder="الخيار الثالث" />
            </div>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                <div className={GROUP}>
                  <span className={GROUP_LABEL}>الإجابة الصحيحة:</span>
                  {[1, 2, 3].map((num) => (
                    <button key={num} type="button" onClick={() => ctx.setWdCorrectOpt(num)} className={`min-h-9 px-3.5 text-sm font-black rounded-lg border transition-colors ${ctx.wdCorrectOpt === num ? CORRECT : GROUP_IDLE}`}>الخيار {num}</button>
                  ))}
                </div>

                <div className={GROUP}>
                  <span className={GROUP_LABEL}>الصعوبة:</span>
                  {(["سهل", "متوسط", "صعب"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => ctx.setWdDifficulty(level)}
                      className={`min-h-9 px-3.5 text-sm font-black rounded-lg border transition-colors ${ctx.wdDifficulty === level ? DIFFICULTY_ACTIVE[level] : GROUP_IDLE}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={ctx.addWdQuestion}
                  disabled={!ctx.newWdQ.trim() || !ctx.wdOpt1.trim() || !ctx.wdOpt2.trim() || !ctx.wdOpt3.trim()}
                  className={`${BTN_GOLD} flex-1`}
                >
                  {ctx.editingWdQuestionDbId ? <Edit size={18} /> : null}
                  <span>{ctx.editingWdQuestionDbId ? "حفظ التعديلات" : "حفظ السؤال بالدولة"}</span>
                </button>
                {ctx.editingWdQuestionDbId && (
                  <button
                    onClick={ctx.cancelEditWdQuestion}
                    className={BTN_SOFT}
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <h4 className="font-black text-lg">الأسئلة المسجلة:</h4>
            {ctx.wdCountries.find((x: any) => x.id === ctx.managingQuestionsFor)?.questions?.length === 0 ? (
              <div className={EMPTY}>
                <HelpCircle size={52} className="opacity-30" />
                <p>لا توجد أسئلة مضافة لهذه الدولة حتى الآن.</p>
              </div>
            ) : (
              ctx.wdCountries.find((x: any) => x.id === ctx.managingQuestionsFor)?.questions?.map((q: any, i: number) => (
                <div key={i} className="p-3.5 md:p-5 rounded-2xl bg-ludn-surface-2 border border-ludn-line grid gap-3.5 hover:border-ludn-gold/50 transition-colors">

                  {/* 1. السطر الأول: الفئات فوق السؤال + خيار إضافة فئة جديدة + أزرار التعديل والحذف */}
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start pb-3 border-b border-ludn-line">
                    <div className="grid gap-1.5">
                      <span className="text-xs font-black text-ludn-gold-text">فئة السؤال (المجال):</span>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {(ctx.allWdCategories || ctx.defaultWdCategories || ["رياضة", "دين", "تاريخ", "علوم", "جغرافيا", "معلومات عامة"]).map((cat: string) => {
                          const isSelected = (q.category || "معلومات عامة") === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => ctx.updateWdQuestionCategory(q.dbId, cat)}
                              className={`${chip(isSelected)} min-h-8 text-xs px-3`}
                            >
                              {cat}
                            </button>
                          );
                        })}
                        {/* خيار إضافة فئة جديدة بدلا من prompt */}
                        <button
                          type="button"
                          onClick={() => ctx.openAddCategoryModal(q.dbId)}
                          className="shrink-0 min-h-8 px-3 rounded-full text-xs font-black text-ludn-gold-text bg-ludn-gold/10 hover:bg-ludn-gold/20 border border-ludn-gold/30 flex items-center gap-1 transition-colors"
                        >
                          <Plus size={12} /> إضافة فئة جديدة...
                        </button>
                      </div>
                    </div>

                    {/* أزرار تعديل السؤال وحذفه */}
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => ctx.startEditingWdQuestion(q)}
                        className={BTN_SM_SOFT}
                        title="تعديل السؤال والخيارات"
                      >
                        <Edit size={15} />
                        <span>تعديل السؤال</span>
                      </button>
                      <button
                        onClick={() => ctx.deleteWdQuestion(i)}
                        className={ICON_BTN_DANGER}
                        title="حذف السؤال"
                        aria-label="حذف السؤال"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* 2. السطر الثاني: نص السؤال */}
                  <div className="flex items-start gap-2.5">
                    <span className="text-ludn-muted font-black text-lg shrink-0 tabular-nums">{i + 1}-</span>
                    <span className="font-black text-lg leading-relaxed break-words min-w-0">{q.q}</span>
                  </div>

                  {/* 3. السطر الثالث: خيارات الإجابات */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="w-full text-xs font-bold text-ludn-muted">انقر لتحديد الإجابة الصحيحة:</span>
                    {q.options.map((opt: string, oIdx: number) => {
                      const isCorrect = opt === q.a;
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => ctx.updateWdQuestionAnswer(q.dbId, opt)}
                          title="انقر لتحديد هذا الخيار كإجابة صحيحة"
                          className={`min-h-10 text-sm font-bold px-4 rounded-xl border transition-colors cursor-pointer flex items-center gap-1 ${
                            isCorrect ? CORRECT : "bg-ludn-surface border-ludn-line hover:border-ludn-green"
                          }`}
                        >
                          {opt} {isCorrect && <Check size={16} />}
                        </button>
                      );
                    })}
                  </div>

                  {/* 4. السطر الرابع: خيارات مستوى الصعوبة تحت الإجابات */}
                  <div className={`${GROUP} sm:w-fit`}>
                    <span className={GROUP_LABEL}>مستوى الصعوبة:</span>
                    {(["سهل", "متوسط", "صعب"] as const).map((level) => {
                      const active = (q.difficulty || "متوسط") === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => ctx.updateWdQuestionDifficulty(q.dbId, level)}
                          className={`min-h-8 px-3 text-xs font-black rounded-lg border transition-colors ${active ? DIFFICULTY_ACTIVE[level] : GROUP_IDLE}`}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* نافذة منبثقة لإضافة فئة جديدة */}
      {ctx.isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-[200] grid place-items-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" dir="rtl">
          <div className={`${PANEL} ludn-shadow max-w-md w-full grid gap-5 animate-in zoom-in-95`}>
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-ludn-line">
              <div className="flex items-center gap-3">
                <span className={TITLE_ICON}><FolderPlus size={20} /></span>
                <div>
                  <h3 className="font-display text-[22px] leading-tight">إضافة فئة جديدة</h3>
                  <p className="text-xs font-bold text-ludn-muted">ستضاف الفئة لقائمة الخيارات الدائمة فوراً</p>
                </div>
              </div>
              <button
                onClick={ctx.closeAddCategoryModal}
                className={ICON_BTN}
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3">
              <label className="text-xs font-black text-ludn-muted">اسم الفئة الجديدة:</label>
              <input
                autoFocus
                type="text"
                value={ctx.newCategoryModalInput}
                onChange={(e) => ctx.setNewCategoryModalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") ctx.handleAddNewWdCategory(ctx.newCategoryModalInput);
                }}
                placeholder="اكتب اسم الفئة هنا (مثال: سينما، تكنولوجيا)..."
                className={FIELD}
              />

              {/* فئات مقترحة بنقرة واحدة */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] font-bold text-ludn-muted w-full mb-1">اقتراحات سريعة بنقرة واحدة:</span>
                {["تكنولوجيا", "سينما", "رياضة إلكترونية", "أدب وفنون", "اقتصاد", "سياسة", "سيارات"].map((sugg) => (
                  <button
                    key={sugg}
                    type="button"
                    onClick={() => ctx.setNewCategoryModalInput(sugg)}
                    className={`${chip(false)} min-h-8 text-xs px-3`}
                  >
                    + {sugg}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                disabled={!ctx.newCategoryModalInput.trim()}
                onClick={() => ctx.handleAddNewWdCategory(ctx.newCategoryModalInput)}
                className={`${BTN_GOLD} flex-1`}
              >
                حفظ وإضافة للقائمة
              </button>
              <button
                onClick={ctx.closeAddCategoryModal}
                className={BTN_SOFT}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
