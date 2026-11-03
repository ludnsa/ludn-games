import React from "react";
import Link from "next/link";
import { SUBSCRIPTION_PLANS, pricePerMonth } from "@/lib/packages";

const cheapest = Math.min(...SUBSCRIPTION_PLANS.map((p) => p.price));
const best = SUBSCRIPTION_PLANS.find((p) => p.badge);

/** سطر مختصر عن الباقات بالرئيسية — التفاصيل والشراء بصفحة الباقات */
export const PackagesTeaser = () => {
  return (
    <section className="w-full max-w-6xl mx-auto px-4 py-4">
      <div className="grid gap-3.5 md:grid-cols-[1fr_auto] md:items-center rounded-[22px] border border-ludn-line bg-linear-to-br from-ludn-surface to-ludn-surface-2 p-5">
        <div className="grid gap-1">
          <p className="text-[13px] font-bold text-ludn-gold-text">الاشتراك</p>
          <p className="font-display text-[26px] leading-snug text-ludn-fg">
            كل الألعاب بـ <b className="font-normal text-[34px] text-ludn-gold-text tabular-nums">{cheapest}</b> ريال بالشهر
          </p>
          <p className="text-sm font-semibold text-ludn-muted">
            {best && `الأوفر: ${best.name} بـ ${best.price} ريال (يعني ${pricePerMonth(best)} بالشهر). `}
            وكل لعبة لها تجربة مجانية.
          </p>
        </div>
        <Link
          href="/packages"
          className="min-h-[52px] px-7 rounded-2xl bg-ludn-surface border border-ludn-line text-ludn-fg font-black flex items-center justify-center transition-transform active:scale-[0.98]"
        >
          شوف الباقات
        </Link>
      </div>
    </section>
  );
};
