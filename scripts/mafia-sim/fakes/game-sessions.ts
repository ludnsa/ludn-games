/**
 * بديل @/lib/game-sessions للمحاكي: ما فيه قاعدة جلسات، بس نسجّل الاستدعاءات
 * عشان المحاكي يتأكد إن كل لعبة تنحسب مرة وحدة بس.
 */
export const SESSION_GAMES: ReadonlySet<string> = new Set(["mafia"]);

export type GameSessionKind = "trial" | "token" | "subscription" | "purchased";
export type BeginGameSessionResult =
  | { ok: true; sessionId: string; kind: GameSessionKind; releasedRooms: string[] }
  | { ok: false; reason: "busy" | "no_access" | "error"; releasedRooms: string[] };

export const sessionLog: { op: string; room: string; sessionId?: string }[] = [];
let nextId = 1;

export async function beginGameSession(_admin: unknown, _userId: string, _gameId: string, roomRef: string): Promise<BeginGameSessionResult> {
  const sessionId = `sess-${nextId++}`;
  sessionLog.push({ op: "begin", room: roomRef, sessionId });
  return { ok: true, sessionId, kind: "subscription", releasedRooms: [] };
}
export async function countGameSession(_admin: unknown, _gameId: string, roomRef: string): Promise<void> {
  sessionLog.push({ op: "count", room: roomRef });
}
export async function endGameSession(_admin: unknown, _gameId: string, roomRef: string): Promise<void> {
  sessionLog.push({ op: "end", room: roomRef });
}
export async function pingGameSession(admin: unknown, userId: string, gameId: string, roomRef: string): Promise<"reserved" | "counted" | "none" | null> {
  void admin; void userId; void gameId; void roomRef;
  return "reserved";
}
export async function cancelGameSession(_admin: unknown, sessionId: string): Promise<void> {
  sessionLog.push({ op: "cancel", room: "", sessionId });
}
export async function gameSessionAccess() {
  return { allowed: true, reason: "subscription" as const, availableTokens: 0 };
}
