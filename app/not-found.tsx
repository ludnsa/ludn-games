import Link from "next/link";
import { SitePage } from "@/components/home/SitePage";
import { BTN_GOLD, BTN_SOFT, CARD } from "@/components/home/ui";

export const metadata = {
  title: "الصفحة غير موجودة | منصة ألعاب لدن",
};

export default function NotFound() {
  return (
    <SitePage width="max-w-md">
      <div className={`${CARD} ludn-shadow p-6 md:p-8 grid gap-2 justify-items-center text-center`}>
        <p className="font-display text-[72px] leading-none text-ludn-gold-text tabular-nums">404</p>
        <h1 className="font-display text-[30px] leading-tight">الصفحة مو موجودة</h1>
        <p className="text-ludn-muted font-semibold leading-relaxed mb-4">يمكن الرابط قديم أو فيه خطأ. ارجع للرئيسية واختر لعبتك من هناك.</p>
        <div className="w-full grid gap-2.5 sm:grid-cols-2">
          <Link href="/" className={BTN_GOLD}>الرئيسية</Link>
          <Link href="/#games-section" className={BTN_SOFT}>الألعاب</Link>
        </div>
      </div>
    </SitePage>
  );
}
