"use client";
import { useState, useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { CWQuestion } from "@/types";
import { exportToCSV, parseCSV } from "@/lib/csvHelper";

export function useCastleWarAdmin() {
  const supabase = getSupabaseBrowser();

  const [cwActiveSubTab, setCwActiveSubTab] = useState<"30sec" | "5sec" | "team" | "general">("30sec");

  const [cw30SecDB, setCw30SecDB] = useState<string[]>([]);
  const [newCw30Sec, setNewCw30Sec] = useState<string>("");
  const [selectedCw30Sec, setSelectedCw30Sec] = useState<string[]>([]);

  const [cw5SecDB, setCw5SecDB] = useState<string[]>([]);
  const [newCw5Sec, setNewCw5Sec] = useState<string>("");
  const [selectedCw5Sec, setSelectedCw5Sec] = useState<string[]>([]);

  const [cwTeamDB, setCwTeamDB] = useState<string[]>([]);
  const [newCwTeam, setNewCwTeam] = useState<string>("");
  const [selectedCwTeam, setSelectedCwTeam] = useState<string[]>([]);

  const [cwGenDB, setCwGenDB] = useState<{ q: string; a: string; options?: string[]; dbId?: string }[]>([]);
  const [selectedCwGen, setSelectedCwGen] = useState<number[]>([]);
  const [newCwGenQuestion, setNewCwGenQuestion] = useState<string>("");
  const [genOpt1, setGenOpt1] = useState<string>("");
  const [genOpt2, setGenOpt2] = useState<string>("");
  const [genOpt3, setGenOpt3] = useState<string>("");
  const [correctGenOpt, setCorrectGenOpt] = useState<number>(1);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      // 1. Fetch questions from the new table
      const { data: questions, error } = await supabase.from("cw_questions").select("*");
      
      if (questions && !error) {
        const q30sec = questions.filter(q => q.category === '30sec').map(q => q.question);
        const q5sec = questions.filter(q => q.category === '5sec').map(q => q.question);
        const qTeam = questions.filter(q => q.category === 'team').map(q => q.question);
        const qGeneral = questions.filter(q => q.category === 'general').map(q => ({
          q: q.question,
          a: q.answer,
          options: q.options || [],
          dbId: q.id // للاحتفاظ بالمعرّف للحذف لاحقاً
        }));

        setCw30SecDB(q30sec);
        setCw5SecDB(q5sec);
        setCwTeamDB(qTeam);
        setCwGenDB(qGeneral);
      }
    };
    fetchSettings();
  }, [supabase]);

  // دالة مساعدة لحفظ/تحديث الأسئلة النصية فقط
  const saveTextQuestions = async (category: string, newQuestions: string[], currentQuestions: string[]) => {
    // 1. تحديد الأسئلة الجديدة (غير الموجودة حالياً)
    const questionsToAdd = newQuestions.filter(q => !currentQuestions.includes(q));
    
    // 2. تحديد الأسئلة المحذوفة (الموجودة سابقاً وغير موجودة الآن)
    const questionsToRemove = currentQuestions.filter(q => !newQuestions.includes(q));

    // تنفيذ الحذف
    if (questionsToRemove.length > 0) {
      await supabase.from("cw_questions").delete().eq("category", category).in("question", questionsToRemove);
    }

    // تنفيذ الإضافة
    if (questionsToAdd.length > 0) {
      const inserts = questionsToAdd.map(q => ({ category, question: q }));
      await supabase.from("cw_questions").insert(inserts);
    }
  };

  const saveCw30Data = async (newData: string[]) => {
    await saveTextQuestions('30sec', newData, cw30SecDB);
    setCw30SecDB(newData);
  };
  const saveCw5Data = async (newData: string[]) => {
    await saveTextQuestions('5sec', newData, cw5SecDB);
    setCw5SecDB(newData);
  };
  const saveCwTeamData = async (newData: string[]) => {
    await saveTextQuestions('team', newData, cwTeamDB);
    setCwTeamDB(newData);
  };
  
  // حفظ أسئلة العام
  const saveCwGenData = async (newData: CWQuestion[]) => {
    // الواجهة تمرر جميع الأسئلة الحالية والجديدة، لذلك الأفضل استخدام طريقة ذكية
    // سيتم تنفيذ الحفظ داخل دوال الإضافة/الحذف أدناه لتجنب التعقيد، لكن إذا استدعيت هذه الدالة للملفات المرفوعة:
    const newItems = newData.filter(item => !(item as any).dbId);
    if (newItems.length > 0) {
      const inserts = newItems.map(item => ({
        category: 'general',
        question: item.q,
        answer: item.a,
        options: item.options
      }));
      await supabase.from("cw_questions").insert(inserts);
      
      // إعادة الجلب لتحديث الـ dbId
      const { data: newQData } = await supabase.from("cw_questions").select("*").eq("category", "general");
      if (newQData) {
        setCwGenDB(newQData.map(q => ({ q: q.question, a: q.answer, options: q.options || [], dbId: q.id })));
      }
    }
  };

  const exportToJsonFile = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
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

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>, saveFn: (data: any[]) => void) => {
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
          showToast("صيغة الملف غير صحيحة، يجب أن يكون الملف مصفوفة (Array).", "error");
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
    saveFn: (data: any[]) => void,
    typeLabel: string
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
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
        let prompts: string[] = [];
        jsonData.forEach((row) =>
          row.forEach((cell) => {
            if (typeof cell === "string" && cell.trim()) prompts.push(cell.trim());
            else if (typeof cell === "number") prompts.push(String(cell));
          })
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

  const handleCwGenFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

        const parsedQAs = jsonData
          .map((row) => {
            if (row.length >= 5) {
              return {
                q: String(row[0]).trim(),
                options: [String(row[1]).trim(), String(row[2]).trim(), String(row[3]).trim()],
                a: String(row[4]).trim(),
              };
            } else if (row.length >= 2) {
              return { q: String(row[0]).trim(), a: String(row[1]).trim() };
            }
            return null;
          })
          .filter((item) => item !== null && item.q && item.a) as CWQuestion[];

        if (parsedQAs.length > 0) {
          saveCwGenData([...cwGenDB, ...parsedQAs]);
          showToast(`تم رفع ودمج ${parsedQAs.length} سؤال بنجاح!`);
        } else {
          showToast("لم يتم العثور على أسئلة صحيحة. راجع التنسيق المطلوب.", "error");
        }
      } catch (error) {
        showToast("حدث خطأ أثناء قراءة ملف الإكسل.", "error");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const [editingGenIdx, setEditingGenIdx] = useState<number | null>(null);

  const startEditingCwGen = (idx: number) => {
    const item = cwGenDB[idx];
    if (!item) return;
    setEditingGenIdx(idx);
    setNewCwGenQuestion(item.q || "");
    if (item.options && item.options.length >= 3) {
      setGenOpt1(item.options[0]);
      setGenOpt2(item.options[1]);
      setGenOpt3(item.options[2]);
      let c = 1;
      if (item.a === item.options[1]) c = 2;
      if (item.a === item.options[2]) c = 3;
      setCorrectGenOpt(c);
    }
  };

  const cancelEditingCwGen = () => {
    setEditingGenIdx(null);
    setNewCwGenQuestion("");
    setGenOpt1("");
    setGenOpt2("");
    setGenOpt3("");
    setCorrectGenOpt(1);
  };

  const addManualCwGenQA = () => {
    if (!newCwGenQuestion.trim() || !genOpt1.trim() || !genOpt2.trim() || !genOpt3.trim()) {
      showToast("الرجاء إدخال السؤال والخيارات الثلاثة كاملة!", "error");
      return;
    }
    const options = [genOpt1.trim(), genOpt2.trim(), genOpt3.trim()];
    const answer = options[correctGenOpt - 1];
    const newQA = { q: newCwGenQuestion.trim(), options, a: answer, dbId: editingGenIdx !== null ? cwGenDB[editingGenIdx]?.dbId : undefined };

    if (editingGenIdx !== null) {
      const updated = [...cwGenDB];
      updated[editingGenIdx] = newQA;
      saveCwGenData(updated);
      setEditingGenIdx(null);
      showToast("تم تحديث السؤال بنجاح!");
    } else {
      saveCwGenData([...cwGenDB, newQA]);
      showToast("تمت إضافة السؤال بنجاح!");
    }

    setNewCwGenQuestion("");
    setGenOpt1("");
    setGenOpt2("");
    setGenOpt3("");
    setCorrectGenOpt(1);
  };

  const exportCSV = () => {
    const headers = ["النوع", "السؤال", "الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الإجابة الصحيحة"];
    const rows: string[][] = [];

    cw30SecDB.forEach((q) => rows.push(["30sec", q, "", "", "", ""]));
    cw5SecDB.forEach((q) => rows.push(["5sec", q, "", "", "", ""]));
    cwTeamDB.forEach((q) => rows.push(["team", q, "", "", "", ""]));
    cwGenDB.forEach((q) => rows.push([
      "general",
      q.q || "",
      q.options?.[0] || "",
      q.options?.[1] || "",
      q.options?.[2] || "",
      q.a || ""
    ]));

    exportToCSV("اسئلة_حرب_القلاع", headers, rows);
    showToast("تم تصدير ملف CSV بنجاح!");
  };

  const importCSV = async (file: File) => {
    try {
      const text = await file.text();
      const data = parseCSV(text);
      if (data.length <= 1) {
        showToast("الملف فارغ أو صيغته غير صحيحة!", "error");
        return;
      }

      const rows = data.slice(1);
      const inserts: any[] = [];

      for (const row of rows) {
        if (row.length < 2) continue;
        const [type, question, opt1, opt2, opt3, answer] = row;
        if (!question) continue;

        const category = (type || "30sec").trim();
        const options = [opt1 || "", opt2 || "", opt3 || ""].filter(Boolean);

        inserts.push({
          category: category,
          question: question.trim(),
          options: options,
          answer: answer || ""
        });
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from("cw_questions").insert(inserts);
        if (error) throw error;
        showToast(`تم استيراد ${inserts.length} سؤال بنجاح!`);
        
        const { data: questions } = await supabase.from("cw_questions").select("*");
        if (questions) {
          setCw30SecDB(questions.filter(q => q.category === '30sec').map(q => q.question));
          setCw5SecDB(questions.filter(q => q.category === '5sec').map(q => q.question));
          setCwTeamDB(questions.filter(q => q.category === 'team').map(q => q.question));
          setCwGenDB(questions.filter(q => q.category === 'general').map(q => ({
            q: q.question, a: q.answer, options: q.options || [], dbId: q.id
          })));
        }
      }
    } catch (e: any) {
      console.error("Error importing CSV:", e);
      showToast("حدث خطأ أثناء استيراد الملف!", "error");
    }
  };

  return {
    cwActiveSubTab, setCwActiveSubTab,
    cw30SecDB, setCw30SecDB, newCw30Sec, setNewCw30Sec, selectedCw30Sec, setSelectedCw30Sec,
    cw5SecDB, setCw5SecDB, newCw5Sec, setNewCw5Sec, selectedCw5Sec, setSelectedCw5Sec,
    cwTeamDB, setCwTeamDB, newCwTeam, setNewCwTeam, selectedCwTeam, setSelectedCwTeam,
    cwGenDB, setCwGenDB, selectedCwGen, setSelectedCwGen, newCwGenQuestion, setNewCwGenQuestion,
    genOpt1, setGenOpt1, genOpt2, setGenOpt2, genOpt3, setGenOpt3, correctGenOpt, setCorrectGenOpt,
    toast, showToast,
    saveCw30Data, saveCw5Data, saveCwTeamData, saveCwGenData,
    exportToJsonFile, handleJsonImport, handleExcelUpload, handleCwGenFileUpload, addManualCwGenQA,
    exportCSV, importCSV, editingGenIdx, startEditingCwGen, cancelEditingCwGen
  };
}