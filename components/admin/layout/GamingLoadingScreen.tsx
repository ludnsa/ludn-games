"use client";

import React from "react";
import { SPINNER } from "./adminUi";

export default function GamingLoadingScreen({
  title = "جاري الاتصال بمركز القيادة...",
  subtitle = "يتم الآن مزامنة بنك الأسئلة والبيانات من السيرفر..."
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen w-full grid place-items-center p-6 ludn-glow-bg text-ludn-fg relative overflow-hidden" dir="rtl">
      <div aria-hidden className="ludn-lattice absolute inset-x-0 top-0 h-[420px] pointer-events-none" />
      <div className="relative w-full max-w-sm grid gap-4 justify-items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ludn-logo.webp" alt="" width={64} height={56} className="h-14 w-auto mb-2" />
        <div className={`${SPINNER} w-12 h-12`} />
        <h2 className="font-display text-[26px] leading-snug">{title}</h2>
        {subtitle && <p className="text-ludn-muted text-sm font-bold leading-relaxed">{subtitle}</p>}
      </div>
    </div>
  );
}
