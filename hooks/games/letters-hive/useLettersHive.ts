"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { initialHiveState, startHiveSession, type HiveState, type HiveTeam } from "@/lib/game/letters-hive-engine";
import { getMyHiveRoom, openHiveRoom, pingHiveSession, saveHiveRoom, startHiveRoom, type HiveAccess } from "@/actions/letters-hive";
import { HIVE_ROOM_CODE_RE } from "@/constants/letters-hive";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { createThrottledRunner } from "@/lib/throttled-runner";

/**
 * مزامنة خلية الحروف:
 * - السيرفر (hive_rooms) هو الأصل: الجلسة مربوطة بحساب المقدم وتكمل من أي جهاز،
 *   وشاشة العرض تنفتح من أي جوال أو جهاز بكود الغرفة وتتحدث لحظياً.
 * - نفس الجهاز (احتياط، مثل قبل): الحالة تنحفظ بذاكرة المتصفح وتنبث لنافذة العرض على طول.
 *   لو الغرفة الأونلاين مو متاحة أو النت ضعيف، اللعب يكمل والنافذة تتحدث، والحفظ يعيد المحاولة.
 * المحرك (lib/game/letters-hive-engine.ts) ما تغيّر: هذا الملف ينقل الحالة بس.
 */
const STORAGE_KEY = "letters_hive_state_v1";
/** صاحب الحالة المحفوظة بالمتصفح — ما نكمل من حالة حساب ثاني (لابتوب مشترك) */
const OWNER_KEY = "letters_hive_owner_v1";
const CHANNEL = "letters_hive";

/** room: كود الغرفة اللي تنتمي لها الحالة (null = نفس الجهاز بس) */
type Message = { type: "state"; state: HiveState; room: string | null } | { type: "hello" };

/**
 * الإشارة السريعة: بعد كل حفظ، المقدم يقول للشاشات "تغيّرت اللوحة" على قناة الغرفة،
 * والشاشة تقرا اللوحة من القاعدة (ما تاخذ اللوحة من الإشارة نفسها، فما أحد يقدر يزوّرها).
 */
const hintTopic = (code: string) => `hive:${code}`;
const HINT_EVENT = "changed";
/** الشاشة ما تقرا من القاعدة أكثر من مرة كل هالمدة، مهما كثرت الإشارات */
const REFETCH_GAP_MS = 300;

/**
 * قناة الإشارة: وحدة لكل غرفة بالصفحة. المكتبة ترجّع نفس القناة لنفس الاسم، و React (وضع التطوير)
 * يركّب المكوّن مرتين — فنستخدمها بالمشاركة، وتنقفل بعد ثانية لو ما بقى أحد يستخدمها.
 */
type HintEntry = {
  channel: RealtimeChannel;
  live: boolean;
  listeners: Set<() => void>;
  users: number;
  closeTimer: ReturnType<typeof setTimeout> | null;
};
const hintChannels = new Map<string, HintEntry>();

function acquireHint(code: string, listener?: () => void): { entry: HintEntry; release: () => void } | null {
  let entry = hintChannels.get(code);
  if (!entry) {
    try {
      const channel = getSupabaseBrowser().channel(hintTopic(code), { config: { broadcast: { self: false, ack: false } } });
      const created: HintEntry = { channel, live: false, listeners: new Set(), users: 0, closeTimer: null };
      channel.on("broadcast", { event: HINT_EVENT }, () => created.listeners.forEach((fn) => fn()));
      channel.subscribe((status) => {
        created.live = status === "SUBSCRIBED";
      });
      hintChannels.set(code, created);
      entry = created;
    } catch {
      return null; // ما قدرنا نفتح القناة: الشاشات توصلها التحديثات من البث الاحتياطي
    }
  }
  const e = entry;
  if (e.closeTimer) clearTimeout(e.closeTimer);
  e.closeTimer = null;
  e.users++;
  if (listener) e.listeners.add(listener);
  return {
    entry: e,
    release: () => {
      if (listener) e.listeners.delete(listener);
      e.users--;
      if (e.users > 0) return;
      e.closeTimer = setTimeout(() => {
        if (e.users > 0) return;
        hintChannels.delete(code);
        void getSupabaseBrowser().removeChannel(e.channel);
      }, 1000);
    },
  };
}

function readSaved(): HiveState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const s = raw ? (JSON.parse(raw) as HiveState) : null;
    return s && s.v === 1 && Array.isArray(s.owners) && Array.isArray(s.letters) ? s : null;
  } catch {
    return null; // تخزين المتصفح مقفل (نافذة خاصة مثلاً)
  }
}

function readOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function writeOwner(userId: string) {
  try {
    localStorage.setItem(OWNER_KEY, userId);
  } catch {
    // تخزين المتصفح مقفل
  }
}

function openChannel(): BroadcastChannel | null {
  return typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL);
}

/** وقت التحديث يزيد دايم (حتى لو ضغطتين بنفس الملي ثانية) — منه نعرف الأحدث، وهو رقم النسخة بالسيرفر */
const nextStamp = (prev: number) => Math.max(Date.now(), prev + 1);

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      }
    );
  });
}

type MyRoom = Extract<Awaited<ReturnType<typeof getMyHiveRoom>>, { success: true }>["data"];

/** loading → ready، أو failed (ما وصلنا للسيرفر) / login (انتهى تسجيل الدخول) */
export type HiveBoot = "loading" | "ready" | "failed" | "login";
export type HiveStartResult = "ok" | "no_access" | "error";
/** حالة الحفظ للشاشات: ok، أو retrying (النت ضعيف: اللعب مكمّل والحفظ يعيد المحاولة) */
export type HiveSaving = "ok" | "retrying";

/**
 * المقدم: الحالة عنده، وكل تغيير ينحفظ بالسيرفر (للشاشات من أي جهاز)
 * وبالمتصفح وينبث للنافذة على نفس الجهاز.
 */
export function useLettersHiveHost() {
  const [boot, setBoot] = useState<HiveBoot>("loading");
  const [state, setState] = useState<HiveState>(() => initialHiveState());
  const [roomCode, setRoomCode] = useState<string | null>(null);
  /** الغرفة الأونلاين متاحة (الجدول موجود والسيرفر رد) */
  const [online, setOnline] = useState(false);
  const [saving, setSaving] = useState<HiveSaving>("ok");
  const [notice, setNotice] = useState("");

  const stateRef = useRef(state);
  const readyRef = useRef(false);
  const roomRef = useRef<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  /** آخر حالة جات من السيرفر (أو انحفظت فيه مع البدء) — ما نرجّع نحفظها */
  const fromServerRef = useRef<HiveState | null>(null);
  const aliveRef = useRef(true);
  /** فحص الاشتراك اللي وصل مع الغرفة لما انفتحت الشاشة: شاشة الإعداد تاخذه أول مرة بس، وبعدها تفحص بنفسها */
  const bootAccessRef = useRef<HiveAccess | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** قناة الإشارة السريعة للشاشات (مع كود الغرفة) */
  const hintRef = useRef<HintEntry | null>(null);
  /** طابور الحفظ: طلب واحد بالمرة، ونرسل آخر حالة بس (الضغطات السريعة تنضم) */
  const queue = useRef<{ pending: HiveState | null; busy: boolean; timer: ReturnType<typeof setTimeout> | null; delay: number }>({
    pending: null,
    busy: false,
    timer: null,
    delay: 0,
  });

  /** "تغيّرت اللوحة" للشاشات — من القناة لو متصلة، وإلا طلب مباشر */
  const sendHint = useCallback((rev: number) => {
    const hint = hintRef.current;
    if (!hint) return;
    const payload = { rev };
    if (hint.live) void hint.channel.send({ type: "broadcast", event: HINT_EVENT, payload }).catch(() => {});
    else void hint.channel.httpSend(HINT_EVENT, payload).catch(() => {});
  }, []);

  const flash = useCallback((text: string) => {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 7000);
  }, []);

  /** نطبّق اللي في السيرفر: جلسة شغالة نكمل منها، وإلا نرجع لشاشة البداية (الأسماء والإعدادات تظل) */
  const apply = useCallback((data: MyRoom) => {
    const { userId, online: isOnline, room } = data;
    const cached = readOwner() === userId ? readSaved() : null;
    let next: HiveState;
    let code: string | null = null;
    let save = false;
    if (!isOnline) {
      // الغرفة الأونلاين مو متاحة: نفس الجهاز مثل قبل
      next = cached ?? initialHiveState();
    } else if (room?.active) {
      code = room.code;
      // النسخة اللي بالجهاز أحدث (الحفظ ما لحق قبل التحديث): نكملها ونحفظها. الجلسة نفسها انحسبت أصلاً
      save = cached?.status === "playing" && cached.updatedAt > room.rev;
      next = save && cached ? cached : room.state;
    } else {
      // ما فيه جلسة شغالة بالسيرفر: البداية. (حالة "شغالة" بذاكرة المتصفح ما تنفع بدون "ابدأ الجلسة")
      next = initialHiveState(room?.state ?? cached ?? undefined);
      code = room?.fresh ? room.code : null;
    }
    writeOwner(userId);
    queue.current.pending = null;
    fromServerRef.current = save ? null : next;
    roomRef.current = code;
    setRoomCode(code);
    setOnline(isOnline);
    setState(next);
  }, []);

  const load = useCallback(async () => {
    let res: Awaited<ReturnType<typeof getMyHiveRoom>> | null = null;
    for (let attempt = 0; attempt < 2 && !res; attempt++) {
      try {
        res = await withTimeout(getMyHiveRoom({ withAccess: true }), 10_000);
      } catch {
        res = null;
      }
    }
    if (!aliveRef.current) return;
    if (!res) return setBoot("failed");
    if (!res.success) return setBoot(res.error === "login" ? "login" : "failed");
    bootAccessRef.current = res.data.access ?? null;
    apply(res.data);
    readyRef.current = true;
    setBoot("ready");
  }, [apply]);

  /** جهاز ثاني غيّر الجلسة: ناخذ اللي بالسيرفر */
  const resync = useCallback(
    async (why: string) => {
      try {
        const res = await withTimeout(getMyHiveRoom(), 10_000);
        if (!aliveRef.current || !res.success) return;
        apply(res.data);
        flash(why);
      } catch {
        // نجرب مع الحركة الجاية
      }
    },
    [apply, flash]
  );

  const flush = useCallback(
    async function flushQueue(): Promise<void> {
      const q = queue.current;
      if (q.busy || q.timer || !q.pending) return;
      const code = roomRef.current;
      if (!code) {
        q.pending = null;
        return;
      }
      const s = q.pending;
      q.pending = null;
      q.busy = true;
      let retry = false;
      try {
        const res = await withTimeout(saveHiveRoom({ roomCode: code, state: s, rev: s.updatedAt }), 12_000);
        if (!res.success) {
          // invalid: الحالة نفسها فيها مشكلة، ما نعيدها
          retry = res.error !== "invalid";
          if (!retry) console.error("letters-hive: save rejected (invalid state)");
        } else if (res.data.result === "gone") {
          roomRef.current = null;
          setRoomCode(null);
          flash("الغرفة الأونلاين انقفلت — اللعب مكمّل، وشاشة العرض على هالجهاز بس.");
        } else if (res.data.result === "ended") {
          q.busy = false;
          await resync("الجلسة انتهت من جهاز ثاني.");
          return;
        } else if (res.data.result === "older") {
          q.busy = false;
          await resync("تحدثت اللوحة من جهاز ثاني.");
          return;
        } else {
          // انحفظت: الشاشات تقرا الحين بدل ما تنتظر البث من القاعدة
          sendHint(s.updatedAt);
        }
      } catch {
        retry = true; // انقطع النت أو تأخر السيرفر
      }
      q.busy = false;
      if (!aliveRef.current) return;
      if (retry) {
        if (!q.pending) q.pending = s;
        q.delay = Math.min(q.delay ? q.delay * 2 : 1000, 10_000);
        setSaving("retrying");
        q.timer = setTimeout(() => {
          q.timer = null;
          void flushQueue();
        }, q.delay);
        return;
      }
      q.delay = 0;
      setSaving("ok");
      if (q.pending) void flushQueue();
    },
    [flash, resync, sendHint]
  );

  // قناة الإشارة السريعة: تنفتح مع كود الغرفة (المقدم يرسل بس، ما يسمع)
  useEffect(() => {
    if (!roomCode) return;
    const hint = acquireHint(roomCode);
    if (!hint) return;
    hintRef.current = hint.entry;
    return () => {
      if (hintRef.current === hint.entry) hintRef.current = null;
      hint.release();
    };
  }, [roomCode]);

  useEffect(() => {
    aliveRef.current = true;
    const ch = openChannel();
    channelRef.current = ch;
    // شاشة عرض انفتحت على نفس الجهاز: تطلب آخر حالة
    if (ch) {
      ch.onmessage = (e: MessageEvent<Message>) => {
        if (e.data?.type === "hello" && readyRef.current) {
          ch.postMessage({ type: "state", state: stateRef.current, room: roomRef.current } satisfies Message);
        }
      };
    }
    void load();
    const q = queue.current;
    return () => {
      aliveRef.current = false;
      ch?.close();
      channelRef.current = null;
      if (q.timer) clearTimeout(q.timer);
      q.timer = null;
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, [load]);

  useEffect(() => {
    stateRef.current = state;
    if (boot !== "ready") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // تخزين المتصفح مقفل: البث يكفي
    }
    channelRef.current?.postMessage({ type: "state", state, room: roomRef.current } satisfies Message);
    if (state !== fromServerRef.current && roomRef.current) {
      queue.current.pending = state;
      void flush();
    }
  }, [state, boot, flush]);

  // جلسات اللعب: صفحة المقدم ترسل كل دقيقة والجلسة شغالة. منها يعرف السيرفر إن المقدم موجود
  // (بعد 10 دقايق تنحسب)، ولو طلع وبدأ جلسة ثانية بعد 3 دقايق ترجع تجربة هذي
  const sessionLive = boot === "ready" && state.status === "playing";
  useEffect(() => {
    if (!sessionLive) return;
    const ping = () => void pingHiveSession().catch(() => {});
    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    ping();
    const id = setInterval(ping, 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sessionLive]);

  const update = useCallback(
    (fn: (s: HiveState) => HiveState) => setState((s) => ({ ...fn(s), updatedAt: nextStamp(s.updatedAt) })),
    []
  );

  /** "ابدأ الجلسة": السيرفر يتأكد من الاشتراك ويحسبها مرة وحدة، ويجهّز الغرفة */
  const start = useCallback(async (teams: Record<HiveTeam, string>, hardLetters: boolean): Promise<HiveStartResult> => {
    const cur = stateRef.current;
    const next = { ...startHiveSession(cur, teams, hardLetters), updatedAt: nextStamp(cur.updatedAt) };
    let res: Awaited<ReturnType<typeof startHiveRoom>>;
    try {
      res = await withTimeout(startHiveRoom({ state: next }), 20_000);
    } catch {
      return "error";
    }
    if (!res.success && res.error === "busy") {
      // فيه جلسة محجوزة لهالحساب (مثلاً "ابدأ" الأول وصل للسيرفر ورده ما وصل): نكمل منها بدل ما تنحجز ثانية
      try {
        const mine = await withTimeout(getMyHiveRoom(), 10_000);
        if (mine.success && mine.data.room?.active && aliveRef.current) {
          apply(mine.data);
          return "ok";
        }
      } catch {
        // نرجع خطأ عادي ويحاول مرة ثانية
      }
      return "error";
    }
    if (!res.success) return res.error === "no_access" ? "no_access" : "error";
    queue.current.pending = null;
    fromServerRef.current = next;
    roomRef.current = res.data.roomCode;
    setRoomCode(res.data.roomCode);
    setSaving("ok");
    setState(next);
    // الشاشات اللي فاتحة الكود من قبل البدء تقرا على طول (لو الغرفة جديدة، البث من القاعدة يوصلها)
    if (res.data.roomCode) sendHint(next.updatedAt);
    return "ok";
  }, [sendHint, apply]);

  /** نافذة شاشة العرض قبل البدء: نجهّز الغرفة (بدون ما ينحسب شي) ونرجّع كودها */
  const ensureRoom = useCallback(async (): Promise<string | null> => {
    if (roomRef.current) return roomRef.current;
    const cur = stateRef.current;
    // جلسة بدأت على نفس الجهاز بس (الغرفة ما تجهزت وقتها): الكود من الجلسة الجاية
    if (cur.status !== "setup") return null;
    try {
      const res = await withTimeout(openHiveRoom({ state: cur }), 12_000);
      if (res.success && res.data.roomCode && aliveRef.current) {
        roomRef.current = res.data.roomCode;
        setRoomCode(res.data.roomCode);
        setOnline(true);
        return res.data.roomCode;
      }
    } catch {
      // نفس الجهاز بس
    }
    return null;
  }, []);

  const reload = useCallback(() => {
    setBoot("loading");
    void load();
  }, [load]);

  /** يرجّع فحص الاشتراك اللي وصل مع فتح الشاشة مرة وحدة (بعدها null) */
  const takeBootAccess = useCallback((): HiveAccess | null => {
    const access = bootAccessRef.current;
    bootAccessRef.current = null;
    return access;
  }, []);

  return { boot, state, update, start, ensureRoom, reload, roomCode, online, saving, notice, takeBootAccess };
}

/** صيغة الكود صحيحة؟ (H + 4) */
export const isHiveRoomCode = (code: string | null): code is string => Boolean(code && HIVE_ROOM_CODE_RE.test(code));

/**
 * شاشة العرض:
 * - بكود (?code=): تقرا الغرفة من السيرفر وتسمع لكل تعديل لحظياً، من أي جهاز.
 * - بدون كود (نافذة من نفس جهاز المقدم): مثل قبل، من ذاكرة المتصفح والبث.
 * والاثنين يسمعون لنافذة المقدم على نفس الجهاز (أسرع)، والأحدث هو اللي ينعرض.
 * found: checking (نتأكد من الكود)، yes، no (ما فيه غرفة بهالكود أو انتهت).
 */
export function useLettersHiveDisplay(code: string | null): { state: HiveState | null; found: "checking" | "yes" | "no" } {
  const valid = isHiveRoomCode(code);
  const [state, setState] = useState<HiveState | null>(() => (code ? null : readSaved()));
  const [found, setFound] = useState<"checking" | "yes" | "no">(() => (!code ? "yes" : valid ? "checking" : "no"));
  const currentRef = useRef(state);

  const accept = useCallback((s: HiveState | null | undefined) => {
    if (!s || s.v !== 1 || !Array.isArray(s.owners)) return;
    const cur = currentRef.current;
    // نفس النسخة (جات من طريقين) أو أقدم وصلت متأخرة: نتجاهلها
    if (cur && s.updatedAt <= cur.updatedAt) return;
    currentRef.current = s;
    setState(s);
  }, []);

  // نفس الجهاز: نافذة المقدم تبث على طول
  useEffect(() => {
    if (code && !valid) return;
    const ch = openChannel();
    if (ch) {
      ch.onmessage = (e: MessageEvent<Message>) => {
        if (e.data?.type === "state" && (!code || e.data.room === code)) accept(e.data.state);
      };
      ch.postMessage({ type: "hello" } satisfies Message);
    }
    // احتياط لو البث مو مدعوم (بدون كود بس): التخزين يبلّغ النوافذ الثانية بكل تغيير
    const onStorage = (e: StorageEvent) => {
      if (code || e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        accept(JSON.parse(e.newValue) as HiveState);
      } catch {
        // قيمة تالفة — نتجاهلها
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      ch?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [code, valid, accept]);

  // من أي جهاز: الغرفة بالكود. أسرع طريق: إشارة المقدم ← نقرا من القاعدة.
  // واحتياط: البث من القاعدة نفسها (postgres_changes) + سؤال دوري + لما الجوال يرجع للمتصفح.
  useEffect(() => {
    if (!code || !valid) return;
    const supabase = getSupabaseBrowser();
    let live = false;
    let stopped = false;

    const fetchRoom = async () => {
      const { data, error } = await supabase.from("hive_rooms").select("state").eq("room_code", code).maybeSingle();
      if (stopped || error) return; // مشكلة اتصال: نجرب بعدين
      if (!data) return setFound("no");
      setFound("yes");
      accept(data.state as HiveState);
    };
    // كل القراءات تمر من هنا: مرة كل 300ms بالكثير، والطلبات اللي بينها تنجمع في قراءة وحدة بعدها
    const refetch = createThrottledRunner(fetchRoom, REFETCH_GAP_MS);

    // الإشارة ما فيها لوحة — بس تقول "اقرا الحين"
    const hint = acquireHint(code, () => refetch.trigger());

    const channel = supabase
      .channel(`hive_display_${code}_${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "hive_rooms", filter: `room_code=eq.${code}` }, (payload) => {
        const row = payload.new as { state?: HiveState } | null;
        if (row?.state) {
          setFound("yes");
          accept(row.state);
        }
      })
      .subscribe((status) => {
        live = status === "SUBSCRIBED";
        // اتصل (أو رجع اتصل): نجيب آخر نسخة عشان ما يفوتنا شي وقت الانقطاع
        if (live) refetch.trigger();
      });

    refetch.trigger();
    // الجوال طلع من المتصفح ورجع
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch.trigger();
    };
    document.addEventListener("visibilitychange", onVisible);
    // احتياط: لو البث اللحظي مو متصل نسأل كل 4 ثواني، ولو متصل كل 20 ثانية
    let ticks = 0;
    const safety = setInterval(() => {
      ticks++;
      if (!live || ticks % 5 === 0) refetch.trigger();
    }, 4000);

    return () => {
      stopped = true;
      refetch.stop();
      hint?.release();
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(safety);
      void supabase.removeChannel(channel);
    };
  }, [code, valid, accept]);

  return { state, found };
}
