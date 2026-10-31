import React from "react";
import Link from "next/link";
import { Swords, Globe, Gavel, LayoutGrid, Calculator, Hexagon } from "lucide-react";
import { QUIZ_GAME } from "@/constants/quiz-grid";
import { MAFIA_GAME, mafiaIconSrc } from "@/constants/mafia";
import { MADAQESH_GAME } from "@/constants/madaqesh";
import { LETTERS_HIVE_GAME } from "@/constants/letters-hive";

const LINK = "text-ludn-fg/90 hover:text-ludn-gold-text transition-colors";
const GAME_ICON = "w-[18px] h-[18px] shrink-0 text-ludn-gold-text";

export const Footer = ({ scrollToSection }: { scrollToSection?: (e: React.MouseEvent<HTMLAnchorElement>, id: string) => void }) => {
  // بالرئيسية تنزل للقسم، وبباقي الصفحات ترجع للرئيسية على نفس القسم
  const section = (id: string) =>
    scrollToSection
      ? { href: `#${id}`, onClick: (e: React.MouseEvent<HTMLAnchorElement>) => scrollToSection(e, id) }
      : { href: `/#${id}` };

  return (
    <footer className="w-full border-t border-ludn-line mt-8">
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-6 grid gap-8 md:grid-cols-3">
        <div className="grid gap-3 content-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ludn-logo.webp" alt="منصة ألعاب لدن" width={51} height={44} className="h-11 w-auto" />
          <p className="text-ludn-muted font-semibold text-sm leading-relaxed max-w-xs">
            منصة ألعاب تفاعلية تجمع العائلة والأصدقاء في لحظات مليئة بالحماس والضحك.
          </p>
          <div className="flex items-center gap-2.5">
            <a
              href="https://ludn.sa/"
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-4 rounded-xl bg-ludn-surface border border-ludn-line text-ludn-fg font-black text-sm flex items-center gap-2"
            >
              <Globe size={17} className="text-ludn-gold-text" /> موقع لدن
            </a>
            <a
              href="https://x.com/LudnSA"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="حساب لدن على X"
              className="w-10 h-10 rounded-xl bg-ludn-surface border border-ludn-line text-ludn-fg grid place-items-center"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.95H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 md:col-span-2">
          <div className="grid gap-3 content-start">
            <h3 className="font-display text-xl text-ludn-fg">روابط سريعة</h3>
            <ul className="grid gap-2.5 font-bold text-sm">
              <li><a {...section("hero")} className={LINK}>الرئيسية</a></li>
              <li><a {...section("about-section")} className={LINK}>عن المنصة</a></li>
              <li><a {...section("games-section")} className={LINK}>الألعاب</a></li>
              <li><a {...section("contact-section")} className={LINK}>تواصل معنا</a></li>
              <li><Link href="/terms" className={LINK}>الشروط والأحكام</Link></li>
              <li><Link href="/privacy" className={LINK}>سياسة الخصوصية</Link></li>
              <li><Link href="/guides" className={LINK}>كيف تلعب؟ (دليل الألعاب)</Link></li>
            </ul>
          </div>
          <div className="grid gap-3 content-start">
            <h3 className="font-display text-xl text-ludn-fg">الألعاب</h3>
            <ul className="grid gap-2.5 font-bold text-sm">
              <li><Link href="/games/castle-war" className={`${LINK} flex items-center gap-2`}><Swords className={GAME_ICON} /> حرب القلاع</Link></li>
              <li><Link href="/games/world-domination" className={`${LINK} flex items-center gap-2`}><Globe className={GAME_ICON} /> السيطرة على العالم</Link></li>
              <li><Link href="/games/auction" className={`${LINK} flex items-center gap-2`}><Gavel className={GAME_ICON} /> حرب المزايدات</Link></li>
              <li><Link href={QUIZ_GAME.path} className={`${LINK} flex items-center gap-2`}><LayoutGrid className={GAME_ICON} /> {QUIZ_GAME.title}</Link></li>
              <li>
                <Link href={MAFIA_GAME.path} className={`${LINK} flex items-center gap-2`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mafiaIconSrc("mafia")} alt="" className="w-5 h-5 shrink-0" /> {MAFIA_GAME.title}
                </Link>
              </li>
              <li><Link href={MADAQESH_GAME.path} className={`${LINK} flex items-center gap-2`}><Calculator className={GAME_ICON} /> {MADAQESH_GAME.title}</Link></li>
              <li><Link href={LETTERS_HIVE_GAME.path} className={`${LINK} flex items-center gap-2`}><Hexagon className={GAME_ICON} /> {LETTERS_HIVE_GAME.title}</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-ludn-line px-4 py-5 text-center">
        <p className="text-xs font-bold text-ludn-muted">2026 منصة ألعاب لدن - جميع الحقوق محفوظة ©</p>
      </div>
    </footer>
  );
};
