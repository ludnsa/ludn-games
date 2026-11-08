"use client";
import React from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { geoCentroid } from "d3-geo";
import { Shield, Swords, Star } from "lucide-react";

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

export default function AudienceMap({ gameState, mapPosition, countries, spiedCountryId, isDark, protectedCountries, capitals }: any) {
  return (
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
                  const country = countries?.find((c: any) => c.geoId === geo.id);
                  let fillColor = isDark ? "#0f172a" : "#e2e8f0";
                  let strokeColor = isDark ? "#020617" : "#cbd5e1";
                  let strokeWidth = 1.5;

                  if (country && country.isActive !== false) {
                    if (spiedCountryId === country.id) {
                      fillColor = "#f97316";
                      strokeColor = isDark ? "#f97316" : "#ea580c";
                    } else if (country.owner === 1) {
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
                  const country = countries?.find((c: any) => c.geoId === geo.id);
                  if (!country || country.isActive === false) return null;
                  const centroid = geoCentroid(geo);
                  if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return null;

                  const isProtected = protectedCountries[country.id];
                  const isCapital = country.id === capitals.team1 || country.id === capitals.team2;
                  let countryName = country.name;
                  if (isCapital) countryName += " 👑";
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
                          <circle r="8" fill="#10b981" stroke={isDark ? "#064e3b" : "#fff"} strokeWidth="1.5" />
                          <Shield width="10" height="10" x="-5" y="-5" color="white" strokeWidth="2.5" />
                        </g>
                      )}
                      {country.isStolen && (
                        <g transform="translate(0, -18)">
                          <Swords width="18" height="18" x="-9" y="-9" color={isDark ? "black" : "#475569"} strokeWidth="3" />
                        </g>
                      )}
                      <text
                        textAnchor="middle"
                        y={0}
                        fill={country.owner ? "#ffffff" : isDark ? "#cbd5e1" : "#475569"}
                        style={{
                          fontFamily: "Cairo",
                          fontSize: "8px",
                          fontWeight: "900",
                          pointerEvents: "none",
                          textShadow: country.owner ? (isDark ? "0 2px 4px rgba(0,0,0,0.8)" : "0 1px 3px rgba(0,0,0,0.4)") : (isDark ? "0 1px 2px rgba(0,0,0,0.9)" : "none"),
                        }}
                      >
                        <tspan x="0" dy="0">{countryName}</tspan>
                        {countryDetails && <tspan x="0" dy="10" style={{ fontSize: "7px" }}>{countryDetails}</tspan>}
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
  );
}