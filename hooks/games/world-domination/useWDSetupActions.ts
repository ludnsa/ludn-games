export function useWDSetupActions(ctx: any) {
  const startGame = async () => {
    if (!ctx.userId) {
      ctx.showAlert("يجب تسجيل الدخول لبدء اللعبة.");
      return;
    }

    if (ctx.dbCountries.length === 0) {
      ctx.showAlert("الرجاء إضافة دول من لوحة تحكم الآدمن أولاً!");
      return;
    }

    // Gatekeeper Check
    const access = await ctx.checkAccess("world-domination", ctx.userId);
    if (!access.allowed) {
      ctx.showConfirm("رصيدك غير كافٍ. هل ترغب في شراء باقة للاستمرار باللعب؟", () => {
        ctx.router.push("/packages");
      });
      return;
    }

    const actualChallengeCount = Math.min(
      ctx.challengesCount,
      ctx.dbWdChallenges.length
    );
    let needed = ctx.countriesLimit + actualChallengeCount + 2;

    if (needed > ctx.dbCountries.length) {
      needed = ctx.dbCountries.length;
      ctx.showAlert(
        `تنبيه: عدد الدول في البنك (${ctx.dbCountries.length}) أقل من المطلوب. سيتم استخدام جميع الدول المتاحة.`
      );
    }

    ctx.setChallengesCount(actualChallengeCount);

    const allMapped = ctx.dbCountries.map((c: any) => ({
      ...c,
      owner: null,
      lastOwner: null,
      wasOwnedBefore: false,
      forbiddenFor: [],
      isStolen: false,
      isChallenge: false,
      value: 1000,
      originalValue: 1000,
      activeQuestion: null,
      isActive: false,
    }));

    const shuffled = [...allMapped].sort(() => 0.5 - Math.random());
    for (let i = 0; i < needed; i++) {
      shuffled[i].isActive = true;
    }

    ctx.setScore1(200);
    ctx.setScore2(200);
    ctx.setTurn(1);
    ctx.setChallengesUsed1(0);
    ctx.setChallengesUsed2(0);
    ctx.setCards1({ capture: 3, protect: 5, airStrike: 3, capitalCapture: 2, spy: 2 });
    ctx.setCards2({ capture: 3, protect: 5, airStrike: 3, capitalCapture: 2, spy: 2 });
    ctx.setProtectedCountries({});
    ctx.setSpiedCountryId(null);
    ctx.setIsAttacking(false);
    ctx.setIsQuestionRevealed(false);
    ctx.setForcedWinner(null);
    ctx.setCountries(shuffled);
    ctx.setCapitals({ team1: null, team2: null });
    ctx.setMapPosition({ center: [0, 0], zoom: 1, name: "العالم" });
    ctx.setStolenCapitalAlert(null);
    ctx.setSpiedCountryId(null);

    localStorage.removeItem("wd_live_sync");
    
    // Consume Token or Free Trial
    await ctx.consumeGameSession("world-domination", ctx.userId, access.reason);
    
    ctx.setGameState("setupMap");
  };

  const randomizeMap = () => {
    const needed = ctx.countriesLimit + ctx.challengesCount + 2;
    const maxAvailable = Math.min(needed, ctx.countries.length);

    ctx.setCountries((prev: any[]) => {
      const reset = prev.map((c) => ({ ...c, isActive: false }));
      const shuffled = [...reset].sort(() => 0.5 - Math.random());
      for (let i = 0; i < maxAvailable; i++) {
        shuffled[i].isActive = true;
      }
      return shuffled;
    });
  };

  const confirmMap = () => {
    const active = ctx.countries.filter((c: any) => c.isActive);
    const needed = ctx.countriesLimit + ctx.challengesCount + 2;
    const maxAvailable = Math.min(needed, ctx.countries.length);

    if (active.length !== maxAvailable) {
      ctx.showAlert(
        `يجب تفعيل ${maxAvailable} دولة بالضبط! المفعّل حالياً: ${active.length}`
      );
      return;
    }

    const shuffledActive = [...active].sort(() => 0.5 - Math.random());
    ctx.setCountries(shuffledActive);

    if (ctx.challengesCount > 0) {
      ctx.setGameState("setupChallenges");
    } else {
      ctx.setGameState("setupCapitals");
    }
  };

  const confirmChallenges = () => {
    const currentChallengeCount = ctx.countries.filter((c: any) => c.isChallenge).length;
    if (currentChallengeCount < ctx.challengesCount) {
      ctx.showAlert(`الرجاء تحديد ${ctx.challengesCount} دول لتحدي الحكم قبل المتابعة.`);
      return;
    }

    const shuffledChallenges = [...ctx.dbWdChallenges].sort(
      () => 0.5 - Math.random()
    );
    let chIdx = 0;

    const finalCountries = ctx.countries.map((c: any) => {
      if (c.isChallenge) {
        return {
          ...c,
          activeQuestion: {
            q: shuffledChallenges[chIdx++] || "تحدي حكم (غير مسجل)",
            options: [],
            a: "",
          },
        };
      }
      return c;
    });

    ctx.setCountries(finalCountries);
    ctx.setGameState("setupCapitals");
    ctx.setTurn(1);
  };

  return { startGame, randomizeMap, confirmMap, confirmChallenges };
}
