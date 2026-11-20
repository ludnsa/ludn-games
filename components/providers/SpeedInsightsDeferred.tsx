"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { BeforeSendMiddleware, SpeedInsightsProps } from "@vercel/speed-insights";

// Vercel Speed Insights (النسخة المجانية): يقيس سرعة الصفحات عند الزوار الحقيقيين.
// ما يتحمّل مع الصفحة: كود الحزمة بملف لحاله ما ينطلب إلا بعد ما تخلص الصفحة (حدث load)
// ويفضى المتصفح، وبعدها الحزمة تضيف سكربت القياس (/_vercel/speed-insights/script.js).

// نسبة تحميلات الصفحات اللي تنقاس (القرار ينأخذ مرة وحدة لكل تحميل، والتنقل داخل الموقع يتبعه).
// الحد المجاني 10,000 حدث كل 30 يوم للفريق كله، ولو تعديناه يوقف الجمع 14 يوم على الأقل.
// كل تحميل يطلع 3–5 أحداث، والتنقل داخل الموقع يزيد. 0.05 = تحميل من كل 20.
const SAMPLE_RATE = 0.05;

// نشيل اللي بعد ? و # من الرابط قبل الإرسال (كود الغرفة، ورقم عملية الدفع بصفحة الرجوع من الدفع)
const stripQuery: BeforeSendMiddleware = (event) => ({ ...event, url: event.url.split(/[?#]/)[0] });

type SpeedInsightsComponent = ComponentType<Omit<SpeedInsightsProps, "route">>;

export function SpeedInsightsDeferred() {
  const [SpeedInsights, setSpeedInsights] = useState<SpeedInsightsComponent | null>(null);

  useEffect(() => {
    let cancelled = false;
    let idleId: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () => {
      import("@vercel/speed-insights/next")
        .then((m) => { if (!cancelled) setSpeedInsights(() => m.SpeedInsights); })
        .catch(() => {}); // لو ما قدر يحمّله (نت مقطوع مثلاً) نتركه، الصفحة ما تتأثر
    };
    const whenIdle = () => {
      if (typeof window.requestIdleCallback === "function") idleId = window.requestIdleCallback(load, { timeout: 5000 });
      else timer = setTimeout(load, 2000); // سفاري ما فيه requestIdleCallback
    };
    if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", whenIdle);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, []);

  return SpeedInsights ? <SpeedInsights sampleRate={SAMPLE_RATE} beforeSend={stripQuery} /> : null;
}
