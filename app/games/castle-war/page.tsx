/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import Link from "next/link";
import { Cairo } from "next/font/google";
import {
  Shield, Crown, CheckCircle2, Crosshair, Swords, Zap, Volume2,
  VolumeX, Flame, Eye, Lock, Skull, Clock, RefreshCw, Search, Ban, Copy,
  MonitorPlay, ArrowRight, Home, Info, QrCode
} from "lucide-react";

import InteractiveCastle from "@/components/games/castle-war/InteractiveCastle";
import CastleReveal, { useCastleReveal } from "@/components/games/castle-war/CastleReveal";
import CastleIcon from "@/components/games/castle-war/CastleIcon";
import CastleWarSetup from "@/components/games/castle-war/CastleWarSetup";
import {
  BACKDROP, BAR, BAR_DANGER, BAR_TIGHT, BTN_DANGER_LINE, BTN_DARK, BTN_GOLD, BTN_SOFT, INSET, MODAL, PANEL,
  TEAM1_HP, TEAM1_NAME, TEAM1_WIN, TEAM2_HP, TEAM2_NAME, TEAM2_WIN, timerTone,
} from "@/components/games/castle-war/castleUi";
import { useCastleWar, getSavedCastleRoom, resumeCastleRoom, TOTAL_SOLDIERS } from "@/hooks/useCastleWar";
import { freshLiveGame } from "@/lib/live-game";
import { useSingleTab } from "@/hooks/shared/useSingleTab";
import OtherTabScreen from "@/components/games/shared/OtherTabScreen";

import AccessLoadingScreen from "@/components/games/shared/AccessLoadingScreen";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

const noopSubscribe = () => () => {};

/**
 * فيه غرفة في هذا التبويب: اللعبة مباشرة (وهذا اللي يصير بعد التحديث).
 * ما فيه بس فيه حرب سكّر تبويبها قبل أقل من 10 دقايق: ترجع نفسها هنا (resumeCastleRoom).
 * غير كذا: صفحة الإعداد، وهوك اللعبة ما يشتغل أصلاً لين تنشأ الغرفة.
 */
export default function CastleWarPage() {
  // الغرفة محفوظة في المتصفح والسيرفر ما يعرفها، فنعرض التحميل لين نوصل للمتصفح
  const mounted = React.useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [hasRoom, setHasRoom] = React.useState(() => getSavedCastleRoom() !== null);
  const [resuming, setResuming] = React.useState(() => getSavedCastleRoom() === null && freshLiveGame("castle-war") !== null);

  React.useEffect(() => {
    if (!resuming) return;
    resumeCastleRoom().then((resumed) => {
      if (resumed) setHasRoom(true);
      setResuming(false);
    });
  }, [resuming]);

  if (!mounted || resuming) return <div className="dark"><AccessLoadingScreen /></div>;
  return hasRoom ? <CastleBattleTab /> : <CastleWarSetup onCreated={() => setHasRoom(true)} />;
}

/** تبويب واحد يتحكم بالحرب: لو انفتحت نفس الغرفة بتبويب ثاني، هذا يوقف ويشيل الحرب كلها لين يرجع التحكم له */
function CastleBattleTab() {
  const [room] = React.useState(() => getSavedCastleRoom());
  const { active, takeOver } = useSingleTab("castle-war", room);
  return active ? <CastleBattleMainScreen /> : <OtherTabScreen onTakeOver={takeOver} />;
}

function CastleBattleMainScreen() {
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
    challengeSuccess, challengeFail, useSpy, executeAttack, resolveTrap, nextTurn, isAccessChecking, endGame, resetGame
  } = useCastleWar();

  const cardClass = PANEL;
  const [showEndGameModal, setShowEndGameModal] = React.useState(false);
  const [showResetModal, setShowResetModal] = React.useState(false);
  const [showQRModal, setShowQRModal] = React.useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = React.useState(false);
  // عرض بس: الكشف فوق اللعبة، وصناديق النتيجة ولوحة الفخ تطلع بعد ما يخلص
  const reveal = useCastleReveal({ enabled: !isLoading && !isAccessChecking, battleStep, resultType, attackingTeam, hp1, hp2 });

  if (isAccessChecking) {
    return <div className="dark"><AccessLoadingScreen /></div>;
  }

  if (isLoading) {
    return (
      <div className="dark min-h-[100dvh] flex flex-col items-center justify-center text-white font-black text-2xl" dir="rtl">
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
    // dark: مثل المافيا، داكنة دايماً حتى لو الموقع على الوضع النهاري، بدون ما نغيّر اختيار المستخدم
    <main
      className={`dark text-ludn-fg min-h-[100dvh] relative flex flex-col pt-8 md:pt-12 pb-8 px-2 md:px-4 ${cairo.className} overflow-x-hidden ${screenShake ? "animate-screen-shake" : ""} transition-colors duration-500`}
      dir="rtl"
    >


      <CastleReveal reveal={reveal} />

      {showQRModal && (
        <div className={`fixed inset-0 z-[2000] flex items-center justify-center p-4 ${BACKDROP} animate-in fade-in`}>
           <div className={`${MODAL} p-8 max-w-sm w-full text-center animate-in zoom-in-95`}>
              <h2 className="font-display text-[27px] leading-tight text-ludn-fg mb-6">امسح الباركود للدخول</h2>
              <div className="bg-white p-4 rounded-2xl mx-auto w-fit mb-6">
                {roomCode && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`} alt="QR" className="w-48 h-48" />}
              </div>
              <p className="font-display text-[34px] leading-none tracking-[0.22em] text-ludn-gold-text mb-8 uppercase">{roomCode}</p>
              <button onClick={() => setShowQRModal(false)} className={BTN_DARK}>
                 إغلاق
              </button>
           </div>
        </div>
      )}

      <div className="relative z-20 w-full max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-6 px-2 md:px-0 gap-4 mt-4">
        <div className="flex flex-wrap gap-2 items-center justify-center w-full md:w-auto">
          <Link href="/" className={BAR}>
            <ArrowRight size={18} strokeWidth={3} /> <span className="hidden sm:inline">الرجوع</span>
          </Link>
          <Link href="/" className={BAR}>
            <Home size={18} strokeWidth={3} /> <span className="hidden sm:inline">الرئيسية</span>
          </Link>
          <button onClick={() => setShowInstructionsModal(true)} className={BAR}>
            <Info size={18} strokeWidth={3} /> <span className="hidden sm:inline">التعليمات</span>
          </button>
          <button onClick={() => window.open(`/games/castle-war/display?code=${roomCode}`, "_blank")} className={BAR}>
            <MonitorPlay size={16} /> <span className="hidden sm:inline">شاشة الجمهور 📺</span>
          </button>

          <button onClick={() => setShowResetModal(true)} className={BAR_DANGER}>
            <RefreshCw size={18} strokeWidth={3} /> <span className="hidden sm:inline">تصفير اللعبة</span>
          </button>
          {gameState === "playing" && (
            <button onClick={() => setShowEndGameModal(true)} className={BAR_DANGER}>
              <Ban size={18} strokeWidth={3} /> <span className="hidden sm:inline">إنهاء اللعبة</span>
            </button>
          )}
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => setSoundEnabled(!soundEnabled)} className={BAR_TIGHT}>
            {soundEnabled ? <><Volume2 size={16} /> <span className="hidden sm:inline">الصوت شغال</span></> : <><VolumeX size={16} /> <span className="hidden sm:inline">مكتوم</span></>}
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 w-full max-w-7xl mx-auto flex flex-col pb-6 px-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
          
          <div className="lg:col-span-4 flex flex-col w-full h-full">
            <div className="flex flex-col items-center z-10 mb-4 w-full">
              <div className={TEAM1_NAME}>
                {team1Name}
              </div>
              <div className={TEAM1_HP}>
                {hp1} / {TOTAL_SOLDIERS} <span className="text-sm text-ludn-muted">جندي</span>
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
                <h1 className="font-display text-[27px] md:text-[32px] leading-tight text-ludn-fg mb-2 flex items-center justify-center gap-2">
                  <Swords className="text-rose-500 w-8 h-8" strokeWidth={2.5} /> غرفة تجهيز الجيوش
                </h1>
                <p className="text-ludn-muted font-bold mb-6 text-sm leading-relaxed border-b border-ludn-line pb-4">
                  أدخل الكود في جوالك لتوزيع جنودك بسرية تامة.
                </p>



                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-6">
                  <div className={`p-4 rounded-2xl border transition-all flex flex-col items-center ${team1Ready ? "bg-emerald-500/10 border-emerald-400/50" : "bg-ludn-surface-2 border-ludn-line"}`}>
                    <input type="text" value={team1Name} onChange={(e) => updateTeamNameLocally(1, e.target.value)} className={`text-lg font-black mb-2 text-center bg-transparent border-b border-dashed outline-none w-full transition-colors ${team1Ready ? "text-emerald-300 border-emerald-400/50" : "text-ludn-fg border-white/20"}`} />
                    {team1Ready ? <div className="flex items-center gap-1.5 text-emerald-300 font-black text-sm animate-pulse bg-emerald-500/15 px-3 py-1 rounded-lg border border-emerald-400/40"><CheckCircle2 size={16} /> جاهز!</div> : <div className="flex items-center gap-1.5 text-ludn-muted font-bold text-xs"><Clock size={14} className="animate-spin-slow" /> بانتظار التوزيع...</div>}
                  </div>
                  <div className={`p-4 rounded-2xl border transition-all flex flex-col items-center ${team2Ready ? "bg-emerald-500/10 border-emerald-400/50" : "bg-ludn-surface-2 border-ludn-line"}`}>
                    <input type="text" value={team2Name} onChange={(e) => updateTeamNameLocally(2, e.target.value)} className={`text-lg font-black mb-2 text-center bg-transparent border-b border-dashed outline-none w-full transition-colors ${team2Ready ? "text-emerald-300 border-emerald-400/50" : "text-ludn-fg border-white/20"}`} />
                    {team2Ready ? <div className="flex items-center gap-1.5 text-emerald-300 font-black text-sm animate-pulse bg-emerald-500/15 px-3 py-1 rounded-lg border border-emerald-400/40"><CheckCircle2 size={16} /> جاهز!</div> : <div className="flex items-center gap-1.5 text-ludn-muted font-bold text-xs"><Clock size={14} className="animate-spin-slow" /> بانتظار التوزيع...</div>}
                  </div>
                </div>

                <button onClick={startBattle} disabled={!(team1Ready && team2Ready)} className={`${BTN_GOLD} ${team1Ready && team2Ready ? "animate-pulse" : ""}`}>
                  بدء الحرب! <Flame size={24} className="fill-current" />
                </button>
              </div>
            )}

            {gameState === "lobby" && (
              <div className="flex flex-wrap justify-center gap-3 mt-2 w-full animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="bg-ludn-surface-2 border border-ludn-line px-4 py-2 rounded-xl text-sm font-black text-ludn-fg tracking-widest font-mono flex items-center gap-2">
                   <span className="text-ludn-muted text-xs">كود الغرفة:</span> {roomCode}
                </div>
                <button onClick={copyToClipboard} className={`py-2 px-4 rounded-xl font-black text-sm transition-colors border flex items-center gap-2 ${linkCopied ? "bg-emerald-500/15 border-emerald-400/50 text-emerald-300" : "bg-ludn-surface-2 border-ludn-line text-ludn-fg hover:border-white/20"}`}>
                  {linkCopied ? <CheckCircle2 size={18} strokeWidth={3} /> : <Copy size={18} strokeWidth={3} />} <span>{linkCopied ? "تم النسخ" : "نسخ الرابط"}</span>
                </button>
                <button onClick={() => setShowQRModal(true)} className="py-2 px-4 rounded-xl font-black text-sm transition-colors border flex items-center gap-2 bg-ludn-surface-2 border-ludn-line text-ludn-fg hover:border-white/20">
                  <QrCode size={18} strokeWidth={3} /> <span>عرض الباركود</span>
                </button>
              </div>
            )}

            {gameState === "playing" && (
              <>
                <div className={`w-full ${PANEL} p-4 flex flex-col items-center justify-center gap-2 relative`}>
                  <div className={`flex items-center gap-2 ${INSET} px-4 py-1.5`}>
                    <Swords className={`w-5 h-5 transition-colors ${attackingTeam === 1 ? "text-cyan-300" : "text-rose-300"}`} />
                    <span className="text-sm font-black text-ludn-muted">دور الهجوم:</span>
                  </div>
                  <span className={`font-display text-[32px] leading-tight transition-colors ${INSET} w-full py-2 text-center ${attackingTeam === 1 ? "text-cyan-300" : "text-rose-300"}`}>
                    {attackingTeam === 1 ? team1Name : team2Name}
                  </span>
                  {attackingTeam !== turn && battleStep !== "roll" && battleStep !== "challenge" && (
                    <span className="text-xs font-black text-rose-300 animate-pulse bg-rose-500/10 px-3 py-1 rounded-lg border border-rose-500/40 mt-1">(عكسي)</span>
                  )}
                </div>

                <div className={`${cardClass} w-full text-center relative overflow-y-auto custom-scroll flex-1 flex flex-col justify-center min-h-[300px]`}>
                  {battleStep === "roll" && (() => {
                    let allAvailableTypes = ["guess", "30sec", "5sec", "general", "team"] as any;
                    let currentTeamUsed = turn === 1 ? usedChallengesT1 : usedChallengesT2;
                    const teamColorBg = turn === 1 ? "border-cyan-400/50 text-cyan-200 hover:border-cyan-300 hover:bg-cyan-500/10" : "border-rose-400/50 text-rose-200 hover:border-rose-300 hover:bg-rose-500/10";
                    const teamTextColor = turn === 1 ? "text-cyan-300" : "text-rose-300";
                    const teamName = turn === 1 ? team1Name : team2Name;

                    return (
                      <div className="animate-in fade-in py-4 flex flex-col items-center justify-center h-full">
                        <h3 className={`text-xl md:text-2xl font-black mb-8 ${teamTextColor}`}>اختر التحدي المناسب لفريق ({teamName}):</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full px-6">
                          {allAvailableTypes.map((cType: any) => {
                            const isUsed = currentTeamUsed.includes(cType);
                            return (
                              <button key={cType} onClick={() => { if (!isUsed) handleSelectChallenge(cType); }} disabled={isUsed} className={`py-4 rounded-2xl font-black text-lg border transition-all ${isUsed ? "bg-ludn-surface-2 text-ludn-muted border-ludn-line cursor-not-allowed" :`bg-ludn-surface-2 active:scale-[0.98] ${teamColorBg}`}`}>
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
                      <Zap className="mx-auto text-ludn-gold mb-3 animate-pulse w-10 h-10" strokeWidth={2.5} />
                      <p className={`text-ludn-muted font-black mb-4 ${INSET} px-4 py-1.5 text-sm`}>{activeChallengeName}</p>

                      {(activeChallengeType === "30sec" || activeChallengeType === "5sec" || activeChallengeType === "team") && (
                        <div className="w-full flex flex-col gap-3 flex-1 justify-center">
                          {!isChallengeRevealed ? (
                            <button onClick={() => setIsChallengeRevealed(true)} className={`${BTN_GOLD} animate-pulse`}>
                              {activeChallengeType === "team" ? "عرض التحدي 🎭" : "عرض الموضوع 👀"}
                            </button>
                          ) : (
                            <div className="animate-in zoom-in fade-in duration-300 w-full flex flex-col h-full justify-between">
                              <div className="flex w-full justify-end items-start mb-3">
                                <button onClick={pickNewChallenge} className={BTN_SOFT}>
                                  <RefreshCw size={16} /> تغيير
                                </button>
                              </div>
                              <h3 className={`text-xl md:text-2xl font-black border rounded-2xl py-6 px-4 w-full leading-relaxed mb-4 ${activeChallengeType === "30sec" ? "bg-blue-500/10 border-blue-400/40 text-blue-200" : activeChallengeType === "5sec" ? "bg-amber-500/10 border-amber-400/40 text-amber-200" : "bg-purple-500/10 border-purple-400/40 text-purple-200"}`}>
                                {activeChallengeType === "team" ? "التحدي: " : "الموضوع: "} {activeChallengeData?.q || activeChallengeData}
                              </h3>
                              <div className="flex flex-col gap-3 w-full">
                                {!isGenTimerRunning && genTimer === (activeChallengeType === "30sec" ? 30 : activeChallengeType === "5sec" ? 5 : activeChallengeData && typeof activeChallengeData === "string" && activeChallengeData.includes("ولا كلمة") ? 90 : 60) ? (
                                  <button onClick={() => { setIsGenTimerRunning(true); setTimerStarted(true); }} className={BTN_GOLD}>
                                    <Clock size={24} strokeWidth={2.5} /> بدء المؤقت ({activeChallengeType === "30sec" ? "30" : activeChallengeType === "5sec" ? "5" : activeChallengeData && typeof activeChallengeData === "string" && activeChallengeData.includes("ولا كلمة") ? "90" : "60"} ثانية)
                                  </button>
                                ) : (
                                  <div className={`w-full font-mono text-5xl font-black py-4 rounded-2xl border tracking-widest text-center transition-colors ${timerTone(genTimer)}`}>
                                    {formatTime(genTimer)}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <button onClick={cancelChallenge} className={`${BTN_SOFT} w-full mt-2`}>
                            <Ban size={18} strokeWidth={2.5} /> تخطي الدورة
                          </button>
                        </div>
                      )}

                      {activeChallengeType === "general" && (
                        <div className="w-full mb-2 flex flex-col gap-3 flex-1 justify-center">
                          {!isChallengeRevealed ? (
                            <button onClick={() => setIsChallengeRevealed(true)} className={`${BTN_GOLD} animate-pulse`}>
                              عرض السؤال 📝
                            </button>
                          ) : (
                            <div className="animate-in zoom-in fade-in duration-300 flex flex-col w-full h-full justify-between">
                              <div className="flex w-full justify-end items-start mb-3">
                                <button onClick={pickNewChallenge} className={BTN_SOFT}>
                                  <RefreshCw size={16} /> تغيير
                                </button>
                              </div>
                              <h3 className="text-xl md:text-2xl font-black text-emerald-200 bg-emerald-500/10 border border-emerald-400/40 rounded-2xl py-6 px-4 w-full mb-4 leading-relaxed">
                                {activeChallengeData?.q}
                              </h3>

                              {activeChallengeData?.options && activeChallengeData.options.length === 3 && (
                                <div className="grid grid-cols-1 gap-3 w-full mb-4">
                                  {activeChallengeData.options.map((opt: string, index: number) => {
                                    const isCorrect = showGenAnswer && opt === activeChallengeData.a;
                                    const isWrongSelected = showGenAnswer && opt === selectedOption && opt !== activeChallengeData.a;
                                    const isFaded = showGenAnswer && !isCorrect && !isWrongSelected;
                                    return (
                                      <button key={index} disabled={showGenAnswer} onClick={() => { setSelectedOption(opt); setShowGenAnswer(true); setIsGenTimerRunning(false); setTimerStarted(true); }} className={`flex items-center justify-center border rounded-2xl p-4 transition-all ${isCorrect ? "bg-emerald-500/20 border-emerald-400 text-emerald-200 scale-[1.02]" : isWrongSelected ? "bg-rose-500/20 border-rose-400 text-rose-200" : isFaded ? "bg-ludn-surface-2 border-ludn-line text-ludn-muted" :"bg-ludn-surface-2 border-ludn-line text-ludn-fg hover:border-white/20 active:scale-[0.98]"}`}>
                                        <span className="text-lg font-black">{opt}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              {!showGenAnswer && (
                                <div className="flex flex-col gap-3 mb-4 w-full">
                                  {!isGenTimerRunning && genTimer === 15 ? (
                                    <button onClick={() => { setIsGenTimerRunning(true); setTimerStarted(true); }} className={BTN_GOLD}>
                                      <Clock size={24} strokeWidth={2.5} /> بدء المؤقت (15 ثانية)
                                    </button>
                                  ) : (
                                    <div className={`w-full font-mono text-4xl font-black py-3 rounded-2xl border tracking-widest text-center ${timerTone(genTimer)}`}>
                                      {formatTime(genTimer)}
                                    </div>
                                  )}
                                </div>
                              )}
                              {!activeChallengeData?.options && (showGenAnswer ? (
                                <div className="bg-emerald-500/15 border border-emerald-400/50 text-emerald-200 font-black text-2xl py-4 px-4 rounded-2xl mt-2 mb-4">
                                  {activeChallengeData?.a}
                                </div>
                              ) : (
                                <button onClick={() => { setShowGenAnswer(true); setIsGenTimerRunning(false); setTimerStarted(true); }} className={`${BTN_DARK} mb-4`}>
                                  إظهار الإجابة <Search size={20} strokeWidth={3} />
                                </button>
                              ))}
                            </div>
                          )}
                          <button onClick={cancelChallenge} className={`${BTN_SOFT} w-full mt-2`}>
                            <Ban size={18} strokeWidth={2.5} /> تخطي الدورة
                          </button>
                        </div>
                      )}

                      {activeChallengeType === "guess" && (
                        <div className="w-full mb-2 flex flex-col gap-3 flex-1 justify-center">
                          <div className={`${INSET} p-5`}>
                            <p className="text-center text-ludn-muted font-black mb-4 text-sm bg-ludn-surface py-2 rounded-xl border border-ludn-line">
                              اكتب التوقعات واكشفها لتحديد الفائز
                            </p>
                            <div className="flex gap-4 mb-5">
                              <div className="flex-1 relative">
                                <label className="block text-cyan-300 font-black mb-2 text-sm text-center">{team1Name}</label>
                                <input type={guessesRevealed ? "text" : "tel"} value={guessT1} onChange={(e) => setGuessT1(e.target.value.replace(/[^0-9]/g, ""))} className={`w-full bg-ludn-surface border border-ludn-line rounded-2xl p-4 text-center text-2xl font-black outline-none transition-colors focus:border-cyan-400 ${!guessesRevealed ? "text-transparent placeholder:text-ludn-muted caret-white" : "text-ludn-fg"}`} placeholder="الرقم" />
                                {!guessesRevealed && guessT1 && <div className="absolute top-[42px] left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none text-cyan-300 text-xl font-black">{"★".repeat(guessT1.length)}</div>}
                              </div>
                              <div className="flex-1 relative">
                                <label className="block text-rose-300 font-black mb-2 text-sm text-center">{team2Name}</label>
                                <input type={guessesRevealed ? "text" : "tel"} value={guessT2} onChange={(e) => setGuessT2(e.target.value.replace(/[^0-9]/g, ""))} className={`w-full bg-ludn-surface border border-ludn-line rounded-2xl p-4 text-center text-2xl font-black outline-none transition-colors focus:border-rose-400 ${!guessesRevealed ? "text-transparent placeholder:text-ludn-muted caret-white" : "text-ludn-fg"}`} placeholder="الرقم" />
                                {!guessesRevealed && guessT2 && <div className="absolute top-[42px] left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none text-rose-300 text-xl font-black">{"★".repeat(guessT2.length)}</div>}
                              </div>
                            </div>
                            {!guessesRevealed ? (
                              <button onClick={() => setGuessesRevealed(true)} disabled={!guessT1 || !guessT2} className={BTN_GOLD}>
                                <Eye size={20} strokeWidth={3} /> كشف الأرقام
                              </button>
                            ) : (
                              <div className="flex gap-3">
                                <button onClick={() => challengeSuccess(1)} className={TEAM1_WIN}>
                                  <CheckCircle2 size={16} /> فاز {team1Name}
                                </button>
                                <button onClick={() => challengeSuccess(2)} className={TEAM2_WIN}>
                                  <CheckCircle2 size={16} /> فاز {team2Name}
                                </button>
                              </div>
                            )}
                          </div>
                          <button onClick={cancelChallenge} className={`${BTN_SOFT} w-full mt-2`}>
                            <Ban size={18} strokeWidth={2.5} /> تخطي الدورة
                          </button>
                        </div>
                      )}

                      {activeChallengeType !== "guess" && (!(activeChallengeType === "30sec" || activeChallengeType === "5sec" || activeChallengeType === "general" || activeChallengeType === "team") || isChallengeRevealed) && (
                        <div className="flex gap-3 w-full mt-4">
                          <button onClick={() => challengeSuccess()} className={`${BTN_GOLD} flex-1 flex-col py-4`}>
                            <CheckCircle2 className="w-8 h-8" strokeWidth={2.5} /> <span className="text-sm font-black">فوز - هجوم</span>
                          </button>
                          <button onClick={challengeFail} className={`${BTN_DANGER_LINE} flex-1 flex-col py-4`}>
                            <Skull className="w-8 h-8" strokeWidth={2.5} /> <span className="text-sm font-black">خسارة - عكسي</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {battleStep === "target" && (
                    <div className="animate-in slide-in-from-bottom-4 flex flex-col items-center justify-center h-full py-6 px-4">
                      <Crosshair className="mx-auto text-rose-400 mb-4 animate-spin-slow w-16 h-16" strokeWidth={2.5} />
                      <h3 className="font-display text-[32px] leading-tight text-ludn-fg mb-4">حدد هدفك الآن!</h3>
                      <p className={`text-base text-ludn-muted font-bold mb-8 ${INSET} px-6 py-3`}>
                        اضغط على نافذة في <span className={`font-black ${attackingTeam === 1 ? "text-rose-300" : "text-cyan-300"}`}>قلعة العدو</span> للقصف!
                      </p>

                      <button onClick={useSpy} disabled={(attackingTeam === 1 && spyUsed1) || (attackingTeam === 2 && spyUsed2)} className={BTN_GOLD}>
                        {(attackingTeam === 1 && spyUsed1) || (attackingTeam === 2 && spyUsed2) ? <Lock className="w-5 h-5" strokeWidth={3} /> : <CastleIcon kind="spy" />}
                        <span>{(attackingTeam === 1 && spyUsed1) || (attackingTeam === 2 && spyUsed2) ? "تم الاستخدام" : "استخدام الجاسوس"}</span>
                      </button>

                      <button onClick={() => setAttackingTeam((prev) => (prev === 1 ? 2 : 1))} className={`${BTN_SOFT} mt-6`}>
                        <RefreshCw size={16} strokeWidth={2.5} /> تصحيح الفائز (تبديل الهجوم)
                      </button>
                    </div>
                  )}

                  {battleStep === "trapChoice" && !reveal && (
                    <div className="animate-in zoom-in w-full flex flex-col items-center justify-center h-full py-4 px-4">
                      <CastleIcon kind="trap" className="mx-auto mb-4 animate-pulse w-20 h-20" />
                      <h3 className="font-display text-[40px] leading-tight text-purple-300 mb-4">وقع في الفخ!</h3>
                      <p className="text-ludn-fg font-black mb-8 bg-purple-500/10 px-6 py-3 rounded-2xl border border-purple-400/40 text-lg">
                        يا فريق ({attackingTeam === 1 ? team2Name : team1Name}) اختر مصيرهم:
                      </p>
                      <div className="flex flex-col md:flex-row gap-4 w-full">
                        <button onClick={() => resolveTrap("capture")} className={`${BTN_DARK} flex-1`}>
                          أسر 20 جندي
                        </button>
                        <button onClick={() => resolveTrap("kill")} className={`${BTN_DANGER_LINE} flex-1`}>
                          قتل 20 جندي
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {gameState === "gameOver" && !reveal && (
              <div className={`${cardClass} w-full text-center animate-in zoom-in-95 flex flex-col justify-center items-center p-8`}>
                <div className="w-32 h-32 bg-amber-500/10 rounded-[2rem] flex items-center justify-center border border-amber-400/40 mb-6">
                  <Crown className="text-amber-300 w-16 h-16 animate-bounce" strokeWidth={2.5} />
                </div>
                <h2 className="font-display text-[40px] leading-tight text-ludn-fg mb-3">انتهت الحرب!</h2>
                <p className={`text-lg font-bold text-ludn-muted mb-6 ${INSET} px-6 py-2`}>الفريق المنتصر</p>
                <span className={`font-display text-5xl block mb-10 ${hp1 > 0 ? "text-cyan-300" : "text-rose-300"}`}>
                  {hp1 > 0 ? team1Name : team2Name}
                </span>
                <button onClick={() => window.location.reload()} className={BTN_GOLD}>
                  تحدي جديد 🚀
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 flex flex-col w-full h-full">
            <div className="flex flex-col items-center z-10 mb-4 w-full">
              <div className={TEAM2_NAME}>
                {team2Name}
              </div>
              <div className={TEAM2_HP}>
                {hp2} / {TOTAL_SOLDIERS} <span className="text-sm text-ludn-muted">جندي</span>
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

      {gameState === "playing" && battleStep === "result" && !reveal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 pointer-events-auto px-4">
          <div className={`flex flex-col items-center justify-center p-8 md:p-14 w-full max-w-3xl rounded-[26px] border bg-ludn-surface animate-in zoom-in-95 duration-300 ${resultType === "spy" ? "border-ludn-gold/60 shadow-[0_0_40px_var(--ludn-glow)]" : "border-ludn-line shadow-[var(--ludn-shadow)]"}`}>
            <div className={`w-28 h-28 rounded-full flex items-center justify-center mb-8 border ${resultType === "spy" ? "border-ludn-gold/50 bg-ludn-gold/10" : "border-ludn-line bg-ludn-surface-2"}`}>
              {resultType === "hit" && <CheckCircle2 className="text-emerald-300 w-14 h-14" strokeWidth={3} />}
              {resultType === "miss" && <Shield className="text-ludn-muted w-14 h-14" fill="none" strokeWidth={3} />}
              {resultType === "trap" && <CastleIcon kind="trap" className="animate-screen-shake w-20 h-20" />}
              {resultType === "commander" && <CastleIcon kind="commander" className="animate-pulse w-20 h-20" />}
              {resultType === "spy" && <CastleIcon kind="spy" className="animate-pulse w-20 h-20" />}
            </div>
            <h3 className={`text-2xl md:text-4xl font-black mb-10 px-6 leading-relaxed py-8 rounded-2xl border w-full text-center ${resultType === "spy" ? "bg-ludn-gold/10 border-ludn-gold/40 text-ludn-gold-text" : resultType === "hit" ? "bg-emerald-500/10 border-emerald-400/40 text-emerald-200" : resultType === "trap" ? "bg-purple-500/10 border-purple-400/40 text-purple-200" : resultType === "commander" ? "bg-amber-500/10 border-amber-400/40 text-amber-200" : "bg-ludn-surface-2 border-ludn-line text-ludn-fg"}`}>
              {resultMsg}
            </h3>
            <button onClick={nextTurn} className={BTN_GOLD}>
              <Swords className="w-8 h-8" strokeWidth={2.5} /> <span>إنهاء الدور والتالي</span>
            </button>
          </div>
        </div>
      )}
      {showEndGameModal && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center px-4 ${BACKDROP} animate-in fade-in duration-300`}>
          <div className={`${MODAL} p-8 max-w-md w-full text-center animate-in zoom-in-95 duration-300`}>
            <div className="mx-auto w-24 h-24 bg-rose-500/10 border border-rose-500/50 rounded-full flex items-center justify-center mb-6">
              <Ban className="w-12 h-12 text-rose-300 animate-pulse" strokeWidth={3} />
            </div>
            <h2 className="font-display text-[32px] text-ludn-fg mb-4 leading-tight">إنهاء اللعبة؟</h2>
            <p className="text-ludn-muted font-bold mb-8 text-lg">
              هل أنت متأكد من رغبتك في إنهاء الحرب الآن؟ سيتم إعلان النتيجة فوراً ولن تتمكن من التراجع.
            </p>
            <div className="flex gap-4">
              <button onClick={() => { setShowEndGameModal(false); endGame(); }} className={`${BTN_DANGER_LINE} flex-1`}>
                إنهاء اللعبة
              </button>
              <button onClick={() => setShowEndGameModal(false)} className={`${BTN_DARK} flex-1`}>
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
      {showResetModal && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center px-4 ${BACKDROP} animate-in fade-in duration-300`}>
          <div className={`${MODAL} p-8 max-w-md w-full text-center animate-in zoom-in-95 duration-300`}>
            <div className="mx-auto w-24 h-24 bg-rose-500/10 border border-rose-500/50 rounded-full flex items-center justify-center mb-6">
              <RefreshCw className="w-12 h-12 text-rose-300 animate-spin-slow" strokeWidth={3} />
            </div>
            <h2 className="font-display text-[32px] text-ludn-fg mb-4 leading-tight">تصفير اللعبة؟</h2>
            <p className="text-ludn-muted font-bold mb-8 text-lg">
              هل أنت متأكد من تصفير اللعبة والبدء من جديد؟ سيتم مسح جميع بيانات الفرق والجنود ولن تتمكن من التراجع.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setShowResetModal(false)} className={`${BTN_DARK} flex-1`}>
                إلغاء
              </button>
              <button onClick={() => { setShowResetModal(false); resetGame(); }} className={`${BTN_DANGER_LINE} flex-1`}>
                نعم، صفّر اللعبة
              </button>
            </div>
          </div>
        </div>
      )}

      {showInstructionsModal && (
        <div className={`fixed inset-0 z-[2000] flex items-center justify-center p-4 ${BACKDROP} animate-in fade-in`}>
           <div className={`${MODAL} p-6 md:p-8 max-w-2xl w-full text-right animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scroll`}>
              <div className="flex items-center justify-center gap-3 mb-6">
                <Info className="w-8 h-8 text-sky-300" strokeWidth={3} />
                <h2 className="font-display text-[32px] leading-tight text-ludn-fg">كيف نلعب حرب القلاع؟ 🏰</h2>
              </div>

              <div className="space-y-4 text-slate-300 font-bold text-sm md:text-base leading-relaxed">
                <div className={`${INSET} p-4`}>
                  <h3 className="text-sky-300 font-black text-lg mb-2">⚔️ التجهيز:</h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li>كل فريق يستلم قلعة فيها 15 نافذة وعنده <span className="text-rose-300 font-black">120 جندي</span>.</li>
                    <li>يوزع الفريق جنوده على النوافذ بسرية تامة من جوالهم.</li>
                    <li><span className="text-amber-300 font-black">الأهم:</span> لازم تختار نافذة تخبي فيها <strong>"القائد <CastleIcon kind="commander" className="inline-block align-middle w-12 h-12" />"</strong> ونافذة ثانية تحط فيها <strong>"الفخ <CastleIcon kind="trap" className="inline-block align-middle w-12 h-12" />"</strong> وغرفة القائد والفخ ما تحط فيها جنود وتقدر توزع الجنود من زر توزيع عشوائي.</li>
                  </ul>
                </div>

                <div className={`${INSET} p-4`}>
                  <h3 className="text-rose-300 font-black text-lg mb-2">🔥 وقت المعركة:</h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li>تطلع لكم تحديات وأسئلة، الفريق اللي يفوز بالتحدي يصير له الدور في الهجوم! تختار نافذة من قلعة الخصم وتقصفها وإذا جاوبت خطأ الخصم بيختار غرفة من قلعتك ويقصفها 💣.</li>
                    <li><strong>طيحة الفخ <CastleIcon kind="trap" className="inline-block align-middle w-12 h-12" />:</strong> لو ضربت الفخ.. أكلتها! الخصم بيقرر إما يصفي <span className="text-rose-300 font-black">20 جندي</span> من جيشك، أو يأسرهم ويضمهم لجيشه.</li>
                    <li><strong>إصابة عادية:</strong> إذا ضربت نافذة فيها جنود، تخسف فيهم وينقص عدد الجنود المندسين بالغرفة.</li>
                    <li><strong>صيدة القائد <CastleIcon kind="commander" className="inline-block align-middle w-12 h-12" />:</strong> لو طحت على القائد، هذي ضربة قاضية! الخصم يودع 30 جندي يطيرون من جيشه!</li>
                  </ul>
                </div>

                <div className={`${INSET} p-4`}>
                  <h3 className="text-indigo-300 font-black text-lg mb-2 flex items-center gap-2"><CastleIcon kind="spy" /> الجاسوس الذيب:</h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li>كل فريق يقدر يستخدم الجاسوس مرة وحدة طول اللعبة.</li>
                    <li>الجاسوس يروح يجيب لك أكثر نافذة مليانة جنود ويقصفها لك جاهزة مجهزة.</li>
                  </ul>
                </div>

                <div className={`${INSET} p-4 text-center`}>
                  <h3 className="text-emerald-300 font-black text-xl mb-1">🏆 الفايز:</h3>
                  <p>اللي يطير جنود الخصم ويصفر عدادهم أول هو اللي يرفع الراية! 🏴‍☠️</p>
                </div>
              </div>

              <button onClick={() => setShowInstructionsModal(false)} className={`${BTN_GOLD} mt-6`}>
                 فهمت اللعبة، قدام! 🚀
              </button>
           </div>
        </div>
      )}
    </main>
  );
}