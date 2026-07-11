"use client";

import React, { useState, useEffect } from "react";
import { Cairo } from "next/font/google";
import { CheckCircle2, Zap, Crown, Shield, CreditCard, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/home/TopNav";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

export default function PackagesPage() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [availableTokens, setAvailableTokens] = useState<number>(0);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await supabase.from("profiles").select("available_tokens").eq("id", user.id).single();
        if (data) setAvailableTokens(data.available_tokens || 0);
      }
    };
    fetchUser();
  }, [supabase]);

  const packages = [
    { id: 1, name: "لعبة واحدة", tokens: 1, price: 11.5, icon: <Zap className="text-blue-500 w-10 h-10" /> },
    { id: 2, name: "ثلاث ألعاب", tokens: 3, price: 34.5, icon: <Shield className="text-emerald-500 w-10 h-10" /> },
    { id: 3, name: "ست ألعاب", tokens: 6, price: 65.0, icon: <Crown className="text-amber-500 w-10 h-10" />, popular: true },
    { id: 4, name: "عشر ألعاب", tokens: 10, price: 115.0, icon: <Crown className="text-purple-500 w-10 h-10" /> },
  ];

  const handlePurchase = async (pkg: typeof packages[0]) => {
    if (!userId) {
      alert("يجب تسجيل الدخول لشراء الباقات");
      return;
    }

    setLoading(true);
    // محاكاة عملية الدفع وإضافة الرصيد
    setTimeout(async () => {
      try {
        const newTokens = availableTokens + pkg.tokens;
        await supabase.from("profiles").update({ available_tokens: newTokens }).eq("id", userId);
        
        setAvailableTokens(newTokens);
        setSuccessMsg(`تم إضافة ${pkg.tokens} ألعاب لرصيدك بنجاح!`);
        
        setTimeout(() => {
          setSuccessMsg("");
          router.push("/my-games"); // توجيه للألعاب بعد النجاح
        }, 3000);
      } catch (err) {
        console.error("Error updating tokens", err);
      } finally {
        setLoading(false);
      }
    }, 1500);
  };

  return (
    <main className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 md:p-8 pt-32 md:pt-40 ${cairo.className}`} dir="rtl">
      <TopNav />
      
      {/* Header */}
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <Link href="/" className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-800">
            <ArrowRight size={20} />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-black">شراء الألعاب</h1>
            <p className="text-slate-500 font-bold text-sm">اختر الباقة المناسبة لك واستمتع باللعب فوراً</p>
          </div>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 px-6 py-3 rounded-2xl flex items-center gap-3">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">الرصيد الحالي:</span>
          <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{availableTokens}</span>
        </div>
      </header>

      {successMsg && (
        <div className="max-w-xl mx-auto mb-8 bg-emerald-100 dark:bg-emerald-900/40 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-400 p-4 rounded-2xl font-black flex items-center justify-center gap-2 animate-in slide-in-from-top-4">
          <CheckCircle2 size={24} />
          {successMsg}
        </div>
      )}

      {/* Packages Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {packages.map((pkg) => (
          <div key={pkg.id} className={`relative bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border-4 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl flex flex-col ${pkg.popular ? "border-amber-400 dark:border-amber-500 shadow-[0_10px_40px_-10px_rgba(251,191,36,0.3)]" : "border-slate-200 dark:border-slate-800"}`}>
            
            {pkg.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 font-black px-4 py-1 rounded-full text-sm">
                الأكثر طلباً
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-800 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              {pkg.icon}
            </div>
            
            <h3 className="text-2xl font-black text-center mb-2">{pkg.name}</h3>
            <p className="text-slate-500 text-center font-bold mb-6 text-sm">رصيد يضاف لحسابك لتشغيل أي لعبة</p>
            
            <div className="text-center mb-8">
              <span className="text-4xl font-black">{pkg.price}</span>
              <span className="text-slate-400 font-bold mr-2">ريال</span>
            </div>

            <ul className="flex flex-col gap-3 mb-8 flex-1">
              <li className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="text-emerald-500 w-5 h-5" /> صلاحية لا تنتهي
              </li>
              <li className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="text-emerald-500 w-5 h-5" /> تستخدم لأي لعبة
              </li>
              <li className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="text-emerald-500 w-5 h-5" /> دخول فوري بعد الدفع
              </li>
            </ul>

            <button 
              onClick={() => handlePurchase(pkg)}
              disabled={loading}
              className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all ${pkg.popular ? "bg-amber-400 hover:bg-amber-300 text-slate-900" : "bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white"}`}
            >
              {loading ? <Loader2 className="animate-spin w-6 h-6" /> : <><CreditCard size={20} /> شراء محاكى للتجربة</>}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
