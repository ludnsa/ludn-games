"use client";
import React from "react";
import { Download, Upload, UploadCloud, Check } from "lucide-react";
import { FIELD, BTN_SM_GOLD, BTN_SM_SOFT, BTN_SM_DANGER } from "@/components/admin/layout/adminUi";

export default function CastleWarSimpleCategory({ ctx }: { ctx: any }) {
  const {
    cwActiveSubTab, cw30SecDB, cw5SecDB, cwTeamDB,
    newCw30Sec, setNewCw30Sec, newCw5Sec, setNewCw5Sec, newCwTeam, setNewCwTeam,
    selectedCw30Sec, setSelectedCw30Sec, selectedCw5Sec, setSelectedCw5Sec, selectedCwTeam, setSelectedCwTeam,
    saveCw30Data, saveCw5Data, saveCwTeamData, showToast,
    exportToJsonFile, handleJsonImport, handleExcelUpload
  } = ctx;

  if (!["30sec", "5sec", "team"].includes(cwActiveSubTab)) return null;

  const db = cwActiveSubTab === "30sec" ? cw30SecDB : cwActiveSubTab === "5sec" ? cw5SecDB : cwTeamDB;
  const selected = cwActiveSubTab === "30sec" ? selectedCw30Sec : cwActiveSubTab === "5sec" ? selectedCw5Sec : selectedCwTeam;
  const setSelect = cwActiveSubTab === "30sec" ? setSelectedCw30Sec : cwActiveSubTab === "5sec" ? setSelectedCw5Sec : setSelectedCwTeam;

  const val = cwActiveSubTab === "30sec" ? newCw30Sec : cwActiveSubTab === "5sec" ? newCw5Sec : newCwTeam;
  const setVal = cwActiveSubTab === "30sec" ? setNewCw30Sec : cwActiveSubTab === "5sec" ? setNewCw5Sec : setNewCwTeam;
  const saveFn = cwActiveSubTab === "30sec" ? saveCw30Data : cwActiveSubTab === "5sec" ? saveCw5Data : saveCwTeamData;

  const handleAdd = () => {
    if (val.trim()) {
      saveFn(Array.from(new Set([...db, val.trim()]))).then(() => {
        setVal("");
        showToast("تمت الإضافة");
      });
    }
  };

  return (
    <div className="animate-in fade-in grid gap-4">
      <div className="rounded-2xl bg-ludn-surface-2 p-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex gap-2">
          <input
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="أضف موضوع/تحدي جديد..."
            className={`${FIELD} flex-1 bg-ludn-surface`}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          />
          <button onClick={handleAdd} className={`${BTN_SM_GOLD} min-h-12 px-5`}>
            حفظ
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selected.length > 0 && (
            <button
              onClick={() => {
                if (confirm("متأكد من الحذف؟")) {
                  saveFn(db.filter((w: string) => !selected.includes(w))).then(() => {
                    setSelect([]);
                    showToast("تم الحذف");
                  });
                }
              }}
              className={BTN_SM_DANGER}
            >
              حذف ({selected.length})
            </button>
          )}
          <button
            onClick={() => setSelect(selected.length === db.length && db.length > 0 ? [] : [...db])}
            className={BTN_SM_SOFT}
          >
            تحديد الكل
          </button>
          <button
            onClick={() => exportToJsonFile(db, `castle_war_${cwActiveSubTab}`)}
            className={BTN_SM_SOFT}
          >
            <Download size={15} /> تصدير
          </button>
          <label className={`${BTN_SM_SOFT} cursor-pointer`}>
            <Upload size={15} /> استيراد
            <input type="file" accept=".json" className="hidden" onChange={(e) => handleJsonImport(e, saveFn)} />
          </label>
          <label className={`${BTN_SM_GOLD} cursor-pointer`}>
            <UploadCloud size={15} /> إكسل
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={(e) => handleExcelUpload(e, db, saveFn, "تحدي")} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 content-start md:max-h-[70vh] md:overflow-y-auto custom-scroll md:pe-1">
        {db.length === 0 ? (
          <p className="col-span-full text-ludn-muted text-center w-full py-8 text-sm font-bold">
            لا يوجد بيانات، قم بالإضافة للبدء.
          </p>
        ) : (
          db.map((w: string, wIdx: number) => {
            const isSelected = selected.includes(w);
            return (
              <div
                key={wIdx}
                onClick={() => setSelect((prev: string[]) => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w])}
                className={`cursor-pointer border p-3.5 rounded-xl flex items-center gap-3 transition-colors text-sm font-bold ${isSelected ? "bg-ludn-gold/12 border-ludn-gold" : "bg-ludn-surface border-ludn-line hover:border-ludn-gold/60"}`}
              >
                <div className={`w-5 h-5 shrink-0 rounded-md grid place-items-center border transition-colors ${isSelected ? "bg-ludn-gold border-ludn-gold text-ludn-gold-ink" : "border-ludn-muted/50"}`}>
                  {isSelected && <Check size={14} strokeWidth={3} />}
                </div>
                <div className="flex items-start gap-1.5 w-full min-w-0">
                  <span className="text-ludn-muted font-black text-[11px] mt-0.5 tabular-nums">{wIdx + 1}-</span>
                  <span className="whitespace-normal leading-relaxed break-words min-w-0">{w}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
