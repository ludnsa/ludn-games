"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  addMafiaBots,
  advanceMafiaPhase,
  castMafiaVote,
  devGetMafiaRoles,
  endMafiaGameNow,
  closeMafiaRoom,
  getMafiaMyView,
  isMafiaDevMode,
  kickMafiaPlayer,
  killSilencedMafiaPlayer,
  killCheaterMafiaPlayer,
  newMafiaRoom,
  playMafiaAgain,
  renameMafiaPlayer,
  setMafiaDiscussionTime,
  skipMafiaPhase,
  startMafiaDiscussion,
  startMafiaGame,
  submitMafiaNightAction,
  suggestMafiaTarget,
  submitMafiaDecoy,
  updateMafiaSettings,
  type MafiaMyView,
} from "@/actions/mafia";
import { MAFIA_SKIP_KEY, mafiaNightSteps, silencedPlayerId } from "@/lib/game/mafia-engine";
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
    const [{ data: roomRow }, { data: roster }] = await Promise.all([
      supabase.from("mafia_rooms").select("*").eq("room_code", roomCode).maybeSingle(),
      supabase.from("mafia_players").select("*").eq("room_code", roomCode).order("seat", { ascending: true }),
    ]);
    if (roomRow) setRoom(roomRow as MafiaRoom);
    if (roster) setPlayers(roster as MafiaPlayer[]);
  }, [supabase, roomCode]);

  const fetchView = useCallback(async () => {
    if (!roomCode || !token) return;
    const sentAt = Date.now();
    const res = await getMafiaMyView({ roomCode, token });
    if (!res.success) {
      if (res.error.includes("انتهت جلستك") || res.error.includes("غير موجودة")) {
        onLostRef.current("طلعت من الغرفة — المنشئ طردك أو انتهت الغرفة.");
      }
      return;
    }
    const roundTrip = Date.now() - sentAt;
    offsetRef.current = res.data.serverNow + roundTrip / 2 - Date.now();
    setView(res.data);
  }, [roomCode, token]);

  // -------------------------------------------------------------------
  // الإقلاع والبث اللحظي
  // -------------------------------------------------------------------

  // قناة إشارات بين الأجهزة (اسمها ثابت للغرفة): "فيه اقتراح جديد" — بدون أي محتوى،
  // فالقائد يجيب الاقتراح على طول بدل ما ينتظر الاستعلام الدوري
  const signalRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mafiaTurnRef = useRef(false);

  useEffect(() => {
    if (!roomCode) return;
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

    const signals = supabase
      .channel(`mafia_signal_${roomCode}`)
      .on("broadcast", { event: "mafia_suggest" }, () => {
        if (mafiaTurnRef.current) fetchView();
      })
      .subscribe();
    signalRef.current = signals;

    // شبكة أمان لو البث اللحظي انقطع بصمت
    const safety = setInterval(fetchPublic, 5000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(safety);
      supabase.removeChannel(channel);
      supabase.removeChannel(signals);
      signalRef.current = null;
    };
  }, [supabase, roomCode, fetchPublic, fetchView]);

  // كل ما تغيرت المرحلة: نجلب حالتي الخاصة من جديد
  const seq = room?.phase_seq ?? -1;
  useEffect(() => {
    if (seq >= 0) fetchView();
  }, [seq, fetchView]);

  // حالتي الخاصة ما لحقت المرحلة (الجلب تأخر أو فشل): نعيد المحاولة لين توصل —
  // أدوار الليل تنتظرها قبل ما تعرض بطاقة صاحب الدور أو سؤال التمويه
  const viewStale = Boolean(room && (!view || view.phaseSeq < room.phase_seq));
  useEffect(() => {
    if (!viewStale) return;
    const id = setInterval(fetchView, 2000);
    return () => clearInterval(id);
  }, [viewStale, fetchView]);

  // المافيا يتابعون اختيار القائد والمصادقة أول بأول (استعلام خاص، ما يكشف شي للباقين)
  const isMafiaTurn = room?.phase === "night_act" && room.night_step === "mafia" && view?.me.role === "mafia";
  useEffect(() => {
    mafiaTurnRef.current = isMafiaTurn;
    if (!isMafiaTurn) return;
    const id = setInterval(fetchView, 1500);
    return () => clearInterval(id);
  }, [isMafiaTurn, fetchView]);

  // وضع التجربة: المنشئ يشوف كل الأدوار
  const isHost = Boolean(view?.me.isHost);
  useEffect(() => {
    if (!devMode || !isHost || !roomCode || !room || room.phase === "lobby") return;
    devGetMafiaRoles(roomCode).then((res) => {
      if (res.success) setDevRoles(Object.fromEntries(res.data.map((r) => [r.playerId, r.role])));
    });
  }, [devMode, isHost, roomCode, room?.phase_seq]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const lastAdvance = useRef<{ seq: number; at: number }>({ seq: -1, at: 0 });
  useEffect(() => {
    if (!room || remainingMs === null || remainingMs > 0 || !token) return;
    const last = lastAdvance.current;
    if (last.seq === room.phase_seq && Date.now() - last.at < 2500) return;
    lastAdvance.current = { seq: room.phase_seq, at: Date.now() };

    // تأخير عشوائي بسيط حتى لا تضرب كل الأجهزة السيرفر بنفس اللحظة
    const jitter = Math.random() * 400;
    const t = setTimeout(() => {
      advanceMafiaPhase({ roomCode: room.room_code, token, seq: room.phase_seq });
    }, jitter);
    return () => clearTimeout(t);
  }, [room, remainingMs, token]);

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
        if (room.night_step === mafiaNightSteps(room.settings)[0]) playMafiaSound("owl");
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

  /**
   * صاحب الدور يختار ويضغط "استمرار" (null = الساحر/الصحفي يعدّي الليلة).
   * الحركة تطلع على شاشته بس وبدون صوت — أي صوت من جوال واحد يفضح فئته.
   */
  const act = useCallback(
    async (targetId: string | null) => {
      const step = room?.night_step;
      unlockMafiaAudio();
      setError("");
      // الشاشة تتقفل على اختياره فوراً، والسيرفر يحفظ بالخلفية (لو فشل نرجّعها)
      setView((v) => (v?.task ? { ...v, task: { ...v.task, locked: true, selectedId: targetId } } : v));
      const silent = { silent: true };
      if (step === "mafia") cueMafia("slash", "slash", silent);
      else if (step === "doctor") cueMafia("heal", "saved", silent);
      else if (step === "magician" && targetId) cueMafia("magic", "magic", silent);
      else if (step === "journalist" && targetId) cueMafia("camera", "flash", silent);

      const res = await submitMafiaNightAction({ roomCode, token, targetId });
      if (!res.success) setError(res.error);
      else if (step === "detective") {
        if (res.data.detectiveResult?.isMafia) cueMafia("dramatic", "reveal_mafia", silent);
        else cueMafia("womp", "miss", silent);
      }
      await fetchView();
    },
    [roomCode, token, room?.night_step, fetchView]
  );

  /** مافيا (غير القائد) يقترح على قائده — بدون صوت */
  const suggest = useCallback(
    async (targetId: string) => {
      setError("");
      setView((v) => (v?.task ? { ...v, task: { ...v.task, selectedId: targetId } } : v));
      const res = await suggestMafiaTarget({ roomCode, token, targetId });
      if (!res.success) {
        setError(res.error);
        fetchView();
        return;
      }
      signalRef.current?.send({ type: "broadcast", event: "mafia_suggest", payload: {} });
    },
    [roomCode, token, fetchView]
  );

  /**
   * سؤال التمويه: لازم كل الأحياء يجاوبون عشان يمشي الدور — يتقفل فوراً على الشاشة.
   * ينرسل مرة وحدة بس لكل دور، ومعه رقم الدور عشان السيرفر يتجاهله لو وصل متأخر.
   */
  const decoySeq = useRef<number | null>(null);
  const phaseSeq = room?.phase_seq;
  const decoy = useCallback(
    async (targetId: string) => {
      if (phaseSeq === undefined || decoySeq.current === phaseSeq) return;
      decoySeq.current = phaseSeq;
      setError("");
      setView((v) => (v ? { ...v, decoyId: targetId } : v));
      const res = await submitMafiaDecoy({ roomCode, token, targetId, seq: phaseSeq });
      if (!res.success) {
        decoySeq.current = null;
        setError(res.error);
        fetchView();
      }
    },
    [roomCode, token, fetchView, phaseSeq]
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
      start: () => run(() => startMafiaGame(roomCode)),
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
    nameOf,
    silencedId,
    act,
    suggest,
    decoy,
    rename,
    vote,
    host,
    refresh: fetchView,
  };
}

export type MafiaGameCtx = ReturnType<typeof useMafiaGame>;
