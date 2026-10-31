import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";

/**
 * قالب الصفحات الداخلية: نفس خلفية الرئيسية + الهيدر وشريط التبويب + الفوتر.
 * afterLogout: لو الصفحة تحتاج تنقل المستخدم بعد ما يطلع من حسابه.
 */
export function SitePage({
  children,
  width = "max-w-6xl",
  afterLogout,
}: {
  children: React.ReactNode;
  width?: string;
  afterLogout?: () => void;
}) {
  return (
    <main className="min-h-screen relative flex flex-col overflow-x-hidden ludn-glow-bg text-ludn-fg" dir="rtl">
      <TopNav afterLogout={afterLogout} />
      <div aria-hidden className="ludn-lattice absolute inset-x-0 top-0 h-[420px] pointer-events-none" />
      <div className={`relative w-full ${width} mx-auto flex-1 px-4 pt-[calc(5.5rem+env(safe-area-inset-top,0px))] lg:pt-28 pb-10`}>
        {children}
      </div>
      <Footer />
    </main>
  );
}

/** عنوان الصفحة: زر رجوع (اختياري) + عنوان بخط العناوين + وصف، وشي جانبي مثل الرصيد */
export function PageHeading({
  title,
  subtitle,
  back,
  aside,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  aside?: React.ReactNode;
}) {
  return (
    <header className="grid gap-3 mb-6 md:mb-8">
      {back && (
        <Link
          href={back.href}
          className="w-fit h-9 ps-2.5 pe-3.5 rounded-xl bg-ludn-surface border border-ludn-line text-sm font-bold text-ludn-muted hover:text-ludn-fg flex items-center gap-1.5 transition-colors"
        >
          <ArrowRight size={17} /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="grid gap-1.5 min-w-0">
          <h1 className="font-display text-[34px] md:text-[46px] leading-[1.15] text-ludn-fg text-balance">{title}</h1>
          {subtitle && <p className="text-ludn-muted font-semibold leading-relaxed max-w-2xl">{subtitle}</p>}
        </div>
        {aside}
      </div>
    </header>
  );
}

/** صفحات الدخول المستقلة (بدون هيدر وشريط): الشعار فوق وبطاقة بالنص */
export function AuthShell({ children, corner }: { children: React.ReactNode; corner?: React.ReactNode }) {
  return (
    <main
      className="min-h-screen relative flex flex-col items-center justify-center overflow-x-hidden ludn-glow-bg text-ludn-fg px-4 pt-[calc(3rem+env(safe-area-inset-top,0px))] pb-12"
      dir="rtl"
    >
      <div aria-hidden className="ludn-lattice absolute inset-x-0 top-0 h-[420px] pointer-events-none" />
      {corner}
      <div className="relative w-full max-w-md grid gap-5">
        <Link href="/" className="justify-self-center flex items-center gap-2.5 transition-transform active:scale-95">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ludn-logo.webp" alt="منصة ألعاب لدن" width={51} height={44} className="h-11 w-auto" />
          <span className="font-display text-[24px] leading-none pt-1">ألعاب لدن</span>
        </Link>
        {children}
      </div>
    </main>
  );
}
