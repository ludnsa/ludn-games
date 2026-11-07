"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Receipt, Search, Wallet, ShoppingBag, CalendarClock } from "lucide-react";
import { getAdminPurchases } from "@/app/actions/admin-users";
import { formatPlanDate, getPackageById, isSubscriptionActive } from "@/lib/packages";
import { PANEL, PANEL_TITLE, TITLE_ICON, FIELD, SPINNER } from "@/components/admin/layout/adminUi";

type Purchase = {
  id: string;
  paymentId: string;
  name: string;
  email: string;
  phone: string;
  packageId: number;
  amount: number;
  currency: string;
  method: string;
  createdAt: string;
  subscriptionEndsAt: string | null;
};

const METHODS: Record<string, string> = { creditcard: "بطاقة", applepay: "Apple Pay", stcpay: "STC Pay" };

/** وقت الشراء بتوقيت السعودية: "8 نوفمبر 2026، 3:20 م" */
const formatPaidAt = (iso: string) =>
  new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Riyadh",
  }).format(new Date(iso));

/** الساعة بس، للجدول (التاريخ فوقها بسطر لحاله): "3:20 م" */
const formatPaidTime = (iso: string) =>
  new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Riyadh" }).format(new Date(iso));

const formatMoney = (amount: number, currency: string) =>
  `${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency === "SAR" ? "ر.س" : currency}`;

const Stat = ({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) => (
  // الجوال: العنوان والرقم بسطر. من sm الثلاث جنب بعض، فالرقم ينزل تحت العنوان عشان ما ينقص
  <div className="min-w-0 flex items-center justify-between gap-3 sm:flex-col sm:items-start sm:justify-start sm:gap-2 rounded-2xl bg-ludn-surface-2 px-4 py-3">
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="shrink-0 text-ludn-gold-text">{icon}</span>
      <span className="text-sm font-bold text-ludn-fg/90">{title}</span>
    </div>
    <span className="font-display text-[22px] leading-none pt-1 tabular-nums whitespace-nowrap">{value}</span>
  </div>
);

/** المشتريات: قراءة بس — ما فيها تعديل ولا حذف */
export default function AdminPurchasesSection() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [activeSubscribers, setActiveSubscribers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    getAdminPurchases()
      .then((res) => {
        if (cancelled) return;
        if (res.error) {
          setError(res.error);
        } else {
          setPurchases(res.purchases ?? []);
          setActiveSubscribers(res.activeSubscribers ?? 0);
        }
      })
      .catch(() => !cancelled && setError("حدث خطأ أثناء جلب المشتريات"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return purchases;
    return purchases.filter(
      (p) => p.name.toLowerCase().includes(query) || p.email.toLowerCase().includes(query) || p.phone.includes(query)
    );
  }, [purchases, searchQuery]);

  // المجموع بالريال بس (لو جت عملة ثانية ما تنجمع معه)
  const totalSar = useMemo(() => purchases.filter((p) => p.currency === "SAR").reduce((sum, p) => sum + p.amount, 0), [purchases]);

  if (loading) {
    return (
      <div className={`${PANEL} flex items-center justify-center min-h-[300px]`}>
        <div className={`${SPINNER} w-10 h-10`} />
      </div>
    );
  }

  const packageLabel = (p: Purchase) => {
    const pkg = getPackageById(p.packageId);
    if (!pkg) return { name: `باقة ${p.packageId}`, kind: "" };
    return { name: pkg.name, kind: pkg.kind === "subscription" ? "اشتراك" : "رصيد قديم" };
  };

  const packageBadge = (p: Purchase) => {
    const { name, kind } = packageLabel(p);
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span className="font-black whitespace-nowrap">{name}</span>
        {kind && (
          <span
            className={`whitespace-nowrap text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              kind === "اشتراك" ? "bg-ludn-gold/15 text-ludn-gold-text border-ludn-gold/30" : "bg-ludn-surface text-ludn-muted border-ludn-line"
            }`}
          >
            {kind}
          </span>
        )}
      </span>
    );
  };

  const subscriptionState = (p: Purchase) =>
    isSubscriptionActive(p.subscriptionEndsAt) && p.subscriptionEndsAt ? (
      <span className="text-ludn-gold-text font-bold">فعّال لين {formatPlanDate(p.subscriptionEndsAt)}</span>
    ) : (
      <span className="text-ludn-muted">{p.subscriptionEndsAt ? "منتهي" : "—"}</span>
    );

  const emptyText = searchQuery ? "لا توجد نتائج مطابقة للبحث." : "ما فيه مشتريات للحين.";

  // flex-col مع min-w-0: الجدول العريض يتمرر داخل إطاره بدل ما يوسّع الصفحة ويطلع برا الشاشة
  return (
    <div className="flex flex-col gap-5 min-w-0">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat icon={<Wallet size={20} />} title="إجمالي المبيعات" value={formatMoney(totalSar, "SAR")} />
        <Stat icon={<ShoppingBag size={20} />} title="عدد المشتريات" value={String(purchases.length)} />
        <Stat icon={<CalendarClock size={20} />} title="المشتركين الحاليين" value={String(activeSubscribers)} />
      </div>

      <div className={`${PANEL} flex flex-col gap-5`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className={PANEL_TITLE}>
              <span className={TITLE_ICON}><Receipt size={20} /></span>
              عمليات الشراء
            </h2>
            <span className="bg-ludn-surface-2 px-3 py-1 rounded-full text-sm font-bold text-ludn-muted">
              العدد: {filtered.length} {searchQuery && `من أصل ${purchases.length}`}
            </span>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="البحث بالإسم، الإيميل، أو رقم الجوال..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${FIELD} ps-10`}
            />
            <Search size={17} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-ludn-muted pointer-events-none" />
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 text-rose-500 p-4 rounded-xl text-sm font-bold border border-rose-500/25">{error}</div>
        )}

        {/* الجوال: بطاقات */}
        {/* بطاقات لين xl (قبلها الجدول يضيق). grid-cols-1 و min-w-0: البطاقة تاخذ عرضها بالضبط، والاسم الطويل ينقص بدل ما يوسّعها */}
        <ul className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((p) => (
            <li key={p.id} className="min-w-0 rounded-2xl bg-ludn-surface-2 border border-ludn-line p-3.5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black truncate">{p.name}</p>
                  <p className="text-sm text-ludn-muted break-all" dir="ltr">{p.email || "—"}</p>
                </div>
                <span className="font-display text-[20px] leading-none pt-1 tabular-nums whitespace-nowrap">{formatMoney(p.amount, p.currency)}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                {packageBadge(p)}
                <span className="text-ludn-muted font-bold">{METHODS[p.method] ?? (p.method || "—")}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-ludn-line text-xs font-bold">
                <span className="text-ludn-muted">{formatPaidAt(p.createdAt)}</span>
                {subscriptionState(p)}
              </div>
            </li>
          ))}
          {filtered.length === 0 && <li className="md:col-span-2 py-12 text-center text-ludn-muted font-bold">{emptyText}</li>}
        </ul>

        {/* الشاشات العريضة: جدول بدون عرض أدنى — الإيميل والتاريخ يلتفون عشان كل الأعمدة تبان بدون تمرير */}
        <div className="hidden xl:block overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-ludn-line">
                <th className="py-3 px-4 text-sm font-black text-ludn-muted">المشتري</th>
                <th className="py-3 px-4 text-sm font-black text-ludn-muted">الباقة</th>
                <th className="py-3 px-4 text-sm font-black text-ludn-muted text-center">المبلغ</th>
                <th className="py-3 px-4 text-sm font-black text-ludn-muted text-center">طريقة الدفع</th>
                <th className="py-3 px-4 text-sm font-black text-ludn-muted">وقت الشراء</th>
                <th className="py-3 px-4 text-sm font-black text-ludn-muted">الاشتراك الحالي</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-ludn-line hover:bg-ludn-surface-2/60 transition-colors">
                  <td className="py-4 px-4">
                    <p className="font-bold">{p.name}</p>
                    <p className="text-sm text-ludn-muted break-all" dir="ltr">{p.email || "—"}</p>
                  </td>
                  <td className="py-4 px-4 text-sm">{packageBadge(p)}</td>
                  <td className="py-4 px-4 text-center font-black tabular-nums whitespace-nowrap">{formatMoney(p.amount, p.currency)}</td>
                  <td className="py-4 px-4 text-center text-ludn-muted font-bold whitespace-nowrap">{METHODS[p.method] ?? (p.method || "—")}</td>
                  <td className="py-4 px-4 text-sm text-ludn-muted">
                    <p className="whitespace-nowrap">{formatPlanDate(p.createdAt)}</p>
                    <p className="text-xs whitespace-nowrap">{formatPaidTime(p.createdAt)}</p>
                  </td>
                  <td className="py-4 px-4 text-sm">{subscriptionState(p)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ludn-muted font-bold">{emptyText}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
