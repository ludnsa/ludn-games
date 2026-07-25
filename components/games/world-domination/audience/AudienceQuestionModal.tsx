"use client";
import React from "react";
import { MapPin, Crown, Swords, Coins } from "lucide-react";

export default function AudienceQuestionModal({ 
  isQuestionActive, selectedCountry, capitals, isAttacking, 
  team1Name, team2Name, isQuestionRevealed, showResult, 
  team1Choice, team2Choice, turn, timer 
}: any) {
  if (!isQuestionActive || !selectedCountry) return null;

  return (
    <div className="fixed inset-0 z-80 bg-slate-900/80 dark:bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-3 lg:p-6 animate-in fade-in duration-500 transition-colors">
      <div className="w-full max-w-5xl bg-white/95 dark:bg-slate-900/90 rounded-[2rem] lg:rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] dark:shadow-[0_0_100px_rgba(0,0,0,0.8)] p-4 lg:p-8 flex flex-col items-center justify-between text-center transform transition-all scale-100 max-h-[96vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        <div className={`px-4 py-2 lg:px-8 lg:py-3 rounded-xl lg:rounded-2xl border-2 mb-4 flex items-center justify-center gap-2 shadow-xl shrink-0 ${selectedCountry.isChallenge ? "bg-purple-100 border-purple-300 dark:bg-purple-950/50 dark:border-purple-500/50 shadow-purple-500/20" : "bg-blue-100 border-blue-300 dark:bg-blue-950/50 dark:border-blue-500/50 shadow-blue-500/20"}`}>
          <MapPin className={`${selectedCountry.isChallenge ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400"} w-5 h-5 lg:w-8 lg:h-8`} />
          <span className={`font-black text-xl lg:text-3xl ${selectedCountry.isChallenge ? "text-purple-700 dark:text-purple-300" : "text-blue-700 dark:text-blue-300"} drop-shadow-sm flex items-center gap-2`}>
            {selectedCountry.name}{" "}
            {(selectedCountry.id === capitals.team1 || selectedCountry.id === capitals.team2) && (
              <Crown className="text-amber-500 w-5 h-5 lg:w-8 lg:h-8" />
            )}
          </span>
        </div>

        {selectedCountry.owner !== null && !isAttacking ? (
          <div className="py-6 flex flex-col items-center justify-center w-full animate-in zoom-in-95 flex-1">
            <Swords className="w-16 h-16 lg:w-32 lg:h-32 mx-auto text-slate-300 dark:text-slate-700 opacity-50 mb-4" />
            <h2 className="text-xl lg:text-4xl font-black text-slate-800 dark:text-white leading-tight">
              هذه الدولة مملوكة لـ <br />
              <span className={selectedCountry.owner === 1 ? "text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]" : "text-rose-600 dark:text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]"}>
                {selectedCountry.owner === 1 ? team1Name : team2Name}
              </span>
            </h2>
            <p className="text-base lg:text-2xl font-bold text-amber-600 dark:text-amber-400 animate-pulse mt-4 bg-amber-50 dark:bg-amber-500/10 px-5 py-2 rounded-full border border-amber-200 dark:border-amber-500/20">
              بانتظار قرار الخصم بالهجوم...
            </p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center flex-1 justify-center min-h-0">
            {!isQuestionRevealed ? (
              <div className="py-8 text-center space-y-4 animate-pulse">
                <h3 className="text-xl lg:text-4xl font-black text-amber-500 dark:text-amber-400 drop-shadow-md tracking-wide">
                  الرجاء الاستماع للحكم...
                </h3>
                <div className="w-20 lg:w-32 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto overflow-hidden">
                  <div className="w-1/2 h-full bg-amber-400 dark:bg-amber-500 rounded-full animate-shimmer"></div>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center animate-in slide-in-from-bottom-8 duration-500 h-full justify-around">
                
                <h3 className={`font-black text-slate-900 dark:text-white mb-4 lg:mb-6 leading-snug drop-shadow-md text-center max-w-4xl shrink-0 ${selectedCountry.activeQuestion?.q?.length > 100 ? "text-lg md:text-2xl lg:text-3xl" : "text-xl md:text-3xl lg:text-4xl"}`}>
                  {selectedCountry.activeQuestion?.q}
                </h3>

                {selectedCountry.activeQuestion?.options && selectedCountry.activeQuestion.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row gap-3 w-full mb-2 lg:mb-4 shrink-0">
                    {selectedCountry.activeQuestion.options.map((o: any, i: number) => {
                        let bgClass = "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-800/80 dark:border-slate-600/50 dark:text-slate-300";
                        if (showResult) {
                          if (o === selectedCountry.activeQuestion.a) {
                            bgClass = "bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-500/20 dark:border-emerald-400 dark:text-emerald-100 scale-105 shadow-lg z-10";
                          } else if (o === team1Choice || o === team2Choice) {
                            bgClass = "bg-rose-50 border-rose-200 text-slate-400 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-slate-500 scale-95 opacity-60";
                          } else {
                            bgClass = "bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-600 opacity-40 scale-95";
                          }
                        } else {
                          if (o === team1Choice || o === team2Choice) {
                            bgClass = "bg-slate-200 border-slate-400 text-slate-900 dark:bg-slate-700 dark:border-slate-500 dark:text-white shadow-inner";
                          }
                        }

                        return (
                          <div key={i} className={`relative flex-1 p-3 lg:p-4 border-2 lg:border-4 rounded-xl lg:rounded-2xl text-base lg:text-xl font-black transition-all duration-500 flex items-center justify-center text-center leading-tight backdrop-blur-sm min-h-[50px] lg:min-h-[80px] ${bgClass}`}>
                            {o}
                            {team1Choice === o && (
                              <div className={`absolute -top-3 -right-2 lg:-top-4 lg:-right-3 px-2 py-1 rounded-lg text-[9px] lg:text-xs font-black shadow-md transition-all duration-500 ${showResult ? (o === selectedCountry.activeQuestion.a ? "bg-emerald-500 text-white" : "bg-slate-400 text-white") : "bg-cyan-500 text-white"}`}>
                                {team1Name}
                              </div>
                            )}
                            {team2Choice === o && (
                              <div className={`absolute -bottom-3 -left-2 lg:-bottom-4 lg:-left-3 px-2 py-1 rounded-lg text-[9px] lg:text-xs font-black shadow-md transition-all duration-500 ${showResult ? (o === selectedCountry.activeQuestion.a ? "bg-emerald-500 text-white" : "bg-slate-400 text-white") : "bg-rose-500 text-white"}`}>
                                {team2Name}
                              </div>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>
                )}

                {showResult && selectedCountry.activeQuestion.options && selectedCountry.activeQuestion.options.length > 0 && (
                  <div className="mt-2 p-4 lg:p-6 bg-white/80 dark:bg-slate-950/80 rounded-2xl lg:rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl animate-in zoom-in-95 w-full max-w-3xl backdrop-blur-md shrink-0">
                    {(() => {
                      let winner: 1 | 2 | null = null;
                      if (isAttacking) {
                        const attackerChoice = turn === 1 ? team1Choice : team2Choice;
                        if (attackerChoice === selectedCountry.activeQuestion?.a) winner = turn;
                      } else {
                        const is1Correct = team1Choice === selectedCountry.activeQuestion?.a;
                        const is2Correct = team2Choice === selectedCountry.activeQuestion?.a;
                        if (turn === 1) {
                          if (is1Correct) winner = 1;
                          else if (is2Correct) winner = 2;
                        } else {
                          if (is2Correct) winner = 2;
                          else if (is1Correct) winner = 1;
                        }
                      }

                      if (winner) {
                        return (
                          <>
                            <h3 className="text-xl lg:text-3xl font-black text-emerald-500 dark:text-emerald-400 mb-2 drop-shadow-sm">
                              إجابة صحيحة! 🎉
                            </h3>
                            <p className="text-sm lg:text-xl font-bold text-slate-700 dark:text-slate-200 mb-3">
                              تم استحلال الدولة لـ <span className="text-slate-900 dark:text-white font-black">{winner === 1 ? team1Name : team2Name}</span>
                            </p>
                            {selectedCountry.id === capitals.team1 || selectedCountry.id === capitals.team2 ? (
                              <div className="inline-flex flex-col items-center gap-1 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-500/30">
                                <div className="flex items-center gap-2">
                                  <p className="text-base lg:text-2xl font-black text-amber-600 dark:text-amber-400">مكافأة العاصمة: ثلث نقاط الخصم</p>
                                  <Coins className="text-yellow-500 dark:text-yellow-400 w-6 h-6 shrink-0" />
                                </div>
                                <p className="text-sm lg:text-xl font-bold text-rose-500 mt-1">وخصم ربع نقاط الخصم 📉</p>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-500/30">
                                <p className="text-base lg:text-2xl font-black text-amber-600 dark:text-amber-400">المكافأة: {selectedCountry.value}</p>
                                <Coins className="text-yellow-500 dark:text-yellow-400 w-6 h-6 shrink-0" />
                              </div>
                            )}
                          </>
                        );
                      } else {
                        return (
                          <>
                            <h3 className="text-xl lg:text-3xl font-black text-rose-600 dark:text-rose-500 mb-2 drop-shadow-sm">
                              إجابة خاطئة! ❌
                            </h3>
                            <p className="text-sm lg:text-xl font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50 px-4 py-2 rounded-xl inline-block">
                              لم يتمكن أحد من استحلال الدولة
                            </p>
                          </>
                        );
                      }
                    })()}
                  </div>
                )}

                {!showResult && (
                  <div className="text-[4rem] sm:text-[6rem] lg:text-[8rem] leading-none font-black font-mono text-amber-500 dark:text-amber-400 drop-shadow-lg shrink-0 mt-2">
                    {timer}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}