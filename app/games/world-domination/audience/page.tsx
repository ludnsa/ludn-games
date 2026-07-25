"use client";
import React, { useState, useEffect } from "react";
import { Cairo } from "next/font/google";
import { Globe, Coins, Shield, Rocket, HelpCircle, Moon, Sun, Crosshair, Crown, Radiation } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

import AudienceCapitalAlert from "@/components/games/world-domination/audience/AudienceCapitalAlert";
import AudienceGameOver from "@/components/games/world-domination/audience/AudienceGameOver";
import AudienceQuestionModal from "@/components/games/world-domination/audience/AudienceQuestionModal";
import AudienceMap from "@/components/games/world-domination/audience/AudienceMap";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

const TankIcon = ({ className, size = 24 }: { className?: string; size?: number; }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 11V9a2 2 0 0 1 2-2h4" />
    <path d="M14 7h6" />
    <rect x="2" y="13" width="20" height="6" rx="3" />
    <path d="M5 13v-1.5a1.5 1.5 0 0 1 1.5-1.5h11a1.5 1.5 0 0 1 1.5 1.5V13" />
    <circle cx="6" cy="16" r="1" />
    <circle cx="12" cy="16" r="1" />
    <circle cx="18" cy="16" r="1" />
  </svg>
);

const modernScrollbar = "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

export default function WorldDominationAudience() {
  const supabase = getSupabaseBrowser();

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

    const mapColumnsToLiveData = (dbRow: any) => {
      if (!dbRow) return null;
      
      const foundCountry = dbRow.countries?.find(
        (c: any) => c.id === dbRow.current_country_id || c.code === dbRow.current_country_id
      ) || {};

      return {
        gameState: dbRow.game_state,
        team1Name: dbRow.team1_name,
        team2Name: dbRow.team2_name,
        score1: dbRow.score1,
        score2: dbRow.score2,
        turn: dbRow.turn,
        timer: dbRow.timer,
        selectedCountry: dbRow.current_country_id ? {
          ...foundCountry,
          activeQuestion: dbRow.active_question
        } : null,
        team1Choice: dbRow.team1_choice,
        team2Choice: dbRow.team2_choice,
        showResult: dbRow.show_result,
        isAttacking: dbRow.is_attacking,
        isQuestionRevealed: dbRow.is_question_revealed,
        cards1: dbRow.cards1,
        cards2: dbRow.cards2,
        protectedCountries: dbRow.protected_countries || {},
        spiedCountryId: dbRow.spied_country_id || null,
        challengesUsed1: dbRow.challenges_used1,
        challengesUsed2: dbRow.challenges_used2,
        mapPosition: dbRow.map_position,
        capitals: dbRow.capitals || { team1: null, team2: null },
        stolenCapitalAlert: dbRow.stolen_capital_alert,
        countries: dbRow.countries || []
      };
    };

    const fetchInitialData = async () => {
      const { data, error } = await supabase
        .from("wd_rooms")
        .select("*")
        .eq("room_code", roomCode)
        .single();
      
      if (data && !error) {
        setLiveData(mapColumnsToLiveData(data));
      }
    };
    
    fetchInitialData();

    const channel = supabase
      .channel(`wd_live_sync_channel_${roomCode}`)
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
          if (newData) {
            setLiveData(mapColumnsToLiveData(newData));
          }
        }
      )
      .on(
        'broadcast',
        { event: 'timer_update' },
        (payload) => {
          setLiveData((prev: any) => prev ? { ...prev, timer: payload.payload.timer } : null);
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
    gameState, team1Name, team2Name, score1, score2, turn, countries,
    selectedCountry, timer, team1Choice, team2Choice, showResult,
    isAttacking, isQuestionRevealed = false, capitals = { team1: null, team2: null },
    stolenCapitalAlert = null, protectedCountries = {}, spiedCountryId = null,
    mapPosition = { center: [0, 0], zoom: 1, name: "العالم" },
  } = liveData;

  const cards1 = {
    capture: liveData.cards1?.capture ?? 3, protect: liveData.cards1?.protect ?? 5,
    airStrike: liveData.cards1?.airStrike ?? 3, capitalCapture: liveData.cards1?.capitalCapture ?? 2,
    spy: liveData.cards1?.spy ?? 0,
    nuke: liveData.cards1?.nuke ?? 1,
  };

  const cards2 = {
    capture: liveData.cards2?.capture ?? 3, protect: liveData.cards2?.protect ?? 5,
    airStrike: liveData.cards2?.airStrike ?? 3, capitalCapture: liveData.cards2?.capitalCapture ?? 2,
    spy: liveData.cards2?.spy ?? 0,
    nuke: liveData.cards2?.nuke ?? 1,
  };

  const isDraw = score1 === score2;
  const winnerName = score1 > score2 ? team1Name : team2Name;
  const winnerScore = score1 > score2 ? score1 : score2;
  const winnerColor = score1 > score2 ? "text-cyan-600 dark:text-cyan-400" : "text-rose-600 dark:text-rose-400";

  const team1Countries = countries?.filter((c: any) => c.owner === 1) || [];
  const team2Countries = countries?.filter((c: any) => c.owner === 2) || [];
  const freeCountries = countries?.filter(
      (c: any) => c.owner === null && c.isActive !== false && c.id !== capitals.team1 && c.id !== capitals.team2,
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
        {isDark ? <Sun size={20} className="lg:w-6 lg:h-6" /> : <Moon size={20} className="lg:w-6 lg:h-6" />}
      </button>

      <AudienceCapitalAlert stolenCapitalAlert={stolenCapitalAlert} team1Name={team1Name} team2Name={team2Name} />
      
      <AudienceGameOver gameState={gameState} isDraw={isDraw} score1={score1} score2={score2} team1Name={team1Name} team2Name={team2Name} winnerName={winnerName} winnerScore={winnerScore} winnerColor={winnerColor} />
      
      <AudienceQuestionModal isQuestionActive={isQuestionActive} selectedCountry={selectedCountry} capitals={capitals} isAttacking={isAttacking} team1Name={team1Name} team2Name={team2Name} isQuestionRevealed={isQuestionRevealed} showResult={showResult} team1Choice={team1Choice} team2Choice={team2Choice} turn={turn} timer={timer} />

      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 flex-1 min-h-0 transition-all duration-700 ${isQuestionActive ? "blur-sm opacity-40 scale-95 pointer-events-none" : ""}`}>
        
        <AudienceMap gameState={gameState} mapPosition={mapPosition} countries={countries} spiedCountryId={spiedCountryId} isDark={isDark} protectedCountries={protectedCountries} capitals={capitals} />

        {/* صندوق الفريق الأول */}
        <div
          className={`col-span-2 lg:col-span-1 order-1 lg:order-1 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl lg:rounded-[2.5rem] border-2 flex flex-col p-4 lg:p-6 shadow-xl dark:shadow-2xl transition-colors ${turn === 1 ? "border-cyan-400 dark:border-cyan-500/50 ring-4 ring-cyan-400/20 dark:ring-cyan-500/10" : "border-slate-200 dark:border-slate-800"}`}
        >
          <div className="flex flex-col items-center mb-4 lg:mb-6 pb-4 lg:pb-6 border-b border-slate-200 dark:border-slate-700/50">
            <h2 className="text-xl lg:text-4xl font-black text-cyan-600 dark:text-cyan-400 mb-2 lg:mb-3 drop-shadow-sm text-center leading-snug truncate w-full">
              {team1Name}
            </h2>
            <div className="text-3xl lg:text-6xl font-black text-slate-900 dark:text-white flex items-center gap-2 lg:gap-3 drop-shadow-md">
              {score1}{" "}
              <Coins className="w-6 h-6 lg:w-10 lg:h-10 text-yellow-500 dark:text-yellow-400 shrink-0" />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 w-full">
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors">
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <TankIcon size={16} className="lg:w-[18px] lg:h-[18px]" />
                  <span className="font-bold text-xs lg:text-sm">احتلال</span>
                </div>
                <span className="font-black text-sm lg:text-base">{cards1.capture}</span>
              </div>
              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 transition-colors">
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <Shield size={16} className="lg:w-[18px] lg:h-[18px]" />
                  <span className="font-bold text-xs lg:text-sm">حماية</span>
                </div>
                <span className="font-black text-sm lg:text-base">{cards1.protect}</span>
              </div>
              <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-950/30 px-3 py-2 rounded-xl border border-orange-300 dark:border-orange-800/50 text-orange-700 dark:text-orange-400 transition-colors">
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <Rocket size={16} className="lg:w-[18px] lg:h-[18px]" />
                  <span className="font-bold text-xs lg:text-sm">قصف</span>
                </div>
                <span className="font-black text-sm lg:text-base">{cards1.airStrike}</span>
              </div>
              <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800/50 text-amber-700 dark:text-amber-400 transition-colors">
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <Crown size={16} className="lg:w-[18px] lg:h-[18px]" />
                  <span className="font-bold text-[10px] lg:text-sm">غزو العاصمة</span>
                </div>
                <span className="font-black text-sm lg:text-base">{cards1.capitalCapture}</span>
              </div>
              <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/30 px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-400 transition-colors">
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <Crosshair size={16} className="lg:w-[18px] lg:h-[18px]" />
                  <span className="font-bold text-xs lg:text-sm">تجسس</span>
                </div>
                <span className="font-black text-sm lg:text-base">{cards1.spy}</span>
              </div>
              <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-xl border border-red-300 dark:border-red-800/50 text-red-700 dark:text-red-400 transition-colors">
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <Radiation size={16} className="lg:w-[18px] lg:h-[18px]" />
                  <span className="font-bold text-xs lg:text-sm">نووي</span>
                </div>
                <span className="font-black text-sm lg:text-base">{cards1.nuke}</span>
              </div>
            </div>
          </div>

          <h3 className="text-xs lg:text-sm font-black text-slate-500 dark:text-slate-400 mb-2 px-1 flex items-center justify-between">
            الدول المستحلة
            <span className="bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400 px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-md text-[10px] lg:text-xs">
              {team1Countries.length}
            </span>
          </h3>
          <div className={`flex-1 overflow-y-auto ${modernScrollbar} min-h-[100px]`}>
            {team1Countries.length === 0 ? (
              <p className="text-slate-400 dark:text-slate-600 text-[10px] lg:text-sm font-bold text-center mt-4 lg:mt-10">
                لم يتم استحلال أي دولة
              </p>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 pr-1 lg:pr-2">
                {team1Countries.map((c: any) => (
                  <div key={c.id} className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-1.5 lg:p-2 rounded-lg flex items-center justify-between shadow-sm gap-1 transition-colors">
                    <span className="font-black text-[9px] lg:text-[10px] text-slate-800 dark:text-slate-200 truncate max-w-[60%]">
                      {c.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {c.id === capitals.team1 ? (
                        <span className="text-amber-500 dark:text-amber-400 font-black text-[8px] lg:text-[9px]">العاصمة 👑</span>
                      ) : (
                        <>
                          {protectedCountries[c.id] && <Shield size={8} className="text-emerald-500 dark:text-emerald-400" />}
                          <span className="text-yellow-600 dark:text-yellow-400 font-black text-[8px] lg:text-[9px]">
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
          className={`col-span-2 lg:col-span-1 order-3 lg:order-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl lg:rounded-[2.5rem] border-2 flex flex-col p-4 lg:p-6 shadow-xl dark:shadow-2xl transition-colors ${turn === 2 ? "border-rose-400 dark:border-rose-500/50 ring-4 ring-rose-400/20 dark:ring-rose-500/10" : "border-slate-200 dark:border-slate-800"}`}
        >
          <div className="flex flex-col items-center mb-4 lg:mb-6 pb-4 lg:pb-6 border-b border-slate-200 dark:border-slate-700/50">
            <h2 className="text-xl lg:text-4xl font-black text-rose-600 dark:text-rose-400 mb-2 lg:mb-3 drop-shadow-sm text-center leading-snug truncate w-full">
              {team2Name}
            </h2>
            <div className="text-3xl lg:text-6xl font-black text-slate-900 dark:text-white flex items-center gap-2 lg:gap-3 drop-shadow-md">
              {score2}{" "}
              <Coins className="w-6 h-6 lg:w-10 lg:h-10 text-yellow-500 dark:text-yellow-400 shrink-0" />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 w-full">
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors">
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <TankIcon size={16} className="lg:w-[18px] lg:h-[18px]" />
                  <span className="font-bold text-xs lg:text-sm">احتلال</span>
                </div>
                <span className="font-black text-sm lg:text-base">{cards2.capture}</span>
              </div>
              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 transition-colors">
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <Shield size={16} className="lg:w-[18px] lg:h-[18px]" />
                  <span className="font-bold text-xs lg:text-sm">حماية</span>
                </div>
                <span className="font-black text-sm lg:text-base">{cards2.protect}</span>
              </div>
              <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-950/30 px-3 py-2 rounded-xl border border-orange-300 dark:border-orange-800/50 text-orange-700 dark:text-orange-400 transition-colors">
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <Rocket size={16} className="lg:w-[18px] lg:h-[18px]" />
                  <span className="font-bold text-xs lg:text-sm">قصف</span>
                </div>
                <span className="font-black text-sm lg:text-base">{cards2.airStrike}</span>
              </div>
              <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800/50 text-amber-700 dark:text-amber-400 transition-colors">
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <Crown size={16} className="lg:w-[18px] lg:h-[18px]" />
                  <span className="font-bold text-[10px] lg:text-sm">غزو العاصمة</span>
                </div>
                <span className="font-black text-sm lg:text-base">{cards2.capitalCapture}</span>
              </div>
              <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/30 px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-400 transition-colors">
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <Crosshair size={16} className="lg:w-[18px] lg:h-[18px]" />
                  <span className="font-bold text-xs lg:text-sm">تجسس</span>
                </div>
                <span className="font-black text-sm lg:text-base">{cards2.spy}</span>
              </div>
              <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-xl border border-red-300 dark:border-red-800/50 text-red-700 dark:text-red-400 transition-colors">
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <Radiation size={16} className="lg:w-[18px] lg:h-[18px]" />
                  <span className="font-bold text-xs lg:text-sm">نووي</span>
                </div>
                <span className="font-black text-sm lg:text-base">{cards2.nuke}</span>
              </div>
            </div>
          </div>

          <h3 className="text-xs lg:text-sm font-black text-slate-500 dark:text-slate-400 mb-2 px-1 flex items-center justify-between">
            الدول المستحلة
            <span className="bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-md text-[10px] lg:text-xs">
              {team2Countries.length}
            </span>
          </h3>
          <div className={`flex-1 overflow-y-auto ${modernScrollbar} min-h-[100px]`}>
            {team2Countries.length === 0 ? (
              <p className="text-slate-400 dark:text-slate-600 text-[10px] lg:text-sm font-bold text-center mt-4 lg:mt-10">
                لم يتم استحلال أي دولة
              </p>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 pr-1 lg:pr-2">
                {team2Countries.map((c: any) => (
                  <div key={c.id} className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-1.5 lg:p-2 rounded-lg flex items-center justify-between shadow-sm gap-1 transition-colors">
                    <span className="font-black text-[9px] lg:text-[10px] text-slate-800 dark:text-slate-200 truncate max-w-[60%]">
                      {c.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {c.id === capitals.team2 ? (
                        <span className="text-amber-500 dark:text-amber-400 font-black text-[8px] lg:text-[9px]">العاصمة 👑</span>
                      ) : (
                        <>
                          {protectedCountries[c.id] && <Shield size={8} className="text-emerald-500 dark:text-emerald-400" />}
                          <span className="text-yellow-600 dark:text-yellow-400 font-black text-[8px] lg:text-[9px]">
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

      <div className={`w-full max-h-[25vh] lg:max-h-[30vh] bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-[2rem] lg:rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-800 p-4 lg:p-6 flex flex-col shadow-xl dark:shadow-2xl transition-all duration-700 ${isQuestionActive ? "blur-sm opacity-40 scale-95 pointer-events-none" : ""}`}>
        <div className="flex items-center justify-between mb-3 lg:mb-4 px-2 shrink-0 border-b border-slate-200 dark:border-slate-800/50 pb-2 lg:pb-4">
          <h3 className="text-sm lg:text-xl font-black text-slate-800 dark:text-slate-300 flex items-center gap-2">
            <Globe className="text-blue-600 dark:text-blue-500 w-5 h-5 lg:w-6 lg:h-6" /> بنك الأهداف
          </h3>
          <span className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 px-3 py-1 lg:px-4 lg:py-1.5 rounded-lg lg:rounded-xl text-xs lg:text-sm font-black border border-slate-300 dark:border-slate-800">
            المتبقي: {countriesLeft}
          </span>
        </div>
        <div className={`flex-1 overflow-y-auto pr-1 lg:pr-2 ${modernScrollbar}`}>
          <div className="flex flex-wrap gap-2 lg:gap-3">
            {freeCountries.length === 0 ? (
              <p className="text-slate-500 font-bold w-full text-center py-4 lg:py-6 text-sm lg:text-lg">
                لا توجد دول حرة متاحة.
              </p>
            ) : (
              freeCountries.map((c: any) => (
                <div key={c.id} className={`px-3 py-1.5 lg:px-5 lg:py-2.5 rounded-full border-2 flex items-center gap-1.5 lg:gap-2 shadow-sm transition-colors ${c.isChallenge ? "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/40 dark:border-purple-500/40 dark:text-purple-300" : "bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"}`}>
                  <span className="font-black text-[10px] lg:text-sm">{c.name}</span>
                  {c.isChallenge && <HelpCircle className="ml-0.5 lg:ml-1 w-3 h-3 lg:w-4 lg:h-4 opacity-70" />}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}