"use client";

import React from "react";

import { useWorldDominationAdmin } from "@/hooks/admin/world-domination/useWorldDominationAdmin";
import AdminShell from "@/components/admin/layout/AdminShell";
import WorldDominationHeader from "@/components/admin/world-domination/WorldDominationHeader";
import WorldDominationTabs from "@/components/admin/world-domination/WorldDominationTabs";
import WorldDominationMapTab from "@/components/admin/world-domination/WorldDominationMapTab";
import WorldDominationChallengesTab from "@/components/admin/world-domination/WorldDominationChallengesTab";

import GamingLoadingScreen from "@/components/admin/layout/GamingLoadingScreen";

export default function WorldDominationAdmin() {
  const ctx = useWorldDominationAdmin();

  if (ctx.isLoading) {
    return (
      <GamingLoadingScreen
        title="جاري تجهيز خريطة التحدي ومصانع التحكم..."
        subtitle="يتم تحميل أسئلة الدول والتحديات المسجلة بالسيرفر..."
      />
    );
  }

  return (
    <AdminShell>
      <WorldDominationHeader exportCSV={ctx.exportCSV} importCSV={ctx.importCSV} />

      <section className="grid gap-5">
        <WorldDominationTabs wdActiveSubTab={ctx.wdActiveSubTab} setWdActiveSubTab={ctx.setWdActiveSubTab} />

        <WorldDominationMapTab ctx={ctx} />
        <WorldDominationChallengesTab ctx={ctx} />
      </section>
    </AdminShell>
  );
}
