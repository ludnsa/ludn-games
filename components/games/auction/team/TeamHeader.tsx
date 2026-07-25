"use client";
import React from "react";
import { LogOut, BookOpen } from "lucide-react";
import Link from "next/link";

export default function TeamHeader({ handleLeave, roomCode }: any) {
  return (
    <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex gap-2">
        <button onClick={handleLeave} className="px-4 py-2 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-xl flex items-center justify-center gap-2 font-black text-xs border-b-4 border-rose-200 dark:border-rose-900 active:border-b-0 active:translate-y-[4px] transition-all">
          <LogOut size={16} /> <span className="hidden sm:inline">خروج</span>
        </button>
        <Link href="/guides?game=auction" target="_blank" className="px-4 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl flex items-center justify-center gap-2 font-black text-xs border-b-4 border-blue-200 dark:border-blue-900 active:border-b-0 active:translate-y-[4px] transition-all">
          <BookOpen size={16} /> <span className="hidden sm:inline">التعليمات</span>
        </Link>
      </div>
      <div className="text-left">
        <h1 className="text-lg font-black tracking-wide text-slate-900 dark:text-white">غرفة: <span className="text-yellow-600">{roomCode}</span></h1>
      </div>
    </div>
  );
}