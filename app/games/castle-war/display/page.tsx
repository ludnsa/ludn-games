/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Cairo } from "next/font/google";
import {
  Shield, Crown, Bomb, Swords, Crosshair, Skull, Eye, Flame, CheckCircle2, Lock,
} from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import AudienceBackground from "@/components/games/castle-war/display/AudienceBackground";
import AudienceCastle from "@/components/games/castle-war/display/AudienceCastle";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

export default function CastleWarDisplay() {
  const supabase = getSupabaseBrowser();
  const [liveData, setLiveData] = useState<any>(null);
  const [explosionRoomIdx, setExplosionRoomIdx] = useState<number | null>(null);
  const [explosionIsTeam1Target, setExplosionIsTeam1Target] = useState(false);
  const [targetRoomIdx, setTargetRoomIdx] = useState<number | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [hideResultModal, setHideResultModal] = useState(false);
  const [displayTimer, setDisplayTimer] = useState<number>(0);

  const lastTimestampRef = useRef<number | null>(null);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    document.documentElement.classList.add("dark");

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    setRoomCode(code);

    const handleSyncData = (parsed: any) => {
      if (!parsed) return;
      if (parsed.explosionRoomIndexHit !== undefined && parsed.timestamp !== lastTimestampRef.current) {
        const hitRoom = parsed.explosionRoomIndexHit;
        const isT1Target = parsed.attackingTeam === 2;

        setTargetRoomIdx(hitRoom);
        setExplosionIsTeam1Target(isT1Target);

        setTimeout(() => {
          setTargetRoomIdx(null);
          setExplosionRoomIdx(hitRoom);
          setTimeout(() => {
            setExplosionRoomIdx(null);
          }, 1000);
        }, 500);

        lastTimestampRef.current = parsed.timestamp;
      }
      setLiveData(parsed);
    };

    if (code) {
      const fetchInitial = async () => {
        const { data } = await supabase.from("cw_rooms").select("live_sync").eq("room_code", code).single();
        if (data && data.live_sync) handleSyncData(data.live_sync);
      };

      fetchInitial();

      const channel = supabase.channel(`display_room_${code}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "cw_rooms", filter: `room_code=eq.${code}` },
          (payload) => {
            if (payload.new && payload.new.live_sync) handleSyncData(payload.new.live_sync);
          }
        ).subscribe();

      return () => {
        supabase.removeChannel(channel);
        document.documentElement.classList.remove("dark");
      };
    } else {
      return () => { document.documentElement.classList.remove("dark"); };
    }
  }, []);

  useEffect(() => {
    if (liveData?.battleStep === "result" && liveData?.targetRoomIndex === null) {
       setHideResultModal(false);
       const timer = setTimeout(() => {
          setHideResultModal(true);
       }, 3000);
       return () => clearTimeout(timer);
    } else {
       setHideResultModal(false);
    }
  }, [liveData?.battleStep, liveData?.targetRoomIndex]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (liveData?.targetEndTime) {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.floor((liveData.targetEndTime - Date.now()) / 1000));
        setDisplayTimer(remaining);
      };
      updateTimer(); // Initial call
      intervalId = setInterval(updateTimer, 500);
    } else {
      setDisplayTimer(liveData?.genTimer || 0);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [liveData?.targetEndTime, liveData?.genTimer]);

  const getChallengeTitle = (type: string) => {
    switch (type) {
      case "30sec": return "ثلاثين ثانية";
      case "5sec": return "خمس ثواني";
      case "general": return "أسئلة عامة";
      case "team": return "تحدي الفريق";
      case "guess": return "توقع الرقم";
      default: return "";
    }
  };

  if (!liveData) {
    return (
      <div className={`h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white ${cairo.className}`} dir="rtl">

        <AudienceBackground />
        <div className="relative z-10 bg-slate-800 border-8 border-black p-16 rounded-[4rem] shadow-[16px_16px_0px_#000] flex flex-col items-center animate-in zoom-in-95">
          <Swords className="w-32 h-32 text-slate-500 animate-pulse mb-8" strokeWidth={2.5} />
          <h1 className="text-5xl md:text-6xl font-black text-slate-300 tracking-tight">
            {roomCode ? "جاري الاتصال بغرفة العمليات..." : "بانتظار بدء الحرب..."}
          </h1>
        </div>
      </div>
    );
  }

  return (
    <main className={`min-h-[100dvh] md:h-screen w-full relative bg-[#0f172a] ${cairo.className} overflow-y-auto md:overflow-hidden`} dir="rtl">


      <AudienceBackground />

      <div className="relative z-10 w-full min-h-screen md:h-full flex flex-col md:flex-row items-center justify-center md:justify-between px-4 md:px-16 gap-8 md:gap-10 pt-28 pb-12 md:py-0">
        <div className="w-full md:flex-1 flex flex-col justify-center items-center z-20 order-1 md:order-none">
          <div className="flex flex-col items-center mb-4 w-full max-w-[320px]">
            <div className="bg-cyan-500 border-4 border-black text-white font-black text-3xl md:text-4xl py-3 px-6 rounded-[2rem] shadow-[8px_8px_0px_#000] text-center flex items-center justify-center gap-3 w-full">
              {liveData.hp1} <span className="text-xl text-cyan-900 font-bold hidden xl:block">جندي</span>
            </div>
          </div>
          <AudienceCastle
            isTeam1Castle={true}
            liveData={liveData}
            explosionRoomIdx={explosionRoomIdx}
            explosionIsTeam1Target={explosionIsTeam1Target}
          />
        </div>

        <div className="w-full md:flex-1 flex flex-col justify-center items-center z-20 order-3 md:order-none">
          <div className="flex flex-col items-center mb-4 w-full max-w-[320px]">
            <div className="bg-rose-500 border-4 border-black text-white font-black text-3xl md:text-4xl py-3 px-6 rounded-[2rem] shadow-[8px_8px_0px_#000] text-center flex items-center justify-center gap-3 w-full">
              {liveData.hp2} <span className="text-xl text-rose-900 font-bold hidden xl:block">جندي</span>
            </div>
          </div>
          <AudienceCastle
            isTeam1Castle={false}
            liveData={liveData}
            explosionRoomIdx={explosionRoomIdx}
            explosionIsTeam1Target={explosionIsTeam1Target}
          />
        </div>

      {/* Popups Area (Middle on mobile, absolute center on desktop) */}
      <div className="relative md:absolute md:top-1/2 md:left-1/2 md:transform md:-translate-x-1/2 md:-translate-y-1/2 z-50 w-full max-w-2xl lg:max-w-4xl md:pointer-events-none flex flex-col items-center justify-center max-h-[90vh] order-2 md:order-none my-4 md:my-0 scale-[0.85] sm:scale-95 md:scale-100">
        {liveData.battleStep === "roll" && (() => {
          const allAvailableTypes = ["guess", "30sec", "5sec", "general", "team"];
          const usedT1 = liveData.usedChallengesT1 || [];
          const usedT2 = liveData.usedChallengesT2 || [];
          const currentTeamUsed = liveData.turn === 1 ? usedT1 : usedT2;
          const teamColorBg = liveData.turn === 1 ? "bg-cyan-500" : "bg-rose-500";
          const teamTextColor = liveData.turn === 1 ? "text-cyan-400" : "text-rose-400";
          const teamName = liveData.turn === 1 ? liveData.team1Name : liveData.team2Name;

          return (
            <div className="bg-slate-800 border-8 border-black rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-8 text-center shadow-[16px_16px_0px_#000] animate-in zoom-in duration-300 w-full max-w-4xl mx-auto overflow-hidden">
              <h3 className={`text-2xl md:text-3xl font-black mb-6 ${teamTextColor} drop-shadow-[2px_2px_0_#000]`}>
                بانتظار اختيار فريق ({teamName})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 w-full">
                {allAvailableTypes.map((cType) => {
                  const isUsed = currentTeamUsed.includes(cType);
                  return (
                    <div key={cType} className={`py-4 md:py-5 rounded-2xl md:rounded-3xl font-black text-lg md:text-xl border-4 md:border-8 transition-all flex items-center justify-center ${isUsed ? "bg-slate-900 text-slate-700 border-slate-950 opacity-40 shadow-inner" : `${teamColorBg} text-white border-black shadow-[4px_4px_0px_#000] md:shadow-[6px_6px_0px_#000] animate-pulse`}`}>
                      {getChallengeTitle(cType)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {liveData.battleStep === "challenge" && liveData.isChallengeRevealed && liveData.activeChallengeData && (
          <div className="bg-white border-8 border-black rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-8 text-center shadow-[16px_16px_0px_#000] animate-in zoom-in duration-300 pointer-events-auto w-full overflow-y-auto max-h-[85vh]">
            <h3 className="bg-slate-100 border-4 border-slate-200 text-slate-600 font-black mb-3 md:mb-4 uppercase tracking-widest text-base md:text-lg py-2 px-6 rounded-2xl inline-block">
              {liveData.activeChallengeName}
            </h3>

            <div className="animate-in fade-in duration-500">
                <p className="text-xl md:text-3xl font-black text-slate-900 leading-relaxed mb-4 md:mb-6">
                  {liveData.activeChallengeData.q || liveData.activeChallengeData}
                </p>

                {liveData.activeChallengeData.options && (
                  <div className="grid grid-cols-1 gap-2 md:gap-3 mb-4 md:mb-6">
                    {liveData.activeChallengeData.options.map((opt: string, i: number) => {
                      const isCorrect = liveData.showGenAnswer && opt === liveData.activeChallengeData.a;
                      const isWrongSelected = liveData.showGenAnswer && liveData.selectedOption && opt === liveData.selectedOption && opt !== liveData.activeChallengeData.a;
                      const isFaded = liveData.showGenAnswer && !isCorrect && !isWrongSelected;
                      return (
                        <div key={i} className={`border-4 rounded-xl md:rounded-2xl py-2 md:py-3 text-lg md:text-xl font-black shadow-[4px_4px_0px_#000] transition-colors ${
                          isCorrect ? "bg-emerald-400 border-black text-slate-900 scale-[1.02]" : 
                          isWrongSelected ? "bg-rose-500 border-black text-white" : 
                          isFaded ? "bg-slate-100 border-slate-300 text-slate-400 opacity-50" : 
                          "bg-slate-100 border-slate-900 text-slate-800"
                        }`}>
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                )}

                {!liveData.activeChallengeData.options && liveData.activeChallengeType === "general" && liveData.showGenAnswer && (
                  <div className="bg-emerald-100 border-4 border-emerald-400 text-emerald-800 font-black text-2xl md:text-3xl py-4 px-6 rounded-2xl mb-6 shadow-inner animate-in zoom-in">
                    {liveData.activeChallengeData.a}
                  </div>
                )}

                {(!liveData.showGenAnswer && displayTimer > 0) && (
                  <div className={`text-4xl md:text-6xl font-mono font-black py-3 md:py-4 rounded-[1.5rem] md:rounded-3xl border-8 shadow-inner transition-colors ${displayTimer <= 5 ? "bg-rose-100 text-rose-600 border-rose-500 animate-pulse" : "bg-slate-900 border-black text-amber-400"}`}>
                    {formatTime(displayTimer)}
                  </div>
                )}
              </div>
          </div>
        )}

        {liveData.battleStep === "challenge" && liveData.activeChallengeType === "guess" && (
          <div className="bg-white border-8 border-black rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-8 text-center shadow-[16px_16px_0px_#000] animate-in zoom-in duration-300 pointer-events-auto w-full max-w-2xl mx-auto">
            <h3 className="bg-slate-100 border-4 border-slate-200 text-slate-600 font-black mb-6 uppercase tracking-widest text-base md:text-lg py-2 px-6 rounded-2xl inline-block">
              {liveData.activeChallengeName}
            </h3>
            <div className="flex gap-4 md:gap-8 justify-center mt-4">
              <div className="flex-1 max-w-[200px]">
                <div className="text-xl md:text-2xl font-black text-cyan-600 mb-4">{liveData.team1Name}</div>
                <div className="bg-slate-100 border-4 border-black rounded-3xl h-24 md:h-32 flex items-center justify-center shadow-inner relative overflow-hidden">
                   {liveData.guessesRevealed ? (
                     <span className="text-4xl md:text-6xl font-black text-slate-900 animate-in zoom-in">{liveData.guessT1}</span>
                   ) : (
                     <Eye className="w-10 h-10 text-slate-300 animate-pulse" />
                   )}
                </div>
              </div>
              <div className="flex-1 max-w-[200px]">
                <div className="text-xl md:text-2xl font-black text-rose-600 mb-4">{liveData.team2Name}</div>
                <div className="bg-slate-100 border-4 border-black rounded-3xl h-24 md:h-32 flex items-center justify-center shadow-inner relative overflow-hidden">
                   {liveData.guessesRevealed ? (
                     <span className="text-4xl md:text-6xl font-black text-slate-900 animate-in zoom-in">{liveData.guessT2}</span>
                   ) : (
                     <Eye className="w-10 h-10 text-slate-300 animate-pulse" />
                   )}
                </div>
              </div>
            </div>
          </div>
        )}

        {liveData.battleStep === "result" && liveData.targetRoomIndex === null && !hideResultModal && liveData.gameState !== "gameOver" && (
          <div className={`border-8 rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-10 text-center shadow-[16px_16px_0px_#000] animate-in zoom-in duration-500 w-full max-w-2xl md:max-w-3xl ${liveData.resultType === "spy" ? "bg-yellow-400 border-yellow-600" : liveData.resultType === "hit" ? "bg-emerald-400 border-black text-slate-900" : liveData.resultType === "trap" ? "bg-purple-500 border-black text-white" : liveData.resultType === "commander" ? "bg-amber-400 border-black text-slate-900" : "bg-slate-200 border-black text-slate-900"}`}>
            <div className={`mx-auto w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mb-4 md:mb-6 shadow-inner border-8 ${liveData.resultType === "spy" ? "border-yellow-500 bg-yellow-300" : "border-slate-100/20 bg-black/10"}`}>
              {liveData.resultType === "hit" && <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12" strokeWidth={3} />}
              {liveData.resultType === "miss" && <Shield className="w-10 h-10 md:w-12 md:h-12 opacity-60" fill="none" strokeWidth={3} />}
              {liveData.resultType === "trap" && <Bomb className="w-10 h-10 md:w-12 md:h-12 animate-pulse drop-shadow-[4px_4px_0_#000]" strokeWidth={2.5} />}
              {liveData.resultType === "commander" && <Crown className="w-10 h-10 md:w-12 md:h-12 animate-bounce drop-shadow-[4px_4px_0_#000]" strokeWidth={2.5} />}
              {liveData.resultType === "spy" && <Eye className="text-slate-900 w-10 h-10 md:w-12 md:h-12 animate-pulse drop-shadow-[4px_4px_0_rgba(0,0,0,0.3)]" strokeWidth={3} />}
            </div>
            <h2 className="text-2xl md:text-4xl font-black leading-tight drop-shadow-sm">
              {liveData.resultMsg}
            </h2>
          </div>
        )}

        {liveData.gameState === "gameOver" && (
          <div className="bg-amber-400 border-8 border-black rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-10 text-center shadow-[16px_16px_0px_#000] animate-in zoom-in-95 pointer-events-auto w-full max-w-2xl md:max-w-4xl">
            <Crown className="mx-auto text-white w-20 h-20 md:w-32 md:h-32 mb-4 drop-shadow-[6px_6px_0_#000] animate-bounce" strokeWidth={2.5} />
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-2 border-b-4 border-black/10 pb-2 inline-block">انتهت الحرب!</h2>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight drop-shadow-[4px_4px_0_#000]">
              الفريق المنتصر<br />
              <span className={`block mt-4 text-5xl md:text-7xl drop-shadow-[6px_6px_0_#000] ${liveData.hp1 > 0 ? "text-cyan-300" : "text-rose-300"}`}>
                {liveData.hp1 > 0 ? liveData.team1Name : liveData.team2Name}
              </span>
            </h1>
          </div>
        )}
      </div>

      </div>
      
      {/* Floating Status Box */}
      <div className="absolute top-4 md:top-8 lg:top-12 left-1/2 transform -translate-x-1/2 z-40 pointer-events-auto">
        <div className="animate-floating-box px-6 md:px-8 py-2 md:py-3 rounded-3xl border-8 border-black flex items-center gap-3 md:gap-4 shadow-[8px_8px_0px_#000] bg-white transition-colors duration-300 scale-90 md:scale-100">
          <Swords size={28} className={liveData.attackingTeam === 1 ? "text-cyan-500" : "text-rose-500"} strokeWidth={2.5} />
          <div className="flex flex-col items-center">
            <span className="text-xs md:text-sm font-black text-slate-500 uppercase tracking-widest">دور الهجوم</span>
            <span className={`text-lg md:text-2xl font-black ${liveData.attackingTeam === 1 ? "text-cyan-500" : "text-rose-500"}`}>
              {liveData.attackingTeam === 1 ? liveData.team1Name : liveData.team2Name}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}