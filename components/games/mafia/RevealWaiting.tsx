"use client";

import { useEffect, useRef, useState } from "react";
import { Hourglass } from "lucide-react";
import type { MafiaGameCtx } from "@/hooks/games/mafia/useMafiaGame";

/** مدة اختفاء كبسولة اللي شاف دوره (تلاشي مع تصغير) */
const PILL_LEAVE_MS = 200;
/** من كم اسم وأقل: "ننتظر هذول بس" والكبسولات تكبر وتصير ذهبية */
const FEW_LEFT = 3;

type Pill = { id: string; gone: number | null };

/**
 * الأسماء اللي اختفت من القائمة تظل مكانها لحظة (PILL_LEAVE_MS) وهي تتلاشى وتصغر، وبعدها تنشال —
 * فالكبسولات اللي حولها ما تقفز قبل ما تخلص الحركة. gone = رقم الدفعة اللي اختفى فيها (كل تغيير بالقائمة دفعة).
 * الترتيب حسب المقاعد (seatOf)، مو حسب وصول الأسماء للجوال: كل الجوالات تشوف نفس الترتيب.
 */
function useLeavingPills(ids: string[], seatOf: (id: string) => number): Pill[] {
  const key = ids.join(",");
  const [mem, setMem] = useState<{ key: string; batch: number; items: Pill[] }>(() => ({
    key,
    batch: 0,
    items: ids.map((id) => ({ id, gone: null })),
  }));
  // القائمة تغيّرت: اللي طلع منها يبدأ يختفي، واللي جديد ينضاف (نمط "تعديل الحالة مع تغيّر الخصائص")
  if (mem.key !== key) {
    const now = new Set(ids);
    const batch = mem.batch + 1;
    const items = mem.items.map((it) =>
      now.has(it.id) ? (it.gone === null ? it : { id: it.id, gone: null }) : it.gone === null ? { id: it.id, gone: batch } : it
    );
    const known = new Set(mem.items.map((it) => it.id));
    ids.forEach((id) => {
      if (!known.has(id)) items.push({ id, gone: null });
    });
    setMem({ key, batch, items });
  }

  // كل دفعة تنشال بعد مدة الحركة بمؤقتها الخاص (ما يتأجل لو اختفى غيرها بعدها بلحظة)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const leavingBatch = mem.items.some((it) => it.gone === mem.batch) ? mem.batch : null;
  useEffect(() => {
    if (leavingBatch === null) return;
    timers.current.push(
      setTimeout(
        () => setMem((m) => ({ ...m, items: m.items.filter((it) => it.gone === null || it.gone > leavingBatch) })),
        PILL_LEAVE_MS
      )
    );
  }, [leavingBatch]);
  // اسم وصل الجوال متأخر كان ينضاف آخر القائمة، فيختلف الترتيب من جوال لجوال. بالمقاعد: نفس الترتيب عند الكل،
  // والاسم اللي يختفي يظل بمكانه وهو يتلاشى
  return [...mem.items].sort((a, b) => seatOf(a.id) - seatOf(b.id));
}

/**
 * مين باقي ما شاف دوره (لكل اللاعبين — المنشئ لاعب مثلهم، ما يشوف أكثر منهم):
 * عنوان ذهبي مع ساعة رملية، وعدّاد "X من Y" (X = اللي شافوا) بصندوق، وشريط تقدم ذهبي يمتلي من اليمين
 * (نقطة ذهبية بالبداية)، والأسماء بكبسولات تلتف على أكثر من سطر — كل ما واحد ضغط "شفت دوري" تختفي كبسولته.
 * لما يبقى 3 أو أقل: "ننتظر هذول بس" والكبسولات تكبر وتصير ذهبية وتنوّر بالنص.
 * (التصميم: C:\yazeed-game-assets\mafia\wait-options.png)
 */
export default function RevealWaiting({ ctx }: { ctx: MafiaGameCtx }) {
  const r = ctx.revealReady;
  const myId = ctx.me?.id;
  const waiting = (r?.waiting ?? []).filter((id) => !(ctx.iSawRole && id === myId) && ctx.nameOf(id));
  const showNames = Boolean(r?.waiting);
  const seats = new Map(ctx.players.map((p) => [p.id, p.seat]));
  const pills = useLeavingPills(showNames ? waiting : [], (id) => seats.get(id) ?? Number.MAX_SAFE_INTEGER);
  if (!r) return null;

  const total = Math.max(r.total, 1);
  const left = r.waiting ? waiting.length : Math.max(0, r.total - r.done);
  if (left === 0) return null;
  const seen = Math.max(0, r.total - left);
  const few = left <= FEW_LEFT;
  // بدون أسماء (القائمة ما وصلت): العنوان يقول العدد بداله
  const title = few
    ? showNames
      ? "ننتظر هذول بس"
      : left === 1
        ? "ننتظر آخر واحد بس"
        : left === 2
          ? "ننتظر آخر اثنين بس"
          : "ننتظر آخر ثلاثة بس"
    : "باقي ما شافوا أدوارهم";

  return (
    <section
      aria-label="مين باقي ما شاف دوره"
      className="w-full min-w-0 rounded-3xl border border-ludn-gold/20 bg-ludn-surface/85 p-4 animate-in fade-in"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-1.5 text-[16px] font-black text-ludn-gold-text">
          <Hourglass size={18} className="shrink-0 text-ludn-gold" />
          <span className="truncate">{title}</span>
        </h3>
        <span
          className="shrink-0 rounded-xl border border-ludn-line bg-ludn-bg/70 px-2.5 py-1.5 text-[15px] font-black tabular-nums text-ludn-fg"
          aria-live="polite"
        >
          <span className="text-ludn-gold-text">{seen}</span> من {r.total}
        </span>
      </div>

      {/* شريط التقدم: يمتلي من اليمين (الصفحة من اليمين لليسار)، وبالبداية نقطة ذهبية */}
      <div
        className="mt-3.5 h-1.5 w-full rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={r.total}
        aria-valuenow={seen}
      >
        <div
          className="h-full min-w-2 rounded-full bg-gradient-to-l from-ludn-gold to-ludn-gold/75 transition-[width] duration-500 ease-out"
          style={{ width: `${Math.min(100, (seen / total) * 100)}%` }}
        />
      </div>

      {showNames && pills.length > 0 && (
        <ul className={`mt-4 flex flex-wrap ${few ? "justify-center gap-2.5" : "gap-2"}`}>
          {pills.map(({ id, gone }) => (
            <li
              key={id}
              className={`flex min-w-0 max-w-full items-center rounded-full transition-all duration-200 ease-out ${
                gone !== null ? "scale-75 opacity-0" : "scale-100 opacity-100"
              } ${
                few
                  ? "bg-ludn-gold px-4 py-2 text-[16px] font-black text-ludn-gold-ink ring-4 ring-ludn-gold/20 shadow-[0_0_18px_rgba(226,184,74,0.35)]"
                  : "border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[14px] font-bold text-ludn-fg"
              }`}
            >
              <span className="min-w-0 truncate whitespace-nowrap">{ctx.nameOf(id)}</span>
            </li>
          ))}
        </ul>
      )}

      {showNames && seen === 0 && <p className="mt-4 text-center text-[13px] font-bold text-ludn-muted">كل ما واحد شاف دوره، يختفي اسمه</p>}
    </section>
  );
}
