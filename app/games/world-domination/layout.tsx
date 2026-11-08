import type { Viewport } from "next";

/**
 * خلفية غرفة العمليات لكل صفحات السيطرة على العالم (الحكم والجمهور) — نفس طريقة حرب القلاع.
 * - طبقة fixed بدل background-attachment: fixed، لأن سفاري في الآيفون ما يدعمها.
 * - h-lvh: حجمها ما يتغير لما يختفي شريط المتصفح في الجوال.
 * - portrait: كل جهاز يحمّل صورته بس. والطبقة الغامقة 40% عشان اللوحات والنصوص تبين.
 * - dark: اللعبة داكنة دايماً مثل حرب القلاع، بدون ما نغيّر اختيار المستخدم لباقي الموقع.
 *   contents: الغلاف ما يأثر على ترتيب الصفحة، بس يخلي كل اللي تحته على الألوان الداكنة.
 * - color-scheme داكن (العلامة في رأس الصفحة + scheme-only-dark): يقول للمتصفح إن الصفحة داكنة أصلاً،
 *   فالمتصفحات اللي تحترمها (مثل الوضع الليلي في سامسونج) ما تغمّقها مرة ثانية وتخرّب ألوانها.
 */
export const viewport: Viewport = { colorScheme: "dark" };

export default function WorldDominationLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 h-lvh -z-10 bg-[#0b1220] bg-cover bg-center bg-[url(/games/world-domination/world-domination-bg-desktop.webp)] portrait:bg-[url(/games/world-domination/world-domination-bg-mobile.webp)] after:absolute after:inset-0 after:bg-black/40"
      />
      <div className="dark scheme-only-dark contents">{children}</div>
    </>
  );
}
