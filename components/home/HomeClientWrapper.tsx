"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, MessageCircle } from "lucide-react";

import { TopNav } from "@/components/home/TopNav";
import { HeroSection } from "@/components/home/HeroSection";
import { AboutSection } from "@/components/home/AboutSection";
import { GamesSection } from "@/components/home/GamesSection";
import { ContactSection } from "@/components/home/ContactSection";
import { Footer } from "@/components/home/Footer";

export function HomeClientWrapper() {
  const router = useRouter();
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
      const yOffset = -100;
      const y = targetSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();

    if (code.length === 5) {
      const prefix = code.charAt(0);
      if (prefix === "C") router.push(`/games/castle-war/join?code=${code}`);
      else if (prefix === "W") router.push(`/games/world-domination/audience?room=${code}`);
      else if (prefix === "A") router.push(`/games/auction/team?room=${code}`);
      else setJoinError("كود الغرفة غير صحيح أو غير معروف");
    } else {
      setJoinError("الكود يجب أن يكون 5 خانات");
    }
  };

  return (
    <>
      <TopNav scrollToSection={scrollToSection} />

      {/* نافذة الانضمام بالكود */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsJoinModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 border-4 border-emerald-500 rounded-[2rem] p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <button onClick={() => setIsJoinModalOpen(false)} className="absolute top-5 left-5 p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
              <X size={24} />
            </button>
            <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-3xl mx-auto flex items-center justify-center mb-6 border-b-4 border-emerald-200 dark:border-emerald-800">
              <Search size={36} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-center text-slate-900 dark:text-white mb-2">الانضمام لغرفة</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 font-bold mb-8 text-sm md:text-base">أدخل الكود المكون من 5 خانات</p>
            <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4">
              <input type="text" maxLength={5} value={joinCode} onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }} placeholder="مثال: C7X9K" className="w-full bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center text-3xl font-black tracking-[0.5em] uppercase outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors text-slate-800 dark:text-white placeholder:tracking-normal placeholder:text-lg" dir="ltr" />
              {joinError && <p className="text-rose-500 text-sm font-bold text-center animate-pulse">{joinError}</p>}
              <button type="submit" disabled={joinCode.trim().length !== 5} className="w-full mt-2 py-4 bg-emerald-500 border-b-4 border-emerald-700 hover:bg-emerald-400 text-white rounded-2xl font-black text-xl md:text-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 active:border-b-0 active:translate-y-1">
                دخول الغرفة
              </button>
            </form>
          </div>
        </div>
      )}

      {/* زر الواتساب العائم */}
      <a href="https://wa.me/966551014446" target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-50 bg-green-500 border-b-4 border-green-700 hover:bg-green-400 text-white w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all animate-float active:translate-y-1 active:border-b-0">
        <MessageCircle size={28} className="md:w-8 md:h-8" />
      </a>

      <div className="relative z-10 w-full flex-1 flex flex-col pt-4">
        <HeroSection scrollToSection={scrollToSection} setIsJoinModalOpen={setIsJoinModalOpen} />
        <GamesSection />
        <AboutSection setIsJoinModalOpen={setIsJoinModalOpen} />
        <ContactSection />
        <Footer scrollToSection={scrollToSection} />
      </div>
    </>
  );
}
