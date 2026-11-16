"use client";

import { useEffect } from "react";

/**
 * ساعة السيرفر للمؤقتات (المزاد، والسيطرة على العالم، وحرب القلاع).
 *
 * ساعة الجوال ممكن تكون مقدّمة أو متأخرة دقايق. لو كل جهاز يعد من وقت الانتهاء على ساعته هو،
 * الجوال المقدّم يشوف الوقت خلص قبل الكل، والمتأخر يشوف وقت زيادة.
 * فكل جهاز يقيس فرق ساعته عن ساعة السيرفر (/api/time) ويعد على أساسه، ووقت الانتهاء اللي ينكتب
 * بالقاعدة محسوب على ساعة السيرفر — فالكل يشوف نفس الرقم مهما كانت ساعة جهازه.
 *
 * القياس: كم طلب ورا بعض، ونأخذ أسرعها (أقل وقت ذهاب ورجوع)، ونعتبر إن السيرفر ختم الوقت بنص الرحلة.
 * لو فشل القياس (بدون نت): الفرق يظل صفر = ساعة الجهاز نفسه (مثل قبل).
 */
const SAMPLES = 4;
/** إعادة القياس كل كم (ولما ترجع الصفحة قدام بعد غياب) */
const RESYNC_MS = 5 * 60 * 1000;
const RESYNC_ON_RETURN_MS = 60 * 1000;
/** أقصى انتظار للقياس الأول قبل ما نكمّل مؤقت شغال (بعد تحديث الصفحة) */
const READY_WAIT_MS = 2500;

/** ساعة السيرفر - ساعة الجهاز (ms) */
let offset = 0;
/** وقت آخر قياس نجح (ساعة الجهاز)، و 0 = ما نجح ولا قياس */
let syncedAt = 0;
let inflight: Promise<void> | null = null;
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

/** يقيس فرق الساعة من جديد (طلب واحد بنفس الوقت مهما انطلب) */
export function syncServerClock(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    let best: { offset: number; rtt: number } | null = null;
    for (let i = 0; i < SAMPLES; i++) {
      const s = await sampleOnce();
      // كل قياس أسرع من اللي قبله ينطبق على طول (أول قياس يكفي للعد، والباقي يدققه)
      if (s && (!best || s.rtt < best.rtt)) {
        best = s;
        offset = s.offset;
        syncedAt = Date.now();
        markFirstSync?.();
        markFirstSync = null;
      }
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
 * عد تنازلي من وقت انتهاء (على ساعة السيرفر): ينادي onTick بالثواني الباقية، والدقة الجاية تنضبط على لحظة
 * تغيّر الرقم بالضبط (مو كل ربع ثانية) — فكل الأجهزة تقلب الرقم بنفس اللحظة، والرقم المعروض لحظة الإيقاف هو الصح.
 * يوقف عند الصفر. يرجّع دالة الإلغاء.
 */
export function startCountdown(endsAt: number, onTick: (left: number) => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;
  const step = () => {
    if (cancelled) return;
    const ms = endsAt - serverNow();
    const left = Math.max(0, Math.ceil(ms / 1000));
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
