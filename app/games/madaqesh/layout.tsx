import type { Metadata, Viewport } from "next";

/**
 * خلفية المسرح لكل صفحات مداقش (المنشئ والانضمام واللعب) — نفس طريقة تحدي الفئات وخلية الحروف.
 * - طبقة fixed بدل background-attachment: fixed، لأن سفاري في الآيفون ما يدعمها.
 * - h-lvh: حجمها ما يتغير لما يختفي شريط المتصفح في الجوال.
 * - portrait: كل جهاز يحمّل صورته بس (العريضة للكمبيوتر والطولية للجوال).
 *   والطبقة الغامقة 40% عشان اللوحات والأرقام تبين فوق الإضاءة.
 * - dark + scheme-only-dark: اللعبة داكنة دايماً بدون ما نغيّر اختيار المستخدم لباقي الموقع،
 *   والمتصفحات اللي تغمّق الصفحات (الوضع الليلي في سامسونج) ما تغمّقها مرة ثانية.
 */
export const metadata: Metadata = {
  title: "مداقش | منصة ألعاب لدن",
  description: "لعبة ورق: سوم وتوزيع وتثبيت ومداقشة، والأرصدة تنحسب لحالها على جوالات الكل.",
};

export const viewport: Viewport = { colorScheme: "dark" };

export default function MadaqeshLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 h-lvh -z-10 bg-[#0f1526] bg-cover bg-center bg-[url(/games/madaqesh/madaqesh-bg-desktop.webp)] portrait:bg-[url(/games/madaqesh/madaqesh-bg-mobile.webp)] after:absolute after:inset-0 after:bg-black/40"
      />
      <div className="dark scheme-only-dark contents">{children}</div>
    </>
  );
}
