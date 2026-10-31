import React from "react";

import { HomeClientWrapper } from "@/components/home/HomeClientWrapper";

export const metadata = {
  title: "منصة ألعاب لدن",
  description: "عيش جو التحدي مع ألعاب لدن الجماعية ، خيارك الأول لجمعة العائلة وشباب الإستراحة وزملاءك في العمل.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen relative flex flex-col items-center overflow-x-hidden ludn-glow-bg text-ludn-fg" dir="rtl">
      <HomeClientWrapper />
    </main>
  );
}
