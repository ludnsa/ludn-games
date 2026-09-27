"use client";

import React, { useEffect, useState } from "react";
import { subscribeMafiaFx, type MafiaFxEvent, type MafiaFxKind } from "@/lib/game/mafia-fx";
import { MAFIA_CONFIG } from "@/constants/mafia";
import "./mafia-fx.css";

/** العنصر اللي يهتز — يلف شاشة اللعبة كاملة (MafiaApp) */
export const MAFIA_STAGE_ID = "mafia-stage";

type StageMove = "shake" | "bigShake" | "punch" | "wobble";

const STAGE_KEYFRAMES: Record<StageMove, { frames: Keyframe[]; duration: number }> = {
  shake: {
    frames: [0, -8, 7, -6, 5, -3, 0].map((x, i) => ({ transform: `translate(${x}px, ${i % 2 ? 4 : -4}px)` })),
    duration: 420,
  },
  bigShake: {
    frames: [0, -16, 14, -12, 10, -7, 4, 0].map((x, i) => ({
      transform: `translate(${x}px, ${i % 2 ? 9 : -9}px) rotate(${x / 8}deg)`,
    })),
    duration: 650,
  },
  punch: {
    frames: [{ transform: "scale(1)" }, { transform: "scale(1.045)" }, { transform: "scale(1)" }],
    duration: 300,
  },
  wobble: {
    frames: [0, -2, 2, -1.5, 1, 0].map((r) => ({ transform: `rotate(${r}deg)` })),
    duration: 900,
  },
};

/** يهز شاشة اللعبة على لحظات الذروة في الصوت */
function moveStage(move: StageMove, peaks: number[]) {
  // الاهتزاز جزء من اللعبة نفسها، فيشتغل حتى لو الجهاز مفعّل "تقليل الحركة"
  const stage = document.getElementById(MAFIA_STAGE_ID);
  if (!stage) return;
  const { frames, duration } = STAGE_KEYFRAMES[move];
  peaks.forEach((p) => stage.animate(frames, { duration, delay: p * 1000, easing: "ease-out" }));
}

const STAGE_MOVE: Partial<Record<MafiaFxKind, StageMove>> = {
  kill: "bigShake",
  slash: "shake",
  reveal_mafia: "punch",
  investigate: "punch",
  miss: "wobble",
  shield: "shake",
  bomb: "bigShake",
  doom: "shake",
  win_mafia: "bigShake",
  victim: "bigShake",
  victim_bomb: "bigShake",
  escaped: "shake",
};

/** كل القيم العشوائية تنحسب مرة وحدة لحظة الحدث، عشان الرسم يظل ثابت */
interface ActiveFx extends MafiaFxEvent {
  drips: { left: number; width: number; height: number; delay: number; dur: number }[];
  bits: { left: number; size: number; delay: number; dur: number; hue: number }[];
  bolts: number[];
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function prepare(e: MafiaFxEvent): ActiveFx {
  const d = Math.max(e.duration, 1);
  const withBlood = e.kind === "kill" || e.kind === "win_mafia" || e.kind === "victim";
  const isVictim = e.kind === "victim" || e.kind === "victim_bomb" || e.kind === "escaped";
  const bitCount =
    e.kind === "win_town"
      ? 80
      : e.kind === "saved" || e.kind === "magic"
        ? 28
        : e.kind === "bomb" || e.kind === "victim_bomb"
          ? 7
          : 0;

  return {
    ...e,
    drips: withBlood
      ? Array.from({ length: isVictim ? 24 : 16 }, () => ({
          left: rand(0, 98),
          width: rand(6, 18),
          height: rand(12, 65),
          delay: rand(0, d * 0.35),
          dur: rand(d * 0.45, d * 0.9),
        }))
      : [],
    bits: Array.from({ length: bitCount }, () => ({
      left: rand(0, 100),
      size: rand(4, 12),
      delay: rand(0, e.kind === "win_town" ? 2 : 0.6),
      dur: rand(1.2, e.kind === "win_town" ? 3.5 : 2),
      hue: rand(0, 360),
    })),
    bolts: e.peaks.map(() => rand(5, 75)),
  };
}

const BIG_EMOJI: Partial<Record<MafiaFxKind, string>> = {
  kill: "💀",
  reveal_mafia: "🚨",
  investigate: "🔍",
  miss: "🤷",
  saved: "✨",
  shield: "🛡️",
  bomb: "💥",
  magic: "🎩",
  flash: "📸",
  doom: "⚖️",
  win_town: "🏆",
  win_mafia: "😈",
};

/** رسالة الضحية — تطلع على جوالها بس */
const VICTIM_TEXT: Partial<Record<MafiaFxKind, { title: string; sub: string }>> = {
  victim: { title: "المافيا ذبحوك! 🔪", sub: "يا حرام… طلعت من اللعبة" },
  victim_bomb: { title: "الانتحاري أخذك معه! 💣", sub: "كنت في المكان الغلط 😵" },
  escaped: { title: "المافيا حاولوا يذبحونك!", sub: "بس فكك الله 😈" },
};

const VICTIM_ICON: Partial<Record<MafiaFxKind, string>> = {
  victim: "💀",
  victim_bomb: "💥",
  escaped: "😈",
};

export default function MafiaFxLayer() {
  const [active, setActive] = useState<ActiveFx[]>([]);

  useEffect(
    () =>
      subscribeMafiaFx((e) => {
        const fx = prepare(e);
        setActive((list) => [...list, fx]);

        const move = STAGE_MOVE[e.kind];
        if (move) moveStage(move, e.kind === "bomb" ? [e.peaks[0] ?? 0] : e.peaks);

        const lifetime = (sceneSeconds(e) + 0.3) * 1000;
        setTimeout(() => setActive((list) => list.filter((a) => a.id !== fx.id)), lifetime);
      }),
    []
  );

  if (active.length === 0) return null;

  return (
    <div aria-hidden className="fixed inset-0 z-[2800] pointer-events-none overflow-hidden">
      {active.map((fx) => (
        <FxScene key={fx.id} fx={fx} />
      ))}
    </div>
  );
}

/**
 * مدة ظهور الحركة كاملة.
 * حركة الضحية بالليل لازم تخلص داخل ثواني "تم الاغتيال"، عشان لو الضحية محقق
 * (أو أي دور بعد المافيا) يلقى شاشته نظيفة أول ما يبدأ دوره.
 * رسالة الانتحاري بالصباح تظل أطول عشان تنقرا.
 */
function sceneSeconds(e: MafiaFxEvent): number {
  const base = Math.max(e.duration, 1.2) + 1;
  if (e.kind === "victim" || e.kind === "escaped") return Math.min(base, MAFIA_CONFIG.NIGHT_DONE_SECONDS - 0.6);
  if (e.kind === "victim_bomb") return Math.max(base, 6);
  return base;
}

function FxScene({ fx }: { fx: ActiveFx }) {
  const total = sceneSeconds(fx);
  const victim = VICTIM_TEXT[fx.kind];
  const first = fx.peaks[0] ?? 0;
  const emoji = BIG_EMOJI[fx.kind];

  return (
    // الغلاف كله يختفي تدريجياً في النهاية
    <div className="mfx-scene" style={{ animationDuration: `${total}s` }}>
      {/* ظلام الأطراف */}
      {(fx.kind === "kill" || fx.kind === "doom" || fx.kind === "win_mafia" || victim) && (
        <div className="mfx-vignette" style={{ animationDuration: `${total}s` }} />
      )}
      {fx.kind === "reveal_mafia" && (
        <div className="mfx-vignette mfx-vignette-red" style={{ animationDuration: `${total}s` }} />
      )}

      {/* خلفية الضحية الحمراء — تحت الدم */}
      {victim && (
        <div
          className={`mfx-victim-bg ${fx.kind === "escaped" ? "mfx-victim-bg-escaped" : ""}`}
          style={{ animationDelay: `${first}s` }}
        />
      )}

      {/* الدم */}
      {fx.drips.length > 0 && <div className="mfx-blood-top" />}
      {fx.drips.map((d, i) => (
        <span
          key={i}
          className="mfx-drip"
          style={{
            left: `${d.left}%`,
            width: d.width,
            height: `${d.height}vh`,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.dur}s`,
          }}
        />
      ))}

      {/* وميض على كل ذروة */}
      {(fx.kind === "kill" ||
        fx.kind === "slash" ||
        fx.kind === "win_mafia" ||
        fx.kind === "victim" ||
        fx.kind === "escaped") &&
        fx.peaks.map((p, i) => (
          <div key={i} className="mfx-flash mfx-flash-red" style={{ animationDelay: `${p}s` }} />
        ))}
      {(fx.kind === "flash" || fx.kind === "reveal_mafia" || fx.kind === "investigate") &&
        fx.peaks.map((p, i) => (
          <div
            key={i}
            className="mfx-flash mfx-flash-white"
            style={{ animationDelay: `${p}s`, animationDuration: fx.kind === "flash" ? "0.3s" : "0.35s" }}
          />
        ))}
      {(fx.kind === "bomb" || fx.kind === "victim_bomb") && (
        <div className="mfx-flash mfx-flash-white" style={{ animationDelay: `${first}s`, animationDuration: "0.6s" }} />
      )}

      {/* ضربة السيف */}
      {(fx.kind === "slash" || fx.kind === "kill" || fx.kind === "win_mafia" || fx.kind === "victim") && (
        <div className="mfx-slash" style={{ animationDelay: `${Math.max(0, first - 0.15)}s` }} />
      )}

      {/* البرق */}
      {(fx.kind === "reveal_mafia" || fx.kind === "investigate") &&
        fx.peaks.map((p, i) => (
          <svg
            key={i}
            viewBox="0 0 60 200"
            className="mfx-bolt"
            style={{ left: `${fx.bolts[i]}%`, animationDelay: `${p}s` }}
          >
            <path d="M35 0 L10 90 L30 90 L5 200 L55 70 L33 70 L50 0 Z" fill="#fff" />
          </svg>
        ))}

      {/* درع النور */}
      {(fx.kind === "saved" || fx.kind === "shield" || fx.kind === "escaped") && <div className="mfx-ring" style={{ animationDelay: `${first}s` }} />}

      {/* جزيئات */}
      {fx.kind === "saved" &&
        fx.bits.map((b, i) => (
          <span
            key={i}
            className="mfx-particle"
            style={{
              left: `${b.left}%`,
              width: b.size,
              height: b.size,
              background: `hsl(${45 + (b.hue % 20)} 100% 65%)`,
              boxShadow: "0 0 10px 2px rgba(255, 210, 80, 0.8)",
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.dur}s`,
            }}
          />
        ))}
      {fx.kind === "magic" &&
        fx.bits.map((b, i) => (
          <span
            key={i}
            className="mfx-swirl"
            style={{
              width: b.size,
              height: b.size,
              background: `hsl(${270 + (b.hue % 60)} 90% 65%)`,
              boxShadow: "0 0 12px 3px rgba(190, 90, 255, 0.8)",
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.dur}s`,
            }}
          />
        ))}
      {fx.kind === "win_town" &&
        fx.bits.map((b, i) => (
          <span
            key={i}
            className="mfx-confetti"
            style={{
              left: `${b.left}%`,
              background: `hsl(${b.hue} 90% 60%)`,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.dur}s`,
            }}
          />
        ))}
      {(fx.kind === "bomb" || fx.kind === "victim_bomb") &&
        fx.bits.map((b, i) => (
          <span
            key={i}
            className="mfx-smoke"
            style={{
              width: `${20 + b.size * 2}vmin`,
              height: `${20 + b.size * 2}vmin`,
              marginLeft: `${(b.left - 50) / 2}vmin`,
              animationDelay: `${first + b.delay / 3}s`,
              animationDuration: `${b.dur + 0.6}s`,
            }}
          />
        ))}

      {/* رسالة الضحية: تغطي الشاشة بلون الدم */}
      {victim && (
        <div className="mfx-victim" style={{ animationDelay: `${first}s` }}>
          <span className="mfx-victim-skull">{VICTIM_ICON[fx.kind]}</span>
          <span className="mfx-victim-title">{victim.title}</span>
          <span className="mfx-victim-sub">{victim.sub}</span>
        </div>
      )}

      {/* الإيموجي الكبير في النص */}
      {emoji && !victim && (
        <span
          className="mfx-big-emoji"
          style={{ animationDelay: `${first}s`, animationDuration: `${Math.min(2.2, Math.max(1.4, fx.duration))}s` }}
        >
          {emoji}
        </span>
      )}
    </div>
  );
}

/** أجواء الليل الثابتة: قمر ونجوم وضباب يتحرك */
export function MafiaNightSky() {
  const [stars] = useState(() =>
    Array.from({ length: 40 }, () => ({
      left: rand(0, 100),
      top: rand(0, 55),
      delay: rand(0, 4),
      dur: rand(2, 5),
      size: rand(1, 3),
    }))
  );
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden animate-in fade-in duration-1000">
      {stars.map((s, i) => (
        <span
          key={i}
          className="mfx-star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
          }}
        />
      ))}
      <div className="mfx-moon" />
      <div className="mfx-fog" />
      <div className="mfx-fog mfx-fog-2" />
    </div>
  );
}
