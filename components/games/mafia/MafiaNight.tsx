"use client";

import React, { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { MAFIA_CONFIG, MAFIA_NIGHT_STEPS } from "@/constants/mafia";
import type { MafiaGameCtx } from "@/hooks/games/mafia/useMafiaGame";
import type { MafiaTask } from "@/actions/mafia";
import type { MafiaNightStep } from "@/types";
import { Panel, PlayerPicker } from "./MafiaParts";

const STEP_ACCENT: Record<MafiaNightStep, "red" | "emerald" | "sky" | "purple" | "amber" | "orange"> = {
  doctor: "emerald",
  mafia: "red",
  detective: "sky",
  magician: "purple",
  journalist: "amber",
  suicide: "orange",
};

/** أدوار الاختيار النهائي — نطلب تأكيد قبل الإرسال لأنه ما يتغير */
const ONE_SHOT: MafiaNightStep[] = ["detective", "magician", "journalist"];

export function MafiaNightAct({ ctx }: { ctx: MafiaGameCtx }) {
  const { room, view } = ctx;
  if (!room?.night_step) return null;
  const step = room.night_step;
  const task = view?.task && view.task.step === step ? view.task : null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center font-black text-lg text-indigo-200 animate-pulse">{MAFIA_NIGHT_STEPS[step].headline}</p>
      {task ? (
        task.mode === "confirm" ? (
          <MafiaConfirmCard ctx={ctx} task={task} />
        ) : (
          <MafiaTaskCard key={`${room.phase_seq}`} ctx={ctx} task={task} />
        )
      ) : (
        <FunQuestion key={`${room.phase_seq}`} />
      )}
    </div>
  );
}

function MafiaTaskCard({ ctx, task }: { ctx: MafiaGameCtx; task: MafiaTask }) {
  const [pending, setPending] = useState<string | null>(null);
  const oneShot = ONE_SHOT.includes(task.step);
  const def = MAFIA_NIGHT_STEPS[task.step];
  const chosenName = task.options.find((o) => o.id === task.selectedId)?.name;

  return (
    <Panel className="border-indigo-800">
      <h2 className="text-2xl font-black text-center mb-3">{def.prompt}</h2>
      {task.step === "mafia" && (
        <p className="text-center text-sm font-bold text-red-300 -mt-1 mb-3">👑 أنت قائد المافيا الليلة — اختيارك هو المعتمد</p>
      )}
      {task.step === "doctor" && (
        <p className="text-center text-xs font-bold text-slate-400 -mt-1 mb-3">تقدر تحمي نفسك، بس مو نفس الشخص اللي حميته الليلة اللي قبل</p>
      )}
      {oneShot && !task.locked && (
        <p className="text-center text-xs font-bold text-amber-300 mb-3">⚠️ اختيارك نهائي وما يتغير</p>
      )}

      {/* نتيجة المحقق فوق القائمة — تبان على طول بدون ما ينزل */}
      {task.step === "detective" && task.detectiveResult && (
        <div
          className={`mb-4 p-5 rounded-2xl text-center animate-in zoom-in-50 ${
            task.detectiveResult.isMafia ? "bg-red-600" : "bg-emerald-700"
          }`}
        >
          <p className="text-5xl mb-2">{task.detectiveResult.isMafia ? "🚨" : "✅"}</p>
          <p className="text-2xl font-black">
            {task.detectiveResult.targetName} {task.detectiveResult.isMafia ? "مافيا!" : "مو مافيا"}
          </p>
        </div>
      )}

      <PlayerPicker
        options={task.options}
        selectedId={task.locked ? task.selectedId : pending ?? task.selectedId}
        disabled={task.locked || ctx.busy}
        accent={STEP_ACCENT[task.step]}
        onPick={(id) => (oneShot ? setPending(id) : ctx.act(id))}
      />

      {oneShot && !task.locked && (
        <button
          type="button"
          disabled={!pending || ctx.busy}
          onClick={() => pending && ctx.act(pending)}
          className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black text-lg rounded-2xl border-b-4 border-indigo-800 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
        >
          {ctx.busy && <Loader2 className="animate-spin" size={20} />}
          تأكيد الاختيار
        </button>
      )}

      {task.step === "mafia" && (
        <p className="mt-4 text-center text-sm font-bold text-slate-300">
          {task.confirmedBy && task.confirmedBy.length > 0
            ? `✅ صادق: ${task.confirmedBy.join("، ")}`
            : chosenName
              ? "⏳ بانتظار مصادقة البقية..."
              : "اختار الضحية وتقدر تغيّر لين ينتهي الوقت"}
        </p>
      )}

      {(task.step === "doctor" || task.step === "suicide") && chosenName && (
        <p className="mt-4 text-center text-sm font-bold text-slate-300">اخترت {chosenName} — تقدر تغيّر لين ينتهي الوقت</p>
      )}

      {(task.step === "magician" || task.step === "journalist") && task.locked && chosenName && (
        <p className="mt-4 text-center font-black text-amber-300">تم! النتيجة تطلع مع الصباح 🌅</p>
      )}
    </Panel>
  );
}

function MafiaConfirmCard({ ctx, task }: { ctx: MafiaGameCtx; task: MafiaTask }) {
  const chosenName = task.options.find((o) => o.id === task.selectedId)?.name;
  return (
    <Panel className="border-red-900 text-center">
      <p className="text-5xl mb-3">🔪</p>
      {chosenName ? (
        <>
          <p className="font-bold text-slate-400 mb-1">القائد {task.leaderName} اختار:</p>
          <p className="text-4xl font-black text-red-400 mb-5">{chosenName}</p>
          <button
            type="button"
            onClick={ctx.confirmKill}
            disabled={task.iConfirmed || ctx.busy}
            className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-black text-lg rounded-2xl border-b-4 border-red-800 active:border-b-0 active:translate-y-[4px] transition-all"
          >
            {task.iConfirmed ? "صادقت ✅" : "أصادق 🤝"}
          </button>
        </>
      ) : (
        <p className="text-xl font-black">القائد {task.leaderName} يختار الضحية... 👀</p>
      )}
      <p className="mt-4 text-xs font-bold text-slate-500">الليلة الجاية الدور عليك أو على غيرك تختارون</p>
    </Panel>
  );
}

/** سؤال التمويه: الكل مشغول بجواله، فمحد يعرف مين صاحب الدور */
function FunQuestion() {
  const [answer, setAnswer] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <Panel className="border-indigo-900">
      <h2 className="text-2xl font-black text-center mb-4">{MAFIA_CONFIG.FUN_QUESTION}</h2>
      {sent ? (
        <p className="text-center text-xl font-black text-emerald-400 py-6 animate-in zoom-in">تم ✅ سرّك في بير 🤫</p>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (answer.trim()) setSent(true);
          }}
        >
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value.slice(0, MAFIA_CONFIG.FUN_ANSWER_MAX))}
            maxLength={MAFIA_CONFIG.FUN_ANSWER_MAX}
            placeholder="اكتب اسم..."
            aria-label={MAFIA_CONFIG.FUN_QUESTION}
            className="flex-1 min-w-0 p-4 bg-slate-950 border-2 border-slate-800 rounded-2xl font-black text-lg focus:border-indigo-500 outline-none"
          />
          <button
            type="submit"
            disabled={!answer.trim()}
            aria-label="إرسال"
            className="w-14 bg-indigo-600 disabled:opacity-40 rounded-2xl border-b-4 border-indigo-800 flex items-center justify-center"
          >
            <Send size={22} />
          </button>
        </form>
      )}
      <p className="text-center text-xs font-bold text-slate-500 mt-3">
        {answer.length}/{MAFIA_CONFIG.FUN_ANSWER_MAX} حروف
      </p>
    </Panel>
  );
}

export function MafiaNightDone({ ctx }: { ctx: MafiaGameCtx }) {
  const step = ctx.room?.night_step;
  if (!step) return null;
  const def = MAFIA_NIGHT_STEPS[step];
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-9xl mb-6 animate-in zoom-in-50 duration-500 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
        {def.doneEmoji}
      </p>
      <p className="text-4xl font-black animate-in fade-in slide-in-from-bottom-4 duration-700">{def.doneText}</p>
    </div>
  );
}
