"use client";

import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Cairo } from "next/font/google";
import { LogIn, Loader2, AlertCircle, DoorOpen, Undo2 } from "lucide-react";
import { createMadaqeshRoom, getMadaqeshRoomPublicInfo, joinMadaqeshRoom, leaveMadaqeshRoom } from "@/actions/madaqesh";
import { MADAQESH_CONFIG, MADAQESH_GAME } from "@/constants/madaqesh";
import { useMadaqeshGame, type MadaqeshSession } from "@/hooks/games/madaqesh/useMadaqeshGame";
import { readMadaqeshSession, writeMadaqeshSession } from "@/lib/game/madaqesh-session";
import MadaqeshSettingsForm, { DEFAULT_MADAQESH_SETTINGS } from "./MadaqeshSettingsForm";
import MadaqeshScreen from "./MadaqeshScreen";
import { btn, Panel } from "./MadaqeshParts";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

/** الجلسة المحفوظة، إلا لو فتح رابط غرفة ثانية فنتجاهلها */
function initialSession(): MadaqeshSession | null {
  if (typeof window === "undefined") return null;
  const saved = readMadaqeshSession();
  const fromUrl = new URLSearchParams(window.location.search).get("room")?.toUpperCase();
  return saved && (!fromUrl || fromUrl === saved.roomCode) ? saved : null;
}

const noopSubscribe = () => () => {};

/**
 * نقطة الدخول لحاسبة مداقش.
 * mode="host": المنشئ (مسجّل دخول) ينشئ الغرفة ويلعب معهم.
 * mode="join": الباقين يدخلون بالكود واسمهم بدون تسجيل.
 */
export default function MadaqeshApp({ mode }: { mode: "host" | "join" }) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [session, setSession] = useState<MadaqeshSession | null>(initialSession);
  const [notice, setNotice] = useState("");
  const [resumeChosen, setResumeChosen] = useState(false);

  const start = useCallback((s: MadaqeshSession) => {
    writeMadaqeshSession(s);
    setSession(s);
  }, []);

  const lost = useCallback((message?: string) => {
    writeMadaqeshSession(null);
    setSession(null);
    setNotice(message ?? "");
  }, []);

  if (!mounted) return null;

  // صفحة المنشئ وهذا الجهاز داخل غرفة غيره كلاعب: يرجع لها أو يسوي غرفته
  const askResume = mode === "host" && session !== null && !session.host && !resumeChosen;

  return (
    <main
      className={`min-h-[100dvh] text-white p-4 md:p-6 flex flex-col relative z-10 bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-950 ${cairo.className}`}
      dir="rtl"
    >
      {session && askResume ? (
        <ResumeOrNew
          roomCode={session.roomCode}
          onResume={() => setResumeChosen(true)}
          onNew={() => {
            leaveMadaqeshRoom(session);
            lost();
          }}
        />
      ) : session ? (
        <InGame key={session.roomCode} session={session} onLost={lost} onSwitch={start} />
      ) : mode === "host" ? (
        <CreateRoom onCreated={start} notice={notice} />
      ) : (
        <JoinRoom onJoined={start} notice={notice} />
      )}
    </main>
  );
}

function InGame({
  session,
  onLost,
  onSwitch,
}: {
  session: MadaqeshSession;
  onLost: (notice?: string) => void;
  onSwitch: (next: MadaqeshSession) => void;
}) {
  const ctx = useMadaqeshGame(session, onLost, onSwitch);
  const phase = ctx.room?.phase;

  // الغرفة انقفلت: الجهاز ينساها
  useEffect(() => {
    if (phase === "closed") writeMadaqeshSession(null);
  }, [phase]);

  // جلسة المنشئ: نعلّمها عشان ما يطلع له سؤال "ترجع ولا غرفة جديدة"
  useEffect(() => {
    if (ctx.isHost && !session.host && phase !== "closed") writeMadaqeshSession({ ...session, host: true });
  }, [ctx.isHost, session, phase]);

  const leave = async () => {
    await leaveMadaqeshRoom(session);
    onLost();
  };

  return <MadaqeshScreen ctx={ctx} onLeave={leave} />;
}

function Header({ subtitle }: { subtitle: string }) {
  return (
    <div className="text-center mb-6">
      <p className="text-7xl mb-3">🧮</p>
      <h1 className="text-4xl font-black mb-2">{MADAQESH_GAME.title}</h1>
      <p className="font-bold text-slate-400 text-sm">{subtitle}</p>
    </div>
  );
}

function NoticeLine({ notice }: { notice: string }) {
  if (!notice) return null;
  return (
    <p className="mb-4 text-center text-sm font-bold text-amber-200 bg-amber-950/60 border border-amber-800 rounded-xl p-3 animate-in fade-in">
      {notice}
    </p>
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
  "w-full p-4 bg-slate-900 border-2 border-slate-800 rounded-2xl font-black text-lg focus:border-amber-500 outline-none transition-colors";

function ResumeOrNew({ roomCode, onResume, onNew }: { roomCode: string; onResume: () => void; onNew: () => void }) {
  return (
    <div className="w-full max-w-md mx-auto my-auto">
      <Header subtitle="جوالك داخل غرفة ثانية كلاعب" />
      <Panel className="text-center">
        <p className="font-bold text-slate-400 mb-1">أنت داخل الغرفة</p>
        <p className="text-4xl font-black tracking-[0.3em] text-amber-400 mb-5" dir="ltr">
          {roomCode}
        </p>
        <div className="flex flex-col gap-3">
          <button type="button" onClick={onNew} className={btn.primary}>
            <DoorOpen size={22} /> سوّ غرفة جديدة
          </button>
          <button type="button" onClick={onResume} className={btn.ghost}>
            <Undo2 size={22} /> ارجع للغرفة {roomCode}
          </button>
        </div>
      </Panel>
    </div>
  );
}

function CreateRoom({ onCreated, notice }: { onCreated: (s: MadaqeshSession) => void; notice: string }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="w-full max-w-md mx-auto my-auto">
      <Header subtitle="السوم والتوزيع والمداقشة، والأرصدة تنحسب لحالها" />
      <NoticeLine notice={notice} />
      <Panel>
        <MadaqeshSettingsForm
          initial={DEFAULT_MADAQESH_SETTINGS}
          busy={busy}
          submitLabel="إنشاء الغرفة 🔥"
          onSubmit={async (settings) => {
            setError("");
            if (name.trim().length < 2) {
              setError("اكتب اسمك (حرفين على الأقل).");
              return;
            }
            setBusy(true);
            const res = await createMadaqeshRoom({ displayName: name.trim(), settings });
            setBusy(false);
            if (!res.success) setError(res.error);
            else onCreated({ ...res.data, host: true });
          }}
        >
          <label className="flex flex-col gap-2">
            <span className="font-bold text-sm text-slate-400">اسمك (أنت تلعب معهم)</span>
            <input value={name} maxLength={16} onChange={(e) => setName(e.target.value)} placeholder="اكتب اسمك" className={inputClass} />
          </label>
          <ErrorLine error={error} />
        </MadaqeshSettingsForm>
      </Panel>
    </div>
  );
}

function JoinRoom({ onJoined, notice }: { onJoined: (s: MadaqeshSession) => void; notice: string }) {
  const [roomCode, setRoomCode] = useState(
    () => new URLSearchParams(window.location.search).get("room")?.toUpperCase().slice(0, MADAQESH_CONFIG.ROOM_CODE_LENGTH) ?? ""
  );
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lookup, setLookup] = useState<{ code: string; info: { phase: string; joined: number } | null } | null>(null);
  const lookupDone = lookup?.code === roomCode;
  const info = lookupDone ? lookup.info : null;

  useEffect(() => {
    if (roomCode.length !== MADAQESH_CONFIG.ROOM_CODE_LENGTH) return;
    let cancelled = false;
    getMadaqeshRoomPublicInfo(roomCode).then((res) => {
      if (!cancelled) setLookup({ code: roomCode, info: res.success ? res.data : null });
    });
    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) {
      setError("اكتب اسمك (حرفين على الأقل).");
      return;
    }
    setBusy(true);
    const res = await joinMadaqeshRoom({ roomCode, displayName: name.trim() });
    setBusy(false);
    if (!res.success) setError(res.error);
    else onJoined(res.data);
  };

  const closed = info?.phase === "closed";
  const started = info && info.phase !== "lobby" && !closed;

  return (
    <div className="w-full max-w-md mx-auto my-auto">
      <Header subtitle="ادخل كود الغرفة واسمك" />
      <NoticeLine notice={notice} />
      <Panel>
        <form onSubmit={join} className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="font-bold text-sm text-slate-400">رمز الغرفة</span>
            <input
              value={roomCode}
              maxLength={MADAQESH_CONFIG.ROOM_CODE_LENGTH}
              dir="ltr"
              autoCapitalize="characters"
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().trim())}
              placeholder="DABCD"
              className={`${inputClass} text-2xl text-center tracking-[0.3em]`}
            />
            {lookupDone && !info && <span className="text-xs font-bold text-red-400">لم نجد غرفة بهذا الرمز.</span>}
            {info && (
              <span className={`text-xs font-bold ${closed || started ? "text-amber-400" : "text-emerald-400"}`}>
                {closed
                  ? "هذي الغرفة انقفلت."
                  : started
                    ? "اللعبة بدأت — إذا كنت داخل قبل، اكتب نفس اسمك بالضبط وترجع لمكانك"
                    : `داخلين ${info.joined}`}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-bold text-sm text-slate-400">اسمك</span>
            <input value={name} maxLength={16} onChange={(e) => setName(e.target.value)} placeholder="اكتب اسمك" className={inputClass} />
          </label>
          <ErrorLine error={error} />
          <button type="submit" disabled={busy || !info || closed} className={btn.primary}>
            {busy ? <Loader2 className="animate-spin" size={22} /> : <LogIn size={22} />}
            ادخل
          </button>
        </form>
      </Panel>
    </div>
  );
}
