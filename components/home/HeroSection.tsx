"use client";

import React from "react";
import { Play } from "lucide-react";
import { mafiaCardSrc } from "@/constants/mafia";
import { GameArt } from "./GameArt";

const FAN_CARD = "relative shrink-0 aspect-[512/752] rounded-[14px] overflow-hidden ludn-shadow";
// العرض مربوط بالشاشة عشان الأربع بطاقات يدخلون في الجوالات الصغيرة بدون ما يطلعون برا الحواف
const FAN_INNER = "w-[min(29.7vw,136px)] lg:w-[min(14vw,160px)]";
const FAN_OUTER = "w-[min(25vw,116px)] lg:w-[min(11.8vw,134px)]";

export const HeroSection = ({
  scrollToSection,
  joinCode,
  joinError,
  onJoinCodeChange,
  onJoinSubmit,
}: {
  scrollToSection: (e: React.MouseEvent<HTMLAnchorElement>, id: string) => void;
  joinCode: string;
  joinError: string;
  onJoinCodeChange: (value: string) => void;
  onJoinSubmit: (e: React.FormEvent) => void;
}) => {
  return (
    <section
      id="hero"
      className="relative w-full max-w-6xl mx-auto px-4 pt-[calc(5.5rem+env(safe-area-inset-top,0px))] lg:pt-32 pb-8 lg:pb-14 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-x-10"
    >
      <div aria-hidden className="ludn-lattice absolute inset-0 pointer-events-none" />

      {/* مروحة بطاقات من الألعاب */}
      {/* min-w-0: عرض البطاقات المتراكبة أكبر من مجموعها الظاهر، فما نخليها توسّع العمود */}
      <div aria-hidden className="relative min-w-0 flex justify-center items-end lg:items-center h-[min(47vw,214px)] lg:h-[330px] pb-1.5 lg:col-start-2 lg:row-start-1">
        {/* غلاف السيطرة على العالم بنفس إطار حرب القلاع. بدون شريط اسم: البطاقة الخارجية أغلبها تحت مافيا فالاسم ما يبان */}
        <div className={`${FAN_CARD} ludn-fan4-outer-r ${FAN_OUTER} border-2 border-[#c0ada0] bg-[#0b0c10]`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/games/world-domination/world-domination-cover.webp" alt="" draggable={false} className="w-full h-full object-cover object-[70%_50%]" />
        </div>
        <div className={`${FAN_CARD} ludn-fan4-inner-r z-[2] ${FAN_INNER}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mafiaCardSrc("mafia")} alt="" draggable={false} className="w-full h-full object-cover" />
        </div>
        {/* نفس تقسيمة بطاقة مافيا: إطار، ورسمة، وشريط الاسم تحت */}
        <div className={`${FAN_CARD} ludn-fan4-inner-l z-[3] ${FAN_INNER} [container-type:inline-size] flex flex-col border-2 border-[#c0ada0] bg-[#0b0c10]`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/games/castle-war/castle-war-cover.webp" alt="" draggable={false} className="flex-1 min-h-0 w-full object-cover object-[50%_30%]" />
          <div className="h-[21%] grid place-items-center whitespace-nowrap font-display text-[20cqw] leading-none text-white">حرب القلاع</div>
        </div>
        <div className={`${FAN_CARD} ludn-fan4-outer-l ${FAN_OUTER}`}>
          <GameArt kind="hive" />
        </div>
      </div>

      <div className="relative grid gap-4 min-w-0 lg:col-start-1 lg:row-start-1">
        <p className="text-[13px] font-bold tracking-wide text-ludn-gold-text">ألعاب جماعية · بدون تحميل</p>
        <h1 className="font-display text-[clamp(36px,10vw,58px)] leading-[1.12] text-ludn-fg text-balance">
          اجمع الربع والعبوا من جوالاتكم
        </h1>
        <p className="text-base font-semibold leading-relaxed text-ludn-muted max-w-[34em]">
          ألعاب جماعية للعائلة والأصدقاء والدوام. واحد ينشئ الغرفة، والباقين يدخلون بالكود من جوالاتهم.
        </p>

        {/* grid-cols-1 (minmax(0,1fr)) بالعمودين: خانة الكود لها عرض افتراضي، وبدونها تفرض على العمود أعرض من الجوالات الضيقة */}
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[auto_1fr] lg:items-end">
          <a
            href="#games-section"
            onClick={(e) => scrollToSection(e, "games-section")}
            className="min-h-[52px] px-7 rounded-2xl bg-ludn-gold text-ludn-gold-ink font-black text-base flex items-center justify-center gap-2 shadow-[0_8px_22px_var(--ludn-glow)] transition-transform active:scale-[0.98]"
          >
            <Play size={20} className="fill-current" /> ابدأ اللعب
          </a>

          <form onSubmit={onJoinSubmit} className="grid grid-cols-1 gap-1.5 rounded-[18px] bg-ludn-surface border border-ludn-line p-3">
            <label htmlFor="join-code" className="text-[13px] font-bold text-ludn-muted">
              عندك كود غرفة؟
            </label>
            <div className="flex gap-2">
              <input
                id="join-code"
                type="text"
                maxLength={5}
                value={joinCode}
                onChange={(e) => onJoinCodeChange(e.target.value)}
                placeholder="مثال: C7X9K"
                dir="ltr"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="flex-1 min-w-0 h-12 rounded-xl border border-ludn-line bg-ludn-surface-2 px-3.5 text-center text-lg font-black tracking-[0.3em] uppercase text-ludn-fg placeholder:tracking-normal placeholder:text-sm placeholder:font-bold placeholder:text-ludn-muted outline-none focus:border-ludn-gold transition-colors"
              />
              <button
                type="submit"
                disabled={joinCode.trim().length !== 5}
                className="h-12 px-5 rounded-xl bg-ludn-green text-white font-black transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                دخول
              </button>
            </div>
            {joinError && <p className="text-[12.5px] font-bold text-rose-500">{joinError}</p>}
          </form>
        </div>
      </div>
    </section>
  );
};
