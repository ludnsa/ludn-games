export function useWDMapActions(ctx: any) {
  const handleGoBack = () => {
    window.history.back();
  };

  const handleGoHome = () => {
    ctx.showConfirm("هل أنت متأكد من العودة للرئيسية؟ سيتم تصفير هذه اللعبة ولن تتمكن من إكمالها.", async () => {
      // تصفير قبل ثالث سؤال: التجربة ترجع
      await ctx.endSession();
      localStorage.removeItem("wd_live_sync");
      window.location.href = "/";
    });
  };

  const handleCountryClick = async (geoId: string) => {
    const country = ctx.countries.find((c: any) => c.geoId === geoId);
    if (!country) return;

    if (ctx.gameState === "playing") {
      if (ctx.isAttacking || ctx.isQuestionRevealed) return;
      if (ctx.spiedCountryId && country.id !== ctx.spiedCountryId) {
        ctx.showAlert("يجب عليك النقر على الدولة المكتشفة (المميزة باللون البرتقالي) أولاً!");
        return;
      }
      if (country.owner === ctx.turn) {
        ctx.showAlert("هذه الدولة تابعة لفريقكم بالفعل!");
        return;
      }

      // شرط دول الحكم (دولة التحدي): يجب الانتهاء من جميع الدول الرئيسية أولاً
      if (country.isChallenge) {
        const hasUnownedMainCountries = ctx.countries.some(
          (c: any) => c.isActive && !c.isChallenge && !c.owner
        );
        if (hasUnownedMainCountries) {
          ctx.showAlert("يجب الإنتهاء من جميع الدول الأساسية أولاً قبل التمكن من اختيار دول الحكم!");
          return;
        }
      }
    }

    if (ctx.gameState === "setupMap") {
      const needed = ctx.countriesLimit + ctx.challengesCount + 2;
      const maxAvailable = Math.min(needed, ctx.countries.length);
      const activeCount = ctx.countries.filter((c: any) => c.isActive).length;

      if (!country.isActive && activeCount >= maxAvailable) {
        ctx.showAlert(
          `لقد وصلت للحد الأقصى (${maxAvailable} دولة). ألغِ تفعيل دولة أخرى أولاً.`
        );
        return;
      }

      ctx.setCountries((prev: any[]) =>
        prev.map((c) =>
          c.id === country.id ? { ...c, isActive: !c.isActive } : c
        )
      );
      return;
    }

    if (ctx.gameState === "setupChallenges") {
      const isCurrentlyChallenge = country.isChallenge;
      const currentChallengeCount = ctx.countries.filter(
        (c: any) => c.isChallenge
      ).length;

      if (!isCurrentlyChallenge && currentChallengeCount >= ctx.challengesCount) {
        ctx.showAlert(`لقد قمت بتحديد ${ctx.challengesCount} دول للتحدي بالفعل.`);
        return;
      }

      ctx.setCountries((prev: any[]) =>
        prev.map((c) => {
          if (c.id === country.id) {
            if (c.isChallenge) {
              return { ...c, isChallenge: false, value: c.originalValue };
            } else {
              return {
                ...c,
                isChallenge: true,
                value: 2000,
                originalValue: 2000,
              };
            }
          }
          return c;
        })
      );
      return;
    }

    if (ctx.gameState === "setupCapitals") {
      if (country.isChallenge) {
        ctx.showAlert("لا يمكن تعيين دولة تحدي كعاصمة! الرجاء اختيار دولة أساسية.");
        return;
      }
      if (ctx.turn === 1) {
        ctx.setCapitals((prev: any) => ({ ...prev, team1: country.id }));
        ctx.setCountries((prev: any[]) =>
          prev.map((c) =>
            c.id === country.id
              ? {
                ...c,
                owner: 1,
                wasOwnedBefore: true,
                value: 0,
                originalValue: 0,
              }
              : c
          )
        );
        ctx.setTurn(2);
      } else {
        if (country.id === ctx.capitals.team1) {
          ctx.showAlert("تم اختيار هذه الدولة كعاصمة للفريق الأول! اختر دولة أخرى.");
          return;
        }
        // الحجز هنا: الخريطة والعواصم خلصت، واللعب الفعلي يبدأ. لو ما انحجزت اللعبة ما تبدأ
        if (!(await ctx.beginSession())) return;
        ctx.setCapitals((prev: any) => ({ ...prev, team2: country.id }));

        ctx.setCountries((prev: any[]) => {
          let updated = prev.map((c) =>
            c.id === country.id
              ? {
                ...c,
                owner: 2 as const,
                wasOwnedBefore: true,
                value: 0,
                originalValue: 0,
              }
              : c
          );

          let normalFree = updated.filter(
            (c) =>
              !c.isChallenge && c.id !== ctx.capitals.team1 && c.id !== country.id
          );
          const shuffledNormal = [...normalFree].sort(
            () => 0.5 - Math.random()
          );

          const target2000Count = (ctx.countriesLimit / 10) * 2 + 2;
          const num2000 = Math.min(target2000Count, shuffledNormal.length);
          const upgradedIds = shuffledNormal.slice(0, num2000).map((c) => c.id);

          return updated.map((c) =>
            upgradedIds.includes(c.id)
              ? { ...c, value: 2000, originalValue: 2000 }
              : c
          );
        });

        ctx.setGameState("playing");
        ctx.setTurn(1);
      }
      return;
    }

    const isOwnCapital =
      country.id === (ctx.turn === 1 ? ctx.capitals.team1 : ctx.capitals.team2);
    if (isOwnCapital) {
      ctx.showAlert("لقد تم غزو هذه العاصمة واحتلالها مسبقاً! لا يمكنكم الهجوم عليها أو استردادها 👑\n");
      return;
    }

    let activeQ = country.activeQuestion;

    if (!country.isChallenge && !activeQ && country.questions?.length > 0) {
      activeQ =
        country.questions[Math.floor(Math.random() * country.questions.length)];
    }

    ctx.setSelectedCountry({ ...country, activeQuestion: activeQ });
    ctx.setTimer(25);
    ctx.setTeam1Choice(null);
    ctx.setTeam2Choice(null);
    ctx.setShowResult(false);
    ctx.setIsTimerRunning(false);

    ctx.setIsAttacking(false);

    ctx.setIsQuestionRevealed(true);
    ctx.setForcedWinner(null);
  };

  return { handleGoBack, handleGoHome, handleCountryClick };
}
