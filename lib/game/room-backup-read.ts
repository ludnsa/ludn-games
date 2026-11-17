"use client";

import { serverNow } from "@/lib/game/server-clock";

/**
 * القراءة الاحتياطية للغرفة: جوالات الفرق وشاشات الجمهور (المزاد، والسيطرة على العالم، وحرب القلاع)،
 * وحكم المزاد (مزايدات الفرق) وحكم حرب القلاع (خطط الفرق) — مثل المافيا.
 * وتحدي الفئات (المنشئ واللاعبين)، ومداقش (كل الأجهزة)، وشاشة خلية الحروف.
 *
 * قبل مؤقتات ساعة السيرفر، الحكم كان يكتب الغرفة كل ثانية، فالجهاز اللي يفوته تحديث بالبث يتصحح بالثانية اللي بعدها.
 * الحين يكتب مرة وحدة مع كل تغيير، فاللي يفوته تحديث يظل على شاشة قديمة لين التغيير الجاي.
 * فالجهاز يقرا الغرفة بنفسه:
 *  - أول ما يتصل البث، ولما يرجع اتصاله بعد انقطاع
 *  - لما يرجع اللاعب للتبويب، ولما يرجع النت (حدث online)
 *  - فحص دوري خفيف: لو مرت 10 ثواني بدون أي تحديث من البث ولا قراءة (والبث مقطوع: كل 4 ثواني).
 *    التبويب مخفي أو الجهاز بدون نت: ما نقرا (نقرا أول ما يرجع)
 *  - عدّاد الجهاز وصل صفر وما وصل أي تحديث من البث خلال ثانيتين: نقرا على طول (الحكم غالباً كتب شي ما وصلنا)
 *
 * القراءة ما تكتب فوق تحديث أحدث: لو وصل تحديث من البث وهي بالطريق، ردها ممكن يكون أقدم منه (النت بطيء)
 * فنتركه، والقراءة الجاية تجيب الأحدث. قراءة وحدة بنفس الوقت، وتنقطع لو ما ردت خلال 8 ثواني.
 */
export const BACKUP_READ_QUIET_MS = 10_000;
export const BACKUP_READ_OFFLINE_MS = 4_000;
const READ_TIMEOUT_MS = 8_000;
/** بعد صفر العدّاد: كم ننتظر تحديث من البث قبل ما نقرا بنفسنا */
export const ZERO_GRACE_MS = 2_000;

export type BackupReadCtx = {
  /** يقطع الطلب لو طوّل */
  signal: AbortSignal;
  /** نتيجة القراءة لسا صالحة؟ (ما وصل تحديث من البث وهي بالطريق، والصفحة ما قفلت) */
  isFresh: () => boolean;
};

export type BackupRead = {
  /** حالة اشتراك البث (من subscribe) */
  onStatus: (status: string) => void;
  /** وصل تحديث من البث */
  onEvent: () => void;
  /** قراءة الحين (مثلاً الصفحة رجعت من ذاكرة المتصفح) */
  readNow: () => void;
  /** موعد صفر العدّاد اللي على الشاشة (ساعة السيرفر)، أو null لو واقف. نفس الموعد مرتين ما يغيّر شي */
  watchDeadline: (endsAt: number | null) => void;
  stop: () => void;
};

export type BackupReadOptions = {
  /** الفحص الدوري والبث متصل: كم ثانية سكوت قبل ما نقرا (الافتراضي 10). شاشة خلية الحروف: 20 مثل قبل */
  quietMs?: number;
};

export function startBackupRead(read: (ctx: BackupReadCtx) => Promise<unknown>, opts: BackupReadOptions = {}): BackupRead {
  const quietMs = opts.quietMs ?? BACKUP_READ_QUIET_MS;
  let live = false;
  let stopped = false;
  /** آخر قراءة أو تحديث من البث (performance: ما يتأثر لو تغيّرت ساعة الجهاز) */
  let lastAt = performance.now();
  let events = 0;
  let busy = false;
  let again = false;
  /** آخر تحديث من البث بس (performance) */
  let lastEventAt = -Infinity;
  let zeroFor: number | null = null;
  let zeroTimer: ReturnType<typeof setTimeout> | null = null;

  const run = async () => {
    if (stopped) return;
    lastAt = performance.now();
    // قراءة شغالة: نعيدها بعد ما تخلص (السبب الجديد ممكن يكون بعد ما بدأت)
    if (busy) {
      again = true;
      return;
    }
    busy = true;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), READ_TIMEOUT_MS);
    const seen = events;
    try {
      await read({ signal: ctrl.signal, isFresh: () => !stopped && events === seen });
    } catch {
      // انقطع أو ما رد: الفحص الجاي أو البث يجيب الحالة
    } finally {
      clearTimeout(timer);
      busy = false;
    }
    if (again && !stopped) {
      again = false;
      void run();
    }
  };

  // صفر العدّاد + ثانيتين: لو ما وصل أي تحديث من البث من لحظة الصفر، نقرا. التبويب مخفي أو بدون نت: الرجوع يقرا
  const checkZero = (endsAt: number) => {
    zeroTimer = null;
    if (stopped || zeroFor !== endsAt) return;
    const sinceZero = serverNow() - endsAt;
    // ساعة السيرفر انضبطت وصار الموعد أبعد: نكمّل الانتظار
    if (sinceZero < ZERO_GRACE_MS - 50) {
      zeroTimer = setTimeout(() => checkZero(endsAt), ZERO_GRACE_MS - sinceZero);
      return;
    }
    if (performance.now() - lastEventAt < sinceZero) return;
    if (document.visibilityState !== "visible" || navigator.onLine === false) return;
    void run();
  };

  const onVisible = () => {
    if (document.visibilityState === "visible") void run();
  };
  const onOnline = () => void run();
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onOnline);

  const timer = setInterval(() => {
    if (document.visibilityState !== "visible" || navigator.onLine === false) return;
    if (performance.now() - lastAt < (live ? quietMs : BACKUP_READ_OFFLINE_MS)) return;
    void run();
  }, 1000);

  return {
    onStatus(status) {
      const wasLive = live;
      live = status === "SUBSCRIBED";
      if (live && !wasLive) void run();
    },
    onEvent() {
      events++;
      lastAt = performance.now();
      lastEventAt = lastAt;
    },
    readNow() {
      void run();
    },
    watchDeadline(endsAt) {
      if (stopped || endsAt === zeroFor) return;
      // المؤقت وقف بعد ما وصل صفر (مثلاً قراءة صادفت لحظة الصفر وجابت الوقفة قبل حركة المنشئ اللي بعدها):
      // فحص صفر+2ث يظل — لو ما وصل شي من البث من لحظة الصفر نقرا. الوقفة قبل الصفر تلغيه عادي
      if (endsAt === null && zeroFor !== null && serverNow() >= zeroFor) return;
      zeroFor = endsAt;
      if (zeroTimer) clearTimeout(zeroTimer);
      zeroTimer = null;
      if (endsAt === null) return;
      zeroTimer = setTimeout(() => checkZero(endsAt), Math.max(0, endsAt + ZERO_GRACE_MS - serverNow()));
    },
    stop() {
      stopped = true;
      clearInterval(timer);
      if (zeroTimer) clearTimeout(zeroTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    },
  };
}
