"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, Crown, CreditCard, Loader2, Gift, CalendarClock } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { SitePage, PageHeading } from "@/components/home/SitePage";
import { BTN_GOLD, BTN_SOFT, CARD } from "@/components/home/ui";
import { fetchMyPlanAction } from "@/app/actions/gameAccess";
import {
  PAID_GAME_TITLES,
  SUBSCRIPTION_PLANS,
  formatPlanDate,
  isSubscriptionActive,
  planSaving,
  pricePerMonth,
  subscriptionDaysLeft,
  type PackageData,
} from "@/lib/packages";

const PERKS = ["كل الألعاب", "العب كل يوم وبأي عدد", "بدون تجديد تلقائي"];

export default function PackagesPage() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingPkgId, setLoadingPkgId] = useState<number | null>(null);
  const [plan, setPlan] = useState<{ endsAt: string | null; tokens: number } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setPlan(await fetchMyPlanAction());
      }
    };
    fetchUser();
  }, [supabase]);

  const active = isSubscriptionActive(plan?.endsAt);

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
        title="الباقات"
        subtitle="اشترك وتفتح لك كل الألعاب — العب كل يوم وبأي عدد"
      />

      {/* حالة اشتراكي */}
      {active && plan?.endsAt && (
        <div className={`${CARD} border-ludn-gold/50 p-4 md:p-5 flex items-center gap-3.5`}>
          <span className="w-12 h-12 shrink-0 rounded-2xl bg-ludn-gold/15 text-ludn-gold-text grid place-items-center">
            <CalendarClock className="w-6 h-6" />
          </span>
          <div className="min-w-0">
            <p className="font-black text-lg">اشتراكك فعّال لين {formatPlanDate(plan.endsAt)}</p>
            <p className="text-sm font-bold text-ludn-muted">
              باقي {subscriptionDaysLeft(plan.endsAt)} يوم — لو جددت الحين، المدة الجديدة تنضاف على الباقي
            </p>
          </div>
        </div>
      )}
      {!active && Boolean(plan?.tokens) && (
        <p className="rounded-2xl bg-ludn-surface-2 px-4 py-3 text-sm font-bold text-ludn-muted">
          عندك رصيد قديم: <b className="text-ludn-fg tabular-nums">{plan?.tokens}</b> ألعاب — ينخصم منه إذا لعبت وما عندك اشتراك
        </p>
      )}

      <ul className="grid gap-5 md:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((pkg) => {
          const featured = Boolean(pkg.badge);
          const saving = planSaving(pkg);
          return (
            <li
              key={pkg.id}
              className={`relative flex flex-col gap-4 rounded-[22px] border p-5 md:p-6 bg-ludn-surface ${
                featured ? "border-ludn-gold shadow-[0_14px_36px_var(--ludn-glow)]" : "border-ludn-line"
              }`}
            >
              {pkg.badge && (
                <span className="absolute -top-3 start-5 text-xs font-black px-3 py-1 rounded-full bg-ludn-gold text-ludn-gold-ink">
                  {pkg.badge}
                </span>
              )}

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-[30px] leading-tight">{pkg.name}</h3>
                  <p className="text-[13px] font-semibold text-ludn-muted">{pkg.days} يوم لكل الألعاب</p>
                </div>
                {saving > 0 && (
                  <span className="shrink-0 text-xs font-black px-2.5 py-1 rounded-full bg-ludn-green/15 text-ludn-green border border-ludn-green/30">
                    توفّر {saving} ريال
                  </span>
                )}
              </div>

              <div>
                <p className="flex items-baseline gap-1.5">
                  <span className="font-display text-[46px] leading-none tabular-nums">{pkg.price}</span>
                  <span className="font-bold text-ludn-muted">ريال</span>
                </p>
                {/* الشهري: سطر فاضي بس بالشاشات العريضة عشان الأسعار تكون على خط واحد */}
                <p
                  className={`text-[13px] font-bold text-ludn-muted mt-1.5 min-h-5 ${(pkg.months ?? 1) > 1 ? "" : "hidden md:block"}`}
                >
                  {(pkg.months ?? 1) > 1 ? `يعني ${pricePerMonth(pkg)} ريال بالشهر` : " "}
                </p>
              </div>

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
                className={`${featured ? BTN_GOLD : BTN_SOFT} w-full`}
              >
                {loadingPkgId === pkg.id ? (
                  <Loader2 className="animate-spin w-6 h-6" />
                ) : (
                  <>
                    <CreditCard size={20} /> {active ? "مدّد اشتراكي" : "اشترك"}
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* وش يفتح الاشتراك (كل الألعاب) + التجربة المجانية */}
      <div className={`${CARD} p-4 md:p-6 grid gap-4`}>
        <div className="grid gap-2 content-start">
          <p className="font-black flex items-center gap-2">
            <Crown size={18} className="text-ludn-gold-text" /> الاشتراك يفتح لك
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PAID_GAME_TITLES.map((t) => (
              <span key={t} className="text-[13px] font-bold px-3 py-1 rounded-full bg-ludn-surface-2">
                {t}
              </span>
            ))}
          </div>
          <p className="text-[13px] font-bold text-ludn-muted flex items-center gap-1.5 mt-1">
            <Gift size={16} className="shrink-0 text-ludn-green" /> كل لعبة منها لها تجربة مجانية وحدة قبل ما تشترك
          </p>
          <p className="text-[13px] font-bold text-ludn-muted">
            الاشتراك للي ينشئ اللعبة بس — الباقين يدخلون بالكود ببلاش
          </p>
        </div>
      </div>
    </SitePage>
  );
}
