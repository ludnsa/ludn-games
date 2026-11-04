import roomsFile from "./castle-rooms-new.json";

/** رسمة القلعة كاملة (الأبراج والنوافذ والخلفية) — نفس الصورة للفريقين، ولون الفريق من الكود */
export const CASTLE_IMAGE = "/games/castle-war/castle-war-castle.webp";

/** كروت الأحداث (عرض 512، نسبتها 512:693) وأيقوناتها */
const CARDS_DIR = "/games/castle-war/cards";
export const CASTLE_CARDS = {
  commander: { card: `${CARDS_DIR}/commander.webp`, icon: `${CARDS_DIR}/commander_icon.webp`, label: "القائد", glow: "#e2b84a" },
  trap: { card: `${CARDS_DIR}/trap.webp`, icon: `${CARDS_DIR}/trap_icon.webp`, label: "الفخ", glow: "#f97316" },
  spy: { card: `${CARDS_DIR}/spy.webp`, icon: `${CARDS_DIR}/spy_icon.webp`, label: "الجاسوس", glow: "#a855f7" },
} as const;

/** مساحة الرسم بالوحدات: الوحدة = بكسلين من الصورة (2400×2240). تبدأ من 0,0 زي إحداثيات الملف */
export const CASTLE_SIZE = { width: 1200, height: 1120 } as const;
export const CASTLE_VIEWBOX = `0 0 ${CASTLE_SIZE.width} ${CASTLE_SIZE.height}`;

const UNITS_PER_PIXEL = CASTLE_SIZE.width / roomsFile.canvas.width;

export interface CastleRoom {
  /** رقم الغرفة بمنطق اللعبة (0–14) — الرقم الظاهر للاعبين هو id + 1 */
  id: number;
  /** مركز النافذة بوحدات الرسم */
  cx: number;
  cy: number;
  /** شكل النافذة (أعلاها مقوس) بوحدات الرسم */
  arch: string;
}

/** مواقع الغرف على نوافذ الصورة — المصدر: castle-rooms-new.json (بكسل على 2400×2240) */
export const CASTLE_ROOMS: readonly CastleRoom[] = roomsFile.rooms.map((r) => {
  const x = r.x * UNITS_PER_PIXEL;
  const y = r.y * UNITS_PER_PIXEL;
  const w = r.width * UNITS_PER_PIXEL;
  const h = r.height * UNITS_PER_PIXEL;
  const radius = w / 2;
  return {
    id: r.codeId,
    cx: x + w / 2,
    cy: y + h / 2,
    arch: `M ${x} ${y + h} L ${x + w} ${y + h} L ${x + w} ${y + radius} A ${radius} ${radius} 0 0 0 ${x} ${y + radius} Z`,
  };
});
