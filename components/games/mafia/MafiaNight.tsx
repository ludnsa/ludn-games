"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, Check, SkipForward, Hourglass, Crown, Moon, Shield } from "lucide-react";
import { MAFIA_CONFIG, MAFIA_NIGHT_STEPS, MAFIA_ROLES } from "@/constants/mafia";
import { isFastMafia } from "@/lib/game/mafia-engine";
import type { MafiaGameCtx } from "@/hooks/games/mafia/useMafiaGame";
import type { MafiaTask } from "@/actions/mafia";
import type { MafiaNightStep } from "@/types";
import { Panel, PlayerPicker, RoleIcon } from "./MafiaParts";
import { BTN_GOLD, BTN_SOFT, H_PROMPT, INFO, LABEL, NOTE } from "./mafiaUi";

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

/** انتقل لي قرار القتل وشاشتي كانت على سؤال التمويه: نتجاهل الضغط هالمدة بعد ما تتبدل القائمة */
const HANDOVER_GUARD_MS = 1500;

/**
 * يتجاهل الضغط لمدة بعد ما يتغير المفتاح (القائمة تبدلت) — ضغطة نيتها التمويه وصلت بلحظة التبديل ما تنزل قتل.
 * key = null: ما فيه انتظار.
 */
function useTapGuard(key: string | null, ms: number): boolean {
  const [ready, setReady] = useState<string | null>(null);
  useEffect(() => {
    if (key === null) return;
    const t = setTimeout(() => setReady(key), ms);
    return () => clearTimeout(t);
  }, [key, ms]);
  return key === null || ready === key;
}

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
      {ctx.nightArming && <p className={NOTE}>المؤقت يبدأ أول ما توصل الشاشة لكل الجوالات</p>}
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
  // القائمة من الهوك: الاسم اللي اختفى منها ما يرجع (لو وصلت نسخة قديمة متأخرة)
  const r = ctx.nightReady;
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
  // قرار القتل انتقل لي (القائد ما وصلته مهمته) وشاشتي كانت على سؤال التمويه: تتبدل بشكل واضح
  // (سطر أحمر وقائمة حمراء) والضغط ما يشتغل ثانية ونص — عشان ضغطة نيتها التمويه ما تنزل قتل
  const handover = task.step === "mafia" && Boolean(task.handover) && !task.locked;
  const armed = useTapGuard(handover ? `handover:${ctx.room?.phase_seq ?? ""}` : null, HANDOVER_GUARD_MS);
  // لو كان نازل بقائمة التمويه: الشاشة تطلع للسطر الأحمر (وقت تجاهل الضغط، فما تأثر على ضغطة)
  const bannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (handover) bannerRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [handover]);
  // السريع، الساحر: شاشة وحدة للبطاقة والشخص
  if (task.step === "magician" && task.cards) return <MagicianFastCard ctx={ctx} task={task} />;
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
    <Panel className={handover ? "ring-2 ring-red-500/80" : ""}>
      {handover && (
        <div
          ref={bannerRef}
          role="alert"
          className="mb-3 flex scroll-mt-36 items-center justify-center gap-2 rounded-2xl bg-red-600 px-3 py-2.5 text-center text-[16px] font-black text-white animate-in zoom-in-95"
        >
          <Crown size={18} className="shrink-0 text-amber-200" />
          انتقل لك قرار القتل
        </div>
      )}
      <h2 className={`${H_PROMPT} mb-2`}>{prompt}</h2>

      {detectiveResult && <DetectiveResult result={detectiveResult} />}

      {!task.locked && (
        <>
          {task.step === "mafia" && (
            <p className="text-center text-[13px] font-black text-rose-300 -mt-1 mb-2.5">
              <Crown size={15} className="inline -mt-1 me-1 text-ludn-gold" />
              {handover ? "القائد ما وصلته الشاشة — اختيارك هو المعتمد" : "أنت قائد المافيا الليلة — اختيارك هو المعتمد"}
            </p>
          )}
          {task.step === "doctor" && (
            <p className={`${NOTE} -mt-1 mb-2.5`}>
              تقدر تحمي نفسك، بس مو نفس الشخص اللي حميته الليلة اللي قبل
            </p>
          )}
          {task.step === "silencer" && (
            <p className={`${NOTE} -mt-1 mb-2.5`}>
              تقدر تختار نفسك، بس مو نفس الشخص اللي سكّته الليلة اللي قبل
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
        disabled={task.locked || ctx.busy || !armed}
        accent={STEP_ACCENT[task.step]}
        tint={handover ? "red" : undefined}
        onPick={(id) => {
          if (armed) ctx.act(id);
        }}
      />

      {task.locked ? (
        <p className="mt-3 text-center text-[15px] font-black text-ludn-green">
          <Check size={18} className="inline -mt-1 me-1" />
          تم{chosenName ? `: ${chosenName}` : " — عدّيت الليلة"}
          {task.step === "magician" &&
            chosenName &&
            (chosenName === MAFIA_ROLES.soldier.label
              ? " — صرت الجندي من الحين، ومعك درع جديد"
              : " — صرت " + chosenName + " من الحين، ومهمتك تجيك هذي الليلة")}
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

/** سؤال الفئة لما ياخذها الساحر بالسريع — قصير عشان يركب بسطر العنوان على الجوال الصغير */
const CARD_PROMPT: Partial<Record<MafiaNightStep, string>> = {
  detective: "تشك بمين؟",
  doctor: "مين تحمي الليلة؟",
};

/**
 * النمط السريع، الساحر: شاشة وحدة بدون خطوة ثانية — يختار البطاقة والشخص بضغطة وحدة وطلب واحد.
 * - بطاقة وحدة: مهمتها مباشرة ("صرت المحقق، تشك بمين؟") بنفس شكل شاشة الفئة الأصلية.
 * - أكثر من بطاقة: أزرار صغيرة فوق، والتنقل بينها على الجهاز بس (بدون طلب)، وتحتها قائمة البطاقة المختارة.
 * - الجندي: زر "خذ الدرع" بدل القائمة.
 * بعد الاختيار الشاشة تتقفل على طول، وبعدها توصل شاشة الفئة الجديدة من السيرفر (مثل صاحبها الأصلي).
 */
function MagicianFastCard({ ctx, task }: { ctx: MafiaGameCtx; task: MafiaTask }) {
  const cards = task.cards ?? [];
  const single = cards.length === 1;
  const [pickedCard, setPickedCard] = useState<string | null>(single ? cards[0].id : null);
  const card = cards.find((c) => c.id === pickedCard) ?? (single ? cards[0] : null) ?? (task.locked ? cards[0] : null);
  const soldier = card?.role === "soldier";
  const roleStep = card && !soldier ? (card.role as MafiaNightStep) : null;
  const chosen = task.locked && card ? card.options.find((o) => o.id === task.selectedId) : undefined;

  const cardLine = (c: { label: string; role: string }) =>
    c.role === "soldier" ? `صرت ${c.label}؟ خذ درعك` : `صرت ${c.label}، ${CARD_PROMPT[c.role as MafiaNightStep]}`;
  // بعد ما ياخذ درع الجندي: العنوان يصير خبر مو سؤال
  const prompt = single && card ? (task.locked && soldier ? `صرت ${card.label}` : cardLine(card)) : "وش تبي تصير؟";

  return (
    <Panel>
      <h2 className={`${H_PROMPT} mb-2`}>{prompt}</h2>

      {!single && !task.locked && (
        <div className={`grid gap-2 mb-3 ${cards.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`} role="radiogroup" aria-label="البطاقات المتاحة">
          {cards.map((c) => {
            const on = c.id === pickedCard;
            return (
              // الأيقونة فوق والاسم تحت: الاسم ياخذ عرض الزر كامل فما ينقص حتى بثلاث بطاقات على جوال صغير
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={ctx.busy}
                onClick={() => setPickedCard(c.id)}
                className={`min-h-16 flex flex-col items-center justify-center gap-1 px-1.5 py-2 rounded-[14px] border border-b-[3px] font-black text-[14px] leading-tight transition-colors ${
                  on ? "bg-purple-600 border-purple-800 text-white" : "bg-ludn-surface-2 border-ludn-line border-b-black/40 text-ludn-fg"
                }`}
              >
                <RoleIcon role={c.role} className="w-7 h-7" />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {!single && !card && <p className={`${NOTE} mb-2`}>اضغط على بطاقة تشوف مهمتها — وما تصيرها إلا لما تختار الاسم أو الدرع</p>}

      {card && !single && !task.locked && <p className="text-center text-[15px] font-black mb-2">{cardLine(card)}</p>}

      {card && soldier && (
        <button type="button" disabled={task.locked || ctx.busy} onClick={() => ctx.act(null, card.id)} className={`${BTN_GOLD} mt-1`}>
          <Shield size={20} /> خذ الدرع
        </button>
      )}
      {card && roleStep && (
        <PlayerPicker
          options={card.options}
          selectedId={task.locked ? task.selectedId : null}
          disabled={task.locked || ctx.busy}
          accent={STEP_ACCENT[roleStep]}
          onPick={(id) => ctx.act(id, card.id)}
        />
      )}

      {task.locked ? (
        <p className="mt-3 text-center text-[15px] font-black text-ludn-green">
          <Check size={18} className="inline -mt-1 me-1" />
          تم{chosen ? `: ${chosen.name}` : ""}
          {card && ` — صرت ${card.label} من الحين${soldier ? "، ومعك درع جديد" : ""}`}
        </p>
      ) : (
        <>
          {card && !soldier && <OneTapNote />}
          <p className={`${NOTE} mt-2`}>
            مرة وحدة طول اللعبة — تصير {card ? card.label : "الفئة"} من لحظة اختيارك وتلعب بها الليلة
          </p>
          <button type="button" disabled={ctx.busy} onClick={() => ctx.act(null)} className={`${BTN_SOFT} w-full mt-3`}>
            <SkipForward size={18} /> عدّي الليلة واحتفظ بقدرتي
          </button>
          <p className={`${NOTE} mt-2`}>إذا عدّيت، قدرتك تظل لليلة الجاية</p>
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
