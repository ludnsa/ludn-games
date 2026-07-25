"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, MonitorPlay, HelpCircle, PowerOff, Home, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import InstructionsModal from "./InstructionsModal";

interface TopBarProps {
  gameState: string;
  team1Name: string;
  team2Name: string;
  countriesLeft: number;
  team1Owned: number;
  team2Owned: number;
  roomCode: string | null;
  handleGoHome: () => void;
  handleGoBack: () => void;
  handleForceEndGame?: () => void;
  showAlert: (msg: string) => void;
  setShowAudienceModal: (val: boolean) => void;
}

export default function TopBar({
  gameState,
  team1Name,
  team2Name,
  countriesLeft,
  team1Owned,
  team2Owned,
  roomCode,
  handleGoHome,
  handleGoBack,
  handleForceEndGame,
  showAlert,
  setShowAudienceModal,
}: TopBarProps) {
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <>
      <InstructionsModal 
        showInstructionsModal={showInstructionsModal} 
        setShowInstructionsModal={setShowInstructionsModal} 
      />
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 lg:gap-6 mb-4 lg:mb-6 shrink-0 z-50">
      <div className="flex flex-wrap justify-center lg:justify-start gap-2 w-full lg:w-auto">
        <button
          onClick={handleGoHome}
          className="px-3 py-1.5 lg:px-4 lg:py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl flex items-center gap-1.5 lg:gap-2 font-black text-[10px] lg:text-xs border-b-4 border-slate-300 dark:border-slate-950 active:border-b-0 active:translate-y-[4px] transition-all"
        >
          <Home size={14} className="lg:w-4 lg:h-4" />
          <span className="hidden sm:inline">الرئيسية</span>
        </button>

        <button
          onClick={handleGoBack}
          className="px-3 py-1.5 lg:px-4 lg:py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-xl flex items-center gap-1.5 lg:gap-2 font-black text-[10px] lg:text-xs border-b-4 border-yellow-600 active:border-b-0 active:translate-y-[4px] transition-all"
        >
          <ArrowRight size={14} className="lg:w-4 lg:h-4 text-black" />
          <span className="hidden sm:inline">رجوع</span>
        </button>

        {handleForceEndGame && (
          <button
            onClick={handleForceEndGame}
            className="px-3 py-1.5 lg:px-4 lg:py-2 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 rounded-xl flex items-center gap-1.5 lg:gap-2 font-black text-[10px] lg:text-xs border-b-4 border-rose-200 dark:border-rose-900 active:border-b-0 active:translate-y-[4px] transition-all"
          >
            <PowerOff size={14} className="lg:w-4 lg:h-4" />
            إنهاء وتصفير
          </button>
        )}

        <button
          onClick={() => setShowInstructionsModal(true)}
          className="px-3 py-1.5 lg:px-4 lg:py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center gap-1.5 lg:gap-2 font-black text-[10px] lg:text-xs border-b-4 border-indigo-800 active:border-b-0 active:translate-y-[4px] transition-all"
        >
          <HelpCircle size={14} className="lg:w-4 lg:h-4" />
          التعليمات
        </button>

        <button
          onClick={() => {
            if (!roomCode) showAlert("الرجاء بدء اللعبة أولاً لتوليد كود الغرفة!");
            else setShowAudienceModal(true);
          }}
          className="px-3 py-1.5 lg:px-4 lg:py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center gap-1.5 lg:gap-2 font-black text-[10px] lg:text-xs border-b-4 border-blue-800 active:border-b-0 active:translate-y-[4px] transition-all"
        >
          <MonitorPlay size={14} className="lg:w-4 lg:h-4" />
          <span className="hidden sm:inline">شاشة الجمهور</span>
          <span className="sm:hidden">عرض</span>
        </button>

        {mounted && (
          <button
            onClick={toggleTheme}
            className="px-3 py-1.5 lg:px-4 lg:py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-amber-400 rounded-xl flex items-center gap-1.5 lg:gap-2 font-black text-[10px] lg:text-xs border-b-4 border-slate-300 dark:border-slate-950 active:border-b-0 active:translate-y-[4px] transition-all"
          >
            {theme === "dark" ? <Sun size={14} className="lg:w-4 lg:h-4 animate-spin-slow" /> : <Moon size={14} className="lg:w-4 lg:h-4 animate-wiggle" />}
          </button>
        )}
      </div>

      {gameState === "playing" && (
        <div className="flex items-center gap-2 lg:gap-4 bg-white dark:bg-slate-900 px-3 py-1.5 lg:px-6 lg:py-2 rounded-xl lg:rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-center">
            <p className="text-[8px] lg:text-[10px] font-bold text-slate-500">
              حرة
            </p>
            <p className="font-black text-sm lg:text-base text-blue-600">
              {countriesLeft}
            </p>
          </div>
          <div className="w-px h-6 lg:h-8 bg-slate-200 dark:bg-slate-700"></div>
          <div className="text-center">
            <p className="text-[8px] lg:text-[10px] font-bold text-slate-500 max-w-[50px] lg:max-w-none truncate">
              {team1Name}
            </p>
            <p className="font-black text-sm lg:text-base text-cyan-600">
              {team1Owned}
            </p>
          </div>
          <div className="w-px h-6 lg:h-8 bg-slate-200 dark:bg-slate-700"></div>
          <div className="text-center">
            <p className="text-[8px] lg:text-[10px] font-bold text-slate-500 max-w-[50px] lg:max-w-none truncate">
              {team2Name}
            </p>
            <p className="font-black text-sm lg:text-base text-rose-600">
              {team2Owned}
            </p>
          </div>
        </div>
      )}
    </div>
    </>
  );
}