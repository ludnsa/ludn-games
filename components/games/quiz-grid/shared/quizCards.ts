import { QUIZ_CONFIG } from "@/constants/quiz-grid";
import type { QuizLifelineKey } from "@/types";

/**
 * صور كروت وسائل المساعدة في تحدي الفئات — شكل بس.
 * الاسم وقواعد التفعيل (متى ومين) تبقى من QUIZ_LIFELINES في constants، وهنا الصور والكشف وسطر الشرح.
 */
const BASE = "/games/quiz-grid/cards/";

export interface QuizCardArt {
  /** عنوان شاشة الكشف */
  title: string;
  /** أيقونة مدورة (512×512) */
  icon: string;
  /** صورة الكرت كامل (512×686) */
  card: string;
  /** لون التوهج في الكشف */
  glow: string;
  /** سطر شرح قصير يطلع تحت الوسيلة، يبين على الجوال والآيباد بدون تمرير الماوس */
  short: string;
}

export const QUIZ_CARDS: Record<QuizLifelineKey, QuizCardArt> = {
  call: {
    title: "اتصال بصديق!",
    icon: `${BASE}call_icon.webp`,
    card: `${BASE}call.webp`,
    glow: "#22d3ee",
    short: `أثناء السؤال: +${QUIZ_CONFIG.CALL_FRIEND_BONUS} ثانية للتفكير`,
  },
  pit: {
    title: "الحفرة!",
    icon: `${BASE}pit_icon.webp`,
    card: `${BASE}pit.webp`,
    glow: "#e879f9",
    short: "قبل السؤال: الصح يكسبكم النقاط ويخصمها من الخصم",
  },
  rest: {
    title: "استريح!",
    icon: `${BASE}rest_icon.webp`,
    card: `${BASE}rest.webp`,
    glow: "#fbbf24",
    short: "أثناء سؤال الخصم: تمنعون لاعباً منهم من الإجابة",
  },
  double: {
    title: "مضاعفة!",
    icon: `${BASE}double_icon.webp`,
    card: `${BASE}double.webp`,
    glow: "#facc15",
    short: "قبل السؤال: الصح يضاعف النقاط",
  },
  extraTurn: {
    title: "دور إضافي!",
    icon: `${BASE}extraturn_icon.webp`,
    card: `${BASE}extraturn.webp`,
    glow: "#34d399",
    short: "قبل السؤال: الصح يُبقي الدور عندكم",
  },
  audience: {
    title: "استشارة الجمهور!",
    icon: `${BASE}audience_icon.webp`,
    card: `${BASE}audience.webp`,
    glow: "#f472b6",
    short: "أثناء السؤال: استشيروا الحضور",
  },
};
