"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useGameAccess } from "@/hooks/shared/useGameAccess";
import { QUIZ_CONFIG, QUIZ_GAME } from "@/constants/quiz-grid";
import {
  activateQuizLifeline,
  createQuizRoom,
  endQuizSession,
  getQuizActiveCell,
  getQuizAnswerMedia,
  getQuizCategories,
  getQuizPreparedBoard,
  getQuizSession,
  prepareQuizSession,
  resolveQuizQuestion,
  revealQuizAnswer,
  selectQuizCell,
  startQuizSession,
  type QuizAnswerContent,
  type QuizCategoryOption,
  type QuizPreparedBoard,
} from "@/actions/quiz-grid";
import type { QuizBoardCell, QuizPoints, QuizPreparedCell, QuizRoom, QuizSessionPlayer, QuizTeam } from "@/types";

const ROOM_STORAGE_KEY = "quiz_referee_room_code";
const ACTIVE_SESSION_KEY = "quiz_active_session";

/** الثواني المتبقية حتى وقت الانتهاء المخزّن في قاعدة البيانات. */
function secondsUntil(deadline: string | null): number {
  if (!deadline) return 0;
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000);
  return Math.max(0, diff);
}

/** يحمّل صورة في ذاكرة تخزين المتصفح المؤقتة. فشل صورة واحدة لا يوقف الباقي. */
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

/** السؤال المعروض حالياً على شاشة الحكم — بلا أي حقل متعلق بالإجابة. */
export interface QuizActiveQuestion {
  id: string;
  category_name_ar: string;
  points: QuizPoints;
  question_text: string;
  question_image_url: string | null;
  question_image_alt: string | null;
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

  // السؤال الحالي: يُبنى محلياً من preparedCells فور اختيار الخلية — بلا أي شبكة
  const [activeQuestion, setActiveQuestion] = useState<QuizActiveQuestion | null>(null);
  const [answerContent, setAnswerContent] = useState<QuizAnswerContent | null>(null);

  // شاشة الإعداد — على مرحلتين: الفئات ثم الفرق والوقت
  const [setupStep, setSetupStep] = useState<1 | 2>(1);
  const [categories, setCategories] = useState<QuizCategoryOption[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [t1Name, setT1Name] = useState("الفريق الأول");
  const [t2Name, setT2Name] = useState("الفريق الثاني");
  const [timerSeconds, setTimerSeconds] = useState<number>(QUIZ_CONFIG.TIMER_DEFAULT);

  // اللوحة المُجهَّزة مسبقاً: نص وصورة كل سؤال، جاهزة قبل أن تبدأ اللعبة فعلياً
  const [preparedCells, setPreparedCells] = useState<Map<string, QuizPreparedCell>>(new Map());
  const preparedForRef = useRef<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [preloadDone, setPreloadDone] = useState(0);
  const [preloadTotal, setPreloadTotal] = useState(0);

  const [showQRModal, setShowQRModal] = useState(false);
  const [restPickerOpen, setRestPickerOpen] = useState(false);
  const [alert, setAlert] = useState<{
    show: boolean;
    message: string;
    isConfirm?: boolean;
    onConfirm?: () => void;
  }>({ show: false, message: "" });

  const [remaining, setRemaining] = useState<number>(QUIZ_CONFIG.TIMER_DEFAULT);

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

  /** يحوّل لقطة اللوحة المُجهَّزة إلى خريطة بحث سريعة، ويحمّل صور الأسئلة في الخلفية. */
  const applyPreparedBoard = useCallback((board: QuizPreparedBoard, fingerprint: string | null) => {
    preparedForRef.current = fingerprint;
    setPreparedCells(new Map(board.cells.map((c) => [c.id, c])));

    const urls = Array.from(
      new Set(board.cells.map((c) => c.question_image_url).filter((u): u is string => Boolean(u)))
    );
    setPreloadDone(0);
    setPreloadTotal(urls.length);

    if (urls.length === 0) return;
    let done = 0;
    urls.forEach((url) => {
      preloadImage(url).then(() => {
        done += 1;
        setPreloadDone(done);
      });
    });
  }, []);

  /** يستعيد السؤال المعروض حالياً (وإجابته إن كُشفت) من السيرفر — مسار الاستئناف فقط. */
  const hydrateActiveQuestion = useCallback(async (code: string) => {
    const res = await getQuizActiveCell(code);
    if (!res.success || !res.data) {
      setActiveQuestion(null);
      setAnswerContent(null);
      return;
    }

    setActiveQuestion({
      id: res.data.id,
      category_name_ar: res.data.category_name_ar,
      points: res.data.points,
      question_text: res.data.question_text,
      question_image_url: res.data.question_image_url,
      question_image_alt: res.data.question_image_alt,
    });

    if (res.data.answer_text !== null) {
      setAnswerContent({
        answer_text: res.data.answer_text,
        answer_image_url: res.data.answer_image_url,
        answer_image_alt: res.data.answer_image_alt,
      });
    } else {
      setAnswerContent(null);
    }
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
          setTimerSeconds(res.data.room.timer_seconds);

          // إعادة بناء ذاكرة الأسئلة المُجهَّزة — إن وُجدت لقطة سابقة لهذه الغرفة
          const boardRes = await getQuizPreparedBoard(saved);
          if (boardRes.success && boardRes.data.cells.length > 0) {
            const orderedCategoryIds: string[] = [];
            [...boardRes.data.cells]
              .sort((a, b) => a.column_index - b.column_index)
              .forEach((c) => {
                if (!orderedCategoryIds.includes(c.category_id)) orderedCategoryIds.push(c.category_id);
              });
            setSelectedCategories(orderedCategoryIds);
            applyPreparedBoard(boardRes.data, orderedCategoryIds.join(","));

            if (res.data.room.game_state === "setup") setSetupStep(2);
          }

          if (res.data.room.game_state === "question" || res.data.room.game_state === "answer") {
            await hydrateActiveQuestion(saved);
          }

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
      if (document.visibilityState === "visible") refreshSession(roomCode);
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  // اللوحة تُعاد قراءتها عند العودة لحالة "board" حتى تظهر الخلايا المستهلكة والنقاط
  const gameState = room?.game_state;
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
  const roomTimerSeconds = room?.timer_seconds ?? QUIZ_CONFIG.TIMER_DEFAULT;

  useEffect(() => {
    setRemaining(deadline ? secondsUntil(deadline) : roomTimerSeconds);
    if (!deadline || !isTimerRunning) return;

    const id = setInterval(() => setRemaining(secondsUntil(deadline)), 250);
    return () => clearInterval(id);
  }, [deadline, isTimerRunning, roomTimerSeconds]);

  // -------------------------------------------------------------------
  // مشتقات اللوحة
  // -------------------------------------------------------------------

  const board = useMemo(() => {
    const grid: QuizBoardCell[][] = Array.from({ length: columns.length }, () => []);
    cells.forEach((c) => {
      if (grid[c.column_index]) grid[c.column_index][c.row_index] = c;
    });
    return grid;
  }, [cells, columns.length]);

  const remainingCells = useMemo(() => cells.filter((c) => c.status === "available").length, [cells]);
  const totalCells = cells.length;
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

  /** يغلّف كل نداء سيرفر: يمنع النقر المزدوج، يعرض الخطأ، ويمرّر البيانات عند النجاح. */
  const run = useCallback(
    async <T,>(
      fn: () => Promise<{ success: boolean; error?: string; data?: T }>,
      onDone?: (data?: T) => void
    ) => {
      if (isBusy) return;
      setIsBusy(true);
      try {
        const res = await fn();
        if (!res.success) {
          triggerAlert(res.error || "حدث خطأ غير متوقع.");
          return;
        }
        onDone?.(res.data);
      } finally {
        setIsBusy(false);
      }
    },
    [isBusy, triggerAlert]
  );

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= QUIZ_CONFIG.MAX_CATEGORIES) return prev;
      return [...prev, id];
    });
  };

  /**
   * ينتقل لخطوة الفرق والوقت. إن كان الاختيار الحالي مطابقاً لآخر لقطة
   * جُهِّزت يُعاد استخدامها فوراً؛ غير ذلك يسحب أسئلة جديدة (يحصل هذا
   * أثناء الانتظار على هذه الشاشة، لا أثناء اللعب).
   */
  const goToStep2 = useCallback(async () => {
    if (selectedCategories.length < QUIZ_CONFIG.MIN_CATEGORIES) return;
    const fingerprint = selectedCategories.join(",");

    if (preparedForRef.current === fingerprint && preparedCells.size > 0) {
      setSetupStep(2);
      // الصور غالباً محفوظة في ذاكرة المتصفح مسبقاً؛ التحقق سريع ولا يعطّل شيئاً
      applyPreparedBoard({ cells: Array.from(preparedCells.values()), columns: [] }, fingerprint);
      return;
    }

    setIsPreparing(true);
    const res = await prepareQuizSession({ roomCode, categoryIds: selectedCategories });
    setIsPreparing(false);

    if (!res.success) {
      triggerAlert(res.error);
      return;
    }

    setSetupStep(2);
    applyPreparedBoard(res.data, fingerprint);
  }, [selectedCategories, roomCode, preparedCells, applyPreparedBoard, triggerAlert]);

  const goBackToStep1 = () => setSetupStep(1);

  const startGame = () => {
    if (isPreparing) return;
    return run(
      () =>
        startQuizSession({
          roomCode,
          t1Name: t1Name.trim() || "الفريق الأول",
          t2Name: t2Name.trim() || "الفريق الثاني",
          timerSeconds,
        }),
      () => {
        sessionStorage.setItem(ACTIVE_SESSION_KEY, "true");
        refreshSession();
      }
    );
  };

  const pickCell = (cellId: string) =>
    run(
      () => selectQuizCell({ roomCode, cellId }),
      () => {
        setAnswerContent(null);

        const prepared = preparedCells.get(cellId);
        if (prepared) {
          setActiveQuestion({
            id: prepared.id,
            category_name_ar: prepared.category_name_ar,
            points: prepared.points,
            question_text: prepared.question_text,
            question_image_url: prepared.question_image_url,
            question_image_alt: prepared.question_image_alt,
          });
        } else {
          // احتياط نادر: خلية غير موجودة في الذاكرة المحلية (مثلاً حكم انضم من جهاز آخر)
          hydrateActiveQuestion(roomCode);
        }

        // إحماء صورة الإجابة في الخلفية أثناء عدّ الوقت — النص يبقى على السيرفر حتى الكشف
        getQuizAnswerMedia(roomCode).then((res) => {
          if (res.success && res.data.answer_image_url) preloadImage(res.data.answer_image_url);
        });
      }
    );

  const reveal = () =>
    run<QuizAnswerContent>(
      () => revealQuizAnswer(roomCode),
      (data) => {
        if (data) setAnswerContent(data);
      }
    );

  const award = (team: QuizTeam | null) =>
    run(
      () => resolveQuizQuestion({ roomCode, awardedTeam: team }),
      () => {
        setActiveQuestion(null);
        setAnswerContent(null);
        refreshSession();
      }
    );

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
    roomCode, room, board, columns, players, totalCells,
    activeQuestion, answerContent,
    remainingCells, remaining,

    setupStep, goToStep2, goBackToStep1,
    categories, playableCategories, selectedCategories, toggleCategory,
    t1Name, setT1Name, t2Name, setT2Name,
    timerSeconds, setTimerSeconds,
    isPreparing, preloadDone, preloadTotal,

    opposingPlayers, restTargetName, isLifelineUsed,
    restPickerOpen, setRestPickerOpen,

    showQRModal, setShowQRModal,
    alert, triggerAlert, triggerConfirm, closeAlert,

    startGame, pickCell, reveal, award, activateLifeline, finishGame, newSession, copyJoinLink,
  };
}
