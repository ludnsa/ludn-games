/**
 * عدالة التوزيع — على كود اللعبة الحقيقي نفسه:
 *  1) buildRoleDeck (المحرك): لكل عدد لاعبين من 7 إلى 20 وكل عدد مافيا من 2 إلى 4 (اللي يسمح به الإعداد)،
 *     بدون فئات إضافية ومع كل الفئات الإضافية: كم مرة طلع كل مقعد مافيا، وكل فئة.
 *  2) المسار الكامل عبر startMafiaGame على القاعدة الوهمية: أول جولة، و"جولة جديدة بنفس اللاعبين"
 *     (playMafiaAgain ثم startMafiaGame بنفس الغرفة)، و"غرفة جديدة" (newMafiaRoom ثم دخول ثم بدء)،
 *     بالنمط الحماسي والسريع — عشان نتأكد إن المقعد ووقت الدخول ما يأثرون.
 *  3) قائد المافيا كل ليلة (mafiaLeaderId / nightLeaderId): كم مرة أخذ القرار كل مقعد من المافيا بالليلة الأولى والثانية،
 *     وانتقال القرار للعضو الثاني (fillMissingActions لما القائد ما وصلته مهمته).
 *
 * المعيار: الفرق عن المتوقع بوحدات الانحراف المعياري (z). |z| ≤ 3 طبيعي، فوق 4 انحياز.
 */
import { buildRoleDeck, mafiaLeaderId, mafiaMaxMafia, validateMafiaSettings, type EnginePlayer } from "@/lib/game/mafia-engine";
import { MAFIA_OPTIONAL_ROLES } from "@/constants/mafia";
import type { MafiaOptionalRole, MafiaRole, MafiaSettings } from "@/types";
import { FakeSupabase } from "./fakes/fake-supabase";
import { asUser, setFakeSupabase } from "./fakes/supabase-server";
import * as mafia from "@/actions/mafia";

export interface SeatStat {
  seat: number;
  count: number;
  expected: number;
  z: number;
}

export interface FairnessRow {
  label: string;
  games: number;
  players: number;
  mafia: number;
  optional: string;
  /** لكل مقعد: كم مرة طلع مافيا */
  mafiaBySeat: SeatStat[];
  /** لكل فئة: أكبر |z| على المقاعد */
  worstZByRole: Record<string, number>;
  maxAbsZ: number;
  biased: boolean;
}

const BIAS_Z = 4;

function zScore(count: number, n: number, p: number): number {
  const expected = n * p;
  const sd = Math.sqrt(n * p * (1 - p));
  return sd === 0 ? 0 : (count - expected) / sd;
}

/** يحوّل عدّادات (مقعد × فئة) لصف نتيجة */
function summarize(label: string, games: number, settings: MafiaSettings, bySeatRole: Map<number, Map<MafiaRole, number>>): FairnessRow {
  const deck = buildRoleDeck(settings);
  const roleCounts = new Map<MafiaRole, number>();
  deck.forEach((r) => roleCounts.set(r, (roleCounts.get(r) ?? 0) + 1));
  const seats = [...bySeatRole.keys()].sort((a, b) => a - b);
  const pMafia = settings.mafiaCount / settings.maxPlayers;
  const mafiaBySeat = seats.map((seat) => {
    const count = bySeatRole.get(seat)!.get("mafia") ?? 0;
    return { seat, count, expected: games * pMafia, z: zScore(count, games, pMafia) };
  });
  const worstZByRole: Record<string, number> = {};
  let maxAbsZ = 0;
  for (const [role, n] of roleCounts) {
    const p = n / settings.maxPlayers;
    let worst = 0;
    for (const seat of seats) {
      const z = zScore(bySeatRole.get(seat)!.get(role) ?? 0, games, p);
      if (Math.abs(z) > Math.abs(worst)) worst = z;
    }
    worstZByRole[role] = Number(worst.toFixed(2));
    maxAbsZ = Math.max(maxAbsZ, Math.abs(worst));
  }
  return {
    label,
    games,
    players: settings.maxPlayers,
    mafia: settings.mafiaCount,
    optional: settings.optionalRoles.join("+") || "-",
    mafiaBySeat,
    worstZByRole,
    maxAbsZ: Number(maxAbsZ.toFixed(2)),
    biased: maxAbsZ > BIAS_Z,
  };
}

/** 1) المحرك مباشرة: buildRoleDeck والمقعد i ياخذ deck[i] (نفس startMafiaGame) */
export function deckFairness(games: number): FairnessRow[] {
  const rows: FairnessRow[] = [];
  const optionSets: MafiaOptionalRole[][] = [[], [...MAFIA_OPTIONAL_ROLES]];
  for (let players = 7; players <= 20; players++) {
    for (const optionalRoles of optionSets) {
      const maxMafia = mafiaMaxMafia(players, optionalRoles.length);
      for (let mafiaCount = 2; mafiaCount <= Math.min(4, maxMafia); mafiaCount++) {
        const settings: MafiaSettings = { maxPlayers: players, mafiaCount, optionalRoles };
        if (validateMafiaSettings(settings)) continue;
        const bySeatRole = new Map<number, Map<MafiaRole, number>>();
        for (let s = 1; s <= players; s++) bySeatRole.set(s, new Map());
        for (let g = 0; g < games; g++) {
          const deck = buildRoleDeck(settings);
          deck.forEach((role, i) => {
            const m = bySeatRole.get(i + 1)!;
            m.set(role, (m.get(role) ?? 0) + 1);
          });
        }
        rows.push(summarize("deck", games, settings, bySeatRole));
      }
    }
  }
  return rows;
}

export const HOST_USER = "00000000-0000-4000-8000-0000000000aa";

/** يجهّز غرفة كاملة على القاعدة الوهمية ويرجع كودها ومعرّفات اللاعبين بترتيب المقاعد */
export async function makeRoom(settings: MafiaSettings, names?: string[]) {
  const created = await asUser(HOST_USER, () => mafia.createMafiaRoom({ displayName: "المنشئ", settings }));
  if (!created.success) throw new Error("create: " + created.error);
  const roomCode = created.data.roomCode;
  const tokens: Record<string, string> = {};
  for (let i = 2; i <= settings.maxPlayers; i++) {
    const name = names?.[i - 2] ?? `لاعب ${i}`;
    const j = await mafia.joinMafiaRoom({ roomCode, displayName: name });
    if (!j.success) throw new Error("join: " + j.error);
    tokens[name] = j.data.token;
  }
  return { roomCode, hostToken: created.data.token, tokens };
}

/** 2) المسار الكامل: start على القاعدة الوهمية — نحسب الفئة اللي أخذها كل مقعد */
export async function flowFairness(games: number, settings: MafiaSettings, path: "again" | "newRoom"): Promise<FairnessRow> {
  const db = new FakeSupabase();
  setFakeSupabase(db);
  const bySeatRole = new Map<number, Map<MafiaRole, number>>();
  for (let s = 1; s <= settings.maxPlayers; s++) bySeatRole.set(s, new Map());
  let { roomCode } = await makeRoom(settings);
  for (let g = 0; g < games; g++) {
    if (g > 0) {
      if (path === "again") {
        const again = await asUser(HOST_USER, () => mafia.playMafiaAgain(roomCode));
        if (!again.success) throw new Error("again: " + again.error);
      } else {
        const next = await asUser(HOST_USER, () => mafia.newMafiaRoom(roomCode));
        if (!next.success) throw new Error("newRoom: " + next.error);
        roomCode = next.data.roomCode;
        // اللاعبين يدخلون من جديد بترتيب عشوائي (مثل الواقع)
        const order = Array.from({ length: settings.maxPlayers - 1 }, (_, i) => `لاعب ${i + 2}`).sort(() => Math.random() - 0.5);
        for (const name of order) {
          const j = await mafia.joinMafiaRoom({ roomCode, displayName: name });
          if (!j.success) throw new Error("rejoin: " + j.error);
        }
        // الغرف القديمة تنحذف من الذاكرة عشان ما تكبر
        db.tables.mafia_rooms = db.tables.mafia_rooms.filter((r) => r.room_code === roomCode);
        for (const t of ["mafia_players", "mafia_secrets", "mafia_actions", "mafia_votes"]) db.tables[t] = db.tables[t].filter((r) => r.room_code === roomCode);
      }
    }
    const started = await asUser(HOST_USER, () => mafia.startMafiaGame(roomCode));
    if (!started.success) throw new Error("start: " + started.error);
    const players = db.rows("mafia_players").filter((p) => p.room_code === roomCode);
    const secrets = db.rows("mafia_secrets");
    for (const p of players) {
      const role = secrets.find((s) => s.player_id === p.id)?.role as MafiaRole;
      const m = bySeatRole.get(p.seat as number)!;
      m.set(role, (m.get(role) ?? 0) + 1);
    }
  }
  return summarize(path === "again" ? "جولة جديدة بنفس اللاعبين" : "غرفة جديدة", games, settings, bySeatRole);
}

export interface LeaderRow {
  label: string;
  games: number;
  players: number;
  mafia: number;
  /** الليلة 1: لكل ترتيب مقعد بين المافيا (الأول/الثاني/الثالث حسب المقعد) كم مرة كان القائد */
  night1ByMafiaRank: number[];
  /** الليلة 1: كم مرة كان القائد هو أقل مقعد بين المافيا */
  night1LowestSeatShare: number;
  /** الليلة 1: كم مرة كان القائد المنشئ (المقعد 1) من بين الألعاب اللي كان فيها المنشئ مافيا */
  hostLeadsWhenMafiaShare: number;
  /** كل مقعد بالغرفة: كم مرة قاد الليلة 1 (المتوقع متساوي) */
  night1BySeat: SeatStat[];
  maxAbsZ: number;
  biased: boolean;
}

/**
 * 3) القائد: بنفس توزيع المحرك (buildRoleDeck) ونفس دالة القائد الحقيقية. seedOf يعطي بذرة القائد لكل لعبة
 * (الكود الجديد يحفظها بالإعدادات؛ القديم ما له بذرة = ترتيب المقاعد).
 */
export function leaderFairness(games: number, settings: MafiaSettings, seedOf: (game: number) => string | undefined): LeaderRow {
  const rank = new Array(settings.mafiaCount).fill(0);
  const bySeat = new Array(settings.maxPlayers).fill(0);
  let lowest = 0;
  let hostMafia = 0;
  let hostLeads = 0;
  for (let g = 0; g < games; g++) {
    const deck = buildRoleDeck(settings);
    const players: EnginePlayer[] = deck.map((role, i) => ({
      id: `p${i + 1}`,
      name: `p${i + 1}`,
      seat: i + 1,
      alive: true,
      role,
      originalRole: role,
      soldierShieldUsed: false,
      abilityUsed: false,
      suicideTarget: null,
      lastProtected: null,
    }));
    const seed = seedOf(g);
    const leader = (mafiaLeaderId as (p: EnginePlayer[], n: number, s?: string) => string | null)(players, 1, seed);
    const mafiaSeats = players.filter((p) => p.role === "mafia").map((p) => p.seat).sort((a, b) => a - b);
    const leaderSeat = players.find((p) => p.id === leader)!.seat;
    rank[mafiaSeats.indexOf(leaderSeat)]++;
    bySeat[leaderSeat - 1]++;
    if (leaderSeat === mafiaSeats[0]) lowest++;
    if (mafiaSeats.includes(1)) {
      hostMafia++;
      if (leaderSeat === 1) hostLeads++;
    }
  }
  const p = 1 / settings.maxPlayers;
  const night1BySeat = bySeat.map((count, i) => ({ seat: i + 1, count, expected: games * p, z: zScore(count, games, p) }));
  const maxAbsZ = Math.max(...night1BySeat.map((s) => Math.abs(s.z)));
  return {
    label: seedOf(0) ? "بذرة عشوائية لكل لعبة" : "ترتيب المقاعد (الكود القديم)",
    games,
    players: settings.maxPlayers,
    mafia: settings.mafiaCount,
    night1ByMafiaRank: rank,
    night1LowestSeatShare: lowest / games,
    hostLeadsWhenMafiaShare: hostMafia ? hostLeads / hostMafia : 0,
    night1BySeat,
    maxAbsZ: Number(maxAbsZ.toFixed(2)),
    biased: maxAbsZ > BIAS_Z,
  };
}

export function fmtSeats(stats: SeatStat[]): string {
  return stats.map((s) => `${s.seat}:${s.count}`).join(" ");
}
