import { NextResponse } from "next/server";
import { getGameUserId } from "@/lib/supabase/server";
import {
  createCastleRoom, hostAttack, hostLoad, hostName, hostReset, hostSync, hostTrap, teamJoin, teamPlan,
} from "@/lib/game/castle-server";

/**
 * كتابة غرف حرب القلاع من السيرفر (المتصفح يقرا الغرفة بس): lib/game/castle-server.ts
 *
 *  - المضيف (ref-*): بجلسة حسابه (الكوكيز) — إنشاء، حالة اللعبة (live_sync)، تصفير، اسم فريق،
 *    هجوم/جاسوس (السيرفر يكشف النافذة المضروبة بس)، أسر، ورجوع بعد تحديث الصفحة.
 *  - جوال الفريق (team-*): بدون حساب — team-join يختار الفريق وياخذ token، team-plan يعتمد الخطة بالـ token.
 */
export const dynamic = "force-dynamic";

/** طلبات المضيف بجلسة الحساب (الكوكيز): لازم من صفحة الموقع نفسه. نفس فحص app/api/auction و app/api/mafia */
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
      return createCastleRoom(await getGameUserId(), { team1Name: b.team1Name, team2Name: b.team2Name });
    case "ref-sync":
      return hostSync(await getGameUserId(), { roomCode: b.roomCode, live: b.live });
    case "ref-reset":
      return hostReset(await getGameUserId(), { roomCode: b.roomCode });
    case "ref-name":
      return hostName(await getGameUserId(), { roomCode: b.roomCode, team: b.team, name: b.name });
    case "ref-attack":
      return hostAttack(await getGameUserId(), { roomCode: b.roomCode, defender: b.defender, room: b.room, spy: b.spy });
    case "ref-trap":
      return hostTrap(await getGameUserId(), { roomCode: b.roomCode, defender: b.defender, lost: b.lost });
    case "ref-load":
      return hostLoad(await getGameUserId(), { roomCode: b.roomCode });
    case "team-join":
      return teamJoin({ roomCode: b.roomCode, team: b.team, deviceId: b.deviceId, token: b.token });
    case "team-plan":
      return teamPlan({ roomCode: b.roomCode, team: b.team, deviceId: b.deviceId, token: b.token, plan: b.plan, name: b.name });
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
    if (raw.length > 64_000) {
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
    console.error(`castle api ${op} error:`, err);
    return NextResponse.json({ success: false, error: "تعذّر الاتصال، حاول مرة ثانية." }, { status: 500 });
  }
}
