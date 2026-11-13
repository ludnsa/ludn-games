"use client";

import React from "react";
import { Loader2, Check, SkipForward, Hourglass, Crown, Moon } from "lucide-react";
import { MAFIA_CONFIG, MAFIA_NIGHT_STEPS, MAFIA_ROLES } from "@/constants/mafia";
import { isFastMafia } from "@/lib/game/mafia-engine";
import type { MafiaGameCtx } from "@/hooks/games/mafia/useMafiaGame";
import type { MafiaTask } from "@/actions/mafia";
import type { MafiaNightStep } from "@/types";
import { Panel, PlayerPicker, RoleIcon } from "./MafiaParts";
import { BTN_SOFT, H_PROMPT, INFO, LABEL, NOTE } from "./mafiaUi";

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
  if (room && isFastMafia(room.settings)) return <FastNightAct ctx={ctx} />;
  if (!room?.night_step) return null;
  const step = room.night_step;
  const task = view?.task && view.task.step === step ? view.task : null;
  // حالتي الخاصة توصل بعد بداية الدور بلحظة: قبلها ما نعرف إذا الدور دوري، فما نعرض
  // سؤال التمويه لصاحب الدور بالغلط (يختار فيه، وبعدين تطلع بطاقته ويختفي اختياره)
  const fresh = view?.phaseSeq === room.phase_seq;

  return (
    <div className="flex flex-col gap-3">
      {/* أيقونة صاحب الدور تتوهج جنب العنوان — سطر واحد عشان القائمة تبان كاملة */}
      <div className="flex items-center justify-center gap-3" style={{ "--glow": MAFIA_ROLES[step].glow } as React.CSSProperties}>
        <RoleIcon role={step} className="w-12 h-12 mfx-step-icon mfx-step-pulse" />
        <p className="text-[15px] font-black text-ludn-fg/85">{MAFIA_NIGHT_STEPS[step].headline}</p>
      </div>
      {!fresh ? (
        // نفس الشكل عند الكل — ما يفضح مين صاحب الدور
        <Panel className="flex justify-center py-12">
          <Loader2 size={34} className="animate-spin text-ludn-gold" />
        </Panel>
      ) : task ? (
        <MafiaTaskCard ctx={ctx} task={task} />
      ) : (
        <FunQuestion key={`${room.phase_seq}`} ctx={ctx} />
      )}
      <NightWaiting ctx={ctx} />
    </div>
  );
}

/**
 * النمط السريع: الليل كله دور واحد — كل واحد يختار من جواله بنفس الوقت: صاحب المهمة (حسب فئته)
 * يشوف مهمته، والباقين سؤال التمويه. نفس العنوان عند الكل، والمؤقت فوق بالشريط.
 */
function FastNightAct({ ctx }: { ctx: MafiaGameCtx }) {
  const { room, view } = ctx;
  if (!room) return null;
  const task = view?.task ?? null;
  // نفس السبب اللي بالحماسي: ما نعرض سؤال التمويه لين نعرف إذا عندي مهمة
  const fresh = view?.phaseSeq === room.phase_seq;

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center justify-center gap-2 text-[15px] font-black text-ludn-fg/85">
        <Moon size={20} className="shrink-0 text-indigo-300" /> الكل يختار الحين بنفس الوقت…
      </p>
      {/* نفس السطر عند الكل — ما يفضح مين عنده مهمة */}
      {ctx.nightArming && <p className={NOTE}>المؤقت يبدأ أول ما توصل المهام لكل الجوالات</p>}
      {!fresh ? (
        <Panel className="flex justify-center py-12">
          <Loader2 size={34} className="animate-spin text-ludn-gold" />
        </Panel>
      ) : task ? (
        <MafiaTaskCard ctx={ctx} task={task} />
      ) : (
        <FunQuestion key={`${room.phase_seq}`} ctx={ctx} />
      )}
      <NightWaiting ctx={ctx} />
    </div>
  );
}

/** النمط السريع: كم واحد اختار — العدد بس، بدون أسماء اللي باقين */
function FastNightCount({ ctx }: { ctx: MafiaGameCtx }) {
  const { room } = ctx;
  const r = room?.night_ready;
  if (!room || !r || r.night !== room.night_number || r.step !== null) return null;
  return (
    <p className={`${INFO} animate-in fade-in`}>
      <Hourglass size={16} className="inline -mt-1 me-1" />
      اختار {r.done} من {r.total}
    </p>
  );
}

/**
 * مين باقي ما اختار — الدور ما يمشي إلا لما الكل يختارون.
 * اسمي يختفي من عندي أول ما أضغط على اسم، بدون ما أنتظر السيرفر.
 */
export function NightWaiting({ ctx }: { ctx: MafiaGameCtx }) {
  const { room, view, players } = ctx;
  if (room && isFastMafia(room.settings)) return <FastNightCount ctx={ctx} />;
  const r = room?.night_ready;
  if (!room || !r || r.night !== room.night_number || r.step !== room.night_step) return null;

  const task = view?.task && view.task.step === room.night_step ? view.task : null;
  const fresh = view?.phaseSeq === room.phase_seq;
  const iPicked = Boolean(task ? task.locked : fresh && view?.decoyId);
  const waiting = (r.waiting ?? []).filter((id) => !(iPicked && id === view?.me.id));
  const names = waiting.map((id) => players.find((p) => p.id === id)?.display_name).filter(Boolean);

  // نسخة قديمة من السيرفر بدون أسماء: نرجع للعدد
  if (!r.waiting) {
    const left = Math.max(0, r.total - r.done);
    if (left === 0) return null;
    return (
      <p className={`${INFO} animate-in fade-in`}>
        <Hourglass size={16} className="inline -mt-1 me-1" />
        باقي {left === 1 ? "واحد ما اختار" : `${left} ما اختاروا`}
      </p>
    );
  }
  if (names.length === 0) return null;
  return (
    <p className={`${INFO} animate-in fade-in break-words`}>
      <Hourglass size={16} className="inline -mt-1 me-1" />
      باقي {names.length === 1 ? "ما اختار" : "ما اختاروا"}: {names.join("، ")}
    </p>
  );
}

/** بطاقة نتيجة المحقق — تطلع له بس، فوق القائمة عشان يشوفها على طول (مافيا = أحمر، مواطن = أزرق) */
function DetectiveResult({ result }: { result: { targetName: string; isMafia: boolean } }) {
  return (
    <div
      className={`mb-3 p-4 rounded-2xl text-center animate-in zoom-in-50 ${result.isMafia ? "bg-red-600" : "bg-sky-700"}`}
    >
      <RoleIcon role={result.isMafia ? "mafia" : "citizen"} className="w-14 h-14 mx-auto mb-1.5" />
      <p className="text-xl font-black">
        {result.targetName} {result.isMafia ? "مافيا!" : "مو مافيا"}
      </p>
    </div>
  );
}

/**
 * صاحب الدور: يضغط على لاعب وينحفظ على طول — ضغطة وحدة والاختيار نهائي. الدور يخلص للكل
 * لما كل الأحياء يختارون (صاحب الدور + سؤال التمويه للباقين).
 */
function MafiaTaskCard({ ctx, task }: { ctx: MafiaGameCtx; task: MafiaTask }) {
  const def = MAFIA_NIGHT_STEPS[task.step];
  const optional = OPTIONAL_STEPS.includes(task.step);
  const chosenName = task.options.find((o) => o.id === task.selectedId)?.name;
  const detectiveResult = task.step === "detective" ? ctx.view?.detectiveResult : null;
  // الساحر: لو فاضية فئة وحدة نسأله عنها مباشرة، ولو أكثر يختار
  const prompt =
    task.step === "magician" && task.options.length === 1
      ? `${task.options[0].name} مات، تبي تصير بداله؟`
      : def.prompt;

  return (
    <Panel>
      <h2 className={`${H_PROMPT} mb-2`}>{prompt}</h2>

      {detectiveResult && <DetectiveResult result={detectiveResult} />}

      {!task.locked && (
        <>
          {task.step === "mafia" && (
            <p className="text-center text-[13px] font-black text-rose-300 -mt-1 mb-2.5">
              <Crown size={15} className="inline -mt-1 me-1 text-ludn-gold" />
              أنت قائد المافيا الليلة — اختيارك هو المعتمد
            </p>
          )}
          {task.step === "doctor" && (
            <p className={`${NOTE} -mt-1 mb-2.5`}>
              تقدر تحمي نفسك، بس مو نفس الشخص اللي حميته الليلة اللي قبل
            </p>
          )}
          {task.step === "silencer" && (
            <p className={`${NOTE} -mt-1 mb-2.5`}>
              ما تقدر تختار نفس الشخص اللي سكّته الليلة اللي قبل
            </p>
          )}
          {task.step === "suicide" && (
            <p className={`${NOTE} -mt-1 mb-2.5`}>
              ما تقدر تختار نفس هدفك الليلة اللي قبل
            </p>
          )}
        </>
      )}

      <PlayerPicker
        options={task.options}
        selectedId={task.selectedId}
        disabled={task.locked || ctx.busy}
        accent={STEP_ACCENT[task.step]}
        onPick={(id) => ctx.act(id)}
      />

      {task.locked ? (
        <p className="mt-3 text-center text-[15px] font-black text-ludn-green">
          <Check size={18} className="inline -mt-1 me-1" />
          تم{chosenName ? `: ${chosenName}` : " — عدّيت الليلة"}
          {task.step === "magician" && chosenName && " — من الليلة الجاية هذا دورك"}
          {task.step === "journalist" && chosenName && " — النتيجة تطلع مع الصباح"}
          {task.step === "silencer" && chosenName && " — يُعلن في الصباح"}
        </p>
      ) : (
        <>
          <OneTapNote />

          {optional && (
            <button
              type="button"
              disabled={ctx.busy}
              onClick={() => ctx.act(null)}
              className={`${BTN_SOFT} w-full mt-3`}
            >
              <SkipForward size={18} /> عدّي الليلة واحتفظ بقدرتي
            </button>
          )}

          {optional && (
            <p className={`${NOTE} mt-2`}>
              إذا عدّيت، قدرتك تظل لليلة الجاية
            </p>
          )}
        </>
      )}
    </Panel>
  );
}

/** نفس السطر تحت القائمة عند صاحب الدور وعند سؤال التمويه */
function OneTapNote() {
  return <p className={`${NOTE} mt-2.5`}>اضغط على الاسم — اختيارك نهائي</p>;
}

/**
 * سؤال التمويه: كل اللي مو عليهم الدور (ومنهم المافيا غير القائد) لازم يجاوبون بضغطة على اسم —
 * نفس حركة صاحب الدور بالضبط، فالكل ماسك جواله ومحد يعرف مين صاحب الدور.
 * الاختيار ينحفظ (عشان الدور يمشي لما الكل يختارون) بس ما ينحسب بشي.
 */
function FunQuestion({ ctx }: { ctx: MafiaGameCtx }) {
  const locked = ctx.view?.decoyId ?? null;
  const options = ctx.alivePlayers
    .filter((p) => p.id !== ctx.me?.id)
    .map((p) => ({ id: p.id, name: p.display_name }));
  const chosenName = options.find((o) => o.id === locked)?.name;

  return (
    <Panel>
      <h2 className={`${H_PROMPT} mb-1`}>{MAFIA_CONFIG.FUN_QUESTION}</h2>
      <p className={`${NOTE} mb-3`}>{MAFIA_CONFIG.FUN_QUESTION_NOTE}</p>
      <PlayerPicker
        options={options}
        selectedId={locked}
        disabled={Boolean(locked)}
        onPick={(id) => ctx.decoy(id)}
        accent="purple"
      />
      {locked ? (
        <p className="mt-3 text-center text-[15px] font-black text-ludn-green">
          <Check size={18} className="inline -mt-1 me-1" />
          تم{chosenName ? `: ${chosenName}` : ""}
        </p>
      ) : (
        <OneTapNote />
      )}
    </Panel>
  );
}

/**
 * النمط السريع: الليل خلص — بدون رسائل الأدوار ("تم الاغتيال"…)، كل النتائج تطلع مع الصباح.
 * المحقق بس يظل يشوف نتيجته (مثل الحماسي).
 */
function FastNightDone({ ctx }: { ctx: MafiaGameCtx }) {
  const result = ctx.view?.detectiveResult ?? null;
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Moon size={64} strokeWidth={1.6} className="mb-4 text-indigo-300 animate-in zoom-in-50 duration-500" />
      <p className="font-display text-[34px] leading-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
        انتهى الليل
      </p>
      <p className={`${LABEL} mt-1.5`}>النتائج مع الصباح…</p>
      {result && (
        <div className="w-full mt-6">
          <DetectiveResult result={result} />
        </div>
      )}
    </div>
  );
}

export function MafiaNightDone({ ctx }: { ctx: MafiaGameCtx }) {
  if (ctx.room && isFastMafia(ctx.room.settings)) return <FastNightDone ctx={ctx} />;
  const step = ctx.room?.night_step;
  if (!step) return null;
  const def = MAFIA_NIGHT_STEPS[step];
  // المحقق يظل يشوف نتيجته (حتى لو النظام اختار عنه لأن الوقت خلص)
  const result = step === "detective" ? ctx.view?.detectiveResult : null;
  return (
    <div
      className="flex flex-col items-center justify-center py-8 text-center"
      style={{ "--glow": MAFIA_ROLES[step].glow } as React.CSSProperties}
    >
      <RoleIcon role={step} className="w-28 h-28 mb-4 mfx-step-icon animate-in zoom-in-50 duration-500" />
      <p className="font-display text-[34px] leading-tight animate-in fade-in slide-in-from-bottom-4 duration-700">{def.doneText}</p>
      {result && (
        <div className="w-full mt-6">
          <DetectiveResult result={result} />
        </div>
      )}
    </div>
  );
}
