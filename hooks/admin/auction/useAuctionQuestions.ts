"use client";
import { useState, useEffect, useRef, FormEvent } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { toast } from "sonner";
import { exportToCSV, parseCSV } from "@/lib/csvHelper";

export interface AuctionQuestion {
  id: string;
  category: string;
  question: string;
  options: string[];
  answer: string;
  difficulty?: "سهل" | "متوسط" | "صعب";
}

export function useAuctionQuestions() {
  const supabase = getSupabaseBrowser();

  const [questions, setQuestions] = useState<AuctionQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const defaultCategories = ["تاريخ", "دين", "رياضة", "علوم", "جغرافيا"];
  const uniqueCategories = Array.from(new Set([...defaultCategories, ...questions.map(q => q.category)]));

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const categoryRef = useRef<HTMLDivElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    category: string; question: string; opt1: string; opt2: string; opt3: string; correctOption: 1 | 2 | 3; difficulty: "سهل" | "متوسط" | "صعب";
  }>({
    category: "", question: "", opt1: "", opt2: "", opt3: "", correctOption: 1, difficulty: "متوسط"
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from("aw_questions").select("*");

      if (data && !error) {
        setQuestions(data.map(q => ({
          id: q.id,
          category: q.category || "عام",
          question: q.question,
          options: q.options || [],
          answer: q.answer,
          difficulty: q.difficulty || "متوسط"
        })));
      }
      setIsLoading(false);
    };
    loadQuestions();
  }, [supabase]);

  // دالة مساعدة لحفظ الإضافات/التعديلات/الحذف
  const handleSaveDB = async (updatedQuestions: AuctionQuestion[]) => {
    setIsSaving(true);
    setQuestions(updatedQuestions);

    for (const q of updatedQuestions) {
      await supabase.from("aw_questions").upsert({
        id: q.id.includes('-') ? q.id : undefined, // إذا كان UUID صحيح نرسله
        category: q.category,
        question: q.question,
        options: q.options,
        answer: q.answer,
        difficulty: q.difficulty || "متوسط"
      });
    }

    // إعادة جلب الأسئلة للحصول على الـ IDs الصحيحة إذا كانت جديدة
    const { data } = await supabase.from("aw_questions").select("*");
    if (data) {
      setQuestions(data.map(q => ({
        id: q.id,
        category: q.category || "عام",
        question: q.question,
        options: q.options || [],
        answer: q.answer,
        difficulty: q.difficulty || "متوسط"
      })));
    }

    setIsSaving(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.question || !formData.opt1 || !formData.opt2 || !formData.opt3) {
      toast.error("الرجاء تعبئة جميع الحقول!");
      return;
    }

    const answerString =
      formData.correctOption === 1 ? formData.opt1 :
        formData.correctOption === 2 ? formData.opt2 :
          formData.opt3;

    const newQuestion: AuctionQuestion = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      category: formData.category,
      question: formData.question,
      options: [formData.opt1, formData.opt2, formData.opt3],
      answer: answerString,
      difficulty: formData.difficulty || "متوسط"
    };

    let updatedQs = [];
    if (editingId) {
      updatedQs = questions.map((q) => (q.id === editingId ? newQuestion : q));
      setEditingId(null);
    } else {
      updatedQs = [...questions, newQuestion];
    }

    setFormData({
      category: formData.category,
      question: "", opt1: "", opt2: "", opt3: "", correctOption: 1, difficulty: "متوسط"
    });
    await handleSaveDB(updatedQs);
    toast.success("تم حفظ السؤال بنجاح");
  };

  const updateQuestionDifficulty = async (id: string, difficulty: "سهل" | "متوسط" | "صعب") => {
    const updatedQs = questions.map((q) => (q.id === id ? { ...q, difficulty } : q));
    await handleSaveDB(updatedQs);
    toast.success("تم تحديث مستوى صعوبة السؤال");
  };

  const updateQuestionAnswer = async (id: string, answer: string) => {
    if (!id || !answer) return;

    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, answer } : q))
    );

    const { error } = await supabase
      .from("aw_questions")
      .update({ answer })
      .eq("id", id);

    if (error) {
      toast.error("تعذر تحديث الإجابة: " + error.message);
      return;
    }

    toast.success("تم تحديد الإجابة الصحيحة بنجاح");
  };

  const handleEdit = (q: AuctionQuestion) => {
    setEditingId(q.id);
    let correctOpt: 1 | 2 | 3 = 1;
    if (q.answer === q.options[1]) correctOpt = 2;
    if (q.answer === q.options[2]) correctOpt = 3;

    setFormData({
      category: q.category, question: q.question,
      opt1: q.options[0] || "", opt2: q.options[1] || "", opt3: q.options[2] || "",
      correctOption: correctOpt,
      difficulty: q.difficulty || "متوسط"
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("متأكد أنك تبي تحذف هالسؤال؟")) {
      const updatedQs = questions.filter((q) => q.id !== id);
      await handleSaveDB(updatedQs);
    }
  };

  const exportCSV = () => {
    const headers = ["الفئة", "السؤال", "الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الإجابة الصحيحة", "الصعوبة"];
    const rows = questions.map((q) => [
      q.category || "عام",
      q.question || "",
      q.options[0] || "",
      q.options[1] || "",
      q.options[2] || "",
      q.answer || "",
      q.difficulty || "متوسط"
    ]);

    exportToCSV("اسئلة_المزاد", headers, rows);
    toast.success("تم تصدير ملف CSV بنجاح!");
  };

  const importCSV = async (file: File) => {
    try {
      const text = await file.text();
      const data = parseCSV(text);
      if (data.length <= 1) {
        toast.error("الملف فارغ أو صيغته غير صحيحة!");
        return;
      }

      const rows = data.slice(1);
      const newQs: AuctionQuestion[] = [];

      for (const row of rows) {
        if (row.length < 2) continue;
        const [category, question, opt1, opt2, opt3, answer, difficulty] = row;
        if (!question) continue;

        const options = [opt1 || "", opt2 || "", opt3 || ""].filter(Boolean);
        const correctAnswer = answer || options[0] || "";

        newQs.push({
          id: Math.random().toString(36).substr(2, 9),
          category: (category || "عام").trim(),
          question: question.trim(),
          options: options.length > 0 ? options : [correctAnswer],
          answer: correctAnswer,
          difficulty: (difficulty === "سهل" || difficulty === "صعب") ? difficulty : "متوسط"
        });
      }

      const updatedQs = [...questions, ...newQs];
      await handleSaveDB(updatedQs);
      toast.success(`تم استيراد ${newQs.length} سؤال بنجاح!`);
    } catch (e: any) {
      console.error("Error importing CSV:", e);
      toast.error("حدث خطأ أثناء استيراد الملف!");
    }
  };

  const setCategoryForNewQuestion = (category: string) => {
    setFormData((prev) => ({ ...prev, category }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return {
    questions, isLoading, isSaving, uniqueCategories,
    isCategoryDropdownOpen, setIsCategoryDropdownOpen,
    isAddingCategory, setIsAddingCategory,
    newCategory, setNewCategory, categoryRef,
    editingId, setEditingId, formData, setFormData,
    handleSubmit, handleEdit, handleDelete, updateQuestionDifficulty, updateQuestionAnswer,
    exportCSV, importCSV, setCategoryForNewQuestion
  };
}