"use client";
import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

import { useCastleWarAdmin } from "@/hooks/admin/castle-war/useCastleWarAdmin";
import AdminShell from "@/components/admin/layout/AdminShell";
import { PANEL } from "@/components/admin/layout/adminUi";
import CastleWarHeader from "@/components/admin/castle-war/CastleWarHeader";
import CastleWarTabs from "@/components/admin/castle-war/CastleWarTabs";
import CastleWarSimpleCategory from "@/components/admin/castle-war/CastleWarSimpleCategory";
import CastleWarGeneralCategory from "@/components/admin/castle-war/CastleWarGeneralCategory";

export default function CastleWarAdmin() {
  const ctx = useCastleWarAdmin();

  return (
    <AdminShell>
      {/* تنبيه التوست */}
      {ctx.toast && (
        <div
          className={`fixed top-[calc(5rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl ludn-shadow z-[100] font-black text-sm flex items-center gap-2 animate-in slide-in-from-top-4 ${ctx.toast.type === "success" ? "bg-ludn-green text-white" : "bg-rose-500 text-white"}`}
        >
          {ctx.toast.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {ctx.toast.msg}
        </div>
      )}

      <CastleWarHeader exportCSV={ctx.exportCSV} importCSV={ctx.importCSV} />

      <section className={`${PANEL} grid gap-4`}>
        <CastleWarTabs cwActiveSubTab={ctx.cwActiveSubTab} setCwActiveSubTab={ctx.setCwActiveSubTab} />
        <CastleWarSimpleCategory ctx={ctx} />
        <CastleWarGeneralCategory ctx={ctx} />
      </section>
    </AdminShell>
  );
}
