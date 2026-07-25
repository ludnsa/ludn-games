"use client";
import React, { useState, useEffect } from "react";
import { Tajawal } from "next/font/google";
import { TopNav } from "@/components/home/TopNav";
import { Swords, Globe, Gavel, Users, Clock, Trophy, Target, Sparkles, ChevronLeft, Shield, Rocket, Crown, Crosshair, Radiation, BadgeDollarSign, ShieldAlert } from "lucide-react";
import Link from "next/link";

const TankIcon = ({ className, size = 24 }: { className?: string; size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M8 11V9a2 2 0 0 1 2-2h4" />
    <path d="M14 7h6" />
    <rect x="2" y="13" width="20" height="6" rx="3" />
    <path d="M5 13v-1.5a1.5 1.5 0 0 1 1.5-1.5h11a1.5 1.5 0 0 1 1.5 1.5V13" />
    <path d="M7 16h.01" />
    <path d="M12 16h.01" />
    <path d="M17 16h.01" />
  </svg>
);

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800", "900"],
});

export default function GameGuidesPage() {
  const [activeGame, setActiveGame] = useState("auction");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const game = params.get("game");
      if (game) {
        setActiveGame(game);
      }
    }
  }, []);

  const games = [
    {
      id: "auction",
      title: "المزايدات",
      icon: Gavel,
      color: "amber",
      players: "فريقان (مع حكم)",
      duration: "حتى انتهاء الأسئلة",
      difficulty: "متوسط إلى صعب",
      description: "لعبة تحدي ومكر! تعتمد على كيف تدير ميزانيتك بذكاء وتورط خصمك في المزايدات. اللي يجمع كؤوس أكثر يفوز 🏆",
      sections: [
        {
          title: "تجهيز اللعبة",
          rules: [
            "الحكم يضبط أسماء الفرق وميزانية البداية (الأساسي 50 ألف) ويختار فئات الأسئلة (الأساسي 15 سؤال) من الإعدادات.",
            "الحكم يشارك الكود أو الباركود أو يرسل الرابط على الواتس لقائد الفريق، من خلال جوال القائد الفريق يزايد على السؤال.",
            "اللعب يعتمد على المزايدة، الفئة تطلع للجميع والسؤال مجهول، وتبدأ المزايدة من 1000 وبمضاعفات الـ 100.",
            "قائد الفريق يشاور أصدقاءه كم تبون نزايد على السؤال ولازم الفريق الثاني ما يعرف مزايدتكم أو رصيدكم."
          ]
        },
        {
          title: "طريقة اللعب",
          rules: [
            <div key="summary-rule" className="flex flex-col gap-1 mb-1">
              <span className="font-black text-amber-600 dark:text-amber-400">اللعبة باختصار:</span>
              <span className="text-base font-black leading-relaxed text-slate-800 dark:text-slate-200">
                فئة السؤال ← تزايدون ← الفايز يختار لعب عادي ولا دبل ← يطلع السؤال ← تختار تجاوب بخيارات ولا بدون ولا تبيع السؤال ← جاوب صح! ← تختار كؤوس ولا كمين... وهكذا
              </span>
            </div>,
            "الحكم يعرض فئة السؤال وكل فريق يعطي مزايدته. إذا تساوت المبالغ، السؤال يروح للفريق اللي له الدور.",
            "الفريق اللي يكسب المزايدة يقرر يلعب لعب (عادي) أو (دبل). الدبل يخصم من رصيدك نفس مبلغ المزايدة كضريبة إضافية بس يخليك تكسب نقاط مضاعفة لو جاوبت صح.",
            "بعدها الحكم يعرض السؤال وعندك خيارين للإجابة: إما تجاوب بدون خيارات وتاخذ 10 كؤوس (20 كأس لو دبل)، أو تجاوب مع خيارات وتاخذ 5 كؤوس (10 كؤوس لو دبل).",
            <div key="cards-rule" className="flex flex-col gap-3 mt-2">
              <span>عندك 6 أفياش مساعدة استخدمها في الوقت الصح:</span>
              <div className="flex flex-col gap-2 pl-2 lg:pl-0 pr-2 lg:pr-4">
                <span className="flex items-start gap-1.5"><BadgeDollarSign size={18} className="text-emerald-500 shrink-0 mt-0.5" /> <span>3 أفياش بيع سؤال: لو شريت سؤال ولا عرفت تجاوبه تقدر تبيعه إجباري على الخصم بقيمة ثابتة 5000 كوينز، لا تشتري سؤال أكثر من 5000 وتبيع السؤال لأن مزايدتك بتروح عليك وتاخذ قيمة البيع، وما تقدر تبيع السؤال لو كنت مختار (دبل).</span></span>
                <span className="flex items-start gap-1.5"><ShieldAlert size={18} className="text-rose-500 shrink-0 mt-0.5" /> <span>3 أفياش كمين: إذا جاوبت صح إما تختار تاخذ كؤوس أو تستخدم فيش كمين (ترجع لك فلوسك اللي دفعتها في المزايدة ويسحب من الخصم مبلغ مزايدته).</span></span>
              </div>
            </div>,
            "إذا الخصم أفلس ورصيده 0 وأنت باقي معاك رصيد! تاخذ فرصة السؤال الأخيرة (مهما كان رصيدك) .. إذا جاوبت بدون خيارات تاخذ 30 كأس، ومع خيارات تاخذ 20 كأس، وبعدها تنتهي اللعبة ويفوز الأكثر كؤوس.",
            "عدد الأسئلة الأساسي 15 سؤال، كل سؤال تزايدون عليه وما تجاوبونه صح ! يروح عليكم."
          ],
          note: "ملاحظة: الحكم هو المتحكم وشاشة القائدين فقط ترسل المزايدة"
        }
      ],
      tips: "خلك ديلر محترف واعرف متى ترفع المزايدة ومتى تطلع منها، واستخدم أفياش بيع السؤال والكمين بالوقت المناسب."
    },
    {
      id: "castle-war",
      title: "حرب القلاع",
      icon: Swords,
      color: "rose",
      players: "فريقان (مع حكم)",
      duration: "حتى انتهاء اللعبة",
      difficulty: "سهل إلى صعب",
      description: "قم بحماية جنودك واخفاءهم في غرف القلعة واستخدم الجاسوس لتدمير الغرفة المكتضة بالجنود وفخخ غرفة لاصطياد الجنود أو تدميرهم عبر مجموعة من التحديات.",
      sections: [
        {
          title: "⚔️ التجهيز",
          rules: [
            "كل فريق يستلم قلعة فيها 15 نافذة وعنده 120 جندي.",
            "يوزع الفريق جنوده على النوافذ بسرية تامة من جوالهم.",
            "الأهم: لازم تختار نافذة تخبي فيها (القائد 👑) ونافذة ثانية تحط فيها (الفخ 🪤) وغرفة القائد والفخ ما تحط فيها جنود وتقدر توزع الجنود من زر توزيع عشوائي."
          ]
        },
        {
          title: "🔥 وقت المعركة",
          rules: [
            "تطلع لكم تحديات وأسئلة، الفريق اللي يفوز بالتحدي يصير له الدور في الهجوم! تختار نافذة من قلعة الخصم وتقصفها وإذا جاوبت خطأ الخصم بيختار غرفة من قلعتك ويقصفها 💣.",
            "إصابة عادية: إذا ضربت نافذة فيها جنود، تخسف فيهم وينقص عدد الجنود المندسين بالغرفة.",
            "صيدة القائد 👑: لو طحت على القائد، هذي ضربة قاضية! الخصم يودع 30 جندي يطيرون من جيشه!",
            "طيحة الفخ 🪤: لو ضربت الفخ.. أكلتها! الخصم بيقرر إما يصفي 20 جندي من جيشك، أو يأسرهم ويضمهم لجيشه."
          ]
        },
        {
          title: "👁️ الجاسوس الذيب",
          rules: [
            "كل فريق يقدر يستخدم الجاسوس مرة وحدة طول اللعبة.",
            "الجاسوس يروح يجيب لك أكثر نافذة مليانة جنود ويقصفها لك جاهزة مجهزة."
          ]
        },
        {
          title: "🏆 الفايز",
          rules: [
            "اللي يطير جنود الخصم ويصفر عدادهم أول هو اللي يرفع الراية! 🏴‍☠️"
          ]
        }
      ],
      tips: "استخدم الجاسوس بعناية ولا تستعجل الإجابة واستخدم خيارات الفخ بذكاء."
    },
    {
      id: "world-domination",
      title: "السيطرة على العالم",
      icon: Globe,
      color: "blue",
      players: "فريقان (مع حكم)",
      duration: "حتى انتهاء الدول",
      difficulty: "متوسط إلى صعب",
      description: "لعبة طحن واستراتيجية ! تعتمد على ذكاءك باستخدام البطاقات التكتيكية. اللي يجمع نقاط أكثر! يسيطر على العالم 🌍",
      sections: [
        {
          title: "تجهيز اللعبة",
          rules: [
            "الحكم يضبط أسماء الفرق ويختار الدول اللي بتتنافسون عليها + دولتين خاصة بالحكم فيها تحديات ما تقدر تختارها إلا بعد السيطرة على كل الدول \"دول الحكم اختيارية\".",
            "العواصم: الحكم بيسألك عن العاصمة الخاصة فيكم ، اختر بعناية لأن الخصم لو غزا عاصمتك بتكون الأسئلة عن الدولة اللي اخترتها.",
            "نقاط الدول: إذا تتنافسون على 20 دولة (6 دول 2000 - 14 دولة 1000) وإذا 30 دولة (8 دول 2000 - 22 دولة 1000) وإذا 40 دولة (10 دول 2000 - 30 دولة 1000) ودول الحكم (2000 نقطة).",
            "قل للحكم يعطيك الباركود أو رقم الكود أو يرسلك الرابط على الواتس علشان تدخل وتتابع مجريات اللعب \"الشاشة غير تفاعلية لازم تقول للحكم الإجابة وهو يضغط من عنده\"."
          ]
        },
        {
          title: "طريقة اللعب",
          rules: [
            "الأسئلة عن الدولة اللي تختارها ، كل سؤال له ثلاث خيارات ، تجاوب خطأ تصير فرصة للفريق الثاني يجاوب ، تجاوب صح مباشرة تحسب لك النقاط.",
            <div key="cards-rule" className="flex flex-col gap-3">
              <span>عندك (6 بطاقات تكتيكية) استخدمها بذكاء:</span>
              <div className="flex flex-col gap-2 pl-2 lg:pl-0 pr-2 lg:pr-4">
                <span className="flex items-start gap-1.5"><TankIcon size={18} className="text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" /> <span>احتلال عددها 3 (يمديك تحتل دولة مباشرة بشرط ما تكون محمية)</span></span>
                <span className="flex items-start gap-1.5"><Rocket size={18} className="text-orange-500 shrink-0 mt-0.5" /> <span>قصف عددها 3 (تكسر حماية دولة الخصم علشان تقدر تحتلها أو تخصم نصف نقاط الدولة اللي ما عليها حماية) ، ما تقدر تستخدمها على العاصمة أو الدولة اللي كانت لك واحتلها الخصم.</span></span>
                <span className="flex items-start gap-1.5"><Shield size={18} className="text-emerald-500 shrink-0 mt-0.5" /> <span>حماية عددها 3 (تحمي أي دولة لك والأفضل تحمي الدول اللي نقاطها 2000)</span></span>
                <span className="flex items-start gap-1.5"><Crosshair size={18} className="text-indigo-500 shrink-0 mt-0.5" /> <span>تجسس عددها 2 (البطاقة تختار لك دولة نقاطها 2000 ولازم تجاوب على نفس الدول).</span></span>
                <span className="flex items-start gap-1.5"><Crown size={18} className="text-amber-500 shrink-0 mt-0.5" /> <span>غزو عددها 2 (تغزو فقط عاصمة الخصم بشرط نقاطك أكثر من 5000 ونقاط الخصم أكثر من 10000) ، تفوز ! تاخذ ثلث نقاطه ويخصم منه ربع نقاطه.</span></span>
                <span className="flex items-start gap-1.5"><Radiation size={18} className="text-red-500 shrink-0 mt-0.5" /> <span>نووي عددها 1 (هنا الطحن، ما تستخدم إلا مرة وحدة طول اللعبة بشرط تكون نقاط الخصم أكثر من نصف نقاطك ، يعني نقاطك 6000 لازم نقاطه 12000 أو أكثر) ما تقدر تستخدمها إذا نقاطك أعلى.</span></span>
              </div>
            </div>,
            "تنتهي اللعبة بالسيطرة على جميع الدول ، الفريق الفائز اللي يحصل على أعلى نقاط."
          ]
        }
      ],
      tips: "لا تستعجل وتلعب النووي أو الغزو في البداية.. خلها للوقت الحرج عشان تقلب الطاولة على الخصم وتصدمهم! واستخدم التجسس عشان تورطهم في الدول الدسمة."
    },
    {
      id: "challenges",
      title: "تحديات الحكم والفريق",
      icon: Sparkles,
      color: "purple",
      players: "الفريقان (بإشراف الحكم)",
      duration: "من دقيقة إلى دقيقتين",
      difficulty: "مختلف (حسب التحدي)",
      description: "مجموعة من التحديات الجانبية التي يطرحها الحكم لإضافة المتعة والتشويق واختبار مهارات وسرعة بديهة الفرق.",
      rules: [
        "تحدي الأغاني : يختار الحكم حرف ويقوم الفريق الذي عليه الدور ببدء أغنية بنفس الحرف المختار ، ثم يبدأ الفريق الثاني بغناء أغنية بنفس آخر حرف لأغنية الفريق الاول ، الفريق الذي يتأخر عن خمس ثواني بتقدير الحكم هو الخسران.",
        "نطق الكلمات المتشابهة: يقوم الحكم باختيار مقطع من اليوتيوب على سبيل المثال ' لحم فحم شحم ' والمطلوب من اللاعب نطق الكلمات بالشكل الصحيح بالتزامن مع الموسيقى الموجودة في المقطع.",
        "استخرج كلمات من حروف (حسب الكلمة الموجودة في التحدي): كل فريق لمدة دقيقة يقوم باستخراج أكبر قدر ممكن من كلمات بشرط أن تكون من حروف الكلمة التي في التحدي ، مثال (استخرج كلمات من كلمة بحر : فيستخرج الفريق ' بر - حر - رب - حب ..وهكذا').",
        "حار بارد: يتم اختيار عضو من الفريق الذي عليه التحدي ويخرج خارج المكان الموجود فيه ، فيتفق الفريق الثاني على حركة معينة مثلاً ' تحريك الريموت من مكان إلى مكان' ، فيستدعونه ويبدأ اللعبة ، المطلوب من اللاعب المشي في الغرفة أو المكان والفريق الثاني يقول بارد بارد بارد بارد حتى يقترب من الريموت فيقولون حار لمرة واحدة حتى يفهم أنه يجب أن يمسك الريموت ، فيكملون بارد بارد حتى يضعه بالمكان المطلوب وهكذا ، مدة التحدي من دقيقة ونصف إلى دقيقتين بتقدير الحكم.",
        "داخل برى: تعتمد هذه اللعبة على المكان الموجودين فيه ، المطلوب دائرة كبيرة ويقف الفريق كامل أو عدد من الفريقين خارج الدائرة ، فيقول الحكم داخل ' هنا يجب أن يقفز الجميع داخل الدائرة ، ويقول برى ' فيجب أن يخرجوا من الدائرة بسرعة ' ، من يعكس الأمر يخرج ، من يتأخر يخرج ، يفوز آخر واحد يبقى.",
        "ولا كلمة: يرشح الفريق الذي عليه التحدي لاعب ، فيقوم الحكم بتحديد مسلسل أو أغنية أو فيلم مسرحية ويخبر اللاعب دون علم فريقه ويخبره إسم الفئة وبلد الإنتاج للمسلسل ، المطلوب من اللاعب لمدة دقيقتين شرح المطلوب بدون كلام والفريق يخمن ما هي الإجابة.",
        "الحرف الممنوع: يختار الفريق الذي عليه التحدي لاعب من طرفهم ، يقوم الحكم باختيار حرف ممنوع على اللاعب نطق هذا الحرف في إجاباته ، يبدأ التحدي والفريق الثاني يلقي أسئلة في محاولة منه لإيقاع اللاعب في الفخ ليجاوب وينطق الحرف المختار. ' ممنوع يتأخر عن ثلاث ثواني - ممنوع تكرار الإجابات ، ممنوع تكرار السؤال من الفريق الثاني ، ممنوع الأجوبة الغير منطقية ، ممنوع الإجابة بأي لغة غير العربية.",
        "اعكس اللهجة : مطلوب من اللاعب الذي عليه التحدي من أحد الفرق تنفيذ التحدي بالحديث بعكس اللهجة المطلوبة منه ، مثلاً ' اللاعب الاول يتحدث بالمصري ! يجيب باللهجة السورية ، إذا أجاب اللاعب الأول بالسورية مطلوب يجيب بالمصرية وهكذا ' لمدة دقيقة ، يخسر إذا تحدث غير اللهجة او تأخر.",
        "مثل مشهد من مسلسل او فيلم: مطلوب على اللاعب تمثيل مشهد للمسلسل الموجود بالتحدي المطلوب، ليس مطلوب الدقة بالمشهد، المطلوب التحدث بلهجة المسلسل والكلام عن أحداث المسلسل حتى لو قام بالتأليف."
      ],
      tips: "تعتمد التحديات على خفة الدم وسرعة البديهة، استمتع بالتجربة ولا تتردد في ابتكار أساليب جديدة لإرباك الخصم!"
    }
  ];

  const activeGameData = games.find(g => g.id === activeGame) || games[0];
  const ActiveIcon = activeGameData.icon;

  const colorClasses = {
    amber: {
      bg: "bg-amber-50 dark:bg-amber-900/20",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-800",
      gradient: "from-amber-500 to-orange-600",
      shadow: "shadow-amber-500/20"
    },
    rose: {
      bg: "bg-rose-50 dark:bg-rose-900/20",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-200 dark:border-rose-800",
      gradient: "from-rose-500 to-pink-600",
      shadow: "shadow-rose-500/20"
    },
    blue: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800",
      gradient: "from-blue-500 to-indigo-600",
      shadow: "shadow-blue-500/20"
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-900/20",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800",
      gradient: "from-purple-500 to-fuchsia-600",
      shadow: "shadow-purple-500/20"
    }
  };

  const activeColors = colorClasses[activeGameData.color as keyof typeof colorClasses];

  return (
    <main className={`min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white ${tajawal.className} flex flex-col`} dir="rtl">
      <TopNav />

      <div className="flex-grow max-w-7xl mx-auto w-full px-4 py-12 mt-24 md:mt-32">
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">دليل الألعاب <span className="text-blue-600 dark:text-blue-400">الاحترافي</span></h1>
          <p className="text-slate-600 dark:text-slate-400 font-bold max-w-2xl mx-auto">تعرف على قوانين الألعاب، استراتيجيات الفوز، وكيف تتفوق على أصدقائك في منصتنا.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* القائمة الجانبية للألعاب */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border-2 border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-black/20 flex flex-col gap-3 sticky top-28">
              {games.map((game) => {
                const Icon = game.icon;
                const isActive = activeGame === game.id;
                const c = colorClasses[game.color as keyof typeof colorClasses];

                return (
                  <button
                    key={game.id}
                    onClick={() => setActiveGame(game.id)}
                    className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-black text-right ${isActive
                      ? `${c.bg} ${c.text} shadow-sm border ${c.border}`
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent"
                      }`}
                  >
                    <div className={`p-2 rounded-xl ${isActive ? 'bg-white dark:bg-slate-950' : 'bg-slate-100 dark:bg-slate-800'}`}>
                      <Icon size={24} className={isActive ? c.text : "text-slate-500"} />
                    </div>
                    <span className="text-lg">{game.title}</span>
                    {isActive && <ChevronLeft size={20} className="mr-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* مساحة العرض الرئيسية للعبة */}
          <div className="flex-grow">
            <div className={`bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-800 shadow-2xl ${activeColors.shadow} overflow-hidden animate-fade-in`}>

              {/* ترويسة اللعبة */}
              <div className={`relative p-8 md:p-12 overflow-hidden bg-gradient-to-br ${activeColors.gradient}`}>
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-white">
                  <div className="p-6 bg-white/20 backdrop-blur-md rounded-[2rem] shadow-xl border border-white/30">
                    <ActiveIcon size={64} className="drop-shadow-lg" />
                  </div>
                  <div className="text-center md:text-right">
                    <h2 className="text-4xl font-black mb-3 drop-shadow-md">{activeGameData.title}</h2>
                    <p className="text-white/90 font-bold text-lg leading-relaxed max-w-xl">
                      {activeGameData.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 md:p-12">
                {/* الإحصائيات السريعة */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                    <Users className="text-blue-500" />
                    <div>
                      <div className="text-xs text-slate-500 font-bold">عدد اللاعبين</div>
                      <div className="font-black text-slate-900 dark:text-white">{activeGameData.players}</div>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                    <Clock className="text-emerald-500" />
                    <div>
                      <div className="text-xs text-slate-500 font-bold">مدة الجولة</div>
                      <div className="font-black text-slate-900 dark:text-white">{activeGameData.duration}</div>
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                    <Target className="text-rose-500" />
                    <div>
                      <div className="text-xs text-slate-500 font-bold">مستوى الصعوبة</div>
                      <div className="font-black text-slate-900 dark:text-white">{activeGameData.difficulty}</div>
                    </div>
                  </div>
                </div>

                {/* قوانين اللعبة */}
                <div className="mb-10">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Trophy className={activeColors.text} />
                    كيف تلعب وتفوز؟
                  </h3>
                  
                  {activeGameData.sections ? (
                    <div className="space-y-8">
                      {activeGameData.sections.map((section: any, sIdx: number) => (
                        <div key={sIdx}>
                          <h4 className={`text-xl font-black mb-4 flex items-center gap-2 ${activeColors.text}`}>
                            <div className={`w-2 h-6 rounded-full bg-gradient-to-b ${activeColors.gradient}`}></div>
                            {section.title}
                          </h4>
                          <div className="space-y-4">
                            {section.rules.map((rule: any, idx: number) => (
                              <div key={idx} className="flex gap-4 items-start bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-white bg-gradient-to-br ${activeColors.gradient}`}>
                                  {idx + 1}
                                </div>
                                <div className="text-slate-700 dark:text-slate-300 font-bold mt-1">{rule}</div>
                              </div>
                            ))}
                          </div>
                          {section.note && (
                            <div className="mt-4 text-red-500 font-black flex items-start gap-2">
                              <span className="mt-0.5">*</span>
                              <span>{section.note}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeGameData.rules?.map((rule, idx) => (
                        <div key={idx} className="flex gap-4 items-start bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-white bg-gradient-to-br ${activeColors.gradient}`}>
                            {idx + 1}
                          </div>
                          <div className="text-slate-700 dark:text-slate-300 font-bold mt-1">{rule}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* نصيحة المحترفين */}
                <div className={`p-6 rounded-2xl border ${activeColors.border} ${activeColors.bg} flex gap-4 items-start`}>
                  <Sparkles size={28} className={`shrink-0 ${activeColors.text} mt-1`} />
                  <div>
                    <h4 className={`text-lg font-black mb-2 ${activeColors.text}`}>نصيحة المحترفين</h4>
                    <p className="text-slate-800 dark:text-slate-200 font-bold leading-relaxed">{activeGameData.tips}</p>
                  </div>
                </div>

                {activeGameData.id !== "challenges" && (
                  <div className="mt-8 text-center">
                    <Link href={`/games/${activeGameData.id}`} className={`inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-white bg-gradient-to-r ${activeColors.gradient} hover:-translate-y-1 transition-transform shadow-lg ${activeColors.shadow}`}>
                      العب الآن
                      <ChevronLeft size={20} />
                    </Link>
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
