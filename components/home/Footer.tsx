import React from "react";
import Link from "next/link";
import { ChevronDown, Swords, Globe, Gavel } from "lucide-react";

export const Footer = ({ scrollToSection }: { scrollToSection: (e: React.MouseEvent<HTMLAnchorElement>, id: string) => void }) => {
  return (
    <footer className="w-full bg-white dark:bg-slate-800 border-t-8 border-slate-200 dark:border-slate-950 pt-12 md:pt-16 pb-8 relative z-10 transition-colors duration-300 mt-10">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 md:gap-8 mb-12">
        <div className="flex flex-col items-center sm:items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://ludn.sa/full_logo.svg?dpl=dpl_9jc3BNjB3uY2VzRn5kQd3MZSNLaW" alt="لدن التقنية" className="h-12 md:h-14 object-contain dark:brightness-0 dark:invert" />
          <p className="text-slate-500 dark:text-slate-400 font-bold text-sm text-center sm:text-right mt-2 leading-relaxed max-w-xs">منصة ألعاب تفاعلية تجمع العائلة والأصدقاء في لحظات مليئة بالحماس والضحك.</p>
          <div className="flex items-center gap-3 mt-2">
            <a href="https://ludn.sa/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-sm transition-all border-b-2 border-blue-800 active:border-b-0 active:translate-y-0.5">
              <Globe size={18} /> موقع لدن
            </a>
            <a href="https://x.com/LudnSA" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all border-b-2 border-slate-200 dark:border-slate-900 active:border-b-0 active:translate-y-0.5">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.95H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </a>
          </div>
        </div>
        <div className="flex flex-col items-center sm:items-start gap-4">
          <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-2">روابط سريعة</h3>
          <ul className="flex flex-col gap-3 font-bold text-sm md:text-base text-slate-600 dark:text-slate-300">
            <li><a href="#hero" onClick={(e) => scrollToSection(e, "hero")} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronDown size={16} className="-rotate-90 text-blue-500" /> الرئيسية</a></li>
            <li><a href="#about-section" onClick={(e) => scrollToSection(e, "about-section")} className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-2"><ChevronDown size={16} className="-rotate-90 text-purple-500" /> عن المنصة</a></li>
            <li><a href="#games-section" onClick={(e) => scrollToSection(e, "games-section")} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-2"><ChevronDown size={16} className="-rotate-90 text-emerald-500" /> الألعاب والخدمات</a></li>
            <li><a href="#contact-section" onClick={(e) => scrollToSection(e, "contact-section")} className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center gap-2"><ChevronDown size={16} className="-rotate-90 text-amber-500" /> تواصل معنا</a></li>
            <li><Link href="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2"><ChevronDown size={16} className="-rotate-90 text-indigo-500" /> الشروط والأحكام</Link></li>
            <li><Link href="/guides" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors flex items-center gap-2"><ChevronDown size={16} className="-rotate-90 text-cyan-500" /> كيف تلعب؟ (دليل الألعاب)</Link></li>
          </ul>
        </div>
        <div className="flex flex-col items-center sm:items-start gap-4 sm:col-span-2 md:col-span-1">
          <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-2">الألعاب والخدمات</h3>
          <ul className="flex flex-col gap-3 font-bold text-sm md:text-base text-slate-600 dark:text-slate-300">
            <li><Link href="/games/castle-war" className="hover:text-rose-500 transition-colors flex items-center gap-2"><Swords size={18} className="text-rose-500" /> حرب القلاع</Link></li>
            <li><Link href="/games/world-domination" className="hover:text-blue-500 transition-colors flex items-center gap-2"><Globe size={18} className="text-blue-500" /> السيطرة على العالم</Link></li>
            <li><Link href="/games/auction" className="hover:text-amber-500 transition-colors flex items-center gap-2"><Gavel size={18} className="text-amber-500" /> حرب المزايدات</Link></li>
          </ul>
        </div>
      </div>
      <div className="w-full pt-8 border-t-4 border-slate-200 dark:border-slate-700 text-center px-4">
        <p className="text-xs md:text-sm font-bold text-slate-400 dark:text-slate-500">2026 لدن التقنية - جميع الحقوق محفوظة ©</p>
      </div>
    </footer>
  );
};
