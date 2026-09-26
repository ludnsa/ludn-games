"use client";

import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Cairo } from "next/font/google";
import { LogIn, Loader2, AlertCircle } from "lucide-react";
import { createMafiaRoom, getMafiaRoomPublicInfo, joinMafiaRoom, leaveMafiaRoom } from "@/actions/mafia";
import { MAFIA_CONFIG, MAFIA_GAME } from "@/constants/mafia";
import { useMafiaGame, type MafiaSession } from "@/hooks/games/mafia/useMafiaGame";
import { unlockMafiaAudio } from "@/lib/game/mafia-sounds";
import MafiaSetupForm, { DEFAULT_MAFIA_SETTINGS } from "./MafiaSetupForm";
import MafiaScreen from "./MafiaScreen";
import MafiaFxLayer, { MafiaNightSky, MAFIA_STAGE_ID } from "./MafiaFxLayer";
import { Panel } from "./MafiaParts";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

/** الجلسة محفوظة لكل تبويب، عشان التحديث ما يطلّعك من اللعبة */
const SESSION_KEY = "mafia_session";

function readSession(): MafiaSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as MafiaSession) : null;
  } catch {
    return null;
  }
}

/** الجلسة المحفوظة، إلا لو فتح رابط غرفة ثانية فنتجاهلها */
function initialSession(): MafiaSession | null {
  if (typeof window === "undefined") return null;
  const saved = readSession();
  const fromUrl = new URLSearchParams(window.location.search).get("room")?.toUpperCase();
  return saved && (!fromUrl || fromUrl === saved.roomCode) ? saved : null;
}

const noopSubscribe = () => () => {};

function writeSession(session: MafiaSession | null) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // التخزين مقفل — اللعبة تشتغل بس التحديث بيطلّعك
  }
}

/**
 * نقطة الدخول للعبة المافيا.
 * mode="host": المنشئ (مسجّل دخول) ينشئ الغرفة ويلعب معهم.
 * mode="join": باقي اللاعبين يدخلون بالكود واسمهم بدون تسجيل.
 */
export default function MafiaApp({ mode }: { mode: "host" | "join" }) {
  // السيرفر ما يعرف الجلسة (محفوظة في المتصفح)، فما نرسم شي قبل ما نوصل للمتصفح
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [session, setSession] = useState<MafiaSession | null>(initialSession);

  const start = useCallback((s: MafiaSession) => {
    writeSession(s);
    setSession(s);
  }, []);

  const lost = useCallback(() => {
    writeSession(null);
    setSession(null);
  }, []);

  if (!mounted) return null;

  return (
    <main
      className={`min-h-[100dvh] bg-slate-950 text-white p-4 md:p-6 flex flex-col relative z-10 ${cairo.className}`}
      dir="rtl"
    >
      {session ? (
        <MafiaInGame session={session} onLost={lost} />
      ) : mode === "host" ? (
        <MafiaCreate onCreated={start} />
      ) : (
        <MafiaJoin onJoined={start} />
      )}
    </main>
  );
}

function MafiaInGame({ session, onLost }: { session: MafiaSession; onLost: () => void }) {
  const ctx = useMafiaGame(session, onLost);
  const phase = ctx.room?.phase;
  const isNight = phase === "night_act" || phase === "night_done";
  // الميت يشوف اللعبة باهتة لين تنتهي
  const isGhost = Boolean(ctx.me && !ctx.me.alive && phase !== "lobby" && phase !== "ended");

  const leave = async () => {
    await leaveMafiaRoom(session);
    onLost();
  };

  return (
    <>
      {/* خلفية الليل والنهار */}
      <div
        aria-hidden
        className={`fixed inset-0 -z-10 transition-colors duration-1000 ${
          isNight
            ? "bg-gradient-to-b from-indigo-950 via-slate-950 to-black"
            : "bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950"
        }`}
      >
        {isNight && <MafiaNightSky />}
      </div>

      {/* المسرح: هذا اللي يهتز مع الذبح والانفجار */}
      <div
        id={MAFIA_STAGE_ID}
        className={`flex-1 flex flex-col transition-[filter] duration-1000 ${isGhost ? "grayscale-[70%]" : ""}`}
      >
        <MafiaScreen ctx={ctx} onLeave={leave} />
      </div>
      <MafiaFxLayer />
    </>
  );
}

function Header({ subtitle }: { subtitle: string }) {
  return (
    <div className="text-center mb-6">
      <p className="text-7xl mb-3">🕵️‍♂️🔪</p>
      <h1 className="text-4xl font-black mb-2">{MAFIA_GAME.title}</h1>
      <p className="font-bold text-slate-400 text-sm">{subtitle}</p>
    </div>
  );
}

function ErrorLine({ error }: { error: string }) {
  if (!error) return null;
  return (
    <p className="flex items-center gap-2 text-sm font-bold text-red-200 bg-red-950/60 rounded-xl p-3">
      <AlertCircle size={18} className="shrink-0" /> {error}
    </p>
  );
}

const inputClass =
  "w-full p-4 bg-slate-900 border-2 border-slate-800 rounded-2xl font-black text-lg focus:border-red-500 outline-none transition-colors";

function MafiaCreate({ onCreated }: { onCreated: (s: MafiaSession) => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="w-full max-w-md mx-auto my-auto">
      <Header subtitle="جهّز الغرفة، اختر الفئات، وخل الشباب يدخلون من جوالاتهم" />
      <Panel>
        <MafiaSetupForm
          initial={DEFAULT_MAFIA_SETTINGS}
          busy={busy}
          submitLabel="إنشاء الغرفة 🔥"
          onSubmit={async (settings) => {
            unlockMafiaAudio();
            setError("");
            if (name.trim().length < 2) {
              setError("اكتب اسمك (حرفين على الأقل).");
              return;
            }
            setBusy(true);
            const res = await createMafiaRoom({ displayName: name.trim(), settings });
            setBusy(false);
            if (!res.success) setError(res.error);
            else onCreated(res.data);
          }}
        >
          <label className="flex flex-col gap-2">
            <span className="font-bold text-sm text-slate-400">اسمك (أنت تلعب معهم)</span>
            <input
              value={name}
              maxLength={16}
              onChange={(e) => setName(e.target.value)}
              placeholder="اكتب اسمك"
              className={inputClass}
            />
          </label>
          <ErrorLine error={error} />
        </MafiaSetupForm>
      </Panel>
    </div>
  );
}

function MafiaJoin({ onJoined }: { onJoined: (s: MafiaSession) => void }) {
  const [roomCode, setRoomCode] = useState(
    () => new URLSearchParams(window.location.search).get("room")?.toUpperCase().slice(0, MAFIA_CONFIG.ROOM_CODE_LENGTH) ?? ""
  );
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // نتيجة البحث عن الغرفة مربوطة بالكود اللي انبحث عنه، فأي تعديل على الكود يلغيها تلقائياً
  const [lookup, setLookup] = useState<{
    code: string;
    info: { phase: string; joined: number; maxPlayers: number } | null;
  } | null>(null);
  const lookupDone = lookup?.code === roomCode;
  const info = lookupDone ? lookup.info : null;

  useEffect(() => {
    if (roomCode.length !== MAFIA_CONFIG.ROOM_CODE_LENGTH) return;
    let cancelled = false;
    getMafiaRoomPublicInfo(roomCode).then((res) => {
      if (!cancelled) setLookup({ code: roomCode, info: res.success ? res.data : null });
    });
    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    unlockMafiaAudio();
    setError("");
    if (name.trim().length < 2) {
      setError("اكتب اسمك (حرفين على الأقل).");
      return;
    }
    setBusy(true);
    const res = await joinMafiaRoom({ roomCode, displayName: name.trim() });
    setBusy(false);
    if (!res.success) setError(res.error);
    else onJoined(res.data);
  };

  const closed = info && (info.phase !== "lobby" || info.joined >= info.maxPlayers);

  return (
    <div className="w-full max-w-md mx-auto my-auto">
      <Header subtitle="ادخل كود الغرفة واسمك، وخل جوالك بعيد عن عيون الباقين 👀" />
      <Panel>
        <form onSubmit={join} className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="font-bold text-sm text-slate-400">رمز الغرفة</span>
            <input
              value={roomCode}
              maxLength={MAFIA_CONFIG.ROOM_CODE_LENGTH}
              dir="ltr"
              autoCapitalize="characters"
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().trim())}
              placeholder="MABCD"
              className={`${inputClass} text-2xl text-center tracking-[0.3em]`}
            />
            {lookupDone && !info && (
              <span className="text-xs font-bold text-red-400">لم نجد غرفة بهذا الرمز.</span>
            )}
            {info && (
              <span className={`text-xs font-bold ${closed ? "text-amber-400" : "text-emerald-400"}`}>
                {info.phase !== "lobby"
                  ? "اللعبة بدأت، ما تقدر تدخل الحين."
                  : `داخلين ${info.joined} من ${info.maxPlayers}${info.joined >= info.maxPlayers ? " — الغرفة ممتلئة" : ""}`}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-bold text-sm text-slate-400">اسمك</span>
            <input
              value={name}
              maxLength={16}
              onChange={(e) => setName(e.target.value)}
              placeholder="اكتب اسمك"
              className={inputClass}
            />
          </label>

          <ErrorLine error={error} />

          <button
            type="submit"
            disabled={busy || !info || Boolean(closed)}
            className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-lg rounded-2xl border-b-4 border-red-800 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="animate-spin" size={22} /> : <LogIn size={22} />}
            ادخل اللعبة
          </button>
        </form>
      </Panel>
    </div>
  );
}
