/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import { Check, Copy, Loader2, Monitor, X } from "lucide-react";
import { LETTERS_HIVE_GAME } from "@/constants/letters-hive";
import { HV_BACKDROP, HV_BTN_GLASS, HV_BTN_PRIMARY, HV_MODAL, HV_MUTED } from "./hiveUi";

/**
 * "شاشة العرض" عند المقدم: باركود وكود الغرفة (أي جوال أو تلفزيون يفتحها ويتحدث لحظياً)،
 * أو نافذة على نفس الجهاز. لو الغرفة الأونلاين مو متاحة: نفس الجهاز بس (مثل قبل).
 */
export default function HiveRoomModal({
  code,
  ensure,
  onOpenHere,
  onClose,
}: {
  code: string | null;
  /** يجهّز الغرفة قبل البدء (بدون ما ينحسب شي) ويرجّع كودها، أو null */
  ensure: () => Promise<string | null>;
  onOpenHere: (code: string | null) => void;
  onClose: () => void;
}) {
  const [checked, setChecked] = useState(Boolean(code));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (code) return;
    let alive = true;
    ensure().then(() => {
      if (alive) setChecked(true);
    });
    return () => {
      alive = false;
    };
  }, [code, ensure]);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const url = code ? `${window.location.origin}${LETTERS_HIVE_GAME.displayPath}?code=${code}` : "";
  const copy = () => {
    navigator.clipboard
      ?.writeText(url)
      .then(() => setCopied(true))
      .catch(() => {});
  };
  const ghost = `w-full py-3 ${HV_BTN_GLASS} font-black rounded-2xl flex items-center justify-center gap-2`;

  return (
    <div className={`fixed inset-0 z-2500 flex items-end sm:items-center justify-center ${HV_BACKDROP} p-3 animate-in fade-in`} onClick={onClose}>
      <div
        role="dialog"
        aria-label="شاشة العرض"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm ${HV_MODAL} rounded-[2rem] p-5 flex flex-col gap-4 text-center animate-in slide-in-from-bottom-8`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Monitor size={22} className="text-amber-300" /> شاشة العرض
          </h2>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="w-11 h-11 rounded-2xl flex items-center justify-center text-amber-50/60 hover:bg-white/10">
            <X size={24} />
          </button>
        </div>

        {code ? (
          <>
            <p className={`text-sm font-bold ${HV_MUTED} leading-relaxed`}>امسح الباركود من أي جوال أو تلفزيون، والشاشة تتحدث مع كل حركة</p>
            <div className="bg-white p-3 rounded-2xl mx-auto w-fit shadow-[0_0_34px_-8px_rgba(251,191,36,0.7)]">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`}
                alt={`باركود شاشة العرض للغرفة ${code}`}
                className="w-48 h-48"
              />
            </div>
            <div>
              <p className={`text-xs font-bold ${HV_MUTED}`}>كود الغرفة</p>
              <p dir="ltr" className="text-4xl font-black tracking-[0.3em] ps-[0.3em] text-amber-200 [text-shadow:0_0_16px_rgba(251,191,36,0.75)]">
                {code}
              </p>
              <p className="text-xs font-bold text-amber-50/55 mt-1 leading-relaxed">
                أو افتح{" "}
                <span dir="ltr" className="text-amber-50/80">
                  {window.location.host}
                  {LETTERS_HIVE_GAME.displayPath}
                </span>{" "}
                واكتب الكود
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={copy} className={ghost}>
                {copied ? <Check size={18} className="text-green-300" /> : <Copy size={18} />} {copied ? "انتسخ" : "نسخ الرابط"}
              </button>
              <button type="button" onClick={() => onOpenHere(code)} className={ghost}>
                <Monitor size={18} /> افتح هنا
              </button>
            </div>
          </>
        ) : !checked ? (
          <p className={`py-10 font-bold ${HV_MUTED} flex items-center justify-center gap-2`}>
            <Loader2 size={20} className="animate-spin" /> نجهّز الغرفة…
          </p>
        ) : (
          <>
            <p className="font-black leading-relaxed">العرض من جهاز ثاني مو متاح الحين</p>
            <p className={`text-sm font-bold ${HV_MUTED} leading-relaxed`}>
              تقدر تفتح شاشة العرض بنافذة على هالجهاز وتسحبها للشاشة الكبيرة.
            </p>
            <button
              type="button"
              onClick={() => onOpenHere(null)}
              className={`w-full py-4 ${HV_BTN_PRIMARY} font-black text-lg rounded-2xl flex items-center justify-center gap-2`}
            >
              <Monitor size={20} /> افتح شاشة العرض هنا
            </button>
          </>
        )}
      </div>
    </div>
  );
}
