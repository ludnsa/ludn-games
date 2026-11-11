import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * جلسات اللعب (supabase/migrations/0015_game_sessions.sql): التجربة المجانية والرصيد القديم
 * ما ينحرقون لحظة "ابدأ".
 *   ابدأ (beginGameSession)  : يحجز. لو ما انحجز، اللعبة ما تبدأ.
 *   احتساب (countGameSession): اللعبة وصلت الجزء الحقيقي، أو انتهت بفائز قبله:
 *                              المافيا: أول صباح. مداقش: أول جولة تخلص.
 *                              تحدي الفئات: ربع أسئلة اللوحة ينحسم. خلية الحروف: فريق يفوز بأول جولة.
 *   إنهاء (endGameSession)   : أنهاها بدري: ترجع (مرتين بالكثير لكل لعبة لكل حساب)، وإلا تنحسب.
 * والقواعد كلها (10 دقايق، 3 دقايق بدون الصفحة، حد الإرجاع) بالقاعدة نفسها، بخطوة وحدة.
 *
 * هذا الملف مو "use server" عمداً: دواله ما تنستدعى من المتصفح. لو كانت server actions،
 * أي أحد يعرف كود الغرفة يقدر يحسب تجربة غيره أو يرجّع تجربته واللعبة شغالة.
 * للسيرفر بس، وبمفتاح service role.
 */

/** الألعاب اللي انتقلت للنظام الجديد. الباقي على consumeGameSessionAction لين نعتمدها */
export const SESSION_GAMES: ReadonlySet<string> = new Set(["mafia", "madaqesh", "quiz-grid", "letters-hive"]);

export type GameSessionKind = "trial" | "token" | "subscription" | "purchased";

export type BeginGameSessionResult =
  | { ok: true; sessionId: string; kind: GameSessionKind; releasedRooms: string[] }
  /** busy: عنده لعبة شغالة بتجربته أو رصيده. no_access: ما عنده. error: ما قدرنا نحجز */
  | { ok: false; reason: "busy" | "no_access" | "error"; releasedRooms: string[] };

export type GameSessionAccess = {
  allowed: boolean;
  reason: "free_trial" | "paid" | "subscription" | "no_tokens";
  availableTokens: number;
};

type Admin = SupabaseClient;

const roomsOf = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((r): r is string => typeof r === "string") : [];

/**
 * "ابدأ": يحجز التجربة أو لعبة من الرصيد، أو يحسبها على طول للمشترك وشاري اللعبة.
 * releasedRooms: غرف قديمة لنفس الحساب طلع منها صاحبها (صفحته سكرت أكثر من 3 دقايق)،
 * فرجعت تجربتها. اللعبة لازم تقفلها عشان ما تكمل ببلاش.
 */
export async function beginGameSession(admin: Admin, userId: string, gameId: string, roomRef: string): Promise<BeginGameSessionResult> {
  const { data, error } = await admin.rpc("game_session_begin", { p_user: userId, p_game: gameId, p_room: roomRef });
  if (error || !data) {
    console.error("game_session_begin error:", error);
    return { ok: false, reason: "error", releasedRooms: [] };
  }
  const res = data as { ok?: boolean; session_id?: string; kind?: GameSessionKind; reason?: string; released?: unknown };
  const releasedRooms = roomsOf(res.released);
  if (res.ok && res.session_id && res.kind) return { ok: true, sessionId: res.session_id, kind: res.kind, releasedRooms };
  return { ok: false, reason: res.reason === "busy" || res.reason === "no_access" ? res.reason : "error", releasedRooms };
}

/** اللعبة وصلت الجزء الحقيقي: الجلسة المحجوزة لهالغرفة تنحسب (لو فيه وحدة) */
export async function countGameSession(admin: Admin, gameId: string, roomRef: string): Promise<void> {
  const { error } = await admin.rpc("game_session_count", { p_game: gameId, p_room: roomRef });
  if (error) console.error("game_session_count error:", error);
}

/** أنهى أو صفّر قبل الجزء الحقيقي: ترجع لو باقي له إرجاع، وإلا تنحسب */
export async function endGameSession(admin: Admin, gameId: string, roomRef: string): Promise<void> {
  const { error } = await admin.rpc("game_session_end", { p_game: gameId, p_room: roomRef });
  if (error) console.error("game_session_end error:", error);
}

/** صاحب اللعبة فاتح الصفحة (قبل الجزء الحقيقي). لو فات 10 دقايق من البدء: تنحسب */
export async function pingGameSession(admin: Admin, userId: string, gameId: string, roomRef: string): Promise<void> {
  const { error } = await admin.rpc("game_session_ping", { p_user: userId, p_game: gameId, p_room: roomRef });
  if (error) console.error("game_session_ping error:", error);
}

/** الحجز صار بس اللعبة ما بدأت (فشل البدء): كأنه ما صار، ما ينحسب ولا ينعد إرجاع */
export async function cancelGameSession(admin: Admin, sessionId: string): Promise<void> {
  const { error } = await admin.rpc("game_session_cancel", { p_session: sessionId });
  if (error) console.error("game_session_cancel error:", error);
}

/** فحص الوصول بنفس ترتيب gameAccess.ts (شاري، اشتراك، تجربة، رصيد)، مع الحجوزات. null = ما قدرنا نفحص */
export async function gameSessionAccess(admin: Admin, userId: string, gameId: string): Promise<GameSessionAccess | null> {
  const { data, error } = await admin.rpc("game_session_access", { p_user: userId, p_game: gameId });
  if (error || !data) {
    console.error("game_session_access error:", error);
    return null;
  }
  const res = data as { allowed?: boolean; reason?: GameSessionAccess["reason"]; tokens?: number };
  return { allowed: Boolean(res.allowed), reason: res.reason ?? "no_tokens", availableTokens: Number(res.tokens) || 0 };
}
