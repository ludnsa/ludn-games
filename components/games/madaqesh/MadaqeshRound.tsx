"use client";

import React, { useMemo, useState } from "react";
import { Loader2, Check, Hand, Flag, Swords, Scale, Lock, Equal, Eraser, SkipForward, Play } from "lucide-react";
import { MADAQESH_CONFIG, formatMoney } from "@/constants/madaqesh";
import {
  canAllIn,
  contestants,
  currentBidderId,
  currentHighBid,
  equalShares,
  pickDecider,
  respondersFor,
  responseOf,
  settleRound,
  stakedOpponents,
  stakeOf,
  sumShares,
} from "@/lib/game/madaqesh-engine";
import type { MadaqeshGameCtx } from "@/hooks/games/madaqesh/useMadaqeshGame";
import type { MadaqeshDecision, MadaqeshDecisionMode, MadaqeshResponse, MadaqeshRound } from "@/types/madaqesh";
import { btn, Delta, Money, MoneyInput, Panel } from "./MadaqeshParts";

const MODE_LABEL: Record<MadaqeshDecisionMode, string> = {
  distribute: "توزيع",
  withdraw: "فرصة انسحاب",
  all_fixed: "الجميع ثابت",
};

const RESPONSE_LABEL: Record<MadaqeshResponse, string> = {
  accept: "✅ راضي",
  object: "✋ اعترض",
  withdraw: "🏳️ انسحب",
  stay: "⚔️ يداقش",
};

// ---------------------------------------------------------------------
// السوم
// ---------------------------------------------------------------------

export function MadaqeshBidding({ ctx }: { ctx: MadaqeshGameCtx }) {
  const { room, me, nameOf, isHost, busy, host } = ctx;
  const round = room?.round;
  const [amount, setAmount] = useState(0);
  if (!room || !round || !me) return null;

  const bidderId = currentBidderId(round);
  const myTurn = bidderId === me.id;
  const high = currentHighBid(round);
  const leader = pickDecider(round);
  const allIn = canAllIn(round, me.balance);
  const valid = amount > high && amount <= me.balance;

  const submit = async (kind: "bid" | "allin" | "pass") => {
    const res = await ctx.bid(kind, kind === "bid" ? amount : 0);
    if (res?.success) setAmount(0);
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel className="text-center">
        <p className="font-bold text-slate-400 text-sm">أعلى سومة</p>
        <p className="text-5xl font-black text-amber-400 my-1">
          <Money value={high} />
        </p>
        <p className="font-bold text-slate-300 min-h-6">{leader ? `👑 ${nameOf(leader)}` : "محد سام للحين"}</p>

        {/* ترتيب السوم في هالجولة */}
        <ol className="flex flex-wrap justify-center gap-1.5 mt-4">
          {round.order.map((id, i) => {
            const b = round.bids[id];
            const now = id === bidderId;
            return (
              <li
                key={id}
                className={`px-2.5 py-1.5 rounded-xl text-sm font-black ${
                  now ? "bg-amber-500 text-slate-950 animate-pulse" : b ? "bg-slate-800" : "bg-slate-900 text-slate-500"
                }`}
              >
                <span className="opacity-60">{i + 1}.</span> {nameOf(id)}
                {b && (
                  <span className="block text-xs font-bold opacity-90" dir="ltr">
                    {b.kind === "pass" ? "انسحب" : b.kind === "allin" ? `كل فلوسه ${formatMoney(b.amount)}` : formatMoney(b.amount)}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </Panel>

      {myTurn ? (
        <Panel className="border-amber-600">
          <h2 className="text-2xl font-black text-center mb-1">🎯 دورك تسوم</h2>
          <p className="text-center text-sm font-bold text-slate-400 mb-4">
            رصيدك <Money value={me.balance} /> — {high > 0 ? "لازم تزيد على أعلى سومة" : "حدد سومتك على حسب ورقك"}
          </p>
          <MoneyInput value={amount} onChange={setAmount} base={high} disabled={busy} />
          {amount > 0 && amount > me.balance && <p className="mt-2 text-center text-sm font-bold text-red-400">أكثر من رصيدك</p>}
          {amount > 0 && amount <= high && <p className="mt-2 text-center text-sm font-bold text-red-400">لازم تزيد على {formatMoney(high)}</p>}

          <div className="flex flex-col gap-2 mt-4">
            <button type="button" disabled={!valid || busy} onClick={() => submit("bid")} className={btn.primary}>
              {busy ? <Loader2 className="animate-spin" size={22} /> : <Check size={22} />}
              {amount > 0 ? `أسوم ${formatMoney(amount)}` : "اكتب سومتك"}
            </button>
            {allIn && (
              <button type="button" disabled={busy} onClick={() => submit("allin")} className={btn.danger}>
                💰 أدخل بكل فلوسي ({formatMoney(me.balance)})
              </button>
            )}
            <button type="button" disabled={busy} onClick={() => submit("pass")} className={btn.ghost}>
              <Flag size={20} /> أنسحب
            </button>
          </div>
        </Panel>
      ) : (
        <Panel className="text-center">
          <p className="text-4xl mb-2">⏳</p>
          <p className="font-black text-xl">
            {bidderId ? `دور ${nameOf(bidderId)} يسوم…` : "لحظة…"}
          </p>
          {isHost && bidderId && (
            <button type="button" onClick={() => host.skipTurn()} disabled={busy} className={`${btn.ghost} mt-4`}>
              <SkipForward size={18} /> {nameOf(bidderId)} غايب؟ اعتبره انسحب
            </button>
          )}
        </Panel>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// قرار صاحب أعلى سومة
// ---------------------------------------------------------------------

export function MadaqeshDeciding({ ctx }: { ctx: MadaqeshGameCtx }) {
  const { room, me, nameOf, isHost } = ctx;
  const [actForDecider, setActForDecider] = useState(false);
  const round = room?.round;
  if (!room || !round || !me || !round.deciderId) return null;

  const mine = round.deciderId === me.id;
  const total = stakeOf(round, round.deciderId);

  if (mine || actForDecider) return <DecisionForm ctx={ctx} round={round} total={total} onBehalf={!mine} />;

  return (
    <Panel className="text-center">
      <p className="text-6xl mb-2">👑</p>
      <h2 className="text-2xl font-black">{nameOf(round.deciderId)} فاز بالسوم</h2>
      <p className="text-4xl font-black text-amber-400 my-2">
        <Money value={total} />
      </p>
      <p className="font-bold text-slate-400">يقرر الحين: يوزع، يثبّت، فرصة انسحاب، أو الجميع ثابت…</p>
      {isHost && (
        <button type="button" onClick={() => setActForDecider(true)} className={`${btn.ghost} mt-4`}>
          قرر بداله (لو غايب)
        </button>
      )}
    </Panel>
  );
}

function DecisionForm({
  ctx,
  round,
  total,
  onBehalf,
}: {
  ctx: MadaqeshGameCtx;
  round: MadaqeshRound;
  total: number;
  onBehalf: boolean;
}) {
  const { nameOf, busy } = ctx;
  const deciderId = round.deciderId!;
  // التوزيع والتثبيت بس على اللي سامو — اللي انسحب من السوم خلاص ما له شي
  const others = stakedOpponents(round);
  const passed = round.order.filter((id) => id !== deciderId && !others.includes(id));
  const staked = new Set(others);

  const [mode, setMode] = useState<MadaqeshDecisionMode>("distribute");
  const [shares, setShares] = useState<Record<string, number>>({});
  const [fixed, setFixed] = useState<string[]>([]);
  // "بالتساوي" يظل شغّال: لو ثبّت أحد بعدها، القسمة تنعاد على الباقين
  const [equal, setEqual] = useState(false);

  const receivers = others.filter((id) => !fixed.includes(id));
  const given = sumShares(Object.fromEntries(receivers.map((id) => [id, shares[id] ?? 0])));
  const left = total - given;

  const toggleFixed = (id: string) => {
    const next = fixed.includes(id) ? fixed.filter((x) => x !== id) : [...fixed, id];
    setFixed(next);
    if (equal) setShares(equalShares(total, others.filter((x) => !next.includes(x))));
  };

  const submit = () => {
    const decision: MadaqeshDecision =
      mode === "distribute"
        ? { mode, fixed, shares: Object.fromEntries(receivers.map((id) => [id, shares[id] ?? 0])) }
        : { mode, shares: {}, fixed: [] };
    ctx.decide(decision);
  };

  return (
    <Panel className="border-amber-600">
      <h2 className="text-2xl font-black text-center mb-1">👑 {onBehalf ? `تقرر بدال ${nameOf(deciderId)}` : "فزت بالسوم!"}</h2>
      <p className="text-center font-bold text-slate-400 mb-4">
        السومة <Money value={total} className="text-amber-400 font-black" /> — وش تسوي؟
      </p>

      <div className="grid grid-cols-3 gap-1.5 mb-4" role="radiogroup" aria-label="القرار">
        {(["distribute", "withdraw", "all_fixed"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-12 px-1 py-2 rounded-2xl font-black text-sm border-b-4 transition-all ${
              mode === m ? "bg-amber-500 border-amber-700 text-slate-950" : "bg-slate-800 border-slate-950"
            }`}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      {mode === "distribute" && (
        <>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                setEqual(true);
                setShares(equalShares(total, receivers));
              }}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 border-b-4 border-slate-950 font-black text-sm flex items-center justify-center gap-1.5"
            >
              <Equal size={16} /> بالتساوي
            </button>
            <button
              type="button"
              onClick={() => {
                setEqual(false);
                setShares({});
              }}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 border-b-4 border-slate-950 font-black text-sm flex items-center justify-center gap-1.5"
            >
              <Eraser size={16} /> تصفير
            </button>
          </div>

          <ul className="flex flex-col gap-2">
            {others.map((id) => {
              const isFixed = fixed.includes(id);
              return (
                <li key={id} className={`p-3 rounded-2xl ${isFixed ? "bg-red-950/60 border-2 border-red-800" : "bg-slate-800"}`}>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 min-w-0 font-black break-words leading-tight">
                      {nameOf(id)}
                      <span className="block text-xs font-bold text-slate-400">
                        {round.bids[id]?.kind === "allin" ? (
                          <span className="text-red-300">💰 دخل بكل فلوسه <Money value={stakeOf(round, id)} /></span>
                        ) : staked.has(id) ? (
                          <>سومته <Money value={stakeOf(round, id)} /></>
                        ) : (
                          "🏳️ انسحب من السوم"
                        )}
                      </span>
                    </span>
                    {staked.has(id) && (
                      <button
                        type="button"
                        onClick={() => toggleFixed(id)}
                        aria-pressed={isFixed}
                        className={`shrink-0 px-3 py-2 rounded-xl font-black text-sm flex items-center gap-1 ${
                          isFixed ? "bg-red-600" : "bg-slate-900 text-slate-300"
                        }`}
                      >
                        <Lock size={14} /> {isFixed ? "ثابت" : "ثبّت"}
                      </button>
                    )}
                  </div>
                  {!isFixed && (
                    <input
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      value={shares[id] ? formatMoney(shares[id]) : ""}
                      placeholder="0"
                      onChange={(e) => {
                        const n = Number(e.target.value.replace(/[^\d]/g, "")) || 0;
                        setEqual(false);
                        setShares((s) => ({ ...s, [id]: n }));
                      }}
                      className="mt-2 w-full p-2.5 bg-slate-950 border-2 border-slate-700 focus:border-amber-500 rounded-xl font-black text-xl text-center tabular-nums outline-none"
                    />
                  )}
                </li>
              );
            })}
          </ul>

          {others.length === 0 && (
            <p className="p-4 rounded-2xl bg-slate-950 text-center font-bold text-slate-300">محد سام غيرك — السومة كاملة لك</p>
          )}
          {passed.length > 0 && (
            <p className="mt-3 text-center text-xs font-bold text-slate-500">
              🏳️ انسحبوا من السوم (ما لهم شي): {passed.map(nameOf).join("، ")}
            </p>
          )}

          <div className={`mt-3 p-3 rounded-2xl text-center font-black ${left < 0 ? "bg-red-950 text-red-300" : "bg-slate-950"}`}>
            وزّعت <Money value={given} /> — {left < 0 ? "أكثر من سومتك!" : <>لك <Money value={left} className="text-amber-400" /></>}
          </div>
        </>
      )}

      {mode === "withdraw" && (
        <p className="p-4 rounded-2xl bg-slate-950 font-bold text-slate-300 leading-relaxed">
          🏳️ كل اللي سامو يختارون: <b>ينسحب</b> (ما يكسب ولا يخسر) أو <b>يكمل ويداقشك</b> بسومته. إذا الكل انسحبوا، تاخذ
          السومة كاملة <Money value={total} className="text-amber-400" />.
        </p>
      )}

      {mode === "all_fixed" && (
        <p className="p-4 rounded-2xl bg-slate-950 font-bold text-slate-300 leading-relaxed">
          ⚔️ كل اللي سامو ({stakedOpponents(round).length}) يداقشونك، كل واحد بسومته. أقوى ورق يفوز.
        </p>
      )}

      <button type="button" onClick={submit} disabled={busy || (mode === "distribute" && left < 0)} className={`${btn.primary} mt-4`}>
        {busy ? <Loader2 className="animate-spin" size={22} /> : <Check size={22} />}
        اعتمد القرار
      </button>
    </Panel>
  );
}

// ---------------------------------------------------------------------
// ملخص القرار (يشوفه الكل)
// ---------------------------------------------------------------------

function DecisionSummary({ ctx, round }: { ctx: MadaqeshGameCtx; round: MadaqeshRound }) {
  const { nameOf } = ctx;
  const d = round.decision;
  if (!d || !round.deciderId) return null;
  const total = stakeOf(round, round.deciderId);
  const kept = total - sumShares(d.shares);
  return (
    <Panel>
      <p className="text-center font-bold text-slate-400 text-sm">
        قرار {nameOf(round.deciderId)} على <Money value={total} className="text-amber-400 font-black" />
      </p>
      <h2 className="text-2xl font-black text-center mb-3">{MODE_LABEL[d.mode]}</h2>
      {d.mode === "distribute" && (
        <ul className="flex flex-col gap-1.5">
          {stakedOpponents(round)
            .filter((id) => !d.fixed.includes(id))
            .map((id) => [id, d.shares[id] ?? 0] as const)
            .map(([id, amount]) =>
            round.responses[id] === "object" ? (
              <li key={id} className="flex items-center gap-2 p-2.5 rounded-xl bg-red-950/60 font-black">
                <span className="flex-1 min-w-0 break-words">✋ {nameOf(id)}</span>
                <span className="text-red-300 text-sm">اعترض — يداقش بـ <Money value={stakeOf(round, id)} /></span>
              </li>
            ) : (
              <li key={id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 font-black">
                <span className="flex-1 min-w-0 break-words">{nameOf(id)}</span>
                <Money value={amount} className="text-emerald-400" />
              </li>
            )
          )}
          {d.fixed.map((id) => (
            <li key={id} className="flex items-center gap-2 p-2.5 rounded-xl bg-red-950/60 font-black">
              <span className="flex-1 min-w-0 break-words">🔒 {nameOf(id)}</span>
              <span className="text-red-300 text-sm">ثابت — يداقش بـ <Money value={stakeOf(round, id)} /></span>
            </li>
          ))}
          <li className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/50 font-black">
            <span className="flex-1">👑 {nameOf(round.deciderId)}</span>
            <Money value={kept} className="text-amber-400" />
          </li>
        </ul>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------
// الردود
// ---------------------------------------------------------------------

export function MadaqeshResponding({ ctx }: { ctx: MadaqeshGameCtx }) {
  const { room, me, nameOf, isHost, busy, host } = ctx;
  const round = room?.round;
  if (!room || !round || !me) return null;
  const responders = respondersFor(round);
  const mine = responders.find((r) => r.id === me.id);
  const myAnswer = round.responses[me.id];
  const isWithdraw = round.decision?.mode === "withdraw";

  return (
    <div className="flex flex-col gap-4">
      <DecisionSummary ctx={ctx} round={round} />

      {mine && (
        <Panel className="border-amber-600">
          <h2 className="text-xl font-black text-center mb-1">
            {isWithdraw ? "تنسحب ولا تكمل؟" : "راضي بالتوزيعة؟"}
          </h2>
          <p className="text-center text-sm font-bold text-slate-400 mb-4">
            {isWithdraw ? (
              <>إذا كملت تداقش {nameOf(round.deciderId)} بسومتك <Money value={stakeOf(round, me.id)} /></>
            ) : (
              <>إذا اعترضت تداقش {nameOf(round.deciderId)} بسومتك <Money value={stakeOf(round, me.id)} /> وما تاخذ نصيبك</>
            )}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {mine.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => ctx.respond(opt)}
                aria-pressed={myAnswer === opt}
                className={`py-4 rounded-2xl font-black text-lg border-b-4 transition-all ${
                  myAnswer === opt
                    ? opt === "object" || opt === "stay"
                      ? "bg-red-600 border-red-800"
                      : "bg-emerald-600 border-emerald-800"
                    : "bg-slate-800 border-slate-950"
                }`}
              >
                {opt === "accept" && <><Hand className="inline -mt-1" size={20} /> راضي</>}
                {opt === "object" && "✋ أعترض"}
                {opt === "withdraw" && "🏳️ أنسحب"}
                {opt === "stay" && <><Swords className="inline -mt-1" size={20} /> أكمل</>}
              </button>
            ))}
          </div>
          {myAnswer && <p className="mt-3 text-center text-xs font-bold text-slate-400">تقدر تغيّر ردك لين يردون الباقين</p>}
        </Panel>
      )}

      <Panel>
        <h3 className="font-black mb-2">الردود</h3>
        <ul className="flex flex-col gap-1.5">
          {responders.map((r) => (
            <li key={r.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 font-black">
              <span className="flex-1 min-w-0 break-words">{nameOf(r.id)}</span>
              <span className={round.responses[r.id] ? "" : "text-slate-500 animate-pulse"}>
                {round.responses[r.id] ? RESPONSE_LABEL[round.responses[r.id]] : "ينتظر…"}
              </span>
            </li>
          ))}
        </ul>
        {isHost && (
          <button type="button" onClick={() => host.forceResponses()} disabled={busy} className={`${btn.ghost} mt-3`}>
            اعتمد الحين ({isWithdraw ? "اللي ما رد = انسحب" : "اللي ما رد = راضي"})
          </button>
        )}
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------
// المداقشة
// ---------------------------------------------------------------------

export function MadaqeshShowdown({ ctx }: { ctx: MadaqeshGameCtx }) {
  const { room, me, nameOf, isHost, busy, players } = ctx;
  const round = room?.round;
  const [picked, setPicked] = useState<string | null>(null);
  const preview = useMemo(
    () => (room && round && picked ? settleRound(round, players, picked, room.settings) : null),
    [room, round, picked, players]
  );
  if (!room || !round || !me || !round.deciderId) return null;

  const fighters = [round.deciderId, ...contestants(round)];
  const canRecord = round.deciderId === me.id || isHost;

  return (
    <div className="flex flex-col gap-4">
      <DecisionSummary ctx={ctx} round={round} />
      <Panel className="border-red-800">
        <h2 className="text-2xl font-black text-center mb-1">⚔️ المداقشة</h2>
        <p className="text-center font-bold text-slate-400 mb-4">
          {canRecord ? "العبوا على الطاولة، وبعدها اختر صاحب أقوى ورق" : `العبوا… ${nameOf(round.deciderId)} يسجّل النتيجة`}
        </p>
        <ul className="grid grid-cols-1 gap-2">
          {fighters.map((id) => {
            const on = picked === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  disabled={!canRecord || busy}
                  onClick={() => setPicked(id)}
                  aria-pressed={on}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-black border-b-4 transition-all text-start ${
                    on ? "bg-amber-500 text-slate-950 border-amber-700" : "bg-slate-800 border-slate-950"
                  } disabled:opacity-90`}
                >
                  <span className="text-2xl">{id === round.deciderId ? "👑" : "⚔️"}</span>
                  <span className="flex-1 min-w-0 break-words">{nameOf(id)}</span>
                  <Money value={stakeOf(round, id)} />
                </button>
              </li>
            );
          })}
        </ul>

        {canRecord && preview && picked && (
          <div className="mt-4 p-3 rounded-2xl bg-slate-950 animate-in fade-in">
            <p className="font-black text-sm text-slate-400 mb-2">لو فاز {nameOf(picked)}:</p>
            <ul className="flex flex-col gap-1">
              {Object.entries(preview.deltas).map(([id, d]) => (
                <li key={id} className="flex items-center gap-2 font-bold">
                  <span className="flex-1 min-w-0 break-words">{nameOf(id)}</span>
                  <Delta value={d} />
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => ctx.setWinner(picked)} disabled={busy} className={`${btn.primary} mt-3`}>
              {busy ? <Loader2 className="animate-spin" size={22} /> : <Scale size={22} />}
              اعتمد: {nameOf(picked)} أقوى ورق
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------
// نتيجة الجولة
// ---------------------------------------------------------------------

export function MadaqeshResult({ ctx }: { ctx: MadaqeshGameCtx }) {
  const { room, nameOf } = ctx;
  const round = room?.round;
  const result = round?.result;
  if (!room || !round || !result) return null;

  if (result.void) {
    return (
      <Panel className="text-center">
        <p className="text-6xl mb-2">🏳️</p>
        <h2 className="text-2xl font-black">الكل انسحبوا… الجولة عدّت</h2>
        <NextRound ctx={ctx} />
      </Panel>
    );
  }

  const fighters = contestants(round);
  const entries = Object.entries(result.deltas).sort((a, b) => b[1] - a[1]);
  return (
    <Panel className="text-center">
      <p className="text-6xl mb-2">{fighters.length === 0 ? "🤝" : result.winnerId === round.deciderId ? "👑" : "⚔️"}</p>
      <h2 className="text-2xl font-black mb-1">
        {fighters.length === 0
          ? round.decision?.mode === "withdraw"
            ? `الكل انسحبوا — ${nameOf(round.deciderId)} أخذها كاملة`
            : "اعتمدت التوزيعة"
          : `${nameOf(result.winnerId)} فاز بالمداقشة!`}
      </h2>
      <ul className="flex flex-col gap-1.5 mt-4 text-start">
        {entries.map(([id, d]) => (
          <li key={id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 font-black animate-in fade-in slide-in-from-bottom-2">
            <span className="flex-1 min-w-0 break-words">{nameOf(id)}</span>
            <Delta value={d} className="text-lg" />
          </li>
        ))}
      </ul>
      {result.revived.length > 0 && (
        <p className="mt-3 p-3 rounded-2xl bg-red-950/60 font-black text-red-200">
          💸 أفلس: {result.revived.map(nameOf).join("، ")} — رجع رصيده {formatMoney(MADAQESH_CONFIG.REVIVE_BALANCE)}
        </p>
      )}
      {result.eliminated.length > 0 && (
        <p className="mt-3 p-3 rounded-2xl bg-slate-950 font-black text-slate-300">
          ☠️ خلصت فرصه وطلع: {result.eliminated.map(nameOf).join("، ")}
        </p>
      )}
      <NextRound ctx={ctx} />
    </Panel>
  );
}

/** ما فيه مؤقت: المنشئ يبدأ الجولة الجاية لما يكونون جاهزين */
function NextRound({ ctx }: { ctx: MadaqeshGameCtx }) {
  if (!ctx.isHost) {
    return <p className="mt-4 text-sm font-bold text-slate-400 animate-pulse">بانتظار المنشئ يبدأ الجولة الجاية…</p>;
  }
  return (
    <button type="button" onClick={() => ctx.host.nextRound()} disabled={ctx.busy} className={`${btn.primary} mt-5`}>
      {ctx.busy ? <Loader2 className="animate-spin" size={22} /> : <Play size={22} />}
      الجولة الجاية
    </button>
  );
}

// للاستخدام في سجل الجولات
export function roundHeadline(round: MadaqeshRound, nameOf: (id: string | null | undefined) => string): string {
  if (round.result?.void) return "الكل انسحبوا";
  const d = round.decision;
  if (!d || !round.deciderId) return "";
  const fighters = contestants(round);
  const base = `${nameOf(round.deciderId)} بـ ${formatMoney(stakeOf(round, round.deciderId))} — ${MODE_LABEL[d.mode]}`;
  if (fighters.length === 0) return base;
  const objectors = d.mode === "distribute" ? fighters.filter((id) => responseOf(round, id) === "object") : [];
  return `${base}${objectors.length ? ` (اعترض ${objectors.map(nameOf).join("، ")})` : ""} — فاز ${nameOf(round.result?.winnerId)}`;
}

