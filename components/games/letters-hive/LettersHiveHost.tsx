"use client";

import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Cairo } from "next/font/google";
import { Monitor, Settings2, Square, Undo2, Shuffle, Home, X, Play, Eraser, Crown, Loader2, RotateCcw } from "lucide-react";
import { checkAccessAction } from "@/app/actions/gameAccess";
import type { HiveAccess } from "@/actions/letters-hive";
import { LETTERS_HIVE_CONFIG, LETTERS_HIVE_GAME, LETTERS_HIVE_TEAMS } from "@/constants/letters-hive";
import {
  HIVE_TEAMS,
  endHiveSession,
  hiveScores,
  hiveWinner,
  nextHiveRound,
  selectHiveCell,
  setHiveCell,
  undoHive,
  updateHiveSettings,
  type HiveState,
  type HiveTeam,
} from "@/lib/game/letters-hive-engine";
import {
  useLettersHiveHost,
  type HiveBoot,
  type HiveSaving,
  type HiveStartResult,
} from "@/hooks/games/letters-hive/useLettersHive";
import HiveBoard from "./HiveBoard";
import HiveWinReveal, { useHiveWinReveal } from "./HiveWinReveal";
import HiveRoomModal from "./HiveRoomModal";
import {
  HIVE_ICON,
  HIVE_WIN_ART,
  HV_ACTIVE_LETTER,
  HV_BACKDROP,
  HV_BTN_GLASS,
  HV_BTN_PRIMARY,
  HV_GLASS,
  HV_INPUT,
  HV_MODAL,
  HV_MUTED,
  HV_PANEL,
  HV_TEAM,
} from "./hiveUi";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });
const noopSubscribe = () => () => {};

type Update = (fn: (s: HiveState) => HiveState) => void;

const btn = {
  primary: `w-full py-4 ${HV_BTN_PRIMARY} disabled:opacity-40 font-black text-lg rounded-2xl flex items-center justify-center gap-2`,
  ghost: `w-full py-3 ${HV_BTN_GLASS} disabled:opacity-40 font-black rounded-2xl flex items-center justify-center gap-2`,
  bar: `h-11 px-3 rounded-2xl ${HV_BTN_GLASS} font-black text-sm flex items-center gap-1.5 shrink-0`,
  /** نفس شكل bar/ghost بلون التأكيد (ضغطة ثانية) */
  armedBar: "h-11 px-3 rounded-2xl bg-red-600 border-b-4 border-red-800 font-black text-sm flex items-center gap-1.5 shrink-0 animate-pulse",
  armedGhost:
    "w-full py-3 bg-orange-600 font-black rounded-2xl border-b-4 border-orange-800 flex items-center justify-center gap-2 animate-pulse",
  nextRound: `w-full py-3 ${HV_BTN_PRIMARY} font-black rounded-2xl flex items-center justify-center gap-2`,
} as const;

/** لوحة "اختر حرف": نفس الزجاج بحد متقطع */
const HV_GLASS_DASHED = "bg-[#0e0a04]/60 backdrop-blur-md border-2 border-dashed border-amber-200/30";

/** الشعار: أيقونة الخلية بدل الإيموجي */
function HiveLogo({ className }: { className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={HIVE_ICON} alt="" draggable={false} className={`shrink-0 rounded-full drop-shadow-[0_0_18px_rgba(251,191,36,0.45)] ${className}`} />;
}

/** شاشة المقدم — تحتاج تسجيل دخول (middleware.ts) */
export default function LettersHiveHost() {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return (
    <main className={`min-h-[100dvh] text-white p-4 md:p-6 relative z-10 ${cairo.className}`} dir="rtl">
      {mounted && <HostBody />}
    </main>
  );
}

/**
 * نافذة شاشة العرض على نفس الجهاز — نفس الاسم، فلو مفتوحة يرجع لها بدل ما يفتح نافذة ثانية.
 * مع كود الغرفة تتحدث من السيرفر كمان (لو انسحبت لشاشة ثانية أو انقطع البث).
 */
function openDisplay(code: string | null): boolean {
  const url = code ? `${LETTERS_HIVE_GAME.displayPath}?code=${code}` : LETTERS_HIVE_GAME.displayPath;
  const w = window.open(url, "letters-hive-display", "popup=yes,width=1280,height=760");
  w?.focus();
  return Boolean(w);
}

function HostBody() {
  const hive = useLettersHiveHost();
  const { state, update } = hive;
  const [notice, setNotice] = useState("");
  const [roomOpen, setRoomOpen] = useState(false);
  const showDisplay = () => setRoomOpen(true);
  const openHere = (code: string | null) =>
    setNotice(openDisplay(code) ? "" : "المتصفح منع النافذة — اسمح بالنوافذ المنبثقة لهالموقع وجرّب مرة ثانية.");

  if (hive.boot !== "ready") return <BootScreen boot={hive.boot} onRetry={hive.reload} />;

  const message = notice || hive.notice;
  const modal = roomOpen && (
    <HiveRoomModal code={hive.roomCode} ensure={hive.ensureRoom} onOpenHere={openHere} onClose={() => setRoomOpen(false)} />
  );

  if (state.status === "setup") {
    return (
      <>
        <Setup state={state} notice={message} onDisplay={showDisplay} onStart={hive.start} takeBootAccess={hive.takeBootAccess} />
        {modal}
      </>
    );
  }
  return (
    <>
      <Playing
        state={state}
        update={update}
        notice={message}
        onDisplay={showDisplay}
        link={<LinkBadge code={hive.roomCode} saving={hive.saving} />}
      />
      {modal}
    </>
  );
}

/** قبل ما تجهز الجلسة: نسأل السيرفر عن غرفة الحساب (نكمل منها لو فيه جلسة شغالة) */
function BootScreen({ boot, onRetry }: { boot: HiveBoot; onRetry: () => void }) {
  return (
    <div className="w-full max-w-md mx-auto my-6 flex flex-col gap-4">
      <div className="text-center flex flex-col items-center">
        <HiveLogo className="w-24 h-24 mb-2" />
        <h1 className="font-display text-5xl leading-tight">{LETTERS_HIVE_GAME.title}</h1>
      </div>
      {boot === "loading" ? (
        <p className={`font-bold ${HV_MUTED} flex items-center justify-center gap-2`}>
          <Loader2 size={20} className="animate-spin" /> جاري التحميل…
        </p>
      ) : (
        <section className={`${HV_PANEL} rounded-[2rem] p-5 grid gap-3 text-center`}>
          <p className="font-black leading-relaxed">
            {boot === "login" ? "انتهى تسجيل دخولك — سجّل دخولك من جديد." : "ما قدرنا نوصل للسيرفر. تأكد من الاتصال وحاول مرة ثانية."}
          </p>
          {boot === "login" ? (
            <a href="/player" className={btn.primary}>
              تسجيل الدخول
            </a>
          ) : (
            <button type="button" onClick={onRetry} className={btn.primary}>
              <RotateCcw size={20} /> حاول مرة ثانية
            </button>
          )}
        </section>
      )}
    </div>
  );
}

/** تحت اسم اللعبة: الشاشات من أي جهاز شغالة، أو النت ضعيف، أو نفس الجهاز بس */
function LinkBadge({ code, saving }: { code: string | null; saving: HiveSaving }) {
  if (!code) {
    return (
      <p className="text-xs font-bold text-amber-50/55 flex items-center gap-1.5">
        <span className="w-2 h-2 shrink-0 rounded-full bg-amber-50/40" /> شاشة العرض على هالجهاز بس
      </p>
    );
  }
  if (saving === "retrying") {
    return (
      <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
        <span className="w-2 h-2 shrink-0 rounded-full bg-amber-400 animate-pulse" /> النت ضعيف — اللعب مكمّل والشاشات تتحدث لما يرجع
      </p>
    );
  }
  return (
    <p className="text-xs font-bold text-green-300 flex items-center gap-1.5">
      <span className="w-2 h-2 shrink-0 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.9)]" /> العرض أونلاين ·{" "}
      <span dir="ltr" className="tracking-widest text-amber-100">
        {code}
      </span>
    </p>
  );
}

// ---------------------------------------------------------------------
// البداية
// ---------------------------------------------------------------------

function Setup({
  state,
  notice,
  onDisplay,
  onStart,
  takeBootAccess,
}: {
  state: HiveState;
  notice: string;
  onDisplay: () => void;
  onStart: (teams: Record<HiveTeam, string>, hard: boolean) => Promise<HiveStartResult>;
  takeBootAccess: () => HiveAccess | null;
}) {
  const [teams, setTeams] = useState(state.teams);
  const [hard, setHard] = useState(state.hardLetters);
  const [busy, setBusy] = useState(false);
  const [accessError, setAccessError] = useState("");

  // من ضمن الاشتراك (نفس المافيا): لو ما عنده اشتراك ولا تجربة ولا رصيد، نوريه الباقات بدل الإعدادات
  const [noAccess, setNoAccess] = useState(false);
  useEffect(() => {
    const check = (a: HiveAccess) => {
      if (!a.allowed && a.reason === "no_tokens") setNoAccess(true);
    };
    // أول ما تنفتح الشاشة: الفحص وصل مع الغرفة بنفس الطلب. بعدها (جلسة جديدة مثلاً) يتفحص من جديد
    const fromBoot = takeBootAccess();
    if (fromBoot) check(fromBoot);
    else checkAccessAction(LETTERS_HIVE_GAME.id).then(check);
  }, [takeBootAccess]);

  // كل بدء جلسة ينحسب لعبة مرة وحدة، بالسيرفر (جولة جديدة وتحديث الصفحة ما تنحسب)
  const start = async () => {
    setBusy(true);
    setAccessError("");
    const result = await onStart(teams, hard);
    if (result === "ok") return; // تنتقل لشاشة اللعب
    setBusy(false);
    if (result === "no_access") setNoAccess(true);
    else setAccessError("ما قدرنا نتأكد من اشتراكك، تأكد من الاتصال وحاول مرة ثانية.");
  };

  if (noAccess) {
    return (
      <div className="w-full max-w-md mx-auto my-6 flex flex-col gap-4">
        <div className="text-center flex flex-col items-center">
          <HiveLogo className="w-24 h-24 mb-2" />
          <h1 className="font-display text-5xl leading-tight">{LETTERS_HIVE_GAME.title}</h1>
        </div>
        <section className={`${HV_PANEL} rounded-[2rem] p-6 grid gap-3 justify-items-center text-center`}>
          <Crown size={40} className="text-amber-300" />
          <h2 className="text-2xl font-black">{LETTERS_HIVE_GAME.title} من ضمن الاشتراك</h2>
          <p className={`font-bold ${HV_MUTED} text-sm leading-relaxed`}>{LETTERS_HIVE_CONFIG.NO_ACCESS_MESSAGE}</p>
          <a href="/packages" className={`${btn.primary} mt-2`}>
            شوف الباقات
          </a>
        </section>
        <Link href="/" className={`mx-auto text-sm font-bold ${HV_MUTED} hover:text-white flex items-center gap-1.5`}>
          <Home size={16} /> الرئيسية
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto my-6 flex flex-col gap-4">
      <div className="text-center flex flex-col items-center">
        <HiveLogo className="w-24 h-24 mb-2" />
        <h1 className="font-display text-5xl leading-tight">{LETTERS_HIVE_GAME.title}</h1>
        <p className={`font-bold ${HV_MUTED} mt-2`}>أنت المقدم: تسأل من عندك، وتلوّن الخلية للفريق اللي جاوب صح</p>
      </div>

      <section className={`${HV_PANEL} rounded-[2rem] p-5 flex flex-col gap-4`}>
        <TeamFields teams={teams} onChange={setTeams} />
        <HardLettersToggle value={hard} onChange={setHard} />
        <button type="button" onClick={start} disabled={busy} className={btn.primary}>
          {busy ? <Loader2 size={22} className="animate-spin" /> : <Play size={22} />} ابدأ الجلسة
        </button>
        {accessError && <p className="text-center text-sm font-bold text-red-300">{accessError}</p>}
      </section>

      <button type="button" onClick={onDisplay} className={btn.ghost}>
        <Monitor size={20} /> افتح شاشة العرض
      </button>
      <Notice text={notice} />
      <p className="text-center text-xs font-bold text-amber-50/55 leading-relaxed">
        شاشة العرض تنفتح من أي جوال أو تلفزيون بالباركود أو كود الغرفة، أو بنافذة على هالجهاز تسحبها للشاشة الكبيرة. وتحكّم أنت من هالشاشة.
      </p>
      <Link href="/" className={`mx-auto text-sm font-bold ${HV_MUTED} hover:text-white flex items-center gap-1.5`}>
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
          <span className={`font-bold text-sm ${HV_MUTED}`}>
            {LETTERS_HIVE_TEAMS[team].emoji} اسم {LETTERS_HIVE_TEAMS[team].defaultName} — يوصّل {LETTERS_HIVE_TEAMS[team].goal}
          </span>
          <input
            value={teams[team]}
            maxLength={LETTERS_HIVE_CONFIG.TEAM_NAME_MAX}
            onChange={(e) => onChange({ ...teams, [team]: e.target.value })}
            placeholder={LETTERS_HIVE_TEAMS[team].defaultName}
            className={`w-full p-3.5 ${HV_INPUT} rounded-2xl font-black text-lg`}
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
        value ? "bg-amber-400/15 border-amber-400/80" : "bg-black/40 border-white/10"
      }`}
    >
      <span className={`w-11 h-6 shrink-0 rounded-full p-0.5 transition-colors ${value ? "bg-amber-400" : "bg-white/20"}`}>
        <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${value ? "-translate-x-5" : ""}`} />
      </span>
      <span>
        <span className="block font-black">الحروف الصعبة ({LETTERS_HIVE_CONFIG.HARD_LETTERS.join(" ")})</span>
        <span className={`block text-xs font-bold ${HV_MUTED}`}>تنخلط مع باقي الحروف، والنظام يختار منها 25 حرف كل جولة</span>
      </span>
    </button>
  );
}

function Notice({ text }: { text: string }) {
  if (!text) return null;
  return <p className="text-center text-sm font-bold text-amber-200 bg-amber-950/70 backdrop-blur-sm border border-amber-700 rounded-xl p-3">{text}</p>;
}

// ---------------------------------------------------------------------
// اللعب
// ---------------------------------------------------------------------

function Playing({
  state,
  update,
  notice,
  onDisplay,
  link,
}: {
  state: HiveState;
  update: Update;
  notice: string;
  onDisplay: () => void;
  /** حالة الشاشات (أونلاين بالكود، أو نفس الجهاز بس) */
  link: React.ReactNode;
}) {
  const win = useMemo(() => hiveWinner(state.owners), [state.owners]);
  const scores = hiveScores(state);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // شاشة كشف الفوز (عرض بس)
  const reveal = useHiveWinReveal(win?.team ?? null, true);

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
        <div className="flex-1 min-w-40 flex items-center gap-2.5">
          <HiveLogo className="w-11 h-11" />
          <div>
            <h1 className="font-display text-2xl leading-tight">{LETTERS_HIVE_GAME.title}</h1>
            <p className={`text-sm font-bold ${HV_MUTED}`}>الجولة {state.round}</p>
            {link}
          </div>
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

      {/* الجوال: النتيجة ثم اللوحة ثم التحكم. الكمبيوتر: اللوحة بعمود لحالها (طولها على قد الشاشة) والنتيجة والتحكم جنبها */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        <div className="grid grid-cols-2 gap-3 lg:col-start-2 lg:row-start-1">
          {HIVE_TEAMS.map((team) => (
            <div
              key={team}
              className={`rounded-2xl px-4 py-3 lg:px-3 flex items-center gap-3 lg:gap-2 ${HV_TEAM[team].card} ${
                win?.team === team ? "ring-4 ring-amber-300" : ""
              }`}
            >
              <span className="flex-1 min-w-0">
                <span className="block font-black text-lg lg:text-base leading-tight break-words">{state.teams[team]}</span>
                <span className={`block text-xs lg:text-[11px] font-bold ${HV_TEAM[team].goal}`}>يوصّل {LETTERS_HIVE_TEAMS[team].goal}</span>
              </span>
              <span className={`text-4xl lg:text-3xl font-black tabular-nums ${HV_TEAM[team].score}`}>{scores[team]}</span>
            </div>
          ))}
        </div>

        <HiveBoard
          letters={state.letters}
          owners={state.owners}
          active={state.active}
          path={win?.path}
          onCellClick={(i) => update((s) => selectHiveCell(s, i))}
          className="w-full h-auto lg:max-h-[calc(100dvh-7rem)] lg:col-start-1 lg:row-start-1 lg:row-span-2"
        />

        <aside className="flex flex-col gap-3 lg:col-start-2 lg:row-start-2">
          {win && (
            <div className={`rounded-3xl p-5 text-center animate-in zoom-in-95 ${HV_TEAM[win.team].card}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={HIVE_WIN_ART[win.team].icon} alt="" draggable={false} className="w-20 h-20 mx-auto mb-1 rounded-full drop-shadow-[0_0_16px_rgba(255,255,255,0.45)]" />
              <p className={`font-display text-3xl leading-tight ${HV_TEAM[win.team].score}`}>فاز {state.teams[win.team]}!</p>
              <p className={`text-sm font-bold mt-1 ${HV_TEAM[win.team].goal}`}>وصّلوا {LETTERS_HIVE_TEAMS[win.team].goal}</p>
            </div>
          )}
          {(!win || state.active !== null) && <ActivePanel state={state} update={update} />}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => update(undoHive)} disabled={state.history.length === 0} className={btn.ghost}>
              <Undo2 size={18} /> تراجع
            </button>
            <NewRoundButton finished={Boolean(win)} onNext={() => update(nextHiveRound)} />
          </div>
          <p className="text-xs font-bold text-amber-50/55 leading-relaxed">
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
      <HiveWinReveal reveal={reveal} teams={state.teams} />
    </div>
  );
}

/** الحرف المختار: المقدم يسأل عنه، ويلوّنه للفريق اللي جاوب صح */
function ActivePanel({ state, update }: { state: HiveState; update: Update }) {
  const i = state.active;
  if (i === null) {
    return (
      <div className={`rounded-3xl ${HV_GLASS_DASHED} p-5 text-center`}>
        <p className="text-4xl mb-2">👆</p>
        <p className="font-black">اختر حرف من اللوحة</p>
        <p className={`text-xs font-bold ${HV_MUTED} mt-1`}>يتوهج على شاشة العرض عشان الكل يعرف وش الحرف</p>
      </div>
    );
  }
  const owner = state.owners[i];
  const paint = (team: HiveTeam | null) => update((s) => setHiveCell(s, i, team));
  return (
    <div className={`rounded-3xl ${HV_GLASS} border-2 border-amber-200/70 p-4 flex flex-col gap-2 animate-in fade-in`}>
      <div className="flex items-center gap-3 mb-1">
        <span className={`w-16 h-16 shrink-0 rounded-2xl ${HV_ACTIVE_LETTER} text-4xl font-black flex items-center justify-center`}>
          {state.letters[i]}
        </span>
        <span className="font-bold text-amber-50/80 text-sm leading-relaxed">
          {owner ? `الخلية للحين مع ${state.teams[owner]} — تقدر تغيّرها` : "اسأل سؤال جوابه يبدأ بهالحرف، ومين جاوب صح؟"}
        </span>
      </div>
      {HIVE_TEAMS.map((team) => (
        <button
          key={team}
          type="button"
          onClick={() => paint(team)}
          disabled={owner === team}
          className={`w-full py-3.5 rounded-2xl border-b-4 font-black text-lg text-white active:border-b-0 active:translate-y-1 transition-all disabled:opacity-40 ${HV_TEAM[team].button}`}
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
      className={armed ? btn.armedBar : `${btn.bar} text-red-300!`}
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
    <div className={`fixed inset-0 z-[2500] flex items-end sm:items-center justify-center ${HV_BACKDROP} p-3 animate-in fade-in`} onClick={onClose}>
      <div
        role="dialog"
        aria-label="الإعدادات"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md ${HV_MODAL} rounded-[2rem] p-5 flex flex-col gap-4 animate-in slide-in-from-bottom-8`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Settings2 size={22} className="text-amber-300" /> الإعدادات
          </h2>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="w-11 h-11 rounded-2xl flex items-center justify-center text-amber-50/60 hover:bg-white/10">
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
