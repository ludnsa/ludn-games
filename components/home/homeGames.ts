import { QUIZ_GAME } from "@/constants/quiz-grid";
import { MAFIA_CONFIG, MAFIA_GAME } from "@/constants/mafia";
import { MADAQESH_GAME } from "@/constants/madaqesh";
import { LETTERS_HIVE_GAME } from "@/constants/letters-hive";
import type { GameArtKind } from "./GameArt";

// ألعاب الرئيسية: مصدر واحد لقائمة الألعاب ومروحة الواجهة
export const CATEGORIES = ["الكل", "أدوار سرية", "أسئلة", "استراتيجية", "لعبة ورق"] as const;
export type Category = Exclude<(typeof CATEGORIES)[number], "الكل">;

export interface HomeGame {
  id: string;
  title: string;
  path: string;
  description: string;
  /** سطر واحد تحت الغلاف */
  line: string;
  category: Category;
  /** معلومات سريعة تطلع بورقة اللعبة */
  meta: string[];
  /**
   * رسمة اللعبة، أو غلاف مؤقت مرسوم بالكود لين تجهز رسمتها.
   * full: الرسمة مقاسها من البطاقة (4:5) فتطلع كاملة بدون قص وتكبير.
   */
  cover: { img: string; full?: boolean } | { art: GameArtKind };
  /** لون اللعبة بالمروحة: التوهج ورا البطاقة وتاق التصنيف تحتها */
  color: string;
  /** مجانية دايماً (ما تحتاج اشتراك) — يطلع عليها تاق */
  free?: boolean;
}

export const HOME_GAMES: HomeGame[] = [
  {
    id: MAFIA_GAME.id,
    title: MAFIA_GAME.title,
    path: MAFIA_GAME.path,
    description: MAFIA_GAME.description,
    line: "مين المافيا بينكم؟ ليل ونهار، وكل واحد على جواله.",
    category: "أدوار سرية",
    meta: [`من ${MAFIA_CONFIG.MIN_PLAYERS} إلى ${MAFIA_CONFIG.MAX_PLAYERS} لاعب`, "كل واحد بجواله", "فئة جديدة: الشيخ"],
    cover: { img: "/games/mafia/mafia-cover.webp", full: true },
    color: "#e24646",
  },
  {
    id: QUIZ_GAME.id,
    title: QUIZ_GAME.title,
    path: QUIZ_GAME.path,
    description: QUIZ_GAME.description,
    line: "لوحة فئات، وفريقين يتنافسون عليها.",
    category: "أسئلة",
    meta: ["فريقين", "أسئلة بـ 200 و400 و600"],
    cover: { img: "/games/quiz-grid/quiz-cover.webp", full: true },
    color: "#c060ff",
  },
  {
    id: LETTERS_HIVE_GAME.id,
    title: LETTERS_HIVE_GAME.title,
    path: LETTERS_HIVE_GAME.path,
    description: LETTERS_HIVE_GAME.description,
    line: "لوّن الحروف، وأول فريق يوصّل خطه يفوز.",
    category: "أسئلة",
    meta: ["مقدم وفريقين", "شاشة عرض"],
    cover: { img: "/games/letters-hive/hive-cover.webp", full: true },
    color: "#2fbf71",
  },
  {
    id: "auction",
    title: "المزاد",
    path: "/games/auction",
    description: "لعبة مزادية وتكتيكية لتحديد الفائز بالمزايدة على السؤال الصحيح.",
    line: "زايد على السؤال اللي تعرف جوابه.",
    category: "أسئلة",
    meta: ["فرق", "مزايدة"],
    cover: { img: "/games/auction/auction-cover.webp", full: true },
    color: "#f0c24e",
  },
  {
    id: "castle-war",
    title: "حرب القلاع",
    path: "/games/castle-war",
    description: "لعبة استراتيجية تعتمد على الهجوم والدفاع، دمر قلاع خصمك لتنتصر.",
    line: "هاجم ودافع، ودمّر قلاع خصمك.",
    category: "استراتيجية",
    meta: ["جوالات اللاعبين", "شاشة عرض"],
    cover: { img: "/games/castle-war/castle-war-cover.webp", full: true },
    color: "#e2b84a",
  },
  {
    id: "world-domination",
    title: "السيطرة على العالم",
    path: "/games/world-domination",
    description: "لعبة استراتيجية وتكتيكية لفرض نفوذك والسيطرة على القارات وتوسيع إمبراطوريتك.",
    line: "وسّع نفوذك وسيطر على القارات.",
    category: "استراتيجية",
    meta: ["فرق", "الجمهور يشارك"],
    cover: { img: "/games/world-domination/world-domination-cover.webp", full: true },
    color: "#ff7a3a",
  },
  {
    id: MADAQESH_GAME.id,
    title: MADAQESH_GAME.title,
    path: MADAQESH_GAME.path,
    description: MADAQESH_GAME.description,
    line: "سوم وتوزيع ومداقشة، والأرصدة تنحسب لحالها.",
    category: "لعبة ورق",
    meta: ["على جوالات الكل"],
    cover: { img: "/games/madaqesh/madaqesh-cover.webp", full: true },
    // ذهبي ثيم مداقش (الأحمر قريب من لون المافيا اللي جنبها بالمروحة)
    color: "#d6a531",
  },
];

/** ترتيب المروحة بالرئيسية: نفس ترتيب النموذج المعتمد (fan-preview) */
const FAN_ORDER = [
  MAFIA_GAME.id,
  "castle-war",
  "world-domination",
  "auction",
  QUIZ_GAME.id,
  LETTERS_HIVE_GAME.id,
  MADAQESH_GAME.id,
];

const fanRank = (id: string) => {
  const i = FAN_ORDER.indexOf(id);
  return i < 0 ? FAN_ORDER.length : i;
};

/** ألعاب المروحة: كل ألعاب المنصة اللي لها غلاف، بترتيب النموذج، وأي لعبة جديدة تنضاف بآخرها */
export const FAN_GAMES: (HomeGame & { img: string })[] = HOME_GAMES.flatMap((g) =>
  "img" in g.cover ? [{ ...g, img: g.cover.img }] : []
).sort((a, b) => fanRank(a.id) - fanRank(b.id));
