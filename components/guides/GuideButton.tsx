"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { GuideModal } from "./GuideModal";

/**
 * زر "طريقة اللعب" الموحّد داخل الألعاب (الاسم ظاهر حتى على الجوال) + نافذته.
 * - variant "bar": زر بشريط اللعبة (className يكمّل شكله حسب اللعبة)
 * - variant "small": زر صغير لشاشات العرض
 * - itemIds: يفلتر البطاقات (فئات غرفة المافيا مثلاً)
 */
export function GuideButton({
  gameId,
  variant = "bar",
  className = "",
  itemIds,
  itemsNote,
  dark,
}: {
  gameId: string;
  variant?: "bar" | "small";
  className?: string;
  itemIds?: readonly string[] | null;
  itemsNote?: string;
  /** النافذة بالوضع الليلي دايماً (المافيا) */
  dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // الشكل: className (لو موجود) يحدد الحجم والألوان عشان يطابق أزرار شريط اللعبة، وإلا الشكل الافتراضي
  const look =
    variant === "small"
      ? "h-9 px-3 rounded-xl text-xs border border-white/15 bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"
      : "h-10 px-3.5 rounded-xl text-sm border border-ludn-line bg-ludn-surface-2 text-ludn-fg hover:bg-ludn-surface";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-1.5 font-black whitespace-nowrap ${className || look}`}
        data-guide-button={gameId}
      >
        <BookOpen size={variant === "small" ? 15 : 17} className="shrink-0" />
        <span>طريقة اللعب</span>
      </button>
      {open && <GuideModal gameId={gameId} onClose={() => setOpen(false)} itemIds={itemIds} itemsNote={itemsNote} dark={dark} />}
    </>
  );
}
