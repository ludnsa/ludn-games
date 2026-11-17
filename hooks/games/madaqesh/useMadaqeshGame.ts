"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { startBackupRead } from "@/lib/game/room-backup-read";
import {
  addMadaqeshBots,
  closeMadaqeshRoom,
  decideMadaqesh,
  endMadaqeshGame,
  forceMadaqeshResponses,
  getMadaqeshMe,
  isMadaqeshDevMode,
  kickMadaqeshPlayer,
  newMadaqeshRoom,
  nextMadaqeshRound,
  outMadaqeshPlayer,
  pingMadaqeshSession,
  placeMadaqeshBid,
  playMadaqeshAgain,
  respondMadaqesh,
  setMadaqeshBalance,
  setMadaqeshPlayerPosition,
  setMadaqeshShowdownWinner,
  shuffleMadaqeshPlayers,
  skipMadaqeshTurn,
  startMadaqeshGame,
  undoMadaqeshRound,
  updateMadaqeshSettings,
} from "@/actions/madaqesh";
import {
  checkMadaqeshWinner,
  contestants,
  currentBidderId,
  pickDecider,
  respondersFor,
  settleRound,
  showdownWinners,
  validateBid,
  validateDecision,
} from "@/lib/game/madaqesh-engine";
import type {
  MadaqeshBidKind,
  MadaqeshDecision,
  MadaqeshHistoryRow,
  MadaqeshPlayer,
  MadaqeshResponse,
  MadaqeshRoom,
  MadaqeshRound,
  MadaqeshSettings,
} from "@/types/madaqesh";

export interface MadaqeshSession {
  roomCode: string;
  token: string;
  /** هذا الجهاز سوّى الغرفة */
  host?: boolean;
}

/**
 * حالة حاسبة مداقش على جهاز واحد.
 * كل شي مكشوف للكل، فالغرفة واللاعبين والسجل كلهم من البث اللحظي مباشرة.
 */
export function useMadaqeshGame(
  session: MadaqeshSession,
  onSessionLost: (notice?: string) => void,
  /** المنشئ فتح غرفة جديدة: ننقل جهازه لها */
  onSwitchSession?: (next: MadaqeshSession) => void
) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const { roomCode, token } = session;

  const [room, setRoom] = useState<MadaqeshRoom | null>(null);
  const [players, setPlayers] = useState<MadaqeshPlayer[]>([]);
  const [history, setHistory] = useState<MadaqeshHistoryRow[]>([]);
  const [me, setMe] = useState<{ playerId: string; isHost: boolean } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [devMode, setDevMode] = useState(false);

  /** فيه ضغطة تنتظر تأكيد السيرفر — ما نجلب حالة قديمة فوقها */
  const inFlight = useRef(false);
  /**
   * حماية القراءة من إنها تكتب فوق شي أحدث منها:
   * - عدّاد تحديثات البث (الغرفة لحالها واللاعبين لحالهم): لو وصل تحديث والقراءة بالطريق، ردها ممكن يكون أقدم منه
   * - الضغطات اللي تغيّر الشاشة على طول (المزايدة، القرار، الرد...): لو بدأت ضغطة والقراءة بالطريق، أو للحين تنتظر
   *   السيرفر، الرد ممكن يرجّع الشاشة لورا — فنتركه، ونقرا من جديد بعد ما يرد السيرفر (عشان ما يضيع تغيير لاعب ثاني)
   */
  const roomEvents = useRef(0);
  const playersEvents = useRef(0);
  const localSeq = useRef(0);
  const pending = useRef(0);
  const readAfterPending = useRef(false);
  const onLostRef = useRef(onSessionLost);
  const onSwitchRef = useRef(onSwitchSession);
  useEffect(() => {
    onLostRef.current = onSessionLost;
    onSwitchRef.current = onSwitchSession;
  }, [onSessionLost, onSwitchSession]);

  // -------------------------------------------------------------------
  // الجلب والبث اللحظي
  // -------------------------------------------------------------------

  const fetchPublic = useMemo(() => {
    const fetchOnce = async (signal?: AbortSignal): Promise<void> => {
      const local0 = localSeq.current;
      const room0 = roomEvents.current;
      const players0 = playersEvents.current;
      const roomQuery = supabase.from("madaqesh_rooms").select("*").eq("room_code", roomCode);
      const rosterQuery = supabase.from("madaqesh_players").select("*").eq("room_code", roomCode).order("seat", { ascending: true });
      const [{ data: roomRow }, { data: roster }] = await Promise.all([
        (signal ? roomQuery.abortSignal(signal) : roomQuery).maybeSingle(),
        signal ? rosterQuery.abortSignal(signal) : rosterQuery,
      ]);
      if (!roomRow && !roster) return;
      // ضغطة من هالجهاز بدأت وهي بالطريق، أو للحين تنتظر السيرفر: نتركه ونقرا من جديد بعد ما يرد
      if (localSeq.current !== local0 || pending.current > 0) {
        if (pending.current > 0) readAfterPending.current = true;
        else void fetchOnce();
        return;
      }
      // وصل تحديث أحدث من البث وهي بالطريق: نتركه (الغرفة: التحديث فيه الصف كامل. اللاعبين: التحديث يقرا من جديد)
      if (roomRow && roomEvents.current === room0) setRoom(roomRow as MadaqeshRoom);
      if (roster && playersEvents.current === players0) {
        setPlayers((roster as MadaqeshPlayer[]).map((p) => ({ ...p, balance: Number(p.balance) })));
      }
    };
    return fetchOnce;
  }, [supabase, roomCode]);

  /** ضغطة تغيّر الشاشة على طول: بدايتها ونهايتها (لما يرد السيرفر) */
  const beginLocal = useCallback(() => {
    pending.current++;
    localSeq.current++;
  }, []);
  const endLocal = useCallback(() => {
    pending.current--;
    if (pending.current > 0 || !readAfterPending.current) return;
    readAfterPending.current = false;
    void fetchPublic();
  }, [fetchPublic]);

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase
      .from("madaqesh_rounds")
      .select("*")
      .eq("room_code", roomCode)
      .order("round", { ascending: false })
      .limit(50);
    if (data) setHistory(data as MadaqeshHistoryRow[]);
  }, [supabase, roomCode]);

  const fetchMe = useCallback(async () => {
    const res = await getMadaqeshMe({ roomCode, token });
    if (!res.success) {
      if (res.error.includes("انتهت جلستك") || res.error.includes("غير موجودة")) {
        onLostRef.current("🚫 طلعت من الغرفة — المنشئ طردك أو انتهت الغرفة.");
      }
      return;
    }
    setMe({ playerId: res.data.playerId, isHost: res.data.isHost });
  }, [roomCode, token]);

  useEffect(() => {
    fetchPublic();
    fetchMe();
    fetchHistory();
    isMadaqeshDevMode().then(setDevMode);

    // القراءة الاحتياطية (lib/game/room-backup-read.ts — نفس باقي الألعاب): أول ما يتصل البث ولما يرجع،
    // ولما يرجع التبويب أو النت، وكل 10 ثواني سكوت (4 والبث مقطوع). التبويب مخفي: ما نقرا لين يرجع.
    // ضغطة تنتظر السيرفر: ما نقرا (نجلب حالة قديمة فوقها)
    const backup = startBackupRead(async ({ signal }) => {
      if (pending.current > 0) return;
      await fetchPublic(signal);
    });

    const channel = supabase
      .channel(`madaqesh_${roomCode}_${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "madaqesh_rooms", filter: `room_code=eq.${roomCode}` },
        (payload) => {
          roomEvents.current++;
          backup.onEvent();
          setRoom((prev) => ({ ...(prev || {}), ...payload.new }) as MadaqeshRoom);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "madaqesh_players", filter: `room_code=eq.${roomCode}` },
        (payload) => {
          playersEvents.current++;
          backup.onEvent();
          fetchPublic();
          // انطردت (انحذفت من الغرفة)
          if (payload.eventType === "DELETE") fetchMe();
        }
      )
      .subscribe((status) => backup.onStatus(status));

    // السجل: لما يرجع التبويب (وغير كذا يتحدث مع كل جولة تنحسب أو تنعاد)
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchHistory();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      backup.stop();
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [supabase, roomCode, fetchPublic, fetchMe, fetchHistory]);

  // جلسات اللعب: صفحة المنشئ ترسل كل دقيقة واللعبة شغالة. منها يعرف السيرفر إن المنشئ موجود
  // (بعد 10 دقايق تنحسب)، ولو سكّرها وبدأ لعبة ثانية ترجع تجربة هذي
  const inPlay = !!room && room.phase !== "lobby" && room.phase !== "ended" && room.phase !== "closed";
  const sessionPing = me?.isHost && inPlay ? roomCode : "";
  useEffect(() => {
    if (!sessionPing) return;
    const ping = () => void pingMadaqeshSession(sessionPing).catch(() => {});
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

  // السجل يتحدث مع كل جولة تنحسب أو تنعاد
  const historyKey = `${room?.round_number ?? 0}:${room?.phase ?? ""}`;
  useEffect(() => {
    fetchHistory();
  }, [historyKey, fetchHistory]);

  // -------------------------------------------------------------------
  // الأفعال
  // -------------------------------------------------------------------

  const run = useCallback(async <T extends { success: boolean; error?: string }>(fn: () => Promise<T>) => {
    setError("");
    setBusy(true);
    try {
      const res = await fn();
      if (!res.success && "error" in res && res.error) setError(res.error);
      return res;
    } finally {
      setBusy(false);
    }
  }, []);

  /**
   * الأزرار الفورية: التغيير يطلع على الشاشة على طول (بنفس محرك الحساب اللي في السيرفر)،
   * والسيرفر يأكده بالخلفية. لو رفض، نرجع لحالته ونطلع الخطأ.
   */
  const instant = useCallback(
    async <T extends { success: boolean; error?: string }>(apply: () => void, fn: () => Promise<T>) => {
      if (inFlight.current) return null;
      inFlight.current = true;
      beginLocal();
      setError("");
      apply();
      try {
        const res = await fn();
        if (!res.success) {
          if ("error" in res && res.error) setError(res.error);
          // رفض السيرفر: نرجع لحالته (القراءة تبدأ أول ما تخلص الضغطة)
          readAfterPending.current = true;
        }
        return res;
      } finally {
        inFlight.current = false;
        endLocal();
      }
    },
    [beginLocal, endLocal]
  );

  /** نحسب الجولة محلياً (نفس حساب السيرفر) ونعرض النتيجة والأرصدة الجديدة فوراً */
  const applyLocalSettle = useCallback(
    (r: MadaqeshRoom, round: MadaqeshRound, winnerIds: string[]) => {
      const s = settleRound(round, players, winnerIds, r.settings);
      const champion = checkMadaqeshWinner(s.updates, r.settings.targetAmount);
      const winners = showdownWinners(round, winnerIds);
      setRoom({
        ...r,
        phase: champion ? "ended" : "result",
        round: {
          ...round,
          result: {
            deltas: s.deltas,
            winnerId: winners.length === 1 ? winners[0] : null,
            winnerIds: winners,
            revived: s.revived,
            eliminated: s.eliminated,
          },
        },
        winner_id: champion,
      });
      const byId = new Map(s.updates.map((u) => [u.id, u]));
      setPlayers((ps) => ps.map((p) => ({ ...p, ...(byId.get(p.id) ?? {}) })));
    },
    [players]
  );

  const bid = useCallback(
    (kind: MadaqeshBidKind, amount = 0) => {
      const r = room;
      const mine = me ? players.find((p) => p.id === me.playerId) : undefined;
      if (!r?.round || !mine || currentBidderId(r.round) !== mine.id) return Promise.resolve(null);
      const v = validateBid(r.round, mine.balance, kind, amount);
      if (!v.ok) {
        setError(v.error);
        return Promise.resolve(null);
      }
      return instant(
        () => {
          const next: MadaqeshRound = { ...r.round!, bids: { ...r.round!.bids, [mine.id]: v.bid }, turn: r.round!.turn + 1 };
          if (next.turn < next.order.length) return setRoom({ ...r, round: next });
          const deciderId = pickDecider(next);
          setRoom(
            deciderId
              ? { ...r, phase: "deciding", round: { ...next, deciderId } }
              : {
                  ...r,
                  phase: "result",
                  round: { ...next, result: { deltas: {}, winnerId: null, winnerIds: [], revived: [], eliminated: [], void: true } },
                }
          );
        },
        () => placeMadaqeshBid({ roomCode, token, kind, amount })
      );
    },
    [room, me, players, instant, roomCode, token]
  );

  const decide = useCallback(
    (decision: MadaqeshDecision) => {
      const r = room;
      if (!r?.round) return Promise.resolve(null);
      const v = validateDecision(r.round, decision);
      if (!v.ok) {
        setError(v.error);
        return Promise.resolve(null);
      }
      return instant(
        () => {
          const next: MadaqeshRound = { ...r.round!, decision: v.decision, responses: {} };
          if (respondersFor(next).length > 0) setRoom({ ...r, phase: "responding", round: next });
          else if (contestants(next).length > 0) setRoom({ ...r, phase: "showdown", round: next });
          else applyLocalSettle(r, next, []);
        },
        () => decideMadaqesh({ roomCode, token, decision })
      );
    },
    [room, instant, applyLocalSettle, roomCode, token]
  );

  /** الرد يتلوّن فوراً، والسيرفر يحفظ بالخلفية */
  const respond = useCallback(
    async (response: MadaqeshResponse) => {
      setError("");
      const myId = me?.playerId;
      beginLocal();
      if (myId) {
        setRoom((r) =>
          r?.round ? { ...r, round: { ...r.round, responses: { ...r.round.responses, [myId]: response } } } : r
        );
      }
      try {
        const res = await respondMadaqesh({ roomCode, token, response });
        if (!res.success) {
          setError(res.error);
          readAfterPending.current = true;
        }
      } finally {
        endLocal();
      }
    },
    [me?.playerId, roomCode, token, beginLocal, endLocal]
  );

  /** المنشئ يسجّل صاحب أقوى ورق — أو أكثر من واحد لو تعادل */
  const setWinners = useCallback(
    (winnerIds: string[]) => {
      const r = room;
      if (!r?.round || r.phase !== "showdown" || winnerIds.length === 0) return Promise.resolve(null);
      return instant(
        () => applyLocalSettle(r, r.round!, winnerIds),
        () => setMadaqeshShowdownWinner({ roomCode, token, winnerIds })
      );
    },
    [room, instant, applyLocalSettle, roomCode, token]
  );

  /** ترتيب اللاعبين: يتحرك فوراً لمكانه الجديد والباقين يتزحزحون */
  const setPosition = useCallback(
    (playerId: string, position: number) =>
      instant(
        () =>
          setPlayers((ps) => {
            const from = ps.findIndex((p) => p.id === playerId);
            if (from < 0) return ps;
            const next = [...ps];
            const [item] = next.splice(from, 1);
            next.splice(Math.max(0, Math.min(position, next.length)), 0, item);
            return next.map((p, i) => ({ ...p, seat: i + 1 }));
          }),
        () => setMadaqeshPlayerPosition({ roomCode, playerId, position })
      ),
    [instant, roomCode]
  );

  const host = useMemo(
    () => ({
      start: () => run(() => startMadaqeshGame(roomCode)),
      updateSettings: (settings: MadaqeshSettings) => run(() => updateMadaqeshSettings({ roomCode, settings })),
      setPosition,
      shuffle: () => run(() => shuffleMadaqeshPlayers(roomCode)),
      kick: (playerId: string) => run(() => kickMadaqeshPlayer({ roomCode, playerId })),
      out: (playerId: string) => run(() => outMadaqeshPlayer({ roomCode, playerId })),
      newRoom: async () => {
        const res = await run(() => newMadaqeshRoom(roomCode));
        if (res?.success) onSwitchRef.current?.({ ...res.data, host: true });
        return res;
      },
      skipTurn: () => run(() => skipMadaqeshTurn(roomCode)),
      forceResponses: () => run(() => forceMadaqeshResponses(roomCode)),
      undo: () => run(() => undoMadaqeshRound(roomCode)),
      setBalance: (playerId: string, balance: number) => run(() => setMadaqeshBalance({ roomCode, playerId, balance })),
      endGame: () => run(() => endMadaqeshGame(roomCode)),
      playAgain: () => run(() => playMadaqeshAgain(roomCode)),
      closeRoom: () => run(() => closeMadaqeshRoom(roomCode)),
      nextRound: () => run(() => nextMadaqeshRound(roomCode)),
      addBots: () => run(() => addMadaqeshBots(roomCode)),
    }),
    [run, roomCode, setPosition]
  );

  // -------------------------------------------------------------------
  // مشتقات العرض
  // -------------------------------------------------------------------

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const nameOf = useCallback((id: string | null | undefined) => (id ? byId.get(id)?.display_name ?? "" : ""), [byId]);
  const mePlayer = me ? byId.get(me.playerId) ?? null : null;

  return {
    session,
    room,
    players,
    history,
    me: mePlayer,
    isHost: Boolean(me?.isHost),
    error,
    setError,
    busy,
    devMode,
    nameOf,
    playerOf: (id: string | null | undefined) => (id ? byId.get(id) ?? null : null),
    bid,
    decide,
    respond,
    setWinners,
    host,
  };
}

export type MadaqeshGameCtx = ReturnType<typeof useMadaqeshGame>;
