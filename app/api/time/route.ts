// ساعة السيرفر للمؤقتات: كل جهاز يقيس فرق ساعته عنها ويعد على أساسها (lib/game/server-clock.ts).
// ما فيها أي بيانات ولا تحتاج حساب: ترجع وقت السيرفر بس.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ now: Date.now() }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
