/**
 * كتابة غرف حرب القلاع من المتصفح تمر من السيرفر (app/api/castle/[op]) — المتصفح ما يكتب بالجدول مباشرة.
 * القراءة (البث اللحظي والقراءة الاحتياطية) ما تغيّرت، تظل من المتصفح.
 */

export type CastleApiResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string; code?: string; network?: boolean };

export type CastleOp =
  | "ref-create" | "ref-sync" | "ref-reset" | "ref-name" | "ref-attack" | "ref-trap" | "ref-load"
  | "team-join" | "team-plan";

/** طلب واحد بدون إعادة (حالة المضيف كاملة، والإعادة ممكن توصل بعد كتابة أحدث) */
export async function postCastle<T = undefined>(
  op: CastleOp,
  body: Record<string, unknown>,
  timeoutMs = 15000
): Promise<CastleApiResult<T>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`/api/castle/${op}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (res.status >= 500) return { success: false, error: "تعذّر الاتصال، حاول مرة ثانية.", network: true };
    return (await res.json()) as CastleApiResult<T>;
  } catch {
    return { success: false, error: "تعذّر الاتصال، تأكد من النت وحاول مرة ثانية.", network: true };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * كتابات المضيف على الغرفة (الحالة، التصفير، اسم الفريق) بالترتيب ووحدة بالمرة: كتابة قديمة ما توصل بعد أحدث منها.
 * اللي تتجمع وهي بالطريق: نفس النوع تنرسل الأحدث بس (الحالة كاملة كل مرة، والاسم آخر حرف).
 */
type HostOp = "ref-sync" | "ref-reset" | "ref-name";
type QueuedWrite = { op: HostOp; key: string; body: Record<string, unknown>; done: ((r: CastleApiResult) => void)[] };
const hostQueue: QueuedWrite[] = [];
let hostSending = false;

async function drainHostQueue(): Promise<void> {
  if (hostSending) return;
  hostSending = true;
  try {
    while (hostQueue.length > 0) {
      const item = hostQueue.shift()!;
      const res = await postCastle(item.op, item.body);
      if (!res.success) console.error(`castle ${item.op}:`, res.error);
      item.done.forEach((d) => d(res));
    }
  } finally {
    hostSending = false;
  }
}

export function castleHostWrite(op: HostOp, body: Record<string, unknown>): Promise<CastleApiResult> {
  const key = `${op}:${String(body.roomCode)}:${op === "ref-name" ? String(body.team) : ""}`;
  return new Promise((resolve) => {
    const last = hostQueue[hostQueue.length - 1];
    if (last && last.key === key && op !== "ref-reset") {
      last.body = body;
      last.done.push(resolve);
    } else {
      hostQueue.push({ op, key, body, done: [resolve] });
    }
    void drainHostQueue();
  });
}

/** رقم الجهاز (لكل تبويب، يبقى بعد تحديث الصفحة) و token الفريق لكل غرفة وفريق */
export function castleDeviceId(): string {
  try {
    let id = sessionStorage.getItem("cw_device_id");
    if (!id) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
      sessionStorage.setItem("cw_device_id", id);
    }
    return id;
  } catch {
    return Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
  }
}

const tokenKey = (roomCode: string, team: 1 | 2) => `cw_team_token:${roomCode}:${team}`;

export function readCastleTeamToken(roomCode: string, team: 1 | 2): string | null {
  try {
    return sessionStorage.getItem(tokenKey(roomCode, team));
  } catch {
    return null;
  }
}

export function saveCastleTeamToken(roomCode: string, team: 1 | 2, token: string): void {
  try {
    sessionStorage.setItem(tokenKey(roomCode, team), token);
  } catch {}
}
