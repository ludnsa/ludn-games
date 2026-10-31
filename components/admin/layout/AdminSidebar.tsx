"use client";
import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Swords, Gavel, LayoutGrid, Inbox, Users, LayoutDashboard } from "lucide-react";
import { QUIZ_GAME } from "@/constants/quiz-grid";

/** أقسام لوحة التحكم: شريط يتمرر بالعرض على الجوال، وقائمة جانبية ثابتة على الكمبيوتر */
export default function AdminSidebar() {
  const pathname = usePathname();

  // على الجوال الشريط يتمرر بالعرض: نخلي القسم الحالي ظاهر فيه
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    navRef.current
      ?.querySelector<HTMLElement>('[aria-current="page"]')
      ?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [pathname]);

  const links = [
    { href: "/admin", label: "الرئيسية", icon: LayoutDashboard, exact: true },
    { href: "/admin/world-domination", label: "السيطرة على العالم", icon: Globe },
    { href: "/admin/castle-war", label: "حرب القلاع", icon: Swords },
    { href: "/admin/auction", label: "حرب المزايدات", icon: Gavel },
    { href: QUIZ_GAME.adminPath, label: QUIZ_GAME.title, icon: LayoutGrid },
    { href: "/admin/messages", label: "صندوق الوارد", icon: Inbox },
    { href: "/admin/users", label: "المستخدمين", icon: Users },
  ];

  return (
    <nav
      ref={navRef}
      aria-label="أقسام لوحة التحكم"
      className="min-w-0 flex lg:flex-col gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1 lg:m-0 lg:p-0 lg:overflow-visible lg:sticky lg:top-24"
    >
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`shrink-0 flex items-center gap-2.5 min-h-10 lg:min-h-12 px-3.5 rounded-full lg:rounded-2xl border text-sm font-bold whitespace-nowrap transition-colors ${
              isActive ? "bg-ludn-fg text-ludn-bg border-ludn-fg" : "bg-ludn-surface text-ludn-muted border-ludn-line hover:text-ludn-fg"
            }`}
          >
            <Icon size={18} className={`shrink-0 ${isActive ? "" : "text-ludn-gold-text"}`} />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
