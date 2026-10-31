import React from "react";
import { Smartphone, Users, Zap, Monitor } from "lucide-react";

const FEATURES = [
  { Icon: Smartphone, title: "بدون تحميل", text: "تفتح من المتصفح على الجوال أو التابلت أو الكمبيوتر." },
  { Icon: Users, title: "لعب جماعي", text: "العب مع أهلك وربعك بنفس المكان." },
  { Icon: Zap, title: "مباشر", text: "الأصوات والنتائج تطلع للكل لحظتها." },
  { Icon: Monitor, title: "شاشة عرض", text: "بعض الألعاب لها شاشة للتلفزيون أو البروجكتر." },
];

export const AboutSection = () => {
  return (
    <section id="about-section" className="w-full max-w-6xl mx-auto px-4 py-8 md:py-12 grid gap-4">
      <h2 className="font-display text-[30px] md:text-[40px] leading-tight text-ludn-fg">ليش لدن؟</h2>
      <p className="text-ludn-muted font-semibold leading-relaxed max-w-2xl">
        منصة ألعاب لدن منصة ألعاب تفاعلية تجمع العائلة والأصدقاء في لحظات مليئة بالحماس والضحك، من تصميم وتطوير فريق
        منصة ألعاب لدن.
      </p>
      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
        {FEATURES.map(({ Icon, title, text }) => (
          <li key={title} className="min-w-0 grid gap-1 content-start rounded-[18px] bg-ludn-surface border border-ludn-line p-3.5 md:p-5">
            <Icon className="w-[26px] h-[26px] mb-1 text-ludn-gold-text" />
            <b className="text-[15px] text-ludn-fg">{title}</b>
            <span className="text-[13px] leading-relaxed font-semibold text-ludn-muted">{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};
