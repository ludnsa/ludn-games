"use client";

import React from "react";
import { Globe, Crosshair } from "lucide-react";

const TankIcon = ({
  className,
  size = 24,
}: {
  className?: string;
  size?: number;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M8 11V9a2 2 0 0 1 2-2h4" />
    <path d="M14 7h6" />
    <rect x="2" y="13" width="20" height="6" rx="3" />
    <path d="M5 13v-1.5a1.5 1.5 0 0 1 1.5-1.5h11a1.5 1.5 0 0 1 1.5 1.5V13" />
    <circle cx="6" cy="16" r="1" />
    <circle cx="12" cy="16" r="1" />
    <circle cx="18" cy="16" r="1" />
  </svg>
);

export default function LoadingScreen() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center text-slate-900 dark:text-white font-black text-2xl" dir="rtl">
      <div className="relative flex items-center justify-center mb-8">
        <Globe className="w-28 h-28 text-slate-200 dark:text-slate-800 animate-spin-slow" />
        <TankIcon size={48} className="text-emerald-500 absolute animate-pulse drop-shadow-lg" />
        <Crosshair className="w-16 h-16 text-rose-500 absolute animate-ping opacity-70" />
      </div>
      <div className="flex flex-col items-center gap-3">
        <h2 className="text-3xl text-emerald-600 dark:text-emerald-400 animate-pulse drop-shadow-sm">جاري حشد الجيوش...</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-bold tracking-widest">تجهيز الخرائط وتوزيع الدبابات</p>
      </div>
    </div>
  );
}