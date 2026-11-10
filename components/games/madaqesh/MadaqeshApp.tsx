"use client";

import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Cairo } from "next/font/google";
import { LogIn, Loader2, AlertCircle, DoorOpen, Undo2, Crown } from "lucide-react";
import { createMadaqeshRoom, getMadaqeshRoomPublicInfo, joinMadaqeshRoom, leaveMadaqeshRoom } from "@/actions/madaqesh";
import { checkAccessAction } from "@/app/actions/gameAccess";
import { MADAQESH_CONFIG, MADAQESH_GAME } from "@/constants/madaqesh";
import { useMadaqeshGame, type MadaqeshSession } from "@/hooks/games/madaqesh/useMadaqeshGame";
import { readMadaqeshSession, writeMadaqeshSession } from "@/lib/game/madaqesh-session";
import MadaqeshSettingsForm, { DEFAULT_MADAQESH_SETTINGS } from "./MadaqeshSettingsForm";
import MadaqeshScreen from "./MadaqeshScreen";
import { btn, Panel } from "./MadaqeshParts";
import { MQ_GOLD, MQ_GOLD_GLOW, MQ_ICON, MQ_INPUT, MQ_MAIN, MQ_MUTED } from "./madaqeshUi";

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
      className={`${MQ_MAIN} ${cairo.className}`}
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={MQ_ICON}
        alt=""
        draggable={false}
        className="w-28 h-28 mx-auto mb-3 rounded-full drop-shadow-[0_0_26px_rgba(214,165,49,0.55)]"
      />
      <h1 className="text-5xl font-black mb-2 [text-shadow:0_0_22px_rgba(179,32,42,0.6)]">{MADAQESH_GAME.title}</h1>
      <p className={`font-bold ${MQ_MUTED} text-sm`}>{subtitle}</p>
    </div>
  );
}

function NoticeLine({ notice }: { notice: string }) {
  if (!notice) return null;
  return (
    <p className="mb-4 text-center text-sm font-bold text-[#f3d98a] bg-[#d6a531]/15 backdrop-blur-sm border border-[#d6a531]/50 rounded-xl p-3 animate-in fade-in">
      {notice}
    </p>
  );
}

function ErrorLine({ error }: { error: string }) {
  if (!error) return null;
  return (
    <p className="flex items-center gap-2 text-sm font-bold text-red-100 bg-[#b3202a]/25 border border-[#b3202a]/60 rounded-xl p-3">
      <AlertCircle size={18} className="shrink-0" /> {error}
    </p>
  );
}

const inputClass = `w-full p-4 ${MQ_INPUT} rounded-2xl font-black text-lg`;

function ResumeOrNew({ roomCode, onResume, onNew }: { roomCode: string; onResume: () => void; onNew: () => void }) {
  return (
    <div className="w-full max-w-md mx-auto my-auto">
      <Header subtitle="جوالك داخل غرفة ثانية كلاعب" />
      <Panel className="text-center">
        <p className={`font-bold ${MQ_MUTED} mb-1`}>أنت داخل الغرفة</p>
        <p className={`text-4xl font-black tracking-[0.3em] ${MQ_GOLD_GLOW} mb-5`} dir="ltr">
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
  // من ضمن الاشتراك (نفس المافيا): لو ما عنده اشتراك ولا تجربة ولا رصيد، نوريه الباقات بدل الإعدادات
  const [noAccess, setNoAccess] = useState(false);
  useEffect(() => {
    checkAccessAction(MADAQESH_GAME.id).then((a) => {
      if (!a.allowed && a.reason === "no_tokens") setNoAccess(true);
    });
  }, []);

  if (noAccess) {
    return (
      <div className="w-full max-w-md mx-auto my-auto">
        <Header subtitle="السوم والتوزيع والمداقشة، والأرصدة تنحسب لحالها" />
        <Panel className="text-center grid gap-3 justify-items-center">
          <Crown size={40} className={MQ_GOLD} />
          <h2 className="text-2xl font-black">{MADAQESH_GAME.title} من ضمن الاشتراك</h2>
          <p className={`font-bold ${MQ_MUTED} text-sm leading-relaxed`}>{MADAQESH_CONFIG.NO_ACCESS_MESSAGE}</p>
          <a href="/packages" className={`${btn.primary} mt-2`}>
            شوف الباقات
          </a>
        </Panel>
      </div>
    );
  }

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
            <span className={`font-bold text-sm ${MQ_MUTED}`}>اسمك (أنت تلعب معهم)</span>
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
            <span className={`font-bold text-sm ${MQ_MUTED}`}>رمز الغرفة</span>
            <input
              value={roomCode}
              maxLength={MADAQESH_CONFIG.ROOM_CODE_LENGTH}
              dir="ltr"
              autoCapitalize="characters"
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().trim())}
              placeholder="DABCD"
              className={`${inputClass} text-2xl text-center tracking-[0.3em]`}
            />
            {lookupDone && !info && <span className="text-xs font-bold text-red-300">لم نجد غرفة بهذا الرمز.</span>}
            {info && (
              <span className={`text-xs font-bold ${closed || started ? MQ_GOLD : "text-emerald-300"}`}>
                {closed
                  ? "هذي الغرفة انقفلت."
                  : started
                    ? "اللعبة بدأت — إذا كنت داخل قبل، اكتب نفس اسمك بالضبط وترجع لمكانك"
                    : `داخلين ${info.joined}`}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-2">
            <span className={`font-bold text-sm ${MQ_MUTED}`}>اسمك</span>
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
