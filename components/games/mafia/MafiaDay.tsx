"use client";

import React from "react";
import { FastForward } from "lucide-react";
import { MAFIA_SKIP_KEY } from "@/lib/game/mafia-engine";
import { mafiaMorningSchedule, type MafiaGameCtx } from "@/hooks/games/mafia/useMafiaGame";
import { Panel, PlayerPicker, VoteCount, VoterNames } from "./MafiaParts";
import type { MafiaRoom } from "@/types";

/** أسماء اللي صوّتوا على هدف معيّن (لاعب أو "skip") */
function votersOf(room: MafiaRoom, key: string, nameOf: (id: string) => string): string[] {
  return (room.vote_voters?.[key] ?? []).map(nameOf).filter(Boolean);
}

export function MafiaMorning({ ctx }: { ctx: MafiaGameCtx }) {
  const announcements = ctx.room?.announcements ?? [];
  const schedule = mafiaMorningSchedule(announcements);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-6xl mb-1 animate-in zoom-in-50 duration-500">🌅</p>
      <h2 className="text-center text-3xl font-black mb-2">صباح الخير! هذا اللي صار بالليل</h2>
      {announcements.map((a, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900 border-2 border-slate-800 animate-in fade-in slide-in-from-bottom-4"
          style={{ animationDelay: `${schedule[i]}ms`, animationDuration: "600ms", animationFillMode: "both" }}
        >
          <span className="text-4xl shrink-0">{a.emoji}</span>
          <p className="font-black text-lg leading-snug">{a.text}</p>
        </div>
      ))}
    </div>
  );
}

export function MafiaDiscussion({ ctx }: { ctx: MafiaGameCtx }) {
  const { alivePlayers, players, isHost, host, busy, secondsLeft } = ctx;
  const dead = players.filter((p) => !p.is_alive);
  return (
    <div className="flex flex-col gap-4">
      <Panel className="text-center">
        <p className="text-6xl mb-2">🗣️</p>
        <h2 className="text-3xl font-black mb-1">وقت النقاش</h2>
        <p className="font-bold text-slate-400">تناقشوا مين تشكّون فيه… بعدها التصويت</p>
        <p className="text-6xl font-black tabular-nums mt-4" dir="ltr">
          {secondsLeft !== null
            ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
            : "--"}
        </p>
      </Panel>

      <Panel>
        <h3 className="font-black mb-3">🟢 الأحياء ({alivePlayers.length})</h3>
        <div className="flex flex-wrap gap-2">
          {alivePlayers.map((p) => (
            <span key={p.id} className="px-3 py-1.5 rounded-xl bg-slate-800 font-black">
              {p.display_name}
            </span>
          ))}
        </div>
        {dead.length > 0 && (
          <>
            <h3 className="font-black mt-4 mb-3 text-slate-500">☠️ برا اللعبة ({dead.length})</h3>
            <div className="flex flex-wrap gap-2">
              {dead.map((p) => (
                <span key={p.id} className="px-3 py-1.5 rounded-xl bg-slate-900 text-slate-500 font-black line-through">
                  {p.display_name}
                </span>
              ))}
            </div>
          </>
        )}
      </Panel>

      {isHost && (
        <button
          type="button"
          onClick={() => host.skipPhase()}
          disabled={busy}
          className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-lg rounded-2xl border-b-4 border-amber-700 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
        >
          <FastForward size={22} /> إنهاء النقاش والتصويت الحين
        </button>
      )}
    </div>
  );
}

export function MafiaVoting({ ctx }: { ctx: MafiaGameCtx }) {
  const { room, alivePlayers, me, view, vote } = ctx;
  if (!room) return null;
  const counts = room.vote_counts ?? {};
  const canVote = Boolean(me?.alive);
  const myVote = view?.myVote ?? null;
  const options = alivePlayers.filter((p) => p.id !== me?.id).map((p) => ({ id: p.id, name: p.display_name }));

  return (
    <Panel>
      <h2 className="text-3xl font-black text-center mb-1">🗳️ التصويت</h2>
      <p className="text-center font-bold text-slate-400 mb-4">
        {canVote ? "مين تطلّعون؟ التصويت مكشوف 👀 وتقدر تغيّر صوتك لين ينتهي الوقت" : "الموتى يتفرجون بس 👻"}
      </p>

      <PlayerPicker
        options={options}
        selectedId={myVote && myVote !== MAFIA_SKIP_KEY ? myVote : null}
        disabled={!canVote}
        onPick={(id) => vote(id)}
        badge={(id) => counts[id]}
        voters={(id) => votersOf(room, id, ctx.nameOf)}
        accent="amber"
      />

      <button
        type="button"
        disabled={!canVote}
        onClick={() => vote(null)}
        aria-pressed={myVote === MAFIA_SKIP_KEY}
        className={`w-full mt-3 py-3.5 px-3 rounded-2xl font-black border-b-4 transition-all flex flex-wrap items-center justify-center gap-x-3 gap-y-2 ${
          myVote === MAFIA_SKIP_KEY
            ? "bg-slate-200 text-slate-950 border-slate-400"
            : "bg-slate-800 border-slate-950 text-slate-300"
        } disabled:opacity-50`}
      >
        ⏭️ تخطي
        {(counts[MAFIA_SKIP_KEY] ?? 0) > 0 && <VoteCount count={counts[MAFIA_SKIP_KEY]} />}
        {votersOf(room, MAFIA_SKIP_KEY, ctx.nameOf).length > 0 && (
          <VoterNames names={votersOf(room, MAFIA_SKIP_KEY, ctx.nameOf)} className="w-full justify-center" />
        )}
      </button>
    </Panel>
  );
}

export function MafiaVoteResult({ ctx }: { ctx: MafiaGameCtx }) {
  const result = ctx.room?.vote_result;
  if (!result) return null;

  let emoji = "🤷";
  let text = "محد صوّت… ولا أحد طلع";
  if (result.reason === "player") {
    emoji = "⚖️";
    text = `${ctx.nameOf(result.eliminatedId)} طلع بالتصويت!`;
  } else if (result.reason === "skip") {
    emoji = "⏭️";
    text = "الأغلبية اختارت تخطي… محد طلع";
  } else if (result.reason === "tie") {
    emoji = "🤝";
    text = "تعادل في الأصوات… محد طلع";
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-9xl mb-6 animate-in zoom-in-50 duration-500">{emoji}</p>
      <p className="text-3xl font-black animate-in fade-in slide-in-from-bottom-4 duration-700">{text}</p>
      {result.reason === "player" && (
        <p className="mt-3 font-bold text-slate-400">وش كانت فئته؟ ما راح نقول 🤐</p>
      )}
      {ctx.room && <VoteBreakdown ctx={ctx} room={ctx.room} />}
    </div>
  );
}

/** ملخص التصويت: مين صوّت على مين — عشان المواطنين يحللون قبل الليلة الجاية */
function VoteBreakdown({ ctx, room }: { ctx: MafiaGameCtx; room: MafiaRoom }) {
  const rows = Object.entries(room.vote_counts ?? {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) return null;

  return (
    <Panel className="mt-6 text-right animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h3 className="font-black mb-3">🕵️ مين صوّت على مين؟</h3>
      <ul className="flex flex-col gap-2">
        {rows.map(([key, n]) => (
          <li key={key} className="p-3 rounded-2xl bg-slate-800">
            <span className="flex items-center gap-2 mb-1.5">
              <span className="flex-1 font-black">{key === MAFIA_SKIP_KEY ? "⏭️ تخطي" : ctx.nameOf(key)}</span>
              <VoteCount count={n} />
            </span>
            <VoterNames names={votersOf(room, key, ctx.nameOf)} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}
