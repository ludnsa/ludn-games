/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Cairo } from "next/font/google";
import { supabase } from "@/lib/supabase";
import {
  Database,
  FolderTree,
  Swords,
  Globe,
  Download,
  Upload,
  Activity,
  Clock,
  Timer,
  Target,
  HelpCircle,
  MapPin,
} from "lucide-react";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: any[] = [];
    let animationFrameId: number;

    const initParticles = () => {
      particles = [];
      const particleCount = Math.floor(
        (window.innerWidth * window.innerHeight) / 15000,
      );
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 1.5 + 0.5,
        });
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const isDark = document.documentElement.classList.contains("dark");
      const particleColor = isDark
        ? "rgba(148, 163, 184, 0.3)"
        : "rgba(100, 116, 139, 0.2)";

      for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize);
    resize();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />
  );
};

// مكون إحصائي مصغر لترتيب لوحة البيانات
const StatBox = ({ icon, title, count, colorTheme, className = "" }: any) => {
  const themes = {
    rose: "bg-white dark:bg-slate-900 border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400",
    blue: "bg-white dark:bg-slate-900 border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400",
  };

  return (
    <div
      className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm transition-all hover:scale-[1.02] ${themes[colorTheme as keyof typeof themes]} ${className}`}
    >
      <div className="flex items-center gap-2">
        <div className="opacity-70">{icon}</div>
        <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
          {title}
        </span>
      </div>
      <span className="text-2xl font-black drop-shadow-sm">{count}</span>
    </div>
  );
};

export default function AdminDashboardMain() {
  const [wdStats, setWdStats] = useState<{
    countries: number;
    questions: number;
    challenges: number;
    countryDetails: { name: string; qCount: number }[];
  }>({ countries: 0, questions: 0, challenges: 0, countryDetails: [] });
  const [cwStats, setCwStats] = useState({
    q30: 0,
    q5: 0,
    team: 0,
    general: 0,
  });

  useEffect(() => {
    // 1. جلب إحصائيات السيطرة على العالم من LocalStorage
    try {
      const wdCountriesRaw = localStorage.getItem("admin_wd_countries_db");
      const wdChallengesRaw = localStorage.getItem("admin_wd_challenges_db");

      let countriesCount = 0;
      let questionsCount = 0;
      let details: { name: string; qCount: number }[] = [];

      if (wdCountriesRaw) {
        const parsed = JSON.parse(wdCountriesRaw);
        countriesCount = parsed.length;
        parsed.forEach((c: any) => {
          const qCount = c.questions ? c.questions.length : 0;
          questionsCount += qCount;
          details.push({ name: c.name, qCount });
        });
      }

      let challengesCount = 0;
      if (wdChallengesRaw) {
        challengesCount = JSON.parse(wdChallengesRaw).length;
      }

      setWdStats({
        countries: countriesCount,
        questions: questionsCount,
        challenges: challengesCount,
        countryDetails: details,
      });
    } catch (e) {
      console.error("Error parsing WD stats", e);
    }

    // 2. جلب إحصائيات حرب القلاع من Supabase
    const fetchCWStats = async () => {
      try {
        const { data, error } = await supabase.from("cw_settings").select("*");
        if (data && !error) {
          let q30 = 0,
            q5 = 0,
            team = 0,
            general = 0;
          data.forEach((item) => {
            if (item.id === "admin_cw_30sec_db") q30 = item.data?.length || 0;
            if (item.id === "admin_cw_5sec_db") q5 = item.data?.length || 0;
            if (item.id === "admin_cw_team_db") team = item.data?.length || 0;
            if (item.id === "admin_cw_general_db")
              general = item.data?.length || 0;
          });
          setCwStats({ q30, q5, team, general });
        }
      } catch (error) {
        console.error("Error fetching CW stats", error);
      }
    };

    fetchCWStats();
  }, []);

  const handleExportBackup = () => {
    const keysToBackup = [
      "admin_wd_countries_db",
      "admin_wd_challenges_db",
      "admin_cw_30sec_db",
      "admin_cw_5sec_db",
      "admin_cw_team_db",
      "admin_cw_general_db",
      "admin_cw_castle1_img",
      "admin_cw_castle2_img",
      "castleRoomPositions",
      "admin_cw_instructions",
      "admin_cw_tour_texts",
    ];
    const backupData: any = {};
    keysToBackup.forEach((key) => {
      const data = localStorage.getItem(key);
      if (data) backupData[key] = data;
    });

    const blob = new Blob([JSON.stringify(backupData)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gamemaster_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        Object.keys(data).forEach((key) => {
          localStorage.setItem(key, data[key]);
        });
        alert(
          "تم استعادة النسخة الاحتياطية بنجاح! تم تحديث البيانات في النظام.",
        );
        window.location.reload(); // تحديث الصفحة لعكس الأرقام الجديدة
      } catch (error) {
        alert("الملف غير صالح أو تالف! يرجى اختيار ملف نسخة احتياطية صحيح.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <main
      className={`min-h-screen relative flex flex-col p-4 md:p-6 w-full ${cairo.className} overflow-x-hidden transition-colors duration-500 bg-slate-50 dark:bg-slate-950`}
      dir="rtl"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.3); border-radius: 10px; }
        .dark .custom-scroll::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.5); }
      `,
        }}
      />

      <ParticleBackground />

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-3rem)] pb-10">
        <header className="shrink-0 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] p-4 md:p-5 shadow-sm mb-6 transition-colors duration-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm transition-colors duration-500">
              <Database size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-wide transition-colors duration-500">
                لوحة التحكم المركزية
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-xs md:text-sm mt-0.5 transition-colors duration-500">
                إدارة الإعدادات وبنك المعلومات لجميع الألعاب
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50 transition-colors duration-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-colors duration-500">
              Hybrid Storage Active
            </span>
          </div>
        </header>

        <section className="flex-1 bg-transparent flex flex-col items-center justify-start text-center transition-colors duration-500">
          <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
            <FolderTree
              size={64}
              className="text-indigo-500 dark:text-indigo-400 mb-4 transition-colors duration-500 opacity-80"
            />
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2 transition-colors duration-500">
              مرحباً بك، مدير النظام
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-base mb-10 max-w-2xl leading-relaxed transition-colors duration-500">
              اختر اللعبة للبدء بتخصيص الإعدادات وبنوك الأسئلة الخاصة بها، أو
              راجع إحصائيات النظام الشاملة.
            </p>

            {/* ===================== لوحة البيانات (Dashboard) ===================== */}
            <div className="w-full max-w-5xl mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-2 mb-6 justify-center">
                <Activity className="text-emerald-500" size={28} />
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  إحصائيات النظام الشاملة
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full text-right">
                {/* إحصائيات حرب القلاع */}
                <div className="bg-slate-50 dark:bg-slate-800/80 border-2 border-rose-200 dark:border-rose-900/50 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl shadow-sm">
                      <Swords size={24} />
                    </div>
                    <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">
                      حرب القلاع
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <StatBox
                      icon={<Clock size={18} />}
                      title="30 ثانية"
                      count={cwStats.q30}
                      colorTheme="rose"
                    />
                    <StatBox
                      icon={<Timer size={18} />}
                      title="5 ثواني"
                      count={cwStats.q5}
                      colorTheme="rose"
                    />
                    <StatBox
                      icon={<Target size={18} />}
                      title="تحدي فريق"
                      count={cwStats.team}
                      colorTheme="rose"
                    />
                    <StatBox
                      icon={<HelpCircle size={18} />}
                      title="أسئلة عامة"
                      count={cwStats.general}
                      colorTheme="rose"
                    />
                  </div>
                </div>

                {/* إحصائيات السيطرة على العالم */}
                <div className="bg-slate-50 dark:bg-slate-800/80 border-2 border-blue-200 dark:border-blue-900/50 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl shadow-sm">
                      <Globe size={24} />
                    </div>
                    <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">
                      السيطرة على العالم
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <StatBox
                      icon={<MapPin size={18} />}
                      title="الدول المضافة"
                      count={wdStats.countries}
                      colorTheme="blue"
                    />
                    <StatBox
                      icon={<HelpCircle size={18} />}
                      title="أسئلة الدول"
                      count={wdStats.questions}
                      colorTheme="blue"
                    />
                    <StatBox
                      icon={<Target size={18} />}
                      title="تحديات الحكم"
                      count={wdStats.challenges}
                      colorTheme="blue"
                      className="col-span-2"
                    />
                  </div>

                  {/* تفصيل الأسئلة لكل دولة */}
                  {wdStats.countryDetails.length > 0 && (
                    <div className="mt-auto border-t border-blue-100 dark:border-blue-900/30 pt-4">
                      <h5 className="text-[11px] font-black text-slate-500 dark:text-slate-400 mb-3 text-right">
                        تفصيل الأسئلة لكل دولة:
                      </h5>
                      <div className="flex flex-wrap gap-2 max-h-[90px] overflow-y-auto custom-scroll pr-1">
                        {wdStats.countryDetails.map((c, i) => (
                          <div
                            key={i}
                            className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2 py-1.5 rounded-lg flex items-center gap-2 shadow-sm"
                          >
                            <span className="truncate max-w-[80px]">
                              {c.name}
                            </span>
                            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded-md font-black">
                              {c.qCount}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* ==================================================================== */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-12">
              {/* بطاقة السيطرة على العالم */}
              <Link href="/admin/world-domination" className="group">
                <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col items-center transition-all duration-300 hover:border-blue-500 hover:shadow-lg dark:hover:bg-slate-800 h-full">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl mb-4 group-hover:scale-110 group-hover:bg-blue-100 dark:group-hover:bg-blue-600/30 transition-all duration-300">
                    <Globe size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                    السيطرة على العالم
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">
                    إدارة الخريطة، الدول، وتحديات الحكم
                  </p>
                </div>
              </Link>

              {/* بطاقة حرب القلاع */}
              <Link href="/admin/castle-war" className="group">
                <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col items-center transition-all duration-300 hover:border-rose-500 hover:shadow-lg dark:hover:bg-slate-800 h-full">
                  <div className="p-4 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl mb-4 group-hover:scale-110 group-hover:bg-rose-100 dark:group-hover:bg-rose-600/30 transition-all duration-300">
                    <Swords size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                    حرب القلاع
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">
                    إدارة الأسئلة، التحديات، وصور القلاع
                  </p>
                </div>
              </Link>
            </div>

            {/* قسم النسخ الاحتياطي */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-xl transition-colors duration-500 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 transition-colors duration-500">
                النسخ الاحتياطي للنظام
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-5 transition-colors duration-500">
                لأن بعض البيانات مخزنة محلياً، ننصحك بأخذ نسخة احتياطية دورية
                لحفظ عملك.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleExportBackup}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                >
                  <Download size={18} /> حفظ نسخة احتياطية
                </button>

                <label className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer active:scale-95">
                  <Upload size={18} /> استعادة من ملف
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportBackup}
                  />
                </label>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
