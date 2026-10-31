"use client";

import React from "react";
import { Play } from "lucide-react";
import { mafiaCardSrc } from "@/constants/mafia";
import { GameArt } from "./GameArt";

const FAN_CARD = "relative shrink-0 aspect-[512/752] rounded-[14px] overflow-hidden ludn-shadow";

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
      {/* min-w-0: المروحة أعرض شوي من الجوالات الصغيرة — تطلع برا الحواف بدل ما توسّع العمود كله */}
      <div aria-hidden className="relative min-w-0 flex justify-center items-end h-[214px] lg:h-[330px] pb-1.5 lg:col-start-2 lg:row-start-1">
        <div className={`${FAN_CARD} ludn-fan-r w-[116px] lg:w-[160px]`}>
          <GameArt kind="quiz" />
        </div>
        <div className={`${FAN_CARD} ludn-fan-mid z-[2] w-[136px] lg:w-[188px]`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mafiaCardSrc("mafia")} alt="" draggable={false} className="w-full h-full object-cover" />
        </div>
        <div className={`${FAN_CARD} ludn-fan-l w-[116px] lg:w-[160px]`}>
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

        <div className="grid gap-3.5 lg:grid-cols-[auto_1fr] lg:items-end">
          <a
            href="#games-section"
            onClick={(e) => scrollToSection(e, "games-section")}
            className="min-h-[52px] px-7 rounded-2xl bg-ludn-gold text-ludn-gold-ink font-black text-base flex items-center justify-center gap-2 shadow-[0_8px_22px_var(--ludn-glow)] transition-transform active:scale-[0.98]"
          >
            <Play size={20} className="fill-current" /> ابدأ اللعب
          </a>

          <form onSubmit={onJoinSubmit} className="grid gap-1.5 rounded-[18px] bg-ludn-surface border border-ludn-line p-3">
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
