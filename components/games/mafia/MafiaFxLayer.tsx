"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from "react";
import { subscribeMafiaFx, type MafiaFxEvent, type MafiaFxKind } from "@/lib/game/mafia-fx";
import { MAFIA_BACKGROUNDS, MAFIA_CONFIG, mafiaIconSrc } from "@/constants/mafia";
import type { MafiaRole } from "@/types";
import "./mafia-fx.css";

/** غلاف شاشة اللعبة كاملة (MafiaApp) */
export const MAFIA_STAGE_ID = "mafia-stage";

/** كل القيم العشوائية تنحسب مرة وحدة لحظة الحدث، عشان الرسم يظل ثابت */
interface ActiveFx extends MafiaFxEvent {
  drips: { left: number; width: number; height: number; delay: number; dur: number }[];
  bits: { left: number; size: number; delay: number; dur: number; hue: number }[];
  bolts: number[];
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const BLOOD_KINDS: MafiaFxKind[] = ["kill", "win_mafia", "victim", "hushed", "victim_hushed", "victim_cheat"];
const VICTIM_KINDS: MafiaFxKind[] = ["victim", "victim_bomb", "escaped", "victim_hushed", "victim_cheat"];

function prepare(e: MafiaFxEvent): ActiveFx {
  const d = Math.max(e.duration, 1);
  const withBlood = BLOOD_KINDS.includes(e.kind);
  const isVictim = VICTIM_KINDS.includes(e.kind);
  const bitCount =
    e.kind === "win_town"
      ? 80
      : e.kind === "saved"
        ? 42
        : e.kind === "magic"
          ? 28
          : e.kind === "bomb" || e.kind === "victim_bomb"
            ? 7
            : 0;
  // الحماية: علامات ✚ تطلع بشكل متواصل طول "تمت الحماية"، مو دفعة وحدة وتختفي
  const spread = e.kind === "win_town" ? 2 : e.kind === "saved" ? 2.8 : 0.6;

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
      delay: rand(0, spread),
      dur: e.kind === "saved" ? rand(1.6, 2.4) : rand(1.2, e.kind === "win_town" ? 3.5 : 2),
      hue: rand(0, 360),
    })),
    bolts: e.peaks.map(() => rand(5, 75)),
  };
}

/*
 * الحركات هنا مؤثرات بس (دم، وميض، حلقات، شاشة حمراء/زرقاء...) بدون شي بنص الشاشة:
 * ردة الفعل نفسها هي أيقونة الدور اللي على الشاشة تحتها (تم الاغتيال، تم التحقيق، نتائج الصباح...)،
 * فما نغطي عليها.
 * المحقق: لقى مافيا = الشاشة الحمراء، ما لقى = الشاشة الزرقاء (وأيقونة النتيجة على شاشته).
 */

/** رسالة الضحية — تطلع على جوالها بس */
const VICTIM_TEXT: Partial<Record<MafiaFxKind, { title: string; sub: string; role: MafiaRole }>> = {
  victim: { title: "المافيا ذبحوك!", sub: "يا حرام… طلعت من اللعبة", role: "mafia" },
  victim_bomb: { title: "المنتقم أخذك معه!", sub: "كنت في المكان الغلط", role: "suicide" },
  escaped: { title: "المافيا حاولوا يذبحونك!", sub: "بس فكك الله", role: "mafia" },
  victim_hushed: { title: "تكلمت وأنت ممنوع!", sub: "المسكت سكّتك… وطلعت من اللعبة", role: "silencer" },
  victim_cheat: { title: "انذبحت بسبب الغش!", sub: "المنشئ صادك… وطلعت من اللعبة", role: "mafia" },
};

export default function MafiaFxLayer() {
  const [active, setActive] = useState<ActiveFx[]>([]);

  useEffect(
    () =>
      subscribeMafiaFx((e) => {
        const fx = prepare(e);
        setActive((list) => [...list, fx]);
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
 * رسايل الضحية (الذبح والمنتقم والمسكت) تطلع بالصباح، فتظل أطول عشان تنقرا.
 */
function sceneSeconds(e: MafiaFxEvent): number {
  const base = Math.max(e.duration, 1.2) + 1;
  if (e.kind === "escaped") return Math.min(base, MAFIA_CONFIG.NIGHT_DONE_SECONDS - 0.6);
  if (e.kind === "victim" || e.kind === "victim_bomb" || e.kind === "victim_hushed" || e.kind === "victim_cheat") {
    return Math.max(base, 6);
  }
  // الحماية تملأ شاشة "تمت الحماية" (5 ثواني) بدل ما تخلص بعد ثانيتين
  if (e.kind === "saved") return Math.max(base, MAFIA_CONFIG.NIGHT_DONE_SECONDS - 0.4);
  return base;
}

function FxScene({ fx }: { fx: ActiveFx }) {
  const total = sceneSeconds(fx);
  const victim = VICTIM_TEXT[fx.kind];
  const first = fx.peaks[0] ?? 0;
  const k = fx.kind;

  return (
    // الغلاف كله يختفي تدريجياً في النهاية
    <div className="mfx-scene" style={{ animationDuration: `${total}s` }}>
      {/* ظلام الأطراف */}
      {(k === "kill" || k === "doom" || k === "win_mafia" || k === "hushed" || victim) && (
        <div className="mfx-vignette" style={{ animationDuration: `${total}s` }} />
      )}
      {/* المحقق: أحمر لو مافيا، أزرق لو مواطن */}
      {k === "reveal_mafia" && <div className="mfx-vignette mfx-vignette-red" style={{ animationDuration: `${total}s` }} />}
      {k === "miss" && <div className="mfx-vignette mfx-vignette-blue" style={{ animationDuration: `${total}s` }} />}

      {/* خلفية الضحية الحمراء — تحت الدم */}
      {victim && (
        <div
          className={`mfx-victim-bg ${k === "escaped" ? "mfx-victim-bg-escaped" : ""}`}
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
      {(k === "kill" ||
        k === "slash" ||
        k === "win_mafia" ||
        k === "victim" ||
        k === "escaped" ||
        k === "hushed" ||
        k === "victim_hushed" ||
        k === "victim_cheat") &&
        fx.peaks.map((p, i) => <div key={i} className="mfx-flash mfx-flash-red" style={{ animationDelay: `${p}s` }} />)}
      {k === "miss" &&
        fx.peaks.map((p, i) => <div key={i} className="mfx-flash mfx-flash-blue" style={{ animationDelay: `${p}s` }} />)}
      {(k === "flash" || k === "reveal_mafia" || k === "investigate") &&
        fx.peaks.map((p, i) => (
          <div
            key={i}
            className="mfx-flash mfx-flash-white"
            style={{ animationDelay: `${p}s`, animationDuration: k === "flash" ? "0.3s" : "0.35s" }}
          />
        ))}
      {(k === "bomb" || k === "victim_bomb") && (
        <div className="mfx-flash mfx-flash-white" style={{ animationDelay: `${first}s`, animationDuration: "0.6s" }} />
      )}

      {/* ضربة السيف */}
      {(k === "slash" || k === "kill" || k === "win_mafia" || k === "victim") && (
        <div className="mfx-slash" style={{ animationDelay: `${Math.max(0, first - 0.15)}s` }} />
      )}

      {/* البرق */}
      {(k === "reveal_mafia" || k === "investigate") &&
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
      {(k === "shield" || k === "escaped") && <div className="mfx-ring" style={{ animationDelay: `${first}s` }} />}

      {/* الحماية: الحلقة الخضراء تنبض 3 مرات، وخط نبض القلب يرتسم مرتين */}
      {k === "saved" &&
        [0, 1.2, 2.4].map((d) => (
          <div key={d} className="mfx-ring mfx-ring-green" style={{ animationDelay: `${first + d}s` }} />
        ))}
      {k === "saved" &&
        [0, 1.8].map((d) => (
          <svg
            key={d}
            className="mfx-ecg"
            viewBox="0 0 400 80"
            preserveAspectRatio="none"
            style={{ animationDelay: `${first + d}s` }}
          >
            <path d="M0 40 H120 L135 40 L145 12 L158 70 L170 22 L180 40 H230 L240 40 L250 18 L262 64 L272 40 H400" />
          </svg>
        ))}

      {/* جزيئات */}
      {k === "saved" &&
        fx.bits.map((b, i) => (
          <span
            key={i}
            className="mfx-particle mfx-plus"
            style={{
              left: `${b.left}%`,
              fontSize: `${b.size * 2.4}px`,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.dur}s`,
            }}
          >
            ✚
          </span>
        ))}
      {k === "magic" &&
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
      {k === "win_town" &&
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
      {(k === "bomb" || k === "victim_bomb") &&
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

      {/* رسالة الضحية: تغطي الشاشة بلون الدم، وبنصها أيقونة اللي قتله */}
      {victim && (
        <div className="mfx-victim" style={{ animationDelay: `${first}s` }}>
          <img src={mafiaIconSrc(victim.role)} alt="" className="mfx-victim-icon" />
          <span className="mfx-victim-title">{victim.title}</span>
          <span className="mfx-victim-sub">{victim.sub}</span>
        </div>
      )}
    </div>
  );
}

/**
 * خلفية اللعبة: صورة الليل أو النهار — تتبدل بينهم بتلاشي، والليل فوقه ضباب يتحرك.
 * الصورتين تنحمّلون من البداية، فالصباح ما يتأخر.
 */
export function MafiaBackdrop({ night }: { night: boolean }) {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 bg-slate-950 overflow-hidden">
      <div
        className="mfx-bg mfx-bg-day"
        style={{ backgroundImage: `url(${MAFIA_BACKGROUNDS.day})`, opacity: night ? 0 : 1 }}
      />
      <div
        className="mfx-bg mfx-bg-night"
        style={{ backgroundImage: `url(${MAFIA_BACKGROUNDS.night})`, opacity: night ? 1 : 0 }}
      />
      {night && (
        <div className="absolute inset-0 animate-in fade-in duration-1000">
          <div className="mfx-fog" />
          <div className="mfx-fog mfx-fog-2" />
        </div>
      )}
    </div>
  );
}
