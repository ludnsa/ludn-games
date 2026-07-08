"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useAdminDashboard() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [wdStats, setWdStats] = useState<{
    countries: number;
    questions: number;
    challenges: number;
    countryDetails: { name: string; qCount: number }[];
  }>({ countries: 0, questions: 0, challenges: 0, countryDetails: [] });
  
  const [cwStats, setCwStats] = useState({
    q30: 0, q5: 0, team: 0, general: 0,
  });
  
  const [awStats, setAwStats] = useState({
    questions: 0,
  });

  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.push("/login");
      } else {
        setIsAuthChecking(false);
      }
    };
    checkAuth();
  }, [supabase, router]);

  useEffect(() => {
    if (isAuthChecking) return;

    const resetTimer = () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = setTimeout(() => {
        handleLogout();
      }, 900000); // 15 دقيقة
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    const handleActivity = () => resetTimer();

    events.forEach((event) => document.addEventListener(event, handleActivity));
    resetTimer();

    return () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      events.forEach((event) => document.removeEventListener(event, handleActivity));
    };
  }, [isAuthChecking]);

  useEffect(() => {
    if (isAuthChecking) return;

    const fetchWDStats = async () => {
      try {
        const { count: countriesCount } = await supabase.from("wd_countries").select("*", { count: 'exact', head: true });
        const { count: questionsCount } = await supabase.from("wd_country_questions").select("*", { count: 'exact', head: true });
        const { count: challengesCount } = await supabase.from("wd_challenges").select("*", { count: 'exact', head: true });

        const { data: countries } = await supabase.from("wd_countries").select("id, name");
        const { data: questions } = await supabase.from("wd_country_questions").select("country_id");

        const countryDetails = countries?.map(c => ({
          name: c.name,
          qCount: questions?.filter(q => q.country_id === c.id).length || 0
        })).sort((a, b) => b.qCount - a.qCount) || [];

        setWdStats({ 
          countries: countriesCount || 0, 
          questions: questionsCount || 0, 
          challenges: challengesCount || 0, 
          countryDetails 
        });
      } catch (error) {
        console.error("Error fetching WD stats", error);
      }
    };

    const fetchCWStats = async () => {
      try {
        const { data } = await supabase.from("cw_questions").select("category");
        if (data) {
          let q30 = 0, q5 = 0, team = 0, general = 0;
          data.forEach(q => {
            if (q.category === '30sec') q30++;
            if (q.category === '5sec') q5++;
            if (q.category === 'team') team++;
            if (q.category === 'general') general++;
          });
          setCwStats({ q30, q5, team, general });
        }
      } catch (error) {
        console.error("Error fetching CW stats", error);
      }
    };

    const fetchAWStats = async () => {
      try {
        const { count: questions } = await supabase.from("aw_questions").select("*", { count: 'exact', head: true });
        setAwStats({ questions: questions || 0 });
      } catch (error) {
        console.error("Error fetching AW stats", error);
      }
    };

    fetchWDStats();
    fetchCWStats();
    fetchAWStats();
  }, [isAuthChecking, supabase]);

  const handleExportBackup = () => {
    const keysToBackup = [
      "admin_wd_countries_db", "admin_wd_challenges_db",
      "admin_cw_30sec_db", "admin_cw_5sec_db", "admin_cw_team_db", "admin_cw_general_db",
      "admin_aw_questions_db",
    ];
    const backupData: any = {};
    keysToBackup.forEach((key) => {
      const data = localStorage.getItem(key);
      if (data) backupData[key] = data;
    });

    const blob = new Blob([JSON.stringify(backupData)], { type: "application/json" });
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
    reader.onload = async (event) => {
      try {
        const fileData = JSON.parse(event.target?.result as string);
        
        if (typeof fileData !== "object" || fileData === null || Array.isArray(fileData)) {
          throw new Error("بنية الملف غير صالحة");
        }

        toast.loading("جاري استعادة النسخة الاحتياطية... يرجى الانتظار", { id: "restoring" });
        await migrateDataToNewTables(fileData);
        toast.success("تم استعادة النسخة الاحتياطية ورفعها للجداول الجديدة بنجاح! ✅", { id: "restoring" });
        setTimeout(() => window.location.reload(), 2000);
      } catch (error) {
        console.error("خطأ في الرفع للسيرفر:", error);
        toast.error("الملف غير صالح أو حدث خطأ أثناء استعادة النسخة!", { id: "restoring" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const migrateDataToNewTables = async (fileData: any) => {
    try {
      if (fileData["admin_wd_countries_db"]) {
        const wdCountries = typeof fileData["admin_wd_countries_db"] === 'string' 
          ? JSON.parse(fileData["admin_wd_countries_db"]) 
          : fileData["admin_wd_countries_db"];
          
        for (const c of wdCountries) {
          await supabase.from("wd_countries").upsert({
            id: c.id, name: c.name, geo_id: c.geoId || ""
          });

          if (c.questions && Array.isArray(c.questions)) {
            for (const q of c.questions) {
              await supabase.from("wd_country_questions").insert({
                country_id: c.id, question: q.q, options: q.options || [], answer: q.a
              });
            }
          }
        }
      }

      if (fileData["admin_wd_challenges_db"]) {
        const wdChallenges = typeof fileData["admin_wd_challenges_db"] === 'string'
          ? JSON.parse(fileData["admin_wd_challenges_db"])
          : fileData["admin_wd_challenges_db"];
          
        if (Array.isArray(wdChallenges)) {
          const inserts = wdChallenges.map(q => ({ question: typeof q === 'string' ? q : q.question || "" }));
          if (inserts.length > 0) await supabase.from("wd_challenges").insert(inserts);
        }
      }

      const migrateCW = async (key: string, category: string) => {
        if (fileData[key]) {
          const qs = typeof fileData[key] === 'string' ? JSON.parse(fileData[key]) : fileData[key];
          if (Array.isArray(qs)) {
            const inserts = qs.map(q => {
              if (category === 'general') return { category, question: q.q, answer: q.a, options: q.options || [] };
              return { category, question: q };
            });
            if (inserts.length > 0) await supabase.from("cw_questions").insert(inserts);
          }
        }
      };
      
      await migrateCW("admin_cw_30sec_db", "30sec");
      await migrateCW("admin_cw_5sec_db", "5sec");
      await migrateCW("admin_cw_team_db", "team");
      await migrateCW("admin_cw_general_db", "general");

      if (fileData["admin_aw_questions_db"]) {
        const awQs = typeof fileData["admin_aw_questions_db"] === 'string'
          ? JSON.parse(fileData["admin_aw_questions_db"])
          : fileData["admin_aw_questions_db"];
          
        if (Array.isArray(awQs)) {
          const inserts = awQs.map(q => ({
            id: q.id && q.id.includes('-') ? q.id : undefined,
            category: q.category || "عام", question: q.question, options: q.options || [], answer: q.answer
          }));
          if (inserts.length > 0) await supabase.from("aw_questions").upsert(inserts);
        }
      }
    } catch (err) {
      console.error("خطأ أثناء ترحيل البيانات:", err);
      throw err;
    }
  };

  const handleMigrateFromOldTables = async () => {
    const confirmMigrate = confirm("هل أنت متأكد من رغبتك بنقل جميع الأسئلة من النظام القديم إلى الجداول الجديدة؟ (سيتم دمجها مع الموجود حالياً)");
    if (!confirmMigrate) return;

    toast.loading("جاري ترحيل البيانات... يرجى الانتظار", { id: "migrating" });
    try {
      const fileData: any = {};
      
      const { data: wdData } = await supabase.from("wd_settings").select("*");
      wdData?.forEach(item => { fileData[item.id] = item.data; });
      
      const { data: cwData } = await supabase.from("cw_settings").select("*");
      cwData?.forEach(item => { fileData[item.id] = item.data; });
      
      const { data: awData } = await supabase.from("aw_settings").select("*");
      awData?.forEach(item => { fileData[item.id] = item.data; });

      await migrateDataToNewTables(fileData);
      
      toast.success("تم ترحيل جميع البيانات بنجاح إلى الجداول الجديدة! ✅", { id: "migrating" });
      setTimeout(() => window.location.reload(), 2000);
    } catch (e) {
      toast.error("حدث خطأ أثناء الترحيل، راجع الكونسول", { id: "migrating" });
    }
  };

  return {
    isAuthChecking, wdStats, cwStats, awStats,
    handleLogout, handleExportBackup, handleImportBackup, handleMigrateFromOldTables
  };
}