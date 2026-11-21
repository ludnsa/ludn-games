/**
 * شكل تعليمات كل لعبة — مصدر واحد لصفحة /guides ولنافذة "طريقة اللعب" داخل الألعاب.
 * أي قسم فاضي (أو مو موجود) ما يطلع.
 * النصوص تقبل **غامق** (بين نجمتين).
 */

/** سطر، وممكن تحته نقاط (ordered: مرقّمة) */
export type GuidePoint = string | { text: string; points: GuidePoint[]; ordered?: boolean };

/** بطاقة أو وسيلة أو دور: اسم + أيقونة + شرح */
export interface GuideItem {
  /** معرّف اختياري (مثلاً دور المافيا) عشان نفلتر حسب إعداد الغرفة */
  id?: string;
  name: string;
  /** إيموجي، أو مسار صورة يبدأ بـ / */
  icon?: string;
  /** اللي بين قوسين جنب الاسم، مثل "3 لكل فريق" أو "إضافي" */
  tag?: string;
  body?: string;
  points?: GuidePoint[];
  /** النقاط مرقّمة */
  ordered?: boolean;
  /** تسلسل قصير (مثل ترتيب الورق) */
  sequence?: readonly string[];
}

/** خطوة لعب: عنوان قصير + شرح، وممكن تحته نقاط */
export interface GuideStep {
  title?: string;
  body?: string;
  points?: GuidePoint[];
}

export interface GuideFaq {
  q: string;
  a: string;
}

/** المربعات الثلاث فوق */
export interface GuideMeta {
  players: string;
  duration: string;
  difficulty: string;
}

/** قسم خاص بلعبة وحدة (مثل جدول تحديات حرب القلاع) */
export interface GuideExtraSection {
  title: string;
  intro?: string;
  table?: { head: readonly string[]; rows: readonly (readonly string[])[] };
  /** مكانه: بعد خطوات اللعب (الافتراضي: بعد البطاقات) */
  after?: "steps" | "items";
}

export interface GameGuide {
  /** نفس معرّف اللعبة (/games/<id>) */
  id: string;
  title: string;
  /** سطر واحد */
  tagline?: string;
  /** عدد اللاعبين، ومدة الجولة، ومستوى الصعوبة */
  meta?: GuideMeta;
  /** "باختصار" (ثلاث أسطر) */
  quick?: string[];
  /** وش تحتاجون: اللاعبين والأجهزة */
  needs?: GuidePoint[];
  /** التجهيز */
  setup?: GuidePoint[];
  /** التجهيز بأرقام بدل النقاط */
  setupOrdered?: boolean;
  /** خطوات اللعب بالترتيب */
  steps?: GuideStep[];
  /** ملاحظة تحت الخطوات */
  stepsNote?: string;
  /** كيف تفوزون */
  win?: string[];
  /** عنوان قسم البطاقات/الوسائل/الأدوار (الافتراضي: "البطاقات والوسائل") */
  itemsTitle?: string;
  /** ملاحظة تحت عنوان البطاقات */
  itemsIntro?: string;
  items?: GuideItem[];
  /** أقسام خاصة باللعبة */
  extras?: GuideExtraSection[];
  /** ملاحظات للحكم أو المنشئ */
  host?: GuidePoint[];
  /** أسئلة شائعة */
  faq?: GuideFaq[];
  /** نصيحة المحترفين (آخر الدليل) */
  tip?: string;
}
