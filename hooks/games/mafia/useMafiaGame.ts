"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { addMafiaBots, devGetMafiaRoles, type MafiaMyView, type MafiaTask } from "@/actions/mafia";
import { MAFIA_SKIP_KEY, isFastMafia, mafiaNightSteps, silencedPlayerId } from "@/lib/game/mafia-engine";
import { MAFIA_CONFIG } from "@/constants/mafia";
import { serverNow, startCountdown, useServerClock, whenServerClockReady } from "@/lib/game/server-clock";
import { getMafiaSoundTiming, playMafiaSound, unlockMafiaAudio, type MafiaSound } from "@/lib/game/mafia-sounds";
import { cueMafia, type MafiaFxKind } from "@/lib/game/mafia-fx";
import type {
  MafiaAnnouncement,
  MafiaAnnouncementKind,
  MafiaNightStep,
  MafiaPlayer,
  MafiaRole,
  MafiaRoom,
  MafiaSettings,
} from "@/types";

export interface MafiaSession {
  roomCode: string;
  token: string;
  /** هذا الجهاز سوّى الغرفة (المنشئ) — اللاعب العادي يتخيّر يرجع لها أو يسوي غرفته */
  host?: boolean;
}

type Cue = [MafiaSound, MafiaFxKind?];

const STEP_DONE_CUE: Record<MafiaNightStep, Cue> = {
  doctor: ["heal", "saved"],
  mafia: ["horror", "kill"],
  detective: ["dramatic", "investigate"],
  magician: ["magic", "magic"],
  journalist: ["camera", "flash"],
  suicide: ["tick"],
  silencer: ["tick"],
};

const ANNOUNCEMENT_CUE: Partial<Record<MafiaAnnouncementKind, Cue>> = {
  kill: ["horror", "kill"],
  saved: ["heal", "saved"],
  soldier: ["shield", "shield"],
  bomb: ["bomb", "bomb"],
  investigate_hit: ["dramatic", "reveal_mafia"],
  investigate_miss: ["womp", "miss"],
  magic: ["magic", "magic"],
  journalist: ["camera", "flash"],
};

/**
 * متى تطلع كل نتيجة من نتائج الصباح (بالملي ثانية من بداية الصباح).
 * كل نتيجة تنتظر صوت اللي قبلها يخلص تقريباً، فالرعب ما يتداخل مع التحقيق.
 * MafiaMorning يستخدم نفس الجدول للحركة، فالنص والصوت يطلعون مع بعض.
 */
export function mafiaMorningSchedule(announcements: MafiaAnnouncement[]): number[] {
  const schedule: number[] = [];
  let at = 900;
  announcements.forEach((a) => {
    schedule.push(at);
    const cue = ANNOUNCEMENT_CUE[a.kind];
    const secs = cue ? getMafiaSoundTiming(cue[0]).duration : 0;
    at += Math.min(4500, Math.max(1800, secs * 850));
  });
  return schedule;
}

/** اختيار الليل ما وصل للسيرفر بعد كل المحاولات (النت انقطع): نرجّع الشاشة عشان يضغط من جديد بدل ما يعلق */
const OFFLINE_ERROR = "ما وصل اختيارك — تأكد من النت واضغط مرة ثانية";
/** ضغطة المنشئ أو الصوت ما وصل بعد كل المحاولات */
const PRESS_OFFLINE_ERROR = "ما وصلت ضغطتك — تأكد من النت واضغط مرة ثانية";

/** مهلة طلبات اللعب: الطلب اللي ما رد خلالها ينقطع وينعاد، بدل ما يعلق الجوال وراه */
const MAFIA_REQUEST_TIMEOUT_MS = 4000;
/** اختيار الليل وجواب التمويه: كم مرة نعيد الطلب (كل وحدة بمهلتها) قبل ما نقول "ما وصل" */
const MAFIA_PICK_ATTEMPTS = 8;
/**
 * مهلة المحاولة رقم n (من صفر): أول وحدة 4 ثواني، وكل إعادة أطول بثانيتين لين 10 —
 * لو السيرفر أو النت بطيء دايماً (أكثر من 4 ثواني) الطلب ينقطع كل مرة وما يوصل أبداً، فالإعادة تعطيه وقت أكثر
 */
const attemptTimeout = (n: number) => Math.min(10_000, MAFIA_REQUEST_TIMEOUT_MS + 2000 * n);
/** طلب الانتقال (يسوي شغل أكثر بالسيرفر، والمرحلة الجديدة توصل بالبث): ننتظره أطول وما نكرره وهو شغال */
const MAFIA_ADVANCE_TIMEOUT_MS = 20000;
/** القراءة الاحتياطية للغرفة: البث اللحظي شغال = كل 10 ثواني، مقطوع = كل 4 */
const SAFETY_POLL_LIVE_MS = 10_000;
const SAFETY_POLL_OFFLINE_MS = 4_000;
/** حالتي الخاصة ما وصلت خلال هالوقت (أو فشلت محاولة): نقول للاعب إن النت ضعيف وإننا نحاول */
const WEAK_NET_AFTER_MS = 5_000;
/** نبضة جلسة المنشئ: كل دقيقة، ولو ما وصلت نعيدها بسرعة (كل 3 ثواني وتزيد لين 15) */
const SESSION_PING_MS = 60_000;
/**
 * وضع التجربة (localhost بـ next dev بس): نفس الشرط اللي بالسيرفر (IS_DEV بـ actions/mafia.ts) —
 * Next يحط قيمة NODE_ENV وقت البناء بالسيرفر والمتصفح، فما نحتاج طلب نسأل فيه السيرفر
 */
const DEV_MODE = process.env.NODE_ENV !== "production";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type MafiaApiResult<T> = { success: true; data?: T } | { success: false; error: string; network?: true };

type MafiaPlayerOp = "view" | "seen" | "got" | "advance" | "lead" | "act" | "decoy" | "vote" | "sheikh" | "rename";
/** أزرار المنشئ: بحسابه المسجّل (مو مفتاح اللاعب) */
type MafiaHostOp =
  | "host-ping"
  | "host-start"
  | "host-skip"
  | "host-discussion"
  | "host-discussion-time"
  | "host-hush"
  | "host-cheat"
  | "host-end"
  | "host-again"
  | "host-kick"
  | "host-settings"
  | "host-new-room"
  | "host-close";

/**
 * طلب لعب من الجوال (app/api/mafia/[op]): طلب عادي ينقطع بعد المهلة، مو دالة سيرفر —
 * دوال السيرفر تمشي بالدور، فطلب معلّق يوقف كل اللي وراه.
 * network = ما رد أو انقطع أو خطأ بالسيرفر: ينفع نعيده.
 */
async function postMafia<T = undefined>(
  op: MafiaPlayerOp | MafiaHostOp,
  body: { roomCode: string; token?: string; seq?: number; targetId?: string | null; card?: string } & Record<string, unknown>,
  timeoutMs = MAFIA_REQUEST_TIMEOUT_MS
): Promise<MafiaApiResult<T>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`/api/mafia/${op}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (res.status >= 500) return { success: false, error: "network", network: true };
    return (await res.json()) as MafiaApiResult<T>;
  } catch {
    return { success: false, error: "network", network: true };
  } finally {
    clearTimeout(timer);
  }
}

const isNetworkFail = <T,>(res: MafiaApiResult<T>) => !res.success && res.network === true;

/** اختيار ليل بالطريق (ما وصل رده للحين): الشاشة تظل مقفلة عليه حتى لو وصلت حالة من السيرفر قبله */
type PendingPick =
  | { kind: "act"; seq: number; step: string; targetId: string | null; card?: string; cardRole?: string }
  | { kind: "decoy"; seq: number; targetId: string };

/** نفس القفل اللي يطلع على الشاشة لحظة الضغطة (الساحر بالسريع: تظل البطاقة اللي اختارها بس) */
function lockTask(task: MafiaTask, targetId: string | null, card?: string): MafiaTask {
  return {
    ...task,
    locked: true,
    selectedId: targetId,
    ...(card && task.cards ? { cards: task.cards.filter((c) => c.id === card) } : {}),
  };
}

/** صوتي اللي أبيه: next = معرّف اللاعب أو MAFIA_SKIP_KEY (تخطي)، seq = مرحلة التصويت */
type VoteWant = { seq: number; next: string };
/** اختيار الشيخ اللي أبيه (led = منظم)، seq = مرحلة الصباح */
type SheikhWant = { seq: number; led: boolean };

/** حالتي من السيرفر وصلت واختيار الشيخ للحين ما تأكد: تظل الشاشة على اختياره */
function withPendingSheikh(view: MafiaMyView, want: SheikhWant | null, confirmed: SheikhWant | null): MafiaMyView {
  if (!want || want === confirmed || view.phaseSeq !== want.seq || view.sheikhLed === want.led) return view;
  return { ...view, sheikhLed: want.led };
}

/** حالتي من السيرفر وصلت وصوتي للحين ما تأكد: تظل الشاشة على صوتي (ما يرجع للصوت القديم لحظة) */
function withPendingVote(view: MafiaMyView, want: VoteWant | null, confirmed: VoteWant | null): MafiaMyView {
  if (!want || want === confirmed || view.phaseSeq !== want.seq || view.myVote === want.next) return view;
  return { ...view, myVote: want.next };
}

/** حالتي من السيرفر وصلت واختياري للحين بالطريق: نحط عليها القفل عشان القائمة ما تنفتح من جديد */
function withPendingPick(view: MafiaMyView, p: PendingPick | null): MafiaMyView {
  if (!p || view.phaseSeq !== p.seq) return view;
  if (p.kind === "decoy") return !view.task && view.decoyId === null ? { ...view, decoyId: p.targetId } : view;
  const task = view.task;
  if (!task || task.locked) return view;
  // الساحر بالسريع: لو فئته تغيّرت قبل ما يتسجل الشخص، مهمته صارت فئة البطاقة — نفس الاختيار
  if (task.step === p.step || (p.card && task.step === p.cardRole)) return { ...view, task: lockTask(task, p.targetId, task.step === p.step ? p.card : undefined) };
  return view;
}

/**
 * قائمة "باقي ما اختار/ما شاف دوره" اللي يكتبها السيرفر: لو ضغط كذا واحد بنفس اللحظة ممكن توصل نسخة
 * قديمة بعد الجديدة، فيرجع اسم كان اختفى. هنا الاسم اللي اختفى مرة (لنفس المرحلة) ما يرجع.
 */
function useStableWaiting(key: string | null, waiting: string[] | undefined): string[] | undefined {
  // الذاكرة بحالة React (مو ref): تتعدّل وقت الرسم لما تتغير القائمة — نمط "تعديل الحالة مع تغيّر الخصائص"
  const [mem, setMem] = useState<{ key: string | null; last: string[] | undefined; done: string[] }>({
    key: null,
    last: undefined,
    done: [],
  });
  let done = mem.key === key ? mem.done : [];
  if (waiting && (mem.key !== key || mem.last !== waiting)) {
    const last = mem.key === key ? mem.last ?? [] : [];
    const newlyDone = last.filter((id) => !waiting.includes(id) && !done.includes(id));
    if (newlyDone.length) done = [...done, ...newlyDone];
    setMem({ key, last: waiting, done });
  }
  if (!waiting) return waiting;
  return done.length ? waiting.filter((id) => !done.includes(id)) : waiting;
}

/** صوتي ينحسب على الشاشة فوراً (العداد وأسماء المصوّتين)، والسيرفر يأكده بعدين */
function withLocalVote(room: MafiaRoom, voterId: string, prev: string | null, next: string): MafiaRoom {
  const counts = { ...(room.vote_counts ?? {}) };
  if (prev && counts[prev]) counts[prev] -= 1;
  counts[next] = (counts[next] ?? 0) + 1;

  const voters: Record<string, string[]> = {};
  Object.entries(room.vote_voters ?? {}).forEach(([k, ids]) => {
    voters[k] = ids.filter((id) => id !== voterId);
  });
  voters[next] = [...(voters[next] ?? []), voterId];
  return { ...room, vote_counts: counts, vote_voters: voters };
}

/**
 * كل حالة لعبة المافيا على جهاز لاعب واحد (المنشئ أو أي لاعب).
 *
 * الحالة العامة (المرحلة، المؤقت، مين حي، عدد الأصوات) تجي من البث اللحظي.
 * الحالة الخاصة (دوري، مهمتي، نتيجة تحقيقي) تجي من getMafiaMyView فقط.
 */
export function useMafiaGame(
  session: MafiaSession | null,
  onSessionLost: (notice?: string) => void,
  /** المنشئ فتح غرفة جديدة: ننقل جهازه لها */
  onSwitchSession?: (next: MafiaSession) => void
) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const roomCode = session?.roomCode ?? "";
  const token = session?.token ?? "";

  const [room, setRoom] = useState<MafiaRoom | null>(null);
  const [players, setPlayers] = useState<MafiaPlayer[]>([]);
  const [view, setView] = useState<MafiaMyView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const devMode = DEV_MODE;
  /** آخر محاولة لجلب حالتي الخاصة فشلت (ما ردت بالمهلة أو انقطعت) — ترجع false أول ما توصل */
  const [viewFailing, setViewFailing] = useState(false);
  const [devRoles, setDevRoles] = useState<Record<string, MafiaRole | null>>({});


  const onLostRef = useRef(onSessionLost);
  const onSwitchRef = useRef(onSwitchSession);
  useEffect(() => {
    onLostRef.current = onSessionLost;
    onSwitchRef.current = onSwitchSession;
  }, [onSessionLost, onSwitchSession]);

  // -------------------------------------------------------------------
  // الجلب
  // -------------------------------------------------------------------

  /** متى وصل آخر تحديث للغرفة من البث اللحظي — شوف fetchPublic */
  const roomEventAt = useRef(0);
  const fetchPublic = useCallback(async () => {
    if (!roomCode) return;
    // الجلب المعلّق ينقطع بعد المهلة — عشان رد قديم متأخر ما يرجّع الشاشة لمرحلة خلصت
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), MAFIA_REQUEST_TIMEOUT_MS);
    const startedAt = Date.now();
    try {
      const [{ data: roomRow }, { data: roster }] = await Promise.all([
        supabase.from("mafia_rooms").select("*").eq("room_code", roomCode).abortSignal(ctrl.signal).maybeSingle(),
        supabase
          .from("mafia_players")
          .select("*")
          .eq("room_code", roomCode)
          .order("seat", { ascending: true })
          .abortSignal(ctrl.signal),
      ]);
      // رقم المرحلة ما ينقص أبداً: رد أقدم من اللي عندنا ما ياخذ مكانه. وبنفس المرحلة: لو وصل تحديث من البث
      // اللحظي والقراءة هذي بالطريق، ردها ممكن يكون أقدم منه (النت بطيء) فما نكتبه فوقه — مثلاً قائمة
      // "باقي ما شافوا" كانت تختفي لحظة بشاشة جوال بطيء. لو البث مقطوع، القراءة تمشي مثل قبل
      if (roomRow) {
        const row = roomRow as MafiaRoom;
        const afterEvents = startedAt >= roomEventAt.current;
        setRoom((prev) =>
          prev && (prev.phase_seq > row.phase_seq || (!afterEvents && prev.phase_seq === row.phase_seq)) ? prev : row
        );
      }
      if (roster) setPlayers(roster as MafiaPlayer[]);
    } catch {
      // انقطع أو ما رد: الجلب الجاي (كل 5 ثواني) أو البث اللحظي يجيب الحالة
    } finally {
      clearTimeout(timer);
    }
  }, [supabase, roomCode]);

  /** اختياري بالطريق (ما رد السيرفر للحين) — شوف withPendingPick */
  const pendingPick = useRef<PendingPick | null>(null);
  /** صوتي: آخر اختيار (want) وآخر واحد أكده السيرفر (confirmed) — شوف vote */
  const voteWant = useRef<VoteWant | null>(null);
  const voteConfirmed = useRef<VoteWant | null>(null);
  /** اختيار الشيخ: نفس فكرة الصوت — شوف chooseSheikh */
  const sheikhWant = useRef<SheikhWant | null>(null);
  const sheikhConfirmed = useRef<SheikhWant | null>(null);

  /** ok = وصلت. fail = ما رد أو انقطع (نعيد). stop = رد نهائي ما ينفع نعيده */
  const fetchViewOnce = useCallback(async (timeoutMs = MAFIA_REQUEST_TIMEOUT_MS): Promise<"ok" | "fail" | "stop"> => {
    if (!roomCode || !token) return "stop";
    const res = await postMafia<MafiaMyView>("view", { roomCode, token }, timeoutMs);
    if (!res.success) {
      if (res.network) return "fail";
      if (res.error.includes("انتهت جلستك") || res.error.includes("غير موجودة")) {
        onLostRef.current("طلعت من الغرفة — المنشئ طردك أو انتهت الغرفة.");
      }
      return "stop";
    }
    if (!res.data) return "fail";
    setView(
      withPendingSheikh(
        withPendingVote(withPendingPick(res.data, pendingPick.current), voteWant.current, voteConfirmed.current),
        sheikhWant.current,
        sheikhConfirmed.current
      )
    );
    // السيرفر يقول إن اختياري وصل (ردّه هو اللي ضاع): رسالة "ما وصل اختيارك" ما لها داعي
    if (res.data.task?.locked || res.data.decoyId) setError((e) => (e === OFFLINE_ERROR ? "" : e));
    return "ok";
  }, [roomCode, token]);

  /**
   * جلب حالتي الخاصة — طلب واحد بس بالمرة. لو انطلب جلب والجلب الحالي ما خلص، نعيده مرة وحدة
   * بعده عشان آخر حالة توصل. الطلب اللي ما رد خلال 4 ثواني ينقطع، ونعيد المحاولة تلقائياً لين ينجح
   * (كل إعادة بمهلة أطول — attemptTimeout — وبدون ما يوقف باقي الطلبات: كل طلب لحاله).
   */
  const fetchViewLatest = useRef(fetchViewOnce);
  useEffect(() => {
    fetchViewLatest.current = fetchViewOnce;
  }, [fetchViewOnce]);
  const viewRun = useRef<Promise<void> | null>(null);
  const viewAgain = useRef(false);
  // يزيد لما تتغير الغرفة أو نطلع من الصفحة: يوقف إعادة المحاولة القديمة
  const viewGen = useRef(0);
  const viewRunId = useRef(0);
  const fetchView = useCallback((): Promise<void> => {
    if (viewRun.current) {
      viewAgain.current = true;
      return viewRun.current;
    }
    const gen = viewGen.current;
    const runId = ++viewRunId.current;
    const run: Promise<void> = (async () => {
      try {
        let failures = 0;
        do {
          viewAgain.current = false;
          const result = await fetchViewLatest.current(attemptTimeout(failures));
          if (gen !== viewGen.current) return;
          // "النت ضعيف، نحاول نوصلك..." يطلع لو فشلت محاولة، ويختفي أول ما توصل
          if (result !== "stop") setViewFailing(result === "fail");
          if (result === "fail") {
            failures++;
            await sleep(Math.min(2000, 400 * failures));
            if (gen !== viewGen.current) return;
            viewAgain.current = true;
          }
        } while (viewAgain.current);
      } finally {
        if (viewRunId.current === runId) viewRun.current = null;
      }
    })();
    viewRun.current = run;
    return run;
  }, []);

  // -------------------------------------------------------------------
  // الإقلاع والبث اللحظي
  // -------------------------------------------------------------------

  useEffect(() => {
    if (!roomCode) return;
    const gen = viewGen;
    const runRef = viewRun;
    fetchPublic();
    fetchView();

    // البث اللحظي متصل؟ (يحدد كل كم نقرا القراءة الاحتياطية)
    let live = false;
    let lastSafety = Date.now();
    const channel = supabase
      .channel(`mafia_${roomCode}_${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "mafia_rooms", filter: `room_code=eq.${roomCode}` },
        (payload) => {
          roomEventAt.current = Date.now();
          setRoom((prev) => ({ ...(prev || {}), ...payload.new }) as MafiaRoom);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mafia_players", filter: `room_code=eq.${roomCode}` },
        () => {
          fetchPublic();
          fetchView();
        }
      )
      .subscribe((status) => {
        const wasLive = live;
        live = status === "SUBSCRIBED";
        // رجع الاتصال بعد انقطاع: نجيب آخر حالة على طول، ما ننتظر القراءة الاحتياطية
        if (live && !wasLive) {
          lastSafety = Date.now();
          fetchPublic();
        }
      });

    // الجوالات تقطع الاتصال عند إطفاء الشاشة — نُحدّث عند العودة
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchPublic();
        fetchView();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    // شبكة أمان لو البث اللحظي انقطع بصمت: كل 10 ثواني وهو متصل، وكل 4 لو انقطع
    const safety = setInterval(() => {
      if (Date.now() - lastSafety < (live ? SAFETY_POLL_LIVE_MS : SAFETY_POLL_OFFLINE_MS)) return;
      lastSafety = Date.now();
      fetchPublic();
    }, 1000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(safety);
      supabase.removeChannel(channel);
      // إعادة المحاولة القديمة توقف، والجلب الجاي يبدأ من جديد
      gen.current++;
      runRef.current = null;
    };
  }, [supabase, roomCode, fetchPublic, fetchView]);

  // كل ما تغيرت المرحلة: نجلب حالتي الخاصة من جديد (ونحفظ متى شفناها — لأقصى انتظار قائد المافيا)
  const seq = room?.phase_seq ?? -1;
  const seqSeenAt = useRef({ seq: -1, at: 0 });
  useEffect(() => {
    if (seq < 0) return;
    if (seqSeenAt.current.seq !== seq) seqSeenAt.current = { seq, at: Date.now() };
    fetchView();
  }, [seq, fetchView]);

  /**
   * من أي رقم مرحلة يكون دوري المحفوظ أكيد من هاللعبة: من غرفة الانتظار أو بداية الكشف،
   * أو من أول مرحلة نشوفها (فتحنا الصفحة، أو الجوال نام وفاتته مراحل). قبلها الدور ممكن يكون من جولة قبل.
   */
  const [roleFromSeq, setRoleFromSeq] = useState(-1);
  const lastSeenSeq = useRef(-1);
  const phaseNow = room?.phase;
  useEffect(() => {
    if (seq < 0) return;
    const prev = lastSeenSeq.current;
    lastSeenSeq.current = seq;
    if (phaseNow === "lobby" || phaseNow === "reveal" || prev < 0 || seq > prev + 1) setRoleFromSeq(seq);
  }, [seq, phaseNow]);
  const roleReady = Boolean(view && view.phaseSeq >= roleFromSeq && roleFromSeq >= 0);

  // حالتي الخاصة ما لحقت المرحلة (الجلب تأخر أو فشل): نعيد المحاولة لين توصل —
  // كشف الأدوار وأدوار الليل تنتظرها قبل ما تعرض الدور أو بطاقة صاحب الدور أو سؤال التمويه.
  // وبكشف الأدوار: لو وصلت بدون دور (انقرت قبل التوزيع بلحظة) نعيد بعد
  const viewFresh = Boolean(room && view && view.phaseSeq === room.phase_seq);
  const viewStale = Boolean(
    room && (!view || view.phaseSeq < room.phase_seq || (room.phase === "reveal" && viewFresh && !view.me.role))
  );
  useEffect(() => {
    if (!viewStale) return;
    const id = setInterval(fetchView, 2000);
    return () => clearInterval(id);
  }, [viewStale, fetchView]);

  // الشاشة تنتظر حالتي الخاصة (تحميل) وطوّلت أو فشلت محاولة: سطر "النت ضعيف، نحاول نوصلك..." تحت التحميل،
  // والمحاولات تكمل لحالها (fetchView يعيد لين ينجح). يعتمد على نت الجوال نفسه، مو على دوره — ما يفضح شي
  const waitingView = !view || viewStale;
  const waitKey = waitingView ? `${roomCode}:${seq}` : null;
  const [slowWaitKey, setSlowWaitKey] = useState<string | null>(null);
  useEffect(() => {
    if (waitKey === null) return;
    const t = setTimeout(() => setSlowWaitKey(waitKey), WEAK_NET_AFTER_MS);
    return () => clearTimeout(t);
  }, [waitKey]);
  const weakNet = waitingView && (viewFailing || slowWaitKey === waitKey);

  // وضع التجربة: المنشئ يشوف كل الأدوار
  const isHost = Boolean(view?.me.isHost);
  useEffect(() => {
    if (!devMode || !isHost || !roomCode || !room || room.phase === "lobby") return;
    devGetMafiaRoles(roomCode).then((res) => {
      if (res.success) setDevRoles(Object.fromEntries(res.data.map((r) => [r.playerId, r.role])));
    });
  }, [devMode, isHost, roomCode, room?.phase_seq]); // eslint-disable-line react-hooks/exhaustive-deps

  // حساب التجربة بالسيرفر: صفحة المنشئ مفتوحة قبل أول صباح = لسا موجود (كل دقيقة، ولما يرجع للصفحة).
  // لو سكّرها والصباح ما جا، تجربته ترجع لما يبدأ لعبة ثانية. مجرد إشارة، ما تغيّر شي باللعبة.
  // طلب عادي بمهلة (مو دالة سيرفر): لو ما رد ينقطع وينعاد بعد ثواني — عشان "آخر ظهور" ما يقدم
  // (3 دقايق بدون نبضة = طلع) والمنشئ للحين بالصفحة. نبضة وحدة بالطريق بالمرة
  const beforeFirstMorning =
    !!room && (room.phase === "reveal" || room.phase === "night_act" || room.phase === "night_done") && room.night_number <= 1;
  const sessionPing = isHost && beforeFirstMorning ? roomCode : "";
  useEffect(() => {
    if (!sessionPing) return;
    let stopped = false;
    // الانتظار بين النبضات ينقطع لو رجع للصفحة (نبضة على طول) أو طلعنا
    let wake: (() => void) | null = null;
    const pause = (ms: number) =>
      new Promise<void>((resolve) => {
        const done = () => {
          clearTimeout(t);
          wake = null;
          resolve();
        };
        const t = setTimeout(done, ms);
        wake = done;
      });
    const onVisible = () => {
      if (document.visibilityState === "visible") wake?.();
    };
    document.addEventListener("visibilitychange", onVisible);
    (async () => {
      for (let failures = 0; !stopped; ) {
        const res = await postMafia("host-ping", { roomCode: sessionPing }, attemptTimeout(failures));
        if (stopped) return;
        failures = isNetworkFail(res) ? failures + 1 : 0;
        await pause(failures ? Math.min(15_000, 3000 * failures) : SESSION_PING_MS);
      }
    })();
    return () => {
      stopped = true;
      wake?.();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sessionPing]);

  // -------------------------------------------------------------------
  // المؤقت والانتقال التلقائي
  // -------------------------------------------------------------------

  // ساعة السيرفر (lib/game/server-clock.ts — نفس المزاد والسيطرة وحرب القلاع): كل جوال يقيس فرق ساعته عن
  // السيرفر (أسرع قياس من 4)، ويعد على أساسه، والرقم يقلب على لحظة تغيّره بالضبط — فالكل يشوف نفس الرقم
  // مهما كانت ساعة جهازه. (قبل: فرق ساعة من رد "حالتي" — قياس واحد كل مرة يتغير معه الرقم — وعد كل ربع ثانية)
  useServerClock();
  // أول قياس: قبله ما نطلب انتقال (الجوال المقدّم كان يشوف الوقت خالص ويطلب انتقال قبل وقته)
  const [clockReady, setClockReady] = useState(false);
  useEffect(() => {
    let on = true;
    void whenServerClockReady().then(() => on && setClockReady(true));
    return () => {
      on = false;
    };
  }, []);

  const endsAt = room?.phase_ends_at ? Date.parse(room.phase_ends_at) : null;
  const [tick, setTick] = useState<{ end: number; left: number } | null>(null);
  useEffect(() => {
    if (endsAt === null) return;
    return startCountdown(endsAt, (left) => setTick({ end: endsAt, left }));
  }, [endsAt]);
  // أول رسمة بعد ما تغيّر الموعد (قبل أول دقة): من ساعة السيرفر مباشرة، مو رقم المرحلة اللي قبل
  const secondsLeft =
    endsAt === null ? null : tick?.end === endsAt ? tick.left : Math.max(0, Math.ceil((endsAt - serverNow()) / 1000));

  // طلب انتقال واحد بس بالمرة من هالجوال: ما نرسل ثاني لين يرجع اللي قبله (وبعده بـ 2.5 ثانية لو
  // المرحلة ما تغيرت) — وإلا لو السيرفر بطّى، الطلبات تتكدس فوق بعض وكل واحد يسوي نفس الشغل
  const lastAdvance = useRef<{ seq: number; at: number; busy: boolean }>({ seq: -1, at: 0, busy: false });
  useEffect(() => {
    if (!room || secondsLeft === null || secondsLeft > 0 || !token || !clockReady) return;
    const last = lastAdvance.current;
    if (last.busy) return;
    if (last.seq === room.phase_seq && Date.now() - last.at < 2500) return;
    last.busy = true;
    const seqNow = room.phase_seq;
    const code = room.room_code;

    // تأخير عشوائي بسيط حتى لا تضرب كل الأجهزة السيرفر بنفس اللحظة
    let fired = false;
    const jitter = Math.random() * 400;
    const t = setTimeout(async () => {
      fired = true;
      await postMafia("advance", { roomCode: code, token, seq: seqNow }, MAFIA_ADVANCE_TIMEOUT_MS);
      lastAdvance.current = { seq: seqNow, at: Date.now(), busy: false };
    }, jitter);
    return () => {
      clearTimeout(t);
      if (!fired) lastAdvance.current.busy = false;
    };
  }, [room, secondsLeft, token, clockReady]);

  // النمط السريع: الليل بدأ بس مؤقته ما بدأ — ننتظر كل أصحاب المهام يوصلهم دورهم (بحد أقصى)
  const nightArming = Boolean(
    room &&
      room.phase === "night_act" &&
      isFastMafia(room.settings) &&
      secondsLeft !== null &&
      secondsLeft > MAFIA_CONFIG.FAST_NIGHT_SECONDS
  );

  // -------------------------------------------------------------------
  // توصيل الدور: "شفت دوري" بالكشف، ووصول مهمة الليل
  // -------------------------------------------------------------------

  /**
   * شاشة الليل وصلت جوالي وانعرضت: نأكد للسيرفر.
   * - عندي مهمة: منها يبدأ مؤقت الليل السريع، ومنها يعرف السيرفر إن النظام يقدر يختار عني لو ما اخترت
   *   (اللي ما وصلته مهمته، ما ينختار عنه)
   * - أنا مافيا ومو القائد (بدور المافيا): أقدر آخذ القرار لو القائد ما وصلته مهمته
   * - السريع وما عندي مهمة: مؤقت الليل ينتظر كل الجوالات، مو بس أصحاب المهام
   * التأكيد يتعاد لو تغيرت الشاشة بنفس المرحلة (مثلاً صرت أنا القائد)
   */
  const nightNow = room?.phase === "night_act" && viewFresh && view?.me.alive ? room : null;
  const mafiaTurn = Boolean(nightNow && (isFastMafia(nightNow.settings) || nightNow.night_step === "mafia"));
  // السريع: حتى اللي ما عنده مهمة يأكد ("seen") — المؤقت ينتظر كل الجوالات، فبدايته ما تكشف مين عنده دور
  const ackKind = !nightNow
    ? null
    : view?.task
      ? "task"
      : view?.me.role === "mafia" && mafiaTurn
        ? "view"
        : isFastMafia(nightNow.settings)
          ? "seen"
          : null;
  const ackSeq = nightNow && ackKind ? nightNow.phase_seq : null;
  const ackKey = ackSeq === null ? null : `${ackSeq}:${ackKind}`;
  const ackedKey = useRef<string | null>(null);
  useEffect(() => {
    if (ackKey === null || ackSeq === null || ackedKey.current === ackKey || !token) return;
    ackedKey.current = ackKey;
    let stopped = false;
    (async () => {
      for (let i = 0; i < 30 && !stopped; i++) {
        const res = await postMafia("got", { roomCode, token, seq: ackSeq }, attemptTimeout(i));
        if (!isNetworkFail(res)) return;
        await sleep(1000);
      }
      // ما وصل التأكيد والمرحلة لسا نفسها: نسمح بمحاولة جديدة مع التحديث الجاي
      if (!stopped) ackedKey.current = null;
    })();
    return () => {
      stopped = true;
    };
  }, [ackKey, ackSeq, roomCode, token]);

  /**
   * أنا مافيا ومو القائد، بدور المافيا: لو القائد ما وصلته مهمته خلال أقصى انتظار، القرار ينتقل لي.
   * نطلب بعد أقصى انتظار من أول ما شفنا المرحلة، وكل 4 ثواني لين ينحسم (السيرفر هو اللي يقرر).
   */
  const leadSeq = ackKind === "view" && nightNow ? nightNow.phase_seq : null;
  useEffect(() => {
    if (leadSeq === null || !token) return;
    let stopped = false;
    const seenAt = seqSeenAt.current.seq === leadSeq ? seqSeenAt.current.at : Date.now();
    (async () => {
      await sleep(Math.max(0, seenAt + MAFIA_CONFIG.FAST_ROLE_WAIT_SECONDS * 1000 - Date.now()));
      for (let failures = 0; !stopped; ) {
        const res = await postMafia<{ leader: boolean; stop: boolean }>("lead", { roomCode, token, seq: leadSeq }, attemptTimeout(failures));
        if (isNetworkFail(res)) failures++;
        if (stopped) return;
        if (res.success && res.data?.leader) {
          fetchView();
          return;
        }
        if (res.success && res.data?.stop) return;
        if (!res.success && !res.network) return;
        await sleep(4000);
      }
    })();
    return () => {
      stopped = true;
    };
  }, [leadSeq, roomCode, token, fetchView]);

  /**
   * كشف الأدوار: ضغطت "شفت دوري" (رقم المرحلة) — البطاقة تنقفل على شاشتي فوراً، والضغطة تنرسل
   * بالخلفية وتنعاد تلقائياً لين يأكدها السيرفر (ما دام الكشف نفسه شغال). seenSent = السيرفر أكدها.
   */
  const [seenSeq, setSeenSeq] = useState<number | null>(null);
  const [seenSent, setSeenSent] = useState<number | null>(null);
  const revealSeq = room?.phase === "reveal" ? room.phase_seq : null;
  const revealSeqRef = useRef(revealSeq);
  revealSeqRef.current = revealSeq;
  const seeRole = useCallback(async () => {
    if (revealSeq === null || seenSeq === revealSeq) return;
    unlockMafiaAudio();
    setError("");
    setSeenSeq(revealSeq);
    for (let i = 0; ; i++) {
      const res = await postMafia("seen", { roomCode, token, seq: revealSeq }, attemptTimeout(i));
      if (res.success) {
        setSeenSent(revealSeq);
        return;
      }
      if (!isNetworkFail(res)) {
        // رد نهائي (مثل: دورك ما وصل للحين): نرجّع الزر عشان يضغط من جديد
        setSeenSeq((s) => (s === revealSeq ? null : s));
        setError(res.error);
        return;
      }
      // الكشف خلص أو صار شي ثاني: ما فيه داعي نكمل
      if (revealSeqRef.current !== revealSeq) return;
      await sleep(Math.min(3000, 500 + i * 500));
    }
  }, [revealSeq, seenSeq, roomCode, token]);

  // مين باقي ما شاف دوره (السيرفر يكتبه بـ night_ready بليلة صفر) — والاسم اللي اختفى ما يرجع
  const revealReadyRaw =
    room?.phase === "reveal" && room.night_ready?.night === 0 && room.night_ready.seq === room.phase_seq
      ? room.night_ready
      : null;
  const revealWaiting = useStableWaiting(revealReadyRaw ? `reveal:${revealReadyRaw.seq}` : null, revealReadyRaw?.waiting);
  const revealReady = useMemo(
    () => (revealReadyRaw ? { ...revealReadyRaw, waiting: revealWaiting } : null),
    [revealReadyRaw, revealWaiting]
  );
  // مين باقي ما اختار بدور الليل (نفس الشي)
  const nightReadyRaw = room?.phase === "night_act" && room.night_ready && room.night_ready.night === room.night_number ? room.night_ready : null;
  const nightWaiting = useStableWaiting(
    nightReadyRaw ? `night:${room?.phase_seq}:${nightReadyRaw.night}:${nightReadyRaw.step ?? "fast"}` : null,
    nightReadyRaw?.waiting
  );
  const nightReady = useMemo(
    () => (nightReadyRaw ? { ...nightReadyRaw, waiting: nightWaiting } : null),
    [nightReadyRaw, nightWaiting]
  );
  const myId = view?.me.id;
  const serverSawMe = Boolean(revealReady?.waiting && myId && !revealReady.waiting.includes(myId));
  const iSawRole = revealSeq !== null && (seenSeq === revealSeq || serverSawMe);
  /** السيرفر أكد ضغطتي "شفت دوري" (رد عليها، أو شالني من قائمة الباقين) */
  const seenConfirmed = revealSeq !== null && (seenSent === revealSeq || serverSawMe);

  // -------------------------------------------------------------------
  // المؤثرات الصوتية
  // -------------------------------------------------------------------

  // معرّفي بدون ما يعيد تشغيل مؤثرات المرحلة كل ما تحدّثت حالتي الخاصة
  const meIdRef = useRef<string | null>(null);
  useEffect(() => {
    meIdRef.current = view?.me.id ?? null;
  }, [view?.me.id]);

  const soundSeq = useRef(-1);
  // مؤقتات أصوات المرحلة: تنلغي بس لما تبدأ مرحلة جديدة (أو نطلع من الصفحة)،
  // مو مع كل تحديث للغرفة — وإلا تحديث بسيط (لاعب مات، الجلب الدوري) يقطع أصوات الصباح
  const phaseTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => phaseTimers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!room || room.phase_seq === soundSeq.current) return;
    const first = soundSeq.current === -1;
    soundSeq.current = room.phase_seq;
    phaseTimers.current.forEach(clearTimeout);
    phaseTimers.current = [];
    if (first) return; // لا نشغّل صوت عند فتح الصفحة في منتصف مرحلة

    const timers = phaseTimers.current;
    switch (room.phase) {
      case "reveal":
        // موسيقى كشف الأدوار مع قلبة البطاقة (3 ثواني — تخلص قبل الليل).
        // البومة ما تطلع هنا: تطلع مرة وحدة أول ما يبدأ الليل، عشان ما تتداخل الأصوات
        cueMafia("reveal");
        break;
      case "night_act":
        // النمط السريع: الليل دور واحد (بدون night_step) — البومة مع بدايته
        if (isFastMafia(room.settings) || room.night_step === mafiaNightSteps(room.settings)[0]) playMafiaSound("owl");
        break;
      case "night_done":
        // "تم الاغتيال" نفسها عند الكل — حتى الضحية ما تعرف إلا مع نتائج الصباح
        if (room.night_step) cueMafia(...STEP_DONE_CUE[room.night_step]);
        break;
      case "morning": {
        playMafiaSound("rooster");
        const schedule = mafiaMorningSchedule(room.announcements);
        room.announcements.forEach((a, i) => {
          // ضحية الذبح وهدف المنتقم يشوفون رسالتهم الخاصة هنا (نفس الصوت اللي عند الكل)
          const mine = Boolean(a.targetId && a.targetId === meIdRef.current);
          const cue: Cue | undefined =
            mine && a.kind === "bomb"
              ? ["bomb", "victim_bomb"]
              : mine && a.kind === "kill"
                ? ["horror", "victim"]
                : ANNOUNCEMENT_CUE[a.kind];
          if (cue) timers.push(setTimeout(() => cueMafia(...cue), schedule[i]));
        });
        break;
      }
      case "voting":
        playMafiaSound("vote");
        break;
      case "vote_result": {
        const result = room.vote_result;
        if (result?.eliminatedId) cueMafia("horror", "doom");
        else cueMafia("womp");
        // المنتقم طلع بالتصويت: ينفجر ويطيّر آخر واحد اختاره
        const bombId = result?.bombId;
        if (bombId) {
          timers.push(
            setTimeout(() => cueMafia("bomb", bombId === meIdRef.current ? "victim_bomb" : "bomb"), 1800)
          );
        }
        // انفجر بس هدفه نجا: الانفجار، وبعده الحماية أو درع الجندي
        const blocked = result?.bombBlocked;
        if (blocked) {
          timers.push(setTimeout(() => cueMafia("bomb", "bomb"), 1800));
          timers.push(
            setTimeout(
              () => (blocked.fate === "shield" ? cueMafia("shield", "shield") : cueMafia("heal", "saved")),
              1800 + getMafiaSoundTiming("bomb").duration * 1000
            )
          );
        }
        break;
      }
      case "ended": {
        // انحسمت بالليل بانفجار المنتقم: الانفجار أول، وبعده الفوز
        const bomb = (room.announcements ?? []).find((a) => a.kind === "bomb");
        const delay = bomb ? getMafiaSoundTiming("bomb").duration * 1000 + 600 : 0;
        if (bomb) cueMafia("bomb", bomb.targetId === meIdRef.current ? "victim_bomb" : "bomb");
        timers.push(
          setTimeout(() => {
            if (room.winner === "mafia") {
              // نفس رعب الذبح، وبعده الكورد الشرير
              cueMafia("horror", "win_mafia");
              timers.push(setTimeout(() => playMafiaSound("evil"), getMafiaSoundTiming("horror").duration * 900));
            } else if (room.winner === "town") cueMafia("win", "win_town");
            else cueMafia("night");
          }, delay)
        );
        break;
      }
    }
  }, [room]);

  // تكتكة آخر 3 ثواني في أدوار الليل والتصويت
  const lastTick = useRef<number | null>(null);
  useEffect(() => {
    if (!room || secondsLeft === null) return;
    if (room.phase !== "night_act" && room.phase !== "voting") return;
    if (secondsLeft > 0 && secondsLeft <= 3 && lastTick.current !== secondsLeft) {
      lastTick.current = secondsLeft;
      playMafiaSound("tick");
    }
  }, [room, secondsLeft]);

  // -------------------------------------------------------------------
  // أفعال اللاعب
  // -------------------------------------------------------------------

  const run = useCallback(
    async <T extends { success: boolean; error?: string }>(fn: () => Promise<T>): Promise<T | null> => {
      unlockMafiaAudio();
      setError("");
      setBusy(true);
      try {
        const res = await fn();
        if (!res.success && "error" in res && res.error) setError(res.error);
        return res;
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const phaseSeq = room?.phase_seq;

  /**
   * صاحب الدور يضغط على اسم (null = الساحر/الصحفي يعدّي الليلة) — ضغطة وحدة والاختيار نهائي.
   * card (السريع، الساحر): البطاقة اللي يصيرها مع الشخص بطلب واحد (null targetId للجندي: الدرع بس).
   * بدون صوت وبدون حركة ولا لون خاص: شاشته لازم تكون مثل شاشات الباقين بالضبط،
   * لأن اللي جنبه يقدر يلمحها. ينرسل مرة وحدة بس لكل مهمة (لو ضغط مرتين بسرعة) — المهمة = المرحلة + الدور.
   */
  const taskStepRef = useRef<string | null>(null);
  const viewRef = useRef(view);
  useEffect(() => {
    taskStepRef.current = view?.task?.step ?? null;
    viewRef.current = view;
  }, [view]);
  // رقم المرحلة الحالي (للإعادة: لو تغيّرت المرحلة نوقف إعادة الطلب القديم)
  const liveSeq = useRef(seq);
  useEffect(() => {
    liveSeq.current = seq;
  }, [seq]);

  /**
   * يرسل طلب لعب بطلب عادي (app/api/mafia/[op]) مو دالة سيرفر: الطلب اللي ما رد خلال مهلته ينقطع وينعاد
   * تلقائياً (أول مهلة 4 ثواني، وكل إعادة أطول بثانيتين لين 10)، وما يوقف أي طلب ثاني. السيرفر يقبل
   * الإعادة لو الأول وصل وضاع رده: يرجع نفس الرد وما يتغير شي.
   * seq = المرحلة اللي انرسل فيها: لو تغيّرت والطلب للحين ما رد، نوقف (null) — يا وصل، يا ما عاد له داعي.
   */
  /** يرجع رد الطلب، أو null لو تغيّرت المرحلة (رقمها) قبل ما يرد */
  const untilSeqMoves = useCallback(<R,>(p: Promise<R>, seq: number): Promise<R | null> => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const moved = new Promise<null>((resolve) => {
      timer = setInterval(() => {
        if (liveSeq.current !== seq) resolve(null);
      }, 150);
    });
    return Promise.race([p, moved]).finally(() => clearInterval(timer));
  }, []);

  const sendRetry = useCallback(
    async <T = undefined,>(
      op: MafiaPlayerOp | MafiaHostOp,
      body: Parameters<typeof postMafia>[1],
      seq: number | undefined,
      offlineError: string,
      /** الاختيار للحين هو المطلوب؟ (غيّر صوته وهذا بالطريق: ما نعيد القديم — يرجع null والأحدث ينرسل على طول) */
      stillWanted?: () => boolean
    ): Promise<MafiaApiResult<T> | null> => {
      const stop = () => (seq !== undefined && liveSeq.current !== seq) || (stillWanted !== undefined && !stillWanted());
      for (let i = 0; i < MAFIA_PICK_ATTEMPTS; i++) {
        const attempt = postMafia<T>(op, body, attemptTimeout(i));
        // المرحلة تغيّرت والمحاولة للحين بالطريق: ما ننتظر مهلتها تخلص (أزرار المنشئ مقفلة وهي شغالة) —
        // السيرفر يتجاهل الضغطة لو وصلت متأخرة، ولو كانت هي اللي نقلت المرحلة فخلاص وصلت
        const res = seq === undefined ? await attempt : await untilSeqMoves(attempt, seq);
        if (res === null) return null;
        if (!isNetworkFail(res)) return res;
        if (stop()) return null;
        await sleep(Math.min(1500, 300 * (i + 1)));
        if (stop()) return null;
      }
      return { success: false, error: offlineError };
    },
    [untilSeqMoves]
  );

  /** اختيار الليل وجواب التمويه (null = المرحلة تغيّرت والطلب ما رد) */
  const sendPick = useCallback(
    (op: "act" | "decoy", body: { roomCode: string; token: string; seq: number; targetId: string | null; card?: string }) =>
      sendRetry(op, body, body.seq, OFFLINE_ERROR),
    [sendRetry]
  );

  const actKey = useRef<string | null>(null);
  const act = useCallback(
    async (targetId: string | null, card?: string | null) => {
      if (phaseSeq === undefined) return;
      const step = taskStepRef.current ?? "";
      const key = `${phaseSeq}:${step}`;
      if (actKey.current === key) return;
      actKey.current = key;
      unlockMafiaAudio();
      setError("");
      // الشاشة تتقفل على اختياره فوراً، والسيرفر يحفظ بالخلفية (لو فشل نرجّعها).
      // الساحر بالسريع: تظل عنده البطاقة اللي اختارها بس، والشخص هو المختار فيها
      const cardRole = card ? viewRef.current?.task?.cards?.find((c) => c.id === card)?.role : undefined;
      const pick: PendingPick = { kind: "act", seq: phaseSeq, step, targetId, ...(card ? { card, cardRole } : {}) };
      pendingPick.current = pick;
      setView((v) => (v?.task ? { ...v, task: lockTask(v.task, targetId, card ?? undefined) } : v));
      const res = await sendPick("act", { roomCode, token, seq: phaseSeq, targetId, ...(card ? { card } : {}) });
      if (pendingPick.current === pick) pendingPick.current = null;
      if (res && !res.success) {
        actKey.current = null;
        setError(res.error);
      }
      await fetchView();
    },
    [roomCode, token, fetchView, phaseSeq, sendPick]
  );

  /**
   * سؤال التمويه: لازم كل الأحياء يجاوبون عشان يمشي الدور — ضغطة وحدة ويتقفل فوراً على الشاشة.
   * ينرسل مرة وحدة بس لكل دور (ويتعاد تلقائياً لو ما رد)، ومعه رقم الدور عشان السيرفر يتجاهله لو وصل متأخر.
   */
  const decoySeq = useRef<number | null>(null);
  const decoy = useCallback(
    async (targetId: string) => {
      if (phaseSeq === undefined || decoySeq.current === phaseSeq) return;
      decoySeq.current = phaseSeq;
      setError("");
      const pick: PendingPick = { kind: "decoy", seq: phaseSeq, targetId };
      pendingPick.current = pick;
      setView((v) => (v ? { ...v, decoyId: targetId } : v));
      const res = await sendPick("decoy", { roomCode, token, seq: phaseSeq, targetId });
      if (pendingPick.current === pick) pendingPick.current = null;
      if (res && !res.success) {
        decoySeq.current = null;
        // قرار القتل انتقل لي وأنا على سؤال التمويه: بدون رسالة خطأ — شاشتي تتبدل وتقول "انتقل لك قرار القتل"
        if (!res.error.includes("اختر من مهمتك")) setError(res.error);
        fetchView();
      }
    },
    [roomCode, token, fetchView, phaseSeq, sendPick]
  );

  /**
   * الشيخ يختار نوع نقاش اليوم — يتحدد على شاشته فوراً، ويقدر يغيّره لين يبدأ النقاش.
   * مثل الصوت: طلب يتعاد لو ما رد (السيرفر يحفظ اختيار واحد، فالإعادة ما تغيّر شي)، وطلب واحد بالطريق
   * بالمرة — لو غيّر رأيه والأول للحين ما رد، الأحدث ينرسل بعده. ومعه رقم الصباح: لو وصل متأخر بعد
   * ما بدأ النقاش (أو بصباح ثاني) السيرفر ما يحفظه
   */
  const sheikhBusy = useRef(false);
  const sheikhFixes = useRef(0);
  const flushSheikh = useCallback(async () => {
    if (sheikhBusy.current) return;
    sheikhBusy.current = true;
    try {
      for (;;) {
        const want = sheikhWant.current;
        if (!want || want === sheikhConfirmed.current) return;
        const res = await sendRetry("sheikh", { roomCode, token, seq: want.seq, led: want.led }, want.seq, PRESS_OFFLINE_ERROR, () => sheikhWant.current === want);
        // غيّر رأيه وهذا بالطريق: نرسل الأحدث
        if (sheikhWant.current !== want) continue;
        // الصباح خلص والطلب ما رد
        if (res === null) return;
        if (res.success) {
          sheikhConfirmed.current = want;
          return;
        }
        sheikhWant.current = null;
        setError(res.error);
        fetchView();
        return;
      }
    } finally {
      sheikhBusy.current = false;
    }
  }, [roomCode, token, sendRetry, fetchView]);

  const chooseSheikh = useCallback(
    async (led: boolean) => {
      if (phaseSeq === undefined) return;
      setError("");
      setView((v) => (v ? { ...v, sheikhLed: led } : v));
      sheikhWant.current = { seq: phaseSeq, led };
      sheikhFixes.current = 0;
      await flushSheikh();
    },
    [phaseSeq, flushSheikh]
  );

  // طلب قديم من نفس الجوال (انقطع بالمهلة بس السيرفر كمّله) وصل بعد الأحدث وغيّر الاختيار: يبان بحالتي
  // الخاصة. لو ظل غير آخر اختيار ثانية ونص، نرسل الأحدث من جديد (بحد 3 مرات بالصباح)
  const serverSheikhLed = view?.sheikhLed;
  const viewPhaseSeq = view?.phaseSeq;
  useEffect(() => {
    const stale = () => {
      const want = sheikhWant.current;
      return Boolean(
        want &&
          want === sheikhConfirmed.current &&
          want.seq === liveSeq.current &&
          viewPhaseSeq === want.seq &&
          serverSheikhLed !== want.led &&
          sheikhFixes.current < 3
      );
    };
    if (!stale()) return;
    const t = setTimeout(() => {
      if (!stale()) return;
      sheikhFixes.current++;
      sheikhConfirmed.current = null;
      void flushSheikh();
    }, 1500);
    return () => clearTimeout(t);
  }, [serverSheikhLed, viewPhaseSeq, flushSheikh]);

  /** تغيير الاسم بغرفة الانتظار: طلب يتعاد لو ما رد (نفس الاسم مرة ثانية ما يغيّر شي) */
  const rename = useCallback(
    async (displayName: string) => {
      const res = await run(
        async () =>
          (await sendRetry("rename", { roomCode, token, displayName }, undefined, PRESS_OFFLINE_ERROR)) ??
          ({ success: false, error: PRESS_OFFLINE_ERROR } as const)
      );
      if (res?.success) await Promise.all([fetchView(), fetchPublic()]);
      return Boolean(res?.success);
    },
    [run, roomCode, token, sendRetry, fetchView, fetchPublic]
  );

  /**
   * صوتي: ينحسب على شاشتي فوراً، وينرسل بالخلفية بطلب يتعاد لو ما رد (السيرفر: صوت واحد لكل لاعب
   * بالجولة، فالإعادة ما تنحسب مرتين). صوت واحد بالطريق بالمرة: لو غيّر صوته والأول للحين ما رد،
   * الأحدث ينرسل بعده.
   */
  const voteBusy = useRef(false);
  const voteFixes = useRef(0);
  const flushVote = useCallback(async () => {
    if (voteBusy.current) return;
    voteBusy.current = true;
    try {
      for (;;) {
        const want = voteWant.current;
        if (!want || want === voteConfirmed.current) return;
        const targetId = want.next === MAFIA_SKIP_KEY ? null : want.next;
        const res = await sendRetry("vote", { roomCode, token, seq: want.seq, targetId }, want.seq, PRESS_OFFLINE_ERROR, () => voteWant.current === want);
        // غيّر صوته وهذا بالطريق: نرسل الأحدث
        if (voteWant.current !== want) continue;
        // التصويت خلص والطلب ما رد
        if (res === null) return;
        if (res.success) {
          voteConfirmed.current = want;
          return;
        }
        voteWant.current = null;
        setError(res.error);
        fetchView();
        fetchPublic();
        return;
      }
    } finally {
      voteBusy.current = false;
    }
  }, [roomCode, token, sendRetry, fetchView, fetchPublic]);

  const vote = useCallback(
    async (targetId: string | null) => {
      const myId = view?.me.id;
      const prev = view?.myVote ?? null;
      const next = targetId ?? MAFIA_SKIP_KEY;
      if (prev === next || phaseSeq === undefined) return;
      unlockMafiaAudio();
      setError("");
      setView((v) => (v ? { ...v, myVote: next } : v));
      if (myId) setRoom((r) => (r ? withLocalVote(r, myId, prev, next) : r));
      playMafiaSound("vote");
      voteWant.current = { seq: phaseSeq, next };
      voteFixes.current = 0;
      await flushVote();
    },
    [view?.me.id, view?.myVote, phaseSeq, flushVote]
  );

  // طلب قديم من نفس الجوال (انقطع بالمهلة بس السيرفر كمّله) وصل متأخر بعد صوت أحدث وغيّر صوتي: يبان
  // بقائمة "مين صوّت على مين" العامة اللي توصل مع كل تحديث للغرفة. لو ظل صوتي فيها غير آخر اختيار لي
  // ثانية ونص، نرسل الأحدث من جديد (بحد 3 مرات بالجولة). لو اللي صوّتت عليه مات وسط التصويت، صوته
  // انشال بالسيرفر: ما نرجّعه
  const myVoterId = view?.me.id;
  const publicVote =
    room?.phase === "voting" && room.vote_voters && myVoterId
      ? (Object.entries(room.vote_voters).find(([, ids]) => ids.includes(myVoterId))?.[0] ?? null)
      : undefined;
  const publicVoteRef = useRef(publicVote);
  useEffect(() => {
    publicVoteRef.current = publicVote;
  }, [publicVote]);
  const meAlive = Boolean(view?.me.alive);
  useEffect(() => {
    if (publicVote === undefined) return;
    const stale = () => {
      const want = voteWant.current;
      const now = publicVoteRef.current;
      if (now === undefined || !want || want !== voteConfirmed.current || want.seq !== liveSeq.current) return false;
      if (now === want.next || voteFixes.current >= 3 || !meAlive) return false;
      return want.next === MAFIA_SKIP_KEY || players.some((p) => p.id === want.next && p.is_alive);
    };
    if (!stale()) return;
    const t = setTimeout(() => {
      if (!stale()) return;
      voteFixes.current++;
      voteConfirmed.current = null;
      void flushVote();
    }, 1500);
    return () => clearTimeout(t);
  }, [publicVote, players, meAlive, flushVote]);

  // -------------------------------------------------------------------
  // أزرار المنشئ
  // -------------------------------------------------------------------

  const host = useMemo(() => {
    /**
     * ضغطة منشئ بطلب يتعاد لو ما رد (لو علقت ضغطة المنشئ، الغرفة كلها توقف).
     * phaseBound: معها رقم المرحلة اللي ضغط فيها — السيرفر يتجاهلها لو تغيّرت المرحلة، فالإعادة
     * ما تنقل الغرفة مرحلتين. الطرد والإعدادات وقفل الغرفة ما تنقل مرحلة، وإعادتها ما تغيّر شي.
     */
    const press = <T = undefined,>(op: MafiaHostOp, extra: Record<string, unknown> = {}, phaseBound = true) =>
      run(async () => {
        const seqAtPress = phaseBound && liveSeq.current >= 0 ? liveSeq.current : undefined;
        const body = { roomCode, ...extra, ...(seqAtPress !== undefined ? { seq: seqAtPress } : {}) };
        const res = await sendRetry<T>(op, body, seqAtPress, PRESS_OFFLINE_ERROR);
        // المرحلة تغيّرت والضغطة ما رد عليها: يا وصلت ونقلتها، يا انتهت المرحلة قبلها
        return res ?? ({ success: true } as MafiaApiResult<T>);
      });
    return {
      /** devRole: وضع التجربة — فئة المنشئ */
      start: (devRole?: MafiaRole | null) => press("host-start", { devRole: devRole ?? null }),
      updateSettings: (settings: MafiaSettings) => press("host-settings", { settings }, false),
      skipPhase: () => press("host-skip"),
      /** الممنوع من الكلام تكلم: ينقتل */
      killSilenced: () => press("host-hush"),
      /** لاعب غشّ: ينذبح ويظل بالغرفة كميت (مو طرد) */
      killCheater: (playerId: string) => press("host-cheat", { playerId }),
      endGame: () => press("host-end"),
      kick: (playerId: string) => press("host-kick", { playerId }, false),
      playAgain: () => press("host-again"),
      addBots: () => run(() => addMafiaBots(roomCode)),
      setDiscussion: (seconds: number) => press("host-discussion-time", { seconds }, false),
      startDiscussion: (seconds: number) => press("host-discussion", { seconds }),
      newRoom: async () => {
        const res = await press<{ roomCode: string; token: string }>("host-new-room", {}, false);
        if (res?.success && res.data) onSwitchRef.current?.({ ...res.data, host: true });
        return res;
      },
      closeRoom: () => press("host-close", {}, false),
    };
  }, [run, roomCode, sendRetry]);

  // -------------------------------------------------------------------
  // مشتقات العرض
  // -------------------------------------------------------------------

  const me = view?.me ?? null;
  const alivePlayers = useMemo(() => players.filter((p) => p.is_alive), [players]);
  const nameOf = useCallback(
    (id: string | null | undefined) => players.find((p) => p.id === id)?.display_name ?? "",
    [players]
  );
  // الممنوع من الكلام اليوم (المسكت) — بس وقت النهار
  const dayPhase = room?.phase === "morning" || room?.phase === "discussion" || room?.phase === "voting";
  const silencedId = dayPhase ? silencedPlayerId(room?.announcements, players) : null;

  // الممنوع تكلم أو الغشاش، والمنشئ قتله وسط النهار: نفس صوت الذبح عند الكل، والحركة الخاصة على جواله هو
  const hushedSeen = useRef<number | null>(null);
  const hushed = (room?.announcements ?? []).filter((a) => a.kind === "hushed_kill" || a.kind === "cheat_kill");
  const hushedCount = hushed.length;
  const lastHushedId = hushed[hushedCount - 1]?.targetId;
  const lastHushedCheat = hushed[hushedCount - 1]?.kind === "cheat_kill";
  useEffect(() => {
    const first = hushedSeen.current === null;
    const grew = !first && hushedCount > (hushedSeen.current ?? 0);
    hushedSeen.current = hushedCount;
    if (!grew) return;
    const mine = Boolean(lastHushedId && lastHushedId === meIdRef.current);
    cueMafia("horror", mine ? (lastHushedCheat ? "victim_cheat" : "victim_hushed") : "hushed");
  }, [hushedCount, lastHushedId, lastHushedCheat]);

  return {
    roomCode,
    room,
    players,
    alivePlayers,
    view,
    me,
    isHost,
    error,
    setError,
    busy,
    devMode,
    devRoles,
    secondsLeft,
    /** النمط السريع: مؤقت الليل ما بدأ — ننتظر أصحاب المهام يوصلهم دورهم */
    nightArming,
    /** حالتي الخاصة من نفس المرحلة الحالية (مو من مرحلة قبل) */
    viewFresh,
    /** الشاشة تنتظر حالتي الخاصة وطوّلت أو فشلت محاولة: "النت ضعيف، نحاول نوصلك..." */
    weakNet,
    /** دوري المحفوظ أكيد من هاللعبة (مو من جولة قبل) */
    roleReady,
    /** كشف الأدوار: مين باقي ما شاف دوره */
    revealReady,
    /** دور الليل: مين باقي ما اختار (الاسم اللي اختفى ما يرجع) */
    nightReady,
    iSawRole,
    /** ضغطة "شفت دوري" وصلت السيرفر فعلاً */
    seenConfirmed,
    seeRole,
    nameOf,
    silencedId,
    act,
    decoy,
    chooseSheikh,
    rename,
    vote,
    host,
    refresh: fetchView,
  };
}

export type MafiaGameCtx = ReturnType<typeof useMafiaGame>;
