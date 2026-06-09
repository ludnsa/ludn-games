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
  LogOut,
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

  // مرجع لعداد وقت الخمول
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // دالة تسجيل الخروج الأساسية
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // نظام تتبع الخمول وتسجيل الخروج التلقائي
  useEffect(() => {
    const resetTimer = () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      // ضبط الوقت على 15 دقيقة (15 * 60 * 1000 = 900,000 ملي ثانية)
      logoutTimerRef.current = setTimeout(() => {
        handleLogout();
      }, 900000);
    };

    // الأحداث اللي تدل على إن المستخدم متواجد وما زال شغال
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];

    const handleActivity = () => {
      resetTimer();
    };

    // ربط مراقبة الأحداث بالصفحة
    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    // تشغيل العداد لأول مرة عند دخول الصفحة
    resetTimer();

    // تنظيف الأحداث والعداد لو طلع من الصفحة عشان ما يصير مشاكل بالذاكرة
    return () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  useEffect(() => {
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
        Object.keys(data).forEach((key) =>
          localStorage.setItem(key, data[key]),
        );
        alert("تم استعادة النسخة الاحتياطية بنجاح!");
        window.location.reload();
      } catch (error) {
        alert("الملف غير صالح!");
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
      `,
        }}
      />
      <ParticleBackground />
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col pb-10">
        <header className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] p-5 shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600">
              <Database size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">
                لوحة التحكم المركزية
              </h1>
              <p className="text-sm font-bold text-slate-500">
                إدارة بنوك المعلومات لجميع الألعاب
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold py-2.5 px-5 rounded-xl transition-all border border-rose-100 dark:border-rose-900/30"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">تسجيل الخروج</span>
          </button>
        </header>

        <section className="flex-1 flex flex-col items-center">
          <div className="w-full max-w-5xl mb-12">
            <div className="flex items-center gap-2 mb-6 justify-center">
              <Activity className="text-emerald-500" size={28} />
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                إحصائيات النظام
              </h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
              <div className="bg-slate-50 dark:bg-slate-800/80 border-2 border-rose-200 dark:border-rose-900/50 rounded-[2rem] p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 text-rose-600 rounded-xl">
                    <Swords size={24} />
                  </div>
                  <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">
                    حرب القلاع
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
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
              <div className="bg-slate-50 dark:bg-slate-800/80 border-2 border-blue-200 dark:border-blue-900/50 rounded-[2rem] p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 rounded-xl">
                    <Globe size={24} />
                  </div>
                  <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">
                    السيطرة على العالم
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <StatBox
                    icon={<MapPin size={18} />}
                    title="الدول"
                    count={wdStats.countries}
                    colorTheme="blue"
                  />
                  <StatBox
                    icon={<HelpCircle size={18} />}
                    title="أسئلة"
                    count={wdStats.questions}
                    colorTheme="blue"
                  />
                  <StatBox
                    icon={<Target size={18} />}
                    title="تحديات"
                    count={wdStats.challenges}
                    colorTheme="blue"
                    className="col-span-2"
                  />
                </div>
                <div className="mt-auto border-t border-blue-100 dark:border-blue-900/30 pt-4">
                  <h5 className="text-[11px] font-black text-slate-500 mb-3">
                    تفصيل الأسئلة لكل دولة:
                  </h5>
                  <div className="flex flex-wrap gap-2 max-h-[90px] overflow-y-auto custom-scroll pr-1">
                    {wdStats.countryDetails.map((c, i) => (
                      <div
                        key={i}
                        className="bg-white dark:bg-slate-900 border border-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1.5 rounded-lg flex items-center gap-2"
                      >
                        {c.name}
                        <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-md font-black">
                          {c.qCount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-12">
            <Link href="/admin/world-domination" className="group">
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 rounded-3xl p-8 flex flex-col items-center hover:border-blue-500 transition-all">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl mb-4">
                  <Globe size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  السيطرة على العالم
                </h3>
              </div>
            </Link>
            <Link href="/admin/castle-war" className="group">
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 rounded-3xl p-8 flex flex-col items-center hover:border-rose-500 transition-all">
                <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl mb-4">
                  <Swords size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  حرب القلاع
                </h3>
              </div>
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-6 w-full max-w-xl shadow-sm">
            <h3 className="text-lg font-black mb-2">النسخ الاحتياطي</h3>
            <div className="flex gap-3">
              <button
                onClick={handleExportBackup}
                className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <Download size={18} /> حفظ
              </button>
              <label className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer">
                <Upload size={18} /> استعادة
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportBackup}
                />
              </label>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
