"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useGameAccess } from "@/hooks/shared/useGameAccess";
import { QUIZ_CONFIG, QUIZ_GAME } from "@/constants/quiz-grid";
import {
  createQuizRoom,
  endQuizSession,
  getQuizActiveCell,
  getQuizCategories,
  getQuizSession,
  resolveQuizQuestion,
  revealQuizAnswer,
  selectQuizCell,
  startQuizSession,
  activateQuizLifeline,
  type QuizActiveCellView,
  type QuizCategoryOption,
} from "@/actions/quiz-grid";
import type { QuizBoardCell, QuizRoom, QuizSessionPlayer, QuizTeam } from "@/types";

const ROOM_STORAGE_KEY = "quiz_referee_room_code";
const ACTIVE_SESSION_KEY = "quiz_active_session";

/** الثواني المتبقية حتى وقت الانتهاء المخزّن في قاعدة البيانات. */
function secondsUntil(deadline: string | null): number {
  if (!deadline) return 0;
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000);
  return Math.max(0, diff);
}

export function useQuizHost() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const { checkAccess } = useGameAccess();

  const [mounted, setMounted] = useState(false);
  const [isAccessChecking, setIsAccessChecking] = useState(true);
  const [isBooting, setIsBooting] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState<QuizRoom | null>(null);
  const [cells, setCells] = useState<QuizBoardCell[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [players, setPlayers] = useState<QuizSessionPlayer[]>([]);
  const [activeCell, setActiveCell] = useState<QuizActiveCellView | null>(null);

  // شاشة الإعداد
  const [categories, setCategories] = useState<QuizCategoryOption[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [t1Name, setT1Name] = useState("الفريق الأول");
  const [t2Name, setT2Name] = useState("الفريق الثاني");

  const [showQRModal, setShowQRModal] = useState(false);
  const [restPickerOpen, setRestPickerOpen] = useState(false);
  const [alert, setAlert] = useState<{
    show: boolean;
    message: string;
    isConfirm?: boolean;
    onConfirm?: () => void;
  }>({ show: false, message: "" });

  const [remaining, setRemaining] = useState<number>(QUIZ_CONFIG.TIMER_SECONDS);

  const roomCodeRef = useRef("");
  roomCodeRef.current = roomCode;

  const triggerAlert = useCallback(
    (message: string) => setAlert({ show: true, message, isConfirm: false }),
    []
  );
  const triggerConfirm = useCallback(
    (message: string, onConfirm: () => void) =>
      setAlert({ show: true, message, isConfirm: true, onConfirm }),
    []
  );
  const closeAlert = useCallback(() => setAlert({ show: false, message: "" }), []);

  // -------------------------------------------------------------------
  // تحميل الجلسة
  // -------------------------------------------------------------------

  const refreshSession = useCallback(async (code?: string) => {
    const target = code || roomCodeRef.current;
    if (!target) return;

    const res = await getQuizSession(target);
    if (!res.success) return;

    setRoom(res.data.room);
    setCells(res.data.cells);
    setColumns(res.data.columns);
    setPlayers(res.data.players);
  }, []);

  const refreshActiveCell = useCallback(async (code?: string) => {
    const target = code || roomCodeRef.current;
    if (!target) return;

    const res = await getQuizActiveCell(target);
    setActiveCell(res.success ? res.data : null);
  }, []);

  // -------------------------------------------------------------------
  // الإقلاع: فحص الرصيد ثم استئناف الغرفة أو إنشاء واحدة جديدة
  // -------------------------------------------------------------------

  useEffect(() => {
    setMounted(true);

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/player");
        return;
      }

      // جلسة جارية: لا نُعيد فحص الرصيد بعد تحديث الصفحة
      if (!sessionStorage.getItem(ACTIVE_SESSION_KEY)) {
        const access = await checkAccess(QUIZ_GAME.id, user.id);
        if (!access.allowed) {
          router.push("/packages");
          return;
        }
      }
      setIsAccessChecking(false);

      const saved = sessionStorage.getItem(ROOM_STORAGE_KEY);
      if (saved) {
        const res = await getQuizSession(saved);
        if (res.success && res.data.room.game_state !== "gameOver") {
          setRoomCode(saved);
          roomCodeRef.current = saved;
          setRoom(res.data.room);
          setCells(res.data.cells);
          setColumns(res.data.columns);
          setPlayers(res.data.players);
          setT1Name(res.data.room.t1_name);
          setT2Name(res.data.room.t2_name);
          await refreshActiveCell(saved);
          setIsBooting(false);
          return;
        }
        sessionStorage.removeItem(ROOM_STORAGE_KEY);
        sessionStorage.removeItem(ACTIVE_SESSION_KEY);
      }

      const created = await createQuizRoom();
      if (!created.success) {
        triggerAlert(created.error);
        setIsBooting(false);
        return;
      }

      sessionStorage.setItem(ROOM_STORAGE_KEY, created.data.roomCode);
      setRoomCode(created.data.roomCode);
      roomCodeRef.current = created.data.roomCode;
      await refreshSession(created.data.roomCode);
      setIsBooting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // قائمة الفئات لشاشة الإعداد
  useEffect(() => {
    if (isAccessChecking) return;
    (async () => {
      const res = await getQuizCategories();
      if (res.success) setCategories(res.data);
    })();
  }, [isAccessChecking]);

  // -------------------------------------------------------------------
  // البث اللحظي — نفس نمط بقية الألعاب مع احتياطي عند عودة التبويب
  // -------------------------------------------------------------------

  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase
      .channel(`quiz_host_${roomCode}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quiz_rooms", filter: `room_code=eq.${roomCode}` },
        (payload) => setRoom((prev) => ({ ...(prev || {}), ...payload.new } as QuizRoom))
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_session_players", filter: `room_code=eq.${roomCode}` },
        () => {
          getQuizSession(roomCode).then((res) => {
            if (res.success) setPlayers(res.data.players);
          });
        }
      )
      .subscribe();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshSession(roomCode);
        refreshActiveCell(roomCode);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  // محتوى السؤال يُجلب من السيرفر كلما تغيّرت الخلية النشطة أو مرحلة اللعب
  const gameState = room?.game_state;
  const activeCellId = room?.active_cell_id;

  useEffect(() => {
    if (!roomCode) return;
    if (!activeCellId) {
      setActiveCell(null);
      return;
    }
    refreshActiveCell(roomCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, activeCellId, gameState]);

  // اللوحة تُعاد قراءتها عند العودة لحالة "board" حتى تظهر الخلايا المستهلكة
  useEffect(() => {
    if (!roomCode) return;
    if (gameState === "board" || gameState === "gameOver") refreshSession(roomCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, gameState]);

  // -------------------------------------------------------------------
  // المؤقت — يُحسب محلياً من وقت الانتهاء، بلا أي كتابة لكل ثانية
  // -------------------------------------------------------------------

  const deadline = room?.question_deadline_at ?? null;
  const isTimerRunning = room?.is_timer_running ?? false;

  useEffect(() => {
    setRemaining(deadline ? secondsUntil(deadline) : QUIZ_CONFIG.TIMER_SECONDS);
    if (!deadline || !isTimerRunning) return;

    const id = setInterval(() => setRemaining(secondsUntil(deadline)), 250);
    return () => clearInterval(id);
  }, [deadline, isTimerRunning]);

  // -------------------------------------------------------------------
  // مشتقات اللوحة
  // -------------------------------------------------------------------

  const board = useMemo(() => {
    const grid: QuizBoardCell[][] = Array.from(
      { length: QUIZ_CONFIG.CATEGORIES_PER_SESSION },
      () => []
    );
    cells.forEach((c) => {
      if (grid[c.column_index]) grid[c.column_index][c.row_index] = c;
    });
    return grid;
  }, [cells]);

  const remainingCells = useMemo(() => cells.filter((c) => c.status === "available").length, [cells]);
  const playableCategories = useMemo(() => categories.filter((c) => c.isPlayable), [categories]);

  const opposingPlayers = useMemo(() => {
    if (!room) return [];
    return players.filter((p) => p.team !== room.turn);
  }, [players, room]);

  const restTargetName = useMemo(() => {
    if (!room?.rest_target_player_id) return null;
    return players.find((p) => p.id === room.rest_target_player_id)?.display_name ?? null;
  }, [players, room]);

  /** هل استُخدمت وسيلة مساعدة معيّنة لفريق معيّن؟ */
  const isLifelineUsed = useCallback(
    (team: QuizTeam, kind: "call" | "pit" | "rest") => {
      if (!room) return true;
      return Boolean(room[`t${team}_${kind}_used` as keyof QuizRoom]);
    },
    [room]
  );

  // -------------------------------------------------------------------
  // الأفعال
  // -------------------------------------------------------------------

  /** يغلّف كل نداء سيرفر: يمنع النقر المزدوج ويعرض الخطأ للحكم. */
  const run = useCallback(
    async (fn: () => Promise<{ success: boolean; error?: string }>, onDone?: () => void) => {
      if (isBusy) return;
      setIsBusy(true);
      try {
        const res = await fn();
        if (!res.success) {
          triggerAlert(res.error || "حدث خطأ غير متوقع.");
          return;
        }
        onDone?.();
      } finally {
        setIsBusy(false);
      }
    },
    [isBusy, triggerAlert]
  );

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= QUIZ_CONFIG.CATEGORIES_PER_SESSION) return prev;
      return [...prev, id];
    });
  };

  const startGame = () =>
    run(
      () =>
        startQuizSession({
          roomCode,
          categoryIds: selectedCategories,
          t1Name: t1Name.trim() || "الفريق الأول",
          t2Name: t2Name.trim() || "الفريق الثاني",
        }),
      () => {
        sessionStorage.setItem(ACTIVE_SESSION_KEY, "true");
        refreshSession();
      }
    );

  const pickCell = (cellId: string) => run(() => selectQuizCell({ roomCode, cellId }));

  const reveal = () => run(() => revealQuizAnswer(roomCode));

  const award = (team: QuizTeam | null) =>
    run(() => resolveQuizQuestion({ roomCode, awardedTeam: team }), () => refreshSession());

  const activateLifeline = (kind: "call" | "pit" | "rest", targetPlayerId?: string) => {
    if (!room) return;
    if (kind === "rest") {
      if (opposingPlayers.length === 0) {
        triggerAlert("لا يوجد لاعبون في الفريق الخصم. اطلب منهم الانضمام عبر الباركود أولاً.");
        return;
      }
      if (!targetPlayerId) {
        setRestPickerOpen(true);
        return;
      }
    }
    setRestPickerOpen(false);
    return run(() =>
      activateQuizLifeline({ roomCode, team: room.turn, kind, targetPlayerId: targetPlayerId ?? null })
    );
  };

  const finishGame = () =>
    triggerConfirm("إنهاء الجلسة الآن واحتساب النتيجة النهائية؟", () => {
      closeAlert();
      run(() => endQuizSession(roomCode), () => {
        sessionStorage.removeItem(ACTIVE_SESSION_KEY);
        refreshSession();
      });
    });

  const newSession = () =>
    triggerConfirm("بدء جلسة جديدة؟ سيتم إنشاء رمز غرفة جديد وطرد اللاعبين الحاليين.", () => {
      sessionStorage.removeItem(ROOM_STORAGE_KEY);
      sessionStorage.removeItem(ACTIVE_SESSION_KEY);
      window.location.reload();
    });

  const copyJoinLink = () => {
    if (typeof window === "undefined") return;
    const link = `${window.location.origin}${QUIZ_GAME.joinPath}?room=${roomCode}`;
    navigator.clipboard.writeText(link);
    triggerAlert("تم نسخ رابط الانضمام.");
  };

  return {
    mounted, isAccessChecking, isBooting, isBusy,
    roomCode, room, board, columns, players, activeCell,
    remainingCells, remaining,

    categories, playableCategories, selectedCategories, toggleCategory,
    t1Name, setT1Name, t2Name, setT2Name,

    opposingPlayers, restTargetName, isLifelineUsed,
    restPickerOpen, setRestPickerOpen,

    showQRModal, setShowQRModal,
    alert, triggerAlert, triggerConfirm, closeAlert,

    startGame, pickCell, reveal, award, activateLifeline, finishGame, newSession, copyJoinLink,
  };
}
