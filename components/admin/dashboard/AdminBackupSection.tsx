"use client";
import React from "react";
import { Download, Upload } from "lucide-react";
import { BTN_GOLD, BTN_SOFT } from "@/components/admin/layout/adminUi";

export default function AdminBackupSection({ handleExportBackup, handleImportBackup, handleMigrateFromOldTables }: any) {
  return (
    <div className="w-full max-w-xl grid gap-4">
      <div className="grid gap-2">
        <h3 className="text-sm font-black text-ludn-muted">النسخ الاحتياطي</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={handleExportBackup} className={BTN_GOLD}>
            <Download size={18} /> حفظ
          </button>
          <label className={`${BTN_SOFT} cursor-pointer`}>
            <Upload size={18} /> استعادة
            <input type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
          </label>
        </div>
      </div>

      <div className="pt-4 border-t border-ludn-line grid gap-2">
        <button onClick={handleMigrateFromOldTables} className={`${BTN_SOFT} w-full text-sm`}>
          نقل البيانات من الجداول القديمة إلى الجديدة
        </button>
        <p className="text-xs font-bold text-ludn-muted text-center">
          اضغط هنا لمرة واحدة لنقل الأسئلة السابقة إلى الهيكلة الجديدة
        </p>
      </div>
    </div>
  );
}
