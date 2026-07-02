"use client";
import React from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { useAdminMessagesNav } from "@/hooks/useAdminMessagesNav";

export default function AdminMessagesNavigation() {
  const { messageCount } = useAdminMessagesNav();

  return (
    <div className="flex items-center">
      <Link
        href="/admin/messages"
        className="relative flex items-center justify-center gap-2 h-12 px-4 sm:px-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all shadow-sm group"
        title="صندوق الوارد"
      >
        <div className="relative">
          <Inbox size={20} className="group-hover:scale-110 transition-transform" />
          {messageCount > 0 && (
            <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[20px] h-5 px-1 bg-rose-500 text-white text-[10px] font-black rounded-full animate-pulse shadow-md border-2 border-white dark:border-slate-800">
              {messageCount}
            </span>
          )}
        </div>
        <span className="hidden sm:inline">صندوق الوارد</span>
      </Link>
    </div>
  );
}