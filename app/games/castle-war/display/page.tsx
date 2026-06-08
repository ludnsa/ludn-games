/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Cairo } from "next/font/google";
import {
  Shield,
  Crown,
  Bomb,
  Swords,
  Crosshair,
  Skull,
  Eye,
  Flame,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

const INITIAL_POSITIONS = [
  { id: 0, left: "20.0%", top: "30.0%" },
  { id: 1, left: "50.0%", top: "20.0%" },
  { id: 2, left: "80.0%", top: "30.0%" },
  { id: 3, left: "28.0%", top: "48.0%" },
  { id: 4, left: "42.0%", top: "45.0%" },
  { id: 5, left: "58.0%", top: "45.0%" },
  { id: 6, left: "72.0%", top: "48.0%" },
  { id: 7, left: "15.0%", top: "65.0%" },
  { id: 8, left: "32.0%", top: "65.0%" },
  { id: 9, left: "50.0%", top: "55.0%" },
  { id: 10, left: "68.0%", top: "65.0%" },
  { id: 11, left: "85.0%", top: "65.0%" },
  { id: 12, left: "38.0%", top: "80.0%" },
  { id: 13, left: "50.0%", top: "85.0%" },
  { id: 14, left: "62.0%", top: "80.0%" },
];

const SolidGamingBackground = () => {
  const [icons, setIcons] = useState<any[]>([]);

  useEffect(() => {
    const gameShapes = [
      <svg
        key="1"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="6" y1="12" x2="10" y2="12"></line>
        <line x1="8" y1="10" x2="8" y2="14"></line>
        <line x1="15" y1="13" x2="15.01" y2="13"></line>
        <line x1="18" y1="11" x2="18.01" y2="11"></line>
        <rect x="2" y="6" width="20" height="12" rx="2"></rect>
      </svg>,
      <svg
        key="2"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <circle cx="15.5" cy="15.5" r="1.5"></circle>
        <circle cx="15.5" cy="8.5" r="1.5"></circle>
        <circle cx="8.5" cy="15.5" r="1.5"></circle>
        <circle cx="12" cy="12" r="1.5"></circle>
      </svg>,
      <svg
        key="3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 20h4" />
        <path d="M6 20V4h6v4" />
        <circle cx="12" cy="11" r="2" />
        <line x1="12" y1="13" x2="12" y2="17" />
        <line x1="10" y1="15" x2="14" y2="15" />
        <line x1="12" y1="17" x2="10" y2="20" />
        <line x1="12" y1="17" x2="14" y2="20" />
      </svg>,
    ];

    const iconColors = [
      "text-cyan-500",
      "text-rose-500",
      "text-amber-500",
      "text-purple-500",
    ];

    const generatedIcons = Array.from({ length: 15 }).map((_, i) => ({
      id: `icon-${i}`,
      shape: gameShapes[i % gameShapes.length],
      colorClass: iconColors[i % iconColors.length],
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 60 + 60,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 15 + 20}s`,
      rotate: Math.random() * 360,
    }));
    setIcons(generatedIcons);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#0f172a] transition-colors duration-300">
      <div className="absolute inset-0 opacity-[0.08]">
        {icons.map((icon) => (
          <div
            key={icon.id}
            className={`absolute animate-float-game-extra ${icon.colorClass}`}
            style={{
              left: icon.left,
              top: icon.top,
              width: `${icon.size}px`,
              height: `${icon.size}px`,
              animationDelay: icon.delay,
              animationDuration: icon.duration,
              transform: `rotate(${icon.rotate}deg)`,
            }}
          >
            {icon.shape}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function CastleWarDisplay() {
  const [liveData, setLiveData] = useState<any>(null);
  const [explosionRoomIdx, setExplosionRoomIdx] = useState<number | null>(null);
  const [explosionIsTeam1Target, setExplosionIsTeam1Target] = useState(false);
  const [targetRoomIdx, setTargetRoomIdx] = useState<number | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);

  const lastTimestampRef = useRef<number | null>(null);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
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
      if (
        parsed.explosionRoomIndexHit !== undefined &&
        parsed.timestamp !== lastTimestampRef.current
      ) {
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
        const { data } = await supabase
          .from("cw_rooms")
          .select("live_sync")
          .eq("room_code", code)
          .single();
        if (data && data.live_sync) {
          handleSyncData(data.live_sync);
        }
      };

      fetchInitial();

      const channel = supabase
        .channel(`display_room_${code}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "cw_rooms",
            filter: `room_code=eq.${code}`,
          },
          (payload) => {
            if (payload.new && payload.new.live_sync) {
              handleSyncData(payload.new.live_sync);
            }
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        document.documentElement.classList.remove("dark");
      };
    } else {
      return () => {
        document.documentElement.classList.remove("dark");
      };
    }
  }, []);

  const getChallengeTitle = (type: string) => {
    switch (type) {
      case "30sec":
        return "ثلاثين ثانية";
      case "5sec":
        return "خمس ثواني";
      case "general":
        return "أسئلة عامة";
      case "team":
        return "تحدي الفريق";
      case "guess":
        return "توقع الرقم";
      default:
        return "";
    }
  };

  if (!liveData) {
    return (
      <div
        className={`h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white ${cairo.className}`}
        dir="rtl"
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes floatGameExtra { 0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); } 25% { transform: translate(-20px, 15px) rotate(8deg) scale(1.05); } 50% { transform: translate(-10px, -15px) rotate(-8deg) scale(0.95); } 75% { transform: translate(15px, 20px) rotate(5deg) scale(1.02); } } .animate-float-game-extra { animation: floatGameExtra ease-in-out infinite; }`,
          }}
        />
        <SolidGamingBackground />
        <div className="relative z-10 bg-slate-800 border-8 border-black p-16 rounded-[4rem] shadow-[16px_16px_0px_#000] flex flex-col items-center animate-in zoom-in-95">
          <Swords
            className="w-32 h-32 text-slate-500 animate-pulse mb-8"
            strokeWidth={2.5}
          />
          <h1 className="text-5xl md:text-6xl font-black text-slate-300 tracking-tight">
            {roomCode
              ? "جاري الاتصال بغرفة العمليات..."
              : "بانتظار بدء الحرب..."}
          </h1>
        </div>
      </div>
    );
  }

  const renderCastle = (isTeam1Castle: boolean) => {
    const revealed = isTeam1Castle ? liveData.revealed1 : liveData.revealed2;
    const teamData = isTeam1Castle ? liveData.team1Data : liveData.team2Data;
    const isSpiedTarget = isTeam1Castle
      ? liveData.spiedTarget2
      : liveData.spiedTarget1;

    const isTargetTeam =
      liveData.gameState === "playing" &&
      liveData.attackingTeam !== (isTeam1Castle ? 1 : 2);
    const teamColorClass = isTeam1Castle ? "text-cyan-400" : "text-rose-400";

    const positions = liveData.roomPositions || INITIAL_POSITIONS;

    return (
      <div
        className={`relative inline-block w-full max-w-[320px] md:max-w-[400px] lg:max-w-[460px] xl:max-w-[500px] shadow-[16px_16px_0px_#000] rounded-[3rem] overflow-hidden border-[8px] border-black bg-slate-800 mx-auto transition-all duration-500 ${isTargetTeam && liveData.battleStep === "target" ? "scale-[1.02] ring-8 ring-amber-500/50" : "scale-100"}`}
      >
        <img
          src="/castle.png"
          alt="Castle"
          className={`w-full h-auto block relative z-0 transition-all duration-500 ${isTargetTeam ? "opacity-100" : "opacity-60 grayscale-[50%]"}`}
        />

        {positions.map((pos: any) => {
          const isRevealedRoom = revealed[pos.id];
          const isDamagedRoom =
            isRevealedRoom &&
            teamData &&
            (teamData.rooms[pos.id] > 0 ||
              teamData.commanderRoom === pos.id ||
              teamData.trapRoom === pos.id);
          const isDestroyedTrap =
            isRevealedRoom && teamData && teamData.trapRoom === pos.id;
          const isSpied = isSpiedTarget === pos.id;

          const isTargetedNow =
            isTargetTeam && liveData.targetRoomIndex === pos.id;

          return (
            <div
              key={pos.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-[100]"
              style={{ left: pos.left, top: pos.top }}
            >
              <div className="flex items-center justify-center relative leading-none">
                {isTargetedNow && !isRevealedRoom && (
                  <Crosshair
                    className="absolute text-rose-500 w-24 h-24 md:w-32 md:h-32 animate-ping drop-shadow-[0_0_20px_rgba(225,29,72,1)] z-[999]"
                    strokeWidth={3}
                  />
                )}

                {isSpied && !isRevealedRoom && !isTargetedNow && (
                  <Eye
                    className="absolute -top-[160%] text-yellow-400 w-6 h-6 md:w-8 md:h-8 animate-bounce drop-shadow-[0_4px_0_#000] z-40"
                    strokeWidth={3}
                  />
                )}

                {isRevealedRoom && !isTargetedNow ? (
                  isDamagedRoom ? (
                    isDestroyedTrap ? (
                      <Bomb
                        className="text-purple-400 w-8 h-8 md:w-12 md:h-12 animate-wiggle drop-shadow-[3px_3px_0_#000]"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Skull
                        className="text-rose-500 w-8 h-8 md:w-12 md:h-12 animate-pulse drop-shadow-[3px_3px_0_#000]"
                        strokeWidth={2.5}
                      />
                    )
                  ) : (
                    <Shield
                      className="text-emerald-400 w-8 h-8 md:w-12 md:h-12 drop-shadow-[3px_3px_0_#000]"
                      fill="none"
                      strokeWidth={3}
                    />
                  )
                ) : (
                  <span
                    className={`font-black text-2xl md:text-4xl drop-shadow-[3px_3px_0_#000] ${teamColorClass} ${isTargetedNow ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
                  >
                    {pos.id + 1}
                  </span>
                )}

                {explosionRoomIdx === pos.id &&
                  explosionIsTeam1Target === isTeam1Castle &&
                  !isTargetedNow && (
                    <div className="absolute z-50 pointer-events-none">
                      <div
                        className={`w-16 h-16 md:w-28 md:h-28 rounded-full animate-ping border-8 border-black shadow-inner ${liveData.resultType === "commander" ? "bg-yellow-500" : liveData.resultType === "trap" ? "bg-purple-600" : "bg-rose-500"}`}
                      />
                      <Flame
                        size={40}
                        className="absolute text-white animate-pulse drop-shadow-[2px_2px_0_#000]"
                        style={{
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                    </div>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <main
      className={`h-screen w-full relative bg-[#0f172a] ${cairo.className} overflow-hidden`}
      dir="rtl"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes floatGameExtra { 0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); } 25% { transform: translate(-20px, 15px) rotate(8deg) scale(1.05); } 50% { transform: translate(-10px, -15px) rotate(-8deg) scale(0.95); } 75% { transform: translate(15px, 20px) rotate(5deg) scale(1.02); } }
        .animate-float-game-extra { animation: floatGameExtra ease-in-out infinite; }
        
        @keyframes floatingBox { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        .animate-floating-box { animation: floatingBox 3s ease-in-out infinite; }
      `,
        }}
      />

      <SolidGamingBackground />

      <div className="relative z-10 w-full h-full flex items-center justify-between px-8 md:px-16 gap-10">
        <div className="flex-1 w-full flex flex-col justify-center items-center h-full z-20">
          <div className="flex flex-col items-center mb-4 w-full max-w-[320px]">
            <div className="bg-cyan-500 border-4 border-black text-white font-black text-3xl md:text-4xl py-3 px-6 rounded-[2rem] shadow-[8px_8px_0px_#000] text-center flex items-center justify-center gap-3 w-full">
              {liveData.hp1}{" "}
              <span className="text-xl text-cyan-900 font-bold hidden xl:block">
                جندي
              </span>
            </div>
          </div>
          {renderCastle(true)}
        </div>

        <div className="flex-1 w-full flex flex-col justify-center items-center h-full z-20">
          <div className="flex flex-col items-center mb-4 w-full max-w-[320px]">
            <div className="bg-rose-500 border-4 border-black text-white font-black text-3xl md:text-4xl py-3 px-6 rounded-[2rem] shadow-[8px_8px_0px_#000] text-center flex items-center justify-center gap-3 w-full">
              {liveData.hp2}{" "}
              <span className="text-xl text-rose-900 font-bold hidden xl:block">
                جندي
              </span>
            </div>
          </div>
          {renderCastle(false)}
        </div>
      </div>

      <div className="absolute top-8 md:top-12 left-1/2 transform -translate-x-1/2 z-40 pointer-events-auto">
        <div
          className={`animate-floating-box px-8 py-3 rounded-3xl border-8 border-black flex items-center gap-4 shadow-[8px_8px_0px_#000] bg-white transition-colors duration-300`}
        >
          <Swords
            size={32}
            className={
              liveData.attackingTeam === 1 ? "text-cyan-500" : "text-rose-500"
            }
            strokeWidth={2.5}
          />
          <div className="flex flex-col items-center">
            <span className="text-sm font-black text-slate-500 uppercase tracking-widest">
              دور الهجوم
            </span>
            <span
              className={`text-xl md:text-2xl font-black ${liveData.attackingTeam === 1 ? "text-cyan-500" : "text-rose-500"}`}
            >
              {liveData.attackingTeam === 1
                ? liveData.team1Name
                : liveData.team2Name}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl pointer-events-none flex flex-col items-center">
        {liveData.battleStep === "roll" &&
          (() => {
            const allAvailableTypes = [
              "guess",
              "30sec",
              "5sec",
              "general",
              "team",
            ];
            const usedT1 = liveData.usedChallengesT1 || [];
            const usedT2 = liveData.usedChallengesT2 || [];

            const currentTeamUsed = liveData.turn === 1 ? usedT1 : usedT2;
            const teamColorBg =
              liveData.turn === 1 ? "bg-cyan-500" : "bg-rose-500";
            const teamTextColor =
              liveData.turn === 1 ? "text-cyan-400" : "text-rose-400";
            const teamName =
              liveData.turn === 1 ? liveData.team1Name : liveData.team2Name;

            return (
              <div className="bg-slate-800 border-8 border-black rounded-[3rem] p-8 md:p-10 text-center shadow-[20px_20px_0px_#000] animate-in zoom-in duration-300 w-full max-w-4xl mx-auto">
                <h3
                  className={`text-3xl md:text-4xl font-black mb-8 ${teamTextColor} drop-shadow-[2px_2px_0_#000]`}
                >
                  بانتظار اختيار فريق ({teamName})
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 w-full">
                  {allAvailableTypes.map((cType) => {
                    const isUsed = currentTeamUsed.includes(cType);
                    return (
                      <div
                        key={cType}
                        className={`py-6 rounded-3xl font-black text-xl md:text-2xl border-8 transition-all flex items-center justify-center
                          ${
                            isUsed
                              ? "bg-slate-900 text-slate-700 border-slate-950 opacity-40 shadow-inner"
                              : `${teamColorBg} text-white border-black shadow-[6px_6px_0px_#000] animate-pulse`
                          }`}
                      >
                        {getChallengeTitle(cType)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

        {/* القفل والحجب لشاشة الجمهور إلين يشتغل المؤقت */}
        {liveData.battleStep === "challenge" &&
          liveData.isChallengeRevealed &&
          liveData.activeChallengeData && (
            <div className="bg-white border-8 border-black rounded-[3rem] p-8 md:p-10 text-center shadow-[20px_20px_0px_#000] animate-in zoom-in duration-300 pointer-events-auto w-full">
              <h3 className="bg-slate-100 border-4 border-slate-200 text-slate-600 font-black mb-4 uppercase tracking-widest text-lg py-2 px-6 rounded-2xl inline-block">
                {liveData.activeChallengeName}
              </h3>

              {!liveData.timerStarted ? (
                <div className="py-12 flex flex-col items-center justify-center animate-in zoom-in">
                  <Lock
                    className="w-20 h-20 text-slate-300 mb-6 animate-pulse"
                    strokeWidth={2}
                  />
                  <h2 className="text-3xl md:text-4xl font-black text-slate-500">
                    التحدي جاهز
                  </h2>
                  <p className="text-xl text-slate-400 mt-2 font-bold">
                    بانتظار بدء المؤقت لعرض التفاصيل...
                  </p>
                </div>
              ) : (
                <div className="animate-in fade-in duration-500">
                  <p className="text-2xl md:text-4xl font-black text-slate-900 leading-relaxed mb-6">
                    {liveData.activeChallengeData.q ||
                      liveData.activeChallengeData}
                  </p>

                  {liveData.activeChallengeData.options && (
                    <div className="grid grid-cols-1 gap-3 mb-6">
                      {liveData.activeChallengeData.options.map(
                        (opt: string, i: number) => (
                          <div
                            key={i}
                            className="bg-slate-100 border-4 border-slate-900 rounded-2xl py-3 text-xl md:text-2xl font-black text-slate-800 shadow-[4px_4px_0px_#000]"
                          >
                            {opt}
                          </div>
                        ),
                      )}
                    </div>
                  )}

                  {liveData.genTimer > 0 && (
                    <div
                      className={`text-5xl md:text-7xl font-mono font-black py-4 rounded-3xl border-8 shadow-inner transition-colors ${liveData.genTimer <= 5 ? "bg-rose-100 text-rose-600 border-rose-500 animate-pulse" : "bg-slate-900 border-black text-amber-400"}`}
                    >
                      {formatTime(liveData.genTimer)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        {liveData.battleStep === "result" &&
          liveData.targetRoomIndex === null && (
            <div
              className={`border-8 rounded-[3rem] md:rounded-[4rem] p-10 md:p-14 text-center shadow-[24px_24px_0px_#000] animate-in zoom-in duration-500 w-full max-w-3xl ${
                liveData.resultType === "spy"
                  ? "bg-yellow-400 border-yellow-600"
                  : liveData.resultType === "hit"
                    ? "bg-emerald-400 border-black text-slate-900"
                    : liveData.resultType === "trap"
                      ? "bg-purple-500 border-black text-white"
                      : liveData.resultType === "commander"
                        ? "bg-amber-400 border-black text-slate-900"
                        : "bg-slate-200 border-black text-slate-900"
              }`}
            >
              <div
                className={`mx-auto w-28 h-28 rounded-full flex items-center justify-center mb-8 shadow-inner border-8 ${
                  liveData.resultType === "spy"
                    ? "border-yellow-500 bg-yellow-300"
                    : "border-slate-100/20 bg-black/10"
                }`}
              >
                {liveData.resultType === "hit" && (
                  <CheckCircle2 className="w-14 h-14" strokeWidth={3} />
                )}
                {liveData.resultType === "miss" && (
                  <Shield
                    className="w-14 h-14 opacity-60"
                    fill="none"
                    strokeWidth={3}
                  />
                )}
                {liveData.resultType === "trap" && (
                  <Bomb
                    className="w-14 h-14 animate-pulse drop-shadow-[4px_4px_0_#000]"
                    strokeWidth={2.5}
                  />
                )}
                {liveData.resultType === "commander" && (
                  <Crown
                    className="w-14 h-14 animate-bounce drop-shadow-[4px_4px_0_#000]"
                    strokeWidth={2.5}
                  />
                )}
                {liveData.resultType === "spy" && (
                  <Eye
                    className="text-slate-900 w-14 h-14 animate-pulse drop-shadow-[4px_4px_0_rgba(0,0,0,0.3)]"
                    strokeWidth={3}
                  />
                )}
              </div>

              <h2 className="text-3xl md:text-5xl font-black leading-tight drop-shadow-sm">
                {liveData.resultMsg}
              </h2>
            </div>
          )}

        {liveData.gameState === "gameOver" && (
          <div className="bg-amber-400 border-8 border-black rounded-[3rem] md:rounded-[4rem] p-10 md:p-14 text-center shadow-[24px_24px_0px_#000] animate-in zoom-in-95 pointer-events-auto w-full max-w-4xl">
            <Crown
              className="mx-auto text-white w-24 h-24 md:w-40 md:h-40 mb-6 drop-shadow-[6px_6px_0_#000] animate-bounce"
              strokeWidth={2.5}
            />
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 border-b-8 border-black/10 pb-4 inline-block">
              انتهت الحرب!
            </h2>
            <h1 className="text-5xl md:text-6xl font-black text-white leading-tight drop-shadow-[4px_4px_0_#000]">
              الفريق المنتصر
              <br />
              <span
                className={`block mt-6 text-6xl md:text-8xl drop-shadow-[6px_6px_0_#000] ${liveData.hp1 > 0 ? "text-cyan-300" : "text-rose-300"}`}
              >
                {liveData.hp1 > 0 ? liveData.team1Name : liveData.team2Name}
              </span>
            </h1>
          </div>
        )}
      </div>
    </main>
  );
}
