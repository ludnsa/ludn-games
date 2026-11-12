"use server";

import { getGameUserId, getSupabaseServiceRole } from "@/lib/supabase/server";
import { beginGameSession, countGameSession, endGameSession, pingGameSession } from "@/lib/game-sessions";

/**
 * جلسات اللعب للألعاب اللي تشتغل بالمتصفح: حرب القلاع، المزاد، السيطرة على العالم.
 * نفس قواعد lib/game-sessions.ts (0015)، بس منطق اللعبة بالمتصفح، فالمتصفح هو اللي يقول
 * "وصلنا المعيار" أو "أنهاها". الشخص التقني يقدر يتخطى هذا، وهذا مقبول لين مرحلة الأمان.
 *
 * كل دالة تاخذ الحساب من الكوكيز، ومرجع الغرفة بالقاعدة = "<كود الغرفة>:<رقم الحساب>"،
 * فما أحد يقدر يحسب أو يرجّع جلسة غيره حتى لو يعرف كود غرفته (أكواد هالألعاب تنعطى للفرق).
 * والإلغاء (cancel) ما ينفتح للمتصفح أبداً: يمسح الحجز ويرجّع الرصيد بدون ما ينعد إرجاع.
 */

const BROWSER_GAMES = new Set(["castle-war", "auction", "world-domination"]);
const ROOM_RE = /^[A-Z0-9]{2,12}$/;

export type BrowserGameBegin = { ok: true } | { ok: false; reason: "busy" | "no_access" | "error" };
export type BrowserGamePing = "reserved" | "counted" | "released" | "none" | "error";

async function context(gameId: string, room: string) {
  if (!BROWSER_GAMES.has(gameId) || typeof room !== "string" || !ROOM_RE.test(room)) return null;
  const userId = await getGameUserId();
  if (!userId) return null;
  return { admin: getSupabaseServiceRole(), userId, ref: `${room}:${userId}` };
}

/**
 * "ابدأ": يحجز التجربة أو لعبة من الرصيد (أو يحسبها على طول للمشترك والشاري).
 * لو عنده حجز شغال لنفس الغرفة: الضغطة الأولى وصلت وردها ضاع (انقطع النت)، فيكمل نفس الحجز.
 * الغرف القديمة اللي رجعت (طلع منها أكثر من 3 دقايق) تنقفل من صفحتها نفسها لما ترسل نبضة.
 */
export async function beginBrowserGameSession(gameId: string, room: string): Promise<BrowserGameBegin> {
  try {
    const c = await context(gameId, room);
    if (!c) return { ok: false, reason: "error" };
    const res = await beginGameSession(c.admin, c.userId, gameId, c.ref);
    if (res.ok) return { ok: true };
    if (res.reason === "busy") {
      const { data } = await c.admin
        .from("game_sessions")
        .select("id")
        .eq("user_id", c.userId)
        .eq("game_id", gameId)
        .eq("room_ref", c.ref)
        .eq("status", "reserved")
        .maybeSingle();
      if (data?.id) return { ok: true };
    }
    return { ok: false, reason: res.reason };
  } catch (err) {
    console.error("beginBrowserGameSession error:", err);
    return { ok: false, reason: "error" };
  }
}

/** وصلت المعيار أو انتهت بفائز: تنحسب (لو محجوزة) */
export async function countBrowserGameSession(gameId: string, room: string): Promise<void> {
  try {
    const c = await context(gameId, room);
    if (c) await countGameSession(c.admin, gameId, c.ref);
  } catch (err) {
    console.error("countBrowserGameSession error:", err);
  }
}

/** أنهاها أو صفّرها قبل المعيار: ترجع (لو باقي له إرجاع). بعد ما انحسبت ما يتغير شي */
export async function endBrowserGameSession(gameId: string, room: string): Promise<void> {
  try {
    const c = await context(gameId, room);
    if (c) await endGameSession(c.admin, gameId, c.ref);
  } catch (err) {
    console.error("endBrowserGameSession error:", err);
  }
}

/**
 * نبضة كل دقيقة وقت اللعب. released: هالغرفة رجعت تجربتها (طلع منها وبدأ لعبة ثانية، أو انتهت من تبويب ثاني)،
 * فالصفحة تقفلها عشان ما تكمل ببلاش.
 */
export async function pingBrowserGameSession(gameId: string, room: string): Promise<BrowserGamePing> {
  try {
    const c = await context(gameId, room);
    if (!c) return "error";
    const status = await pingGameSession(c.admin, c.userId, gameId, c.ref);
    if (status === null) return "error";
    if (status !== "none") return status;
    const { data } = await c.admin
      .from("game_sessions")
      .select("status")
      .eq("user_id", c.userId)
      .eq("game_id", gameId)
      .eq("room_ref", c.ref)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.status === "counted" || data?.status === "released" ? data.status : "none";
  } catch (err) {
    console.error("pingBrowserGameSession error:", err);
    return "error";
  }
}

/**
 * سكّر التبويب ورجع (من تبويب جديد): يكمل نفس اللعبة لو هي آخر جلسة له بهاللعبة وما رجعت.
 * مدة الرجوع (10 دقايق من آخر مرة كانت الصفحة مفتوحة) يحسبها المتصفح، لأن آخر نبضة بعد الاحتساب ما تنحفظ بالقاعدة.
 */
export async function resumeBrowserGameSession(gameId: string, room: string): Promise<boolean> {
  try {
    const c = await context(gameId, room);
    if (!c) return false;
    const { data } = await c.admin
      .from("game_sessions")
      .select("room_ref, status")
      .eq("user_id", c.userId)
      .eq("game_id", gameId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.room_ref === c.ref && (data.status === "reserved" || data.status === "counted");
  } catch (err) {
    console.error("resumeBrowserGameSession error:", err);
    return false;
  }
}
