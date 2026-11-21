import { Fragment } from "react";
import { BookOpen, Clock, Crown, HelpCircle, ListChecks, ListOrdered, Sparkles, Target, Trophy, Users, Zap } from "lucide-react";
import type { GameGuide, GuideItem, GuidePoint } from "@/lib/guides";

/**
 * محتوى تعليمات لعبة — نفس العرض بصفحة /guides وبنافذة "طريقة اللعب".
 * أي قسم فاضي ما يطلع. itemIds: لو موجود، تطلع البطاقات اللي معرّفها بالقائمة بس (مثل أدوار غرفة المافيا).
 */

const SECTION = "grid gap-3";
const H = "flex items-center gap-2 font-black text-[17px] md:text-lg text-ludn-fg";
const ICON = "shrink-0 text-ludn-gold-text";
const TILE = "rounded-2xl bg-ludn-surface-2/70 p-3 md:p-3.5";
const TEXT = "text-ludn-fg/90 font-semibold text-[15px] leading-relaxed";
const STAT = "rounded-2xl bg-ludn-surface-2 p-3 md:p-3.5 flex items-center gap-3 min-w-0";
const DOT = "mt-2.5 w-1.5 h-1.5 shrink-0 rounded-full bg-ludn-gold";

/** نص فيه **غامق** */
export function GuideText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-black text-ludn-fg">
            {p}
          </strong>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

/** قائمة نقاط (وممكن تحت كل نقطة نقاط ثانية) */
export function GuidePoints({ points, ordered, className = "" }: { points: readonly GuidePoint[]; ordered?: boolean; className?: string }) {
  const List = ordered ? "ol" : "ul";
  return (
    <List className={`grid gap-1.5 ${className}`}>
      {points.map((p, i) => {
        const text = typeof p === "string" ? p : p.text;
        return (
          <li key={i} className="flex gap-2.5 items-start">
            {ordered ? (
              <span className="shrink-0 mt-0.5 min-w-6 h-6 px-1 rounded-lg bg-ludn-gold/20 text-ludn-gold-text font-black text-[13px] grid place-items-center">{i + 1}</span>
            ) : (
              <span aria-hidden className={DOT} />
            )}
            <div className="min-w-0 grid gap-1.5">
              <span>
                <GuideText text={text} />
              </span>
              {typeof p !== "string" && p.points.length > 0 && <GuidePoints points={p.points} ordered={p.ordered} />}
            </div>
          </li>
        );
      })}
    </List>
  );
}

/** أسطر البطاقة بالترتيب (الشرح ثم النقاط)، بدون التفرّعات */
export function guideItemLines(item: GuideItem): string[] {
  return [...(item.body ? [item.body] : []), ...(item.points ?? []).map((p) => (typeof p === "string" ? p : p.text))];
}

export function GuideItemIcon({ icon, size = 44 }: { icon?: string; size?: number }) {
  if (!icon) return null;
  if (icon.startsWith("/")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={icon} alt="" width={size} height={size} draggable={false} className="shrink-0 rounded-xl object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span aria-hidden className="shrink-0 grid place-items-center rounded-xl bg-ludn-surface text-2xl" style={{ width: size, height: size }}>
      {icon}
    </span>
  );
}

/** اسم البطاقة واللي بين قوسين جنبه */
export function GuideItemName({ item, className = "" }: { item: GuideItem; className?: string }) {
  return (
    <span className={`font-black text-ludn-fg ${className}`}>
      {item.name}
      {item.tag && <span className="text-ludn-muted font-bold text-[13px]"> ({item.tag})</span>}
    </span>
  );
}

/** شرح البطاقة: السطر والنقاط والتسلسل */
export function GuideItemBody({ item }: { item: GuideItem }) {
  return (
    <>
      {item.body && (
        <span className={`${TEXT} text-[14.5px]`}>
          <GuideText text={item.body} />
        </span>
      )}
      {item.points && item.points.length > 0 && <GuidePoints points={item.points} ordered={item.ordered} className={`${TEXT} text-[14.5px]`} />}
      {item.sequence && item.sequence.length > 0 && (
        <ol className="flex flex-wrap gap-1.5 mt-0.5" aria-label={item.name}>
          {item.sequence.map((c) => (
            <li key={c} className="px-2.5 py-1.5 min-w-9 text-center rounded-xl bg-[#f6f1e4] text-[#1a1204] border border-[#d6a531]/60 font-black text-sm">
              {c}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

export function GuideItemCard({ item }: { item: GuideItem }) {
  return (
    <li className={`${TILE} flex gap-3 items-start`}>
      <GuideItemIcon icon={item.icon} />
      <div className="min-w-0 grid gap-1">
        <GuideItemName item={item} />
        <GuideItemBody item={item} />
      </div>
    </li>
  );
}

const has = <T,>(a?: readonly T[] | null): a is readonly T[] => !!a && a.length > 0;

function Extras({ guide, at }: { guide: GameGuide; at: "steps" | "items" }) {
  return (
    <>
      {guide.extras
        ?.filter((x) => (x.after ?? "items") === at)
        .map((x) => (
          <section key={x.title} className={SECTION}>
            <h3 className={H}>
              <BookOpen size={19} className={ICON} /> {x.title}
            </h3>
            {x.intro && <p className="text-ludn-muted font-bold text-sm -mt-1">{x.intro}</p>}
            {x.table && (
              <div className="overflow-hidden rounded-2xl border border-ludn-line">
                <table className="w-full text-start text-[14.5px]">
                  <thead className="bg-ludn-surface-2">
                    <tr>
                      {x.table.head.map((h) => (
                        <th key={h} scope="col" className="px-3 py-2 text-start font-black text-ludn-fg">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {x.table.rows.map((r, i) => (
                      <tr key={i} className="border-t border-ludn-line align-top">
                        {r.map((c, j) => (
                          <td key={j} className={`px-3 py-2 ${j === 0 ? "font-black text-ludn-fg whitespace-nowrap" : "font-semibold text-ludn-fg/90 leading-relaxed"}`}>
                            <GuideText text={c} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
    </>
  );
}

export function GuideContent({ guide, itemIds, itemsNote }: { guide: GameGuide; itemIds?: readonly string[] | null; itemsNote?: string }) {
  const items = itemIds ? guide.items?.filter((i) => !i.id || itemIds.includes(i.id)) : guide.items;
  const meta = guide.meta;
  return (
    <div className="grid gap-6">
      {meta && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          <div className={STAT}>
            <Users className="shrink-0 text-ludn-gold-text" />
            <div className="min-w-0">
              <div className="text-xs text-ludn-muted font-bold">عدد اللاعبين</div>
              <div className="font-black text-sm md:text-base">{meta.players}</div>
            </div>
          </div>
          <div className={STAT}>
            <Clock className="shrink-0 text-ludn-gold-text" />
            <div className="min-w-0">
              <div className="text-xs text-ludn-muted font-bold">مدة الجولة</div>
              <div className="font-black text-sm md:text-base">{meta.duration}</div>
            </div>
          </div>
          <div className={`${STAT} col-span-2 md:col-span-1`}>
            <Target className="shrink-0 text-ludn-gold-text" />
            <div className="min-w-0">
              <div className="text-xs text-ludn-muted font-bold">مستوى الصعوبة</div>
              <div className="font-black text-sm md:text-base">{meta.difficulty}</div>
            </div>
          </div>
        </div>
      )}

      {has(guide.quick) && (
        <section className="rounded-2xl border border-ludn-gold/40 bg-ludn-gold/10 p-4 grid gap-1.5" aria-label="باختصار">
          <h3 className={H}>
            <Zap size={19} className={ICON} /> باختصار
          </h3>
          {guide.quick.map((q, i) => (
            <p key={i} className={TEXT}>
              <GuideText text={q} />
            </p>
          ))}
        </section>
      )}

      {has(guide.needs) && (
        <section className={SECTION}>
          <h3 className={H}>
            <Users size={19} className={ICON} /> وش تحتاجون
          </h3>
          <div className={TILE}>
            <GuidePoints points={guide.needs} className={TEXT} />
          </div>
        </section>
      )}

      {has(guide.setup) && (
        <section className={SECTION}>
          <h3 className={H}>
            <ListChecks size={19} className={ICON} /> التجهيز
          </h3>
          <div className={TILE}>
            <GuidePoints points={guide.setup} ordered={guide.setupOrdered} className={TEXT} />
          </div>
        </section>
      )}

      {has(guide.steps) && (
        <section className={SECTION}>
          <h3 className={H}>
            <ListOrdered size={19} className={ICON} /> خطوات اللعب
          </h3>
          <ol className="grid gap-2">
            {guide.steps.map((s, i) => (
              <li key={i} className={`${TILE} flex gap-3 items-start`}>
                <span className="shrink-0 w-7 h-7 rounded-full bg-ludn-gold text-ludn-gold-ink font-black text-sm grid place-items-center">{i + 1}</span>
                <div className="min-w-0 pt-0.5 grid gap-1">
                  {s.title && <span className="font-black text-ludn-fg">{s.title}</span>}
                  {s.body && (
                    <span className={TEXT}>
                      <GuideText text={s.body} />
                    </span>
                  )}
                  {s.points && s.points.length > 0 && <GuidePoints points={s.points} className={TEXT} />}
                </div>
              </li>
            ))}
          </ol>
          {guide.stepsNote && (
            <p className="rounded-2xl border border-ludn-gold/30 bg-ludn-gold/5 px-3.5 py-2.5 text-ludn-fg/90 font-bold text-sm leading-relaxed">
              <GuideText text={guide.stepsNote} />
            </p>
          )}
        </section>
      )}

      <Extras guide={guide} at="steps" />

      {has(guide.win) && (
        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 grid gap-1.5">
          <h3 className={H}>
            <Trophy size={19} className="shrink-0 text-emerald-500" /> كيف تفوزون
          </h3>
          {guide.win.map((w, i) => (
            <p key={i} className={TEXT}>
              <GuideText text={w} />
            </p>
          ))}
        </section>
      )}

      {has(items) && (
        <section className={SECTION}>
          <h3 className={H}>
            <Sparkles size={19} className={ICON} /> {guide.itemsTitle ?? "البطاقات والوسائل"}
          </h3>
          {(itemsNote || guide.itemsIntro) && (
            <div className="grid gap-1 -mt-1">
              {itemsNote && <p className="text-ludn-muted font-bold text-sm">{itemsNote}</p>}
              {guide.itemsIntro && (
                <p className="text-ludn-fg/90 font-bold text-sm leading-relaxed">
                  <GuideText text={guide.itemsIntro} />
                </p>
              )}
            </div>
          )}
          <ul className="grid gap-2 md:grid-cols-2">
            {items.map((it) => (
              <GuideItemCard key={it.id ?? it.name} item={it} />
            ))}
          </ul>
        </section>
      )}

      <Extras guide={guide} at="items" />

      {has(guide.host) && (
        <section className={SECTION}>
          <h3 className={H}>
            <Crown size={19} className={ICON} /> ملاحظات للحكم والمنشئ
          </h3>
          <div className={TILE}>
            <GuidePoints points={guide.host} className={TEXT} />
          </div>
        </section>
      )}

      {has(guide.faq) && (
        <section className={SECTION}>
          <h3 className={H}>
            <HelpCircle size={19} className={ICON} /> أسئلة شائعة
          </h3>
          <div className="grid gap-2">
            {guide.faq.map((f, i) => (
              <details key={i} className={`${TILE} group`}>
                <summary className="cursor-pointer font-black text-ludn-fg list-none flex justify-between gap-3">
                  {f.q}
                  <span aria-hidden className="text-ludn-gold-text transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className={`${TEXT} mt-2`}>
                  <GuideText text={f.a} />
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

      {guide.tip && (
        <div className="rounded-2xl border border-ludn-gold/40 bg-ludn-gold/10 p-4 md:p-5 flex gap-3.5 items-start">
          <Sparkles size={26} className="shrink-0 text-ludn-gold-text mt-0.5" />
          <div>
            <h3 className="text-lg font-black text-ludn-gold-text mb-1">نصيحة المحترفين</h3>
            <p className="text-ludn-fg font-semibold leading-relaxed">
              <GuideText text={guide.tip} />
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
