"use client";

import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Cairo } from "next/font/google";
import { LogIn, Loader2, AlertCircle, DoorOpen, Undo2 } from "lucide-react";
import { createMafiaRoom, getMafiaRoomPublicInfo, joinMafiaRoom, leaveMafiaRoom } from "@/actions/mafia";
import { MAFIA_CONFIG, MAFIA_GAME } from "@/constants/mafia";
import { useMafiaGame, type MafiaSession } from "@/hooks/games/mafia/useMafiaGame";
import { unlockMafiaAudio } from "@/lib/game/mafia-sounds";
import { readMafiaSession, writeMafiaSession } from "@/lib/game/mafia-session";
import MafiaSetupForm, { DEFAULT_MAFIA_SETTINGS } from "./MafiaSetupForm";
import MafiaScreen from "./MafiaScreen";
import MafiaFxLayer, { MafiaBackdrop, MAFIA_STAGE_ID } from "./MafiaFxLayer";
import { Panel, RoleIcon } from "./MafiaParts";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

/** الجلسة المحفوظة، إلا لو فتح رابط غرفة ثانية فنتجاهلها */
function initialSession(): MafiaSession | null {
  if (typeof window === "undefined") return null;
  const saved = readMafiaSession();
  const fromUrl = new URLSearchParams(window.location.search).get("room")?.toUpperCase();
  return saved && (!fromUrl || fromUrl === saved.roomCode) ? saved : null;
}

const noopSubscribe = () => () => {};

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
    writeMafiaSession(s);
    setSession(s);
  }, []);

  // صفحة المنشئ وهذا الجهاز داخل غرفة غيره كلاعب (مثلاً المنشئ القديم طلع):
  // نخيّره يرجع لها أو يسوي غرفته — بدل ما نرجّعه لها غصب
  const [resumeChosen, setResumeChosen] = useState(false);
  const askResume = mode === "host" && session !== null && !session.host && !resumeChosen;

  // رسالة تطلع في شاشة الدخول بعد ما يطلع اللاعب (مثل: انطردت)
  const [notice, setNotice] = useState("");

  const lost = useCallback((message?: string) => {
    writeMafiaSession(null);
    setSession(null);
    setNotice(message ?? "");
  }, []);

  if (!mounted) return null;

  return (
    <main
      className={`min-h-[100dvh] bg-slate-950 text-white p-4 md:p-6 flex flex-col relative z-10 ${cairo.className}`}
      dir="rtl"
    >
      {/* شاشات الدخول: خلفية الليل (داخل اللعبة MafiaInGame يحط خلفيته حسب المرحلة) */}
      {(!session || askResume) && <MafiaBackdrop night />}
      {session && askResume ? (
        <MafiaResumeOrNew
          roomCode={session.roomCode}
          onResume={() => setResumeChosen(true)}
          onNew={() => {
            leaveMafiaRoom(session);
            lost();
          }}
        />
      ) : session ? (
        <MafiaInGame key={session.roomCode} session={session} onLost={lost} onSwitch={start} />
      ) : mode === "host" ? (
        <MafiaCreate onCreated={start} notice={notice} />
      ) : (
        <MafiaJoin onJoined={start} notice={notice} />
      )}
    </main>
  );
}

function MafiaInGame({
  session,
  onLost,
  onSwitch,
}: {
  session: MafiaSession;
  onLost: (notice?: string) => void;
  /** المنشئ فتح غرفة جديدة: ننتقل لها */
  onSwitch: (next: MafiaSession) => void;
}) {
  const ctx = useMafiaGame(session, onLost, onSwitch);
  const phase = ctx.room?.phase;

  // الغرفة انقفلت: الجهاز ينساها، فأي صفحة مافيا يفتحها بعدين تبدأ من جديد
  useEffect(() => {
    if (phase === "closed") writeMafiaSession(null);
  }, [phase]);

  // جلسة منشئ محفوظة قبل علامة host: نعلّمها، عشان ما يطلع له سؤال "ترجع ولا غرفة جديدة"
  const isHost = Boolean(ctx.me?.isHost);
  useEffect(() => {
    if (isHost && !session.host && phase !== "closed") writeMafiaSession({ ...session, host: true });
  }, [isHost, session, phase]);
  // خلفية النهار للصباح والنقاش والتصويت (ولفوز المدينة)، والليل لكل الباقي
  const isDay =
    phase === "morning" ||
    phase === "discussion" ||
    phase === "voting" ||
    phase === "vote_result" ||
    (phase === "ended" && ctx.room?.winner === "town");
  // الميت يشوف اللعبة باهتة لين تنتهي
  const isGhost = Boolean(ctx.me && !ctx.me.alive && phase !== "lobby" && phase !== "ended");

  const leave = async () => {
    await leaveMafiaRoom(session);
    onLost();
  };

  return (
    <>
      {/* خلفية الليل والنهار */}
      <MafiaBackdrop night={!isDay} />

      {/* المسرح: شاشة اللعبة كاملة (الميت يشوفها باهتة) */}
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

/** هذا الجهاز داخل غرفة ثانية كلاعب — يرجع لها أو يسوي غرفة جديدة */
function MafiaResumeOrNew({
  roomCode,
  onResume,
  onNew,
}: {
  roomCode: string;
  onResume: () => void;
  onNew: () => void;
}) {
  return (
    <div className="w-full max-w-md mx-auto my-auto">
      <Header subtitle="جوالك داخل غرفة ثانية كلاعب" />
      <Panel className="text-center">
        <p className="font-bold text-slate-400 mb-1">أنت داخل الغرفة</p>
        <p className="text-4xl font-black tracking-[0.3em] text-red-400 mb-5" dir="ltr">
          {roomCode}
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onNew}
            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black text-lg rounded-2xl border-b-4 border-red-800 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
          >
            <DoorOpen size={22} /> سوّ غرفة جديدة
          </button>
          <button
            type="button"
            onClick={onResume}
            className="w-full py-4 bg-slate-800 rounded-2xl border-b-4 border-slate-950 font-black text-lg active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
          >
            <Undo2 size={22} /> ارجع للغرفة {roomCode}
          </button>
        </div>
      </Panel>
    </div>
  );
}

function Header({ subtitle }: { subtitle: string }) {
  return (
    <div className="text-center mb-6">
      <RoleIcon role="mafia" className="w-32 h-32 mx-auto mb-3 drop-shadow-[0_0_28px_rgba(220,38,38,0.55)]" />
      <h1 className="text-4xl font-black mb-2">{MAFIA_GAME.title}</h1>
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
  "w-full p-4 bg-slate-900 border-2 border-slate-800 rounded-2xl font-black text-lg focus:border-red-500 outline-none transition-colors";

function MafiaCreate({ onCreated, notice }: { onCreated: (s: MafiaSession) => void; notice: string }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="w-full max-w-md mx-auto my-auto">
      <Header subtitle="جهّز الغرفة، اختر الفئات، وخل الشباب يدخلون من جوالاتهم" />
      <NoticeLine notice={notice} />
      <Panel>
        <MafiaSetupForm
          initial={DEFAULT_MAFIA_SETTINGS}
          busy={busy}
          submitLabel="إنشاء الغرفة"
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
            else onCreated({ ...res.data, host: true });
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

function MafiaJoin({ onJoined, notice }: { onJoined: (s: MafiaSession) => void; notice: string }) {
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

  // الغرفة الممتلئة ما تقفل الزر: اللي كان داخل قبل يقدر يرجع بنفس اسمه
  const closed = info && info.phase !== "lobby";
  const full = Boolean(info && info.joined >= info.maxPlayers);

  return (
    <div className="w-full max-w-md mx-auto my-auto">
      <Header subtitle="ادخل كود الغرفة واسمك، وخل جوالك بعيد عن عيون الباقين" />
      <NoticeLine notice={notice} />
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
              <span className={`text-xs font-bold ${closed || full ? "text-amber-400" : "text-emerald-400"}`}>
                {info.phase === "closed"
                  ? "هذي الغرفة انقفلت، اطلب الكود الجديد من المنشئ."
                  : info.phase !== "lobby"
                    ? "اللعبة بدأت، ما تقدر تدخل الحين."
                    : full
                      ? "الغرفة ممتلئة — إذا كنت داخل قبل، اكتب نفس اسمك وترجع لمكانك"
                      : `داخلين ${info.joined} من ${info.maxPlayers}`}
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
