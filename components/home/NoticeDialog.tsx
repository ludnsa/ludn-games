import React from "react";
import { Check, X } from "lucide-react";
import { CARD } from "./ui";

/** نافذة تنبيه صغيرة (نجاح أو خطأ) بزر "حسناً، فهمت" */
export function NoticeDialog({ type, message, onClose }: { type: string; message: string; onClose: () => void }) {
  const ok = type === "success";
  return (
    <div className="fixed inset-0 z-[110] grid place-items-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-150">
      <div role="alertdialog" aria-modal="true" className={`${CARD} ludn-shadow w-full max-w-sm p-6 grid gap-2 justify-items-center text-center animate-in zoom-in-95 duration-200`}>
        <span className={`w-14 h-14 mb-1 rounded-full grid place-items-center ${ok ? "bg-ludn-green/15 text-ludn-green" : "bg-rose-500/15 text-rose-500"}`}>
          {ok ? <Check size={28} strokeWidth={3} /> : <X size={28} strokeWidth={3} />}
        </span>
        <h3 className="font-display text-[26px] leading-tight">{ok ? "ممتاز!" : "تنبيه"}</h3>
        <p className="text-ludn-muted font-bold leading-relaxed mb-3">{message}</p>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className={`w-full min-h-[52px] rounded-2xl font-black text-white transition-transform active:scale-[0.98] ${ok ? "bg-ludn-green" : "bg-rose-500"}`}
        >
          حسناً، فهمت
        </button>
      </div>
    </div>
  );
}
