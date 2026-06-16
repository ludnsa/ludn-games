"use client";
import React, { useState, useEffect } from "react";
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
  Coins,
  Trophy,
  MapPin,
  Crown,
  Swords,
  Shield,
  Rocket,
  Star,
  HelpCircle,
  Moon,
  Sun,
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

export default function WorldDominationAudience() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState<string>("");
  const [liveData, setLiveData] = useState<any>(null);
  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) {
      setRoomCode(room.toUpperCase());
    }
  }, []);

  useEffect(() => {
    if (!roomCode) return;

    const fetchInitialData = async () => {
      const { data, error } = await supabase
        .from("wd_rooms")
        .select("live_sync")
        .eq("room_code", roomCode)
        .single();
      
      if (data && !error) {
        setLiveData(data.live_sync);
      }
    };
    
    fetchInitialData();

    const channel = supabase
      .channel('wd_live_sync_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wd_rooms',
          filter: `room_code=eq.${roomCode}`
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData && newData.live_sync) {
            setLiveData(newData.live_sync);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, roomCode]);

  if (!roomCode) {
    return (
      <div className={`relative z-[999] pointer-events-auto min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 ${cairo.className}`} dir="rtl">
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 max-w-sm w-full text-center shadow-xl border border-slate-200 dark:border-slate-800 relative z-[1000]">
          <Globe className="w-16 h-16 text-blue-500 mx-auto mb-6 animate-pulse" />
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">الدخول للرادار</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-6">الرجاء إدخال كود الغرفة المكون من 5 أحرف للانضمام لشاشة الجمهور.</p>
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            placeholder="مثال: W7K9X"
            maxLength={5}
            className="relative z-[1010] pointer-events-auto w-full text-center p-4 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-2xl font-black mb-4 uppercase outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
          <button
            onClick={() => {
              if (inputCode.length >= 5) {
                setRoomCode(inputCode);
                window.history.pushState({}, '', `?room=${inputCode}`);
              }
            }}
            disabled={inputCode.length < 5}
            className="relative z-[1010] pointer-events-auto w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black transition-colors"
          >
            انضمام للغرفة
          </button>
        </div>
      </div>
    );
  }

  if (!liveData)
    return (
      <div className="min-h-screen bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-300 flex flex-col items-center justify-center font-black tracking-widest animate-pulse transition-colors duration-500" dir="rtl">
        <div className="text-2xl lg:text-3xl mb-4">جاري تهيئة ساحة المعركة...</div>
        <div className="text-sm text-blue-500 font-mono">غرفة: {roomCode}</div>
      </div>
    );

  const {
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
    isQuestionRevealed = false,
    capitals = { team1: null, team2: null },
    stolenCapitalAlert = null,
    protectedCountries = {},
    mapPosition = { center: [0, 0], zoom: 1, name: "العالم" },
  } = liveData;

  const cards1 = {
    capture: liveData.cards1?.capture ?? 3,
    protect: liveData.cards1?.protect ?? 5,
    airStrike: liveData.cards1?.airStrike ?? 3,
    capitalCapture: liveData.cards1?.capitalCapture ?? 2,
  };

  const cards2 = {
    capture: liveData.cards2?.capture ?? 3,
    protect: liveData.cards2?.protect ?? 5,
    airStrike: liveData.cards2?.airStrike ?? 3,
    capitalCapture: liveData.cards2?.capitalCapture ?? 2,
  };

  const isDraw = score1 === score2;
  const winnerName = score1 > score2 ? team1Name : team2Name;
  const winnerScore = score1 > score2 ? score1 : score2;
  const winnerColor =
    score1 > score2
      ? "text-cyan-600 dark:text-cyan-400"
      : "text-rose-600 dark:text-rose-400";

  const team1Countries = countries?.filter((c: any) => c.owner === 1) || [];
  const team2Countries = countries?.filter((c: any) => c.owner === 2) || [];
  const freeCountries =
    countries?.filter(
      (c: any) =>
        c.owner === null &&
        c.isActive !== false &&
        c.id !== capitals.team1 &&
        c.id !== capitals.team2,
    ) || [];
  const countriesLeft = freeCountries.length;

  const isQuestionActive = selectedCountry && gameState === "playing";

  return (
    <main
      className={`relative w-full min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-3 lg:p-6 flex flex-col gap-4 lg:gap-6 transition-colors duration-700 ${cairo.className}`}
      dir="rtl"
    >
      <button
        onClick={() => setIsDark(!isDark)}
        className="absolute top-4 left-4 lg:top-6 lg:left-6 z-110 p-2 lg:p-3 rounded-xl lg:rounded-2xl bg-white dark:bg-slate-800 text-amber-500 dark:text-blue-400 shadow-xl border border-slate-200 dark:border-slate-700 transition-all hover:scale-110"
      >
        {isDark ? (
          <Sun size={20} className="lg:w-6 lg:h-6" />
        ) : (
          <Moon size={20} className="lg:w-6 lg:h-6" />
        )}
      </button>

      {/* تنبيه سقوط العاصمة */}
      {stolenCapitalAlert && (
        <div className="fixed inset-0 z-100 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 transition-colors duration-700">
          <div className="bg-white dark:bg-slate-900 border-4 border-amber-500 rounded-3xl lg:rounded-[3rem] p-6 lg:p-16 max-w-4xl w-full text-center shadow-[0_0_50px_rgba(245,158,11,0.5)] lg:shadow-[0_0_100px_rgba(245,158,11,0.5)] animate-in zoom-in duration-700">
            <Star className="w-24 h-24 lg:w-48 lg:h-48 text-amber-500 mx-auto mb-4 lg:mb-8 animate-pulse drop-shadow-[0_0_15px_rgba(245,158,11,0.8)] lg:drop-shadow-[0_0_30px_rgba(245,158,11,0.8)]" />
            <h2 className="text-4xl lg:text-7xl font-black text-slate-900 dark:text-white mb-4 lg:mb-8 tracking-widest drop-shadow-lg">
              سقوط العاصمة! 🔥
            </h2>
            <p className="text-xl lg:text-4xl font-bold text-slate-600 dark:text-slate-300 mb-8 lg:mb-12 leading-relaxed">
              لقد سقطت عاصمة{" "}
              <span className="text-slate-900 dark:text-white font-black drop-shadow-md">
                {stolenCapitalAlert.loser === 1 ? team1Name : team2Name}
              </span>{" "}
              ({stolenCapitalAlert.countryName})
            </p>
            <div className="bg-amber-50 dark:bg-amber-500/10 border-4 border-amber-300 dark:border-amber-500/40 rounded-3xl lg:rounded-[2.5rem] p-6 lg:p-10 shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-amber-500/10 to-transparent animate-shimmer"></div>
              <p className="text-2xl lg:text-4xl font-black text-amber-600 dark:text-amber-400 mb-4 lg:mb-6 relative z-10">
                تم غنم ثلث الثروات:
              </p>
              <div className="text-5xl lg:text-9xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-3 lg:gap-6 drop-shadow-2xl relative z-10">
                {stolenCapitalAlert.points}{" "}
                <Coins className="text-yellow-500 dark:text-yellow-400 w-12 h-12 lg:w-24 lg:h-24 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)] lg:drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" />
              </div>
              <p className="text-xl lg:text-3xl font-bold text-amber-700 dark:text-amber-300 mt-6 lg:mt-8 relative z-10">
                لصالح: {stolenCapitalAlert.winner === 1 ? team1Name : team2Name}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* شاشة النهاية */}
      {gameState === "gameOver" && (
        <div className="fixed inset-0 z-90 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 lg:p-8 transition-colors duration-700">
          <div className="w-full max-w-4xl bg-slate-50 dark:bg-slate-900/80 rounded-[3rem] lg:rounded-[4rem] border-4 border-amber-500 p-8 lg:p-16 text-center shadow-[0_0_40px_rgba(245,158,11,0.3)] lg:shadow-[0_0_80px_rgba(245,158,11,0.3)] animate-in zoom-in-95 duration-700">
            <div className="relative inline-block mb-6 lg:mb-10">
              <Trophy className="w-24 h-24 lg:w-48 lg:h-48 text-amber-500 animate-pulse drop-shadow-[0_0_15px_rgba(245,158,11,0.6)] lg:drop-shadow-[0_0_30px_rgba(245,158,11,0.6)]" />
              <Crown className="w-10 h-10 lg:w-16 lg:h-16 text-yellow-500 dark:text-yellow-300 absolute -top-4 -right-4 lg:-top-6 lg:-right-6 rotate-12 animate-bounce drop-shadow-md" />
            </div>
            <h2 className="text-xl lg:text-3xl font-black text-slate-500 dark:text-slate-400 mb-2 lg:mb-4 tracking-[0.2em] lg:tracking-[0.3em] uppercase">
              انتهت السيطرة
            </h2>
            {isDraw ? (
              <div className="space-y-4 lg:space-y-6">
                <h1 className="text-4xl lg:text-7xl font-black text-slate-900 dark:text-white drop-shadow-xl">
                  تعادل الأبطال!
                </h1>
                <p className="text-xl lg:text-3xl text-slate-600 dark:text-slate-300 font-bold">
                  كلا الفريقين أثبتا قوتهما بـ {score1} نقطة
                </p>
              </div>
            ) : (
              <div className="space-y-6 lg:space-y-8">
                <div className="space-y-2">
                  <p className="text-lg lg:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-widest">
                    سيد العالم الجديد هو:
                  </p>
                  <h1
                    className={`text-5xl lg:text-8xl font-black ${winnerColor} drop-shadow-[0_0_15px_currentColor] lg:drop-shadow-[0_0_30px_currentColor] lg:scale-110`}
                  >
                    {winnerName}
                  </h1>
                </div>
                <div className="bg-white dark:bg-slate-950/50 inline-flex flex-col lg:flex-row items-center justify-center gap-2 lg:gap-6 px-8 py-4 lg:px-12 lg:py-6 rounded-3xl lg:rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-800 shadow-inner">
                  <div className="flex items-center gap-3 lg:gap-6">
                    <Coins className="text-yellow-500 dark:text-yellow-400 w-8 h-8 lg:w-14 lg:h-14" />
                    <span className="text-4xl lg:text-7xl font-black text-slate-900 dark:text-white drop-shadow-lg">
                      {winnerScore}
                    </span>
                  </div>
                  <span className="text-sm lg:text-2xl font-bold text-slate-500 lg:text-slate-50 lg:mr-2">
                    نقطة سيطرة
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* شاشة السؤال المنبثقة */}
      {isQuestionActive && (
        <div className="fixed inset-0 z-80 bg-slate-900/80 dark:bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-500 transition-colors">
          <div className="w-full max-w-6xl bg-white/95 dark:bg-slate-900/90 rounded-[2rem] lg:rounded-[4rem] border border-slate-200 dark:border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] dark:shadow-[0_0_100px_rgba(0,0,0,0.8)] p-6 lg:p-16 flex flex-col items-center text-center transform transition-all scale-100 max-h-screen overflow-y-auto custom-scroll">
            <div
              className={`px-6 py-3 lg:px-10 lg:py-4 rounded-2xl lg:rounded-[2rem] border-2 mb-6 lg:mb-12 flex items-center justify-center gap-2 lg:gap-4 shadow-2xl ${selectedCountry.isChallenge ? "bg-purple-100 border-purple-300 dark:bg-purple-950/50 dark:border-purple-500/50 shadow-purple-500/20" : "bg-blue-100 border-blue-300 dark:bg-blue-950/50 dark:border-blue-500/50 shadow-blue-500/20"}`}
            >
              <MapPin
                className={`${selectedCountry.isChallenge ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400"} w-6 h-6 lg:w-10 lg:h-10`}
              />
              <span
                className={`font-black text-2xl lg:text-4xl ${selectedCountry.isChallenge ? "text-purple-700 dark:text-purple-300" : "text-blue-700 dark:text-blue-300"} drop-shadow-sm dark:drop-shadow-md flex items-center gap-2 lg:gap-3`}
              >
                {selectedCountry.name}{" "}
                {(selectedCountry.id === capitals.team1 ||
                  selectedCountry.id === capitals.team2) && (
                  <Crown className="text-amber-500 w-6 h-6 lg:w-10 lg:h-10" />
                )}
              </span>
            </div>

            {selectedCountry.owner !== null && !isAttacking ? (
              <div className="py-8 lg:py-12 flex flex-col items-center justify-center w-full animate-in zoom-in-95">
                <Swords className="w-24 h-24 lg:w-48 lg:h-48 mx-auto text-slate-300 dark:text-slate-700 opacity-50 mb-6 lg:mb-8" />
                <h2 className="text-2xl lg:text-5xl font-black text-slate-800 dark:text-white leading-tight">
                  هذه الدولة مملوكة لـ <br />
                  <span
                    className={
                      selectedCountry.owner === 1
                        ? "text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)] lg:drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                        : "text-rose-600 dark:text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)] lg:drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]"
                    }
                  >
                    {selectedCountry.owner === 1 ? team1Name : team2Name}
                  </span>
                </h2>
                <p className="text-lg lg:text-3xl font-bold text-amber-600 dark:text-amber-400 animate-pulse mt-6 lg:mt-8 bg-amber-50 dark:bg-amber-500/10 px-6 py-2 lg:px-8 lg:py-3 rounded-full border border-amber-200 dark:border-amber-500/20">
                  بانتظار قرار الخصم بالهجوم...
                </p>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                {!isQuestionRevealed ? (
                  <div className="py-12 lg:py-24 text-center space-y-6 lg:space-y-8 animate-pulse">
                    <h3 className="text-2xl lg:text-5xl font-black text-amber-500 dark:text-amber-400 drop-shadow-md dark:drop-shadow-xl tracking-wide">
                      الرجاء الاستماع للحكم...
                    </h3>
                    <div className="w-24 lg:w-32 h-2 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto overflow-hidden">
                      <div className="w-1/2 h-full bg-amber-400 dark:bg-amber-500 rounded-full animate-shimmer"></div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center animate-in slide-in-from-bottom-8 duration-500">
                    <h3
                      className={`font-black text-slate-900 dark:text-white mb-6 lg:mb-10 leading-relaxed drop-shadow-md dark:drop-shadow-2xl text-center max-w-5xl ${selectedCountry.activeQuestion?.q?.length > 100 ? "text-xl md:text-3xl lg:text-5xl" : "text-2xl md:text-4xl lg:text-6xl"}`}
                    >
                      {selectedCountry.activeQuestion?.q}
                    </h3>

                    {selectedCountry.activeQuestion?.options &&
                      selectedCountry.activeQuestion.options.length > 0 && (
                        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 w-full mb-6 lg:mb-10">
                          {selectedCountry.activeQuestion.options.map(
                            (o: any, i: number) => {
                              let bgClass =
                                "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-800/80 dark:border-slate-600/50 dark:text-slate-300";

                              if (showResult) {
                                if (o === selectedCountry.activeQuestion.a) {
                                  bgClass =
                                    "bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-500/20 dark:border-emerald-400 dark:text-emerald-100 scale-105 shadow-[0_0_20px_rgba(52,211,153,0.2)] lg:shadow-[0_0_50px_rgba(52,211,153,0.3)] z-10";
                                } else if (
                                  o === team1Choice ||
                                  o === team2Choice
                                ) {
                                  bgClass =
                                    "bg-rose-50 border-rose-200 text-slate-400 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-slate-500 scale-95 opacity-60";
                                } else {
                                  bgClass =
                                    "bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-600 opacity-40 scale-95";
                                }
                              } else {
                                if (o === team1Choice || o === team2Choice) {
                                  bgClass =
                                    "bg-slate-200 border-slate-400 text-slate-900 dark:bg-slate-700 dark:border-slate-500 dark:text-white shadow-inner";
                                }
                              }

                              return (
                                <div
                                  key={i}
                                  className={`relative flex-1 p-4 lg:p-8 border-2 lg:border-4 rounded-2xl lg:rounded-[2rem] text-lg lg:text-3xl font-black transition-all duration-500 flex items-center justify-center text-center leading-snug backdrop-blur-sm ${bgClass}`}
                                >
                                  {o}
                                  {team1Choice === o && (
                                    <div
                                      className={`absolute -top-3 -right-2 lg:-top-5 lg:-right-4 px-2 lg:px-4 py-1 lg:py-2 rounded-lg lg:rounded-xl text-[10px] lg:text-xs font-black shadow-xl transition-all duration-500 ${showResult ? (o === selectedCountry.activeQuestion.a ? "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-slate-900" : "bg-slate-400 text-white dark:bg-slate-600 dark:text-slate-300") : "bg-cyan-500 text-white dark:bg-cyan-400 dark:text-slate-900"}`}
                                    >
                                      {team1Name}
                                    </div>
                                  )}
                                  {team2Choice === o && (
                                    <div
                                      className={`absolute -bottom-3 -left-2 lg:-bottom-5 lg:-left-4 px-2 lg:px-4 py-1 lg:py-2 rounded-lg lg:rounded-xl text-[10px] lg:text-xs font-black shadow-xl transition-all duration-500 ${showResult ? (o === selectedCountry.activeQuestion.a ? "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-slate-900" : "bg-slate-400 text-white dark:bg-slate-600 dark:text-slate-300") : "bg-rose-500 text-white dark:bg-rose-400 dark:text-slate-900"}`}
                                    >
                                      {team2Name}
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          )}
                        </div>
                      )}

                    {showResult &&
                      selectedCountry.activeQuestion.options &&
                      selectedCountry.activeQuestion.options.length > 0 && (
                        <div className="mt-4 lg:mt-8 p-6 lg:p-10 bg-white/80 dark:bg-slate-950/80 rounded-3xl lg:rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-xl dark:shadow-2xl animate-in zoom-in-95 w-full max-w-4xl backdrop-blur-md">
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
                              return (
                                <>
                                  <h3 className="text-3xl lg:text-5xl font-black text-emerald-500 dark:text-emerald-400 mb-4 lg:mb-6 drop-shadow-md dark:drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">
                                    إجابة صحيحة! 🎉
                                  </h3>
                                  <p className="text-xl lg:text-3xl font-bold text-slate-700 dark:text-slate-200 mb-4 lg:mb-6">
                                    تم استحلال الدولة لـ{" "}
                                    <span className="text-slate-900 dark:text-white font-black">
                                      {winner === 1 ? team1Name : team2Name}
                                    </span>
                                  </p>

                                  {selectedCountry.id === capitals.team1 ||
                                  selectedCountry.id === capitals.team2 ? (
                                    <div className="inline-flex items-center gap-3 lg:gap-4 bg-amber-50 dark:bg-amber-500/10 px-4 py-2 lg:px-8 lg:py-4 rounded-2xl lg:rounded-3xl border border-amber-200 dark:border-amber-500/30">
                                      <p className="text-lg lg:text-4xl font-black text-amber-600 dark:text-amber-400">
                                        مكافأة العاصمة: ثلث نقاط الخصم
                                      </p>
                                      <Coins className="text-yellow-500 dark:text-yellow-400 w-8 h-8 lg:w-10 lg:h-10 drop-shadow-sm dark:drop-shadow-md shrink-0" />
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-3 lg:gap-4 bg-amber-50 dark:bg-amber-500/10 px-4 py-2 lg:px-8 lg:py-4 rounded-2xl lg:rounded-3xl border border-amber-200 dark:border-amber-500/30">
                                      <p className="text-xl lg:text-4xl font-black text-amber-600 dark:text-amber-400">
                                        المكافأة: {selectedCountry.value}
                                      </p>
                                      <Coins className="text-yellow-500 dark:text-yellow-400 w-8 h-8 lg:w-10 lg:h-10 drop-shadow-sm dark:drop-shadow-md shrink-0" />
                                    </div>
                                  )}
                                </>
                              );
                            } else {
                              return (
                                <>
                                  <h3 className="text-3xl lg:text-5xl font-black text-rose-600 dark:text-rose-500 mb-4 lg:mb-6 drop-shadow-md dark:drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]">
                                    إجابة خاطئة! ❌
                                  </h3>
                                  <p className="text-lg lg:text-3xl font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50 px-6 py-3 lg:px-8 lg:py-4 rounded-2xl lg:rounded-3xl inline-block">
                                    لم يتمكن أحد من استحلال الدولة
                                  </p>
                                </>
                              );
                            }
                          })()}
                        </div>
                      )}

                    {!showResult && (
                      <div className="text-[6rem] md:text-[10rem] lg:text-[12rem] leading-none font-black font-mono text-amber-500 dark:text-amber-400 drop-shadow-lg dark:drop-shadow-[0_0_40px_rgba(245,158,11,0.4)] mt-2 lg:mt-4">
                        {timer}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* التقسيم الشبكي الرئيسي للواجهة
        - الجوال: الخريطة فوق (نص الشاشة)، تحتها الفريقين جنب بعض
        - الديسكتوب: الفريق 1 يسار، الخريطة وسط، الفريق 2 يمين
      */}
      <div
        className={`grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 flex-1 min-h-0 transition-all duration-700 ${isQuestionActive ? "blur-sm opacity-40 scale-95 pointer-events-none" : ""}`}
      >
        {/* الخريطة המيدانية (تتصدر في الجوال، وبالوسط في الديسكتوب) */}
        <div className="col-span-2 lg:col-span-2 order-1 lg:order-2 w-full h-[45vh] lg:h-auto bg-blue-50/50 dark:bg-[#1e293b] rounded-[2rem] lg:rounded-[3rem] border-4 border-slate-200 dark:border-slate-800 overflow-hidden relative shadow-lg dark:shadow-2xl flex items-center justify-center transition-colors duration-700">
          {(gameState === "setupCapitals" ||
            gameState === "setupMap" ||
            gameState === "setupChallenges") && (
            <div className="absolute top-4 lg:top-6 left-1/2 -translate-x-1/2 z-10 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl px-4 py-2 lg:px-8 lg:py-3 rounded-full border-2 border-amber-400 dark:border-amber-500/40 flex items-center gap-2 lg:gap-3 shadow-lg transition-colors whitespace-nowrap">
              <Star className="text-amber-500 w-4 h-4 lg:w-6 lg:h-6 animate-pulse shrink-0" />
              <h2 className="text-sm lg:text-xl font-black text-slate-900 dark:text-white">
                جاري التجهيز...
              </h2>
              <span className="bg-amber-500 text-white dark:text-slate-950 px-2 py-0.5 lg:px-3 lg:py-1 rounded-lg lg:rounded-xl text-[10px] lg:text-sm font-black hidden sm:inline-block">
                {mapPosition.name}
              </span>
            </div>
          )}

          <ComposableMap
            projectionConfig={{ scale: 160 }}
            className="w-full h-full object-cover"
          >
            <ZoomableGroup center={mapPosition.center} zoom={mapPosition.zoom}>
              <Geographies geography={geoUrl}>
                {({ geographies }: { geographies: any[] }) => (
                  <>
                    {geographies.map((geo: any) => {
                      const country = countries?.find(
                        (c: any) => c.geoId === geo.id,
                      );
                      let fillColor = isDark ? "#0f172a" : "#e2e8f0";
                      let strokeColor = isDark ? "#020617" : "#cbd5e1";
                      let strokeWidth = 1.5;

                      if (country && country.isActive !== false) {
                        if (country.owner === 1) {
                          fillColor = isDark ? "#0891b2" : "#06b6d4";
                          strokeColor = isDark ? "#06b6d4" : "#0891b2";
                        } else if (country.owner === 2) {
                          fillColor = isDark ? "#e11d48" : "#f43f5e";
                          strokeColor = isDark ? "#f43f5e" : "#e11d48";
                        } else if (country.isChallenge) {
                          fillColor = isDark ? "#7e22ce" : "#a855f7";
                          strokeColor = isDark ? "#a855f7" : "#7e22ce";
                        } else {
                          fillColor = isDark ? "#ca8a04" : "#facc15";
                          strokeColor = isDark ? "#facc15" : "#ca8a04";
                        }
                        strokeWidth = country.owner !== null ? 2 : 1.5;
                      }

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          style={{
                            default: {
                              fill: fillColor,
                              outline: "none",
                              stroke: strokeColor,
                              strokeWidth: strokeWidth,
                              transition: "all 0.3s ease",
                            },
                          }}
                        />
                      );
                    })}
                    {geographies.map((geo: any) => {
                      const country = countries?.find(
                        (c: any) => c.geoId === geo.id,
                      );
                      if (!country || country.isActive === false) return null;
                      const centroid = geoCentroid(geo);
                      if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1]))
                        return null;

                      const isProtected = protectedCountries[country.id];
                      const isCapital =
                        country.id === capitals.team1 ||
                        country.id === capitals.team2;

                      let countryName = country.name;
                      if (isCapital) {
                        countryName += " 👑";
                      }

                      let countryDetails = "";

                      if (country.owner !== null) {
                        if (isCapital) {
                          if (isProtected) countryDetails += "🛡️";
                        } else {
                          countryDetails = `${country.value}`;
                          if (isProtected) countryDetails += " 🛡️";
                          if (country.isStolen) countryDetails += " ⚔️";
                        }
                      }

                      return (
                        <Marker key={`l-${geo.rsmKey}`} coordinates={centroid}>
                          {isProtected && (
                            <g transform="translate(0, -16)">
                              <circle
                                r="8"
                                fill="#10b981"
                                stroke={isDark ? "#064e3b" : "#fff"}
                                strokeWidth="1.5"
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
                          {country.isStolen && (
                            <g transform="translate(0, -18)">
                              <Swords
                                width="18"
                                height="18"
                                x="-9"
                                y="-9"
                                color={isDark ? "black" : "#475569"}
                                strokeWidth="3"
                              />
                            </g>
                          )}
                          <text
                            textAnchor="middle"
                            y={0}
                            fill={
                              country.owner
                                ? "#ffffff"
                                : isDark
                                  ? "#cbd5e1"
                                  : "#475569"
                            }
                            style={{
                              fontFamily: "Cairo",
                              fontSize: "8px",
                              fontWeight: "900",
                              pointerEvents: "none",
                              textShadow: country.owner
                                ? isDark
                                  ? "0 2px 4px rgba(0,0,0,0.8)"
                                  : "0 1px 3px rgba(0,0,0,0.4)"
                                : isDark
                                  ? "0 1px 2px rgba(0,0,0,0.9)"
                                  : "none",
                            }}
                          >
                            <tspan x="0" dy="0">
                              {countryName}
                            </tspan>
                            {countryDetails && (
                              <tspan x="0" dy="10" style={{ fontSize: "7px" }}>
                                {countryDetails}
                              </tspan>
                            )}
                          </text>
                        </Marker>
                      );
                    })}
                  </>
                )}
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        </div>

        {/* صندوق الفريق الأول */}
        <div
          className={`col-span-1 lg:col-span-1 order-2 lg:order-1 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl lg:rounded-[2.5rem] border-2 flex flex-col p-4 lg:p-6 shadow-xl dark:shadow-2xl transition-colors ${turn === 1 ? "border-cyan-400 dark:border-cyan-500/50 ring-4 ring-cyan-400/20 dark:ring-cyan-500/10" : "border-slate-200 dark:border-slate-800"}`}
        >
          <div className="flex flex-col items-center mb-4 lg:mb-6 pb-4 lg:pb-6 border-b border-slate-200 dark:border-slate-700/50">
            <h2 className="text-xl lg:text-4xl font-black text-cyan-600 dark:text-cyan-400 mb-2 lg:mb-3 drop-shadow-sm text-center leading-snug truncate w-full">
              {team1Name}
            </h2>
            <div className="text-3xl lg:text-6xl font-black text-slate-900 dark:text-white flex items-center gap-2 lg:gap-3 drop-shadow-md">
              {score1}{" "}
              <Coins className="w-6 h-6 lg:w-10 lg:h-10 text-yellow-500 dark:text-yellow-400 shrink-0" />
            </div>

            {/* البطاقات */}
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-2 mt-4 text-[9px] lg:text-[11px] font-black tracking-wide w-full">
              <span className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-950/60 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                <TankIcon size={12} className="lg:w-[14px] lg:h-[14px]" />{" "}
                <span className="hidden sm:inline">استحلال:</span>{" "}
                {cards1.capture}
              </span>
              <span className="flex items-center justify-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400">
                <Shield size={12} className="lg:w-[14px] lg:h-[14px]" />{" "}
                <span className="hidden sm:inline">حماية:</span>{" "}
                {cards1.protect}
              </span>
              <span className="flex items-center justify-center gap-1.5 bg-orange-50 dark:bg-orange-950/30 py-1.5 rounded-lg border border-orange-300 dark:border-orange-800/50 text-orange-700 dark:text-orange-400">
                <Rocket size={12} className="lg:w-[14px] lg:h-[14px]" />{" "}
                <span className="hidden sm:inline">قصف:</span>{" "}
                {cards1.airStrike}
              </span>
              <span className="flex items-center justify-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800/50 text-amber-700 dark:text-amber-400">
                <Crown size={12} className="lg:w-[14px] lg:h-[14px]" />{" "}
                <span className="hidden sm:inline">غزو:</span>{" "}
                {cards1.capitalCapture}
              </span>
            </div>
          </div>

          <h3 className="text-xs lg:text-sm font-black text-slate-500 dark:text-slate-400 mb-2 px-1 flex items-center justify-between">
            الدول المستحلة
            <span className="bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400 px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-md text-[10px] lg:text-xs">
              {team1Countries.length}
            </span>
          </h3>
          <div
            className={`flex-1 overflow-y-auto ${modernScrollbar} min-h-[100px]`}
          >
            {team1Countries.length === 0 ? (
              <p className="text-slate-400 dark:text-slate-600 text-[10px] lg:text-sm font-bold text-center mt-4 lg:mt-10">
                لم يتم استحلال أي دولة
              </p>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 pr-1 lg:pr-2">
                {team1Countries.map((c: any) => (
                  <div
                    key={c.id}
                    className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-2 lg:p-3 rounded-lg lg:rounded-xl flex flex-col items-center justify-center text-center shadow-sm gap-1 lg:gap-2 transition-colors"
                  >
                    <span className="font-black text-[10px] lg:text-xs text-slate-800 dark:text-slate-200 truncate w-full">
                      {c.name}
                    </span>
                    <div className="flex items-center justify-center gap-1 flex-wrap mt-0.5">
                      {c.id === capitals.team1 ? (
                        <span className="text-amber-500 dark:text-amber-400 font-black text-[9px] lg:text-[10px]">
                          العاصمة 👑
                        </span>
                      ) : (
                        <>
                          {protectedCountries[c.id] && (
                            <Shield
                              size={10}
                              className="text-emerald-500 dark:text-emerald-400 lg:w-3 lg:h-3"
                            />
                          )}
                          <span className="text-yellow-600 dark:text-yellow-400 font-black text-[9px] lg:text-[10px]">
                            {c.value} 💰 {c.isStolen && "⚔️"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* صندوق الفريق الثاني */}
        <div
          className={`col-span-1 lg:col-span-1 order-3 lg:order-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl lg:rounded-[2.5rem] border-2 flex flex-col p-4 lg:p-6 shadow-xl dark:shadow-2xl transition-colors ${turn === 2 ? "border-rose-400 dark:border-rose-500/50 ring-4 ring-rose-400/20 dark:ring-rose-500/10" : "border-slate-200 dark:border-slate-800"}`}
        >
          <div className="flex flex-col items-center mb-4 lg:mb-6 pb-4 lg:pb-6 border-b border-slate-200 dark:border-slate-700/50">
            <h2 className="text-xl lg:text-4xl font-black text-rose-600 dark:text-rose-400 mb-2 lg:mb-3 drop-shadow-sm text-center leading-snug truncate w-full">
              {team2Name}
            </h2>
            <div className="text-3xl lg:text-6xl font-black text-slate-900 dark:text-white flex items-center gap-2 lg:gap-3 drop-shadow-md">
              {score2}{" "}
              <Coins className="w-6 h-6 lg:w-10 lg:h-10 text-yellow-500 dark:text-yellow-400 shrink-0" />
            </div>

            {/* البطاقات */}
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-2 mt-4 text-[9px] lg:text-[11px] font-black tracking-wide w-full">
              <span className="flex items-center justify-center gap-1.5 bg-orange-50 dark:bg-orange-950/30 py-1.5 rounded-lg border border-orange-300 dark:border-orange-800/50 text-orange-700 dark:text-orange-400">
                <Rocket size={12} className="lg:w-[14px] lg:h-[14px]" />{" "}
                <span className="hidden sm:inline">قصف:</span>{" "}
                {cards2.airStrike}
              </span>
              <span className="flex items-center justify-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400">
                <Shield size={12} className="lg:w-[14px] lg:h-[14px]" />{" "}
                <span className="hidden sm:inline">حماية:</span>{" "}
                {cards2.protect}
              </span>
              <span className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-950/60 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                <TankIcon size={12} className="lg:w-[14px] lg:h-[14px]" />{" "}
                <span className="hidden sm:inline">استحلال:</span>{" "}
                {cards2.capture}
              </span>
              <span className="flex items-center justify-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800/50 text-amber-700 dark:text-amber-400">
                <Crown size={12} className="lg:w-[14px] lg:h-[14px]" />{" "}
                <span className="hidden sm:inline">غزو:</span>{" "}
                {cards2.capitalCapture}
              </span>
            </div>
          </div>

          <h3 className="text-xs lg:text-sm font-black text-slate-500 dark:text-slate-400 mb-2 px-1 flex items-center justify-between">
            الدول المستحلة
            <span className="bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-md text-[10px] lg:text-xs">
              {team2Countries.length}
            </span>
          </h3>
          <div
            className={`flex-1 overflow-y-auto ${modernScrollbar} min-h-[100px]`}
          >
            {team2Countries.length === 0 ? (
              <p className="text-slate-400 dark:text-slate-600 text-[10px] lg:text-sm font-bold text-center mt-4 lg:mt-10">
                لم يتم استحلال أي دولة
              </p>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 pr-1 lg:pr-2">
                {team2Countries.map((c: any) => (
                  <div
                    key={c.id}
                    className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-2 lg:p-3 rounded-lg lg:rounded-xl flex flex-col items-center justify-center text-center shadow-sm gap-1 lg:gap-2 transition-colors"
                  >
                    <span className="font-black text-[10px] lg:text-xs text-slate-800 dark:text-slate-200 truncate w-full">
                      {c.name}
                    </span>
                    <div className="flex items-center justify-center gap-1 flex-wrap mt-0.5">
                      {c.id === capitals.team2 ? (
                        <span className="text-amber-500 dark:text-amber-400 font-black text-[9px] lg:text-[10px]">
                          العاصمة 👑
                        </span>
                      ) : (
                        <>
                          {protectedCountries[c.id] && (
                            <Shield
                              size={10}
                              className="text-emerald-500 dark:text-emerald-400 lg:w-3 lg:h-3"
                            />
                          )}
                          <span className="text-yellow-600 dark:text-yellow-400 font-black text-[9px] lg:text-[10px]">
                            {c.value} 💰 {c.isStolen && "⚔️"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* بنك الأهداف أسفل الشاشة */}
      <div
        className={`w-full max-h-[25vh] lg:max-h-[30vh] bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-[2rem] lg:rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-800 p-4 lg:p-6 flex flex-col shadow-xl dark:shadow-2xl transition-all duration-700 ${isQuestionActive ? "blur-sm opacity-40 scale-95 pointer-events-none" : ""}`}
      >
        <div className="flex items-center justify-between mb-3 lg:mb-4 px-2 shrink-0 border-b border-slate-200 dark:border-slate-800/50 pb-2 lg:pb-4">
          <h3 className="text-sm lg:text-xl font-black text-slate-800 dark:text-slate-300 flex items-center gap-2">
            <Globe className="text-blue-600 dark:text-blue-500 w-5 h-5 lg:w-6 lg:h-6" />{" "}
            بنك الأهداف
          </h3>
          <span className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 px-3 py-1 lg:px-4 lg:py-1.5 rounded-lg lg:rounded-xl text-xs lg:text-sm font-black border border-slate-300 dark:border-slate-800">
            المتبقي: {countriesLeft}
          </span>
        </div>
        <div
          className={`flex-1 overflow-y-auto pr-1 lg:pr-2 ${modernScrollbar}`}
        >
          <div className="flex flex-wrap gap-2 lg:gap-3">
            {freeCountries.length === 0 ? (
              <p className="text-slate-500 font-bold w-full text-center py-4 lg:py-6 text-sm lg:text-lg">
                لا توجد دول حرة متاحة.
              </p>
            ) : (
              freeCountries.map((c: any) => (
                <div
                  key={c.id}
                  className={`px-3 py-1.5 lg:px-5 lg:py-2.5 rounded-full border-2 flex items-center gap-1.5 lg:gap-2 shadow-sm transition-colors ${c.isChallenge ? "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/40 dark:border-purple-500/40 dark:text-purple-300" : "bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"}`}
                >
                  <span className="font-black text-[10px] lg:text-sm">
                    {c.name}
                  </span>
                  {c.isChallenge && (
                    <HelpCircle className="ml-0.5 lg:ml-1 w-3 h-3 lg:w-4 lg:h-4 opacity-70" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
