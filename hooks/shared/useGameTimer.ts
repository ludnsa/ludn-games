import { useState, useEffect, useCallback, useRef, type SetStateAction } from "react";
import { serverNow, startCountdown, useServerClock } from "@/lib/game/server-clock";

/**
 * هوك مشترك للتعامل مع مؤقت اللعبة (المزاد والسيطرة على العالم)
 *
 * المؤقت يعد من وقت انتهاء (endsAt) مو من نقص ثانية كل ثانية: نفس الوقت ينكتب بالقاعدة مرة وحدة مع البداية،
 * وكل الشاشات والجوالات تعد منه، فالكل يشوف نفس الرقم ويوصل صفر بنفس اللحظة.
 * وقت الانتهاء والعد كلها على ساعة السيرفر (serverNow)، مو ساعة الجهاز: لو ساعة الحكم أو جوال مقدّمة أو
 * متأخرة، الرقم يظل نفسه عند الكل.
 *
 * @param initialSeconds الثواني الافتراضية للبدء
 * @returns حالة المؤقت ودوال للتحكم به
 */
export function useGameTimer(initialSeconds: number) {
  const [timer, setTimer] = useState<number>(initialSeconds);
  /** وقت الانتهاء (ms) والمؤقت شغال، و null وهو واقف */
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const isTimerRunning = endsAt !== null;
  useServerClock();

  // آخر قيمة للمؤقت (عشان البداية تحسب وقت الانتهاء من الباقي)
  const timerRef = useRef(timer);
  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  // تشغيل: وقت الانتهاء = الحين + الباقي. إيقاف: يوقف على الرقم اللي وصله
  const setIsTimerRunning = useCallback((value: SetStateAction<boolean>) => {
    setEndsAt((prev) => {
      const running = typeof value === "function" ? value(prev !== null) : value;
      if (!running) return null;
      return prev ?? serverNow() + timerRef.current * 1000;
    });
  }, []);

  /** يكمّل مؤقت كان شغال من وقت انتهاء محفوظ (بعد تحديث الصفحة). end على ساعة السيرفر — قبله whenServerClockReady */
  const resumeUntil = useCallback((end: number) => {
    const left = Math.ceil((end - serverNow()) / 1000);
    if (left > 0) {
      setTimer(left);
      setEndsAt(end);
    } else {
      setTimer(0);
      setEndsAt(null);
    }
  }, []);

  // العد: الباقي من وقت الانتهاء (لفوق)، والرقم يتغير بلحظته بالضبط. لما يوصل صفر يوقف
  useEffect(() => {
    if (endsAt === null) return;
    return startCountdown(endsAt, (left) => {
      setTimer(left);
      if (left === 0) setEndsAt(null);
    });
  }, [endsAt]);

  const startTimer = useCallback(() => setIsTimerRunning(true), [setIsTimerRunning]);
  const stopTimer = useCallback(() => setIsTimerRunning(false), [setIsTimerRunning]);
  const resetTimer = useCallback((newTime: number = initialSeconds) => {
    setTimer(newTime);
    setEndsAt(null);
  }, [initialSeconds]);

  return {
    timer,
    setTimer,
    isTimerRunning,
    setIsTimerRunning,
    /** وقت الانتهاء (ms) والمؤقت شغال، و null وهو واقف */
    timerEndsAt: endsAt,
    resumeUntil,
    startTimer,
    stopTimer,
    resetTimer
  };
}
