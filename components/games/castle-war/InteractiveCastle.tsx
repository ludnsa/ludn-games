"use client";

import React from "react";
import { Skull, Crown, Bomb, Shield, Crosshair, Eye } from "lucide-react";
import { CASTLE_IMAGE, CASTLE_ROOMS, CASTLE_SIZE, CASTLE_VIEWBOX } from "@/constants/castle-war";

export default function InteractiveCastle({
  isTeam1Castle = true,
  revealed,
  teamData,
  isSpiedTarget,
  gameState,
  attackingTeam,
  battleStep,
  targetRoomIndex,
  executeAttack
}: any) {
  const teamColorClass = isTeam1Castle ? "text-cyan-400" : "text-rose-400";

  return (
    <div className="relative inline-block w-full rounded-[2rem] overflow-hidden border-4 bg-[#050b14] border-slate-900 dark:border-black shadow-[8px_8px_0px_#0f172a] dark:shadow-[8px_8px_0px_#000] transition-colors duration-500">
      <svg
        viewBox={CASTLE_VIEWBOX}
        className="w-full h-auto select-none"
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
          const canBeAttacked = gameState === "playing" && attackingTeam === (isTeam1Castle ? 2 : 1) && battleStep === "target" && !isRevealedRoom;
          const isDamagedRoom = isRevealedRoom && teamData && (teamData.rooms[room.id] > 0 || teamData.commanderRoom === room.id || teamData.trapRoom === room.id);
          const isDestroyedTrap = isRevealedRoom && teamData && teamData.trapRoom === room.id;
          const hitCommander = isRevealedRoom && teamData && teamData.commanderRoom === room.id;
          const isSpied = isSpiedTarget === room.id;
          const isTargetedNow = targetRoomIndex === room.id && canBeAttacked;

          const glowColor = isTeam1Castle ? "url(#team1Glow)" : "url(#team2Glow)";
          const strokeColor = isTeam1Castle ? "stroke-cyan-500" : "stroke-rose-500";
          const hoverStroke = isTeam1Castle ? "group-hover:stroke-cyan-300" : "group-hover:stroke-rose-300";
          // النافذة مرسومة بالصورة: هنا طبقة شفافة فوقها بس، لونها من حالة الغرفة (نفس لون أيقونتها)
          const teamStroke = isTeam1Castle ? "#22d3ee" : "#fb7185";
          const revealedTint = hitCommander ? "#f59e0b" : isDestroyedTrap ? "#9333ea" : isDamagedRoom ? "#f43f5e" : "#10b981";

          return (
            <g
              key={room.id}
              onClick={(e) => {
                if (canBeAttacked && gameState === "playing") executeAttack(room.id, e);
              }}
              className={`transition-transform duration-200 ease-out will-change-transform group ${canBeAttacked && !isSpied ? "cursor-crosshair hover:scale-[1.12]" : gameState !== "lobby" ? "cursor-default" : ""}`}
              style={{ transformOrigin: `${room.cx}px ${room.cy}px` }}
            >
              {/* لون خفيف فوق النافذة — وهو مكان الضغط */}
              <path
                d={room.arch}
                fill={isRevealedRoom ? revealedTint : glowColor}
                fillOpacity={isRevealedRoom ? 0.22 : canBeAttacked ? 0.24 : 0.14}
                className={canBeAttacked ? "group-hover:brightness-125 transition-all duration-200" : ""}
              />
              {/* الإطار والتوهج: على الحدود بس عشان ما يغطي حجارة النافذة */}
              <path
                d={room.arch}
                fill="none"
                stroke={isRevealedRoom ? revealedTint : teamStroke}
                strokeOpacity={canBeAttacked ? 1 : 0.75}
                className={`pointer-events-none stroke-[3px] transition-colors duration-200 ${canBeAttacked ? `${strokeColor} ${hoverStroke}` : ""}`}
                filter={!isRevealedRoom ? "url(#neonGlow)" : ""}
              />

              <foreignObject x={room.cx - 60} y={room.cy - 60} width="120" height="120" className="pointer-events-none">
                <div className="w-full h-full flex flex-col items-center justify-center relative overflow-visible">
                  {isSpied && !isRevealedRoom && (
                    <Eye className="absolute -top-6 text-yellow-500 animate-bounce drop-shadow-[0_2px_0_#000] z-40 w-10 h-10" strokeWidth={3} />
                  )}

                  {isRevealedRoom ? (
                    isDamagedRoom ? (
                      hitCommander ? (
                        <Crown className="text-amber-500 drop-shadow-[0_2px_0_#000] z-40 w-12 h-12 animate-pulse" strokeWidth={2.5} />
                      ) : isDestroyedTrap ? (
                        <Bomb className="text-purple-600 animate-wiggle drop-shadow-[0_2px_0_#000] z-40 w-12 h-12" strokeWidth={2.5} />
                      ) : (
                        <Skull className="text-rose-500 drop-shadow-[0_2px_0_#000] animate-pulse z-40 w-12 h-12" strokeWidth={2.5} />
                      )
                    ) : (
                      <Shield className="text-emerald-500 drop-shadow-[0_2px_0_#000] z-40 w-12 h-12" fill="none" strokeWidth={3} />
                    )
                  ) : (
                    <span className={`font-black z-30 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-transform duration-300 ${canBeAttacked ? `text-4xl text-white scale-110` : `text-3xl text-white opacity-90`}`}>
                      {room.id + 1}
                    </span>
                  )}

                  {canBeAttacked && !isSpied && !isTargetedNow && (
                    <Crosshair className={`absolute animate-spin-slow opacity-40 z-10 w-14 h-14 drop-shadow-[0_2px_0_#000] text-white`} strokeWidth={2.5} />
                  )}
                  {canBeAttacked && isSpied && !isTargetedNow && (
                    <Crosshair className="absolute text-yellow-500 drop-shadow-[0_2px_0_#000] animate-spin-slow opacity-40 z-10 w-14 h-14" strokeWidth={3} />
                  )}
                  {isTargetedNow && (
                    <Crosshair className="absolute text-rose-500 drop-shadow-[0_2px_0_#000] animate-ping z-50 w-20 h-20" strokeWidth={3} />
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
