"use client";
import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Sparkles } from "lucide-react";
import { SitePage, PageHeading } from "@/components/home/SitePage";
import { BTN_GOLD, CARD } from "@/components/home/ui";
import { GuideContent } from "@/components/guides/GuideContent";
import { EXTRA_GUIDES, GAME_GUIDES, getGuide, type GameGuide } from "@/lib/guides";
import { HOME_GAMES } from "@/components/home/homeGames";

/**
 * دليل الألعاب: كل الألعاب من ملفات التعليمات (lib/guides).
 * ?game=<اللعبة> يفتح دليلها، والرابط يتغير لما تبدّل اللعبة. بدون لعبة (أو لعبة مو موجودة): قائمة الألعاب.
 */

const coverOf = (id: string) => {
  const g = HOME_GAMES.find((h) => h.id === id);
  return g && "img" in g.cover ? g.cover.img : null;
};
const pathOf = (id: string) => HOME_GAMES.find((h) => h.id === id)?.path ?? null;
// نفس ترتيب الألعاب بالرئيسية (HOME_GAMES)، و"تحديات الحكم والفريق" آخر شي
const homeRank = (id: string) => {
  const i = HOME_GAMES.findIndex((h) => h.id === id);
  return i < 0 ? HOME_GAMES.length : i;
};
const ALL_GUIDES = [...[...GAME_GUIDES].sort((a, b) => homeRank(a.id) - homeRank(b.id)), ...EXTRA_GUIDES];

function GuideCover({ id, className = "" }: { id: string; className?: string }) {
  const img = coverOf(id);
  if (img) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={img} alt="" draggable={false} className={`absolute inset-0 w-full h-full object-cover object-[50%_32%] ${className}`} />;
  }
  return (
    <div aria-hidden className="ludn-art ludn-art-quiz ludn-art-wide">
      <Sparkles strokeWidth={1.5} className="w-[24%]!" />
    </div>
  );
}

/** قائمة الألعاب (لما ينفتح الدليل بدون لعبة) */
function GuidesList() {
  return (
    <ul className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {ALL_GUIDES.map((g) => (
        <li key={g.id}>
          <Link
            href={`/guides?game=${g.id}`}
            className={`${CARD} group block overflow-hidden h-full transition-transform active:scale-[0.98] md:hover:-translate-y-1`}
          >
            <span className="relative block aspect-[16/10]">
              <GuideCover id={g.id} />
            </span>
            <span className="block p-3 md:p-4">
              <span className="block font-display text-[21px] leading-tight">{g.title}</span>
              {g.tagline && <span className="block mt-1 text-ludn-muted font-semibold text-sm leading-snug line-clamp-2">{g.tagline}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function GuideView({ guide }: { guide: GameGuide }) {
  // على الجوال الألعاب بشريط يتمرر بالعرض: نخلي اللعبة المختارة ظاهرة فيه
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    tabsRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [guide.id]);
  const path = pathOf(guide.id);

  return (
    <div className="grid gap-5 lg:grid-cols-[17rem_1fr] lg:gap-8 lg:items-start">
      <nav ref={tabsRef} aria-label="الألعاب" className="min-w-0 flex lg:flex-col gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1 lg:m-0 lg:p-0 lg:overflow-visible lg:sticky lg:top-24">
        {ALL_GUIDES.map((g) => {
          const active = g.id === guide.id;
          return (
            <Link
              key={g.id}
              href={`/guides?game=${g.id}`}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 flex items-center gap-2.5 h-11 lg:h-14 px-4 rounded-full lg:rounded-2xl border font-black text-sm lg:text-base text-start transition-colors ${
                active ? "bg-ludn-fg text-ludn-bg border-ludn-fg" : "bg-ludn-surface text-ludn-muted border-ludn-line hover:text-ludn-fg"
              }`}
            >
              <span>{g.title}</span>
              {active && <ChevronLeft size={18} className="ms-auto hidden lg:block" />}
            </Link>
          );
        })}
      </nav>

      <article key={guide.id} className={`${CARD} min-w-0 overflow-hidden animate-in fade-in duration-300`}>
        <div className="relative h-36 md:h-48">
          <GuideCover id={guide.id} />
        </div>
        <div className="p-4 md:p-8 grid gap-6">
          <div className="grid gap-2">
            <h2 className="font-display text-[32px] md:text-[40px] leading-tight">{guide.title}</h2>
            {guide.tagline && <p className="text-ludn-muted font-semibold leading-relaxed">{guide.tagline}</p>}
          </div>
          <GuideContent guide={guide} />
          {path && (
            <Link href={path} className={`${BTN_GOLD} w-full sm:w-fit sm:px-10 sm:justify-self-center`}>
              العب الآن
              <ChevronLeft size={20} />
            </Link>
          )}
        </div>
      </article>
    </div>
  );
}

function GuidesInner() {
  const params = useSearchParams();
  const guide = getGuide(params.get("game"));
  return (
    <SitePage width="max-w-6xl">
      <PageHeading
        title={<>دليل الألعاب <span className="text-ludn-gold-text">الاحترافي</span></>}
        subtitle={guide ? "تعرف على قوانين الألعاب، استراتيجيات الفوز، وكيف تتفوق على أصدقائك في منصتنا." : "اختر اللعبة وتعرّف على طريقة لعبها."}
      />
      {guide ? <GuideView guide={guide} /> : <GuidesList />}
    </SitePage>
  );
}

export default function GameGuidesPage() {
  return (
    <Suspense fallback={<SitePage width="max-w-6xl"><div className={`${CARD} h-96 animate-pulse`} /></SitePage>}>
      <GuidesInner />
    </Suspense>
  );
}
