"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * تبويب واحد بس يتحكم باللعبة (ألعاب المتصفح: حرب القلاع، المزاد، السيطرة على العالم).
 * آخر تبويب يفتح نفس اللعبة ياخذ التحكم، والتبويب القديم يوقف: الصفحة تشيل اللعبة كلها
 * (ما يشتغل فيها مؤقت ولا مزامنة ولا نبضة، فما يرسل أي تحديث) وتعرض "اللعبة مفتوحة في تبويب ثاني".
 * "استخدم هذا التبويب" يرجّع التحكم له، واللعبة ترجع من آخر حالة محفوظة مثل تحديث الصفحة،
 * والتبويب الثاني يوقف بنفس الطريقة.
 *
 * room: نفس اللعبة = نفس الغرفة. null = ما فيه غرفة لين الحين (ما ياخذ التحكم من أحد).
 * بنفس المتصفح بس (localStorage وحدث storage اللي يوصل التبويبات الثانية).
 */
const key = (gameId: string) => `ludn_tab_owner:${gameId}`;
const newTabId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function useSingleTab(gameId: string, room: string | null) {
  // رقم لهالفتحة من الصفحة (التحديث يعتبر فتح جديد وياخذ التحكم)
  const [tabId] = useState(newTabId);
  const [active, setActive] = useState(true);

  const writeOwner = useCallback(() => {
    if (!room) return;
    try {
      localStorage.setItem(key(gameId), JSON.stringify({ room, tab: tabId, at: Date.now() }));
    } catch {}
  }, [gameId, room, tabId]);

  // فتح التبويب (أو أول ما تنعرف غرفته) = ياخذ التحكم
  useEffect(() => {
    writeOwner();
  }, [writeOwner]);

  // تبويب ثاني أخذ التحكم بنفس الغرفة: هذا يوقف
  useEffect(() => {
    if (!room) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key(gameId) || !e.newValue) return;
      try {
        const owner = JSON.parse(e.newValue) as { room?: string; tab?: string };
        if (owner.room === room && owner.tab !== tabId) setActive(false);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [gameId, room, tabId]);

  /** "استخدم هذا التبويب" */
  const takeOver = useCallback(() => {
    writeOwner();
    setActive(true);
  }, [writeOwner]);

  return { active, takeOver };
}
