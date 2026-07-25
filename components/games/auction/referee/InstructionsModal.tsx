import React from "react";
import { Info, Gavel, BadgeDollarSign, ShieldAlert } from "lucide-react";

interface InstructionsModalProps {
  showInstructionsModal: boolean;
  setShowInstructionsModal: (val: boolean) => void;
}

export default function InstructionsModal({
  showInstructionsModal,
  setShowInstructionsModal,
}: InstructionsModalProps) {
  if (!showInstructionsModal) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in" dir="rtl">
       <div className="bg-white dark:bg-slate-900 border-4 border-amber-500 p-6 md:p-8 rounded-3xl max-w-2xl w-full text-right shadow-[8px_8px_0px_#f59e0b] animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scroll">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Info className="w-8 h-8 text-amber-500" strokeWidth={3} />
            <h2 className="text-3xl font-black text-slate-800 dark:text-white">كيف نلعب المزايدات؟ ⚖️</h2>
          </div>
          
          <div className="space-y-4 text-slate-700 dark:text-slate-300 font-bold text-sm md:text-base leading-relaxed">
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border-2 border-amber-100 dark:border-amber-800">
              <h3 className="text-amber-600 dark:text-amber-400 font-black text-lg mb-2">⚔️ التجهيز:</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>الحكم يضبط أسماء الفرق وميزانية البداية ويختار فئات الأسئلة.</li>
                <li>يشارك الحكم الكود لقائد الفريق عشان يدخل ويزايد من جواله.</li>
                <li>اللعب كله مزايدات! تطلع فئة السؤال والكل يزايد بدون ما يعرف السؤال، والمزايدة تبدأ من 1000 وبمضاعفات الـ 100.</li>
                <li>القائد يشاور فريقه، و<span className="text-rose-500 font-black">لازم الخصم ما يعرف كم رصيدكم أو مزايدتكم!</span></li>
              </ul>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl border-2 border-orange-100 dark:border-orange-800">
              <h3 className="text-orange-600 dark:text-orange-400 font-black text-lg mb-2">🔥 طريقة اللعب باختصار:</h3>
              <p className="text-center font-black text-slate-800 dark:text-white text-base md:text-lg bg-orange-100 dark:bg-orange-900/40 p-3 rounded-xl border border-orange-200 dark:border-orange-700">
                فئة السؤال ← تزايدون ← الفايز يختار عادي ولا دبل ← يطلع السؤال ← تختار تجاوب بخيارات ولا بدون ولا تبيع السؤال ← جاوب صح! ← تختار كؤوس ولا كمين... وهكذا!
              </p>
            </div>

            <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl border-2 border-rose-100 dark:border-rose-800">
              <h3 className="text-rose-600 dark:text-rose-400 font-black text-lg mb-2">💥 تفاصيل المعركة:</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>الفريق اللي يكسب المزايدة يقرر يلعب (عادي) أو (دبل). الدبل يخصم منك نفس مبلغ المزايدة مرة ثانية كضريبة! بس يخليك تكسب كؤوس دبل لو جاوبت صح.</li>
                <li>يطلع السؤال وعندك خيارين: تجاوب (بدون خيارات) وتاخذ 10 كؤوس (20 لو دبل)، أو (مع خيارات) وتاخذ 5 كؤوس (10 لو دبل).</li>
                <li>أي سؤال تزايدون عليه وما تجاوبونه صح، يروح عليكم!</li>
              </ul>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border-2 border-indigo-100 dark:border-indigo-800">
              <h3 className="text-indigo-600 dark:text-indigo-400 font-black text-lg mb-3">🃏 أفياش المساعدة (استخدمها بوقتها):</h3>
              <div className="flex flex-col gap-3 pr-2">
                <span className="flex items-start gap-2"><BadgeDollarSign size={20} className="text-emerald-500 shrink-0 mt-0.5" /> <span><strong>بيع سؤال (3 أفياش):</strong> تورطت بسؤال؟ تقدر تبيعه إجباري على الخصم بـ 5000 كوينز. (بس لا تزايد بأكثر من 5000 وتبيع لأن الفرق بيروح عليك! وما يمديك تبيعه لو كنت مختار دبل).</span></span>
                <span className="flex items-start gap-2"><ShieldAlert size={20} className="text-rose-500 shrink-0 mt-0.5" /> <span><strong>كمين (3 أفياش):</strong> جاوبت صح؟ تقدر تضحي بالكؤوس وتستخدم كمين! يرجع لك فلوس مزايدتك، ويسحب من الخصم نفس مبلغ مزايدته!</span></span>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border-2 border-red-100 dark:border-red-800">
              <h3 className="text-red-600 dark:text-red-400 font-black text-lg mb-2">🚨 فرصة السؤال الأخيرة:</h3>
              <p>لو الخصم أفلس وصار رصيده 0 وأنت باقي معاك فلوس، تاخذ (فرصة السؤال الأخيرة)! بدون خيارات تاخذ 30 كأس، وبخيارات تاخذ 20 كأس، وتنتهي اللعبة!</p>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border-2 border-emerald-100 dark:border-emerald-800 text-center">
              <h3 className="text-emerald-600 dark:text-emerald-400 font-black text-xl mb-1">🏆 الفايز:</h3>
              <p>اللي يجمع كؤوس أكثر بنهاية الأسئلة أو عند الإفلاس هو بطل المزاد! 🏆</p>
            </div>
          </div>

          <button onClick={() => setShowInstructionsModal(false)} className="mt-6 w-full py-4 bg-amber-500 hover:bg-amber-400 text-white font-black text-xl rounded-2xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-[4px] transition-all shadow-[4px_4px_0px_#0f172a]">
             فهمت اللعبة، افتح المزاد! 🔨
          </button>
       </div>
    </div>
  );
}
