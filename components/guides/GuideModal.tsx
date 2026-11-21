"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BookOpen, X } from "lucide-react";
import { getGuide } from "@/lib/guides";
import { GuideContent, GuideItemBody, GuideItemIcon } from "./GuideContent";
import type { GuideItem } from "@/lib/guides";

/**
 * نافذة موحّدة (طريقة اللعب، أو شرح بطاقة وحدة):
 * تتقفل بـ ✕، وبالضغط برا النافذة، وبـ Esc. تنعرض كاملة على 360 وتتمرر، وفوق كل شاشات اللعب.
 */
export function GuideDialog({ title, subtitle, icon, onClose, children, footer, dark }: { title: string; subtitle?: string; icon?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; dark?: boolean }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div
      dir="rtl"
      className={`${dark ? "dark " : ""}fixed inset-0 z-[5000] grid place-items-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150`}
      onMouseDown={(e) => {
        // الضغط برا النافذة يقفلها
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[90dvh] flex flex-col rounded-[22px] border border-ludn-line bg-ludn-surface text-ludn-fg shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b border-ludn-line">
          {icon}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-[24px] sm:text-[28px] leading-tight truncate">{title}</h2>
            {subtitle && <p className="text-ludn-muted font-bold text-sm leading-snug">{subtitle}</p>}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="shrink-0 w-11 h-11 rounded-2xl border border-ludn-line bg-ludn-surface-2 grid place-items-center text-ludn-fg hover:bg-ludn-surface transition-colors"
          >
            <X size={22} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer && <div className="px-4 py-3 sm:px-6 border-t border-ludn-line">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/** نافذة "طريقة اللعب" للعبة */
export function GuideModal({ gameId, onClose, itemIds, itemsNote, dark }: { gameId: string; onClose: () => void; itemIds?: readonly string[] | null; itemsNote?: string; dark?: boolean }) {
  const guide = getGuide(gameId);
  if (!guide) return null;
  return (
    <GuideDialog
      title={`طريقة اللعب: ${guide.title}`}
      subtitle={guide.tagline}
      icon={<span className="shrink-0 w-11 h-11 rounded-2xl bg-ludn-gold text-ludn-gold-ink grid place-items-center"><BookOpen size={22} /></span>}
      onClose={onClose}
      dark={dark}
    >
      <GuideContent guide={guide} itemIds={itemIds} itemsNote={itemsNote} />
    </GuideDialog>
  );
}

/** شرح بطاقة/فئة وحدة (مثل الضغط على صورة فئة بإعداد المافيا) */
export function GuideItemModal({ item, onClose, footer, dark }: { item: GuideItem; onClose: () => void; footer?: ReactNode; dark?: boolean }) {
  return (
    <GuideDialog title={item.name} icon={<GuideItemIcon icon={item.icon} size={48} />} onClose={onClose} footer={footer} dark={dark}>
      <div className="grid gap-2 text-base">
        {item.tag && <p className="text-ludn-muted font-bold text-sm">({item.tag})</p>}
        <GuideItemBody item={item} />
      </div>
    </GuideDialog>
  );
}
