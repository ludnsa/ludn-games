import type { GameGuide } from "./types";
import { AUCTION_GUIDE } from "./auction";
import { CASTLE_WAR_GUIDE } from "./castle-war";
import { CHALLENGES_GUIDE } from "./challenges";
import { LETTERS_HIVE_GUIDE } from "./letters-hive";
import { MADAQESH_GUIDE } from "./madaqesh";
import { MAFIA_GUIDE } from "./mafia";
import { QUIZ_GRID_GUIDE } from "./quiz-grid";
import { WORLD_DOMINATION_GUIDE } from "./world-domination";

export type { GameGuide, GuideItem, GuideStep, GuideFaq, GuideExtraSection, GuideMeta, GuidePoint } from "./types";

/** تعليمات الألعاب السبع (نفس ترتيب الرئيسية) */
export const GAME_GUIDES: GameGuide[] = [
  MAFIA_GUIDE,
  QUIZ_GRID_GUIDE,
  LETTERS_HIVE_GUIDE,
  AUCTION_GUIDE,
  CASTLE_WAR_GUIDE,
  WORLD_DOMINATION_GUIDE,
  MADAQESH_GUIDE,
];

/** أدلة إضافية بصفحة /guides (مو ألعاب): تحديات الحكم والفريق (تابعة لحرب القلاع) */
export const EXTRA_GUIDES: GameGuide[] = [CHALLENGES_GUIDE];

const ALL = [...GAME_GUIDES, ...EXTRA_GUIDES];

export function getGuide(id: string | null | undefined): GameGuide | null {
  if (!id) return null;
  return ALL.find((g) => g.id === id) ?? null;
}
