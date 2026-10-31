"use client";
import React, { useRef } from "react";
import { Database, Download, Upload } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/layout/AdminShell";
import { BTN_SM_GOLD, BTN_SM_SOFT } from "@/components/admin/layout/adminUi";

export default function AuctionHeader({
  questionsCount,
  exportCSV,
  importCSV
}: {
  questionsCount: number;
  exportCSV?: () => void;
  importCSV?: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && importCSV) {
      importCSV(file);
      e.target.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <AdminPageHeader
        back
        art="auction"
        title="بنك أسئلة حرب المزايدات"
        subtitle={
          <span className="flex items-center gap-1.5">
            <Database size={15} />
            إجمالي الأسئلة المضافة: {questionsCount}
          </span>
        }
        actions={
          importCSV || exportCSV ? (
            <>
              {importCSV && (
                <button onClick={() => fileInputRef.current?.click()} className={BTN_SM_SOFT}>
                  <Upload size={16} className="text-ludn-gold-text" />
                  <span>استيراد CSV</span>
                </button>
              )}
              {exportCSV && (
                <button onClick={exportCSV} className={BTN_SM_GOLD}>
                  <Download size={16} />
                  <span>تصدير CSV</span>
                </button>
              )}
            </>
          ) : undefined
        }
      />
    </>
  );
}
