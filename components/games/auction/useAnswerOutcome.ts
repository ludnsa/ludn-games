"use client";

import { useState } from "react";

export type AnswerOutcome = "correct" | "wrong" | null;

/**
 * هل الإجابة صح أو غلط — عرض بس، من تسلسل حالات اللعبة اللي تعرضها الشاشة أصلاً:
 * - الإجابة الصح دايماً تمر على "اختيار المكافأة" (rewardChoice)، إلا السؤال المباع:
 *   يروح للنتيجة مباشرة وتنزاد نقاط الفريق اللي اشتراه.
 * - الغلط يروح للنتيجة مباشرة بدون أي نقاط.
 * لو الشاشة انفتحت والنتيجة طالعة (ما شفنا وش صار قبلها) نرجع لـ fallback، ولو ما فيه: null (ما نعرف).
 */
export function useAnswerOutcome({
  state,
  points1,
  points2,
  fallback = null,
}: {
  state: string | null | undefined;
  points1: number;
  points2: number;
  fallback?: AnswerOutcome;
}): AnswerOutcome {
  const points = (points1 || 0) + (points2 || 0);
  const [seen, setSeen] = useState<{ state: string | null | undefined; points: number; outcome: AnswerOutcome }>({ state, points, outcome: null });

  if (seen.state !== state || seen.points !== points) {
    let outcome: AnswerOutcome = seen.outcome;
    if (state === "rewardChoice") outcome = "correct";
    else if (state === "result" && seen.state !== "result") {
      if (seen.state === "rewardChoice") outcome = "correct";
      else if (seen.state === "options" || seen.state === "questionReveal") outcome = points > seen.points ? "correct" : "wrong";
      else outcome = null;
    } else if (state !== "result") outcome = null;
    setSeen({ state, points, outcome });
  }

  return seen.outcome ?? fallback;
}
