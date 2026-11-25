/**
 * كتابة غرف المزاد من المتصفح تمر من السيرفر (app/api/auction/[op]) — المتصفح ما يكتب بالجدول مباشرة.
 * القراءة (البث اللحظي والقراءة الاحتياطية) ما تغيّرت، تظل من المتصفح.
 */

export type AuctionApiResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string; code?: string; network?: boolean };

export type AuctionOp = "ref-create" | "ref-write" | "team-join" | "team-bid";

/** طلب واحد (بدون إعادة: كتابات الحكم حالة كاملة، والإعادة ممكن توصل بعد كتابة أحدث وتكتب فوقها) */
export async function postAuction<T = undefined>(
  op: AuctionOp,
  body: Record<string, unknown>,
  timeoutMs = 15000
): Promise<AuctionApiResult<T>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`/api/auction/${op}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (res.status >= 500) return { success: false, error: "تعذّر الاتصال، حاول مرة ثانية.", network: true };
    return (await res.json()) as AuctionApiResult<T>;
  } catch {
    return { success: false, error: "تعذّر الاتصال، تأكد من النت وحاول مرة ثانية.", network: true };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * كتابات الحكم بالترتيب، وحدة بالمرة: لو انرسلت كتابتين ورا بعض (مثلاً "الخيارات" وبعدها "اختيار المكافأة")
 * ممكن الأقدم توصل بعد الأحدث وترجّع الغرفة لحالة قديمة. فننتظر كل كتابة لين ترد، واللي تتجمع وهي بالطريق
 * تنرسل مع بعض بالترتيب (القيمة الأحدث لكل عمود هي اللي تنكتب) — النتيجة بالقاعدة دايماً آخر حالة عند الحكم.
 */
type QueuedWrite = { roomCode: string; patch: Record<string, unknown>; done: ((r: AuctionApiResult) => void)[] };
const refereeQueue: QueuedWrite[] = [];
let refereeSending = false;

async function drainRefereeQueue(): Promise<void> {
  if (refereeSending) return;
  refereeSending = true;
  try {
    while (refereeQueue.length > 0) {
      const item = refereeQueue.shift()!;
      const res = await postAuction("ref-write", { roomCode: item.roomCode, patch: item.patch });
      item.done.forEach((d) => d(res));
    }
  } finally {
    refereeSending = false;
  }
}

/** الحكم يكتب أعمدة بغرفته (الأعمدة اللي بالـ patch بس). يرجع لما تنكتب (مع أي كتابة انضمت لها) */
export function auctionRefereeWrite(roomCode: string, patch: Record<string, unknown>): Promise<AuctionApiResult> {
  return new Promise((resolve) => {
    const last = refereeQueue[refereeQueue.length - 1];
    if (last && last.roomCode === roomCode) {
      Object.assign(last.patch, patch);
      last.done.push(resolve);
    } else {
      refereeQueue.push({ roomCode, patch: { ...patch }, done: [resolve] });
    }
    void drainRefereeQueue();
  });
}

/** token جوال الفريق محفوظ بالتبويب (مثل رقم الجهاز)، لكل غرفة وفريق */
const tokenKey = (roomCode: string, team: 1 | 2) => `auction_team_token:${roomCode}:${team}`;

export function readAuctionTeamToken(roomCode: string, team: 1 | 2): string | null {
  try {
    return sessionStorage.getItem(tokenKey(roomCode, team));
  } catch {
    return null;
  }
}

export function saveAuctionTeamToken(roomCode: string, team: 1 | 2, token: string): void {
  try {
    sessionStorage.setItem(tokenKey(roomCode, team), token);
  } catch {}
}
