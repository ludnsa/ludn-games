"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Cairo } from "next/font/google";
import { supabase } from "@/lib/supabase";
import {
  Swords,
  Save,
  Trash2,
  UploadCloud,
  Check,
  Clock,
  Timer,
  HelpCircle,
  Image as ImageIcon,
  Link as LinkIcon,
  Download,
  Upload,
  BookOpen,
  MapPin,
  Target,
  ArrowRight,
} from "lucide-react";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

const DEFAULT_CW_INSTRUCTIONS = `مرحباً بك في حرب القلاع! 🏰\n\n1. مرحلة التجهيز (سرية لكل فريق):\n- معك 150 جندي توزعهم على 15 غرفة.\n- القائد: عيّن غرفة للقائد (إذا قُتل يخصم 20 جندي إضافي + اللي معه).\n- الفخ: عيّن غرفة للفخ (يجب أن تكون خالية من الجنود تماماً).\n\n2. مرحلة المعركة:\n- يبدأ الدور بسحب تحدي عشوائي (30 ثانية، 5 ثواني، أسئلة عامة، توقع الرقم، أو تحدي الفريق).\n- إذا فاز الفريق المهاجم بالتحدي، يحق له قصف غرفة من قلعة العدو.\n- الجاسوس: يحق لكل فريق استخدام الجاسوس مرة واحدة لكشف الغرفة الأكثر كثافة بالجنود.\n\n3. الوقوع في الفخ:\n- إذا قصف المهاجم غرفة الفخ، تتوقف اللعبة، ويحق للمدافع (صاحب الفخ) اختيار العقوبة:\n  أ) قتل 15 جندي من المهاجم.\n  ب) أسر 10 جنود (يُخصمون من المهاجم وينضمون عشوائياً لغرف المدافع).\n\nالفريق الذي يفقد كامل جنوده أولاً يخسر الحرب!`;

const DEFAULT_TOUR_TEXTS = {
  setup0Title: "اسم الفريق",
  setup0Desc: "اضغط هنا لتعديل اسم الفريق قبل بدء توزيع الجنود.",
  setup1Title: "جنودك المتبقين",
  setup1Desc: "هنا تشوف كم جندي باقي لك من الـ 150 عشان توزعهم بحكمة.",
  setup2Title: "غرف القلعة",
  setup2Desc:
    "وزع جنودك هنا، ولا تنسى تعين القائد (تاج) والفخ (قنبلة بغرفة فاضية).",
  setup3Title: "القلعة الميدانية",
  setup3Desc:
    "هنا تشوف شكل القلعة، وتقدر تسحب أرقام النوافذ عشان ترتب أماكنها مباشرة.",
  play1Title: "منطقة العمليات",
  play1Desc:
    "من هنا تسحب التحدي العشوائي وتنفذه، ولازم تفوز فيه عشان تحصل على فرصة الهجوم.",
  play2Title: "ساحة المعركة",
  play2Desc:
    "هنا قلاع الفريقين. إذا فزت بالتحدي اضغط على أي نافذة من قلعة العدو لقصفها!",
  readyTitle: "استعد",
  readyDesc: "كل شيء واضح! ادخل المعركة الآن.",
};

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
  const [cwActiveSubTab, setCwActiveSubTab] = useState<
    "30sec" | "5sec" | "team" | "general" | "images" | "instructions"
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
  const [cwCastle1Img, setCwCastle1Img] = useState<string | null>(null);
  const [cwCastle2Img, setCwCastle2Img] = useState<string | null>(null);
  const [cwCastle1UrlInput, setCwCastle1UrlInput] = useState<string>("");
  const [cwCastle2UrlInput, setCwCastle2UrlInput] = useState<string>("");
  const [cwInstructions, setCwInstructions] = useState<string>(
    DEFAULT_CW_INSTRUCTIONS,
  );
  const [cwTourTexts, setCwTourTexts] = useState<any>(DEFAULT_TOUR_TEXTS);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase.from("cw_settings").select("*");
      if (data && !error) {
        data.forEach((item) => {
          if (item.id === "admin_cw_30sec_db") setCw30SecDB(item.data);
          if (item.id === "admin_cw_5sec_db") setCw5SecDB(item.data);
          if (item.id === "admin_cw_team_db") setCwTeamDB(item.data);
          if (item.id === "admin_cw_general_db") setCwGenDB(item.data);
          if (item.id === "admin_cw_castle1_img") setCwCastle1Img(item.data);
          if (item.id === "admin_cw_castle2_img") setCwCastle2Img(item.data);
          if (item.id === "admin_cw_instructions") setCwInstructions(item.data);
          if (item.id === "admin_cw_tour_texts")
            setCwTourTexts({ ...DEFAULT_TOUR_TEXTS, ...item.data });
        });
      }
    };
    fetchSettings();
  }, []);

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

  const saveCwInstructionsAndTour = async () => {
    await supabase
      .from("cw_settings")
      .upsert({ id: "admin_cw_instructions", data: cwInstructions });
    await supabase
      .from("cw_settings")
      .upsert({ id: "admin_cw_tour_texts", data: cwTourTexts });
    alert("تم الحفظ بنجاح!");
  };

  const handleCastleImgUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    team: 1 | 2,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (team === 1) {
        setCwCastle1Img(base64);
        await supabase
          .from("cw_settings")
          .upsert({ id: "admin_cw_castle1_img", data: base64 });
      } else {
        setCwCastle2Img(base64);
        await supabase
          .from("cw_settings")
          .upsert({ id: "admin_cw_castle2_img", data: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCastleUrlSave = async (team: 1 | 2) => {
    if (team === 1) {
      if (!cwCastle1UrlInput.trim()) return;
      setCwCastle1Img(cwCastle1UrlInput.trim());
      await supabase
        .from("cw_settings")
        .upsert({ id: "admin_cw_castle1_img", data: cwCastle1UrlInput.trim() });
      setCwCastle1UrlInput("");
    } else {
      if (!cwCastle2UrlInput.trim()) return;
      setCwCastle2Img(cwCastle2UrlInput.trim());
      await supabase
        .from("cw_settings")
        .upsert({ id: "admin_cw_castle2_img", data: cwCastle2UrlInput.trim() });
      setCwCastle2UrlInput("");
    }
  };

  const removeCastleImg = async (team: 1 | 2) => {
    if (team === 1) {
      setCwCastle1Img(null);
      await supabase
        .from("cw_settings")
        .delete()
        .eq("id", "admin_cw_castle1_img");
    } else {
      setCwCastle2Img(null);
      await supabase
        .from("cw_settings")
        .delete()
        .eq("id", "admin_cw_castle2_img");
    }
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
          alert("تم استيراد البيانات بنجاح!");
        } else {
          alert("صيغة الملف غير صحيحة، يجب أن يكون الملف مصفوفة (Array).");
        }
      } catch (error) {
        alert("حدث خطأ أثناء قراءة ملف JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleCw30FileUpload = async (
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
        let prompts: string[] = [];
        jsonData.forEach((row) =>
          row.forEach((cell) => {
            if (typeof cell === "string" && cell.trim())
              prompts.push(cell.trim());
            else if (typeof cell === "number") prompts.push(String(cell));
          }),
        );
        if (prompts.length > 0) {
          saveCw30Data(Array.from(new Set([...cw30SecDB, ...prompts])));
          alert(`تم رفع ${prompts.length} طلب!`);
        } else {
          alert("الملف فارغ.");
        }
      } catch (error) {
        alert("خطأ في قراءة الإكسل.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };
  const addCw30Sec = () => {
    if (!newCw30Sec.trim()) return;
    saveCw30Data(Array.from(new Set([...cw30SecDB, newCw30Sec.trim()])));
    setNewCw30Sec("");
  };
  const toggleCw30Selection = (prompt: string) =>
    setSelectedCw30Sec((prev) =>
      prev.includes(prompt)
        ? prev.filter((w) => w !== prompt)
        : [...prev, prompt],
    );
  const toggleSelectAllCw30 = () =>
    setSelectedCw30Sec(
      selectedCw30Sec.length === cw30SecDB.length && cw30SecDB.length > 0
        ? []
        : [...cw30SecDB],
    );
  const deleteSelectedCw30 = () => {
    if (
      selectedCw30Sec.length > 0 &&
      confirm(`حذف ${selectedCw30Sec.length} طلب؟`)
    ) {
      saveCw30Data(cw30SecDB.filter((w) => !selectedCw30Sec.includes(w)));
      setSelectedCw30Sec([]);
    }
  };

  const handleCw5FileUpload = async (
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
        let prompts: string[] = [];
        jsonData.forEach((row) =>
          row.forEach((cell) => {
            if (typeof cell === "string" && cell.trim())
              prompts.push(cell.trim());
            else if (typeof cell === "number") prompts.push(String(cell));
          }),
        );
        if (prompts.length > 0) {
          saveCw5Data(Array.from(new Set([...cw5SecDB, ...prompts])));
          alert(`تم رفع ${prompts.length} طلب!`);
        } else {
          alert("الملف فارغ.");
        }
      } catch (error) {
        alert("خطأ في قراءة الإكسل.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };
  const addCw5Sec = () => {
    if (!newCw5Sec.trim()) return;
    saveCw5Data(Array.from(new Set([...cw5SecDB, newCw5Sec.trim()])));
    setNewCw5Sec("");
  };
  const toggleCw5Selection = (prompt: string) =>
    setSelectedCw5Sec((prev) =>
      prev.includes(prompt)
        ? prev.filter((w) => w !== prompt)
        : [...prev, prompt],
    );
  const toggleSelectAllCw5 = () =>
    setSelectedCw5Sec(
      selectedCw5Sec.length === cw5SecDB.length && cw5SecDB.length > 0
        ? []
        : [...cw5SecDB],
    );
  const deleteSelectedCw5 = () => {
    if (
      selectedCw5Sec.length > 0 &&
      confirm(`حذف ${selectedCw5Sec.length} طلب؟`)
    ) {
      saveCw5Data(cw5SecDB.filter((w) => !selectedCw5Sec.includes(w)));
      setSelectedCw5Sec([]);
    }
  };

  const handleCwTeamFileUpload = async (
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
        let prompts: string[] = [];
        jsonData.forEach((row) =>
          row.forEach((cell) => {
            if (typeof cell === "string" && cell.trim())
              prompts.push(cell.trim());
            else if (typeof cell === "number") prompts.push(String(cell));
          }),
        );
        if (prompts.length > 0) {
          saveCwTeamData(Array.from(new Set([...cwTeamDB, ...prompts])));
          alert(`تم رفع ${prompts.length} تحدي!`);
        } else {
          alert("الملف فارغ.");
        }
      } catch (error) {
        alert("خطأ في قراءة الإكسل.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };
  const addCwTeam = () => {
    if (!newCwTeam.trim()) return;
    saveCwTeamData(Array.from(new Set([...cwTeamDB, newCwTeam.trim()])));
    setNewCwTeam("");
  };
  const toggleCwTeamSelection = (prompt: string) =>
    setSelectedCwTeam((prev) =>
      prev.includes(prompt)
        ? prev.filter((w) => w !== prompt)
        : [...prev, prompt],
    );
  const toggleSelectAllCwTeam = () =>
    setSelectedCwTeam(
      selectedCwTeam.length === cwTeamDB.length && cwTeamDB.length > 0
        ? []
        : [...cwTeamDB],
    );
  const deleteSelectedCwTeam = () => {
    if (
      selectedCwTeam.length > 0 &&
      confirm(`حذف ${selectedCwTeam.length} تحدي؟`)
    ) {
      saveCwTeamData(cwTeamDB.filter((w) => !selectedCwTeam.includes(w)));
      setSelectedCwTeam([]);
    }
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
          alert(`تم رفع ودمج ${parsedQAs.length} سؤال عام بنجاح!`);
        } else {
          alert(
            "لم يتم العثور على أسئلة صحيحة. التنسيق المطلوب: (سؤال, خيار1, خيار2, خيار3, جواب) أو (سؤال, جواب).",
          );
        }
      } catch (error) {
        alert("حدث خطأ أثناء قراءة ملف الإكسل.");
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
      alert("الرجاء إدخال السؤال والخيارات الثلاثة كاملة!");
      return;
    }
    const options = [genOpt1.trim(), genOpt2.trim(), genOpt3.trim()];
    const answer = options[correctGenOpt - 1];
    const newQA = { q: newCwGenQuestion.trim(), options, a: answer };

    saveCwGenData([...cwGenDB, newQA]);

    setNewCwGenQuestion("");
    setGenOpt1("");
    setGenOpt2("");
    setGenOpt3("");
    setCorrectGenOpt(1);
  };

  const toggleCwGenSelection = (index: number) =>
    setSelectedCwGen((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  const toggleSelectAllCwGen = () =>
    setSelectedCwGen(
      selectedCwGen.length === cwGenDB.length && cwGenDB.length > 0
        ? []
        : cwGenDB.map((_, i) => i),
    );
  const deleteSelectedCwGen = () => {
    if (
      selectedCwGen.length > 0 &&
      confirm(`حذف ${selectedCwGen.length} سؤال؟`)
    ) {
      saveCwGenData(cwGenDB.filter((_, i) => !selectedCwGen.includes(i)));
      setSelectedCwGen([]);
    }
  };

  return (
    <main
      className={`min-h-screen relative flex flex-col p-4 md:p-6 w-full ${cairo.className} overflow-x-hidden transition-colors duration-500 bg-slate-50 dark:bg-slate-950`}
      dir="rtl"
    >
      <ParticleBackground />

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
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-wide transition-colors duration-500">
                حرب القلاع
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-xs md:text-sm mt-0.5 transition-colors duration-500">
                إدارة بنوك الأسئلة والتحديات وصور القلاع
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50 transition-colors duration-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-colors duration-500">
              Supabase Connected
            </span>
          </div>
        </header>

        <section className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] p-4 md:p-6 shadow-sm flex flex-col min-h-0 transition-colors duration-500 overflow-hidden">
          <div className="flex flex-col h-full animate-in fade-in min-h-0">
            <div className="flex flex-wrap bg-slate-100 dark:bg-slate-950/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 mb-4 shrink-0 gap-1 text-[11px] sm:text-xs">
              {[
                {
                  id: "30sec",
                  icon: <Clock size={14} />,
                  label: "30 ثانية",
                },
                { id: "5sec", icon: <Timer size={14} />, label: "5 ثواني" },
                {
                  id: "team",
                  icon: <Target size={14} />,
                  label: "تحدي الفريق",
                },
                {
                  id: "general",
                  icon: <HelpCircle size={14} />,
                  label: "أسئلة عامة",
                },
                {
                  id: "images",
                  icon: <ImageIcon size={14} />,
                  label: "صور القلاع",
                },
                {
                  id: "instructions",
                  icon: <BookOpen size={14} />,
                  label: "التعليمات",
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCwActiveSubTab(tab.id as any)}
                  className={`flex-1 py-2 px-1 font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${cwActiveSubTab === tab.id ? "bg-white dark:bg-rose-600/20 text-rose-700 dark:text-rose-400 shadow-sm border border-rose-200 dark:border-rose-500/30" : "text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"}`}
                >
                  {tab.icon}{" "}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/50 rounded-2xl p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
              {["30sec", "5sec", "team"].includes(cwActiveSubTab) && (
                <div className="animate-in fade-in flex flex-col h-full min-h-0">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-4 shrink-0 shadow-sm">
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
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-rose-500 transition-colors font-bold"
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          (cwActiveSubTab === "30sec"
                            ? addCw30Sec()
                            : cwActiveSubTab === "5sec"
                              ? addCw5Sec()
                              : addCwTeam())
                        }
                      />
                      <button
                        onClick={() =>
                          cwActiveSubTab === "30sec"
                            ? addCw30Sec()
                            : cwActiveSubTab === "5sec"
                              ? addCw5Sec()
                              : addCwTeam()
                        }
                        className="bg-rose-600 hover:bg-rose-700 text-white px-5 rounded-lg font-black text-xs transition-colors shadow-sm"
                      >
                        حفظ
                      </button>
                    </div>
                    <div className="flex gap-2 w-full lg:w-auto shrink-0 justify-start lg:justify-end flex-wrap">
                      {((cwActiveSubTab === "30sec" &&
                        selectedCw30Sec.length > 0) ||
                        (cwActiveSubTab === "5sec" &&
                          selectedCw5Sec.length > 0) ||
                        (cwActiveSubTab === "team" &&
                          selectedCwTeam.length > 0)) && (
                        <button
                          onClick={() =>
                            cwActiveSubTab === "30sec"
                              ? deleteSelectedCw30()
                              : cwActiveSubTab === "5sec"
                                ? deleteSelectedCw5()
                                : deleteSelectedCwTeam()
                          }
                          className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 dark:bg-rose-500/10 dark:border-rose-500/30 px-3 py-2 rounded-lg font-bold text-[10px] transition-all shadow-sm"
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
                        onClick={() =>
                          cwActiveSubTab === "30sec"
                            ? toggleSelectAllCw30()
                            : cwActiveSubTab === "5sec"
                              ? toggleSelectAllCw5()
                              : toggleSelectAllCwTeam()
                        }
                        className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 px-3 py-2 rounded-lg font-bold text-[10px] transition-all shadow-sm"
                      >
                        تحديد الكل
                      </button>
                      <button
                        onClick={() => {
                          const data =
                            cwActiveSubTab === "30sec"
                              ? cw30SecDB
                              : cwActiveSubTab === "5sec"
                                ? cw5SecDB
                                : cwTeamDB;
                          exportToJsonFile(
                            data,
                            `castle_war_${cwActiveSubTab}`,
                          );
                        }}
                        className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 px-3 py-2 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Download size={14} /> تصدير
                      </button>
                      <label className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 px-3 py-2 rounded-lg font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm">
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
                      <label className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold text-[10px] cursor-pointer shadow-sm">
                        <UploadCloud size={14} /> إكسل
                        <input
                          type="file"
                          accept=".xlsx, .xls"
                          className="hidden"
                          onChange={
                            cwActiveSubTab === "30sec"
                              ? handleCw30FileUpload
                              : cwActiveSubTab === "5sec"
                                ? handleCw5FileUpload
                                : handleCwTeamFileUpload
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto custom-scroll pr-1 flex-1 content-start">
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
                      const toggleFn =
                        cwActiveSubTab === "30sec"
                          ? toggleCw30Selection
                          : cwActiveSubTab === "5sec"
                            ? toggleCw5Selection
                            : toggleCwTeamSelection;

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
                            onClick={() => toggleFn(w)}
                            className={`cursor-pointer border p-3 rounded-xl flex items-center gap-3 shadow-sm transition-all text-xs font-bold ${isSelected ? "bg-rose-50 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500/50 text-rose-900 dark:text-rose-100" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-rose-300 dark:hover:border-rose-600"}`}
                          >
                            <div
                              className={`w-4 h-4 shrink-0 rounded flex items-center justify-center border transition-colors ${isSelected ? "bg-rose-600 border-rose-600" : "border-slate-300 dark:border-slate-500"}`}
                            >
                              {isSelected && (
                                <Check
                                  size={12}
                                  className="text-white"
                                  strokeWidth={3}
                                />
                              )}
                            </div>
                            <div className="flex items-start gap-1.5 w-full">
                              <span className="text-slate-400 font-black text-[10px] mt-0.5">
                                {wIdx + 1}-
                              </span>
                              <span
                                className="whitespace-normal leading-snug break-words"
                                title={w}
                              >
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
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 space-y-3">
                        <input
                          type="text"
                          value={newCwGenQuestion}
                          onChange={(e) => setNewCwGenQuestion(e.target.value)}
                          placeholder="اكتب السؤال هنا..."
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-emerald-500 font-bold"
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

                      <div className="flex flex-col justify-between shrink-0 w-full md:w-auto gap-4">
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1.5 gap-1.5">
                          <button
                            onClick={() => setCorrectGenOpt(1)}
                            className={`flex-1 px-4 py-2 text-xs font-black rounded-md transition-all ${correctGenOpt === 1 ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500"}`}
                          >
                            1 صح
                          </button>
                          <button
                            onClick={() => setCorrectGenOpt(2)}
                            className={`flex-1 px-4 py-2 text-xs font-black rounded-md transition-all ${correctGenOpt === 2 ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500"}`}
                          >
                            2 صح
                          </button>
                          <button
                            onClick={() => setCorrectGenOpt(3)}
                            className={`flex-1 px-4 py-2 text-xs font-black rounded-md transition-all ${correctGenOpt === 3 ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500"}`}
                          >
                            3 صح
                          </button>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <button
                            onClick={addManualCwGenQA}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 px-6 rounded-lg text-xs shadow-sm"
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
                            <Download size={14} />
                          </button>
                          <label
                            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 px-3 rounded-lg cursor-pointer shadow-sm flex items-center justify-center"
                            title="استيراد JSON"
                          >
                            <Upload size={14} />
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
                            className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-xs cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                            title="رفع إكسل"
                          >
                            <UploadCloud size={14} /> إكسل
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

                  <div className="flex justify-between items-center mb-3 px-2 shrink-0 bg-slate-100 dark:bg-slate-800/50 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-black text-slate-600 dark:text-slate-400">
                      بنك الأسئلة العامة ({cwGenDB.length})
                    </span>
                    <div className="flex gap-3 items-center">
                      {selectedCwGen.length > 0 && (
                        <button
                          onClick={deleteSelectedCwGen}
                          className="text-rose-600 bg-rose-100 dark:bg-rose-500/20 px-2 py-1 rounded text-[10px] font-bold hover:bg-rose-200 transition-colors"
                        >
                          حذف المحددة ({selectedCwGen.length})
                        </button>
                      )}
                      <button
                        onClick={toggleSelectAllCwGen}
                        className="text-indigo-600 bg-indigo-100 dark:bg-indigo-500/20 px-2 py-1 rounded text-[10px] font-bold hover:bg-indigo-200 transition-colors"
                      >
                        تحديد الكل
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 overflow-y-auto custom-scroll pr-1 flex-1 content-start">
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
                            onClick={() => toggleCwGenSelection(idx)}
                            className={`cursor-pointer border p-4 rounded-2xl flex items-start gap-4 shadow-sm transition-all ${isSelected ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/50" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700"}`}
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
                                      className={`text-[10px] px-3 py-1 rounded-lg font-bold border ${opt === item.a ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" : "bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400"}`}
                                    >
                                      {opt}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-lg w-fit">
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

              {cwActiveSubTab === "images" && (
                <div className="animate-in fade-in flex flex-col h-full overflow-y-auto custom-scroll pr-2">
                  <div className="mb-4">
                    <p className="text-slate-800 dark:text-slate-300 font-bold text-sm">
                      تخصيص صور القلاع
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center shadow-sm">
                      <h3 className="text-cyan-600 dark:text-cyan-400 font-black text-sm mb-3">
                        قلعة الفريق الأول
                      </h3>
                      <div className="w-full h-32 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden mb-3">
                        {cwCastle1Img ? (
                          <img
                            src={cwCastle1Img}
                            alt="Castle 1"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <ImageIcon size={32} className="text-slate-300" />
                        )}
                      </div>

                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex gap-1.5 w-full">
                          <label className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer shadow-sm text-[10px]">
                            <UploadCloud size={14} /> رفع
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleCastleImgUpload(e, 1)}
                            />
                          </label>
                          {cwCastle1Img && (
                            <button
                              onClick={() => removeCastleImg(1)}
                              className="bg-rose-50 text-rose-600 px-3 rounded-lg"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <div className="flex w-full gap-1.5">
                          <input
                            type="text"
                            value={cwCastle1UrlInput}
                            onChange={(e) =>
                              setCwCastle1UrlInput(e.target.value)
                            }
                            placeholder="رابط مباشر..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 text-[10px] outline-none"
                          />
                          <button
                            onClick={() => handleCastleUrlSave(1)}
                            className="bg-cyan-600 px-2 rounded-lg text-white"
                          >
                            <LinkIcon size={12} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center shadow-sm">
                      <h3 className="text-rose-600 dark:text-rose-400 font-black text-sm mb-3">
                        قلعة الفريق الثاني
                      </h3>
                      <div className="w-full h-32 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden mb-3">
                        {cwCastle2Img ? (
                          <img
                            src={cwCastle2Img}
                            alt="Castle 2"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <ImageIcon size={32} className="text-slate-300" />
                        )}
                      </div>

                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex gap-1.5 w-full">
                          <label className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer shadow-sm text-[10px]">
                            <UploadCloud size={14} /> رفع
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleCastleImgUpload(e, 2)}
                            />
                          </label>
                          {cwCastle2Img && (
                            <button
                              onClick={() => removeCastleImg(2)}
                              className="bg-rose-50 text-rose-600 px-3 rounded-lg"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <div className="flex w-full gap-1.5">
                          <input
                            type="text"
                            value={cwCastle2UrlInput}
                            onChange={(e) =>
                              setCwCastle2UrlInput(e.target.value)
                            }
                            placeholder="رابط مباشر..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 text-[10px] outline-none"
                          />
                          <button
                            onClick={() => handleCastleUrlSave(2)}
                            className="bg-rose-600 px-2 rounded-lg text-white"
                          >
                            <LinkIcon size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {cwActiveSubTab === "instructions" && (
                <div className="animate-in fade-in flex flex-col h-full overflow-y-auto custom-scroll pr-2">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <p className="text-slate-700 dark:text-slate-300 font-bold text-sm">
                      تخصيص تعليمات اللعبة
                    </p>
                    <button
                      onClick={saveCwInstructionsAndTour}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Save size={14} /> حفظ
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xs font-black text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1.5">
                        <BookOpen size={14} /> نص الدليل الشامل
                      </h3>
                      <textarea
                        value={cwInstructions}
                        onChange={(e) => setCwInstructions(e.target.value)}
                        className="w-full h-32 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 font-bold outline-none focus:border-rose-500 resize-none custom-scroll"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <h3 className="text-xs font-black text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1.5">
                        <MapPin size={14} /> نصوص الجولة الميدانية
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-3">
                          <h4 className="text-[10px] font-black text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-1">
                            الإعدادات والتجهيز
                          </h4>
                          <div>
                            <input
                              type="text"
                              value={cwTourTexts.setup0Title || ""}
                              onChange={(e) =>
                                setCwTourTexts({
                                  ...cwTourTexts,
                                  setup0Title: e.target.value,
                                })
                              }
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 mb-1 text-xs outline-none focus:border-rose-500 font-bold"
                            />
                            <textarea
                              value={cwTourTexts.setup0Desc || ""}
                              onChange={(e) =>
                                setCwTourTexts({
                                  ...cwTourTexts,
                                  setup0Desc: e.target.value,
                                })
                              }
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 text-[10px] outline-none focus:border-rose-500 h-10 resize-none custom-scroll"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={cwTourTexts.setup1Title}
                              onChange={(e) =>
                                setCwTourTexts({
                                  ...cwTourTexts,
                                  setup1Title: e.target.value,
                                })
                              }
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 mb-1 text-xs outline-none focus:border-rose-500 font-bold"
                            />
                            <textarea
                              value={cwTourTexts.setup1Desc}
                              onChange={(e) =>
                                setCwTourTexts({
                                  ...cwTourTexts,
                                  setup1Desc: e.target.value,
                                })
                              }
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 text-[10px] outline-none focus:border-rose-500 h-10 resize-none custom-scroll"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={cwTourTexts.setup2Title}
                              onChange={(e) =>
                                setCwTourTexts({
                                  ...cwTourTexts,
                                  setup2Title: e.target.value,
                                })
                              }
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 mb-1 text-xs outline-none focus:border-rose-500 font-bold"
                            />
                            <textarea
                              value={cwTourTexts.setup2Desc}
                              onChange={(e) =>
                                setCwTourTexts({
                                  ...cwTourTexts,
                                  setup2Desc: e.target.value,
                                })
                              }
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 text-[10px] outline-none focus:border-rose-500 h-10 resize-none custom-scroll"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={cwTourTexts.setup3Title}
                              onChange={(e) =>
                                setCwTourTexts({
                                  ...cwTourTexts,
                                  setup3Title: e.target.value,
                                })
                              }
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 mb-1 text-xs outline-none focus:border-rose-500 font-bold"
                            />
                            <textarea
                              value={cwTourTexts.setup3Desc}
                              onChange={(e) =>
                                setCwTourTexts({
                                  ...cwTourTexts,
                                  setup3Desc: e.target.value,
                                })
                              }
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 text-[10px] outline-none focus:border-rose-500 h-10 resize-none custom-scroll"
                            />
                          </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-3">
                          <h4 className="text-[10px] font-black text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-1">
                            شاشة المعركة
                          </h4>
                          <div>
                            <input
                              type="text"
                              value={cwTourTexts.play1Title}
                              onChange={(e) =>
                                setCwTourTexts({
                                  ...cwTourTexts,
                                  play1Title: e.target.value,
                                })
                              }
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 mb-1 text-xs outline-none focus:border-rose-500 font-bold"
                            />
                            <textarea
                              value={cwTourTexts.play1Desc}
                              onChange={(e) =>
                                setCwTourTexts({
                                  ...cwTourTexts,
                                  play1Desc: e.target.value,
                                })
                              }
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 text-[10px] outline-none focus:border-rose-500 h-10 resize-none custom-scroll"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={cwTourTexts.play2Title}
                              onChange={(e) =>
                                setCwTourTexts({
                                  ...cwTourTexts,
                                  play2Title: e.target.value,
                                })
                              }
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 mb-1 text-xs outline-none focus:border-rose-500 font-bold"
                            />
                            <textarea
                              value={cwTourTexts.play2Desc}
                              onChange={(e) =>
                                setCwTourTexts({
                                  ...cwTourTexts,
                                  play2Desc: e.target.value,
                                })
                              }
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 text-[10px] outline-none focus:border-rose-500 h-10 resize-none custom-scroll"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={cwTourTexts.readyTitle}
                              onChange={(e) =>
                                setCwTourTexts({
                                  ...cwTourTexts,
                                  readyTitle: e.target.value,
                                })
                              }
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 mb-1 text-xs outline-none focus:border-rose-500 font-bold"
                            />
                            <textarea
                              value={cwTourTexts.readyDesc}
                              onChange={(e) =>
                                setCwTourTexts({
                                  ...cwTourTexts,
                                  readyDesc: e.target.value,
                                })
                              }
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 text-[10px] outline-none focus:border-rose-500 h-10 resize-none custom-scroll"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
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
