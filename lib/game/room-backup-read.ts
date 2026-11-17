"use client";

/**
 * القراءة الاحتياطية للغرفة: جوالات الفرق وشاشات الجمهور (المزاد، والسيطرة على العالم، وحرب القلاع) — مثل المافيا.
 *
 * قبل مؤقتات ساعة السيرفر، الحكم كان يكتب الغرفة كل ثانية، فالجهاز اللي يفوته تحديث بالبث يتصحح بالثانية اللي بعدها.
 * الحين يكتب مرة وحدة مع كل تغيير، فاللي يفوته تحديث يظل على شاشة قديمة لين التغيير الجاي.
 * فالجهاز يقرا الغرفة بنفسه:
 *  - أول ما يتصل البث، ولما يرجع اتصاله بعد انقطاع
 *  - لما يرجع اللاعب للتبويب، ولما يرجع النت (حدث online)
 *  - فحص دوري خفيف: لو مرت 10 ثواني بدون أي تحديث من البث ولا قراءة (والبث مقطوع: كل 4 ثواني).
 *    التبويب مخفي أو الجهاز بدون نت: ما نقرا (نقرا أول ما يرجع)
 *
 * القراءة ما تكتب فوق تحديث أحدث: لو وصل تحديث من البث وهي بالطريق، ردها ممكن يكون أقدم منه (النت بطيء)
 * فنتركه، والقراءة الجاية تجيب الأحدث. قراءة وحدة بنفس الوقت، وتنقطع لو ما ردت خلال 8 ثواني.
 */
export const BACKUP_READ_QUIET_MS = 10_000;
export const BACKUP_READ_OFFLINE_MS = 4_000;
const READ_TIMEOUT_MS = 8_000;

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
  stop: () => void;
};

export function startBackupRead(read: (ctx: BackupReadCtx) => Promise<unknown>): BackupRead {
  let live = false;
  let stopped = false;
  /** آخر قراءة أو تحديث من البث (performance: ما يتأثر لو تغيّرت ساعة الجهاز) */
  let lastAt = performance.now();
  let events = 0;
  let busy = false;
  let again = false;

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

  const onVisible = () => {
    if (document.visibilityState === "visible") void run();
  };
  const onOnline = () => void run();
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onOnline);

  const timer = setInterval(() => {
    if (document.visibilityState !== "visible" || navigator.onLine === false) return;
    if (performance.now() - lastAt < (live ? BACKUP_READ_QUIET_MS : BACKUP_READ_OFFLINE_MS)) return;
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
    },
    readNow() {
      void run();
    },
    stop() {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    },
  };
}
