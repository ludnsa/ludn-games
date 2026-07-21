"use client";

import React, { useEffect, useState, Suspense } from "react";
import { Cairo } from "next/font/google";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, ArrowRight, Home } from "lucide-react";
import Link from "next/link";
import { TopNav } from "@/components/home/TopNav";
import { verifyAndFulfillPayment } from "@/app/actions/payment";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams.get("id");
  const pkgId = parseInt(searchParams.get("pkg") || "0");

  const [verifying, setVerifying] = useState(true);
  const [result, setResult] = useState<{ success: boolean; message: string; newBalance?: number } | null>(null);

  useEffect(() => {
    const verify = async () => {
      if (!paymentId || !pkgId) {
        setResult({ success: false, message: "بيانات الدفع غير مكتملة" });
        setVerifying(false);
        return;
      }

      // انتظار 3 ثواني لإعطاء ميسر وقت لمعالجة الدفع
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // التحقق من الدفع عبر السيرفر (يتحقق من حالة الدفع الفعلية من Moyasar API)
      const res = await verifyAndFulfillPayment(paymentId, pkgId);
      setResult({
        success: res.success,
        message: res.message || res.error || "حدث خطأ غير متوقع",
        newBalance: res.success ? (res as { newBalance?: number }).newBalance : undefined,
      });
      setVerifying(false);
    };

    verify();
  }, [paymentId, pkgId]);

  if (verifying) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse"></div>
          <Loader2 className="w-20 h-20 text-blue-500 animate-spin relative z-10" />
        </div>
        <h2 className="text-2xl font-black mb-2">جاري التحقق من الدفع...</h2>
        <p className="text-slate-500 font-bold">يرجى الانتظار لحظة</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className={`rounded-3xl p-8 md:p-12 text-center border-4 shadow-xl ${
        result?.success
          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700"
          : "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700"
      }`}>
        
        <div className="relative mb-6 inline-block">
          <div className={`absolute inset-0 blur-2xl rounded-full ${
            result?.success ? "bg-emerald-400/30" : "bg-rose-400/30"
          }`}></div>
          {result?.success ? (
            <CheckCircle2 className="w-24 h-24 text-emerald-500 relative z-10 animate-bounce" strokeWidth={2} />
          ) : (
            <XCircle className="w-24 h-24 text-rose-500 relative z-10" strokeWidth={2} />
          )}
        </div>

        <h1 className={`text-3xl font-black mb-3 ${
          result?.success ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
        }`}>
          {result?.success ? "تم الدفع بنجاح! 🎉" : "فشلت عملية الدفع"}
        </h1>
        
        <p className="text-slate-600 dark:text-slate-400 font-bold text-lg mb-8">
          {result?.message}
        </p>

        {result?.success && result.newBalance !== undefined && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-8 border border-emerald-200 dark:border-emerald-800 inline-block">
            <span className="text-slate-500 font-bold text-sm">رصيدك الحالي: </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{result.newBalance}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {result?.success ? (
            <>
              <Link href="/my-games" className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all">
                <Home size={20} /> ألعابي
              </Link>
              <Link href="/packages" className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-black py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all">
                <ArrowRight size={20} /> شراء المزيد
              </Link>
            </>
          ) : (
            <>
              <Link href="/packages" className="bg-blue-500 hover:bg-blue-600 text-white font-black py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all">
                <ArrowRight size={20} /> المحاولة مرة أخرى
              </Link>
              <Link href="/" className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-black py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all">
                <Home size={20} /> الرئيسية
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <main className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 md:p-8 pt-32 md:pt-40 ${cairo.className}`} dir="rtl">
      <TopNav />
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
        </div>
      }>
        <PaymentCallbackContent />
      </Suspense>
    </main>
  );
}
