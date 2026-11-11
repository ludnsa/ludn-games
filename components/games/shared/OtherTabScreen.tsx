import React from "react";
import { Cairo } from "next/font/google";
import { MonitorSmartphone } from "lucide-react";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

/** التبويب القديم لما يفتح نفس اللعبة تبويب ثاني (hooks/shared/useSingleTab.ts) */
export default function OtherTabScreen({ onTakeOver }: { onTakeOver: () => void }) {
  return (
    <div className={`dark min-h-[100dvh] flex flex-col items-center justify-center bg-[#0f172a] text-white px-4 ${cairo.className}`} dir="rtl">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-400/10">
          <MonitorSmartphone className="h-10 w-10 text-amber-300" strokeWidth={2.2} />
        </div>
        <h1 className="mb-3 text-2xl font-black md:text-3xl">اللعبة مفتوحة في تبويب ثاني</h1>
        <p className="mb-8 text-sm font-bold leading-relaxed text-slate-300 md:text-base">
          وقفناها هنا عشان ما يتحكم فيها تبويبين مع بعض. كمّل من التبويب الثاني، أو رجّع التحكم لهذا التبويب.
        </p>
        <button
          type="button"
          onClick={onTakeOver}
          className="w-full rounded-2xl bg-amber-400 py-4 text-lg font-black text-slate-900 transition-transform hover:bg-amber-300 active:scale-[0.98]"
        >
          استخدم هذا التبويب
        </button>
      </div>
    </div>
  );
}
