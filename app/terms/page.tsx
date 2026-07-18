"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Tajawal } from "next/font/google";
import { ChevronRight, ShieldCheck, Scale, AlertTriangle, HelpCircle } from "lucide-react";
import { TopNav } from "@/components/home/TopNav";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800", "900"],
});

export default function TermsPage() {
  const [activeTab, setActiveTab] = useState("terms");

  const tabs = [
    { id: "terms", label: "شروط الاستخدام", icon: Scale },
    { id: "privacy", label: "سياسة الخصوصية", icon: ShieldCheck },
    { id: "faq", label: "الأسئلة الشائعة", icon: HelpCircle },
  ];

  const content = {
    terms: (
      <div className="space-y-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4 border-b-2 border-indigo-100 dark:border-indigo-900/30 pb-4">اتفاقية الشروط والأحكام لمنصة ألعاب لدن</h2>
        <div className="space-y-4 text-slate-700 dark:text-slate-300 font-bold text-sm leading-loose">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400 mb-2">1. مقدمة وقبول الشروط</h3>
            <p>أهلاً بك في منصة ألعاب لدن. يمثل دخولك واستخدامك لهذه المنصة موافقة تامة ومطلقة على جميع الشروط والأحكام الواردة هنا. تخضع هذه الوثيقة للأنظمة والقوانين المعمول بها في المملكة العربية السعودية، وتحديداً نظام التجارة الإلكترونية ونظام حماية البيانات الشخصية.</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400 mb-2">2. التسجيل وإدارة الحسابات</h3>
            <ul className="list-disc list-inside space-y-2 marker:text-indigo-400">
              <li><strong>طرق التسجيل:</strong> تتيح المنصة للمستخدمين إنشاء حسابات شخصية باستخدام (البريد الإلكتروني، حساب Google، أو حساب iCloud).</li>
              <li><strong>دقة المعلومات:</strong> يلتزم المستخدم بتقديم معلومات صحيحة ودقيقة أثناء التسجيل، وتحديثها عند الحاجة.</li>
              <li><strong>سرية الحساب:</strong> المستخدم مسؤول مسؤولية كاملة عن الحفاظ على سرية بيانات تسجيل الدخول الخاصة به، وعن جميع الأنشطة التي تحدث تحت حسابه.</li>
              <li><strong>الأهلية القانونية:</strong> يجب أن يكون المستخدم بالغاً للسن القانوني أو يمتلك موافقة صريحة من الولي الشرعي لاستخدام المنصة وإجراء عمليات الدفع.</li>
            </ul>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400 mb-2">3. نظام التجربة المجانية والباقات</h3>
            <ul className="list-disc list-inside space-y-2 marker:text-indigo-400">
              <li><strong>التجربة المجانية:</strong> تمنح المنصة للمستخدمين الجدد الحق في تجربة اللعبة لمرة واحدة مجاناً عند التسجيل لأول مرة، بغرض تقييم الخدمة قبل الشراء.</li>
              <li><strong>الباقات المدفوعة:</strong> بعد انتهاء التجربة المجانية، يتطلب الاستمرار في اللعب شراء إحدى الباقات المتاحة في المنصة.</li>
              <li><strong>شروط الاسترجاع وإلغاء الطلب:</strong> وفقاً للائحة التنفيذية لنظام التجارة الإلكترونية في المملكة العربية السعودية، المنتجات الرقمية (مثل ألعاب الفيديو وباقات اللعب) التي تم استهلاكها أو البدء في استخدامها غير قابلة للاسترجاع، إلا في حال وجود عيب تقني يمنع المستخدم من الاستفادة من الخدمة المدفوعة.</li>
            </ul>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400 mb-2">4. المدفوعات والرسوم</h3>
            <ul className="list-disc list-inside space-y-2 marker:text-indigo-400">
              <li><strong>بوابات الدفع:</strong> تتم جميع عمليات الدفع عبر بوابات إلكترونية آمنة ومعتمدة.</li>
              <li><strong>الضرائب:</strong> جميع الأسعار المعروضة للباقات تشمل ضريبة القيمة المضافة (VAT) المقررة في المملكة العربية السعودية بنسبة 15% (أو حسب التحديثات النظامية).</li>
              <li><strong>الأمان:</strong> المنصة لا تقوم بتخزين بيانات البطاقات الائتمانية الخاصة بالمستخدمين في خوادمها، بل تتم معالجتها عبر مزودي خدمة الدفع المعتمدين.</li>
            </ul>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400 mb-2">5. حقوق الملكية الفكرية</h3>
            <ul className="list-disc list-inside space-y-2 marker:text-indigo-400">
              <li>جميع المحتويات المتوفرة على المنصة (بما في ذلك الألعاب، النصوص، التصاميم، الأكواد، والشعارات) هي ملكية حصرية لمنصة ألعاب لدن أو لمزودي الخدمة التابعين لها.</li>
              <li>لا يُسمح للمستخدم بنسخ، أو توزيع، أو تعديل، أو الهندسة العكسية لأي من الألعاب أو البرمجيات المتاحة في المنصة.</li>
            </ul>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400 mb-2">6. سياسة الاستخدام المقبول والمحظورات</h3>
            <p className="mb-2">يُحظر على المستخدم القيام بأي من الإجراءات التالية:</p>
            <ul className="list-disc list-inside space-y-2 marker:text-indigo-400">
              <li>استخدام برامج الغش، أو التلاعب، أو استغلال الثغرات التقنية (Bugs) في الألعاب.</li>
              <li>القيام بأي سلوك يسيء للمنصة أو للمستخدمين الآخرين.</li>
              <li>محاولة اختراق أمان المنصة أو التدخل في عملها الطبيعي.</li>
            </ul>
            <p className="mt-2 text-rose-500">في حال ثبوت أي مخالفة، يحق لإدارة المنصة تعليق أو حظر حساب المستخدم نهائياً دون تعويض.</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400 mb-2">7. الخصوصية وحماية البيانات (PDPL)</h3>
            <p>تلتزم منصة ألعاب لدن بحماية خصوصية بيانات المستخدمين وفقاً لـ "نظام حماية البيانات الشخصية" في المملكة العربية السعودية. استخدام المنصة لمعلومات المستخدم (مثل البريد الإلكتروني أو بيانات الربط مع Google و iCloud) يتم فقط لغرض تفعيل الحساب، تقديم الخدمة، وتطوير تجربة المستخدم، ولا يتم بيعها أو مشاركتها مع أطراف ثالثة لأغراض تسويقية دون موافقة صريحة.</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400 mb-2">8. إخلاء المسؤولية</h3>
            <ul className="list-disc list-inside space-y-2 marker:text-indigo-400">
              <li>تقدم الخدمات والألعاب في المنصة "كما هي" دون أي ضمانات صريحة أو ضمنية باستمرارية الخدمة دون انقطاع، حيث قد تتأثر الخدمات بأعمال الصيانة الدورية أو التحديثات.</li>
              <li>لا تتحمل المنصة أي مسؤولية عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام الخدمة أو عدم القدرة على استخدامها.</li>
            </ul>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400 mb-2">9. التعديل على الشروط والأحكام</h3>
            <p>تحتفظ إدارة منصة ألعاب لدن بالحق في تعديل أو تحديث هذه الشروط في أي وقت. سيتم إشعار المستخدمين بأي تغييرات جوهرية عبر البريد الإلكتروني أو من خلال إشعار بارز في المنصة، ويعتبر الاستمرار في استخدام المنصة بعد التعديل موافقة عليه.</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400 mb-2">10. القانون الحاكم وحل النزاعات</h3>
            <p>تخضع هذه الشروط والأحكام وتفسر وفقاً للأنظمة المعمول بها في المملكة العربية السعودية. وفي حال نشوء أي نزاع -لا سمح الله- يتم حله ودياً، وإذا تعذر ذلك، تحال المسألة إلى المحاكم المختصة في مدينة الرياض.</p>
          </div>

          <div className="mt-8 pt-6 border-t-2 border-slate-100 dark:border-slate-800 flex justify-center">
            <Link href="/player" className="flex items-center justify-center gap-2 w-full md:w-1/2 lg:w-1/3 p-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black hover:-translate-y-1 transition-transform shadow-md">
              العودة للتسجيل
            </Link>
          </div>
        </div>
      </div>
    ),
    privacy: (
      <div className="space-y-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4 border-b-2 border-emerald-100 dark:border-emerald-900/30 pb-4">سياسة الخصوصية</h2>
        <div className="space-y-4 text-slate-700 dark:text-slate-300 font-bold text-sm leading-loose">
          <p>
            نحن نولي أهمية قصوى لخصوصيتك. هذه السياسة تشرح كيفية جمعنا للبيانات واستخدامها.
          </p>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400 mb-2">حماية البيانات</h3>
            <p>
              جميع بياناتك (كالبريد الإلكتروني ورقم الهاتف) مشفرة ومحفوظة بأعلى معايير الأمان. لن نقوم ببيع أو مشاركة بياناتك مع أي طرف ثالث لأغراض تسويقية دون موافقتك الصريحة.
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400 mb-2">البيانات التي نجمعها</h3>
            <ul className="list-disc list-inside space-y-2 marker:text-emerald-400">
              <li>البيانات الأساسية التي تزودنا بها أثناء التسجيل (الاسم، البريد، الجوال).</li>
              <li>إحصائيات اللعب ونتائج المباريات لتحسين نظام التصنيف وعرض الإنجازات.</li>
              <li>سجلات الدخول لتأمين الحساب من الاختراقات.</li>
            </ul>
          </div>
        </div>
      </div>
    ),
    faq: (
      <div className="space-y-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4 border-b-2 border-amber-100 dark:border-amber-900/30 pb-4">الأسئلة الشائعة</h2>
        <div className="space-y-4 text-slate-700 dark:text-slate-300 font-bold text-sm leading-loose">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-amber-600 dark:text-amber-400 mb-2">كيف يمكنني إنشاء لعبة في لدن؟</h3>
            <p>أنشئ حساب جديد في المنصة وابدأ اللعب مباشرة وقسم المتواجدين إلى فريقين ثم اختر اسم لكل فريق وبعدها ابدأ اللعبة.</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-amber-600 dark:text-amber-400 mb-2">هل يمكن تجربة اللعبة قبل الشراء؟</h3>
            <p>نعم لكل حساب جديد تجربة مرة واحدة لكل لعبة.</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-amber-600 dark:text-amber-400 mb-2">هل تتكرر الأسئلة بين الألعاب ؟</h3>
            <p>لكل لعبة أسلوبها الخاص وبنك الأسئلة تتحدث بشكل دوري.</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-amber-600 dark:text-amber-400 mb-2">هل يوجد وقت محدد للعبة الواحدة؟</h3>
            <p>تختلف ظروف كل لعبة عن الأخرى حيث أن الهدف من الألعاب هي دمج المتعة والمعرفة مع العائلة أو الأصدقاء أو الزملاء في العمل.</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-amber-600 dark:text-amber-400 mb-2">هل المنصة تعمل على الهواتف الذكية؟</h3>
            <p>المنصة متوافقة مع جميع الأجهزة الذكية بحيث توفر تحكم عالي في التنقلات بين الأسئلة والخيارات وصفحات المنصة.</p>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <main className={`min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white ${tajawal.className} flex flex-col`} dir="rtl">
      {/* استدعاء نفس الهيدر المستخدم في الصفحة الرئيسية */}
      <TopNav />

      {/* محتوى الصفحة */}
      <div className="flex-grow max-w-4xl mx-auto w-full px-4 py-12 mt-24 md:mt-32">
        <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-black/20 min-h-[600px] relative overflow-hidden">
          
          {/* زخرفة خفيفة للخلفية */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          
          <div className="relative z-10 animate-fade-in">
            {content.terms}
          </div>
        </div>
      </div>
    </main>
  );
}
