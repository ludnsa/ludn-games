"use client";

import { useEffect } from "react";

/**
 * ساعة السيرفر للمؤقتات (المزاد، والسيطرة على العالم، وحرب القلاع، والمافيا).
 *
 * ساعة الجوال ممكن تكون مقدّمة أو متأخرة دقايق. لو كل جهاز يعد من وقت الانتهاء على ساعته هو،
 * الجوال المقدّم يشوف الوقت خلص قبل الكل، والمتأخر يشوف وقت زيادة.
 * فكل جهاز يقيس فرق ساعته عن ساعة السيرفر (/api/time) ويعد على أساسه، ووقت الانتهاء اللي ينكتب
 * بالقاعدة محسوب على ساعة السيرفر — فالكل يشوف نفس الرقم مهما كانت ساعة جهازه.
 *
 * القياس: كم طلب ورا بعض، ونأخذ أسرعها (أقل وقت ذهاب ورجوع)، ونعتبر إن السيرفر ختم الوقت بنص الرحلة.
 * لو فشل القياس (بدون نت): الفرق يظل صفر = ساعة الجهاز نفسه (مثل قبل).
 *
 * إعادة القياس (كل 5 دقايق): النت وقتها ممكن يكون أبطأ من أول مرة، والقياس البطيء يميل لين نص الرحلة.
 * فما نطبّق إلا أفضل عينة، وبشرط إنها مو أسوأ بوضوح من القياس الحالي — وإلا نخلي القديم.
 * (إلا لو القياس الجديد يثبت إن القديم غلط: ساعة الجوال نفسها تغيّرت.)
 * ولو أول قياس كان بطيء (أو فشل)، نعيده مرة بعد 30 ثانية.
 */
const SAMPLES = 4;
/** عينة إعادة القياس "أسوأ بوضوح" لو وقت رحلتها أكثر من وقت رحلة القياس الحالي × 1.5 + 50ms */
const WORSE_RTT_FACTOR = 1.5;
const WORSE_RTT_MARGIN_MS = 50;
/** هامش فوق نص الرحلة: لو بعد القياس الجديد عن الحالي أكثر من كذا، الحالي غلط أكيد (الساعة تغيّرت) */
const JUMP_MARGIN_MS = 100;
/**
 * أول قياس بطيء (أسرع عينة رحلتها أكثر من كذا = غلطه ممكن يوصل نصها) أو فشل كله: نعيد القياس مرة وحدة
 * بعد 30 ثانية — مثلاً لو الخادم كان مزحوم لحظة دخول الكل مع بعض. ينطبق بنفس شرط إعادة القياس
 */
const SLOW_FIRST_RTT_MS = 300;
const EARLY_RESYNC_MS = 30 * 1000;
/** إعادة القياس كل كم (ولما ترجع الصفحة قدام بعد غياب) */
const RESYNC_MS = 5 * 60 * 1000;
const RESYNC_ON_RETURN_MS = 60 * 1000;
/** أقصى انتظار للقياس الأول قبل ما نكمّل مؤقت شغال (بعد تحديث الصفحة) */
const READY_WAIT_MS = 2500;

/** ساعة السيرفر - ساعة الجهاز (ms) */
let offset = 0;
/** وقت رحلة العينة اللي جاب منها الفرق الحالي (كل ما قل، كان أدق) */
let offsetRtt = Infinity;
/** وقت آخر قياس نجح (ساعة الجهاز)، و 0 = ما نجح ولا قياس */
let syncedAt = 0;
let inflight: Promise<void> | null = null;
/** إعادة القياس بعد 30 ثانية (لو أول قياس بطيء) انجدولت؟ مرة وحدة بس بالصفحة */
let earlyResyncPlanned = false;
/** يتحقق مع أول قياس ينجح (اللي ينتظرون الساعة ما يستنون باقي القياسات) */
let markFirstSync: (() => void) | null = null;
const firstSync = new Promise<void>((resolve) => {
  markFirstSync = resolve;
});

async function sampleOnce(): Promise<{ offset: number; rtt: number } | null> {
  try {
    const sentAt = Date.now();
    const t0 = performance.now();
    const res = await fetch("/api/time", { cache: "no-store" });
    const rtt = performance.now() - t0;
    if (!res.ok) return null;
    const body = (await res.json()) as { now?: unknown };
    if (typeof body.now !== "number" || !Number.isFinite(body.now)) return null;
    return { offset: body.now - (sentAt + rtt / 2), rtt };
  } catch {
    return null;
  }
}

function applySample(s: { offset: number; rtt: number }) {
  offset = s.offset;
  offsetRtt = s.rtt;
  syncedAt = Date.now();
  markFirstSync?.();
  markFirstSync = null;
}

/**
 * عينة إعادة القياس تنطبق؟ لو مو أسوأ بوضوح من الحالية: إيه. لو أسوأ بوضوح: نخلي الحالي —
 * إلا لو بعدها عنه أكثر من نص رحلتها (+ هامش): السيرفر ختم الوقت بين الإرسال والوصول، فالفرق الصحيح
 * داخل ± نص الرحلة من العينة. لو الحالي برا هالمدى، فهو غلط أكيد (ساعة الجوال تغيّرت) والعينة أصح منه
 */
function resyncAccepts(s: { offset: number; rtt: number }): boolean {
  if (s.rtt <= offsetRtt * WORSE_RTT_FACTOR + WORSE_RTT_MARGIN_MS) return true;
  return Math.abs(s.offset - offset) > s.rtt / 2 + JUMP_MARGIN_MS;
}

/** يقيس فرق الساعة من جديد (طلب واحد بنفس الوقت مهما انطلب) */
export function syncServerClock(): Promise<void> {
  if (inflight) return inflight;
  // أول قياس بالصفحة: كل عينة أسرع من اللي قبلها تنطبق على طول (العد يبدأ بأسرع وقت، والباقي يدققه).
  // إعادة القياس: أفضل عينة من الأربع بس، بعد ما يخلصون — عينة بطيئة ما تلمس فرق شغال ولو للحظة
  const first = syncedAt === 0;
  inflight = (async () => {
    let best: { offset: number; rtt: number } | null = null;
    for (let i = 0; i < SAMPLES; i++) {
      const s = await sampleOnce();
      if (!s || (best && s.rtt >= best.rtt)) continue;
      best = s;
      if (first) applySample(s);
    }
    if (!first && best) {
      if (resyncAccepts(best)) applySample(best);
      // أسوأ بوضوح: الفرق الحالي يظل، بس القياس صار (ما نعيده قبل موعده الجاي)
      else syncedAt = Date.now();
    }
    // أول قياس بطيء أو فشل: نعيده بعد 30 ثانية (مرة وحدة)، بدل ما ننتظر 5 دقايق
    if (first && !earlyResyncPlanned && offsetRtt > SLOW_FIRST_RTT_MS) {
      earlyResyncPlanned = true;
      setTimeout(() => void syncServerClock(), EARLY_RESYNC_MS);
    }
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

// القياس يبدأ أول ما تنحمّل الصفحة (قبل ما تنقرا الغرفة)، عشان يكون جاهز قبل أول رقم ينعرض
if (typeof window !== "undefined") void syncServerClock();

/** الوقت الحين على ساعة السيرفر (ms) — بدل Date.now() بكل حساب مؤقت */
export function serverNow(): number {
  return Date.now() + offset;
}

/**
 * أقل رقم انعرض لكل وقت انتهاء: العداد ما يرجع لرقم أكبر بنفس المؤقت (لو تعدّل فرق الساعة بإعادة القياس).
 * محفوظ لكل وقت انتهاء، مو لكل عد: بعض الشاشات تعيد تشغيل العد مع كل دقة (حرب القلاع) ويكمل من نفس الرقم.
 * وقت انتهاء جديد (مرحلة جديدة، أو المنشئ غيّر الوقت) = عد جديد يبدأ من رقمه عادي.
 */
const lowestShown = new Map<number, number>();
const KEEP_ENDS = 8;

function neverBack(endsAt: number, left: number): number {
  const prev = lowestShown.get(endsAt);
  const shown = prev === undefined ? left : Math.min(prev, left);
  lowestShown.delete(endsAt);
  lowestShown.set(endsAt, shown);
  if (lowestShown.size > KEEP_ENDS) lowestShown.delete(lowestShown.keys().next().value as number);
  return shown;
}

/**
 * عد تنازلي من وقت انتهاء (على ساعة السيرفر): ينادي onTick بالثواني الباقية، والدقة الجاية تنضبط على لحظة
 * تغيّر الرقم بالضبط (مو كل ربع ثانية) — فكل الأجهزة تقلب الرقم بنفس اللحظة، والرقم المعروض لحظة الإيقاف هو الصح.
 * الرقم ما يرجع لفوق بنفس وقت الانتهاء (يوقف عليه لين يلحقه الوقت). يوقف عند الصفر. يرجّع دالة الإلغاء.
 */
export function startCountdown(endsAt: number, onTick: (left: number) => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;
  const step = () => {
    if (cancelled) return;
    const ms = endsAt - serverNow();
    const left = neverBack(endsAt, Math.max(0, Math.ceil(ms / 1000)));
    onTick(left);
    if (left === 0) return;
    // لين يتغير الرقم (+ هامش صغير)، وبحد أقصى ربع ثانية (لو تغيّر فرق الساعة بإعادة القياس)
    const untilChange = ms - (left - 1) * 1000;
    timer = setTimeout(step, Math.min(250, Math.max(5, untilChange + 5)));
  };
  timer = setTimeout(step, 0);
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}

/** ينتظر أول قياس (بحد أقصى) — قبل ما نكمّل مؤقت شغال من وقت انتهاء محفوظ */
export function whenServerClockReady(maxWaitMs = READY_WAIT_MS): Promise<void> {
  if (syncedAt) return Promise.resolve();
  // لو فشلت كل القياسات (بدون نت)، المهلة تخلص ونكمّل على ساعة الجهاز (مثل قبل)
  void syncServerClock();
  return Promise.race([firstSync, new Promise<void>((resolve) => setTimeout(resolve, maxWaitMs))]);
}

/** يشغّل القياس مع فتح الصفحة، ويعيده كل 5 دقايق ولما ترجع الصفحة قدام */
export function useServerClock(): void {
  useEffect(() => {
    if (!syncedAt || Date.now() - syncedAt > RESYNC_MS) void syncServerClock();
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - syncedAt > RESYNC_ON_RETURN_MS) void syncServerClock();
    };
    document.addEventListener("visibilitychange", onVisible);
    const id = setInterval(() => void syncServerClock(), RESYNC_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(id);
    };
  }, []);
}
