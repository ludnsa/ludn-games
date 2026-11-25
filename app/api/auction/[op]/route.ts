import { NextResponse } from "next/server";
import { getGameUserId } from "@/lib/supabase/server";
import { createAuctionRoom, refereeWrite, teamBid, teamJoin } from "@/lib/game/auction-server";

/**
 * كتابة غرف المزاد من السيرفر (المتصفح يقرا الغرفة بس، وما يكتب فيها): lib/game/auction-server.ts
 *
 *  - الحكم (ref-*): بجلسة حسابه المسجّل (الكوكيز) — ref-create ينشئ الغرفة، ref-write يكتب أعمدة بغرفته.
 *  - جوال الفريق (team-*): بدون حساب — team-join يحجز الفريق وياخذ token، team-bid يزايد بالـ token.
 */
export const dynamic = "force-dynamic";

/**
 * طلبات الحكم تعتمد على جلسة الحساب (الكوكيز)، فلازم تجي من صفحة الموقع نفسه
 * (عشان موقع ثاني ما يكتب بغرفة الحكم وهو مسجّل). نفس فحص app/api/mafia.
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

type Body = Record<string, unknown>;

async function run(op: string, b: Body) {
  switch (op) {
    case "ref-create":
      return createAuctionRoom(await getGameUserId(), { t1Name: b.t1Name, t2Name: b.t2Name, startBalance: b.startBalance });
    case "ref-write":
      return refereeWrite(await getGameUserId(), { roomCode: b.roomCode, patch: b.patch });
    case "team-join":
      return teamJoin({ roomCode: b.roomCode, team: b.team, deviceId: b.deviceId, token: b.token });
    case "team-bid":
      return teamBid({ roomCode: b.roomCode, team: b.team, deviceId: b.deviceId, token: b.token, bid: b.bid });
    default:
      return null;
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ op: string }> }) {
  const { op } = await params;
  if (op.startsWith("ref-") && !sameSite(req)) {
    return NextResponse.json({ success: false, error: "طلب مرفوض." }, { status: 403 });
  }
  let body: Body;
  try {
    const raw = await req.text();
    if (raw.length > 1_100_000) {
      return NextResponse.json({ success: false, error: "بيانات غير صحيحة." }, { status: 413 });
    }
    const parsed: unknown = JSON.parse(raw || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Body;
  } catch {
    return NextResponse.json({ success: false, error: "بيانات غير صحيحة." }, { status: 400 });
  }
  try {
    const res = await run(op, body);
    if (!res) return NextResponse.json({ success: false, error: "طلب غير معروف." }, { status: 404 });
    return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(`auction api ${op} error:`, err);
    return NextResponse.json({ success: false, error: "تعذّر الاتصال، حاول مرة ثانية." }, { status: 500 });
  }
}
