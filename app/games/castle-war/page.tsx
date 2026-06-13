/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Cairo } from "next/font/google";
import { createBrowserClient } from "@supabase/ssr";
import {
  Shield,
  Crown,
  Bomb,
  CheckCircle2,
  Crosshair,
  Swords,
  Zap,
  Volume2,
  VolumeX,
  Flame,
  Eye,
  Lock,
  Skull,
  Clock,
  RefreshCw,
  Search,
  Ban,
  Copy,
  MonitorPlay,
  ArrowRight,
  Sun,
  Moon,
  Home,
  Info,
} from "lucide-react";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

const TOTAL_SOLDIERS = 120;
const ROOMS_COUNT = 15;

// غرف القلعة التفاعلية المدمجة (15 غرفة)
const SVG_ROOMS = [
  // البرج الأيسر (5 غرف)
  { id: 0, cx: 250, cy: 300 },
  { id: 1, cx: 250, cy: 420 },
  { id: 2, cx: 250, cy: 540 },
  { id: 3, cx: 170, cy: 660 },
  { id: 4, cx: 330, cy: 660 },

  // البرج الأوسط (5 غرف)
  { id: 5, cx: 600, cy: 150 },
  { id: 6, cx: 480, cy: 300 },
  { id: 7, cx: 720, cy: 300 },
  { id: 8, cx: 480, cy: 460 },
  { id: 9, cx: 720, cy: 460 },

  // البرج الأيمن (5 غرف)
  { id: 10, cx: 950, cy: 300 },
  { id: 11, cx: 950, cy: 420 },
  { id: 12, cx: 950, cy: 540 },
  { id: 13, cx: 870, cy: 660 },
  { id: 14, cx: 1030, cy: 660 },
];

type TeamSetup = {
  rooms: number[];
  commanderRoom: number | null;
  trapRoom: number | null;
  roomCode?: string;
  name?: string;
};
type SoundType =
  | "roll"
  | "hit"
  | "miss"
  | "trap"
  | "commander"
  | "win"
  | "tick"
  | "buzzer";
type ChallengeType = "30sec" | "5sec" | "general" | "team" | "guess" | "";

const SolidGamingBackground = () => {
  const [isDark, setIsDark] = useState(true);
  const [icons, setIcons] = useState<any[]>([]);

  useEffect(() => {
    const checkTheme = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const gameShapes = [
      <svg
        key="1"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="6" y1="12" x2="10" y2="12"></line>
        <line x1="8" y1="10" x2="8" y2="14"></line>
        <line x1="15" y1="13" x2="15.01" y2="13"></line>
        <line x1="18" y1="11" x2="18.01" y2="11"></line>
        <rect x="2" y="6" width="20" height="12" rx="2"></rect>
      </svg>,
      <svg
        key="2"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <circle cx="15.5" cy="15.5" r="1.5"></circle>
        <circle cx="15.5" cy="8.5" r="1.5"></circle>
        <circle cx="8.5" cy="15.5" r="1.5"></circle>
        <circle cx="12" cy="12" r="1.5"></circle>
      </svg>,
      <svg
        key="3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 20h4" />
        <path d="M6 20V4h6v4" />
        <circle cx="12" cy="11" r="2" />
        <line x1="12" y1="13" x2="12" y2="17" />
        <line x1="10" y1="15" x2="14" y2="15" />
        <line x1="12" y1="17" x2="10" y2="20" />
        <line x1="12" y1="17" x2="14" y2="20" />
      </svg>,
    ];

    const iconColors = [
      "text-emerald-500",
      "text-rose-500",
      "text-purple-500",
      "text-amber-500",
    ];

    const generatedIcons = Array.from({ length: 12 }).map((_, i) => ({
      id: `icon-${i}`,
      shape: gameShapes[i % gameShapes.length],
      colorClass: iconColors[i % iconColors.length],
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 40 + 40,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 15 + 20}s`,
      rotate: Math.random() * 360,
    }));
    setIcons(generatedIcons);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300">
      <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08]">
        {icons.map((icon) => (
          <div
            key={icon.id}
            className={`absolute animate-float-game-extra ${icon.colorClass}`}
            style={{
              left: icon.left,
              top: icon.top,
              width: `${icon.size}px`,
              height: `${icon.size}px`,
              animationDelay: icon.delay,
              animationDuration: icon.duration,
              transform: `rotate(${icon.rotate}deg)`,
            }}
          >
            {icon.shape}
          </div>
        ))}
      </div>
    </div>
  );
};

const createSoundSynth = () => {
  if (typeof window === "undefined") return null;
  const AudioContext =
    window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return null;
  const ctx = new AudioContext();

  const playMasterSound = (type: SoundType) => {
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === "roll") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === "hit") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(10, now + 0.5);
      gainNode.gain.setValueAtTime(0.5, now);
      gainNode.gain.linearRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === "miss") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.8);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    } else if (type === "trap") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.setValueAtTime(400, now + 0.1);
      osc.frequency.setValueAtTime(150, now + 0.2);
      gainNode.gain.setValueAtTime(0.4, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === "commander") {
      osc.type = "square";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 1);
      gainNode.gain.setValueAtTime(0.6, now);
      gainNode.gain.linearRampToValueAtTime(0.01, now + 1);
      osc.start(now);
      osc.stop(now + 1);
    } else if (type === "win") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.setValueAtTime(500, now + 0.2);
      osc.frequency.setValueAtTime(600, now + 0.4);
      osc.frequency.setValueAtTime(800, now + 0.6);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1);
      osc.start(now);
      osc.stop(now + 1);
    } else if (type === "tick") {
      osc.type = "square";
      osc.frequency.setValueAtTime(800, now);
      gainNode.gain.setValueAtTime(0.05, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === "buzzer") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.setValueAtTime(80, now + 0.5);
      gainNode.gain.setValueAtTime(0.4, now);
      gainNode.gain.linearRampToValueAtTime(0.01, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    }
  };
  return { playMasterSound };
};

const generateAlphanumericCode = (length: number) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "C";
  for (let i = 0; i < length - 1; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function CastleBattleMainScreen() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [gameState, setGameState] = useState<"lobby" | "playing" | "gameOver">(
    "lobby",
  );
  const [roomCode, setRoomCode] = useState("");
  const roomCodeRef = useRef("");
  const [joinUrl, setJoinUrl] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const [team1Name, setTeam1Name] = useState("الفريق الأول");
  const [team2Name, setTeam2Name] = useState("الفريق الثاني");
  const [team1Ready, setTeam1Ready] = useState(false);
  const [team2Ready, setTeam2Ready] = useState(false);
  const [team1Data, setTeam1Data] = useState<TeamSetup | null>(null);
  const [team2Data, setTeam2Data] = useState<TeamSetup | null>(null);

  const [turn, setTurn] = useState<1 | 2>(1);
  const [attackingTeam, setAttackingTeam] = useState<1 | 2>(1);
  const [hp1, setHp1] = useState(TOTAL_SOLDIERS);
  const [hp2, setHp2] = useState(TOTAL_SOLDIERS);
  const [revealed1, setRevealed1] = useState<boolean[]>(
    Array(ROOMS_COUNT).fill(false),
  );
  const [revealed2, setRevealed2] = useState<boolean[]>(
    Array(ROOMS_COUNT).fill(false),
  );
  const [battleStep, setBattleStep] = useState<
    "roll" | "challenge" | "target" | "trapChoice" | "result"
  >("roll");

  const [cw30SecDB, setCw30SecDB] = useState<string[]>([]);
  const [cw5SecDB, setCw5SecDB] = useState<string[]>([]);
  const [cwTeamDB, setCwTeamDB] = useState<string[]>([]);
  const [cwGenDB, setCwGenDB] = useState<
    { q: string; a: string; options?: string[] }[]
  >([]);

  const [activeChallengeType, setActiveChallengeType] =
    useState<ChallengeType>("");
  const [activeChallengeName, setActiveChallengeName] = useState("");
  const [activeChallengeData, setActiveChallengeData] = useState<any>(null);
  const [isChallengeRevealed, setIsChallengeRevealed] = useState(false);
  const [showGenAnswer, setShowGenAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [guessT1, setGuessT1] = useState("");
  const [guessT2, setGuessT2] = useState("");
  const [guessesRevealed, setGuessesRevealed] = useState(false);
  const [genTimer, setGenTimer] = useState<number>(15);
  const [isGenTimerRunning, setIsGenTimerRunning] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);

  const [resultMsg, setResultMsg] = useState("");
  const [resultType, setResultType] = useState<
    "hit" | "miss" | "trap" | "commander" | "idle" | "spy"
  >("idle");
  const [spyUsed1, setSpyUsed1] = useState(false);
  const [spyUsed2, setSpyUsed2] = useState(false);
  const [spiedTarget1, setSpiedTarget1] = useState<number | null>(null);
  const [spiedTarget2, setSpiedTarget2] = useState<number | null>(null);
  const [screenShake, setScreenShake] = useState(false);
  const [explosionRoomIndexHit, setExplosionRoomIndexHit] = useState<
    number | null
  >(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const synthRef = useRef<{
    playMasterSound: (type: SoundType) => void;
  } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [usedChallengesT1, setUsedChallengesT1] = useState<ChallengeType[]>([]);
  const [usedChallengesT2, setUsedChallengesT2] = useState<ChallengeType[]>([]);
  const [targetRoomIndex, setTargetRoomIndex] = useState<number | null>(null);
  const [isAttacking, setIsAttacking] = useState(false);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    const checkTheme = () =>
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!roomCodeRef.current) return;
    const liveData = {
      gameState,
      hp1,
      hp2,
      revealed1,
      revealed2,
      attackingTeam,
      turn,
      spiedTarget1,
      spiedTarget2,
      team1Data,
      team2Data,
      team1Name,
      team2Name,
      battleStep,
      activeChallengeName,
      activeChallengeData: activeChallengeData
        ? typeof activeChallengeData === "string"
          ? activeChallengeData
          : { q: activeChallengeData.q, options: activeChallengeData.options }
        : null,
      isChallengeRevealed,
      genTimer,
      resultType,
      resultMsg,
      explosionRoomIndexHit,
      targetRoomIndex,
      usedChallengesT1,
      usedChallengesT2,
      timerStarted,
      timestamp: Date.now(),
    };

    supabase
      .from("cw_rooms")
      .update({ live_sync: liveData })
      .eq("room_code", roomCodeRef.current)
      .then();
  }, [
    gameState,
    hp1,
    hp2,
    revealed1,
    revealed2,
    attackingTeam,
    turn,
    spiedTarget1,
    spiedTarget2,
    team1Data,
    team2Data,
    team1Name,
    team2Name,
    battleStep,
    activeChallengeName,
    activeChallengeData,
    isChallengeRevealed,
    genTimer,
    resultType,
    resultMsg,
    explosionRoomIndexHit,
    targetRoomIndex,
    usedChallengesT1,
    usedChallengesT2,
    timerStarted,
  ]);

  useEffect(() => {
    synthRef.current = createSoundSynth();
    const initGame = async () => {
      const newRoomCode = generateAlphanumericCode(5);
      setRoomCode(newRoomCode);
      roomCodeRef.current = newRoomCode;
      setJoinUrl(
        `${window.location.origin}/games/castle-war/join?code=${newRoomCode}`,
      );

      await supabase
        .from("cw_rooms")
        .upsert({ room_code: newRoomCode, live_sync: {} });

      const { data } = await supabase.from("cw_settings").select("*");
      if (data) {
        data.forEach((item) => {
          if (item.id === "admin_cw_30sec_db") setCw30SecDB(item.data);
          if (item.id === "admin_cw_5sec_db") setCw5SecDB(item.data);
          if (item.id === "admin_cw_team_db") setCwTeamDB(item.data);
          if (item.id === "admin_cw_general_db") setCwGenDB(item.data);
        });
      }
    };
    initGame();
  }, []);

  useEffect(() => {
    if (!roomCode) return;
    const fetchInitialTeams = async () => {
      const { data } = await supabase
        .from("cw_rooms")
        .select("team1_setup, team2_setup")
        .eq("room_code", roomCode)
        .single();
      if (data) {
        if (data.team1_setup && !team1Ready) {
          setTeam1Data(data.team1_setup);
          if (data.team1_setup.name) setTeam1Name(data.team1_setup.name);
          setTeam1Ready(true);
        }
        if (data.team2_setup && !team2Ready) {
          setTeam2Data(data.team2_setup);
          if (data.team2_setup.name) setTeam2Name(data.team2_setup.name);
          setTeam2Ready(true);
        }
      }
    };
    fetchInitialTeams();

    const channel = supabase
      .channel(`room_${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "cw_rooms",
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          const newRecord = payload.new;
          if (newRecord.team1_setup && !team1Ready) {
            setTeam1Data(newRecord.team1_setup);
            if (newRecord.team1_setup.name)
              setTeam1Name(newRecord.team1_setup.name);
            setTeam1Ready(true);
          }
          if (newRecord.team2_setup && !team2Ready) {
            setTeam2Data(newRecord.team2_setup);
            if (newRecord.team2_setup.name)
              setTeam2Name(newRecord.team2_setup.name);
            setTeam2Ready(true);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, team1Ready, team2Ready]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isGenTimerRunning && genTimer > 0) {
      timer = setInterval(() => {
        setGenTimer((prev) => {
          if (prev <= 6 && prev > 1 && soundEnabled && synthRef.current)
            synthRef.current.playMasterSound("tick");
          return prev - 1;
        });
      }, 1000);
    } else if (genTimer === 0 && isGenTimerRunning) {
      if (soundEnabled && synthRef.current)
        synthRef.current.playMasterSound("buzzer");
      setIsGenTimerRunning(false);
    }
    return () => clearInterval(timer);
  }, [isGenTimerRunning, genTimer, soundEnabled]);

  const updateTeamNameLocally = async (team: 1 | 2, newName: string) => {
    if (team === 1) {
      setTeam1Name(newName);
      if (team1Data) {
        const updated = { ...team1Data, name: newName };
        setTeam1Data(updated);
        await supabase
          .from("cw_rooms")
          .update({ team1_setup: updated })
          .eq("room_code", roomCodeRef.current);
      }
    } else {
      setTeam2Name(newName);
      if (team2Data) {
        const updated = { ...team2Data, name: newName };
        setTeam2Data(updated);
        await supabase
          .from("cw_rooms")
          .update({ team2_setup: updated })
          .eq("room_code", roomCodeRef.current);
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(joinUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const triggerExplosion = (roomIndex: number, isMajor: boolean) => {
    setExplosionRoomIndexHit(roomIndex);
    setScreenShake(true);
    setTimeout(
      () => {
        setExplosionRoomIndexHit(null);
        setScreenShake(false);
      },
      isMajor ? 1000 : 600,
    );
  };

  const startBattle = () => {
    if (team1Ready && team2Ready && team1Data && team2Data)
      setGameState("playing");
  };

  const getChallengeTitle = (type: ChallengeType) => {
    switch (type) {
      case "30sec":
        return "ثلاثين ثانية";
      case "5sec":
        return "خمس ثواني";
      case "general":
        return "أسئلة عامة";
      case "team":
        return "تحدي الفريق";
      case "guess":
        return "توقع الرقم";
      default:
        return "";
    }
  };

  const handleSelectChallenge = (targetType: ChallengeType) => {
    let allAvailableTypes: ChallengeType[] = [
      "guess",
      "30sec",
      "5sec",
      "general",
      "team",
    ];
    let currentUsed =
      turn === 1 ? [...usedChallengesT1] : [...usedChallengesT2];
    currentUsed.push(targetType);

    if (currentUsed.length >= allAvailableTypes.length) currentUsed = [];
    if (turn === 1) setUsedChallengesT1(currentUsed);
    else setUsedChallengesT2(currentUsed);

    setIsChallengeRevealed(false);
    setShowGenAnswer(false);
    setSelectedOption(null);
    setGuessesRevealed(false);
    setGuessT1("");
    setGuessT2("");
    setIsGenTimerRunning(false);
    setAttackingTeam(turn);
    setTimerStarted(false);
    setActiveChallengeType(targetType);
    setActiveChallengeName(getChallengeTitle(targetType));

    if (targetType === "30sec") {
      setActiveChallengeData(
        cw30SecDB.length > 0
          ? cw30SecDB[Math.floor(Math.random() * cw30SecDB.length)]
          : { q: "لم تتم إضافة أسئلة بعد" },
      );
      setGenTimer(30);
    } else if (targetType === "5sec") {
      setActiveChallengeData(
        cw5SecDB.length > 0
          ? cw5SecDB[Math.floor(Math.random() * cw5SecDB.length)]
          : { q: "لم تتم إضافة أسئلة بعد" },
      );
      setGenTimer(5);
    } else if (targetType === "general") {
      setActiveChallengeData(
        cwGenDB.length > 0
          ? cwGenDB[Math.floor(Math.random() * cwGenDB.length)]
          : { q: "لم تتم إضافة أسئلة بعد", a: "-" },
      );
      setGenTimer(15);
    } else if (targetType === "team") {
      const tData =
        cwTeamDB.length > 0
          ? cwTeamDB[Math.floor(Math.random() * cwTeamDB.length)]
          : { q: "لم تتم إضافة تحديات بعد" };
      setActiveChallengeData(tData);
      setGenTimer(
        typeof tData === "string" && tData.includes("ولا كلمة") ? 90 : 60,
      );
    } else setActiveChallengeData(null);

    if (soundEnabled && synthRef.current)
      synthRef.current.playMasterSound("tick");
    setBattleStep("challenge");
  };

  const cancelChallenge = () => {
    setIsChallengeRevealed(false);
    setShowGenAnswer(false);
    setSelectedOption(null);
    setGuessesRevealed(false);
    setGuessT1("");
    setGuessT2("");
    setGenTimer(15);
    setIsGenTimerRunning(false);
    setTimerStarted(false);
    nextTurn();
  };

  const pickNewChallenge = () => {
    setIsGenTimerRunning(false);
    setTimerStarted(false);
    if (activeChallengeType === "general" && cwGenDB.length > 0) {
      setActiveChallengeData(
        cwGenDB[Math.floor(Math.random() * cwGenDB.length)],
      );
      setGenTimer(15);
      setShowGenAnswer(false);
      setSelectedOption(null);
    } else if (activeChallengeType === "30sec" && cw30SecDB.length > 0) {
      setActiveChallengeData(
        cw30SecDB[Math.floor(Math.random() * cw30SecDB.length)],
      );
      setGenTimer(30);
    } else if (activeChallengeType === "5sec" && cw5SecDB.length > 0) {
      setActiveChallengeData(
        cw5SecDB[Math.floor(Math.random() * cw5SecDB.length)],
      );
      setGenTimer(5);
    } else if (activeChallengeType === "team" && cwTeamDB.length > 0) {
      const tData = cwTeamDB[Math.floor(Math.random() * cwTeamDB.length)];
      setActiveChallengeData(tData);
      setGenTimer(
        typeof tData === "string" && tData.includes("ولا كلمة") ? 90 : 60,
      );
    }
  };

  const challengeSuccess = (winnerTeam?: 1 | 2) => {
    setIsGenTimerRunning(false);
    if (winnerTeam) setAttackingTeam(winnerTeam);
    else setAttackingTeam(turn);
    setBattleStep("target");
  };

  const challengeFail = () => {
    setIsGenTimerRunning(false);
    setAttackingTeam(turn === 1 ? 2 : 1);
    setBattleStep("target");
  };

  const useSpy = () => {
    if (isAttacking) return;
    setIsAttacking(true);

    const isTeam1Attacking = attackingTeam === 1;
    const defenderData = isTeam1Attacking ? team2Data! : team1Data!;
    const setDefenderRevealed = isTeam1Attacking ? setRevealed2 : setRevealed1;
    const defenderRevealed = isTeam1Attacking ? revealed2 : revealed1;

    if (isTeam1Attacking) setSpyUsed1(true);
    else setSpyUsed2(true);

    let maxSoldiers = -1;
    let targetRoom = -1;
    for (let i = 0; i < ROOMS_COUNT; i++) {
      if (!defenderRevealed[i] && defenderData.rooms[i] > maxSoldiers) {
        maxSoldiers = defenderData.rooms[i];
        targetRoom = i;
      }
    }

    if (targetRoom !== -1) {
      setTargetRoomIndex(targetRoom);
      setTimeout(() => {
        setTargetRoomIndex(null);
        let currentHp1 = hp1;
        let currentHp2 = hp2;
        setDefenderRevealed((prev) => {
          const next = [...prev];
          next[targetRoom] = true;
          return next;
        });

        if (defenderData.trapRoom === targetRoom) {
          if (soundEnabled && synthRef.current)
            synthRef.current.playMasterSound("trap");
          triggerExplosion(targetRoom, true);
          setBattleStep("trapChoice");
          setIsAttacking(false);
          return;
        } else {
          let baseDamage = defenderData.rooms[targetRoom];
          let hitCommander = defenderData.commanderRoom === targetRoom;
          let msg = "";
          let type: "spy" = "spy";
          let damageToDefender = 0;

          if (hitCommander) {
            damageToDefender = baseDamage + 30;
            if (soundEnabled && synthRef.current)
              synthRef.current.playMasterSound("commander");
            triggerExplosion(targetRoom, true);
            msg = `ضربة جاسوس قاضية! تم تحديد القائد والقضاء على ${damageToDefender} جندي.`;
          } else {
            damageToDefender = baseDamage;
            if (soundEnabled && synthRef.current)
              synthRef.current.playMasterSound("hit");
            triggerExplosion(targetRoom, true);
            msg = `عملية تجسس ناجحة! تم تدمير أكبر تجمع والقضاء على ${damageToDefender} جندي.`;
          }

          if (damageToDefender > 0) {
            if (isTeam1Attacking) {
              currentHp2 = Math.max(0, hp2 - damageToDefender);
              setHp2(currentHp2);
            } else {
              currentHp1 = Math.max(0, hp1 - damageToDefender);
              setHp1(currentHp1);
            }
          }

          setTimeout(() => {
            if (currentHp1 <= 0 || currentHp2 <= 0) {
              setGameState("gameOver");
              if (soundEnabled && synthRef.current)
                synthRef.current.playMasterSound("win");
            }
          }, 1000);
          setResultMsg(msg);
          setResultType(type);
          setBattleStep("result");
          setIsAttacking(false);
        }
      }, 800);
    } else {
      setIsAttacking(false);
    }
  };

  const executeAttack = (roomIndex: number, event: React.MouseEvent) => {
    if (isAttacking) return;
    setIsAttacking(true);
    setTargetRoomIndex(roomIndex);

    setTimeout(() => {
      setTargetRoomIndex(null);
      const isTeam1Attacking = attackingTeam === 1;
      const defenderData = isTeam1Attacking ? team2Data! : team1Data!;
      const setDefenderRevealed = isTeam1Attacking
        ? setRevealed2
        : setRevealed1;
      let currentHp1 = hp1;
      let currentHp2 = hp2;

      setDefenderRevealed((prev) => {
        const next = [...prev];
        next[roomIndex] = true;
        return next;
      });

      if (defenderData.trapRoom === roomIndex) {
        if (soundEnabled && synthRef.current)
          synthRef.current.playMasterSound("trap");
        triggerExplosion(roomIndex, true);
        setBattleStep("trapChoice");
        setIsAttacking(false);
        return;
      } else {
        let baseDamage = defenderData.rooms[roomIndex];
        let hitCommander = defenderData.commanderRoom === roomIndex;
        let msg = "";
        let type: "hit" | "miss" | "commander" = "miss";
        let damageToDefender = 0;

        if (hitCommander) {
          damageToDefender = baseDamage + 30;
          if (soundEnabled && synthRef.current)
            synthRef.current.playMasterSound("commander");
          triggerExplosion(roomIndex, true);
          msg = `قاضية! سقط القائد! خسارة ${damageToDefender} جندي.`;
          type = "commander";
        } else if (baseDamage > 0) {
          damageToDefender = baseDamage;
          if (soundEnabled && synthRef.current)
            synthRef.current.playMasterSound("hit");
          triggerExplosion(roomIndex, false);
          msg = `إصابة! تم القضاء على ${damageToDefender} جندي.`;
          type = "hit";
        } else {
          if (soundEnabled && synthRef.current)
            synthRef.current.playMasterSound("miss");
          msg = "غرفة مهجورة! لم يصب أحد.";
          type = "miss";
        }

        if (damageToDefender > 0) {
          if (isTeam1Attacking) {
            currentHp2 = Math.max(0, hp2 - damageToDefender);
            setHp2(currentHp2);
          } else {
            currentHp1 = Math.max(0, hp1 - damageToDefender);
            setHp1(currentHp1);
          }
        }
        setTimeout(() => {
          if (currentHp1 <= 0 || currentHp2 <= 0) {
            setGameState("gameOver");
            if (soundEnabled && synthRef.current)
              synthRef.current.playMasterSound("win");
          }
        }, 1000);
        setResultMsg(msg);
        setResultType(type);
        setBattleStep("result");
        setIsAttacking(false);
      }
    }, 800);
  };

  const resolveTrap = (choice: "capture" | "kill") => {
    const isTeam1Attacking = attackingTeam === 1;
    const defenderData = isTeam1Attacking ? team2Data! : team1Data!;
    const setDefenderData = isTeam1Attacking ? setTeam2Data : setTeam1Data;
    let currentHp1 = hp1;
    let currentHp2 = hp2;
    let msg = "";

    if (choice === "kill") {
      const damage = 20;
      if (isTeam1Attacking) {
        currentHp1 = Math.max(0, hp1 - damage);
        setHp1(currentHp1);
      } else {
        currentHp2 = Math.max(0, hp2 - damage);
        setHp2(currentHp2);
      }
      msg = `تم تصفية 20 جندي في الفخ!`;
    } else {
      const damage = 20;
      if (isTeam1Attacking) {
        currentHp1 = Math.max(0, hp1 - damage);
        setHp1(currentHp1);
        currentHp2 = hp2 + 20;
        setHp2(currentHp2);
      } else {
        currentHp2 = Math.max(0, hp2 - damage);
        setHp2(currentHp2);
        currentHp1 = hp1 + 20;
        setHp1(currentHp1);
      }
      let newRooms = [...defenderData.rooms];
      let soldiersToAdd = 20;
      while (soldiersToAdd > 0) {
        let r = Math.floor(Math.random() * ROOMS_COUNT);
        if (r !== defenderData.trapRoom) {
          newRooms[r]++;
          soldiersToAdd--;
        }
      }
      setDefenderData({ ...defenderData, rooms: newRooms });
      msg = `تم أسر 20 جندي وانضموا للقلعة!`;
    }
    setResultMsg(msg);
    setResultType("trap");
    setBattleStep("result");
    setTimeout(() => {
      if (currentHp1 <= 0 || currentHp2 <= 0) {
        setGameState("gameOver");
        if (soundEnabled && synthRef.current)
          synthRef.current.playMasterSound("win");
      }
    }, 1000);
  };

  const nextTurn = () => {
    setTurn((prev) => (prev === 1 ? 2 : 1));
    setAttackingTeam((prev) => (prev === 1 ? 2 : 1));
    setBattleStep("roll");
    setResultType("idle");
  };

  // دالة عرض القلعة التفاعلية SVG المدمجة
  const renderInteractiveCastle = (isTeam1Castle: boolean = true) => {
    const revealed = isTeam1Castle ? revealed1 : revealed2;
    const teamData = isTeam1Castle ? team1Data : team2Data;
    const isSpiedTarget = isTeam1Castle ? spiedTarget2 : spiedTarget1;
    const teamColorClass = isTeam1Castle ? "text-cyan-400" : "text-rose-400";

    return (
      <div
        className={`relative inline-block w-full rounded-[2rem] overflow-hidden border-4 bg-[#050b14] border-slate-900 dark:border-black shadow-[8px_8px_0px_#0f172a] dark:shadow-[8px_8px_0px_#000] transition-colors duration-500`}
      >
        <svg
          viewBox="0 -120 1200 1120"
          className="w-full h-auto drop-shadow-[0_30px_60px_rgba(0,0,0,0.8)] select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="tower3D" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="20%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="80%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            <linearGradient id="roofGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="30%" stopColor="#b45309" />
              <stop offset="70%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>

            {/* ألوان الفريقين لإضاءة النوافذ */}
            <linearGradient id="team1Glow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
            <linearGradient id="team2Glow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>

            <radialGradient id="bgAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.15)" />
              <stop offset="50%" stopColor="rgba(129, 140, 248, 0.05)" />
              <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
            </radialGradient>
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="12" result="blur1" />
              <feGaussianBlur stdDeviation="24" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter
              id="deepShadow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="15"
                stdDeviation="10"
                floodColor="#000000"
                floodOpacity="0.8"
              />
            </filter>
          </defs>

          {/* هالة الخلفية */}
          <circle cx="600" cy="500" r="500" fill="url(#bgAura)" />
          <circle
            cx="600"
            cy="350"
            r="250"
            fill="#1e1b4b"
            opacity="0.3"
            filter="url(#neonGlow)"
          />

          {/* الصورة المدمجة من مجلد public */}
          <image
            href="/castle-bg.png"
            x="0"
            y="-120"
            width="1200"
            height="1120"
            preserveAspectRatio="xMidYMid slice"
          />

          {/* هيكل القلعة الأساسي */}
          <path
            d="M 250 800 L 250 500 L 950 500 L 950 800 Z"
            fill="url(#tower3D)"
            filter="url(#deepShadow)"
          />
          <path
            d="M 250 500 L 250 450 L 300 450 L 300 500 L 350 500 L 350 450 L 400 450 L 400 500 L 450 500 L 450 450 L 500 450 L 500 500 L 550 500 L 550 450 L 600 450 L 600 500 L 650 500 L 650 450 L 700 450 L 700 500 L 750 500 L 750 450 L 800 450 L 800 500 L 850 500 L 850 450 L 900 450 L 900 500 L 950 500 Z"
            fill="url(#tower3D)"
          />

          {/* البرج الأيسر */}
          <rect
            x="120"
            y="200"
            width="260"
            height="600"
            rx="10"
            fill="url(#tower3D)"
            filter="url(#deepShadow)"
          />
          <path
            d="M 100 800 L 120 700 L 380 700 L 400 800 Z"
            fill="url(#tower3D)"
          />
          <path
            d="M 100 200 L 250 20 L 400 200 Z"
            fill="url(#roofGradient)"
            filter="url(#deepShadow)"
          />
          <path d="M 90 200 L 410 200 L 410 220 L 90 220 Z" fill="#b45309" />

          {/* البرج الأيمن */}
          <rect
            x="820"
            y="200"
            width="260"
            height="600"
            rx="10"
            fill="url(#tower3D)"
            filter="url(#deepShadow)"
          />
          <path
            d="M 800 800 L 820 700 L 1080 700 L 1100 800 Z"
            fill="url(#tower3D)"
          />
          <path
            d="M 800 200 L 950 20 L 1100 200 Z"
            fill="url(#roofGradient)"
            filter="url(#deepShadow)"
          />
          <path
            d="M 790 200 L 1110 200 L 1110 220 L 790 220 Z"
            fill="#b45309"
          />

          {/* البرج الأوسط */}
          <rect
            x="420"
            y="80"
            width="360"
            height="720"
            rx="15"
            fill="url(#tower3D)"
            filter="url(#deepShadow)"
          />
          <path
            d="M 390 80 L 600 -80 L 810 80 Z"
            fill="url(#roofGradient)"
            filter="url(#deepShadow)"
          />
          <path d="M 380 80 L 820 80 L 820 110 L 380 110 Z" fill="#f59e0b" />

          {/* البوابة */}
          <path
            d="M 480 800 L 480 620 A 120 120 0 0 1 720 620 L 720 800 Z"
            fill="#020617"
            stroke={isTeam1Castle ? "#0891b2" : "#e11d48"}
            strokeWidth="8"
            filter="url(#neonGlow)"
          />
          <path
            d="M 540 800 L 540 620 A 60 60 0 0 1 660 620 L 660 800"
            fill="none"
            stroke={isTeam1Castle ? "#22d3ee" : "#fb7185"}
            strokeWidth="4"
            opacity="0.6"
          />
          <circle
            cx="600"
            cy="710"
            r="30"
            fill={isTeam1Castle ? "url(#team1Glow)" : "url(#team2Glow)"}
            filter="url(#neonGlow)"
          />
          <circle cx="600" cy="710" r="15" fill="#ffffff" />

          {/* القاعدة المستطيلة الجديدة */}
          <rect
            x="80"
            y="800"
            width="1040"
            height="40"
            rx="5"
            fill="#0f172a"
            filter="url(#deepShadow)"
          />
          <rect
            x="40"
            y="840"
            width="1120"
            height="60"
            rx="10"
            fill="#020617"
            filter="url(#deepShadow)"
          />

          {/* --- الرسومات التجميلية للقلعة (سيوف وجماجم فقط) --- */}

          {/* سيوف متقاطعة فوق البوابة */}
          <foreignObject x="560" y="520" width="80" height="80">
            <Swords className="text-slate-500 w-full h-full opacity-60" />
          </foreignObject>

          {/* جماجم عند المداخل */}
          <foreignObject x="420" y="740" width="40" height="40">
            <Skull className="text-slate-500 w-full h-full opacity-60" />
          </foreignObject>
          <foreignObject x="740" y="740" width="40" height="40">
            <Skull className="text-slate-500 w-full h-full opacity-60" />
          </foreignObject>

          {/* رسم الغرف التفاعلية بالنوافذ القوسية */}
          {SVG_ROOMS.map((room) => {
            const isRevealedRoom = revealed[room.id];
            const canBeAttacked =
              gameState === "playing" &&
              attackingTeam === (isTeam1Castle ? 2 : 1) &&
              battleStep === "target" &&
              !isRevealedRoom;
            const isDamagedRoom =
              isRevealedRoom &&
              teamData &&
              (teamData.rooms[room.id] > 0 ||
                teamData.commanderRoom === room.id ||
                teamData.trapRoom === room.id);
            const isDestroyedTrap =
              isRevealedRoom && teamData && teamData.trapRoom === room.id;
            const hitCommander =
              isRevealedRoom && teamData && teamData.commanderRoom === room.id;
            const isSpied = isSpiedTarget === room.id;
            const isTargetedNow = targetRoomIndex === room.id && canBeAttacked;

            const glowColor = isTeam1Castle
              ? "url(#team1Glow)"
              : "url(#team2Glow)";
            const strokeColor = isTeam1Castle
              ? "stroke-cyan-500"
              : "stroke-rose-500";
            const hoverStroke = isTeam1Castle
              ? "group-hover:stroke-cyan-300"
              : "group-hover:stroke-rose-300";

            return (
              <g
                key={room.id}
                onClick={(e) => {
                  if (canBeAttacked && gameState === "playing")
                    executeAttack(room.id, e);
                }}
                className={`transition-transform duration-200 ease-out will-change-transform group ${canBeAttacked && !isSpied ? "cursor-crosshair hover:scale-[1.12]" : gameState !== "lobby" ? "cursor-default" : ""}`}
                style={{ transformOrigin: `${room.cx}px ${room.cy}px` }}
              >
                {/* الإطار الخارجي المقوس */}
                <path
                  d={`M ${room.cx - 35} ${room.cy + 45} L ${room.cx + 35} ${room.cy + 45} L ${room.cx + 35} ${room.cy - 10} A 35 35 0 0 0 ${room.cx - 35} ${room.cy - 10} Z`}
                  className={`fill-[#0f172a] stroke-[3px] transition-colors duration-200 ${canBeAttacked ? `${strokeColor} ${hoverStroke}` : "stroke-[#1e293b]"}`}
                  filter="url(#deepShadow)"
                />

                {/* النواة المضيئة المقوسة */}
                <path
                  d={`M ${room.cx - 25} ${room.cy + 35} L ${room.cx + 25} ${room.cy + 35} L ${room.cx + 25} ${room.cy - 5} A 25 25 0 0 0 ${room.cx - 25} ${room.cy - 5} Z`}
                  fill={isRevealedRoom ? "#020617" : glowColor}
                  className={
                    canBeAttacked
                      ? "group-hover:brightness-125 transition-all duration-200"
                      : ""
                  }
                  filter={!isRevealedRoom ? "url(#neonGlow)" : ""}
                />

                {/* شبك النوافذ */}
                <line
                  x1={room.cx - 25}
                  y1={room.cy + 15}
                  x2={room.cx + 25}
                  y2={room.cy + 15}
                  stroke="#020617"
                  strokeWidth="3"
                  opacity="0.7"
                />
                <line
                  x1={room.cx}
                  y1={room.cy - 30}
                  x2={room.cx}
                  y2={room.cy + 35}
                  stroke="#020617"
                  strokeWidth="3"
                  opacity="0.7"
                />

                {/* الحاوية HTML المدمجة لعرض الأيقونات والأرقام */}
                <foreignObject
                  x={room.cx - 60}
                  y={room.cy - 60}
                  width="120"
                  height="120"
                  className="pointer-events-none"
                >
                  <div className="w-full h-full flex flex-col items-center justify-center relative overflow-visible">
                    {isSpied && !isRevealedRoom && (
                      <Eye
                        className="absolute -top-6 text-yellow-500 animate-bounce drop-shadow-[0_2px_0_#000] z-40 w-10 h-10"
                        strokeWidth={3}
                      />
                    )}

                    {isRevealedRoom ? (
                      isDamagedRoom ? (
                        hitCommander ? (
                          <Crown
                            className="text-amber-500 drop-shadow-[0_2px_0_#000] z-40 w-12 h-12 animate-pulse"
                            strokeWidth={2.5}
                          />
                        ) : isDestroyedTrap ? (
                          <Bomb
                            className="text-purple-600 animate-wiggle drop-shadow-[0_2px_0_#000] z-40 w-12 h-12"
                            strokeWidth={2.5}
                          />
                        ) : (
                          <Skull
                            className="text-rose-500 drop-shadow-[0_2px_0_#000] animate-pulse z-40 w-12 h-12"
                            strokeWidth={2.5}
                          />
                        )
                      ) : (
                        <Shield
                          className="text-emerald-500 drop-shadow-[0_2px_0_#000] z-40 w-12 h-12"
                          fill="none"
                          strokeWidth={3}
                        />
                      )
                    ) : (
                      <span
                        className={`font-black z-30 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-transform duration-300 ${canBeAttacked ? `text-4xl text-white scale-110 animate-pulse` : `text-3xl text-white opacity-90`}`}
                      >
                        {room.id + 1}
                      </span>
                    )}

                    {canBeAttacked && !isSpied && !isTargetedNow && (
                      <Crosshair
                        className={`absolute animate-spin-slow opacity-90 z-10 w-14 h-14 drop-shadow-[0_2px_0_#000] text-white`}
                        strokeWidth={2.5}
                      />
                    )}
                    {canBeAttacked && isSpied && !isTargetedNow && (
                      <Crosshair
                        className="absolute text-yellow-500 drop-shadow-[0_2px_0_#000] animate-spin-slow opacity-90 z-10 w-14 h-14"
                        strokeWidth={3}
                      />
                    )}
                    {isTargetedNow && (
                      <Crosshair
                        className="absolute text-rose-500 drop-shadow-[0_2px_0_#000] animate-ping z-50 w-20 h-20"
                        strokeWidth={3}
                      />
                    )}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const cardClass =
    "bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-black rounded-3xl shadow-[6px_6px_0px_#0f172a] dark:shadow-[6px_6px_0px_#000] transition-colors duration-300";

  return (
    <main
      className={`min-h-[100dvh] relative flex flex-col pt-24 pb-8 px-2 md:px-4 ${cairo.className} overflow-x-hidden ${screenShake ? "animate-screen-shake" : ""} transition-colors duration-500 bg-slate-50 dark:bg-[#0f172a]`}
      dir="rtl"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes screenShake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); } 20%, 40%, 60%, 80% { transform: translateX(4px); } } .animate-screen-shake { animation: screenShake 0.4s ease-in-out; }
      `,
        }}
      />

      <SolidGamingBackground />

      <div className="fixed top-4 left-0 right-0 z-[60] w-full max-w-7xl mx-auto px-4">
        <div className="bg-white/95 dark:bg-slate-800/95 rounded-2xl border-b-4 border-slate-200 dark:border-slate-950 p-2 md:p-3 shadow-xl flex justify-between items-center transition-colors duration-300">
          <Link
            href="/"
            className="transition-transform hover:scale-105 active:scale-95 shrink-0 pl-2"
          >
            <img
              src="https://ludn.sa/full_logo.svg?dpl=dpl_9jc3BNjB3uY2VzRn5kQd3MZSNLaW"
              alt="لدن التقنية"
              className="h-10 md:h-12 object-contain dark:brightness-0 dark:invert"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-1.5 md:gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-[11px] md:text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0"
            >
              <Home size={16} className="text-slate-500 dark:text-slate-400" />{" "}
              <span>الرئيسية</span>
            </Link>
            <Link
              href="/#about-section"
              className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-[11px] md:text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0"
            >
              <Info size={16} className="text-purple-500" />{" "}
              <span>عن المنصة</span>
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
        <Link
          href="/"
          className="py-2 px-4 bg-rose-500 hover:bg-rose-400 text-white dark:text-slate-900 border-2 border-slate-900 dark:border-black rounded-xl border-b-4 active:border-b-2 active:translate-y-0.5 transition-all shadow-[2px_2px_0px_#0f172a] dark:shadow-[2px_2px_0px_#000] flex items-center justify-center gap-2 font-black text-sm"
        >
          <ArrowRight size={18} strokeWidth={3} />{" "}
          <span className="hidden sm:inline">رجوع</span>
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() =>
              window.open(
                `/games/castle-war/display?code=${roomCode}`,
                "_blank",
              )
            }
            className="py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 rounded-xl border-2 border-slate-900 dark:border-black border-b-4 active:border-b-2 active:translate-y-0.5 transition-all shadow-sm flex items-center justify-center gap-1.5 font-black text-xs md:text-sm"
          >
            <MonitorPlay size={16} />{" "}
            <span className="hidden sm:inline">شاشة الجمهور 📺</span>
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border-2 border-slate-900 dark:border-black border-b-4 active:border-b-2 active:translate-y-0.5 transition-all shadow-sm flex items-center justify-center gap-1.5 font-black text-xs md:text-sm"
          >
            {soundEnabled ? (
              <>
                <Volume2 size={16} />{" "}
                <span className="hidden sm:inline">الصوت شغال</span>
              </>
            ) : (
              <>
                <VolumeX size={16} />{" "}
                <span className="hidden sm:inline">مكتوم</span>
              </>
            )}
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
                {hp1} / {TOTAL_SOLDIERS}{" "}
                <span className="text-sm text-slate-500 font-bold">جندي</span>
              </div>
            </div>
            <div className="flex-1 w-full max-w-[600px] mx-auto mt-2">
              {renderInteractiveCastle(true)}
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col items-center justify-start w-full gap-4">
            {gameState === "lobby" && (
              <div
                className={`${cardClass} w-full p-6 text-center animate-in zoom-in-95`}
              >
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 flex items-center justify-center gap-2">
                  <Swords className="text-rose-500 w-8 h-8" strokeWidth={2.5} />{" "}
                  غرفة تجهيز الجيوش
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-bold mb-6 text-sm leading-relaxed border-b-4 border-slate-100 dark:border-slate-700 pb-4">
                  أدخل الكود في جوالك لتوزيع جنودك بسرية تامة.
                </p>

                <div className="flex flex-col items-center justify-center gap-4 mb-6">
                  <div className="bg-white p-2 rounded-2xl shadow-[4px_4px_0px_#cbd5e1] border-4 border-slate-900 dark:border-black">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(joinUrl)}`}
                      alt="QR Code"
                      className="w-32 h-32 md:w-40 md:h-40"
                    />
                  </div>
                  <div className="flex flex-col items-center w-full">
                    <span className="text-slate-500 dark:text-slate-400 font-black tracking-widest uppercase mb-2 text-sm bg-slate-100 dark:bg-slate-900 px-4 py-1 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                      كود الغرفة
                    </span>
                    <div className="bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-black px-8 py-3 rounded-2xl text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-[0.3em] shadow-inner font-mono">
                      {roomCode}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center mb-6">
                  <button
                    onClick={copyToClipboard}
                    className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-black text-sm transition-all border-4 shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] border-b-8 active:border-b-4 active:translate-y-1 ${linkCopied ? "bg-emerald-400 border-emerald-600 text-slate-900" : "bg-white dark:bg-slate-700 border-slate-900 dark:border-black text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600"}`}
                  >
                    {linkCopied ? (
                      <CheckCircle2 size={18} strokeWidth={3} />
                    ) : (
                      <Copy size={18} strokeWidth={3} />
                    )}{" "}
                    {linkCopied ? "تم نسخ الرابط!" : "نسخ الرابط"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-6">
                  <div
                    className={`p-4 rounded-2xl border-4 transition-all flex flex-col items-center shadow-sm ${team1Ready ? "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-500 dark:border-emerald-600" : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"}`}
                  >
                    <input
                      type="text"
                      value={team1Name}
                      onChange={(e) => updateTeamNameLocally(1, e.target.value)}
                      className={`text-lg font-black mb-2 text-center bg-transparent border-b-2 border-dashed outline-none w-full transition-colors ${team1Ready ? "text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700" : "text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600"}`}
                    />
                    {team1Ready ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black text-sm animate-pulse bg-white dark:bg-emerald-950 px-3 py-1 rounded-lg border-2 border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 size={16} /> جاهز!
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs">
                        <Clock size={14} className="animate-spin-slow" />{" "}
                        بانتظار التوزيع...
                      </div>
                    )}
                  </div>
                  <div
                    className={`p-4 rounded-2xl border-4 transition-all flex flex-col items-center shadow-sm ${team2Ready ? "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-500 dark:border-emerald-600" : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"}`}
                  >
                    <input
                      type="text"
                      value={team2Name}
                      onChange={(e) => updateTeamNameLocally(2, e.target.value)}
                      className={`text-lg font-black mb-2 text-center bg-transparent border-b-2 border-dashed outline-none w-full transition-colors ${team2Ready ? "text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700" : "text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600"}`}
                    />
                    {team2Ready ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black text-sm animate-pulse bg-white dark:bg-emerald-950 px-3 py-1 rounded-lg border-2 border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 size={16} /> جاهز!
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs">
                        <Clock size={14} className="animate-spin-slow" />{" "}
                        بانتظار التوزيع...
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={startBattle}
                  disabled={!(team1Ready && team2Ready)}
                  className={`w-full py-5 rounded-2xl text-2xl font-black flex items-center justify-center gap-3 transition-all border-4 border-slate-900 dark:border-black ${team1Ready && team2Ready ? "bg-rose-500 hover:bg-rose-400 border-b-8 active:border-b-4 active:translate-y-1 text-white shadow-[6px_6px_0px_#0f172a] dark:shadow-[6px_6px_0px_#000] animate-pulse" : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border-b-4"}`}
                >
                  بدء الحرب! <Flame size={24} className="fill-current" />
                </button>
              </div>
            )}

            {gameState === "playing" && (
              <>
                <div
                  className={`w-full bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-black rounded-3xl p-4 flex flex-col items-center justify-center gap-2 shadow-[6px_6px_0px_#0f172a] dark:shadow-[6px_6px_0px_#000] transition-colors duration-500`}
                >
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-4 py-1.5 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                    <Swords
                      className={`w-5 h-5 transition-colors ${attackingTeam === 1 ? "text-cyan-500" : "text-rose-500"}`}
                    />
                    <span className="text-sm font-black text-slate-600 dark:text-slate-400">
                      دور الهجوم:
                    </span>
                  </div>
                  <span
                    className={`text-3xl font-black transition-colors bg-slate-50 dark:bg-slate-900 w-full py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-inner text-center ${attackingTeam === 1 ? "text-cyan-500" : "text-rose-500"}`}
                  >
                    {attackingTeam === 1 ? team1Name : team2Name}
                  </span>
                  {attackingTeam !== turn &&
                    battleStep !== "roll" &&
                    battleStep !== "challenge" && (
                      <span className="text-xs font-black text-rose-500 animate-pulse bg-rose-100 dark:bg-rose-900/30 px-3 py-1 rounded-lg border-2 border-rose-200 dark:border-rose-800 mt-1">
                        (عكسي)
                      </span>
                    )}
                </div>

                <div
                  className={`${cardClass} w-full text-center relative overflow-y-auto custom-scroll flex-1 flex flex-col justify-center min-h-[300px]`}
                >
                  {battleStep === "roll" &&
                    (() => {
                      let allAvailableTypes: ChallengeType[] = [
                        "guess",
                        "30sec",
                        "5sec",
                        "general",
                        "team",
                      ];
                      let currentTeamUsed =
                        turn === 1 ? usedChallengesT1 : usedChallengesT2;
                      const teamColorBg =
                        turn === 1
                          ? "bg-cyan-500 hover:bg-cyan-400"
                          : "bg-rose-500 hover:bg-rose-400";
                      const teamTextColor =
                        turn === 1
                          ? "text-cyan-600 dark:text-cyan-400"
                          : "text-rose-600 dark:text-rose-400";
                      const teamName = turn === 1 ? team1Name : team2Name;

                      return (
                        <div className="animate-in fade-in py-4 flex flex-col items-center justify-center h-full">
                          <h3
                            className={`text-xl md:text-2xl font-black mb-8 ${teamTextColor}`}
                          >
                            اختر التحدي المناسب لفريق ({teamName}):
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full px-6">
                            {allAvailableTypes.map((cType) => {
                              const isUsed = currentTeamUsed.includes(cType);
                              return (
                                <button
                                  key={cType}
                                  onClick={() => {
                                    if (!isUsed) {
                                      handleSelectChallenge(cType);
                                    }
                                  }}
                                  disabled={isUsed}
                                  className={`py-4 rounded-2xl font-black text-lg border-4 transition-all shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] ${isUsed ? "bg-slate-200 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700 opacity-50 cursor-not-allowed" : `${teamColorBg} text-white border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1`}`}
                                >
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
                      <Zap
                        className="mx-auto text-purple-500 mb-3 animate-pulse w-10 h-10"
                        strokeWidth={2.5}
                      />
                      <p className="text-slate-500 font-black mb-4 bg-slate-100 dark:bg-slate-900 px-4 py-1.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm">
                        {activeChallengeName}
                      </p>

                      {(activeChallengeType === "30sec" ||
                        activeChallengeType === "5sec" ||
                        activeChallengeType === "team") && (
                        <div className="w-full flex flex-col gap-3 flex-1 justify-center">
                          {!isChallengeRevealed ? (
                            <button
                              onClick={() => setIsChallengeRevealed(true)}
                              className={`w-full py-5 text-white font-black text-2xl rounded-2xl shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] active:translate-y-1 border-4 border-slate-900 border-b-8 active:border-b-4 animate-pulse ${activeChallengeType === "30sec" ? "bg-blue-500" : activeChallengeType === "5sec" ? "bg-amber-500" : "bg-purple-500"}`}
                            >
                              {activeChallengeType === "team"
                                ? "عرض التحدي 🎭"
                                : "عرض الموضوع 👀"}
                            </button>
                          ) : (
                            <div className="animate-in zoom-in fade-in duration-300 w-full flex flex-col h-full justify-between">
                              <div className="flex w-full justify-end items-start mb-3">
                                <button
                                  onClick={pickNewChallenge}
                                  className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-4 py-2 rounded-xl text-sm font-black flex items-center gap-1.5 border-2 border-slate-300 dark:border-slate-600 border-b-4 active:border-b-2 active:translate-y-0.5 transition-all"
                                >
                                  <RefreshCw size={16} /> تغيير
                                </button>
                              </div>
                              <h3
                                className={`text-xl md:text-2xl font-black border-4 border-slate-900 dark:border-black rounded-2xl py-6 px-4 shadow-inner w-full leading-relaxed mb-4 ${activeChallengeType === "30sec" ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400" : activeChallengeType === "5sec" ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400" : "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400"}`}
                              >
                                {activeChallengeType === "team"
                                  ? "التحدي: "
                                  : "الموضوع: "}{" "}
                                {activeChallengeData?.q || activeChallengeData}
                              </h3>
                              <div className="flex flex-col gap-3 w-full">
                                {!isGenTimerRunning &&
                                genTimer ===
                                  (activeChallengeType === "30sec"
                                    ? 30
                                    : activeChallengeType === "5sec"
                                      ? 5
                                      : activeChallengeData &&
                                          typeof activeChallengeData ===
                                            "string" &&
                                          activeChallengeData.includes(
                                            "ولا كلمة",
                                          )
                                        ? 90
                                        : 60) ? (
                                  <button
                                    onClick={() => {
                                      setIsGenTimerRunning(true);
                                      setTimerStarted(true);
                                    }}
                                    className="w-full bg-blue-500 hover:bg-blue-400 text-white font-black py-4 rounded-2xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 flex items-center justify-center gap-2 text-xl shadow-[4px_4px_0px_#0f172a] transition-all"
                                  >
                                    <Clock size={24} strokeWidth={2.5} /> بدء
                                    المؤقت (
                                    {activeChallengeType === "30sec"
                                      ? "30"
                                      : activeChallengeType === "5sec"
                                        ? "5"
                                        : activeChallengeData &&
                                            typeof activeChallengeData ===
                                              "string" &&
                                            activeChallengeData.includes(
                                              "ولا كلمة",
                                            )
                                          ? "90"
                                          : "60"}{" "}
                                    ثانية)
                                  </button>
                                ) : (
                                  <div
                                    className={`w-full font-mono text-5xl font-black py-4 rounded-2xl border-4 border-slate-900 dark:border-black tracking-widest text-center transition-colors shadow-inner ${genTimer <= 5 ? "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 animate-pulse" : "bg-slate-50 dark:bg-slate-900 text-amber-500 dark:text-amber-400"}`}
                                  >
                                    {formatTime(genTimer)}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <button
                            onClick={cancelChallenge}
                            className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-4 border-slate-300 dark:border-slate-700 border-b-8 active:border-b-4 active:translate-y-1 rounded-2xl py-3 mt-2 text-slate-600 dark:text-slate-300 font-black transition-all"
                          >
                            <Ban size={18} strokeWidth={2.5} /> تخطي الدورة
                          </button>
                        </div>
                      )}

                      {activeChallengeType === "general" && (
                        <div className="w-full mb-2 flex flex-col gap-3 flex-1 justify-center">
                          {!isChallengeRevealed ? (
                            <button
                              onClick={() => setIsChallengeRevealed(true)}
                              className="w-full py-5 text-slate-900 font-black text-2xl rounded-2xl shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] active:translate-y-1 bg-emerald-400 border-4 border-slate-900 border-b-8 active:border-b-4 animate-pulse"
                            >
                              عرض السؤال 📝
                            </button>
                          ) : (
                            <div className="animate-in zoom-in fade-in duration-300 flex flex-col w-full h-full justify-between">
                              <div className="flex w-full justify-end items-start mb-3">
                                <button
                                  onClick={pickNewChallenge}
                                  className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-4 py-2 rounded-xl text-sm font-black flex items-center gap-1.5 border-2 border-slate-300 dark:border-slate-600 border-b-4 active:border-b-2 active:translate-y-0.5 transition-all"
                                >
                                  <RefreshCw size={16} /> تغيير
                                </button>
                              </div>
                              <h3 className="text-xl md:text-2xl font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-4 border-emerald-300 dark:border-emerald-800 rounded-2xl py-6 px-4 shadow-inner w-full mb-4 leading-relaxed">
                                {activeChallengeData?.q}
                              </h3>

                              {activeChallengeData?.options &&
                                activeChallengeData.options.length === 3 && (
                                  <div className="grid grid-cols-1 gap-3 w-full mb-4">
                                    {activeChallengeData.options.map(
                                      (opt: string, index: number) => {
                                        const isCorrect =
                                          showGenAnswer &&
                                          opt === activeChallengeData.a;
                                        const isWrongSelected =
                                          showGenAnswer &&
                                          opt === selectedOption &&
                                          opt !== activeChallengeData.a;
                                        const isFaded =
                                          showGenAnswer &&
                                          !isCorrect &&
                                          !isWrongSelected;
                                        return (
                                          <button
                                            key={index}
                                            disabled={showGenAnswer}
                                            onClick={() => {
                                              setSelectedOption(opt);
                                              setShowGenAnswer(true);
                                              setIsGenTimerRunning(false);
                                              setTimerStarted(true);
                                            }}
                                            className={`flex items-center justify-center border-4 border-slate-900 dark:border-black rounded-2xl p-4 transition-all ${isCorrect ? "bg-emerald-400 text-slate-900 scale-[1.02] border-b-4" : isWrongSelected ? "bg-rose-500 text-white border-b-4" : isFaded ? "bg-slate-100 dark:bg-slate-800/50 opacity-50 text-slate-500 border-b-4" : "bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white border-b-8 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a]"}`}
                                          >
                                            <span className="text-lg font-black">
                                              {opt}
                                            </span>
                                          </button>
                                        );
                                      },
                                    )}
                                  </div>
                                )}
                              {!showGenAnswer && (
                                <div className="flex flex-col gap-3 mb-4 w-full">
                                  {!isGenTimerRunning && genTimer === 15 ? (
                                    <button
                                      onClick={() => {
                                        setIsGenTimerRunning(true);
                                        setTimerStarted(true);
                                      }}
                                      className="w-full bg-blue-500 hover:bg-blue-400 text-white font-black py-4 rounded-2xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 flex items-center justify-center gap-2 text-xl shadow-[4px_4px_0px_#0f172a] transition-all"
                                    >
                                      <Clock size={24} strokeWidth={2.5} /> بدء
                                      المؤقت (15 ثانية)
                                    </button>
                                  ) : (
                                    <div
                                      className={`w-full font-mono text-4xl font-black py-3 rounded-2xl border-4 border-slate-900 dark:border-black tracking-widest text-center shadow-inner ${genTimer <= 5 ? "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 animate-pulse" : "bg-slate-50 dark:bg-slate-900 text-amber-500 dark:text-amber-400"}`}
                                    >
                                      {formatTime(genTimer)}
                                    </div>
                                  )}
                                </div>
                              )}
                              {!activeChallengeData?.options &&
                                (showGenAnswer ? (
                                  <div className="bg-emerald-100 dark:bg-emerald-900/50 border-4 border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-400 font-black text-2xl py-4 px-4 rounded-2xl mt-2 mb-4 shadow-inner">
                                    {activeChallengeData?.a}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setShowGenAnswer(true);
                                      setIsGenTimerRunning(false);
                                      setTimerStarted(true);
                                    }}
                                    className="w-full bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-black text-xl py-4 rounded-2xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 flex items-center justify-center gap-2 mb-4 shadow-[4px_4px_0px_#0f172a] hover:bg-slate-50 dark:hover:bg-slate-700"
                                  >
                                    إظهار الإجابة{" "}
                                    <Search size={20} strokeWidth={3} />
                                  </button>
                                ))}
                            </div>
                          )}
                          <button
                            onClick={cancelChallenge}
                            className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-4 border-slate-300 dark:border-slate-700 border-b-8 active:border-b-4 active:translate-y-1 rounded-2xl py-3 mt-2 text-slate-600 dark:text-slate-300 font-black transition-all"
                          >
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
                                <label className="block text-cyan-600 dark:text-cyan-400 font-black mb-2 text-sm text-center">
                                  {team1Name}
                                </label>
                                <input
                                  type={guessesRevealed ? "text" : "tel"}
                                  value={guessT1}
                                  onChange={(e) =>
                                    setGuessT1(
                                      e.target.value.replace(/[^0-9]/g, ""),
                                    )
                                  }
                                  className={`w-full bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 rounded-2xl p-4 text-center text-2xl font-black outline-none focus:border-cyan-500 shadow-inner ${!guessesRevealed ? "text-transparent placeholder:text-slate-400 caret-slate-900 dark:caret-white" : "text-slate-900 dark:text-white"}`}
                                  placeholder="الرقم"
                                />
                                {!guessesRevealed && guessT1 && (
                                  <div className="absolute top-[42px] left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none text-cyan-500 text-xl font-black">
                                    {"★".repeat(guessT1.length)}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 relative">
                                <label className="block text-rose-600 dark:text-rose-400 font-black mb-2 text-sm text-center">
                                  {team2Name}
                                </label>
                                <input
                                  type={guessesRevealed ? "text" : "tel"}
                                  value={guessT2}
                                  onChange={(e) =>
                                    setGuessT2(
                                      e.target.value.replace(/[^0-9]/g, ""),
                                    )
                                  }
                                  className={`w-full bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 rounded-2xl p-4 text-center text-2xl font-black outline-none focus:border-rose-500 shadow-inner ${!guessesRevealed ? "text-transparent placeholder:text-slate-400 caret-slate-900 dark:caret-white" : "text-slate-900 dark:text-white"}`}
                                  placeholder="الرقم"
                                />
                                {!guessesRevealed && guessT2 && (
                                  <div className="absolute top-[42px] left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none text-rose-500 text-xl font-black">
                                    {"★".repeat(guessT2.length)}
                                  </div>
                                )}
                              </div>
                            </div>
                            {!guessesRevealed ? (
                              <button
                                onClick={() => setGuessesRevealed(true)}
                                disabled={!guessT1 || !guessT2}
                                className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-black text-lg rounded-2xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a] transition-all flex items-center justify-center gap-2"
                              >
                                <Eye size={20} strokeWidth={3} /> كشف الأرقام
                              </button>
                            ) : (
                              <div className="flex gap-3">
                                <button
                                  onClick={() => challengeSuccess(1)}
                                  className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-black text-sm rounded-xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a] flex items-center justify-center gap-2"
                                >
                                  <CheckCircle2 size={16} /> فاز {team1Name}
                                </button>
                                <button
                                  onClick={() => challengeSuccess(2)}
                                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-400 text-white font-black text-sm rounded-xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a] flex items-center justify-center gap-2"
                                >
                                  <CheckCircle2 size={16} /> فاز {team2Name}
                                </button>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={cancelChallenge}
                            className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-4 border-slate-300 dark:border-slate-700 border-b-8 active:border-b-4 active:translate-y-1 rounded-2xl py-3 mt-2 text-slate-600 dark:text-slate-300 font-black transition-all"
                          >
                            <Ban size={18} strokeWidth={2.5} /> تخطي الدورة
                          </button>
                        </div>
                      )}

                      {activeChallengeType !== "guess" &&
                        (!(
                          activeChallengeType === "30sec" ||
                          activeChallengeType === "5sec" ||
                          activeChallengeType === "general" ||
                          activeChallengeType === "team"
                        ) ||
                          isChallengeRevealed) && (
                          <div className="flex gap-3 w-full mt-4">
                            <button
                              onClick={() => challengeSuccess()}
                              className="flex-1 flex flex-col items-center justify-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-slate-900 border-4 border-slate-900 dark:border-black border-b-8 rounded-2xl py-4 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a] transition-all"
                            >
                              <CheckCircle2
                                className="w-8 h-8"
                                strokeWidth={2.5}
                              />{" "}
                              <span className="text-sm font-black">
                                فوز - هجوم
                              </span>
                            </button>
                            <button
                              onClick={challengeFail}
                              className="flex-1 flex flex-col items-center justify-center gap-2 bg-rose-500 hover:bg-rose-400 text-white border-4 border-slate-900 dark:border-black border-b-8 rounded-2xl py-4 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a] transition-all"
                            >
                              <Skull className="w-8 h-8" strokeWidth={2.5} />{" "}
                              <span className="text-sm font-black">
                                خسارة - عكسي
                              </span>
                            </button>
                          </div>
                        )}
                    </div>
                  )}

                  {battleStep === "target" && (
                    <div className="animate-in slide-in-from-bottom-4 flex flex-col items-center justify-center h-full py-6">
                      <Crosshair
                        className="mx-auto text-rose-600 dark:text-rose-500 mb-4 animate-spin-slow w-16 h-16"
                        strokeWidth={2.5}
                      />
                      <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4">
                        حدد هدفك الآن!
                      </h3>
                      <p className="text-base text-slate-600 dark:text-slate-400 font-bold mb-8 bg-slate-100 dark:bg-slate-900 px-6 py-3 rounded-2xl border-4 border-slate-200 dark:border-slate-800">
                        اضغط على نافذة في{" "}
                        <span
                          className={`font-black ${attackingTeam === 1 ? "text-rose-600 dark:text-rose-400" : "text-cyan-600 dark:text-cyan-400"}`}
                        >
                          قلعة العدو
                        </span>{" "}
                        للقصف!
                      </p>

                      <button
                        onClick={useSpy}
                        disabled={
                          (attackingTeam === 1 && spyUsed1) ||
                          (attackingTeam === 2 && spyUsed2)
                        }
                        className={`w-full py-4 rounded-2xl text-lg font-black flex items-center justify-center gap-2 transition-all border-4 shadow-[4px_4px_0px_#0f172a] ${(attackingTeam === 1 && !spyUsed1) || (attackingTeam === 2 && !spyUsed2) ? "bg-amber-400 hover:bg-amber-300 text-slate-900 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1" : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-300 dark:border-slate-700 border-b-4 cursor-not-allowed"}`}
                      >
                        {(attackingTeam === 1 && spyUsed1) ||
                        (attackingTeam === 2 && spyUsed2) ? (
                          <Lock className="w-5 h-5" strokeWidth={3} />
                        ) : (
                          <Eye className="w-5 h-5" strokeWidth={3} />
                        )}
                        <span>
                          {(attackingTeam === 1 && spyUsed1) ||
                          (attackingTeam === 2 && spyUsed2)
                            ? "تم الاستخدام"
                            : "استخدام الجاسوس"}
                        </span>
                      </button>

                      <button
                        onClick={() =>
                          setAttackingTeam((prev) => (prev === 1 ? 2 : 1))
                        }
                        className="mt-6 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl font-black text-sm transition-all border-2 border-slate-300 dark:border-slate-700 border-b-4 active:border-b-2 active:translate-y-0.5"
                      >
                        <RefreshCw size={16} strokeWidth={2.5} /> تصحيح الفائز
                        (تبديل الهجوم)
                      </button>
                    </div>
                  )}

                  {battleStep === "trapChoice" && (
                    <div className="animate-in zoom-in w-full flex flex-col items-center justify-center h-full py-4 px-4">
                      <Bomb
                        className="mx-auto text-purple-600 dark:text-purple-400 mb-4 animate-pulse w-20 h-20"
                        strokeWidth={2.5}
                      />
                      <h3 className="text-4xl font-black text-purple-700 dark:text-purple-400 mb-4">
                        وقع في الفخ! 🪤
                      </h3>
                      <p className="text-slate-700 dark:text-slate-300 font-black mb-8 bg-purple-50 dark:bg-purple-900/30 px-6 py-3 rounded-2xl border-4 border-purple-200 dark:border-purple-800 text-lg">
                        يا فريق ({attackingTeam === 1 ? team2Name : team1Name})
                        اختر مصيرهم:
                      </p>
                      <div className="flex flex-col md:flex-row gap-4 w-full">
                        <button
                          onClick={() => resolveTrap("capture")}
                          className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white py-5 rounded-2xl font-black text-xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a] transition-all"
                        >
                          أسر 20 جندي
                        </button>
                        <button
                          onClick={() => resolveTrap("kill")}
                          className="flex-1 bg-rose-500 hover:bg-rose-400 text-white py-5 rounded-2xl font-black text-xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a] transition-all"
                        >
                          قتل 20 جندي
                        </button>
                      </div>
                    </div>
                  )}

                  {battleStep === "result" && (
                    <div
                      className={`animate-in zoom-in py-6 flex flex-col items-center justify-center min-h-full w-full rounded-3xl ${resultType === "spy" ? "bg-yellow-400 absolute inset-0 z-50 p-4" : "p-4"}`}
                    >
                      <div
                        className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner border-8 ${resultType === "spy" ? "border-yellow-500 bg-yellow-300" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"}`}
                      >
                        {resultType === "hit" && (
                          <CheckCircle2
                            className="text-emerald-500 w-12 h-12"
                            strokeWidth={3}
                          />
                        )}
                        {resultType === "miss" && (
                          <Shield
                            className="text-slate-400 dark:text-slate-500 w-12 h-12"
                            fill="none"
                            strokeWidth={3}
                          />
                        )}
                        {resultType === "trap" && (
                          <Bomb
                            className="text-purple-600 dark:text-purple-400 animate-screen-shake w-12 h-12"
                            strokeWidth={3}
                          />
                        )}
                        {resultType === "commander" && (
                          <Crown
                            className="text-amber-500 animate-pulse w-12 h-12"
                            strokeWidth={3}
                          />
                        )}
                        {resultType === "spy" && (
                          <Eye
                            className="text-slate-900 animate-pulse w-12 h-12"
                            strokeWidth={3}
                          />
                        )}
                      </div>
                      <h3
                        className={`text-2xl md:text-3xl font-black mb-8 px-4 leading-relaxed py-4 rounded-2xl border-4 w-full shadow-inner ${resultType === "spy" ? "bg-yellow-300 border-yellow-500 text-slate-900" : resultType === "hit" ? "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-emerald-600 dark:text-emerald-400" : resultType === "trap" ? "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-purple-700 dark:text-purple-400" : resultType === "commander" ? "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-amber-600 dark:text-amber-400" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white"}`}
                      >
                        {resultMsg}
                      </h3>
                      <button
                        onClick={nextTurn}
                        className={`w-full py-5 text-xl font-black rounded-2xl border-4 border-b-8 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#cbd5e1] dark:shadow-[4px_4px_0px_#000] flex items-center justify-center gap-3 transition-all mt-auto ${resultType === "spy" ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800" : "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-white"}`}
                      >
                        <Swords className="w-6 h-6" strokeWidth={2.5} />{" "}
                        <span>إنهاء الدور والتالي</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {gameState === "gameOver" && (
              <div
                className={`${cardClass} w-full text-center animate-in zoom-in-95 flex flex-col justify-center items-center p-8`}
              >
                <div className="w-32 h-32 bg-amber-100 dark:bg-amber-900/40 rounded-[2rem] flex items-center justify-center border-4 border-amber-400 dark:border-amber-600 shadow-inner mb-6">
                  <Crown
                    className="text-amber-500 w-16 h-16 animate-bounce"
                    strokeWidth={2.5}
                  />
                </div>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-3">
                  انتهت الحرب!
                </h2>
                <p className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-6 bg-slate-100 dark:bg-slate-900 px-6 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                  الفريق المنتصر
                </p>
                <span
                  className={`font-black text-5xl block mb-10 drop-shadow-sm ${hp1 > 0 ? "text-cyan-500" : "text-rose-500"}`}
                >
                  {hp1 > 0 ? team1Name : team2Name}
                </span>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-2xl font-black rounded-2xl border-4 border-slate-900 dark:border-white border-b-8 active:border-b-4 active:translate-y-1 shadow-[6px_6px_0px_#cbd5e1] dark:shadow-[6px_6px_0px_#000] transition-all"
                >
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
                {hp2} / {TOTAL_SOLDIERS}{" "}
                <span className="text-sm text-slate-500 font-bold">جندي</span>
              </div>
            </div>
            <div className="flex-1 w-full max-w-[600px] mx-auto mt-2">
              {renderInteractiveCastle(false)}
            </div>
          </div>
        </div>
      </div>

      {gameState === "playing" && battleStep === "result" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 pointer-events-auto px-4">
          <div
            className={`flex flex-col items-center justify-center p-8 md:p-14 w-full max-w-3xl rounded-[3rem] border-8 shadow-[20px_20px_0px_#000] animate-in zoom-in-95 duration-300 ${resultType === "spy" ? "bg-yellow-400 border-yellow-600" : "bg-white dark:bg-slate-800 border-slate-900 dark:border-black"}`}
          >
            <div
              className={`w-28 h-28 rounded-full flex items-center justify-center mb-8 shadow-inner border-8 ${resultType === "spy" ? "border-yellow-500 bg-yellow-300" : "border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"}`}
            >
              {resultType === "hit" && (
                <CheckCircle2
                  className="text-emerald-500 w-14 h-14"
                  strokeWidth={3}
                />
              )}
              {resultType === "miss" && (
                <Shield
                  className="text-slate-400 dark:text-slate-500 w-14 h-14"
                  fill="none"
                  strokeWidth={3}
                />
              )}
              {resultType === "trap" && (
                <Bomb
                  className="text-purple-600 dark:text-purple-400 animate-screen-shake w-14 h-14"
                  strokeWidth={3}
                />
              )}
              {resultType === "commander" && (
                <Crown
                  className="text-amber-500 animate-pulse w-14 h-14"
                  strokeWidth={3}
                />
              )}
              {resultType === "spy" && (
                <Eye
                  className="text-slate-900 animate-pulse w-14 h-14"
                  strokeWidth={3}
                />
              )}
            </div>
            <h3
              className={`text-2xl md:text-4xl font-black mb-10 px-6 leading-relaxed py-8 rounded-2xl border-4 w-full text-center shadow-inner ${resultType === "spy" ? "bg-yellow-300 border-yellow-500 text-slate-900" : resultType === "hit" ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400" : resultType === "trap" ? "bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400" : resultType === "commander" ? "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"}`}
            >
              {resultMsg}
            </h3>
            <button
              onClick={nextTurn}
              className={`w-full py-6 text-2xl font-black rounded-2xl border-4 border-b-8 active:border-b-4 active:translate-y-1 shadow-[6px_6px_0px_#000] flex items-center justify-center gap-3 transition-all ${resultType === "spy" ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800" : "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-white"}`}
            >
              <Swords className="w-8 h-8" strokeWidth={2.5} />{" "}
              <span>إنهاء الدور والتالي</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
