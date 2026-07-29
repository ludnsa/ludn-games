"use client";
import React from "react";
import Link from "next/link";
import { Check, Loader2, Play, Users, AlertTriangle, LayoutGrid } from "lucide-react";
import { QUIZ_CONFIG, QUIZ_GAME } from "@/constants/quiz-grid";
import type { useQuizHost } from "@/hooks/games/quiz-grid/useQuizHost";

type Ctx = ReturnType<typeof useQuizHost>;

export default function QuizSetupState({ ctx }: { ctx: Ctx }) {
  const {
    categories, playableCategories, selectedCategories, toggleCategory,
    t1Name, setT1Name, t2Name, setT2Name, players, startGame, isBusy,
  } = ctx;

  const remainingToPick = QUIZ_CONFIG.CATEGORIES_PER_SESSION - selectedCategories.length;
  const canStart = remainingToPick === 0 && !isBusy;

  // لا توجد فئات صالحة إطلاقاً: نوجّه الحكم للوحة التحكم بدل شاشة فارغة
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
              انضم {players.length} لاعب:{" "}
              {players.map((p) => p.display_name).join("، ")}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-xl font-black text-slate-800 dark:text-white">
            اختر {QUIZ_CONFIG.CATEGORIES_PER_SESSION} فئات
          </h2>
          <span
            className={`text-sm font-black px-3 py-1.5 rounded-lg ${
              remainingToPick === 0
                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                : "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400"
            }`}
          >
            {remainingToPick === 0 ? "الاختيار مكتمل" : `متبقٍ ${remainingToPick}`}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {categories.map((category) => {
            const index = selectedCategories.indexOf(category.id);
            const isSelected = index !== -1;
            const isDisabled = !category.isPlayable || (!isSelected && remainingToPick === 0);

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
        onClick={startGame}
        disabled={!canStart}
        className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xl md:text-2xl rounded-2xl border-b-8 border-emerald-700 active:border-b-0 active:translate-y-[8px] transition-all shadow-lg flex items-center justify-center gap-3"
      >
        {isBusy ? <Loader2 className="animate-spin" size={28} /> : <Play size={28} className="fill-current" />}
        {remainingToPick === 0 ? "ابدأ اللعبة" : `اختر ${remainingToPick} فئات أخرى`}
        {canStart && <Check size={28} />}
      </button>
    </section>
  );
}
