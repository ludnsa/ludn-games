"use client";

import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Cairo } from "next/font/google";
import { Monitor, Settings2, Square, Undo2, Shuffle, Home, X, Play, Eraser } from "lucide-react";
import { LETTERS_HIVE_CONFIG, LETTERS_HIVE_GAME, LETTERS_HIVE_TEAMS } from "@/constants/letters-hive";
import {
  HIVE_TEAMS,
  endHiveSession,
  hiveScores,
  hiveWinner,
  nextHiveRound,
  selectHiveCell,
  setHiveCell,
  startHiveSession,
  undoHive,
  updateHiveSettings,
  type HiveState,
  type HiveTeam,
} from "@/lib/game/letters-hive-engine";
import { useLettersHiveHost } from "@/hooks/games/letters-hive/useLettersHive";
import HiveBoard from "./HiveBoard";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });
const noopSubscribe = () => () => {};

type Update = (fn: (s: HiveState) => HiveState) => void;

const btn = {
  primary:
    "w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black text-lg rounded-2xl border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2",
  ghost:
    "w-full py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 font-black rounded-2xl border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2",
  bar: "h-11 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border-b-4 border-slate-950 font-black text-sm flex items-center gap-1.5 shrink-0",
  /** نفس شكل bar/ghost بلون التأكيد (ضغطة ثانية) */
  armedBar: "h-11 px-3 rounded-2xl bg-red-600 border-b-4 border-red-800 font-black text-sm flex items-center gap-1.5 shrink-0 animate-pulse",
  armedGhost:
    "w-full py-3 bg-amber-600 font-black rounded-2xl border-b-4 border-amber-800 flex items-center justify-center gap-2 animate-pulse",
  nextRound:
    "w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2",
} as const;

const TEAM_BG: Record<HiveTeam, string> = { green: "bg-green-600 border-green-800", red: "bg-red-600 border-red-800" };

/** شاشة المقدم — تحتاج تسجيل دخول (middleware.ts) */
export default function LettersHiveHost() {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return (
    <main
      className={`min-h-[100dvh] text-white p-4 md:p-6 relative z-10 bg-gradient-to-b from-emerald-950 via-slate-950 to-slate-950 ${cairo.className}`}
      dir="rtl"
    >
      {mounted && <HostBody />}
    </main>
  );
}

/** نافذة شاشة العرض — نفس الاسم، فلو مفتوحة يرجع لها بدل ما يفتح نافذة ثانية */
function openDisplay(): boolean {
  const w = window.open(LETTERS_HIVE_GAME.displayPath, "letters-hive-display", "popup=yes,width=1280,height=760");
  w?.focus();
  return Boolean(w);
}

function HostBody() {
  const { state, update } = useLettersHiveHost();
  const [notice, setNotice] = useState("");
  const showDisplay = () =>
    setNotice(openDisplay() ? "" : "المتصفح منع النافذة — اسمح بالنوافذ المنبثقة لهالموقع وجرّب مرة ثانية.");

  if (state.status === "setup") {
    return (
      <Setup
        state={state}
        notice={notice}
        onDisplay={showDisplay}
        onStart={(teams, hard) => update((s) => startHiveSession(s, teams, hard))}
      />
    );
  }
  return <Playing state={state} update={update} notice={notice} onDisplay={showDisplay} />;
}

// ---------------------------------------------------------------------
// البداية
// ---------------------------------------------------------------------

function Setup({
  state,
  notice,
  onDisplay,
  onStart,
}: {
  state: HiveState;
  notice: string;
  onDisplay: () => void;
  onStart: (teams: Record<HiveTeam, string>, hard: boolean) => void;
}) {
  const [teams, setTeams] = useState(state.teams);
  const [hard, setHard] = useState(state.hardLetters);

  return (
    <div className="w-full max-w-md mx-auto my-6 flex flex-col gap-4">
      <div className="text-center">
        <p className="text-6xl mb-2">🐝</p>
        <h1 className="text-4xl font-black">{LETTERS_HIVE_GAME.title}</h1>
        <p className="font-bold text-slate-400 mt-2">أنت المقدم: تسأل من عندك، وتلوّن الخلية للفريق اللي جاوب صح</p>
      </div>

      <section className="bg-slate-900/80 border-2 border-slate-800 rounded-[2rem] p-5 flex flex-col gap-4">
        <TeamFields teams={teams} onChange={setTeams} />
        <HardLettersToggle value={hard} onChange={setHard} />
        <button type="button" onClick={() => onStart(teams, hard)} className={btn.primary}>
          <Play size={22} /> ابدأ الجلسة
        </button>
      </section>

      <button type="button" onClick={onDisplay} className={btn.ghost}>
        <Monitor size={20} /> افتح شاشة العرض
      </button>
      <Notice text={notice} />
      <p className="text-center text-xs font-bold text-slate-500 leading-relaxed">
        شاشة العرض تنفتح بنافذة جديدة: اسحبها للشاشة الكبيرة واضغط &quot;ملء الشاشة&quot;، وتحكّم أنت من هالشاشة.
      </p>
      <Link href="/" className="mx-auto text-sm font-bold text-slate-400 hover:text-white flex items-center gap-1.5">
        <Home size={16} /> الرئيسية
      </Link>
    </div>
  );
}

function TeamFields({ teams, onChange }: { teams: Record<HiveTeam, string>; onChange: (t: Record<HiveTeam, string>) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {HIVE_TEAMS.map((team) => (
        <label key={team} className="flex flex-col gap-1.5">
          <span className="font-bold text-sm text-slate-400">
            {LETTERS_HIVE_TEAMS[team].emoji} اسم {LETTERS_HIVE_TEAMS[team].defaultName} — يوصّل {LETTERS_HIVE_TEAMS[team].goal}
          </span>
          <input
            value={teams[team]}
            maxLength={LETTERS_HIVE_CONFIG.TEAM_NAME_MAX}
            onChange={(e) => onChange({ ...teams, [team]: e.target.value })}
            placeholder={LETTERS_HIVE_TEAMS[team].defaultName}
            className="w-full p-3.5 bg-slate-950 border-2 border-slate-800 rounded-2xl font-black text-lg focus:border-emerald-500 outline-none transition-colors"
          />
        </label>
      ))}
    </div>
  );
}

function HardLettersToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`w-full p-3.5 rounded-2xl border-2 text-start flex items-center gap-3 transition-colors ${
        value ? "bg-emerald-950/60 border-emerald-600" : "bg-slate-950 border-slate-800"
      }`}
    >
      <span className={`w-11 h-6 shrink-0 rounded-full p-0.5 transition-colors ${value ? "bg-emerald-500" : "bg-slate-700"}`}>
        <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${value ? "-translate-x-5" : ""}`} />
      </span>
      <span>
        <span className="block font-black">الحروف الصعبة ({LETTERS_HIVE_CONFIG.HARD_LETTERS.join(" ")})</span>
        <span className="block text-xs font-bold text-slate-400">تنخلط مع باقي الحروف، والنظام يختار منها 25 حرف كل جولة</span>
      </span>
    </button>
  );
}

function Notice({ text }: { text: string }) {
  if (!text) return null;
  return <p className="text-center text-sm font-bold text-amber-200 bg-amber-950/60 border border-amber-800 rounded-xl p-3">{text}</p>;
}

// ---------------------------------------------------------------------
// اللعب
// ---------------------------------------------------------------------

function Playing({
  state,
  update,
  notice,
  onDisplay,
}: {
  state: HiveState;
  update: Update;
  notice: string;
  onDisplay: () => void;
}) {
  const win = useMemo(() => hiveWinner(state.owners), [state.owners]);
  const scores = hiveScores(state);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // اختصارات اللابتوب: 1 أخضر، 2 أحمر، 0 مسح، Esc إلغاء التحديد، Ctrl+Z تراجع
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const paint = (team: HiveTeam | null) => update((s) => (s.active === null ? s : setHiveCell(s, s.active, team)));
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") {
        e.preventDefault();
        update(undoHive);
      } else if (e.key === "Escape") update((s) => ({ ...s, active: null }));
      else if (e.code === "Digit1" || e.code === "Numpad1") paint("green");
      else if (e.code === "Digit2" || e.code === "Numpad2") paint("red");
      else if (e.code === "Digit0" || e.code === "Numpad0" || e.key === "Delete") paint(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [update]);

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-40">
          <h1 className="text-2xl font-black leading-tight">🐝 {LETTERS_HIVE_GAME.title}</h1>
          <p className="text-sm font-bold text-slate-400">الجولة {state.round}</p>
        </div>
        <button type="button" onClick={onDisplay} className={btn.bar}>
          <Monitor size={18} /> شاشة العرض
        </button>
        <button type="button" onClick={() => setSettingsOpen(true)} className={btn.bar}>
          <Settings2 size={18} /> الإعدادات
        </button>
        <EndSessionButton onEnd={() => update(endHiveSession)} />
      </header>
      <Notice text={notice} />

      <div className="grid grid-cols-2 gap-3">
        {HIVE_TEAMS.map((team) => (
          <div
            key={team}
            className={`rounded-2xl border-b-4 px-4 py-3 flex items-center gap-3 ${TEAM_BG[team]} ${
              win?.team === team ? "ring-4 ring-yellow-300" : ""
            }`}
          >
            <span className="flex-1 min-w-0">
              <span className="block font-black text-lg leading-tight break-words">{state.teams[team]}</span>
              <span className="block text-xs font-bold opacity-80">يوصّل {LETTERS_HIVE_TEAMS[team].goal}</span>
            </span>
            <span className="text-4xl font-black tabular-nums">{scores[team]}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        <HiveBoard
          letters={state.letters}
          owners={state.owners}
          active={state.active}
          path={win?.path}
          onCellClick={(i) => update((s) => selectHiveCell(s, i))}
          className="w-full h-auto rounded-3xl shadow-2xl"
        />

        <aside className="flex flex-col gap-3">
          {win && (
            <div className={`rounded-3xl border-b-4 p-5 text-center animate-in zoom-in-95 ${TEAM_BG[win.team]}`}>
              <p className="text-5xl mb-1">🏆</p>
              <p className="text-2xl font-black">فاز {state.teams[win.team]}!</p>
              <p className="text-sm font-bold opacity-90 mt-1">وصّلوا {LETTERS_HIVE_TEAMS[win.team].goal}</p>
            </div>
          )}
          {(!win || state.active !== null) && <ActivePanel state={state} update={update} />}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => update(undoHive)} disabled={state.history.length === 0} className={btn.ghost}>
              <Undo2 size={18} /> تراجع
            </button>
            <NewRoundButton finished={Boolean(win)} onNext={() => update(nextHiveRound)} />
          </div>
          <p className="text-xs font-bold text-slate-500 leading-relaxed">
            ⌨️ اختصارات: <b>1</b> = {state.teams.green} · <b>2</b> = {state.teams.red} · <b>0</b> = مسح · <b>Esc</b> = إلغاء
            التحديد · <b>Ctrl+Z</b> = تراجع
          </p>
        </aside>
      </div>

      {settingsOpen && (
        <SettingsModal
          state={state}
          onClose={() => setSettingsOpen(false)}
          onSave={(teams, hard) => {
            update((s) => updateHiveSettings(s, teams, hard));
            setSettingsOpen(false);
          }}
        />
      )}
    </div>
  );
}

/** الحرف المختار: المقدم يسأل عنه، ويلوّنه للفريق اللي جاوب صح */
function ActivePanel({ state, update }: { state: HiveState; update: Update }) {
  const i = state.active;
  if (i === null) {
    return (
      <div className="rounded-3xl bg-slate-900/80 border-2 border-dashed border-slate-700 p-5 text-center">
        <p className="text-4xl mb-2">👆</p>
        <p className="font-black">اختر حرف من اللوحة</p>
        <p className="text-xs font-bold text-slate-400 mt-1">يتوهج على شاشة العرض عشان الكل يعرف وش الحرف</p>
      </div>
    );
  }
  const owner = state.owners[i];
  const paint = (team: HiveTeam | null) => update((s) => setHiveCell(s, i, team));
  return (
    <div className="rounded-3xl bg-slate-900/80 border-2 border-amber-500 p-4 flex flex-col gap-2 animate-in fade-in">
      <div className="flex items-center gap-3 mb-1">
        <span className="w-16 h-16 shrink-0 rounded-2xl bg-yellow-300 text-[#1e1b8f] text-4xl font-black flex items-center justify-center">
          {state.letters[i]}
        </span>
        <span className="font-bold text-slate-300 text-sm leading-relaxed">
          {owner ? `الخلية للحين مع ${state.teams[owner]} — تقدر تغيّرها` : "اسأل سؤال جوابه يبدأ بهالحرف، ومين جاوب صح؟"}
        </span>
      </div>
      {HIVE_TEAMS.map((team) => (
        <button
          key={team}
          type="button"
          onClick={() => paint(team)}
          disabled={owner === team}
          className={`w-full py-3.5 rounded-2xl border-b-4 font-black text-lg text-white active:border-b-0 active:translate-y-1 transition-all disabled:opacity-40 ${TEAM_BG[team]}`}
        >
          {LETTERS_HIVE_TEAMS[team].emoji} {state.teams[team]}
        </button>
      ))}
      <div className="grid grid-cols-2 gap-2">
        {owner && (
          <button type="button" onClick={() => paint(null)} className={btn.ghost}>
            <Eraser size={18} /> مسح اللون
          </button>
        )}
        <button type="button" onClick={() => update((s) => ({ ...s, active: null }))} className={`${btn.ghost} ${owner ? "" : "col-span-2"}`}>
          <X size={18} /> إلغاء التحديد
        </button>
      </div>
    </div>
  );
}

/** جولة جديدة: لو الجولة ما خلصت، ضغطتين عشان ما تضيع اللوحة بالغلط */
function NewRoundButton({ finished, onNext }: { finished: boolean; onNext: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <button
      type="button"
      onClick={() => {
        if (!finished && !armed) return setArmed(true);
        setArmed(false);
        onNext();
      }}
      className={finished ? btn.nextRound : armed ? btn.armedGhost : btn.ghost}
    >
      <Shuffle size={18} /> {armed ? "متأكد؟" : "جولة جديدة"}
    </button>
  );
}

function EndSessionButton({ onEnd }: { onEnd: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <button
      type="button"
      onClick={() => (armed ? onEnd() : setArmed(true))}
      className={armed ? btn.armedBar : `${btn.bar} text-red-300`}
    >
      <Square size={18} /> {armed ? "متأكد؟ تنتهي الجلسة والنتيجة" : "إنهاء الجلسة"}
    </button>
  );
}

function SettingsModal({
  state,
  onClose,
  onSave,
}: {
  state: HiveState;
  onClose: () => void;
  onSave: (teams: Record<HiveTeam, string>, hard: boolean) => void;
}) {
  const [teams, setTeams] = useState(state.teams);
  const [hard, setHard] = useState(state.hardLetters);
  const empty = state.owners.every((o) => o === null);
  return (
    <div className="fixed inset-0 z-[2500] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 animate-in fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-label="الإعدادات"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-slate-900 border-2 border-emerald-700 rounded-[2rem] p-5 flex flex-col gap-4 animate-in slide-in-from-bottom-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Settings2 size={22} className="text-emerald-400" /> الإعدادات
          </h2>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-800">
            <X size={24} />
          </button>
        </div>
        <TeamFields teams={teams} onChange={setTeams} />
        <HardLettersToggle value={hard} onChange={setHard} />
        {hard !== state.hardLetters && !empty && (
          <p className="text-xs font-bold text-amber-300">الحروف تتغير من الجولة الجاية (اللوحة الحالية فيها خلايا ملوّنة)</p>
        )}
        <button type="button" onClick={() => onSave(teams, hard)} className={btn.primary}>
          حفظ
        </button>
      </div>
    </div>
  );
}
