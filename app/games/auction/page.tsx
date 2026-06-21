"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Cairo } from "next/font/google";
import { createClient } from "@supabase/supabase-js";
import {
  Gavel, Play, Wallet, Coins, Eye, Target, ShieldAlert, ArrowRight,
  CheckCircle2, XCircle, Handshake, Trophy, Home, ArrowLeft,
  ChevronDown, User, AlertTriangle, Moon, Sun, Timer as TimerIcon,
  Zap, QrCode, Copy
} from "lucide-react";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AuctionRefereeScreen() {
  const [mounted, setMounted] = useState(false);
  const [gameState, setGameState] = useState<
    "setup" | "bidding" | "preRisk" | "questionReveal" | "optionsDecision" | "buyOffer" | "options" | "rewardChoice" | "result" | "gameOver"
  >("setup");

  const [t1Name, setT1Name] = useState("الفريق الأول");
  const [t2Name, setT2Name] = useState("الفريق الثاني");
  const [startBalance, setStartBalance] = useState(50000);
  const [qCount, setQCount] = useState(15);
  const [roomCode, setRoomCode] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);

  const [isDark, setIsDark] = useState<boolean>(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [t1Balance, setT1Balance] = useState(0);
  const [t2Balance, setT2Balance] = useState(0);
  const [t1Points, setT1Points] = useState(0);
  const [t2Points, setT2Points] = useState(0);
  const [t1Ambush, setT1Ambush] = useState(3);
  const [t2Ambush, setT2Ambush] = useState(3);
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [turn, setTurn] = useState<1 | 2>(1);

  const [t1Bid, setT1Bid] = useState<number | "">("");
  const [t2Bid, setT2Bid] = useState<number | "">("");
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [buyer, setBuyer] = useState<1 | 2 | null>(null);
  
  const [isDoubleRisk, setIsDoubleRisk] = useState<boolean>(false);
  const [playMode, setPlayMode] = useState<"no_options" | "options_normal" | "options_ambush" | "with_options" | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  const [timer, setTimer] = useState<number>(25);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isQuestionVisible, setIsQuestionVisible] = useState<boolean>(false);

  const [alertConfig, setAlertConfig] = useState<{ show: boolean; message: string; isConfirm?: boolean; onConfirm?: () => void }>({
    show: false, message: "",
  });

  const triggerAlert = (msg: string) => setAlertConfig({ show: true, message: msg, isConfirm: false });
  const triggerConfirm = (msg: string, onConfirm: () => void) => setAlertConfig({ show: true, message: msg, isConfirm: true, onConfirm });
  const closeAlert = () => setAlertConfig({ show: false, message: "" });

  useEffect(() => {
    setMounted(true);
    const initRoom = async () => {
      const newCode = Math.random().toString(36).substring(2, 7).toUpperCase();
      setRoomCode(newCode);
      await supabase.from("auction_rooms").upsert([{
        room_code: newCode,
        game_state: "setup",
        t1_name: t1Name,
        t2_name: t2Name,
        t1_balance: startBalance,
        t2_balance: startBalance
      }]);
    };
    initRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (roomCode && gameState === "setup") {
      const delay = setTimeout(async () => {
        await supabase.from("auction_rooms").update({
          t1_name: t1Name,
          t2_name: t2Name,
          t1_balance: startBalance,
          t2_balance: startBalance
        }).eq("room_code", roomCode);
      }, 500); 
      return () => clearTimeout(delay);
    }
  }, [t1Name, t2Name, startBalance, roomCode, gameState]);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timer > 0) interval = setInterval(() => setTimer(t => t - 1), 1000);
    else if (timer === 0) setIsTimerRunning(false);
    return () => clearInterval(interval);
  }, [isTimerRunning, timer]);

  useEffect(() => {
    if (!roomCode || gameState === "setup") return;
    const syncData = async () => {
      await supabase.from("auction_rooms").update({
        game_state: gameState,
        t1_balance: t1Balance, t2_balance: t2Balance,
        t1_points: t1Points, t2_points: t2Points,
        t1_ambush: t1Ambush, t2_ambush: t2Ambush,
        questions: questions,
        current_index: currentIndex,
        turn: turn, winner: winner, buyer: buyer,
        is_double_risk: isDoubleRisk, play_mode: playMode,
        timer: timer, is_timer_running: isTimerRunning,
        is_question_visible: isQuestionVisible
      }).eq("room_code", roomCode);
    };
    syncData();
  }, [gameState, t1Balance, t2Balance, t1Points, t2Points, currentIndex, winner, buyer, playMode, isDoubleRisk, turn, timer, isTimerRunning, isQuestionVisible, roomCode]);

  useEffect(() => {
    if (!roomCode) return;
    const channel = supabase.channel('referee_sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auction_rooms', filter: `room_code=eq.${roomCode}` }, (payload) => {
        const newData = payload.new as any;
        if (newData.t1_bid !== null && newData.t1_bid !== undefined) setT1Bid(newData.t1_bid);
        if (newData.t2_bid !== null && newData.t2_bid !== undefined) setT2Bid(newData.t2_bid);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomCode]);

  const copyLink = () => {
    if (typeof window !== 'undefined') {
      const link = `${window.location.origin}/games/auction/team?room=${roomCode}`;
      navigator.clipboard.writeText(link);
      triggerAlert("تم نسخ رابط الغرفة بنجاح!");
    }
  };

  const startGame = async () => {
    // جلب الأسئلة الحقيقية من السيرفر
    const { data, error } = await supabase
      .from("aw_settings")
      .select("data")
      .eq("id", "admin_aw_questions_db")
      .single();

    let realQuestions = [];
    if (data && data.data && data.data.length > 0) {
      realQuestions = data.data;
    } else {
      // لو البنك فاضي نوقف اللعبة ونعطيه تنبيه
      triggerAlert("بنك الأسئلة فاضي! روح للوحة التحكم وضيف أسئلة قبل تبدأ اللعبة.");
      return; 
    }

    // لو طلب أسئلة أكثر من اللي في البنك، نخليه ياخذ اللي موجود بس
    const actualQCount = Math.min(qCount, realQuestions.length);
    
    // خلط الأسئلة واختيار العدد المطلوب عشوائياً
    const selectedQs = [...realQuestions].sort(() => 0.5 - Math.random()).slice(0, actualQCount);
    
    setQuestions(selectedQs);
    setT1Balance(startBalance);
    setT2Balance(startBalance);
    setT1Points(0);
    setT2Points(0);
    
    setT1Ambush(3);
    setT2Ambush(3);
    
    await supabase.from("auction_rooms").update({
      game_state: "bidding",
      t1_balance: startBalance, t2_balance: startBalance,
      t1_points: 0, t2_points: 0,
      t1_ambush: 3, t2_ambush: 3,
      questions: selectedQs, current_index: 0, turn: 1,
      timer: 25, is_timer_running: false, is_question_visible: false,
      selected_option: null
    }).eq("room_code", roomCode);

    setSelectedOption(null);
    setGameState("bidding");
  };

  const calculateMinBid = (teamId: 1 | 2) => {
    const oppBalance = teamId === 1 ? t2Balance : t1Balance;
    const myBalance = teamId === 1 ? t1Balance : t2Balance;
    const remainingQs = questions.length - currentIndex;
    if (oppBalance <= 0 && remainingQs > 0) {
      const calculated = Math.floor(myBalance / remainingQs);
      return Math.max(100, Math.floor(calculated / 100) * 100);
    }
    return 1000;
  };

  const handleBidsSubmit = () => {
    const b1 = t1Balance <= 0 ? 0 : Number(t1Bid);
    const b2 = t2Balance <= 0 ? 0 : Number(t2Bid);
    const minB1 = calculateMinBid(1);
    const minB2 = calculateMinBid(2);

    if (t1Balance > 0) {
      if (b1 < minB1) { triggerAlert(`الحد الأدنى لمزايدة ${t1Name} هو ${minB1}`); return; }
      if (b1 % 100 !== 0) { triggerAlert(`يجب أن تكون مزايدة ${t1Name} من مضاعفات الـ 100.`); return; }
      if (b1 > t1Balance) { triggerAlert(`لا يمكن لـ ${t1Name} المزايدة بأكثر من رصيده.`); return; }
    }

    if (t2Balance > 0) {
      if (b2 < minB2) { triggerAlert(`الحد الأدنى لمزايدة ${t2Name} هو ${minB2}`); return; }
      if (b2 % 100 !== 0) { triggerAlert(`يجب أن تكون مزايدة ${t2Name} من مضاعفات الـ 100.`); return; }
      if (b2 > t2Balance) { triggerAlert(`لا يمكن لـ ${t2Name} المزايدة بأكثر من رصيده.`); return; }
    }

    let winId: 1 | 2;
    if (b1 > b2) winId = 1;
    else if (b2 > b1) winId = 2;
    else winId = turn;

    setWinner(winId);
    
    const winningBid = winId === 1 ? b1 : b2;
    if (winId === 1) setT1Balance(p => Math.max(0, p - winningBid));
    else setT2Balance(p => Math.max(0, p - winningBid));

    setGameState("preRisk");
  };

  const handlePreRiskDecision = (double: boolean) => {
    const wBid = winner === 1 ? Number(t1Bid) : Number(t2Bid);
    const currentBalance = winner === 1 ? t1Balance : t2Balance;

    if (double) {
      if (currentBalance < wBid) {
        triggerAlert("الرصيد لا يكفي لتفعيل الدبل (تحتاج لمبلغ إضافي يعادل مزايدتك).");
        return;
      }
      if (winner === 1) setT1Balance(p => Math.max(0, p - wBid));
      else setT2Balance(p => Math.max(0, p - wBid));
    }

    setIsDoubleRisk(double);
    setTimer(25);
    setIsTimerRunning(false);
    setIsQuestionVisible(false);
    setGameState("questionReveal");
  };

  const handleBuyQuestion = (accept: boolean) => {
    const loser = winner === 1 ? 2 : 1;
    const loserBid = loser === 1 ? Number(t1Bid) : Number(t2Bid);
    const offerPrice = loserBid * 2; 

    if (accept) {
      const loserBalance = loser === 1 ? t1Balance : t2Balance;
      if (loserBalance < offerPrice) { 
        triggerAlert("عملية ملغاة! رصيد المشتري لا يكفي لإتمام صفقة الشراء."); 
        return; 
      }
      if (loser === 1) {
        setT1Balance(p => p - offerPrice);
        setT2Balance(p => p + offerPrice);
      } else {
        setT2Balance(p => p - offerPrice);
        setT1Balance(p => p + offerPrice);
      }
      setBuyer(loser);
      setPlayMode("with_options");
      setGameState("options"); 
    } else {
      setGameState("questionReveal");
    }
  };

  const handleAnswer = (isCorrect: boolean) => {
    setIsTimerRunning(false); 
    const activeTeam = buyer ? buyer : winner;
    
    if (!isCorrect) {
      setGameState("result");
    } else {
      if (buyer) {
        if (activeTeam === 1) setT1Points(p => p + 5);
        else setT2Points(p => p + 5);
        setGameState("result");
      } else {
        // الفائز الأساسي سواء بخيارات أو بدون ينتقل لاختيار المكافأة والكمين
        setGameState("rewardChoice");
      }
    }
  };

  const handleRewardChoice = (choice: "points" | "ambush") => {
    const wBid = winner === 1 ? Number(t1Bid) : Number(t2Bid);
    const lBid = winner === 1 ? Number(t2Bid) : Number(t1Bid);
    const riskMultiplier = isDoubleRisk ? 2 : 1;

    if (choice === "points") {
      // 10 بدون خيارات، 5 مع الخيارات (وتنضرب في 2 لو فيه دبل)
      const basePts = playMode === "no_options" ? 10 : 5;
      const pts = basePts * riskMultiplier;
      if (winner === 1) setT1Points(p => p + pts);
      else setT2Points(p => p + pts);
    } else if (choice === "ambush") {
      // يرجع له مزايدته (مدبلة لو اختار دبل)، ويخصم من الخصم مزايدته العادية وتنقص بطاقة
      const refund = wBid * riskMultiplier;
      if (winner === 1) {
        setT1Balance(p => p + refund);
        setT2Balance(p => Math.max(0, p - lBid));
        setT1Ambush(p => Math.max(0, p - 1));
      } else {
        setT2Balance(p => p + refund);
        setT1Balance(p => Math.max(0, p - lBid));
        setT2Ambush(p => Math.max(0, p - 1));
      }
    }
    setGameState("result");
  };

  const nextQuestion = async () => {
    if (currentIndex + 1 >= questions.length) {
      setGameState("gameOver");
    } else {
      setCurrentIndex(p => p + 1);
      setTurn(turn === 1 ? 2 : 1);
      setWinner(null);
      setBuyer(null);
      setPlayMode(null);
      setIsDoubleRisk(false);
      setIsQuestionVisible(false);
      setTimer(25);
      setT1Bid("");
      setT2Bid("");
      setSelectedOption(null);
      
      await supabase.from("auction_rooms").update({ t1_bid: null, t2_bid: null, selected_option: null }).eq("room_code", roomCode);
      setGameState("bidding");
    }
  };

  const getWinnerName = () => winner === 1 ? t1Name : t2Name;
  const getWinnerBid = () => winner === 1 ? Number(t1Bid) : Number(t2Bid);
  const getLoserBid = () => winner === 1 ? Number(t2Bid) : Number(t1Bid);
  const getWinnerCurrentBalance = () => winner === 1 ? t1Balance : t2Balance;

  if (!mounted) return null;

  return (
    <main className={`min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-3 md:p-6 flex flex-col relative z-10 transition-colors duration-500 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${cairo.className}`} dir="rtl">
      
      <button onClick={() => setIsDark(!isDark)} className="absolute top-4 left-4 md:top-6 md:left-6 z-[110] p-2 md:p-3 rounded-xl bg-white dark:bg-slate-800 text-yellow-500 shadow-lg border-b-4 border-slate-200 dark:border-slate-900 active:border-b-0 active:translate-y-[4px] transition-all">
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {showQRModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 border-4 border-yellow-500 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-6">امسح الباركود للدخول</h2>
              <div className="bg-white p-4 rounded-2xl mx-auto w-fit mb-6 shadow-inner">
                {roomCode && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent((typeof window !== 'undefined' ? window.location.origin : '') + '/games/auction/team?room=' + roomCode)}`} alt="QR" className="w-48 h-48" />}
              </div>
              <p className="text-3xl font-black tracking-[0.3em] text-yellow-600 dark:text-yellow-500 mb-8 uppercase">{roomCode}</p>
              <button onClick={() => setShowQRModal(false)} className="w-full py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-black rounded-xl border-b-4 border-slate-300 dark:border-slate-950 active:border-b-0 active:translate-y-[4px] transition-all">
                 إغلاق
              </button>
           </div>
        </div>
      )}

      {alertConfig.show && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border-b-4 border-yellow-500 p-6 md:p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
            <AlertTriangle className="w-12 h-12 md:w-16 md:h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white mb-2">تنبيه النظام</h3>
            <p className="text-slate-600 dark:text-slate-300 font-bold text-sm mb-6 leading-relaxed whitespace-pre-line">{alertConfig.message}</p>
            <div className="flex gap-3 justify-center">
              {alertConfig.isConfirm && (
                <button onClick={closeAlert} className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-black rounded-xl border-b-4 border-slate-300 dark:border-slate-950 active:border-b-0 active:translate-y-[4px] transition-all shadow-md">إلغاء</button>
              )}
              <button onClick={() => { if (alertConfig.isConfirm && alertConfig.onConfirm) alertConfig.onConfirm(); closeAlert(); }} className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black rounded-xl border-b-4 border-yellow-700 active:border-b-0 active:translate-y-[4px] transition-all shadow-md">{alertConfig.isConfirm ? "تأكيد" : "حسناً"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-5xl mx-auto flex flex-col gap-3 md:gap-4 mb-4 md:mb-6 shrink-0 mt-14 md:mt-0">
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-900 p-3 md:p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm gap-4 sm:gap-0">
          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-start">
            <Link href="/" className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl flex items-center justify-center gap-2 font-black text-xs border-b-4 border-slate-300 dark:border-slate-950 active:border-b-0 active:translate-y-[4px] transition-all flex-1 sm:flex-none">
              <Home size={16} /> الرئيسية
            </Link>
            <button onClick={() => window.history.back()} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl flex items-center justify-center gap-2 font-black text-xs border-b-4 border-slate-300 dark:border-slate-950 active:border-b-0 active:translate-y-[4px] transition-all flex-1 sm:flex-none">
              <ArrowLeft size={16} /> رجوع
            </button>
          </div>
          
          {roomCode && (
            <div className="flex gap-2 items-center bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
               <span className="font-black tracking-widest text-slate-700 dark:text-slate-300 uppercase text-sm">{roomCode}</span>
               <button onClick={() => setShowQRModal(true)} className="text-yellow-500 hover:text-yellow-400 transition-colors"><QrCode size={18} /></button>
               <button onClick={copyLink} className="text-yellow-500 hover:text-yellow-400 transition-colors"><Copy size={18} /></button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Gavel className="text-yellow-500 w-6 h-6 md:w-8 md:h-8" />
            <div className="text-right sm:text-left">
              <h1 className="text-base md:text-lg font-black tracking-wide text-slate-900 dark:text-white">حرب المزايدات</h1>
              <p className="text-[10px] md:text-xs font-bold text-yellow-600 dark:text-yellow-500">الكنترول المركزي</p>
            </div>
          </div>
        </div>

        {gameState !== "setup" && (
          <div className="flex flex-col gap-3">
             <div className="flex justify-between items-center px-1">
                <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full text-[10px] md:text-xs font-black border border-yellow-200 dark:border-yellow-800 shadow-sm">
                  الجولة {currentIndex + 1} من {questions.length}
                </span>
                <span className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full">
                  المتبقي: {questions.length - currentIndex} أسئلة
                </span>
             </div>
             <div className="grid grid-cols-2 gap-3 md:gap-4 bg-white dark:bg-slate-900 p-3 md:p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm">
               <div className="text-center p-2 md:p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800/50 shadow-inner flex flex-col justify-center">
                  <p className="text-[10px] md:text-xs font-black text-cyan-600 dark:text-cyan-400 mb-1 truncate">{t1Name}</p>
                  <p className="font-black text-base md:text-xl text-slate-800 dark:text-white">
                    {t1Balance <= 0 ? <span className="text-rose-500">إفلاس 0 💰</span> : `${t1Balance.toLocaleString()} 💰`} 
                    <span className="text-slate-300 dark:text-slate-700 mx-1 md:mx-2">|</span> 
                    <span className="text-cyan-600 dark:text-cyan-400">{t1Points}</span> 🏆
                  </p>
                  <div className="flex justify-center gap-1 mt-1.5">
                    {Array.from({ length: 3 }).map((_, i) => (<ShieldAlert key={i} size={12} className={i < t1Ambush ? "text-amber-500" : "text-slate-300 dark:text-slate-700 opacity-30"} />))}
                  </div>
               </div>
               <div className="text-center p-2 md:p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800/50 shadow-inner flex flex-col justify-center">
                  <p className="text-[10px] md:text-xs font-black text-rose-600 dark:text-rose-400 mb-1 truncate">{t2Name}</p>
                  <p className="font-black text-base md:text-xl text-slate-800 dark:text-white">
                    {t2Balance <= 0 ? <span className="text-rose-500">إفلاس 0 💰</span> : `${t2Balance.toLocaleString()} 💰`} 
                    <span className="text-slate-300 dark:text-slate-700 mx-1 md:mx-2">|</span> 
                    <span className="text-rose-600 dark:text-rose-400">{t2Points}</span> 🏆
                  </p>
                  <div className="flex justify-center gap-1 mt-1.5">
                    {Array.from({ length: 3 }).map((_, i) => (<ShieldAlert key={i} size={12} className={i < t2Ambush ? "text-amber-500" : "text-slate-300 dark:text-slate-700 opacity-30"} />))}
                  </div>
               </div>
             </div>
          </div>
        )}
      </div>

      <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col justify-center items-center pb-8">
        
        {/* 1. الإعدادات */}
        {gameState === "setup" && (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-2 border-slate-200 dark:border-slate-800 text-center w-full max-w-2xl animate-in zoom-in-95">
            <Wallet className="w-12 h-12 md:w-16 md:h-16 text-yellow-500 mx-auto mb-4 md:mb-6" />
            <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8">إعدادات الغرفة</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 text-right mb-6 md:mb-8">
              <div>
                <label className="block text-[10px] md:text-xs font-black text-slate-500 dark:text-slate-400 mb-1 md:mb-2">الفريق الأول</label>
                <input value={t1Name} onChange={e => setT1Name(e.target.value)} className="w-full p-3 md:p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-black focus:border-cyan-500 outline-none transition-colors text-sm md:text-base" />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs font-black text-slate-500 dark:text-slate-400 mb-1 md:mb-2">الفريق الثاني</label>
                <input value={t2Name} onChange={e => setT2Name(e.target.value)} className="w-full p-3 md:p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-black focus:border-rose-500 outline-none transition-colors text-sm md:text-base" />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs font-black text-slate-500 dark:text-slate-400 mb-1 md:mb-2">الرصيد المبدئي</label>
                <div className="flex items-center bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-yellow-500 transition-colors overflow-hidden">
                  <button onClick={() => setStartBalance(p => p + 1000)} className="px-4 py-3 md:py-4 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors font-black text-lg">+</button>
                  <input type="number" value={startBalance} onChange={e => setStartBalance(Number(e.target.value))} className="w-full text-center bg-transparent font-black outline-none text-sm md:text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  <button onClick={() => setStartBalance(p => Math.max(0, p - 1000))} className="px-4 py-3 md:py-4 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors font-black text-lg">-</button>
                </div>
              </div>
              <div className="relative" ref={dropdownRef}>
                <label className="block text-[10px] md:text-xs font-black text-slate-500 dark:text-slate-400 mb-1 md:mb-2">عدد الأسئلة</label>
                <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full p-3 md:p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-black flex justify-between items-center cursor-pointer select-none transition-colors text-sm md:text-base">
                  <span>{qCount} سؤال عشوائي</span>
                  <ChevronDown size={18} className={`text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                </div>
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2">
                    {[15, 20, 30].map(num => (
                      <div key={num} onClick={() => { setQCount(num); setIsDropdownOpen(false); }} className="p-3 md:p-4 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer font-black text-xs md:text-sm border-b last:border-b-0 border-slate-100 dark:border-slate-700 transition-colors">
                        {num} سؤال عشوائي
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button onClick={startGame} className="w-full py-4 md:py-5 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black text-lg md:text-xl rounded-xl border-b-4 border-yellow-700 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex items-center justify-center gap-3">
               بدء اللعبة <Play size={20} className="md:w-6 md:h-6" />
            </button>
          </div>
        )}

        {/* 2. المزايدة */}
        {gameState === "bidding" && questions[currentIndex] && (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-4 border-yellow-500 text-center w-full max-w-3xl animate-in slide-in-from-bottom-8">
            <div className="inline-flex items-center gap-2 px-4 md:px-5 py-1.5 md:py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 rounded-full text-yellow-600 dark:text-yellow-400 font-black text-xs md:text-sm mb-4 md:mb-6 shadow-sm">
              <User size={14} className="md:w-4 md:h-4" />
              <span>الدور الآن في إعلان المزايدة على: {turn === 1 ? t1Name : t2Name}</span>
            </div>
            <h3 className="text-xs md:text-sm font-black text-slate-500 dark:text-slate-400 mb-1 md:mb-2">فئة السؤال والمجال</h3>
            <h2 className="text-4xl md:text-7xl font-black mb-6 md:mb-10 tracking-wide text-slate-800 dark:text-white drop-shadow-sm">{questions[currentIndex].category}</h2>
            <div className="bg-slate-50 dark:bg-slate-950 p-5 md:p-8 rounded-3xl mb-6 md:mb-8 border-2 border-slate-200 dark:border-slate-800 text-right shadow-inner">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="block text-xs md:text-sm font-black text-cyan-600 dark:text-cyan-400 mb-1 md:mb-2">{t1Name}</label>
                    {t1Balance <= 0 ? (
                      <div className="w-full p-3 md:p-4 bg-slate-200 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl font-black text-center text-slate-500 dark:text-slate-400 text-sm md:text-lg cursor-not-allowed">
                        لا تستطيع المزايدة
                      </div>
                    ) : (
                      <div className="flex items-center bg-white dark:bg-slate-900 border-2 border-cyan-200 dark:border-cyan-800 rounded-xl focus-within:border-cyan-500 transition-colors overflow-hidden">
                        <button onClick={() => setT1Bid(p => (Number(p) || 0) + 100)} className="px-3 py-3 md:px-4 md:py-4 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 transition-colors font-black text-xl">+</button>
                        <input type="number" placeholder={`الأدنى: ${calculateMinBid(1)}`} value={t1Bid} onChange={e => setT1Bid(e.target.value === "" ? "" : Number(e.target.value))} step={100} className="w-full text-center bg-transparent font-black outline-none text-lg md:text-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        <button onClick={() => setT1Bid(p => Math.max(0, (Number(p) || 0) - 100))} className="px-3 py-3 md:px-4 md:py-4 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 transition-colors font-black text-xl">-</button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-black text-rose-600 dark:text-rose-400 mb-1 md:mb-2">{t2Name}</label>
                    {t2Balance <= 0 ? (
                      <div className="w-full p-3 md:p-4 bg-slate-200 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl font-black text-center text-slate-500 dark:text-slate-400 text-sm md:text-lg cursor-not-allowed">
                        لا تستطيع المزايدة
                      </div>
                    ) : (
                      <div className="flex items-center bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-800 rounded-xl focus-within:border-rose-500 transition-colors overflow-hidden">
                        <button onClick={() => setT2Bid(p => (Number(p) || 0) + 100)} className="px-3 py-3 md:px-4 md:py-4 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors font-black text-xl">+</button>
                        <input type="number" placeholder={`الأدنى: ${calculateMinBid(2)}`} value={t2Bid} onChange={e => setT2Bid(e.target.value === "" ? "" : Number(e.target.value))} step={100} className="w-full text-center bg-transparent font-black outline-none text-lg md:text-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        <button onClick={() => setT2Bid(p => Math.max(0, (Number(p) || 0) - 100))} className="px-3 py-3 md:px-4 md:py-4 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors font-black text-xl">-</button>
                      </div>
                    )}
                  </div>
               </div>
            </div>
            <button onClick={handleBidsSubmit} className="w-full py-4 md:py-5 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black text-base md:text-xl rounded-xl border-b-4 border-yellow-700 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex items-center justify-center gap-2">
               اعتماد المزايدات وتحديد الفائز <Gavel size={20} />
            </button>
          </div>
        )}

        {/* 3. تفعيل الدبل قبل السؤال */}
        {gameState === "preRisk" && (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-4 border-yellow-500 text-center w-full max-w-3xl animate-in zoom-in">
             <Zap className="w-16 h-16 md:w-20 md:h-20 text-yellow-500 mx-auto mb-4 md:mb-6 animate-pulse" />
             <h2 className="text-xl md:text-3xl font-black mb-3 md:mb-4 text-slate-800 dark:text-white">الفائز: <span className={winner === 1 ? "text-cyan-600" : "text-rose-600"}>{getWinnerName()}</span></h2>
             <p className="text-lg md:text-xl font-black text-yellow-600 dark:text-yellow-500 mb-6 md:mb-8">المبلغ المخصوم: {getWinnerBid()} 💰</p>
             <div className="bg-slate-50 dark:bg-slate-950 p-5 md:p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-800 mb-6 md:mb-8 shadow-inner">
               <h3 className="font-black text-lg md:text-2xl mb-4 text-slate-800 dark:text-white">تفعيل مخاطرة الدبل قبل كشف السؤال؟</h3>
               <p className="text-xs md:text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mx-auto">
                 بالتفعيل سيُخصم مبلغ إضافي (<span className="text-rose-500">{getWinnerBid()}</span>) للدخول في السؤال.<br/>وستتضاعف النقاط والمكافآت في حال الإجابة بدون خيارات.
               </p>
             </div>
             <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <button onClick={() => handlePreRiskDecision(false)} className="flex-1 py-4 md:py-5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-black text-base md:text-xl rounded-xl border-b-4 border-slate-400 dark:border-slate-950 active:border-b-0 active:translate-y-[4px] transition-all shadow-md">
                   لعب عادي <br className="hidden sm:block"/><span className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-bold">(بدون تدبيل)</span>
                </button>
                {(() => {
                  const canDouble = getWinnerCurrentBalance() >= getWinnerBid();
                  return (
                    <button 
                      onClick={() => {
                        if (!canDouble) { triggerAlert("الرصيد لا يكفي لتفعيل الدبل (تحتاج لمبلغ إضافي يعادل مزايدتك)."); return; }
                        handlePreRiskDecision(true);
                      }} 
                      className={`flex-1 py-4 md:py-5 font-black text-base md:text-xl rounded-xl border-b-4 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex flex-col items-center justify-center gap-1 ${canDouble ? "bg-yellow-500 hover:bg-yellow-400 text-slate-900 border-yellow-700" : "bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 border-slate-400 dark:border-slate-900 cursor-not-allowed"}`}
                    >
                       <span>تفعيل الدبل ⚡</span>
                       <span className="text-[10px] md:text-sm font-bold opacity-80">(خصم إضافي {getWinnerBid()})</span>
                    </button>
                  );
                })()}
             </div>
          </div>
        )}

        {/* 4. كشف السؤال والقرار */}
        {gameState === "questionReveal" && (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-4 border-slate-200 dark:border-slate-800 text-center w-full max-w-4xl flex flex-col min-h-[40vh] md:min-h-[50vh] animate-in fade-in transition-all">
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <ShieldAlert className={`w-6 h-6 ${isDoubleRisk ? "text-yellow-500 animate-pulse" : "text-slate-400"}`} />
                  <span className={`font-black text-sm md:text-lg ${isDoubleRisk ? "text-yellow-500" : "text-slate-500"}`}>
                    {isDoubleRisk ? "وضع الدبل مفعل ⚡" : "مخاطرة عادية"}
                  </span>
                </div>
                <div className={`text-4xl md:text-5xl font-black font-mono flex items-center gap-2 ${timer <= 5 ? "text-rose-500 animate-pulse" : "text-yellow-500"}`}>
                  <TimerIcon size={32} /> {timer}
                </div>
             </div>
             
             <div className="flex-1 flex flex-col items-center justify-center py-4 md:py-8 border-y-2 border-slate-100 dark:border-slate-800/50 my-4 bg-slate-50 dark:bg-slate-950/30 rounded-3xl relative">
                {!isQuestionVisible ? (
                  <button onClick={() => setIsQuestionVisible(true)} className="px-6 py-4 md:px-10 md:py-6 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl border-b-4 border-slate-950 active:border-b-0 active:translate-y-[4px] transition-all text-xl md:text-3xl shadow-xl flex items-center gap-3">
                     <Eye size={32} /> إظهار السؤال للفرق
                  </button>
                ) : (
                  <>
                    <h2 className="text-xl sm:text-2xl md:text-4xl font-black leading-relaxed text-slate-800 dark:text-white px-4 mb-6">
                      {questions[currentIndex].question}
                    </h2>
                    {!isTimerRunning && timer === 25 && (
                      <button onClick={() => setIsTimerRunning(true)} className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-xl border-b-4 border-emerald-700 active:border-b-0 active:translate-y-[4px] transition-all text-base md:text-xl shadow-md flex items-center gap-2">
                         <Play size={24} /> بدء المؤقت (25ث)
                      </button>
                    )}
                  </>
                )}
             </div>

             {isQuestionVisible && (
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mt-4 md:mt-6 animate-in slide-in-from-bottom-4">
                  <button onClick={() => { setPlayMode("no_options"); setGameState("options"); }} className="p-3 md:p-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl border-b-4 border-cyan-800 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex flex-col items-center justify-center gap-1">
                     <span className="text-sm md:text-lg">إجابة بدون خيارات</span>
                     <span className="text-[10px] md:text-xs font-bold opacity-90 bg-cyan-800/40 px-2 py-1 rounded-lg">مكافأة أو كمين</span>
                  </button>
                  <button onClick={() => { setPlayMode("with_options"); setGameState("options"); }} className="p-3 md:p-4 bg-slate-700 hover:bg-slate-600 text-white font-black rounded-xl border-b-4 border-slate-900 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex flex-col items-center justify-center gap-1">
                     <span className="text-sm md:text-lg">إجابة مع الخيارات</span>
                     <span className="text-[10px] md:text-xs font-bold opacity-90 bg-slate-900/40 px-2 py-1 rounded-lg">مكافأة أو كمين</span>
                  </button>
                  {!isDoubleRisk ? (
                    <button onClick={() => { setGameState("buyOffer"); setIsTimerRunning(false); }} className="p-3 md:p-4 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl border-b-4 border-purple-800 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex flex-col items-center justify-center gap-1">
                       <span className="text-sm md:text-lg">بيع السؤال للخصم</span>
                       <span className="text-[10px] md:text-xs font-bold opacity-90 bg-purple-800/40 px-2 py-1 rounded-lg">بدبل مزايدتهم</span>
                    </button>
                  ) : (
                    <div className="p-3 md:p-4 bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-black rounded-xl border-b-4 border-slate-300 dark:border-slate-900 flex flex-col items-center justify-center gap-1 cursor-not-allowed">
                       <span className="text-sm md:text-lg">بيع السؤال (مغلق)</span>
                       <span className="text-[10px] md:text-xs font-bold opacity-90">غير متاح مع الدبل</span>
                    </div>
                  )}
               </div>
             )}
          </div>
        )}

        {/* 4.1 قرار اللعب بالخيارات (إذا ضغط طلب خيارات) */}
        {gameState === "optionsDecision" && (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-4 border-slate-400 text-center w-full max-w-3xl animate-in zoom-in">
             <Eye className="w-16 h-16 md:w-20 md:h-20 text-slate-500 mx-auto mb-4 md:mb-6" />
             <h2 className="text-xl md:text-3xl font-black mb-3 md:mb-4 text-slate-800 dark:text-white">كيف ترغب باللعب مع الخيارات؟</h2>
             <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-8">
                <button onClick={() => { setPlayMode("options_normal"); setGameState("options"); }} className="flex-1 py-4 md:py-6 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-base md:text-xl rounded-xl border-b-4 border-cyan-800 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex flex-col items-center justify-center gap-2">
                   <span>لعب طبيعي 🎯</span>
                   <span className="text-xs md:text-sm opacity-80 bg-cyan-800/50 px-3 py-1 rounded-lg">مكافأة: {isDoubleRisk ? 10 : 5} نقاط</span>
                </button>
                <button onClick={() => { setPlayMode("options_ambush"); setGameState("options"); }} className="flex-1 py-4 md:py-6 bg-rose-500 hover:bg-rose-400 text-white font-black text-base md:text-xl rounded-xl border-b-4 border-rose-700 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex flex-col items-center justify-center gap-2">
                   <span>كمين وتخريب ⚔️</span>
                   <span className="text-[10px] md:text-sm font-bold opacity-90 bg-rose-800/50 px-3 py-1 rounded-lg">(استرداد رصيدك + خصم مزايدة الخصم بدون نقاط)</span>
                </button>
             </div>
          </div>
        )}

        {/* 4.2 شراء السؤال */}
        {gameState === "buyOffer" && (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-4 border-purple-500 text-center w-full max-w-3xl animate-in zoom-in">
             <Handshake className="w-16 h-16 md:w-20 md:h-20 text-purple-500 mx-auto mb-4 md:mb-6" />
             <h2 className="text-2xl md:text-3xl font-black mb-3 md:mb-4 text-slate-800 dark:text-white">شراء السؤال المرتد</h2>
             <p className="text-sm md:text-lg font-bold text-slate-600 dark:text-slate-300 mb-8 md:mb-10 leading-relaxed">
               عرض السؤال للبيع على الخصم بدبل قيمة مزايدته، وقدرها كاش: <br className="sm:hidden"/>
               <span className="text-purple-600 dark:text-purple-400 font-black text-2xl md:text-3xl mx-2 md:mx-3">
                 {getLoserBid() * 2} 💰
               </span>
             </p>
             <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <button onClick={() => handleBuyQuestion(true)} className="flex-1 py-4 md:py-5 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-base md:text-xl rounded-xl border-b-4 border-emerald-700 active:border-b-0 active:translate-y-[4px] transition-all shadow-md">
                  تم البيع (الخصم وافق)
                </button>
                <button onClick={() => handleBuyQuestion(false)} className="flex-1 py-4 md:py-5 bg-slate-800 hover:bg-slate-700 text-white font-black text-base md:text-xl rounded-xl border-b-4 border-slate-950 active:border-b-0 active:translate-y-[4px] transition-all shadow-md">
                  الرفض (نرجع للسؤال)
                </button>
             </div>
          </div>
        )}

        {/* 5. شاشة الخيارات والإجابة */}
        {gameState === "options" && (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-4 border-slate-200 dark:border-slate-800 w-full max-w-4xl flex flex-col animate-in fade-in">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black leading-relaxed text-slate-800 dark:text-white flex-1 text-right">
                  {questions[currentIndex].question}
                </h2>
                <div className={`text-3xl md:text-5xl font-black font-mono flex items-center gap-2 shrink-0 mr-4 ${timer <= 5 ? "text-rose-500 animate-pulse" : "text-yellow-500"}`}>
                  <TimerIcon size={28} /> {timer}
                </div>
             </div>
             
             {playMode !== "no_options" ? (
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 w-full mb-6 md:mb-10">
                  {questions[currentIndex].options.map((opt: string, i: number) => {
                     const isSelected = selectedOption === opt;
                     const isCorrect = opt === questions[currentIndex].answer;
                     const showResult = selectedOption !== null;

                     let optClass = "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400 cursor-pointer";

                     if (showResult) {
                        if (isCorrect) optClass = "bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-500 dark:text-emerald-400 scale-105";
                        else if (isSelected && !isCorrect) optClass = "bg-rose-100 border-rose-500 text-rose-800 dark:bg-rose-900/40 dark:border-rose-500 dark:text-rose-400 scale-105";
                        else optClass = "opacity-40 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 cursor-not-allowed";
                     }

                     return (
                       <button
                         key={i}
                         disabled={showResult}
                         onClick={async () => {
                           setSelectedOption(opt);
                           setIsTimerRunning(false); // إيقاف المؤقت فوراً
                           await supabase.from("auction_rooms").update({ selected_option: opt }).eq("room_code", roomCode);
                         }}
                         className={`p-4 md:p-5 border-2 rounded-xl md:rounded-2xl font-black text-sm md:text-lg text-center shadow-sm transition-all ${!showResult && 'active:scale-95'} ${optClass}`}
                       >
                         {opt}
                       </button>
                     );
                  })}
               </div>
             ) : (
               <div className="py-8 md:py-12 flex justify-center items-center">
                 <p className="text-xl md:text-3xl font-black text-cyan-600 dark:text-cyan-500 animate-pulse bg-cyan-50 dark:bg-cyan-900/20 px-6 py-4 rounded-2xl border border-cyan-200 dark:border-cyan-800">
                   يتم الإجابة شفهياً بدون خيارات 🎤
                 </p>
               </div>
             )}

             <div className="bg-yellow-50 dark:bg-yellow-500/10 p-4 md:p-6 rounded-xl md:rounded-2xl border border-yellow-200 dark:border-yellow-500/30 text-center mb-6 md:mb-8">
               <p className="text-xs md:text-sm font-bold text-yellow-600 dark:text-yellow-500 mb-1 md:mb-2">الإجابة الصحيحة بالكنترول:</p>
               <p className="text-xl md:text-2xl font-black text-yellow-700 dark:text-yellow-400">{questions[currentIndex].answer}</p>
             </div>

             {playMode === "no_options" ? (
               <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <button onClick={() => handleAnswer(true)} className="flex-1 py-4 md:py-5 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-base md:text-xl rounded-xl border-b-4 border-emerald-700 active:border-b-0 active:translate-y-[4px] flex items-center justify-center gap-2 md:gap-3 transition-all shadow-md">
                     <CheckCircle2 size={20} className="md:w-6 md:h-6" /> إجابة صحيحة
                  </button>
                  <button onClick={() => triggerConfirm("هل أنت متأكد من تسجيل الإجابة كخاطئة وتطبيق الخصم؟", () => handleAnswer(false))} className="flex-1 py-4 md:py-5 bg-rose-500 hover:bg-rose-400 text-white font-black text-base md:text-xl rounded-xl border-b-4 border-rose-700 active:border-b-0 active:translate-y-[4px] flex items-center justify-center gap-2 md:gap-3 transition-all shadow-md">
                     <XCircle size={20} className="md:w-6 md:h-6" /> إجابة خاطئة
                  </button>
               </div>
             ) : (
               selectedOption !== null && (
                 <button 
                   onClick={() => handleAnswer(selectedOption === questions[currentIndex].answer)} 
                   className="w-full py-4 md:py-5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-lg md:text-xl rounded-xl border-b-4 border-amber-700 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex items-center justify-center gap-2"
                 >
                   اعتماد النتيجة والانتقال <ArrowRight size={24} />
                 </button>
               )
             )}
          </div>
        )}

        {/* اختيار المكافأة (لو جاوب بالخيارات وكان هو الفائز الأساسي واختار لعب طبيعي) */}
        {gameState === "rewardChoice" && (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-4 border-emerald-500 text-center w-full max-w-4xl animate-in zoom-in">
             <CheckCircle2 className="w-16 h-16 md:w-20 md:h-20 text-emerald-500 mx-auto mb-4 md:mb-6" />
             <h2 className="text-2xl md:text-3xl font-black mb-2 text-slate-800 dark:text-white">إجابة صحيحة! 🎉</h2>
             <p className="text-sm md:text-lg font-bold text-slate-500 dark:text-slate-400 mb-6 md:mb-10">اختر المكافأة التي تناسب تكتيكك:</p>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <button onClick={() => handleRewardChoice("points")} className="p-6 md:p-8 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-800/40 border-b-4 border-cyan-400 dark:border-cyan-700 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-3 transition-all active:border-b-0 active:translate-y-[4px] group shadow-md">
                   <Target className="w-10 h-10 md:w-14 md:h-14 text-cyan-500 group-hover:scale-110 transition-transform" />
                   <span className="font-black text-xl md:text-2xl text-cyan-700 dark:text-cyan-400">النقاط العادية</span>
                   <span className="text-xs md:text-sm font-bold bg-cyan-100 dark:bg-cyan-950 px-3 py-1 rounded-full text-cyan-800 dark:text-cyan-300">
                     إضافة {playMode === "no_options" ? (isDoubleRisk ? 20 : 10) : (isDoubleRisk ? 10 : 5)} نقاط لرصيدك
                   </span>
                </button>
                {(() => {
                  const ambushesLeft = winner === 1 ? t1Ambush : t2Ambush;
                  return ambushesLeft > 0 ? (
                    <button onClick={() => handleRewardChoice("ambush")} className="p-6 md:p-8 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-800/40 border-b-4 border-amber-400 dark:border-amber-700 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-3 transition-all active:border-b-0 active:translate-y-[4px] group shadow-md">
                       <ShieldAlert className="w-10 h-10 md:w-14 md:h-14 text-amber-500 group-hover:scale-110 transition-transform" />
                       <span className="font-black text-xl md:text-2xl text-amber-700 dark:text-amber-400">كمين (باقي {ambushesLeft})</span>
                       <span className="text-[10px] md:text-xs font-bold leading-relaxed bg-amber-100 dark:bg-amber-950 p-2 rounded-xl text-amber-800 dark:text-amber-300">
                         استرداد اللي دفعته ({isDoubleRisk ? getWinnerBid() * 2 : getWinnerBid()} 💰)<br/>
                         وخصم مزايدة الخصم من رصيده
                       </span>
                    </button>
                  ) : (
                    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-800 border-b-4 border-slate-300 dark:border-slate-700 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-3 shadow-md opacity-70 cursor-not-allowed">
                       <ShieldAlert className="w-10 h-10 md:w-14 md:h-14 text-slate-400" />
                       <span className="font-black text-xl md:text-2xl text-slate-500">كمين (نفدت البطاقات)</span>
                       <span className="text-[10px] md:text-xs font-bold leading-relaxed bg-slate-200 dark:bg-slate-700 p-2 rounded-xl text-slate-500">
                         لا يمكنك استخدام هذا الخيار<br/>لأنك استنفدت المحاولات الـ 3
                       </span>
                    </div>
                  );
                })()}
             </div>
          </div>
        )}

        {/* 6. شاشة احتساب النتيجة الوسطية */}
        {gameState === "result" && (
          <div className="bg-white dark:bg-slate-900 p-8 md:p-16 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-4 border-slate-200 dark:border-slate-800 text-center w-full max-w-2xl animate-in zoom-in flex flex-col items-center justify-center">
             <CheckCircle2 className="w-16 h-16 md:w-20 md:h-20 text-emerald-500 mb-4 md:mb-6" />
             <h2 className="text-2xl md:text-3xl font-black mb-3 md:mb-4 text-slate-800 dark:text-white">تم التحديث</h2>
             <p className="text-sm md:text-lg font-bold text-slate-500 dark:text-slate-400 mb-8 md:mb-10">جميع الحسابات (من مزايدة وخصومات ونقاط) تمت بنجاح.</p>
             <button onClick={nextQuestion} className="w-full py-4 md:py-5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-lg md:text-xl rounded-xl border-b-4 border-amber-700 active:border-b-0 active:translate-y-[4px] flex items-center justify-center gap-2 md:gap-3 transition-all shadow-lg">
                بدء الجولة التالية <ArrowRight size={20} className="md:w-6 md:h-6" />
             </button>
          </div>
        )}

        {/* 7. النهاية */}
        {gameState === "gameOver" && (
          <div className="bg-white dark:bg-slate-900 p-10 md:p-20 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl border-4 border-amber-500 text-center w-full max-w-3xl animate-in zoom-in duration-700">
             <Trophy className="w-24 h-24 md:w-32 md:h-32 text-amber-500 mx-auto mb-6 md:mb-8 animate-bounce" />
             <h2 className="text-4xl md:text-5xl font-black mb-4 md:mb-6 text-slate-800 dark:text-white">انتهت الحرب!</h2>
             <div className="text-xl md:text-3xl font-black text-slate-600 dark:text-slate-300">
               الـفـائـز الـنـهـائـي: {t1Points > t2Points ? <span className="text-cyan-600 dark:text-cyan-400">{t1Name}</span> : t1Points < t2Points ? <span className="text-rose-600 dark:text-rose-400">{t2Name}</span> : <span className="text-amber-500">تعادل عادل</span>}
             </div>
          </div>
        )}

      </div>
    </main>
  );
}