"use client";

import { getMafiaSoundTiming, playMafiaSound, type MafiaSound } from "@/lib/game/mafia-sounds";

/**
 * حركات لعبة المافيا. كل حركة مربوطة بصوت: تاخذ مدته ولحظات الذروة فيه،
 * فالاهتزاز والوميض يجون على نفس ضربات الموسيقى بالضبط.
 * الحركات تشتغل حتى لو الصوت مكتوم.
 */

export type MafiaFxKind =
  /** ذبح: اهتزاز + وميض أحمر + دم يسيل */
  | "kill"
  /** ضربة سيف سريعة */
  | "slash"
  /** كشف مافيا: برق + توهج أحمر */
  | "reveal_mafia"
  /** المحقق خلّص تحقيقه: برق بدون كشف النتيجة */
  | "investigate"
  /** تحقيق خاطئ */
  | "miss"
  /** حماية: جزيئات ذهبية + درع نور */
  | "saved"
  /** درع الجندي */
  | "shield"
  | "bomb"
  | "magic"
  /** فلاش كاميرا الصحفي */
  | "flash"
  /** خروج بالتصويت: ظلام + ضربة مطرقة */
  | "doom"
  | "win_town"
  | "win_mafia"
  /** على شاشة الضحية بس: "المافيا ذبحوك" */
  | "victim"
  /** على شاشة اللي حاولوا يذبحونه ونجا: "فكك الله" */
  | "escaped"
  /** على شاشة هدف الانتحاري بس: "الانتحاري أخذك معه" */
  | "victim_bomb";

export interface MafiaFxEvent {
  id: number;
  kind: MafiaFxKind;
  /** بالثواني */
  duration: number;
  peaks: number[];
}

type Listener = (e: MafiaFxEvent) => void;
const listeners = new Set<Listener>();
let nextId = 1;

export function subscribeMafiaFx(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * يشغّل الصوت والحركة المرتبطة فيه بنفس اللحظة.
 * silent: الحركة بس بدون صوت — لأفعال سرية (مثل المحقق) عشان جواله ما يفضحه.
 */
export function cueMafia(sound: MafiaSound, fx?: MafiaFxKind, opts: { silent?: boolean } = {}) {
  const timing = getMafiaSoundTiming(sound);
  if (!opts.silent) playMafiaSound(sound);
  if (!fx) return;
  const event: MafiaFxEvent = { id: nextId++, kind: fx, duration: timing.duration, peaks: timing.peaks };
  listeners.forEach((l) => l(event));
}
