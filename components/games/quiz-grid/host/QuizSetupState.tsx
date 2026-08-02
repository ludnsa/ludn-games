"use client";
import React from "react";
import Link from "next/link";
import {
  Check, ChevronLeft, Loader2, Play, Users, AlertTriangle, LayoutGrid, Timer,
} from "lucide-react";
import { QUIZ_CONFIG, QUIZ_GAME } from "@/constants/quiz-grid";
import type { useQuizHost } from "@/hooks/games/quiz-grid/useQuizHost";

type Ctx = ReturnType<typeof useQuizHost>;

function StepDots({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-2" aria-hidden="true">
      {[1, 2].map((n) => (
        <span
          key={n}
          className={`h-2 rounded-full transition-all ${
            n === step ? "w-8 bg-violet-500" : "w-2 bg-slate-300 dark:bg-slate-700"
          }`}
        />
      ))}
    </div>
  );
}

function StepOneCategories({ ctx }: { ctx: Ctx }) {
  const { categories, playableCategories, selectedCategories, toggleCategory, goToStep2 } = ctx;

  const remainingToMin = Math.max(0, QUIZ_CONFIG.MIN_CATEGORIES - selectedCategories.length);
  const canProceed = selectedCategories.length >= QUIZ_CONFIG.MIN_CATEGORIES;

  if (categories.length === 0 || playableCategories.length === 0) {
    return (
      <section className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-900/50 rounded-3xl p-8 text-center shadow-sm">
        <div className="w-16 h-16 mx-auto mb-5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 rounded-2xl flex items-center justify-center">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
          مكتبة الفئات غير جاهزة
        </h2>
        <p className="font-bold text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          {categories.length === 0
            ? "لا توجد فئات مضافة بعد."
            : `لا توجد فئات مكتملة. كل فئة تحتاج ${QUIZ_CONFIG.PER_TIER} أسئلة على الأقل من كل قيمة (200، 400، 600).`}
        </p>
        <Link
          href={QUIZ_GAME.adminPath}
          className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-400 text-white font-black py-3.5 px-6 rounded-xl border-b-4 border-violet-700 active:border-b-0 active:translate-y-[4px] transition-all"
        >
          <LayoutGrid size={20} /> الذهاب للوحة التحكم
        </Link>
      </section>
    );
  }

  return (
    <section className="w-full max-w-4xl mx-auto flex flex-col gap-5">
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-xl font-black text-slate-800 dark:text-white">
            اختر الفئات ({QUIZ_CONFIG.MIN_CATEGORIES}-{QUIZ_CONFIG.MAX_CATEGORIES})
          </h2>
          <span
            className={`text-sm font-black px-3 py-1.5 rounded-lg ${
              canProceed
                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                : "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400"
            }`}
          >
            {selectedCategories.length} مختارة
            {remainingToMin > 0 ? ` — يلزم ${remainingToMin} على الأقل` : ""}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {categories.map((category) => {
            const index = selectedCategories.indexOf(category.id);
            const isSelected = index !== -1;
            const atMax = selectedCategories.length >= QUIZ_CONFIG.MAX_CATEGORIES;
            const isDisabled = !category.isPlayable || (!isSelected && atMax);

            return (
              <button
                key={category.id}
                type="button"
                disabled={isDisabled}
                onClick={() => toggleCategory(category.id)}
                className={`relative flex flex-col items-start gap-2 p-4 rounded-2xl border-2 text-right transition-all ${
                  isSelected
                    ? "bg-violet-500 border-violet-700 text-white shadow-lg scale-[1.02]"
                    : isDisabled
                      ? "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed opacity-60"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white hover:border-violet-400"
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-white text-violet-600 flex items-center justify-center text-xs font-black">
                    {index + 1}
                  </span>
                )}
                <span className="font-black text-base md:text-lg leading-tight">
                  {category.name_ar}
                </span>
                {category.isPlayable ? (
                  <span
                    className={`text-[11px] font-bold ${isSelected ? "text-white/80" : "text-slate-400"}`}
                  >
                    {QUIZ_CONFIG.TIERS.map((t) => `${t}: ${category.counts[t]}`).join(" • ")}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                    <AlertTriangle size={12} /> غير مكتملة
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={goToStep2}
        disabled={!canProceed}
        className="w-full py-5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xl md:text-2xl rounded-2xl border-b-8 border-violet-700 active:border-b-0 active:translate-y-[8px] transition-all shadow-lg flex items-center justify-center gap-3"
      >
        {canProceed ? "التالي: الفرق والوقت" : `اختر ${remainingToMin} فئات أخرى`}
        <ChevronLeft size={26} />
      </button>
    </section>
  );
}

function StepTwoTeamsAndTimer({ ctx }: { ctx: Ctx }) {
  const {
    t1Name, setT1Name, t2Name, setT2Name, players,
    timerSeconds, setTimerSeconds,
    isPreparing, preloadDone, preloadTotal,
    goBackToStep1, startGame, isBusy,
  } = ctx;

  const [customTimer, setCustomTimer] = React.useState(false);
  const isPreset = QUIZ_CONFIG.TIMER_PRESETS.includes(timerSeconds as (typeof QUIZ_CONFIG.TIMER_PRESETS)[number]);

  const preloadPct = preloadTotal > 0 ? Math.round((preloadDone / preloadTotal) * 100) : 100;
  const isReady = !isPreparing && preloadDone >= preloadTotal;

  const handleCustomChange = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setTimerSeconds(Math.min(QUIZ_CONFIG.TIMER_MAX, Math.max(QUIZ_CONFIG.TIMER_MIN, Math.round(n))));
  };

  return (
    <section className="w-full max-w-4xl mx-auto flex flex-col gap-5">
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-800 dark:text-white mb-5">أسماء الفريقين</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="t1" className="font-bold text-sm text-sky-600 dark:text-sky-400">
              الفريق الأول
            </label>
            <input
              id="t1"
              type="text"
              value={t1Name}
              maxLength={30}
              onChange={(e) => setT1Name(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-sky-200 dark:border-sky-900/60 rounded-xl font-black text-lg focus:border-sky-500 outline-none transition-colors"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="t2" className="font-bold text-sm text-rose-600 dark:text-rose-400">
              الفريق الثاني
            </label>
            <input
              id="t2"
              type="text"
              value={t2Name}
              maxLength={30}
              onChange={(e) => setT2Name(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-rose-200 dark:border-rose-900/60 rounded-xl font-black text-lg focus:border-rose-500 outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-5 pt-5 border-t-2 border-slate-100 dark:border-slate-800 text-sm font-bold text-slate-500">
          <Users size={18} className="text-violet-500" />
          {players.length === 0 ? (
            <span>لم ينضم أي لاعب بعد — اعرض الباركود على الشاشة.</span>
          ) : (
            <span>
              انضم {players.length} لاعب: {players.map((p) => p.display_name).join("، ")}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-800 dark:text-white mb-5 flex items-center gap-2">
          <Timer size={22} className="text-violet-500" /> مدة كل سؤال
        </h2>

        <div className="flex flex-wrap gap-3 mb-4">
          {QUIZ_CONFIG.TIMER_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setCustomTimer(false);
                setTimerSeconds(preset);
              }}
              className={`flex-1 min-w-[72px] py-4 rounded-xl font-black text-lg border-2 transition-all ${
                !customTimer && timerSeconds === preset
                  ? "bg-violet-500 border-violet-700 text-white ring-2 ring-violet-500/30"
                  : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 hover:border-violet-300"
              }`}
            >
              {preset}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setCustomTimer(true)}
            className={`flex-1 min-w-[100px] py-4 rounded-xl font-black text-sm border-2 transition-all ${
              customTimer || !isPreset
                ? "bg-violet-500 border-violet-700 text-white ring-2 ring-violet-500/30"
                : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 hover:border-violet-300"
            }`}
          >
            مدة مخصصة
          </button>
        </div>

        {(customTimer || !isPreset) && (
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={QUIZ_CONFIG.TIMER_MIN}
              max={QUIZ_CONFIG.TIMER_MAX}
              value={timerSeconds}
              onChange={(e) => handleCustomChange(e.target.value)}
              className="w-32 p-3 bg-slate-50 dark:bg-slate-950 border-2 border-violet-300 dark:border-violet-800 rounded-xl font-black text-lg text-center focus:border-violet-500 outline-none transition-colors"
            />
            <span className="font-bold text-sm text-slate-500">
              ثانية (بين {QUIZ_CONFIG.TIMER_MIN} و{QUIZ_CONFIG.TIMER_MAX})
            </span>
          </div>
        )}
      </div>

      {/* شريط تجهيز الأسئلة والصور — يعمل في الخلفية منذ دخول هذه الشاشة */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
            {isReady ? (
              <Check size={16} className="text-emerald-500" />
            ) : (
              <Loader2 size={16} className="animate-spin text-violet-500" />
            )}
            {isPreparing
              ? "جاري سحب الأسئلة..."
              : isReady
                ? "الأسئلة والصور جاهزة"
                : `جاري تحميل الصور (${preloadDone}/${preloadTotal})...`}
          </span>
          {!isPreparing && preloadTotal > 0 && (
            <span className="text-xs font-black text-slate-400">{preloadPct}%</span>
          )}
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all duration-300"
            style={{ width: isPreparing ? "20%" : `${preloadPct}%` }}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={goBackToStep1}
          className="px-6 py-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black rounded-2xl border-b-4 border-slate-300 dark:border-slate-950 active:border-b-0 active:translate-y-[4px] transition-all"
        >
          رجوع
        </button>
        <button
          onClick={startGame}
          disabled={isBusy || isPreparing}
          className="flex-1 py-5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xl md:text-2xl rounded-2xl border-b-8 border-emerald-700 active:border-b-0 active:translate-y-[8px] transition-all shadow-lg flex items-center justify-center gap-3"
        >
          {isBusy ? <Loader2 className="animate-spin" size={28} /> : <Play size={28} className="fill-current" />}
          ابدأ اللعبة
        </button>
      </div>
    </section>
  );
}

export default function QuizSetupState({ ctx }: { ctx: Ctx }) {
  const { setupStep, categories, playableCategories } = ctx;

  // لا نعرض المؤشر إذا كانت مكتبة الفئات فارغة — الشاشة أصلاً توجّه للوحة التحكم
  const showSteps = categories.length > 0 && playableCategories.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {showSteps && <StepDots step={setupStep} />}
      {setupStep === 1 ? <StepOneCategories ctx={ctx} /> : <StepTwoTeamsAndTimer ctx={ctx} />}
    </div>
  );
}
