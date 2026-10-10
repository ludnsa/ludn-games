import type { MafiaSession } from "@/hooks/games/mafia/useMafiaGame";

/**
 * الجلسة محفوظة على الجهاز (مو التبويب بس): لو اللاعب سكّر المتصفح ورجع،
 * يرجع تلقائياً لمكانه ودوره بدون ما يعلق اسمه القديم في الغرفة.
 */
const SESSION_KEY = "mafia_session";

export function readMafiaSession(): MafiaSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as MafiaSession) : null;
  } catch {
    return null;
  }
}

export function writeMafiaSession(session: MafiaSession | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // التخزين مقفل — اللعبة تشتغل بس التحديث بيطلّعك
  }
}
