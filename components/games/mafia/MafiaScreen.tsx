"use client";

import React, { useEffect } from "react";
import {
  Loader2,
  LogOut,
  AlertCircle,
  X,
  Crown,
  Users,
  VenetianMask,
  Moon,
  Sunrise,
  MessagesSquare,
  Vote,
  Gavel,
  Flag,
  DoorClosed,
  Ghost,
  Lock,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";
import { MAFIA_CONFIG, MAFIA_GAME } from "@/constants/mafia";
import type { MafiaGameCtx } from "@/hooks/games/mafia/useMafiaGame";
import type { MafiaPhase } from "@/types";
import {
  Panel,
  preloadMafiaArt,
  RoleCard,
  RoleIcon,
  RolePeek,
  SoundToggle,
  TimerBadge,
} from "./MafiaParts";
import MafiaLobby from "./MafiaLobby";
import { MafiaNightAct, MafiaNightDone, NightWaiting } from "./MafiaNight";
import {
  MafiaDiscussion,
  MafiaMorning,
  MafiaVoteResult,
  MafiaVoting,
} from "./MafiaDay";
import MafiaGameOver from "./MafiaGameOver";
import MafiaHostMenu, { MafiaHostHush, MafiaHostSkip } from "./MafiaHostMenu";
import { cueMafia, type MafiaFxKind } from "@/lib/game/mafia-fx";
import { unlockMafiaAudio, type MafiaSound } from "@/lib/game/mafia-sounds";

const NIGHT_PHASES: MafiaPhase[] = ["night_act", "night_done"];

function phaseLabel(phase: MafiaPhase, night: number): string {
  switch (phase) {
    case "lobby":
      return "غرفة الانتظار";
    case "reveal":
      return "كشف الأدوار";
    case "night_act":
    case "night_done":
      return `الليلة ${night}`;
    case "morning":
      return "الصباح";
    case "discussion":
      return "النقاش";
    case "voting":
      return "التصويت";
    case "vote_result":
      return "نتيجة التصويت";
    case "ended":
      return "انتهت اللعبة";
    case "closed":
      return "الغرفة انقفلت";
  }
}

const PHASE_ICON: Record<MafiaPhase, LucideIcon> = {
  lobby: Users,
  reveal: VenetianMask,
  night_act: Moon,
  night_done: Moon,
  morning: Sunrise,
  discussion: MessagesSquare,
  voting: Vote,
  vote_result: Gavel,
  ended: Flag,
  closed: DoorClosed,
};

/** الشاشة الرئيسية للعبة — نفسها للمنشئ ولكل لاعب */
export default function MafiaScreen({
  ctx,
  onLeave,
}: {
  ctx: MafiaGameCtx;
  onLeave: () => void;
}) {
  const { room, me, view, error, setError, secondsLeft } = ctx;

  useEffect(() => {
    preloadMafiaArt();
  }, []);

  if (!room || !me) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-slate-400">
        <Loader2 size={40} className="animate-spin text-red-500" />
        <p className="font-black">جاري الدخول للغرفة...</p>
      </div>
    );
  }

  const phase = room.phase;
  const isNight = NIGHT_PHASES.includes(phase);
  const isDead = !me.alive && phase !== "lobby" && phase !== "ended" && phase !== "closed";
  const showTimer =
    phase !== "discussion" && phase !== "morning" && phase !== "lobby" && phase !== "ended" && phase !== "closed";
  const PhaseIcon = PHASE_ICON[phase];

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4">
      {/*
        الشريط العلوي — نفس الترتيب بكل المقاسات (جوال، آيباد، لابتوب):
        سطر 1: اسم اللاعب وجنبه أزرار التحكم
        سطر 2: المرحلة (الليلة كم…) والمؤقت بطرفها لما يكون فيه وقت
      */}
      <header className="flex flex-col gap-2 rounded-2xl bg-slate-950/55 backdrop-blur-sm border border-white/10 px-3 py-2.5">
        <div className="flex items-center gap-2">
          {/* اسم اللاعب بس — اسم اللعبة هنا كان يلخبط ("المافيا · فلان" ينقرا كأنه مافيا) */}
          <p className="flex-1 min-w-0 flex items-center gap-1.5 text-base font-black text-white">
            {me.isHost && <Crown size={16} className="text-amber-400 shrink-0" />}
            <span className="truncate">{me.name}</span>
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {phase !== "lobby" && (
              <RolePeek
                role={me.role}
                teammates={me.role === "mafia" ? (view?.mafiaTeam ?? []).filter((m) => m.id !== me.id).map((m) => m.name) : []}
              />
            )}
            <SoundToggle />
            {me.isHost && <MafiaHostMenu ctx={ctx} />}
            {phase === "lobby" && !me.isHost && (
              <button
                type="button"
                onClick={onLeave}
                aria-label="خروج"
                className="w-11 h-11 rounded-2xl bg-slate-800 border-b-4 border-slate-950 flex items-center justify-center text-slate-400"
              >
                <LogOut size={20} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <h1
            className={`flex-1 min-w-0 text-xl font-black leading-tight flex items-center gap-2 ${isNight ? "text-indigo-200" : "text-white"}`}
          >
            <PhaseIcon size={22} className="shrink-0 opacity-80" />
            <span className="truncate">{phaseLabel(phase, room.night_number)}</span>
          </h1>
          {showTimer && <TimerBadge seconds={secondsLeft} danger={3} />}
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 text-sm font-bold text-red-200 bg-red-950/70 border border-red-800 rounded-xl p-3 animate-in fade-in">
          <AlertCircle size={18} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="إغلاق"
            className="shrink-0 w-10 h-10 -my-2 -me-2 rounded-xl flex items-center justify-center hover:bg-red-900/60"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {isDead && (
        <div className="text-center p-4 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 animate-in zoom-in-95">
          <span className="mfx-ghost mb-1 text-slate-300">
            <Ghost size={40} />
          </span>
          <p className="font-black text-lg">{MAFIA_CONFIG.DEAD_MESSAGE}</p>
          <p className="text-xs font-bold text-slate-500 mt-1">
            تقدر تتفرج بس لا تفضح أحد
          </p>
        </div>
      )}

      {/* المسكت: الممنوع من الكلام يشوف تنبيه، وبالتصويت الكل يتذكر مين الممنوع */}
      {ctx.silencedId && ctx.silencedId === me.id && (
        <div className="text-center p-4 rounded-2xl bg-sky-950/70 border-2 border-sky-600 animate-in zoom-in-95">
          <RoleIcon role="silencer" className="w-16 h-16 mx-auto mb-2" />
          <p className="font-black text-lg">أنت ممنوع من الكلام اليوم!</p>
          <p className="text-xs font-bold text-sky-200 mt-1">إذا تكلمت ينقتل — بس تقدر تصوّت عادي</p>
        </div>
      )}
      {ctx.silencedId && ctx.silencedId !== me.id && phase === "voting" && (
        <p className="flex items-center justify-center gap-2 text-center text-sm font-black text-sky-200 bg-sky-950/50 border border-sky-800 rounded-2xl p-2.5">
          <RoleIcon role="silencer" className="w-8 h-8" /> {ctx.nameOf(ctx.silencedId)} ممنوع من الكلام اليوم
        </p>
      )}

      {/* محتوى المرحلة */}
      {phase === "lobby" && <MafiaLobby ctx={ctx} />}
      {phase === "reveal" && <MafiaReveal ctx={ctx} />}
      {phase === "night_act" && !isDead && <MafiaNightAct ctx={ctx} />}
      {phase === "night_act" && isDead && (
        <>
          <p className="flex items-center justify-center gap-2 font-black text-indigo-300 py-10 animate-pulse">
            <Moon size={22} /> الليل شغال… نام وارتاح
          </p>
          <NightWaiting ctx={ctx} />
        </>
      )}
      {phase === "night_done" && <MafiaNightDone ctx={ctx} />}
      {phase === "morning" && <MafiaMorning ctx={ctx} />}
      {phase === "discussion" && <MafiaDiscussion ctx={ctx} />}
      {phase === "voting" && <MafiaVoting ctx={ctx} />}
      {phase === "vote_result" && <MafiaVoteResult ctx={ctx} />}
      {phase === "ended" && <MafiaGameOver ctx={ctx} />}
      {phase === "closed" && <MafiaClosed newCode={room.settings.movedTo} />}

      {/* المنشئ: تخطي سريع تحت الشاشة لو أحد تأخر */}
      {me.isHost && (phase === "night_act" || phase === "voting") && <MafiaHostSkip ctx={ctx} />}
      {/* المنشئ: الممنوع من الكلام تكلم */}
      {me.isHost && <MafiaHostHush ctx={ctx} />}

      {/* رسائل خاصة (الساحر، انضمام للمافيا) */}
      {view &&
        view.notes.length > 0 &&
        phase !== "lobby" &&
        phase !== "night_act" && (
          <Panel className="border-purple-800">
            <h3 className="font-black mb-2 flex items-center gap-2">
              <Lock size={18} /> رسائل لك بس
            </h3>
            <ul className="flex flex-col gap-1.5">
              {view.notes.map((n, i) => (
                <li key={i} className="font-bold text-purple-200">
                  {n}
                </li>
              ))}
            </ul>
          </Panel>
        )}

      {ctx.devMode && me.isHost && phase !== "lobby" && (
        <DevRolesPanel ctx={ctx} />
      )}
      {ctx.devMode && me.isHost && <DevFxPanel />}
    </div>
  );
}

function MafiaReveal({ ctx }: { ctx: MafiaGameCtx }) {
  const { me, view } = ctx;
  if (!me?.role) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={40} className="animate-spin text-red-500" />
      </div>
    );
  }
  const teammates = (view?.mafiaTeam ?? []).filter((m) => m.id !== me.id);
  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-center font-black text-slate-400">غطّ جوالك… هذا دورك</p>
      <RoleCard flip role={me.role} teammates={me.role === "mafia" ? teammates.map((m) => m.name) : []} />
    </div>
  );
}

/** وضع التجربة (localhost فقط): المنشئ يشوف كل الأدوار عشان يختبر */
function DevRolesPanel({ ctx }: { ctx: MafiaGameCtx }) {
  return (
    <details className="bg-indigo-950/60 border-2 border-dashed border-indigo-600 rounded-2xl p-3 text-sm">
      <summary className="font-black text-indigo-200 cursor-pointer">
        <FlaskConical size={16} className="inline -mt-0.5" /> الأدوار (وضع التجربة — localhost فقط)
      </summary>
      <ul className="grid grid-cols-2 gap-1.5 mt-3">
        {ctx.players.map((p) => {
          const role = ctx.devRoles[p.id];
          return (
            <li
              key={p.id}
              className={`flex items-center gap-1.5 font-bold ${p.is_alive ? "" : "line-through opacity-50"}`}
            >
              {role && <RoleIcon role={role} className="w-7 h-7" />} {p.display_name}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

const DEV_CUES: { label: string; sound: MafiaSound; fx?: MafiaFxKind }[] = [
  { label: "ذبح", sound: "horror", fx: "kill" },
  { label: "المافيا اختاروا", sound: "slash", fx: "slash" },
  { label: "تحقيق", sound: "dramatic", fx: "investigate" },
  { label: "المحقق: مافيا", sound: "dramatic", fx: "reveal_mafia" },
  { label: "المحقق: مواطن", sound: "womp", fx: "miss" },
  { label: "حماية", sound: "heal", fx: "saved" },
  { label: "جندي", sound: "shield", fx: "shield" },
  { label: "انفجار المنتقم", sound: "bomb", fx: "bomb" },
  { label: "الممنوع انقتل", sound: "horror", fx: "hushed" },
  { label: "ساحر", sound: "magic", fx: "magic" },
  { label: "صحفي", sound: "camera", fx: "flash" },
  { label: "تصويت", sound: "horror", fx: "doom" },
  { label: "فوز المدينة", sound: "win", fx: "win_town" },
  { label: "فوز المافيا", sound: "evil", fx: "win_mafia" },
  { label: "رسالة الضحية", sound: "horror", fx: "victim" },
  { label: "رسالة الغشاش", sound: "horror", fx: "victim_cheat" },
  { label: "بومة", sound: "owl" },
  { label: "الليل", sound: "night" },
  { label: "الصبح", sound: "rooster" },
];

/** وضع التجربة (localhost فقط): زر لكل صوت وحركة عشان تجربها فوراً */
function DevFxPanel() {
  return (
    <details className="bg-indigo-950/60 border-2 border-dashed border-indigo-600 rounded-2xl p-3 text-sm">
      <summary className="font-black text-indigo-200 cursor-pointer">
        <FlaskConical size={16} className="inline -mt-0.5" /> تجربة الأصوات والحركات (localhost فقط)
      </summary>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {DEV_CUES.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => {
              unlockMafiaAudio();
              cueMafia(c.sound, c.fx);
            }}
            className="py-2.5 px-2 rounded-xl bg-indigo-900/70 hover:bg-indigo-800 font-black"
          >
            {c.label}
          </button>
        ))}
      </div>
    </details>
  );
}

/** الغرفة انقفلت: لو المنشئ سوّى غرفة جديدة نوجّه للكود الجديد، وإلا أي واحد يقدر يسوي غرفته */
function MafiaClosed({ newCode }: { newCode?: string }) {
  return (
    <Panel className="text-center">
      <DoorClosed size={64} className="mx-auto mb-3 text-slate-300" strokeWidth={1.6} />
      <h2 className="text-2xl font-black mb-2">{newCode ? "المنشئ سوّى غرفة جديدة" : "المنشئ قفل الغرفة"}</h2>
      {newCode ? (
        <>
          <p className="font-bold text-slate-400 mb-1">الكود الجديد</p>
          <p className="text-4xl font-black tracking-[0.3em] text-red-400 mb-5" dir="ltr">
            {newCode}
          </p>
          <a
            href={`${MAFIA_GAME.joinPath}?room=${newCode}`}
            className="block w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black text-lg rounded-2xl border-b-4 border-red-800 active:border-b-0 active:translate-y-[4px] transition-all"
          >
            ادخل الغرفة الجديدة
          </a>
        </>
      ) : (
        <>
          <p className="font-bold text-slate-400 mb-5 leading-relaxed">
            تبون تكملون؟ واحد منكم يسجّل دخول ويسوي غرفة جديدة، ويرسل الكود للباقين
          </p>
          <div className="flex flex-col gap-3">
            <a
              href={MAFIA_GAME.path}
              className="block w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black text-lg rounded-2xl border-b-4 border-red-800 active:border-b-0 active:translate-y-[4px] transition-all"
            >
              سوّ غرفة جديدة
            </a>
            <a
              href={MAFIA_GAME.joinPath}
              className="block w-full py-4 bg-slate-800 rounded-2xl border-b-4 border-slate-950 font-black text-lg active:border-b-0 active:translate-y-[4px] transition-all"
            >
              ادخل غرفة بكود
            </a>
          </div>
        </>
      )}
    </Panel>
  );
}
