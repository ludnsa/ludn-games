"use client";

import React from "react";
import { ChevronDown, Search, Globe, Gamepad2 } from "lucide-react";

export const HeroSection = ({ 
  scrollToSection, 
  setIsJoinModalOpen 
}: { 
  scrollToSection: (e: React.MouseEvent<HTMLAnchorElement>, id: string) => void;
  setIsJoinModalOpen: (val: boolean) => void;
}) => {
  return (
    <section id="hero" className="flex flex-col items-center text-center min-h-[50vh] justify-center px-4 pt-32 pb-16 animate-in slide-in-from-bottom-8 duration-700">
      <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-6 text-slate-900 dark:text-white tracking-tight flex flex-wrap items-center justify-center gap-2 md:gap-3 pb-1">
        منصة ألعاب <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-blue-500 drop-shadow-sm">لدن</span>
      </h1>
      <p className="text-base sm:text-lg md:text-2xl font-bold max-w-2xl leading-relaxed text-slate-600 dark:text-slate-400 mb-10 md:mb-12">
        عيش جو التحدي مع ألعاب لدن الجماعية ، خيارك الأول لجمعة العائلة وشباب الإستراحة وزملاءك في العمل.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4 z-20 w-full justify-center max-w-2xl px-2 md:px-4">
        <button onClick={() => setIsJoinModalOpen(true)} className="w-full sm:w-auto flex-1 flex items-center justify-center gap-3 px-6 md:px-8 py-4 md:py-5 bg-emerald-500 border-b-4 border-emerald-700 hover:bg-emerald-400 text-white rounded-2xl font-black text-lg md:text-xl transition-all active:scale-95 active:border-b-0 active:translate-y-1">
          <Search className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} />
          <span>دخول الغرفة</span>
        </button>
        <button onClick={(e) => scrollToSection(e as any, "games-section")} className="w-full sm:w-auto flex-1 flex items-center justify-center gap-3 px-6 md:px-8 py-4 md:py-5 bg-blue-600 border-b-4 border-blue-800 hover:bg-blue-500 text-white rounded-2xl font-black text-lg md:text-xl transition-all active:scale-95 active:border-b-0 active:translate-y-1">
          <Gamepad2 className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} />
          <span>ابدأ اللعب</span>
        </button>
      </div>

      <a href="#games-section" onClick={(e) => scrollToSection(e, "games-section")} className="mt-12 md:mt-16 animate-bounce cursor-pointer flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-white dark:bg-slate-800 border-b-4 border-slate-200 dark:border-slate-950 rounded-full text-slate-400 dark:text-slate-500 hover:text-blue-500 transition-all active:translate-y-1 active:border-b-0">
        <ChevronDown size={28} strokeWidth={3} className="md:w-8 md:h-8" />
      </a>
    </section>
  );
};
