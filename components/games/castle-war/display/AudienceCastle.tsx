"use client";

import React from "react";
import { Shield, Crown, Bomb, Crosshair, Skull, Eye, Flame } from "lucide-react";
import { CASTLE_IMAGE, CASTLE_ROOMS, CASTLE_SIZE, CASTLE_VIEWBOX } from "@/constants/castle-war";

export default function AudienceCastle({
  isTeam1Castle,
  liveData,
  explosionRoomIdx,
  explosionIsTeam1Target,
}: {
  isTeam1Castle: boolean;
  liveData: any;
  explosionRoomIdx: number | null;
  explosionIsTeam1Target: boolean;
}) {
  const revealed = isTeam1Castle ? liveData.revealed1 || [] : liveData.revealed2 || [];
  const teamData = isTeam1Castle ? liveData.team1Data : liveData.team2Data;
  const isSpiedTarget = isTeam1Castle ? liveData.spiedTarget2 : liveData.spiedTarget1;
  const isTargetTeam = liveData.gameState === "playing" && liveData.attackingTeam !== (isTeam1Castle ? 1 : 2);
  const glowColor = isTeam1Castle ? "url(#team1Glow)" : "url(#team2Glow)";
  const teamStroke = isTeam1Castle ? "#22d3ee" : "#fb7185";

  return (
    <div className={`relative inline-block w-full max-w-[320px] md:max-w-[400px] lg:max-w-[460px] xl:max-w-[500px] shadow-[16px_16px_0px_#000] rounded-[3rem] overflow-hidden border-[8px] border-black bg-[#050b14] mx-auto transition-all duration-500 ${isTargetTeam && liveData.battleStep === "target" ? "scale-[1.02] ring-8 ring-amber-500/50" : "scale-100"}`}>
      <svg
        viewBox={CASTLE_VIEWBOX}
        className={`w-full h-auto select-none transition-all duration-500 ${isTargetTeam ? "opacity-100" : "opacity-60 grayscale-[50%]"}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="team1Glow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
          <linearGradient id="team2Glow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur1" />
            <feGaussianBlur stdDeviation="10" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <image href={CASTLE_IMAGE} x="0" y="0" width={CASTLE_SIZE.width} height={CASTLE_SIZE.height} preserveAspectRatio="xMidYMid slice" />

        {CASTLE_ROOMS.map((room) => {
          const isRevealedRoom = revealed[room.id];
          const isDamagedRoom = isRevealedRoom && teamData && (teamData.rooms[room.id] > 0 || teamData.commanderRoom === room.id || teamData.trapRoom === room.id);
          const isDestroyedTrap = isRevealedRoom && teamData && teamData.trapRoom === room.id;
          const hitCommander = isRevealedRoom && teamData && teamData.commanderRoom === room.id;
          const isSpied = isSpiedTarget === room.id;
          const isTargetedNow = isTargetTeam && liveData.targetRoomIndex === room.id;
          const isExploding = explosionRoomIdx === room.id && explosionIsTeam1Target === isTeam1Castle;
          // النافذة مرسومة بالصورة: هنا طبقة شفافة فوقها بس، لونها من حالة الغرفة (نفس لون أيقونتها)
          const revealedTint = hitCommander ? "#f59e0b" : isDestroyedTrap ? "#9333ea" : isDamagedRoom ? "#f43f5e" : "#10b981";

          return (
            <g
              key={room.id}
              style={{ transformOrigin: `${room.cx}px ${room.cy}px` }}
              className={`transition-transform duration-200 ease-out will-change-transform ${isTargetedNow ? "scale-[1.12]" : ""}`}
            >
              <path d={room.arch} fill={isRevealedRoom ? revealedTint : glowColor} fillOpacity={isRevealedRoom ? 0.22 : 0.14} />
              <path
                d={room.arch}
                fill="none"
                stroke={isTargetedNow ? "#fbbf24" : isRevealedRoom ? revealedTint : teamStroke}
                strokeOpacity={isTargetedNow ? 1 : 0.75}
                className="stroke-[3px] transition-colors duration-200"
                filter={!isRevealedRoom ? "url(#neonGlow)" : ""}
              />

              <foreignObject x={room.cx - 80} y={room.cy - 80} width="160" height="160" className="pointer-events-none overflow-visible">
                <div className="w-full h-full flex flex-col items-center justify-center relative overflow-visible">
                  {isSpied && !isRevealedRoom && !isTargetedNow && (
                    <Eye className="absolute -top-4 text-yellow-400 w-12 h-12 animate-bounce drop-shadow-[0_4px_0_#000] z-40" strokeWidth={3} />
                  )}

                  {isRevealedRoom && !isTargetedNow ? (
                    isDamagedRoom ? (
                      hitCommander ? (
                        <Crown className="text-amber-500 drop-shadow-[0_4px_0_#000] z-40 w-16 h-16 animate-pulse" strokeWidth={2.5} />
                      ) : isDestroyedTrap ? (
                        <Bomb className="text-purple-600 animate-wiggle drop-shadow-[0_4px_0_#000] z-40 w-16 h-16" strokeWidth={2.5} />
                      ) : (
                        <Skull className="text-rose-500 drop-shadow-[0_4px_0_#000] animate-pulse z-40 w-16 h-16" strokeWidth={2.5} />
                      )
                    ) : (
                      <Shield className="text-emerald-400 drop-shadow-[0_4px_0_#000] z-40 w-16 h-16" fill="none" strokeWidth={3} />
                    )
                  ) : (
                    <span className={`font-black z-30 drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] transition-all duration-300 ${isTargetedNow ? "text-5xl text-white opacity-0" : `text-4xl text-white opacity-90`}`}>
                      {room.id + 1}
                    </span>
                  )}

                  {isTargetedNow && !isRevealedRoom && (
                    <Crosshair className="absolute text-rose-500 drop-shadow-[0_0_20px_rgba(225,29,72,1)] animate-ping z-50 w-32 h-32" strokeWidth={3} />
                  )}

                  {isExploding && !isTargetedNow && (
                    <div className="absolute z-50 pointer-events-none flex items-center justify-center">
                      <div className={`w-32 h-32 rounded-full animate-ping border-[10px] border-black shadow-inner ${liveData.resultType === "commander" ? "bg-yellow-500" : liveData.resultType === "trap" ? "bg-purple-600" : "bg-rose-500"}`} />
                      <Flame size={60} className="absolute text-white animate-pulse drop-shadow-[3px_3px_0_#000]" />
                    </div>
                  )}
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
