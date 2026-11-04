/**
 * خلفية ساحة المعركة لكل صفحات حرب القلاع (الحكم والفرق والجمهور).
 * - هنا بره صفحة اللعبة: اهتزاز الشاشة يحرك main الصفحة بـ transform، ولو كانت داخله يتغير مرجع fixed وتقفز الصورة.
 * - طبقة fixed بدل background-attachment: fixed، لأن سفاري في الآيفون ما يدعمها.
 * - h-lvh: حجمها ما يتغير لما يختفي شريط المتصفح في الجوال.
 * - portrait: كل جهاز يحمّل صورته بس. والطبقة الغامقة 40% عشان اللوحات والنصوص تبين.
 */
export default function CastleWarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 h-lvh -z-10 bg-[#0f172a] bg-cover bg-center bg-[url(/games/castle-war/castle-war-bg-desktop.webp)] portrait:bg-[url(/games/castle-war/castle-war-bg-mobile.webp)] after:absolute after:inset-0 after:bg-black/40"
      />
      {children}
    </>
  );
}
