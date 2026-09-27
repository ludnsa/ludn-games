"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Crown, X, SkipForward, Square, RotateCcw, Home, Loader2, UserX } from "lucide-react";
import type { MafiaGameCtx } from "@/hooks/games/mafia/useMafiaGame";

type Confirmable = "end" | "restart" | null;

/**
 * قائمة صلاحيات منشئ اللعبة — تفتح من زر التاج في الشريط العلوي.
 * الأزرار الخطيرة (إنهاء، إعادة) تحتاج ضغطة تأكيد ثانية.
 */
export default function MafiaHostMenu({ ctx }: { ctx: MafiaGameCtx }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<Confirmable>(null);
  const [showKick, setShowKick] = useState(false);
  const [kickTarget, setKickTarget] = useState<string | null>(null);
  const { room, host, busy, players } = ctx;
  if (!room) return null;

  const playing = room.phase !== "lobby" && room.phase !== "ended";
  const close = () => {
    setOpen(false);
    setConfirming(null);
    setShowKick(false);
    setKickTarget(null);
  };

  const kickable = players.filter((p) => p.id !== room.host_player_id);

  const runAndClose = async (fn: () => Promise<unknown>) => {
    await fn();
    close();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="صلاحيات المنشئ"
        title="صلاحيات المنشئ"
        className="w-11 h-11 rounded-2xl bg-amber-500 border-b-4 border-amber-700 text-slate-950 flex items-center justify-center"
      >
        <Crown size={22} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[2500] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 animate-in fade-in"
          onClick={close}
        >
          <div
            role="dialog"
            aria-label="صلاحيات المنشئ"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain bg-slate-900 border-2 border-amber-600 rounded-[2rem] p-5 pt-0 shadow-2xl animate-in slide-in-from-bottom-8"
          >
            {/* ثابت فوق وقت السحب — عشان زر الإغلاق دايماً موجود */}
            <div className="sticky top-0 z-10 -mx-5 px-5 pt-5 pb-3 mb-1 bg-slate-900 flex items-center justify-between">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Crown size={22} className="text-amber-400" /> صلاحيات المنشئ
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="إغلاق"
                className="w-11 h-11 -me-2 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-800"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {playing && (
                <MenuButton
                  icon={<SkipForward size={20} />}
                  label="تخطي المرحلة الحالية"
                  hint="ينهي المؤقت وينتقل للمرحلة الجاية فوراً"
                  onClick={() => runAndClose(host.skipPhase)}
                  disabled={busy}
                />
              )}

              {playing && (
                <MenuButton
                  icon={<Square size={20} />}
                  label={confirming === "end" ? "متأكد؟ اضغط مرة ثانية للإنهاء" : "إنهاء اللعبة وكشف الأدوار"}
                  hint="تنتهي الجولة بدون فائز ويشوف الكل أدوار بعض"
                  tone="danger"
                  armed={confirming === "end"}
                  onClick={() => (confirming === "end" ? runAndClose(host.endGame) : setConfirming("end"))}
                  disabled={busy}
                />
              )}

              {kickable.length > 0 && (
                <MenuButton
                  icon={<UserX size={20} />}
                  label="طرد لاعب"
                  hint="يطلع من الغرفة فوراً وما يقدر يرجع لين تخلص الجولة"
                  tone="danger"
                  onClick={() => {
                    setShowKick((v) => !v);
                    setKickTarget(null);
                  }}
                  disabled={busy}
                />
              )}

              {showKick && (
                <div className="grid grid-cols-2 gap-2 p-2 rounded-2xl bg-slate-950/60 max-h-64 overflow-y-auto">
                  {kickable.map((p) => {
                    const armed = kickTarget === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                          if (!armed) {
                            setKickTarget(p.id);
                            return;
                          }
                          const res = await host.kick(p.id);
                          if (res?.success) setKickTarget(null);
                        }}
                        className={`min-h-11 py-2.5 px-2 rounded-xl font-black text-sm leading-tight break-words border-b-4 transition-colors ${
                          armed
                            ? "bg-red-600 border-red-800 text-white animate-pulse"
                            : "bg-slate-800 border-slate-950 text-slate-100"
                        } ${p.is_alive ? "" : "opacity-60"}`}
                      >
                        {armed ? `اطرد ${p.display_name}؟` : p.display_name}
                      </button>
                    );
                  })}
                </div>
              )}

              {room.phase !== "lobby" && (
                <MenuButton
                  icon={<RotateCcw size={20} />}
                  label={confirming === "restart" ? "متأكد؟ اضغط مرة ثانية للإعادة" : "جولة جديدة (رجوع لغرفة الانتظار)"}
                  hint="نفس اللاعبين، وتقدر تعدّل العدد والفئات قبل البدء"
                  tone="warn"
                  armed={confirming === "restart"}
                  onClick={() => (confirming === "restart" ? runAndClose(host.playAgain) : setConfirming("restart"))}
                  disabled={busy}
                />
              )}

              <Link
                href="/"
                className="flex items-center gap-3 p-4 rounded-2xl bg-slate-800 border-b-4 border-slate-950 font-black"
              >
                <Home size={20} />
                <span className="flex-1">
                  الصفحة الرئيسية
                  <span className="block text-xs font-bold text-slate-400">
                    اللعبة تكمل، وتقدر ترجع لها من صفحة المافيا
                  </span>
                </span>
              </Link>
            </div>

            {busy && (
              <p className="flex items-center justify-center gap-2 mt-4 text-sm font-bold text-slate-400">
                <Loader2 size={16} className="animate-spin" /> لحظة...
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MenuButton({
  icon,
  label,
  hint,
  onClick,
  disabled,
  tone = "normal",
  armed = false,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "normal" | "warn" | "danger";
  armed?: boolean;
}) {
  const toneClass =
    tone === "danger"
      ? armed
        ? "bg-red-600 border-red-800 text-white animate-pulse"
        : "bg-red-950/60 border-red-900 text-red-200"
      : tone === "warn"
        ? armed
          ? "bg-amber-500 border-amber-700 text-slate-950 animate-pulse"
          : "bg-amber-950/50 border-amber-900 text-amber-100"
        : "bg-slate-800 border-slate-950 text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 p-4 rounded-2xl border-b-4 font-black text-right transition-colors disabled:opacity-50 ${toneClass}`}
    >
      {icon}
      <span className="flex-1">
        {label}
        <span className="block text-xs font-bold opacity-70">{hint}</span>
      </span>
    </button>
  );
}
