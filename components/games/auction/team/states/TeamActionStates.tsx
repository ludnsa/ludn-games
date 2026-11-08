"use client";
import React from "react";
import { Handshake, ShieldAlert, Trophy, CheckCircle2, XCircle, Gavel } from "lucide-react";
import { useAnswerOutcome } from "../../useAnswerOutcome";

export default function TeamActionStates({ ctx }: { ctx: any }) {
  const live = ctx.liveData;
  // صح أو غلط للعرض بس، من تسلسل حالات الغرفة (الجوال ما يقارن بالإجابة لأن السؤال عنده ممكن يكون قديم)
  const outcome = useAnswerOutcome({ state: live?.game_state, points1: live?.t1_points || 0, points2: live?.t2_points || 0 });

  if (!live) return null;
  const state = live.game_state;
  const teamName = (t: 1 | 2) => (t === 1 ? live.t1_name : live.t2_name) || (t === 1 ? "الفريق الأول" : "الفريق الثاني");
  const teamColor = (t: 1 | 2) => (t === 1 ? "text-cyan-600 dark:text-cyan-400" : "text-rose-600 dark:text-rose-400");

  if (state === "buyOffer") {
    return (
      <div className="bg-[#0e0a06]/85 backdrop-blur-sm p-10 rounded-[2rem] shadow-xl border-4 border-purple-500 text-center w-full animate-in zoom-in flex flex-col items-center justify-center min-h-[30vh]">
         <Handshake className="w-16 h-16 text-purple-500 mb-4 animate-bounce" />
         <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">عرض الشراء!</h2>
         <p className="text-sm font-bold text-slate-500 dark:text-slate-400">هناك عرض على الطاولة لشراء السؤال، الرجاء الانتباه لقرار الحكم.</p>
      </div>
    );
  }

  if (["preRisk"].includes(state)) {
    const winner: 1 | 2 | null = live.winner === 1 || live.winner === 2 ? live.winner : null;
    return (
      <div className="bg-[#0e0a06]/85 backdrop-blur-sm p-10 rounded-[2rem] shadow-xl border-4 border-[#d4af37]/30 text-center w-full animate-in zoom-in flex flex-col items-center justify-center min-h-[30vh]">
         {winner ? (
           <>
             <Gavel className="w-16 h-16 text-yellow-500 mb-4" />
             <p className="text-sm font-black text-slate-500 dark:text-slate-400 mb-1">كسب المزايدة</p>
             <h2 className={`text-3xl font-black mb-3 ${teamColor(winner)}`}>{teamName(winner)}</h2>
             <p className="text-sm font-bold text-slate-500 dark:text-slate-400">بانتظار قرار الحكم: لعب عادي أو دبل.</p>
           </>
         ) : (
           <>
             <ShieldAlert className="w-16 h-16 text-slate-400 mb-4 animate-bounce" />
             <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">إجراءات تحكيمية جارية</h2>
             <p className="text-sm font-bold text-slate-500 dark:text-slate-400">الرجاء الانتباه للحكم والشاشة الرئيسية للاستماع للقرارات والمفاوضات.</p>
           </>
         )}
      </div>
    );
  }

  if (["rewardChoice", "result"].includes(state)) {
    // الفريق اللي جاوب: اللي اشترى السؤال لو انباع، وإلا اللي كسب المزايدة
    const answered: 1 | 2 | null = live.buyer === 1 || live.buyer === 2 ? live.buyer : live.winner === 1 || live.winner === 2 ? live.winner : null;
    if (outcome) {
      const right = outcome === "correct";
      return (
        <div className={`bg-[#0e0a06]/85 backdrop-blur-sm p-10 rounded-[2rem] shadow-xl border-4 text-center w-full animate-in zoom-in flex flex-col items-center justify-center min-h-[30vh] ${right ? "border-emerald-500" : "border-rose-500"}`}>
           {right ? <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" /> : <XCircle className="w-16 h-16 text-rose-500 mb-4" />}
           <h2 className={`text-3xl font-black mb-2 ${right ? "text-emerald-500" : "text-rose-500"}`}>{right ? "إجابة صحيحة" : "إجابة خاطئة"}</h2>
           {answered && <p className={`text-lg font-black mb-3 ${teamColor(answered)}`}>{teamName(answered)}</p>}
           <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
             {state === "rewardChoice" ? "بانتظار اختيار المكافأة." : "تم اعتماد النتيجة. تأكد من الشاشة الرئيسية لمعرفة التفاصيل."}
           </p>
        </div>
      );
    }
    return (
      <div className="bg-[#0e0a06]/85 backdrop-blur-sm p-10 rounded-[2rem] shadow-xl border-4 border-emerald-500/50 text-center w-full animate-in zoom-in flex flex-col items-center justify-center min-h-[30vh]">
         <Trophy className="w-16 h-16 text-emerald-500 mb-4 animate-bounce" />
         <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">انتهى السؤال!</h2>
         <p className="text-sm font-bold text-slate-500 dark:text-slate-400">تتم الآن مراجعة واعتماد النتيجة والمكافآت من قِبل الحكم.<br/>تأكد من الشاشة الرئيسية لمعرفة التفاصيل.</p>
      </div>
    );
  }

  if (state === "gameOver") {
    const t1P = live.t1_points || 0;
    const t2P = live.t2_points || 0;
    const t1N = live.t1_name || "الفريق الأول";
    const t2N = live.t2_name || "الفريق الثاني";

    return (
      <div className="bg-[#0e0a06]/85 backdrop-blur-sm p-12 rounded-[2.5rem] shadow-2xl border-4 border-yellow-500 text-center w-full animate-in zoom-in duration-700">
         <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6 animate-pulse" />
         <h2 className="text-4xl font-black mb-4 text-[#e8c766]">انتهى المزاد!</h2>
         <div className="text-xl md:text-3xl font-black text-slate-600 dark:text-slate-300 mb-6">
           الـفـائـز الـنـهـائـي: {t1P > t2P ? <span className="text-cyan-600 dark:text-cyan-400">{t1N}</span> : t1P < t2P ? <span className="text-rose-600 dark:text-rose-400">{t2N}</span> : <span className="text-amber-500">تعادل عادل</span>}
         </div>
         <p className="text-xl font-bold text-slate-500 mb-8">الرجاء النظر للشاشة الرئيسية للتفاصيل.</p>
      </div>
    );
  }

  return null;
}