import React from "react";
import { Info, Globe, Shield, Rocket, Crown, Radiation, Crosshair } from "lucide-react";

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
       <div className="bg-white dark:bg-slate-900 border-4 border-blue-500 p-6 md:p-8 rounded-3xl max-w-2xl w-full text-right shadow-[8px_8px_0px_#3b82f6] animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scroll">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Info className="w-8 h-8 text-blue-500" strokeWidth={3} />
            <h2 className="text-3xl font-black text-slate-800 dark:text-white">كيف نلعب السيطرة على العالم؟ 🌍</h2>
          </div>
          
          <div className="space-y-4 text-slate-700 dark:text-slate-300 font-bold text-sm md:text-base leading-relaxed">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border-2 border-blue-100 dark:border-blue-800">
              <h3 className="text-blue-600 dark:text-blue-400 font-black text-lg mb-2">⚔️ التجهيز:</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>الحكم يضبط الدول ويختار العواصم لكل فريق. <span className="text-amber-500 font-black">ركز باختيار العاصمة</span> لأن أسئلة الغزو بتجي منها!</li>
                <li>النقاط تعتمد على عدد الدول اللي اخترتوها:
                  <ul className="list-[circle] list-inside mr-4 mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                    <li><span className="text-blue-500">20 دولة:</span> (6 دول بـ 2000 - 14 دولة بـ 1000)</li>
                    <li><span className="text-blue-500">30 دولة:</span> (8 دول بـ 2000 - 22 دولة بـ 1000)</li>
                    <li><span className="text-blue-500">40 دولة:</span> (10 دول بـ 2000 - 30 دولة بـ 1000)</li>
                    <li>بالإضافة لـ <span className="text-rose-500">دولتين للحكم</span> ما تقدر تختارها إلا بعد احتلال جميع الدول (بـ 2000 نقطة لكل دولة).</li>
                  </ul>
                </li>
                <li>اللعب كله عند الحكم، شاشتك بس توريك العالم وتحديثاته!</li>
                <li><span className="text-red-500 font-bold text-xs">* دول الحكم اختيارية</span></li>
              </ul>
            </div>

            <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl border-2 border-rose-100 dark:border-rose-800">
              <h3 className="text-rose-600 dark:text-rose-400 font-black text-lg mb-2">🔥 وقت المعركة:</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>تختار دولة، يطلع لك سؤال بخيارات.. جاوبت صح؟ الدولة ونقاطها صارت لك!</li>
                <li>جاوبت خطأ؟ تروح الفرصة للخصم وإذا جاوب صح ياخذ نقاط الدولة.</li>
              </ul>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border-2 border-indigo-100 dark:border-indigo-800">
              <h3 className="text-indigo-600 dark:text-indigo-400 font-black text-lg mb-3">🃏 البطاقات التكتيكية (لعب الكبار):</h3>
              <p className="mb-3 text-sm">عندك 6 أنواع من البطاقات، استخدمها بذكاء عشان تقلب الطاولة:</p>
              <div className="flex flex-col gap-3 pr-2">
                <span className="flex items-start gap-2"><Globe size={20} className="text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" /> <span><strong>احتلال (3):</strong> تاخذ الدولة على طول بدون سؤال (بس لا تصير محمية!).</span></span>
                <span className="flex items-start gap-2"><Rocket size={20} className="text-orange-500 shrink-0 mt-0.5" /> <span><strong>قصف (3):</strong> تكسر فيها حماية الخصم، أو تطير نص نقاط دولته! (ما تقدر تقصف العاصمة).</span></span>
                <span className="flex items-start gap-2"><Shield size={20} className="text-emerald-500 shrink-0 mt-0.5" /> <span><strong>حماية (3):</strong> درع لدولتك، والأذكى يحمي الدول اللي بـ 2000 نقطة.</span></span>
                <span className="flex items-start gap-2"><Crosshair size={20} className="text-indigo-500 shrink-0 mt-0.5" /> <span><strong>تجسس (2):</strong> تجيب لك دولة دسمة بـ 2000 نقطة جاهزة وتجاوب على سؤالها.</span></span>
                <span className="flex items-start gap-2"><Crown size={20} className="text-amber-500 shrink-0 mt-0.5" /> <span><strong>غزو (2):</strong> بس للعاصمة! شرط تكون نقاطك فوق 5000 والخصم فوق 10,000. فزت؟ تلطش ثلث نقاطه!</span></span>
                <span className="flex items-start gap-2"><Radiation size={20} className="text-red-500 shrink-0 mt-0.5" /> <span><strong>نووي (1):</strong> ورقة الدمار الشامل! ما تضربها إلا إذا الخصم متقدم عليك بنقاطه الدبل أو أكثر.. ترجع نقاطه للنص وتكسر هيبته!</span></span>
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border-2 border-emerald-100 dark:border-emerald-800 text-center">
              <h3 className="text-emerald-600 dark:text-emerald-400 font-black text-xl mb-1">🏆 الفايز:</h3>
              <p>اللي يجمع نقاط أكثر ويسيطر على أكبر مساحة ممكنة بنهاية اللعبة! 🌍</p>
            </div>
          </div>

          <button onClick={() => setShowInstructionsModal(false)} className="mt-6 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xl rounded-2xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-[4px] transition-all shadow-[4px_4px_0px_#0f172a]">
             فهمت التكتيك، قدام! 🚀
          </button>
       </div>
    </div>
  );
}
