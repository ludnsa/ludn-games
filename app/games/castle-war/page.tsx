/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import Link from "next/link";
import { Cairo } from "next/font/google";
import {
  Shield, Crown, Bomb, CheckCircle2, Crosshair, Swords, Zap, Volume2,
  VolumeX, Flame, Eye, Lock, Skull, Clock, RefreshCw, Search, Ban, Copy,
  MonitorPlay, ArrowRight, Sun, Moon, Home, Info,
} from "lucide-react";

import SolidGamingBackground from "@/components/games/castle-war/SolidGamingBackground";
import InteractiveCastle from "@/components/games/castle-war/InteractiveCastle";
import { useCastleWar, TOTAL_SOLDIERS } from "@/hooks/useCastleWar";

import AccessLoadingScreen from "@/components/games/shared/AccessLoadingScreen";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

export default function CastleBattleMainScreen() {
  const {
    gameState, isLoading, roomCode, joinUrl, linkCopied, copyToClipboard,
    team1Name, team2Name, updateTeamNameLocally, team1Ready, team2Ready, startBattle,
    hp1, hp2, revealed1, revealed2, team1Data, team2Data,
    turn, attackingTeam, setAttackingTeam, battleStep, setBattleStep,
    activeChallengeType, activeChallengeName, activeChallengeData, isChallengeRevealed, setIsChallengeRevealed,
    showGenAnswer, setShowGenAnswer, selectedOption, setSelectedOption, guessT1, setGuessT1, guessT2, setGuessT2,
    guessesRevealed, setGuessesRevealed, genTimer, isGenTimerRunning, setIsGenTimerRunning, timerStarted, setTimerStarted,
    resultMsg, resultType, spyUsed1, spyUsed2, spiedTarget1, spiedTarget2,
    screenShake, explosionRoomIndexHit, soundEnabled, setSoundEnabled, isDarkMode,
    usedChallengesT1, usedChallengesT2, targetRoomIndex, isAttacking,
    formatTime, getChallengeTitle, handleSelectChallenge, cancelChallenge, pickNewChallenge,
    challengeSuccess, challengeFail, useSpy, executeAttack, resolveTrap, nextTurn, isAccessChecking, endGame
  } = useCastleWar();

  const cardClass = "bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-black rounded-3xl shadow-[6px_6px_0px_#0f172a] dark:shadow-[6px_6px_0px_#000] transition-colors duration-300";
  const [showEndGameModal, setShowEndGameModal] = React.useState(false);

  if (isAccessChecking) {
    return <AccessLoadingScreen />;
  }

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white font-black text-2xl" dir="rtl">
        <div className="relative flex items-center justify-center mb-8">
          <Shield className="w-24 h-24 text-slate-200 dark:text-slate-800 animate-pulse" />
          <Swords className="w-16 h-16 text-rose-500 absolute animate-spin-slow drop-shadow-lg" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-3xl text-cyan-600 dark:text-cyan-400 animate-pulse drop-shadow-sm">جاري شحذ السيوف...</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bold tracking-widest">تجهيز بيانات المعركة والأسئلة</p>
        </div>
      </div>
    );
  }

  return (
    <main
      className={`min-h-[100dvh] relative flex flex-col pt-32 md:pt-40 pb-8 px-2 md:px-4 ${cairo.className} overflow-x-hidden ${screenShake ? "animate-screen-shake" : ""} transition-colors duration-500 bg-slate-50 dark:bg-[#0f172a]`}
      dir="rtl"
    >


      <SolidGamingBackground />

      <div className="fixed top-4 left-0 right-0 z-[60] w-full max-w-7xl mx-auto px-4">
        <div className="bg-white/95 dark:bg-slate-800/95 rounded-2xl border-b-4 border-slate-200 dark:border-slate-950 p-2 md:p-3 shadow-xl flex justify-between items-center transition-colors duration-300">
          <Link href="/" className="transition-transform hover:scale-105 active:scale-95 shrink-0 pl-2">
            <img src="/logo.svg" alt="الشعار" className="h-12 md:h-16 w-auto max-w-[140px] md:max-w-[200px] object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-1.5 md:gap-3">
            <Link href="/" className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-[11px] md:text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0">
              <Home size={16} className="text-slate-500 dark:text-slate-400" /> <span>الرئيسية</span>
            </Link>
            <Link href="/#about-section" className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-[11px] md:text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0">
              <Info size={16} className="text-purple-500" /> <span>عن المنصة</span>
            </Link>
          </nav>
          <div className="flex gap-2 pr-2">
            <button
              onClick={() => {
                const html = document.documentElement;
                if (html.classList.contains("dark")) {
                  html.classList.remove("dark");
                  localStorage.setItem("theme_preference", "light");
                } else {
                  html.classList.add("dark");
                  localStorage.setItem("theme_preference", "dark");
                }
              }}
              className="w-10 h-10 md:w-11 h-11 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 text-slate-600 dark:text-amber-400 rounded-xl flex items-center justify-center transition-all hover:bg-slate-200 dark:hover:bg-slate-700 active:translate-y-0.5 active:border-b-0"
            >
              <Sun size={20} className="hidden dark:block animate-spin-slow" />
              <Moon size={20} className="block dark:hidden animate-wiggle" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-20 w-full max-w-7xl mx-auto flex justify-between items-center mb-6 px-2 md:px-0">
        <div className="flex gap-2 items-center">
          <Link href="/" className="py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-2 border-slate-900 dark:border-black rounded-xl border-b-4 active:border-b-2 active:translate-y-0.5 transition-all shadow-[2px_2px_0px_#0f172a] dark:shadow-[2px_2px_0px_#000] flex items-center justify-center gap-2 font-black text-sm">
            <Home size={18} strokeWidth={3} /> <span className="hidden sm:inline">الرئيسية</span>
          </Link>
          {gameState === "playing" && (
            <button onClick={() => setShowEndGameModal(true)} className="py-2 px-4 bg-rose-500 hover:bg-rose-400 text-white border-2 border-slate-900 dark:border-black rounded-xl border-b-4 active:border-b-2 active:translate-y-0.5 transition-all shadow-[2px_2px_0px_#0f172a] dark:shadow-[2px_2px_0px_#000] flex items-center justify-center gap-2 font-black text-sm">
              <Ban size={18} strokeWidth={3} /> <span className="hidden sm:inline">إنهاء اللعبة</span>
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.open(`/games/castle-war/display?code=${roomCode}`, "_blank")} className="py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 rounded-xl border-2 border-slate-900 dark:border-black border-b-4 active:border-b-2 active:translate-y-0.5 transition-all shadow-sm flex items-center justify-center gap-1.5 font-black text-xs md:text-sm">
            <MonitorPlay size={16} /> <span className="hidden sm:inline">شاشة الجمهور 📺</span>
          </button>
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border-2 border-slate-900 dark:border-black border-b-4 active:border-b-2 active:translate-y-0.5 transition-all shadow-sm flex items-center justify-center gap-1.5 font-black text-xs md:text-sm">
            {soundEnabled ? <><Volume2 size={16} /> <span className="hidden sm:inline">الصوت شغال</span></> : <><VolumeX size={16} /> <span className="hidden sm:inline">مكتوم</span></>}
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 w-full max-w-7xl mx-auto flex flex-col pb-6 px-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
          
          <div className="lg:col-span-4 flex flex-col w-full h-full">
            <div className="flex flex-col items-center z-10 mb-4 w-full">
              <div className="bg-cyan-500 border-4 border-slate-900 dark:border-black border-b-8 text-white font-black text-xl md:text-2xl py-3 px-6 rounded-2xl shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] w-[85%] text-center -mb-4 z-10">
                {team1Name}
              </div>
              <div className="bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-black text-cyan-600 dark:text-cyan-400 font-black text-xl py-4 px-4 rounded-3xl shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] w-[65%] text-center pt-6 flex items-center justify-center gap-2">
                {hp1} / {TOTAL_SOLDIERS} <span className="text-sm text-slate-500 font-bold">جندي</span>
              </div>
            </div>
            <div className="flex-1 w-full max-w-[600px] mx-auto mt-2">
              <InteractiveCastle
                isTeam1Castle={true}
                revealed={revealed1}
                teamData={team1Data}
                isSpiedTarget={spiedTarget2}
                gameState={gameState}
                attackingTeam={attackingTeam}
                battleStep={battleStep}
                targetRoomIndex={targetRoomIndex}
                executeAttack={executeAttack}
              />
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col items-center justify-start w-full gap-4">
            {gameState === "lobby" && (
              <div className={`${cardClass} w-full p-6 text-center animate-in zoom-in-95`}>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 flex items-center justify-center gap-2">
                  <Swords className="text-rose-500 w-8 h-8" strokeWidth={2.5} /> غرفة تجهيز الجيوش
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-bold mb-6 text-sm leading-relaxed border-b-4 border-slate-100 dark:border-slate-700 pb-4">
                  أدخل الكود في جوالك لتوزيع جنودك بسرية تامة.
                </p>

                <div className="flex flex-col items-center justify-center gap-4 mb-6">
                  <div className="bg-white p-2 rounded-2xl shadow-[4px_4px_0px_#cbd5e1] border-4 border-slate-900 dark:border-black">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(joinUrl)}`} alt="QR Code" className="w-32 h-32 md:w-40 md:h-40" />
                  </div>
                  <div className="flex flex-col items-center w-full">
                    <span className="text-slate-500 dark:text-slate-400 font-black tracking-widest uppercase mb-2 text-sm bg-slate-100 dark:bg-slate-900 px-4 py-1 rounded-xl border-2 border-slate-200 dark:border-slate-700">كود الغرفة</span>
                    <div className="bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-black px-8 py-3 rounded-2xl text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-[0.3em] shadow-inner font-mono">
                      {roomCode}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center mb-6">
                  <button onClick={copyToClipboard} className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-black text-sm transition-all border-4 shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] border-b-8 active:border-b-4 active:translate-y-1 ${linkCopied ? "bg-emerald-400 border-emerald-600 text-slate-900" : "bg-white dark:bg-slate-700 border-slate-900 dark:border-black text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600"}`}>
                    {linkCopied ? <CheckCircle2 size={18} strokeWidth={3} /> : <Copy size={18} strokeWidth={3} />} {linkCopied ? "تم نسخ الرابط!" : "نسخ الرابط"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-6">
                  <div className={`p-4 rounded-2xl border-4 transition-all flex flex-col items-center shadow-sm ${team1Ready ? "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-500 dark:border-emerald-600" : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"}`}>
                    <input type="text" value={team1Name} onChange={(e) => updateTeamNameLocally(1, e.target.value)} className={`text-lg font-black mb-2 text-center bg-transparent border-b-2 border-dashed outline-none w-full transition-colors ${team1Ready ? "text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700" : "text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600"}`} />
                    {team1Ready ? <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black text-sm animate-pulse bg-white dark:bg-emerald-950 px-3 py-1 rounded-lg border-2 border-emerald-200 dark:border-emerald-800"><CheckCircle2 size={16} /> جاهز!</div> : <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs"><Clock size={14} className="animate-spin-slow" /> بانتظار التوزيع...</div>}
                  </div>
                  <div className={`p-4 rounded-2xl border-4 transition-all flex flex-col items-center shadow-sm ${team2Ready ? "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-500 dark:border-emerald-600" : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"}`}>
                    <input type="text" value={team2Name} onChange={(e) => updateTeamNameLocally(2, e.target.value)} className={`text-lg font-black mb-2 text-center bg-transparent border-b-2 border-dashed outline-none w-full transition-colors ${team2Ready ? "text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700" : "text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600"}`} />
                    {team2Ready ? <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black text-sm animate-pulse bg-white dark:bg-emerald-950 px-3 py-1 rounded-lg border-2 border-emerald-200 dark:border-emerald-800"><CheckCircle2 size={16} /> جاهز!</div> : <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs"><Clock size={14} className="animate-spin-slow" /> بانتظار التوزيع...</div>}
                  </div>
                </div>

                <button onClick={startBattle} disabled={!(team1Ready && team2Ready)} className={`w-full py-5 rounded-2xl text-2xl font-black flex items-center justify-center gap-3 transition-all border-4 border-slate-900 dark:border-black ${team1Ready && team2Ready ? "bg-rose-500 hover:bg-rose-400 border-b-8 active:border-b-4 active:translate-y-1 text-white shadow-[6px_6px_0px_#0f172a] dark:shadow-[6px_6px_0px_#000] animate-pulse" : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border-b-4"}`}>
                  بدء الحرب! <Flame size={24} className="fill-current" />
                </button>
              </div>
            )}

            {gameState === "playing" && (
              <>
                <div className={`w-full bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-black rounded-3xl p-4 flex flex-col items-center justify-center gap-2 shadow-[6px_6px_0px_#0f172a] dark:shadow-[6px_6px_0px_#000] transition-colors duration-500 relative`}>
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-4 py-1.5 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                    <Swords className={`w-5 h-5 transition-colors ${attackingTeam === 1 ? "text-cyan-500" : "text-rose-500"}`} />
                    <span className="text-sm font-black text-slate-600 dark:text-slate-400">دور الهجوم:</span>
                  </div>
                  <span className={`text-3xl font-black transition-colors bg-slate-50 dark:bg-slate-900 w-full py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-inner text-center ${attackingTeam === 1 ? "text-cyan-500" : "text-rose-500"}`}>
                    {attackingTeam === 1 ? team1Name : team2Name}
                  </span>
                  {attackingTeam !== turn && battleStep !== "roll" && battleStep !== "challenge" && (
                    <span className="text-xs font-black text-rose-500 animate-pulse bg-rose-100 dark:bg-rose-900/30 px-3 py-1 rounded-lg border-2 border-rose-200 dark:border-rose-800 mt-1">(عكسي)</span>
                  )}
                </div>

                <div className={`${cardClass} w-full text-center relative overflow-y-auto custom-scroll flex-1 flex flex-col justify-center min-h-[300px]`}>
                  {battleStep === "roll" && (() => {
                    let allAvailableTypes = ["guess", "30sec", "5sec", "general", "team"] as any;
                    let currentTeamUsed = turn === 1 ? usedChallengesT1 : usedChallengesT2;
                    const teamColorBg = turn === 1 ? "bg-cyan-500 hover:bg-cyan-400" : "bg-rose-500 hover:bg-rose-400";
                    const teamTextColor = turn === 1 ? "text-cyan-600 dark:text-cyan-400" : "text-rose-600 dark:text-rose-400";
                    const teamName = turn === 1 ? team1Name : team2Name;

                    return (
                      <div className="animate-in fade-in py-4 flex flex-col items-center justify-center h-full">
                        <h3 className={`text-xl md:text-2xl font-black mb-8 ${teamTextColor}`}>اختر التحدي المناسب لفريق ({teamName}):</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full px-6">
                          {allAvailableTypes.map((cType: any) => {
                            const isUsed = currentTeamUsed.includes(cType);
                            return (
                              <button key={cType} onClick={() => { if (!isUsed) handleSelectChallenge(cType); }} disabled={isUsed} className={`py-4 rounded-2xl font-black text-lg border-4 transition-all shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] ${isUsed ? "bg-slate-200 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700 opacity-50 cursor-not-allowed" : `${teamColorBg} text-white border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1`}`}>
                                {getChallengeTitle(cType)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {battleStep === "challenge" && (
                    <div className="animate-in zoom-in-95 w-full flex flex-col items-center h-full p-4">
                      <Zap className="mx-auto text-purple-500 mb-3 animate-pulse w-10 h-10" strokeWidth={2.5} />
                      <p className="text-slate-500 font-black mb-4 bg-slate-100 dark:bg-slate-900 px-4 py-1.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm">{activeChallengeName}</p>

                      {(activeChallengeType === "30sec" || activeChallengeType === "5sec" || activeChallengeType === "team") && (
                        <div className="w-full flex flex-col gap-3 flex-1 justify-center">
                          {!isChallengeRevealed ? (
                            <button onClick={() => setIsChallengeRevealed(true)} className={`w-full py-5 text-white font-black text-2xl rounded-2xl shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] active:translate-y-1 border-4 border-slate-900 border-b-8 active:border-b-4 animate-pulse ${activeChallengeType === "30sec" ? "bg-blue-500" : activeChallengeType === "5sec" ? "bg-amber-500" : "bg-purple-500"}`}>
                              {activeChallengeType === "team" ? "عرض التحدي 🎭" : "عرض الموضوع 👀"}
                            </button>
                          ) : (
                            <div className="animate-in zoom-in fade-in duration-300 w-full flex flex-col h-full justify-between">
                              <div className="flex w-full justify-end items-start mb-3">
                                <button onClick={pickNewChallenge} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-4 py-2 rounded-xl text-sm font-black flex items-center gap-1.5 border-2 border-slate-300 dark:border-slate-600 border-b-4 active:border-b-2 active:translate-y-0.5 transition-all">
                                  <RefreshCw size={16} /> تغيير
                                </button>
                              </div>
                              <h3 className={`text-xl md:text-2xl font-black border-4 border-slate-900 dark:border-black rounded-2xl py-6 px-4 shadow-inner w-full leading-relaxed mb-4 ${activeChallengeType === "30sec" ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400" : activeChallengeType === "5sec" ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400" : "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400"}`}>
                                {activeChallengeType === "team" ? "التحدي: " : "الموضوع: "} {activeChallengeData?.q || activeChallengeData}
                              </h3>
                              <div className="flex flex-col gap-3 w-full">
                                {!isGenTimerRunning && genTimer === (activeChallengeType === "30sec" ? 30 : activeChallengeType === "5sec" ? 5 : activeChallengeData && typeof activeChallengeData === "string" && activeChallengeData.includes("ولا كلمة") ? 90 : 60) ? (
                                  <button onClick={() => { setIsGenTimerRunning(true); setTimerStarted(true); }} className="w-full bg-blue-500 hover:bg-blue-400 text-white font-black py-4 rounded-2xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 flex items-center justify-center gap-2 text-xl shadow-[4px_4px_0px_#0f172a] transition-all">
                                    <Clock size={24} strokeWidth={2.5} /> بدء المؤقت ({activeChallengeType === "30sec" ? "30" : activeChallengeType === "5sec" ? "5" : activeChallengeData && typeof activeChallengeData === "string" && activeChallengeData.includes("ولا كلمة") ? "90" : "60"} ثانية)
                                  </button>
                                ) : (
                                  <div className={`w-full font-mono text-5xl font-black py-4 rounded-2xl border-4 border-slate-900 dark:border-black tracking-widest text-center transition-colors shadow-inner ${genTimer <= 5 ? "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 animate-pulse" : "bg-slate-50 dark:bg-slate-900 text-amber-500 dark:text-amber-400"}`}>
                                    {formatTime(genTimer)}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <button onClick={cancelChallenge} className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-4 border-slate-300 dark:border-slate-700 border-b-8 active:border-b-4 active:translate-y-1 rounded-2xl py-3 mt-2 text-slate-600 dark:text-slate-300 font-black transition-all">
                            <Ban size={18} strokeWidth={2.5} /> تخطي الدورة
                          </button>
                        </div>
                      )}

                      {activeChallengeType === "general" && (
                        <div className="w-full mb-2 flex flex-col gap-3 flex-1 justify-center">
                          {!isChallengeRevealed ? (
                            <button onClick={() => setIsChallengeRevealed(true)} className="w-full py-5 text-slate-900 font-black text-2xl rounded-2xl shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] active:translate-y-1 bg-emerald-400 border-4 border-slate-900 border-b-8 active:border-b-4 animate-pulse">
                              عرض السؤال 📝
                            </button>
                          ) : (
                            <div className="animate-in zoom-in fade-in duration-300 flex flex-col w-full h-full justify-between">
                              <div className="flex w-full justify-end items-start mb-3">
                                <button onClick={pickNewChallenge} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-4 py-2 rounded-xl text-sm font-black flex items-center gap-1.5 border-2 border-slate-300 dark:border-slate-600 border-b-4 active:border-b-2 active:translate-y-0.5 transition-all">
                                  <RefreshCw size={16} /> تغيير
                                </button>
                              </div>
                              <h3 className="text-xl md:text-2xl font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-4 border-emerald-300 dark:border-emerald-800 rounded-2xl py-6 px-4 shadow-inner w-full mb-4 leading-relaxed">
                                {activeChallengeData?.q}
                              </h3>

                              {activeChallengeData?.options && activeChallengeData.options.length === 3 && (
                                <div className="grid grid-cols-1 gap-3 w-full mb-4">
                                  {activeChallengeData.options.map((opt: string, index: number) => {
                                    const isCorrect = showGenAnswer && opt === activeChallengeData.a;
                                    const isWrongSelected = showGenAnswer && opt === selectedOption && opt !== activeChallengeData.a;
                                    const isFaded = showGenAnswer && !isCorrect && !isWrongSelected;
                                    return (
                                      <button key={index} disabled={showGenAnswer} onClick={() => { setSelectedOption(opt); setShowGenAnswer(true); setIsGenTimerRunning(false); setTimerStarted(true); }} className={`flex items-center justify-center border-4 border-slate-900 dark:border-black rounded-2xl p-4 transition-all ${isCorrect ? "bg-emerald-400 text-slate-900 scale-[1.02] border-b-4" : isWrongSelected ? "bg-rose-500 text-white border-b-4" : isFaded ? "bg-slate-100 dark:bg-slate-800/50 opacity-50 text-slate-500 border-b-4" : "bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white border-b-8 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a]"}`}>
                                        <span className="text-lg font-black">{opt}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              {!showGenAnswer && (
                                <div className="flex flex-col gap-3 mb-4 w-full">
                                  {!isGenTimerRunning && genTimer === 15 ? (
                                    <button onClick={() => { setIsGenTimerRunning(true); setTimerStarted(true); }} className="w-full bg-blue-500 hover:bg-blue-400 text-white font-black py-4 rounded-2xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 flex items-center justify-center gap-2 text-xl shadow-[4px_4px_0px_#0f172a] transition-all">
                                      <Clock size={24} strokeWidth={2.5} /> بدء المؤقت (15 ثانية)
                                    </button>
                                  ) : (
                                    <div className={`w-full font-mono text-4xl font-black py-3 rounded-2xl border-4 border-slate-900 dark:border-black tracking-widest text-center shadow-inner ${genTimer <= 5 ? "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 animate-pulse" : "bg-slate-50 dark:bg-slate-900 text-amber-500 dark:text-amber-400"}`}>
                                      {formatTime(genTimer)}
                                    </div>
                                  )}
                                </div>
                              )}
                              {!activeChallengeData?.options && (showGenAnswer ? (
                                <div className="bg-emerald-100 dark:bg-emerald-900/50 border-4 border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-400 font-black text-2xl py-4 px-4 rounded-2xl mt-2 mb-4 shadow-inner">
                                  {activeChallengeData?.a}
                                </div>
                              ) : (
                                <button onClick={() => { setShowGenAnswer(true); setIsGenTimerRunning(false); setTimerStarted(true); }} className="w-full bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-black text-xl py-4 rounded-2xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 flex items-center justify-center gap-2 mb-4 shadow-[4px_4px_0px_#0f172a] hover:bg-slate-50 dark:hover:bg-slate-700">
                                  إظهار الإجابة <Search size={20} strokeWidth={3} />
                                </button>
                              ))}
                            </div>
                          )}
                          <button onClick={cancelChallenge} className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-4 border-slate-300 dark:border-slate-700 border-b-8 active:border-b-4 active:translate-y-1 rounded-2xl py-3 mt-2 text-slate-600 dark:text-slate-300 font-black transition-all">
                            <Ban size={18} strokeWidth={2.5} /> تخطي الدورة
                          </button>
                        </div>
                      )}

                      {activeChallengeType === "guess" && (
                        <div className="w-full mb-2 flex flex-col gap-3 flex-1 justify-center">
                          <div className="bg-slate-50 dark:bg-slate-900 border-4 border-slate-900 dark:border-black rounded-3xl p-5 shadow-inner">
                            <p className="text-center text-slate-500 dark:text-slate-400 font-black mb-4 text-sm bg-white dark:bg-slate-800 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                              اكتب التوقعات واكشفها لتحديد الفائز
                            </p>
                            <div className="flex gap-4 mb-5">
                              <div className="flex-1 relative">
                                <label className="block text-cyan-600 dark:text-cyan-400 font-black mb-2 text-sm text-center">{team1Name}</label>
                                <input type={guessesRevealed ? "text" : "tel"} value={guessT1} onChange={(e) => setGuessT1(e.target.value.replace(/[^0-9]/g, ""))} className={`w-full bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 rounded-2xl p-4 text-center text-2xl font-black outline-none focus:border-cyan-500 shadow-inner ${!guessesRevealed ? "text-transparent placeholder:text-slate-400 caret-slate-900 dark:caret-white" : "text-slate-900 dark:text-white"}`} placeholder="الرقم" />
                                {!guessesRevealed && guessT1 && <div className="absolute top-[42px] left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none text-cyan-500 text-xl font-black">{"★".repeat(guessT1.length)}</div>}
                              </div>
                              <div className="flex-1 relative">
                                <label className="block text-rose-600 dark:text-rose-400 font-black mb-2 text-sm text-center">{team2Name}</label>
                                <input type={guessesRevealed ? "text" : "tel"} value={guessT2} onChange={(e) => setGuessT2(e.target.value.replace(/[^0-9]/g, ""))} className={`w-full bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 rounded-2xl p-4 text-center text-2xl font-black outline-none focus:border-rose-500 shadow-inner ${!guessesRevealed ? "text-transparent placeholder:text-slate-400 caret-slate-900 dark:caret-white" : "text-slate-900 dark:text-white"}`} placeholder="الرقم" />
                                {!guessesRevealed && guessT2 && <div className="absolute top-[42px] left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none text-rose-500 text-xl font-black">{"★".repeat(guessT2.length)}</div>}
                              </div>
                            </div>
                            {!guessesRevealed ? (
                              <button onClick={() => setGuessesRevealed(true)} disabled={!guessT1 || !guessT2} className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-black text-lg rounded-2xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a] transition-all flex items-center justify-center gap-2">
                                <Eye size={20} strokeWidth={3} /> كشف الأرقام
                              </button>
                            ) : (
                              <div className="flex gap-3">
                                <button onClick={() => challengeSuccess(1)} className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-black text-sm rounded-xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a] flex items-center justify-center gap-2">
                                  <CheckCircle2 size={16} /> فاز {team1Name}
                                </button>
                                <button onClick={() => challengeSuccess(2)} className="flex-1 py-3 bg-rose-500 hover:bg-rose-400 text-white font-black text-sm rounded-xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a] flex items-center justify-center gap-2">
                                  <CheckCircle2 size={16} /> فاز {team2Name}
                                </button>
                              </div>
                            )}
                          </div>
                          <button onClick={cancelChallenge} className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-4 border-slate-300 dark:border-slate-700 border-b-8 active:border-b-4 active:translate-y-1 rounded-2xl py-3 mt-2 text-slate-600 dark:text-slate-300 font-black transition-all">
                            <Ban size={18} strokeWidth={2.5} /> تخطي الدورة
                          </button>
                        </div>
                      )}

                      {activeChallengeType !== "guess" && (!(activeChallengeType === "30sec" || activeChallengeType === "5sec" || activeChallengeType === "general" || activeChallengeType === "team") || isChallengeRevealed) && (
                        <div className="flex gap-3 w-full mt-4">
                          <button onClick={() => challengeSuccess()} className="flex-1 flex flex-col items-center justify-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-slate-900 border-4 border-slate-900 dark:border-black border-b-8 rounded-2xl py-4 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a] transition-all">
                            <CheckCircle2 className="w-8 h-8" strokeWidth={2.5} /> <span className="text-sm font-black">فوز - هجوم</span>
                          </button>
                          <button onClick={challengeFail} className="flex-1 flex flex-col items-center justify-center gap-2 bg-rose-500 hover:bg-rose-400 text-white border-4 border-slate-900 dark:border-black border-b-8 rounded-2xl py-4 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a] transition-all">
                            <Skull className="w-8 h-8" strokeWidth={2.5} /> <span className="text-sm font-black">خسارة - عكسي</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {battleStep === "target" && (
                    <div className="animate-in slide-in-from-bottom-4 flex flex-col items-center justify-center h-full py-6">
                      <Crosshair className="mx-auto text-rose-600 dark:text-rose-500 mb-4 animate-spin-slow w-16 h-16" strokeWidth={2.5} />
                      <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4">حدد هدفك الآن!</h3>
                      <p className="text-base text-slate-600 dark:text-slate-400 font-bold mb-8 bg-slate-100 dark:bg-slate-900 px-6 py-3 rounded-2xl border-4 border-slate-200 dark:border-slate-800">
                        اضغط على نافذة في <span className={`font-black ${attackingTeam === 1 ? "text-rose-600 dark:text-rose-400" : "text-cyan-600 dark:text-cyan-400"}`}>قلعة العدو</span> للقصف!
                      </p>

                      <button onClick={useSpy} disabled={(attackingTeam === 1 && spyUsed1) || (attackingTeam === 2 && spyUsed2)} className={`w-full py-4 rounded-2xl text-lg font-black flex items-center justify-center gap-2 transition-all border-4 shadow-[4px_4px_0px_#0f172a] ${(attackingTeam === 1 && !spyUsed1) || (attackingTeam === 2 && !spyUsed2) ? "bg-amber-400 hover:bg-amber-300 text-slate-900 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1" : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-300 dark:border-slate-700 border-b-4 cursor-not-allowed"}`}>
                        {(attackingTeam === 1 && spyUsed1) || (attackingTeam === 2 && spyUsed2) ? <Lock className="w-5 h-5" strokeWidth={3} /> : <Eye className="w-5 h-5" strokeWidth={3} />}
                        <span>{(attackingTeam === 1 && spyUsed1) || (attackingTeam === 2 && spyUsed2) ? "تم الاستخدام" : "استخدام الجاسوس"}</span>
                      </button>

                      <button onClick={() => setAttackingTeam((prev) => (prev === 1 ? 2 : 1))} className="mt-6 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl font-black text-sm transition-all border-2 border-slate-300 dark:border-slate-700 border-b-4 active:border-b-2 active:translate-y-0.5">
                        <RefreshCw size={16} strokeWidth={2.5} /> تصحيح الفائز (تبديل الهجوم)
                      </button>
                    </div>
                  )}

                  {battleStep === "trapChoice" && (
                    <div className="animate-in zoom-in w-full flex flex-col items-center justify-center h-full py-4 px-4">
                      <Bomb className="mx-auto text-purple-600 dark:text-purple-400 mb-4 animate-pulse w-20 h-20" strokeWidth={2.5} />
                      <h3 className="text-4xl font-black text-purple-700 dark:text-purple-400 mb-4">وقع في الفخ! 🪤</h3>
                      <p className="text-slate-700 dark:text-slate-300 font-black mb-8 bg-purple-50 dark:bg-purple-900/30 px-6 py-3 rounded-2xl border-4 border-purple-200 dark:border-purple-800 text-lg">
                        يا فريق ({attackingTeam === 1 ? team2Name : team1Name}) اختر مصيرهم:
                      </p>
                      <div className="flex flex-col md:flex-row gap-4 w-full">
                        <button onClick={() => resolveTrap("capture")} className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white py-5 rounded-2xl font-black text-xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a] transition-all">
                          أسر 20 جندي
                        </button>
                        <button onClick={() => resolveTrap("kill")} className="flex-1 bg-rose-500 hover:bg-rose-400 text-white py-5 rounded-2xl font-black text-xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a] transition-all">
                          قتل 20 جندي
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {gameState === "gameOver" && (
              <div className={`${cardClass} w-full text-center animate-in zoom-in-95 flex flex-col justify-center items-center p-8`}>
                <div className="w-32 h-32 bg-amber-100 dark:bg-amber-900/40 rounded-[2rem] flex items-center justify-center border-4 border-amber-400 dark:border-amber-600 shadow-inner mb-6">
                  <Crown className="text-amber-500 w-16 h-16 animate-bounce" strokeWidth={2.5} />
                </div>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-3">انتهت الحرب!</h2>
                <p className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-6 bg-slate-100 dark:bg-slate-900 px-6 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700">الفريق المنتصر</p>
                <span className={`font-black text-5xl block mb-10 drop-shadow-sm ${hp1 > 0 ? "text-cyan-500" : "text-rose-500"}`}>
                  {hp1 > 0 ? team1Name : team2Name}
                </span>
                <button onClick={() => window.location.reload()} className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-2xl font-black rounded-2xl border-4 border-slate-900 dark:border-white border-b-8 active:border-b-4 active:translate-y-1 shadow-[6px_6px_0px_#cbd5e1] dark:shadow-[6px_6px_0px_#000] transition-all">
                  تحدي جديد 🚀
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 flex flex-col w-full h-full">
            <div className="flex flex-col items-center z-10 mb-4 w-full">
              <div className="bg-rose-500 border-4 border-slate-900 dark:border-black border-b-8 text-white font-black text-xl md:text-2xl py-3 px-6 rounded-2xl shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] w-[85%] text-center -mb-4 z-10">
                {team2Name}
              </div>
              <div className="bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-black text-rose-600 dark:text-rose-400 font-black text-xl py-4 px-4 rounded-3xl shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] w-[65%] text-center pt-6 flex items-center justify-center gap-2">
                {hp2} / {TOTAL_SOLDIERS} <span className="text-sm text-slate-500 font-bold">جندي</span>
              </div>
            </div>
            <div className="flex-1 w-full max-w-[600px] mx-auto mt-2">
              <InteractiveCastle
                isTeam1Castle={false}
                revealed={revealed2}
                teamData={team2Data}
                isSpiedTarget={spiedTarget1}
                gameState={gameState}
                attackingTeam={attackingTeam}
                battleStep={battleStep}
                targetRoomIndex={targetRoomIndex}
                executeAttack={executeAttack}
              />
            </div>
          </div>
        </div>
      </div>

      {gameState === "playing" && battleStep === "result" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 pointer-events-auto px-4">
          <div className={`flex flex-col items-center justify-center p-8 md:p-14 w-full max-w-3xl rounded-[3rem] border-8 shadow-[20px_20px_0px_#000] animate-in zoom-in-95 duration-300 ${resultType === "spy" ? "bg-yellow-400 border-yellow-600" : "bg-white dark:bg-slate-800 border-slate-900 dark:border-black"}`}>
            <div className={`w-28 h-28 rounded-full flex items-center justify-center mb-8 shadow-inner border-8 ${resultType === "spy" ? "border-yellow-500 bg-yellow-300" : "border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"}`}>
              {resultType === "hit" && <CheckCircle2 className="text-emerald-500 w-14 h-14" strokeWidth={3} />}
              {resultType === "miss" && <Shield className="text-slate-400 dark:text-slate-500 w-14 h-14" fill="none" strokeWidth={3} />}
              {resultType === "trap" && <Bomb className="text-purple-600 dark:text-purple-400 animate-screen-shake w-14 h-14" strokeWidth={3} />}
              {resultType === "commander" && <Crown className="text-amber-500 animate-pulse w-14 h-14" strokeWidth={3} />}
              {resultType === "spy" && <Eye className="text-slate-900 animate-pulse w-14 h-14" strokeWidth={3} />}
            </div>
            <h3 className={`text-2xl md:text-4xl font-black mb-10 px-6 leading-relaxed py-8 rounded-2xl border-4 w-full text-center shadow-inner ${resultType === "spy" ? "bg-yellow-300 border-yellow-500 text-slate-900" : resultType === "hit" ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400" : resultType === "trap" ? "bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400" : resultType === "commander" ? "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"}`}>
              {resultMsg}
            </h3>
            <button onClick={nextTurn} className={`w-full py-6 text-2xl font-black rounded-2xl border-4 border-b-8 active:border-b-4 active:translate-y-1 shadow-[6px_6px_0px_#000] flex items-center justify-center gap-3 transition-all ${resultType === "spy" ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800" : "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-white"}`}>
              <Swords className="w-8 h-8" strokeWidth={2.5} /> <span>إنهاء الدور والتالي</span>
            </button>
          </div>
        </div>
      )}
      {showEndGameModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 border-8 border-slate-900 dark:border-black rounded-[3rem] p-8 max-w-md w-full shadow-[16px_16px_0px_#0f172a] dark:shadow-[16px_16px_0px_#000] text-center animate-in zoom-in-95 duration-300">
            <div className="mx-auto w-24 h-24 bg-rose-100 dark:bg-rose-900/40 border-4 border-rose-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Ban className="w-12 h-12 text-rose-600 dark:text-rose-400 animate-pulse" strokeWidth={3} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 leading-tight">إنهاء اللعبة؟</h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold mb-8 text-lg">
              هل أنت متأكد من رغبتك في إنهاء الحرب الآن؟ سيتم إعلان النتيجة فوراً ولن تتمكن من التراجع.
            </p>
            <div className="flex gap-4">
              <button onClick={() => { setShowEndGameModal(false); endGame(); }} className="flex-1 py-4 bg-rose-500 hover:bg-rose-400 text-white font-black text-xl rounded-2xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] transition-all">
                إنهاء اللعبة
              </button>
              <button onClick={() => setShowEndGameModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-black text-xl rounded-2xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] transition-all">
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}