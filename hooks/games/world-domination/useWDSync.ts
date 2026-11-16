import { useEffect } from "react";
import { useDebounceCallback } from "@/lib/game/debounce";
import { serverNow } from "@/lib/game/server-clock";

export function useWDSync(ctx: any) {
  const debouncedSyncToSupabase = useDebounceCallback(async (payload: any) => {
    try {
      const { error } = await ctx.supabase.from("wd_rooms").upsert(payload);
      // ملف القاعدة 0017 ما انشغّل (العمود مو موجود): نكتب بدونه عشان شاشة الجمهور ما تتعطل
      if (error && String(error.message).includes("timer_ends_at")) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { timer_ends_at, ...withoutEnd } = payload;
        await ctx.supabase.from("wd_rooms").upsert(withoutEnd);
      }
    } catch (e) {
      console.error("خطأ في المزامنة اللحظية:", e);
    }
  }, 100);

  // المؤقت: وقت الانتهاء ينكتب مرة وحدة مع البداية (والوقفة)، وشاشة الجمهور تعد منه.
  // دقاته ما تنكتب ولا تنبث كل ثانية. وهو واقف، أي تغيير بالرقم (تصفير لـ 25 أو 20) ينكتب عادي
  const timerWhenStopped = ctx.isTimerRunning ? null : ctx.timer;
  const timerEndsAt: number | null = ctx.timerEndsAt ?? null;

  useEffect(() => {
    if (!ctx.isInitialized || !ctx.roomCode) return;

    const cleanCountries = ctx.countries ? ctx.countries.map(({ questions, ...rest }: any) => rest) : [];
    // وهو شغال: الباقي وقت الكتابة (للحفظ بس — العد من وقت الانتهاء)
    const timerNow = timerEndsAt === null ? ctx.timer : Math.max(0, Math.ceil((timerEndsAt - serverNow()) / 1000));

    const localSyncData = {
      roomCode: ctx.roomCode, spiedCountryId: ctx.spiedCountryId,
      gameState: ctx.gameState, team1Name: ctx.team1Name, team2Name: ctx.team2Name, score1: ctx.score1, score2: ctx.score2, turn: ctx.turn, countries: ctx.countries,
      selectedCountry: ctx.isAttacking && !ctx.selectedCountry?.activeQuestion ? null : ctx.selectedCountry,
      timer: timerNow, timerEndsAt, team1Choice: ctx.team1Choice, team2Choice: ctx.team2Choice, showResult: ctx.showResult, isAttacking: ctx.isAttacking, isQuestionRevealed: ctx.isQuestionRevealed,
      cards1: ctx.cards1, cards2: ctx.cards2, protectedCountries: ctx.protectedCountries, challengesUsed1: ctx.challengesUsed1, challengesUsed2: ctx.challengesUsed2,
      mapPosition: ctx.mapPosition, capitals: ctx.capitals, stolenCapitalAlert: ctx.stolenCapitalAlert, timestamp: Date.now()
    };
    localStorage.setItem("wd_live_sync", JSON.stringify(localSyncData));

    debouncedSyncToSupabase({
      room_code: ctx.roomCode,
      game_state: ctx.gameState,
      team1_name: ctx.team1Name,
      team2_name: ctx.team2Name,
      score1: ctx.score1,
      score2: ctx.score2,
      turn: ctx.turn,
      timer: timerNow,
      timer_ends_at: timerEndsAt === null ? null : new Date(timerEndsAt).toISOString(),
      current_country_id: ctx.selectedCountry?.id || null,
      active_question: ctx.selectedCountry?.activeQuestion || null,
      team1_choice: ctx.team1Choice,
      team2_choice: ctx.team2Choice,
      show_result: ctx.showResult,
      is_attacking: ctx.isAttacking,
      is_question_revealed: ctx.isQuestionRevealed,
      cards1: ctx.cards1,
      cards2: ctx.cards2,
      protected_countries: ctx.protectedCountries,
      challenges_used1: ctx.challengesUsed1,
      challenges_used2: ctx.challengesUsed2,
      map_position: ctx.mapPosition,
      capitals: ctx.capitals,
      stolen_capital_alert: ctx.stolenCapitalAlert,
      spied_country_id: ctx.spiedCountryId,
      countries: cleanCountries,
      created_at: new Date().toISOString()
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ctx.gameState, ctx.team1Name, ctx.team2Name, ctx.score1, ctx.score2, ctx.turn, ctx.countries,
    ctx.selectedCountry, timerWhenStopped, timerEndsAt, ctx.team1Choice, ctx.team2Choice, ctx.showResult, ctx.isAttacking,
    ctx.isQuestionRevealed, ctx.cards1, ctx.cards2, ctx.protectedCountries, ctx.challengesUsed1,
    ctx.challengesUsed2, ctx.mapPosition, ctx.capitals, ctx.stolenCapitalAlert, ctx.spiedCountryId,
    ctx.isInitialized, ctx.supabase, ctx.roomCode
  ]);

}
