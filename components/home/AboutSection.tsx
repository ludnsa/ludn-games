import React from "react";
import { Zap, Target, Laptop, Package } from "lucide-react";

const AboutCard = ({ title, description, icon, colorClass }: { title: string; description: string; icon: React.ReactNode; colorClass: string; }) => (
  <div className={`relative w-full ${colorClass} rounded-2xl border-4 border-black dark:border-white p-6 shadow-[6px_6px_0px_#000] dark:shadow-[6px_6px_0px_rgba(255,255,255,0.2)] animate-in zoom-in-95`}>
    <div className="flex justify-start items-center gap-3 mb-4">
      <div className="text-black dark:text-white shrink-0">{icon}</div>
      <h3 className="text-xl font-black text-black dark:text-white tracking-tight">
        {title}
      </h3>
    </div>
    <p className="font-bold text-xs md:text-sm leading-relaxed text-slate-800 dark:text-white tracking-tight">
      {description}
    </p>
  </div>
);

export const AboutSection = ({ setIsJoinModalOpen }: { setIsJoinModalOpen: (val: boolean) => void }) => {
  return (
    <section id="about-section" className="w-full max-w-7xl mx-auto px-4 py-16 md:py-20 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-12 lg:items-center">
      <div className="lg:col-span-6 text-slate-900 dark:text-white space-y-6 animate-in slide-in-from-right-8 duration-700 text-center md:text-right">
        <div className="relative inline-block mb-2 md:mb-4">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-emerald-600 dark:from-blue-400 dark:to-emerald-400 drop-shadow-sm pb-2">عن المنصة</h2>
          <div className="absolute -bottom-1 right-0 left-0 h-2 bg-black dark:bg-emerald-500 rounded-full"></div>
        </div>
        <div className="space-y-4 md:space-y-5 text-lg md:text-2xl font-bold leading-relaxed max-w-2xl text-slate-700 dark:text-slate-300 mx-auto md:mx-0">
          <p>منصة ألعاب تفاعلية تجمع العائلة والأصدقاء في لحظات مليئة بالحماس والضحك.</p>
          <p className="border-r-4 border-emerald-400 pr-4 md:pr-5 py-2 text-base md:text-xl text-slate-600 dark:text-slate-400">
            تم تصميمها وتطويرها بواسطة <br />
            <span className="font-black text-blue-600 dark:text-blue-400">مؤسسة لدن التقنية لحلول الأعمال.</span>
          </p>
        </div>
        <button onClick={() => setIsJoinModalOpen(true)} className="mt-6 md:mt-8 flex items-center justify-center gap-3 px-8 py-4 md:py-5 bg-emerald-500 border-b-4 border-emerald-700 hover:bg-emerald-400 text-white rounded-2xl font-black text-lg md:text-2xl transition-all active:scale-95 active:border-b-0 active:translate-y-1 w-full md:w-auto mx-auto md:mx-0">
          ابدأ اللعب 🎮
        </button>
      </div>
      <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6" dir="ltr">
        <AboutCard title="تفاعل مباشر" description="تحديات وتفاعل لحظي بين اللاعبين في كل جولة" icon={<Zap size={32} className="md:w-9 md:h-9" />} colorClass="bg-[#2dd4bf] dark:bg-[#115e59]" />
        <AboutCard title="لعب جماعي" description="العب مع اخوياك وأهلك بنفس الوقت ومن مكانكم" icon={<Target size={32} className="md:w-9 md:h-9" />} colorClass="bg-[#818cf8] dark:bg-[#3730a3]" />
        <AboutCard title="من أي جهاز" description="العب من جوالك، تابلت، أو الكمبيوتر بدون تحميل" icon={<Laptop size={32} className="md:w-9 md:h-9" />} colorClass="bg-[#a7f3d0] dark:bg-[#065f46]" />
        <AboutCard title="خدمات متنوعة" description="ألعاب وخدمات مبتكرة ومفيدة لتجمعاتكم" icon={<Package size={32} className="md:w-9 md:h-9" />} colorClass="bg-[#a78bfa] dark:bg-[#5b21b6]" />
      </div>
    </section>
  );
};
