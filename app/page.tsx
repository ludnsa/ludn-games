import React from "react";

import { Tajawal } from "next/font/google";
import { HomeClientWrapper } from "@/components/home/HomeClientWrapper";

import SolidGamingBackground from "@/components/home/SolidGamingBackground";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800", "900"],
});

export const metadata = {
  title: "منصة ألعاب لدن",
  description: "عيش جو التحدي مع ألعاب لدن الجماعية ، خيارك الأول لجمعة العائلة وشباب الإستراحة وزملاءك في العمل.",
};

export default function HomePage() {
  return (
    <main className={`min-h-screen relative flex flex-col items-center ${tajawal.className} overflow-x-hidden bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300`} dir="rtl">
      <SolidGamingBackground />
      <HomeClientWrapper />
    </main>
  );
}