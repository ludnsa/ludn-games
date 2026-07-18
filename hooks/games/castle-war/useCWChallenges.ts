import { useState } from "react";
import { ChallengeType } from "@/hooks/useCastleWar"; // Assuming ChallengeType is exported

export function useCWChallenges() {
  const [cw30SecDB, setCw30SecDB] = useState<string[]>([]);
  const [cw5SecDB, setCw5SecDB] = useState<string[]>([]);
  const [cwTeamDB, setCwTeamDB] = useState<string[]>([]);
  const [cwGenDB, setCwGenDB] = useState<{ q: string; a: string; options?: string[] }[]>([]);

  const [activeChallengeType, setActiveChallengeType] = useState<ChallengeType>("");
  const [activeChallengeName, setActiveChallengeName] = useState("");
  const [activeChallengeData, setActiveChallengeData] = useState<any>(null);
  const [isChallengeRevealed, setIsChallengeRevealed] = useState(false);
  const [showGenAnswer, setShowGenAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [guessT1, setGuessT1] = useState("");
  const [guessT2, setGuessT2] = useState("");
  const [guessesRevealed, setGuessesRevealed] = useState(false);
  const [usedChallengesT1, setUsedChallengesT1] = useState<ChallengeType[]>([]);
  const [usedChallengesT2, setUsedChallengesT2] = useState<ChallengeType[]>([]);

  const [genTimer, setGenTimer] = useState<number>(15);
  const [isGenTimerRunning, setIsGenTimerRunning] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);

  return {
    cw30SecDB, setCw30SecDB,
    cw5SecDB, setCw5SecDB,
    cwTeamDB, setCwTeamDB,
    cwGenDB, setCwGenDB,
    activeChallengeType, setActiveChallengeType,
    activeChallengeName, setActiveChallengeName,
    activeChallengeData, setActiveChallengeData,
    isChallengeRevealed, setIsChallengeRevealed,
    showGenAnswer, setShowGenAnswer,
    selectedOption, setSelectedOption,
    guessT1, setGuessT1, guessT2, setGuessT2,
    guessesRevealed, setGuessesRevealed,
    usedChallengesT1, setUsedChallengesT1,
    usedChallengesT2, setUsedChallengesT2,
    genTimer, setGenTimer,
    isGenTimerRunning, setIsGenTimerRunning,
    timerStarted, setTimerStarted,
    targetEndTime, setTargetEndTime
  };
}
