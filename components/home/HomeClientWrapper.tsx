"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { TopNav } from "@/components/home/TopNav";
import { HeroSection } from "@/components/home/HeroSection";
import { AboutSection } from "@/components/home/AboutSection";
import { GamesSection } from "@/components/home/GamesSection";
import { PackagesTeaser } from "@/components/home/PackagesTeaser";
import { ContactSection } from "@/components/home/ContactSection";
import { Footer } from "@/components/home/Footer";

export function HomeClientWrapper() {
  const router = useRouter();
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

      {/* زر الواتساب العائم — فوق شريط التبويب على الجوال */}
      <a
        href="https://wa.me/966551014446"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="تواصل معنا على واتساب"
        className="fixed left-4 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:left-6 lg:bottom-6 z-50 w-12 h-12 rounded-full bg-[#25d366] text-white grid place-items-center ludn-shadow transition-transform active:scale-95"
      >
        <MessageCircle size={24} />
      </a>

      <div className="relative z-10 w-full flex-1 flex flex-col">
        <HeroSection
          scrollToSection={scrollToSection}
          joinCode={joinCode}
          joinError={joinError}
          onJoinCodeChange={(value) => {
            setJoinCode(value.toUpperCase());
            setJoinError("");
          }}
          onJoinSubmit={handleJoinSubmit}
        />
        <GamesSection />
        <AboutSection />
        <PackagesTeaser />
        <ContactSection />
        <Footer scrollToSection={scrollToSection} />
      </div>
    </>
  );
}
