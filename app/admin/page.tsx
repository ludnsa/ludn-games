"use client";

import React from "react";
import { LayoutDashboard, DatabaseBackup } from "lucide-react";

import AdminShell, { AdminPageHeader, AdminLogoutButton } from "@/components/admin/layout/AdminShell";
import GamingLoadingScreen from "@/components/admin/layout/GamingLoadingScreen";
import { PANEL, PANEL_TITLE, TITLE_ICON } from "@/components/admin/layout/adminUi";
import ServerStatusButton from "@/components/admin/dashboard/ServerStatusButton";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import AdminStatsSection from "@/components/admin/dashboard/AdminStatsSection";
import AdminBackupSection from "@/components/admin/dashboard/AdminBackupSection";

export default function AdminDashboardMain() {
  const {
    isAuthChecking, wdStats, cwStats, awStats, quizStats,
    handleLogout, handleExportBackup, handleImportBackup, handleMigrateFromOldTables
  } = useAdminDashboard();

  if (isAuthChecking) {
    return <GamingLoadingScreen title="جاري التحقق من الصلاحيات الأمنية..." subtitle="" />;
  }

  return (
    <AdminShell topExtra={<><ServerStatusButton /><AdminLogoutButton onClick={handleLogout} /></>}>
      <AdminPageHeader icon={LayoutDashboard} title="لوحة التحكم المركزية" subtitle="إدارة بنوك المعلومات لجميع الألعاب" />

      <AdminStatsSection wdStats={wdStats} cwStats={cwStats} awStats={awStats} quizStats={quizStats} />

      <section className={`${PANEL} grid gap-4`}>
        <h2 className={PANEL_TITLE}>
          <span className={TITLE_ICON}><DatabaseBackup size={20} /></span>
          النسخ الاحتياطي وإدارة البيانات
        </h2>
        <AdminBackupSection
          handleExportBackup={handleExportBackup}
          handleImportBackup={handleImportBackup}
          handleMigrateFromOldTables={handleMigrateFromOldTables}
        />
      </section>
    </AdminShell>
  );
}
