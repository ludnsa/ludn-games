"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Play, BookOpen, X, Gift } from "lucide-react";
import { QUIZ_GAME } from "@/constants/quiz-grid";
import { MAFIA_CONFIG, MAFIA_GAME, mafiaCardSrc, mafiaIconSrc } from "@/constants/mafia";
import { MADAQESH_GAME } from "@/constants/madaqesh";
import { LETTERS_HIVE_GAME } from "@/constants/letters-hive";
import { GameArt, type GameArtKind } from "./GameArt";

const CATEGORIES = ["الكل", "أدوار سرية", "أسئلة", "استراتيجية", "أدوات"] as const;
type Category = Exclude<(typeof CATEGORIES)[number], "الكل">;

interface HomeGame {
  id: string;
  title: string;
  path: string;
  description: string;
  /** سطر واحد تحت الغلاف */
  line: string;
  category: Category;
  /** معلومات سريعة تطلع بورقة اللعبة */
  meta: string[];
  /**
   * رسمة اللعبة، أو غلاف مؤقت مرسوم بالكود لين تجهز رسمتها.
   * full: الرسمة مقاسها من البطاقة (4:5) فتطلع كاملة بدون قص وتكبير.
   */
  cover: { img: string; full?: boolean } | { art: GameArtKind };
  badge?: { text: string; icon: string };
  /** مجانية دايماً (ما تحتاج اشتراك) — يطلع عليها تاق */
  free?: boolean;
}

const GAMES: HomeGame[] = [
  {
    id: MAFIA_GAME.id,
    title: MAFIA_GAME.title,
    path: MAFIA_GAME.path,
    description: MAFIA_GAME.description,
    line: "مين المافيا بينكم؟ ليل ونهار، وكل واحد على جواله.",
    category: "أدوار سرية",
    meta: [`من ${MAFIA_CONFIG.MIN_PLAYERS} إلى ${MAFIA_CONFIG.MAX_PLAYERS} لاعب`, "كل واحد بجواله", "فئة جديدة: الشيخ"],
    cover: { img: mafiaCardSrc("mafia") },
    badge: { text: "جديد: الشيخ", icon: mafiaIconSrc("sheikh") },
  },
  {
    id: QUIZ_GAME.id,
    title: QUIZ_GAME.title,
    path: QUIZ_GAME.path,
    description: QUIZ_GAME.description,
    line: "لوحة فئات، وفريقين يتنافسون عليها.",
    category: "أسئلة",
    meta: ["فريقين", "أسئلة بـ 200 و400 و600"],
    cover: { art: "quiz" },
  },
  {
    id: LETTERS_HIVE_GAME.id,
    title: LETTERS_HIVE_GAME.title,
    path: LETTERS_HIVE_GAME.path,
    description: LETTERS_HIVE_GAME.description,
    line: "سؤال لكل حرف، وأول فريق يوصّل خطه يفوز.",
    category: "أسئلة",
    meta: ["مقدم وفريقين", "شاشة عرض"],
    cover: { art: "hive" },
  },
  {
    id: "auction",
    title: "المزاد",
    path: "/games/auction",
    description: "لعبة مزادية وتكتيكية لتحديد الفائز بالمزايدة على السؤال الصحيح.",
    line: "زايد على السؤال اللي تعرف جوابه.",
    category: "أسئلة",
    meta: ["فرق", "مزايدة"],
    cover: { art: "auction" },
  },
  {
    id: "castle-war",
    title: "حرب القلاع",
    path: "/games/castle-war",
    description: "لعبة استراتيجية تعتمد على الهجوم والدفاع، دمر قلاع خصمك لتنتصر.",
    line: "هاجم ودافع، ودمّر قلاع خصمك.",
    category: "استراتيجية",
    meta: ["جوالات اللاعبين", "شاشة عرض"],
    cover: { img: "/games/castle-war/castle-war-cover.webp", full: true },
  },
  {
    id: "world-domination",
    title: "السيطرة على العالم",
    path: "/games/world-domination",
    description: "لعبة استراتيجية وتكتيكية لفرض نفوذك والسيطرة على القارات وتوسيع إمبراطوريتك.",
    line: "وسّع نفوذك وسيطر على القارات.",
    category: "استراتيجية",
    meta: ["فرق", "الجمهور يشارك"],
    cover: { img: "/games/world-domination/world-domination-cover.webp", full: true },
  },
  {
    id: MADAQESH_GAME.id,
    title: MADAQESH_GAME.title,
    path: MADAQESH_GAME.path,
    description: MADAQESH_GAME.description,
    line: "سوم وتوزيع ومداقشة، والأرصدة تنحسب لحالها.",
    category: "أدوات",
    meta: ["على جوالات الكل"],
    cover: { art: "madaqesh" },
  },
];

const countText = (n: number) => (n === 1 ? "لعبة وحدة" : n === 2 ? "لعبتين" : `${n} ألعاب`);

/** الغلاف: صورة اللعبة مقصوصة على الشخصية، أو الرسمة المؤقتة */
function GameCover({ game, wide = false }: { game: HomeGame; wide?: boolean }) {
  if ("art" in game.cover) return <GameArt kind={game.cover.art} wide={wide} />;
  const { img, full } = game.cover;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={img}
      alt=""
      loading="lazy"
      draggable={false}
      className="absolute inset-0 w-full h-full object-cover"
      style={
        wide
          ? { objectPosition: "50% 32%", transform: full ? undefined : "scale(1.15)" }
          : full
            ? undefined
            : { objectPosition: "50% 20%", transform: "scale(1.3)", transformOrigin: "50% 58%" }
      }
    />
  );
}

function GameTile({ game, onOpen }: { game: HomeGame; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${game.title}: ${game.line}`}
        className="group w-full text-start grid gap-2 transition-transform active:scale-[0.97]"
      >
        <span className="ludn-cover-shade ludn-shadow relative isolate block aspect-[4/5] rounded-[18px] overflow-hidden transition-transform md:group-hover:-translate-y-1">
          <GameCover game={game} />
          {/* flex-wrap: بالجوالات الضيقة "مجانية" تنزل تحت التصنيف بدل ما تركب عليه */}
          <span className="absolute top-2.5 inset-x-2.5 z-[2] flex flex-wrap justify-between gap-1">
            <span className="text-[11.5px] font-bold text-white px-2.5 py-0.5 rounded-full bg-black/45 backdrop-blur-sm">
              {game.category}
            </span>
            {game.free && (
              <span className="text-[11.5px] font-black px-2.5 py-0.5 rounded-full bg-[#56c98d] text-[#05230f]">
                مجانية
              </span>
            )}
          </span>
          {game.badge && (
            <span className="absolute bottom-11 start-2.5 z-[2] inline-flex items-center gap-1.5 text-[11.5px] font-black text-[#1b1404] bg-[#e2b84a] ps-1 pe-2.5 py-0.5 rounded-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={game.badge.icon} alt="" className="w-[22px] h-[22px] rounded-full" />
              {game.badge.text}
            </span>
          )}
          <span className="absolute inset-x-3 bottom-2.5 z-[2] font-display text-[21px] leading-tight text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
            {game.title}
          </span>
        </span>
        <span className="text-[13px] leading-relaxed font-semibold text-ludn-muted px-0.5">{game.line}</span>
      </button>
    </li>
  );
}

/** ورقة اللعبة: تطلع من تحت (على body مباشرة عشان ما ينحبس تحت الهيدر وشريط التبويب) */
function GameSheet({ game, onClose }: { game: HomeGame; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/60 animate-in fade-in duration-150" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-sheet-title"
        className="ludn-sheet-up absolute inset-x-0 bottom-0 mx-auto max-w-xl grid gap-3 max-h-[88dvh] overflow-y-auto overscroll-contain bg-ludn-surface text-ludn-fg border border-b-0 border-ludn-line rounded-t-[26px] shadow-[0_-20px_50px_rgba(0,0,0,0.35)] px-4 pt-2.5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
      >
        <div aria-hidden className="w-11 h-1.5 rounded-full bg-ludn-line justify-self-center" />
        <div className="relative aspect-video rounded-[18px] overflow-hidden">
          <GameCover game={game} wide />
        </div>
        <h3 id="game-sheet-title" className="font-display text-[30px] leading-tight">
          {game.title}
        </h3>
        <p className="text-ludn-muted font-semibold leading-relaxed">{game.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {game.free && (
            <span className="text-[12.5px] font-black px-3 py-0.5 rounded-full bg-[#56c98d] text-[#05230f]">مجانية</span>
          )}
          {[game.category, ...game.meta].map((m) => (
            <span key={m} className="text-[12.5px] font-bold px-3 py-0.5 rounded-full bg-ludn-surface-2">
              {m}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-[1.4fr_1fr] gap-2">
          <Link
            href={game.path}
            className="min-h-[52px] rounded-2xl bg-ludn-gold text-ludn-gold-ink font-black text-base flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          >
            <Play size={20} className="fill-current" /> ابدأ اللعبة
          </Link>
          <Link
            href="/guides"
            className="min-h-[52px] rounded-2xl bg-ludn-surface border border-ludn-line font-black text-base flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          >
            <BookOpen size={19} /> طريقة اللعب
          </Link>
        </div>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          aria-label="إغلاق"
          className="absolute top-3.5 end-4 w-10 h-10 rounded-2xl border border-ludn-line bg-ludn-surface grid place-items-center"
        >
          <X size={20} />
        </button>
      </section>
    </div>,
    document.body
  );
}

export const GamesSection = () => {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("الكل");
  const [openId, setOpenId] = useState<string | null>(null);
  const shown = GAMES.filter((g) => category === "الكل" || g.category === category);
  const open = GAMES.find((g) => g.id === openId) ?? null;
  const close = useCallback(() => setOpenId(null), []);

  return (
    <section id="games-section" className="w-full max-w-6xl mx-auto px-4 py-8 md:py-12 grid gap-4">
      {/* flex-wrap: بالجوالات الضيقة تاق التجربة ينزل تحت العنوان بدل ما يطلع برا الشاشة */}
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-2">
        <h2 className="font-display text-[30px] md:text-[40px] leading-tight text-ludn-fg">الألعاب</h2>
        <span className="text-sm font-bold text-ludn-muted">{countText(shown.length)}</span>
        <span className="ms-auto self-center inline-flex items-center gap-1.5 text-[12.5px] font-black px-3 py-1 rounded-full bg-[#56c98d] text-[#05230f]">
          <Gift size={14} /> تجربة مجانية لكل لعبة
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1" role="group" aria-label="تصفية الألعاب">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={c === category}
            onClick={() => setCategory(c)}
            className={`shrink-0 h-[38px] px-4 rounded-full border text-sm font-bold transition-colors ${
              c === category ? "bg-ludn-fg text-ludn-bg border-ludn-fg" : "bg-ludn-surface text-ludn-muted border-ludn-line"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-4 md:gap-x-5 md:gap-y-6">
        {shown.map((game) => (
          <GameTile key={game.id} game={game} onOpen={() => setOpenId(game.id)} />
        ))}
      </ul>

      {open && <GameSheet game={open} onClose={close} />}
    </section>
  );
};
