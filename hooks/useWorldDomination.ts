"use client";

import { useEffect, useRef, useState } from "react";
import { useWDRoom } from "./games/world-domination/useWDRoom";
import { useWDGameFlow } from "./games/world-domination/useWDGameFlow";
import { useWDCountries } from "./games/world-domination/useWDCountries";
import { useWDCards } from "./games/world-domination/useWDCards";
import { useWDCombat } from "./games/world-domination/useWDCombat";
import { useGameDialog } from "./shared/useGameDialog";
import { useGameAccess } from "./shared/useGameAccess";
import { useLiveGamePing } from "./shared/useLiveGamePing";
import { useRouter } from "next/navigation";
import { beginBrowserGameSession, countBrowserGameSession, endBrowserGameSession } from "@/app/actions/browserGameSessions";
import { clearLiveGame, markLiveGame, resumeLiveGame } from "@/lib/live-game";

const GAME_ID = "world-domination";
/** المعيار: التجربة تنحسب لما ينجاوب ثالث سؤال بعد اختيار الخريطة والعواصم */
const MILESTONE_ANSWERS = 3;
const BUSY_MESSAGE = "عندك لعبة سيطرة ثانية شغالة بنفس الحساب. كمّلها أو أنهها، ولو سكّرت صفحتها انتظر 3 دقايق وابدأ هذي.";

/**
 * جلسة اللعبة الحالية: كود الغرفة وقت الحجز وعدد الأسئلة اللي انجاوبت.
 * بـ localStorage مثل حالة اللعبة نفسها (wd_live_sync)، لأن كود الغرفة يتغير مع كل فتح للصفحة
 * والجلسة لازم تظل على نفس المرجع اللي انحجز.
 */
const SESSION_KEY = "wd_session";
type WDSession = { room: string; answered: number };
const readSession = (): WDSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    return s && typeof s.room === "string" && typeof s.answered === "number" ? s : null;
  } catch {
    return null;
  }
};
const writeSession = (s: WDSession | null) => {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {}
};

// New Action Hooks
import { useWDSync } from "./games/world-domination/useWDSync";
import { useWDSetupActions } from "./games/world-domination/useWDSetupActions";
import { useWDCardsActions } from "./games/world-domination/useWDCardsActions";
import { useWDCombatActions } from "./games/world-domination/useWDCombatActions";
import { useWDMapActions } from "./games/world-domination/useWDMapActions";

export function useWorldDomination() {
  const room = useWDRoom();
  const flow = useWDGameFlow();
  const mapCtx = useWDCountries();
  const cardsCtx = useWDCards();
  const combat = useWDCombat();
  const dialogCtx = useGameDialog();
  const router = useRouter();
  const { checkAccess } = useGameAccess();
  const [userId, setUserId] = useState<string | null>(null);

  // جلسة اللعب (الحجز بعد العواصم). sessionRoom = مرجع الحجز، null = ما فيه حجز لهاللعبة
  const [sessionRoom, setSessionRoom] = useState<string | null>(() => readSession()?.room ?? null);
  const countedRef = useRef(false);
  const beginningRef = useRef(false);

  /** يمسح مرجع الجلسة من هالمتصفح بس (اللعبة خلصت أو بدأت وحدة جديدة)، بدون ما يغيّر شي بالسيرفر */
  const forgetSession = () => {
    writeSession(null);
    setSessionRoom(null);
    countedRef.current = false;
    clearLiveGame(GAME_ID);
    sessionStorage.removeItem("wd_active_session");
  };

  /** إنهاء أو تصفير من الحكم: ترجع لو قبل ثالث سؤال، وبعدها تظل محسوبة */
  const endSession = async () => {
    const room = readSession()?.room;
    if (room) await endBrowserGameSession(GAME_ID, room).catch(() => null);
    forgetSession();
  };

  /** سؤال انجاوب وقت اللعب (فوز أو خسارة أو فوز يقرره الحكم). الثالث يحسبها */
  const noteAnswered = () => {
    const s = readSession();
    if (!s) return;
    const answered = s.answered + 1;
    writeSession({ ...s, answered });
    if (answered >= MILESTONE_ANSWERS && !countedRef.current) {
      countedRef.current = true;
      void countBrowserGameSession(GAME_ID, s.room);
    }
  };

  useEffect(() => {
    if (flow.gameState === "gameOver") {
      // انتهت بفائز (كل الدول انحجزت): تنحسب حتى لو قبل ثالث سؤال
      const s = readSession();
      if (s) void countBrowserGameSession(GAME_ID, s.room);
      writeSession(null);
      setSessionRoom(null);
      clearLiveGame(GAME_ID);
      // إزالة علامة اللعبة النشطة عند انتهاء اللعبة
      sessionStorage.removeItem("wd_active_session");
      const timer = setTimeout(() => {
        router.push("/my-games");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [flow.gameState, router]);

  const {
    roomCode, setRoomCode, isInitialized, setIsInitialized,
    audienceUrl, setAudienceUrl, showAudienceModal, setShowAudienceModal, supabase
  } = room;

  const {
    gameState, setGameState, isLoading, setIsLoading,
    team1Name, setTeam1Name, team2Name, setTeam2Name,
    score1, setScore1, score2, setScore2, turn, setTurn,
    timer, setTimer, isTimerRunning, setIsTimerRunning, startTimer, stopTimer, resetTimer,
    showResult, setShowResult, forcedWinner, setForcedWinner,
    quickProtectTeam, setQuickProtectTeam, adjustScore
  } = flow;

  const {
    dbCountries, setDbCountries, dbWdChallenges, setDbWdChallenges,
    countriesLimit, setCountriesLimit, challengesCount, setChallengesCount,
    countries, setCountries, selectedCountry, setSelectedCountry,
    mapPosition, setMapPosition, capitals, setCapitals,
    stolenCapitalAlert, setStolenCapitalAlert, countriesLeft, team1Owned, team2Owned
  } = mapCtx;

  const {
    cards1, setCards1, cards2, setCards2,
    protectedCountries, setProtectedCountries,
    spiedCountryId, setSpiedCountryId, deductCard
  } = cardsCtx;

  const {
    isAttacking, setIsAttacking, isQuestionRevealed, setIsQuestionRevealed,
    team1Choice, setTeam1Choice, team2Choice, setTeam2Choice,
    challengesUsed1, setChallengesUsed1, challengesUsed2, setChallengesUsed2
  } = combat;

  const { dialog: rawDialog, showAlert: rawShowAlert, showConfirm: rawShowConfirm, closeDialog } = dialogCtx;

  const dialog = {
    isOpen: rawDialog.isOpen,
    type: (rawDialog.type === "confirm" ? "confirm" : "alert") as "confirm" | "alert",
    message: rawDialog.message,
    onConfirm: rawDialog.onConfirm
  };

  const showAlert = (msg: string) => rawShowAlert("تنبيه", msg, "info");
  const showConfirm = (msg: string, onConfirm: () => void) => rawShowConfirm("تأكيد", msg, onConfirm);

  const [isAccessChecking, setIsAccessChecking] = useState(true);

  // دالة استرجاع اللعبة فوراً عند فتح أو تحديث الصفحة
  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);

        // التحقق من وجود لعبة نشطة (تم الدفع مسبقاً)
        const activeSession = sessionStorage.getItem("wd_active_session");
        if (activeSession) {
          // لعبة نشطة - تجاوز فحص الرصيد
          setIsAccessChecking(false);
          return;
        }

        // سكّر التبويب ورجع خلال 10 دقايق (حتى من تبويب جديد): نفس اللعبة تكمل بدل صفحة الباقات
        const resumed = await resumeLiveGame(GAME_ID);
        if (resumed && resumed === readSession()?.room) {
          sessionStorage.setItem("wd_active_session", "true");
          setIsAccessChecking(false);
          return;
        }

        // التحقق من الرصيد فوراً عند دخول صفحة اللعبة
        const access = await checkAccess("world-domination", user.id);
        if (!access.allowed) {
          router.push("/packages");
        } else {
          setIsAccessChecking(false);
        }
      } else {
        router.push("/player");
      }
    };
    getSession();

    const savedSession = localStorage.getItem("wd_live_sync");
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.gameState && parsed.gameState !== "lobby" && parsed.gameState !== "gameOver") {
          setRoomCode(parsed.roomCode);
          setSpiedCountryId(parsed.spiedCountryId || null);
          setGameState(parsed.gameState);
          setTeam1Name(parsed.team1Name);
          setTeam2Name(parsed.team2Name);
          setScore1(parsed.score1);
          setScore2(parsed.score2);
          setTurn(parsed.turn);
          setCountries(parsed.countries);
          setSelectedCountry(parsed.selectedCountry);
          setTimer(parsed.timer);
          setTeam1Choice(parsed.team1Choice);
          setTeam2Choice(parsed.team2Choice);
          setShowResult(parsed.showResult);
          setIsAttacking(parsed.isAttacking);
          setIsQuestionRevealed(parsed.isQuestionRevealed);
          setCards1({ nuke: 1, ...(parsed.cards1 || { capture: 3, protect: 5, airStrike: 3, capitalCapture: 2, spy: 2 }) });
          setCards2({ nuke: 1, ...(parsed.cards2 || { capture: 3, protect: 5, airStrike: 3, capitalCapture: 2, spy: 2 }) });
          setProtectedCountries(parsed.protectedCountries || {});
          setChallengesUsed1(parsed.challengesUsed1 || 0);
          setChallengesUsed2(parsed.challengesUsed2 || 0);
          setMapPosition(parsed.mapPosition || { center: [0, 0], zoom: 1, name: "العالم" });
          setCapitals(parsed.capitals || { team1: null, team2: null });
          setStolenCapitalAlert(parsed.stolenCapitalAlert || null);

          if (typeof window !== "undefined" && parsed.roomCode) {
            setAudienceUrl(`${window.location.origin}/games/world-domination/audience?room=${parsed.roomCode}`);
          }
        }
      } catch (e) {
        console.error("خطأ في استرجاع بيانات اللعبة:", e);
      }
    }
  }, []);

  // دالة تهيئة اللعبة (جلب الدول والأسئلة من إعدادات الآدمن)
  const initGame = async () => {
    if (isInitialized) return;
    try {
      setIsLoading(true);
      const newCode = "W" + Math.random().toString(36).substring(2, 6).toUpperCase();
      setRoomCode(newCode);

      if (typeof window !== "undefined") {
        setAudienceUrl(
          `${window.location.origin}/games/world-domination/audience?room=${newCode}`
        );
      }

      // جلب جميع البيانات من الجداول الجديدة المستقلة
      try {
        // 1. جلب الإعدادات (تبقى في wd_settings)
        const { data: settingsData } = await supabase.from("wd_settings").select("*");
        if (settingsData) {
          settingsData.forEach((item) => {
            if (item.key === "countries_limit" && item.value !== undefined) {
              setCountriesLimit(Number(item.value));
            }
            if (item.key === "challenges_count" && item.value !== undefined) {
              setChallengesCount(Number(item.value));
            }
          });
        }

        // 2. جلب الدول
        const { data: countriesData } = await supabase.from("wd_countries").select("*");
        
        // 3. جلب الأسئلة
        const { data: questionsData } = await supabase.from("wd_country_questions").select("*");
        
        // تجميع الدول مع أسئلتها بالهيكلة المعتمدة للعبة
        if (countriesData) {
          const mappedCountries = countriesData.map((country, index) => {
            const cQuestions = (questionsData || [])
              .filter(q => q.country_id === country.id)
              .map(q => ({
                q: q.question,
                options: q.options || [],
                a: q.answer || ""
              }));

            return {
              id: `db-${index}`,
              name: country.name,
              geoId: country.geo_id || "",
              questions: cQuestions,
              value: 0,
              isActive: true,
              isChallenge: false,
              owner: null,
              lastOwner: null,
              originalValue: 0
            };
          });
          setDbCountries(mappedCountries);
        }

        // 4. جلب تحديات الحكم
        const { data: challengesData } = await supabase.from("wd_challenges").select("*");
        if (challengesData) {
          setDbWdChallenges(challengesData.map(c => c.question));
        }

      } catch (e) {
        console.error("خطأ في جلب بيانات اللعبة:", e);
      }

      setTimeout(() => {
        setIsLoading(false);
      }, 400);

      setIsInitialized(true);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initGame();
  }, [supabase]);

  /**
   * الحجز بالسيرفر لما تنختار العاصمة الثانية: بعد الخريطة والعواصم، واللعب الفعلي يبدأ بعده.
   * false = ما انحجزت (رسالة طلعت للحكم) واللعبة ما تبدأ
   */
  const beginSession = async (): Promise<boolean> => {
    if (beginningRef.current || !roomCode) return false;
    beginningRef.current = true;
    try {
      const res = await beginBrowserGameSession(GAME_ID, roomCode).catch(() => null);
      if (res?.ok) {
        writeSession({ room: roomCode, answered: 0 });
        setSessionRoom(roomCode);
        countedRef.current = false;
        markLiveGame(GAME_ID, roomCode);
        // حفظ علامة لعبة نشطة لتجاوز فحص الرصيد عند التحديث
        sessionStorage.setItem("wd_active_session", "true");
        return true;
      }
      if (res?.reason === "no_access") {
        showConfirm("رصيدك غير كافٍ. هل ترغب في شراء باقة للاستمرار باللعب؟", () => router.push("/packages"));
      } else {
        showAlert(res?.reason === "busy" ? BUSY_MESSAGE : "تعذّر بدء اللعبة، تأكد من الاتصال وحاول مرة ثانية.");
      }
      return false;
    } finally {
      beginningRef.current = false;
    }
  };

  // نبضة كل دقيقة وقت اللعب. لو رجعت تجربة هاللعبة (بدأ لعبة ثانية بعد ما طلع من هذي) تنقفل هنا
  useLiveGamePing(GAME_ID, sessionRoom, gameState === "playing", () => {
    window.alert("انتهت هذي اللعبة لأنك بدأت لعبة ثانية بنفس الحساب.");
    localStorage.removeItem("wd_live_sync");
    forgetSession();
    window.location.reload();
  });

  // Unified context for action hooks
  const ctx = {
    // Room
    roomCode, setRoomCode, isInitialized, setIsInitialized, audienceUrl, setAudienceUrl, showAudienceModal, setShowAudienceModal, supabase,
    // Flow
    gameState, setGameState, isLoading, setIsLoading, team1Name, setTeam1Name, team2Name, setTeam2Name,
    score1, setScore1, score2, setScore2, turn, setTurn, timer, setTimer, isTimerRunning, setIsTimerRunning,
    startTimer, stopTimer, resetTimer, showResult, setShowResult, forcedWinner, setForcedWinner,
    quickProtectTeam, setQuickProtectTeam, adjustScore,
    // Countries
    dbCountries, setDbCountries, dbWdChallenges, setDbWdChallenges, countriesLimit, setCountriesLimit,
    challengesCount, setChallengesCount, countries, setCountries, selectedCountry, setSelectedCountry,
    mapPosition, setMapPosition, capitals, setCapitals, stolenCapitalAlert, setStolenCapitalAlert,
    countriesLeft, team1Owned, team2Owned,
    // Cards
    cards1, setCards1, cards2, setCards2, protectedCountries, setProtectedCountries, spiedCountryId, setSpiedCountryId, deductCard,
    // Combat
    isAttacking, setIsAttacking, isQuestionRevealed, setIsQuestionRevealed, team1Choice, setTeam1Choice,
    team2Choice, setTeam2Choice, challengesUsed1, setChallengesUsed1, challengesUsed2, setChallengesUsed2,
    // Dialogs
    dialog, showAlert, showConfirm, closeDialog,
    // Access
    userId, checkAccess, router,
    // جلسة اللعب
    beginSession, endSession, forgetSession
  };

  useWDSync(ctx);
  const setupActions = useWDSetupActions(ctx);
  const mapActions = useWDMapActions(ctx);
  const combatActions = useWDCombatActions(ctx);
  const cardsActions = useWDCardsActions(ctx);

  // كل سؤال ينحسم (فوز أو خسارة أو فوز يقرره الحكم) ينعد للمعيار
  const handleCapture = (winner: 1 | 2, isForced: boolean = false) => {
    const answered = !!selectedCountry;
    combatActions.handleCapture(winner, isForced);
    if (answered) noteAnswered();
  };
  const handleMiss = () => {
    combatActions.handleMiss();
    noteAnswered();
  };

  return {
    // State
    roomCode, setRoomCode, showAudienceModal, setShowAudienceModal,
    gameState, setGameState, isLoading, setIsLoading, team1Name, setTeam1Name,
    team2Name, setTeam2Name, score1, setScore1, score2, setScore2, turn, setTurn,
    countriesLimit, setCountriesLimit, challengesCount, setChallengesCount,
    countries, setCountries, selectedCountry, setSelectedCountry, timer, setTimer,
    isTimerRunning, setIsTimerRunning, team1Choice, setTeam1Choice,
    team2Choice, setTeam2Choice, showResult, setShowResult, isAttacking, setIsAttacking,
    isQuestionRevealed, setIsQuestionRevealed, audienceUrl, setAudienceUrl,
    mapPosition, setMapPosition, capitals, setCapitals, stolenCapitalAlert, setStolenCapitalAlert,
    challengesUsed1, setChallengesUsed1, challengesUsed2, setChallengesUsed2,
    cards1, setCards1, cards2, setCards2, protectedCountries, setProtectedCountries,
    spiedCountryId, setSpiedCountryId, forcedWinner, setForcedWinner,
    quickProtectTeam, setQuickProtectTeam, countriesLeft, team1Owned, team2Owned,
    dialog, showAlert, closeDialog, adjustScore,

    // Actions
    ...setupActions,
    ...mapActions,
    ...combatActions,
    ...cardsActions,
    handleCapture,
    handleMiss,
    isAccessChecking,
  };
}