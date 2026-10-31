"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  ChevronDown,
  Home,
  Info,
  Gamepad2,
  LayoutGrid,
  BookOpen,
  User,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

type ScrollFn = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => void;

type NavItem =
  | { label: string; Icon: LucideIcon; section: string }
  | { label: string; Icon: LucideIcon; href: string };

const NAV: NavItem[] = [
  { label: "الرئيسية", Icon: Home, section: "hero" },
  { label: "عن المنصة", Icon: Info, section: "about-section" },
  { label: "الألعاب", Icon: Gamepad2, section: "games-section" },
  { label: "باقات الألعاب", Icon: Zap, href: "/packages" },
  { label: "كيف تلعب؟", Icon: BookOpen, href: "/guides" },
];

const ICON_BTN =
  "w-10 h-10 shrink-0 rounded-xl bg-ludn-surface border border-ludn-line text-ludn-fg grid place-items-center transition-transform active:scale-95";

/**
 * الهيدر العام (رفيع وثابت فوق) + شريط تبويب ثابت تحت على الجوال والتابلت.
 * scrollToSection: بالرئيسية روابط الأقسام تنزل لها، وبباقي الصفحات ترجع للرئيسية.
 * afterLogout: صفحات الحساب (حسابي وألعابي) ترجع للرئيسية بعد الخروج، زي ما كانت.
 */
export const TopNav = ({ scrollToSection, afterLogout }: { scrollToSection?: ScrollFn; afterLogout?: () => void }) => {
  const { resolvedTheme, setTheme } = useTheme();
  const { userSession, profile, logout } = useAuth();
  const pathname = usePathname();
  const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");
  const signedIn = Boolean(userSession && profile);

  const renderNavLink = (item: NavItem, className: string, onPick?: () => void) => {
    const body = (
      <>
        <item.Icon size={17} className="shrink-0 text-ludn-gold-text" /> <span>{item.label}</span>
      </>
    );
    if ("href" in item) {
      return (
        <Link key={item.label} href={item.href} onClick={onPick} className={className}>
          {body}
        </Link>
      );
    }
    return (
      <a
        key={item.label}
        href={`/#${item.section}`}
        onClick={(e) => {
          onPick?.();
          if (scrollToSection) scrollToSection(e, item.section);
        }}
        className={className}
      >
        {body}
      </a>
    );
  };

  const tabs: { label: string; Icon: LucideIcon; href: string; section?: string; active: boolean }[] = [
    { label: "الرئيسية", Icon: Home, href: "/", section: "hero", active: pathname === "/" },
    { label: "الألعاب", Icon: LayoutGrid, href: "/#games-section", section: "games-section", active: false },
    { label: "الباقات", Icon: Zap, href: "/packages", active: pathname === "/packages" },
    { label: "ألعابي", Icon: Gamepad2, href: "/my-games", active: pathname === "/my-games" },
    { label: "حسابي", Icon: User, href: signedIn ? "/profile" : "/player", active: pathname === "/profile" || pathname === "/player" },
  ];

  return (
    <>
      {/* ضغطة برا قائمة الحساب تقفلها — برا الهيدر لأن الـ blur فيه يحبس أي fixed داخله */}
      {isAvatarDropdownOpen && <div className="fixed inset-0 z-[59]" onClick={() => setIsAvatarDropdownOpen(false)} />}

      <header className="fixed inset-x-0 top-0 z-[60] bg-ludn-header backdrop-blur-xl border-b border-ludn-line pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-6xl mx-auto h-16 px-4 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2.5 me-auto shrink-0 transition-transform active:scale-95">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ludn-logo.webp" alt="منصة ألعاب لدن" width={46} height={40} className="h-10 w-auto" />
            <span className="font-display text-[22px] leading-none pt-1 text-ludn-fg">ألعاب لدن</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 me-2">
            {NAV.map((item) =>
              renderNavLink(
                item,
                "flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm text-ludn-muted hover:text-ludn-fg hover:bg-ludn-surface-2 transition-colors"
              )
            )}
          </nav>

          <button type="button" onClick={toggleTheme} aria-label="تبديل الوضع الليلي والنهاري" className={ICON_BTN}>
            {mounted ? isDark ? <Sun size={19} className="text-ludn-gold-text" /> : <Moon size={19} /> : <span className="w-[19px] h-[19px]" />}
          </button>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="القائمة"
            aria-expanded={isMobileMenuOpen}
            className={`lg:hidden ${ICON_BTN}`}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {signedIn && profile ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAvatarDropdownOpen(!isAvatarDropdownOpen)}
                aria-expanded={isAvatarDropdownOpen}
                className="h-10 flex items-center gap-1.5 ps-1 pe-2 rounded-xl bg-ludn-surface border border-ludn-line text-ludn-fg"
              >
                <span className="w-8 h-8 rounded-lg bg-ludn-gold text-ludn-gold-ink font-black text-xs grid place-items-center uppercase">
                  {profile.full_name?.split(" ")[0]?.[0]}
                  {profile.full_name?.split(" ")[1]?.[0] || ""}
                </span>
                <span className="text-sm font-black hidden sm:inline-block max-w-[100px] truncate">{profile.full_name}</span>
                <ChevronDown size={14} className={`transition-transform text-ludn-muted ${isAvatarDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isAvatarDropdownOpen && (
                <>
                  <div className="absolute left-0 mt-2 w-60 z-50 rounded-2xl bg-ludn-surface border border-ludn-line ludn-shadow overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-ludn-line bg-ludn-surface-2">
                      <p className="text-xs font-bold text-ludn-muted">مسجل الدخول كـ</p>
                      <p className="text-sm font-black text-ludn-fg truncate">{profile.email}</p>
                    </div>
                    <div className="flex flex-col py-1.5 font-bold text-ludn-fg">
                      <Link href="/profile" className="px-4 py-2.5 hover:bg-ludn-surface-2 transition-colors">حسابي</Link>
                      <Link href="/my-games" className="px-4 py-2.5 hover:bg-ludn-surface-2 transition-colors">ألعابي</Link>
                      <Link href="/packages" className="px-4 py-2.5 hover:bg-ludn-surface-2 transition-colors">باقات الألعاب</Link>
                      <button
                        type="button"
                        onClick={() => {
                          logout().then(afterLogout);
                          setIsAvatarDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 border-t border-ludn-line mt-1 hover:bg-ludn-surface-2 hover:text-red-500 transition-colors"
                      >
                        <span>خروج</span>
                        <LogOut size={18} className="text-ludn-muted" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/player"
              aria-label="دخول المنظم"
              className="h-10 shrink-0 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-ludn-gold text-ludn-gold-ink font-black text-sm transition-transform active:scale-95"
            >
              <User size={18} strokeWidth={2.5} /> <span className="hidden sm:inline">دخول المنظم</span>
            </Link>
          )}
        </div>
      </header>

      {isMobileMenuOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-[55]" onClick={() => setIsMobileMenuOpen(false)} />
          <nav className="lg:hidden fixed inset-x-3 top-[calc(4.5rem+env(safe-area-inset-top,0px))] z-[58] rounded-2xl bg-ludn-surface border border-ludn-line ludn-shadow p-2 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
            {NAV.map((item) =>
              renderNavLink(
                item,
                "flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-ludn-fg hover:bg-ludn-surface-2 transition-colors",
                () => setIsMobileMenuOpen(false)
              )
            )}
          </nav>
        </>
      )}

      {/* شريط التبويب تحت — globals.css يترك له مكان آخر الصفحة */}
      <nav
        aria-label="التنقل السريع"
        className="ludn-tabbar lg:hidden fixed inset-x-0 bottom-0 z-[60] bg-ludn-header backdrop-blur-xl border-t border-ludn-line pb-[env(safe-area-inset-bottom,0px)]"
      >
        <ul className="grid grid-cols-5 max-w-lg mx-auto">
          {tabs.map((tab) => {
            const className = `h-16 flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors ${
              tab.active ? "text-ludn-gold-text" : "text-ludn-muted"
            }`;
            const body = (
              <>
                <tab.Icon size={23} className={tab.active ? "drop-shadow-[0_0_10px_var(--ludn-glow)]" : ""} />
                {tab.label}
              </>
            );
            return (
              <li key={tab.label}>
                {tab.section && scrollToSection ? (
                  <a href={tab.href} onClick={(e) => scrollToSection(e, tab.section!)} aria-current={tab.active ? "page" : undefined} className={className}>
                    {body}
                  </a>
                ) : (
                  <Link href={tab.href} aria-current={tab.active ? "page" : undefined} className={className}>
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};
