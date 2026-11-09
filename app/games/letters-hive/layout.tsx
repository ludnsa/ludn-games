import type { Viewport } from "next";

/**
 * خلفية الحلبة لصفحات خلية الحروف (شاشة المقدم وشاشة العرض) — نفس طريقة تحدي الفئات والمزاد.
 * - طبقة fixed بدل background-attachment: fixed، لأن سفاري في الآيفون ما يدعمها.
 * - h-lvh: حجمها ما يتغير لما يختفي شريط المتصفح في الجوال.
 * - portrait: كل جهاز يحمّل صورته بس. والطبقة الغامقة 40% عشان اللوحات والنصوص تبين.
 * - dark: اللعبة داكنة دايماً، بدون ما نغيّر اختيار المستخدم لباقي الموقع.
 *   contents: الغلاف ما يأثر على ترتيب الصفحة، بس يخلي كل اللي تحته على الألوان الداكنة.
 * - color-scheme داكن (العلامة في رأس الصفحة + scheme-only-dark): المتصفح يعرف إن الصفحة داكنة أصلاً.
 */
export const viewport: Viewport = { colorScheme: "dark" };

export default function LettersHiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 h-lvh -z-10 bg-[#0b0905] bg-cover bg-center bg-[url(/games/letters-hive/hive-bg-desktop.webp)] portrait:bg-[url(/games/letters-hive/hive-bg-mobile.webp)] after:absolute after:inset-0 after:bg-black/40"
      />
      <div className="dark scheme-only-dark contents">{children}</div>
    </>
  );
}
