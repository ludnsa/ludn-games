"use client";

import React, { useState } from "react";
import { Loader2, Check, SkipForward, Hourglass, Crown, Lightbulb } from "lucide-react";
import { MAFIA_CONFIG, MAFIA_NIGHT_STEPS, MAFIA_ROLES } from "@/constants/mafia";
import type { MafiaGameCtx } from "@/hooks/games/mafia/useMafiaGame";
import type { MafiaTask } from "@/actions/mafia";
import type { MafiaNightStep } from "@/types";
import { Panel, PlayerPicker, RoleIcon } from "./MafiaParts";

const STEP_ACCENT: Record<MafiaNightStep, "red" | "emerald" | "sky" | "purple" | "amber" | "orange"> = {
  doctor: "emerald",
  mafia: "red",
  detective: "sky",
  magician: "purple",
  journalist: "amber",
  suicide: "orange",
  silencer: "sky",
};

/** قدرة مرة وحدة طول اللعبة — يقدر يعدّي الليلة ويحتفظ بقدرته */
const OPTIONAL_STEPS: MafiaNightStep[] = ["magician", "journalist"];

export function MafiaNightAct({ ctx }: { ctx: MafiaGameCtx }) {
  const { room, view } = ctx;
  if (!room?.night_step) return null;
  const step = room.night_step;
  const task = view?.task && view.task.step === step ? view.task : null;

  return (
    <div className="flex flex-col gap-4">
      {/* أيقونة صاحب الدور تتوهج فوق */}
      <div className="flex flex-col items-center gap-2" style={{ "--glow": MAFIA_ROLES[step].glow } as React.CSSProperties}>
        <RoleIcon role={step} className="w-20 h-20 mfx-step-icon mfx-step-pulse" />
        <p className="text-center font-black text-lg text-indigo-200">{MAFIA_NIGHT_STEPS[step].headline}</p>
      </div>
      {task ? (
        task.mode === "suggest" ? (
          <MafiaSuggestCard ctx={ctx} task={task} />
        ) : (
          <MafiaTaskCard key={`${room.phase_seq}`} ctx={ctx} task={task} />
        )
      ) : (
        <FunQuestion key={`${room.phase_seq}`} ctx={ctx} />
      )}
      <NightWaiting ctx={ctx} />
    </div>
  );
}

/**
 * مين باقي ما اختار — الدور ما يمشي إلا لما الكل يختارون.
 * اسمي يختفي من عندي أول ما أضغط استمرار، بدون ما أنتظر السيرفر.
 */
export function NightWaiting({ ctx }: { ctx: MafiaGameCtx }) {
  const { room, view, players } = ctx;
  const r = room?.night_ready;
  if (!room || !r || r.night !== room.night_number || r.step !== room.night_step) return null;

  const task = view?.task && view.task.step === room.night_step ? view.task : null;
  const fresh = view?.phaseSeq === room.phase_seq;
  const iPicked = Boolean(task ? task.locked || (task.mode === "suggest" && task.selectedId) : fresh && view?.decoyId);
  const waiting = (r.waiting ?? []).filter((id) => !(iPicked && id === view?.me.id));
  const names = waiting.map((id) => players.find((p) => p.id === id)?.display_name).filter(Boolean);

  // نسخة قديمة من السيرفر بدون أسماء: نرجع للعدد
  if (!r.waiting) {
    const left = Math.max(0, r.total - r.done);
    if (left === 0) return null;
    return (
      <p className="text-center font-black text-amber-200 bg-amber-950/40 border border-amber-900 rounded-2xl p-3 animate-in fade-in">
        <Hourglass size={18} className="inline -mt-1 me-1" />
        باقي {left === 1 ? "واحد ما اختار" : `${left} ما اختاروا`}
      </p>
    );
  }
  if (names.length === 0) return null;
  return (
    <p className="text-center font-black text-amber-200 bg-amber-950/40 border border-amber-900 rounded-2xl p-3 animate-in fade-in break-words">
      <Hourglass size={18} className="inline -mt-1 me-1" />
      باقي {names.length === 1 ? "ما اختار" : "ما اختاروا"}: {names.join("، ")}
    </p>
  );
}

/** بطاقة نتيجة المحقق — تطلع له بس، فوق القائمة عشان يشوفها على طول (مافيا = أحمر، مواطن = أزرق) */
function DetectiveResult({ result }: { result: { targetName: string; isMafia: boolean } }) {
  return (
    <div
      className={`mb-4 p-5 rounded-2xl text-center animate-in zoom-in-50 ${result.isMafia ? "bg-red-600" : "bg-sky-700"}`}
    >
      <RoleIcon role={result.isMafia ? "mafia" : "citizen"} className="w-20 h-20 mx-auto mb-2" />
      <p className="text-2xl font-black">
        {result.targetName} {result.isMafia ? "مافيا!" : "مو مافيا"}
      </p>
    </div>
  );
}

/**
 * صاحب الدور: يختار لاعب ويضغط "استمرار". الاختيار نهائي، والدور يخلص للكل
 * لما كل الأحياء يختارون (صاحب الدور + سؤال التمويه للباقين).
 */
function MafiaTaskCard({ ctx, task }: { ctx: MafiaGameCtx; task: MafiaTask }) {
  // المنتقم يبدأ من آخر هدف اختاره، فيقدر يضغط استمرار على طول
  const [pending, setPending] = useState<string | null>(task.selectedId);
  const def = MAFIA_NIGHT_STEPS[task.step];
  const optional = OPTIONAL_STEPS.includes(task.step);
  const chosen = task.locked ? task.selectedId : pending;
  const chosenName = task.options.find((o) => o.id === chosen)?.name;
  const detectiveResult = task.step === "detective" ? ctx.view?.detectiveResult : null;
  // الساحر: لو فاضية فئة وحدة نسأله عنها مباشرة، ولو أكثر يختار
  const prompt =
    task.step === "magician" && task.options.length === 1
      ? `${task.options[0].name} مات، تبي تصير بداله؟`
      : def.prompt;

  return (
    <Panel className="border-indigo-800">
      <h2 className="text-2xl font-black text-center mb-3">{prompt}</h2>

      {detectiveResult && <DetectiveResult result={detectiveResult} />}

      {!task.locked && (
        <>
          {task.step === "mafia" && (
            <p className="text-center text-sm font-bold text-red-300 -mt-1 mb-3">
              <Crown size={15} className="inline -mt-1 me-1 text-amber-400" />
              أنت قائد المافيا الليلة — اختيارك هو المعتمد
            </p>
          )}
          {task.step === "doctor" && (
            <p className="text-center text-xs font-bold text-slate-400 -mt-1 mb-3">
              تقدر تحمي نفسك، بس مو نفس الشخص اللي حميته الليلة اللي قبل
            </p>
          )}
          {task.step === "silencer" && (
            <p className="text-center text-xs font-bold text-slate-400 -mt-1 mb-3">
              ما تقدر تختار نفس الشخص اللي سكّته الليلة اللي قبل
            </p>
          )}
          {task.step === "mafia" && task.suggestions && task.suggestions.length > 0 && (
            <div className="mb-4 p-3 rounded-2xl bg-red-950/50 border border-red-900">
              <p className="text-sm font-black text-red-200 mb-2">
                <Lightbulb size={15} className="inline -mt-1 me-1" />
                اقتراحات زملائك (اضغط عشان تختار)
              </p>
              <div className="flex flex-col gap-1.5">
                {task.suggestions.map((s) => (
                  <button
                    key={s.targetId}
                    type="button"
                    onClick={() => setPending(s.targetId)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-right transition-colors ${
                      pending === s.targetId ? "bg-red-600" : "bg-slate-800 hover:bg-slate-700"
                    }`}
                  >
                    <span className="flex-1 font-black break-words leading-tight">{s.targetName}</span>
                    <span className="text-xs font-bold opacity-80 break-words">اقترحه: {s.by.join("، ")}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <PlayerPicker
        options={task.options}
        selectedId={chosen}
        disabled={task.locked || ctx.busy}
        accent={STEP_ACCENT[task.step]}
        onPick={setPending}
      />

      {task.locked ? (
        <p className="mt-4 text-center font-black text-emerald-300">
          <Check size={18} className="inline -mt-1 me-1" />
          تم{chosenName ? `: ${chosenName}` : " — عدّيت الليلة"}
          {task.step === "magician" && chosenName && " — من الليلة الجاية هذا دورك"}
          {task.step === "journalist" && chosenName && " — النتيجة تطلع مع الصباح"}
          {task.step === "silencer" && chosenName && " — يُعلن في الصباح"}
        </p>
      ) : (
        <>
          <button
            type="button"
            disabled={!pending || ctx.busy}
            onClick={() => pending && ctx.act(pending)}
            className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black text-lg rounded-2xl border-b-4 border-indigo-800 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
          >
            {ctx.busy ? <Loader2 className="animate-spin" size={20} /> : <Check size={22} />}
            استمرار{chosenName ? ` — ${chosenName}` : ""}
          </button>

          {optional && (
            <button
              type="button"
              disabled={ctx.busy}
              onClick={() => ctx.act(null)}
              className="w-full mt-2 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 font-black rounded-2xl border-b-4 border-slate-950 flex items-center justify-center gap-2"
            >
              <SkipForward size={18} /> عدّي الليلة واحتفظ بقدرتي
            </button>
          )}

          {optional && (
            <p className="mt-3 text-center text-xs font-bold text-slate-400">
              إذا عدّيت، قدرتك تظل لليلة الجاية
            </p>
          )}
        </>
      )}
    </Panel>
  );
}

/**
 * مافيا مو قائد الليلة: يقترح، والقائد يشوف الاقتراح ويقرر.
 * لو القائد حسم قبل ما يقترح، يضغط "استمرار" — لازم يختار مثل الكل عشان الدور يمشي.
 */
function MafiaSuggestCard({ ctx, task }: { ctx: MafiaGameCtx; task: MafiaTask }) {
  const leaderPick = task.leaderPickId;
  const needsAck = task.locked && !task.selectedId && Boolean(leaderPick);
  return (
    <Panel className="border-red-900">
      <h2 className="text-2xl font-black text-center mb-1 flex items-center justify-center gap-2">
        <RoleIcon role="mafia" className="w-9 h-9" /> اقترح ضحية
      </h2>
      <p className="text-center text-sm font-bold text-slate-400 mb-4">
        اقتراحك يوصل للقائد <span className="text-red-300">{task.leaderName}</span>، وهو اللي يقرر
      </p>

      {task.leaderPickName ? (
        <p className="mb-4 p-4 rounded-2xl bg-red-700 text-center text-xl font-black animate-in zoom-in-95">
          القائد حسم: {task.leaderPickName}
        </p>
      ) : null}

      <PlayerPicker
        options={task.options}
        selectedId={task.selectedId}
        disabled={task.locked || ctx.busy}
        accent="red"
        onPick={(id) => ctx.suggest(id)}
      />

      {!task.locked && (
        <p className="mt-3 text-center text-xs font-bold text-slate-400">
          {task.selectedId ? "وصل اقتراحك — تقدر تغيّره لين القائد يحسم" : "اضغط على اسم عشان تقترحه"}
        </p>
      )}
      {needsAck && (
        <button
          type="button"
          onClick={() => leaderPick && ctx.suggest(leaderPick)}
          className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-2xl border-b-4 border-indigo-800 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
        >
          <Check size={22} />
          استمرار
        </button>
      )}
      {task.locked && task.selectedId && (
        <p className="mt-4 text-center font-black text-emerald-300">
          <Check size={18} className="inline -mt-1 me-1" />
          تم
        </p>
      )}
    </Panel>
  );
}

/**
 * سؤال التمويه: كل اللي مو عليهم الدور لازم يجاوبون ويضغطون "استمرار" —
 * نفس حركة صاحب الدور بالضبط، فالكل ماسك جواله ومحد يعرف مين صاحب الدور.
 * الاختيار ينحفظ (عشان الدور يمشي لما الكل يختارون) بس ما ينحسب بشي.
 */
function FunQuestion({ ctx }: { ctx: MafiaGameCtx }) {
  const locked = ctx.view?.decoyId ?? null;
  const [picked, setPicked] = useState<string | null>(null);
  const options = ctx.alivePlayers
    .filter((p) => p.id !== ctx.me?.id)
    .map((p) => ({ id: p.id, name: p.display_name }));
  const chosen = locked ?? picked;
  const chosenName = options.find((o) => o.id === chosen)?.name;

  return (
    <Panel className="border-indigo-800">
      <h2 className="text-2xl font-black text-center mb-1">{MAFIA_CONFIG.FUN_QUESTION}</h2>
      <p className="text-center text-xs font-bold text-slate-400 mb-4">{MAFIA_CONFIG.FUN_QUESTION_NOTE}</p>
      <PlayerPicker options={options} selectedId={chosen} disabled={Boolean(locked)} onPick={setPicked} accent="purple" />
      {locked ? (
        <p className="mt-4 text-center font-black text-emerald-300">
          <Check size={18} className="inline -mt-1 me-1" />
          تم{chosenName ? `: ${chosenName}` : ""}
        </p>
      ) : (
        <button
          type="button"
          disabled={!picked}
          onClick={() => picked && ctx.decoy(picked)}
          className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black text-lg rounded-2xl border-b-4 border-indigo-800 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
        >
          <Check size={22} />
          استمرار{chosenName ? ` — ${chosenName}` : ""}
        </button>
      )}
    </Panel>
  );
}

export function MafiaNightDone({ ctx }: { ctx: MafiaGameCtx }) {
  const step = ctx.room?.night_step;
  if (!step) return null;
  const def = MAFIA_NIGHT_STEPS[step];
  // المحقق يظل يشوف نتيجته (حتى لو النظام اختار عنه لأن الوقت خلص)
  const result = step === "detective" ? ctx.view?.detectiveResult : null;
  return (
    <div
      className="flex flex-col items-center justify-center py-16 text-center"
      style={{ "--glow": MAFIA_ROLES[step].glow } as React.CSSProperties}
    >
      <RoleIcon role={step} className="w-36 h-36 mb-6 mfx-step-icon animate-in zoom-in-50 duration-500" />
      <p className="text-4xl font-black animate-in fade-in slide-in-from-bottom-4 duration-700">{def.doneText}</p>
      {result && (
        <div className="w-full mt-8">
          <DetectiveResult result={result} />
        </div>
      )}
    </div>
  );
}
