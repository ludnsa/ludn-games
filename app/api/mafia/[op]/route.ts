import { NextResponse } from "next/server";
import {
  ackMafiaNightTask,
  advanceMafiaPhase,
  claimMafiaLead,
  getMafiaMyView,
  markMafiaRoleSeen,
  submitMafiaDecoy,
  submitMafiaNightAction,
} from "@/actions/mafia";

/**
 * طلبات اللعب المتكررة من جوال اللاعب: حالتي الخاصة (view)، "شفت دوري" (seen)،
 * وصول شاشة الليل (got)، انتقال المرحلة لما يخلص المؤقت (advance)،
 * وعضو المافيا ياخذ القرار لو القائد ما وصلته مهمته (lead)، واختيار الليل (act) وجواب التمويه (decoy).
 *
 * طلبات عادية بدل دوال السيرفر: دوال السيرفر بالمتصفح تمشي بالدور وحدة ورا الثانية، فطلب معلّق
 * يوقف كل اللي وراه (حتى اختيار الليل). هنا الجوال يقطع الطلب المعلّق بعد مهلة ويعيده، والباقي يمشي.
 * نفس الدوال ونفس التحقق بمفتاح اللاعب السري. اختيار الليل والتمويه يتحملون الإعادة (نفس الاختيار ينجح مرة ثانية).
 */
export const dynamic = "force-dynamic";

type Body = { roomCode?: unknown; token?: unknown; seq?: unknown; targetId?: unknown; card?: unknown };

const BAD = { success: false as const, error: "بيانات غير صحيحة." };

async function run(op: string, b: Body) {
  const roomCode = typeof b.roomCode === "string" ? b.roomCode : "";
  const token = typeof b.token === "string" ? b.token : "";
  const seq = typeof b.seq === "number" ? b.seq : NaN;
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
        ...(Number.isInteger(seq) ? { seq } : {}),
      });
    }
    case "decoy":
      if (typeof b.targetId !== "string") return BAD;
      return submitMafiaDecoy({ roomCode, token, targetId: b.targetId, ...(Number.isInteger(seq) ? { seq } : {}) });
    default:
      return null;
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ op: string }> }) {
  const { op } = await params;
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
