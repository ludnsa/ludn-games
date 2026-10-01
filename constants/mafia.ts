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
  ROLE_REVEAL_SECONDS: 12,
  /** وقت صاحب الدور بالليل — وزر "استمرار" ينهيه قبل */
  NIGHT_ACTION_SECONDS: 20,
  /** الدور اللي صاحبه ميت (أو ما يقدر يتصرف) يخلص بعد وقت عشوائي بين هذين، عشان ما ينكشف */
  DEAD_STEP_MIN_SECONDS: 6,
  DEAD_STEP_MAX_SECONDS: 10,
  NIGHT_DONE_SECONDS: 5,
  MORNING_SECONDS: 15,
  /** وقت النقاش الافتراضي، والخيارات اللي يقدر المنشئ يختار منها */
  DISCUSSION_SECONDS: 120,
  DISCUSSION_OPTIONS: [120, 180, 300] as readonly number[],
  VOTING_SECONDS: 15,
  VOTE_RESULT_SECONDS: 10,

  /** سؤال التمويه لباقي اللاعبين أثناء أدوار الليل */
  FUN_QUESTION: "من تتوقع مافيا؟ 🤔",
  FUN_QUESTION_NOTE: "🤫 اختيارك هنا غير معتمد — بس عشان تبعد الشبهات عنك",

  DEAD_MESSAGE: "يا حرام طلعت من اللعبة يا زلابة 🤡",

  ROOM_CODE_PREFIX: "M",
  ROOM_CODE_LENGTH: 5,
} as const;

export interface MafiaRoleDef {
  key: MafiaRole;
  label: string;
  emoji: string;
  team: MafiaTeam;
  /** وصف قصير يظهر للاعب عند كشف دوره */
  description: string;
  /** لون البطاقة (Tailwind) */
  accent: string;
}

export const MAFIA_ROLES: Record<MafiaRole, MafiaRoleDef> = {
  mafia: {
    key: "mafia",
    label: "مافيا",
    emoji: "🔪",
    team: "mafia",
    description: "كل ليلة تتفقون على لاعب وتذبحونه. هدفكم تخلصون على المواطنين بدون ما ينكشف أمركم.",
    accent: "from-rose-600 to-red-800",
  },
  detective: {
    key: "detective",
    label: "المحقق",
    emoji: "🕵️",
    team: "town",
    description: "كل ليلة تحقق مع لاعب ويجيك الجواب فوراً: مافيا ولا لا.",
    accent: "from-sky-500 to-blue-700",
  },
  doctor: {
    key: "doctor",
    label: "الدكتور",
    emoji: "🩺",
    team: "town",
    description: "كل ليلة تحمي لاعب من الذبح. تقدر تحمي نفسك، بس ما تحمي نفس الشخص ليلتين ورا بعض.",
    accent: "from-emerald-500 to-green-700",
  },
  citizen: {
    key: "citizen",
    label: "مواطن",
    emoji: "🧑",
    team: "town",
    description: "ما عندك قدرة بالليل، بس صوتك بالنهار هو اللي يطلّع المافيا. ركّز ولاحظ!",
    accent: "from-slate-500 to-slate-700",
  },
  magician: {
    key: "magician",
    label: "الساحر",
    emoji: "🎩",
    team: "town",
    description: "إذا مات المحقق أو الدكتور أو الجندي، تقدر تاخذ مكانه (مرة وحدة طول اللعبة). وأنت من صف المواطنين.",
    accent: "from-purple-500 to-fuchsia-700",
  },
  journalist: {
    key: "journalist",
    label: "الصحفي",
    emoji: "📰",
    team: "town",
    description: "مرة وحدة طول اللعبة تكشف فئة لاعب للكل مع نتائج الصباح.",
    accent: "from-amber-500 to-orange-600",
  },
  soldier: {
    key: "soldier",
    label: "الجندي",
    emoji: "🪖",
    team: "town",
    description: "عندك درع مرة وحدة: أول مرة يذبحونك ما تموت. الدرع يشتغل تلقائي.",
    accent: "from-lime-600 to-green-800",
  },
  suicide: {
    key: "suicide",
    label: "الانتحاري",
    emoji: "💣",
    team: "town",
    description: "كل ليلة تختار لاعب. إذا المافيا ذبحوك، تنفجر وتاخذ آخر واحد اخترته معك.",
    accent: "from-orange-500 to-red-700",
  },
};

/** الفئات الاختيارية بالترتيب اللي تظهر فيه في شاشة الإعداد */
export const MAFIA_OPTIONAL_ROLES: readonly MafiaOptionalRole[] = [
  "magician",
  "journalist",
  "soldier",
  "suicide",
] as const;

/** ترتيب أدوار الليل. الجندي ما له دور بالليل لأن درعه تلقائي. */
export const MAFIA_NIGHT_ORDER: readonly MafiaNightStep[] = [
  "doctor",
  "mafia",
  "detective",
  "magician",
  "journalist",
  "suicide",
] as const;

export interface MafiaNightStepDef {
  /** يظهر للكل أثناء الدور */
  headline: string;
  /** يظهر لصاحب الدور فوق قائمة اللاعبين */
  prompt: string;
  /** الرسالة اللي تطلع للكل بعد انتهاء الدور */
  doneText: string;
  doneEmoji: string;
}

export const MAFIA_NIGHT_STEPS: Record<MafiaNightStep, MafiaNightStepDef> = {
  doctor: {
    headline: "🩺 الدكتور يختار مين يحمي...",
    prompt: "مين تحمي الليلة؟",
    doneText: "تمت الحماية",
    doneEmoji: "💉",
  },
  mafia: {
    headline: "🔪 المافيا يختارون ضحيتهم...",
    prompt: "مين تذبحون الليلة؟",
    doneText: "تم الاغتيال",
    doneEmoji: "🗡️",
  },
  detective: {
    headline: "🕵️ المحقق يحقق مع أحد...",
    prompt: "تشك بمين؟ اختار واحد تحقق معه",
    doneText: "تم التحقيق",
    doneEmoji: "🔍",
  },
  magician: {
    headline: "🎩 الساحر يجهّز سحره...",
    prompt: "وش تبي تصير؟ (مرة وحدة طول اللعبة)",
    doneText: "الساحر خلّص سحره",
    doneEmoji: "🪄",
  },
  journalist: {
    headline: "📰 الصحفي يجهّز خبر الصباح...",
    prompt: "مين تكشف فئته للكل؟ (مرة وحدة طول اللعبة)",
    doneText: "الصحفي جهّز خبره",
    doneEmoji: "🗞️",
  },
  suicide: {
    headline: "💣 الانتحاري يختار هدفه...",
    prompt: "مين تاخذ معك إذا ذبحوك؟",
    doneText: "الانتحاري اختار هدفه",
    doneEmoji: "🧨",
  },
};

/** أسماء اللاعبين الوهميين لوضع التجربة (localhost فقط) */
export const MAFIA_BOT_NAMES = [
  "بوت فهد", "بوت سارة", "بوت نايف", "بوت ريم", "بوت خالد",
  "بوت نورة", "بوت سلطان", "بوت لمى", "بوت ماجد", "بوت هيا",
  "بوت تركي", "بوت جود", "بوت بندر", "بوت دانة", "بوت راكان",
  "بوت شهد", "بوت عبدالله", "بوت غلا", "بوت مشعل", "بوت روان",
] as const;
