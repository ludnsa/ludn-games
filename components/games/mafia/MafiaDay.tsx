"use client";

import React, { useState } from "react";
import {
  FastForward,
  Loader2,
  MessagesSquare,
  Timer,
  Hourglass,
  Sunrise,
  Infinity as InfinityIcon,
  HeartPulse,
  Ghost,
  Vote,
  SkipForward,
  Gavel,
  Scale,
  CircleSlash,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { MAFIA_SKIP_KEY } from "@/lib/game/mafia-engine";
import { mafiaMorningSchedule, type MafiaGameCtx } from "@/hooks/games/mafia/useMafiaGame";
import {
  AnnouncementIcon,
  DiscussionTimePicker,
  Panel,
  PlayerPicker,
  RoleIcon,
  VoteCount,
  VoterNames,
} from "./MafiaParts";
import { MAFIA_CONFIG } from "@/constants/mafia";
import type { MafiaRoom } from "@/types";

/** أسماء اللي صوّتوا على هدف معيّن (لاعب أو "skip") */
function votersOf(room: MafiaRoom, key: string, nameOf: (id: string) => string): string[] {
  return (room.vote_voters?.[key] ?? []).map(nameOf).filter(Boolean);
}

export function MafiaMorning({ ctx }: { ctx: MafiaGameCtx }) {
  const announcements = ctx.room?.announcements ?? [];
  const schedule = mafiaMorningSchedule(announcements);
  // الاختيار محلي (فوري)، وينحفظ مع ضغطة "ابدأ النقاش"
  const [discussion, setDiscussion] = useState(
    () => ctx.room?.settings.discussionSeconds ?? MAFIA_CONFIG.DISCUSSION_SECONDS
  );
  return (
    <div className="flex flex-col gap-3">
      {/* النتائج تظل بدون وقت، لين المنشئ يختار وقت النقاش ويبدأه */}
      {ctx.isHost ? (
        <Panel className="border-amber-700">
          <p className="font-black mb-2 flex items-center gap-2">
            <Timer size={18} /> وقت النقاش
          </p>
          <DiscussionTimePicker value={discussion} onChange={setDiscussion} disabled={ctx.busy} />
          <button
            type="button"
            onClick={() => ctx.host.startDiscussion(discussion)}
            disabled={ctx.busy}
            className="w-full mt-3 py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-lg rounded-2xl border-b-4 border-amber-700 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
          >
            {ctx.busy ? <Loader2 className="animate-spin" size={22} /> : <MessagesSquare size={22} />}
            ابدأ النقاش
          </button>
        </Panel>
      ) : (
        <p className="text-center text-sm font-bold text-amber-200 bg-amber-950/50 border border-amber-900 rounded-2xl p-3">
          <Hourglass size={16} className="inline -mt-1 me-1" />
          اقروا النتائج… النقاش يبدأ لما يضغط المنشئ
        </p>
      )}
      <Sunrise size={64} strokeWidth={1.6} className="mx-auto mb-1 text-amber-300 animate-in zoom-in-50 duration-500" />
      <h2 className="text-center text-3xl font-black mb-2">صباح الخير! هذا اللي صار بالليل</h2>
      {announcements.map((a, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/90 border-2 border-slate-800 animate-in fade-in slide-in-from-bottom-4"
          style={{ animationDelay: `${schedule[i]}ms`, animationDuration: "600ms", animationFillMode: "both" }}
        >
          <AnnouncementIcon kind={a.kind} className="w-14 h-14" />
          <p className="font-black text-lg leading-snug">{a.text}</p>
        </div>
      ))}
    </div>
  );
}

export function MafiaDiscussion({ ctx }: { ctx: MafiaGameCtx }) {
  const { alivePlayers, players, isHost, host, busy, secondsLeft, room } = ctx;
  const dead = players.filter((p) => !p.is_alive);
  const results = room?.announcements ?? [];
  return (
    <div className="flex flex-col gap-4">
      <Panel className="text-center">
        <MessagesSquare size={56} strokeWidth={1.6} className="mx-auto mb-2 text-amber-300" />
        <h2 className="text-3xl font-black mb-1">وقت النقاش</h2>
        <p className="font-bold text-slate-400">تناقشوا مين تشكّون فيه… بعدها التصويت</p>
        {secondsLeft !== null ? (
          <p className="text-6xl font-black tabular-nums mt-4" dir="ltr">
            {`${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`}
          </p>
        ) : (
          <p className="text-3xl font-black mt-4 text-amber-300">
            <InfinityIcon size={30} className="inline -mt-1 me-2" />
            نقاش مفتوح
            <span className="block text-sm font-bold text-slate-400 mt-1">التصويت يبدأ لما يضغط المنشئ</span>
          </p>
        )}
      </Panel>

      {/* نتائج الليل تظل قدامهم طول النقاش عشان يحللون */}
      {results.length > 0 && (
        <Panel>
          <h3 className="font-black mb-3 flex items-center gap-2">
            <Sunrise size={18} /> نتائج الليلة {room?.night_number}
          </h3>
          <ul className="flex flex-col gap-2">
            {results.map((a, i) => (
              <li key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800">
                <AnnouncementIcon kind={a.kind} className="w-10 h-10" />
                <span className="font-bold leading-snug">{a.text}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel>
        <h3 className="font-black mb-3 flex items-center gap-2">
          <HeartPulse size={18} className="text-emerald-400" /> الأحياء ({alivePlayers.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {alivePlayers.map((p) => (
            <span key={p.id} className="px-3 py-1.5 rounded-xl bg-slate-800 font-black">
              {p.display_name}
            </span>
          ))}
        </div>
        {dead.length > 0 && (
          <>
            <h3 className="font-black mt-4 mb-3 text-slate-500 flex items-center gap-2">
              <Ghost size={18} /> برا اللعبة ({dead.length})
            </h3>
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
          <FastForward size={22} /> {secondsLeft === null ? "ابدأ التصويت" : "إنهاء النقاش والتصويت الحين"}
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
      <h2 className="text-3xl font-black text-center mb-1 flex items-center justify-center gap-2">
        <Vote size={30} /> التصويت
      </h2>
      <p className="text-center font-bold text-slate-400 mb-4">
        {canVote ? "مين تطلّعون؟ التصويت مكشوف، وتقدر تغيّر صوتك لين ينتهي الوقت" : "الموتى يتفرجون بس"}
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
        <span className="flex items-center gap-1.5">
          <SkipForward size={18} /> تخطي
        </span>
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

  let Icon: LucideIcon = CircleSlash;
  let text = "محد صوّت… ولا أحد طلع";
  if (result.reason === "player") {
    Icon = Gavel;
    text = `${ctx.nameOf(result.eliminatedId)} طلع بالتصويت!`;
  } else if (result.reason === "skip") {
    Icon = SkipForward;
    text = "الأغلبية اختارت تخطي… محد طلع";
  } else if (result.reason === "tie") {
    Icon = Scale;
    text = "تعادل في الأصوات… محد طلع";
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={112} strokeWidth={1.4} className="mb-6 text-slate-200 animate-in zoom-in-50 duration-500" />
      <p className="text-3xl font-black animate-in fade-in slide-in-from-bottom-4 duration-700">{text}</p>
      {result.reason === "player" && !result.bombId && (
        <p className="mt-3 font-bold text-slate-400">وش كانت فئته؟ ما راح نقول</p>
      )}
      {result.bombId && (
        <p
          className="mt-5 p-4 rounded-2xl bg-orange-950/70 border-2 border-orange-700 text-2xl font-black animate-in zoom-in-95 duration-500 flex items-center gap-3 text-right"
          style={{ animationDelay: "1800ms", animationFillMode: "both" }}
        >
          <RoleIcon role="suicide" className="w-14 h-14" />
          <span>طلع المنتقم! فجّر نفسه وأخذ معه {ctx.nameOf(result.bombId)}</span>
        </p>
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
      <h3 className="font-black mb-3 flex items-center gap-2">
        <ListChecks size={18} /> مين صوّت على مين؟
      </h3>
      <ul className="flex flex-col gap-2">
        {rows.map(([key, n]) => (
          <li key={key} className="p-3 rounded-2xl bg-slate-800">
            <span className="flex items-center gap-2 mb-1.5">
              <span className="flex-1 font-black">
                {key === MAFIA_SKIP_KEY ? (
                  <span className="flex items-center gap-1.5">
                    <SkipForward size={16} /> تخطي
                  </span>
                ) : (
                  ctx.nameOf(key)
                )}
              </span>
              <VoteCount count={n} />
            </span>
            <VoterNames names={votersOf(room, key, ctx.nameOf)} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}
