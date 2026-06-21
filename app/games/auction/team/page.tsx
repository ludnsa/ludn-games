"use client";
import React, { useState, useEffect } from "react";
import { Cairo } from "next/font/google";
import { createClient } from "@supabase/supabase-js";
import {
  Wallet, Coins, ShieldAlert, Trophy, LogOut, AlertTriangle, Moon, Sun, Timer as TimerIcon, Eye, Send, UserCheck, Zap, Handshake
} from "lucide-react";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AuctionTeamScreen() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(true);
  
  const [roomCode, setRoomCode] = useState("");
  const [teamId, setTeamId] = useState<1 | 2 | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [liveData, setLiveData] = useState<any>(null);
  const [myBid, setMyBid] = useState<number | "">("");
  
  const [roomInfo, setRoomInfo] = useState<{t1_name: string, t2_name: string} | null>(null);

  const [alertConfig, setAlertConfig] = useState<{ show: boolean; message: string }>({ show: false, message: "" });
  const triggerAlert = (msg: string) => setAlertConfig({ show: true, message: msg });
  const closeAlert = () => setAlertConfig({ show: false, message: "" });

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const r = params.get("room");
      if (r) setRoomCode(r.toUpperCase());
    }
  }, []);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);

  useEffect(() => {
    if (roomCode.length === 5) {
      const fetchNames = async () => {
        const { data } = await supabase.from("auction_rooms").select("t1_name, t2_name").eq("room_code", roomCode).single();
        if (data) setRoomInfo(data);
        else setRoomInfo(null);
      };
      fetchNames();

      const nameChannel = supabase.channel('names_sync')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auction_rooms', filter: `room_code=eq.${roomCode}` }, (payload) => {
           setRoomInfo({ t1_name: payload.new.t1_name, t2_name: payload.new.t2_name });
        }).subscribe();

      return () => { supabase.removeChannel(nameChannel); };
    } else {
      setRoomInfo(null);
    }
  }, [roomCode]);

  useEffect(() => {
    if (!isJoined || !roomCode) return;

    const fetchInitialData = async () => {
      const { data, error } = await supabase.from("auction_rooms").select("*").eq("room_code", roomCode).single();
      if (data) setLiveData(data);
      else {
        triggerAlert("رمز الغرفة غير صحيح أو أن اللعبة لم تبدأ بعد.");
        setIsJoined(false);
      }
    };
    fetchInitialData();

    const channel = supabase.channel('team_sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auction_rooms', filter: `room_code=eq.${roomCode}` }, (payload) => {
        setLiveData((prev: any) => {
          const newData = { ...prev, ...payload.new };
          if (payload.new.game_state === "bidding" && prev?.game_state !== "bidding") {
             setMyBid("");
          }
          return newData;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isJoined, roomCode]);

  const handleJoin = async () => {
    if (roomCode.length !== 5) { triggerAlert("الرجاء إدخال كود غرفة مكون من 5 أحرف."); return; }
    if (!teamId) { triggerAlert("الرجاء اختيار فريقك أولاً."); return; }
    setIsJoined(true);
  };

  const handleLeave = () => {
    setIsJoined(false);
    setTeamId(null);
    setLiveData(null);
  };

  const handleSendBid = async () => {
    if (myBid === "" || Number(myBid) <= 0) { triggerAlert("الرجاء إدخال مبلغ مزايدة صحيح."); return; }
    if (Number(myBid) % 100 !== 0) { triggerAlert("يجب أن تكون المزايدة من مضاعفات 100."); return; }
    
    const myBalance = teamId === 1 ? liveData.t1_balance : liveData.t2_balance;
    if (Number(myBid) > myBalance) { triggerAlert("لا يمكنك المزايدة بأكثر من رصيدك الحالي."); return; }
    
    const colName = teamId === 1 ? "t1_bid" : "t2_bid";
    await supabase.from("auction_rooms").update({ [colName]: Number(myBid) }).eq("room_code", roomCode);
    triggerAlert("تم إرسال مزايدتك للحكم بنجاح! 🚀");
  };

  if (!mounted) return null;

  if (!isJoined) {
    return (
      <main className={`min-h-[100dvh] flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 transition-colors duration-500 ${cairo.className}`} dir="rtl">
        <button onClick={() => setIsDark(!isDark)} className="absolute top-4 left-4 md:top-6 md:left-6 z-[110] p-2 md:p-3 rounded-xl bg-white dark:bg-slate-800 text-yellow-500 shadow-lg border-b-4 border-slate-200 dark:border-slate-900 active:border-b-0 active:translate-y-[4px] transition-all">
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[2.5rem] shadow-2xl border-4 border-yellow-500 text-center w-full max-w-md animate-in zoom-in-95">
          <Wallet className="w-16 h-16 text-yellow-500 mx-auto mb-6 animate-pulse" />
          <h1 className="text-3xl font-black mb-2 text-slate-800 dark:text-white">دخول الفرق</h1>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-8">حرب المزايدات - شاشة اللاعبين</p>

          <div className="space-y-6 text-right">
            <div>
              <label className="block text-xs font-black text-slate-500 mb-2">كود الغرفة</label>
              <input type="text" maxLength={5} placeholder="أدخل كود الحكم (5 أحرف)" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-black text-center text-xl tracking-widest focus:border-yellow-500 outline-none transition-colors uppercase" />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 mb-2">اختر فريقك</label>
              <div className="flex gap-3">
                <button onClick={() => setTeamId(1)} className={`flex-1 py-4 rounded-xl border-b-4 font-black transition-all flex flex-col items-center justify-center gap-1 ${teamId === 1 ? "bg-cyan-600 border-cyan-800 text-white translate-y-[4px] border-b-0" : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>
                  <UserCheck size={20} /> <span className="truncate w-full px-2">{roomInfo ? roomInfo.t1_name : "الفريق الأول"}</span>
                </button>
                <button onClick={() => setTeamId(2)} className={`flex-1 py-4 rounded-xl border-b-4 font-black transition-all flex flex-col items-center justify-center gap-1 ${teamId === 2 ? "bg-rose-600 border-rose-800 text-white translate-y-[4px] border-b-0" : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>
                  <UserCheck size={20} /> <span className="truncate w-full px-2">{roomInfo ? roomInfo.t2_name : "الفريق الثاني"}</span>
                </button>
              </div>
            </div>
          </div>

          <button onClick={handleJoin} className="w-full mt-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black text-xl rounded-xl border-b-4 border-yellow-700 active:border-b-0 active:translate-y-[4px] transition-all shadow-md">
            دخول للعبة
          </button>
        </div>
        {alertConfig.show && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border-b-4 border-yellow-500 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
              <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">تنبيه</h3>
              <p className="text-slate-600 dark:text-slate-300 font-bold text-sm mb-6 whitespace-pre-line">{alertConfig.message}</p>
              <button onClick={closeAlert} className="w-full py-3 bg-yellow-500 text-slate-900 font-black rounded-xl border-b-4 border-yellow-700 active:border-b-0 active:translate-y-[4px] transition-all">حسناً</button>
            </div>
          </div>
        )}
      </main>
    );
  }

  if (!liveData || liveData.game_state === "setup") {
    return (
      <main className={`min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 transition-colors duration-500 ${cairo.className}`} dir="rtl">
        <div className="text-center animate-pulse">
          <ShieldAlert className="w-20 h-20 text-slate-300 dark:text-slate-700 mx-auto mb-6" />
          <h2 className="text-3xl font-black mb-2 text-slate-800 dark:text-white">بانتظار الحكم...</h2>
          <p className="text-slate-500 font-bold">الرجاء الانتظار حتى يقوم الحكم ببدء اللعبة.</p>
        </div>
        <button onClick={handleLeave} className="mt-12 px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-xl border-b-4 border-slate-300 dark:border-slate-900 flex items-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-700 active:border-b-0 active:translate-y-[4px] transition-all">
          <LogOut size={18} /> خروج
        </button>
      </main>
    );
  }

  const myName = teamId === 1 ? liveData.t1_name : liveData.t2_name;
  const myBalance = (teamId === 1 ? liveData.t1_balance : liveData.t2_balance) || 0;
  const myPoints = (teamId === 1 ? liveData.t1_points : liveData.t2_points) || 0;
  const activeQuestion = liveData.questions && liveData.current_index !== undefined ? liveData.questions[liveData.current_index] : null;

  return (
    <main className={`min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-3 md:p-6 flex flex-col relative z-10 transition-colors duration-500 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${cairo.className}`} dir="rtl">
      
      <button onClick={() => setIsDark(!isDark)} className="absolute top-4 left-4 md:top-6 md:left-6 z-[110] p-2 md:p-3 rounded-xl bg-white dark:bg-slate-800 text-yellow-500 shadow-lg border-b-4 border-slate-200 dark:border-slate-900 active:border-b-0 active:translate-y-[4px] transition-all">
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {alertConfig.show && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border-b-4 border-yellow-500 p-6 md:p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
            <AlertTriangle className="w-12 h-12 md:w-16 md:h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white mb-2">تنبيه النظام</h3>
            <p className="text-slate-600 dark:text-slate-300 font-bold text-sm mb-6 leading-relaxed whitespace-pre-line">{alertConfig.message}</p>
            <button onClick={closeAlert} className="w-full py-3 bg-yellow-500 text-slate-900 font-black rounded-xl border-b-4 border-yellow-700 active:border-b-0 active:translate-y-[4px] transition-all shadow-md">حسناً</button>
          </div>
        </div>
      )}

      {/* الهيدر الخاص بالفريق */}
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-3 md:gap-4 mb-6 shrink-0 mt-14 md:mt-0">
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm">
          <button onClick={handleLeave} className="px-4 py-2 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-xl flex items-center justify-center gap-2 font-black text-xs transition-colors">
            <LogOut size={16} /> خروج
          </button>
          <div className="text-left">
            <h1 className="text-lg font-black tracking-wide text-slate-900 dark:text-white">غرفة: <span className="text-yellow-600">{roomCode}</span></h1>
          </div>
        </div>

        <div className={`bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border-2 shadow-md relative overflow-hidden ${teamId === 1 ? "border-cyan-300 dark:border-cyan-800" : "border-rose-300 dark:border-rose-800"}`}>
           <div className={`absolute top-0 right-0 w-2 h-full ${teamId === 1 ? "bg-cyan-500" : "bg-rose-500"}`}></div>
           <div className="flex justify-between items-center pr-4">
              <div>
                 <p className="text-xs font-black text-slate-500 dark:text-slate-400 mb-1">أهلاً بك،</p>
                 <h2 className={`text-2xl md:text-3xl font-black ${teamId === 1 ? "text-cyan-600 dark:text-cyan-400" : "text-rose-600 dark:text-rose-400"}`}>{myName}</h2>
              </div>
              <div className="text-left">
                 <p className="text-[10px] font-bold text-slate-500 mb-1">رصيدك الحالي</p>
                 <p className="font-black text-2xl md:text-3xl text-slate-800 dark:text-white flex items-center gap-2 justify-end">
                   {myBalance <= 0 ? <span className="text-rose-500 text-lg">مفلس 0</span> : myBalance.toLocaleString()} <Coins size={24} className="text-yellow-500" />
                 </p>
                 <div className="flex items-center justify-end gap-3 mt-1">
                   <p className="font-black text-lg text-slate-600 dark:text-slate-300 flex items-center gap-1">
                     {myPoints} <Trophy size={16} className={teamId === 1 ? "text-cyan-500" : "text-rose-500"} />
                   </p>
                   <div className="flex gap-1 border-r-2 border-slate-200 dark:border-slate-800 pr-3">
                     {(() => {
                       const myAmbush = (teamId === 1 ? liveData.t1_ambush : liveData.t2_ambush) ?? 3;
                       return Array.from({ length: 3 }).map((_, i) => (
                         <ShieldAlert key={i} size={14} className={i < myAmbush ? "text-amber-500" : "text-slate-300 dark:text-slate-700 opacity-30"} />
                       ));
                     })()}
                   </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col items-center">
        
        {/* حالة المزايدة */}
        {liveData.game_state === "bidding" && activeQuestion && (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2rem] shadow-xl border-4 border-yellow-500 text-center w-full animate-in slide-in-from-bottom-8">
            <h3 className="text-sm font-black text-slate-500 dark:text-slate-400 mb-2">فئة السؤال القادم</h3>
            <h2 className="text-4xl md:text-6xl font-black mb-8 text-slate-800 dark:text-white drop-shadow-sm">{activeQuestion.category}</h2>
            
            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl mb-8 border-2 border-slate-200 dark:border-slate-800 shadow-inner">
               {myBalance <= 0 ? (
                 <div className="py-6">
                    <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-pulse" />
                    <p className="font-black text-xl text-rose-600">رصيدك 0 💰</p>
                    <p className="font-bold text-slate-500 mt-2">لا يمكنك المزايدة في هذه الجولة.</p>
                 </div>
               ) : (
                 <>
                   <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-4 text-right">أدخل مبلغ المزايدة الخاصة بك:</label>
                   <div className="flex flex-col sm:flex-row gap-3">
                     <div className={`flex items-center bg-white dark:bg-slate-900 border-2 rounded-xl transition-colors overflow-hidden flex-1 ${teamId === 1 ? "border-cyan-300 focus-within:border-cyan-500" : "border-rose-300 focus-within:border-rose-500"}`}>
                       <button onClick={() => setMyBid(p => (Number(p) || 0) + 100)} className={`px-4 py-4 font-black text-2xl transition-colors ${teamId === 1 ? "text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/30" : "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"}`}>+</button>
                       <input 
                         type="number" 
                         placeholder="مثال: 1500"
                         value={myBid} 
                         onChange={e => setMyBid(e.target.value === "" ? "" : Number(e.target.value))} 
                         step={100}
                         className="w-full text-center bg-transparent font-black outline-none text-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                       />
                       <button onClick={() => setMyBid(p => Math.max(0, (Number(p) || 0) - 100))} className={`px-4 py-4 font-black text-2xl transition-colors ${teamId === 1 ? "text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/30" : "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"}`}>-</button>
                     </div>
                     <button onClick={handleSendBid} className="py-4 px-8 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black text-lg rounded-xl border-b-4 border-yellow-700 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex items-center justify-center gap-2">
                        إرسال <Send size={20} />
                     </button>
                   </div>
                 </>
               )}
            </div>
            <p className="text-xs font-bold text-slate-400">بانتظار الحكم لإعلان النتيجة بعد انتهاء المزايدات...</p>
          </div>
        )}

        {/* حالة ظهور السؤال والمؤقت */}
        {(liveData.game_state === "questionReveal" || liveData.game_state === "options") && (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2rem] shadow-xl border-4 border-slate-200 dark:border-slate-800 text-center w-full animate-in fade-in">
             <div className="flex justify-between items-center mb-6">
                <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg text-xs font-black text-slate-500 border border-slate-300 dark:border-slate-700">
                  سؤال الجولة {(liveData.current_index || 0) + 1}
                </span>
                <div className={`text-3xl md:text-4xl font-black font-mono flex items-center gap-2 ${liveData.timer <= 5 ? "text-rose-500 animate-pulse" : "text-yellow-500"}`}>
                  <TimerIcon size={24} /> {liveData.timer || 0}
                </div>
             </div>

             <div className="py-6 md:py-10 border-y-2 border-slate-100 dark:border-slate-800/50 my-4 bg-slate-50 dark:bg-slate-950/30 rounded-2xl">
                {!liveData.is_question_visible ? (
                  <div className="text-slate-400 dark:text-slate-500 flex flex-col items-center gap-3 animate-pulse">
                    <Eye size={40} />
                    <p className="font-black text-lg">بانتظار إظهار السؤال من الحكم...</p>
                  </div>
                ) : (
                  <h2 className="text-xl md:text-3xl font-black leading-relaxed text-slate-800 dark:text-white px-4">
                    {activeQuestion?.question || "جاري تحميل السؤال..."}
                  </h2>
                )}
             </div>

             {liveData.game_state === "options" && liveData.play_mode === "with_options" && liveData.is_question_visible && (
               <div className="flex flex-col gap-3 mt-6">
                  {activeQuestion?.options?.map((opt: string, i: number) => {
                     const isSelected = liveData.selected_option === opt;
                     const isCorrect = opt === activeQuestion.answer;
                     const showResult = liveData.selected_option !== null && liveData.selected_option !== undefined;

                     let optClass = "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300";

                     if (showResult) {
                        if (isCorrect) {
                           optClass = "bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-500 dark:text-emerald-400 scale-105";
                        } else if (isSelected && !isCorrect) {
                           optClass = "bg-rose-100 border-rose-500 text-rose-800 dark:bg-rose-900/40 dark:border-rose-500 dark:text-rose-400 scale-105";
                        } else {
                           optClass = "opacity-40 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500";
                        }
                     }

                     return (
                       <div key={i} className={`p-4 border-2 rounded-xl font-black text-sm md:text-lg text-right transition-all duration-300 shadow-sm ${optClass}`}>
                         {opt}
                       </div>
                     );
                  })}
               </div>
             )}

             {liveData.game_state === "options" && liveData.play_mode === "no_options" && liveData.is_question_visible && (
               <div className="mt-6 p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-400 font-black">
                 يتم الإجابة شفهياً بدون خيارات 🎤
               </div>
             )}
          </div>
        )}

        {/* حالة شراء السؤال */}
        {liveData.game_state === "buyOffer" && (
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[2rem] shadow-xl border-4 border-purple-500 text-center w-full animate-in zoom-in flex flex-col items-center justify-center min-h-[30vh]">
             <Handshake className="w-16 h-16 text-purple-500 mb-4 animate-bounce" />
             <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">عرض الشراء!</h2>
             <p className="text-sm font-bold text-slate-500 dark:text-slate-400">هناك عرض على الطاولة لشراء السؤال، الرجاء الانتباه لقرار الحكم.</p>
          </div>
        )}

        {/* الحالات الأخرى (الانتظار) */}
        {["preRisk", "optionsDecision", "rewardChoice", "result"].includes(liveData.game_state) && (
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[2rem] shadow-xl border-4 border-slate-200 dark:border-slate-800 text-center w-full animate-in zoom-in flex flex-col items-center justify-center min-h-[30vh]">
             <ShieldAlert className="w-16 h-16 text-slate-400 mb-4 animate-bounce" />
             <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">إجراءات تحكيمية جارية</h2>
             <p className="text-sm font-bold text-slate-500 dark:text-slate-400">الرجاء الانتباه للحكم والشاشة الرئيسية للاستماع للقرارات والمفاوضات.</p>
          </div>
        )}

        {/* النهاية */}
        {liveData.game_state === "gameOver" && (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] shadow-2xl border-4 border-yellow-500 text-center w-full animate-in zoom-in duration-700">
             <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6 animate-pulse" />
             <h2 className="text-4xl font-black mb-4 text-slate-800 dark:text-white">انتهت الحرب!</h2>
             <p className="text-xl font-bold text-slate-500 mb-8">الرجاء النظر للشاشة الرئيسية لمعرفة الفائز النهائي.</p>
          </div>
        )}

      </div>
    </main>
  );
}