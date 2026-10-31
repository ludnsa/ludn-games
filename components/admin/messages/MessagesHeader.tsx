"use client";
import React from "react";
import { Inbox, LayoutGrid, List } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/layout/AdminShell";

export default function MessagesHeader({ ctx }: { ctx: any }) {
  const { viewMode, setViewMode, messages } = ctx;

  const viewBtn = (active: boolean) =>
    `w-10 h-10 rounded-lg grid place-items-center transition-colors ${active ? "bg-ludn-surface text-ludn-fg shadow-sm" : "text-ludn-muted hover:text-ludn-fg"}`;

  return (
    <AdminPageHeader
      back
      icon={Inbox}
      title="صندوق الرسائل"
      subtitle="الرسائل الواردة من نموذج تواصل معنا"
      actions={
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-ludn-surface-2">
            <button
              onClick={() => setViewMode('cards')}
              className={viewBtn(viewMode === 'cards')}
              title="عرض البطاقات"
              aria-label="عرض البطاقات"
            >
              <LayoutGrid size={19} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={viewBtn(viewMode === 'table')}
              title="عرض الجدول"
              aria-label="عرض الجدول"
            >
              <List size={19} />
            </button>
          </div>

          <div className="h-12 px-4 rounded-xl bg-ludn-surface border border-ludn-line flex items-center gap-2 font-bold text-ludn-muted">
            الإجمالي: <span className="font-display text-[22px] leading-none pt-1 text-ludn-fg tabular-nums">{messages.length}</span>
          </div>
        </div>
      }
    />
  );
}
