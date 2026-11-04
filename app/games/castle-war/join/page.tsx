/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { Cairo } from "next/font/google";
import { useRouter } from "next/navigation";
import {
  Swords, CheckCircle2, Minus, Plus, Shuffle, Lock, User,
  AlertCircle, MapPin, Users, ChevronRight, RefreshCw, MonitorPlay,
} from "lucide-react";

import JoinInteractiveCastle from "@/components/games/castle-war/join/JoinInteractiveCastle";
import CastleIcon from "@/components/games/castle-war/CastleIcon";
import {
  BAR_DANGER, BAR_TIGHT, BTN_GOLD, ERROR, ICON_BOX, INSET, LOCKED_PICK_ICON, LOCKED_TAG, PANEL,
  ROLE_COMMANDER_OFF, ROLE_COMMANDER_ON, ROLE_TRAP_OFF, ROLE_TRAP_ON, STEP_MINUS, STEP_PLUS,
  TEAM1_PICK, TEAM1_PICK_ICON, TEAM2_PICK, TEAM2_PICK_ICON, TEAM_LOCKED,
} from "@/components/games/castle-war/castleUi";
import { useCastleWarJoin, TOTAL_SOLDIERS } from "@/hooks/useCastleWarJoin";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

export default function CastleWarJoinPage() {
  const router = useRouter();
  const {
    step, setStep, roomCode, setRoomCode, team1Name, team2Name, team1Ready, team2Ready,
    team1Joined, team2Joined,
    selectedTeam, setSelectedTeam, rooms, commanderRoom, trapRoom, activeRoomIdx, setActiveRoomIdx,
    isCheckingCode, isSubmitting, remainingSoldiers, isSetupValid,
    handleEnterRoom, handleRoomChange, handleManualInput, handleAutoDistribute,
    handleReset, assignSpecialRole, submitData, handleSelectTeam
  } = useCastleWarJoin();

  const isT1Disabled = team1Ready || team1Joined;
  const isT2Disabled = team2Ready || team2Joined;

  const theme = {
    text: selectedTeam === 1 ? "text-cyan-300" : "text-rose-300",
    edge: selectedTeam === 1 ? "border-t-cyan-400" : "border-t-rose-400",
    tint: selectedTeam === 1 ? "bg-cyan-500/10" : "bg-rose-500/10",
    icon: selectedTeam === 1 ? "bg-cyan-500/15 border-cyan-400/40 text-cyan-300" : "bg-rose-500/15 border-rose-400/40 text-rose-300",
  };

  return (
    // dark: مثل المافيا، داكنة دايماً حتى لو الموقع على الوضع النهاري، بدون ما نغيّر اختيار المستخدم
    <main className={`dark text-ludn-fg min-h-[100dvh] relative flex flex-col items-center p-4 ${cairo.className} transition-colors duration-500`} dir="rtl">


      <div className="relative z-10 w-full max-w-md flex-1 flex flex-col h-full py-4">

        {step === "enterCode" && (
          <div className={`${PANEL} p-8 animate-in zoom-in-95 my-auto text-center`}>
            <div className={`${ICON_BOX} bg-ludn-gold/10 text-ludn-gold-text border-ludn-gold/40`}>
              <Lock size={48} strokeWidth={2.5} />
            </div>
            <h1 className="font-display text-[32px] leading-tight text-ludn-fg mb-2">الوصول للغرفة</h1>
            <p className="text-ludn-muted font-bold text-sm mb-8">أدخل الكود السري المكون من 5 رموز</p>
            <input type="text" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} maxLength={5} placeholder="C-XXXX" className="w-full bg-ludn-surface-2 border border-ludn-line focus:border-ludn-gold rounded-2xl p-5 text-center text-4xl font-black tracking-[0.4em] uppercase outline-none transition-colors mb-6 text-ludn-fg placeholder:text-ludn-muted placeholder:tracking-normal placeholder:text-lg" dir="ltr" />
            <button onClick={handleEnterRoom} disabled={roomCode.length !== 5 || isCheckingCode} className={BTN_GOLD}>
              {isCheckingCode ? "جاري التحقق..." : "دخول غرفة العمليات"} <ChevronRight size={24} strokeWidth={3} />
            </button>
          </div>
        )}

        {step === "selectTeam" && (
          <div className={`${PANEL} p-8 animate-in zoom-in-95 my-auto text-center`}>
            <div className={`${ICON_BOX} bg-ludn-surface-2 text-ludn-muted border-ludn-line`}>
              <Swords size={48} strokeWidth={2.5} />
            </div>
            <h1 className="font-display text-[32px] leading-tight text-ludn-fg mb-3">اختر ولاءك</h1>
            <p className="text-ludn-muted font-bold text-sm mb-8 flex items-center justify-center gap-2">
              كود الغرفة: <span className="font-mono font-black text-ludn-gold-text bg-ludn-gold/10 px-3 py-1 rounded-lg border border-ludn-gold/40">{roomCode}</span>
            </p>
            <div className="flex flex-col gap-4">
              <button onClick={() => { if (!isT1Disabled) handleSelectTeam(1); }} disabled={isT1Disabled} className={isT1Disabled ? TEAM_LOCKED : TEAM1_PICK}>
                <div className={isT1Disabled ? LOCKED_PICK_ICON : TEAM1_PICK_ICON}>
                  {isT1Disabled ? <Lock size={24} strokeWidth={3} /> : <User size={24} strokeWidth={3} />}
                </div>
                <span className="flex-1 text-right flex flex-col sm:flex-row sm:items-center justify-between">
                  <span>{team1Name}</span>
                  {isT1Disabled && <span className={LOCKED_TAG}>(مُعتمد ومقفل)</span>}
                </span>
              </button>
              <button onClick={() => { if (!isT2Disabled) handleSelectTeam(2); }} disabled={isT2Disabled} className={isT2Disabled ? TEAM_LOCKED : TEAM2_PICK}>
                <div className={isT2Disabled ? LOCKED_PICK_ICON : TEAM2_PICK_ICON}>
                  {isT2Disabled ? <Lock size={24} strokeWidth={3} /> : <User size={24} strokeWidth={3} />}
                </div>
                <span className="flex-1 text-right flex flex-col sm:flex-row sm:items-center justify-between">
                  <span>{team2Name}</span>
                  {isT2Disabled && <span className={LOCKED_TAG}>(مُعتمد ومقفل)</span>}
                </span>
              </button>
            </div>
          </div>
        )}

        {step === "setup" && selectedTeam && (
          <div className={`${PANEL} flex-1 flex flex-col animate-in slide-in-from-bottom-10 duration-500 w-full h-full overflow-hidden`}>
            <div className={`bg-ludn-surface-2 border-b border-ludn-line border-t-2 ${theme.edge} p-4 flex flex-col gap-3 shrink-0`}>
              <div className="flex gap-2 w-full justify-start">
                <button onClick={handleReset} className={BAR_DANGER}>
                  <RefreshCw size={16} strokeWidth={2.5} /> تصفير
                </button>
                <button onClick={handleAutoDistribute} className={`${BAR_TIGHT} flex-1`}>
                  <Shuffle size={16} strokeWidth={2.5} /> عشوائي
                </button>
              </div>
              <div className="text-right">
                <h2 className={`font-display text-2xl leading-tight ${theme.text}`}>قيادة جيش {selectedTeam === 1 ? team1Name : team2Name}</h2>
                <p className="text-ludn-muted font-bold text-xs mt-1">حدد النافذة لتوزيع جيشك</p>
              </div>
            </div>

            {/* لون الشريط شفاف في الداكن، فله أرضية تحته عشان خلفية المعركة ما تبين من خلاله */}
            <div className="shrink-0 bg-ludn-surface">
            <div className={`${theme.tint} border-b border-ludn-line p-4 flex items-center justify-between shrink-0`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${theme.icon}`}>
                  <Users size={20} strokeWidth={2.5} />
                </div>
                <span className="font-black text-sm text-ludn-fg">المتبقي للتوزيع:</span>
              </div>
              <div className={`font-black text-3xl font-mono px-4 py-1 rounded-xl bg-ludn-surface-2 border border-ludn-line ${remainingSoldiers === 0 ? "text-emerald-300" : "text-amber-300"} transition-colors`}>
                {remainingSoldiers}
              </div>
            </div>
            </div>

            <div className={`flex-1 relative flex flex-col items-center justify-start p-4 overflow-y-auto overflow-x-hidden custom-scroll`}>
              <JoinInteractiveCastle selectedTeam={selectedTeam} rooms={rooms} commanderRoom={commanderRoom} trapRoom={trapRoom} activeRoomIdx={activeRoomIdx} setActiveRoomIdx={setActiveRoomIdx} />
            </div>

            <div className={`bg-ludn-surface border-t border-ludn-line p-5 z-30 shrink-0 min-h-[160px] flex flex-col justify-center`}>
              {activeRoomIdx !== null ? (
                <div className="animate-in slide-in-from-bottom-5">
                  <div className="flex justify-between items-center mb-4 border-b border-ludn-line pb-3">
                    <h3 className="text-lg font-black text-ludn-fg flex items-center gap-2">
                      <MapPin size={20} className={`${theme.text}`} /> تعديل النافذة رقم {activeRoomIdx + 1}
                    </h3>
                    <button onClick={() => setActiveRoomIdx(null)} className={`${BAR_TIGHT} shrink-0 whitespace-nowrap`}>إغلاق ✕</button>
                  </div>
                  {/* مربع الجنود بسطر كامل: + و− والخانة يحتاجون 184 بكسل، ونص العرض ما يكفيهم */}
                  <div className="grid gap-3">
                    <div className={`${INSET} p-3 flex flex-col items-center justify-center`}>
                      <label className="text-xs font-black text-ludn-muted mb-3">تعديل الجنود</label>
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleRoomChange(activeRoomIdx, -1)} disabled={rooms[activeRoomIdx] === 0 || commanderRoom === activeRoomIdx || trapRoom === activeRoomIdx} className={STEP_MINUS}>
                          <Minus size={24} strokeWidth={3} />
                        </button>
                        <input type="number" min="0" value={rooms[activeRoomIdx] || ""} onChange={(e) => handleManualInput(activeRoomIdx, e.target.value)} disabled={commanderRoom === activeRoomIdx || trapRoom === activeRoomIdx} className="bg-ludn-surface border border-ludn-line w-16 h-12 rounded-xl flex items-center justify-center text-center font-black text-2xl text-ludn-fg font-mono outline-none focus:border-ludn-gold disabled:opacity-50" />
                        <button onClick={() => handleRoomChange(activeRoomIdx, 1)} disabled={remainingSoldiers === 0 || commanderRoom === activeRoomIdx || trapRoom === activeRoomIdx} className={STEP_PLUS}>
                          <Plus size={24} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => assignSpecialRole(activeRoomIdx, "commander")} className={commanderRoom === activeRoomIdx ? ROLE_COMMANDER_ON : ROLE_COMMANDER_OFF}>
                        <CastleIcon kind="commander" /> <span className="hidden sm:inline">{commanderRoom === activeRoomIdx ? "غرفة القائد" : "تعيين كقائد"}</span> <span className="sm:hidden">قائد</span>
                      </button>
                      <button onClick={() => assignSpecialRole(activeRoomIdx, "trap")} className={trapRoom === activeRoomIdx ? ROLE_TRAP_ON : ROLE_TRAP_OFF}>
                        <CastleIcon kind="trap" /> <span className="hidden sm:inline">{trapRoom === activeRoomIdx ? "غرفة الفخ" : "تعيين كفخ"}</span> <span className="sm:hidden">فخ</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in flex flex-col justify-center h-full">
                  {!isSetupValid && (
                    <div className={`${ERROR} mb-4`}>
                      <AlertCircle size={24} className="shrink-0" strokeWidth={2.5} />
                      <p className="leading-relaxed">وزع الـ {TOTAL_SOLDIERS} جندي بالكامل، وعين القائد والفخ في غرفتين مختلفتين لاعتماد الخطة.</p>
                    </div>
                  )}
                  <button onClick={submitData} disabled={!isSetupValid || isSubmitting} className={`${BTN_GOLD} ${isSetupValid ? "animate-pulse" : ""}`}>
                    {isSubmitting ? "جاري الإرسال للقيادة..." : isSetupValid ? <>اعتماد الخطة <CheckCircle2 size={24} strokeWidth={3} /></> : "أكمل التجهيزات أولاً"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === "done" && (
          <div className={`${PANEL} p-6 sm:p-10 animate-in zoom-in text-center my-auto w-full`}>
            <div className="w-32 h-32 bg-emerald-500/10 text-emerald-300 rounded-3xl mx-auto flex items-center justify-center mb-8 border border-emerald-400/40 animate-bounce">
              <CheckCircle2 size={64} strokeWidth={3} />
            </div>
            <h2 className="font-display text-4xl leading-tight text-ludn-fg mb-4">تم اعتماد الخطة!</h2>
            <p className={`text-ludn-muted font-bold mb-8 text-lg leading-relaxed ${INSET} p-4`}>
              تم إرسال توزيع جيشك النهائي لشاشة الحكم بسرية تامة. يمكنك الآن الانتقال لمشاهدة المعركة الحية من جوالك.
            </p>
            <button onClick={() => router.push(`/games/castle-war/display?code=${roomCode}`)} className={`${BTN_GOLD} text-balance`}>
              الانتقال لشاشة المعركة 📺 <MonitorPlay size={24} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
