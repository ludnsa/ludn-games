"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { generateRoomCode } from "@/lib/game/room-code";
import { shuffleArray } from "@/lib/game/shuffle";
import { useGameTimer } from "@/hooks/shared/useGameTimer";
import { useGameAccess } from "@/hooks/shared/useGameAccess";
import { useRouter } from "next/navigation";


export function useAuctionReferee() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const { checkAccess, consumeGameSession } = useGameAccess();
  
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
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
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [turn, setTurn] = useState<1 | 2>(1);

  const [t1Bid, setT1Bid] = useState<number | "">("");
  const [t2Bid, setT2Bid] = useState<number | "">("");
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [buyer, setBuyer] = useState<1 | 2 | null>(null);
  
  const [isDoubleRisk, setIsDoubleRisk] = useState<boolean>(false);
  const [playMode, setPlayMode] = useState<"no_options" | "options_normal" | "options_ambush" | "with_options" | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  const { timer, setTimer, isTimerRunning, setIsTimerRunning } = useGameTimer(25);
  const [isQuestionVisible, setIsQuestionVisible] = useState<boolean>(false);

  const [alertConfig, setAlertConfig] = useState<{ show: boolean; message: string; isConfirm?: boolean; onConfirm?: () => void }>({
    show: false, message: "",
  });

  const triggerAlert = (msg: string) => setAlertConfig({ show: true, message: msg, isConfirm: false });
  const triggerConfirm = (msg: string, onConfirm: () => void) => setAlertConfig({ show: true, message: msg, isConfirm: true, onConfirm });
  const closeAlert = () => setAlertConfig({ show: false, message: "" });

  useEffect(() => {
    setMounted(true);
    
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getSession();

    const initRoom = async () => {
      let savedCode = sessionStorage.getItem("auction_referee_room_code");
      if (savedCode) {
        const { data } = await supabase.from("auction_rooms").select("*").eq("room_code", savedCode).single();
        if (data && data.game_state !== "gameOver") {
          setRoomCode(savedCode);
          setGameState(data.game_state);
          setT1Name(data.t1_name);
          setT2Name(data.t2_name);
          setT1Balance(data.t1_balance);
          setT2Balance(data.t2_balance);
          setT1Points(data.t1_points);
          setT2Points(data.t2_points);
          setT1Ambush(data.t1_ambush);
          setT2Ambush(data.t2_ambush);
          setQuestions(data.questions || []);
          setCurrentIndex(data.current_index || 0);
          setTurn(data.turn || 1);
          setWinner(data.winner);
          setBuyer(data.buyer);
          setIsDoubleRisk(data.is_double_risk || false);
          setPlayMode(data.play_mode);
          setTimer(data.timer || 25);
          setIsTimerRunning(data.is_timer_running || false);
          setIsQuestionVisible(data.is_question_visible || false);
          if (data.t1_bid !== null && data.t1_bid !== undefined) setT1Bid(data.t1_bid);
          if (data.t2_bid !== null && data.t2_bid !== undefined) setT2Bid(data.t2_bid);
          setSelectedOption(data.selected_option);
          return;
        }
      }
      
      const newCode = "A" + Math.random().toString(36).substring(2, 6).toUpperCase();
      sessionStorage.setItem("auction_referee_room_code", newCode);
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
    if (gameState === "gameOver") {
      const timer = setTimeout(() => {
        router.push("/my-games");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [gameState, router]);

  // Timer logic is now handled by useGameTimer hook

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
  }, [gameState, t1Balance, t2Balance, t1Points, t2Points, currentIndex, winner, buyer, playMode, isDoubleRisk, turn, timer, isTimerRunning, isQuestionVisible, roomCode, questions]);

  useEffect(() => {
    if (!roomCode) return;

    const fetchBidsFallback = async () => {
      const { data } = await supabase.from("auction_rooms").select("t1_bid, t2_bid").eq("room_code", roomCode).neq("t1_name", Date.now().toString()).single();
      if (data) {
        if (data.t1_bid !== null && data.t1_bid !== undefined) setT1Bid(data.t1_bid);
        if (data.t2_bid !== null && data.t2_bid !== undefined) setT2Bid(data.t2_bid);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchBidsFallback();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const channel = supabase.channel('referee_sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auction_rooms', filter: `room_code=eq.${roomCode}` }, (payload) => {
        const newData = payload.new as any;
        if (newData.t1_bid !== null && newData.t1_bid !== undefined) setT1Bid(newData.t1_bid);
        if (newData.t2_bid !== null && newData.t2_bid !== undefined) setT2Bid(newData.t2_bid);
      })
      .subscribe();
      
    return () => { 
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      supabase.removeChannel(channel); 
    };
  }, [roomCode]);

  const copyLink = () => {
    if (typeof window !== 'undefined') {
      const link = `${window.location.origin}/games/auction/team?room=${roomCode}`;
      navigator.clipboard.writeText(link);
      triggerAlert("تم نسخ رابط الغرفة بنجاح!");
    }
  };

  const resetTeamDevice = async (teamNum: 1 | 2) => {
    if (!roomCode) return;
    const colName = teamNum === 1 ? "t1_device_id" : "t2_device_id";
    const { error } = await supabase
      .from("auction_rooms")
      .update({ [colName]: null })
      .eq("room_code", roomCode);
    if (!error) {
      triggerAlert(`تم تصفير جهاز الفريق ${teamNum}. يمكن للقائد الدخول الآن.`);
    } else {
      triggerAlert("حدث خطأ أثناء التصفير.");
    }
  };

  const resetGame = async () => {
    if (!roomCode) return;
    await supabase.from("auction_rooms").update({
      game_state: "setup",
      t1_balance: 50000,
      t2_balance: 50000,
      t1_points: 0,
      t2_points: 0,
      t1_ambush: 3,
      t2_ambush: 3,
      t1_bid: null,
      t2_bid: null,
      t1_device_id: null,
      t2_device_id: null,
      selected_option: null,
      questions: [],
      current_index: 0
    }).eq("room_code", roomCode);
    
    setGameState("setup");
    setT1Balance(50000);
    setT2Balance(50000);
    setT1Points(0);
    setT2Points(0);
    setT1Ambush(3);
    setT2Ambush(3);
    setT1Bid("");
    setT2Bid("");
    setQuestions([]);
    setAllQuestions([]);
    setCurrentIndex(0);
    setWinner(null);
    setBuyer(null);
    setPlayMode(null);
    setIsDoubleRisk(false);
    setSelectedOption(null);
    triggerAlert("تم تصفير اللعبة بنجاح! يمكن للفرق الدخول مجدداً بنفس الرمز.");
  };

  const startGame = async () => {
    if (!userId) {
      triggerAlert("يجب تسجيل الدخول لإنشاء الغرفة.");
      return;
    }

    // Gatekeeper Check
    const access = await checkAccess("auction", userId);
    if (!access.allowed) {
      triggerConfirm("رصيدك غير كافٍ. هل ترغب في شراء باقة للاستمرار باللعب؟", () => {
        router.push("/packages");
      });
      return;
    }

    const { data: realQuestions, error } = await supabase
      .from("aw_questions")
      .select("*");

    if (!realQuestions || realQuestions.length === 0) {
      triggerAlert("بنك الأسئلة فاضي! روح للوحة التحكم وضيف أسئلة قبل تبدأ اللعبة.");
      return; 
    }

    const actualQCount = Math.min(qCount, realQuestions.length);
    const shuffled = shuffleArray(realQuestions);
    const selectedQs = shuffled.slice(0, actualQCount);
    
    setAllQuestions(shuffled);
    setQuestions(selectedQs);
    setT1Balance(50000);
    setT2Balance(50000);
    setT1Points(0);
    setT2Points(0);
    setT1Ambush(3);
    setT2Ambush(3);
    
    await supabase.from("auction_rooms").update({
      game_state: "bidding",
      t1_balance: 50000, t2_balance: 50000,
      t1_points: 0, t2_points: 0,
      t1_ambush: 3, t2_ambush: 3,
      questions: selectedQs, current_index: 0, turn: 1,
      timer: 25, is_timer_running: false, is_question_visible: false,
      selected_option: null
    }).eq("room_code", roomCode);

    // Consume the token or free trial
    await consumeGameSession("auction", userId, access.reason);

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
        setGameState("rewardChoice");
      }
    }
  };

  const handleRewardChoice = (choice: "points" | "ambush") => {
    const wBid = winner === 1 ? Number(t1Bid) : Number(t2Bid);
    const lBid = winner === 1 ? Number(t2Bid) : Number(t1Bid);
    const riskMultiplier = isDoubleRisk ? 2 : 1;

    if (choice === "points") {
      const basePts = playMode === "no_options" ? 10 : 5;
      const pts = basePts * riskMultiplier;
      if (winner === 1) setT1Points(p => p + pts);
      else setT2Points(p => p + pts);
    } else if (choice === "ambush") {
      const refund = wBid * riskMultiplier;
      
      if (lBid > 5000) {
        triggerAlert("مزايدة الخصم أكثر من 5000 لا يمكنك الخصم عليهم");
        if (winner === 1) {
          setT1Balance(p => p + refund);
          setT1Ambush(p => Math.max(0, p - 1));
        } else {
          setT2Balance(p => p + refund);
          setT2Ambush(p => Math.max(0, p - 1));
        }
      } else {
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
    }
    setGameState("result");
  };

  const handleChangeQuestion = async () => {
    let pool = allQuestions;
    if (pool.length === 0) {
      const { data } = await supabase.from("aw_questions").select("*");
      if (data) {
        pool = data;
        setAllQuestions(data);
      }
    }
    
    if (pool.length > 0) {
      const currentQIds = questions.map(q => q.id);
      const availableQs = pool.filter(q => !currentQIds.includes(q.id));
      
      if (availableQs.length > 0) {
        const randomQ = availableQs[Math.floor(Math.random() * availableQs.length)];
        const newQs = [...questions];
        newQs[currentIndex] = randomQ;
        setQuestions(newQs);
        triggerAlert("تم تغيير فئة السؤال بنجاح!");
      } else {
        triggerAlert("لا يوجد أسئلة إضافية متاحة لتغيير السؤال الحالي.");
      }
    }
  };

  const nextQuestion = async () => {
    if (currentIndex + 1 >= questions.length || (t1Balance <= 0 && t2Balance <= 0)) {
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

  return {
    mounted, gameState, setGameState, t1Name, setT1Name, t2Name, setT2Name, qCount, setQCount, roomCode,
    showQRModal, setShowQRModal, isDark, setIsDark, isDropdownOpen, setIsDropdownOpen, dropdownRef,
    t1Balance, t2Balance, t1Points, t2Points, t1Ambush, t2Ambush, questions, currentIndex, turn,
    t1Bid, setT1Bid, t2Bid, setT2Bid, winner, isDoubleRisk, playMode, setPlayMode, selectedOption, setSelectedOption,
    timer, isTimerRunning, setIsTimerRunning, isQuestionVisible, setIsQuestionVisible, alertConfig,
    triggerAlert, closeAlert, triggerConfirm, copyLink, startGame, calculateMinBid, handleBidsSubmit, handlePreRiskDecision,
    handleBuyQuestion, handleAnswer, handleRewardChoice, nextQuestion, getWinnerName, getWinnerBid,
    getLoserBid, getWinnerCurrentBalance, resetTeamDevice, handleChangeQuestion, resetGame
  };
}