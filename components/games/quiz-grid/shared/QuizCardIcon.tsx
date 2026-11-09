/* eslint-disable @next/next/no-img-element */
import React from "react";
import { QUIZ_CARDS } from "./quizCards";
import type { QuizLifelineKey } from "@/types";

/** أيقونة الوسيلة المدورة من صورة كرتها — مكان رموز lucide القديمة. off: الوسيلة استُخدمت أو مقفولة */
export function QuizCardIcon({
  kind,
  className = "",
  off = false,
}: {
  kind: QuizLifelineKey;
  className?: string;
  off?: boolean;
}) {
  return (
    <img
      src={QUIZ_CARDS[kind].icon}
      alt=""
      draggable={false}
      className={`shrink-0 rounded-full ${off ? "grayscale opacity-45" : ""} ${className}`}
    />
  );
}
