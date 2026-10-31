"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, Zap, Crown, Shield, CreditCard, Loader2 } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { SitePage, PageHeading } from "@/components/home/SitePage";
import { BTN_GOLD, BTN_SOFT, CARD } from "@/components/home/ui";
import { GAME_PACKAGES, PackageData } from "@/lib/packages";

const PERKS = ["صلاحية لا تنتهي", "تستخدم لأي لعبة", "دخول فوري بعد الدفع"];

export default function PackagesPage() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingPkgId, setLoadingPkgId] = useState<number | null>(null);
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

  // Icons mapping
  const packageIcons: Record<number, React.ReactNode> = {
    1: <Zap className="w-7 h-7" />,
    2: <Shield className="w-7 h-7" />,
    3: <Crown className="w-7 h-7" />,
    4: <Crown className="w-7 h-7" />,
  };

  const handlePurchase = (pkg: PackageData) => {
    if (!userId) {
      alert("يجب تسجيل الدخول لشراء الباقات");
      router.push("/player");
      return;
    }

    setLoadingPkgId(pkg.id);

    // شاشة الانتظار الاحترافية قبل التوجيه لصفحة الدفع
    setTimeout(() => {
      router.push(`/checkout?pkg=${pkg.id}`);
    }, 1500);
  };

  return (
    <SitePage width="max-w-5xl">
      {/* شاشة انتظار تغطي الصفحة عند اختيار باقة */}
      {loadingPkgId && (
        <div className="fixed inset-0 z-[95] grid place-items-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`${CARD} ludn-shadow w-full max-w-sm p-7 grid gap-2 justify-items-center text-center`}>
            <Crown className="w-14 h-14 mb-2 text-ludn-gold-text animate-bounce" />
            <h2 className="font-display text-[28px] leading-tight">جاري التجهيز...</h2>
            <p className="text-sm font-bold text-ludn-muted">ننقلك الآن لصفحة الدفع الآمنة</p>
            <div className="w-full h-1.5 mt-4 rounded-full bg-ludn-surface-2 overflow-hidden">
              <div className="h-full w-full bg-ludn-gold animate-pulse" />
            </div>
          </div>
        </div>
      )}

      <PageHeading
        back={{ href: "/", label: "رجوع" }}
        title="شراء الألعاب"
        subtitle="اختر الباقة المناسبة لك واستمتع باللعب فوراً"
        aside={
          <div className="h-12 px-4 rounded-2xl bg-ludn-surface border border-ludn-line flex items-center gap-2.5">
            <span className="text-sm font-bold text-ludn-muted">الرصيد الحالي:</span>
            <span className="font-display text-[26px] leading-none pt-1 text-ludn-gold-text tabular-nums">{availableTokens}</span>
          </div>
        }
      />

      <ul className="grid gap-5 md:grid-cols-3">
        {GAME_PACKAGES.map((pkg) => (
          <li
            key={pkg.id}
            className={`relative flex flex-col gap-4 rounded-[22px] border p-5 md:p-6 bg-ludn-surface ${
              pkg.popular ? "border-ludn-gold shadow-[0_14px_36px_var(--ludn-glow)]" : "border-ludn-line"
            }`}
          >
            {pkg.popular && (
              <span className="absolute -top-3 start-5 text-xs font-black px-3 py-1 rounded-full bg-ludn-gold text-ludn-gold-ink">
                الأكثر مبيعاً
              </span>
            )}

            <div className="flex items-center gap-3.5">
              <span className="w-14 h-14 shrink-0 rounded-2xl bg-ludn-surface-2 text-ludn-gold-text grid place-items-center">
                {packageIcons[pkg.id]}
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-[26px] leading-tight">{pkg.name}</h3>
                <p className="text-[13px] font-semibold text-ludn-muted">رصيد يضاف لحسابك لتشغيل أي لعبة</p>
              </div>
            </div>

            <p className="flex items-baseline gap-1.5">
              <span className="font-display text-[46px] leading-none tabular-nums">{pkg.price}</span>
              <span className="font-bold text-ludn-muted">ريال</span>
            </p>

            <ul className="grid gap-2 text-sm font-bold flex-1">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-center gap-2">
                  <CheckCircle2 className="w-[18px] h-[18px] shrink-0 text-ludn-green" /> {perk}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handlePurchase(pkg)}
              disabled={loadingPkgId !== null}
              className={`${pkg.popular ? BTN_GOLD : BTN_SOFT} w-full`}
            >
              {loadingPkgId === pkg.id ? <Loader2 className="animate-spin w-6 h-6" /> : <><CreditCard size={20} /> شراء</>}
            </button>
          </li>
        ))}
      </ul>
    </SitePage>
  );
}
