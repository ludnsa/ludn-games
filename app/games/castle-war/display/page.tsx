/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Cairo } from "next/font/google";
import {
  Shield, Crown, Swords, Crosshair, Skull, Eye, Flame, CheckCircle2, Lock,
} from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import AudienceCastle from "@/components/games/castle-war/display/AudienceCastle";
import CastleReveal, { useCastleReveal } from "@/components/games/castle-war/CastleReveal";
import CastleIcon from "@/components/games/castle-war/CastleIcon";
import { INSET, MODAL, MODAL_GOLD, PANEL, TEAM1_AUDIENCE_HP, TEAM2_AUDIENCE_HP, timerTone } from "@/components/games/castle-war/castleUi";

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

  // عرض بس: الكشف فوق اللعبة، وصناديق النتيجة تطلع بعد ما يخلص
  const reveal = useCastleReveal({
    enabled: !!liveData,
    battleStep: liveData?.battleStep,
    resultType: liveData?.resultType,
    attackingTeam: liveData?.attackingTeam,
    hp1: liveData?.hp1,
    hp2: liveData?.hp2,
  });
  const revealing = reveal !== null;

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
    if (liveData?.battleStep === "result" && liveData?.targetRoomIndex === null && !revealing) {
       setHideResultModal(false);
       const timer = setTimeout(() => {
          setHideResultModal(true);
       }, 3000);
       return () => clearTimeout(timer);
    } else {
       setHideResultModal(false);
    }
  }, [liveData?.battleStep, liveData?.targetRoomIndex, revealing]);

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
      <div className={`dark h-screen flex flex-col items-center justify-center px-4 text-ludn-fg ${cairo.className}`} dir="rtl">

        <div className={`relative z-10 ${PANEL} p-10 md:p-16 flex flex-col items-center text-center animate-in zoom-in-95`}>
          <Swords className="w-32 h-32 text-ludn-muted animate-pulse mb-8" strokeWidth={2.5} />
          <h1 className="font-display text-5xl md:text-6xl leading-tight text-ludn-fg">
            {roomCode ? "جاري الاتصال بغرفة العمليات..." : "بانتظار بدء الحرب..."}
          </h1>
        </div>
      </div>
    );
  }

  return (
    <main className={`dark text-ludn-fg min-h-[100dvh] md:h-screen w-full relative ${cairo.className} overflow-y-auto md:overflow-hidden`} dir="rtl">


      <CastleReveal reveal={reveal} />

      <div className="relative z-10 w-full min-h-screen md:h-full flex flex-col md:flex-row items-center justify-center md:justify-between px-4 md:px-16 gap-8 md:gap-10 pt-28 pb-12 md:py-0">
        <div className="w-full md:flex-1 flex flex-col justify-center items-center z-20 order-1 md:order-none">
          <div className="flex flex-col items-center mb-4 w-full max-w-[320px]">
            <div className={TEAM1_AUDIENCE_HP}>
              {liveData.hp1} <span className="text-xl text-ludn-muted hidden xl:block">جندي</span>
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
            <div className={TEAM2_AUDIENCE_HP}>
              {liveData.hp2} <span className="text-xl text-ludn-muted hidden xl:block">جندي</span>
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
          const teamColorBg = liveData.turn === 1 ? "border-cyan-400/50 text-cyan-200" : "border-rose-400/50 text-rose-200";
          const teamTextColor = liveData.turn === 1 ? "text-cyan-300" : "text-rose-300";
          const teamName = liveData.turn === 1 ? liveData.team1Name : liveData.team2Name;

          return (
            <div className={`${MODAL} p-6 md:p-8 text-center animate-in zoom-in duration-300 w-full max-w-4xl mx-auto overflow-hidden`}>
              <h3 className={`font-display text-2xl md:text-3xl leading-tight mb-6 ${teamTextColor}`}>
                بانتظار اختيار فريق ({teamName})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 w-full">
                {allAvailableTypes.map((cType) => {
                  const isUsed = currentTeamUsed.includes(cType);
                  return (
                    <div key={cType} className={`py-4 md:py-5 rounded-2xl font-black text-lg md:text-xl border bg-ludn-surface-2 transition-all flex items-center justify-center ${isUsed ? "text-ludn-muted border-ludn-line" : `${teamColorBg} animate-pulse`}`}>
                      {getChallengeTitle(cType)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {liveData.battleStep === "challenge" && liveData.isChallengeRevealed && liveData.activeChallengeData && (
          <div className={`${MODAL} p-6 md:p-8 text-center animate-in zoom-in duration-300 pointer-events-auto w-full overflow-y-auto max-h-[85vh]`}>
            <h3 className={`${INSET} text-ludn-muted font-black mb-3 md:mb-4 text-base md:text-lg py-2 px-6 inline-block`}>
              {liveData.activeChallengeName}
            </h3>

            <div className="animate-in fade-in duration-500">
                <p className="text-xl md:text-3xl font-black text-ludn-fg leading-relaxed mb-4 md:mb-6">
                  {liveData.activeChallengeData.q || liveData.activeChallengeData}
                </p>

                {liveData.activeChallengeData.options && (
                  <div className="grid grid-cols-1 gap-2 md:gap-3 mb-4 md:mb-6">
                    {liveData.activeChallengeData.options.map((opt: string, i: number) => {
                      const isCorrect = liveData.showGenAnswer && opt === liveData.activeChallengeData.a;
                      const isWrongSelected = liveData.showGenAnswer && liveData.selectedOption && opt === liveData.selectedOption && opt !== liveData.activeChallengeData.a;
                      const isFaded = liveData.showGenAnswer && !isCorrect && !isWrongSelected;
                      return (
                        <div key={i} className={`border rounded-xl md:rounded-2xl py-2 md:py-3 text-lg md:text-xl font-black transition-colors ${
                          isCorrect ? "bg-emerald-500/20 border-emerald-400 text-emerald-200 scale-[1.02]" :
                          isWrongSelected ? "bg-rose-500/20 border-rose-400 text-rose-200" :
                          isFaded ? "bg-ludn-surface-2 border-ludn-line text-ludn-muted" :
                          "bg-ludn-surface-2 border-ludn-line text-ludn-fg"
                        }`}>
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                )}

                {!liveData.activeChallengeData.options && liveData.activeChallengeType === "general" && liveData.showGenAnswer && (
                  <div className="bg-emerald-500/15 border border-emerald-400/50 text-emerald-200 font-black text-2xl md:text-3xl py-4 px-6 rounded-2xl mb-6 animate-in zoom-in">
                    {liveData.activeChallengeData.a}
                  </div>
                )}

                {(!liveData.showGenAnswer && displayTimer > 0) && (
                  <div className={`text-4xl md:text-6xl font-mono font-black py-3 md:py-4 rounded-2xl border transition-colors ${timerTone(displayTimer)}`}>
                    {formatTime(displayTimer)}
                  </div>
                )}
              </div>
          </div>
        )}

        {liveData.battleStep === "challenge" && liveData.activeChallengeType === "guess" && (
          <div className={`${MODAL} p-6 md:p-8 text-center animate-in zoom-in duration-300 pointer-events-auto w-full max-w-2xl mx-auto`}>
            <h3 className={`${INSET} text-ludn-muted font-black mb-6 text-base md:text-lg py-2 px-6 inline-block`}>
              {liveData.activeChallengeName}
            </h3>
            <div className="flex gap-4 md:gap-8 justify-center mt-4">
              <div className="flex-1 max-w-[200px]">
                <div className="font-display text-xl md:text-2xl leading-tight text-cyan-300 mb-4">{liveData.team1Name}</div>
                <div className={`${INSET} h-24 md:h-32 flex items-center justify-center relative overflow-hidden`}>
                   {liveData.guessesRevealed ? (
                     <span className="font-display text-4xl md:text-6xl text-ludn-fg animate-in zoom-in">{liveData.guessT1}</span>
                   ) : (
                     <Eye className="w-10 h-10 text-ludn-muted animate-pulse" />
                   )}
                </div>
              </div>
              <div className="flex-1 max-w-[200px]">
                <div className="font-display text-xl md:text-2xl leading-tight text-rose-300 mb-4">{liveData.team2Name}</div>
                <div className={`${INSET} h-24 md:h-32 flex items-center justify-center relative overflow-hidden`}>
                   {liveData.guessesRevealed ? (
                     <span className="font-display text-4xl md:text-6xl text-ludn-fg animate-in zoom-in">{liveData.guessT2}</span>
                   ) : (
                     <Eye className="w-10 h-10 text-ludn-muted animate-pulse" />
                   )}
                </div>
              </div>
            </div>
          </div>
        )}

        {liveData.battleStep === "result" && liveData.targetRoomIndex === null && !hideResultModal && !revealing && liveData.gameState !== "gameOver" && (
          <div className={`bg-ludn-surface border rounded-[26px] p-6 md:p-10 text-center animate-in zoom-in duration-500 w-full max-w-2xl md:max-w-3xl ${liveData.resultType === "spy" ? "border-ludn-gold/60 text-ludn-gold-text shadow-[0_0_40px_var(--ludn-glow)]" : liveData.resultType === "hit" ? "border-emerald-400/60 text-emerald-200 shadow-[var(--ludn-shadow)]" : liveData.resultType === "trap" ? "border-purple-400/60 text-purple-200 shadow-[var(--ludn-shadow)]" : liveData.resultType === "commander" ? "border-amber-400/60 text-amber-200 shadow-[var(--ludn-shadow)]" : "border-ludn-line text-ludn-fg shadow-[var(--ludn-shadow)]"}`}>
            <div className={`mx-auto w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mb-4 md:mb-6 border ${liveData.resultType === "spy" ? "border-ludn-gold/50 bg-ludn-gold/10" : "border-ludn-line bg-ludn-surface-2"}`}>
              {liveData.resultType === "hit" && <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12" strokeWidth={3} />}
              {liveData.resultType === "miss" && <Shield className="w-10 h-10 md:w-12 md:h-12 opacity-60" fill="none" strokeWidth={3} />}
              {liveData.resultType === "trap" && <CastleIcon kind="trap" className="w-14 h-14 md:w-16 md:h-16 animate-pulse" />}
              {liveData.resultType === "commander" && <CastleIcon kind="commander" className="w-14 h-14 md:w-16 md:h-16 animate-bounce" />}
              {liveData.resultType === "spy" && <CastleIcon kind="spy" className="w-14 h-14 md:w-16 md:h-16 animate-pulse" />}
            </div>
            <h2 className="text-2xl md:text-4xl font-black leading-tight">
              {liveData.resultMsg}
            </h2>
          </div>
        )}

        {liveData.gameState === "gameOver" && !revealing && (
          <div className={`${MODAL_GOLD} p-6 md:p-10 text-center animate-in zoom-in-95 pointer-events-auto w-full max-w-2xl md:max-w-4xl`}>
            <Crown className="mx-auto text-amber-300 w-20 h-20 md:w-32 md:h-32 mb-4 animate-bounce" strokeWidth={2.5} />
            <h2 className="font-display text-3xl md:text-4xl leading-tight text-ludn-fg mb-2 border-b border-ludn-line pb-2 inline-block">انتهت الحرب!</h2>
            <h1 className="font-display text-4xl md:text-5xl text-ludn-muted leading-tight">
              الفريق المنتصر<br />
              <span className={`block mt-4 text-5xl md:text-7xl ${liveData.hp1 > 0 ? "text-cyan-300" : "text-rose-300"}`}>
                {liveData.hp1 > 0 ? liveData.team1Name : liveData.team2Name}
              </span>
            </h1>
          </div>
        )}
      </div>

      </div>

      {/* Floating Status Box */}
      <div className="absolute top-4 md:top-8 lg:top-12 left-1/2 transform -translate-x-1/2 z-40 pointer-events-auto">
        <div className="animate-floating-box px-6 md:px-8 py-2 md:py-3 rounded-2xl border border-ludn-line flex items-center gap-3 md:gap-4 shadow-[var(--ludn-shadow)] bg-ludn-surface transition-colors duration-300 scale-90 md:scale-100">
          <Swords size={28} className={liveData.attackingTeam === 1 ? "text-cyan-300" : "text-rose-300"} strokeWidth={2.5} />
          <div className="flex flex-col items-center">
            <span className="text-xs md:text-sm font-black text-ludn-muted">دور الهجوم</span>
            <span className={`font-display text-lg md:text-2xl leading-tight ${liveData.attackingTeam === 1 ? "text-cyan-300" : "text-rose-300"}`}>
              {liveData.attackingTeam === 1 ? liveData.team1Name : liveData.team2Name}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
