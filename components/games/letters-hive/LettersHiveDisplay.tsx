"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { Cairo } from "next/font/google";
import { Maximize } from "lucide-react";
import { LETTERS_HIVE_GAME, LETTERS_HIVE_TEAMS } from "@/constants/letters-hive";
import { hiveScores, hiveWinner, type HiveState, type HiveTeam } from "@/lib/game/letters-hive-engine";
import { useLettersHiveDisplay } from "@/hooks/games/letters-hive/useLettersHive";
import HiveBoard from "./HiveBoard";
import HiveWinReveal, { useHiveWinReveal } from "./HiveWinReveal";
import { HIVE_ICON, HIVE_WIN_ART, HV_ACTIVE_LETTER, HV_BTN_GLASS, HV_MUTED, HV_PANEL, HV_TEAM } from "./hiveUi";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });
const noopSubscribe = () => () => {};

/** ملء الشاشة مدعوم؟ الآيفون ما يدعمه لغير الفيديو، فالزر ما يطلع هناك */
function canFullscreen() {
  return document.fullscreenEnabled === true && typeof document.documentElement.requestFullscreen === "function";
}

/** شاشة العرض للشاشة الكبيرة — عرض بس، والتحكم كله من شاشة المقدم */
export default function LettersHiveDisplay() {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return (
    <main className={`fixed inset-0 z-50 text-white flex flex-col ${cairo.className}`} dir="rtl">
      {mounted && <DisplayBody />}
    </main>
  );
}

function DisplayBody() {
  const state = useLettersHiveDisplay();
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenOk] = useState(canFullscreen);
  // شاشة كشف الفوز (عرض بس): من نفس اللوحة اللي تنعرض
  const playing = state?.status === "playing";
  const reveal = useHiveWinReveal(playing && state ? (hiveWinner(state.owners)?.team ?? null) : null, playing);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  /** زر ملء الشاشة: يطلع لو المتصفح يدعمه وما هو مفعّل. مكانه يختلف حسب الشاشة (where) */
  const showFullscreen = fullscreenOk && !fullscreen;
  const fullscreenButton = (where: string) => (
    <button
      type="button"
      onClick={toggleFullscreen}
      className={`px-4 py-2.5 rounded-2xl ${HV_BTN_GLASS} font-black text-sm items-center gap-2 whitespace-nowrap shrink-0 ${where}`}
    >
      <Maximize size={18} /> ملء الشاشة
    </button>
  );

  if (!state || state.status !== "playing") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6" onDoubleClick={toggleFullscreen}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HIVE_ICON}
          alt=""
          draggable={false}
          className="w-36 h-36 lg:w-48 lg:h-48 mb-5 rounded-full drop-shadow-[0_0_34px_rgba(251,191,36,0.55)] animate-in zoom-in-50 duration-700"
        />
        <h1 className="font-display text-5xl lg:text-7xl mb-3 drop-shadow-[0_3px_0_rgba(0,0,0,0.6)]">{LETTERS_HIVE_GAME.title}</h1>
        <p className="text-xl lg:text-2xl font-bold text-amber-50/75 animate-pulse">بانتظار المقدم يبدأ الجلسة…</p>
        {showFullscreen && fullscreenButton("flex mt-10")}
      </div>
    );
  }

  const win = hiveWinner(state.owners);
  const scores = hiveScores(state);
  const activeLetter = state.active !== null ? state.letters[state.active] : null;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 p-3 lg:gap-4 lg:p-5" onDoubleClick={toggleFullscreen}>
      {/* الشاشة العرضية: الفريقين والجولة بسطر. الجوال الطولي: الفريقين بسطر، والجولة والحرف تحت اللوحة */}
      <header className="grid grid-cols-2 landscape:grid-cols-[1fr_auto_1fr] items-center gap-2 lg:gap-6">
        <TeamScore team="green" name={state.teams.green} score={scores.green} winner={win?.team === "green"} />
        <div className="hidden landscape:block text-center min-w-24 lg:min-w-28">
          <p className="text-base lg:text-2xl font-black text-amber-50/85">الجولة {state.round}</p>
          {activeLetter ? (
            <p
              className={`mt-1 inline-flex items-center justify-center min-w-12 lg:min-w-16 px-3 lg:px-4 py-1 lg:py-1.5 rounded-2xl ${HV_ACTIVE_LETTER} font-black text-2xl lg:text-4xl animate-in zoom-in-75`}
            >
              {activeLetter}
            </p>
          ) : (
            <p className={`mt-1 text-xs lg:text-lg font-bold ${HV_MUTED} flex items-center justify-center gap-1.5`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={HIVE_ICON} alt="" className="w-5 h-5 lg:w-7 lg:h-7 rounded-full" /> {LETTERS_HIVE_GAME.title}
            </p>
          )}
        </div>
        <TeamScore team="red" name={state.teams.red} score={scores.red} winner={win?.team === "red"} />
      </header>

      <div className="relative min-h-0 landscape:flex-1 flex items-center justify-center">
        <HiveBoard
          letters={state.letters}
          owners={state.owners}
          active={state.active}
          path={win?.path}
          className="w-full h-auto landscape:h-full"
        />
      </div>

      <PortraitInfo
        state={state}
        activeLetter={activeLetter}
        win={win?.team ?? null}
        footer={showFullscreen ? fullscreenButton("flex mt-2") : null}
      />
      <HiveWinReveal reveal={reveal} teams={state.teams} />
      {/* الشاشة العرضية: تحت يمين (بعيد عن اللوحة وعن أداة Next اللي تطلع تحت يسار بسيرفر التطوير بس) */}
      {showFullscreen && fullscreenButton("hidden landscape:flex fixed z-10 right-4 bottom-[max(1rem,env(safe-area-inset-bottom))]")}
    </div>
  );
}

/** الجوال الطولي: المساحة اللي تحت اللوحة فيها الجولة والحرف الحالي كبير */
function PortraitInfo({
  state,
  activeLetter,
  win,
  footer,
}: {
  state: HiveState;
  activeLetter: string | null;
  win: HiveTeam | null;
  footer: React.ReactNode;
}) {
  return (
    <section className={`landscape:hidden flex-1 min-h-0 rounded-3xl ${HV_PANEL} p-4 flex flex-col items-center justify-center gap-3 text-center`}>
      <p className="text-lg font-black text-amber-50/85">الجولة {state.round}</p>
      {win ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HIVE_WIN_ART[win].icon} alt="" className="w-24 h-24 rounded-full drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]" />
          <p className={`font-display text-4xl leading-tight ${HV_TEAM[win].score}`}>فاز {state.teams[win]}!</p>
        </>
      ) : activeLetter ? (
        <>
          <span className={`w-32 h-32 rounded-3xl ${HV_ACTIVE_LETTER} text-7xl font-black flex items-center justify-center animate-in zoom-in-75`}>
            {activeLetter}
          </span>
          <p className={`text-sm font-bold ${HV_MUTED}`}>الحرف الحالي</p>
        </>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HIVE_ICON} alt="" className="w-20 h-20 rounded-full drop-shadow-[0_0_24px_rgba(251,191,36,0.5)]" />
          <p className={`text-sm font-bold ${HV_MUTED}`}>بانتظار المقدم يختار حرف…</p>
        </>
      )}
      {footer}
    </section>
  );
}

function TeamScore({ team, name, score, winner }: { team: HiveTeam; name: string; score: number; winner: boolean }) {
  return (
    <div
      className={`min-w-0 self-stretch rounded-2xl lg:rounded-3xl px-3 py-2 lg:px-5 lg:py-2.5 flex items-center gap-2 lg:gap-4 ${HV_TEAM[team].card} ${
        winner ? "ring-4 lg:ring-[6px] ring-amber-300 animate-pulse" : ""
      } ${team === "red" ? "flex-row-reverse text-left" : ""}`}
    >
      <span className="flex-1 min-w-0">
        <span className="block font-black text-base lg:text-3xl leading-tight truncate lg:whitespace-normal lg:wrap-break-word">{name}</span>
        <span className={`block text-[11px] lg:text-base font-bold leading-snug ${HV_TEAM[team].goal}`}>
          <span className="hidden lg:inline">{LETTERS_HIVE_TEAMS[team].emoji} </span>يوصّل {LETTERS_HIVE_TEAMS[team].goal}
        </span>
      </span>
      <span className={`text-4xl lg:text-6xl font-black tabular-nums ${HV_TEAM[team].score}`}>{score}</span>
    </div>
  );
}
