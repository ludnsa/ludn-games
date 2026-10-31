"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, ArrowRight, Home } from "lucide-react";
import Link from "next/link";
import { SitePage } from "@/components/home/SitePage";
import { BTN_GOLD, BTN_SOFT, CARD } from "@/components/home/ui";
import { verifyAndFulfillPayment } from "@/app/actions/payment";

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
      <div className="flex flex-col items-center justify-center text-center py-20">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-ludn-gold/25 blur-2xl rounded-full animate-pulse"></div>
          <Loader2 className="w-20 h-20 text-ludn-gold-text animate-spin relative z-10" />
        </div>
        <h2 className="font-display text-[30px] leading-tight mb-1">جاري التحقق من الدفع...</h2>
        <p className="text-ludn-muted font-bold">يرجى الانتظار لحظة</p>
      </div>
    );
  }

  return (
    <div className={`${CARD} ludn-shadow p-6 md:p-10 text-center grid gap-3 justify-items-center animate-in fade-in zoom-in-95 duration-300`}>
      <div className="relative mb-2">
        <div className={`absolute inset-0 blur-2xl rounded-full ${result?.success ? "bg-ludn-green/30" : "bg-rose-500/30"}`}></div>
        {result?.success ? (
          <CheckCircle2 className="w-24 h-24 text-ludn-green relative z-10 animate-bounce" strokeWidth={2} />
        ) : (
          <XCircle className="w-24 h-24 text-rose-500 relative z-10" strokeWidth={2} />
        )}
      </div>

      <h1 className="font-display text-[34px] leading-tight">
        {result?.success ? "تم الدفع بنجاح! 🎉" : "لم تتم عملية الدفع"}
      </h1>

      <p className="text-ludn-muted font-bold text-lg leading-relaxed">
        {result?.message}
      </p>

      {result?.success && result.newBalance !== undefined && (
        <div className="rounded-2xl bg-ludn-surface-2 px-5 py-3 flex items-center gap-2.5">
          <span className="text-ludn-muted font-bold text-sm">رصيدك الحالي:</span>
          <span className="font-display text-[30px] leading-none pt-1 text-ludn-gold-text tabular-nums">{result.newBalance}</span>
        </div>
      )}

      <div className="w-full grid gap-2.5 sm:grid-cols-2 mt-4">
        {result?.success ? (
          <>
            <Link href="/my-games" className={BTN_GOLD}>
              <Home size={20} /> ألعابي
            </Link>
            <Link href="/packages" className={BTN_SOFT}>
              <ArrowRight size={20} /> شراء المزيد
            </Link>
          </>
        ) : (
          <>
            <Link href="/packages" className={BTN_GOLD}>
              <ArrowRight size={20} /> المحاولة مرة أخرى
            </Link>
            <Link href="/" className={BTN_SOFT}>
              <Home size={20} /> الرئيسية
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <SitePage width="max-w-lg">
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-16 h-16 text-ludn-gold-text animate-spin" />
        </div>
      }>
        <PaymentCallbackContent />
      </Suspense>
    </SitePage>
  );
}
