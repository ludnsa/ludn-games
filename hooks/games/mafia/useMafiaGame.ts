"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  addMafiaBots,
  castMafiaVote,
  devGetMafiaRoles,
  endMafiaGameNow,
  closeMafiaRoom,
  isMafiaDevMode,
  kickMafiaPlayer,
  killSilencedMafiaPlayer,
  killCheaterMafiaPlayer,
  chooseMafiaSheikhMode,
  newMafiaRoom,
  pingMafiaSession,
  playMafiaAgain,
  renameMafiaPlayer,
  setMafiaDiscussionTime,
  skipMafiaPhase,
  startMafiaDiscussion,
  startMafiaGame,
  submitMafiaNightAction,
  submitMafiaDecoy,
  updateMafiaSettings,
  type MafiaMyView,
} from "@/actions/mafia";
import { MAFIA_SKIP_KEY, isFastMafia, mafiaNightSteps, silencedPlayerId } from "@/lib/game/mafia-engine";
import { MAFIA_CONFIG } from "@/constants/mafia";
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

/** اختيار الليل ما وصل للسيرفر (النت انقطع): نرجّع الشاشة عشان يضغط من جديد بدل ما يعلق */
const OFFLINE = { success: false, error: "ما وصل اختيارك — تأكد من النت واضغط مرة ثانية" } as const;

/** مهلة طلبات اللعب: الطلب اللي ما رد خلالها ينقطع وينعاد، بدل ما يعلق الجوال وراه */
const MAFIA_REQUEST_TIMEOUT_MS = 4000;
/** طلب الانتقال (يسوي شغل أكثر بالسيرفر، والمرحلة الجديدة توصل بالبث): ننتظره أطول وما نكرره وهو شغال */
const MAFIA_ADVANCE_TIMEOUT_MS = 20000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type MafiaApiResult<T> = { success: true; data?: T } | { success: false; error: string; network?: true };

/**
 * طلب لعب من الجوال (app/api/mafia/[op]): طلب عادي ينقطع بعد المهلة، مو دالة سيرفر —
 * دوال السيرفر تمشي بالدور، فطلب معلّق يوقف كل اللي وراه.
 * network = ما رد أو انقطع أو خطأ بالسيرفر: ينفع نعيده.
 */
async function postMafia<T = undefined>(
  op: "view" | "seen" | "got" | "advance" | "lead",
  body: { roomCode: string; token: string; seq?: number },
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
  const [devMode, setDevMode] = useState(false);
  const [devRoles, setDevRoles] = useState<Record<string, MafiaRole | null>>({});

  // فرق الساعة بين الجهاز والسيرفر، عشان المؤقت يكون نفسه عند الكل
  const offsetRef = useRef(0);
  const [now, setNow] = useState(() => Date.now());

  const onLostRef = useRef(onSessionLost);
  const onSwitchRef = useRef(onSwitchSession);
  useEffect(() => {
    onLostRef.current = onSessionLost;
    onSwitchRef.current = onSwitchSession;
  }, [onSessionLost, onSwitchSession]);

  // -------------------------------------------------------------------
  // الجلب
  // -------------------------------------------------------------------

  const fetchPublic = useCallback(async () => {
    if (!roomCode) return;
    // الجلب المعلّق ينقطع بعد المهلة — عشان رد قديم متأخر ما يرجّع الشاشة لمرحلة خلصت
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), MAFIA_REQUEST_TIMEOUT_MS);
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
      // رقم المرحلة ما ينقص أبداً: رد أقدم من اللي عندنا ما ياخذ مكانه
      if (roomRow) setRoom((prev) => (prev && prev.phase_seq > (roomRow as MafiaRoom).phase_seq ? prev : (roomRow as MafiaRoom)));
      if (roster) setPlayers(roster as MafiaPlayer[]);
    } catch {
      // انقطع أو ما رد: الجلب الجاي (كل 5 ثواني) أو البث اللحظي يجيب الحالة
    } finally {
      clearTimeout(timer);
    }
  }, [supabase, roomCode]);

  /** ok = وصلت. fail = ما رد أو انقطع (نعيد). stop = رد نهائي ما ينفع نعيده */
  const fetchViewOnce = useCallback(async (): Promise<"ok" | "fail" | "stop"> => {
    if (!roomCode || !token) return "stop";
    const sentAt = Date.now();
    const res = await postMafia<MafiaMyView>("view", { roomCode, token });
    if (!res.success) {
      if (res.network) return "fail";
      if (res.error.includes("انتهت جلستك") || res.error.includes("غير موجودة")) {
        onLostRef.current("طلعت من الغرفة — المنشئ طردك أو انتهت الغرفة.");
      }
      return "stop";
    }
    if (!res.data) return "fail";
    const roundTrip = Date.now() - sentAt;
    offsetRef.current = res.data.serverNow + roundTrip / 2 - Date.now();
    setView(res.data);
    return "ok";
  }, [roomCode, token]);

  /**
   * جلب حالتي الخاصة — طلب واحد بس بالمرة. لو انطلب جلب والجلب الحالي ما خلص، نعيده مرة وحدة
   * بعده عشان آخر حالة توصل. الطلب اللي ما رد خلال 4 ثواني ينقطع، ونعيد المحاولة تلقائياً لين ينجح
   * (بدون ما يوقف باقي الطلبات — كل طلب لحاله).
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
          const result = await fetchViewLatest.current();
          if (gen !== viewGen.current) return;
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
    isMafiaDevMode().then(setDevMode);

    const channel = supabase
      .channel(`mafia_${roomCode}_${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "mafia_rooms", filter: `room_code=eq.${roomCode}` },
        (payload) => setRoom((prev) => ({ ...(prev || {}), ...payload.new }) as MafiaRoom)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mafia_players", filter: `room_code=eq.${roomCode}` },
        () => {
          fetchPublic();
          fetchView();
        }
      )
      .subscribe();

    // الجوالات تقطع الاتصال عند إطفاء الشاشة — نُحدّث عند العودة
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchPublic();
        fetchView();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    // شبكة أمان لو البث اللحظي انقطع بصمت
    const safety = setInterval(fetchPublic, 5000);

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

  // وضع التجربة: المنشئ يشوف كل الأدوار
  const isHost = Boolean(view?.me.isHost);
  useEffect(() => {
    if (!devMode || !isHost || !roomCode || !room || room.phase === "lobby") return;
    devGetMafiaRoles(roomCode).then((res) => {
      if (res.success) setDevRoles(Object.fromEntries(res.data.map((r) => [r.playerId, r.role])));
    });
  }, [devMode, isHost, roomCode, room?.phase_seq]); // eslint-disable-line react-hooks/exhaustive-deps

  // حساب التجربة بالسيرفر: صفحة المنشئ مفتوحة قبل أول صباح = لسا موجود (كل دقيقة، ولما يرجع للصفحة).
  // لو سكّرها والصباح ما جا، تجربته ترجع لما يبدأ لعبة ثانية. مجرد إشارة، ما تغيّر شي باللعبة
  const beforeFirstMorning =
    !!room && (room.phase === "reveal" || room.phase === "night_act" || room.phase === "night_done") && room.night_number <= 1;
  const sessionPing = isHost && beforeFirstMorning ? roomCode : "";
  useEffect(() => {
    if (!sessionPing) return;
    const ping = () => void pingMafiaSession(sessionPing).catch(() => {});
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
  }, [sessionPing]);

  // -------------------------------------------------------------------
  // المؤقت والانتقال التلقائي
  // -------------------------------------------------------------------

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const endsAt = room?.phase_ends_at ? Date.parse(room.phase_ends_at) : null;
  const remainingMs = endsAt === null ? null : Math.max(0, endsAt - (now + offsetRef.current));
  const secondsLeft = remainingMs === null ? null : Math.ceil(remainingMs / 1000);

  // طلب انتقال واحد بس بالمرة من هالجوال: ما نرسل ثاني لين يرجع اللي قبله (وبعده بـ 2.5 ثانية لو
  // المرحلة ما تغيرت) — وإلا لو السيرفر بطّى، الطلبات تتكدس فوق بعض وكل واحد يسوي نفس الشغل
  const lastAdvance = useRef<{ seq: number; at: number; busy: boolean }>({ seq: -1, at: 0, busy: false });
  useEffect(() => {
    if (!room || remainingMs === null || remainingMs > 0 || !token) return;
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
  }, [room, remainingMs, token]);

  // النمط السريع: الليل بدأ بس مؤقته ما بدأ — ننتظر كل أصحاب المهام يوصلهم دورهم (بحد أقصى)
  const nightArming = Boolean(
    room &&
      room.phase === "night_act" &&
      isFastMafia(room.settings) &&
      remainingMs !== null &&
      remainingMs > MAFIA_CONFIG.FAST_NIGHT_SECONDS * 1000
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
        const res = await postMafia("got", { roomCode, token, seq: ackSeq });
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
      while (!stopped) {
        const res = await postMafia<{ leader: boolean; stop: boolean }>("lead", { roomCode, token, seq: leadSeq });
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

  /** كشف الأدوار: ضغطت "شفت دوري" (رقم المرحلة) — يتحدد على شاشتي فوراً، والسيرفر بالخلفية */
  const [seenSeq, setSeenSeq] = useState<number | null>(null);
  const revealSeq = room?.phase === "reveal" ? room.phase_seq : null;
  const seeRole = useCallback(async () => {
    if (revealSeq === null || seenSeq === revealSeq) return;
    unlockMafiaAudio();
    setError("");
    setSeenSeq(revealSeq);
    for (let i = 0; i < 15; i++) {
      const res = await postMafia("seen", { roomCode, token, seq: revealSeq });
      if (res.success) return;
      if (!isNetworkFail(res)) {
        setSeenSeq(null);
        setError(res.error);
        return;
      }
      await sleep(1000);
    }
    setSeenSeq(null);
    setError("ما وصلت ضغطتك — تأكد من النت واضغط مرة ثانية");
  }, [revealSeq, seenSeq, roomCode, token]);

  // مين باقي ما شاف دوره (السيرفر يكتبه بـ night_ready بليلة صفر)
  const revealReady =
    room?.phase === "reveal" && room.night_ready?.night === 0 && room.night_ready.seq === room.phase_seq
      ? room.night_ready
      : null;
  const myId = view?.me.id;
  const iSawRole =
    revealSeq !== null &&
    (seenSeq === revealSeq || Boolean(revealReady?.waiting && myId && !revealReady.waiting.includes(myId)));

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
   * بدون صوت وبدون حركة ولا لون خاص: شاشته لازم تكون مثل شاشات الباقين بالضبط،
   * لأن اللي جنبه يقدر يلمحها. ينرسل مرة وحدة بس لكل دور (لو ضغط مرتين بسرعة).
   */
  const actSeq = useRef<number | null>(null);
  const act = useCallback(
    async (targetId: string | null) => {
      if (phaseSeq === undefined || actSeq.current === phaseSeq) return;
      actSeq.current = phaseSeq;
      unlockMafiaAudio();
      setError("");
      // الشاشة تتقفل على اختياره فوراً، والسيرفر يحفظ بالخلفية (لو فشل نرجّعها)
      setView((v) => (v?.task ? { ...v, task: { ...v.task, locked: true, selectedId: targetId } } : v));
      const res = await submitMafiaNightAction({ roomCode, token, targetId }).catch(() => OFFLINE);
      if (!res.success) {
        actSeq.current = null;
        setError(res.error);
      }
      await fetchView();
    },
    [roomCode, token, fetchView, phaseSeq]
  );

  /**
   * سؤال التمويه: لازم كل الأحياء يجاوبون عشان يمشي الدور — ضغطة وحدة ويتقفل فوراً على الشاشة.
   * ينرسل مرة وحدة بس لكل دور، ومعه رقم الدور عشان السيرفر يتجاهله لو وصل متأخر.
   */
  const decoySeq = useRef<number | null>(null);
  const decoy = useCallback(
    async (targetId: string) => {
      if (phaseSeq === undefined || decoySeq.current === phaseSeq) return;
      decoySeq.current = phaseSeq;
      setError("");
      setView((v) => (v ? { ...v, decoyId: targetId } : v));
      const res = await submitMafiaDecoy({ roomCode, token, targetId, seq: phaseSeq }).catch(() => OFFLINE);
      if (!res.success) {
        decoySeq.current = null;
        setError(res.error);
        fetchView();
      }
    },
    [roomCode, token, fetchView, phaseSeq]
  );

  /** الشيخ يختار نوع نقاش اليوم — يتحدد على شاشته فوراً، ويقدر يغيّره لين يبدأ النقاش */
  const chooseSheikh = useCallback(
    async (led: boolean) => {
      setError("");
      setView((v) => (v ? { ...v, sheikhLed: led } : v));
      const res = await chooseMafiaSheikhMode({ roomCode, token, led });
      if (!res.success) {
        setError(res.error);
        fetchView();
      }
    },
    [roomCode, token, fetchView]
  );

  const rename = useCallback(
    async (displayName: string) => {
      const res = await run(() => renameMafiaPlayer({ roomCode, token, displayName }));
      if (res?.success) await Promise.all([fetchView(), fetchPublic()]);
      return Boolean(res?.success);
    },
    [run, roomCode, token, fetchView, fetchPublic]
  );

  const vote = useCallback(
    async (targetId: string | null) => {
      const myId = view?.me.id;
      const prev = view?.myVote ?? null;
      const next = targetId ?? MAFIA_SKIP_KEY;
      if (prev === next) return;
      unlockMafiaAudio();
      setError("");
      setView((v) => (v ? { ...v, myVote: next } : v));
      if (myId) setRoom((r) => (r ? withLocalVote(r, myId, prev, next) : r));
      playMafiaSound("vote");
      const res = await castMafiaVote({ roomCode, token, targetId });
      if (!res.success) {
        setError(res.error);
        fetchView();
        fetchPublic();
      }
    },
    [view?.me.id, view?.myVote, roomCode, token, fetchView, fetchPublic]
  );

  // -------------------------------------------------------------------
  // أزرار المنشئ
  // -------------------------------------------------------------------

  const host = useMemo(
    () => ({
      /** devRole: وضع التجربة — فئة المنشئ */
      start: (devRole?: MafiaRole | null) => run(() => startMafiaGame(roomCode, devRole)),
      updateSettings: (settings: MafiaSettings) => run(() => updateMafiaSettings({ roomCode, settings })),
      skipPhase: () => run(() => skipMafiaPhase(roomCode)),
      /** الممنوع من الكلام تكلم: ينقتل */
      killSilenced: () => run(() => killSilencedMafiaPlayer(roomCode)),
      /** لاعب غشّ: ينذبح ويظل بالغرفة كميت (مو طرد) */
      killCheater: (playerId: string) => run(() => killCheaterMafiaPlayer({ roomCode, playerId })),
      endGame: () => run(() => endMafiaGameNow(roomCode)),
      kick: (playerId: string) => run(() => kickMafiaPlayer({ roomCode, playerId })),
      playAgain: () => run(() => playMafiaAgain(roomCode)),
      addBots: () => run(() => addMafiaBots(roomCode)),
      setDiscussion: (seconds: number) => run(() => setMafiaDiscussionTime({ roomCode, seconds })),
      startDiscussion: (seconds: number) => run(() => startMafiaDiscussion({ roomCode, seconds })),
      newRoom: async () => {
        const res = await run(() => newMafiaRoom(roomCode));
        if (res?.success) onSwitchRef.current?.({ ...res.data, host: true });
        return res;
      },
      closeRoom: () => run(() => closeMafiaRoom(roomCode)),
    }),
    [run, roomCode]
  );

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
    /** دوري المحفوظ أكيد من هاللعبة (مو من جولة قبل) */
    roleReady,
    /** كشف الأدوار: مين باقي ما شاف دوره */
    revealReady,
    iSawRole,
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
