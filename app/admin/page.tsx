/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import { Cairo } from "next/font/google";
import { Database, LogOut, Loader2, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

import AdminMessagesNavigation from "./AdminMessagesNavigation";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import ParticleBackground from "@/components/admin/dashboard/ParticleBackground";
import AdminStatsSection from "@/components/admin/dashboard/AdminStatsSection";
import AdminGamesLinks from "@/components/admin/dashboard/AdminGamesLinks";
import AdminBackupSection from "@/components/admin/dashboard/AdminBackupSection";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

export default function AdminDashboardMain() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    isAuthChecking, wdStats, cwStats, awStats,
    handleLogout, handleExportBackup, handleImportBackup
  } = useAdminDashboard();

  if (isAuthChecking) {
    return (
      <div className={`min-h-screen w-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 ${cairo.className}`} dir="rtl">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
        <p className="text-slate-700 dark:text-white font-bold">جاري التحقق من الصلاحيات الأمنية...</p>
      </div>
    );
  }

  return (
    <main className={`min-h-screen relative flex flex-col p-4 md:p-6 w-full ${cairo.className} overflow-x-hidden transition-colors duration-500 bg-slate-50 dark:bg-slate-950`} dir="rtl">

      <ParticleBackground />
      
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col pb-10">
        <header className="flex flex-col md:flex-row items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] p-4 md:p-5 shadow-sm mb-6 gap-4">
          <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto justify-center md:justify-start">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 shrink-0">
              <Database size={24} />
            </div>
            <div className="text-center md:text-right">
              <h1 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white">لوحة التحكم المركزية</h1>
              <p className="text-xs md:text-sm font-bold text-slate-500">إدارة بنوك المعلومات لجميع الألعاب</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-center w-full md:w-auto">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center justify-center w-12 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all shadow-sm"
                title="تغيير المظهر"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}

            <AdminMessagesNavigation />
            
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold px-4 md:px-5 rounded-xl transition-all border border-rose-100 dark:border-rose-900/30 h-12"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </button>
          </div>
        </header>

        <section className="flex-1 flex flex-col items-center">
          <AdminStatsSection wdStats={wdStats} cwStats={cwStats} awStats={awStats} />
          <AdminGamesLinks />
          <AdminBackupSection handleExportBackup={handleExportBackup} handleImportBackup={handleImportBackup} />
        </section>
      </div>
    </main>
  );
}