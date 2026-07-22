"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { Cairo } from "next/font/google";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, AlertCircle, Lock, Smartphone, CreditCard } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { TopNav } from "@/components/home/TopNav";
import { GAME_PACKAGES, getPackageById, PackageData } from "@/lib/packages";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

declare global {
  interface Window {
    Moyasar: {
      init: (config: Record<string, unknown>) => void;
    };
  }
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pkgId = parseInt(searchParams.get("pkg") || "0");
  const [pkg, setPkg] = useState<PackageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [moyasarReady, setMoyasarReady] = useState(false);
  const formInitialized = useRef(false);
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

  // تهيئة نموذج ميسر عند جاهزية المكتبة والباقة
  useEffect(() => {
    if (!moyasarReady || !pkg || formInitialized.current) return;

    const publishableKey = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY;
    if (!publishableKey) return;

    // تحديد الدومين الحالي للـ callback
    const currentOrigin = window.location.origin;
    const callbackUrl = `${currentOrigin}/payment-callback?pkg=${pkg.id}`;

    // المبلغ بالهللات (أصغر وحدة عملة)
    const amountInHalalas = Math.round(pkg.price * 100);

    try {
      window.Moyasar.init({
        element: ".mysr-form",
        amount: amountInHalalas,
        currency: "SAR",
        description: `شراء باقة ${pkg.name} - ${pkg.tokens} رصيد`,
        publishable_api_key: publishableKey,
        callback_url: callbackUrl,
        methods: ["creditcard", "stcpay"],
        apple_pay: {
          country: "SA",
          label: "منصة الألعاب",
          validate_merchant_url: "https://api.moyasar.com/v1/applepay/initiate",
        },
        on_initiating: function () {
          return true;
        },
      });
      formInitialized.current = true;
    } catch (e) {
      console.error("Moyasar init error:", e);
    }
  }, [moyasarReady, pkg]);

  if (loading || !pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">

      {/* قسم تفاصيل الطلب */}
      <div className="lg:col-span-5 order-1">
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

          <div className="flex items-start gap-3 text-sm font-bold text-slate-500 dark:text-slate-400 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
            <Lock className="text-emerald-500 shrink-0 mt-0.5" size={18} />
            <p>جميع عمليات الدفع مشفرة ومحمية بأعلى معايير الأمان عبر بوابة ميسر المعتمدة من البنك المركزي السعودي.</p>
          </div>
        </div>
      </div>

      {/* قسم الدفع - نموذج ميسر */}
      <div className="lg:col-span-7 order-2">
        <h2 className="text-2xl font-black mb-2">إتمام الدفع</h2>
        <p className="text-slate-500 font-bold mb-6">أدخل بيانات الدفع أدناه لإتمام عملية الشراء</p>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
          {/* نموذج ميسر يتم حقنه هنا */}
          <div className="mysr-form"></div>

          {!moyasarReady && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-500"></div>
              <span className="mr-4 font-bold text-slate-500">جاري تحميل نموذج الدفع...</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-3 text-slate-400 text-sm font-bold">
          <Lock size={14} />
          <span>مدفوعات آمنة ومشفرة عبر بوابة ميسر</span>
        </div>
      </div>

    </div>
  );
}

export default function CheckoutPage() {
  const [moyasarLoaded, setMoyasarLoaded] = useState(false);

  return (
    <main className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 md:p-8 pt-32 md:pt-40 ${cairo.className}`} dir="rtl">
      <TopNav />

      {/* تحميل CSS و JS الخاص بميسر */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.10/dist/moyasar.css" />
      <Script
        src="https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.10/dist/moyasar.umd.min.js"
        strategy="afterInteractive"
        onLoad={() => setMoyasarLoaded(true)}
      />

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
        <CheckoutContentWrapper moyasarLoaded={moyasarLoaded} />
      </Suspense>

    </main>
  );
}

// Wrapper to pass moyasarLoaded state into CheckoutContent
function CheckoutContentWrapper({ moyasarLoaded }: { moyasarLoaded: boolean }) {
  return <CheckoutContentInner moyasarLoaded={moyasarLoaded} />;
}

function CheckoutContentInner({ moyasarLoaded }: { moyasarLoaded: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pkgId = parseInt(searchParams.get("pkg") || "0");
  const [pkg, setPkg] = useState<PackageData | null>(null);
  const [loading, setLoading] = useState(true);
  const formInitialized = useRef(false);
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

  // تهيئة نموذج ميسر عند جاهزية المكتبة والباقة
  useEffect(() => {
    if (!moyasarLoaded || !pkg) return;
    if (formInitialized.current) return;
    if (typeof window === "undefined" || !window.Moyasar) return;

    const publishableKey = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY;
    if (!publishableKey) return;

    const currentOrigin = window.location.origin;
    const callbackUrl = `${currentOrigin}/payment-callback?pkg=${pkg.id}`;
    const amountInHalalas = Math.round(pkg.price * 100);

    formInitialized.current = true;

    const timer = setTimeout(() => {
      try {
        const formEl = document.querySelector(".mysr-form");
        if (!formEl) {
          formInitialized.current = false;
          return;
        }
        window.Moyasar.init({
          element: ".mysr-form",
          amount: amountInHalalas,
          currency: "SAR",
          description: `شراء ${pkg.name} - ${pkg.tokens} رصيد`,
          publishable_api_key: publishableKey,
          callback_url: callbackUrl,
          methods: ["creditcard", "applepay", "stcpay"],
          apple_pay: {
            country: "SA",
            label: "منصة الألعاب",
            validate_merchant_url: "https://api.moyasar.com/v1/applepay/initiate",
          },
          on_initiating: async function () {
            return true;
          },
        });

        // إزالة تقييد الاسم الثنائي - يقبل اسم ثنائي أو ثلاثي أو أكثر
        setTimeout(() => {
          const nameInput = document.querySelector('.mysr-form input[name="name"]') as HTMLInputElement;
          if (nameInput) {
            nameInput.removeAttribute("pattern");
            nameInput.setAttribute("minlength", "3");
          }
        }, 300);
      } catch (e) {
        console.error("Moyasar init error:", e);
        formInitialized.current = false;
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [moyasarLoaded, pkg]);

  if (loading || !pkg) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">

      {/* قسم تفاصيل الطلب */}
      <div className="lg:col-span-5 order-1">
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

          <div className="flex items-start gap-3 text-sm font-bold text-slate-500 dark:text-slate-400 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
            <Lock className="text-emerald-500 shrink-0 mt-0.5" size={18} />
            <p>جميع عمليات الدفع مشفرة ومحمية بأعلى معايير الأمان عبر بوابة ميسر المعتمدة من البنك المركزي السعودي.</p>
          </div>
        </div>
      </div>

      {/* قسم الدفع - نموذج ميسر */}
      <div className="lg:col-span-7 order-2">
        <h2 className="text-2xl font-black mb-2">إتمام الدفع</h2>
        <p className="text-slate-500 font-bold mb-6">أدخل بيانات الدفع أدناه لإتمام عملية الشراء</p>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">

          {/* نموذج ميسر يتم حقنه هنا */}
          <div className="mysr-form"></div>

          {!moyasarLoaded && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-500"></div>
              <span className="mr-4 font-bold text-slate-500">جاري تحميل نموذج الدفع...</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3 text-slate-400 text-sm font-bold">
            <Lock size={14} />
            <span>مدفوعات آمنة ومشفرة عبر بوابة ميسر</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Mada */}
            <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-50">
              <rect width="40" height="24" rx="4" fill="#1A1F36"/>
              <text x="20" y="15" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial">mada</text>
            </svg>
            {/* Visa */}
            <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-50">
              <rect width="40" height="24" rx="4" fill="#1A1F71"/>
              <text x="20" y="15" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="Arial" fontStyle="italic">VISA</text>
            </svg>
            {/* Mastercard */}
            <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-50">
              <rect width="40" height="24" rx="4" fill="#252525"/>
              <circle cx="16" cy="12" r="6" fill="#EB001B" opacity="0.9"/>
              <circle cx="24" cy="12" r="6" fill="#F79E1B" opacity="0.9"/>
              <path d="M20 7.54a6 6 0 0 1 0 8.92 6 6 0 0 1 0-8.92z" fill="#FF5F00"/>
            </svg>
          </div>
        </div>
      </div>

    </div>
  );
}
