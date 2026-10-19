"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Home, Loader2, DoorClosed } from "lucide-react";
import type { MafiaGameCtx } from "@/hooks/games/mafia/useMafiaGame";
import { writeMafiaSession } from "@/lib/game/mafia-session";

/**
 * زر "الصفحة الرئيسية" للمنشئ: قبل ما يطلع نسأله يقفل الغرفة ولا يخليها.
 * القفل يطلّع الكل وينسّي أجهزتهم الغرفة — فيقدر أي واحد منهم يسوي غرفة جديدة بحسابه،
 * والمنشئ نفسه يقدر يسوي غرفة ثانية.
 */
export default function MafiaHomeButton({
  ctx,
  className,
  children,
}: {
  ctx: MafiaGameCtx;
  className: string;
  children: React.ReactNode;
}) {
  const [asking, setAsking] = useState(false);
  const [closing, setClosing] = useState(false);

  const goHome = () => {
    window.location.href = "/";
  };

  const closeAndLeave = async () => {
    setClosing(true);
    const res = await ctx.host.closeRoom();
    if (!res?.success) {
      setClosing(false);
      return;
    }
    writeMafiaSession(null);
    goHome();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAsking(true)}
        className={className}
      >
        {children}
      </button>

      {asking &&
        createPortal(
          <div
            className="fixed inset-0 z-[2600] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
            dir="rtl"
            onClick={() => !closing && setAsking(false)}
          >
            <div
              className="w-full max-w-sm bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 text-center animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <DoorClosed size={56} strokeWidth={1.6} className="mx-auto mb-3 text-slate-300" />
              <h2 className="text-2xl font-black mb-2">
                هل تريد إغلاق الغرفة؟
              </h2>
              <p className="text-sm font-bold text-slate-400 mb-5 leading-relaxed">
                إذا قفلتها تنتهي اللعبة عند الكل، ويقدر أي واحد منهم يسجّل دخول
                ويسوي غرفة جديدة.
              </p>
              {ctx.error && (
                <p className="mb-3 text-sm font-bold text-red-300">
                  {ctx.error}
                </p>
              )}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={closeAndLeave}
                  disabled={closing}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-black text-lg rounded-2xl border-b-4 border-red-800 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
                >
                  {closing ? (
                    <Loader2 className="animate-spin" size={22} />
                  ) : (
                    <DoorClosed size={22} />
                  )}
                  نعم، أغلق الغرفة
                </button>
                <button
                  type="button"
                  onClick={goHome}
                  disabled={closing}
                  className="w-full py-4 bg-slate-800 rounded-2xl border-b-4 border-slate-950 font-black active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Home size={20} /> لا، خلها شغالة
                </button>
                <button
                  type="button"
                  onClick={() => setAsking(false)}
                  disabled={closing}
                  className="py-2 font-bold text-slate-400"
                >
                  رجوع
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
