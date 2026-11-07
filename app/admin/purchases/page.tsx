"use client";

import React from "react";
import { Receipt } from "lucide-react";

import AdminShell, { AdminPageHeader, AdminLogoutButton } from "@/components/admin/layout/AdminShell";
import GamingLoadingScreen from "@/components/admin/layout/GamingLoadingScreen";
import ServerStatusButton from "@/components/admin/dashboard/ServerStatusButton";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import AdminPurchasesSection from "@/components/admin/dashboard/purchases/AdminPurchasesSection";

export default function AdminPurchasesPage() {
  const { isAuthChecking, handleLogout } = useAdminDashboard();

  if (isAuthChecking) {
    return <GamingLoadingScreen title="جاري التحقق من الصلاحيات الأمنية..." subtitle="" />;
  }

  return (
    <AdminShell topExtra={<><ServerStatusButton /><AdminLogoutButton onClick={handleLogout} /></>}>
      <AdminPageHeader back icon={Receipt} title="المشتريات" subtitle="كل عملية دفع ناجحة في الموقع" />
      <AdminPurchasesSection />
    </AdminShell>
  );
}
