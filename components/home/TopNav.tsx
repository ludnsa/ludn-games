"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  ChevronDown,
  Home,
  Info,
  Gamepad2,
  MessageCircle,
  User,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";

export const TopNav = ({ scrollToSection }: { scrollToSection?: (e: React.MouseEvent<HTMLAnchorElement>, id: string) => void }) => {
  const { theme, setTheme } = useTheme();
  const { userSession, profile, logout } = useAuth();
  const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => setMounted(true), []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <>
      <div className="fixed top-4 left-0 right-0 z-[60] w-full max-w-7xl mx-auto px-2 md:px-4">
      <div className="bg-white/95 dark:bg-slate-800/95 rounded-2xl border-4 border-slate-900 dark:border-black p-2 md:p-3 shadow-[6px_6px_0px_#0f172a] dark:shadow-[6px_6px_0px_#000] flex justify-between items-center transition-colors duration-300">
        <Link href="/" className="transition-transform hover:scale-105 active:scale-95 shrink-0 pl-1 md:pl-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="الشعار" className="h-12 md:h-16 object-contain" />
        </Link>

        <nav className="hidden lg:flex items-center gap-1.5 md:gap-3">
          <a href="/#hero" onClick={(e) => scrollToSection ? scrollToSection(e, "hero") : null} className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-[11px] md:text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0">
            <Home size={16} className="text-slate-500 dark:text-slate-400" /> <span>الرئيسية</span>
          </a>
          <a href="/#about-section" onClick={(e) => scrollToSection ? scrollToSection(e, "about-section") : null} className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-[11px] md:text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0">
            <Info size={16} className="text-purple-500" /> <span>عن المنصة</span>
          </a>
          <a href="/#games-section" onClick={(e) => scrollToSection ? scrollToSection(e, "games-section") : null} className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-[11px] md:text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0">
            <Gamepad2 size={16} className="text-emerald-500" /> <span>الألعاب والخدمات</span>
          </a>
          <a href="/#contact-section" onClick={(e) => scrollToSection ? scrollToSection(e, "contact-section") : null} className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-[11px] md:text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0">
            <MessageCircle size={16} className="text-blue-500" /> <span>تواصل معنا</span>
          </a>
          <Link href="/guides" className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-[11px] md:text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0">
            <Info size={16} className="text-cyan-500" /> <span>كيف تلعب؟</span>
          </Link>
        </nav>

        <div className="flex gap-1.5 md:gap-2 pr-1 md:pr-2 items-center">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden w-10 h-10 md:w-11 md:h-11 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center transition-all hover:bg-slate-200 dark:hover:bg-slate-700 active:translate-y-0.5 active:border-b-0">
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          {userSession && profile ? (
            <div className="relative z-[70]">
              <button 
                onClick={() => setIsAvatarDropdownOpen(!isAvatarDropdownOpen)}
                className="flex items-center gap-1.5 md:gap-2 p-1 pr-2 md:pr-3 bg-slate-100 dark:bg-slate-900 rounded-xl md:rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors"
              >
                <span className="text-xs md:text-sm font-black hidden sm:inline-block max-w-[100px] truncate text-slate-800 dark:text-slate-200">
                  {profile.full_name}
                </span>
                <div className="w-8 h-8 md:w-9 md:h-9 bg-blue-600 text-white font-black rounded-lg md:rounded-xl flex items-center justify-center text-xs md:text-sm shadow-inner uppercase">
                  {profile.full_name?.split(' ')[0]?.[0]}{profile.full_name?.split(' ')[1]?.[0] || ""}
                </div>
                <ChevronDown size={14} className={`transition-transform text-slate-500 ${isAvatarDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isAvatarDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsAvatarDropdownOpen(false)} />
                  <div className="absolute left-0 mt-3 w-56 bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-950 rounded-2xl shadow-[4px_4px_0px_#000] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                      <p className="text-xs font-bold text-slate-400">مسجل الدخول كـ</p>
                      <p className="text-sm font-black text-slate-800 dark:text-white truncate">{profile.email}</p>
                    </div>
                    <div className="relative flex flex-col py-2">
                      <div className="absolute -top-3 left-6 w-5 h-5 bg-white dark:bg-slate-800 border-t border-r border-slate-100 dark:border-slate-700 transform -rotate-45 z-0"></div>
                      
                      <div className="relative z-10">
                        <Link href="/profile" className="block px-6 py-2.5 text-right text-base font-bold text-slate-800 dark:text-white hover:text-blue-600 transition-colors">
                          حسابي
                        </Link>
                        
                        <div className="mx-6 border-b border-red-500/60 dark:border-red-500/40 my-1"></div>
                        
                        <Link href="/my-games" className="block px-6 py-2.5 text-right text-base font-bold text-slate-800 dark:text-white hover:text-blue-600 transition-colors">
                          ألعابي
                        </Link>
                        
                        <div className="mx-6 border-b border-red-500/60 dark:border-red-500/40 my-1"></div>
                        
                        <button onClick={() => { logout(); setIsAvatarDropdownOpen(false); }} className="w-full flex items-center justify-between px-6 py-2.5 text-slate-800 dark:text-white hover:text-red-600 transition-colors">
                          <LogOut size={18} className="text-slate-600 dark:text-slate-400" />
                          <span className="text-base font-bold">خروج</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/player" className="flex items-center justify-center gap-1.5 px-3 md:px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs md:text-sm transition-all active:translate-y-0.5 border-b-2 border-blue-800 active:border-b-0">
              <User size={18} strokeWidth={2.5} /> <span className="hidden sm:inline">دخول المنظم</span>
            </Link>
          )}

          <button onClick={toggleTheme} className="w-10 h-10 md:w-11 md:h-11 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 text-slate-600 dark:text-amber-400 rounded-xl flex items-center justify-center transition-all hover:bg-slate-200 dark:hover:bg-slate-700 active:translate-y-0.5 active:border-b-0">
            {mounted ? (
              theme === "dark" ? <Sun size={20} className="animate-spin-slow" /> : <Moon size={20} className="animate-wiggle" />
            ) : (
              <div className="w-5 h-5"></div>
            )}
          </button>
        </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed top-[90px] left-2 right-2 z-[50] bg-white dark:bg-slate-800 rounded-2xl border-4 border-slate-900 dark:border-slate-950 p-4 shadow-[6px_6px_0px_#0f172a] dark:shadow-[6px_6px_0px_#000] flex flex-col gap-3 animate-in slide-in-from-top-4 duration-200">
          <a href="/#hero" onClick={(e) => { setIsMobileMenuOpen(false); if(scrollToSection) scrollToSection(e, "hero"); }} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl font-black text-slate-800 dark:text-slate-200 active:scale-95 transition-transform">
            <Home size={18} className="text-slate-500" /> <span>الرئيسية</span>
          </a>
          <a href="/#about-section" onClick={(e) => { setIsMobileMenuOpen(false); if(scrollToSection) scrollToSection(e, "about-section"); }} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl font-black text-slate-800 dark:text-slate-200 active:scale-95 transition-transform">
            <Info size={18} className="text-purple-500" /> <span>عن المنصة</span>
          </a>
          <a href="/#games-section" onClick={(e) => { setIsMobileMenuOpen(false); if(scrollToSection) scrollToSection(e, "games-section"); }} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl font-black text-slate-800 dark:text-slate-200 active:scale-95 transition-transform">
            <Gamepad2 size={18} className="text-emerald-500" /> <span>الألعاب والخدمات</span>
          </a>
          <a href="/#contact-section" onClick={(e) => { setIsMobileMenuOpen(false); if(scrollToSection) scrollToSection(e, "contact-section"); }} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl font-black text-slate-800 dark:text-slate-200 active:scale-95 transition-transform">
            <MessageCircle size={18} className="text-blue-500" /> <span>تواصل معنا</span>
          </a>
          <Link href="/guides" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl font-black text-slate-800 dark:text-slate-200 active:scale-95 transition-transform">
            <Info size={18} className="text-cyan-500" /> <span>كيف تلعب؟</span>
          </Link>
        </div>
      )}
    </>
  );
};
