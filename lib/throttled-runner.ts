/**
 * يشغّل run بحد أقصى مرة كل gapMs (throttle):
 * - أول طلب يشتغل على طول.
 * - الطلبات اللي تجي قبل ما تمر المدة (أو وتشغيل ما خلص) تنجمع في تشغيل واحد بعدها.
 * - ما يشتغل مرتين بنفس الوقت.
 * مثال: شاشة عرض خلية الحروف توصلها إشارات "تغيّرت اللوحة" — مهما كثرت، تقرا من القاعدة مرة كل 300ms بالكثير.
 */
export function createThrottledRunner(run: () => unknown, gapMs: number, now: () => number = Date.now) {
  let lastStart = Number.NEGATIVE_INFINITY;
  let running = false;
  let queued = false;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const start = async () => {
    timer = null;
    if (stopped) return;
    queued = false;
    running = true;
    lastStart = now();
    try {
      await run();
    } catch {
      // run يتعامل مع أخطائه — نكمل عادي
    }
    running = false;
    if (queued) schedule();
  };

  const schedule = () => {
    if (stopped || timer || running) return;
    const wait = Math.max(0, lastStart + gapMs - now());
    if (wait === 0) void start();
    else timer = setTimeout(() => void start(), wait);
  };

  return {
    /** اطلب تشغيل (ينجمع مع اللي قبله لو ما مرت المدة) */
    trigger() {
      if (stopped) return;
      queued = true;
      schedule();
    },
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
