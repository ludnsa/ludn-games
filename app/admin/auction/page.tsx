"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Cairo } from "next/font/google";
import { createBrowserClient } from "@supabase/ssr";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  Edit,
  Database,
  Loader2,
  Gavel,
  ListOrdered,
  ChevronDown
} from "lucide-react";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

interface AuctionQuestion {
  id: string;
  category: string;
  question: string;
  options: string[];
  answer: string;
}

export default function AuctionAdminPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [questions, setQuestions] = useState<AuctionQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // إعدادات القائمة المنسدلة للفئات
  const defaultCategories = ["تاريخ", "دين", "رياضة", "علوم", "جغرافيا"];
  const uniqueCategories = Array.from(new Set([...defaultCategories, ...questions.map(q => q.category)]));
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const categoryRef = useRef<HTMLDivElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    category: string;
    question: string;
    opt1: string;
    opt2: string;
    opt3: string;
    correctOption: 1 | 2 | 3;
  }>({
    category: "",
    question: "",
    opt1: "",
    opt2: "",
    opt3: "",
    correctOption: 1,
  });

  // إغلاق القائمة المنسدلة عند الضغط خارجها
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
      const localData = localStorage.getItem("admin_aw_questions_db");
      if (localData) {
        setQuestions(JSON.parse(localData));
      }

      const { data, error } = await supabase
        .from("aw_settings")
        .select("*")
        .eq("id", "admin_aw_questions_db")
        .single();

      if (data && data.data) {
        setQuestions(data.data);
        localStorage.setItem("admin_aw_questions_db", JSON.stringify(data.data));
      }
      setIsLoading(false);
    };
    loadQuestions();
  }, [supabase]);

  const handleSaveDB = async (updatedQuestions: AuctionQuestion[]) => {
    setIsSaving(true);
    setQuestions(updatedQuestions);
    localStorage.setItem("admin_aw_questions_db", JSON.stringify(updatedQuestions));

    await supabase.from("aw_settings").upsert({
      id: "admin_aw_questions_db",
      data: updatedQuestions,
      updated_at: new Date().toISOString(),
    });
    setIsSaving(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.question || !formData.opt1 || !formData.opt2 || !formData.opt3) {
      alert("الرجاء تعبئة جميع الحقول!");
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
    };

    let updatedQs = [];
    if (editingId) {
      updatedQs = questions.map((q) => (q.id === editingId ? newQuestion : q));
      setEditingId(null);
    } else {
      updatedQs = [...questions, newQuestion];
    }

    setFormData({
      category: formData.category, // نحتفظ بالفئة عشان يسهل إضافة سؤال ثاني بنفس الفئة
      question: "",
      opt1: "",
      opt2: "",
      opt3: "",
      correctOption: 1,
    });
    await handleSaveDB(updatedQs);
  };

  const handleEdit = (q: AuctionQuestion) => {
    setEditingId(q.id);
    let correctOpt: 1 | 2 | 3 = 1;
    if (q.answer === q.options[1]) correctOpt = 2;
    if (q.answer === q.options[2]) correctOpt = 3;

    setFormData({
      category: q.category,
      question: q.question,
      opt1: q.options[0] || "",
      opt2: q.options[1] || "",
      opt3: q.options[2] || "",
      correctOption: correctOpt,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("متأكد أنك تبي تحذف هالسؤال؟")) {
      const updatedQs = questions.filter((q) => q.id !== id);
      await handleSaveDB(updatedQs);
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 ${cairo.className}`} dir="rtl">
        <Loader2 className="animate-spin text-amber-500" size={48} />
      </div>
    );
  }

  return (
    <main className={`min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 ${cairo.className}`} dir="rtl">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        
        {/* الهيدر */}
        <header className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-100 dark:bg-amber-500/20 rounded-2xl text-amber-600">
              <Gavel size={32} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-1">
                بنك أسئلة حرب المزايدات
              </h1>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                <Database size={16} />
                <span>إجمالي الأسئلة المضافة: {questions.length}</span>
              </div>
            </div>
          </div>
          <Link href="/admin">
            <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 px-6 rounded-xl transition-all border-b-4 border-slate-300 dark:border-slate-950 active:border-b-0 active:translate-y-[4px]">
              <ArrowLeft size={18} />
              <span>رجوع للوحة التحكم</span>
            </button>
          </Link>
        </header>

        {/* نموذج الإضافة والتعديل */}
        <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
              {editingId ? <Edit size={20} /> : <Plus size={20} />}
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">
              {editingId ? "تعديل السؤال" : "إضافة سؤال جديد"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* الفئة - قائمة منسدلة عصرية */}
              <div className="flex flex-col gap-2 relative" ref={categoryRef}>
                <label className="font-bold text-sm text-slate-500 dark:text-slate-400">فئة السؤال (المجال)</label>
                <div 
                  onClick={() => !isAddingCategory && setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className="w-full min-h-[56px] p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-black flex justify-between items-center cursor-pointer focus-within:border-amber-500 transition-colors"
                >
                  {isAddingCategory ? (
                    <div className="flex gap-2 w-full">
                      <input
                        autoFocus
                        type="text"
                        placeholder="اكتب الفئة الجديدة..."
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none placeholder:text-slate-400 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newCategory.trim()) {
                              setFormData({ ...formData, category: newCategory.trim() });
                              setIsAddingCategory(false);
                              setNewCategory("");
                            }
                          }
                        }}
                      />
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (newCategory.trim()) {
                            setFormData({ ...formData, category: newCategory.trim() });
                            setIsAddingCategory(false);
                            setNewCategory("");
                          }
                        }} 
                        className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-bold"
                      >
                        تم
                      </button>
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsAddingCategory(false); 
                          setNewCategory("");
                        }} 
                        className="bg-rose-500 text-white px-3 py-1 rounded-lg text-xs font-bold"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <span className={formData.category ? "text-slate-800 dark:text-slate-200" : "text-slate-400"}>
                      {formData.category || "اختر الفئة أو أضف جديدة..."}
                    </span>
                  )}
                  {!isAddingCategory && (
                    <ChevronDown size={20} className={`text-slate-400 transition-transform ${isCategoryDropdownOpen ? "rotate-180" : ""}`} />
                  )}
                </div>

                {/* القائمة المنسدلة */}
                {isCategoryDropdownOpen && !isAddingCategory && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto animate-in slide-in-from-top-2">
                    {uniqueCategories.map(cat => (
                      <div
                        key={cat}
                        onClick={() => { setFormData({ ...formData, category: cat }); setIsCategoryDropdownOpen(false); }}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer font-black text-sm border-b last:border-b-0 border-slate-100 dark:border-slate-700 transition-colors"
                      >
                        {cat}
                      </div>
                    ))}
                    <div
                      onClick={() => { setIsAddingCategory(true); setIsCategoryDropdownOpen(false); }}
                      className="p-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/10 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-500 cursor-pointer font-black text-sm transition-colors flex items-center gap-2 border-t-2 border-slate-100 dark:border-slate-700"
                    >
                      <Plus size={16} /> إضافة فئة جديدة...
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="font-bold text-sm text-slate-500 dark:text-slate-400">نص السؤال</label>
                <textarea
                  placeholder="اكتب السؤال هنا..."
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  rows={3}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-black focus:border-amber-500 outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-bold text-sm text-slate-500 dark:text-slate-400">الخيار الأول</label>
                <input
                  type="text"
                  value={formData.opt1}
                  onChange={(e) => setFormData({ ...formData, opt1: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-black focus:border-amber-500 outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-bold text-sm text-slate-500 dark:text-slate-400">الخيار الثاني</label>
                <input
                  type="text"
                  value={formData.opt2}
                  onChange={(e) => setFormData({ ...formData, opt2: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-black focus:border-amber-500 outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-bold text-sm text-slate-500 dark:text-slate-400">الخيار الثالث</label>
                <input
                  type="text"
                  value={formData.opt3}
                  onChange={(e) => setFormData({ ...formData, opt3: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-black focus:border-amber-500 outline-none transition-colors"
                />
              </div>

              {/* أزرار تحديد الإجابة الصحيحة */}
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="font-bold text-sm text-emerald-600 dark:text-emerald-500 mb-1">حدد الإجابة الصحيحة</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFormData({ ...formData, correctOption: num as 1 | 2 | 3 })}
                      className={`flex-1 py-4 px-4 rounded-xl font-black border-2 transition-all shadow-sm ${
                        formData.correctOption === num 
                          ? 'bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-500 dark:text-emerald-400 ring-2 ring-emerald-500/20' 
                          : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 hover:border-emerald-300 dark:hover:border-emerald-700'
                      }`}
                    >
                      الخيار رقم {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t-2 border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-black text-lg rounded-xl border-b-4 border-amber-700 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                {editingId ? "حفظ التعديلات" : "إضافة للسيرفر"}
              </button>
              
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ category: formData.category, question: "", opt1: "", opt2: "", opt3: "", correctOption: 1 });
                  }}
                  className="px-6 py-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-black text-lg rounded-xl border-b-4 border-slate-300 dark:border-slate-950 active:border-b-0 active:translate-y-[4px] transition-all"
                >
                  إلغاء
                </button>
              )}
            </div>
          </form>
        </section>

        {/* قائمة الأسئلة */}
        <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
              <ListOrdered size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">
              الأسئلة المضافة ({questions.length})
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            {questions.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <Database className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="font-bold text-slate-500">لا توجد أسئلة مضافة حتى الآن.</p>
              </div>
            ) : (
              questions.map((q, index) => (
                <div key={q.id} className="p-5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-amber-300 dark:hover:border-amber-700 transition-colors group">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded text-xs font-black">
                        سؤال {index + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {q.category}
                      </span>
                    </div>
                    <p className="font-black text-slate-800 dark:text-slate-200 mb-2 leading-relaxed">
                      {q.question}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((opt, i) => (
                         <span key={i} className={`text-[10px] md:text-xs font-bold px-2 py-1 rounded-lg border ${opt === q.answer ? 'bg-emerald-100 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'}`}>
                           {opt}
                         </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 w-full md:w-auto shrink-0 mt-2 md:mt-0">
                    <button
                      onClick={() => handleEdit(q)}
                      className="flex-1 md:flex-none p-3 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl transition-colors flex items-center justify-center"
                      title="تعديل"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="flex-1 md:flex-none p-3 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl transition-colors flex items-center justify-center"
                      title="حذف"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </main>
  );
}