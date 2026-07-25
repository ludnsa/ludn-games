import React from "react";

export function useWDCombatActions(ctx: any) {
  const endTurn = () => {
    ctx.setSelectedCountry(null);
    ctx.setTeam1Choice(null);
    ctx.setTeam2Choice(null);
    ctx.setShowResult(false);
    ctx.setIsAttacking(false);
    ctx.setIsQuestionRevealed(false);
    ctx.setForcedWinner(null);
    ctx.setSpiedCountryId(null);
    ctx.setTurn((t: number) => (t === 1 ? 2 : 1));
  };

  const checkGameOver = (currentCountries: any[]) => {
    if (currentCountries.filter((c: any) => c.owner === null).length === 0) {
      setTimeout(() => ctx.setGameState("gameOver"), 1500);
    }
  };

  const handleForceEndGame = () => {
    ctx.showConfirm(
      "هل أنت متأكد من رغبتك في إنهاء اللعبة وتصفيرها بالكامل؟ سيتم مسح جميع البيانات.",
      () => {
        localStorage.removeItem("wd_live_sync");
        window.location.reload();
      }
    );
  };

  const handleChangeQuestion = () => {
    if (!ctx.selectedCountry || ctx.selectedCountry.isChallenge) return;

    const currentScore = ctx.turn === 1 ? ctx.score1 : ctx.score2;
    if (currentScore < 1000) {
      ctx.showAlert("رصيد الفريق غير كافٍ (مطلوب 1000 نقطة) لتغيير السؤال!");
      return;
    }

    const availableQs =
      ctx.selectedCountry.questions?.filter(
        (q: any) => q.q !== ctx.selectedCountry.activeQuestion?.q
      ) || [];
    if (availableQs.length === 0) {
      ctx.showAlert("ما فيه أسئلة إضافية مسجلة لهذي الدولة!");
      return;
    }

    ctx.showConfirm("سيتم خصم 1000 نقطة لتغيير السؤال، هل أنت متأكد؟", () => {
      if (ctx.turn === 1) ctx.setScore1((s: number) => s - 1000);
      else ctx.setScore2((s: number) => s - 1000);

      const newQ = availableQs[Math.floor(Math.random() * availableQs.length)];
      ctx.setSelectedCountry({ ...ctx.selectedCountry, activeQuestion: newQ });
      ctx.setTeam1Choice(null);
      ctx.setTeam2Choice(null);
      ctx.setShowResult(false);
      ctx.setTimer(20);
      ctx.setIsTimerRunning(false);
      ctx.setIsQuestionRevealed(false);
      ctx.setForcedWinner(null);
    });
  };

  const handleRefereeChangeQuestion = () => {
    if (!ctx.selectedCountry) return;

    if (ctx.selectedCountry.isChallenge) {
      const availableChallenges = ctx.dbWdChallenges.filter(
        (ch: any) => ch !== ctx.selectedCountry.activeQuestion?.q
      );
      if (availableChallenges.length === 0) {
        ctx.showAlert("لا توجد تحديات إضافية مسجلة في البنك!");
        return;
      }
      const newChallenge =
        availableChallenges[
          Math.floor(Math.random() * availableChallenges.length)
        ];
      ctx.setSelectedCountry({
        ...ctx.selectedCountry,
        activeQuestion: { q: newChallenge, options: [], a: "" },
      });
    } else {
      const availableQs =
        ctx.selectedCountry.questions?.filter(
          (q: any) => q.q !== ctx.selectedCountry.activeQuestion?.q
        ) || [];
      if (availableQs.length === 0) {
        ctx.showAlert("لا توجد أسئلة إضافية مسجلة لهذه الدولة!");
        return;
      }
      const newQ = availableQs[Math.floor(Math.random() * availableQs.length)];
      ctx.setSelectedCountry({ ...ctx.selectedCountry, activeQuestion: newQ });
    }

    ctx.setTeam1Choice(null);
    ctx.setTeam2Choice(null);
    ctx.setShowResult(false);
    ctx.setTimer(20);
    ctx.setIsTimerRunning(false);
    ctx.setIsQuestionRevealed(false);
    ctx.setForcedWinner(null);
  };

  const handleManualFree = () => {
    ctx.showConfirm(`هل أنت متأكد من سحب هذه الدولة وجعلها حرة للجميع؟`, () => {
      const updated = ctx.countries.map((c: any) => {
        if (ctx.selectedCountry && c.id === ctx.selectedCountry.id) {
          if (c.owner === 1) ctx.setScore1((s: number) => Math.max(0, s - c.value));
          if (c.owner === 2) ctx.setScore2((s: number) => Math.max(0, s - c.value));
          return {
            ...c,
            owner: null,
            lastOwner: null,
            wasOwnedBefore: false,
            forbiddenFor: [],
            isStolen: false,
          };
        }
        return c;
      });
      ctx.setCountries(updated);
      ctx.setSelectedCountry(null);
      ctx.setTeam1Choice(null);
      ctx.setTeam2Choice(null);
      ctx.setShowResult(false);
      ctx.setIsAttacking(false);
      ctx.setIsQuestionRevealed(false);
      ctx.setForcedWinner(null);
    });
  };

  const handleConfirmAnswers = (bypassValidation = false) => {
    if (ctx.selectedCountry.isChallenge) {
      if (ctx.turn === 1) ctx.setChallengesUsed1((prev: number) => prev + 1);
      else ctx.setChallengesUsed2((prev: number) => prev + 1);
    }

    if (bypassValidation !== true) {
      if (ctx.isAttacking) {
        const attackerChoice = ctx.turn === 1 ? ctx.team1Choice : ctx.team2Choice;
        if (!attackerChoice) {
          ctx.showAlert("لازم تختار إجابة الفريق المهاجم أولاً!");
          return;
        }
      } else {
        const activeTeamChoice = ctx.turn === 1 ? ctx.team1Choice : ctx.team2Choice;
        if (!activeTeamChoice) {
          ctx.showAlert("لازم تختار إجابة الفريق أولاً!");
          return;
        }
      }
    }

    ctx.setShowResult(true);
    ctx.setIsTimerRunning(false);
  };

  const handleCapture = (winner: 1 | 2, isForced: boolean = false) => {
    if (!ctx.selectedCountry) return;

    let finalScore1 = ctx.score1;
    let finalScore2 = ctx.score2;

    const isOpponentCapital =
      ctx.selectedCountry.id === (winner === 1 ? ctx.capitals.team2 : ctx.capitals.team1);
    const victim =
      ctx.selectedCountry.owner !== null
        ? ctx.selectedCountry.owner
        : ctx.selectedCountry.lastOwner;

    if (ctx.isAttacking || (isForced && victim !== null && victim !== winner)) {
      if (!isOpponentCapital) {
        if (victim === 1)
          finalScore1 = Math.max(0, finalScore1 - ctx.selectedCountry.value);
        if (victim === 2)
          finalScore2 = Math.max(0, finalScore2 - ctx.selectedCountry.value);
      }
    }

    let capitalStolen = false;
    let stealAmount = 0;

    if (isOpponentCapital) {
      capitalStolen = true;
      const defenderScore = winner === 1 ? finalScore2 : finalScore1;
      stealAmount = Math.floor(defenderScore / 3);
      const defenseLoss = Math.floor(defenderScore / 4);

      if (winner === 1) {
        finalScore1 += stealAmount;
        finalScore2 = Math.max(0, finalScore2 - defenseLoss);
      } else {
        finalScore2 += stealAmount;
        finalScore1 = Math.max(0, finalScore1 - defenseLoss);
      }
    } else {
      if (winner === 1) finalScore1 += ctx.selectedCountry.value;
      else finalScore2 += ctx.selectedCountry.value;
    }

    const updated = ctx.countries.map((c: any) => {
      if (c.id === ctx.selectedCountry.id) {
        let newForbiddenFor = [...(c.forbiddenFor || [])];
        if (
          victim !== null &&
          victim !== winner &&
          !newForbiddenFor.includes(victim)
        ) {
          newForbiddenFor.push(victim);
        }

        const stolen =
          ctx.isAttacking ||
          (c.owner !== null && c.owner !== winner) ||
          (c.lastOwner !== null && c.lastOwner !== winner);

        return {
          ...c,
          owner: winner,
          lastOwner: null,
          wasOwnedBefore: true,
          forbiddenFor: newForbiddenFor,
          isStolen: stolen ? true : c.isStolen,
        };
      }
      return c;
    });

    ctx.setCountries(updated);
    ctx.setScore1(finalScore1);
    ctx.setScore2(finalScore2);

    if (capitalStolen) {
      ctx.setStolenCapitalAlert({
        winner,
        loser: winner === 1 ? 2 : 1,
        points: stealAmount,
        countryName: ctx.selectedCountry.name,
      });
    }

    checkGameOver(updated);
    endTurn();
  };

  const handleMiss = () => {
    let finalScore1 = ctx.score1;
    let finalScore2 = ctx.score2;
    const isOpponentCapital =
      ctx.selectedCountry.id === (ctx.turn === 1 ? ctx.capitals.team2 : ctx.capitals.team1);

    if (ctx.isAttacking) {
      if (isOpponentCapital) {
        ctx.showAlert(
          <div className="flex items-center justify-center gap-2">
            <span>فشل السيطرة على عاصمة العدو</span>
            <span className="text-rose-600 text-2xl drop-shadow-md">☠️</span>
          </div>
        );
      } else {
        ctx.showAlert(
          `إجابة خاطئة! فشل الاستحلال، ولم يتم خصم أي نقاط من المدافع.`
        );
      }
    }

    ctx.setScore1(finalScore1);
    ctx.setScore2(finalScore2);

    const updated = ctx.countries.map((c: any) => {
      if (c.id === ctx.selectedCountry.id) {
        let restoredOwner = c.owner;
        if (ctx.isAttacking) {
          restoredOwner = c.lastOwner;
        }
        let newForbiddenFor = [...(c.forbiddenFor || [])];
        if (
          c.lastOwner !== null &&
          c.lastOwner !== undefined &&
          !newForbiddenFor.includes(c.lastOwner)
        ) {
          newForbiddenFor.push(c.lastOwner);
        }
        return {
          ...c,
          owner: restoredOwner,
          lastOwner: c.lastOwner,
          forbiddenFor: newForbiddenFor,
        };
      }
      return c;
    });
    ctx.setCountries(updated);
    checkGameOver(updated);
    endTurn();
  };

  return {
    handleChangeQuestion,
    handleRefereeChangeQuestion,
    handleManualFree,
    handleConfirmAnswers,
    handleCapture,
    handleMiss,
    endTurn,
    handleForceEndGame
  };
}
