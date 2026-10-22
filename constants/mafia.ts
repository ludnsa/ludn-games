import type { MafiaNightStep, MafiaOptionalRole, MafiaRole, MafiaTeam } from "@/types";

/**
 * المصدر الوحيد لهوية لعبة "المافيا".
 * ملاحظة: تغيير `id` يعني أن أي سجلات قديمة مربوطة بها لن تُطابق،
 * وتغيير `slug` يتطلب إعادة تسمية مجلد app/games/mafia.
 */
export const MAFIA_GAME = {
  id: "mafia",
  slug: "mafia",
  title: "المافيا",
  description: "مين المافيا بينكم؟ ليل ونهار، تحقيق وحماية واغتيالات، وكل واحد على جواله.",
  path: "/games/mafia",
  /** مسار انضمام اللاعبين — لاحظ أن /join معفى من تسجيل الدخول في middleware.ts */
  joinPath: "/games/mafia/join",
  color: "red",
} as const;

export const MAFIA_CONFIG = {
  /** اللعبة مجانية لفترة محدودة — ما نتحقق من الرصيد ولا نخصم جلسات */
  IS_FREE: true,

  MIN_PLAYERS: 7,
  MAX_PLAYERS: 20,
  MIN_MAFIA: 2,
  MIN_CITIZENS: 3,

  /** مدد المراحل بالثواني */
  ROLE_REVEAL_SECONDS: 4,
  /** أدوار الليل ما لها مؤقت: الدور يمشي لما كل الأحياء يختارون (أو المنشئ يتخطى) */
  NIGHT_DONE_SECONDS: 5,
  /** الصباح ما له وقت: النتائج تظل لين المنشئ يختار وقت النقاش ويضغط "ابدأ النقاش" */
  /** وقت النقاش الافتراضي، والخيارات اللي يقدر المنشئ يختار منها (0 = مفتوح، ينتهي بزر المنشئ) */
  DISCUSSION_SECONDS: 120,
  DISCUSSION_OPTIONS: [120, 180, 300, 0] as readonly number[],
  VOTING_SECONDS: 15,
  VOTE_RESULT_SECONDS: 10,

  /** سؤال التمويه لباقي اللاعبين أثناء أدوار الليل */
  FUN_QUESTION: "من تتوقع مافيا؟",
  FUN_QUESTION_NOTE: "اختيارك هنا غير معتمد — بس عشان تبعد الشبهات عنك",

  DEAD_MESSAGE: "يا حرام طلعت من اللعبة يا زلابة",

  ROOM_CODE_PREFIX: "M",
  ROOM_CODE_LENGTH: 5,
} as const;

export interface MafiaRoleDef {
  key: MafiaRole;
  label: string;
  team: MafiaTeam;
  /** وصف قصير يظهر للاعب عند كشف دوره */
  description: string;
  /** لون البطاقة (Tailwind) */
  accent: string;
  /** اسم ملف الصورة في public/games/mafia/cards و icons */
  art: string;
  /** لون التوهج حول البطاقة (نفس لون عنوانها) */
  glow: string;
}

export const MAFIA_ROLES: Record<MafiaRole, MafiaRoleDef> = {
  mafia: {
    key: "mafia",
    label: "مافيا",
    team: "mafia",
    description: "كل ليلة تتفقون على لاعب وتذبحونه. هدفكم تخلصون على المواطنين بدون ما ينكشف أمركم.",
    accent: "from-rose-600 to-red-800",
    art: "mafia",
    glow: "#dc2626",
  },
  detective: {
    key: "detective",
    label: "المحقق",
    team: "town",
    description: "كل ليلة تحقق مع لاعب ويجيك الجواب فوراً: مافيا ولا لا.",
    accent: "from-sky-500 to-blue-700",
    art: "detective",
    glow: "#e0a83a",
  },
  doctor: {
    key: "doctor",
    label: "الطبيب",
    team: "town",
    description: "كل ليلة تحمي لاعب من الذبح. تقدر تحمي نفسك، بس ما تحمي نفس الشخص ليلتين ورا بعض.",
    accent: "from-emerald-500 to-green-700",
    art: "doctor",
    glow: "#2fb3a6",
  },
  citizen: {
    key: "citizen",
    label: "مواطن",
    team: "town",
    description: "ما عندك قدرة بالليل، بس صوتك بالنهار هو اللي يطلّع المافيا. ركّز ولاحظ!",
    accent: "from-slate-500 to-slate-700",
    art: "citizen",
    glow: "#94a3b8",
  },
  magician: {
    key: "magician",
    label: "الساحر",
    team: "town",
    description: "إذا مات المحقق أو الطبيب أو الجندي، تقدر تاخذ مكانه (مرة وحدة طول اللعبة). وأنت من صف المواطنين.",
    accent: "from-purple-500 to-fuchsia-700",
    art: "wizard",
    glow: "#a855f7",
  },
  journalist: {
    key: "journalist",
    label: "الصحفي",
    team: "town",
    description: "مرة وحدة طول اللعبة تكشف فئة لاعب للكل مع نتائج الصباح.",
    accent: "from-amber-500 to-orange-600",
    art: "journalist",
    glow: "#f59e0b",
  },
  soldier: {
    key: "soldier",
    label: "الجندي",
    team: "town",
    description: "عندك درع مرة وحدة: أول مرة يذبحونك ما تموت. الدرع يشتغل تلقائي.",
    accent: "from-lime-600 to-green-800",
    art: "soldier",
    glow: "#a3a85a",
  },
  suicide: {
    key: "suicide",
    label: "المنتقم",
    team: "town",
    description: "كل ليلة تختار لاعب. إذا المافيا ذبحوك، تنفجر وتاخذ آخر واحد اخترته معك. ما تقدر تختار نفس الشخص ليلتين ورا بعض.",
    accent: "from-orange-500 to-red-700",
    art: "avenger",
    glow: "#f97316",
  },
  silencer: {
    key: "silencer",
    label: "المسكت",
    team: "town",
    description: "كل ليلة تختار لاعب يصير ممنوع من الكلام اليوم الجاي — وإذا تكلم ينقتل. ما تقدر تختار نفس الشخص ليلتين ورا بعض.",
    accent: "from-cyan-600 to-teal-800",
    art: "silencer",
    glow: "#7dd3fc",
  },
};

/** صور الأدوار: البطاقة كاملة (فيها اسم الدور) والأيقونة الدائرية بدون كلام */
export const mafiaCardSrc = (role: MafiaRole) => `/games/mafia/cards/${MAFIA_ROLES[role].art}.webp`;
export const mafiaIconSrc = (role: MafiaRole) => `/games/mafia/icons/${MAFIA_ROLES[role].art}.webp`;

/** خلفيات اللعبة: الليل (البداية وأدوار الليل) والنهار (الصباح والنقاش والتصويت) */
export const MAFIA_BACKGROUNDS = {
  night: "/games/mafia/night_background.webp",
  day: "/games/mafia/day_background.webp",
} as const;

/** الفئات الاختيارية بالترتيب اللي تظهر فيه في شاشة الإعداد */
export const MAFIA_OPTIONAL_ROLES: readonly MafiaOptionalRole[] = [
  "magician",
  "journalist",
  "soldier",
  "suicide",
  "silencer",
] as const;

/** ترتيب أدوار الليل. الجندي ما له دور بالليل لأن درعه تلقائي. */
export const MAFIA_NIGHT_ORDER: readonly MafiaNightStep[] = [
  "doctor",
  "mafia",
  "suicide",
  "detective",
  "journalist",
  "magician",
  "silencer",
] as const;

export interface MafiaNightStepDef {
  /** يظهر للكل أثناء الدور */
  headline: string;
  /** يظهر لصاحب الدور فوق قائمة اللاعبين */
  prompt: string;
  /** الرسالة اللي تطلع للكل بعد انتهاء الدور */
  doneText: string;
}

export const MAFIA_NIGHT_STEPS: Record<MafiaNightStep, MafiaNightStepDef> = {
  doctor: {
    headline: "الطبيب يختار مين يحمي...",
    prompt: "مين تحمي الليلة؟",
    doneText: "تمت الحماية",
  },
  mafia: {
    headline: "المافيا يختارون ضحيتهم...",
    prompt: "مين تذبحون الليلة؟",
    doneText: "تم الاغتيال",
  },
  detective: {
    headline: "المحقق يحقق مع أحد...",
    prompt: "تشك بمين؟ اختار واحد تحقق معه",
    doneText: "تم التحقيق",
  },
  magician: {
    headline: "الساحر يجهّز سحره...",
    prompt: "وش تبي تصير؟ (مرة وحدة طول اللعبة)",
    doneText: "الساحر خلّص سحره",
  },
  journalist: {
    headline: "الصحفي يجهّز خبر الصباح...",
    prompt: "مين تكشف فئته للكل؟ (مرة وحدة طول اللعبة)",
    doneText: "الصحفي جهّز خبره",
  },
  suicide: {
    headline: "المنتقم يختار هدفه...",
    prompt: "مين تاخذ معك إذا ذبحوك؟",
    doneText: "المنتقم اختار هدفه",
  },
  silencer: {
    headline: "المسكت يختار مين يسكّت...",
    prompt: "مين يكون ممنوع من الكلام بكرة؟",
    doneText: "المسكت اختار",
  },
};

/** أسماء اللاعبين الوهميين لوضع التجربة (localhost فقط) */
export const MAFIA_BOT_NAMES = [
  "بوت فهد", "بوت سارة", "بوت نايف", "بوت ريم", "بوت خالد",
  "بوت نورة", "بوت سلطان", "بوت لمى", "بوت ماجد", "بوت هيا",
  "بوت تركي", "بوت جود", "بوت بندر", "بوت دانة", "بوت راكان",
  "بوت شهد", "بوت عبدالله", "بوت غلا", "بوت مشعل", "بوت روان",
] as const;
