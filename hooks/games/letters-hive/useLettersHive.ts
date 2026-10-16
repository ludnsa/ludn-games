"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { initialHiveState, type HiveState } from "@/lib/game/letters-hive-engine";

/**
 * خلية الحروف ما تحتاج سيرفر: المقدم يتحكم من اللابتوب، وشاشة العرض نافذة ثانية
 * بنفس المتصفح (تنسحب للشاشة الكبيرة). الحالة تنحفظ بالجهاز وتنبث للنافذة الثانية على طول.
 */
const STORAGE_KEY = "letters_hive_state_v1";
const CHANNEL = "letters_hive";

type Message = { type: "state"; state: HiveState } | { type: "hello" };

function readSaved(): HiveState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const s = raw ? (JSON.parse(raw) as HiveState) : null;
    return s && s.v === 1 && Array.isArray(s.owners) && Array.isArray(s.letters) ? s : null;
  } catch {
    return null; // تخزين المتصفح مقفل (نافذة خاصة مثلاً)
  }
}

function openChannel(): BroadcastChannel | null {
  return typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL);
}

/** المقدم: الحالة عنده، تنحفظ (لو حدّث الصفحة ما تضيع) وتنبث لشاشة العرض مع كل تغيير */
export function useLettersHiveHost() {
  const [state, setState] = useState<HiveState>(() => readSaved() ?? initialHiveState());
  const stateRef = useRef(state);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const ch = openChannel();
    channelRef.current = ch;
    // شاشة عرض انفتحت الحين: تطلب آخر حالة
    if (ch) {
      ch.onmessage = (e: MessageEvent<Message>) => {
        if (e.data?.type === "hello") ch.postMessage({ type: "state", state: stateRef.current } satisfies Message);
      };
    }
    return () => {
      ch?.close();
      channelRef.current = null;
    };
  }, []);

  useEffect(() => {
    stateRef.current = state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // تخزين المتصفح مقفل: البث يكفي، بس الجلسة ما تنحفظ لو انحدّثت الصفحة
    }
    channelRef.current?.postMessage({ type: "state", state } satisfies Message);
  }, [state]);

  const update = useCallback(
    (fn: (s: HiveState) => HiveState) => setState((s) => ({ ...fn(s), updatedAt: Date.now() })),
    []
  );

  return { state, update };
}

/** شاشة العرض: تقرا آخر حالة محفوظة، وتسمع للمقدم */
export function useLettersHiveDisplay(): HiveState | null {
  const [state, setState] = useState<HiveState | null>(() => readSaved());

  useEffect(() => {
    const ch = openChannel();
    if (ch) {
      ch.onmessage = (e: MessageEvent<Message>) => {
        if (e.data?.type === "state") setState(e.data.state);
      };
      ch.postMessage({ type: "hello" } satisfies Message);
    }
    // احتياط لو البث مو مدعوم: التخزين يبلّغ النوافذ الثانية بكل تغيير
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        setState(JSON.parse(e.newValue) as HiveState);
      } catch {
        // قيمة تالفة — نتجاهلها
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      ch?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return state;
}
