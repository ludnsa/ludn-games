"use client";

import React, { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { FAN_GAMES } from "./homeGames";

// مروحة الألعاب الدوّارة بالرئيسية: نفس سلوك النموذج المعتمد (fan-carousel/fan-preview.html)،
// إلا الضغط على أي بطاقة (بالنص أو الجوانب) يفتح لعبتها مباشرة.
// الأرقام والشكل بـ globals.css (.ludn-hfan-*) عشان الجوال والكمبيوتر يطلعون صح من أول رسم.

const N = FAN_GAMES.length;
const SPIN_MS = 3000;
/** الاسم يختفي ويرجع بعد هالمدة باسم اللعبة الجديدة (نفس النموذج) */
const LABEL_DELAY_MS = 180;
const SWIPE_PX = 40;

/** مكان البطاقة من اللي بالنص: 0 بالنص، الموجب يسار والسالب يمين */
const offsetOf = (i: number, cur: number) => {
  let o = (((i - cur) % N) + N) % N;
  if (o > N / 2) o -= N;
  return o;
};

export function HeroFan() {
  const [cur, setCur] = useState(0);
  const [label, setLabel] = useState(0);
  /** يزيد مع كل تنقّل يدوي عشان عدّاد اللف يبدأ من جديد */
  const [restart, setRestart] = useState(0);
  const hover = useRef(false);
  const touchX = useRef<number | null>(null);
  const swipedAt = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (!hover.current) setCur((c) => (c + 1) % N);
    }, SPIN_MS);
    return () => clearInterval(id);
  }, [restart]);

  useEffect(() => {
    if (label === cur) return;
    const t = setTimeout(() => setLabel(cur), LABEL_DELAY_MS);
    return () => clearTimeout(t);
  }, [cur, label]);

  const go = (i: number) => {
    setCur(((i % N) + N) % N);
    setRestart((r) => r + 1);
  };

  const game = FAN_GAMES[cur];
  const shown = FAN_GAMES[label];
  const fading = label !== cur;

  return (
    <div
      className="ludn-hfan"
      role="group"
      aria-label="ألعاب المنصة"
      onPointerEnter={(e) => {
        // الماوس بس: لمسة الجوال تطلق دخول بدون خروج، فتوقف اللف للأبد
        if (e.pointerType === "mouse") hover.current = true;
      }}
      onPointerLeave={() => {
        hover.current = false;
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > SWIPE_PX) {
          swipedAt.current = Date.now();
          go(cur + (dx > 0 ? 1 : -1));
        }
      }}
    >
      <div className="ludn-hfan-stage">
        <div aria-hidden className="ludn-hfan-glow" style={{ background: `radial-gradient(circle, ${game.color}, transparent 65%)` }} />
        {FAN_GAMES.map((g, i) => {
          const o = offsetOf(i, cur);
          const a = Math.abs(o);
          const style = {
            "--o": o,
            "--a2": a * a,
            "--s": o === 0 ? 1.12 : 1 - a * 0.12,
            zIndex: 20 - a,
            filter: o === 0 ? "none" : `brightness(${1 - a * 0.22}) saturate(${1 - a * 0.15})`,
          } as CSSProperties;
          return (
            <Link
              key={g.id}
              href={g.path}
              prefetch={false}
              draggable={false}
              className="ludn-hfan-card"
              data-center={o === 0 ? "" : undefined}
              // البعيدة مخفية دايماً، والثانية من النص مخفية بالجوال بس (3 بطاقات بالجوال و5 بالكمبيوتر)
              data-hide={a > 2 ? "far" : a === 2 ? "phone" : undefined}
              tabIndex={a <= 1 ? undefined : -1}
              aria-hidden={a <= 1 ? undefined : true}
              aria-label={`${g.title}: ابدأ اللعبة`}
              style={style}
              onClick={(e) => {
                // نهاية السحب على الجوال ما تحسب ضغطة
                if (Date.now() - swipedAt.current < 600) e.preventDefault();
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.img} alt="" draggable={false} fetchPriority={i === 0 ? "high" : undefined} />
              <span aria-hidden className="ludn-hfan-shine" />
            </Link>
          );
        })}
        {/* نفس رموز النموذج: بصفحة عربية تنعكس فيطلعون يأشرون للداخل مثله */}
        <button type="button" className="ludn-hfan-arrow" data-side="r" aria-label="اللعبة السابقة" onClick={() => go(cur - 1)}>
          ›
        </button>
        <button type="button" className="ludn-hfan-arrow" data-side="l" aria-label="اللعبة التالية" onClick={() => go(cur + 1)}>
          ‹
        </button>
      </div>

      <div className="ludn-hfan-info">
        <p
          className="ludn-hfan-name font-display"
          style={{ opacity: fading ? 0 : 1, transform: fading ? "translateY(8px)" : "none" }}
        >
          {shown.title}
        </p>
        <div className="ludn-hfan-tags">
          <span className="ludn-hfan-tag" style={{ "--c": shown.color } as CSSProperties}>
            {shown.category}
          </span>
          <span className="ludn-hfan-tag ludn-hfan-trial">تجربة مجانية</span>
        </div>
        <div className="ludn-hfan-dots">
          {FAN_GAMES.map((g, i) => (
            <button
              key={g.id}
              type="button"
              className="ludn-hfan-dot"
              aria-label={g.title}
              aria-current={i === cur ? "true" : undefined}
              onClick={() => go(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
