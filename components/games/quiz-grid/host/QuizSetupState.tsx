/* eslint-disable @next/next/no-img-element */
"use client";
import React from "react";
import Link from "next/link";
import {
  ChevronLeft, Loader2, Play, Users, AlertTriangle, LayoutGrid, Timer, Info, Check,
} from "lucide-react";
import { QUIZ_CONFIG, QUIZ_GAME, QUIZ_LIFELINE_LIST, QUIZ_LIFELINES_PER_TEAM } from "@/constants/quiz-grid";
import { QUIZ_CARDS } from "@/components/games/quiz-grid/shared/quizCards";
import { QZ_BTN_GLASS, QZ_BTN_PRIMARY, QZ_GLASS, QZ_INPUT, QZ_PANEL, QZ_TEAM } from "@/components/games/quiz-grid/shared/quizUi";
import type { QuizLifelineKey, QuizTeam } from "@/types";
import type { useQuizHost } from "@/hooks/games/quiz-grid/useQuizHost";

type Ctx = ReturnType<typeof useQuizHost>;

/** تدرّجات لونية ثابتة تُوزَّع على الفئات بلا صورة، حتى لا تبدو اللوحة فارغة أو معطوبة. */
const CATEGORY_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-sky-500 to-blue-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-indigo-500 to-violet-600",
];

function gradientForCategory(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % CATEGORY_GRADIENTS.length;
  return CATEGORY_GRADIENTS[hash];
}

function StepDots({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-2" aria-hidden="true">
      {[1, 2].map((n) => (
        <span
          key={n}
          className={`h-2 rounded-full transition-all ${
            n === step ? "w-8 bg-linear-to-l from-fuchsia-500 to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]" : "w-2 bg-white/25"
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
      <section className={`w-full max-w-2xl mx-auto ${QZ_GLASS} border-2 border-amber-400/40 rounded-3xl p-8 text-center`}>
        <div className="w-16 h-16 mx-auto mb-5 bg-amber-400/15 text-amber-300 rounded-2xl flex items-center justify-center">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-2xl font-black text-white mb-3">
          مكتبة الفئات غير جاهزة
        </h2>
        <p className="font-bold text-slate-300 mb-6 leading-relaxed">
          {categories.length === 0
            ? "لا توجد فئات مضافة بعد."
            : `لا توجد فئات مكتملة. كل فئة تحتاج ${QUIZ_CONFIG.PER_TIER} أسئلة على الأقل من كل قيمة (200، 400، 600).`}
        </p>
        <Link
          href={QUIZ_GAME.adminPath}
          className={`inline-flex items-center gap-2 font-black py-3.5 px-6 rounded-xl ${QZ_BTN_PRIMARY}`}
        >
          <LayoutGrid size={20} /> الذهاب للوحة التحكم
        </Link>
      </section>
    );
  }

  return (
    <section className="w-full max-w-4xl mx-auto flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-white [text-shadow:0_2px_6px_#000]">
          اختر الفئات ({QUIZ_CONFIG.MIN_CATEGORIES}-{QUIZ_CONFIG.MAX_CATEGORIES})
        </h2>
        <span
          className={`text-sm font-black px-3 py-1.5 rounded-lg ${
            canProceed
              ? "bg-emerald-400/15 border border-emerald-400/50 text-emerald-200"
              : "bg-cyan-400/10 border border-cyan-300/40 text-cyan-100"
          }`}
        >
          {selectedCategories.length} مختارة
          {remainingToMin > 0 ? ` — يلزم ${remainingToMin} على الأقل` : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-7 md:gap-y-8 px-1.5 md:px-0">
        {categories.map((category) => {
          const index = selectedCategories.indexOf(category.id);
          const isSelected = index !== -1;
          const atMax = selectedCategories.length >= QUIZ_CONFIG.MAX_CATEGORIES;
          const isDisabled = !category.isPlayable || (!isSelected && atMax);
          const countsText = QUIZ_CONFIG.TIERS.map((t) => `${t}: ${category.counts[t]}`).join(" • ");

          return (
            <button
              key={category.id}
              type="button"
              disabled={isDisabled}
              onClick={() => toggleCategory(category.id)}
              title={category.isPlayable ? countsText : "غير مكتملة — " + countsText}
              className={`relative block rounded-2xl border-2 p-1 text-right transition-all ${
                isSelected
                  ? "border-cyan-300 bg-cyan-400/10 scale-[1.02] ring-2 ring-fuchsia-400/50 shadow-[0_0_30px_-4px_rgba(34,211,238,0.75)]"
                  : isDisabled
                    ? "border-transparent opacity-50 cursor-not-allowed"
                    : "border-transparent hover:border-cyan-300/60"
              }`}
            >
              {/* اسم الفئة صار مكتوب داخل صورة الكرت، فما نكرره تحتها. الفئة اللي ما لها صورة يطلع اسمها داخل المربع */}
              {category.image_url ? (
                <img
                  src={category.image_url}
                  alt={category.image_alt || category.name_ar}
                  className="block w-full h-auto rounded-xl"
                />
              ) : (
                <div
                  className={`w-full aspect-[3/4] rounded-xl bg-gradient-to-br ${gradientForCategory(category.id)} flex flex-col items-center justify-center gap-2 p-2`}
                >
                  <LayoutGrid size={32} className="text-white/40" />
                  <span className="font-black text-white text-base md:text-lg text-center leading-tight">{category.name_ar}</span>
                </div>
              )}

              {/* الشارات على زوايا الكرت من برا، عشان ما تغطي العنوان فوق ولا الاسم تحت: الترتيب فوق، والتنبيه والمعلومات تحت */}
              {isSelected && (
                <span className="absolute -top-3 -right-3 md:-top-3.5 md:-right-3.5 z-10 w-7 h-7 md:w-8 md:h-8 rounded-full bg-cyan-300 text-slate-950 ring-2 ring-[#090b1f] flex items-center justify-center text-sm font-black shadow-[0_0_12px_rgba(34,211,238,0.9)]">
                  {index + 1}
                </span>
              )}
              {!category.isPlayable && (
                <span className="absolute -bottom-3 -left-3 md:-bottom-3.5 md:-left-3.5 z-10 w-6 h-6 md:w-7 md:h-7 rounded-full bg-rose-500 text-white ring-2 ring-[#090b1f] flex items-center justify-center shadow">
                  <AlertTriangle size={13} />
                </span>
              )}
              {category.isPlayable && (
                <span className="absolute -bottom-3 -left-3 z-10 w-6 h-6 rounded-full bg-[#090b1f]/90 ring-1 ring-white/30 text-white flex items-center justify-center">
                  <Info size={13} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={goToStep2}
        disabled={!canProceed}
        className={`w-full py-5 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0 font-black text-xl md:text-2xl rounded-2xl flex items-center justify-center gap-3 ${QZ_BTN_PRIMARY}`}
      >
        {canProceed ? "التالي: الفرق والوقت" : `اختر ${remainingToMin} فئات أخرى`}
        <ChevronLeft size={26} />
      </button>
    </section>
  );
}

const TEAM_ACCENT: Record<QuizTeam, { text: string; chip: string; badge: string }> = {
  1: {
    text: QZ_TEAM[1].text,
    chip: "bg-sky-500/20 border-sky-300 ring-2 ring-sky-400/40 shadow-[0_0_20px_-4px_rgba(56,189,248,0.8)]",
    badge: "bg-sky-400 text-slate-950",
  },
  2: {
    text: QZ_TEAM[2].text,
    chip: "bg-rose-500/20 border-rose-300 ring-2 ring-rose-400/40 shadow-[0_0_20px_-4px_rgba(251,113,133,0.8)]",
    badge: "bg-rose-400 text-slate-950",
  },
};

function TeamLifelinePicker({
  team,
  selected,
  onToggle,
}: {
  team: QuizTeam;
  selected: QuizLifelineKey[];
  onToggle: (kind: QuizLifelineKey) => void;
}) {
  const accent = TEAM_ACCENT[team];
  const remaining = QUIZ_LIFELINES_PER_TEAM - selected.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className={`font-bold text-sm ${accent.text}`}>وسائل المساعدة (اختر {QUIZ_LIFELINES_PER_TEAM})</span>
        <span className="text-xs font-black text-slate-300">
          {selected.length}/{QUIZ_LIFELINES_PER_TEAM}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {QUIZ_LIFELINE_LIST.map((def) => {
          const isSelected = selected.includes(def.key);
          const isDisabled = !isSelected && remaining <= 0;

          return (
            <button
              key={def.key}
              type="button"
              disabled={isDisabled}
              onClick={() => onToggle(def.key)}
              title={def.hint}
              className={`flex flex-col items-center gap-1.5 p-1.5 md:p-2 rounded-xl border-2 transition-all text-center ${
                isSelected
                  ? accent.chip
                  : isDisabled
                    ? "bg-black/25 border-white/5 cursor-not-allowed"
                    : "bg-black/25 border-white/10 hover:border-white/35"
              }`}
            >
              <span className="relative block w-full max-w-28">
                <img
                  src={QUIZ_CARDS[def.key].card}
                  alt={def.label}
                  draggable={false}
                  className={`block w-full aspect-[512/686] rounded-lg ${isDisabled ? "grayscale opacity-40" : ""}`}
                />
                {isSelected && (
                  <span className={`absolute -top-1.5 -left-1.5 w-7 h-7 rounded-full grid place-items-center shadow-lg ${accent.badge}`}>
                    <Check size={16} strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className={`text-[10px] md:text-[11px] font-bold leading-snug ${isDisabled ? "text-slate-500" : "text-slate-200"}`}>
                {QUIZ_CARDS[def.key].short}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepTwoTeamsAndTimer({ ctx }: { ctx: Ctx }) {
  const {
    t1Name, setT1Name, t2Name, setT2Name, players,
    timerSeconds, setTimerSeconds,
    t1Lifelines, t2Lifelines, toggleTeamLifeline, canStartGame,
    goBackToStep1, startGame, isBusy, isPreparing,
  } = ctx;

  const [customTimer, setCustomTimer] = React.useState(false);
  const isPreset = QUIZ_CONFIG.TIMER_PRESETS.includes(timerSeconds as (typeof QUIZ_CONFIG.TIMER_PRESETS)[number]);

  const handleCustomChange = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setTimerSeconds(Math.min(QUIZ_CONFIG.TIMER_MAX, Math.max(QUIZ_CONFIG.TIMER_MIN, Math.round(n))));
  };

  return (
    <section className="w-full max-w-4xl mx-auto flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`${QZ_GLASS} border-2 border-sky-400/50 rounded-3xl p-4 md:p-5 flex flex-col gap-4`}>
          <div className="flex flex-col gap-2">
            <label htmlFor="t1" className="font-bold text-sm text-sky-300">
              الفريق الأول
            </label>
            <input
              id="t1"
              type="text"
              value={t1Name}
              maxLength={30}
              onChange={(e) => setT1Name(e.target.value)}
              className={`w-full p-4 rounded-xl font-black text-lg focus:border-sky-400 ${QZ_INPUT}`}
            />
          </div>
          <TeamLifelinePicker team={1} selected={t1Lifelines} onToggle={(k) => toggleTeamLifeline(1, k)} />
        </div>

        <div className={`${QZ_GLASS} border-2 border-rose-400/50 rounded-3xl p-4 md:p-5 flex flex-col gap-4`}>
          <div className="flex flex-col gap-2">
            <label htmlFor="t2" className="font-bold text-sm text-rose-300">
              الفريق الثاني
            </label>
            <input
              id="t2"
              type="text"
              value={t2Name}
              maxLength={30}
              onChange={(e) => setT2Name(e.target.value)}
              className={`w-full p-4 rounded-xl font-black text-lg focus:border-rose-400 ${QZ_INPUT}`}
            />
          </div>
          <TeamLifelinePicker team={2} selected={t2Lifelines} onToggle={(k) => toggleTeamLifeline(2, k)} />
        </div>
      </div>

      <div className={`flex items-center gap-2 text-sm font-bold text-slate-200 rounded-2xl px-4 py-3 ${QZ_PANEL}`}>
        <Users size={18} className="shrink-0 text-cyan-300" />
        {players.length === 0 ? (
          <span>لم ينضم أي لاعب بعد — اعرض الباركود على الشاشة.</span>
        ) : (
          <span>
            انضم {players.length} لاعب: {players.map((p) => p.display_name).join("، ")}
          </span>
        )}
      </div>

      <div className={`rounded-3xl p-5 md:p-6 ${QZ_PANEL}`}>
        <h2 className="text-xl font-black text-white mb-5 flex items-center gap-2">
          <Timer size={22} className="text-cyan-300" /> مدة كل سؤال
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
                  ? "bg-linear-to-l from-fuchsia-600 to-cyan-600 border-cyan-200/70 text-white shadow-[0_0_20px_-4px_rgba(217,70,239,0.8)]"
                  : "bg-black/25 border-white/10 text-slate-300 hover:border-cyan-300/50"
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
                ? "bg-linear-to-l from-fuchsia-600 to-cyan-600 border-cyan-200/70 text-white shadow-[0_0_20px_-4px_rgba(217,70,239,0.8)]"
                : "bg-black/25 border-white/10 text-slate-300 hover:border-cyan-300/50"
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
              className={`w-32 p-3 rounded-xl font-black text-lg text-center focus:border-cyan-300 ${QZ_INPUT}`}
            />
            <span className="font-bold text-sm text-slate-300">
              ثانية (بين {QUIZ_CONFIG.TIMER_MIN} و{QUIZ_CONFIG.TIMER_MAX})
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={goBackToStep1}
          className={`px-6 py-5 font-black rounded-2xl ${QZ_BTN_GLASS}`}
        >
          رجوع
        </button>
        <button
          onClick={startGame}
          disabled={isBusy || isPreparing || !canStartGame}
          title={!canStartGame ? `كل فريق يحتاج اختيار ${QUIZ_LIFELINES_PER_TEAM} وسائل مساعدة` : undefined}
          className="flex-1 py-5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xl md:text-2xl rounded-2xl border-b-8 border-emerald-700 active:border-b-0 active:translate-y-[8px] transition-all shadow-[0_0_28px_-6px_rgba(52,211,153,0.8)] flex items-center justify-center gap-3"
        >
          {isBusy || isPreparing ? (
            <Loader2 className="animate-spin" size={28} />
          ) : (
            <Play size={28} className="fill-current" />
          )}
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
