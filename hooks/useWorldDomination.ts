"use client";

import { useEffect } from "react";
import { useWDRoom } from "./games/world-domination/useWDRoom";
import { useWDGameFlow } from "./games/world-domination/useWDGameFlow";
import { useWDCountries } from "./games/world-domination/useWDCountries";
import { useWDCards } from "./games/world-domination/useWDCards";
import { useWDCombat } from "./games/world-domination/useWDCombat";
import { useGameDialog } from "./shared/useGameDialog";

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

  // دالة استرجاع اللعبة فوراً عند فتح أو تحديث الصفحة
  useEffect(() => {
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
          setCards1(parsed.cards1 || { capture: 3, protect: 5, airStrike: 3, capitalCapture: 2, spy: 2 });
          setCards2(parsed.cards2 || { capture: 3, protect: 5, airStrike: 3, capitalCapture: 2, spy: 2 });
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

      // جلب جميع البيانات من wd_settings (نفس المصدر الذي يحفظ فيه الآدمن)
      try {
        const { data, error } = await supabase.from("wd_settings").select("*");
        if (data && !error) {
          data.forEach((item) => {
            // قراءة الإعدادات العامة (حد الدول وعدد التحديات)
            if (item.key === "countries_limit" && item.value !== undefined) {
              setCountriesLimit(Number(item.value));
            }
            if (item.key === "challenges_count" && item.value !== undefined) {
              setChallengesCount(Number(item.value));
            }

            // قراءة الدول وأسئلتها (المصدر الصحيح: admin_wd_countries_db)
            if (item.id === "admin_wd_countries_db" && item.data) {
              setDbCountries(item.data);
            }

            // قراءة تحديات الحكم (المصدر الصحيح: admin_wd_challenges_db)
            if (item.id === "admin_wd_challenges_db" && item.data) {
              setDbWdChallenges(item.data);
            }
          });
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
    dialog, showAlert, showConfirm, closeDialog
  };

  useWDSync(ctx);
  const setupActions = useWDSetupActions(ctx);
  const mapActions = useWDMapActions(ctx);
  const combatActions = useWDCombatActions(ctx);
  const cardsActions = useWDCardsActions(ctx);

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
  };
}