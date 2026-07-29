"use client";
import React, { useState } from "react";
import { Globe, Swords, Gavel, LayoutGrid, MapPin, HelpCircle, Target, Clock, Timer, Activity, Layers, ChevronDown, ChevronUp } from "lucide-react";
import { QUIZ_GAME } from "@/constants/quiz-grid";

const StatItem = ({ icon, title, count, colorTheme }: any) => {
  const themes: Record<string, string> = {
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${themes[colorTheme]}`}>
          {icon}
        </div>
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{title}</span>
      </div>
      <span className="text-lg font-black text-slate-900 dark:text-white px-2">{count}</span>
    </div>
  );
};

export default function AdminStatsSection({ wdStats, cwStats, awStats, quizStats }: any) {
  const [showWdDetails, setShowWdDetails] = useState(false);
  const quiz = quizStats || { categories: 0, questions: 0, q200: 0, q400: 0, q600: 0 };

  return (
    <div className="w-full mb-8">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 bg-indigo-600 rounded-[2rem] p-6 text-white shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-900/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
            <Activity size={32} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl md:text-3xl font-black mb-1">لوحة إحصائيات الألعاب</h3>
            <p className="text-indigo-100 font-bold text-sm">نظرة عامة على محتوى بنوك الأسئلة في المنصة</p>
          </div>
        </div>
        
        <div className="relative z-10 flex gap-4 w-full md:w-auto">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex-1 md:w-32 text-center">
            <div className="text-3xl font-black mb-1">{wdStats.questions + cwStats.q30 + cwStats.q5 + cwStats.team + cwStats.general + awStats.questions + quiz.questions}</div>
            <div className="text-[10px] font-bold text-indigo-100">إجمالي الأسئلة</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 w-full">

        {/* السيطرة على العالم */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm flex flex-col transition-all hover:border-blue-300 dark:hover:border-blue-800">
          <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/30">
              <Globe size={28} />
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white">السيطرة على العالم</h4>
              <p className="text-xs font-bold text-slate-500">إحصائيات الخريطة والتحديات</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 mb-4">
            <StatItem icon={<MapPin size={18} />} title="الدول المضافة" count={wdStats.countries} colorTheme="blue" />
            <StatItem icon={<HelpCircle size={18} />} title="أسئلة الدول" count={wdStats.questions} colorTheme="blue" />
            <StatItem icon={<Target size={18} />} title="أسئلة التحديات" count={wdStats.challenges} colorTheme="blue" />
          </div>

          <div className="mt-auto pt-2">
            <button 
              onClick={() => setShowWdDetails(!showWdDetails)}
              className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors font-bold text-sm"
            >
              <span>تفصيل الأسئلة لكل دولة</span>
              {showWdDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            
            {showWdDetails && (
              <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-4 max-h-[160px] overflow-y-auto custom-scroll">
                {wdStats.countryDetails.length === 0 ? (
                  <p className="text-center text-xs font-bold text-slate-400">لا توجد دول مضافة بعد.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {wdStats.countryDetails.map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate pl-2">{c.name}</span>
                        <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-black px-2 py-0.5 rounded-md shrink-0">
                          {c.qCount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* حرب القلاع */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm flex flex-col transition-all hover:border-rose-300 dark:hover:border-rose-800">
          <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-3 bg-gradient-to-br from-rose-400 to-rose-600 text-white rounded-2xl shadow-lg shadow-rose-500/30">
              <Swords size={28} />
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white">حرب القلاع</h4>
              <p className="text-xs font-bold text-slate-500">تفاصيل بنوك الأسئلة الأربعة</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <StatItem icon={<Clock size={18} />} title="أسئلة 30 ثانية" count={cwStats.q30} colorTheme="rose" />
            <StatItem icon={<Timer size={18} />} title="أسئلة 5 ثواني" count={cwStats.q5} colorTheme="rose" />
            <StatItem icon={<Target size={18} />} title="تحدي فريق لفريق" count={cwStats.team} colorTheme="rose" />
            <StatItem icon={<HelpCircle size={18} />} title="أسئلة عامة (بدون وقت)" count={cwStats.general} colorTheme="rose" />
          </div>
        </div>

        {/* حرب المزايدات */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm flex flex-col transition-all hover:border-amber-300 dark:hover:border-amber-800">
          <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-2xl shadow-lg shadow-amber-500/30">
              <Gavel size={28} />
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white">حرب المزايدات</h4>
              <p className="text-xs font-bold text-slate-500">إحصائية المزاد والأسئلة</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <StatItem icon={<HelpCircle size={18} />} title="إجمالي أسئلة المزايدة" count={awStats.questions} colorTheme="amber" />
          </div>
          
          <div className="mt-auto pt-6 flex items-center justify-center">
             <div className="w-32 h-32 opacity-10 dark:opacity-20 pointer-events-none">
               <Gavel className="w-full h-full text-amber-500" />
             </div>
          </div>
        </div>

        {/* تحدي الفئات */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm flex flex-col transition-all hover:border-violet-300 dark:hover:border-violet-800">
          <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-3 bg-gradient-to-br from-violet-400 to-violet-600 text-white rounded-2xl shadow-lg shadow-violet-500/30">
              <LayoutGrid size={28} />
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white">{QUIZ_GAME.title}</h4>
              <p className="text-xs font-bold text-slate-500">الفئات والأسئلة حسب النقاط</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <StatItem icon={<Layers size={18} />} title="عدد الفئات" count={quiz.categories} colorTheme="violet" />
            <StatItem icon={<HelpCircle size={18} />} title="أسئلة 200 نقطة" count={quiz.q200} colorTheme="violet" />
            <StatItem icon={<HelpCircle size={18} />} title="أسئلة 400 نقطة" count={quiz.q400} colorTheme="violet" />
            <StatItem icon={<HelpCircle size={18} />} title="أسئلة 600 نقطة" count={quiz.q600} colorTheme="violet" />
          </div>
        </div>

      </div>
    </div>
  );
}