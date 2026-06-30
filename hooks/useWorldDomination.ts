"use client";

import { useEffect } from "react";
import { useWDRoom } from "./games/world-domination/useWDRoom";
import { useWDGameFlow } from "./games/world-domination/useWDGameFlow";
import { useWDCountries } from "./games/world-domination/useWDCountries";
import { useWDCards } from "./games/world-domination/useWDCards";
import { useWDCombat } from "./games/world-domination/useWDCombat";
import { useGameDialog } from "./shared/useGameDialog";
import { useDebounceCallback } from "@/lib/game/debounce";

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
  // State and dialogs have been extracted to sub-hooks.

  const handleGoBack = () => {
    window.history.back();
  };

  const handleGoHome = () => {
    showConfirm("هل أنت متأكد من العودة للرئيسية؟ سيتم تصفير هذه اللعبة ولن تتمكن من إكمالها.", () => {
      localStorage.removeItem("wd_live_sync");
      window.location.href = "/";
    });
  };

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
          setCards1(parsed.cards1);
          setCards2(parsed.cards2);
          setProtectedCountries(parsed.protectedCountries);
          setChallengesUsed1(parsed.challengesUsed1);
          setChallengesUsed2(parsed.challengesUsed2);
          setMapPosition(parsed.mapPosition);
          setCapitals(parsed.capitals);
          setStolenCapitalAlert(parsed.stolenCapitalAlert);
          
          if (typeof window !== "undefined" && parsed.roomCode) {
            setAudienceUrl(`${window.location.origin}/games/world-domination/audience?room=${parsed.roomCode}`);
          }
        }
      } catch (e) {
        console.error("فشل استرجاع الجلسة السابقة:", e);
      }
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    const initGame = async () => {
      setIsLoading(true);
      const newCode = Math.random().toString(36).substring(2, 7).toUpperCase();
      setRoomCode(newCode);
      
      if (typeof window !== "undefined") {
        setAudienceUrl(
          `${window.location.origin}/games/world-domination/audience?room=${newCode}`
        );
      }
      
      try {
        const { data, error } = await supabase.from("wd_settings").select("*");
        if (data && !error) {
          data.forEach((item) => {
            if (item.id === "admin_wd_countries_db") setDbCountries(item.data || []);
            if (item.id === "admin_wd_challenges_db") setDbWdChallenges(item.data || []);
          });
        }
      } catch (e) {
        console.error("خطأ في جلب بيانات البنك:", e);
      }
      
      setTimeout(() => {
        setIsLoading(false);
      }, 400);
    };

    initGame();
  }, [supabase]);

  const debouncedSyncToSupabase = useDebounceCallback(async (payload: any) => {
    try {
      await supabase.from("wd_rooms").upsert(payload);
    } catch (e) {
      console.error("خطأ في المزامنة اللحظية:", e);
    }
  }, 400);

  useEffect(() => {
    if (!isInitialized || !roomCode) return;

    const cleanCountries = countries ? countries.map(({ questions, ...rest }) => rest) : [];

    const localSyncData = {
      roomCode, spiedCountryId,
      gameState, team1Name, team2Name, score1, score2, turn, countries,
      selectedCountry: isAttacking && !selectedCountry?.activeQuestion ? null : selectedCountry,
      timer, team1Choice, team2Choice, showResult, isAttacking, isQuestionRevealed,
      cards1, cards2, protectedCountries, challengesUsed1, challengesUsed2,
      mapPosition, capitals, stolenCapitalAlert, timestamp: Date.now()
    };
    localStorage.setItem("wd_live_sync", JSON.stringify(localSyncData));

    debouncedSyncToSupabase({
      room_code: roomCode,
      game_state: gameState,
      team1_name: team1Name,
      team2_name: team2Name,
      score1: score1,
      score2: score2,
      turn: turn,
      timer: timer,
      current_country_id: selectedCountry?.id || null,
      active_question: selectedCountry?.activeQuestion || null,
      team1_choice: team1Choice,
      team2_choice: team2Choice,
      show_result: showResult,
      is_attacking: isAttacking,
      is_question_revealed: isQuestionRevealed,
      cards1: cards1,
      cards2: cards2,
      protected_countries: protectedCountries,
      challenges_used1: challengesUsed1,
      challenges_used2: challengesUsed2,
      map_position: mapPosition,
      capitals: capitals,
      stolen_capital_alert: stolenCapitalAlert,
      spied_country_id: spiedCountryId,
      countries: cleanCountries,
      created_at: new Date().toISOString()
    });

  }, [
    gameState,
    team1Name,
    team2Name,
    score1,
    score2,
    turn,
    countries,
    selectedCountry,
    timer,
    team1Choice,
    team2Choice,
    showResult,
    isAttacking,
    isQuestionRevealed,
    cards1,
    cards2,
    protectedCountries,
    challengesUsed1,
    challengesUsed2,
    mapPosition,
    capitals,
    stolenCapitalAlert,
    spiedCountryId,
    isInitialized,
    supabase,
    roomCode
  ]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timer > 0)
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    else if (timer === 0) setIsTimerRunning(false);
    return () => clearInterval(interval);
  }, [isTimerRunning, timer]);

  const startGame = () => {
    if (dbCountries.length === 0) {
      showAlert("الرجاء إضافة دول من لوحة تحكم الآدمن أولاً!");
      return;
    }

    const actualChallengeCount = Math.min(
      challengesCount,
      dbWdChallenges.length
    );
    let needed = countriesLimit + actualChallengeCount + 2;

    if (needed > dbCountries.length) {
      needed = dbCountries.length;
      showAlert(
        `تنبيه: عدد الدول في البنك (${dbCountries.length}) أقل من المطلوب. سيتم استخدام جميع الدول المتاحة.`
      );
    }

    setChallengesCount(actualChallengeCount);

    const allMapped = dbCountries.map((c) => ({
      ...c,
      owner: null,
      lastOwner: null,
      wasOwnedBefore: false,
      forbiddenFor: [],
      isStolen: false,
      isChallenge: false,
      value: 1000,
      originalValue: 1000,
      activeQuestion: null,
      isActive: false,
    }));

    const shuffled = [...allMapped].sort(() => 0.5 - Math.random());
    for (let i = 0; i < needed; i++) {
      shuffled[i].isActive = true;
    }

    setScore1(200);
    setScore2(200);
    setTurn(1);
    setChallengesUsed1(0);
    setChallengesUsed2(0);
    setCards1({ capture: 3, protect: 5, airStrike: 3, capitalCapture: 2, spy: 2 });
    setCards2({ capture: 3, protect: 5, airStrike: 3, capitalCapture: 2, spy: 2 });
    setProtectedCountries({});
    setSpiedCountryId(null);
    setIsAttacking(false);
    setIsQuestionRevealed(false);
    setForcedWinner(null);
    setCountries(shuffled);
    setCapitals({ team1: null, team2: null });
    setMapPosition({ center: [0, 0], zoom: 1, name: "العالم" });
    setStolenCapitalAlert(null);
    setSpiedCountryId(null);
    
    localStorage.removeItem("wd_live_sync");
    setGameState("setupMap");
  };

  const randomizeMap = () => {
    const needed = countriesLimit + challengesCount + 2;
    const maxAvailable = Math.min(needed, countries.length);

    setCountries((prev) => {
      const reset = prev.map((c) => ({ ...c, isActive: false }));
      const shuffled = [...reset].sort(() => 0.5 - Math.random());
      for (let i = 0; i < maxAvailable; i++) {
        shuffled[i].isActive = true;
      }
      return shuffled;
    });
  };

  const confirmMap = () => {
    const active = countries.filter((c) => c.isActive);
    const needed = countriesLimit + challengesCount + 2;
    const maxAvailable = Math.min(needed, countries.length);

    if (active.length !== maxAvailable) {
      showAlert(
        `يجب تفعيل ${maxAvailable} دولة بالضبط! المفعّل حالياً: ${active.length}`
      );
      return;
    }

    const shuffledActive = [...active].sort(() => 0.5 - Math.random());
    setCountries(shuffledActive);

    if (challengesCount > 0) {
      setGameState("setupChallenges");
    } else {
      setGameState("setupCapitals");
    }
  };

  const confirmChallenges = () => {
    const currentChallengeCount = countries.filter((c) => c.isChallenge).length;
    if (currentChallengeCount < challengesCount) {
      showAlert(`الرجاء تحديد ${challengesCount} دول لتحدي الحكم قبل المتابعة.`);
      return;
    }

    const shuffledChallenges = [...dbWdChallenges].sort(
      () => 0.5 - Math.random()
    );
    let chIdx = 0;

    const finalCountries = countries.map((c) => {
      if (c.isChallenge) {
        return {
          ...c,
          activeQuestion: {
            q: shuffledChallenges[chIdx++] || "تحدي حكم (غير مسجل)",
            options: [],
            a: "",
          },
        };
      }
      return c;
    });

    setCountries(finalCountries);
    setGameState("setupCapitals");
    setTurn(1);
  };

  const handleCountryClick = (geoId: string) => {
    const country = countries.find((c) => c.geoId === geoId);
    if (!country) return;

    if (gameState === "setupMap") {
      const needed = countriesLimit + challengesCount + 2;
      const maxAvailable = Math.min(needed, countries.length);
      const activeCount = countries.filter((c) => c.isActive).length;

      if (!country.isActive && activeCount >= maxAvailable) {
        showAlert(
          `لقد وصلت للحد الأقصى (${maxAvailable} دولة). ألغِ تفعيل دولة أخرى أولاً.`
        );
        return;
      }

      setCountries((prev) =>
        prev.map((c) =>
          c.id === country.id ? { ...c, isActive: !c.isActive } : c
        )
      );
      return;
    }

    if (gameState === "setupChallenges") {
      const isCurrentlyChallenge = country.isChallenge;
      const currentChallengeCount = countries.filter(
        (c) => c.isChallenge
      ).length;

      if (!isCurrentlyChallenge && currentChallengeCount >= challengesCount) {
        showAlert(`لقد قمت بتحديد ${challengesCount} دول للتحدي بالفعل.`);
        return;
      }

      setCountries((prev) =>
        prev.map((c) => {
          if (c.id === country.id) {
            if (c.isChallenge) {
              return { ...c, isChallenge: false, value: c.originalValue };
            } else {
              return {
                ...c,
                isChallenge: true,
                value: 2000,
                originalValue: 2000,
              };
            }
          }
          return c;
        })
      );
      return;
    }

    if (gameState === "setupCapitals") {
      if (country.isChallenge) {
        showAlert("لا يمكن تعيين دولة تحدي كعاصمة! الرجاء اختيار دولة أساسية.");
        return;
      }
      if (turn === 1) {
        setCapitals((prev) => ({ ...prev, team1: country.id }));
        setCountries((prev) =>
          prev.map((c) =>
            c.id === country.id
              ? {
                  ...c,
                  owner: 1,
                  wasOwnedBefore: true,
                  value: 0,
                  originalValue: 0,
                }
              : c
          )
        );
        setTurn(2);
      } else {
        if (country.id === capitals.team1) {
          showAlert("تم اختيار هذه الدولة كعاصمة للفريق الأول! اختر دولة أخرى.");
          return;
        }
        setCapitals((prev) => ({ ...prev, team2: country.id }));

        setCountries((prev) => {
          let updated = prev.map((c) =>
            c.id === country.id
              ? {
                  ...c,
                  owner: 2 as const,
                  wasOwnedBefore: true,
                  value: 0,
                  originalValue: 0,
                }
              : c
          );

          let normalFree = updated.filter(
            (c) =>
              !c.isChallenge && c.id !== capitals.team1 && c.id !== country.id
          );
          const shuffledNormal = [...normalFree].sort(
            () => 0.5 - Math.random()
          );
          
          const target2000Count = (countriesLimit / 10) * 2 + 2;
          const num2000 = Math.min(target2000Count, shuffledNormal.length);
          const upgradedIds = shuffledNormal.slice(0, num2000).map((c) => c.id);

          return updated.map((c) =>
            upgradedIds.includes(c.id)
              ? { ...c, value: 2000, originalValue: 2000 }
              : c
          );
        });

        setGameState("playing");
        setTurn(1);
      }
      return;
    }

    const isOwnCapital =
      country.id === (turn === 1 ? capitals.team1 : capitals.team2);
    if (isOwnCapital) {
      showAlert("هذه عاصمتكم الأساسية! 👑\nلا يمكنكم الهجوم عليها.");
      return;
    }

    let activeQ = country.activeQuestion;

    // جلب سؤال جديد إذا مافي سؤال حالي
    if (!country.isChallenge && !activeQ && country.questions?.length > 0) {
      activeQ =
        country.questions[Math.floor(Math.random() * country.questions.length)];
    }

    setSelectedCountry({ ...country, activeQuestion: activeQ });
    setTimer(20);
    setTeam1Choice(null);
    setTeam2Choice(null);
    setShowResult(false);
    setIsTimerRunning(false);
    
    // الحل السحري هنا: إيقاف الهجوم التلقائي عشان تظهر واجهة الأزرار أولاً
    setIsAttacking(false); 
    
    setIsQuestionRevealed(false);
    setForcedWinner(null);
  };

  const handleChangeQuestion = () => {
    if (!selectedCountry || selectedCountry.isChallenge) return;

    const currentScore = turn === 1 ? score1 : score2;
    if (currentScore < 1000) {
      showAlert("رصيد الفريق غير كافٍ (مطلوب 1000 نقطة) لتغيير السؤال!");
      return;
    }

    const availableQs =
      selectedCountry.questions?.filter(
        (q: any) => q.q !== selectedCountry.activeQuestion?.q
      ) || [];
    if (availableQs.length === 0) {
      showAlert("ما فيه أسئلة إضافية مسجلة لهذي الدولة!");
      return;
    }

    showConfirm("سيتم خصم 1000 نقطة لتغيير السؤال، هل أنت متأكد؟", () => {
      if (turn === 1) setScore1((s) => s - 1000);
      else setScore2((s) => s - 1000);

      const newQ = availableQs[Math.floor(Math.random() * availableQs.length)];
      setSelectedCountry({ ...selectedCountry, activeQuestion: newQ });
      setTeam1Choice(null);
      setTeam2Choice(null);
      setShowResult(false);
      setTimer(20);
      setIsTimerRunning(false);
      setIsQuestionRevealed(false);
      setForcedWinner(null);
    });
  };

  const handleRefereeChangeQuestion = () => {
    if (!selectedCountry) return;

    if (selectedCountry.isChallenge) {
      const availableChallenges = dbWdChallenges.filter(
        (ch) => ch !== selectedCountry.activeQuestion?.q
      );
      if (availableChallenges.length === 0) {
        showAlert("لا توجد تحديات إضافية مسجلة في البنك!");
        return;
      }
      const newChallenge =
        availableChallenges[
          Math.floor(Math.random() * availableChallenges.length)
        ];
      setSelectedCountry({
        ...selectedCountry,
        activeQuestion: { q: newChallenge, options: [], a: "" },
      });
    } else {
      const availableQs =
        selectedCountry.questions?.filter(
          (q: any) => q.q !== selectedCountry.activeQuestion?.q
        ) || [];
      if (availableQs.length === 0) {
        showAlert("لا توجد أسئلة إضافية مسجلة لهذه الدولة!");
        return;
      }
      const newQ = availableQs[Math.floor(Math.random() * availableQs.length)];
      setSelectedCountry({ ...selectedCountry, activeQuestion: newQ });
    }

    setTeam1Choice(null);
    setTeam2Choice(null);
    setShowResult(false);
    setTimer(20);
    setIsTimerRunning(false);
    setIsQuestionRevealed(false);
    setForcedWinner(null);
  };




  const handleManualFree = () => {
    showConfirm(`هل أنت متأكد من سحب هذه الدولة وجعلها حرة للجميع؟`, () => {
      const updated = countries.map((c) => {
        if (selectedCountry && c.id === selectedCountry.id) {
          if (c.owner === 1) setScore1((s) => Math.max(0, s - c.value));
          if (c.owner === 2) setScore2((s) => Math.max(0, s - c.value));
          return {
            ...c,
            owner: null,
            lastOwner: null,
            wasOwnedBefore: false,
            forbiddenFor: [],
            isStolen: false,
          };
        }
        return c;
      });
      setCountries(updated);
      setSelectedCountry(null);
      setTeam1Choice(null);
      setTeam2Choice(null);
      setShowResult(false);
      setIsAttacking(false);
      setIsQuestionRevealed(false);
      setForcedWinner(null);
    });
  };

  const handleSpyAction = (teamId: 1 | 2) => {
    const currentCards = teamId === 1 ? cards1 : cards2;
    if (currentCards.spy <= 0) {
      showAlert("لقد استنفذ الفريق جميع بطاقات التجسس!");
      return;
    }

    const hidden2000Countries = countries.filter(
      (c) => c.value === 2000 && c.owner === null && !c.isChallenge
    );

    if (hidden2000Countries.length === 0) {
      showAlert("لا يوجد دولة متاحة");
      return;
    }

    const randomCountry =
      hidden2000Countries[Math.floor(Math.random() * hidden2000Countries.length)];

    showConfirm(`سيتم تفعيل التجسس لفريق ${teamId === 1 ? team1Name : team2Name} وكشف دولة 2000 وإجباره على الهجوم عليها. متأكد؟`, () => {
      if (teamId === 1) setCards1((p: any) => ({ ...p, spy: p.spy - 1 }));
      else setCards2((p: any) => ({ ...p, spy: p.spy - 1 }));
      
      setSpiedCountryId(randomCountry.id);
      setSelectedCountry(randomCountry);
      setIsAttacking(true);
      showAlert(`🕵️ تمت العملية بنجاح!\nتم اكتشاف ${randomCountry.name} وإجبار الفريق على اختيارها.`);
    });
  };

  const handleConfirmAnswers = () => {
    if (selectedCountry.isChallenge) {
      if (turn === 1) setChallengesUsed1((prev: number) => prev + 1);
      else setChallengesUsed2((prev: number) => prev + 1);
    }

    if (isAttacking) {
      const attackerChoice = turn === 1 ? team1Choice : team2Choice;
      if (!attackerChoice) {
        showAlert("لازم تختار إجابة الفريق المهاجم أولاً!");
        return;
      }
      setShowResult(true);
      setIsTimerRunning(false);
      return;
    }

    if (!team1Choice || !team2Choice) {
      showAlert("لازم تختار إجابة الفريقين أولاً عشان تعتمد النتيجة!");
      return;
    }

    setShowResult(true);
    setIsTimerRunning(false);
  };

  const endTurn = () => {
    setSelectedCountry(null);
    setTeam1Choice(null);
    setTeam2Choice(null);
    setShowResult(false);
    setIsAttacking(false);
    setIsQuestionRevealed(false);
    setForcedWinner(null);
    setSpiedCountryId(null);
    setTurn((t) => (t === 1 ? 2 : 1));
  };

  const handleCapture = (winner: 1 | 2, isForced: boolean = false) => {
    if (!selectedCountry) return;

    let finalScore1 = score1;
    let finalScore2 = score2;

    const isOpponentCapital =
      selectedCountry.id === (winner === 1 ? capitals.team2 : capitals.team1);
    const victim =
      selectedCountry.owner !== null
        ? selectedCountry.owner
        : selectedCountry.lastOwner;

    if (isAttacking || (isForced && victim !== null && victim !== winner)) {
      if (!isOpponentCapital) {
        if (victim === 1)
          finalScore1 = Math.max(0, finalScore1 - selectedCountry.value);
        if (victim === 2)
          finalScore2 = Math.max(0, finalScore2 - selectedCountry.value);
      }
    }

    let capitalStolen = false;
    let stealAmount = 0;

    if (isOpponentCapital) {
      capitalStolen = true;
      stealAmount = Math.floor((winner === 1 ? finalScore2 : finalScore1) / 3);
      if (winner === 1) {
        finalScore1 += stealAmount;
      } else {
        finalScore2 += stealAmount;
      }
    } else {
      if (winner === 1) finalScore1 += selectedCountry.value;
      else finalScore2 += selectedCountry.value;
    }

    const updated = countries.map((c) => {
      if (c.id === selectedCountry.id) {
        let newForbiddenFor = [...(c.forbiddenFor || [])];
        if (
          victim !== null &&
          victim !== winner &&
          !newForbiddenFor.includes(victim)
        ) {
          newForbiddenFor.push(victim);
        }

        const stolen =
          isAttacking ||
          (c.owner !== null && c.owner !== winner) ||
          (c.lastOwner !== null && c.lastOwner !== winner);

        return {
          ...c,
          owner: winner,
          lastOwner: null,
          wasOwnedBefore: true,
          forbiddenFor: newForbiddenFor,
          isStolen: stolen ? true : c.isStolen,
        };
      }
      return c;
    });

    setCountries(updated);
    setScore1(finalScore1);
    setScore2(finalScore2);

    if (capitalStolen) {
      setStolenCapitalAlert({
        winner,
        loser: winner === 1 ? 2 : 1,
        points: stealAmount,
        countryName: selectedCountry.name,
      });
    }

    checkGameOver(updated);
    endTurn();
  };

  const handleMiss = () => {
    let finalScore1 = score1;
    let finalScore2 = score2;
    const isOpponentCapital =
      selectedCountry.id === (turn === 1 ? capitals.team2 : capitals.team1);

    if (isAttacking) {
      if (isOpponentCapital) {
        const penalty = Math.floor(
          (turn === 1 ? finalScore2 : finalScore1) / 3
        );
        if (turn === 1) finalScore1 = Math.max(0, finalScore1 - penalty);
        else finalScore2 = Math.max(0, finalScore2 - penalty);
        showAlert(
          `إجابة خاطئة! تم معاقبة المهاجم بخصم ${penalty} نقطة (ثلث نقاط الخصم) من رصيده.`
        );
      } else {
        const penalty = Math.floor(selectedCountry.value / 2);
        if (selectedCountry.lastOwner === 1)
          finalScore1 = Math.max(0, finalScore1 - penalty);
        if (selectedCountry.lastOwner === 2)
          finalScore2 = Math.max(0, finalScore2 - penalty);
        showAlert(
          `فشل الاستحلال! تم معاقبة المدافع بخصم ${penalty} نقطة (نصف قيمة الدولة) من رصيده.`
        );
      }
    }

    setScore1(finalScore1);
    setScore2(finalScore2);

    const updated = countries.map((c) => {
      if (c.id === selectedCountry.id) {
        let restoredOwner = c.owner;
        if (isAttacking) {
          restoredOwner = c.lastOwner;
        }
        let newForbiddenFor = [...(c.forbiddenFor || [])];
        if (
          c.lastOwner !== null &&
          c.lastOwner !== undefined &&
          !newForbiddenFor.includes(c.lastOwner)
        ) {
          newForbiddenFor.push(c.lastOwner);
        }
        return {
          ...c,
          owner: restoredOwner,
          lastOwner: c.lastOwner,
          forbiddenFor: newForbiddenFor,
        };
      }
      return c;
    });
    setCountries(updated);
    checkGameOver(updated);
    endTurn();
  };

  const checkGameOver = (currentCountries: any[]) => {
    if (currentCountries.filter((c) => c.owner === null).length === 0) {
      setTimeout(() => setGameState("gameOver"), 1500);
    }
  };

  const useCaptureCard = () => {
    const currentCards = turn === 1 ? cards1 : cards2;
    const isOpponentCapital =
      selectedCountry.id === (turn === 1 ? capitals.team2 : capitals.team1);

    // التحقق الخاص بالعاصمة
    if (isOpponentCapital) {
      if (currentCards.capitalCapture <= 0) {
        showAlert("لقد استنفذ الفريق جميع بطاقات غزو العاصمة!");
        return;
      }
      // شرط رصيد 6000 نقطة لغزو العاصمة
      if ((turn === 1 ? score1 : score2) < 6000) {
        showAlert("رصيدكم لا يتجاوز 6000 نقطة! لا يمكنكم الهجوم على عاصمة الخصم.");
        return;
      }
    } else {
      // التحقق الخاص بالدولة العادية (الدبابة)
      if (currentCards.capture <= 0) {
        showAlert("لقد استنفذ الفريق جميع بطاقات الاستحلال (الدبابة)!");
        return;
      }
    }

    showConfirm(
      `سيتم خصم بطاقة ${isOpponentCapital ? "غزو العاصمة" : "استحلال"} وبدء الهجوم الأبدي، هل أنت متأكد؟`,
      () => {
        if (turn === 1) {
          if (isOpponentCapital)
            setCards1((prev: any) => ({
              ...prev,
              capitalCapture: prev.capitalCapture - 1,
            }));
          else setCards1((prev: any) => ({ ...prev, capture: prev.capture - 1 }));
        } else {
          if (isOpponentCapital)
            setCards2((prev: any) => ({
              ...prev,
              capitalCapture: prev.capitalCapture - 1,
            }));
          else setCards2((prev: any) => ({ ...prev, capture: prev.capture - 1 }));
        }

        const updatedCountries = countries.map((c: any) => {
          if (c.id === selectedCountry.id) {
            return { ...c, owner: null, lastOwner: c.owner };
          }
          return c;
        });

        setCountries(updatedCountries);
        setIsAttacking(true);
        setIsQuestionRevealed(false);

        let activeQ = selectedCountry.activeQuestion;
        if (!selectedCountry.isChallenge) {
          activeQ =
            selectedCountry.questions?.[
              Math.floor(Math.random() * selectedCountry.questions.length)
            ];
        }
        setSelectedCountry({
          ...selectedCountry,
          owner: null,
          lastOwner: selectedCountry.owner,
          activeQuestion: activeQ,
        });
      }
    );
  };

  const useAirStrike = () => {
    const currentCards = turn === 1 ? cards1 : cards2;
    const isOpponentCapital =
      selectedCountry.id === (turn === 1 ? capitals.team2 : capitals.team1);

    if (currentCards.airStrike <= 0) {
      showAlert("لقد استنفذ الفريق جميع بطاقات القصف (صاروخ)!");
      return;
    }

    if (isOpponentCapital) {
      showAlert(
        "ممنوع! لا يمكن قصف العاصمة بالصواريخ. يجب الهجوم عليها بالمواجهة المباشرة (الاستحلال) وفقط إذا كان رصيدك فوق 6000 نقطة."
      );
      return;
    }

    const isProtected = protectedCountries[selectedCountry.id];

    if (isProtected) {
      showConfirm(
        "هذه الدولة محمية! القصف سيكسر درع الحماية فقط دون خصم نقاط الدولة أو رصيد المدافع. هل أنت متأكد؟",
        () => {
          if (turn === 1) {
            setCards1((prev: any) => ({ ...prev, airStrike: prev.airStrike - 1 }));
          } else {
            setCards2((prev: any) => ({ ...prev, airStrike: prev.airStrike - 1 }));
          }

          setProtectedCountries((prev: any) => {
            const next = { ...prev };
            delete next[selectedCountry.id];
            return next;
          });

          setSelectedCountry(null);
        }
      );
    } else {
      showConfirm(
        `القصف المدمر! سيتم خصم بطاقة قصف، وسيتم خصم نصف قيمة الدولة (${Math.floor(selectedCountry.value / 2)}) من رصيد المدافع ومن قيمة الدولة نفسها، ولن تتحرر الدولة. هل أنت متأكد؟`,
        () => {
          if (turn === 1) {
            setCards1((prev: any) => ({ ...prev, airStrike: prev.airStrike - 1 }));
          } else {
            setCards2((prev: any) => ({ ...prev, airStrike: prev.airStrike - 1 }));
          }

          const penalty = Math.floor(selectedCountry.value / 2);
          if (selectedCountry.owner === 1)
            setScore1((s: number) => Math.max(0, s - penalty));
          if (selectedCountry.owner === 2)
            setScore2((s: number) => Math.max(0, s - penalty));

          const updatedCountries = countries.map((c: any) => {
            if (c.id === selectedCountry.id) {
              return { ...c, value: Math.max(0, c.value - penalty) };
            }
            return c;
          });

          setCountries(updatedCountries);
          setSelectedCountry(null);
        }
      );
    }
  };

  const useProtectCard = () => {
    const currentCards = turn === 1 ? cards1 : cards2;
    if (currentCards.protect <= 0) {
      showAlert("انتهت بطاقات الحماية (الدرع)!");
      return;
    }

    if (turn === 1)
      setCards1((prev: any) => ({ ...prev, protect: prev.protect - 1 }));
    else setCards2((prev: any) => ({ ...prev, protect: prev.protect - 1 }));

    setProtectedCountries((prev: any) => ({
      ...prev,
      [selectedCountry.id]: true,
    }));
    showAlert("تم تفعيل الحماية! الدولة أصبحت محصنة ضد الدبابات (لكنها لا تزال معرضة للقصف).");
    if (!showResult) setSelectedCountry(null);
  };


  return {
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
    quickProtectTeam, setQuickProtectTeam,
    dialog, showAlert, closeDialog, handleGoBack, handleGoHome,
    startGame, randomizeMap, confirmMap, confirmChallenges, handleCountryClick,
    handleChangeQuestion, handleRefereeChangeQuestion, adjustScore, handleManualFree,
    handleSpyAction, handleConfirmAnswers, handleCapture, handleMiss,
    countriesLeft, team1Owned, team2Owned,
    useCaptureCard, useAirStrike, useProtectCard
  };
}