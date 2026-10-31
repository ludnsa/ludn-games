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
  Hand,
  Check,
  type LucideIcon,
} from "lucide-react";
import { MAFIA_SKIP_KEY, blastText } from "@/lib/game/mafia-engine";
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
import { MAFIA_CONFIG, mafiaCardSrc } from "@/constants/mafia";
import type { MafiaAnnouncement, MafiaRoom } from "@/types";

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
      {ctx.me?.role === "sheikh" && ctx.me.alive && <SheikhPicker ctx={ctx} />}
      <Sunrise size={44} strokeWidth={1.6} className="mx-auto text-amber-300 animate-in zoom-in-50 duration-500" />
      {/* سطر واحد بكل المقاسات: الخط يصغر مع عرض الشاشة */}
      <h2 className="text-center whitespace-nowrap text-[clamp(1rem,5.5vw,1.75rem)] font-black mb-1">
        صباح الخير! هذا اللي صار بالليل
      </h2>
      {announcements.map((a, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/90 border-2 border-slate-800 animate-in fade-in slide-in-from-bottom-4"
          style={{ animationDelay: `${schedule[i]}ms`, animationDuration: "600ms", animationFillMode: "both" }}
        >
          <AnnouncementIcon kind={a.kind} className="w-11 h-11" />
          <p className="font-black text-base leading-snug">{a.text}</p>
        </div>
      ))}
      {/* تحت النتائج: النتائج تظل بدون وقت، لين المنشئ يختار وقت النقاش ويبدأه */}
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
    </div>
  );
}

/** الشيخ: يختار نوع نقاش اليوم قبل ما يبدأ — يطلع له بس */
function SheikhPicker({ ctx }: { ctx: MafiaGameCtx }) {
  const led = ctx.view?.sheikhLed ?? null;
  const options: { led: boolean; title: string; hint: string; Icon: LucideIcon }[] = [
    { led: false, title: "نقاش عشوائي", hint: "الكل يتكلم", Icon: MessagesSquare },
    { led: true, title: "نقاش منظم", hint: "الكل ساكت، وأنت تسأل وتعطي الإذن — واسمك يطلع للكل", Icon: Hand },
  ];
  return (
    <Panel className="border-amber-600">
      <p className="font-black text-lg mb-1 flex items-center gap-2">
        <RoleIcon role="sheikh" className="w-10 h-10" /> أنت الشيخ: كيف يكون نقاش اليوم؟
      </p>
      <p className="text-xs font-bold text-slate-400 mb-3">تقدر تغيّر لين يبدأ النقاش — وإذا ما اخترت يكون عشوائي</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map(({ led: value, title, hint, Icon }) => {
          const on = led === value;
          return (
            <button
              key={title}
              type="button"
              aria-pressed={on}
              onClick={() => ctx.chooseSheikh(value)}
              className={`p-3 rounded-2xl border-2 border-b-4 text-right transition-all ${
                on
                  ? "bg-amber-500/20 border-amber-400 text-white"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600"
              }`}
            >
              <span className="flex items-center justify-between mb-1.5">
                <Icon size={24} />
                {on && <Check size={20} className="text-amber-300" />}
              </span>
              <span className="font-black block">{title}</span>
              <span className="text-[11px] font-bold opacity-75 leading-snug block">{hint}</span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

/** نوع النقاش اللي اختاره الشيخ — منظم: بطاقته واسمه للكل */
function SheikhRule({ ctx, rule }: { ctx: MafiaGameCtx; rule: MafiaAnnouncement }) {
  if (rule.kind === "sheikh_open") {
    return (
      <p className="flex items-center justify-center gap-2 text-center font-black text-amber-100 bg-amber-950/50 border border-amber-800 rounded-2xl p-2.5">
        <RoleIcon role="sheikh" className="w-9 h-9" /> نقاش عشوائي: الكل يتكلم
      </p>
    );
  }
  return (
    <Panel className="border-amber-500 flex items-center gap-4 animate-in zoom-in-95 duration-500">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mafiaCardSrc("sheikh")} alt="الشيخ" draggable={false} className="w-24 sm:w-28 shrink-0 rounded-xl" />
      <div className="min-w-0">
        <p className="text-sm font-black text-amber-300 flex items-center gap-1.5">
          <Hand size={16} /> نقاش منظم
        </p>
        <p className="text-2xl font-black leading-tight break-words">الشيخ {ctx.nameOf(rule.targetId)}</p>
        <p className="text-sm font-bold text-slate-300 mt-1 leading-snug">
          يدير النقاش: الكل ساكت، وهو يسأل ويعطي الإذن بالكلام
        </p>
      </div>
    </Panel>
  );
}

const isSheikhRule = (a: MafiaAnnouncement) => a.kind === "sheikh_open" || a.kind === "sheikh_led";

export function MafiaDiscussion({ ctx }: { ctx: MafiaGameCtx }) {
  const { alivePlayers, players, isHost, host, busy, secondsLeft, room } = ctx;
  const dead = players.filter((p) => !p.is_alive);
  const all = room?.announcements ?? [];
  const sheikhRule = all.find(isSheikhRule);
  const results = all.filter((a) => !isSheikhRule(a));
  return (
    <div className="flex flex-col gap-3">
      {/* العنوان والعداد بسطر واحد بدل مربع كبير */}
      <Panel>
        <div className="flex items-center gap-3">
          <MessagesSquare size={30} strokeWidth={1.6} className="shrink-0 text-amber-300" />
          <h2 className="flex-1 min-w-0 text-2xl font-black">وقت النقاش</h2>
          {secondsLeft !== null ? (
            <p className="text-4xl font-black tabular-nums" dir="ltr">
              {`${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`}
            </p>
          ) : (
            <InfinityIcon size={34} className="shrink-0 text-amber-300" aria-label="نقاش مفتوح" />
          )}
        </div>
        <p className="mt-1 text-sm font-bold text-slate-400">
          {secondsLeft !== null
            ? "تناقشوا مين تشكّون فيه… بعدها التصويت"
            : "نقاش مفتوح — التصويت يبدأ لما يضغط المنشئ"}
        </p>
      </Panel>

      {sheikhRule && <SheikhRule ctx={ctx} rule={sheikhRule} />}

      {/* نتائج الليل تظل قدامهم طول النقاش عشان يحللون */}
      {results.length > 0 && (
        <Panel>
          <h3 className="font-black mb-2 flex items-center gap-2">
            <Sunrise size={18} /> نتائج الليلة {room?.night_number}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {results.map((a, i) => (
              <li key={i} className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-slate-800">
                <AnnouncementIcon kind={a.kind} className="w-9 h-9" />
                <span className="font-bold text-sm leading-snug">{a.text}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel>
        <h3 className="font-black mb-2 flex items-center gap-2">
          <HeartPulse size={18} className="text-emerald-400" /> الأحياء ({alivePlayers.length})
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {alivePlayers.map((p) => (
            <span key={p.id} className="px-2.5 py-1 rounded-xl bg-slate-800 font-black text-sm">
              {p.display_name}
            </span>
          ))}
        </div>
        {dead.length > 0 && (
          <>
            <h3 className="font-black mt-3 mb-2 text-slate-500 flex items-center gap-2">
              <Ghost size={18} /> برا اللعبة ({dead.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {dead.map((p) => (
                <span key={p.id} className="px-2.5 py-1 rounded-xl bg-slate-900 text-slate-500 font-black text-sm line-through">
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
      <h2 className="text-2xl font-black text-center mb-1 flex items-center justify-center gap-2">
        <Vote size={24} /> التصويت
      </h2>
      <p className="text-center text-sm font-bold text-slate-400 mb-3">
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
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Icon size={72} strokeWidth={1.4} className="mb-4 text-slate-200 animate-in zoom-in-50 duration-500" />
      <p className="text-2xl font-black animate-in fade-in slide-in-from-bottom-4 duration-700">{text}</p>
      {result.reason === "player" && !result.bombId && !result.bombBlocked && (
        <p className="mt-3 font-bold text-slate-400">وش كانت فئته؟ ما راح نقول</p>
      )}
      {(result.bombId || result.bombBlocked) && (
        <p
          className="mt-5 p-4 rounded-2xl bg-orange-950/70 border-2 border-orange-700 text-2xl font-black animate-in zoom-in-95 duration-500 flex items-center gap-3 text-right"
          style={{ animationDelay: "1800ms", animationFillMode: "both" }}
        >
          <RoleIcon role="suicide" className="w-14 h-14" />
          <span>
            طلع المنتقم!{" "}
            {result.bombBlocked
              ? blastText(ctx.nameOf(result.bombBlocked.targetId), result.bombBlocked.fate)
              : blastText(ctx.nameOf(result.bombId), "killed")}
          </span>
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
    <Panel className="mt-4 text-right animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h3 className="font-black mb-2 flex items-center gap-2">
        <ListChecks size={18} /> مين صوّت على مين؟
      </h3>
      <ul className="flex flex-col gap-1.5">
        {rows.map(([key, n]) => (
          <li key={key} className="p-2.5 rounded-2xl bg-slate-800">
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
