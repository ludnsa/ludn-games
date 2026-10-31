"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Home, Loader2, DoorClosed } from "lucide-react";
import type { MafiaGameCtx } from "@/hooks/games/mafia/useMafiaGame";
import { writeMafiaSession } from "@/lib/game/mafia-session";
import { BTN_DANGER, BTN_SOFT, H_CARD } from "./mafiaUi";

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
            className="dark fixed inset-0 z-[2600] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 text-ludn-fg animate-in fade-in"
            dir="rtl"
            onClick={() => !closing && setAsking(false)}
          >
            <div
              className="w-full max-w-sm bg-ludn-surface border border-ludn-line rounded-[26px] p-5 text-center animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <DoorClosed size={48} strokeWidth={1.6} className="mx-auto mb-2 text-ludn-muted" />
              <h2 className={`${H_CARD} mb-2`}>
                هل تريد إغلاق الغرفة؟
              </h2>
              <p className="text-[13px] font-bold text-ludn-muted mb-4 leading-relaxed">
                إذا قفلتها تنتهي اللعبة عند الكل، ويقدر أي واحد منهم يسجّل دخول
                ويسوي غرفة جديدة.
              </p>
              {ctx.error && (
                <p className="mb-3 text-[13px] font-bold text-rose-300">
                  {ctx.error}
                </p>
              )}
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={closeAndLeave}
                  disabled={closing}
                  className={BTN_DANGER}
                >
                  {closing ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <DoorClosed size={20} />
                  )}
                  نعم، أغلق الغرفة
                </button>
                <button
                  type="button"
                  onClick={goHome}
                  disabled={closing}
                  className={`${BTN_SOFT} w-full`}
                >
                  <Home size={18} /> لا، خلها شغالة
                </button>
                <button
                  type="button"
                  onClick={() => setAsking(false)}
                  disabled={closing}
                  className="py-2 text-[13px] font-bold text-ludn-muted"
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
