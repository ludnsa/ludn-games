"use client";

import { useEffect, useRef } from "react";
import { pingBrowserGameSession } from "@/app/actions/browserGameSessions";
import { markLiveGame } from "@/lib/live-game";

/**
 * نبضة ألعاب المتصفح وقت اللعب: كل دقيقة، وأول ما ترجع الصفحة للواجهة.
 * - السيرفر يعرف إن الصفحة مفتوحة (يفرّق بين "طلع" و"ينتظر") ويحسبها لو فات 10 دقايق.
 * - تحفظ وقت آخر مرة كانت الصفحة مفتوحة، عشان الرجوع خلال 10 دقايق من تبويب جديد.
 * - لو الجلسة رجعت (بدأ لعبة ثانية بعد ما طلع من هذي أكثر من 3 دقايق) تنادي onReleased عشان الصفحة تقفلها.
 */
export function useLiveGamePing(gameId: string, room: string | null | undefined, live: boolean, onReleased: () => void) {
  const onReleasedRef = useRef(onReleased);
  useEffect(() => {
    onReleasedRef.current = onReleased;
  });

  useEffect(() => {
    if (!live || !room) return;
    let stopped = false;
    const ping = async () => {
      markLiveGame(gameId, room);
      const status = await pingBrowserGameSession(gameId, room).catch(() => "error" as const);
      if (!stopped && status === "released") onReleasedRef.current();
    };
    void ping();
    const timer = setInterval(ping, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void ping();
      else markLiveGame(gameId, room);
    };
    const onHide = () => markLiveGame(gameId, room);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
    };
  }, [gameId, room, live]);
}
