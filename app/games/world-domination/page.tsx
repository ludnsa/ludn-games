"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Cairo } from "next/font/google";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { geoCentroid } from "d3-geo";
import {
  Globe,
  Swords,
  X,
  Play,
  Coins,
  Trophy,
  ArrowRight,
  MonitorPlay,
  MapPin,
  ShieldCheck,
  Shield,
  Rocket,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  ArrowLeftRight,
  Star,
  Crown,
  Shuffle,
  CheckCircle2,
  Crosshair,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });
const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

const TankIcon = ({
  className,
  size = 24,
}: {
  className?: string;
  size?: number;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M8 11V9a2 2 0 0 1 2-2h4" />
    <path d="M14 7h6" />
    <rect x="2" y="13" width="20" height="6" rx="3" />
    <path d="M5 13v-1.5a1.5 1.5 0 0 1 1.5-1.5h11a1.5 1.5 0 0 1 1.5 1.5V13" />
    <circle cx="6" cy="16" r="1" />
    <circle cx="12" cy="16" r="1" />
    <circle cx="18" cy="16" r="1" />
  </svg>
);

const modernScrollbar =
  "[&::-webkit-scrollbar]:w-1.5 lg:[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800/50 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-500";

export default function WorldDominationGame() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [showAudienceModal, setShowAudienceModal] = useState<boolean>(false);

  const [gameState, setGameState] = useState<
    | "lobby"
    | "setupMap"
    | "setupChallenges"
    | "setupCapitals"
    | "playing"
    | "gameOver"
  >("lobby");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [team1Name, setTeam1Name] = useState<string>("الفريق الأول");
  const [team2Name, setTeam2Name] = useState<string>("الفريق الثاني");
  const [score1, setScore1] = useState<number>(200);
  const [score2, setScore2] = useState<number>(200);
  const [turn, setTurn] = useState<1 | 2>(1);
  const [dbCountries, setDbCountries] = useState<any[]>([]);
  const [dbWdChallenges, setDbWdChallenges] = useState<string[]>([]);
  const [countriesLimit, setCountriesLimit] = useState<number>(20);
  const [challengesCount, setChallengesCount] = useState<number>(2);
  const [countries, setCountries] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [timer, setTimer] = useState<number>(20);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [team1Choice, setTeam1Choice] = useState<string | null>(null);
  const [team2Choice, setTeam2Choice] = useState<string | null>(null);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [isAttacking, setIsAttacking] = useState<boolean>(false);
  const [isQuestionRevealed, setIsQuestionRevealed] = useState<boolean>(false);
  const [audienceUrl, setAudienceUrl] = useState<string>("");

  const [mapPosition, setMapPosition] = useState({
    center: [0, 0] as [number, number],
    zoom: 1,
    name: "العالم",
  });

  const [capitals, setCapitals] = useState<{
    team1: string | null;
    team2: string | null;
  }>({ team1: null, team2: null });
  const [stolenCapitalAlert, setStolenCapitalAlert] = useState<{
    winner: 1 | 2;
    loser: 1 | 2;
    points: number;
    countryName: string;
  } | null>(null);

  const [challengesUsed1, setChallengesUsed1] = useState<number>(0);
  const [challengesUsed2, setChallengesUsed2] = useState<number>(0);

  const [cards1, setCards1] = useState({
    capture: 3,
    protect: 5,
    airStrike: 3,
    capitalCapture: 2,
  });
  const [cards2, setCards2] = useState({
    capture: 3,
    protect: 5,
    airStrike: 3,
    capitalCapture: 2,
  });
  const [protectedCountries, setProtectedCountries] = useState<any>({});

  const [forcedWinner, setForcedWinner] = useState<1 | 2 | null>(null);
  const [quickProtectTeam, setQuickProtectTeam] = useState<1 | 2 | null>(null);

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
        // سحب البيانات من السيرفر مباشرة
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

  useEffect(() => {
    if (!roomCode) return;

    const syncData = {
      gameState,
      team1Name,
      team2Name,
      score1,
      score2,
      turn,
      countries,
      selectedCountry:
        isAttacking && !selectedCountry?.activeQuestion
          ? null
          : selectedCountry,
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
      timestamp: Date.now(),
    };

    localStorage.setItem("wd_live_sync", JSON.stringify(syncData));

    const syncToSupabase = async () => {
      try {
        await supabase.from("wd_rooms").upsert({
          room_code: roomCode,
          live_sync: syncData,
          created_at: new Date().toISOString()
        });
      } catch (e) {
        console.error("خطأ في المزامنة اللحظية:", e);
      }
    };

    syncToSupabase();
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
      alert("الرجاء إضافة دول من لوحة تحكم الآدمن أولاً!");
      return;
    }

    const actualChallengeCount = Math.min(
      challengesCount,
      dbWdChallenges.length
    );
    let needed = countriesLimit + actualChallengeCount + 2;

    if (needed > dbCountries.length) {
      needed = dbCountries.length;
      alert(
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
    setCards1({ capture: 3, protect: 5, airStrike: 3, capitalCapture: 2 });
    setCards2({ capture: 3, protect: 5, airStrike: 3, capitalCapture: 2 });
    setProtectedCountries({});
    setIsAttacking(false);
    setIsQuestionRevealed(false);
    setForcedWinner(null);
    setCountries(shuffled);
    setCapitals({ team1: null, team2: null });
    setMapPosition({ center: [0, 0], zoom: 1, name: "العالم" });
    setStolenCapitalAlert(null);

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
      alert(
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
      alert(`الرجاء تحديد ${challengesCount} دول لتحدي الحكم قبل المتابعة.`);
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
        alert(
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
        alert(`لقد قمت بتحديد ${challengesCount} دول للتحدي بالفعل.`);
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
        alert("لا يمكن تعيين دولة تحدي كعاصمة! الرجاء اختيار دولة أساسية.");
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
          alert("تم اختيار هذه الدولة كعاصمة للفريق الأول! اختر دولة أخرى.");
          return;
        }
        setCapitals((prev) => ({ ...prev, team2: country.id }));

        setCountries((prev) => {
          let updated = prev.map((c) =>
            c.id === country.id
              ? {
                  ...c,
                  owner: 2,
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
          const num2000 = Math.min(4, shuffledNormal.length);
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
      alert("هذه عاصمتكم الأساسية! 👑\nلا يمكنكم الهجوم عليها.");
      return;
    }

    if (
      protectedCountries[country.id] &&
      country.owner !== null &&
      country.owner !== turn
    ) {
      setSelectedCountry({ ...country, activeQuestion: null });
      return;
    }

    let activeQ = country.activeQuestion;

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
    setIsAttacking(false);
    setIsQuestionRevealed(false);
    setForcedWinner(null);
  };

  const handleChangeQuestion = () => {
    if (!selectedCountry || selectedCountry.isChallenge) return;

    const currentScore = turn === 1 ? score1 : score2;
    if (currentScore < 1000) {
      alert("رصيد الفريق غير كافٍ (مطلوب 1000 نقطة) لتغيير السؤال!");
      return;
    }

    const availableQs =
      selectedCountry.questions?.filter(
        (q: any) => q.q !== selectedCountry.activeQuestion?.q
      ) || [];
    if (availableQs.length === 0) {
      alert("ما فيه أسئلة إضافية مسجلة لهذي الدولة!");
      return;
    }

    if (confirm("سيتم خصم 1000 نقطة لتغيير السؤال، هل أنت متأكد؟")) {
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
    }
  };

  const handleRefereeChangeQuestion = () => {
    if (!selectedCountry) return;

    if (selectedCountry.isChallenge) {
      const availableChallenges = dbWdChallenges.filter(
        (ch) => ch !== selectedCountry.activeQuestion?.q
      );
      if (availableChallenges.length === 0) {
        alert("لا توجد تحديات إضافية مسجلة في البنك!");
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
        alert("لا توجد أسئلة إضافية مسجلة لهذه الدولة!");
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

  const adjustScore = (tId: 1 | 2, amount: number) => {
    if (tId === 1) setScore1((s) => Math.max(0, s + amount));
    else setScore2((s) => Math.max(0, s + amount));
  };

  const handleManualFree = () => {
    if (confirm(`هل أنت متأكد من سحب هذه الدولة وجعلها حرة للجميع؟`)) {
      const updated = countries.map((c) => {
        if (c.id === selectedCountry.id) {
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
    }
  };

  const useCaptureCard = () => {
    const currentCards = turn === 1 ? cards1 : cards2;
    const isOpponentCapital =
      selectedCountry.id === (turn === 1 ? capitals.team2 : capitals.team1);

    if (isOpponentCapital) {
      if (currentCards.capitalCapture <= 0) {
        alert("لقد استنفذ الفريق جميع بطاقات غزو العاصمة!");
        return;
      }
      if ((turn === 1 ? score1 : score2) <= 6000) {
        alert("رصيدكم لا يتجاوز 6000 نقطة! لا يمكنكم الهجوم على عاصمة الخصم.");
        return;
      }
    } else {
      if (currentCards.capture <= 0) {
        alert("لقد استنفذ الفريق جميع بطاقات الاستحلال (الدبابة)!");
        return;
      }
    }

    if (
      confirm(
        `سيتم خصم بطاقة ${isOpponentCapital ? "غزو العاصمة" : "استحلال"} وبدء الهجوم الأبدي، هل أنت متأكد؟`
      )
    ) {
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

      const updatedCountries = countries.map((c) => {
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
  };

  const useAirStrike = () => {
    const currentCards = turn === 1 ? cards1 : cards2;
    const isOpponentCapital =
      selectedCountry.id === (turn === 1 ? capitals.team2 : capitals.team1);

    if (currentCards.airStrike <= 0) {
      alert("لقد استنفذ الفريق جميع بطاقات القصف (صاروخ)!");
      return;
    }

    if (isOpponentCapital) {
      alert(
        "ممنوع! لا يمكن قصف العاصمة بالصواريخ. يجب الهجوم عليها بالمواجهة المباشرة (الاستحلال) وفقط إذا كان رصيدك فوق 6000 نقطة."
      );
      return;
    }

    if (
      confirm(
        `القصف المدمر! سيتم خصم بطاقة قصف، وسيتم خصم نصف قيمة الدولة (${Math.floor(selectedCountry.value / 2)}) من رصيد المدافع ومن قيمة الدولة نفسها، ولن تتحرر الدولة. هل أنت متأكد؟`
      )
    ) {
      if (turn === 1) {
        setCards1((prev: any) => ({ ...prev, airStrike: prev.airStrike - 1 }));
      } else {
        setCards2((prev: any) => ({ ...prev, airStrike: prev.airStrike - 1 }));
      }

      const penalty = Math.floor(selectedCountry.value / 2);
      if (selectedCountry.owner === 1)
        setScore1((s) => Math.max(0, s - penalty));
      if (selectedCountry.owner === 2)
        setScore2((s) => Math.max(0, s - penalty));

      setProtectedCountries((prev: any) => {
        const next = { ...prev };
        delete next[selectedCountry.id];
        return next;
      });

      const updatedCountries = countries.map((c) => {
        if (c.id === selectedCountry.id) {
          return { ...c, value: Math.max(0, c.value - penalty) };
        }
        return c;
      });

      setCountries(updatedCountries);
      setSelectedCountry(null);
    }
  };

  const useProtectCard = () => {
    const currentCards = turn === 1 ? cards1 : cards2;
    if (currentCards.protect <= 0) {
      alert("انتهت بطاقات الحماية (الدرع)!");
      return;
    }

    if (turn === 1)
      setCards1((prev: any) => ({ ...prev, protect: prev.protect - 1 }));
    else setCards2((prev: any) => ({ ...prev, protect: prev.protect - 1 }));

    setProtectedCountries((prev: any) => ({
      ...prev,
      [selectedCountry.id]: true,
    }));
    alert(
      "تم تفعيل الحماية! الدولة أصبحت محصنة ضد الدبابات (لكنها لا تزال معرضة للقصف)."
    );
    if (!showResult) setSelectedCountry(null);
  };

  const handleConfirmAnswers = () => {
    if (selectedCountry.isChallenge) {
      if (turn === 1) setChallengesUsed1((prev: number) => prev + 1);
      else setChallengesUsed2((prev: number) => prev + 1);
    }

    if (isAttacking) {
      const attackerChoice = turn === 1 ? team1Choice : team2Choice;
      if (!attackerChoice) {
        alert("لازم تختار إجابة الفريق المهاجم أولاً!");
        return;
      }
      setShowResult(true);
      setIsTimerRunning(false);
      return;
    }

    if (!team1Choice || !team2Choice) {
      alert("لازم تختار إجابة الفريقين أولاً عشان تعتمد النتيجة!");
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
        alert(
          `إجابة خاطئة! تم معاقبة المهاجم بخصم ${penalty} نقطة (ثلث نقاط الخصم) من رصيده.`
        );
      } else {
        const penalty = Math.floor(selectedCountry.value / 2);
        if (selectedCountry.lastOwner === 1)
          finalScore1 = Math.max(0, finalScore1 - penalty);
        if (selectedCountry.lastOwner === 2)
          finalScore2 = Math.max(0, finalScore2 - penalty);
        alert(
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

  const countriesLeft = countries.filter((c) => c.owner === null).length;
  const team1Owned = countries.filter((c) => c.owner === 1).length;
  const team2Owned = countries.filter((c) => c.owner === 2).length;

  if (isLoading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-black text-2xl" dir="rtl">
        <div className="relative flex items-center justify-center mb-8">
          <Globe className="w-28 h-28 text-slate-200 dark:text-slate-800 animate-spin-slow" />
          <TankIcon size={48} className="text-emerald-500 absolute animate-pulse drop-shadow-lg" />
          <Crosshair className="w-16 h-16 text-rose-500 absolute animate-ping opacity-70" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-3xl text-emerald-600 dark:text-emerald-400 animate-pulse drop-shadow-sm">جاري حشد الجيوش...</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bold tracking-widest">تجهيز الخرائط وتوزيع الدبابات</p>
        </div>
      </div>
    );
  }

  return (
    <main
      className={`min-h-dvh overflow-x-hidden overflow-y-auto p-2 md:p-4 lg:p-6 ${cairo.className} bg-slate-50 dark:bg-slate-950 flex flex-col relative z-10 transition-colors duration-500`}
      dir="rtl"
    >
      {/* نوافذ التنبيهات المنبثقة */}
      {quickProtectTeam && (
        <div className="fixed inset-0 z-[250] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 lg:p-6 max-w-md w-full border-2 border-emerald-500 text-center shadow-2xl animate-in zoom-in-95">
            <Shield className="w-12 h-12 lg:w-16 lg:h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl lg:text-2xl font-black mb-4 dark:text-white">
              تفعيل حماية سريعة لـ{" "}
              <span className="text-emerald-500">
                {quickProtectTeam === 1 ? team1Name : team2Name}
              </span>
            </h3>
            <p className="text-slate-500 mb-6 text-xs lg:text-sm font-bold">
              اختر الدولة المراد تحصينها بالدرع. (لن يؤثر على مجريات السؤال
              الحالي)
            </p>
            <div
              className={`max-h-60 overflow-y-auto flex flex-col gap-2 mb-6 pr-2 ${modernScrollbar}`}
            >
              {countries
                .filter(
                  (c) =>
                    c.owner === quickProtectTeam && !protectedCountries[c.id]
                )
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (quickProtectTeam === 1)
                        setCards1((p: any) => ({
                          ...p,
                          protect: p.protect - 1,
                        }));
                      else
                        setCards2((p: any) => ({
                          ...p,
                          protect: p.protect - 1,
                        }));
                      setProtectedCountries((p: any) => ({
                        ...p,
                        [c.id]: true,
                      }));
                      setQuickProtectTeam(null);
                    }}
                    className="w-full py-2.5 lg:py-3 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 font-black rounded-xl transition-colors border border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 text-sm"
                  >
                    <span>{c.name}</span>
                    <Shield size={16} />
                  </button>
                ))}
              {countries.filter(
                (c) => c.owner === quickProtectTeam && !protectedCountries[c.id]
              ).length === 0 && (
                <p className="text-rose-500 font-bold bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl text-sm">
                  لا يوجد دول مملوكة قابلة للحماية حالياً.
                </p>
              )}
            </div>
            <button
              onClick={() => setQuickProtectTeam(null)}
              className="w-full py-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-black rounded-xl transition-colors text-sm"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {stolenCapitalAlert && (
        <div className="fixed inset-0 z-[250] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-800 border-4 border-amber-500 rounded-3xl p-6 lg:p-10 max-w-md lg:max-w-2xl w-full text-center shadow-[0_0_50px_rgba(245,158,11,0.3)] animate-in zoom-in-95">
            <Star className="w-20 h-20 lg:w-32 lg:h-32 text-amber-500 mx-auto mb-4 lg:mb-6 animate-pulse" />
            <h2 className="text-3xl lg:text-5xl font-black text-white mb-4 lg:mb-6 tracking-wide drop-shadow-md">
              سقوط العاصمة! 🔥
            </h2>
            <p className="text-lg lg:text-2xl font-bold text-slate-300 mb-6 lg:mb-8 leading-relaxed">
              لقد سقطت عاصمة{" "}
              <span className="text-white font-black">
                {stolenCapitalAlert.loser === 1 ? team1Name : team2Name}
              </span>{" "}
              ({stolenCapitalAlert.countryName})
            </p>
            <div className="bg-amber-500/20 border-2 border-amber-500/50 rounded-2xl p-6 lg:p-8 mb-6 lg:mb-10 shadow-inner">
              <p className="text-xl lg:text-3xl font-black text-amber-400 mb-2">
                تم غنم ثلث الثروات:
              </p>
              <div className="text-4xl lg:text-6xl font-black text-white flex items-center justify-center gap-3">
                {stolenCapitalAlert.points}{" "}
                <Coins className="text-yellow-400 w-8 h-8 lg:w-12 lg:h-12" />
              </div>
              <p className="text-base lg:text-xl font-bold text-amber-300 mt-4">
                لصالح: {stolenCapitalAlert.winner === 1 ? team1Name : team2Name}
              </p>
            </div>
            <button
              onClick={() => setStolenCapitalAlert(null)}
              className="w-full py-4 lg:py-5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-xl lg:text-2xl rounded-2xl transition-all shadow-md active:scale-95"
            >
              متابعة المعركة
            </button>
          </div>
        </div>
      )}

      {/* المحتوى الرئيسي */}
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full flex-1">
        <div className="flex justify-between items-center mb-4 lg:mb-6 shrink-0 z-50">
          <Link
            href="/"
            className="px-3 py-1.5 lg:px-4 lg:py-2 bg-rose-500 text-white rounded-xl flex items-center gap-1.5 lg:gap-2 font-black text-[10px] lg:text-xs shadow-sm"
          >
            <ArrowRight size={14} className="lg:w-4 lg:h-4" /> رجوع
          </Link>

          {gameState === "playing" && (
            <div className="flex items-center gap-2 lg:gap-4 bg-white dark:bg-slate-900 px-3 py-1.5 lg:px-6 lg:py-2 rounded-xl lg:rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-center">
                <p className="text-[8px] lg:text-[10px] font-bold text-slate-500">
                  حرة
                </p>
                <p className="font-black text-sm lg:text-base text-blue-600">
                  {countriesLeft}
                </p>
              </div>
              <div className="w-px h-6 lg:h-8 bg-slate-200 dark:bg-slate-700"></div>
              <div className="text-center">
                <p className="text-[8px] lg:text-[10px] font-bold text-slate-500 max-w-[50px] lg:max-w-none truncate">
                  {team1Name}
                </p>
                <p className="font-black text-sm lg:text-base text-cyan-600">
                  {team1Owned}
                </p>
              </div>
              <div className="w-px h-6 lg:h-8 bg-slate-200 dark:bg-slate-700"></div>
              <div className="text-center">
                <p className="text-[8px] lg:text-[10px] font-bold text-slate-500 max-w-[50px] lg:max-w-none truncate">
                  {team2Name}
                </p>
                <p className="font-black text-sm lg:text-base text-rose-600">
                  {team2Owned}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              if (!roomCode) alert("الرجاء بدء اللعبة أولاً لتوليد كود الغرفة!");
              else setShowAudienceModal(true);
            }}
            className="px-3 py-1.5 lg:px-4 lg:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1.5 lg:gap-2 font-black text-[10px] lg:text-xs shadow-sm transition-colors"
          >
            <MonitorPlay size={14} className="lg:w-4 lg:h-4" />{" "}
            <span className="hidden sm:inline">شاشة الجمهور</span>
            <span className="sm:hidden">عرض</span>
          </button>
        </div>

        {gameState === "lobby" ? (
          <div className="m-auto p-6 lg:p-10 bg-white dark:bg-slate-900 rounded-3xl lg:rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-800 text-center shadow-xl w-full max-w-sm md:max-w-2xl">
            <Globe
              size={40}
              className="lg:w-12 lg:h-12 text-blue-600 mx-auto mb-4 lg:mb-6"
            />
            <h1 className="text-2xl lg:text-4xl font-black mb-6 lg:mb-8 dark:text-white">
              السيطرة على العالم
            </h1>

            {audienceUrl && (
              <div className="flex flex-col items-center justify-center gap-3 lg:gap-4 mb-6 lg:mb-8">
                <p className="text-slate-500 dark:text-slate-400 font-bold text-xs lg:text-sm">
                  امسح الباركود لدخول شاشة الجمهور أو أدخل الكود:
                </p>
                <div className="bg-slate-100 dark:bg-slate-800 px-6 py-2 rounded-xl border-2 border-blue-500 mb-2">
                  <p className="text-2xl lg:text-4xl font-mono font-black text-blue-600 dark:text-blue-400 tracking-widest">
                    {roomCode}
                  </p>
                </div>
                <div className="bg-white p-2 rounded-xl lg:rounded-2xl shadow-sm border-2 border-slate-200">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(audienceUrl)}`}
                    alt="QR Code"
                    className="w-24 h-24 lg:w-32 lg:h-32"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 mb-5 lg:mb-6">
              <input
                value={team1Name}
                onChange={(e) => setTeam1Name(e.target.value)}
                className="p-3 lg:p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-black text-center outline-none focus:border-cyan-500 dark:text-white text-sm lg:text-xl"
                placeholder="الفريق 1"
              />
              <input
                value={team2Name}
                onChange={(e) => setTeam2Name(e.target.value)}
                className="p-3 lg:p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-black text-center outline-none focus:border-rose-500 dark:text-white text-sm lg:text-xl"
                placeholder="الفريق 2"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 lg:mb-8">
              <div className="text-right">
                <p className="text-[10px] lg:text-xs font-black text-slate-500 dark:text-slate-400 mb-2">
                  عدد الدول الأساسية:
                </p>
                <div className="flex gap-2">
                  {[20, 30, 40].map((num) => (
                    <button
                      key={num}
                      onClick={() => setCountriesLimit(num)}
                      className={`flex-1 py-1.5 lg:py-2.5 rounded-xl font-black transition-all border-2 text-xs lg:text-base ${countriesLimit === num ? "bg-blue-600 border-blue-600 text-white shadow-md" : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] lg:text-xs font-black text-purple-500 dark:text-purple-400 mb-2">
                  تحديات إضافية (تضاف فوق الأساسي):
                </p>
                <div className="flex gap-2">
                  {[0, 2, 4, 6].map((num) => (
                    <button
                      key={num}
                      onClick={() => setChallengesCount(num)}
                      className={`flex-1 py-1.5 lg:py-2.5 rounded-xl font-black transition-all border-2 text-xs lg:text-base ${challengesCount === num ? "bg-purple-600 border-purple-600 text-white shadow-md" : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"}`}
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={startGame}
              className="w-full py-3 lg:py-5 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg lg:text-2xl rounded-xl lg:rounded-2xl shadow-md transition-colors"
            >
              بدء اللعب
            </button>
          </div>
        ) : gameState === "setupMap" ? (
          <div className="m-auto p-4 lg:p-10 bg-white dark:bg-slate-900 rounded-3xl lg:rounded-[2.5rem] border-4 border-cyan-500 text-center shadow-2xl w-full max-w-6xl flex flex-col h-[85vh] lg:h-[85vh]">
            <div className="flex items-center justify-center gap-3 lg:gap-4 mb-4 lg:mb-6 shrink-0 border-b border-slate-200 dark:border-slate-800 pb-3 lg:pb-4">
              <Globe className="text-cyan-500 w-8 h-8 lg:w-12 lg:h-12 animate-spin-slow shrink-0" />
              <h2 className="text-xl lg:text-4xl font-black dark:text-white shrink-0">
                تصفية دول الخريطة
              </h2>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 flex-1 min-h-0 w-full">
              {/* اليمين: أدوات التحكم */}
              <div className="w-full lg:w-1/3 flex flex-col gap-3 lg:gap-4 overflow-y-auto pr-1 lg:pr-2 order-2 lg:order-1 custom-scroll">
                <p className="text-slate-500 font-bold text-xs lg:text-lg bg-slate-50 dark:bg-slate-800 p-3 lg:p-4 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed text-right">
                  الدول المحددة باللون الأزرق هي التي ستدخل المعركة. اضغط على أي
                  دولة في الخريطة للتبديل.
                </p>

                <div className="flex flex-col bg-cyan-50 dark:bg-cyan-900/20 p-4 lg:p-5 rounded-2xl border border-cyan-200 dark:border-cyan-800 gap-3 lg:gap-4">
                  <div className="font-black text-lg lg:text-2xl text-cyan-700 dark:text-cyan-300">
                    المفعلة: {countries.filter((c) => c.isActive).length} من{" "}
                    {Math.min(
                      countriesLimit + challengesCount + 2,
                      countries.length
                    )}
                  </div>
                  <button
                    onClick={randomizeMap}
                    className="w-full py-2.5 lg:py-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-black transition-colors flex items-center justify-center gap-2 text-sm lg:text-lg"
                  >
                    <Shuffle size={16} className="lg:w-[20px] lg:h-[20px]" />{" "}
                    توزيع عشوائي جديد
                  </button>
                  {countries.filter((c) => c.isActive).length ===
                    Math.min(
                      countriesLimit + challengesCount + 2,
                      countries.length
                    ) && (
                    <button
                      onClick={confirmMap}
                      className="w-full py-2.5 lg:py-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-black shadow-md transition-colors flex items-center justify-center gap-2 text-sm lg:text-lg"
                    >
                      <CheckCircle2
                        size={16}
                        className="lg:w-[20px] lg:h-[20px]"
                      />{" "}
                      اعتماد الخريطة
                    </button>
                  )}
                </div>
              </div>

              {/* اليسار: الخريطة الميدانية */}
              <div className="w-full lg:w-2/3 bg-[#7bc3f5] dark:bg-[#287cb5] rounded-3xl lg:rounded-[2rem] border-4 border-slate-300 dark:border-slate-800 overflow-hidden shadow-inner h-[40vh] lg:h-full relative order-1 lg:order-2 shrink-0">
                <ComposableMap
                  projectionConfig={{ scale: 200 }}
                  className="w-full h-full absolute inset-0"
                >
                  <ZoomableGroup
                    center={mapPosition.center}
                    zoom={mapPosition.zoom}
                    onMoveEnd={(pos) =>
                      setMapPosition({
                        center: pos.coordinates as [number, number],
                        zoom: pos.zoom,
                        name: mapPosition.name,
                      })
                    }
                  >
                    <Geographies geography={geoUrl}>
                      {({ geographies }) =>
                        geographies.map((geo) => {
                          const country = countries.find(
                            (c) => c.geoId === geo.id
                          );
                          let fillColor = "#cbd5e1";
                          if (country && country.isActive) {
                            fillColor = "#0ea5e9";
                          }
                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              onClick={() => handleCountryClick(geo.id)}
                              style={{
                                default: {
                                  fill: fillColor,
                                  outline: "none",
                                  stroke: "#334155",
                                  strokeWidth: country?.isActive ? 1.5 : 0.5,
                                },
                                hover: {
                                  fill: country
                                    ? country.isActive
                                      ? "#0284c7"
                                      : "#94a3b8"
                                    : fillColor,
                                  cursor: country ? "pointer" : "default",
                                  outline: "none",
                                },
                              }}
                            />
                          );
                        })
                      }
                    </Geographies>
                    {countries.map((c) => {
                      const centroid = geoCentroid({ id: c.geoId } as any);
                      if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1]))
                        return null;
                      return (
                        <Marker
                          key={`m-${c.id}`}
                          coordinates={centroid as [number, number]}
                        >
                          <text
                            textAnchor="middle"
                            y={3}
                            fill={c.isActive ? "#fff" : "#64748b"}
                            style={{
                              fontFamily: "Cairo",
                              fontSize: "8px",
                              fontWeight: "900",
                              pointerEvents: "none",
                              opacity: c.isActive ? 1 : 0.6,
                            }}
                          >
                            {c.name}
                          </text>
                        </Marker>
                      );
                    })}
                  </ZoomableGroup>
                </ComposableMap>
              </div>
            </div>
          </div>
        ) : gameState === "setupChallenges" ? (
          <div className="m-auto p-4 lg:p-10 bg-white dark:bg-slate-900 rounded-3xl lg:rounded-[2.5rem] border-4 border-purple-500 text-center shadow-2xl w-full max-w-6xl flex flex-col h-[85vh] lg:h-[85vh]">
            <div className="flex items-center justify-center gap-3 lg:gap-4 mb-4 lg:mb-6 shrink-0 border-b border-slate-200 dark:border-slate-800 pb-3 lg:pb-4">
              <Star className="text-purple-500 w-8 h-8 lg:w-12 lg:h-12 animate-pulse shrink-0" />
              <h2 className="text-xl lg:text-4xl font-black dark:text-white shrink-0">
                تحديد دول تحدي الحكم
              </h2>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 flex-1 min-h-0 w-full">
              {/* اليمين: أدوات التحكم */}
              <div className="w-full lg:w-1/3 flex flex-col gap-3 lg:gap-4 overflow-y-auto pr-1 lg:pr-2 order-2 lg:order-1 custom-scroll">
                <p className="text-slate-500 font-bold text-xs lg:text-lg bg-slate-50 dark:bg-slate-800 p-3 lg:p-4 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed text-right">
                  يا حكم، حدد بالخريطة{" "}
                  <span className="text-purple-500 font-black">
                    {challengesCount}
                  </span>{" "}
                  دول لتكون تحديات مباشرة (2000 نقطة).
                </p>

                {challengesCount > 0 && (
                  <div className="flex flex-col bg-purple-50 dark:bg-purple-900/20 p-4 lg:p-5 rounded-2xl border border-purple-200 dark:border-purple-800 gap-3 lg:gap-4">
                    <div className="font-black text-lg lg:text-2xl text-purple-700 dark:text-purple-300">
                      المحددة: {countries.filter((c) => c.isChallenge).length}{" "}
                      من {challengesCount}
                    </div>
                    {countries.filter((c) => c.isChallenge).length ===
                      challengesCount && (
                      <button
                        onClick={confirmChallenges}
                        className="w-full py-2.5 lg:py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black shadow-md transition-colors text-sm lg:text-lg"
                      >
                        اعتماد التحديات والمتابعة
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* اليسار: الخريطة الميدانية */}
              <div className="w-full lg:w-2/3 bg-[#7bc3f5] dark:bg-[#287cb5] rounded-3xl lg:rounded-[2rem] border-4 border-slate-300 dark:border-slate-800 overflow-hidden shadow-inner h-[40vh] lg:h-full relative order-1 lg:order-2 shrink-0">
                <ComposableMap
                  projectionConfig={{ scale: 200 }}
                  className="w-full h-full absolute inset-0"
                >
                  <ZoomableGroup
                    center={mapPosition.center}
                    zoom={mapPosition.zoom}
                    onMoveEnd={(pos) =>
                      setMapPosition({
                        center: pos.coordinates as [number, number],
                        zoom: pos.zoom,
                        name: mapPosition.name,
                      })
                    }
                  >
                    <Geographies geography={geoUrl}>
                      {({ geographies }) =>
                        geographies.map((geo) => {
                          const country = countries.find(
                            (c) => c.geoId === geo.id
                          );
                          let fillColor = "#f1f5f9";
                          if (country) {
                            fillColor = country.isChallenge
                              ? "#a855f7"
                              : "#cbd5e1";
                          }
                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              onClick={() => handleCountryClick(geo.id)}
                              style={{
                                default: {
                                  fill: fillColor,
                                  outline: "none",
                                  stroke: "#334155",
                                  strokeWidth: 0.8,
                                },
                                hover: {
                                  fill: country ? "#9333ea" : fillColor,
                                  cursor: country ? "pointer" : "default",
                                  outline: "none",
                                },
                              }}
                            />
                          );
                        })
                      }
                    </Geographies>
                    {countries.map((c) => {
                      const centroid = geoCentroid({ id: c.geoId } as any);
                      if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1]))
                        return null;
                      return (
                        <Marker
                          key={`m-${c.id}`}
                          coordinates={centroid as [number, number]}
                        >
                          <text
                            textAnchor="middle"
                            y={3}
                            fill="#1e293b"
                            style={{
                              fontFamily: "Cairo",
                              fontSize: "8px",
                              fontWeight: "900",
                              pointerEvents: "none",
                            }}
                          >
                            {c.name}
                          </text>
                        </Marker>
                      );
                    })}
                  </ZoomableGroup>
                </ComposableMap>
              </div>
            </div>
          </div>
        ) : gameState === "setupCapitals" ? (
          <div className="m-auto p-4 lg:p-10 bg-white dark:bg-slate-900 rounded-3xl lg:rounded-[2.5rem] border-4 border-amber-500 text-center shadow-2xl w-full max-w-6xl flex flex-col h-[85vh] lg:h-[85vh]">
            <div className="flex items-center justify-center gap-3 lg:gap-4 mb-4 lg:mb-6 shrink-0 border-b border-slate-200 dark:border-slate-800 pb-3 lg:pb-4">
              <Crown className="text-amber-500 w-8 h-8 lg:w-12 lg:h-12 animate-bounce shrink-0" />
              <h2 className="text-xl lg:text-4xl font-black dark:text-white shrink-0">
                اختيار العواصم
              </h2>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 flex-1 min-h-0 w-full">
              {/* اليمين: أدوات التحكم */}
              <div className="w-full lg:w-1/3 flex flex-col gap-3 lg:gap-4 overflow-y-auto pr-1 lg:pr-2 order-2 lg:order-1 custom-scroll">
                <p className="text-slate-500 font-bold text-xs lg:text-lg bg-slate-50 dark:bg-slate-800 p-3 lg:p-4 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed text-right">
                  دور{" "}
                  <span
                    className={
                      turn === 1
                        ? "text-cyan-500 font-black"
                        : "text-rose-500 font-black"
                    }
                  >
                    {turn === 1 ? team1Name : team2Name}
                  </span>{" "}
                  يختارون عاصمتهم الأساسية (التاج 👑) على الخريطة
                </p>
              </div>

              {/* اليسار: الخريطة המيدانية */}
              <div className="w-full lg:w-2/3 bg-[#7bc3f5] dark:bg-[#287cb5] rounded-3xl lg:rounded-[2rem] border-4 border-slate-300 dark:border-slate-800 overflow-hidden shadow-inner h-[40vh] lg:h-full relative order-1 lg:order-2 shrink-0">
                <ComposableMap
                  projectionConfig={{ scale: 200 }}
                  className="w-full h-full absolute inset-0"
                >
                  <ZoomableGroup
                    center={mapPosition.center}
                    zoom={mapPosition.zoom}
                    onMoveEnd={(pos) =>
                      setMapPosition({
                        center: pos.coordinates as [number, number],
                        zoom: pos.zoom,
                        name: mapPosition.name,
                      })
                    }
                  >
                    <Geographies geography={geoUrl}>
                      {({ geographies }) =>
                        geographies.map((geo) => {
                          const country = countries.find(
                            (c) => c.geoId === geo.id
                          );
                          let fillColor = "#f1f5f9";
                          if (country) {
                            if (country.owner === 1) fillColor = "#06b6d4";
                            else if (country.owner === 2)
                              fillColor = "#f43f5e";
                            else if (country.isChallenge)
                              fillColor = "#a855f7";
                            else fillColor = "#facc15";
                          }
                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              onClick={() => handleCountryClick(geo.id)}
                              style={{
                                default: {
                                  fill: fillColor,
                                  outline: "none",
                                  stroke: "#334155",
                                  strokeWidth: country?.owner ? 1.5 : 0.8,
                                },
                                hover: {
                                  fill: country ? "#3b82f6" : fillColor,
                                  cursor: "pointer",
                                  outline: "none",
                                  strokeWidth: 1.5,
                                },
                              }}
                            />
                          );
                        })
                      }
                    </Geographies>
                    {countries.map((c) => {
                      const centroid = geoCentroid({ id: c.geoId } as any);
                      if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1]))
                        return null;

                      const isProtected = protectedCountries[c.id];

                      let label = c.name;
                      if (c.id === capitals.team1 || c.id === capitals.team2) {
                        label += " 👑";
                      }

                      return (
                        <Marker
                          key={`m-${c.id}`}
                          coordinates={centroid as [number, number]}
                        >
                          {isProtected && (
                            <g transform="translate(0, -14)">
                              <circle
                                r="8"
                                fill="#10b981"
                                stroke="#fff"
                                strokeWidth="1"
                              />
                              <Shield
                                width="10"
                                height="10"
                                x="-5"
                                y="-5"
                                color="white"
                                strokeWidth="2.5"
                              />
                            </g>
                          )}
                          {c.isStolen && (
                            <g transform="translate(0, -18)">
                              <Swords
                                width="18"
                                height="18"
                                x="-9"
                                y="-9"
                                color="black"
                                strokeWidth="3"
                              />
                            </g>
                          )}
                          <text
                            textAnchor="middle"
                            y={3}
                            fill={c.owner ? "#fff" : "#1e293b"}
                            style={{
                              fontFamily: "Cairo",
                              fontSize: "8px",
                              fontWeight: "900",
                              pointerEvents: "none",
                            }}
                          >
                            {label}
                          </text>
                        </Marker>
                      );
                    })}
                  </ZoomableGroup>
                </ComposableMap>
              </div>
            </div>
          </div>
        ) : gameState === "playing" ? (
          <div className="flex flex-col gap-4 lg:gap-6 flex-1 h-full min-h-0">
            {/* الفرق - أعلى الشاشة */}
            <div className="order-1 grid grid-cols-2 gap-4 lg:gap-8 shrink-0 z-50 w-full lg:w-4/5 mx-auto">
              {/* صندوق الفريق الأول */}
              <div
                className={`p-3 lg:p-6 rounded-2xl border-4 bg-white dark:bg-slate-800 ${turn === 1 ? "border-cyan-500 shadow-lg scale-100 lg:scale-105 transition-transform" : "border-slate-200 dark:border-slate-700"} text-center relative`}
              >
                <div className="font-black text-xs lg:text-sm text-slate-800 dark:text-slate-200 mb-1 lg:mb-2">
                  {team1Name}
                </div>
                <div className="text-2xl lg:text-3xl font-black dark:text-white flex items-center justify-center gap-1">
                  {score1}{" "}
                  <Coins
                    size={18}
                    className="lg:w-[22px] lg:h-[22px] text-yellow-500"
                  />
                </div>

                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <button
                    onClick={() => adjustScore(1, 100)}
                    className="text-emerald-500 hover:text-emerald-600 p-1"
                    title="إضافة 100"
                  >
                    <PlusCircle size={16} className="lg:w-[18px] lg:h-[18px]" />
                  </button>
                  <button
                    onClick={() => adjustScore(1, -100)}
                    className="text-rose-500 hover:text-rose-600 p-1"
                    title="خصم 100"
                  >
                    <MinusCircle
                      size={16}
                      className="lg:w-[18px] lg:h-[18px]"
                    />
                  </button>
                </div>

                <div className="flex justify-center gap-1 lg:gap-2 mt-2 lg:mt-3 text-[9px] lg:text-[10px] font-bold flex-wrap">
                  <span className="bg-slate-100 dark:bg-slate-700 dark:text-white px-1.5 lg:px-2 py-1 lg:py-1.5 rounded flex items-center gap-1">
                    <TankIcon size={10} className="lg:w-[12px] lg:h-[12px]" />{" "}
                    استحلال: {cards1.capture}
                  </span>
                  <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-1.5 lg:px-2 py-1 lg:py-1.5 rounded flex items-center gap-1">
                    <Shield size={10} className="lg:w-[12px] lg:h-[12px]" />{" "}
                    حماية: {cards1.protect}
                  </span>
                  <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-1.5 lg:px-2 py-1 lg:py-1.5 rounded flex items-center gap-1">
                    <Rocket size={10} className="lg:w-[12px] lg:h-[12px]" />{" "}
                    قصف: {cards1.airStrike}
                  </span>
                  <span className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-1.5 lg:px-2 py-1 lg:py-1.5 rounded flex items-center gap-1">
                    <Crown size={10} className="lg:w-[12px] lg:h-[12px]" /> غزو:{" "}
                    {cards1.capitalCapture}
                  </span>
                </div>
                <button
                  onClick={() => setQuickProtectTeam(1)}
                  disabled={cards1.protect === 0}
                  className="mt-2 lg:mt-3 w-full py-1.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/50 text-emerald-700 dark:text-emerald-400 font-black text-[10px] lg:text-xs rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-300 dark:border-emerald-700"
                >
                  <Shield size={12} className="lg:w-[14px] lg:h-[14px]" /> حماية
                  سريعة لدولة
                </button>
              </div>

              {/* صندوق الفريق الثاني */}
              <div
                className={`p-3 lg:p-4 rounded-xl border-4 bg-white dark:bg-slate-800 ${turn === 2 ? "border-rose-500 shadow-md scale-100 lg:scale-105 transition-transform" : "border-slate-200 dark:border-slate-700"} text-center relative`}
              >
                <div className="font-black text-xs lg:text-sm text-slate-800 dark:text-slate-200 mb-1">
                  {team2Name}
                </div>
                <div className="text-2xl lg:text-3xl font-black dark:text-white flex items-center justify-center gap-1">
                  {score2}{" "}
                  <Coins
                    size={18}
                    className="lg:w-[22px] lg:h-[22px] text-yellow-500"
                  />
                </div>

                <div className="absolute top-2 right-2 flex flex-col gap-1">
                  <button
                    onClick={() => adjustScore(2, 100)}
                    className="text-emerald-500 hover:text-emerald-600 p-1"
                    title="إضافة 100"
                  >
                    <PlusCircle size={16} className="lg:w-[18px] lg:h-[18px]" />
                  </button>
                  <button
                    onClick={() => adjustScore(2, -100)}
                    className="text-rose-500 hover:text-rose-600 p-1"
                    title="خصم 100"
                  >
                    <MinusCircle
                      size={16}
                      className="lg:w-[18px] lg:h-[18px]"
                    />
                  </button>
                </div>

                <div className="flex justify-center gap-1 lg:gap-2 mt-2 lg:mt-3 text-[9px] lg:text-[10px] font-bold flex-wrap">
                  <span className="bg-slate-100 dark:bg-slate-700 dark:text-white px-1.5 lg:px-2 py-1 lg:py-1.5 rounded flex items-center gap-1">
                    <TankIcon size={10} className="lg:w-[12px] lg:h-[12px]" />{" "}
                    استحلال: {cards2.capture}
                  </span>
                  <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-1.5 lg:px-2 py-1 lg:py-1.5 rounded flex items-center gap-1">
                    <Shield size={10} className="lg:w-[12px] lg:h-[12px]" />{" "}
                    حماية: {cards2.protect}
                  </span>
                  <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-1.5 lg:px-2 py-1 lg:py-1.5 rounded flex items-center gap-1">
                    <Rocket size={10} className="lg:w-[12px] lg:h-[12px]" />{" "}
                    قصف: {cards2.airStrike}
                  </span>
                  <span className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-1.5 lg:px-2 py-1 lg:py-1.5 rounded flex items-center gap-1">
                    <Crown size={10} className="lg:w-[12px] lg:h-[12px]" /> غزو:{" "}
                    {cards2.capitalCapture}
                  </span>
                </div>
                <button
                  onClick={() => setQuickProtectTeam(2)}
                  disabled={cards2.protect === 0}
                  className="mt-2 lg:mt-3 w-full py-1.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/50 text-emerald-700 dark:text-emerald-400 font-black text-[10px] lg:text-xs rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-300 dark:border-emerald-700"
                >
                  <Shield size={12} className="lg:w-[14px] lg:h-[14px]" /> حماية
                  سريعة لدولة
                </button>
              </div>
            </div>

            <div className="order-2 flex justify-center mt-1 lg:mt-4 mb-2 lg:mb-4 w-full z-50 shrink-0">
              <button
                onClick={() => {
                  setTurn((t) => (t === 1 ? 2 : 1));
                  setSelectedCountry(null);
                  setTeam1Choice(null);
                  setTeam2Choice(null);
                  setShowResult(false);
                  setIsAttacking(false);
                  setIsQuestionRevealed(false);
                  setForcedWinner(null);
                }}
                className="px-6 py-2.5 lg:px-12 lg:py-4 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-sm lg:text-xl rounded-2xl shadow-lg flex items-center gap-2 lg:gap-3 transition-all active:scale-95 border-2 border-amber-600/50"
              >
                <ArrowLeftRight size={20} className="lg:w-[28px] lg:h-[28px]" />
                تمرير الدور إلى: {turn === 1 ? team2Name : team1Name}
              </button>
            </div>

            <div className="order-3 flex flex-col w-full lg:w-5/6 mx-auto flex-1 min-h-[50vh] lg:min-h-[70vh] z-40 relative">
              <div
                className={`relative bg-[#7bc3f5] dark:bg-[#287cb5] rounded-3xl lg:rounded-[3rem] border-4 border-slate-300 dark:border-slate-800 overflow-hidden shadow-inner flex flex-col items-center justify-center flex-1 w-full h-full shrink-0`}
              >
                <ComposableMap
                  projectionConfig={{ scale: 200 }}
                  className="w-full h-full absolute inset-0"
                >
                  <ZoomableGroup
                    center={mapPosition.center}
                    zoom={mapPosition.zoom}
                    onMoveEnd={(pos) =>
                      setMapPosition({
                        center: pos.coordinates as [number, number],
                        zoom: pos.zoom,
                        name: mapPosition.name,
                      })
                    }
                  >
                    <Geographies geography={geoUrl}>
                      {({ geographies }) =>
                        geographies.map((geo) => {
                          const country = countries.find(
                            (c) => c.geoId === geo.id
                          );
                          let fillColor = "#cbd5e1";
                          if (country) {
                            if (country.owner === 1) fillColor = "#06b6d4";
                            else if (country.owner === 2) fillColor = "#f43f5e";
                            else if (country.isChallenge) fillColor = "#a855f7";
                            else fillColor = "#facc15";
                          }
                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              onClick={() => handleCountryClick(geo.id)}
                              style={{
                                default: {
                                  fill: fillColor,
                                  outline: "none",
                                  stroke: "#334155",
                                  strokeWidth: 0.8,
                                },
                                hover: {
                                  fill: country ? "#3b82f6" : fillColor,
                                  cursor: "pointer",
                                  outline: "none",
                                  strokeWidth: 1.5,
                                },
                              }}
                            />
                          );
                        })
                      }
                    </Geographies>
                    {countries.map((c) => {
                      const centroid = geoCentroid({ id: c.geoId } as any);
                      if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1]))
                        return null;

                      const isProtected = protectedCountries[c.id];

                      let label = c.name;
                      if (c.id === capitals.team1 || c.id === capitals.team2) {
                        label += " 👑";
                      }

                      return (
                        <Marker
                          key={`m-${c.id}`}
                          coordinates={centroid as [number, number]}
                        >
                          {isProtected && (
                            <g transform="translate(0, -14)">
                              <circle
                                r="8"
                                fill="#10b981"
                                stroke="#fff"
                                strokeWidth="1"
                              />
                              <Shield
                                width="10"
                                height="10"
                                x="-5"
                                y="-5"
                                color="white"
                                strokeWidth="2.5"
                              />
                            </g>
                          )}
                          {c.isStolen && (
                            <g transform="translate(0, -18)">
                              <Swords
                                width="18"
                                height="18"
                                x="-9"
                                y="-9"
                                color="black"
                                strokeWidth="3"
                              />
                            </g>
                          )}
                          <text
                            textAnchor="middle"
                            y={3}
                            fill={c.owner ? "#fff" : "#1e293b"}
                            style={{
                              fontFamily: "Cairo",
                              fontSize: "8px",
                              fontWeight: "900",
                              pointerEvents: "none",
                            }}
                          >
                            {label}
                          </text>
                        </Marker>
                      );
                    })}
                  </ZoomableGroup>
                </ComposableMap>
              </div>
            </div>
          </div>
        ) : (
          <div className="m-auto p-8 lg:p-12 bg-white dark:bg-slate-900 rounded-3xl lg:rounded-[3rem] text-center shadow-2xl border-2 w-full max-w-sm lg:max-w-3xl">
            <Trophy className="text-amber-500 w-16 h-16 lg:w-32 lg:h-32 mx-auto mb-4 lg:mb-8" />
            <h2 className="text-3xl lg:text-6xl font-black mb-6 lg:mb-12 dark:text-white">
              انتهت المعركة
            </h2>
            <button
              onClick={startGame}
              className="w-full lg:w-auto px-8 lg:px-16 py-3 lg:py-6 bg-slate-900 dark:bg-white text-white dark:text-black font-black rounded-xl lg:rounded-2xl text-lg lg:text-3xl transition-transform active:scale-95"
            >
              بدء حرب جديدة
            </button>
          </div>
        )}
      </div>

      {/* نافذة السؤال وأدوات الحكم (Option 3: Modal/Overlay) */}
      {selectedCountry && gameState === "playing" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-slate-900/30">
          <div
            className={`w-full max-w-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl lg:rounded-[2rem] border-4 border-blue-500 p-4 lg:p-6 shadow-2xl flex flex-col h-fit max-h-[90vh] overflow-y-auto ${modernScrollbar} animate-in zoom-in-95`}
          >
            <div className="flex justify-between items-center mb-4 lg:mb-6 border-b pb-3 lg:pb-4 sticky top-0 bg-transparent z-10">
              <span className="font-black text-lg lg:text-2xl dark:text-white flex items-center gap-1.5 lg:gap-3">
                <MapPin
                  size={18}
                  className={`lg:w-[28px] lg:h-[28px] ${
                    selectedCountry.isChallenge
                      ? "text-purple-500"
                      : "text-blue-500"
                  }`}
                />{" "}
                {selectedCountry.name}{" "}
                {(selectedCountry.id === capitals.team1 ||
                  selectedCountry.id === capitals.team2) && (
                  <Crown className="text-amber-500 w-4 h-4 lg:w-6 lg:h-6" />
                )}
                {!(
                  selectedCountry.id === capitals.team1 ||
                  selectedCountry.id === capitals.team2
                ) && (
                  <span className="text-xs lg:text-lg font-bold text-slate-500">
                    ({selectedCountry.value} نقطة)
                  </span>
                )}
              </span>
              <div className="flex gap-2">
                {selectedCountry.owner === null &&
                  !isAttacking &&
                  !selectedCountry.isChallenge && (
                    <button
                      onClick={handleChangeQuestion}
                      className="px-2 lg:px-4 py-1 lg:py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 font-bold text-[10px] lg:text-sm rounded-lg lg:rounded-xl transition-colors flex items-center gap-1 lg:gap-2"
                    >
                      <RefreshCw size={12} className="lg:w-[16px] lg:h-[16px]" />{" "}
                      <span className="hidden sm:inline">تغيير السؤال (1000)</span>
                      <span className="sm:hidden">تغيير (1000)</span>
                    </button>
                  )}
                <button
                  onClick={() => {
                    setSelectedCountry(null);
                    setTeam1Choice(null);
                    setTeam2Choice(null);
                    setShowResult(false);
                    setIsAttacking(false);
                    setIsQuestionRevealed(false);
                    setForcedWinner(null);
                  }}
                  className="p-1 lg:p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-lg lg:rounded-xl dark:text-white"
                >
                  <X size={20} className="lg:w-[28px] lg:h-[28px]" />
                </button>
              </div>
            </div>

            {selectedCountry.owner === null || isAttacking ? (
              selectedCountry.activeQuestion ? (
                <div className="space-y-4 lg:space-y-6">
                  {!selectedCountry.activeQuestion && !isAttacking ? (
                    <button
                      onClick={handleConfirmAnswers}
                      className="w-full py-6 lg:py-8 bg-blue-600 text-white rounded-2xl font-black text-lg lg:text-2xl"
                    >
                      سحب سؤال للدولة
                    </button>
                  ) : (
                    <>
                      {!isQuestionRevealed && (
                        <button
                          onClick={() => setIsQuestionRevealed(true)}
                          className="w-full py-2.5 lg:py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs lg:text-lg rounded-xl shadow-md transition-all mb-2"
                        >
                          إظهار السؤال للجمهور
                        </button>
                      )}

                      <p className="text-base lg:text-2xl font-black dark:text-white text-center leading-relaxed">
                        {selectedCountry.activeQuestion.q}
                      </p>

                      {selectedCountry.activeQuestion.options &&
                        selectedCountry.activeQuestion.options.length > 0 && (
                          <div className="space-y-3 lg:space-y-4 w-full">
                            {(!isAttacking || turn === 1) && (
                              <div className="bg-slate-50 dark:bg-slate-800 p-2 lg:p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                <p className="text-[10px] lg:text-base font-black text-cyan-600 dark:text-cyan-400 mb-2">
                                  إجابة {team1Name}:
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  {selectedCountry.activeQuestion.options.map(
                                    (o: string, i: number) => (
                                      <button
                                        key={i}
                                        disabled={showResult}
                                        onClick={() => setTeam1Choice(o)}
                                        className={`flex-1 p-2 lg:p-3 rounded-lg font-bold text-[10px] lg:text-sm border-2 transition-all ${team1Choice === o ? "bg-cyan-500 border-cyan-600 text-white shadow-sm" : "bg-white dark:bg-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700"}`}
                                      >
                                        {o}
                                      </button>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                            {(!isAttacking || turn === 2) && (
                              <div className="bg-slate-50 dark:bg-slate-800 p-2 lg:p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                <p className="text-[10px] lg:text-base font-black text-rose-600 dark:text-rose-400 mb-2">
                                  إجابة {team2Name}:
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  {selectedCountry.activeQuestion.options.map(
                                    (o: string, i: number) => (
                                      <button
                                        key={i}
                                        disabled={showResult}
                                        onClick={() => setTeam2Choice(o)}
                                        className={`flex-1 p-2 lg:p-3 rounded-lg font-bold text-[10px] lg:text-sm border-2 transition-all ${team2Choice === o ? "bg-rose-500 border-rose-600 text-white shadow-sm" : "bg-white dark:bg-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700"}`}
                                      >
                                        {o}
                                      </button>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                      {(selectedCountry.activeQuestion.options &&
                        (selectedCountry.activeQuestion.options.length > 0) &&
                        !showResult) && (
                          <button
                            onClick={handleConfirmAnswers}
                            className="w-full py-2.5 lg:py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs lg:text-lg rounded-xl shadow-md transition-all mt-2"
                          >
                            اعتماد الإجابات وإظهار النتيجة
                          </button>
                        )}

                      {showResult &&
                        selectedCountry.activeQuestion.options &&
                        selectedCountry.activeQuestion.options.length > 0 && (
                          <div className="mt-2 p-3 lg:p-6 bg-slate-100 dark:bg-slate-800 rounded-xl text-center animate-in fade-in">
                            {(() => {
                              let winner: 1 | 2 | null = null;
                              if (isAttacking) {
                                const attackerChoice =
                                  turn === 1 ? team1Choice : team2Choice;
                                if (
                                  attackerChoice ===
                                  selectedCountry.activeQuestion?.a
                                )
                                  winner = turn;
                              } else {
                                const is1Correct =
                                  team1Choice ===
                                  selectedCountry.activeQuestion?.a;
                                const is2Correct =
                                  team2Choice ===
                                  selectedCountry.activeQuestion?.a;
                                if (turn === 1) {
                                  if (is1Correct) winner = 1;
                                  else if (is2Correct) winner = 2;
                                } else {
                                  if (is2Correct) winner = 2;
                                  else if (is1Correct) winner = 1;
                                }
                              }

                              if (winner) {
                                const currentCards =
                                  winner === 1 ? cards1 : cards2;
                                const canProtectImmediately =
                                  currentCards.protect > 0 &&
                                  !protectedCountries[selectedCountry.id];

                                return (
                                  <>
                                    <h3 className="text-lg lg:text-2xl font-black text-emerald-600 dark:text-emerald-400 mb-1">
                                      إجابة صحيحة! 🎉
                                    </h3>
                                    <p className="text-xs lg:text-lg font-bold text-slate-700 dark:text-slate-300">
                                      تم الاستحلال لـ{" "}
                                      {winner === 1 ? team1Name : team2Name}
                                    </p>
                                    {selectedCountry.id === capitals.team1 ||
                                    selectedCountry.id === capitals.team2 ? (
                                      <p className="text-sm lg:text-xl font-black text-amber-500 mt-2 mb-3">
                                        مكافأة العاصمة: ثلث نقاط الخصم 💰
                                      </p>
                                    ) : (
                                      <p className="text-sm lg:text-xl font-black text-amber-500 mt-2 mb-3">
                                        الموارد المكتسبة: {selectedCountry.value}{" "}
                                        نقطة 💰
                                      </p>
                                    )}

                                    <div className="flex flex-col gap-2">
                                      <button
                                        onClick={() => handleCapture(winner!)}
                                        className="w-full py-2.5 lg:py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs lg:text-base rounded-xl shadow-md transition-all"
                                      >
                                        تأكيد ومتابعة (بدون حماية)
                                      </button>
                                      {canProtectImmediately && (
                                        <button
                                          onClick={() => {
                                            if (winner === 1) {
                                              setCards1((prev: any) => ({
                                                ...prev,
                                                protect: prev.protect - 1,
                                              }));
                                            } else {
                                              setCards2((prev: any) => ({
                                                ...prev,
                                                protect: prev.protect - 1,
                                              }));
                                            }
                                            setProtectedCountries((prev: any) => ({
                                              ...prev,
                                              [selectedCountry.id]: true,
                                            }));
                                            handleCapture(winner!);
                                          }}
                                          className="w-full py-2.5 lg:py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs lg:text-base rounded-xl shadow-md transition-all"
                                        >
                                          تأكيد ومتابعة + تفعيل حماية فورية
                                          (بطاقة)
                                        </button>
                                      )}
                                    </div>
                                  </>
                                );
                              } else {
                                return (
                                  <>
                                    <h3 className="text-lg lg:text-2xl font-black text-rose-600 dark:text-rose-400 mb-1">
                                      إجابة خاطئة! ❌
                                    </h3>
                                    <p className="text-xs lg:text-lg font-bold text-slate-700 dark:text-slate-300 mb-3">
                                      فشل الاستحلال والهجوم
                                    </p>
                                    <button
                                      onClick={handleMiss}
                                      className="w-full py-2.5 lg:py-3 bg-slate-500 hover:bg-slate-600 text-white font-black text-xs lg:text-base rounded-xl shadow-md transition-all"
                                    >
                                      تأكيد وتطبيق العقوبة
                                    </button>
                                  </>
                                );
                              }
                            })()}
                          </div>
                        )}

                      {(selectedCountry.isChallenge &&
                        (!selectedCountry.activeQuestion.options ||
                          selectedCountry.activeQuestion.options.length === 0) &&
                        !showResult) && (
                          <div className="text-center p-3 lg:p-5 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                            <p className="text-[10px] lg:text-xs font-bold text-purple-600 mb-2">
                              تحدي حكم مباشر: الحكم يقرر الفائز باستخدام أدوات
                              الطوارئ بالأسفل
                            </p>
                            <button
                              onClick={() => {
                                setShowResult(true);
                              }}
                              className="py-1.5 lg:py-2.5 px-4 lg:px-6 bg-purple-600 text-white rounded-lg font-black text-[10px] lg:text-sm"
                            >
                              بدء تنفيذ التحدي
                            </button>
                          </div>
                        )}

                      <div className="flex flex-col items-center justify-center pt-2">
                        {!isTimerRunning && timer === 20 ? (
                          <button
                            onClick={() => setIsTimerRunning(true)}
                            className="py-2 lg:py-3 px-6 lg:px-8 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-xs lg:text-base rounded-xl shadow-md inline-flex items-center gap-2"
                          >
                            <Play size={16} /> بدء المؤقت (للجمهور)
                          </button>
                        ) : (
                          <div className="text-center font-black text-3xl lg:text-5xl text-amber-500 font-mono tracking-widest">
                            {timer}
                          </div>
                        )}
                      </div>

                      <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-800">
                        <p className="text-[9px] lg:text-xs font-black text-slate-400 mb-2 text-right">
                          أدوات الحكم (إدارة الطوارئ):
                        </p>
                        {forcedWinner ? (
                          <div className="col-span-1 sm:col-span-2 p-2 lg:p-4 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500 rounded-xl text-center animate-in fade-in">
                            <p className="text-[10px] lg:text-sm font-black text-emerald-600 dark:text-emerald-400 mb-2">
                              إجبار فوز لـ{" "}
                              {forcedWinner === 1 ? team1Name : team2Name}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                onClick={() => {
                                  if (selectedCountry.isChallenge) {
                                    if (forcedWinner === 1)
                                      setChallengesUsed1((p: number) => p + 1);
                                    else
                                      setChallengesUsed2((p: number) => p + 1);
                                  }
                                  handleCapture(forcedWinner, true);
                                }}
                                className="py-1.5 lg:py-2 px-2 flex-1 bg-emerald-500 text-white rounded-lg text-[9px] lg:text-xs font-black"
                              >
                                تأكيد ومتابعة
                              </button>
                              {(forcedWinner === 1
                                ? cards1.protect
                                : cards2.protect) > 0 &&
                                !protectedCountries[selectedCountry.id] && (
                                  <button
                                    onClick={() => {
                                      if (selectedCountry.isChallenge) {
                                        if (forcedWinner === 1)
                                          setChallengesUsed1(
                                            (p: number) => p + 1,
                                          );
                                        else
                                          setChallengesUsed2(
                                            (p: number) => p + 1,
                                          );
                                      }
                                      if (forcedWinner === 1)
                                        setCards1((p: any) => ({
                                          ...p,
                                          protect: p.protect - 1,
                                        }));
                                      else
                                        setCards2((p: any) => ({
                                          ...p,
                                          protect: p.protect - 1,
                                        }));
                                      setProtectedCountries((p: any) => ({
                                        ...p,
                                        [selectedCountry.id]: true,
                                      }));
                                      handleCapture(forcedWinner, true);
                                    }}
                                    className="py-1.5 lg:py-2 px-2 flex-1 bg-teal-600 text-white rounded-lg text-[9px] lg:text-xs font-black"
                                  >
                                    تأكيد + حماية فورية
                                  </button>
                                )}
                              <button
                                onClick={() => setForcedWinner(null)}
                                className="py-1.5 lg:py-2 px-4 flex-none bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-[9px] lg:text-xs font-black mt-1 sm:mt-0"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                              onClick={handleRefereeChangeQuestion}
                              className="col-span-1 sm:col-span-2 py-2 lg:py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] lg:text-xs font-bold transition-colors"
                            >
                              تغيير السؤال/التحدي
                            </button>
                            <button
                              onClick={handleManualFree}
                              className="col-span-1 sm:col-span-2 py-2 lg:py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-900/30 text-rose-600 rounded-lg text-[10px] lg:text-xs font-bold transition-colors"
                            >
                              سحب وجعلها حرة
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `هل أنت متأكد من إجبار فوز ${team1Name}؟`,
                                  )
                                )
                                  setForcedWinner(1);
                              }}
                              className="py-2 lg:py-2.5 bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded-lg text-[10px] lg:text-xs font-bold transition-colors"
                            >
                              إجبار فوز {team1Name}
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `هل أنت متأكد من إجبار فوز ${team2Name}؟`,
                                  )
                                )
                                  setForcedWinner(2);
                              }}
                              className="py-2 lg:py-2.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg text-[10px] lg:text-xs font-bold transition-colors"
                            >
                              إجبار فوز {team2Name}
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                    <div className="py-6 lg:py-8 text-center space-y-3 lg:space-y-4">
                      <p className="text-slate-400 text-sm lg:text-base font-bold">
                        لا يوجد أسئلة مسجلة في هذه الدولة.
                      </p>
                      <div className="pt-4 lg:pt-6 mt-3 lg:mt-4 border-t border-slate-200 dark:border-slate-800 text-right">
                        <p className="text-[9px] lg:text-xs font-black text-slate-400 mb-2">
                          أدوات الحكم (إدارة الطوارئ):
                        </p>
                        {forcedWinner ? (
                          <div className="col-span-1 sm:col-span-2 p-2 lg:p-4 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500 rounded-xl text-center animate-in fade-in">
                            <p className="text-[10px] lg:text-sm font-black text-emerald-600 dark:text-emerald-400 mb-2">
                              إجبار فوز لـ{" "}
                              {forcedWinner === 1 ? team1Name : team2Name}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                onClick={() => {
                                  if (selectedCountry.isChallenge) {
                                    if (forcedWinner === 1)
                                      setChallengesUsed1((p: number) => p + 1);
                                    else
                                      setChallengesUsed2((p: number) => p + 1);
                                  }
                                  handleCapture(forcedWinner, true);
                                }}
                                className="py-1.5 lg:py-2 px-2 flex-1 bg-emerald-500 text-white rounded-lg text-[9px] lg:text-xs font-black"
                              >
                                تأكيد ومتابعة
                              </button>
                              {(forcedWinner === 1
                                ? cards1.protect
                                : cards2.protect) > 0 &&
                                !protectedCountries[selectedCountry.id] && (
                                  <button
                                    onClick={() => {
                                      if (selectedCountry.isChallenge) {
                                        if (forcedWinner === 1)
                                          setChallengesUsed1(
                                            (p: number) => p + 1,
                                          );
                                        else
                                          setChallengesUsed2(
                                            (p: number) => p + 1,
                                          );
                                      }
                                      if (forcedWinner === 1)
                                        setCards1((p: any) => ({
                                          ...p,
                                          protect: p.protect - 1,
                                       }));
                                      else
                                        setCards2((p: any) => ({
                                          ...p,
                                          protect: p.protect - 1,
                                        }));
                                      setProtectedCountries((p: any) => ({
                                        ...p,
                                        [selectedCountry.id]: true,
                                      }));
                                      handleCapture(forcedWinner, true);
                                    }}
                                    className="py-1.5 lg:py-2 px-2 flex-1 bg-teal-600 text-white rounded-lg text-[9px] lg:text-xs font-black"
                                  >
                                    تأكيد + حماية فورية
                                  </button>
                                )}
                              <button
                                onClick={() => setForcedWinner(null)}
                                className="py-1.5 lg:py-2 px-4 flex-none bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-[9px] lg:text-xs font-black mt-1 sm:mt-0"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                              onClick={handleManualFree}
                              className="col-span-1 sm:col-span-2 py-2 lg:py-2.5 bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-900/30 text-rose-600 rounded-lg text-[10px] lg:text-xs font-bold transition-colors"
                            >
                              سحب وجعلها حرة
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `هل أنت متأكد من إجبار فوز ${team1Name}؟`,
                                  )
                                )
                                  setForcedWinner(1);
                              }}
                              className="py-2 lg:py-2.5 bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded-lg text-[10px] lg:text-xs font-bold transition-colors"
                            >
                              إجبار فوز {team1Name}
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `هل أنت متأكد من إجبار فوز ${team2Name}؟`,
                                  )
                                )
                                  setForcedWinner(2);
                              }}
                              className="py-2 lg:py-2.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg text-[10px] lg:text-xs font-bold transition-colors"
                            >
                              إجبار فوز {team2Name}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                ) : (
          <div className="py-4 lg:py-8 text-center space-y-3 lg:space-y-5">
            <p className="font-bold text-base lg:text-xl dark:text-white mb-4 lg:mb-6">
              مملوكة لـ {selectedCountry.owner === 1 ? team1Name : team2Name}
            </p>

            {(() => {
              const isProtected = protectedCountries[selectedCountry.id];
              const isChallengeOwned =
                selectedCountry.isChallenge && selectedCountry.owner !== null;
              const isOpponentCapital =
                selectedCountry.id ===
                (turn === 1 ? capitals.team2 : capitals.team1);
              const canBeAttacked =
                !isChallengeOwned && !selectedCountry.isStolen;

              return (
                <>
                  {selectedCountry.owner !== turn &&
                    canBeAttacked &&
                    !isProtected &&
                    !isOpponentCapital && (
                      <button
                        onClick={useCaptureCard}
                        className="px-4 py-3 lg:px-6 lg:py-5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl lg:rounded-2xl font-black shadow-md w-full flex items-center justify-center gap-2 transition-colors text-xs lg:text-lg"
                      >
                        <TankIcon size={18} /> بدء الاستحلال الأبدي
                      </button>
                    )}

                  {selectedCountry.owner !== turn &&
                    canBeAttacked &&
                    !isProtected &&
                    isOpponentCapital && (
                      <button
                        onClick={useCaptureCard}
                        className="px-4 py-3 lg:px-6 lg:py-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl lg:rounded-2xl font-black shadow-md w-full flex items-center justify-center gap-2 transition-colors text-xs lg:text-lg"
                      >
                        <Crown size={18} /> غزو العاصمة الأبدي
                      </button>
                    )}

                  {selectedCountry.owner !== turn &&
                    canBeAttacked &&
                    !isOpponentCapital && (
                      <button
                        onClick={useAirStrike}
                        className="px-4 py-3 lg:px-6 lg:py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl lg:rounded-2xl font-black shadow-md w-full flex items-center justify-center gap-2 transition-colors text-[10px] lg:text-base"
                      >
                        <Rocket size={18} /> قصف مدمر (- نصف الدولة)
                      </button>
                    )}

                  {isProtected &&
                    selectedCountry.owner !== turn &&
                    !isOpponentCapital && (
                      <div className="px-4 py-3 lg:px-6 lg:py-5 bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 rounded-xl lg:rounded-2xl font-black shadow-inner w-full flex items-center justify-center gap-2 text-xs lg:text-base text-center">
                        <Shield size={18} className="shrink-0" /> الدولة محمية بشكل كامل ضد
                        الاستحلال المباشر بالدبابة
                      </div>
                    )}

                  {isProtected &&
                    selectedCountry.owner !== turn &&
                    isOpponentCapital && (
                      <div className="px-4 py-3 lg:px-6 lg:py-5 bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 rounded-xl lg:rounded-2xl font-black shadow-inner w-full flex items-center justify-center gap-2 text-xs lg:text-base text-center">
                        <Shield size={18} className="shrink-0" /> العاصمة محمية بالدرع ولا
                        يمكن غزوها حالياً
                      </div>
                    )}

                  {isChallengeOwned && selectedCountry.owner !== turn && (
                    <div className="px-4 py-3 lg:px-6 lg:py-5 bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400 rounded-xl lg:rounded-2xl font-black shadow-inner w-full flex items-center justify-center gap-2 text-xs lg:text-base text-center">
                      <Star size={18} className="shrink-0" /> دولة التحدي غير قابلة للاستحلال
                      أو القصف
                    </div>
                  )}

                  {selectedCountry.isStolen &&
                    selectedCountry.owner !== turn && (
                      <div className="px-4 py-3 lg:px-6 lg:py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl lg:rounded-2xl font-black shadow-inner w-full flex items-center justify-center gap-2 text-xs lg:text-base text-center">
                        <Swords size={18} className="shrink-0" /> الدولة مستحلة أبدياً بالبطاقة
                        ولا يمكن الهجوم عليها
                      </div>
                    )}
                </>
              );
            })()}

            {selectedCountry.owner === turn &&
              !protectedCountries[selectedCountry.id] && (
                <button
                  onClick={useProtectCard}
                  className="px-4 py-3 lg:px-6 lg:py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl lg:rounded-2xl font-black shadow-md w-full flex items-center justify-center gap-2 transition-colors text-xs lg:text-lg"
                >
                  <Shield size={18} /> تفعيل بطاقة الحماية (درع دائم)
                </button>
              )}

            <div className="pt-4 lg:pt-6 mt-3 lg:mt-4 border-t border-slate-200 dark:border-slate-800">
              <p className="text-[9px] lg:text-xs font-black text-slate-400 mb-2 lg:mb-3 text-right">
                أدوات الحكم (إدارة الطوارئ):
              </p>
              {forcedWinner ? (
                <div className="col-span-1 sm:col-span-2 p-2 lg:p-4 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500 rounded-xl text-center animate-in fade-in">
                  <p className="text-[10px] lg:text-sm font-black text-emerald-600 dark:text-emerald-400 mb-2">
                    إجبار فوز لـ {forcedWinner === 1 ? team1Name : team2Name}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => {
                        if (selectedCountry.isChallenge) {
                          if (forcedWinner === 1)
                            setChallengesUsed1((p: number) => p + 1);
                          else setChallengesUsed2((p: number) => p + 1);
                        }
                        handleCapture(forcedWinner, true);
                      }}
                      className="py-1.5 lg:py-2.5 px-2 flex-1 bg-emerald-500 text-white rounded-lg text-[9px] lg:text-xs font-black"
                    >
                      تأكيد ومتابعة
                    </button>
                    {(() => {
                      const protectCards =
                        forcedWinner === 1 ? cards1.protect : cards2.protect;
                      if (
                        protectCards === 0 ||
                        protectedCountries[selectedCountry.id]
                      )
                        return null;
                      return (
                        <button
                          onClick={() => {
                            if (selectedCountry.isChallenge) {
                              if (forcedWinner === 1)
                                setChallengesUsed1((p: number) => p + 1);
                              else setChallengesUsed2((p: number) => p + 1);
                            }
                            if (forcedWinner === 1)
                              setCards1((p: any) => ({
                                ...p,
                                protect: p.protect - 1,
                              }));
                            else
                              setCards2((p: any) => ({
                                ...p,
                                protect: p.protect - 1,
                              }));
                            setProtectedCountries((p: any) => ({
                              ...p,
                              [selectedCountry.id]: true,
                            }));
                            handleCapture(forcedWinner, true);
                          }}
                          className="py-1.5 lg:py-2.5 px-2 flex-1 bg-teal-600 text-white rounded-lg text-[9px] lg:text-xs font-black"
                        >
                          تأكيد + حماية
                        </button>
                      );
                    })()}
                    <button
                      onClick={() => setForcedWinner(null)}
                      className="py-1.5 lg:py-2.5 px-4 flex-none bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-[9px] lg:text-xs font-black mt-1 sm:mt-0"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={handleManualFree}
                    className="col-span-1 sm:col-span-2 py-2 lg:py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] lg:text-xs font-bold transition-colors"
                  >
                    سحب وجعلها حرة
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من إجبار فوز ${team1Name}؟`))
                        setForcedWinner(1);
                    }}
                    className="py-2 lg:py-2.5 bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded-lg text-[10px] lg:text-xs font-bold transition-colors"
                  >
                    إجبار فوز {team1Name}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من إجبار فوز ${team2Name}؟`))
                        setForcedWinner(2);
                    }}
                    className="py-2 lg:py-2.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg text-[10px] lg:text-xs font-bold transition-colors"
                  >
                    إجبار فوز {team2Name}
                  </button>
                </div>
              )}
            </div>
          </div>
            )}
          </div>
        </div>
      )}

      {showAudienceModal && (
        <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-8 max-w-sm w-full border-2 border-blue-500 text-center shadow-2xl animate-in zoom-in-95 relative">
            <button
              onClick={() => setShowAudienceModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <MonitorPlay className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl lg:text-2xl font-black mb-2 dark:text-white">
              دعوة للرادار (شاشة الجمهور)
            </h3>
            <p className="text-slate-500 mb-6 text-sm font-bold">
              امسح الباركود، أو انسخ الرابط، أو أدخل الكود في صفحة الجمهور.
            </p>

            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl mb-6">
              <p className="text-xs text-slate-500 font-bold mb-1">كود الغرفة:</p>
              <p className="text-4xl font-mono font-black text-blue-600 dark:text-blue-400 tracking-widest">
                {roomCode}
              </p>
            </div>

            <div className="bg-white p-2 rounded-2xl shadow-sm border-2 border-slate-200 w-fit mx-auto mb-6">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(audienceUrl)}`}
                alt="QR Code"
                className="w-32 h-32"
              />
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(audienceUrl);
                alert("تم نسخ الرابط بنجاح! ✅");
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-colors text-sm"
            >
              نسخ الرابط
            </button>
          </div>
        </div>
      )}
    </main>
  );
}