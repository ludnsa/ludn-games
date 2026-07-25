export function useWDCardsActions(ctx: any) {
  const handleNukeAction = (teamId: 1 | 2) => {
    const currentCards = teamId === 1 ? ctx.cards1 : ctx.cards2;
    if ((currentCards.nuke ?? 1) <= 0) {
      ctx.showAlert("لقد استخدمتم البطاقة النووية مسبقاً! (تستخدم لمرة واحدة فقط)");
      return;
    }

    const attackerScore = teamId === 1 ? ctx.score1 : ctx.score2;
    const defenderScore = teamId === 1 ? ctx.score2 : ctx.score1;

    if (attackerScore >= defenderScore) {
      ctx.showAlert("نقاطكم أعلى من الخصم ولا يمكنكم استخدام النووي");
      return;
    }

    if (attackerScore <= 5000 || attackerScore >= 10000) {
      ctx.showAlert("يجب أن تكون نقاطكم أكبر من 5000 وأقل من 10000 لاستخدام النووي!");
      return;
    }

    if (defenderScore < attackerScore * 2) {
      ctx.showAlert("نقاط الخصم يجب أن تكون ضعف نقاطكم أو أكثر لتتمكنوا من استخدام النووي!");
      return;
    }

    ctx.showConfirm(
      `سيتم إطلاق النووي على الخصم وخصم 25% من نقاطه العامة! هل أنت متأكد؟`,
      () => {
        if (teamId === 1) ctx.setCards1((p: any) => ({ ...p, nuke: (p.nuke ?? 1) - 1 }));
        else ctx.setCards2((p: any) => ({ ...p, nuke: (p.nuke ?? 1) - 1 }));

        const deduction = Math.floor(defenderScore * 0.25);
        
        if (teamId === 1) {
          ctx.setScore2((s: number) => Math.max(0, s - deduction));
        } else {
          ctx.setScore1((s: number) => Math.max(0, s - deduction));
        }

        ctx.showAlert(`☢️ تم إطلاق النووي بنجاح! تم خصم ${deduction} نقطة من الخصم.`);
      }
    );
  };

  const handleSpyAction = (teamId: 1 | 2) => {
    const currentCards = teamId === 1 ? ctx.cards1 : ctx.cards2;
    if (currentCards.spy <= 0) {
      ctx.showAlert("لقد استنفذ الفريق جميع بطاقات التجسس!");
      return;
    }

    const hidden2000Countries = ctx.countries.filter(
      (c: any) => c.value === 2000 && c.owner === null && !c.isChallenge
    );

    if (hidden2000Countries.length === 0) {
      ctx.showAlert("لا يوجد دولة متاحة");
      return;
    }

    const randomCountry =
      hidden2000Countries[Math.floor(Math.random() * hidden2000Countries.length)];

    ctx.showConfirm(
      `سيتم تفعيل التجسس لفريق ${teamId === 1 ? ctx.team1Name : ctx.team2Name} وكشف دولة 2000 وإجباره على الهجوم عليها. متأكد؟`,
      () => {
        if (teamId === 1) ctx.setCards1((p: any) => ({ ...p, spy: p.spy - 1 }));
        else ctx.setCards2((p: any) => ({ ...p, spy: p.spy - 1 }));

        ctx.setSpiedCountryId(randomCountry.id);
        ctx.showAlert(
          `🕵️ تمت العملية بنجاح!\nالدولة المكتشفة هي "${randomCountry.name}" (تلوّنت باللون البرتقالي). يرجى من الحكم النقر عليها من الخريطة لفتح السؤال.`
        );
      }
    );
  };

  const useCaptureCard = () => {
    if (!ctx.selectedCountry) return;
    const currentCards = ctx.turn === 1 ? ctx.cards1 : ctx.cards2;
    const isOpponentCapital =
      ctx.selectedCountry.id === (ctx.turn === 1 ? ctx.capitals.team2 : ctx.capitals.team1);

    if (isOpponentCapital) {
      if (ctx.selectedCountry.isStolen) {
        ctx.showAlert("لقد تم غزو هذه العاصمة واستحلالها مسبقاً! لا يمكنكم الهجوم عليها أو استردادها.");
        return;
      }
      if (currentCards.capitalCapture <= 0) {
        ctx.showAlert("لقد استنفذ الفريق جميع بطاقات غزو العاصمة!");
        return;
      }
      const attackerScore = ctx.turn === 1 ? ctx.score1 : ctx.score2;
      const defenderScore = ctx.turn === 1 ? ctx.score2 : ctx.score1;
      if (attackerScore <= 5000 || defenderScore <= 10000) {
        ctx.showAlert("يجب أن تكون نقاط فريقكم أكثر من 5000 ونقاط الخصم أكثر من 10000 نقطة للتمكن من الهجوم على العاصمة.");
        return;
      }
    } else {
      if (currentCards.capture <= 0) {
        ctx.showAlert("لقد استنفذ الفريق جميع بطاقات الاستحلال (الدبابة)!");
        return;
      }
    }

    ctx.showConfirm(
      `سيتم خصم بطاقة ${isOpponentCapital ? "غزو العاصمة" : "استحلال"} وبدء الهجوم الأبدي، هل أنت متأكد؟`,
      () => {
        if (ctx.turn === 1) {
          if (isOpponentCapital)
            ctx.setCards1((prev: any) => ({
              ...prev,
              capitalCapture: prev.capitalCapture - 1,
            }));
          else ctx.setCards1((prev: any) => ({ ...prev, capture: prev.capture - 1 }));
        } else {
          if (isOpponentCapital)
            ctx.setCards2((prev: any) => ({
              ...prev,
              capitalCapture: prev.capitalCapture - 1,
            }));
          else ctx.setCards2((prev: any) => ({ ...prev, capture: prev.capture - 1 }));
        }

        const updatedCountries = ctx.countries.map((c: any) => {
          if (c.id === ctx.selectedCountry.id) {
            return { ...c, owner: null, lastOwner: c.owner };
          }
          return c;
        });

        ctx.setCountries(updatedCountries);
        ctx.setIsAttacking(true);
        ctx.setIsQuestionRevealed(true);

        let activeQ = ctx.selectedCountry.activeQuestion;
        if (!ctx.selectedCountry.isChallenge) {
          activeQ =
            ctx.selectedCountry.questions?.[
              Math.floor(Math.random() * ctx.selectedCountry.questions.length)
            ];
        }
        ctx.setSelectedCountry({
          ...ctx.selectedCountry,
          owner: null,
          lastOwner: ctx.selectedCountry.owner,
          activeQuestion: activeQ,
        });
      }
    );
  };

  const useAirStrike = () => {
    if (!ctx.selectedCountry) return;
    const currentCards = ctx.turn === 1 ? ctx.cards1 : ctx.cards2;
    const isOpponentCapital =
      ctx.selectedCountry.id === (ctx.turn === 1 ? ctx.capitals.team2 : ctx.capitals.team1);

    if (currentCards.airStrike <= 0) {
      ctx.showAlert("لقد استنفذ الفريق جميع بطاقات القصف (صاروخ)!");
      return;
    }

    if (isOpponentCapital) {
      ctx.showAlert(
        "ممنوع! لا يمكن قصف العاصمة بالصواريخ. يجب الهجوم عليها بالمواجهة المباشرة (غزو العاصمة) وفقط إذا كانت نقاطكم أكثر من 5000 ونقاط الخصم أكثر من 10000."
      );
      return;
    }

    const isProtected = ctx.protectedCountries[ctx.selectedCountry.id];

    if (isProtected) {
      ctx.showConfirm(
        "هذه الدولة محمية! القصف سيكسر درع الحماية فقط دون خصم نقاط الدولة أو رصيد المدافع. هل أنت متأكد؟",
        () => {
          if (ctx.turn === 1) {
            ctx.setCards1((prev: any) => ({ ...prev, airStrike: prev.airStrike - 1 }));
          } else {
            ctx.setCards2((prev: any) => ({ ...prev, airStrike: prev.airStrike - 1 }));
          }

          ctx.setProtectedCountries((prev: any) => {
            const next = { ...prev };
            delete next[ctx.selectedCountry.id];
            return next;
          });

          ctx.setSelectedCountry(null);
          ctx.setIsQuestionRevealed(false);
          ctx.setIsAttacking(false);
          ctx.setTeam1Choice(null);
          ctx.setTeam2Choice(null);
          ctx.setShowResult(false);
        }
      );
    } else {
      ctx.showConfirm(
        `القصف المدمر! سيتم خصم بطاقة قصف، وسيتم خصم نصف قيمة الدولة (${Math.floor(
          ctx.selectedCountry.value / 2
        )}) من رصيد المدافع ومن قيمة الدولة نفسها، ولن تتحرر الدولة. هل أنت متأكد؟`,
        () => {
          if (ctx.turn === 1) {
            ctx.setCards1((prev: any) => ({ ...prev, airStrike: prev.airStrike - 1 }));
          } else {
            ctx.setCards2((prev: any) => ({ ...prev, airStrike: prev.airStrike - 1 }));
          }

          const penalty = Math.floor(ctx.selectedCountry.value / 2);
          if (ctx.selectedCountry.owner === 1)
            ctx.setScore1((s: number) => Math.max(0, s - penalty));
          if (ctx.selectedCountry.owner === 2)
            ctx.setScore2((s: number) => Math.max(0, s - penalty));

          const updatedCountries = ctx.countries.map((c: any) => {
            if (c.id === ctx.selectedCountry.id) {
              return { ...c, value: Math.max(0, c.value - penalty) };
            }
            return c;
          });

          ctx.setCountries(updatedCountries);
          ctx.setSelectedCountry(null);
          ctx.setIsQuestionRevealed(false);
          ctx.setIsAttacking(false);
          ctx.setTeam1Choice(null);
          ctx.setTeam2Choice(null);
          ctx.setShowResult(false);
        }
      );
    }
  };

  const useProtectCard = () => {
    if (!ctx.selectedCountry) return;
    const currentCards = ctx.turn === 1 ? ctx.cards1 : ctx.cards2;
    if (currentCards.protect <= 0) {
      ctx.showAlert("انتهت بطاقات الحماية (الدرع)!");
      return;
    }

    const isOwnCapital = ctx.selectedCountry.id === (ctx.turn === 1 ? ctx.capitals.team1 : ctx.capitals.team2);
    const isOpponentCapital = ctx.selectedCountry.id === (ctx.turn === 1 ? ctx.capitals.team2 : ctx.capitals.team1);

    if (isOwnCapital || isOpponentCapital) {
      ctx.showAlert("لا يمكن استخدام بطاقة الحماية على العاصمة!");
      return;
    }

    if (ctx.turn === 1)
      ctx.setCards1((prev: any) => ({ ...prev, protect: prev.protect - 1 }));
    else ctx.setCards2((prev: any) => ({ ...prev, protect: prev.protect - 1 }));

    ctx.setProtectedCountries((prev: any) => ({
      ...prev,
      [ctx.selectedCountry.id]: true,
    }));
    ctx.showAlert("تم تفعيل الحماية! الدولة أصبحت محصنة ضد الدبابات (لكنها لا تزال معرضة للقصف).");
    if (!ctx.showResult) ctx.setSelectedCountry(null);
  };

  return { handleNukeAction, handleSpyAction, useCaptureCard, useAirStrike, useProtectCard };
}
