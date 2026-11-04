"use client";

import React from "react";
import { Crown, Bomb, Crosshair } from "lucide-react";
import { CASTLE_IMAGE, CASTLE_ROOMS, CASTLE_SIZE, CASTLE_VIEWBOX } from "@/constants/castle-war";

export default function JoinInteractiveCastle({
  selectedTeam, rooms, commanderRoom, trapRoom, activeRoomIdx, setActiveRoomIdx
}: any) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-ludn-line bg-[#050b14] shadow-[var(--ludn-shadow)] transition-colors duration-500">
      <svg viewBox={CASTLE_VIEWBOX} className="w-full h-auto select-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="team1Glow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
          <linearGradient id="team2Glow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fb7185" /><stop offset="100%" stopColor="#e11d48" />
          </linearGradient>
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur1" /><feGaussianBlur stdDeviation="10" result="blur2" />
            <feMerge><feMergeNode in="blur2" /><feMergeNode in="blur1" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <image href={CASTLE_IMAGE} x="0" y="0" width={CASTLE_SIZE.width} height={CASTLE_SIZE.height} preserveAspectRatio="xMidYMid slice" />

        {CASTLE_ROOMS.map((room) => {
          const isCommander = commanderRoom === room.id;
          const isTrap = trapRoom === room.id;
          const count = rooms[room.id];
          const isActive = activeRoomIdx === room.id;
          const glowColor = selectedTeam === 1 ? "url(#team1Glow)" : "url(#team2Glow)";
          const strokeColor = isActive ? "stroke-amber-400" : selectedTeam === 1 ? "stroke-cyan-500" : "stroke-rose-500";

          return (
            <g
              key={room.id}
              onClick={() => setActiveRoomIdx(room.id)}
              className={`cursor-pointer transition-transform duration-200 ease-out will-change-transform group ${isActive ? "scale-[1.12] z-20" : "hover:scale-[1.05] z-10"}`}
              style={{ transformOrigin: `${room.cx}px ${room.cy}px` }}
            >
              {/* النافذة مرسومة بالصورة: طبقة شفافة فوقها بس، وهي مكان الضغط */}
              <path d={room.arch} fill={count > 0 || isCommander || isTrap ? glowColor : "#020617"} fillOpacity={count > 0 || isCommander || isTrap ? 0.24 : 0.2} className="group-hover:brightness-125 transition-all duration-200" />
              <path d={room.arch} fill="none" strokeOpacity={isActive ? 1 : 0.75} className={`pointer-events-none stroke-[3px] transition-colors duration-200 ${strokeColor}`} filter={count > 0 || isCommander || isTrap ? "url(#neonGlow)" : ""} />

              <foreignObject x={room.cx - 60} y={room.cy - 60} width="120" height="120" className="pointer-events-none">
                <div className="w-full h-full flex flex-col items-center justify-center relative overflow-visible">
                  {isCommander ? (
                    <Crown className="text-amber-400 drop-shadow-[0_2px_0_#000] z-40 w-12 h-12" strokeWidth={2.5} />
                  ) : isTrap ? (
                    <Bomb className="text-purple-400 drop-shadow-[0_2px_0_#000] z-40 w-12 h-12" strokeWidth={2.5} />
                  ) : count > 0 ? (
                    <span className="font-black z-30 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-4xl text-white">{count}</span>
                  ) : (
                    <span className="font-black z-30 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-3xl text-slate-200 opacity-80">{room.id + 1}</span>
                  )}

                  {isActive && <Crosshair className="absolute text-amber-400 drop-shadow-[0_2px_0_#000] animate-spin-slow opacity-40 z-10 w-16 h-16" strokeWidth={3} />}
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
