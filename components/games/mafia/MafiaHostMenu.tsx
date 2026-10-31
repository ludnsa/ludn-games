"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Crown, X, SkipForward, Square, RotateCcw, Home, Loader2, UserX, DoorOpen } from "lucide-react";
import type { MafiaGameCtx } from "@/hooks/games/mafia/useMafiaGame";
import type { MafiaPlayer } from "@/types";
import MafiaHomeButton from "./MafiaHomeButton";
import { RoleIcon } from "./MafiaParts";
import { BAR_BTN, BTN_SOFT, H_CARD } from "./mafiaUi";

type Confirmable = "end" | "restart" | "newRoom" | null;
/** قائمة الأسماء المفتوحة: طرد (يطلع من الغرفة) أو ذبح غشاش (يموت ويظل بالغرفة) */
type Picker = "kick" | "cheat" | null;

/**
 * زر التخطي تحت الشاشة (للمنشئ بس) — لو أحد تأخر بالليل أو بالتصويت.
 * ضغطتين عشان ما ينضغط بالغلط وهو يختار.
 */
export function MafiaHostSkip({ ctx }: { ctx: MafiaGameCtx }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(id);
  }, [armed]);
  const night = ctx.room?.phase === "night_act";

  return (
    <button
      type="button"
      disabled={ctx.busy}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        ctx.host.skipPhase();
      }}
      className={`${BTN_SOFT} w-full ${
        armed ? "bg-ludn-gold! border-ludn-gold! text-ludn-gold-ink animate-pulse" : "text-ludn-gold-text"
      }`}
    >
      {ctx.busy ? <Loader2 size={18} className="animate-spin" /> : <SkipForward size={18} />}
      {armed
        ? "متأكد؟ اضغط مرة ثانية"
        : night
          ? "تخطي الدور (اللي ما اختار يختار له النظام)"
          : "إنهاء التصويت الحين"}
    </button>
  );
}

/**
 * المسكت: الممنوع من الكلام تكلم — المنشئ يقتله (يظل بالغرفة كميت).
 * ضغطتين عشان ما ينضغط بالغلط.
 */
export function MafiaHostHush({ ctx }: { ctx: MafiaGameCtx }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(id);
  }, [armed]);
  if (!ctx.silencedId) return null;
  const name = ctx.nameOf(ctx.silencedId);

  return (
    <button
      type="button"
      disabled={ctx.busy}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        ctx.host.killSilenced();
      }}
      className={`${BTN_SOFT} w-full ${armed ? "bg-rose-600! border-rose-600! text-white animate-pulse" : "text-rose-300"}`}
    >
      {ctx.busy ? <Loader2 size={18} className="animate-spin" /> : <RoleIcon role="silencer" className="w-8 h-8 -my-1" />}
      {armed ? `متأكد؟ اضغط مرة ثانية ويموت ${name}` : `${name} تكلم؟ اقتله`}
    </button>
  );
}

/**
 * قائمة صلاحيات منشئ اللعبة — تفتح من زر التاج في الشريط العلوي.
 * الأزرار الخطيرة (إنهاء، إعادة) تحتاج ضغطة تأكيد ثانية.
 */
export default function MafiaHostMenu({ ctx }: { ctx: MafiaGameCtx }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<Confirmable>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const { room, host, busy, players } = ctx;
  if (!room) return null;

  const playing = room.phase !== "lobby" && room.phase !== "ended";
  const day = room.phase === "morning" || room.phase === "discussion" || room.phase === "voting";
  const close = () => {
    setOpen(false);
    setConfirming(null);
    setPicker(null);
  };
  const togglePicker = (p: Picker) => setPicker((cur) => (cur === p ? null : p));

  const kickable = players.filter((p) => p.id !== room.host_player_id);
  // الغشاش ينذبح بس وقت النهار (مثل الممنوع من الكلام)
  const cheatable = day ? kickable.filter((p) => p.is_alive) : [];

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
        className={`${BAR_BTN} bg-ludn-gold! border-ludn-gold! text-ludn-gold-ink`}
      >
        <Crown size={18} />
      </button>

      {/* على body مباشرة: الشريط العلوي (فيه blur) يحبس أي fixed داخله */}
      {open &&
        createPortal(
          <div
            dir="rtl"
            className="dark fixed inset-0 z-[2500] flex items-end sm:items-center justify-center bg-ludn-bg/80 backdrop-blur-sm p-3 text-ludn-fg animate-in fade-in"
            onClick={close}
          >
            <div
              role="dialog"
              aria-label="صلاحيات المنشئ"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain bg-ludn-surface border border-ludn-gold/40 rounded-[26px] p-4 pt-0 shadow-2xl animate-in slide-in-from-bottom-8"
            >
              {/* ثابت فوق وقت السحب — عشان زر الإغلاق دايماً موجود */}
              <div className="sticky top-0 z-10 -mx-4 px-4 pt-4 pb-3 mb-1 bg-ludn-surface flex items-center justify-between">
                <h2 className={`${H_CARD} flex items-center gap-2`}>
                  <Crown size={20} className="text-ludn-gold" /> صلاحيات المنشئ
                </h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="إغلاق"
                  className="w-10 h-10 -me-1 rounded-xl flex items-center justify-center text-ludn-muted hover:bg-ludn-surface-2"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col gap-2.5">
                {playing && (
                  <MenuButton
                    icon={<SkipForward size={20} />}
                    label="تخطي المرحلة الحالية"
                    hint="بالليل: لو أحد غايب، الدور يمشي والنظام يختار عن صاحب الدور"
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
                    onClick={() => togglePicker("kick")}
                    disabled={busy}
                  />
                )}

                {picker === "kick" && (
                  <PlayerGrid
                    players={kickable}
                    busy={busy}
                    armedLabel={(name) => `اطرد ${name}؟`}
                    onConfirm={async (id) => Boolean((await host.kick(id))?.success)}
                  />
                )}

                {cheatable.length > 0 && (
                  <MenuButton
                    icon={<RoleIcon role="mafia" className="w-6 h-6 -my-1" />}
                    label="ذبح غشّاش"
                    hint="يموت ويظل بالغرفة يتفرج — مو طرد. بس وقت النهار"
                    tone="danger"
                    onClick={() => togglePicker("cheat")}
                    disabled={busy}
                  />
                )}

                {picker === "cheat" && cheatable.length > 0 && (
                  <PlayerGrid
                    players={cheatable}
                    busy={busy}
                    armedLabel={(name) => `اذبح ${name}؟`}
                    onConfirm={async (id) => {
                      const ok = Boolean((await host.killCheater(id))?.success);
                      // نقفل القائمة عشان المنشئ يشوف الإعلان والحركة
                      if (ok) close();
                      return ok;
                    }}
                  />
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

                <MenuButton
                  icon={<DoorOpen size={20} />}
                  label={confirming === "newRoom" ? "متأكد؟ اضغط مرة ثانية للغرفة الجديدة" : "غرفة جديدة (كود جديد)"}
                  hint="الكل يطلع من هالغرفة ويدخلون من جديد بالكود الجديد"
                  tone="danger"
                  armed={confirming === "newRoom"}
                  onClick={() => (confirming === "newRoom" ? runAndClose(host.newRoom) : setConfirming("newRoom"))}
                  disabled={busy}
                />

                <MafiaHomeButton
                  ctx={ctx}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-ludn-surface-2 border border-ludn-line text-[15px] font-black text-start"
                >
                  <Home size={20} />
                  <span className="flex-1">
                    الصفحة الرئيسية
                    <span className="block text-xs font-bold text-ludn-muted">
                      تقدر تقفل الغرفة أو تخليها شغالة
                    </span>
                  </span>
                </MafiaHomeButton>
              </div>

              {busy && (
                <p className="flex items-center justify-center gap-2 mt-3 text-[13px] font-bold text-ludn-muted">
                  <Loader2 size={16} className="animate-spin" /> لحظة...
                </p>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/** أسماء اللاعبين: ضغطة تحدد، والثانية تنفّذ — عشان ما ينضغط بالغلط */
function PlayerGrid({
  players,
  busy,
  armedLabel,
  onConfirm,
}: {
  players: MafiaPlayer[];
  busy: boolean;
  armedLabel: (name: string) => string;
  onConfirm: (playerId: string) => Promise<boolean>;
}) {
  const [armedId, setArmedId] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-2 gap-1.5 p-2 rounded-2xl bg-ludn-bg/60 max-h-64 overflow-y-auto">
      {players.map((p) => {
        const armed = armedId === p.id;
        return (
          <button
            key={p.id}
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!armed) {
                setArmedId(p.id);
                return;
              }
              if (await onConfirm(p.id)) setArmedId(null);
            }}
            className={`min-h-11 py-2 px-2 rounded-[14px] font-black text-[13.5px] leading-tight break-words border transition-colors ${
              armed
                ? "bg-rose-600 border-rose-600 text-white animate-pulse"
                : "bg-ludn-surface-2 border-ludn-line text-ludn-fg"
            } ${p.is_alive ? "" : "opacity-60"}`}
          >
            {armed ? armedLabel(p.display_name) : p.display_name}
          </button>
        );
      })}
    </div>
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
        ? "bg-rose-600 border-rose-600 text-white animate-pulse"
        : "bg-rose-500/10 border-rose-500/30 text-rose-200"
      : tone === "warn"
        ? armed
          ? "bg-ludn-gold border-ludn-gold text-ludn-gold-ink animate-pulse"
          : "bg-ludn-gold/10 border-ludn-gold/30 text-ludn-gold-text"
        : "bg-ludn-surface-2 border-ludn-line text-ludn-fg";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 p-3.5 rounded-2xl border text-[15px] font-black text-right transition-colors disabled:opacity-50 ${toneClass}`}
    >
      {icon}
      <span className="flex-1">
        {label}
        <span className="block text-xs font-bold opacity-70">{hint}</span>
      </span>
    </button>
  );
}
