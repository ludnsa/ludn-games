"use client";
import React, { useState } from "react";
import { MapPin, HelpCircle, Target, Clock, Timer, Activity, Layers, ChevronDown, ChevronUp } from "lucide-react";
import { QUIZ_GAME } from "@/constants/quiz-grid";
import { GameArt, type GameArtKind } from "@/components/home/GameArt";
import { PANEL } from "@/components/admin/layout/adminUi";

const StatItem = ({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl bg-ludn-surface-2 px-3 py-2.5">
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="shrink-0 text-ludn-gold-text">{icon}</span>
      <span className="text-sm font-bold text-ludn-fg/90 truncate">{title}</span>
    </div>
    <span className="font-display text-[22px] leading-none pt-1 tabular-nums">{count}</span>
  </div>
);

/** بطاقة لعبة: رسمتها + اسمها + وصف قصير، وتحتها الأرقام */
const GameCard = ({ art, title, subtitle, children }: { art: GameArtKind; title: string; subtitle: string; children: React.ReactNode }) => (
  <div className={`${PANEL} flex flex-col gap-4`}>
    <div className="flex items-center gap-3 pb-4 border-b border-ludn-line">
      <span className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden">
        <GameArt kind={art} />
      </span>
      <div className="min-w-0">
        <h4 className="text-lg font-black leading-tight">{title}</h4>
        <p className="text-xs font-bold text-ludn-muted">{subtitle}</p>
      </div>
    </div>
    {children}
  </div>
);

export default function AdminStatsSection({ wdStats, cwStats, awStats, quizStats }: any) {
  const [showWdDetails, setShowWdDetails] = useState(false);
  const quiz = quizStats || { categories: 0, questions: 0, q200: 0, q400: 0, q600: 0 };

  return (
    <div className="w-full grid gap-5">
      <div className={`${PANEL} flex flex-wrap items-center justify-between gap-4`}>
        <div className="flex items-center gap-3.5">
          <span className="w-12 h-12 shrink-0 rounded-2xl bg-ludn-surface-2 text-ludn-gold-text grid place-items-center">
            <Activity size={24} />
          </span>
          <div>
            <h3 className="font-display text-[24px] md:text-[28px] leading-tight">لوحة إحصائيات الألعاب</h3>
            <p className="text-ludn-muted font-bold text-sm">نظرة عامة على محتوى بنوك الأسئلة في المنصة</p>
          </div>
        </div>

        <div className="rounded-2xl bg-ludn-surface-2 px-5 py-3 text-center min-w-32">
          <div className="font-display text-[38px] leading-none pt-1 text-ludn-gold-text tabular-nums">{wdStats.questions + cwStats.q30 + cwStats.q5 + cwStats.team + cwStats.general + awStats.questions + quiz.questions}</div>
          <div className="text-[11px] font-bold text-ludn-muted mt-1">إجمالي الأسئلة</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4 w-full">

        {/* السيطرة على العالم */}
        <GameCard art="world" title="السيطرة على العالم" subtitle="إحصائيات الخريطة والتحديات">
          <div className="grid gap-2">
            <StatItem icon={<MapPin size={18} />} title="الدول المضافة" count={wdStats.countries} />
            <StatItem icon={<HelpCircle size={18} />} title="أسئلة الدول" count={wdStats.questions} />
            <StatItem icon={<Target size={18} />} title="أسئلة التحديات" count={wdStats.challenges} />
          </div>

          <div className="mt-auto">
            <button
              onClick={() => setShowWdDetails(!showWdDetails)}
              className="w-full min-h-11 flex items-center justify-between px-3 rounded-xl border border-ludn-line bg-ludn-surface text-ludn-fg hover:bg-ludn-surface-2 transition-colors font-bold text-sm"
            >
              <span>تفصيل الأسئلة لكل دولة</span>
              {showWdDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {showWdDetails && (
              <div className="mt-2 rounded-xl bg-ludn-surface-2 p-3 max-h-[180px] overflow-y-auto custom-scroll">
                {wdStats.countryDetails.length === 0 ? (
                  <p className="text-center text-xs font-bold text-ludn-muted">لا توجد دول مضافة بعد.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {wdStats.countryDetails.map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-2 bg-ludn-surface px-2.5 py-2 rounded-lg border border-ludn-line">
                        <span className="text-xs font-bold truncate">{c.name}</span>
                        <span className="bg-ludn-gold/15 text-ludn-gold-text text-[11px] font-black px-2 py-0.5 rounded-md shrink-0 tabular-nums">
                          {c.qCount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </GameCard>

        {/* حرب القلاع */}
        <GameCard art="castle" title="حرب القلاع" subtitle="تفاصيل بنوك الأسئلة الأربعة">
          <div className="grid gap-2">
            <StatItem icon={<Clock size={18} />} title="أسئلة 30 ثانية" count={cwStats.q30} />
            <StatItem icon={<Timer size={18} />} title="أسئلة 5 ثواني" count={cwStats.q5} />
            <StatItem icon={<Target size={18} />} title="تحدي فريق لفريق" count={cwStats.team} />
            <StatItem icon={<HelpCircle size={18} />} title="أسئلة عامة (بدون وقت)" count={cwStats.general} />
          </div>
        </GameCard>

        {/* حرب المزايدات */}
        <GameCard art="auction" title="حرب المزايدات" subtitle="إحصائية المزاد والأسئلة">
          <div className="grid gap-2">
            <StatItem icon={<HelpCircle size={18} />} title="إجمالي أسئلة المزايدة" count={awStats.questions} />
          </div>
        </GameCard>

        {/* تحدي الفئات */}
        <GameCard art="quiz" title={QUIZ_GAME.title} subtitle="الفئات والأسئلة حسب النقاط">
          <div className="grid gap-2">
            <StatItem icon={<Layers size={18} />} title="عدد الفئات" count={quiz.categories} />
            <StatItem icon={<HelpCircle size={18} />} title="أسئلة 200 نقطة" count={quiz.q200} />
            <StatItem icon={<HelpCircle size={18} />} title="أسئلة 400 نقطة" count={quiz.q400} />
            <StatItem icon={<HelpCircle size={18} />} title="أسئلة 600 نقطة" count={quiz.q600} />
          </div>
        </GameCard>

      </div>
    </div>
  );
}
