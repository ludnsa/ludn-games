// حد محاولات الدخول وإنشاء الحساب واستعادة كلمة المرور، على نفس الجهاز، ويُحسب لما ينرسل النموذج بس.
// الحماية الأساسية عند Supabase (لكل IP، ما تنتجاوز من المتصفح). هذا يوقف التكرار من الجهاز نفسه،
// بدون ما يوقف غيره على نفس الشبكة (شبكات الجوال تحط ناس كثير على نفس الـ IP).

export type AttemptKind = "signin" | "signup" | "reset";

type Rule = { max: number; windowMs: number; lockMs: number; repeatLockMs: number };
const MIN = 60_000;
const RULES: Record<AttemptKind, Rule> = {
  // دخول غلط: 5 خلال 10 دقايق → انتظار دقيقتين، ولو كمّل غلط بعدها → 5 دقايق كل مرة
  signin: { max: 5, windowMs: 10 * MIN, lockMs: 2 * MIN, repeatLockMs: 5 * MIN },
  // إنشاء حساب: 5 محاولات خلال 10 دقايق → 5 دقايق
  signup: { max: 5, windowMs: 10 * MIN, lockMs: 5 * MIN, repeatLockMs: 10 * MIN },
  // رابط استعادة كلمة المرور (كل طلب = إيميل): 3 خلال 15 دقيقة → 10 دقايق
  reset: { max: 3, windowMs: 15 * MIN, lockMs: 10 * MIN, repeatLockMs: 15 * MIN },
};
// لو Supabase نفسه رد "محاولات كثيرة" (429)، نوقف الجهاز هالمدة على الأقل
const SERVER_LIMIT_LOCK_MS = 2 * MIN;

type Entry = { at: number[]; lockUntil: number };
type Store = Partial<Record<AttemptKind, Entry>>;
const KEY = "ludn-auth-attempts-v1";
let memory: Store = {}; // لو التخزين مقفل (تصفح خاص مثلاً)

function load(): Store {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) memory = JSON.parse(raw) as Store;
  } catch {}
  return memory;
}
function save(s: Store) {
  memory = s;
  try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}
function entryOf(s: Store, kind: AttemptKind, now: number): Entry {
  const e = s[kind] ?? { at: [], lockUntil: 0 };
  return { at: e.at.filter((t) => now - t < RULES[kind].windowMs), lockUntil: e.lockUntil };
}

/** كم باقي (ms) على فك الإيقاف، وصفر لو مسموح */
export function lockedFor(kind: AttemptKind): number {
  const now = Date.now();
  const e = load()[kind];
  return e && e.lockUntil > now ? e.lockUntil - now : 0;
}

/** يسجّل محاولة (دخول غلط، أو إنشاء حساب، أو طلب استعادة). يرجّع مدة الإيقاف لو هالمحاولة وقّفت الجهاز، وإلا صفر */
export function recordAttempt(kind: AttemptKind): number {
  const now = Date.now();
  const s = load();
  const e = entryOf(s, kind, now);
  e.at.push(now);
  const rule = RULES[kind];
  let locked = 0;
  if (e.at.length >= rule.max) {
    locked = e.at.length === rule.max ? rule.lockMs : rule.repeatLockMs;
    e.lockUntil = now + locked;
  }
  save({ ...s, [kind]: e });
  return locked;
}

/** Supabase رد 429: نوقف الجهاز شوي عشان ما يكرر ويزيد الحد على شبكته */
export function recordServerLimit(kind: AttemptKind): number {
  const now = Date.now();
  const s = load();
  const e = entryOf(s, kind, now);
  e.lockUntil = Math.max(e.lockUntil, now + SERVER_LIMIT_LOCK_MS);
  save({ ...s, [kind]: e });
  return e.lockUntil - now;
}

/** دخول ناجح: نمسح العداد */
export function clearAttempts(kind: AttemptKind) {
  const s = load();
  if (!s[kind]) return;
  const next = { ...s };
  delete next[kind];
  save(next);
}

/** مدة بالعربي: "دقيقتين"، "5 دقايق"، "40 ثانية" */
export function waitText(ms: number): string {
  const sec = Math.max(1, Math.ceil(ms / 1000));
  if (sec < 60) return sec <= 10 ? `${sec} ثواني` : `${sec} ثانية`;
  const min = Math.ceil(sec / 60);
  if (min === 1) return "دقيقة";
  if (min === 2) return "دقيقتين";
  return min <= 10 ? `${min} دقايق` : `${min} دقيقة`;
}

/** عدّاد قصير للزر: 1:45 */
export function waitClock(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

/** رسالة الإيقاف على الجهاز */
export function lockMessage(ms: number): string {
  return `محاولات كثيرة. لحماية الحساب، جرّب مرة ثانية بعد ${waitText(ms)}.`;
}

type AuthErrorLike = { status?: number; code?: string; message?: string } | null | undefined;

/** هل الخطأ من حد Supabase (429)؟ */
export function isRateLimitError(error: AuthErrorLike): boolean {
  if (!error) return false;
  return error.status === 429 || error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit" || error.code === "over_sms_send_rate_limit";
}

/** رسالة عربية لحد Supabase، أو null لو الخطأ شي ثاني */
export function rateLimitMessage(error: AuthErrorLike): string | null {
  if (!isRateLimitError(error)) return null;
  if (error?.code === "over_email_send_rate_limit") return "انرسلت رسائل كثيرة الحين. جرّب مرة ثانية بعد شوي.";
  return "فيه محاولات كثيرة من نفس الشبكة. جرّب مرة ثانية بعد دقايق.";
}

/** خطأ يستاهل نحسبه محاولة (رد من Supabase برفض، مو انقطاع نت ولا 429) */
export function isCountableFailure(error: AuthErrorLike): boolean {
  const st = error?.status;
  return typeof st === "number" && st >= 400 && st < 500 && st !== 429;
}
