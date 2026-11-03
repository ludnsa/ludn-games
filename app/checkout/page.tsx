"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ShieldCheck, Lock } from "lucide-react";
import Script from "next/script";
import { SitePage, PageHeading } from "@/components/home/SitePage";
import { CARD, SPINNER } from "@/components/home/ui";
import { getPackageById, PackageData } from "@/lib/packages";
import { getSupabaseBrowser } from "@/lib/supabase/client";

declare global {
  interface Window {
    Moyasar: {
      init: (config: Record<string, unknown>) => void;
    };
  }
}



export default function CheckoutPage() {
  const [moyasarLoaded, setMoyasarLoaded] = useState(false);

  return (
    <SitePage width="max-w-5xl">
      {/* تحميل CSS و JS الخاص بميسر */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.10/dist/moyasar.css" />
      <Script
        src="https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.10/dist/moyasar.umd.min.js"
        strategy="afterInteractive"
        onLoad={() => setMoyasarLoaded(true)}
      />

      <PageHeading back={{ href: "/packages", label: "رجوع" }} title="إتمام الدفع" subtitle="خطوة واحدة تفصلك عن التحدي" />

      <Suspense fallback={<div className={`${CARD} animate-pulse h-96`}></div>}>
        <CheckoutContentWrapper moyasarLoaded={moyasarLoaded} />
      </Suspense>
    </SitePage>
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

      // الباقات القديمة ما تنشرى من جديد (تظل بس عشان الدفعات اللي بالطريق تنحسب)
      const foundPkg = getPackageById(pkgId);
      if (foundPkg && !foundPkg.legacy) {
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
          description:
            pkg.kind === "subscription" ? `اشتراك ${pkg.name} - كل الألعاب` : `شراء ${pkg.name} - ${pkg.tokens} رصيد`,
          publishable_api_key: publishableKey,
          callback_url: callbackUrl,
          methods: ["creditcard", "applepay"],
          apple_pay: {
            country: "SA",
            label: "Ludn Games",
            validate_merchant_url: "https://api.moyasar.com/v1/applepay/initiate",
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
        <div className={`${SPINNER} h-14 w-14`}></div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">

      {/* قسم تفاصيل الطلب */}
      <div className="lg:col-span-5">
        <div className={`${CARD} p-5 md:p-6 grid gap-4 lg:sticky lg:top-24`}>
          <h2 className="font-display text-[26px] leading-tight flex items-center gap-2">
            <ShieldCheck className="text-ludn-gold-text" /> ملخص الطلب
          </h2>

          <div className="rounded-2xl bg-ludn-surface-2 p-4 grid gap-3">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h3 className="font-black text-lg">{pkg.kind === "subscription" ? `اشتراك ${pkg.name}` : pkg.name}</h3>
                <p className="text-ludn-muted text-sm font-bold">
                  {pkg.kind === "subscription"
                    ? `${pkg.days} يوم لكل الألعاب — بدون تجديد تلقائي`
                    : "رصيد للألعاب داخل المنصة"}
                </p>
              </div>
              <p className="shrink-0">
                <span className="text-xl font-black tabular-nums">{pkg.price}</span>
                <span className="text-ludn-muted text-sm ms-1 font-bold">ريال</span>
              </p>
            </div>

            <div className="h-px bg-ludn-line"></div>

            <div className="flex justify-between items-center text-sm font-bold text-ludn-muted">
              <span>الضريبة (15%)</span>
              <span>شاملة في السعر</span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-lg font-black">الإجمالي</span>
              <p className="text-ludn-gold-text">
                <span className="font-display text-[36px] leading-none tabular-nums">{pkg.price}</span>
                <span className="text-sm ms-1 font-bold">ريال</span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 text-sm font-bold leading-relaxed text-ludn-muted rounded-2xl border border-ludn-line p-3.5">
            <Lock className="text-ludn-green shrink-0 mt-0.5" size={18} />
            <p>جميع عمليات الدفع مشفرة ومحمية بأعلى معايير الأمان عبر بوابة ميسر المعتمدة من البنك المركزي السعودي.</p>
          </div>
        </div>
      </div>

      {/* قسم الدفع - نموذج ميسر */}
      <div className="lg:col-span-7 grid gap-4 content-start">
        <div>
          <h2 className="text-xl font-black">إتمام الدفع</h2>
          <p className="text-ludn-muted font-bold text-sm">أدخل بيانات الدفع أدناه لإتمام عملية الشراء</p>
        </div>

        <div className={`${CARD} p-5 md:p-7`}>

          {/* نموذج ميسر يتم حقنه هنا */}
          <div className="mysr-form"></div>

          {!moyasarLoaded && (
            <div className="flex items-center justify-center gap-4 py-12">
              <div className={`${SPINNER} h-10 w-10`}></div>
              <span className="font-bold text-ludn-muted">جاري تحميل نموذج الدفع...</span>
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-ludn-muted text-sm font-bold">
            <Lock size={14} />
            <span>مدفوعات آمنة ومشفرة عبر بوابة ميسر</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Mada */}
            <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-60">
              <rect width="40" height="24" rx="4" fill="#1A1F36"/>
              <text x="20" y="15" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial">mada</text>
            </svg>
            {/* Visa */}
            <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-60">
              <rect width="40" height="24" rx="4" fill="#1A1F71"/>
              <text x="20" y="15" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="Arial" fontStyle="italic">VISA</text>
            </svg>
            {/* Mastercard */}
            <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-60">
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
