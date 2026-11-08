"use client";

import React from "react";
import { X, MonitorPlay } from "lucide-react";

interface AudienceModalProps {
  showAudienceModal: boolean;
  setShowAudienceModal: (val: boolean) => void;
  roomCode: string | null;
  audienceUrl: string;
  showAlert: (msg: string) => void;
}

export default function AudienceModal({
  showAudienceModal,
  setShowAudienceModal,
  roomCode,
  audienceUrl,
  showAlert,
}: AudienceModalProps) {
  if (!showAudienceModal) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-8 max-w-sm w-full border-2 border-blue-500 text-center shadow-2xl animate-in zoom-in-95 relative">
        <button
          onClick={() => setShowAudienceModal(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
        <MonitorPlay className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-xl lg:text-2xl font-black mb-2 dark:text-white">
          دعوة للرادار (شاشة الجمهور)
        </h3>
        <p className="text-slate-500 mb-6 text-sm font-bold">
          تنفتح على الشاشة الكبيرة أو من جوال كل متسابق: امسح الباركود، أو انسخ الرابط، أو أدخل الكود في صفحة الجمهور.
        </p>

        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl mb-6">
          <p className="text-xs text-slate-500 font-bold mb-1">كود الغرفة:</p>
          <p className="text-4xl font-mono font-black text-blue-600 dark:text-blue-400 tracking-widest">
            {roomCode}
          </p>
        </div>

        <div className="bg-white p-2 rounded-2xl shadow-sm border-2 border-slate-200 w-fit mx-auto mb-6">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
              audienceUrl
            )}`}
            alt="QR Code"
            className="w-32 h-32"
          />
        </div>

        <button
          onClick={() => {
            navigator.clipboard.writeText(audienceUrl);
            showAlert("تم نسخ الرابط بنجاح! ✅");
          }}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-colors text-sm"
        >
          نسخ الرابط
        </button>
      </div>
    </div>
  );
}