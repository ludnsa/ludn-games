import React from "react";
import dynamic from "next/dynamic";
import { Tajawal } from "next/font/google";
import { HomeClientWrapper } from "@/components/home/HomeClientWrapper";

// Load the heavy animated background dynamically to improve initial load
const SolidGamingBackground = dynamic(
  () => import("@/components/home/SolidGamingBackground"),
  { ssr: false }
);

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800", "900"],
});

export const metadata = {
  title: "منصة ألعاب لدن | Lden Gaming Platform",
  description: "شريكك التقني لتطوير مواقع وتطبيقات حديثة تلبي طموحاتك وتعزز نجاحك في العالم الرقمي.",
};

export default function HomePage() {
  return (
    <main className={`min-h-screen relative flex flex-col items-center ${tajawal.className} overflow-x-hidden bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300`} dir="rtl">
      <SolidGamingBackground />
      <HomeClientWrapper />
    </main>
  );
}