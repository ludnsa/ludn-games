"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Swords, Gavel, LayoutGrid, Inbox, Users } from "lucide-react";
import { QUIZ_GAME } from "@/constants/quiz-grid";

export default function AdminSidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/admin/world-domination", label: "السيطرة على العالم", icon: Globe, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { href: "/admin/castle-war", label: "حرب القلاع", icon: Swords, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-900/20" },
    { href: "/admin/auction", label: "حرب المزايدات", icon: Gavel, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { href: QUIZ_GAME.adminPath, label: QUIZ_GAME.title, icon: LayoutGrid, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20" },
    { href: "/admin/messages", label: "صندوق الوارد", icon: Inbox, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
    { href: "/admin/users", label: "المستخدمين", icon: Users, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  ];

  return (
    <aside className="w-full md:w-64 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col p-4 gap-4 h-auto md:min-h-[calc(100vh-2rem)] rounded-[1.5rem] shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black text-slate-800 dark:text-white mb-1">الوصول السريع</h2>
        <p className="text-xs font-bold text-slate-500">انتقل بين لوحات التحكم</p>
      </div>

      <nav className="flex flex-col gap-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname.startsWith(link.href);
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${isActive ? `${link.bg} ${link.color} shadow-sm` : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
            >
              <div className={`p-2 rounded-lg ${isActive ? 'bg-white dark:bg-slate-800' : link.bg} ${link.color}`}>
                <Icon size={18} />
              </div>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
