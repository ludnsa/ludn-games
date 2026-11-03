"use client";

import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Cairo } from "next/font/google";
import { LogIn, Loader2, AlertCircle, DoorOpen, Undo2, Crown } from "lucide-react";
import {
  createMafiaRoom,
  getMafiaRoomPublicInfo,
  isMafiaRoomFromOtherAccount,
  joinMafiaRoom,
  leaveMafiaRoom,
} from "@/actions/mafia";
import { checkAccessAction } from "@/app/actions/gameAccess";
import { MAFIA_CONFIG, MAFIA_GAME, mafiaCardSrc } from "@/constants/mafia";
import { useMafiaGame, type MafiaSession } from "@/hooks/games/mafia/useMafiaGame";
import { unlockMafiaAudio } from "@/lib/game/mafia-sounds";
import { readMafiaSession, writeMafiaSession } from "@/lib/game/mafia-session";
import MafiaSetupForm, { DEFAULT_MAFIA_SETTINGS } from "./MafiaSetupForm";
import MafiaScreen from "./MafiaScreen";
import MafiaFxLayer, { MafiaBackdrop, MAFIA_STAGE_ID } from "./MafiaFxLayer";
import { Panel } from "./MafiaParts";
import { BTN_GOLD, BTN_SOFT, ERROR, FIELD, H_CARD, H_PAGE, INFO, LABEL } from "./mafiaUi";

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

  // غرفة منشئ محفوظة بحساب ثاني (سجّل دخول بحساب غير اللي سوّاها): أزرار المنشئ ما تشتغل له،
  // فنطلّعه منها ويسوي غرفته بدل ما يضغط وما يصير شي
  const [foreignRoom, setForeignRoom] = useState<string | null>(null);
  const hostCode = mode === "host" && session?.host ? session.roomCode : null;
  useEffect(() => {
    if (!hostCode) return;
    let active = true;
    isMafiaRoomFromOtherAccount(hostCode)
      .then((other) => {
        if (active && other) setForeignRoom(hostCode);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [hostCode]);
  const foreign = hostCode !== null && foreignRoom === hostCode;

  // رسالة تطلع في شاشة الدخول بعد ما يطلع اللاعب (مثل: انطردت)
  const [notice, setNotice] = useState("");

  const lost = useCallback((message?: string) => {
    writeMafiaSession(null);
    setSession(null);
    setNotice(message ?? "");
  }, []);

  if (!mounted) return null;

  return (
    // dark: اللعبة ليلية دايماً — ألوان لدن الليلية حتى لو الموقع على الوضع النهاري
    <main
      className={`dark min-h-[100dvh] bg-ludn-bg text-ludn-fg p-4 md:p-6 flex flex-col relative z-10 ${cairo.className}`}
      dir="rtl"
    >
      {/* شاشات الدخول: خلفية الليل (داخل اللعبة MafiaInGame يحط خلفيته حسب المرحلة) */}
      {(!session || askResume || foreign) && <MafiaBackdrop night />}
      {session && foreign ? (
        <MafiaForeignRoom roomCode={session.roomCode} onNew={() => lost()} />
      ) : session && askResume ? (
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
      <Panel className="text-center grid gap-3">
        <p className={LABEL}>أنت داخل الغرفة</p>
        <p className="font-display text-[44px] leading-none tracking-[0.22em] text-ludn-gold-text" dir="ltr">
          {roomCode}
        </p>
        <button type="button" onClick={onNew} className={BTN_GOLD}>
          <DoorOpen size={20} /> سوّ غرفة جديدة
        </button>
        <button type="button" onClick={onResume} className={`${BTN_SOFT} w-full`}>
          <Undo2 size={18} /> ارجع للغرفة {roomCode}
        </button>
      </Panel>
    </div>
  );
}

/** الغرفة المحفوظة انسوّت بحساب ثاني — أزرار المنشئ ما تشتغل بهذا الحساب */
function MafiaForeignRoom({ roomCode, onNew }: { roomCode: string; onNew: () => void }) {
  return (
    <div className="w-full max-w-md mx-auto my-auto">
      <Header subtitle="هذي الغرفة انسوّت بحساب ثاني" />
      <Panel className="text-center grid gap-3">
        <p className="font-display text-[44px] leading-none tracking-[0.22em] text-ludn-gold-text" dir="ltr">
          {roomCode}
        </p>
        <p className={`${LABEL} leading-relaxed`}>
          جوالك حافظ هالغرفة، بس أنت داخل الحين بحساب غير اللي سوّاها، فأزرار المنشئ ما تشتغل لك.
          سوّ غرفة جديدة بحسابك، أو سجّل دخول بالحساب اللي سوّاها.
        </p>
        <button type="button" onClick={onNew} className={BTN_GOLD}>
          <DoorOpen size={20} /> سوّ غرفة جديدة
        </button>
      </Panel>
    </div>
  );
}

/** رأس شاشات الدخول: مروحة بطاقات (المحقق، المافيا، الطبيب) مثل الصفحة الرئيسية */
function Header({ subtitle }: { subtitle: string }) {
  const card = "shrink-0 aspect-[512/752] rounded-xl shadow-[0_14px_30px_rgba(0,0,0,0.6)] select-none";
  return (
    <div className="grid justify-items-center gap-1 text-center mb-4">
      {/* eslint-disable @next/next/no-img-element */}
      <div aria-hidden className="flex justify-center items-end h-[186px] mb-1.5">
        <img src={mafiaCardSrc("detective")} alt="" draggable={false} className={`${card} w-[92px] ludn-fan-r`} />
        <img
          src={mafiaCardSrc("mafia")}
          alt=""
          draggable={false}
          className={`${card} w-[112px] relative z-[2] ludn-fan-mid shadow-[0_16px_36px_rgba(0,0,0,0.7),0_0_0_1px_rgba(226,184,74,0.5),0_0_34px_rgba(210,59,59,0.35)]`}
        />
        <img src={mafiaCardSrc("doctor")} alt="" draggable={false} className={`${card} w-[92px] ludn-fan-l`} />
      </div>
      {/* eslint-enable @next/next/no-img-element */}
      <p className="text-[13px] font-bold tracking-wide text-ludn-gold-text">ليل ونهار · كل واحد على جواله</p>
      <h1 className={H_PAGE}>{MAFIA_GAME.title}</h1>
      <p className="text-sm font-semibold leading-relaxed text-ludn-muted max-w-[28ch]">{subtitle}</p>
    </div>
  );
}

function NoticeLine({ notice }: { notice: string }) {
  if (!notice) return null;
  return <p className={`${INFO} mb-3 animate-in fade-in`}>{notice}</p>;
}

function ErrorLine({ error }: { error: string }) {
  if (!error) return null;
  return (
    <p className={ERROR}>
      <AlertCircle size={18} className="shrink-0" /> {error}
    </p>
  );
}

function MafiaCreate({ onCreated, notice }: { onCreated: (s: MafiaSession) => void; notice: string }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // المافيا من ضمن الاشتراك: لو ما عنده اشتراك ولا تجربة ولا رصيد، نوريه الباقات بدل الإعدادات
  const [noAccess, setNoAccess] = useState(false);
  useEffect(() => {
    if (MAFIA_CONFIG.IS_FREE) return;
    checkAccessAction(MAFIA_GAME.id).then((a) => {
      if (!a.allowed && a.reason === "no_tokens") setNoAccess(true);
    });
  }, []);

  if (noAccess) {
    return (
      <div className="w-full max-w-md mx-auto my-auto">
        <Header subtitle="جهّز الغرفة، اختر الفئات، وخل الشباب يدخلون من جوالاتهم" />
        <Panel className="text-center grid gap-2 justify-items-center">
          <Crown size={40} className="text-ludn-gold" />
          <h2 className={H_CARD}>المافيا من ضمن الاشتراك</h2>
          <p className={`${LABEL} leading-relaxed`}>{MAFIA_CONFIG.NO_ACCESS_MESSAGE}</p>
          <a href="/packages" className={`${BTN_GOLD} mt-2`}>
            شوف الباقات
          </a>
        </Panel>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto my-auto">
      <Header subtitle="جهّز الغرفة، اختر الفئات، وخل الشباب يدخلون من جوالاتهم" />
      <NoticeLine notice={notice} />
      <MafiaSetupForm
          initial={DEFAULT_MAFIA_SETTINGS}
          busy={busy}
          submitLabel="إنشاء الغرفة"
          sticky
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
            if (!res.success) {
              if (res.error === MAFIA_CONFIG.NO_ACCESS_MESSAGE) setNoAccess(true);
              else setError(res.error);
            } else onCreated({ ...res.data, host: true });
          }}
        >
          <label className="flex flex-col gap-2">
            <span className={LABEL}>اسمك (أنت تلعب معهم)</span>
            <input
              value={name}
              maxLength={16}
              onChange={(e) => setName(e.target.value)}
              placeholder="اكتب اسمك"
              className={FIELD}
            />
          </label>
          <ErrorLine error={error} />
      </MafiaSetupForm>
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
        <form onSubmit={join} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className={LABEL}>كود الغرفة</span>
            <input
              value={roomCode}
              maxLength={MAFIA_CONFIG.ROOM_CODE_LENGTH}
              dir="ltr"
              autoCapitalize="characters"
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().trim())}
              placeholder="MABCD"
              className={`${FIELD} min-h-14 font-display text-[30px] text-center tracking-[0.22em] text-ludn-gold-text placeholder:text-[22px]`}
            />
            {lookupDone && !info && (
              <span className="text-xs font-bold text-rose-400">لم نجد غرفة بهذا الرمز.</span>
            )}
            {info && (
              <span className={`text-xs font-bold ${closed || full ? "text-ludn-gold-text" : "text-ludn-green"}`}>
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
            <span className={LABEL}>اسمك</span>
            <input
              value={name}
              maxLength={16}
              onChange={(e) => setName(e.target.value)}
              placeholder="اكتب اسمك"
              className={FIELD}
            />
          </label>

          <ErrorLine error={error} />

          <button type="submit" disabled={busy || !info || Boolean(closed)} className={BTN_GOLD}>
            {busy ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
            ادخل اللعبة
          </button>
        </form>
      </Panel>
    </div>
  );
}
