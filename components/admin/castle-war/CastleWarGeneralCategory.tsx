"use client";
import React from "react";
import { Download, Upload, UploadCloud, Check, Edit } from "lucide-react";
import { FIELD, BTN_SM_GOLD, BTN_SM_SOFT, BTN_SM_DANGER, ICON_BTN, CORRECT } from "@/components/admin/layout/adminUi";

// خانة الخيار: تتلون بالأخضر لو هي الإجابة الصحيحة
const optField = (correct: boolean) =>
  `${FIELD} ${correct ? "border-ludn-green bg-ludn-green/10" : "bg-ludn-surface"}`;

export default function CastleWarGeneralCategory({ ctx }: { ctx: any }) {
  const {
    cwActiveSubTab, cwGenDB, selectedCwGen, setSelectedCwGen,
    newCwGenQuestion, setNewCwGenQuestion, genOpt1, setGenOpt1,
    genOpt2, setGenOpt2, genOpt3, setGenOpt3, correctGenOpt, setCorrectGenOpt,
    addManualCwGenQA, exportToJsonFile, handleJsonImport, saveCwGenData, handleCwGenFileUpload, showToast,
    editingGenIdx, startEditingCwGen, cancelEditingCwGen
  } = ctx;

  if (cwActiveSubTab !== "general") return null;

  const isEditing = editingGenIdx !== null && editingGenIdx !== undefined;

  return (
    <div className="animate-in fade-in grid gap-4">
      <div className="rounded-2xl bg-ludn-surface-2 p-3 md:p-4 grid gap-3">
        <input
          type="text"
          value={newCwGenQuestion}
          onChange={(e) => setNewCwGenQuestion(e.target.value)}
          placeholder="اكتب السؤال هنا..."
          className={`${FIELD} bg-ludn-surface`}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <input type="text" value={genOpt1} onChange={(e) => setGenOpt1(e.target.value)} placeholder="الخيار الأول" className={optField(correctGenOpt === 1)} />
          <input type="text" value={genOpt2} onChange={(e) => setGenOpt2(e.target.value)} placeholder="الخيار الثاني" className={optField(correctGenOpt === 2)} />
          <input type="text" value={genOpt3} onChange={(e) => setGenOpt3(e.target.value)} placeholder="الخيار الثالث" className={optField(correctGenOpt === 3)} />
        </div>

        <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
          <div className="flex gap-1 p-1 rounded-xl bg-ludn-surface">
            {[1, 2, 3].map((num) => (
              <button key={num} onClick={() => setCorrectGenOpt(num)} className={`flex-1 min-h-10 px-4 text-sm font-black rounded-lg border transition-colors ${correctGenOpt === num ? CORRECT : "border-transparent text-ludn-muted hover:text-ludn-fg"}`}>
                {num} صح
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap lg:justify-end">
            <button onClick={addManualCwGenQA} className={`${BTN_SM_GOLD} flex-1 sm:flex-none min-w-28`}>
              {isEditing ? <Edit size={15} /> : null}
              <span>{isEditing ? "حفظ التعديل" : "إضافة"}</span>
            </button>
            {isEditing && (
              <button onClick={cancelEditingCwGen} className={BTN_SM_SOFT}>
                إلغاء
              </button>
            )}
            <button onClick={() => exportToJsonFile(cwGenDB, "castle_war_general")} className={BTN_SM_SOFT} title="تصدير JSON" aria-label="تصدير JSON"><Download size={16} /></button>
            <label className={`${BTN_SM_SOFT} cursor-pointer`} title="استيراد JSON" aria-label="استيراد JSON">
              <Upload size={16} />
              <input type="file" accept=".json" className="hidden" onChange={(e) => handleJsonImport(e, saveCwGenData)} />
            </label>
            <label className={`${BTN_SM_SOFT} cursor-pointer`} title="رفع إكسل">
              <UploadCloud size={16} /> إكسل
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleCwGenFileUpload} />
            </label>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-2 px-1">
        <span className="text-sm font-black text-ludn-muted">بنك الأسئلة العامة ({cwGenDB.length})</span>
        <div className="flex gap-2 items-center">
          {selectedCwGen.length > 0 && (
            <button
              onClick={() => {
                if (confirm("متأكد من الحذف؟")) {
                  saveCwGenData(cwGenDB.filter((_: any, i: number) => !selectedCwGen.includes(i)));
                  setSelectedCwGen([]);
                  showToast("تم الحذف");
                }
              }}
              className={BTN_SM_DANGER}
            >
              حذف ({selectedCwGen.length})
            </button>
          )}
          <button
            onClick={() => setSelectedCwGen(selectedCwGen.length === cwGenDB.length && cwGenDB.length > 0 ? [] : cwGenDB.map((_: any, i: number) => i))}
            className={BTN_SM_SOFT}
          >
            تحديد الكل
          </button>
        </div>
      </div>

      <div className="grid gap-2.5 content-start md:max-h-[70vh] md:overflow-y-auto custom-scroll md:pe-1">
        {cwGenDB.length === 0 ? (
          <p className="text-ludn-muted text-center w-full py-8 text-sm font-bold">لا يوجد أسئلة عامة.</p>
        ) : (
          cwGenDB.map((item: any, idx: number) => {
            const isSelected = selectedCwGen.includes(idx);
            return (
              <div
                key={idx}
                className={`border p-3.5 rounded-2xl flex items-start justify-between gap-3 transition-colors ${isSelected ? "bg-ludn-gold/12 border-ludn-gold" : "bg-ludn-surface border-ludn-line hover:border-ludn-gold/60"}`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedCwGen((prev: number[]) => prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx])}>
                  <div className={`w-5 h-5 rounded-md shrink-0 grid place-items-center border mt-1 transition-colors ${isSelected ? "bg-ludn-gold border-ludn-gold text-ludn-gold-ink" : "border-ludn-muted/50"}`}>
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                  <span className="font-black text-ludn-muted text-sm mt-0.5 tabular-nums">{idx + 1}-</span>
                  <div className="flex flex-col gap-2 w-full min-w-0">
                    <span className="font-black leading-relaxed break-words">{item.q}</span>
                    {item.options ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.options.map((opt: string, oIdx: number) => (
                          <span key={oIdx} className={`text-xs px-3 py-1.5 rounded-lg font-bold border ${opt === item.a ? CORRECT : "bg-ludn-surface-2 border-ludn-line text-ludn-muted"}`}>
                            {opt}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="font-black text-ludn-green text-xs bg-ludn-green/10 px-3 py-1.5 rounded-lg w-fit">
                        الجواب: {item.a}
                      </span>
                    )}
                  </div>
                </div>

                {startEditingCwGen && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingCwGen(idx);
                    }}
                    className={ICON_BTN}
                    title="تعديل السؤال"
                    aria-label="تعديل السؤال"
                  >
                    <Edit size={16} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
