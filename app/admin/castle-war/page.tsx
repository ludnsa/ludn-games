/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Cairo } from "next/font/google";
import { createBrowserClient } from "@supabase/ssr";
import {
  Swords,
  Trash2,
  UploadCloud,
  Check,
  Clock,
  Timer,
  HelpCircle,
  Download,
  Upload,
  Target,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
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

export default function CastleWarAdmin() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [cwActiveSubTab, setCwActiveSubTab] = useState<
    "30sec" | "5sec" | "team" | "general"
  >("30sec");

  const [cw30SecDB, setCw30SecDB] = useState<string[]>([]);
  const [newCw30Sec, setNewCw30Sec] = useState<string>("");
  const [selectedCw30Sec, setSelectedCw30Sec] = useState<string[]>([]);

  const [cw5SecDB, setCw5SecDB] = useState<string[]>([]);
  const [newCw5Sec, setNewCw5Sec] = useState<string>("");
  const [selectedCw5Sec, setSelectedCw5Sec] = useState<string[]>([]);

  const [cwTeamDB, setCwTeamDB] = useState<string[]>([]);
  const [newCwTeam, setNewCwTeam] = useState<string>("");
  const [selectedCwTeam, setSelectedCwTeam] = useState<string[]>([]);

  const [cwGenDB, setCwGenDB] = useState<
    { q: string; a: string; options?: string[] }[]
  >([]);
  const [selectedCwGen, setSelectedCwGen] = useState<number[]>([]);
  const [newCwGenQuestion, setNewCwGenQuestion] = useState<string>("");
  const [genOpt1, setGenOpt1] = useState<string>("");
  const [genOpt2, setGenOpt2] = useState<string>("");
  const [genOpt3, setGenOpt3] = useState<string>("");
  const [correctGenOpt, setCorrectGenOpt] = useState<number>(1);

  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase.from("cw_settings").select("*");
      if (data && !error) {
        data.forEach((item) => {
          if (item.id === "admin_cw_30sec_db") setCw30SecDB(item.data);
          if (item.id === "admin_cw_5sec_db") setCw5SecDB(item.data);
          if (item.id === "admin_cw_team_db") setCwTeamDB(item.data);
          if (item.id === "admin_cw_general_db") setCwGenDB(item.data);
        });
      }
    };
    fetchSettings();
  }, [supabase]);

  const saveCw30Data = async (newData: any) => {
    setCw30SecDB(newData);
    await supabase
      .from("cw_settings")
      .upsert({ id: "admin_cw_30sec_db", data: newData });
  };
  const saveCw5Data = async (newData: any) => {
    setCw5SecDB(newData);
    await supabase
      .from("cw_settings")
      .upsert({ id: "admin_cw_5sec_db", data: newData });
  };
  const saveCwTeamData = async (newData: any) => {
    setCwTeamDB(newData);
    await supabase
      .from("cw_settings")
      .upsert({ id: "admin_cw_team_db", data: newData });
  };
  const saveCwGenData = async (newData: any) => {
    setCwGenDB(newData);
    await supabase
      .from("cw_settings")
      .upsert({ id: "admin_cw_general_db", data: newData });
  };

  const exportToJsonFile = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("تم تصدير الملف بنجاح!");
  };

  const handleJsonImport = (
    e: React.ChangeEvent<HTMLInputElement>,
    saveFn: (data: any) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          saveFn(parsed);
          showToast("تم استيراد البيانات بنجاح!");
        } else {
          showToast(
            "صيغة الملف غير صحيحة، يجب أن يكون الملف مصفوفة (Array).",
            "error",
          );
        }
      } catch (error) {
        showToast("حدث خطأ أثناء قراءة ملف JSON.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExcelUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    db: string[],
    saveFn: (data: any) => void,
    typeLabel: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
        }) as any[][];
        let prompts: string[] = [];
        jsonData.forEach((row) =>
          row.forEach((cell) => {
            if (typeof cell === "string" && cell.trim())
              prompts.push(cell.trim());
            else if (typeof cell === "number") prompts.push(String(cell));
          }),
        );
        if (prompts.length > 0) {
          saveFn(Array.from(new Set([...db, ...prompts])));
          showToast(`تم رفع ${prompts.length} ${typeLabel} بنجاح!`);
        } else {
          showToast("الملف المرفوع فارغ.", "error");
        }
      } catch (error) {
        showToast("خطأ في قراءة ملف الإكسل.", "error");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleCwGenFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
        }) as any[][];

        const parsedQAs = jsonData
          .map((row) => {
            if (row.length >= 5) {
              return {
                q: String(row[0]).trim(),
                options: [
                  String(row[1]).trim(),
                  String(row[2]).trim(),
                  String(row[3]).trim(),
                ],
                a: String(row[4]).trim(),
              };
            } else if (row.length >= 2) {
              return { q: String(row[0]).trim(), a: String(row[1]).trim() };
            }
            return null;
          })
          .filter((item) => item !== null && item.q && item.a) as any[];

        if (parsedQAs.length > 0) {
          saveCwGenData([...cwGenDB, ...parsedQAs]);
          showToast(`تم رفع ودمج ${parsedQAs.length} سؤال بنجاح!`);
        } else {
          showToast(
            "لم يتم العثور على أسئلة صحيحة. راجع التنسيق المطلوب.",
            "error",
          );
        }
      } catch (error) {
        showToast("حدث خطأ أثناء قراءة ملف الإكسل.", "error");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const addManualCwGenQA = () => {
    if (
      !newCwGenQuestion.trim() ||
      !genOpt1.trim() ||
      !genOpt2.trim() ||
      !genOpt3.trim()
    ) {
      showToast("الرجاء إدخال السؤال والخيارات الثلاثة كاملة!", "error");
      return;
    }
    const options = [genOpt1.trim(), genOpt2.trim(), genOpt3.trim()];
    const answer = options[correctGenOpt - 1];
    const newQA = { q: newCwGenQuestion.trim(), options, a: answer };

    saveCwGenData([...cwGenDB, newQA]);
    showToast("تمت إضافة السؤال بنجاح!");

    setNewCwGenQuestion("");
    setGenOpt1("");
    setGenOpt2("");
    setGenOpt3("");
    setCorrectGenOpt(1);
  };

  return (
    <main
      className={`min-h-screen relative flex flex-col p-4 md:p-6 w-full ${cairo.className} overflow-x-hidden transition-colors duration-500 bg-slate-50 dark:bg-slate-950`}
      dir="rtl"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />

      <ParticleBackground />

      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-lg z-[100] font-black text-sm flex items-center gap-2 animate-in slide-in-from-top-4 ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          {toast.msg}
        </div>
      )}

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)]">
        <header className="shrink-0 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] p-4 md:p-5 shadow-sm mb-4 transition-colors duration-500">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors duration-300 flex items-center justify-center"
            >
              <ArrowRight size={24} />
            </Link>
            <div className="p-3 bg-rose-100 dark:bg-rose-500/20 rounded-xl border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-sm transition-colors duration-500">
              <Swords size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-wide transition-colors duration-500">
                إدارة القلاع
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] md:text-sm mt-0.5 transition-colors duration-500">
                إدارة بنوك الأسئلة والتحديات الحية
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50 transition-colors duration-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
            <span className="text-[10px] md:text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-colors duration-500 hidden sm:inline">
              متصل بقاعدة البيانات
            </span>
          </div>
        </header>

        <section className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] p-3 md:p-6 shadow-sm flex flex-col min-h-0 transition-colors duration-500 overflow-hidden">
          <div className="flex flex-col h-full animate-in fade-in min-h-0">
            <div className="flex overflow-x-auto hide-scrollbar bg-slate-100 dark:bg-slate-950/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 mb-4 shrink-0 gap-2 text-[11px] sm:text-xs">
              {[
                { id: "30sec", icon: <Clock size={16} />, label: "30 ثانية" },
                { id: "5sec", icon: <Timer size={16} />, label: "5 ثواني" },
                {
                  id: "team",
                  icon: <Target size={16} />,
                  label: "تحدي الفريق",
                },
                {
                  id: "general",
                  icon: <HelpCircle size={16} />,
                  label: "أسئلة عامة",
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCwActiveSubTab(tab.id as any)}
                  className={`flex-1 min-w-[100px] py-2.5 px-2 font-black rounded-lg transition-all flex items-center justify-center gap-2 ${cwActiveSubTab === tab.id ? "bg-white dark:bg-rose-600/20 text-rose-700 dark:text-rose-400 shadow-sm border border-rose-200 dark:border-rose-500/30" : "text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"}`}
                >
                  {tab.icon} <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/50 rounded-2xl p-3 md:p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
              {["30sec", "5sec", "team"].includes(cwActiveSubTab) && (
                <div className="animate-in fade-in flex flex-col h-full min-h-0">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between mb-4 shrink-0 shadow-sm">
                    <div className="flex gap-2 w-full lg:w-1/3 shrink-0">
                      <input
                        type="text"
                        value={
                          cwActiveSubTab === "30sec"
                            ? newCw30Sec
                            : cwActiveSubTab === "5sec"
                              ? newCw5Sec
                              : newCwTeam
                        }
                        onChange={(e) =>
                          cwActiveSubTab === "30sec"
                            ? setNewCw30Sec(e.target.value)
                            : cwActiveSubTab === "5sec"
                              ? setNewCw5Sec(e.target.value)
                              : setNewCwTeam(e.target.value)
                        }
                        placeholder="أضف موضوع/تحدي جديد..."
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2.5 text-xs outline-none focus:border-rose-500 transition-colors font-bold"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            cwActiveSubTab === "30sec"
                              ? newCw30Sec.trim() &&
                                saveCw30Data(
                                  Array.from(
                                    new Set([...cw30SecDB, newCw30Sec.trim()]),
                                  ),
                                ).then(() => {
                                  setNewCw30Sec("");
                                  showToast("تمت الإضافة");
                                })
                              : cwActiveSubTab === "5sec"
                                ? newCw5Sec.trim() &&
                                  saveCw5Data(
                                    Array.from(
                                      new Set([...cw5SecDB, newCw5Sec.trim()]),
                                    ),
                                  ).then(() => {
                                    setNewCw5Sec("");
                                    showToast("تمت الإضافة");
                                  })
                                : newCwTeam.trim() &&
                                  saveCwTeamData(
                                    Array.from(
                                      new Set([...cwTeamDB, newCwTeam.trim()]),
                                    ),
                                  ).then(() => {
                                    setNewCwTeam("");
                                    showToast("تمت الإضافة");
                                  });
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          cwActiveSubTab === "30sec"
                            ? newCw30Sec.trim() &&
                              saveCw30Data(
                                Array.from(
                                  new Set([...cw30SecDB, newCw30Sec.trim()]),
                                ),
                              ).then(() => {
                                setNewCw30Sec("");
                                showToast("تمت الإضافة");
                              })
                            : cwActiveSubTab === "5sec"
                              ? newCw5Sec.trim() &&
                                saveCw5Data(
                                  Array.from(
                                    new Set([...cw5SecDB, newCw5Sec.trim()]),
                                  ),
                                ).then(() => {
                                  setNewCw5Sec("");
                                  showToast("تمت الإضافة");
                                })
                              : newCwTeam.trim() &&
                                saveCwTeamData(
                                  Array.from(
                                    new Set([...cwTeamDB, newCwTeam.trim()]),
                                  ),
                                ).then(() => {
                                  setNewCwTeam("");
                                  showToast("تمت الإضافة");
                                });
                        }}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-5 rounded-lg font-black text-xs transition-colors shadow-sm"
                      >
                        حفظ
                      </button>
                    </div>
                    <div className="flex gap-2 w-full lg:w-auto shrink-0 justify-start lg:justify-end flex-wrap overflow-x-auto hide-scrollbar">
                      {((cwActiveSubTab === "30sec" &&
                        selectedCw30Sec.length > 0) ||
                        (cwActiveSubTab === "5sec" &&
                          selectedCw5Sec.length > 0) ||
                        (cwActiveSubTab === "team" &&
                          selectedCwTeam.length > 0)) && (
                        <button
                          onClick={() => {
                            if (confirm("متأكد من الحذف؟")) {
                              cwActiveSubTab === "30sec"
                                ? saveCw30Data(
                                    cw30SecDB.filter(
                                      (w) => !selectedCw30Sec.includes(w),
                                    ),
                                  ).then(() => {
                                    setSelectedCw30Sec([]);
                                    showToast("تم الحذف");
                                  })
                                : cwActiveSubTab === "5sec"
                                  ? saveCw5Data(
                                      cw5SecDB.filter(
                                        (w) => !selectedCw5Sec.includes(w),
                                      ),
                                    ).then(() => {
                                      setSelectedCw5Sec([]);
                                      showToast("تم الحذف");
                                    })
                                  : saveCwTeamData(
                                      cwTeamDB.filter(
                                        (w) => !selectedCwTeam.includes(w),
                                      ),
                                    ).then(() => {
                                      setSelectedCwTeam([]);
                                      showToast("تم الحذف");
                                    });
                            }
                          }}
                          className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 dark:bg-rose-500/10 dark:border-rose-500/30 px-3 py-2 rounded-lg font-bold text-[10px] sm:text-xs transition-all shadow-sm shrink-0"
                        >
                          حذف (
                          {cwActiveSubTab === "30sec"
                            ? selectedCw30Sec.length
                            : cwActiveSubTab === "5sec"
                              ? selectedCw5Sec.length
                              : selectedCwTeam.length}
                          )
                        </button>
                      )}
                      <button
                        onClick={() => {
                          cwActiveSubTab === "30sec"
                            ? setSelectedCw30Sec(
                                selectedCw30Sec.length === cw30SecDB.length &&
                                  cw30SecDB.length > 0
                                  ? []
                                  : [...cw30SecDB],
                              )
                            : cwActiveSubTab === "5sec"
                              ? setSelectedCw5Sec(
                                  selectedCw5Sec.length === cw5SecDB.length &&
                                    cw5SecDB.length > 0
                                    ? []
                                    : [...cw5SecDB],
                                )
                              : setSelectedCwTeam(
                                  selectedCwTeam.length === cwTeamDB.length &&
                                    cwTeamDB.length > 0
                                    ? []
                                    : [...cwTeamDB],
                                );
                        }}
                        className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 px-3 py-2 rounded-lg font-bold text-[10px] sm:text-xs transition-all shadow-sm shrink-0"
                      >
                        تحديد الكل
                      </button>
                      <button
                        onClick={() =>
                          exportToJsonFile(
                            cwActiveSubTab === "30sec"
                              ? cw30SecDB
                              : cwActiveSubTab === "5sec"
                                ? cw5SecDB
                                : cwTeamDB,
                            `castle_war_${cwActiveSubTab}`,
                          )
                        }
                        className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 px-3 py-2 rounded-lg font-bold text-[10px] sm:text-xs transition-all flex items-center gap-1.5 shadow-sm shrink-0"
                      >
                        <Download size={14} /> تصدير
                      </button>
                      <label className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 px-3 py-2 rounded-lg font-bold text-[10px] sm:text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0">
                        <Upload size={14} /> استيراد
                        <input
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={(e) =>
                            handleJsonImport(
                              e,
                              cwActiveSubTab === "30sec"
                                ? saveCw30Data
                                : cwActiveSubTab === "5sec"
                                  ? saveCw5Data
                                  : saveCwTeamData,
                            )
                          }
                        />
                      </label>
                      <label className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-lg font-bold text-[10px] sm:text-xs cursor-pointer shadow-sm shrink-0">
                        <UploadCloud size={14} /> إكسل
                        <input
                          type="file"
                          accept=".xlsx, .xls"
                          className="hidden"
                          onChange={(e) =>
                            handleExcelUpload(
                              e,
                              cwActiveSubTab === "30sec"
                                ? cw30SecDB
                                : cwActiveSubTab === "5sec"
                                  ? cw5SecDB
                                  : cwTeamDB,
                              cwActiveSubTab === "30sec"
                                ? saveCw30Data
                                : cwActiveSubTab === "5sec"
                                  ? saveCw5Data
                                  : saveCwTeamData,
                              "تحدي",
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto custom-scroll pr-1 flex-1 content-start pb-4">
                    {(() => {
                      const db =
                        cwActiveSubTab === "30sec"
                          ? cw30SecDB
                          : cwActiveSubTab === "5sec"
                            ? cw5SecDB
                            : cwTeamDB;
                      const selected =
                        cwActiveSubTab === "30sec"
                          ? selectedCw30Sec
                          : cwActiveSubTab === "5sec"
                            ? selectedCw5Sec
                            : selectedCwTeam;
                      const setSelect =
                        cwActiveSubTab === "30sec"
                          ? setSelectedCw30Sec
                          : cwActiveSubTab === "5sec"
                            ? setSelectedCw5Sec
                            : setSelectedCwTeam;

                      if (db.length === 0)
                        return (
                          <p className="col-span-full text-slate-400 text-center w-full py-8 text-xs font-bold">
                            لا يوجد بيانات، قم بالإضافة للبدء.
                          </p>
                        );

                      return db.map((w, wIdx) => {
                        const isSelected = selected.includes(w);
                        return (
                          <div
                            key={wIdx}
                            onClick={() =>
                              setSelect((prev) =>
                                prev.includes(w)
                                  ? prev.filter((x) => x !== w)
                                  : [...prev, w],
                              )
                            }
                            className={`cursor-pointer border p-3.5 rounded-xl flex items-center gap-3 shadow-sm transition-all text-xs font-bold ${isSelected ? "bg-rose-50 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500/50 text-rose-900 dark:text-rose-100" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-rose-300 dark:hover:border-rose-600"}`}
                          >
                            <div
                              className={`w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-colors ${isSelected ? "bg-rose-600 border-rose-600" : "border-slate-300 dark:border-slate-500"}`}
                            >
                              {isSelected && (
                                <Check
                                  size={14}
                                  className="text-white"
                                  strokeWidth={3}
                                />
                              )}
                            </div>
                            <div className="flex items-start gap-1.5 w-full">
                              <span className="text-slate-400 font-black text-[10px] mt-0.5">
                                {wIdx + 1}-
                              </span>
                              <span className="whitespace-normal leading-relaxed break-words">
                                {w}
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {cwActiveSubTab === "general" && (
                <div className="animate-in fade-in flex flex-col h-full min-h-0">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4 shadow-sm shrink-0">
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex-1 space-y-3">
                        <input
                          type="text"
                          value={newCwGenQuestion}
                          onChange={(e) => setNewCwGenQuestion(e.target.value)}
                          placeholder="اكتب السؤال هنا..."
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3.5 text-sm outline-none focus:border-emerald-500 font-bold"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input
                            type="text"
                            value={genOpt1}
                            onChange={(e) => setGenOpt1(e.target.value)}
                            placeholder="الخيار الأول"
                            className={`p-3 rounded-lg border outline-none text-xs font-bold ${correctGenOpt === 1 ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-slate-200 bg-white text-slate-900 dark:bg-slate-950 dark:border-slate-700 dark:text-white"}`}
                          />
                          <input
                            type="text"
                            value={genOpt2}
                            onChange={(e) => setGenOpt2(e.target.value)}
                            placeholder="الخيار الثاني"
                            className={`p-3 rounded-lg border outline-none text-xs font-bold ${correctGenOpt === 2 ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-slate-200 bg-white text-slate-900 dark:bg-slate-950 dark:border-slate-700 dark:text-white"}`}
                          />
                          <input
                            type="text"
                            value={genOpt3}
                            onChange={(e) => setGenOpt3(e.target.value)}
                            placeholder="الخيار الثالث"
                            className={`p-3 rounded-lg border outline-none text-xs font-bold ${correctGenOpt === 3 ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-slate-200 bg-white text-slate-900 dark:bg-slate-950 dark:border-slate-700 dark:text-white"}`}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col justify-between shrink-0 w-full lg:w-auto gap-4">
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1.5 gap-1.5">
                          {[1, 2, 3].map((num) => (
                            <button
                              key={num}
                              onClick={() => setCorrectGenOpt(num)}
                              className={`flex-1 px-4 py-2.5 text-xs font-black rounded-md transition-all ${correctGenOpt === num ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500"}`}
                            >
                              {num} صح
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <button
                            onClick={addManualCwGenQA}
                            className="flex-1 min-w-[80px] bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-4 rounded-lg text-xs shadow-sm"
                          >
                            إضافة
                          </button>
                          <button
                            onClick={() =>
                              exportToJsonFile(cwGenDB, "castle_war_general")
                            }
                            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 px-3 rounded-lg cursor-pointer shadow-sm flex items-center justify-center"
                            title="تصدير JSON"
                          >
                            <Download size={16} />
                          </button>
                          <label
                            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 px-3 rounded-lg cursor-pointer shadow-sm flex items-center justify-center"
                            title="استيراد JSON"
                          >
                            <Upload size={16} />
                            <input
                              type="file"
                              accept=".json"
                              className="hidden"
                              onChange={(e) =>
                                handleJsonImport(e, saveCwGenData)
                              }
                            />
                          </label>
                          <label
                            className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-xs cursor-pointer shadow-sm flex items-center justify-center gap-1.5 shrink-0"
                            title="رفع إكسل"
                          >
                            <UploadCloud size={16} /> إكسل
                            <input
                              type="file"
                              accept=".xlsx, .xls"
                              className="hidden"
                              onChange={handleCwGenFileUpload}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-3 px-3 shrink-0 bg-slate-100 dark:bg-slate-800/50 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-black text-slate-600 dark:text-slate-400">
                      بنك الأسئلة العامة ({cwGenDB.length})
                    </span>
                    <div className="flex gap-2 items-center">
                      {selectedCwGen.length > 0 && (
                        <button
                          onClick={() => {
                            if (confirm("متأكد من الحذف؟")) {
                              saveCwGenData(
                                cwGenDB.filter(
                                  (_, i) => !selectedCwGen.includes(i),
                                ),
                              );
                              setSelectedCwGen([]);
                              showToast("تم الحذف");
                            }
                          }}
                          className="text-rose-600 bg-rose-100 dark:bg-rose-500/20 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-rose-200 transition-colors"
                        >
                          حذف ({selectedCwGen.length})
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setSelectedCwGen(
                            selectedCwGen.length === cwGenDB.length &&
                              cwGenDB.length > 0
                              ? []
                              : cwGenDB.map((_, i) => i),
                          )
                        }
                        className="text-indigo-600 bg-indigo-100 dark:bg-indigo-500/20 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-indigo-200 transition-colors"
                      >
                        تحديد الكل
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 overflow-y-auto custom-scroll pr-1 flex-1 content-start pb-4">
                    {cwGenDB.length === 0 ? (
                      <p className="text-slate-400 text-center w-full py-8 text-xs font-bold">
                        لا يوجد أسئلة عامة.
                      </p>
                    ) : (
                      cwGenDB.map((item, idx) => {
                        const isSelected = selectedCwGen.includes(idx);
                        return (
                          <div
                            key={idx}
                            onClick={() =>
                              setSelectedCwGen((prev) =>
                                prev.includes(idx)
                                  ? prev.filter((i) => i !== idx)
                                  : [...prev, idx],
                              )
                            }
                            className={`cursor-pointer border p-4 rounded-2xl flex items-start gap-4 shadow-sm transition-all ${isSelected ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:emerald-500/50" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700"}`}
                          >
                            <div
                              className={`w-5 h-5 rounded shrink-0 flex items-center justify-center border mt-1 transition-colors ${isSelected ? "bg-emerald-600 border-emerald-600" : "border-slate-300 dark:border-slate-500"}`}
                            >
                              {isSelected && (
                                <Check
                                  size={14}
                                  className="text-white"
                                  strokeWidth={3}
                                />
                              )}
                            </div>
                            <span className="font-black text-slate-400 text-sm mt-1">
                              {idx + 1}-
                            </span>
                            <div className="flex flex-col gap-2 w-full">
                              <span className="font-black text-slate-900 dark:text-white text-sm leading-relaxed">
                                {item.q}
                              </span>
                              {item.options ? (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {item.options.map((opt, oIdx) => (
                                    <span
                                      key={oIdx}
                                      className={`text-[10px] px-3 py-1.5 rounded-lg font-bold border ${opt === item.a ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" : "bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400"}`}
                                    >
                                      {opt}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg w-fit">
                                  الجواب: {item.a}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
