"use client";

import React from "react";
import { Cairo } from "next/font/google";
import LoadingScreen from "@/components/games/world-domination/LoadingScreen";
import AccessLoadingScreen from "@/components/games/shared/AccessLoadingScreen";
import { useWorldDomination } from "@/hooks/useWorldDomination";
import QuestionModal from "@/components/games/world-domination/QuestionModal";
import LobbyScreen from "@/components/games/world-domination/LobbyScreen";
import SetupMapScreen from "@/components/games/world-domination/SetupMapScreen";
import SetupChallengesScreen from "@/components/games/world-domination/SetupChallengesScreen";
import SetupCapitalsScreen from "@/components/games/world-domination/SetupCapitalsScreen";
import PlayingScreen from "@/components/games/world-domination/PlayingScreen";
import GameOverScreen from "@/components/games/world-domination/GameOverScreen";
import TopBar from "@/components/games/world-domination/TopBar";
import QuickProtectModal from "@/components/games/world-domination/QuickProtectModal";
import StolenCapitalAlertModal from "@/components/games/world-domination/StolenCapitalAlertModal";
import AudienceModal from "@/components/games/world-domination/AudienceModal";
import GameDialog from "@/components/games/world-domination/GameDialog";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

export default function WorldDominationGame() {
  const {
    roomCode, showAudienceModal, setShowAudienceModal,
    gameState, isLoading, team1Name, setTeam1Name,
    team2Name, setTeam2Name, score1, score2, turn, setTurn,
    countriesLimit, setCountriesLimit, challengesCount, setChallengesCount,
    countries, selectedCountry, setSelectedCountry, timer,
    isTimerRunning, setIsTimerRunning, team1Choice, setTeam1Choice,
    team2Choice, setTeam2Choice, showResult, setShowResult, isAttacking, setIsAttacking,
    isQuestionRevealed, setIsQuestionRevealed, audienceUrl,
    mapPosition, setMapPosition, capitals, stolenCapitalAlert, setStolenCapitalAlert,
    challengesUsed1, setChallengesUsed1, challengesUsed2, setChallengesUsed2,
    cards1, setCards1, cards2, setCards2, protectedCountries, setProtectedCountries,
    spiedCountryId, setSpiedCountryId, forcedWinner, setForcedWinner,
    quickProtectTeam, setQuickProtectTeam,
    dialog, showAlert, closeDialog, handleGoBack, handleGoHome,
    startGame, randomizeMap, confirmMap, confirmChallenges, handleCountryClick,
    handleChangeQuestion, handleRefereeChangeQuestion, adjustScore, handleManualFree,
    handleSpyAction, handleConfirmAnswers, handleCapture, handleMiss,
    countriesLeft, team1Owned, team2Owned, handleForceEndGame,
    useCaptureCard, useAirStrike, useProtectCard, handleNukeAction, isAccessChecking
  } = useWorldDomination();

  if (isAccessChecking) {
    return <AccessLoadingScreen />;
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <main
      className={`min-h-dvh overflow-x-hidden overflow-y-auto p-2 md:p-4 lg:p-6 ${cairo.className} bg-slate-50 dark:bg-slate-950 flex flex-col relative z-10 transition-colors duration-500`}
      dir="rtl"
    >
      {/* نوافذ التنبيهات المنبثقة */}
      <QuickProtectModal
        quickProtectTeam={quickProtectTeam}
        setQuickProtectTeam={setQuickProtectTeam}
        team1Name={team1Name}
        team2Name={team2Name}
        countries={countries}
        protectedCountries={protectedCountries}
        setCards1={setCards1}
        setCards2={setCards2}
        setProtectedCountries={setProtectedCountries}
        capitals={capitals}
      />

      <StolenCapitalAlertModal
        stolenCapitalAlert={stolenCapitalAlert}
        setStolenCapitalAlert={setStolenCapitalAlert}
        team1Name={team1Name}
        team2Name={team2Name}
      />

      {/* المحتوى الرئيسي */}
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full flex-1">
        <TopBar
          gameState={gameState}
          team1Name={team1Name}
          team2Name={team2Name}
          countriesLeft={countriesLeft}
          team1Owned={team1Owned}
          team2Owned={team2Owned}
          roomCode={roomCode}
          handleGoHome={handleGoHome}
          handleGoBack={handleGoBack}
          handleForceEndGame={handleForceEndGame}
          showAlert={showAlert}
          setShowAudienceModal={setShowAudienceModal}
        />

        {gameState === "lobby" ? (
          <LobbyScreen
            audienceUrl={audienceUrl}
            roomCode={roomCode}
            team1Name={team1Name}
            setTeam1Name={setTeam1Name}
            team2Name={team2Name}
            setTeam2Name={setTeam2Name}
            countriesLimit={countriesLimit}
            setCountriesLimit={setCountriesLimit}
            challengesCount={challengesCount}
            setChallengesCount={setChallengesCount}
            startGame={startGame}
          />
        ) : gameState === "setupMap" ? (
          <SetupMapScreen
            countries={countries}
            countriesLimit={countriesLimit}
            challengesCount={challengesCount}
            mapPosition={mapPosition}
            setMapPosition={setMapPosition}
            randomizeMap={randomizeMap}
            confirmMap={confirmMap}
            handleCountryClick={handleCountryClick}
          />
        ) : gameState === "setupChallenges" ? (
          <SetupChallengesScreen
            countries={countries}
            challengesCount={challengesCount}
            mapPosition={mapPosition}
            setMapPosition={setMapPosition}
            confirmChallenges={confirmChallenges}
            handleCountryClick={handleCountryClick}
          />
        ) : gameState === "setupCapitals" ? (
          <SetupCapitalsScreen
            turn={turn}
            team1Name={team1Name}
            team2Name={team2Name}
            countries={countries}
            capitals={capitals}
            protectedCountries={protectedCountries}
            mapPosition={mapPosition}
            setMapPosition={setMapPosition}
            handleCountryClick={handleCountryClick}
          />
        ) : gameState === "playing" ? (
          <PlayingScreen
            turn={turn}
            setTurn={setTurn}
            team1Name={team1Name}
            team2Name={team2Name}
            score1={score1}
            score2={score2}
            adjustScore={adjustScore}
            cards1={cards1}
            cards2={cards2}
            setQuickProtectTeam={setQuickProtectTeam}
            handleSpyAction={handleSpyAction}
            handleNukeAction={handleNukeAction}
            setSelectedCountry={setSelectedCountry}
            setTeam1Choice={setTeam1Choice}
            setTeam2Choice={setTeam2Choice}
            setShowResult={setShowResult}
            setIsAttacking={setIsAttacking}
            setIsQuestionRevealed={setIsQuestionRevealed}
            setForcedWinner={setForcedWinner}
            setSpiedCountryId={setSpiedCountryId}
            mapPosition={mapPosition}
            setMapPosition={setMapPosition}
            countries={countries}
            spiedCountryId={spiedCountryId}
            protectedCountries={protectedCountries}
            capitals={capitals}
            handleCountryClick={handleCountryClick}
          />
        ) : (
          <GameOverScreen
            startGame={startGame}
            team1Name={team1Name}
            team2Name={team2Name}
            score1={score1}
            score2={score2}
          />
        )}
      </div>

      {/* نافذة السؤال وأدوات الحكم (تم فصلها) */}
      {selectedCountry && gameState === "playing" && (
        <QuestionModal
          selectedCountry={selectedCountry}
          capitals={capitals}
          team1Name={team1Name}
          team2Name={team2Name}
          turn={turn}
          isAttacking={isAttacking}
          isQuestionRevealed={isQuestionRevealed}
          setIsQuestionRevealed={setIsQuestionRevealed}
          team1Choice={team1Choice}
          team2Choice={team2Choice}
          setTeam1Choice={setTeam1Choice}
          setTeam2Choice={setTeam2Choice}
          showResult={showResult}
          setShowResult={setShowResult}
          timer={timer}
          isTimerRunning={isTimerRunning}
          setIsTimerRunning={setIsTimerRunning}
          forcedWinner={forcedWinner}
          setForcedWinner={setForcedWinner}
          cards1={cards1}
          cards2={cards2}
          setCards1={setCards1}
          setCards2={setCards2}
          protectedCountries={protectedCountries}
          setProtectedCountries={setProtectedCountries}
          setChallengesUsed1={setChallengesUsed1}
          setChallengesUsed2={setChallengesUsed2}
          handleConfirmAnswers={handleConfirmAnswers}
          handleCapture={handleCapture}
          handleMiss={handleMiss}
          handleRefereeChangeQuestion={handleRefereeChangeQuestion}
          handleManualFree={handleManualFree}
          handleChangeQuestion={handleChangeQuestion}
          useCaptureCard={useCaptureCard}
          useAirStrike={useAirStrike}
          useProtectCard={useProtectCard}
          closeModal={() => {
            setSelectedCountry(null);
            setTeam1Choice(null);
            setTeam2Choice(null);
            setShowResult(false);
            setIsAttacking(false);
            setIsQuestionRevealed(false);
            setForcedWinner(null);
          }}
        />
      )}

      <AudienceModal
        showAudienceModal={showAudienceModal}
        setShowAudienceModal={setShowAudienceModal}
        roomCode={roomCode}
        audienceUrl={audienceUrl}
        showAlert={showAlert}
      />

      {/* نافذة التنبيهات العصرية 3D */}
      <GameDialog dialog={dialog} closeDialog={closeDialog} />
    </main>
  );
}