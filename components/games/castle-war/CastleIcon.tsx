import React from "react";
import { CASTLE_CARDS } from "@/constants/castle-war";

/**
 * أيقونة القائد أو الفخ أو الجاسوس بالصورة — للأماكن اللي حجمها 48 بكسل أو أكبر.
 * داخل نوافذ القلعة تبقى الأيقونات المرسومة لأن تفاصيل الصورة تضيع بحجم النافذة.
 * زخرفية: النص اللي جنبها هو اللي يقول المعنى.
 */
export default function CastleIcon({ kind, className = "w-12 h-12" }: { kind: keyof typeof CASTLE_CARDS; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={CASTLE_CARDS[kind].icon} alt="" width={48} height={48} draggable={false} className={`select-none shrink-0 ${className}`} />
  );
}
