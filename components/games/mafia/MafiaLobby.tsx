/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  Crown,
  X,
  Play,
  Loader2,
  Settings2,
  Bot,
  QrCode,
  Pencil,
  Users,
  Hourglass,
  Shuffle,
  Flame,
  Zap,
} from "lucide-react";
import { MAFIA_GAME, MAFIA_MODES, MAFIA_ROLES } from "@/constants/mafia";
import { isFastMafia, mafiaCitizenCount } from "@/lib/game/mafia-engine";
import type { MafiaGameCtx } from "@/hooks/games/mafia/useMafiaGame";
import type { MafiaRole } from "@/types";
import MafiaSetupForm from "./MafiaSetupForm";
import { Panel, RoleIcon } from "./MafiaParts";
import { BTN_GOLD, BTN_SOFT, CHIP, CTA_BAR, FIELD, LABEL, avatarColor } from "./mafiaUi";

export default function MafiaLobby({ ctx }: { ctx: MafiaGameCtx }) {
  const { room, players, isHost, me, host, busy, devMode } = ctx;
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [editing, setEditing] = useState(false);
  // الطرد يحتاج ضغطتين: الأولى تسأل "طرد؟"، والثانية تطرد
  const [kickArmed, setKickArmed] = useState<string | null>(null);
  const [newName, setNewName] = useState<string | null>(null);
  // وضع التجربة: فئة المنشئ (null = عشوائي)
  const [devRole, setDevRole] = useState<MafiaRole | null>(null);

  if (!room) return null;
  const max = room.settings.maxPlayers;
  const full = players.length === max;
  const citizens = mafiaCitizenCount(room.settings);
  const fast = isFastMafia(room.settings);
  const modeDef = MAFIA_MODES.find((m) => m.key === (fast ? "fast" : "hype"))!;
  const devRoles: MafiaRole[] = [
    "mafia",
    "detective",
    "doctor",
    ...(citizens > 0 ? (["citizen"] as const) : []),
    ...room.settings.optionalRoles,
  ];
  // لو تغيّرت الإعدادات وفئتي ما عادت موجودة: عشوائي
  const myDevRole = devRole && devRoles.includes(devRole) ? devRole : null;
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}${MAFIA_GAME.joinPath}?room=${room.room_code}` : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setShowQR(true);
    }
  };

  // تركيبة الفئات معلنة للكل
  const mix: { role: MafiaRole; label: string; optional?: boolean }[] = [
    { role: "mafia", label: `مافيا ×${room.settings.mafiaCount}` },
    { role: "detective", label: MAFIA_ROLES.detective.label },
    { role: "doctor", label: MAFIA_ROLES.doctor.label },
    { role: "citizen", label: `مواطنين ×${citizens}` },
    ...room.settings.optionalRoles.map((r) => ({ role: r, label: MAFIA_ROLES[r].label, optional: true })),
  ];

  const devChip = (on: boolean) =>
    `min-h-11 p-2 rounded-xl font-black text-xs flex flex-col items-center justify-center gap-1 border transition-colors ${
      on ? "bg-ludn-gold border-ludn-gold text-ludn-gold-ink" : "bg-ludn-surface-2 border-ludn-line"
    }`;

  return (
    <div className="flex flex-col gap-3">
      <Panel className="text-center grid gap-1.5">
        <p className={LABEL}>كود الغرفة</p>
        <p
          className="font-display text-[50px] leading-[1.1] tracking-[0.22em] text-ludn-gold-text [text-shadow:0_0_26px_rgba(226,184,74,0.25)]"
          dir="ltr"
        >
          {room.room_code}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={copyLink} className={BTN_SOFT}>
            {copied ? <Check size={18} className="text-ludn-green" /> : <Copy size={18} />}
            {copied ? "تم النسخ" : "نسخ الرابط"}
          </button>
          <button type="button" onClick={() => setShowQR((v) => !v)} className={BTN_SOFT}>
            <QrCode size={18} /> باركود
          </button>
        </div>
        {showQR && (
          <div className="bg-white p-3 rounded-2xl mx-auto w-fit mt-2 animate-in zoom-in-95">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(joinUrl)}`}
              alt={`باركود الانضمام لغرفة ${room.room_code}`}
              className="w-52 h-52"
            />
          </div>
        )}
      </Panel>

      <Panel>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[15px] font-black flex items-center gap-2">
            <Users size={18} /> اللاعبين
          </h2>
          <span
            className={`px-2.5 py-0.5 rounded-[10px] font-display text-lg tabular-nums ${
              full ? "bg-ludn-green/20 text-ludn-green" : "bg-ludn-surface-2 text-ludn-fg"
            }`}
          >
            {players.length} / {max}
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-1.5">
          {players.map((p) => (
            <li
              key={p.id}
              className={`min-w-0 flex items-center gap-2 p-1.5 rounded-[14px] bg-ludn-surface-2 border text-sm font-black animate-in zoom-in-95 ${
                p.id === me?.id ? "border-ludn-gold/60" : "border-ludn-line"
              }`}
            >
              <span
                aria-hidden
                className="w-[30px] h-[30px] shrink-0 rounded-full grid place-items-center text-sm font-black text-ludn-gold-ink"
                style={{ background: avatarColor(p.seat) }}
              >
                {p.display_name.trim().charAt(0)}
              </span>
              <span className="flex-1 min-w-0 break-words leading-tight">{p.display_name}</span>
              {p.id === room.host_player_id && <Crown size={15} className="text-ludn-gold shrink-0" />}
              {isHost && p.id !== room.host_player_id && (
                <button
                  type="button"
                  onClick={async () => {
                    if (kickArmed !== p.id) {
                      setKickArmed(p.id);
                      return;
                    }
                    setKickArmed(null);
                    await host.kick(p.id);
                  }}
                  onBlur={() => setKickArmed((cur) => (cur === p.id ? null : cur))}
                  aria-label={kickArmed === p.id ? `تأكيد طرد ${p.display_name}` : `طرد ${p.display_name}`}
                  className={`shrink-0 h-[30px] rounded-[10px] flex items-center justify-center transition-all ${
                    kickArmed === p.id
                      ? "px-2 bg-rose-600 text-white text-xs font-black animate-pulse"
                      : "w-[30px] text-ludn-muted hover:text-rose-400"
                  }`}
                >
                  {kickArmed === p.id ? "طرد؟" : <X size={16} />}
                </button>
              )}
            </li>
          ))}
          {Array.from({ length: Math.max(0, max - players.length) }).map((_, i) => (
            <li
              key={`empty-${i}`}
              className="min-h-[44px] px-2 rounded-[14px] border border-dashed border-ludn-line text-ludn-muted text-[13px] font-bold flex items-center justify-center"
            >
              بانتظار لاعب...
            </li>
          ))}
        </ul>

        {/* كل لاعب يقدر يغيّر اسمه قبل ما تبدأ اللعبة */}
        {newName === null ? (
          <button type="button" onClick={() => setNewName(me?.name ?? "")} className={`${BTN_SOFT} w-full mt-3`}>
            <Pencil size={16} /> غيّر اسمي
          </button>
        ) : (
          <form
            className="mt-3 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await ctx.rename(newName.trim())) setNewName(null);
            }}
          >
            <input
              autoFocus
              value={newName}
              maxLength={16}
              onChange={(e) => setNewName(e.target.value)}
              aria-label="اسمك الجديد"
              className={`${FIELD} flex-1 min-w-0`}
            />
            <button
              type="submit"
              disabled={busy || newName.trim().length < 2}
              className="px-4 rounded-[14px] bg-ludn-gold text-ludn-gold-ink font-black disabled:opacity-40"
            >
              حفظ
            </button>
            <button
              type="button"
              onClick={() => setNewName(null)}
              aria-label="إلغاء"
              className="w-12 shrink-0 rounded-[14px] bg-ludn-surface-2 border border-ludn-line flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </form>
        )}
      </Panel>

      <Panel className="p-3">
        <p className={`${LABEL} mb-2 flex items-center justify-between gap-2`}>
          التوزيعة
          {/* نمط اللعب معلن للكل — الغرف القديمة بدونه = حماسي */}
          <span className="flex items-center gap-1 text-ludn-gold-text">
            {fast ? <Zap size={15} /> : <Flame size={15} />}
            نمط {modeDef.label}
          </span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {mix.map((m) => (
            <span key={m.role} className={`${CHIP} ${m.optional ? "border-ludn-gold/35 text-ludn-gold-text" : ""}`}>
              <RoleIcon role={m.role} className="w-[22px] h-[22px]" /> {m.label}
            </span>
          ))}
        </div>
      </Panel>

      {isHost ? (
        <>
          <button type="button" onClick={() => setEditing((v) => !v)} className={`${BTN_SOFT} w-full`}>
            <Settings2 size={18} /> {editing ? "إخفاء الإعدادات" : "تعديل العدد والفئات"}
          </button>

          {editing && (
            <MafiaSetupForm
              key={JSON.stringify(room.settings)}
              initial={room.settings}
              minPlayers={players.length}
              busy={busy}
              submitLabel="حفظ الإعدادات"
              onSubmit={async (settings) => {
                const res = await host.updateSettings(settings);
                if (res?.success) setEditing(false);
              }}
            />
          )}

          {devMode && !full && (
            <button
              type="button"
              onClick={() => host.addBots()}
              disabled={busy}
              className="w-full min-h-11 rounded-[14px] bg-indigo-900/60 border border-dashed border-indigo-500 font-black text-sm text-indigo-200 flex items-center justify-center gap-2"
            >
              <Bot size={18} /> عبّي الغرفة بلاعبين وهميين (localhost فقط)
            </button>
          )}

          {devMode && (
            <div className="p-3 bg-indigo-900/40 border border-dashed border-indigo-500 rounded-2xl">
              <p className="font-black text-indigo-200 text-[13px] text-center mb-2.5">فئتي بالتجربة (localhost فقط)</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="فئتي بالتجربة">
                <button
                  type="button"
                  role="radio"
                  aria-checked={myDevRole === null}
                  onClick={() => setDevRole(null)}
                  className={devChip(myDevRole === null)}
                >
                  <Shuffle size={22} /> عشوائي
                </button>
                {devRoles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    role="radio"
                    aria-checked={myDevRole === role}
                    onClick={() => setDevRole(role)}
                    className={devChip(myDevRole === role)}
                  >
                    <RoleIcon role={role} className="w-8 h-8" />
                    {MAFIA_ROLES[role].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* زر البدء ثابت تحت الشاشة (إلا وقت تعديل الإعدادات: زر الحفظ هو الأساسي) */}
          <div className={editing ? "" : CTA_BAR}>
            <button
              type="button"
              onClick={() => host.start(devMode ? myDevRole : null)}
              disabled={!full || busy}
              className={BTN_GOLD}
            >
              {busy ? <Loader2 className="animate-spin" size={20} /> : <Play size={18} className="fill-current" />}
              {full ? "ابدأ اللعبة" : `باقي ${max - players.length} لاعبين`}
            </button>
          </div>
        </>
      ) : (
        <Panel className="text-center grid gap-1.5 justify-items-center">
          <Hourglass size={34} className="text-ludn-gold animate-pulse" />
          <p className="font-display text-2xl leading-tight">بانتظار المنشئ يبدأ اللعبة...</p>
          <p className={LABEL}>خل جوالك قريب منك وبعيد عن عيون الباقين</p>
        </Panel>
      )}
    </div>
  );
}
