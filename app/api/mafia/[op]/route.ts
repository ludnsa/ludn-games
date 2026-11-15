import { NextResponse } from "next/server";
import {
  ackMafiaNightTask,
  advanceMafiaPhase,
  castMafiaVote,
  chooseMafiaSheikhMode,
  claimMafiaLead,
  closeMafiaRoom,
  endMafiaGameNow,
  getMafiaMyView,
  kickMafiaPlayer,
  killCheaterMafiaPlayer,
  killSilencedMafiaPlayer,
  markMafiaRoleSeen,
  newMafiaRoom,
  pingMafiaSession,
  playMafiaAgain,
  renameMafiaPlayer,
  setMafiaDiscussionTime,
  skipMafiaPhase,
  startMafiaDiscussion,
  startMafiaGame,
  submitMafiaDecoy,
  submitMafiaNightAction,
  updateMafiaSettings,
} from "@/actions/mafia";
import type { MafiaRole, MafiaSettings } from "@/types";

/**
 * طلبات اللعب من الجوال: حالتي الخاصة (view)، "شفت دوري" (seen)، وصول شاشة الليل (got)،
 * انتقال المرحلة لما يخلص المؤقت (advance)، عضو المافيا ياخذ القرار لو القائد ما وصلته مهمته (lead)،
 * اختيار الليل (act)، جواب التمويه (decoy)، التصويت (vote)، اختيار الشيخ (sheikh)، تغيير الاسم (rename)
 * — كلها بمفتاح اللاعب السري. وأزرار المنشئ ونبضة جلسته (host-*) — بحساب المنشئ المسجّل
 * (نفس التحقق اللي بدوال السيرفر: requireHost).
 *
 * طلبات عادية بدل دوال السيرفر: دوال السيرفر بالمتصفح تمشي بالدور وحدة ورا الثانية، فطلب معلّق
 * يوقف كل اللي وراه (لو علقت ضغطة المنشئ، الغرفة كلها توقف). هنا الجوال يقطع الطلب المعلّق بعد مهلة
 * ويعيده، والباقي يمشي. كلها تتحمل الإعادة: نفس الطلب مرة ثانية يرجع نفس الرد وما يغيّر شي،
 * وضغطات المنشئ معها رقم المرحلة — لو تغيّرت المرحلة، الضغطة تنتجاهل (ما تنقل الغرفة مرتين).
 */
export const dynamic = "force-dynamic";

type Body = {
  roomCode?: unknown;
  token?: unknown;
  seq?: unknown;
  targetId?: unknown;
  card?: unknown;
  playerId?: unknown;
  seconds?: unknown;
  settings?: unknown;
  devRole?: unknown;
  led?: unknown;
  displayName?: unknown;
};

const BAD = { success: false as const, error: "بيانات غير صحيحة." };

async function run(op: string, b: Body) {
  const roomCode = typeof b.roomCode === "string" ? b.roomCode : "";
  const token = typeof b.token === "string" ? b.token : "";
  const seq = typeof b.seq === "number" ? b.seq : NaN;
  const withSeq = Number.isInteger(seq) ? { seq } : {};
  const hostSeq = Number.isInteger(seq) ? seq : undefined;
  switch (op) {
    case "view":
      return getMafiaMyView({ roomCode, token });
    case "seen":
      return markMafiaRoleSeen({ roomCode, token, seq });
    case "got":
      return ackMafiaNightTask({ roomCode, token, seq });
    case "advance":
      return advanceMafiaPhase({ roomCode, token, seq });
    case "lead":
      return claimMafiaLead({ roomCode, token, seq });
    case "act": {
      // null = يعدّي الليلة (الساحر/الصحفي) أو درع الجندي مع البطاقة
      const targetId = typeof b.targetId === "string" ? b.targetId : b.targetId === null ? null : undefined;
      if (targetId === undefined || (b.card !== undefined && b.card !== null && typeof b.card !== "string")) return BAD;
      return submitMafiaNightAction({
        roomCode,
        token,
        targetId,
        ...(typeof b.card === "string" ? { card: b.card } : {}),
        ...withSeq,
      });
    }
    case "decoy":
      if (typeof b.targetId !== "string") return BAD;
      return submitMafiaDecoy({ roomCode, token, targetId: b.targetId, ...withSeq });
    case "vote": {
      // null = تخطي
      const targetId = typeof b.targetId === "string" ? b.targetId : b.targetId === null ? null : undefined;
      if (targetId === undefined) return BAD;
      return castMafiaVote({ roomCode, token, targetId, ...withSeq });
    }
    case "sheikh":
      // true = منظم، false = حر
      if (typeof b.led !== "boolean") return BAD;
      return chooseMafiaSheikhMode({ roomCode, token, led: b.led, ...withSeq });
    case "rename":
      if (typeof b.displayName !== "string") return BAD;
      return renameMafiaPlayer({ roomCode, token, displayName: b.displayName });

    // ----- أزرار المنشئ -----
    case "host-ping":
      // صفحة المنشئ مفتوحة قبل أول صباح (حساب التجربة) — ما تغيّر شي باللعبة
      return pingMafiaSession(roomCode);
    case "host-start":
      return startMafiaGame(roomCode, typeof b.devRole === "string" ? (b.devRole as MafiaRole) : null, hostSeq);
    case "host-skip":
      return skipMafiaPhase(roomCode, hostSeq);
    case "host-discussion":
      if (typeof b.seconds !== "number") return BAD;
      return startMafiaDiscussion({ roomCode, seconds: b.seconds, ...withSeq });
    case "host-discussion-time":
      if (typeof b.seconds !== "number") return BAD;
      return setMafiaDiscussionTime({ roomCode, seconds: b.seconds });
    case "host-hush":
      return killSilencedMafiaPlayer(roomCode, hostSeq);
    case "host-cheat":
      if (typeof b.playerId !== "string") return BAD;
      return killCheaterMafiaPlayer({ roomCode, playerId: b.playerId, ...withSeq });
    case "host-end":
      return endMafiaGameNow(roomCode, hostSeq);
    case "host-again":
      return playMafiaAgain(roomCode, hostSeq);
    case "host-kick":
      if (typeof b.playerId !== "string") return BAD;
      return kickMafiaPlayer({ roomCode, playerId: b.playerId });
    case "host-settings":
      if (!b.settings || typeof b.settings !== "object") return BAD;
      return updateMafiaSettings({ roomCode, settings: b.settings as MafiaSettings });
    case "host-new-room":
      return newMafiaRoom(roomCode);
    case "host-close":
      return closeMafiaRoom(roomCode, hostSeq);
    default:
      return null;
  }
}

/**
 * أزرار المنشئ تعتمد على جلسة الحساب (الكوكيز)، فلازم الطلب يجي من صفحة الموقع نفسه:
 * دوال السيرفر كانت تفحص هذا لحالها، وهنا نفحصه بأنفسنا (عشان موقع ثاني ما يضغط عن المنشئ).
 */
function sameSite(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ op: string }> }) {
  const { op } = await params;
  if (op.startsWith("host-") && !sameSite(req)) {
    return NextResponse.json({ success: false, error: "طلب مرفوض." }, { status: 403 });
  }
  let body: Body;
  try {
    body = ((await req.json()) ?? {}) as Body;
  } catch {
    return NextResponse.json({ success: false, error: "بيانات غير صحيحة." }, { status: 400 });
  }
  try {
    const res = await run(op, body);
    if (!res) return NextResponse.json({ success: false, error: "طلب غير معروف." }, { status: 404 });
    return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(`mafia api ${op} error:`, err);
    return NextResponse.json({ success: false, error: "تعذّر الاتصال، نحاول مرة ثانية." }, { status: 500 });
  }
}
