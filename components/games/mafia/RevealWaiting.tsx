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
 */
function useLeavingPills(ids: string[]): Pill[] {
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
  return mem.items;
}

/**
 * مين باقي ما شاف دوره: عنوان وعدّاد "X من Y" (X = اللي شافوا) وشريط تقدم ذهبي يمتلي من اليمين.
 * المنشئ يشوف الأسماء بكبسولات تلتف على أكثر من سطر — كل ما واحد ضغط "شفت دوري" تختفي كبسولته،
 * ولما يبقى 3 أو أقل: "ننتظر هذول بس" والكبسولات تكبر وتصير ذهبية بالنص. الباقين يشوفون العدد والشريط بس.
 */
export default function RevealWaiting({ ctx }: { ctx: MafiaGameCtx }) {
  const r = ctx.revealReady;
  const myId = ctx.me?.id;
  const waiting = (r?.waiting ?? []).filter((id) => !(ctx.iSawRole && id === myId) && ctx.nameOf(id));
  const showNames = ctx.isHost && Boolean(r?.waiting);
  const pills = useLeavingPills(showNames ? waiting : []);
  if (!r) return null;

  const total = Math.max(r.total, 1);
  const left = r.waiting ? waiting.length : Math.max(0, r.total - r.done);
  if (left === 0) return null;
  const seen = Math.max(0, r.total - left);
  const few = left <= FEW_LEFT;
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
      className={`w-full min-w-0 rounded-2xl border p-3 animate-in fade-in transition-colors duration-300 ${
        few ? "border-ludn-gold/45 bg-ludn-gold/8" : "border-ludn-line bg-ludn-surface-2/70"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-1.5 text-[15px] font-black text-ludn-fg">
          <Hourglass size={17} className={`shrink-0 ${few ? "text-ludn-gold" : "text-ludn-muted"}`} />
          <span className="truncate">{title}</span>
        </h3>
        <span className="shrink-0 text-[13px] font-black tabular-nums text-ludn-gold-text" aria-live="polite">
          {seen} من {r.total}
        </span>
      </div>

      {/* شريط التقدم: يمتلي من اليمين (الصفحة من اليمين لليسار) */}
      <div
        className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={r.total}
        aria-valuenow={seen}
      >
        <div
          className="h-full rounded-full bg-ludn-gold transition-[width] duration-500 ease-out"
          style={{ width: `${Math.min(100, (seen / total) * 100)}%` }}
        />
      </div>

      {showNames && pills.length > 0 && (
        <ul className={`mt-3 flex flex-wrap gap-1.5 ${few ? "justify-center gap-2" : ""}`}>
          {pills.map(({ id, gone }) => (
            <li
              key={id}
              className={`flex min-w-0 max-w-full items-center rounded-full font-black transition-all duration-200 ease-out ${
                gone !== null ? "scale-75 opacity-0" : "scale-100 opacity-100"
              } ${
                few
                  ? "bg-ludn-gold px-4 py-1.5 text-[16px] text-ludn-gold-ink shadow-[0_0_14px_var(--ludn-glow)]"
                  : "bg-white/10 px-3 py-1 text-[13px] text-ludn-fg"
              }`}
            >
              <span className="min-w-0 truncate whitespace-nowrap">{ctx.nameOf(id)}</span>
            </li>
          ))}
        </ul>
      )}

      {showNames && seen === 0 && <p className="mt-2.5 text-center text-xs font-bold text-ludn-muted">كل ما واحد شاف دوره، يختفي اسمه</p>}
    </section>
  );
}
