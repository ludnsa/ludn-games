/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { Cairo } from "next/font/google";
import { useRouter } from "next/navigation";
import {
  Swords, CheckCircle2, Crown, Bomb, Minus, Plus, Shuffle, Lock, User,
  AlertCircle, MapPin, Users, ChevronRight, Sun, Moon, RefreshCw, MonitorPlay,
} from "lucide-react";

import SolidGamingBackground from "@/components/games/castle-war/SolidGamingBackground";
import JoinInteractiveCastle from "@/components/games/castle-war/join/JoinInteractiveCastle";
import { useCastleWarJoin, TOTAL_SOLDIERS } from "@/hooks/useCastleWarJoin";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

export default function CastleWarJoinPage() {
  const router = useRouter();
  const {
    step, setStep, roomCode, setRoomCode, team1Name, team2Name, team1Ready, team2Ready,
    team1Joined, team2Joined,
    selectedTeam, setSelectedTeam, rooms, commanderRoom, trapRoom, activeRoomIdx, setActiveRoomIdx,
    isCheckingCode, isSubmitting, isDarkMode, remainingSoldiers, isSetupValid,
    toggleTheme, handleEnterRoom, handleRoomChange, handleManualInput, handleAutoDistribute,
    handleReset, assignSpecialRole, submitData, handleSelectTeam
  } = useCastleWarJoin();

  const isT1Disabled = team1Ready || team1Joined;
  const isT2Disabled = team2Ready || team2Joined;

  const theme = {
    base: selectedTeam === 1 ? "cyan" : "rose",
    text: selectedTeam === 1 ? "text-cyan-500 dark:text-cyan-400" : "text-rose-500 dark:text-rose-400",
    btn: selectedTeam === 1 ? "bg-cyan-500 hover:bg-cyan-400 border-cyan-700" : "bg-rose-500 hover:bg-rose-400 border-rose-700",
    lightBg: selectedTeam === 1 ? "bg-cyan-50 dark:bg-cyan-900/20" : "bg-rose-50 dark:bg-rose-900/20",
    borderColor: selectedTeam === 1 ? "border-cyan-200 dark:border-cyan-800" : "border-rose-200 dark:border-rose-800",
    shadow: selectedTeam === 1 ? "shadow-[0_8px_0_#0e7490] dark:shadow-[0_8px_0_#164e63]" : "shadow-[0_8px_0_#be123c] dark:shadow-[0_8px_0_#881337]",
  };

  return (
    <main className={`min-h-[100dvh] relative flex flex-col items-center p-4 ${cairo.className} bg-slate-50 dark:bg-[#0f172a] transition-colors duration-500`} dir="rtl">


      <SolidGamingBackground />

      <button type="button" onClick={toggleTheme} className="absolute top-6 left-6 z-[60] p-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-500 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700 active:translate-y-1 transition-all shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4">
        {isDarkMode ? <Sun size={20} strokeWidth={2.5} /> : <Moon size={20} strokeWidth={2.5} />}
      </button>

      <div className="relative z-10 w-full max-w-md flex-1 flex flex-col h-full py-4">
        
        {step === "enterCode" && (
          <div className="bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-black rounded-3xl p-8 shadow-[8px_8px_0px_#0f172a] dark:shadow-[8px_8px_0px_#000] animate-in zoom-in-95 my-auto text-center transition-colors">
            <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-[2rem] mx-auto flex items-center justify-center mb-6 border-4 border-indigo-300 dark:border-indigo-700 shadow-inner">
              <Lock size={48} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">الوصول للغرفة</h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mb-8">أدخل الكود السري المكون من 5 رموز</p>
            <input type="text" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} maxLength={5} placeholder="C-XXXX" className="w-full bg-slate-50 dark:bg-slate-900 border-4 border-slate-300 dark:border-slate-700 focus:border-indigo-500 rounded-2xl p-5 text-center text-4xl font-black tracking-[0.4em] uppercase outline-none transition-colors mb-6 shadow-inner text-slate-900 dark:text-white placeholder:tracking-normal placeholder:text-lg" dir="ltr" />
            <button onClick={handleEnterRoom} disabled={roomCode.length !== 5 || isCheckingCode} className="w-full py-5 bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-300 disabled:border-slate-400 disabled:translate-y-1.5 disabled:border-b-4 text-slate-900 dark:text-white rounded-2xl font-black text-xl active:translate-y-1.5 shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] transition-all flex items-center justify-center gap-2 border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4">
              {isCheckingCode ? "جاري التحقق..." : "دخول غرفة العمليات"} <ChevronRight size={24} strokeWidth={3} />
            </button>
          </div>
        )}

        {step === "selectTeam" && (
          <div className="bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-black rounded-3xl p-8 shadow-[8px_8px_0px_#0f172a] dark:shadow-[8px_8px_0px_#000] animate-in zoom-in-95 my-auto text-center transition-colors">
            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-[2rem] mx-auto flex items-center justify-center mb-6 border-4 border-slate-300 dark:border-slate-700 shadow-inner">
              <Swords size={48} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">اختر ولاءك</h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mb-8 flex items-center justify-center gap-2">
              كود الغرفة: <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg border-2 border-indigo-200 dark:border-indigo-800">{roomCode}</span>
            </p>
            <div className="flex flex-col gap-4">
              <button onClick={() => { if (!isT1Disabled) handleSelectTeam(1); }} disabled={isT1Disabled} className={isT1Disabled ? "w-full bg-slate-100 dark:bg-slate-800 border-4 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 rounded-2xl p-5 font-black text-xl flex items-center gap-4 cursor-not-allowed" : "w-full group bg-white dark:bg-slate-900 hover:bg-cyan-50 dark:hover:bg-slate-800 border-4 border-slate-900 dark:border-black text-cyan-600 dark:text-cyan-400 rounded-2xl p-5 font-black text-xl flex items-center gap-4 transition-all active:translate-y-1.5 shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] border-b-8 active:border-b-4"}>
                <div className={isT1Disabled ? "w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-700 border-4 border-slate-300 dark:border-slate-600 flex items-center justify-center" : "w-14 h-14 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 border-4 border-cyan-300 dark:border-cyan-700 flex items-center justify-center group-hover:scale-110 transition-transform"}>
                  {isT1Disabled ? <Lock size={24} strokeWidth={3} /> : <User size={24} strokeWidth={3} />}
                </div>
                <span className="flex-1 text-right flex flex-col sm:flex-row sm:items-center justify-between">
                  <span>{team1Name}</span>
                  {isT1Disabled && <span className="text-sm font-bold text-rose-500 border-2 border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded-lg mt-1 sm:mt-0 w-fit">(مُعتمد ومقفل)</span>}
                </span>
              </button>
              <button onClick={() => { if (!isT2Disabled) handleSelectTeam(2); }} disabled={isT2Disabled} className={isT2Disabled ? "w-full bg-slate-100 dark:bg-slate-800 border-4 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 rounded-2xl p-5 font-black text-xl flex items-center gap-4 cursor-not-allowed" : "w-full group bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-slate-800 border-4 border-slate-900 dark:border-black text-rose-600 dark:text-rose-400 rounded-2xl p-5 font-black text-xl flex items-center gap-4 transition-all active:translate-y-1.5 shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] border-b-8 active:border-b-4"}>
                <div className={isT2Disabled ? "w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-700 border-4 border-slate-300 dark:border-slate-600 flex items-center justify-center" : "w-14 h-14 rounded-xl bg-rose-100 dark:bg-rose-900/40 border-4 border-rose-300 dark:border-rose-700 flex items-center justify-center group-hover:scale-110 transition-transform"}>
                  {isT2Disabled ? <Lock size={24} strokeWidth={3} /> : <User size={24} strokeWidth={3} />}
                </div>
                <span className="flex-1 text-right flex flex-col sm:flex-row sm:items-center justify-between">
                  <span>{team2Name}</span>
                  {isT2Disabled && <span className="text-sm font-bold text-rose-500 border-2 border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded-lg mt-1 sm:mt-0 w-fit">(مُعتمد ومقفل)</span>}
                </span>
              </button>
            </div>
          </div>
        )}

        {step === "setup" && selectedTeam && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-bottom-10 duration-500 w-full h-full bg-white dark:bg-slate-800 rounded-3xl border-4 border-slate-900 dark:border-black shadow-[8px_8px_0px_#0f172a] dark:shadow-[8px_8px_0px_#000] overflow-hidden">
            <div className={`bg-slate-50 dark:bg-slate-900 border-b-4 border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between shrink-0 transition-colors`}>
              <div>
                <h2 className={`text-xl font-black ${theme.text}`}>قيادة جيش {selectedTeam === 1 ? team1Name : team2Name}</h2>
                <p className="text-slate-500 dark:text-slate-400 font-bold text-xs mt-1">حدد النافذة لتوزيع جيشك</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleReset} className="bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-800 border-2 border-rose-300 dark:border-rose-600 border-b-4 text-rose-700 dark:text-rose-400 px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 active:translate-y-0.5 active:border-b-2 transition-all shadow-sm">
                  <RefreshCw size={16} strokeWidth={2.5} /> تصفير
                </button>
                <button onClick={handleAutoDistribute} className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 border-b-4 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 active:translate-y-0.5 active:border-b-2 transition-all shadow-sm">
                  <Shuffle size={16} strokeWidth={2.5} /> عشوائي
                </button>
              </div>
            </div>

            <div className={`${theme.lightBg} border-b-4 border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between shadow-inner shrink-0`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 border-slate-900 dark:border-black shadow-sm ${selectedTeam === 1 ? "bg-cyan-100 text-cyan-600" : "bg-rose-100 text-rose-600"}`}>
                  <Users size={20} strokeWidth={2.5} />
                </div>
                <span className="font-black text-sm text-slate-700 dark:text-slate-200">المتبقي للتوزيع:</span>
              </div>
              <div className={`font-black text-3xl font-mono px-4 py-1 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-inner ${remainingSoldiers === 0 ? "text-emerald-500" : "text-amber-500"} transition-colors`}>
                {remainingSoldiers}
              </div>
            </div>

            <div className={`flex-1 relative flex flex-col items-center justify-start p-4 overflow-y-auto overflow-x-hidden custom-scroll bg-slate-50 dark:bg-[#0f172a]`}>
              <JoinInteractiveCastle selectedTeam={selectedTeam} rooms={rooms} commanderRoom={commanderRoom} trapRoom={trapRoom} activeRoomIdx={activeRoomIdx} setActiveRoomIdx={setActiveRoomIdx} />
            </div>

            <div className={`bg-white dark:bg-slate-800 border-t-4 border-slate-200 dark:border-slate-700 p-5 z-30 shrink-0 min-h-[160px] flex flex-col justify-center rounded-b-[1.5rem]`}>
              {activeRoomIdx !== null ? (
                <div className="animate-in slide-in-from-bottom-5">
                  <div className="flex justify-between items-center mb-4 border-b-2 border-slate-100 dark:border-slate-700 pb-3">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <MapPin size={20} className={`${theme.text}`} /> تعديل النافذة رقم {activeRoomIdx + 1}
                    </h3>
                    <button onClick={() => setActiveRoomIdx(null)} className="text-rose-500 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 border-2 border-rose-200 dark:border-rose-800 border-b-4 active:border-b-2 active:translate-y-0.5 font-black text-xs px-4 py-2 rounded-xl transition-all">إغلاق ✕</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center shadow-inner">
                      <label className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 mb-3">تعديل الجنود</label>
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleRoomChange(activeRoomIdx, -1)} disabled={rooms[activeRoomIdx] === 0 || commanderRoom === activeRoomIdx || trapRoom === activeRoomIdx} className="w-12 h-12 shrink-0 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 disabled:opacity-30 disabled:border-b-2 flex items-center justify-center active:translate-y-0.5 border-2 border-rose-300 dark:border-rose-800 border-b-4 active:border-b-2 transition-all">
                          <Minus size={24} strokeWidth={3} />
                        </button>
                        <input type="number" min="0" value={rooms[activeRoomIdx] || ""} onChange={(e) => handleManualInput(activeRoomIdx, e.target.value)} disabled={commanderRoom === activeRoomIdx || trapRoom === activeRoomIdx} className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 w-16 h-12 rounded-xl flex items-center justify-center text-center font-black text-2xl text-slate-900 dark:text-white font-mono shadow-inner outline-none focus:border-indigo-500 disabled:opacity-50" />
                        <button onClick={() => handleRoomChange(activeRoomIdx, 1)} disabled={remainingSoldiers === 0 || commanderRoom === activeRoomIdx || trapRoom === activeRoomIdx} className="w-12 h-12 shrink-0 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 disabled:opacity-30 disabled:border-b-2 flex items-center justify-center active:translate-y-0.5 border-2 border-emerald-300 dark:border-emerald-800 border-b-4 active:border-b-2 transition-all">
                          <Plus size={24} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <button onClick={() => assignSpecialRole(activeRoomIdx, "commander")} className={`w-full h-full rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all border-2 border-b-4 active:border-b-2 active:translate-y-0.5 ${commanderRoom === activeRoomIdx ? "bg-amber-400 text-slate-900 border-amber-600" : "bg-slate-50 dark:bg-slate-900 text-amber-600 dark:text-amber-500 border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-800"}`}>
                        <Crown size={20} strokeWidth={2.5} /> <span className="hidden sm:inline">{commanderRoom === activeRoomIdx ? "غرفة القائد" : "تعيين كقائد"}</span> <span className="sm:hidden">قائد</span>
                      </button>
                      <button onClick={() => assignSpecialRole(activeRoomIdx, "trap")} className={`w-full h-full rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all border-2 border-b-4 active:border-b-2 active:translate-y-0.5 ${trapRoom === activeRoomIdx ? "bg-purple-500 text-white border-purple-700" : "bg-slate-50 dark:bg-slate-900 text-purple-600 dark:text-purple-400 border-slate-200 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-slate-800"}`}>
                        <Bomb size={20} strokeWidth={2.5} /> <span className="hidden sm:inline">{trapRoom === activeRoomIdx ? "غرفة الفخ" : "تعيين كفخ"}</span> <span className="sm:hidden">فخ</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in flex flex-col justify-center h-full">
                  {!isSetupValid && (
                    <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 p-4 rounded-2xl border-2 border-rose-200 dark:border-rose-800 mb-4 text-xs font-black shadow-sm">
                      <AlertCircle size={24} className="shrink-0" strokeWidth={2.5} />
                      <p className="leading-relaxed">وزع الـ {TOTAL_SOLDIERS} جندي بالكامل، وعين القائد والفخ في غرفتين مختلفتين لاعتماد الخطة.</p>
                    </div>
                  )}
                  <button onClick={submitData} disabled={!isSetupValid || isSubmitting} className={`w-full py-5 rounded-2xl text-xl font-black flex items-center justify-center gap-3 transition-all border-4 shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] ${isSetupValid ? `${theme.btn} border-slate-900 dark:border-black text-white border-b-8 active:border-b-4 active:translate-y-1 animate-pulse` : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border-slate-300 dark:border-slate-700 border-b-4"}`}>
                    {isSubmitting ? "جاري الإرسال للقيادة..." : isSetupValid ? <>اعتماد الخطة <CheckCircle2 size={24} strokeWidth={3} /></> : "أكمل التجهيزات أولاً"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-black rounded-3xl p-10 shadow-[8px_8px_0px_#0f172a] dark:shadow-[8px_8px_0px_#000] animate-in zoom-in text-center my-auto w-full">
            <div className="w-32 h-32 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-500 dark:text-emerald-400 rounded-3xl mx-auto flex items-center justify-center mb-8 border-4 border-emerald-300 dark:border-emerald-700 shadow-inner animate-bounce">
              <CheckCircle2 size={64} strokeWidth={3} />
            </div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">تم اعتماد الخطة!</h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold mb-8 text-lg leading-relaxed bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-inner">
              تم إرسال توزيع جيشك النهائي لشاشة الحكم بسرية تامة. يمكنك الآن الانتقال لمشاهدة المعركة الحية من جوالك.
            </p>
            <button onClick={() => router.push(`/games/castle-war/display?code=${roomCode}`)} className="w-full py-5 bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xl rounded-2xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a] transition-all flex items-center justify-center gap-3">
              الانتقال لشاشة المعركة 📺 <MonitorPlay size={24} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}