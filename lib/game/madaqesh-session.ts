import type { MadaqeshSession } from "@/hooks/games/madaqesh/useMadaqeshGame";

/** جلسة حاسبة مداقش محفوظة على الجهاز: لو سكّر المتصفح يرجع لمكانه ورصيده */
const SESSION_KEY = "madaqesh_session";

export function readMadaqeshSession(): MadaqeshSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as MadaqeshSession) : null;
  } catch {
    return null;
  }
}

export function writeMadaqeshSession(session: MadaqeshSession | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // التخزين مقفل — اللعبة تشتغل بس التحديث بيطلّعك
  }
}
