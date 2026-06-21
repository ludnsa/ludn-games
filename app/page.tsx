/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Tajawal } from "next/font/google";
import { supabase } from "@/lib/supabase";
import {
  Swords,
  Search,
  Play,
  ChevronDown,
  Globe,
  Mail,
  Phone,
  MapPin,
  Send,
  MessageCircle,
  X,
  Sun,
  Moon,
  Info,
  Gamepad2,
  Home,
  Zap,
  Target,
  Laptop,
  Package,
  User,
  Gavel,
} from "lucide-react";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800", "900"],
});

// ----------------------------------------------------
// محرك خلفية الألعاب
// ----------------------------------------------------
const SolidGamingBackground = () => {
  const [isDark, setIsDark] = useState(true);
  const [icons, setIcons] = useState<any[]>([]);

  useEffect(() => {
    const checkTheme = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const gameShapes = [
      <svg
        key="1"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="6" y1="12" x2="10" y2="12"></line>
        <line x1="8" y1="10" x2="8" y2="14"></line>
        <line x1="15" y1="13" x2="15.01" y2="13"></line>
        <line x1="18" y1="11" x2="18.01" y2="11"></line>
        <rect x="2" y="6" width="20" height="12" rx="2"></rect>
      </svg>,
      <svg
        key="2"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <circle cx="15.5" cy="15.5" r="1.5"></circle>
        <circle cx="15.5" cy="8.5" r="1.5"></circle>
        <circle cx="8.5" cy="15.5" r="1.5"></circle>
        <circle cx="12" cy="12" r="1.5"></circle>
      </svg>,
      <svg
        key="3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 20h4" />
        <path d="M6 20V4h6v4" />
        <circle cx="12" cy="11" r="2" />
        <line x1="12" y1="13" x2="12" y2="17" />
        <line x1="10" y1="15" x2="14" y2="15" />
        <line x1="12" y1="17" x2="10" y2="20" />
        <line x1="12" y1="17" x2="14" y2="20" />
      </svg>,
    ];

    const iconColors = [
      "text-emerald-500",
      "text-rose-500",
      "text-purple-500",
      "text-amber-500",
      "text-blue-500",
    ];

    const generatedIcons = Array.from({ length: 12 }).map((_, i) => ({
      id: `icon-${i}`,
      shape: gameShapes[i % gameShapes.length],
      colorClass: iconColors[i % iconColors.length],
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 40 + 40,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 15 + 20}s`,
      rotate: Math.random() * 360,
    }));
    setIcons(generatedIcons);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300">
      <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08]">
        {icons.map((icon) => (
          <div
            key={icon.id}
            className={`absolute animate-float-game-extra ${icon.colorClass}`}
            style={{
              left: icon.left,
              top: icon.top,
              width: `${icon.size}px`,
              height: `${icon.size}px`,
              animationDelay: icon.delay,
              animationDuration: icon.duration,
              transform: `rotate(${icon.rotate}deg)`,
            }}
          >
            {icon.shape}
          </div>
        ))}
      </div>
    </div>
  );
};

// ----------------------------------------------------
// بطاقات الألعاب التفاعلية
// ----------------------------------------------------
const PlayfulGameCard = ({ game, index }: { game: any; index: number }) => {
  const getButtonColor = (id: string) => {
    if (id === "castle-war")
      return "bg-rose-500 border-rose-700 hover:bg-rose-400";
    if (id === "world-domination")
      return "bg-blue-500 border-blue-700 hover:bg-blue-400";
    if (id === "auction")
      return "bg-amber-500 border-amber-700 hover:bg-amber-400 text-slate-900";
    return "bg-blue-500 border-blue-700 hover:bg-blue-400";
  };

  const getCardStyles = (id: string) => {
    if (id === "castle-war")
      return {
        card: "border-rose-200 dark:border-rose-900/60 shadow-xl shadow-rose-100 dark:shadow-rose-900/20 hover:shadow-rose-200 dark:hover:shadow-rose-900/40",
        icon: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20",
      };
    if (id === "world-domination")
      return {
        card: "border-blue-200 dark:border-blue-900/60 shadow-xl shadow-blue-100 dark:shadow-blue-900/20 hover:shadow-blue-200 dark:hover:shadow-blue-900/40",
        icon: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",
      };
    if (id === "auction")
      return {
        card: "border-amber-200 dark:border-amber-900/60 shadow-xl shadow-amber-100 dark:shadow-amber-900/20 hover:shadow-amber-200 dark:hover:shadow-amber-900/40",
        icon: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
      };
    return {
      card: "border-slate-200 dark:border-slate-900/60 shadow-xl shadow-slate-100 dark:shadow-slate-900/20 hover:shadow-slate-200 dark:hover:shadow-slate-900/40",
      icon: "bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/20",
    };
  };

  const styles = getCardStyles(game.id);

  return (
    <Link
      href={game.path}
      className={`group relative flex flex-col h-full bg-white dark:bg-slate-800 rounded-3xl border-b-8 p-6 transition-all duration-300 hover:-translate-y-2 animate-in zoom-in-95 ${styles.card}`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 border-b-4 group-hover:scale-110 transition-transform duration-300 ${styles.icon}`}
      >
        {game.icon}
      </div>
      <h2 className="text-2xl font-black mb-3 text-slate-800 dark:text-white">
        {game.title}
      </h2>
      <p className="font-bold text-sm leading-relaxed mb-8 flex-1 text-slate-500 dark:text-slate-400">
        {game.description}
      </p>

      <div
        className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all text-white border-b-4 active:border-b-0 active:translate-y-1 ${getButtonColor(game.id)}`}
      >
        العرض الآن <Play size={18} className="fill-current" />
      </div>
    </Link>
  );
};

const AboutCard = ({
  title,
  description,
  icon,
  colorClass,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
}) => (
  <div
    className={`relative w-full ${colorClass} rounded-2xl border-4 border-black dark:border-white p-6 shadow-[6px_6px_0px_#000] dark:shadow-[6px_6px_0px_rgba(255,255,255,0.2)] animate-in zoom-in-95`}
  >
    <div className="flex justify-start items-center gap-3 mb-4">
      <div className="text-black dark:text-white shrink-0">{icon}</div>
      <h3 className="text-xl font-black text-black dark:text-white tracking-tight">
        {title}
      </h3>
    </div>
    <p className="font-bold text-xs md:text-sm leading-relaxed text-slate-800 dark:text-white tracking-tight">
      {description}
    </p>
  </div>
);

// اقتصار الألعاب على المطلوب فقط
const GAMES = [
  {
    id: "castle-war",
    title: "حرب القلاع",
    description:
      "لعبة استراتيجية تعتمد على الهجوم والدفاع، دمر قلاع خصمك لتنتصر.",
    icon: <Swords className="w-8 h-8 text-rose-500" />,
    path: "/games/castle-war",
    color: "from-rose-500 to-red-600",
  },
  {
    id: "world-domination",
    title: "السيطرة على العالم",
    description:
      "لعبة استراتيجية وتكتيكية لفرض نفوذك والسيطرة على القارات وتوسيع إمبراطوريتك.",
    icon: <Globe className="w-8 h-8 text-blue-500" />,
    path: "/games/world-domination",
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: "auction",
    title: "المزاد",
    description:
      "لعبة مزادية وتكتيكية لتحديد الفائز بالمزايدة على السؤال الصحيح.",
      icon: <Gavel className="w-8 h-8 text-amber-500" />,
    path: "/games/auction",
    color: "from-amber-500 to-yellow-600",
  },
];

export default function HomePage() {
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      localStorage.setItem("theme_preference", "light");
      setIsDark(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme_preference", "dark");
      setIsDark(true);
    }
  };

  const scrollToSection = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string,
  ) => {
    e.preventDefault();
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
      const yOffset = -100;
      const y =
        targetSection.getBoundingClientRect().top +
        window.pageYOffset +
        yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();

    if (code.length === 5) {
      const prefix = code.charAt(0);
      if (prefix === "C")
        window.location.href = `/games/castle-war/join?code=${code}`;
      else if (prefix === "W")
        window.location.href = `/games/world-domination/join?code=${code}`;
      else 
        // بما أن كود حرب المزايدات عشوائي، أي كود ما يبدأ بـ C أو W بيحولهم للمزايدات مباشرة
        window.location.href = `/games/auction/team?room=${code}`;
    }
  };

  const handleLogin = async (provider: "google" | "apple" | "azure") => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/admin`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error logging in:", error);
      alert("حدث خطأ أثناء محاولة تسجيل الدخول، يرجى المحاولة مرة أخرى.");
    }
  };

  return (
    <main
      className={`min-h-screen relative flex flex-col items-center ${tajawal.className} overflow-x-hidden bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300`}
      dir="rtl"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes floatY { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-float { animation: floatY 4s ease-in-out infinite; }
        @keyframes floatGameExtra { 0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); } 25% { transform: translate(-20px, 15px) rotate(8deg) scale(1.05); } 50% { transform: translate(-10px, -15px) rotate(-8deg) scale(0.95); } 75% { transform: translate(15px, 20px) rotate(5deg) scale(1.02); } }
        .animate-float-game-extra { animation: floatGameExtra ease-in-out infinite; }
      `,
        }}
      />

      <SolidGamingBackground />

      {/* الهيدر */}
      <div className="fixed top-4 left-0 right-0 z-[60] w-full max-w-7xl mx-auto px-2 md:px-4">
        <div className="bg-white/95 dark:bg-slate-800/95 rounded-2xl border-4 border-slate-900 dark:border-black p-2 md:p-3 shadow-[6px_6px_0px_#0f172a] dark:shadow-[6px_6px_0px_#000] flex justify-between items-center transition-colors duration-300">
          <Link
            href="/"
            className="transition-transform hover:scale-105 active:scale-95 shrink-0 pl-1 md:pl-2"
          >
            <img
              src="https://ludn.sa/full_logo.svg?dpl=dpl_9jc3BNjB3uY2VzRn5kQd3MZSNLaW"
              alt="لدن التقنية"
              className="h-8 md:h-12 object-contain dark:brightness-0 dark:invert"
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-1.5 md:gap-3">
            <a
              href="#hero"
              onClick={(e) => scrollToSection(e, "hero")}
              className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-[11px] md:text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0"
            >
              <Home size={16} className="text-slate-500 dark:text-slate-400" />{" "}
              <span>الرئيسية</span>
            </a>
            <a
              href="#about-section"
              onClick={(e) => scrollToSection(e, "about-section")}
              className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-[11px] md:text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0"
            >
              <Info size={16} className="text-purple-500" />{" "}
              <span>عن المنصة</span>
            </a>
            <a
              href="#games-section"
              onClick={(e) => scrollToSection(e, "games-section")}
              className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-[11px] md:text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0"
            >
              <Gamepad2 size={16} className="text-emerald-500" />{" "}
              <span>الألعاب والخدمات</span>
            </a>
            <a
              href="#contact-section"
              onClick={(e) => scrollToSection(e, "contact-section")}
              className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-[11px] md:text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0"
            >
              <MessageCircle size={16} className="text-blue-500" />{" "}
              <span>تواصل معنا</span>
            </a>
          </nav>

          <div className="flex gap-1.5 md:gap-2 pr-1 md:pr-2 items-center">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 md:px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs md:text-sm transition-all active:translate-y-0.5 border-b-2 border-blue-800 active:border-b-0"
            >
              <User size={18} strokeWidth={2.5} />{" "}
              <span className="hidden sm:inline">دخول المنظم</span>
            </button>

            <button
              onClick={toggleTheme}
              className="w-10 h-10 md:w-11 md:h-11 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 text-slate-600 dark:text-amber-400 rounded-xl flex items-center justify-center transition-all hover:bg-slate-200 dark:hover:bg-slate-700 active:translate-y-0.5 active:border-b-0"
            >
              {isDark ? (
                <Sun size={20} className="animate-spin-slow" />
              ) : (
                <Moon size={20} className="animate-wiggle" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* نافذة تسجيل الدخول */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setIsAuthModalOpen(false)}
          ></div>
          <div className="relative bg-white dark:bg-slate-800 border-4 border-blue-500 rounded-[2rem] p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-5 left-5 p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              <X size={24} />
            </button>
            <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-3xl mx-auto flex items-center justify-center mb-6 border-b-4 border-blue-200 dark:border-blue-800">
              <User size={36} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-center text-slate-900 dark:text-white mb-2">
              تسجيل دخول المنظم
            </h3>
            <p className="text-center text-slate-500 dark:text-slate-400 font-bold mb-8 text-sm md:text-base">
              اختر طريقة الدخول المناسبة لك لإدارة غرفك
            </p>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => handleLogin("google")}
                className="flex items-center justify-center gap-3 w-full py-4 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-2xl font-black text-lg transition-all active:scale-95 shadow-sm"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                متابعة باستخدام Google
              </button>

              <button
                onClick={() => handleLogin("apple")}
                className="flex items-center justify-center gap-3 w-full py-4 bg-black text-white rounded-2xl font-black text-lg transition-all active:scale-95 shadow-sm border-2 border-black"
              >
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.05 2.53.68 3.14.68.65 0 2.04-.81 3.65-.68 1.25.05 2.39.61 3.14 1.54-2.68 1.63-2.25 5.38.38 6.44-1.12 3.14-2.58 4.21-3.36 4.99zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.4-2.08 4.41-3.74 4.25z" />
                </svg>
                متابعة باستخدام Apple
              </button>

              <button
                onClick={() => handleLogin("azure")}
                className="flex items-center justify-center gap-3 w-full py-4 bg-[#00a4ef] hover:bg-[#0094d8] text-white rounded-2xl font-black text-lg transition-all active:scale-95 shadow-sm border-2 border-[#00a4ef]"
              >
                <svg className="w-6 h-6" viewBox="0 0 21 21">
                  <path fill="#f25022" d="M1 1h9v9H1z" />
                  <path fill="#00a4ef" d="M1 11h9v9H1z" />
                  <path fill="#7fba00" d="M11 1h9v9h-9z" />
                  <path fill="#ffb900" d="M11 11h9v9h-9z" />
                </svg>
                متابعة باستخدام Microsoft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة الانضمام بالكود */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setIsJoinModalOpen(false)}
          ></div>
          <div className="relative bg-white dark:bg-slate-800 border-4 border-emerald-500 rounded-[2rem] p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <button
              onClick={() => setIsJoinModalOpen(false)}
              className="absolute top-5 left-5 p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              <X size={24} />
            </button>
            <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-3xl mx-auto flex items-center justify-center mb-6 border-b-4 border-emerald-200 dark:border-emerald-800">
              <Search size={36} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-center text-slate-900 dark:text-white mb-2">
              الانضمام لغرفة
            </h3>
            <p className="text-center text-slate-500 dark:text-slate-400 font-bold mb-8 text-sm md:text-base">
              أدخل الكود المكون من 5 خانات
            </p>
            <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                maxLength={5}
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  setJoinError("");
                }}
                placeholder="مثال: C7X9K"
                className="w-full bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center text-3xl font-black tracking-[0.5em] uppercase outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors text-slate-800 dark:text-white placeholder:tracking-normal placeholder:text-lg"
                dir="ltr"
              />
              {joinError && (
                <p className="text-rose-500 text-sm font-bold text-center animate-pulse">
                  {joinError}
                </p>
              )}

              <button
                type="submit"
                disabled={joinCode.trim().length !== 5}
                className="w-full mt-2 py-4 bg-emerald-500 border-b-4 border-emerald-700 hover:bg-emerald-400 text-white rounded-2xl font-black text-xl md:text-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 active:border-b-0 active:translate-y-1"
              >
                دخول الغرفة
              </button>
            </form>
          </div>
        </div>
      )}

      {/* زر الواتساب العائم */}
      <a
        href="https://wa.me/966551014446"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-green-500 border-b-4 border-green-700 hover:bg-green-400 text-white w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all animate-float active:translate-y-1 active:border-b-0"
      >
        <MessageCircle size={28} className="md:w-8 md:h-8" />
      </a>

      <div className="relative z-10 w-full flex-1 flex flex-col pt-4">
        {/* ===================== Hero Section ===================== */}
        <section
          id="hero"
          className="flex flex-col items-center text-center min-h-[50vh] justify-center px-4 pt-32 pb-16 animate-in slide-in-from-bottom-8 duration-700"
        >
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-6 text-slate-900 dark:text-white tracking-tight flex flex-wrap items-center justify-center gap-2 md:gap-3 pb-1">
            منصة ألعاب{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-blue-500 drop-shadow-sm">
              لدن
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-2xl font-bold max-w-2xl leading-relaxed text-slate-600 dark:text-slate-400 mb-10 md:mb-12">
            شريكك التقني لتطوير مواقع وتطبيقات حديثة تلبي طموحاتك وتعزز نجاحك في
            العالم الرقمي.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 z-20 w-full justify-center max-w-2xl px-2 md:px-4">
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-3 px-6 md:px-8 py-4 md:py-5 bg-emerald-500 border-b-4 border-emerald-700 hover:bg-emerald-400 text-white rounded-2xl font-black text-lg md:text-xl transition-all active:scale-95 active:border-b-0 active:translate-y-1"
            >
              <Search className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} />
              <span>دخول الغرفة</span>
            </button>

            <a
              href="https://ludn.sa/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-3 px-6 md:px-8 py-4 md:py-5 bg-blue-600 border-b-4 border-blue-800 hover:bg-blue-500 text-white rounded-2xl font-black text-lg md:text-xl transition-all active:scale-95 active:border-b-0 active:translate-y-1"
            >
              <Globe className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} />
              <span>موقع لدن</span>
            </a>
          </div>

          <a
            href="#games-section"
            onClick={(e) => scrollToSection(e, "games-section")}
            className="mt-12 md:mt-16 animate-bounce cursor-pointer flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-white dark:bg-slate-800 border-b-4 border-slate-200 dark:border-slate-950 rounded-full text-slate-400 dark:text-slate-500 hover:text-blue-500 transition-all active:translate-y-1 active:border-b-0"
          >
            <ChevronDown size={28} strokeWidth={3} className="md:w-8 md:h-8" />
          </a>
        </section>

        {/* ===================== قسم عن المنصة ===================== */}
        <section
          id="about-section"
          className="w-full max-w-7xl mx-auto px-4 py-16 md:py-20 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-12 lg:items-center"
        >
          <div className="lg:col-span-6 text-slate-900 dark:text-white space-y-6 animate-in slide-in-from-right-8 duration-700 text-center md:text-right">
            <div className="relative inline-block mb-2 md:mb-4">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-emerald-600 dark:from-blue-400 dark:to-emerald-400 drop-shadow-sm pb-2">
                عن المنصة
              </h2>
              <div className="absolute -bottom-1 right-0 left-0 h-2 bg-black dark:bg-emerald-500 rounded-full"></div>
            </div>

            <div className="space-y-4 md:space-y-5 text-lg md:text-2xl font-bold leading-relaxed max-w-2xl text-slate-700 dark:text-slate-300 mx-auto md:mx-0">
              <p>
                منصة ألعاب تفاعلية{" "}
                <span className="text-emerald-500 font-black">مجانية</span> تجمع
                العائلة والأصدقاء في لحظات مليئة بالحماس والضحك.
              </p>
              <p className="border-r-4 border-emerald-400 pr-4 md:pr-5 py-2 text-base md:text-xl text-slate-600 dark:text-slate-400">
                تم تصميمها وتطويرها بكل فخر بواسطة <br />
                <span className="font-black text-blue-600 dark:text-blue-400">
                  مؤسسة لدن التقنية لحلول الأعمال.
                </span>
              </p>
            </div>

            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="mt-6 md:mt-8 flex items-center justify-center gap-3 px-8 py-4 md:py-5 bg-emerald-500 border-b-4 border-emerald-700 hover:bg-emerald-400 text-white rounded-2xl font-black text-lg md:text-2xl transition-all active:scale-95 active:border-b-0 active:translate-y-1 w-full md:w-auto mx-auto md:mx-0"
            >
              ابدأ اللعب 🎮
            </button>
          </div>

          <div
            className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6"
            dir="ltr"
          >
            <AboutCard
              title="تفاعل مباشر"
              description="تحديات وتفاعل لحظي بين اللاعبين في كل جولة"
              icon={<Zap size={32} className="md:w-9 md:h-9" />}
              colorClass="bg-[#2dd4bf] dark:bg-[#115e59]"
            />
            <AboutCard
              title="لعب جماعي"
              description="العب مع اخوياك وأهلك بنفس الوقت ومن مكانكم"
              icon={<Target size={32} className="md:w-9 md:h-9" />}
              colorClass="bg-[#818cf8] dark:bg-[#3730a3]"
            />
            <AboutCard
              title="من أي جهاز"
              description="العب من جوالك، تابلت، أو الكمبيوتر بدون تحميل"
              icon={<Laptop size={32} className="md:w-9 md:h-9" />}
              colorClass="bg-[#a7f3d0] dark:bg-[#065f46]"
            />
            <AboutCard
              title="خدمات متنوعة"
              description="ألعاب وخدمات مبتكرة ومفيدة لتجمعاتكم"
              icon={<Package size={32} className="md:w-9 md:h-9" />}
              colorClass="bg-[#a78bfa] dark:bg-[#5b21b6]"
            />
          </div>
        </section>

        {/* ===================== قسم ألعابنا والخدمات ===================== */}
        <section
          id="games-section"
          className="max-w-7xl mx-auto w-full px-4 py-16 relative z-10 pt-16 md:pt-20"
        >
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-3 md:mb-4 text-slate-900 dark:text-white">
              منصة الألعاب والخدمات
            </h2>
            <p className="text-lg md:text-xl font-bold text-slate-500 dark:text-slate-400">
              جرب أنظمتنا الترفيهية والتفاعلية المبنية بأحدث التقنيات
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mx-auto">
            {GAMES.map((game, index) => (
              <PlayfulGameCard key={game.id} game={game} index={index} />
            ))}
          </div>
        </section>

        {/* ===================== قسم تواصل معنا ===================== */}
        <section
          id="contact-section"
          className="max-w-7xl mx-auto w-full px-4 py-16 relative z-10 pt-16 md:pt-20"
        >
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-3 md:mb-4 text-slate-900 dark:text-white">
              عندك فكرة ألعاب ؟
            </h2>
            <p className="text-lg md:text-xl font-bold text-slate-500 dark:text-slate-400">
              شاركنا فكرة اللعبة ونصممها لك
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-3xl border-b-4 border-slate-200 dark:border-slate-900 p-5 md:p-6 flex items-center gap-4 md:gap-5 relative group overflow-hidden">
                <div className="absolute inset-0 bg-blue-600/5 group-hover:scale-110 transition-transform duration-500 z-0"></div>
                <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 relative z-10 border-b-4 border-blue-200 dark:border-slate-900">
                  <Mail size={24} className="md:w-7 md:h-7" />
                </div>
                <div className="relative z-10">
                  <p className="text-slate-500 dark:text-slate-400 font-bold text-xs md:text-sm mb-1">
                    البريد الإلكتروني
                  </p>
                  <p
                    className="text-slate-900 dark:text-white font-black text-lg md:text-xl"
                    dir="ltr"
                  >
                    contact@ludn.sa
                  </p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-3xl border-b-4 border-slate-200 dark:border-slate-900 p-5 md:p-6 flex items-center gap-4 md:gap-5 relative group overflow-hidden">
                <div className="absolute inset-0 bg-emerald-600/5 group-hover:scale-110 transition-transform duration-500 z-0"></div>
                <div className="w-14 h-14 md:w-16 md:h-16 bg-emerald-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 relative z-10 border-b-4 border-emerald-200 dark:border-slate-900">
                  <Phone size={24} className="md:w-7 md:h-7" />
                </div>
                <div className="relative z-10">
                  <p className="text-slate-500 dark:text-slate-400 font-bold text-xs md:text-sm mb-1">
                    رقم الجوال
                  </p>
                  <p
                    className="text-slate-900 dark:text-white font-black text-lg md:text-xl"
                    dir="ltr"
                  >
                    055 101 4446
                  </p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-3xl border-b-4 border-slate-200 dark:border-slate-900 p-5 md:p-6 flex items-center gap-4 md:gap-5 relative group overflow-hidden">
                <div className="absolute inset-0 bg-purple-600/5 group-hover:scale-110 transition-transform duration-500 z-0"></div>
                <div className="w-14 h-14 md:w-16 md:h-16 bg-purple-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 relative z-10 border-b-4 border-purple-200 dark:border-slate-900">
                  <MapPin size={24} className="md:w-7 md:h-7" />
                </div>
                <div className="relative z-10">
                  <p className="text-slate-500 dark:text-slate-400 font-bold text-xs md:text-sm mb-1">
                    الموقع
                  </p>
                  <p className="text-slate-900 dark:text-white font-black text-lg md:text-xl">
                    المملكة العربية السعودية
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-[2rem] border-b-8 border-slate-200 dark:border-slate-900 p-6 md:p-10">
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-6 md:mb-8 flex items-center gap-3">
                <Send size={28} className="text-blue-500 md:w-8 md:h-8" /> أرسل
                رسالة
              </h3>
              <form
                className="flex flex-col gap-4 md:gap-5"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <div>
                    <label className="block text-xs md:text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">
                      الاسم الكامل
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 md:p-4 text-slate-900 dark:text-white font-bold outline-none focus:border-blue-500 transition-colors text-sm md:text-base"
                      placeholder="اسمك..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">
                      رقم الجوال
                    </label>
                    <input
                      type="tel"
                      className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 md:p-4 text-slate-900 dark:text-white font-bold outline-none focus:border-blue-500 transition-colors text-sm md:text-base"
                      placeholder="05x xxx xxxx"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 md:p-4 text-slate-900 dark:text-white font-bold outline-none focus:border-blue-500 transition-colors text-sm md:text-base"
                    placeholder="example@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">
                    الرسالة
                  </label>
                  <textarea
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 md:p-4 text-slate-900 dark:text-white font-bold outline-none focus:border-blue-500 transition-colors resize-none text-sm md:text-base"
                    placeholder="كيف نخدمك؟"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full mt-2 md:mt-4 py-4 md:py-5 bg-blue-600 border-b-4 border-blue-800 hover:bg-blue-500 text-white font-black text-xl md:text-2xl rounded-2xl transition-all active:translate-y-1 active:border-b-0"
                >
                  إرسال الرسالة
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* ===================== الفوتر الشامل ===================== */}
        <footer className="w-full bg-white dark:bg-slate-800 border-t-8 border-slate-200 dark:border-slate-950 pt-12 md:pt-16 pb-8 relative z-10 transition-colors duration-300 mt-10">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 md:gap-8 mb-12">
            <div className="flex flex-col items-center sm:items-start gap-4">
              <img
                src="https://ludn.sa/full_logo.svg?dpl=dpl_9jc3BNjB3uY2VzRn5kQd3MZSNLaW"
                alt="لدن التقنية"
                className="h-12 md:h-14 object-contain dark:brightness-0 dark:invert"
              />
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm text-center sm:text-right mt-2 leading-relaxed max-w-xs">
                منصة ألعاب تفاعلية تجمع العائلة والأصدقاء في لحظات مليئة بالحماس
                والضحك.
              </p>

              {/* زر حساب X */}
              <a
                href="https://x.com/LudnSA"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all border-b-2 border-slate-200 dark:border-slate-900 active:border-b-0 active:translate-y-0.5"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.95H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>

            <div className="flex flex-col items-center sm:items-start gap-4">
              <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-2">
                روابط سريعة
              </h3>
              <ul className="flex flex-col gap-3 font-bold text-sm md:text-base text-slate-600 dark:text-slate-300">
                <li>
                  <a
                    href="#hero"
                    onClick={(e) => scrollToSection(e, "hero")}
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2"
                  >
                    <ChevronDown
                      size={16}
                      className="-rotate-90 text-blue-500"
                    />{" "}
                    الرئيسية
                  </a>
                </li>
                <li>
                  <a
                    href="#about-section"
                    onClick={(e) => scrollToSection(e, "about-section")}
                    className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-2"
                  >
                    <ChevronDown
                      size={16}
                      className="-rotate-90 text-purple-500"
                    />{" "}
                    عن المنصة
                  </a>
                </li>
                <li>
                  <a
                    href="#games-section"
                    onClick={(e) => scrollToSection(e, "games-section")}
                    className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-2"
                  >
                    <ChevronDown
                      size={16}
                      className="-rotate-90 text-emerald-500"
                    />{" "}
                    الألعاب والخدمات
                  </a>
                </li>
                <li>
                  <a
                    href="#contact-section"
                    onClick={(e) => scrollToSection(e, "contact-section")}
                    className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center gap-2"
                  >
                    <ChevronDown
                      size={16}
                      className="-rotate-90 text-amber-500"
                    />{" "}
                    تواصل معنا
                  </a>
                </li>
              </ul>
            </div>

            <div className="flex flex-col items-center sm:items-start gap-4 sm:col-span-2 md:col-span-1">
              <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-2">
                الألعاب والخدمات
              </h3>
              <ul className="flex flex-col gap-3 font-bold text-sm md:text-base text-slate-600 dark:text-slate-300">
                <li>
                  <Link
                    href="/games/castle-war"
                    className="hover:text-rose-500 transition-colors flex items-center gap-2"
                  >
                    <Swords size={18} className="text-rose-500" /> حرب القلاع
                  </Link>
                </li>
                <li>
                  <Link
                    href="/games/world-domination"
                    className="hover:text-blue-500 transition-colors flex items-center gap-2"
                  >
                    <Globe size={18} className="text-blue-500" /> السيطرة على العالم
                  </Link>
                </li>
                <li>
                  <Link
                    href="/games/auction"
                    className="hover:text-amber-500 transition-colors flex items-center gap-2"
                  >
                    <Gavel size={18} className="text-amber-500" /> حرب المزايدات
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="w-full pt-8 border-t-4 border-slate-200 dark:border-slate-700 text-center px-4">
            <p className="text-xs md:text-sm font-bold text-slate-400 dark:text-slate-500">
              2026 لدن التقنية - جميع الحقوق محفوظة ©
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
