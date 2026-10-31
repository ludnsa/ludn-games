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
import { BTN_GOLD, H_CARD, H_PROMPT, INFO, INSET, LABEL, NOTE } from "./mafiaUi";

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
      <Sunrise size={40} strokeWidth={1.6} className="mx-auto text-ludn-gold animate-in zoom-in-50 duration-500" />
      {/* سطر واحد بكل المقاسات: الخط يصغر مع عرض الشاشة */}
      <h2 className="font-display text-center whitespace-nowrap text-[clamp(1.1rem,5.8vw,1.75rem)] leading-tight mb-1">
        صباح الخير! هذا اللي صار بالليل
      </h2>
      {announcements.map((a, i) => (
        <div
          key={i}
          className={`flex items-center gap-2.5 p-2.5 rounded-2xl border animate-in fade-in slide-in-from-bottom-4 ${
            a.kind === "kill" ? "bg-linear-to-l from-ludn-surface/95 to-rose-900/40 border-rose-500/45" : "bg-ludn-surface/95 border-ludn-line"
          }`}
          style={{ animationDelay: `${schedule[i]}ms`, animationDuration: "600ms", animationFillMode: "both" }}
        >
          <AnnouncementIcon kind={a.kind} className="w-10 h-10" />
          <p className="text-[15px] font-black leading-snug">{a.text}</p>
        </div>
      ))}
      {/* تحت النتائج: النتائج تظل بدون وقت، لين المنشئ يختار وقت النقاش ويبدأه */}
      {ctx.isHost ? (
        <Panel className="grid gap-2.5">
          <p className="text-[15px] font-black flex items-center gap-2">
            <Timer size={18} className="text-ludn-gold-text" /> وقت النقاش
          </p>
          <DiscussionTimePicker value={discussion} onChange={setDiscussion} disabled={ctx.busy} />
          <button
            type="button"
            onClick={() => ctx.host.startDiscussion(discussion)}
            disabled={ctx.busy}
            className={BTN_GOLD}
          >
            {ctx.busy ? <Loader2 className="animate-spin" size={20} /> : <MessagesSquare size={20} />}
            ابدأ النقاش
          </button>
        </Panel>
      ) : (
        <p className={INFO}>
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
    <Panel className="border-ludn-gold/40">
      <p className="text-[15px] font-black mb-1 flex items-center gap-2">
        <RoleIcon role="sheikh" className="w-10 h-10" /> أنت الشيخ: كيف يكون نقاش اليوم؟
      </p>
      <p className="text-xs font-bold text-ludn-muted mb-3">تقدر تغيّر لين يبدأ النقاش — وإذا ما اخترت يكون عشوائي</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map(({ led: value, title, hint, Icon }) => {
          const on = led === value;
          return (
            <button
              key={title}
              type="button"
              aria-pressed={on}
              onClick={() => ctx.chooseSheikh(value)}
              className={`p-3 rounded-2xl border text-right transition-colors ${
                on
                  ? "bg-ludn-gold/15 border-ludn-gold text-ludn-fg"
                  : "bg-ludn-surface-2 border-ludn-line text-ludn-muted hover:border-white/20"
              }`}
            >
              <span className="flex items-center justify-between mb-1.5">
                <Icon size={24} />
                {on && <Check size={20} className="text-ludn-gold" />}
              </span>
              <span className="text-[15px] font-black block">{title}</span>
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
      <p className={`${INFO} flex items-center justify-center gap-2 p-2`}>
        <RoleIcon role="sheikh" className="w-9 h-9" /> نقاش عشوائي: الكل يتكلم
      </p>
    );
  }
  return (
    <Panel className="border-ludn-gold/60 flex items-center gap-4 animate-in zoom-in-95 duration-500">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mafiaCardSrc("sheikh")} alt="الشيخ" draggable={false} className="w-24 sm:w-28 shrink-0 rounded-xl" />
      <div className="min-w-0">
        <p className="text-[13px] font-black text-ludn-gold-text flex items-center gap-1.5">
          <Hand size={16} /> نقاش منظم
        </p>
        <p className={`${H_CARD} break-words`}>الشيخ {ctx.nameOf(rule.targetId)}</p>
        <p className={`${LABEL} mt-1 leading-snug`}>
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
          <MessagesSquare size={28} strokeWidth={1.8} className="shrink-0 text-ludn-gold" />
          <h2 className={`flex-1 min-w-0 ${H_CARD}`}>وقت النقاش</h2>
          {secondsLeft !== null ? (
            <p className="font-display text-[36px] leading-none tabular-nums" dir="ltr">
              {`${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`}
            </p>
          ) : (
            <InfinityIcon size={34} className="shrink-0 text-ludn-gold" aria-label="نقاش مفتوح" />
          )}
        </div>
        <p className={`${LABEL} mt-1.5`}>
          {secondsLeft !== null
            ? "تناقشوا مين تشكّون فيه… بعدها التصويت"
            : "نقاش مفتوح — التصويت يبدأ لما يضغط المنشئ"}
        </p>
      </Panel>

      {sheikhRule && <SheikhRule ctx={ctx} rule={sheikhRule} />}

      {/* نتائج الليل تظل قدامهم طول النقاش عشان يحللون */}
      {results.length > 0 && (
        <Panel>
          <h3 className="text-[15px] font-black mb-2 flex items-center gap-2">
            <Sunrise size={18} className="text-ludn-gold-text" /> نتائج الليلة {room?.night_number}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {results.map((a, i) => (
              <li key={i} className={`${INSET} flex items-center gap-2.5 p-2.5`}>
                <AnnouncementIcon kind={a.kind} className="w-9 h-9" />
                <span className="text-[13px] font-bold leading-snug">{a.text}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel>
        <h3 className="text-[15px] font-black mb-2 flex items-center gap-2">
          <HeartPulse size={18} className="text-ludn-green" /> الأحياء ({alivePlayers.length})
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {alivePlayers.map((p) => (
            <span key={p.id} className="px-2.5 py-1 rounded-xl bg-ludn-surface-2 border border-ludn-line font-black text-[13px]">
              {p.display_name}
            </span>
          ))}
        </div>
        {dead.length > 0 && (
          <>
            <h3 className="text-[15px] font-black mt-3 mb-2 text-ludn-muted flex items-center gap-2">
              <Ghost size={18} /> برا اللعبة ({dead.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {dead.map((p) => (
                <span key={p.id} className="px-2.5 py-1 rounded-xl border border-dashed border-ludn-line text-ludn-muted font-black text-[13px] line-through">
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
          className={BTN_GOLD}
        >
          <FastForward size={20} /> {secondsLeft === null ? "ابدأ التصويت" : "إنهاء النقاش والتصويت الحين"}
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
      <h2 className={`${H_PROMPT} mb-1 flex items-center justify-center gap-2`}>
        <Vote size={24} className="text-ludn-gold" /> التصويت
      </h2>
      <p className={`${NOTE} text-[13px] mb-3`}>
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
        className={`w-full mt-2.5 min-h-11 py-2 px-3 rounded-[14px] text-[15px] font-black border transition-colors flex flex-wrap items-center justify-center gap-x-3 gap-y-2 ${
          myVote === MAFIA_SKIP_KEY
            ? "bg-ludn-fg text-ludn-bg border-ludn-fg"
            : "bg-ludn-surface-2 border-ludn-line text-ludn-muted"
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
      <Icon size={72} strokeWidth={1.4} className="mb-4 text-ludn-fg/90 animate-in zoom-in-50 duration-500" />
      <p className="font-display text-[30px] leading-tight animate-in fade-in slide-in-from-bottom-4 duration-700">{text}</p>
      {result.reason === "player" && !result.bombId && !result.bombBlocked && (
        <p className={`${LABEL} mt-2`}>وش كانت فئته؟ ما راح نقول</p>
      )}
      {(result.bombId || result.bombBlocked) && (
        <p
          className="mt-4 p-3.5 rounded-[22px] bg-orange-950/70 border border-orange-600/70 text-xl font-black leading-snug animate-in zoom-in-95 duration-500 flex items-center gap-3 text-right"
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
      <h3 className="text-[15px] font-black mb-2 flex items-center gap-2">
        <ListChecks size={18} className="text-ludn-gold-text" /> مين صوّت على مين؟
      </h3>
      <ul className="flex flex-col gap-1.5">
        {rows.map(([key, n]) => (
          <li key={key} className={`${INSET} p-2.5`}>
            <span className="flex items-center gap-2 mb-1.5">
              <span className="flex-1 text-[15px] font-black">
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
