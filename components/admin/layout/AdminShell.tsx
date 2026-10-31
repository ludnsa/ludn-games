"use client";
import React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ArrowRight, LogOut, Moon, Sun, type LucideIcon } from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import { GameArt, type GameArtKind } from "@/components/home/GameArt";

/**
 * إطار لوحة التحكم: شريط علوي (الشعار + الوضع الليلي + أزرار إضافية) وقائمة الأقسام
 * (شريط يتمرر بالعرض على الجوال، وقائمة جانبية على الكمبيوتر).
 */
export default function AdminShell({ children, topExtra }: { children: React.ReactNode; topExtra?: React.ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <main className="min-h-screen relative overflow-x-clip ludn-glow-bg text-ludn-fg" dir="rtl">
      <header className="sticky top-0 z-50 bg-ludn-header backdrop-blur-xl border-b border-ludn-line pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-7xl mx-auto h-16 px-4 flex items-center gap-2">
          <Link href="/admin" className="flex items-center gap-2.5 me-auto shrink-0 transition-transform active:scale-95">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ludn-logo.webp" alt="منصة ألعاب لدن" width={46} height={40} className="h-10 w-auto" />
            <span className="grid gap-1 leading-none">
              <span className="font-display text-[20px] pt-1">ألعاب لدن</span>
              <span className="text-[11px] font-bold text-ludn-gold-text">لوحة التحكم</span>
            </span>
          </Link>
          {topExtra}
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label="تبديل الوضع الليلي والنهاري"
            className="w-10 h-10 shrink-0 rounded-xl bg-ludn-surface border border-ludn-line grid place-items-center transition-transform active:scale-95"
          >
            {/* الأيقونة من كلاس dark نفسه، فما تحتاج انتظار تحميل الصفحة */}
            <Sun size={19} className="hidden dark:block text-ludn-gold-text" />
            <Moon size={19} className="dark:hidden" />
          </button>
        </div>
      </header>

      <div aria-hidden className="ludn-lattice absolute inset-x-0 top-0 h-[420px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 pt-4 lg:pt-8 pb-12 grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8 lg:items-start">
        <AdminSidebar />
        <div className="min-w-0 grid gap-5 content-start">{children}</div>
      </div>
    </main>
  );
}

/** زر الخروج بالشريط العلوي (أيقونة على الجوال، ومعها النص على الشاشات الأكبر) */
export function AdminLogoutButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="تسجيل الخروج"
      className="shrink-0 h-10 px-2.5 sm:px-3.5 rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white font-bold text-sm flex items-center gap-1.5 transition-colors"
    >
      <LogOut size={18} />
      <span className="hidden sm:inline">تسجيل الخروج</span>
    </button>
  );
}

/** عنوان صفحة الإدارة: أيقونة (أو رسمة اللعبة) + عنوان + وصف، والأزرار على الطرف */
export function AdminPageHeader({
  title,
  subtitle,
  icon: Icon,
  art,
  actions,
  back = false,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  art?: GameArtKind;
  actions?: React.ReactNode;
  back?: boolean;
}) {
  return (
    <header className="grid gap-3">
      {back && (
        <Link
          href="/admin"
          className="w-fit h-9 ps-2.5 pe-3.5 rounded-xl bg-ludn-surface border border-ludn-line text-sm font-bold text-ludn-muted hover:text-ludn-fg flex items-center gap-1.5 transition-colors"
        >
          <ArrowRight size={17} /> رجوع
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="relative w-14 h-14 shrink-0 rounded-2xl overflow-hidden bg-ludn-surface border border-ludn-line text-ludn-gold-text grid place-items-center">
            {art ? <GameArt kind={art} /> : Icon ? <Icon size={26} /> : null}
          </span>
          <div className="min-w-0 grid gap-0.5">
            <h1 className="font-display text-[28px] md:text-[36px] leading-[1.15] text-balance">{title}</h1>
            {subtitle && <div className="text-sm font-bold text-ludn-muted">{subtitle}</div>}
          </div>
        </div>
        {actions && <div className="w-full sm:w-auto flex flex-wrap gap-2 *:flex-1 sm:*:flex-none">{actions}</div>}
      </div>
    </header>
  );
}
