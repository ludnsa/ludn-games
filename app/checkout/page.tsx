"use client";

import React, { useEffect, useState, Suspense } from "react";
import { Cairo } from "next/font/google";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, CreditCard, MessageCircle, AlertCircle, Smartphone } from "lucide-react";
import Link from "next/link";
import { TopNav } from "@/components/home/TopNav";
import { GAME_PACKAGES, getPackageById, PackageData } from "@/lib/packages";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pkgId = parseInt(searchParams.get("pkg") || "0");
  const [pkg, setPkg] = useState<PackageData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowser();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/player");
        return;
      }
      
      const foundPkg = getPackageById(pkgId);
      if (foundPkg) {
        setPkg(foundPkg);
      } else {
        router.push("/packages");
      }
      setLoading(false);
    };
    checkAuth();
  }, [pkgId, router, supabase]);

  if (loading || !pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  // رسالة الواتساب الذكية
  const waMessage = encodeURIComponent(`مرحباً، أرغب بشراء (${pkg.name}) بقيمة (${pkg.price} ريال)، الرجاء تزويدي ببيانات الدفع عبر STC Pay.`);
  const stcPayLink = `https://wa.me/966551014446?text=${waMessage}`;

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
      
      {/* قسم تفاصيل الطلب */}
      <div className="lg:col-span-5 order-2 lg:order-1">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl sticky top-32">
          <h2 className="text-xl font-black mb-6 flex items-center gap-2">
            <ShieldCheck className="text-blue-500" /> ملخص الطلب
          </h2>
          
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-6 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-lg">{pkg.name}</h3>
                <p className="text-slate-500 text-sm font-bold">رصيد للألعاب داخل المنصة</p>
              </div>
              <div className="text-left">
                <span className="text-xl font-black">{pkg.price}</span>
                <span className="text-slate-400 text-sm mr-1 font-bold">ريال</span>
              </div>
            </div>
            
            <div className="h-px bg-slate-200 dark:bg-slate-700 w-full my-4"></div>
            
            <div className="flex justify-between items-center text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">
              <span>الضريبة (15%)</span>
              <span>شاملة في السعر</span>
            </div>
            
            <div className="flex justify-between items-center mt-6">
              <span className="text-lg font-black">الإجمالي</span>
              <div className="text-left text-blue-600 dark:text-blue-400">
                <span className="text-3xl font-black">{pkg.price}</span>
                <span className="text-sm mr-1 font-bold">ريال</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-3 text-sm font-bold text-slate-500 dark:text-slate-400 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800/30">
            <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <p>بعد إتمام الدفع عبر الواتساب، سيتم إضافة الرصيد إلى حسابك فوراً من قبل خدمة العملاء لتتمكن من اللعب مباشرة.</p>
          </div>
        </div>
      </div>

      {/* قسم الدفع */}
      <div className="lg:col-span-7 order-1 lg:order-2">
        <h2 className="text-2xl font-black mb-2">طريقة الدفع</h2>
        <p className="text-slate-500 font-bold mb-8">اختر وسيلة الدفع المناسبة لك لإتمام الطلب</p>

        <div className="flex flex-col gap-4">
          
          {/* STC Pay (Active) */}
          <a 
            href={stcPayLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative bg-white dark:bg-slate-900 border-2 border-purple-500 rounded-2xl p-4 md:p-6 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-4 md:gap-6 overflow-hidden cursor-pointer block"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500"></div>
            
            <div className="w-16 h-16 shrink-0 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center border border-purple-100 dark:border-purple-800">
              <Smartphone className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">STC Pay</h3>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm flex items-center gap-1.5">
                <MessageCircle size={16} /> التواصل مع خدمة العملاء لتنفيذ الطلب
              </p>
            </div>
            
            <div className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-xl font-black text-sm whitespace-nowrap">
              متاح الآن
            </div>
          </a>

          {/* Apple Pay (Disabled) */}
          <div className="relative bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 opacity-60 grayscale flex items-center gap-4 md:gap-6 cursor-not-allowed">
            <div className="w-16 h-16 shrink-0 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-slate-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">Apple Pay</h3>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">الدفع السريع والآمن</p>
            </div>
            <div className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-4 py-2 rounded-xl font-black text-sm whitespace-nowrap border border-slate-300 dark:border-slate-700 shadow-inner">
              قريباً
            </div>
          </div>

          {/* Google Pay (Disabled) */}
          <div className="relative bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 opacity-60 grayscale flex items-center gap-4 md:gap-6 cursor-not-allowed">
            <div className="w-16 h-16 shrink-0 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-slate-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">Google Pay</h3>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">الدفع عبر جوجل</p>
            </div>
            <div className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-4 py-2 rounded-xl font-black text-sm whitespace-nowrap border border-slate-300 dark:border-slate-700 shadow-inner">
              قريباً
            </div>
          </div>

          {/* Samsung Pay (Disabled) */}
          <div className="relative bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 opacity-60 grayscale flex items-center gap-4 md:gap-6 cursor-not-allowed">
            <div className="w-16 h-16 shrink-0 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-slate-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">Samsung Pay</h3>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">الدفع عبر سامسونج</p>
            </div>
            <div className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-4 py-2 rounded-xl font-black text-sm whitespace-nowrap border border-slate-300 dark:border-slate-700 shadow-inner">
              قريباً
            </div>
          </div>

          {/* Mada (Disabled) */}
          <div className="relative bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 opacity-60 grayscale flex items-center gap-4 md:gap-6 cursor-not-allowed">
            <div className="w-16 h-16 shrink-0 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-slate-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">مدى Mada</h3>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">البطاقة البنكية السعودية</p>
            </div>
            <div className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-4 py-2 rounded-xl font-black text-sm whitespace-nowrap border border-slate-300 dark:border-slate-700 shadow-inner">
              قريباً
            </div>
          </div>

        </div>
      </div>
      
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <main className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 md:p-8 pt-32 md:pt-40 ${cairo.className}`} dir="rtl">
      <TopNav />
      
      {/* Header */}
      <header className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <Link href="/packages" className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-800 group">
            <ArrowRight size={20} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-black">إتمام الدفع</h1>
            <p className="text-slate-500 font-bold text-sm">خطوة واحدة تفصلك عن التحدي</p>
          </div>
        </div>
      </header>

      <Suspense fallback={<div className="animate-pulse bg-slate-200 dark:bg-slate-800 h-96 rounded-3xl max-w-5xl mx-auto"></div>}>
        <CheckoutContent />
      </Suspense>

    </main>
  );
}
