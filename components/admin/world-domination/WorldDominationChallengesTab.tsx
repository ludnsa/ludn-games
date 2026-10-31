"use client";
import React from "react";
import { HelpCircle, Target, Trash2 } from "lucide-react";
import { PANEL, PANEL_TITLE, TITLE_ICON, FIELD, BTN_SM_GOLD, ICON_BTN_DANGER, EMPTY } from "@/components/admin/layout/adminUi";

export default function WorldDominationChallengesTab({ ctx }: { ctx: any }) {
  if (ctx.wdActiveSubTab !== "challenges") return null;

  return (
    <div className="grid gap-5 w-full animate-in fade-in">
      <div className={`${PANEL} flex flex-col sm:flex-row gap-2.5`}>
        <input
          type="text"
          value={ctx.newWdChallenge}
          onChange={(e) => ctx.setNewWdChallenge(e.target.value)}
          placeholder="أضف تحدي جديد للحكم (سيظهر للجمهور بدون خيارات)..."
          className={`${FIELD} flex-1`}
          onKeyDown={(e) => e.key === "Enter" && ctx.addWdChallenge()}
        />
        <button onClick={ctx.addWdChallenge} className={`${BTN_SM_GOLD} min-h-12 px-6`}>
          حفظ التحدي
        </button>
      </div>

      <div className={`${PANEL} grid gap-5`}>
        <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-ludn-line">
          <h3 className={PANEL_TITLE}>
            <span className={TITLE_ICON}><HelpCircle size={20} /></span>
            بنك تحديات الحكم المسجلة
          </h3>
          <span className="bg-ludn-gold/15 text-ludn-gold-text px-3.5 py-1.5 rounded-xl text-sm font-black tabular-nums">
            {ctx.wdChallengesDB.length} تحدي
          </span>
        </div>

        {ctx.wdChallengesDB.length === 0 ? (
          <div className={EMPTY}>
            <Target size={52} className="opacity-30" />
            <p className="text-lg">لا يوجد تحديات مسجلة حالياً في البنك.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
            {ctx.wdChallengesDB.map((challenge: { id: string; question: string }, idx: number) => (
              <div key={challenge.id} className="rounded-2xl bg-ludn-surface-2 border border-ludn-line p-3.5 flex items-center justify-between gap-3 hover:border-ludn-gold/50 transition-colors">
                <span className="text-ludn-muted font-black shrink-0 tabular-nums">{idx + 1}-</span>
                <span className="font-bold w-full min-w-0 leading-relaxed break-words">{challenge.question}</span>
                <button onClick={() => ctx.deleteWdChallenge(challenge.id)} className={ICON_BTN_DANGER} aria-label="حذف التحدي">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
