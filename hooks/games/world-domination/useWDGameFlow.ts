import { useState } from "react";
import { useGameTimer } from "@/hooks/shared/useGameTimer";

export function useWDGameFlow() {
  const [gameState, setGameState] = useState<
    | "lobby"
    | "setupMap"
    | "setupChallenges"
    | "setupCapitals"
    | "playing"
    | "gameOver"
  >("lobby");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [team1Name, setTeam1Name] = useState<string>("الفريق الأول");
  const [team2Name, setTeam2Name] = useState<string>("الفريق الثاني");
  const [score1, setScore1] = useState<number>(200);
  const [score2, setScore2] = useState<number>(200);
  const [turn, setTurn] = useState<1 | 2>(1);
  const { timer, setTimer, isTimerRunning, setIsTimerRunning, timerEndsAt, resumeUntil, startTimer, stopTimer, resetTimer } = useGameTimer(25);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [forcedWinner, setForcedWinner] = useState<1 | 2 | null>(null);
  const [quickProtectTeam, setQuickProtectTeam] = useState<1 | 2 | null>(null);

  const adjustScore = (team: 1 | 2, amount: number) => {
    if (team === 1) setScore1((prev) => Math.max(0, prev + amount));
    else setScore2((prev) => Math.max(0, prev + amount));
  };

  return {
    gameState, setGameState,
    isLoading, setIsLoading,
    team1Name, setTeam1Name,
    team2Name, setTeam2Name,
    score1, setScore1,
    score2, setScore2,
    turn, setTurn,
    timer, setTimer, isTimerRunning, setIsTimerRunning, timerEndsAt, resumeUntil, startTimer, stopTimer, resetTimer,
    showResult, setShowResult,
    forcedWinner, setForcedWinner,
    quickProtectTeam, setQuickProtectTeam,
    adjustScore
  };
}
