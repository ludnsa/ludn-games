"use client";

import React from "react";
import {
  Coins,
  PlusCircle,
  MinusCircle,
  Shield,
  Rocket,
  Crown,
  Crosshair,
  ArrowLeftRight,
  Swords,
  Radiation,
} from "lucide-react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { geoCentroid } from "d3-geo";

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

// نقلنا أيقونة الدبابة هنا عشان يكون الملف مستقل وما يعتمد على الصفحة الرئيسية
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

interface PlayingScreenProps {
  turn: 1 | 2;
  setTurn: React.Dispatch<React.SetStateAction<1 | 2>>;
  team1Name: string;
  team2Name: string;
  score1: number;
  score2: number;
  adjustScore: (tId: 1 | 2, amount: number) => void;
  cards1: any;
  cards2: any;
  setQuickProtectTeam: (val: 1 | 2 | null) => void;
  handleSpyAction: (teamId: 1 | 2) => void;
  handleNukeAction: (teamId: 1 | 2) => void;
  setSelectedCountry: (val: any) => void;
  setTeam1Choice: (val: string | null) => void;
  setTeam2Choice: (val: string | null) => void;
  setShowResult: (val: boolean) => void;
  setIsAttacking: (val: boolean) => void;
  setIsQuestionRevealed: (val: boolean) => void;
  setForcedWinner: (val: 1 | 2 | null) => void;
  setSpiedCountryId: (val: string | null) => void;
  mapPosition: { center: [number, number]; zoom: number; name: string };
  setMapPosition: (pos: { center: [number, number]; zoom: number; name: string }) => void;
  countries: any[];
  spiedCountryId: string | null;
  protectedCountries: any;
  capitals: { team1: string | null; team2: string | null };
  handleCountryClick: (geoId: string) => void;
}

export default function PlayingScreen({
  turn,
  setTurn,
  team1Name,
  team2Name,
  score1,
  score2,
  adjustScore,
  cards1,
  cards2,
  setQuickProtectTeam,
  handleSpyAction,
  handleNukeAction,
  setSelectedCountry,
  setTeam1Choice,
  setTeam2Choice,
  setShowResult,
  setIsAttacking,
  setIsQuestionRevealed,
  setForcedWinner,
  setSpiedCountryId,
  mapPosition,
  setMapPosition,
  countries,
  spiedCountryId,
  protectedCountries,
  capitals,
  handleCountryClick,
}: PlayingScreenProps) {
  return (
    <div className="flex flex-col gap-4 lg:gap-6 flex-1 h-full min-h-0 relative">
      {/* الفرق - أعلى الشاشة */}
      <div className="order-1 grid grid-cols-2 gap-4 lg:gap-8 shrink-0 z-50 w-full lg:w-4/5 mx-auto">
        {/* صندوق الفريق الأول */}
        <div
          className={`p-3 lg:p-6 rounded-2xl border-4 bg-white dark:bg-slate-800 ${
            turn === 1
              ? "border-cyan-500 shadow-lg scale-100 lg:scale-105 transition-transform"
              : "border-slate-200 dark:border-slate-700"
          } text-center relative`}
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
              <MinusCircle size={16} className="lg:w-[18px] lg:h-[18px]" />
            </button>
          </div>

          <div className="flex justify-center gap-1 lg:gap-2 mt-2 lg:mt-3 text-[9px] lg:text-[10px] font-bold flex-wrap">
            <span className="bg-slate-100 dark:bg-slate-700 dark:text-white px-1.5 lg:px-2 py-1 lg:py-1.5 rounded flex items-center gap-1">
              <TankIcon size={10} className="lg:w-[12px] lg:h-[12px]" /> استحلال:{" "}
              {cards1.capture}
            </span>
            <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-1.5 lg:px-2 py-1 lg:py-1.5 rounded flex items-center gap-1">
              <Shield size={10} className="lg:w-[12px] lg:h-[12px]" /> حماية:{" "}
              {cards1.protect}
            </span>
            <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-1.5 lg:px-2 py-1 lg:py-1.5 rounded flex items-center gap-1">
              <Rocket size={10} className="lg:w-[12px] lg:h-[12px]" /> قصف:{" "}
              {cards1.airStrike}
            </span>
            <span className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-1.5 lg:px-2 py-1 lg:py-1.5 rounded flex items-center gap-1">
              <Crown size={10} className="lg:w-[12px] lg:h-[12px]" /> غزو:{" "}
              {cards1.capitalCapture}
            </span>
            <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 px-1.5 lg:px-2 py-1 lg:py-1.5 rounded flex items-center gap-1">
              <Crosshair size={10} className="lg:w-[12px] lg:h-[12px]" /> تجسس:{" "}
              {cards1.spy}
            </span>
          </div>
          <div className="flex gap-2 mt-2 lg:mt-3">
            <button
              onClick={() => setQuickProtectTeam(1)}
              disabled={cards1.protect === 0}
              className="flex-1 py-1.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/50 text-emerald-700 dark:text-emerald-400 font-black text-[10px] lg:text-xs rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-300 dark:border-emerald-700"
            >
              <Shield size={12} className="lg:w-[14px] lg:h-[14px]" /> حماية
            </button>
            <button
              onClick={() => handleSpyAction(1)}
              disabled={cards1.spy === 0}
              className="flex-1 py-1.5 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/50 text-indigo-700 dark:text-indigo-400 font-black text-[10px] lg:text-xs rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-300 dark:border-indigo-700"
            >
              <Crosshair size={12} className="lg:w-[14px] lg:h-[14px]" /> تجسس
            </button>
            <button
              onClick={() => handleNukeAction(1)}
              disabled={(cards1.nuke ?? 1) === 0}
              className={`flex-1 py-1.5 font-black text-[10px] lg:text-xs rounded-lg transition-colors flex items-center justify-center gap-1 border ${
                (cards1.nuke ?? 1) === 0
                  ? "bg-slate-200 text-slate-400 border-slate-300 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 cursor-not-allowed"
                  : "bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/50 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700"
              }`}
            >
              <Radiation size={12} className="lg:w-[14px] lg:h-[14px]" /> نووي
            </button>
          </div>
        </div>

        {/* صندوق الفريق الثاني */}
        <div
          className={`p-3 lg:p-4 rounded-xl border-4 bg-white dark:bg-slate-800 ${
            turn === 2
              ? "border-rose-500 shadow-md scale-100 lg:scale-105 transition-transform"
              : "border-slate-200 dark:border-slate-700"
          } text-center relative`}
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
              <MinusCircle size={16} className="lg:w-[18px] lg:h-[18px]" />
            </button>
          </div>

          <div className="flex justify-center gap-1 lg:gap-2 mt-2 lg:mt-3 text-[9px] lg:text-[10px] font-bold flex-wrap">
            <span className="bg-slate-100 dark:bg-slate-700 dark:text-white px-1.5 lg:px-2 py-1 lg:py-1.5 rounded flex items-center gap-1">
              <TankIcon size={10} className="lg:w-[12px] lg:h-[12px]" /> استحلال:{" "}
              {cards2.capture}
            </span>
            <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-1.5 lg:px-2 py-1 lg:py-1.5 rounded flex items-center gap-1">
              <Shield size={10} className="lg:w-[12px] lg:h-[12px]" /> حماية:{" "}
              {cards2.protect}
            </span>
            <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-1.5 lg:px-2 py-1 lg:py-1.5 rounded flex items-center gap-1">
              <Rocket size={10} className="lg:w-[12px] lg:h-[12px]" /> قصف:{" "}
              {cards2.airStrike}
            </span>
            <span className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-1.5 lg:px-2 py-1 lg:py-1.5 rounded flex items-center gap-1">
              <Crown size={10} className="lg:w-[12px] lg:h-[12px]" /> غزو:{" "}
              {cards2.capitalCapture}
            </span>
            <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 px-1.5 lg:px-2 py-1 lg:py-1.5 rounded flex items-center gap-1">
              <Crosshair size={10} className="lg:w-[12px] lg:h-[12px]" /> تجسس:{" "}
              {cards2.spy}
            </span>
          </div>
          <div className="flex gap-2 mt-2 lg:mt-3">
            <button
              onClick={() => setQuickProtectTeam(2)}
              disabled={cards2.protect === 0}
              className="flex-1 py-1.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/50 text-emerald-700 dark:text-emerald-400 font-black text-[10px] lg:text-xs rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-300 dark:border-emerald-700"
            >
              <Shield size={12} className="lg:w-[14px] lg:h-[14px]" /> حماية
            </button>
            <button
              onClick={() => handleSpyAction(2)}
              disabled={cards2.spy === 0}
              className="flex-1 py-1.5 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/50 text-indigo-700 dark:text-indigo-400 font-black text-[10px] lg:text-xs rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-300 dark:border-indigo-700"
            >
              <Crosshair size={12} className="lg:w-[14px] lg:h-[14px]" /> تجسس
            </button>
            <button
              onClick={() => handleNukeAction(2)}
              disabled={(cards2.nuke ?? 1) === 0}
              className={`flex-1 py-1.5 font-black text-[10px] lg:text-xs rounded-lg transition-colors flex items-center justify-center gap-1 border ${
                (cards2.nuke ?? 1) === 0
                  ? "bg-slate-200 text-slate-400 border-slate-300 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 cursor-not-allowed"
                  : "bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/50 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700"
              }`}
            >
              <Radiation size={12} className="lg:w-[14px] lg:h-[14px]" /> نووي
            </button>
          </div>
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
            setSpiedCountryId(null);
          }}
          className="px-6 py-2.5 lg:px-12 lg:py-4 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-sm lg:text-xl rounded-2xl shadow-lg flex items-center gap-2 lg:gap-3 transition-all active:scale-95 border-b-4 border-amber-700 active:border-b-0 active:translate-y-[4px]"
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
                {({ geographies }) => (
                  <>
                    {/* 1. رسم وتلوين الدول */}
                    {geographies.map((geo) => {
                      const country = countries.find((c) => c.geoId === geo.id);
                      let fillColor = "#cbd5e1";
                      if (country) {
                        if (spiedCountryId === country.id)
                          fillColor = "#f97316";
                        else if (country.owner === 1) fillColor = "#06b6d4";
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
                    })}

                    {/* 2. رسم الأسماء والأيقونات */}
                    {geographies.map((geo) => {
                      const country = countries.find((c) => c.geoId === geo.id);
                      if (!country) return null;

                      const centroid = geoCentroid(geo);
                      if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1]))
                        return null;

                      const isProtected = protectedCountries[country.id];
                      let label = country.name;
                      if (
                        country.id === capitals.team1 ||
                        country.id === capitals.team2
                      ) {
                        label += " 👑";
                      }

                      return (
                        <Marker
                          key={`m-${country.id}`}
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
                          {country.isStolen && (
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
                            fill={country.owner ? "#fff" : "#1e293b"}
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
                  </>
                )}
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        </div>
      </div>
    </div>
  );
}