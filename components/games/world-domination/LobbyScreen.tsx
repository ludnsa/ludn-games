"use client";

import React from "react";
import { Globe } from "lucide-react";

interface LobbyScreenProps {
  audienceUrl: string;
  roomCode: string | null;
  team1Name: string;
  setTeam1Name: (val: string) => void;
  team2Name: string;
  setTeam2Name: (val: string) => void;
  countriesLimit: number;
  setCountriesLimit: (val: number) => void;
  challengesCount: number;
  setChallengesCount: (val: number) => void;
  startGame: () => void;
}

export default function LobbyScreen({
  audienceUrl,
  roomCode,
  team1Name,
  setTeam1Name,
  team2Name,
  setTeam2Name,
  countriesLimit,
  setCountriesLimit,
  challengesCount,
  setChallengesCount,
  startGame,
}: LobbyScreenProps) {
  return (
    <div className="m-auto p-6 lg:p-10 bg-white dark:bg-slate-900 rounded-3xl lg:rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-800 text-center shadow-xl w-full max-w-sm md:max-w-2xl animate-in zoom-in-95">
      <Globe
        size={40}
        className="lg:w-12 lg:h-12 text-blue-600 mx-auto mb-4 lg:mb-6"
      />
      <h1 className="text-2xl lg:text-4xl font-black mb-6 lg:mb-8 dark:text-white">
        السيطرة على العالم
      </h1>

      {audienceUrl && (
        <div className="flex flex-col items-center justify-center gap-3 lg:gap-4 mb-6 lg:mb-8">
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs lg:text-sm">
            امسح الباركود من جوالك أو افتحه على الشاشة الكبيرة، أو أدخل الكود:
          </p>
          <div className="bg-slate-100 dark:bg-slate-800 px-6 py-2 rounded-xl border-2 border-blue-500 mb-2">
            <p className="text-2xl lg:text-4xl font-mono font-black text-blue-600 dark:text-blue-400 tracking-widest">
              {roomCode}
            </p>
          </div>
          <div className="bg-white p-2 rounded-xl lg:rounded-2xl shadow-sm border-2 border-slate-200">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(audienceUrl)}`}
              alt="QR Code"
              className="w-24 h-24 lg:w-32 lg:h-32"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 mb-5 lg:mb-6">
        <input
          value={team1Name}
          onChange={(e) => setTeam1Name(e.target.value)}
          className="p-3 lg:p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-black text-center outline-none focus:border-cyan-500 dark:text-white text-sm lg:text-xl"
          placeholder="الفريق 1"
        />
        <input
          value={team2Name}
          onChange={(e) => setTeam2Name(e.target.value)}
          className="p-3 lg:p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-black text-center outline-none focus:border-rose-500 dark:text-white text-sm lg:text-xl"
          placeholder="الفريق 2"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 lg:mb-8">
        <div className="text-right">
          <p className="text-[10px] lg:text-xs font-black text-slate-500 dark:text-slate-400 mb-2">
            عدد الدول الأساسية:
          </p>
          <div className="flex gap-2">
            {[20, 30, 40].map((num) => (
              <button
                key={num}
                onClick={() => setCountriesLimit(num)}
                className={`flex-1 py-1.5 lg:py-2.5 rounded-xl font-black transition-all border-2 text-xs lg:text-base ${countriesLimit === num ? "bg-blue-600 border-blue-600 text-white shadow-md" : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] lg:text-xs font-black text-purple-500 dark:text-purple-400 mb-2">
            تحديات إضافية (تضاف فوق الأساسي):
          </p>
          <div className="flex gap-2">
            {[0, 2, 4, 6].map((num) => (
              <button
                key={num}
                onClick={() => setChallengesCount(num)}
                className={`flex-1 py-1.5 lg:py-2.5 rounded-xl font-black transition-all border-2 text-xs lg:text-base ${challengesCount === num ? "bg-purple-600 border-purple-600 text-white shadow-md" : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"}`}
              >
                +{num}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={startGame}
        className="w-full py-3 lg:py-5 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg lg:text-2xl rounded-xl lg:rounded-2xl shadow-md transition-colors"
      >
        بدء اللعب
      </button>
    </div>
  );
}