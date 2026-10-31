"use client";

import React from "react";
import { Users } from "lucide-react";

import AdminShell, { AdminPageHeader, AdminLogoutButton } from "@/components/admin/layout/AdminShell";
import GamingLoadingScreen from "@/components/admin/layout/GamingLoadingScreen";
import ServerStatusButton from "@/components/admin/dashboard/ServerStatusButton";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import AdminUsersSection from "@/components/admin/dashboard/users/AdminUsersSection";

export default function AdminUsersPage() {
  const { isAuthChecking, handleLogout } = useAdminDashboard();

  if (isAuthChecking) {
    return <GamingLoadingScreen title="جاري التحقق من الصلاحيات الأمنية..." subtitle="" />;
  }

  return (
    <AdminShell topExtra={<><ServerStatusButton /><AdminLogoutButton onClick={handleLogout} /></>}>
      <AdminPageHeader back icon={Users} title="إدارة المستخدمين" subtitle="التحكم الكامل بحسابات المسجلين" />
      <AdminUsersSection />
    </AdminShell>
  );
}
