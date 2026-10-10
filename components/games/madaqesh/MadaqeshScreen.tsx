/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  Loader2,
  AlertCircle,
  X,
  Crown,
  Copy,
  Check,
  QrCode,
  ArrowUp,
  ArrowDown,
  Shuffle,
  Play,
  Bot,
  Settings2,
  Undo2,
  Square,
  RotateCcw,
  Home,
  DoorClosed,
  History,
  LogOut,
  UserX,
  Pencil,
  Eye,
  DoorOpen,
  SkipForward,
  CheckCheck,
} from "lucide-react";
import { MADAQESH_CONFIG, MADAQESH_GAME, formatMoney } from "@/constants/madaqesh";
import type { MadaqeshGameCtx } from "@/hooks/games/madaqesh/useMadaqeshGame";
import { writeMadaqeshSession } from "@/lib/game/madaqesh-session";
import type { MadaqeshPhase } from "@/types/madaqesh";
import { currentBidderId } from "@/lib/game/madaqesh-engine";
import { BalanceBoard, btn, Delta, Money, MoneyInput, Panel } from "./MadaqeshParts";
import MadaqeshSettingsForm from "./MadaqeshSettingsForm";
import { MadaqeshBidding, MadaqeshDeciding, MadaqeshResponding, MadaqeshResult, MadaqeshShowdown, roundHeadline } from "./MadaqeshRound";

function phaseLabel(phase: MadaqeshPhase, round: number): string {
  switch (phase) {
    case "lobby":
      return "غرفة الانتظار";
    case "bidding":
      return `الجولة ${round} — السوم`;
    case "deciding":
      return `الجولة ${round} — القرار`;
    case "responding":
      return `الجولة ${round} — الردود`;
    case "showdown":
      return `الجولة ${round} — المداقشة`;
    case "result":
      return `الجولة ${round} — النتيجة`;
    case "ended":
      return "انتهت اللعبة";
    case "closed":
      return "الغرفة انقفلت";
  }
}

export default function MadaqeshScreen({ ctx, onLeave }: { ctx: MadaqeshGameCtx; onLeave: () => void }) {
  const { room, me, error, setError } = ctx;

  if (!room || !me) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-slate-400">
        <Loader2 size={40} className="animate-spin text-amber-500" />
        <p className="font-black">جاري الدخول للغرفة...</p>
      </div>
    );
  }

  const phase = room.phase;
  const inGame = phase !== "lobby" && phase !== "closed";

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4">
      <header className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-500 break-words">
            🧮 {MADAQESH_GAME.title} · {me.display_name}
            {ctx.isHost ? " 👑" : ""}
          </p>
          <h1 className="text-xl font-black leading-tight break-words">{phaseLabel(phase, room.round_number)}</h1>
        </div>
        {inGame && <HistoryButton ctx={ctx} />}
        {ctx.isHost && phase !== "closed" && <HostMenu ctx={ctx} />}
        {phase === "lobby" && !ctx.isHost && (
          <button
            type="button"
            onClick={onLeave}
            aria-label="خروج"
            className="w-11 h-11 rounded-2xl bg-slate-800 border-b-4 border-slate-950 flex items-center justify-center text-slate-400"
          >
            <LogOut size={20} />
          </button>
        )}
      </header>

      {error && (
        <div className="flex items-center gap-2 text-sm font-bold text-red-200 bg-red-950/70 border border-red-800 rounded-xl p-3 animate-in fade-in">
          <AlertCircle size={18} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="إغلاق" className="shrink-0 w-10 h-10 -my-2 -me-2 rounded-xl flex items-center justify-center">
            <X size={20} />
          </button>
        </div>
      )}

      {me.is_out && inGame && phase !== "ended" && (
        <p className="text-center p-3 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 font-black">
          ☠️ طلعت من اللعبة — تقدر تتفرج
        </p>
      )}

      {phase === "lobby" && <MadaqeshLobby ctx={ctx} />}
      {phase === "bidding" && <MadaqeshBidding key={room.round_number} ctx={ctx} />}
      {phase === "deciding" && <MadaqeshDeciding key={room.round_number} ctx={ctx} />}
      {phase === "responding" && <MadaqeshResponding ctx={ctx} />}
      {phase === "showdown" && <MadaqeshShowdown key={room.round_number} ctx={ctx} />}
      {phase === "result" && <MadaqeshResult ctx={ctx} />}
      {phase === "ended" && <MadaqeshGameOver ctx={ctx} />}
      {phase === "closed" && <MadaqeshClosed newCode={room.settings.movedTo} />}

      {inGame && phase !== "ended" && <BalanceBoard ctx={ctx} />}
    </div>
  );
}

// ---------------------------------------------------------------------
// غرفة الانتظار
// ---------------------------------------------------------------------

function MadaqeshLobby({ ctx }: { ctx: MadaqeshGameCtx }) {
  const { room, players, isHost, me, host, busy, devMode } = ctx;
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [editing, setEditing] = useState(false);
  const [kickArmed, setKickArmed] = useState<string | null>(null);
  if (!room) return null;
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}${MADAQESH_GAME.joinPath}?room=${room.room_code}` : "";
  const s = room.settings;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setShowQR(true);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel className="text-center">
        <p className="font-bold text-slate-400 text-sm mb-1">رمز الغرفة</p>
        <p className="text-5xl font-black tracking-[0.3em] text-amber-400 mb-4" dir="ltr">
          {room.room_code}
        </p>
        <div className="flex gap-2 justify-center">
          <button type="button" onClick={copyLink} className="flex-1 max-w-44 py-3 rounded-2xl bg-slate-800 border-b-4 border-slate-950 font-black flex items-center justify-center gap-2">
            {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
            {copied ? "تم النسخ" : "نسخ الرابط"}
          </button>
          <button type="button" onClick={() => setShowQR((v) => !v)} className="flex-1 max-w-44 py-3 rounded-2xl bg-slate-800 border-b-4 border-slate-950 font-black flex items-center justify-center gap-2">
            <QrCode size={18} /> باركود
          </button>
        </div>
        {showQR && (
          <div className="bg-white p-3 rounded-2xl mx-auto w-fit mt-4 animate-in zoom-in-95">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(joinUrl)}`}
              alt={`باركود الانضمام لغرفة ${room.room_code}`}
              className="w-52 h-52"
            />
          </div>
        )}
      </Panel>

      <Panel>
        <div className="flex items-center justify-between gap-2 mb-1">
          <h2 className="text-xl font-black">👥 ترتيب اللعب</h2>
          {isHost && players.length > 1 && (
            <button type="button" onClick={() => host.shuffle()} disabled={busy} className="px-3 py-2 rounded-xl bg-slate-800 border-b-4 border-slate-950 font-black text-sm flex items-center gap-1.5">
              <Shuffle size={16} /> سحب عشوائي
            </button>
          )}
        </div>
        <p className="text-xs font-bold text-slate-400 mb-3">
          الجولة الأولى تبدأ من الأول، وكل جولة يبدأ اللي بعده
        </p>
        <ol className="flex flex-col gap-2">
          {players.map((p, i) => (
            <li
              key={p.id}
              className={`flex items-center gap-2 py-2 px-3 rounded-2xl font-black animate-in zoom-in-95 ${
                p.id === me?.id ? "bg-amber-900/40 border-2 border-amber-700" : "bg-slate-800"
              }`}
            >
              <span className="w-7 text-center text-slate-400 tabular-nums">{i + 1}</span>
              {p.id === room.host_player_id && <Crown size={16} className="text-amber-400 shrink-0" />}
              <span className="flex-1 min-w-0 break-words leading-tight">{p.display_name}</span>
              {isHost && (
                <>
                  <button type="button" disabled={busy || i === 0} onClick={() => host.move(p.id, -1)} aria-label={`${p.display_name} لفوق`} className="w-9 h-9 rounded-xl bg-slate-900/60 flex items-center justify-center disabled:opacity-30">
                    <ArrowUp size={18} />
                  </button>
                  <button type="button" disabled={busy || i === players.length - 1} onClick={() => host.move(p.id, 1)} aria-label={`${p.display_name} لتحت`} className="w-9 h-9 rounded-xl bg-slate-900/60 flex items-center justify-center disabled:opacity-30">
                    <ArrowDown size={18} />
                  </button>
                  {p.id !== room.host_player_id && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (kickArmed !== p.id) return setKickArmed(p.id);
                        setKickArmed(null);
                        await host.kick(p.id);
                      }}
                      onBlur={() => setKickArmed((c) => (c === p.id ? null : c))}
                      aria-label={kickArmed === p.id ? `تأكيد طرد ${p.display_name}` : `طرد ${p.display_name}`}
                      className={`shrink-0 h-9 rounded-xl flex items-center justify-center ${
                        kickArmed === p.id ? "px-2.5 bg-red-600 text-xs animate-pulse" : "w-9 bg-slate-900/60 text-slate-400"
                      }`}
                    >
                      {kickArmed === p.id ? "طرد؟" : <X size={18} />}
                    </button>
                  )}
                </>
              )}
            </li>
          ))}
        </ol>
      </Panel>

      <Panel>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black">⚙️ الإعدادات</h2>
          {isHost && !editing && (
            <button type="button" onClick={() => setEditing(true)} className="px-3 py-2 rounded-xl bg-slate-800 border-b-4 border-slate-950 font-black text-sm flex items-center gap-1.5">
              <Settings2 size={16} /> تعديل
            </button>
          )}
        </div>
        {editing ? (
          <MadaqeshSettingsForm
            initial={s}
            busy={busy}
            submitLabel="حفظ"
            onSubmit={async (next) => {
              const res = await host.updateSettings(next);
              if (res?.success) setEditing(false);
            }}
          />
        ) : (
          <ul className="grid grid-cols-3 gap-2 text-center">
            <li className="p-3 rounded-2xl bg-slate-800">
              <p className="text-xs font-bold text-slate-400">البداية</p>
              <Money value={s.startBalance} className="font-black" />
            </li>
            <li className="p-3 rounded-2xl bg-slate-800">
              <p className="text-xs font-bold text-slate-400">الفوز</p>
              <Money value={s.targetAmount} className="font-black" />
            </li>
            <li className="p-3 rounded-2xl bg-slate-800">
              <p className="text-xs font-bold text-slate-400">الإفلاس</p>
              <span className="font-black">{s.maxBankrupts} مرات</span>
            </li>
          </ul>
        )}
      </Panel>

      {isHost ? (
        <>
          {devMode && players.length < 7 && (
            <button type="button" onClick={() => host.addBots()} disabled={busy} className={btn.ghost}>
              <Bot size={20} /> إضافة لاعبين وهميين (تجربة)
            </button>
          )}
          <button
            type="button"
            onClick={() => host.start()}
            disabled={busy || players.length < MADAQESH_CONFIG.MIN_PLAYERS}
            className={btn.primary}
          >
            {busy ? <Loader2 className="animate-spin" size={22} /> : <Play size={22} />}
            {players.length < MADAQESH_CONFIG.MIN_PLAYERS ? "بانتظار اللاعبين…" : "ابدأ اللعب"}
          </button>
        </>
      ) : (
        <p className="text-center font-bold text-slate-400 animate-pulse">بانتظار المنشئ يبدأ اللعب...</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// سجل الجولات
// ---------------------------------------------------------------------

function HistoryButton({ ctx }: { ctx: MadaqeshGameCtx }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="سجل الجولات"
        className="w-11 h-11 rounded-2xl bg-slate-800 border-b-4 border-slate-950 flex items-center justify-center"
      >
        <History size={20} />
      </button>
      {open && (
        <Sheet title="📜 سجل الجولات" onClose={() => setOpen(false)}>
          {ctx.history.length === 0 ? (
            <p className="text-center font-bold text-slate-400 py-6">ما فيه جولات انحسبت للحين</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {ctx.history.map((h) => (
                <li key={h.id} className="p-3 rounded-2xl bg-slate-800">
                  <p className="font-black text-sm mb-1.5">
                    <span className="text-amber-400">الجولة {h.round}:</span> {roundHeadline(h.data.round, ctx.nameOf)}
                  </p>
                  <ul className="flex flex-wrap gap-x-3 gap-y-1">
                    {Object.entries(h.data.round.result?.deltas ?? {}).map(([id, d]) => (
                      <li key={id} className="text-xs font-bold">
                        {ctx.nameOf(id)} <Delta value={d} />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </Sheet>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
// قائمة المنشئ
// ---------------------------------------------------------------------

function HostMenu({ ctx }: { ctx: MadaqeshGameCtx }) {
  const { room, players, host, busy, nameOf } = ctx;
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(0);
  const [askClose, setAskClose] = useState(false);
  if (!room) return null;
  const inGame = room.phase !== "lobby" && room.phase !== "ended";

  const confirm = (key: string, fn: () => unknown) => {
    if (armed !== key) return setArmed(key);
    setArmed(null);
    fn();
  };

  const goHome = () => {
    window.location.href = "/";
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="قائمة المنشئ"
        className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 border-b-4 border-amber-700 flex items-center justify-center"
      >
        <Crown size={20} />
      </button>

      {open && (
        <Sheet title="👑 قائمة المنشئ" onClose={() => { setOpen(false); setArmed(null); setEditId(null); }}>
          <div className="flex flex-col gap-2">
            {/* تخطي: لو أحد غايب ووقف اللعب */}
            {room.phase === "bidding" && room.round && currentBidderId(room.round) && (
              <MenuItem
                icon={<SkipForward size={20} />}
                label={`تخطي دور ${nameOf(currentBidderId(room.round))}`}
                hint="نعتبره انسحب من السوم"
                onClick={() => host.skipTurn().then(() => setOpen(false))}
                disabled={busy}
              />
            )}
            {room.phase === "responding" && (
              <MenuItem
                icon={<CheckCheck size={20} />}
                label="اعتمد الردود الحين"
                hint={room.round?.decision?.mode === "withdraw" ? "اللي ما رد = انسحب" : "اللي ما رد = راضي"}
                onClick={() => host.forceResponses().then(() => setOpen(false))}
                disabled={busy}
              />
            )}

            {inGame && (
              <MenuItem
                icon={<Undo2 size={20} />}
                label={armed === "undo" ? "متأكد؟ اضغط مرة ثانية" : "تراجع عن آخر جولة"}
                hint="الأرصدة ترجع مثل ما كانت، والجولة تنعاد من أولها"
                onClick={() => confirm("undo", () => host.undo().then(() => setOpen(false)))}
                armed={armed === "undo"}
                disabled={busy}
              />
            )}

            {inGame && (
              <div className="p-3 rounded-2xl bg-slate-800">
                <p className="font-black mb-1 flex items-center gap-2"><Pencil size={18} /> اللاعبين</p>
                <p className="text-xs font-bold text-slate-400 mb-2">تعديل الرصيد · 👁️ متفرج (يظل بالغرفة) · طرد (يطلع جواله)</p>
                <ul className="flex flex-col gap-1.5">
                  {players.map((p) => (
                    <li key={p.id} className="rounded-xl bg-slate-900/70 p-2">
                      <p className="font-black leading-tight break-words mb-1.5">{p.display_name}{p.is_out ? " ☠️" : ""}</p>
                      <div className="flex items-center gap-2">
                        <Money value={p.balance} className="flex-1 font-bold text-sm text-slate-300" />
                        <button
                          type="button"
                          onClick={() => { setEditId(editId === p.id ? null : p.id); setEditValue(p.balance); }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs font-black"
                        >
                          تعديل
                        </button>
                        {p.id !== room.host_player_id && !p.is_out && (
                          <button
                            type="button"
                            onClick={() => confirm(`out-${p.id}`, () => host.out(p.id))}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-black ${armed === `out-${p.id}` ? "bg-amber-600 animate-pulse" : "bg-slate-800 text-slate-300"}`}
                            aria-label={`${p.display_name} يصير متفرج`}
                          >
                            {armed === `out-${p.id}` ? "متفرج؟" : <Eye size={14} />}
                          </button>
                        )}
                        {p.id !== room.host_player_id && (
                          <button
                            type="button"
                            onClick={() => confirm(`kick-${p.id}`, () => host.kick(p.id))}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-black ${armed === `kick-${p.id}` ? "bg-red-600 animate-pulse" : "bg-slate-800 text-slate-300"}`}
                            aria-label={`طرد ${p.display_name}`}
                          >
                            {armed === `kick-${p.id}` ? "طرد؟" : <UserX size={14} />}
                          </button>
                        )}
                      </div>
                      {editId === p.id && (
                        <div className="mt-2 flex flex-col gap-2 animate-in fade-in">
                          <MoneyInput value={editValue} onChange={setEditValue} steps={[]} placeholder="الرصيد الجديد" />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={async () => {
                              const res = await host.setBalance(p.id, editValue);
                              if (res?.success) setEditId(null);
                            }}
                            className={btn.primary}
                          >
                            حفظ {formatMoney(editValue)}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {inGame && (
              <MenuItem
                icon={<Square size={20} />}
                label={armed === "end" ? "متأكد؟ اضغط مرة ثانية" : "إنهاء اللعبة الحين"}
                hint="يفوز صاحب أعلى رصيد"
                onClick={() => confirm("end", () => host.endGame().then(() => setOpen(false)))}
                armed={armed === "end"}
                disabled={busy}
              />
            )}

            {room.phase !== "lobby" && (
              <MenuItem
                icon={<RotateCcw size={20} />}
                label={armed === "again" ? "متأكد؟ اضغط مرة ثانية" : "لعبة جديدة بنفس اللاعبين"}
                hint="الأرصدة ترجع لرصيد البداية"
                onClick={() => confirm("again", () => host.playAgain().then(() => setOpen(false)))}
                armed={armed === "again"}
                disabled={busy}
              />
            )}

            <MenuItem
              icon={<DoorOpen size={20} />}
              label={armed === "newRoom" ? "متأكد؟ اضغط مرة ثانية" : "غرفة جديدة (كود جديد)"}
              hint="الكل يطلع من هالغرفة ويدخلون من جديد بالكود الجديد"
              onClick={() => confirm("newRoom", () => host.newRoom())}
              armed={armed === "newRoom"}
              disabled={busy}
            />

            <MenuItem icon={<Home size={20} />} label="الصفحة الرئيسية" hint="تقدر تقفل الغرفة أو تخليها شغالة" onClick={() => setAskClose(true)} />
          </div>
        </Sheet>
      )}

      {askClose &&
        createPortal(
          <div className="fixed inset-0 z-[2600] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" dir="rtl" onClick={() => setAskClose(false)}>
            <div className="w-full max-w-sm bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 text-center animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
              <p className="text-6xl mb-3">🚪</p>
              <h2 className="text-2xl font-black mb-2">هل تريد إغلاق الغرفة؟</h2>
              <p className="text-sm font-bold text-slate-400 mb-5 leading-relaxed">
                إذا قفلتها تنتهي اللعبة عند الكل، ويقدر أي واحد منهم يسجّل دخول ويسوي غرفة جديدة.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    const res = await host.closeRoom();
                    if (!res?.success) return;
                    writeMadaqeshSession(null);
                    goHome();
                  }}
                  className={btn.danger}
                >
                  {busy ? <Loader2 className="animate-spin" size={22} /> : <DoorClosed size={22} />} نعم، أغلق الغرفة
                </button>
                <button type="button" onClick={goHome} className={btn.ghost}>
                  <Home size={20} /> لا، خلها شغالة
                </button>
                <button type="button" onClick={() => setAskClose(false)} className="py-2 font-bold text-slate-400">
                  رجوع
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  onClick,
  armed,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  armed?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 p-4 rounded-2xl border-b-4 font-black text-start disabled:opacity-40 ${
        armed ? "bg-red-600 border-red-800 animate-pulse" : "bg-slate-800 border-slate-950"
      }`}
    >
      {icon}
      <span className="flex-1">
        {label}
        {hint && <span className="block text-xs font-bold text-slate-400">{hint}</span>}
      </span>
    </button>
  );
}

/** نافذة من تحت (على الجوال) */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-[2500] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 animate-in fade-in" dir="rtl" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85dvh] overflow-y-auto bg-slate-900 border-2 border-slate-700 rounded-3xl text-white animate-in slide-in-from-bottom-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 p-4 bg-slate-900 border-b border-slate-800">
          <h2 className="text-xl font-black">{title}</h2>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------
// النهاية
// ---------------------------------------------------------------------

function MadaqeshGameOver({ ctx }: { ctx: MadaqeshGameCtx }) {
  const { room, players, isHost, host, busy, nameOf } = ctx;
  if (!room) return null;
  const ranked = [...players].sort((a, b) => Number(a.is_out) - Number(b.is_out) || b.balance - a.balance);
  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-[2rem] p-8 text-center shadow-2xl animate-in zoom-in-50 duration-500 bg-gradient-to-br from-amber-400 to-amber-700 text-slate-950">
        <p className="text-8xl mb-3">🏆</p>
        <h2 className="text-4xl font-black mb-2">{room.winner_id ? `${nameOf(room.winner_id)} فاز!` : "انتهت اللعبة"}</h2>
        {room.winner_id && (
          <p className="font-black text-xl">
            <Money value={ctx.playerOf(room.winner_id)?.balance ?? 0} />
          </p>
        )}
      </div>

      <Panel>
        <h3 className="font-black text-xl mb-3">🏁 الترتيب النهائي</h3>
        <ol className="flex flex-col gap-2">
          {ranked.map((p, i) => (
            <li key={p.id} className={`flex items-center gap-3 p-3 rounded-2xl ${i === 0 ? "bg-amber-900/50" : "bg-slate-800"} ${p.is_out ? "opacity-60" : ""}`}>
              <span className="w-8 text-center text-xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span>
              <span className="flex-1 min-w-0 font-black break-words">{p.display_name}{p.is_out ? " ☠️" : ""}</span>
              <Money value={p.balance} className="font-black" />
            </li>
          ))}
        </ol>
      </Panel>

      {isHost ? (
        <button type="button" onClick={() => host.playAgain()} disabled={busy} className={btn.primary}>
          {busy ? <Loader2 className="animate-spin" size={22} /> : <RotateCcw size={22} />} لعبة جديدة بنفس اللاعبين
        </button>
      ) : (
        <p className="text-center font-bold text-slate-400">بانتظار المنشئ يبدأ لعبة جديدة...</p>
      )}
    </div>
  );
}

function MadaqeshClosed({ newCode }: { newCode?: string }) {
  if (newCode) {
    return (
      <Panel className="text-center">
        <p className="text-6xl mb-3">🚪</p>
        <h2 className="text-2xl font-black mb-2">المنشئ سوّى غرفة جديدة</h2>
        <p className="font-bold text-slate-400 mb-1">الكود الجديد</p>
        <p className="text-4xl font-black tracking-[0.3em] text-amber-400 mb-5" dir="ltr">
          {newCode}
        </p>
        <a href={`${MADAQESH_GAME.joinPath}?room=${newCode}`} className={btn.primary}>
          ادخل الغرفة الجديدة
        </a>
      </Panel>
    );
  }
  return (
    <Panel className="text-center">
      <p className="text-6xl mb-3">🚪</p>
      <h2 className="text-2xl font-black mb-2">المنشئ قفل الغرفة</h2>
      <p className="font-bold text-slate-400 mb-5 leading-relaxed">
        تبون تكملون؟ واحد منكم يسجّل دخول ويسوي غرفة جديدة، ويرسل الكود للباقين 🔥
      </p>
      <div className="flex flex-col gap-3">
        <a href={MADAQESH_GAME.path} className={btn.primary}>
          سوّ غرفة جديدة
        </a>
        <a href={MADAQESH_GAME.joinPath} className={btn.ghost}>
          ادخل غرفة بكود
        </a>
      </div>
    </Panel>
  );
}
