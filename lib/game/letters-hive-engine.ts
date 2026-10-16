import { LETTERS_HIVE_CONFIG, LETTERS_HIVE_TEAMS } from "@/constants/letters-hive";
import { shuffleArray } from "@/lib/game/shuffle";

// =====================================================================
// محرك خلية الحروف — حسابات بحتة بدون واجهة، عشان تنختبر لحالها.
//
// اللوحة 5 صفوف × 5 خلايا سداسية. الصف الثاني والرابع (الفردية) مزاحين لليمين نص خلية،
// فكل خلية تلامس 6 جيران بالكثير.
// - الأخضر يفوز لما يوصّل خلاياه من الصف الأعلى للصف الأسفل.
// - الأحمر يفوز لما يوصّل خلاياه من العمود الأيسر للعمود الأيمن.
// =====================================================================

export type HiveTeam = "green" | "red";
export const HIVE_TEAMS: readonly HiveTeam[] = ["green", "red"];

const { ROWS, COLS } = LETTERS_HIVE_CONFIG;
export const HIVE_CELLS = ROWS * COLS;

export const cellIndex = (r: number, c: number) => r * COLS + c;
export const cellPos = (i: number) => ({ r: Math.floor(i / COLS), c: i % COLS });

/** جيران الخلية: الصفوف الفردية مزاحة لليمين، فجيرانها فوق وتحت بنفس العمود والعمود اللي بعده */
export function hiveNeighbors(i: number): number[] {
  const { r, c } = cellPos(i);
  const shift = r % 2 === 1 ? 0 : -1;
  const candidates: [number, number][] = [
    [r, c - 1],
    [r, c + 1],
    [r - 1, c + shift],
    [r - 1, c + shift + 1],
    [r + 1, c + shift],
    [r + 1, c + shift + 1],
  ];
  return candidates
    .filter(([rr, cc]) => rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS)
    .map(([rr, cc]) => cellIndex(rr, cc));
}

const touchesStart = (team: HiveTeam, i: number) => (team === "green" ? cellPos(i).r === 0 : cellPos(i).c === 0);
const touchesEnd = (team: HiveTeam, i: number) => (team === "green" ? cellPos(i).r === ROWS - 1 : cellPos(i).c === COLS - 1);

/** أقصر مسار فوز للفريق (معرّفات الخلايا بالترتيب)، أو null لو ما وصّل */
export function winningPath(owners: (HiveTeam | null)[], team: HiveTeam): number[] | null {
  const parent = new Map<number, number | null>();
  const queue: number[] = [];
  owners.forEach((o, i) => {
    if (o === team && touchesStart(team, i)) {
      parent.set(i, null);
      queue.push(i);
    }
  });
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (touchesEnd(team, cur)) {
      const path: number[] = [];
      for (let at: number | null = cur; at !== null; at = parent.get(at) ?? null) path.unshift(at);
      return path;
    }
    for (const n of hiveNeighbors(cur)) {
      if (owners[n] === team && !parent.has(n)) {
        parent.set(n, cur);
        queue.push(n);
      }
    }
  }
  return null;
}

/** الفائز بالجولة الحالية (بلوحة السداسيات ما يقدرون الاثنين يوصلون مع بعض) */
export function hiveWinner(owners: (HiveTeam | null)[]): { team: HiveTeam; path: number[] } | null {
  for (const team of HIVE_TEAMS) {
    const path = winningPath(owners, team);
    if (path) return { team, path };
  }
  return null;
}

/** 25 حرف مخلوطة: الأساسية بس، أو مع الحروف الصعبة (والنظام يختار منها 25) */
export function newHiveLetters(hardLetters: boolean): string[] {
  const pool = [...LETTERS_HIVE_CONFIG.LETTERS, ...(hardLetters ? LETTERS_HIVE_CONFIG.HARD_LETTERS : [])];
  return shuffleArray(pool).slice(0, HIVE_CELLS);
}

// ---------------------------------------------------------------------
// حالة الجلسة (تنحفظ بالجهاز وتنبث لشاشة العرض)
// ---------------------------------------------------------------------

export interface HiveState {
  v: 1;
  /** setup = قبل البدء (أو بعد إنهاء الجلسة)، playing = اللوحة شغالة */
  status: "setup" | "playing";
  teams: Record<HiveTeam, string>;
  hardLetters: boolean;
  letters: string[];
  owners: (HiveTeam | null)[];
  /** الحرف اللي المقدم يسأل عنه الحين — يتوهج على شاشة العرض */
  active: number | null;
  /** للتراجع داخل الجولة */
  history: { index: number; prev: HiveTeam | null }[];
  /** الجولات اللي خلصت — نتيجة الجولة الحالية تنضاف لما يبدأ اللي بعدها */
  wins: Record<HiveTeam, number>;
  round: number;
  updatedAt: number;
}

export function initialHiveState(prev?: Pick<HiveState, "teams" | "hardLetters">): HiveState {
  return {
    v: 1,
    status: "setup",
    teams: prev?.teams ?? { green: LETTERS_HIVE_TEAMS.green.defaultName, red: LETTERS_HIVE_TEAMS.red.defaultName },
    hardLetters: prev?.hardLetters ?? false,
    letters: newHiveLetters(prev?.hardLetters ?? false),
    owners: Array(HIVE_CELLS).fill(null),
    active: null,
    history: [],
    wins: { green: 0, red: 0 },
    round: 0,
    updatedAt: Date.now(),
  };
}

const cleanName = (name: string, team: HiveTeam) =>
  name.trim().slice(0, LETTERS_HIVE_CONFIG.TEAM_NAME_MAX) || LETTERS_HIVE_TEAMS[team].defaultName;

export function startHiveSession(s: HiveState, teams: Record<HiveTeam, string>, hardLetters: boolean): HiveState {
  return {
    ...s,
    status: "playing",
    teams: { green: cleanName(teams.green, "green"), red: cleanName(teams.red, "red") },
    hardLetters,
    letters: newHiveLetters(hardLetters),
    owners: Array(HIVE_CELLS).fill(null),
    active: null,
    history: [],
    wins: { green: 0, red: 0 },
    round: 1,
  };
}

export function selectHiveCell(s: HiveState, index: number | null): HiveState {
  return { ...s, active: index === s.active ? null : index };
}

/** تلوين الخلية لفريق (أو مسحها) — والتحديد ينشال بعدها */
export function setHiveCell(s: HiveState, index: number, team: HiveTeam | null): HiveState {
  if (index < 0 || index >= HIVE_CELLS || s.owners[index] === team) return { ...s, active: null };
  const owners = [...s.owners];
  owners[index] = team;
  return { ...s, owners, active: null, history: [...s.history, { index, prev: s.owners[index] }] };
}

export function undoHive(s: HiveState): HiveState {
  const last = s.history[s.history.length - 1];
  if (!last) return s;
  const owners = [...s.owners];
  owners[last.index] = last.prev;
  return { ...s, owners, active: null, history: s.history.slice(0, -1) };
}

/** النتيجة: الجولات اللي خلصت + الجولة الحالية لو فيها فائز */
export function hiveScores(s: HiveState): Record<HiveTeam, number> {
  const w = hiveWinner(s.owners)?.team;
  return { green: s.wins.green + (w === "green" ? 1 : 0), red: s.wins.red + (w === "red" ? 1 : 0) };
}

/** جولة جديدة: تنحسب نتيجة الجولة اللي خلصت، والحروف تنخلط من جديد */
export function nextHiveRound(s: HiveState): HiveState {
  return {
    ...s,
    wins: hiveScores(s),
    round: s.round + 1,
    letters: newHiveLetters(s.hardLetters),
    owners: Array(HIVE_CELLS).fill(null),
    active: null,
    history: [],
  };
}

/** الإعدادات: الأسماء تتغير على طول، والحروف الصعبة تنطبق على طول لو اللوحة فاضية، وإلا من الجولة الجاية */
export function updateHiveSettings(s: HiveState, teams: Record<HiveTeam, string>, hardLetters: boolean): HiveState {
  const empty = s.owners.every((o) => o === null);
  return {
    ...s,
    teams: { green: cleanName(teams.green, "green"), red: cleanName(teams.red, "red") },
    hardLetters,
    letters: empty && hardLetters !== s.hardLetters ? newHiveLetters(hardLetters) : s.letters,
  };
}

/** إنهاء الجلسة: ترجع لشاشة البداية (تظل الأسماء والإعدادات للمرة الجاية) */
export function endHiveSession(s: HiveState): HiveState {
  return initialHiveState(s);
}
