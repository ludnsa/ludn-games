"use client";

import { resumeBrowserGameSession } from "@/app/actions/browserGameSessions";

/**
 * اللعبة الشغالة لألعاب المتصفح (حرب القلاع، المزاد، السيطرة على العالم):
 * كود الغرفة ووقت آخر مرة كانت الصفحة مفتوحة، بـ localStorage عشان يوصلها أي تبويب بنفس المتصفح.
 * لو سكّر التبويب ورجع خلال 10 دقايق (حتى من تبويب جديد) يكمل نفس اللعبة بدل صفحة الباقات،
 * بشرط السيرفر يأكد إنها آخر جلسة له بهاللعبة وما رجعت (resumeBrowserGameSession).
 */

export const RESUME_WINDOW_MS = 10 * 60 * 1000;

const key = (gameId: string) => `ludn_live_game:${gameId}`;

/** الصفحة مفتوحة واللعبة شغالة: يتحدث مع كل نبضة ولما الصفحة تسكر */
export function markLiveGame(gameId: string, room: string) {
  try {
    localStorage.setItem(key(gameId), JSON.stringify({ room, at: Date.now() }));
  } catch {}
}

/** اللعبة خلصت أو انصفّرت أو أنهاها: ما فيه شي يرجع له */
export function clearLiveGame(gameId: string) {
  try {
    localStorage.removeItem(key(gameId));
  } catch {}
}

/** كود الغرفة لو اللعبة سكرت قبل أقل من 10 دقايق، وإلا null */
export function freshLiveGame(gameId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(gameId));
    if (!raw) return null;
    const saved = JSON.parse(raw) as { room?: unknown; at?: unknown };
    if (typeof saved.room === "string" && typeof saved.at === "number" && Date.now() - saved.at <= RESUME_WINDOW_MS) {
      return saved.room;
    }
  } catch {}
  clearLiveGame(gameId);
  return null;
}

/** يرجّع كود الغرفة لو اللعبة تكمل من هنا (والسيرفر أكد)، وإلا null */
export async function resumeLiveGame(gameId: string): Promise<string | null> {
  const room = freshLiveGame(gameId);
  if (!room) return null;
  const ok = await resumeBrowserGameSession(gameId, room).catch(() => false);
  if (!ok) {
    clearLiveGame(gameId);
    return null;
  }
  return room;
}
