"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useCWGameFlow } from "./games/castle-war/useCWGameFlow";
import { useCWRoom } from "./games/castle-war/useCWRoom";
import { useCWCombat } from "./games/castle-war/useCWCombat";
import { useCWChallenges } from "./games/castle-war/useCWChallenges";
import { useDebounceCallback } from "@/lib/game/debounce";
import { useGameAccess } from "@/hooks/shared/useGameAccess";
import { useRouter } from "next/navigation";

export const TOTAL_SOLDIERS = 120;
export const ROOMS_COUNT = 15;

export const SVG_ROOMS = [
  { id: 0, cx: 250, cy: 300 }, { id: 1, cx: 250, cy: 420 }, { id: 2, cx: 250, cy: 540 }, { id: 3, cx: 170, cy: 660 }, { id: 4, cx: 330, cy: 660 },
  { id: 5, cx: 600, cy: 150 }, { id: 6, cx: 480, cy: 300 }, { id: 7, cx: 720, cy: 300 }, { id: 8, cx: 480, cy: 460 }, { id: 9, cx: 720, cy: 460 },
  { id: 10, cx: 950, cy: 300 }, { id: 11, cx: 950, cy: 420 }, { id: 12, cx: 950, cy: 540 }, { id: 13, cx: 870, cy: 660 }, { id: 14, cx: 1030, cy: 660 },
];

export type TeamSetup = { rooms: number[]; commanderRoom: number | null; trapRoom: number | null; roomCode?: string; name?: string; };
export type SoundType = "roll" | "hit" | "miss" | "trap" | "commander" | "win" | "tick" | "buzzer";
export type ChallengeType = "30sec" | "5sec" | "general" | "team" | "guess" | "";

const createSoundSynth = () => {
  if (typeof window === "undefined") return null;
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
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

export function useCastleWar() {
  const room = useCWRoom();
  const flow = useCWGameFlow();
  const combat = useCWCombat();
  const challenges = useCWChallenges();
  const router = useRouter();
  const { checkAccess, consumeGameSession } = useGameAccess();
  const [userId, setUserId] = useState<string | null>(null);

  const {
    roomCode, setRoomCode, roomCodeRef, joinUrl, setJoinUrl, linkCopied, setLinkCopied,
    team1Ready, setTeam1Ready, team2Ready, setTeam2Ready, team1Data, setTeam1Data,
    team2Data, setTeam2Data, supabase
  } = room;

  const {
    gameState, setGameState, isLoading, setIsLoading,
    team1Name, setTeam1Name, team2Name, setTeam2Name,
    turn, setTurn, battleStep, setBattleStep
  } = flow;

  const {
    attackingTeam, setAttackingTeam, hp1, setHp1, hp2, setHp2,
    revealed1, setRevealed1, revealed2, setRevealed2, resultMsg, setResultMsg,
    resultType, setResultType, spyUsed1, setSpyUsed1, spyUsed2, setSpyUsed2,
    spiedTarget1, setSpiedTarget1, spiedTarget2, setSpiedTarget2, screenShake, setScreenShake,
    explosionRoomIndexHit, setExplosionRoomIndexHit, targetRoomIndex, setTargetRoomIndex,
    isAttacking, setIsAttacking
  } = combat;

  const {
    cw30SecDB, setCw30SecDB, cw5SecDB, setCw5SecDB, cwTeamDB, setCwTeamDB, cwGenDB, setCwGenDB,
    activeChallengeType, setActiveChallengeType, activeChallengeName, setActiveChallengeName,
    activeChallengeData, setActiveChallengeData, isChallengeRevealed, setIsChallengeRevealed,
    showGenAnswer, setShowGenAnswer, selectedOption, setSelectedOption, guessT1, setGuessT1,
    guessT2, setGuessT2, guessesRevealed, setGuessesRevealed, usedChallengesT1, setUsedChallengesT1,
    usedChallengesT2, setUsedChallengesT2, genTimer, setGenTimer, isGenTimerRunning, setIsGenTimerRunning,
    timerStarted, setTimerStarted
  } = challenges;

  const [soundEnabled, setSoundEnabled] = useState(true);
  const synthRef = useRef<{ playMasterSound: (type: SoundType) => void; } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    if (gameState === "gameOver") {
      const timer = setTimeout(() => {
        router.push("/my-games");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [gameState, router]);

  useEffect(() => {
    const checkTheme = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getSession();

    return () => observer.disconnect();
  }, []);

  const debouncedSyncToSupabase = useDebounceCallback(async (liveData: any) => {
    if (!roomCodeRef.current) return;
    try {
      await supabase.from("cw_rooms").update({ live_sync: liveData }).eq("room_code", roomCodeRef.current);
    } catch (e) {
      console.error("Sync error:", e);
    }
  }, 400);

  useEffect(() => {
    if (!roomCodeRef.current) return;
    const liveData = {
      gameState, hp1, hp2, revealed1, revealed2, attackingTeam, turn,
      spiedTarget1, spiedTarget2, team1Data, team2Data, team1Name, team2Name,
      battleStep, activeChallengeName,
      activeChallengeData: activeChallengeData
        ? typeof activeChallengeData === "string" ? activeChallengeData : { q: activeChallengeData.q, options: activeChallengeData.options }
        : null,
      isChallengeRevealed, genTimer, resultType, resultMsg, explosionRoomIndexHit,
      targetRoomIndex, usedChallengesT1, usedChallengesT2, timerStarted, timestamp: Date.now(),
    };

    debouncedSyncToSupabase(liveData);
  }, [
    gameState, hp1, hp2, revealed1, revealed2, attackingTeam, turn, spiedTarget1, spiedTarget2,
    team1Data, team2Data, team1Name, team2Name, battleStep, activeChallengeName,
    activeChallengeData, isChallengeRevealed, genTimer, resultType, resultMsg,
    explosionRoomIndexHit, targetRoomIndex, usedChallengesT1, usedChallengesT2, timerStarted
  ]);

  useEffect(() => {
    synthRef.current = createSoundSynth();
    const initGame = async () => {
      setIsLoading(true);
      try {
        const newRoomCode = "C" + generateAlphanumericCode(4);
        setRoomCode(newRoomCode);
        roomCodeRef.current = newRoomCode;
        setJoinUrl(`${window.location.origin}/games/castle-war/join?code=${newRoomCode}`);

        await supabase.from("cw_rooms").upsert({ room_code: newRoomCode, live_sync: {} });

        const { data: questions } = await supabase.from("cw_questions").select("*");
        if (questions) {
          const q30sec = questions.filter(q => q.category === '30sec').map(q => q.question);
          const q5sec = questions.filter(q => q.category === '5sec').map(q => q.question);
          const qTeam = questions.filter(q => q.category === 'team').map(q => q.question);
          const qGeneral = questions.filter(q => q.category === 'general').map(q => ({
            q: q.question,
            a: q.answer,
            options: q.options || [],
          }));

          setCw30SecDB(q30sec);
          setCw5SecDB(q5sec);
          setCwTeamDB(qTeam);
          setCwGenDB(qGeneral);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    initGame();
  }, []);

  useEffect(() => {
    if (!roomCode) return;
    const fetchInitialTeams = async () => {
      const { data } = await supabase.from("cw_rooms").select("team1_setup, team2_setup").eq("room_code", roomCode).single();
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

    const channel = supabase.channel(`room_${roomCode}`)
      .on(
        "postgres_changes", { event: "UPDATE", schema: "public", table: "cw_rooms", filter: `room_code=eq.${roomCode}` },
        (payload) => {
          const newRecord = payload.new;
          if (newRecord.team1_setup && !team1Ready) {
            setTeam1Data(newRecord.team1_setup);
            if (newRecord.team1_setup.name) setTeam1Name(newRecord.team1_setup.name);
            setTeam1Ready(true);
          }
          if (newRecord.team2_setup && !team2Ready) {
            setTeam2Data(newRecord.team2_setup);
            if (newRecord.team2_setup.name) setTeam2Name(newRecord.team2_setup.name);
            setTeam2Ready(true);
          }
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomCode, team1Ready, team2Ready]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isGenTimerRunning && genTimer > 0) {
      timer = setInterval(() => {
        setGenTimer((prev) => {
          if (prev <= 6 && prev > 1 && soundEnabled && synthRef.current) synthRef.current.playMasterSound("tick");
          return prev - 1;
        });
      }, 1000);
    } else if (genTimer === 0 && isGenTimerRunning) {
      if (soundEnabled && synthRef.current) synthRef.current.playMasterSound("buzzer");
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
        await supabase.from("cw_rooms").update({ team1_setup: updated }).eq("room_code", roomCodeRef.current);
      }
    } else {
      setTeam2Name(newName);
      if (team2Data) {
        const updated = { ...team2Data, name: newName };
        setTeam2Data(updated);
        await supabase.from("cw_rooms").update({ team2_setup: updated }).eq("room_code", roomCodeRef.current);
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
    setTimeout(() => {
      setExplosionRoomIndexHit(null);
      setScreenShake(false);
    }, isMajor ? 1000 : 600);
  };

  const startBattle = async () => {
    if (team1Ready && team2Ready && team1Data && team2Data) {
      if (!userId) {
        alert("يجب تسجيل الدخول لبدء اللعبة.");
        return;
      }

      // Gatekeeper Check
      const access = await checkAccess("castle-war", userId);
      if (!access.allowed) {
        if (window.confirm("رصيدك غير كافٍ. هل ترغب في شراء باقة للاستمرار باللعب؟")) {
          router.push("/packages");
        }
        return;
      }

      // Consume the token or free trial
      await consumeGameSession("castle-war", userId, access.reason);
      
      setGameState("playing");
    }
  };

  const getChallengeTitle = (type: ChallengeType) => {
    switch (type) {
      case "30sec": return "ثلاثين ثانية";
      case "5sec": return "خمس ثواني";
      case "general": return "أسئلة عامة";
      case "team": return "تحدي الفريق";
      case "guess": return "توقع الرقم";
      default: return "";
    }
  };

  const handleSelectChallenge = (targetType: ChallengeType) => {
    let allAvailableTypes: ChallengeType[] = ["guess", "30sec", "5sec", "general", "team"];
    let currentUsed = turn === 1 ? [...usedChallengesT1] : [...usedChallengesT2];
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
      setActiveChallengeData(cw30SecDB.length > 0 ? cw30SecDB[Math.floor(Math.random() * cw30SecDB.length)] : { q: "لم تتم إضافة أسئلة بعد" });
      setGenTimer(30);
    } else if (targetType === "5sec") {
      setActiveChallengeData(cw5SecDB.length > 0 ? cw5SecDB[Math.floor(Math.random() * cw5SecDB.length)] : { q: "لم تتم إضافة أسئلة بعد" });
      setGenTimer(5);
    } else if (targetType === "general") {
      setActiveChallengeData(cwGenDB.length > 0 ? cwGenDB[Math.floor(Math.random() * cwGenDB.length)] : { q: "لم تتم إضافة أسئلة بعد", a: "-" });
      setGenTimer(15);
    } else if (targetType === "team") {
      const tData = cwTeamDB.length > 0 ? cwTeamDB[Math.floor(Math.random() * cwTeamDB.length)] : { q: "لم تتم إضافة تحديات بعد" };
      setActiveChallengeData(tData);
      setGenTimer(typeof tData === "string" && tData.includes("ولا كلمة") ? 90 : 60);
    } else setActiveChallengeData(null);

    if (soundEnabled && synthRef.current) synthRef.current.playMasterSound("tick");
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
      setActiveChallengeData(cwGenDB[Math.floor(Math.random() * cwGenDB.length)]);
      setGenTimer(15);
      setShowGenAnswer(false);
      setSelectedOption(null);
    } else if (activeChallengeType === "30sec" && cw30SecDB.length > 0) {
      setActiveChallengeData(cw30SecDB[Math.floor(Math.random() * cw30SecDB.length)]);
      setGenTimer(30);
    } else if (activeChallengeType === "5sec" && cw5SecDB.length > 0) {
      setActiveChallengeData(cw5SecDB[Math.floor(Math.random() * cw5SecDB.length)]);
      setGenTimer(5);
    } else if (activeChallengeType === "team" && cwTeamDB.length > 0) {
      const tData = cwTeamDB[Math.floor(Math.random() * cwTeamDB.length)];
      setActiveChallengeData(tData);
      setGenTimer(typeof tData === "string" && tData.includes("ولا كلمة") ? 90 : 60);
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
          if (soundEnabled && synthRef.current) synthRef.current.playMasterSound("trap");
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
            if (soundEnabled && synthRef.current) synthRef.current.playMasterSound("commander");
            triggerExplosion(targetRoom, true);
            msg = `ضربة جاسوس قاضية! تم تحديد القائد والقضاء على ${damageToDefender} جندي.`;
          } else {
            damageToDefender = baseDamage;
            if (soundEnabled && synthRef.current) synthRef.current.playMasterSound("hit");
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
              if (soundEnabled && synthRef.current) synthRef.current.playMasterSound("win");
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
      const setDefenderRevealed = isTeam1Attacking ? setRevealed2 : setRevealed1;
      let currentHp1 = hp1;
      let currentHp2 = hp2;

      setDefenderRevealed((prev) => {
        const next = [...prev];
        next[roomIndex] = true;
        return next;
      });

      if (defenderData.trapRoom === roomIndex) {
        if (soundEnabled && synthRef.current) synthRef.current.playMasterSound("trap");
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
          if (soundEnabled && synthRef.current) synthRef.current.playMasterSound("commander");
          triggerExplosion(roomIndex, true);
          msg = `قاضية! سقط القائد! خسارة ${damageToDefender} جندي.`;
          type = "commander";
        } else if (baseDamage > 0) {
          damageToDefender = baseDamage;
          if (soundEnabled && synthRef.current) synthRef.current.playMasterSound("hit");
          triggerExplosion(roomIndex, false);
          msg = `إصابة! تم القضاء على ${damageToDefender} جندي.`;
          type = "hit";
        } else {
          if (soundEnabled && synthRef.current) synthRef.current.playMasterSound("miss");
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
            if (soundEnabled && synthRef.current) synthRef.current.playMasterSound("win");
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
        if (soundEnabled && synthRef.current) synthRef.current.playMasterSound("win");
      }
    }, 1000);
  };

  const nextTurn = () => {
    setTurn((prev) => (prev === 1 ? 2 : 1));
    setAttackingTeam((prev) => (prev === 1 ? 2 : 1));
    setBattleStep("roll");
    setResultType("idle");
  };

  return {
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
    challengeSuccess, challengeFail, useSpy, executeAttack, resolveTrap, nextTurn
  };
}