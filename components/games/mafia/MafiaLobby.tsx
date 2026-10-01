/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { Copy, Check, Crown, X, Play, Loader2, Settings2, Bot, QrCode, Pencil } from "lucide-react";
import { MAFIA_GAME } from "@/constants/mafia";
import type { MafiaGameCtx } from "@/hooks/games/mafia/useMafiaGame";
import MafiaSetupForm from "./MafiaSetupForm";
import { Panel } from "./MafiaParts";

export default function MafiaLobby({ ctx }: { ctx: MafiaGameCtx }) {
  const { room, players, isHost, me, host, busy, devMode } = ctx;
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [editing, setEditing] = useState(false);
  // الطرد يحتاج ضغطتين: الأولى تسأل "طرد؟"، والثانية تطرد
  const [kickArmed, setKickArmed] = useState<string | null>(null);
  const [newName, setNewName] = useState<string | null>(null);

  if (!room) return null;
  const max = room.settings.maxPlayers;
  const full = players.length === max;
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

  return (
    <div className="flex flex-col gap-4">
      <Panel className="text-center">
        <p className="font-bold text-slate-400 text-sm mb-1">رمز الغرفة</p>
        <p className="text-5xl font-black tracking-[0.3em] text-red-400 mb-4" dir="ltr">
          {room.room_code}
        </p>
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={copyLink}
            className="flex-1 max-w-44 py-3 rounded-2xl bg-slate-800 border-b-4 border-slate-950 font-black flex items-center justify-center gap-2"
          >
            {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
            {copied ? "تم النسخ" : "نسخ الرابط"}
          </button>
          <button
            type="button"
            onClick={() => setShowQR((v) => !v)}
            className="flex-1 max-w-44 py-3 rounded-2xl bg-slate-800 border-b-4 border-slate-950 font-black flex items-center justify-center gap-2"
          >
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black">👥 اللاعبين</h2>
          <span className={`px-3 py-1 rounded-xl font-black tabular-nums ${full ? "bg-emerald-600" : "bg-slate-800"}`}>
            {players.length} / {max}
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-2">
          {players.map((p) => (
            <li
              key={p.id}
              className={`flex items-center gap-2 py-2.5 px-3 rounded-2xl font-black animate-in zoom-in-95 ${
                p.id === me?.id ? "bg-red-900/50 border-2 border-red-700" : "bg-slate-800"
              }`}
            >
              {p.id === room.host_player_id && <Crown size={16} className="text-amber-400 shrink-0" />}
              <span className="flex-1 min-w-0 break-words leading-tight">{p.display_name}</span>
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
                  className={`shrink-0 h-9 rounded-xl flex items-center justify-center transition-all ${
                    kickArmed === p.id
                      ? "px-2.5 bg-red-600 text-white text-xs font-black animate-pulse"
                      : "w-9 bg-slate-900/60 text-slate-400 hover:text-red-400"
                  }`}
                >
                  {kickArmed === p.id ? "طرد؟" : <X size={18} />}
                </button>
              )}
            </li>
          ))}
          {Array.from({ length: Math.max(0, max - players.length) }).map((_, i) => (
            <li
              key={`empty-${i}`}
              className="py-2.5 px-3 rounded-2xl border-2 border-dashed border-slate-800 text-slate-600 font-bold text-center"
            >
              بانتظار لاعب...
            </li>
          ))}
        </ul>

        {/* كل لاعب يقدر يغيّر اسمه قبل ما تبدأ اللعبة */}
        {newName === null ? (
          <button
            type="button"
            onClick={() => setNewName(me?.name ?? "")}
            className="mt-4 w-full min-h-11 py-2.5 rounded-2xl bg-slate-800 border-b-4 border-slate-950 font-black text-sm flex items-center justify-center gap-2"
          >
            <Pencil size={16} /> غيّر اسمي
          </button>
        ) : (
          <form
            className="mt-4 flex gap-2"
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
              className="flex-1 min-w-0 p-3 bg-slate-950 border-2 border-slate-700 rounded-2xl font-black focus:border-red-500 outline-none"
            />
            <button
              type="submit"
              disabled={busy || newName.trim().length < 2}
              className="px-4 bg-red-600 disabled:opacity-40 rounded-2xl border-b-4 border-red-800 font-black"
            >
              حفظ
            </button>
            <button
              type="button"
              onClick={() => setNewName(null)}
              aria-label="إلغاء"
              className="w-11 bg-slate-800 rounded-2xl border-b-4 border-slate-950 flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </form>
        )}
      </Panel>

      {isHost ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => host.start()}
            disabled={!full || busy}
            className="w-full py-5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xl rounded-2xl border-b-4 border-red-800 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="animate-spin" size={24} /> : <Play size={24} className="fill-current" />}
            {full ? "ابدأ اللعبة 🔥" : `باقي ${max - players.length} لاعبين`}
          </button>

          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="w-full py-3 bg-slate-800 rounded-2xl border-b-4 border-slate-950 font-black flex items-center justify-center gap-2"
          >
            <Settings2 size={18} /> {editing ? "إخفاء الإعدادات" : "تعديل العدد والفئات"}
          </button>

          {editing && (
            <Panel>
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
            </Panel>
          )}

          {devMode && !full && (
            <button
              type="button"
              onClick={() => host.addBots()}
              disabled={busy}
              className="w-full py-3 bg-indigo-900/60 border-2 border-dashed border-indigo-500 rounded-2xl font-black text-indigo-200 flex items-center justify-center gap-2"
            >
              <Bot size={18} /> 🧪 عبّي الغرفة بلاعبين وهميين (localhost فقط)
            </button>
          )}
        </div>
      ) : (
        <Panel className="text-center">
          <p className="text-4xl mb-2 animate-bounce">⏳</p>
          <p className="font-black text-lg">بانتظار المنشئ يبدأ اللعبة...</p>
          <p className="font-bold text-sm text-slate-400 mt-1">خل جوالك قريب منك وبعيد عن عيون الباقين 👀</p>
        </Panel>
      )}
    </div>
  );
}
