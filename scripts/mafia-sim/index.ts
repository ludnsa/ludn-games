/**
 * محاكي المافيا — نقطة التشغيل. يشتغل قبل أي رفع للمافيا:
 *   npm run sim:mafia            (كامل: كل الأعداد والنمطين، كل تركيبات الفئات عند 9 و13 و17 لاعب، وآلاف الجولات — دقائق)
 *   npm run sim:mafia -- --all   (كل تركيبة × كل عدد مافيا: ساعة ونصف تقريباً)
 *   npm run sim:mafia -- --quick (أسرع: عينة من التركيبات)
 *   npm run sim:mafia -- --seed 7 (عشوائية ثابتة قابلة للتكرار)
 *   npm run sim:mafia -- --games 3000 --fair 20000
 *   npm run sim:mafia -- --only 3,4 (أقسام معيّنة بس، للتجربة — قبل الرفع لازم الكامل)
 *
 * يطلع بخطأ (exit 1) لو فيه تعليق أو جولة ما انتهت بفائز أو انكشف دور أو انحياز بالتوزيع أو سيناريو ساحر فشل.
 *
 * الأقسام:
 *  1) كل التركيبات: لكل عدد لاعبين (7–20) وعدد مافيا (1 إلى الأقصى) وكل مجموعة فئات إضافية تنفع، وبالنمطين — جولة لكل تركيبة.
 *  2) جولات عشوائية كثيرة بسلوك "مشاغب" (جوالات تتأخر وتنقطع، ولاعبين ما يختارون، ومنشئ يتخطى) على إعدادات مختارة.
 *  3) الساحر: سيناريوهات موجّهة لكل حالة (ومنها الساحر اللي يصير جندي: درعه، وينجو مرة وحدة).
 *  4) انتقال قرار المافيا (ضغطة تمويه بلحظة الانتقال ما تنحسب قتل)، وإعادة إرسال الاختيار (تنجح مثل الأول).
 *  5) العدالة: التوزيع حسب المقعد عبر كل الجولات، وقائد المافيا بالليلة الأولى (نفس دوال اللعبة).
 *  6) كتابات متأخرة: كل كتابة فيها موعد نهاية تعلق بالطريق 10–20 ثانية — كل مرحلة لازم تاخذ وقتها كامل
 *     من لحظة ما تنكتب (0019)، والأصوات قبل نهاية الوقت الكامل بثانية تنقبل. ونفس الجولات على قاعدة بدون 0019:
 *     لازم القسم يكشف المشكلة (مراحل توصل ناقصة وأصوات تنرفض) — وإلا الفحص ما يفحص شي.
 */
import { MAFIA_CONFIG, MAFIA_OPTIONAL_ROLES } from "@/constants/mafia";
import { mafiaLeaderId, mafiaMaxMafia, validateMafiaSettings } from "@/lib/game/mafia-engine";
import type { MafiaOptionalRole, MafiaRole, MafiaSettings } from "@/types";
import { CALM, MESSY, MafiaSim, ROLE_LABELS, clock, installClock, randomUUID, seededRandom, type GameResult, type Scenario, type Truth } from "./sim";
import { deckFairness, fmtSeats, leaderFairness } from "./fairness";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const num = (name: string, def: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : def;
};
const QUICK = flag("quick");
const SEED = num("seed", 0);
const GAMES = num("games", QUICK ? 300 : 2000);
const FAIR = num("fair", QUICK ? 3000 : 10000);
/** --only 3,4: أقسام معيّنة بس (للتجربة أثناء التطوير — قبل الرفع لازم الكامل) */
const ONLY = (() => {
  const i = args.indexOf("--only");
  return i >= 0 && args[i + 1] ? new Set(args[i + 1].split(",").map(Number)) : null;
})();
const section = (n: number) => !ONLY || ONLY.has(n);

const HOST_USER = "00000000-0000-4000-8000-0000000000aa";
const rnd = SEED ? seededRandom(SEED) : Math.random;
if (SEED) Math.random = seededRandom(SEED * 7919 + 13);

type Agg = {
  games: number;
  winners: Record<string, number>;
  nights: number;
  hangs: string[];
  violations: string[];
  rolesBySeat: Map<number, Map<MafiaRole, number>>;
  leaderSeats: Map<number, number>;
  leadMoves: number;
  magician: { games: number; offered: number; picked: Record<string, number>; actedSameNight: number; diedSameNight: number; missed: number; declined: number; announced: number };
  dbOps: number;
};
const newAgg = (): Agg => ({
  games: 0,
  winners: {},
  nights: 0,
  hangs: [],
  violations: [],
  rolesBySeat: new Map(),
  leaderSeats: new Map(),
  leadMoves: 0,
  magician: { games: 0, offered: 0, picked: {}, actedSameNight: 0, diedSameNight: 0, missed: 0, declined: 0, announced: 0 },
  dbOps: 0,
});
function add(agg: Agg, r: GameResult) {
  agg.games++;
  agg.winners[r.winner ?? "none"] = (agg.winners[r.winner ?? "none"] ?? 0) + 1;
  agg.nights += r.nights;
  agg.dbOps += r.dbOps;
  agg.leadMoves += r.leadMoves;
  if (r.hang) agg.hangs.push(`${r.config}: ${r.hang}`);
  for (const x of r.violations) agg.violations.push(`${r.config}: ${x}`);
  for (const [seat, role] of Object.entries(r.rolesBySeat)) {
    const m = agg.rolesBySeat.get(Number(seat)) ?? new Map();
    m.set(role, (m.get(role) ?? 0) + 1);
    agg.rolesBySeat.set(Number(seat), m);
  }
  if (r.leaderSeatNight1 !== null) agg.leaderSeats.set(r.leaderSeatNight1, (agg.leaderSeats.get(r.leaderSeatNight1) ?? 0) + 1);
  if (r.magician) {
    const m = agg.magician;
    m.games++;
    if (r.magician.offered) m.offered++;
    if (r.magician.picked) m.picked[r.magician.picked] = (m.picked[r.magician.picked] ?? 0) + 1;
    else if (r.magician.offered) m.declined++;
    if (r.magician.actedSameNight) m.actedSameNight++;
    if (r.magician.diedSameNight) m.diedSameNight++;
    if (r.magician.missed) m.missed++;
    if (r.mornings.some((x) => x.kinds.includes("magic"))) m.announced++;
  }
}

const label = (s: MafiaSettings) => `${s.mode ?? "hype"} ${s.maxPlayers}p ${s.mafiaCount}m [${s.optionalRoles.join(",") || "-"}]`;

/** جولة واحدة بغرفة جديدة */
async function oneGame(sim: MafiaSim, settings: MafiaSettings, scenario?: Scenario): Promise<GameResult> {
  const { code, players } = await sim.setup(settings, HOST_USER);
  const r = await sim.playRound(code, players, HOST_USER, scenario, label(settings));
  // تنظيف الغرفة من الذاكرة
  for (const t of Object.keys(sim.db.tables)) sim.db.tables[t] = sim.db.tables[t].filter((row) => row.room_code !== code);
  return r;
}

/** جولات متتالية بنفس الغرفة ("جولة جديدة بنفس اللاعبين") */
async function sameRoomGames(sim: MafiaSim, settings: MafiaSettings, n: number, agg: Agg) {
  const { code, players } = await sim.setup(settings, HOST_USER);
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      // "جولة جديدة" ضغطة منشئ مثل الباقي (معها رقم المرحلة، وممكن تنعاد) — مخالفاتها تنحسب مع الجولة
      const again = await sim.playAgain(code, HOST_USER);
      agg.violations.push(...again.violations);
    }
    add(agg, await sim.playRound(code, players, HOST_USER, undefined, label(settings) + " again"));
    clock.advance(60_000);
  }
  for (const t of Object.keys(sim.db.tables)) sim.db.tables[t] = sim.db.tables[t].filter((row) => row.room_code !== code);
}

function zMax(agg: Agg, settings: MafiaSettings): { maxZ: number; worst: string } {
  // التوزيع المتوقع لكل فئة = عددها بالإعداد / عدد اللاعبين
  const counts: Record<string, number> = { detective: 1, doctor: 1, mafia: settings.mafiaCount };
  for (const r of settings.optionalRoles) counts[r] = 1;
  counts.citizen = settings.maxPlayers - settings.mafiaCount - 2 - settings.optionalRoles.length;
  let maxZ = 0;
  let worst = "";
  for (const [seat, m] of agg.rolesBySeat) {
    for (const [role, n] of Object.entries(counts)) {
      if (n <= 0) continue;
      const p = n / settings.maxPlayers;
      const exp = agg.games * p;
      const sd = Math.sqrt(agg.games * p * (1 - p));
      const z = sd ? ((m.get(role as MafiaRole) ?? 0) - exp) / sd : 0;
      if (Math.abs(z) > Math.abs(maxZ)) {
        maxZ = z;
        worst = `${ROLE_LABELS[role as MafiaRole]} مقعد ${seat}: ${m.get(role as MafiaRole) ?? 0} والمتوقع ${exp.toFixed(0)}`;
      }
    }
  }
  return { maxZ: Number(maxZ.toFixed(2)), worst };
}

function allOptionalSubsets(): MafiaOptionalRole[][] {
  const out: MafiaOptionalRole[][] = [];
  const n = MAFIA_OPTIONAL_ROLES.length;
  for (let mask = 0; mask < 1 << n; mask++) out.push(MAFIA_OPTIONAL_ROLES.filter((_, i) => mask & (1 << i)));
  return out;
}

let failed = false;
const fail = (msg: string) => {
  failed = true;
  console.log("FAIL " + msg);
};
const ok = (msg: string) => console.log("ok   " + msg);

async function main() {
  installClock();
  const t0 = performance.now();
  console.log(`محاكي المافيا — ${QUICK ? "سريع" : "كامل"}${SEED ? ` (بذرة ${SEED})` : ""}`);

  if (section(1)) {
    // ---------------------------------------------------------------
    // 1) كل التركيبات
    // ---------------------------------------------------------------
    console.log("\n# 1) كل التركيبات (جولة لكل تركيبة)");
    const sweep = newAgg();
    let configs = 0;
    const subsets = allOptionalSubsets();
    // الكامل: كل الـ 64 مجموعة فئات عند 9 و13 و17 لاعب، والباقي: بدون فئات، وكل الفئات، وكل فئة لحالها؛
    // والمافيا 1 و2 و3 والأقصى. (كل شي × كل شي = ساعة ونصف — الفائدة نفسها بدقائق)
    // --all: فعلاً كل شي.
    const ALL = flag("all");
    for (const mode of ["hype", "fast"] as const) {
      for (let players = 7; players <= 20; players++) {
        const few = subsets.filter((s) => s.length === 0 || s.length === 6 || s.length === 1);
        const subsetList = QUICK ? few : ALL || [9, 13, 17].includes(players) ? subsets : few;
        for (const optionalRoles of subsetList) {
          const maxM = mafiaMaxMafia(players, optionalRoles.length);
          const mafiaList = QUICK ? [1, maxM] : ALL ? Array.from({ length: maxM }, (_, i) => i + 1) : [1, 2, 3, maxM].filter((m) => m <= maxM);
          for (const mafiaCount of new Set(mafiaList)) {
            const settings: MafiaSettings = { maxPlayers: players, mafiaCount, optionalRoles, mode };
            if (validateMafiaSettings(settings)) continue;
            configs++;
            const sim = new MafiaSim(CALM, rnd);
            const r = await oneGame(sim, settings);
            add(sweep, r);
          }
        }
      }
    }
    console.log(`تركيبات: ${configs} | فائز: ${JSON.stringify(sweep.winners)} | معدل الليالي ${(sweep.nights / sweep.games).toFixed(1)} | معدل عمليات القاعدة للجولة ${Math.round(sweep.dbOps / sweep.games)}`);
    if (sweep.hangs.length) fail(`تعليق في ${sweep.hangs.length} تركيبة:\n  ` + sweep.hangs.slice(0, 10).join("\n  "));
    else ok("ما فيه تعليق في أي تركيبة");
    if (sweep.winners.none) fail(`${sweep.winners.none} جولة ما انتهت بفائز`);
    else ok("كل الجولات انتهت بفائز");
    if (sweep.violations.length) fail(`${sweep.violations.length} مخالفة:\n  ` + [...new Set(sweep.violations)].slice(0, 15).join("\n  "));
    else ok("ما فيه دور انكشف لغير صاحبه، والحالات متطابقة");
  }

  if (section(2)) {
    // ---------------------------------------------------------------
    // 2) جولات عشوائية بسلوك مشاغب
    // ---------------------------------------------------------------
    console.log(`\n# 2) جولات عشوائية بسلوك مشاغب (${GAMES} لكل إعداد)`);
    const messyConfigs: MafiaSettings[] = [
      { maxPlayers: 11, mafiaCount: 3, optionalRoles: ["magician", "journalist", "soldier", "suicide", "silencer", "sheikh"], mode: "fast" },
      { maxPlayers: 11, mafiaCount: 3, optionalRoles: ["magician", "journalist", "soldier", "suicide", "silencer", "sheikh"], mode: "hype" },
      { maxPlayers: 7, mafiaCount: 2, optionalRoles: ["magician", "soldier"], mode: "hype" },
      { maxPlayers: 20, mafiaCount: 4, optionalRoles: ["magician", "journalist", "soldier", "suicide", "silencer", "sheikh"], mode: "fast" },
    ];
    for (const settings of messyConfigs) {
      const agg = newAgg();
      const sim = new MafiaSim(MESSY, rnd, 0);
      // نصهم بغرفة جديدة لكل جولة، ونصهم "جولة جديدة بنفس اللاعبين"
      const half = Math.floor(GAMES / 2);
      for (let i = 0; i < half; i++) add(agg, await oneGame(sim, settings));
      await sameRoomGames(sim, settings, GAMES - half, agg);
      const z = zMax(agg, settings);
      const leaderSeats = [...agg.leaderSeats.entries()].sort((a, b) => a[0] - b[0]).map(([s, n]) => `${s}:${n}`).join(" ");
      console.log(`${label(settings)}: ${agg.games} جولة | فائز ${JSON.stringify(agg.winners)} | ليالي ${(agg.nights / agg.games).toFixed(1)} | توزيع max|z|=${z.maxZ} (${z.worst}) | قائد الليلة 1 حسب المقعد: ${leaderSeats} | القرار انتقل لعضو ثاني ${agg.leadMoves} مرة`);
      if (agg.magician.games) {
        const m = agg.magician;
        console.log(`   الساحر: عُرض عليه ${m.offered}/${m.games}، اختار ${JSON.stringify(m.picked)}، عدّى ${m.declined}، لعب بفئته بنفس الليلة ${m.actedSameNight}، مات بنفس الليلة ${m.diedSameNight}، مهمته ما وصلته ${m.missed}، إعلان الصباح ${m.announced}`);
      }
      if (agg.hangs.length) fail(`تعليق ${agg.hangs.length}:\n  ` + agg.hangs.slice(0, 5).join("\n  "));
      if (agg.winners.none) fail(`${agg.winners.none} جولة بدون فائز`);
      if (agg.violations.length) fail(`${agg.violations.length} مخالفة:\n  ` + [...new Set(agg.violations)].slice(0, 10).join("\n  "));
      if (Math.abs(z.maxZ) > 4) fail(`انحياز بالتوزيع: ${z.worst} (z=${z.maxZ})`);
      if (!agg.hangs.length && !agg.winners.none && !agg.violations.length && Math.abs(z.maxZ) <= 4) ok(`${label(settings)} سليم`);
    }
  }

  if (section(3)) {
    // ---------------------------------------------------------------
    // 3) الساحر: سيناريوهات موجّهة
    // ---------------------------------------------------------------
    console.log("\n# 3) الساحر: سيناريوهات موجّهة");
    await magicianScenarios();
  }

  if (section(4)) {
    // ---------------------------------------------------------------
    // 4) انتقال قرار المافيا وإعادة الإرسال
    // ---------------------------------------------------------------
    console.log("\n# 4) انتقال قرار المافيا، وإعادة إرسال الاختيار");
    await handoverScenarios();
    await resendGames();
  }

  if (section(5)) {
    // ---------------------------------------------------------------
    // 5) العدالة
    // ---------------------------------------------------------------
    console.log(`\n# 5) العدالة (${FAIR} توزيعة لكل إعداد، بدوال اللعبة نفسها)`);
    const deck = deckFairness(FAIR);
    const biased = deck.filter((r) => r.biased);
    console.log(`buildRoleDeck: ${deck.length} إعداد، أعلى |z| ${Math.max(...deck.map((r) => r.maxAbsZ))}`);
    // بعشرات الآلاف من القيم، واحدة فوق 4 بالصدفة ممكنة؛ انحياز حقيقي يطلع فوق 5 ويتكرر
    if (deck.some((r) => r.maxAbsZ > 5)) fail("انحياز في توزيع الأدوار: " + deck.filter((r) => r.maxAbsZ > 5).map((r) => `${r.players}p ${r.mafia}m ${r.optional}`).join(", "));
    else ok(`توزيع الأدوار عادل${biased.length ? ` (${biased.length} قيمة بين 4 و5 — ضمن الصدفة)` : ""}`);
    for (const [players, mafiaCount] of [[7, 2], [11, 3], [16, 4]] as const) {
      const r = leaderFairness(FAIR, { maxPlayers: players, mafiaCount, optionalRoles: [] }, () => randomUUID());
      const line = `قائد الليلة 1 (${players}p ${mafiaCount}m): أقل مقعد ${(r.night1LowestSeatShare * 100).toFixed(1)}% (العادل ${(100 / mafiaCount).toFixed(1)}%) | المنشئ يقود لما يكون مافيا ${(r.hostLeadsWhenMafiaShare * 100).toFixed(1)}% | حسب المقعد ${fmtSeats(r.night1BySeat)} | max|z| ${r.maxAbsZ}`;
      if (r.biased) fail(line);
      else ok(line);
    }
  }

  if (section(6)) {
    // ---------------------------------------------------------------
    // 6) كتابات متأخرة (موعد النهاية لحظة الكتابة — 0019)
    // ---------------------------------------------------------------
    console.log("\n# 6) كتابات الغرفة تتأخر 10–20 ثانية بالطريق");
    await lateWriteGames();
  }

  console.log(`\n${failed ? "فيه فشل — راجع الأسطر FAIL فوق" : "كل الفحوص نجحت"} (${((performance.now() - t0) / 1000).toFixed(0)} ثانية)`);
  process.exit(failed ? 1 : 0);
}

// ---------------------------------------------------------------------
// سيناريوهات الساحر
// ---------------------------------------------------------------------

/** يرجع معرّف لاعب بفئة معيّنة (من الحقيقة اللي يعرفها المحاكي) */
const byRole = (roles: Record<string, MafiaRole>, role: MafiaRole, alive?: Set<string>) =>
  Object.keys(roles).find((id) => roles[id] === role && (!alive || alive.has(id)));

/** ذبح عشوائي للمافيا بالسيناريوهات: مو زميل ولا الساحر (عشان السيناريو ما يخرب لو مات الساحر بالصدفة) */
const mafiaRandomPick = (options: { id: string }[], roles: Record<string, MafiaRole>, originalRoles: Record<string, MafiaRole>, avoid: (string | undefined)[] = []) => {
  const opts = options.filter((o) => roles[o.id] !== "mafia" && originalRoles[o.id] !== "magician" && !avoid.includes(o.id));
  return opts.length ? opts[Math.floor(Math.random() * opts.length)].id : undefined;
};

async function magicianScenarios() {
  const base = (mode: "hype" | "fast"): MafiaSettings => ({ maxPlayers: 9, mafiaCount: 2, optionalRoles: ["magician", "soldier", "journalist"], mode });

  for (const mode of ["hype", "fast"] as const) {
    for (const target of ["detective", "doctor", "soldier"] as const) {
      // المافيا تذبح صاحب الفئة بالليلة الأولى (الجندي: الليلة 1 درعه، الليلة 2 يموت)، والطبيب يحمي غيره.
      // الليلة اللي بعدها الساحر يختار الفئة ويستخدمها بنفس الليلة.
      const scenario: Scenario = {
        name: `${mode}: الساحر ياخذ ${ROLE_LABELS[target]}`,
        hostRole: "magician",
        pick: ({ step, options, alive, roles, originalRoles }) => {
          if (step === "mafia") {
            const t = byRole(originalRoles, target, alive);
            return t && options.some((o) => o.id === t) ? t : mafiaRandomPick(options, roles, originalRoles);
          }
          if (step === "doctor") {
            // الطبيب الأصلي يحمي أي أحد غير الهدف (عشان الذبح ينجح)؛ الساحر-الطبيب يحمي عشوائي
            const t = byRole(originalRoles, target, alive);
            const safe = options.filter((o) => o.id !== t);
            return safe.length ? safe[Math.floor(Math.random() * safe.length)].id : undefined;
          }
          if (step === "magician") {
            const want = options.find((o) => o.name === ROLE_LABELS[target]);
            return want ? want.id : null;
          }
          return undefined;
        },
        // عشان الجولة ما تنتهي بسرعة: التصويت تخطي دايماً
        vote: () => null,
      };
      const sim = new MafiaSim(CALM, Math.random);
      const { code, players } = await sim.setup(base(mode), HOST_USER);
      const r = await sim.playRound(code, players, HOST_USER, scenario, scenario.name);
      const m = r.magician!;
      const acts = sim.db.rows("mafia_actions").filter((a) => a.room_code === code);
      const magicianId = players.find((p) => p.isHost)!.id;
      const pickRow = acts.find((a) => a.actor_id === magicianId && a.step === "magician" && a.target_id);
      const slainRow = acts.find((a) => a.step === "slain:night");
      const sameNightAct = pickRow ? acts.find((a) => a.actor_id === magicianId && a.night === pickRow.night && a.step === target) : null;
      const secret = sim.db.rows("mafia_secrets").find((s) => s.player_id === magicianId);
      const finalRole = secret?.role;
      // السريع: شاشة وحدة — بطاقة وحدة، والشخص بنفس الطلب (الجندي: الدرع بس، ودرعه جديد —
      // إلا لو المافيا ضربوه بليلة بعدها فراح الدرع الجديد)
      const fastOk = mode !== "fast" || (m.fastCards === 1 && m.pickedWithPerson === (target !== "soldier"));
      const hitLater = Boolean(pickRow) && acts.some((a) => a.step === "mafia" && a.target_id === magicianId && (a.night as number) > (pickRow!.night as number));
      const shieldOk = target !== "soldier" || secret?.soldier_shield_used === false || hitLater;
      const detail = `عُرض=${m.offered} اختار=${m.picked ? ROLE_LABELS[m.picked] : "-"} بليلة ${m.pickedNight ?? "-"} | الميت بالليل مسجّل=${Boolean(slainRow)} | فئته بالنهاية=${finalRole} | تعليق=${r.hang ?? "-"} | مخالفات=${r.violations.length}${mode === "fast" ? ` | بطاقات الشاشة=${m.fastCards} مع شخص=${m.pickedWithPerson}` : ""}`;
      const needsAct = target !== "soldier";
      const pass = Boolean(pickRow) && m.picked === target && (!needsAct || Boolean(sameNightAct) || m.diedSameNight) && fastOk && shieldOk && !r.hang && r.violations.length === 0;
      if (pass) ok(`${scenario.name}: ${detail}${needsAct ? ` | لعب بها بنفس الليلة=${Boolean(sameNightAct)}` : " | درع جديد"}`);
      else fail(`${scenario.name}: ${detail} | لعب بها بنفس الليلة=${Boolean(sameNightAct)} ${r.violations.slice(0, 3).join("; ")}`);
      for (const t of Object.keys(sim.db.tables)) sim.db.tables[t] = sim.db.tables[t].filter((row) => row.room_code !== code);
    }

    // انفجار المنتقم بالليل يفتح البطاقة مثل ذبح المافيا (اللي طلع بالتصويت ما يفتحها — فحصها تحت).
    // المحقق/الطبيب: المنتقم يختارهم، والمافيا تذبح المنتقم بالليلة 1 فينفجر عليهم. الجندي: الليلة 1 المافيا تاخذ درعه،
    // والليلة 2 المنتقم يختاره والمافيا تذبح المنتقم. الطبيب الأصلي يحمي غيرهم عشان الانفجار ما ينحبس.
    for (const target of ["detective", "doctor", "soldier"] as const) {
      const bombNight = target === "soldier" ? 2 : 1;
      const scenario: Scenario = {
        name: `${mode}: ${ROLE_LABELS[target]} يموت بانفجار المنتقم — الساحر ياخذ بطاقته الليلة اللي بعدها`,
        hostRole: "magician",
        pick: ({ step, options, alive, roles, originalRoles, night }) => {
          const victim = byRole(originalRoles, target, alive);
          const avenger = byRole(originalRoles, "suicide", alive);
          if (step === "suicide") {
            // الجندي: الليلة 1 هدف ثاني (ما يختار نفس الهدف ليلتين)، والليلة 2 الجندي
            if (target === "soldier" && night < bombNight) {
              const other = options.filter((o) => o.id !== victim);
              return other.length ? other[0].id : undefined;
            }
            return victim && options.some((o) => o.id === victim) ? victim : undefined;
          }
          if (step === "mafia") {
            if (target === "soldier" && night === 1) return victim && options.some((o) => o.id === victim) ? victim : undefined;
            if (night === bombNight) return avenger && options.some((o) => o.id === avenger) ? avenger : undefined;
            return mafiaRandomPick(options, roles, originalRoles);
          }
          if (step === "doctor") {
            const safe = options.filter((o) => o.id !== victim && o.id !== avenger && originalRoles[o.id] !== "doctor");
            return safe.length ? safe[Math.floor(Math.random() * safe.length)].id : undefined;
          }
          if (step === "magician") {
            const want = options.find((o) => o.name === ROLE_LABELS[target]);
            return want ? want.id : null;
          }
          return undefined;
        },
        vote: () => null,
      };
      const sim = new MafiaSim(CALM, Math.random);
      const settings: MafiaSettings = { maxPlayers: 9, mafiaCount: 2, optionalRoles: ["magician", "soldier", "suicide"], mode };
      const { code, players } = await sim.setup(settings, HOST_USER);
      const r = await sim.playRound(code, players, HOST_USER, scenario, scenario.name);
      const m = r.magician!;
      const acts = sim.db.rows("mafia_actions").filter((a) => a.room_code === code);
      const originalRoles = sim.originalRoles(code);
      const victimId = byRole(originalRoles, target);
      const avengerId = byRole(originalRoles, "suicide");
      const magicianId = players.find((p) => p.isHost)!.id;
      const kill = acts.find((a) => a.night === bombNight && a.step === "mafia");
      const slain = acts.find((a) => a.step === "slain:night" && a.actor_id === victimId);
      const bombMorning = r.mornings.find((x) => x.night === bombNight);
      const bombAnnounced = Boolean(bombMorning?.kinds.includes("bomb")) && Boolean(bombMorning?.targets.includes(victimId ?? ""));
      const pickRow = acts.find((a) => a.actor_id === magicianId && a.step === "magician" && a.target_id);
      const detail = `المافيا ذبحوا المنتقم بالليلة ${bombNight}=${kill?.target_id === avengerId} | الانفجار أخذ ${ROLE_LABELS[target]}=${bombAnnounced} | مسجّل ميت بالليل=${Boolean(slain)} (ليلة ${slain?.night ?? "-"}) | الساحر اختار=${m.picked ? ROLE_LABELS[m.picked] : "-"} بليلة ${m.pickedNight ?? "-"} | ليالي=${r.nights} | مخالفات=${r.violations.length}`;
      const pass = kill?.target_id === avengerId && bombAnnounced && slain?.night === bombNight && m.picked === target && m.pickedNight === bombNight + 1 && Boolean(pickRow) && !r.hang && r.violations.length === 0;
      if (pass) ok(`${scenario.name}: ${detail}`);
      else fail(`${scenario.name}: ${detail} | ${r.hang ?? ""} ${r.violations.slice(0, 3).join("; ")}`);
      for (const t of Object.keys(sim.db.tables)) sim.db.tables[t] = sim.db.tables[t].filter((row) => row.room_code !== code);
    }

    // الساحر يصير جندي (درع جديد): الليلة 1 المافيا تاخذ درع الجندي، والليلة 2 يموت، والليلة 3 الساحر ياخذ بطاقته.
    //  same:  المافيا يهاجمونه بنفس ليلة اختياره (3) → ينجو بإعلان الجندي، والليلة 4 مرة ثانية بدون درع → يموت
    //  later: ما يهاجمونه ليلة اختياره (درعه يظل)، والليلة 4 → ينجو مرة، والليلة 5 → يموت
    // الطبيب يحمي واحد من المافيا دايماً (عشان ما يخرب الهجوم)، والتصويت تخطي.
    for (const variant of ["same", "later"] as const) {
      const pickNight = 3;
      const firstHit = variant === "same" ? pickNight : pickNight + 1;
      const scenario: Scenario = {
        name: `${mode}: الساحر يصير جندي — ${variant === "same" ? "يهاجمونه بنفس الليلة ثم مرة ثانية" : "ما يهاجمونه ليلتها، ثم مرتين بعدها"}`,
        hostRole: "magician",
        pick: ({ step, options, alive, roles, originalRoles, night }) => {
          const soldier = byRole(originalRoles, "soldier", alive);
          const magician = byRole(originalRoles, "magician", alive);
          if (step === "mafia") {
            if (night < pickNight) return soldier && options.some((o) => o.id === soldier) ? soldier : undefined;
            if (night >= firstHit) return magician && options.some((o) => o.id === magician) ? magician : undefined;
            return mafiaRandomPick(options, roles, originalRoles);
          }
          if (step === "doctor") return options.find((o) => roles[o.id] === "mafia")?.id;
          if (step === "magician") return options.find((o) => o.name === ROLE_LABELS.soldier)?.id ?? null;
          return undefined;
        },
        vote: () => null,
      };
      const sim = new MafiaSim(CALM, Math.random);
      const { code, players } = await sim.setup({ maxPlayers: 9, mafiaCount: 2, optionalRoles: ["magician", "soldier"], mode }, HOST_USER);
      const r = await sim.playRound(code, players, HOST_USER, scenario, scenario.name);
      const host = players.find((p) => p.isHost)!;
      const m = r.magician!;
      const morning = (n: number) => r.mornings.find((x) => x.night === n);
      const soldierLine = `المافيا حاولوا يذبحون ${host.name}… بس طلع الجندي ودافع عن نفسه ونجا!`;
      const savedBySoldier = (n: number) => Boolean(morning(n)?.texts.some((t, i) => t === soldierLine && morning(n)!.kinds[i] === "soldier"));
      const killed = (n: number) => Boolean(morning(n)?.kinds.some((k, i) => k === "kill" && morning(n)!.targets[i] === host.id));
      const shieldAt = (n: number) => morning(n)?.shieldUsed[host.id];
      const problems: string[] = [];
      if (r.hang) problems.push(`تعليق: ${r.hang}`);
      if (r.violations.length) problems.push(`مخالفات: ${r.violations.slice(0, 2).join("; ")}`);
      if (m.picked !== "soldier" || m.pickedNight !== pickNight) problems.push(`اختار ${m.picked ?? "-"} بليلة ${m.pickedNight ?? "-"} (المتوقع الجندي بليلة ${pickNight})`);
      if (variant === "later") {
        if (savedBySoldier(pickNight) || killed(pickNight)) problems.push("انهاجم ليلة اختياره وهو المفروض لا");
        if (shieldAt(pickNight) !== false) problems.push(`درعه بعد ليلة اختياره: ${shieldAt(pickNight) === undefined ? "مو جندي" : "راح"} (المتوقع باقي)`);
      }
      if (!savedBySoldier(firstHit)) problems.push(`ما طلع إعلان الجندي الصحيح بصباح الليلة ${firstHit}: ${JSON.stringify(morning(firstHit)?.texts ?? [])}`);
      if (killed(firstHit)) problems.push(`مات بالليلة ${firstHit} ودرعه جديد`);
      if (shieldAt(firstHit) !== true) problems.push(`درعه بعد أول هجوم: ${shieldAt(firstHit) === false ? "باقي" : "؟"} (المتوقع راح)`);
      if (!killed(firstHit + 1)) problems.push(`ما مات بالهجوم الثاني (الليلة ${firstHit + 1}): ${JSON.stringify(morning(firstHit + 1)?.texts ?? [])}`);
      const detail = `اختار ${m.picked ? ROLE_LABELS[m.picked] : "-"} بليلة ${m.pickedNight ?? "-"} | الدرع بعد ليلة الاختيار: ${shieldAt(pickNight) === false ? "باقي" : shieldAt(pickNight) ? "راح" : "-"} | نجا بإعلان الجندي بليلة ${firstHit}=${savedBySoldier(firstHit)} | مات بالهجوم الثاني (ليلة ${firstHit + 1})=${killed(firstHit + 1)}`;
      if (problems.length) fail(`${scenario.name}: ${problems.join(" | ")} | ${detail}`);
      else ok(`${scenario.name}: ${detail}`);
      for (const t of Object.keys(sim.db.tables)) sim.db.tables[t] = sim.db.tables[t].filter((row) => row.room_code !== code);
    }

    // الحالات الخاصة
    const offeredNames = new Set<string>();
    const special: { name: string; scenario: Scenario; check: (r: GameResult, sim: MafiaSim, code: string, players: Truth[]) => string | null }[] = [
      {
        name: `${mode}: المحقق طلع بالتصويت — الساحر ما يُعرض عليه`,
        scenario: {
          name: "vote",
          hostRole: "magician",
          pick: ({ step, options, roles, alive, originalRoles }) => {
            if (step === "magician") for (const o of options) offeredNames.add(o.name);
            if (step === "mafia") {
              // المافيا ما يذبحون المحقق أبداً
              const d = byRole(originalRoles, "detective", alive);
              const opts = options.filter((o) => o.id !== d && roles[o.id] !== "mafia");
              return opts.length ? opts[Math.floor(Math.random() * opts.length)].id : undefined;
            }
            if (step === "magician") return options[0]?.id ?? null;
            return undefined;
          },
          vote: (p, round, roles) => (round === 1 ? byRole(roles, "detective") ?? null : null),
        },
        check: () => (offeredNames.has(ROLE_LABELS.detective) ? "عُرض على الساحر مكان محقق طلع بالتصويت" : null),
      },
      {
        name: `${mode}: الساحر ما يختار — الخيار يظل له الليلة الجاية`,
        scenario: {
          name: "decline",
          hostRole: "magician",
          pick: ({ step, options, alive, roles, originalRoles, night }) => {
            if (step === "mafia") {
              const t = byRole(originalRoles, "detective", alive);
              return t && options.some((o) => o.id === t) ? t : mafiaRandomPick(options, roles, originalRoles);
            }
            if (step === "doctor") {
              const t = byRole(originalRoles, "detective", alive);
              const safe = options.filter((o) => o.id !== t);
              return safe.length ? safe[0].id : undefined;
            }
            if (step === "magician") return night <= 2 ? null : options[0]?.id ?? null;
            return undefined;
          },
          vote: () => null,
        },
        check: (r, sim, code, players) => {
          const magicianId = players.find((p) => p.isHost)!.id;
          const acts = sim.db.rows("mafia_actions").filter((a) => a.room_code === code && a.actor_id === magicianId && a.step === "magician");
          const skipped = acts.filter((a) => !a.target_id).map((a) => a.night);
          const picked = acts.find((a) => a.target_id);
          if (!skipped.length) return "ما عدّى ولا ليلة";
          if (!picked) return `عدّى الليالي ${skipped.join(",")} وما انعرض عليه بعدها (مات؟ ${!sim.aliveIds(code).has(magicianId)})`;
          if ((picked.night as number) <= Math.max(...(skipped as number[]))) return "اختار قبل ما يعدّي؟";
          return null;
        },
      },
      {
        name: `${mode}: جوال الساحر ما توصله الشاشة — ما يختار النظام عنه ويظل الخيار`,
        scenario: {
          name: "offline",
          hostRole: "magician",
          pick: ({ step, options, alive, roles, originalRoles }) => {
            if (step === "mafia") {
              const t = byRole(originalRoles, "detective", alive);
              return t && options.some((o) => o.id === t) ? t : mafiaRandomPick(options, roles, originalRoles);
            }
            if (step === "doctor") {
              const t = byRole(originalRoles, "detective", alive);
              const safe = options.filter((o) => o.id !== t);
              return safe.length ? safe[0].id : undefined;
            }
            return undefined;
          },
          ackDelay: (p, night, roles) => (roles[p.id] === "magician" && night === 2 ? Infinity : undefined),
          vote: () => null,
        },
        check: (r, sim, code, players) => {
          const magicianId = players.find((p) => p.isHost)!.id;
          const acts = sim.db.rows("mafia_actions").filter((a) => a.room_code === code && a.actor_id === magicianId);
          const auto2 = acts.find((a) => a.night === 2 && a.step === "magician");
          if (auto2) return "النظام اختار عن الساحر وهو ما وصلته الشاشة";
          const missed = acts.find((a) => a.night === 2 && a.step === "missed:magician");
          if (!missed) return "ما انسجّل إن مهمته ما وصلته بالليلة 2";
          const later = acts.find((a) => (a.night as number) >= 3 && a.step === "magician" && a.target_id);
          if (!later && sim.aliveIds(code).has(magicianId) && r.nights >= 3) return "ما انعرض عليه الخيار بالليلة 3";
          return null;
        },
      },
      {
        name: `${mode}: الساحر يختار البطاقة ويموت بنفس الليلة`,
        scenario: {
          name: "dies",
          hostRole: "magician",
          pick: ({ step, options, alive, originalRoles, night }) => {
            if (step === "mafia") {
              const t = night === 1 ? byRole(originalRoles, "detective", alive) : byRole(originalRoles, "magician", alive);
              return t && options.some((o) => o.id === t) ? t : undefined;
            }
            if (step === "doctor") {
              const t = night === 1 ? byRole(originalRoles, "detective", alive) : byRole(originalRoles, "magician", alive);
              const safe = options.filter((o) => o.id !== t);
              return safe.length ? safe[0].id : undefined;
            }
            if (step === "magician") return options.find((o) => o.name === ROLE_LABELS.detective)?.id ?? null;
            return undefined;
          },
          vote: () => null,
        },
        check: (r, sim, code, players) => {
          const magicianId = players.find((p) => p.isHost)!.id;
          const m = r.magician!;
          if (!m.picked) return "ما اختار";
          if (sim.aliveIds(code).has(magicianId) && r.winner === null) return "ما مات";
          const final = sim.room(code).final_roles?.find((f) => f.playerId === magicianId);
          if (final && final.originalRole !== "magician") return "الفئة الأصلية ضاعت";
          // صباح ليلة اختياره: إعلان موته + "الساحر اختار فئة" مع بعض (لو ما انتهت اللعبة بتلك الليلة)
          const morning = r.mornings.find((x) => x.night === m.pickedNight);
          if (morning) {
            if (!morning.kinds.includes("kill") || !morning.targets.includes(magicianId)) return "ما طلع إعلان موت الساحر";
            if (morning.kinds.filter((k) => k === "magic").length !== 1) return `إعلان الساحر طلع ${morning.kinds.filter((k) => k === "magic").length} مرة`;
            if (morning.kinds.indexOf("magic") < morning.kinds.indexOf("kill")) return "إعلان الساحر قبل إعلان موته";
          } else if (r.winner === null) return "ما فيه صباح بعد ليلة اختياره";
          return null;
        },
      },
      {
        name: `${mode}: ماتوا اثنين قبل ما يختار — يختار وحدة بس`,
        scenario: {
          name: "two",
          hostRole: "magician",
          pick: ({ step, options, alive, roles, originalRoles, night }) => {
            if (step === "mafia") {
              const t = night === 1 ? byRole(originalRoles, "detective", alive) : night === 2 ? byRole(originalRoles, "doctor", alive) : undefined;
              return t && options.some((o) => o.id === t) ? t : mafiaRandomPick(options, roles, originalRoles);
            }
            if (step === "doctor") {
              const t = byRole(originalRoles, "detective", alive);
              const safe = options.filter((o) => o.id !== t && !originalRoles[o.id]?.startsWith("doc"));
              return safe.length ? safe[0].id : undefined;
            }
            if (step === "magician") return night <= 2 ? null : options.length === 2 ? options[1].id : options[0]?.id ?? null;
            return undefined;
          },
          vote: () => null,
        },
        check: (r, sim, code, players) => {
          const magicianId = players.find((p) => p.isHost)!.id;
          const acts = sim.db.rows("mafia_actions").filter((a) => a.room_code === code && a.actor_id === magicianId && a.step === "magician" && a.target_id);
          if (acts.length !== 1) return `اختار ${acts.length} مرة`;
          const later = sim.db.rows("mafia_actions").some((a) => a.room_code === code && a.actor_id === magicianId && a.step === "magician" && (a.night as number) > (acts[0].night as number));
          if (later) return "انعرض عليه الاختيار مرة ثانية بعد ما اختار";
          // السريع: شاشة وحدة ببطاقتين، واختار البطاقة والشخص بطلب واحد
          if (mode === "fast" && r.magician!.fastCards !== 2) return `بطاقات الشاشة الواحدة=${r.magician!.fastCards} (المتوقع 2)`;
          if (mode === "fast" && !r.magician!.pickedWithPerson) return "ما اختار الشخص مع البطاقة بنفس الطلب";
          return null;
        },
      },
    ];
    for (const s of special) {
      const sim = new MafiaSim(CALM, Math.random);
      const { code, players } = await sim.setup(base(mode), HOST_USER);
      const r = await sim.playRound(code, players, HOST_USER, s.scenario, s.name);
      const problem = r.hang ? `تعليق: ${r.hang}` : r.violations.length ? `مخالفات: ${r.violations.slice(0, 2).join("; ")}` : s.check(r, sim, code, players);
      const m = r.magician!;
      const magicMornings = r.mornings.filter((x) => x.kinds.includes("magic")).map((x) => x.night);
      const detail = `عُرض=${m.offered} اختار=${m.picked ? ROLE_LABELS[m.picked] : "-"} بليلة ${m.pickedNight ?? "-"} | إعلان الساحر بصباح الليالي [${magicMornings.join(",")}] | ليالي=${r.nights} فائز=${r.winner}`;
      if (problem) fail(`${s.name}: ${problem} | ${detail}`);
      else ok(`${s.name}: ${detail}`);
      for (const t of Object.keys(sim.db.tables)) sim.db.tables[t] = sim.db.tables[t].filter((row) => row.room_code !== code);
    }
  }
}

// ---------------------------------------------------------------------
// انتقال قرار المافيا: ضغطة تمويه بلحظة الانتقال ما تنحسب قتل
// ---------------------------------------------------------------------

/**
 * قائد المافيا ما وصلته شاشة الليلة الأولى، فينتقل القرار لعضو ثاني شاشته على سؤال التمويه. ضغطته
 * توصل السيرفر كتمويه (على لاعب X) قبل الانتقال، أو بنفس اللحظة، أو بعده. وبعد ما يمر تجاهل الضغط
 * (ثانية ونص) يختار القتل على لاعب ثاني Y. لازم بكل الحالات: القتل على Y بس، ومن البديل، وما فيه
 * قتل على X أبداً. التمويه اللي وصل قبل الانتقال ينحفظ تمويه، واللي وصل بعده يرفضه السيرفر.
 */
async function handoverScenarios() {
  const variants = [
    { name: "التمويه وصل قبل الانتقال", offsetMs: -400, runs: QUICK ? 3 : 8 },
    { name: "بنفس اللحظة", offsetMs: 0, runs: QUICK ? 8 : 40 },
    { name: "التمويه وصل بعد الانتقال", offsetMs: 400, runs: QUICK ? 3 : 8 },
  ];
  const outcomes = { saved: 0, rejected: 0 };
  for (const mode of ["hype", "fast"] as const) {
    for (const variant of variants) {
      const problems: string[] = [];
      const local = { saved: 0, rejected: 0 };
      for (let i = 0; i < variant.runs; i++) {
        // دورات عشوائية بالقاعدة الوهمية: ترتيب الطلبين المتزامنين يتغير من جولة لجولة
        const sim = new MafiaSim(CALM, Math.random, 0, 4);
        const { code, players } = await sim.setup({ maxPlayers: 9, mafiaCount: 3, optionalRoles: [], mode }, HOST_USER);
        let leader1: string | null | undefined;
        const baseLeader = () => (leader1 ??= mafiaLeaderId(sim.engineOf(code), 1, sim.room(code).settings.leadSeed));
        let X: string | undefined;
        let Y: string | undefined;
        const targets = (roles: Record<string, MafiaRole>) => {
          if (!X) {
            const town = players.filter((p) => roles[p.id] !== "mafia");
            X = town[0].id;
            Y = town[1].id;
          }
          return { X: X!, Y: Y! };
        };
        const scenario: Scenario = {
          name: `${mode}: ${variant.name}`,
          // القائد ما توصله الشاشة، وعضوين المافيا الثانيين توصلهم بنفس اللحظة (فيطلبون القرار بنفس اللحظة:
          // "قبل/بعد الانتقال" بالنسبة للطلبين كلهم)
          ackDelay: (p, night, roles) => (night !== 1 ? undefined : p.id === baseLeader() ? Infinity : roles[p.id] === "mafia" ? 500 : undefined),
          decoyAtClaim: (p, night, roles) => (night === 1 ? { target: targets(roles).X, offsetMs: variant.offsetMs } : undefined),
          pick: ({ step, night, options, roles }) => {
            if (night !== 1) return undefined;
            if (step === "mafia") return targets(roles).Y;
            // الطبيب يحمي واحد من المافيا: القتل ينزل
            if (step === "doctor") return options.find((o) => roles[o.id] === "mafia")?.id;
            return undefined;
          },
        };
        const r = await sim.playRound(code, players, HOST_USER, scenario, scenario.name);
        const acts = sim.db.rows("mafia_actions").filter((a) => a.room_code === code && a.night === 1);
        const standIn = acts.find((a) => a.step === "lead:mafia")?.target_id as string | undefined;
        const kill = acts.find((a) => a.step === "mafia");
        const mine = r.decoyAtClaim.find((d) => d.night === 1 && d.playerId === standIn);
        const morning1 = r.mornings.find((x) => x.night === 1);
        const tag = `جولة ${i + 1}`;
        if (r.hang) problems.push(`${tag}: تعليق ${r.hang}`);
        if (r.violations.length) problems.push(`${tag}: ${r.violations.slice(0, 2).join("; ")}`);
        if (!standIn) problems.push(`${tag}: القرار ما انتقل`);
        else if (!kill) problems.push(`${tag}: ما فيه قتل بالليلة 1`);
        else if (kill.actor_id !== standIn) problems.push(`${tag}: القتل من غير البديل`);
        else if (kill.target_id === X) problems.push(`${tag}: ضغطة التمويه انحسبت قتل!`);
        else if (kill.target_id !== Y) problems.push(`${tag}: القتل على غير المختار`);
        if (acts.some((a) => a.step === "mafia" && a.target_id === X)) problems.push(`${tag}: فيه قتل على هدف التمويه`);
        if (morning1 && !morning1.targets.includes(Y)) problems.push(`${tag}: إعلان الصباح ما ذبح المختار`);
        if (!mine) problems.push(`${tag}: ضغطة التمويه ما انرسلت`);
        else local[mine.outcome]++;
      }
      // قبل الانتقال لازم ينحفظ تمويه، وبعده لازم يرفضه السيرفر
      if (variant.offsetMs < 0 && local.rejected) problems.push(`تمويه وصل قبل الانتقال ورفضه السيرفر ${local.rejected} مرة`);
      if (variant.offsetMs > 0 && local.saved) problems.push(`تمويه وصل بعد الانتقال وانحفظ ${local.saved} مرة`);
      outcomes.saved += local.saved;
      outcomes.rejected += local.rejected;
      const line = `${mode}: ${variant.name} — ${variant.runs} جولة | التمويه انحفظ تمويه ${local.saved} | رفضه السيرفر ${local.rejected} | القتل على المختار من البديل بكل الجولات`;
      if (problems.length) fail(`${mode}: ${variant.name}: ${problems.slice(0, 5).join(" | ")}`);
      else ok(line);
    }
  }
  if (!outcomes.saved || !outcomes.rejected) fail(`ما انختبرت الحالتين: انحفظ ${outcomes.saved} ورُفض ${outcomes.rejected}`);
}

/**
 * إعادة الإرسال: كل اختيار ليل وكل جواب تمويه وكل صوت وكل ضغطة منشئ (ابدأ، تخطي، ابدأ النقاش، ذبح الغشاش/الممنوع،
 * جولة جديدة) ينرسل مرتين — نصها بنفس اللحظة (السيرفر بطيء والأول للحين يكتب)، ونصها بعد ما رد الأول
 * (المرحلة ممكن تغيّرت). لازم الإعادة ترجع نفس الرد، وما يتغير شي: الصوت ينحسب مرة، والغرفة ما تتخطى مرحلة.
 */
async function resendGames() {
  const n = QUICK ? 60 : 300;
  const configs: MafiaSettings[] = [
    { maxPlayers: 11, mafiaCount: 3, optionalRoles: ["magician", "journalist", "soldier", "suicide", "silencer", "sheikh"], mode: "fast" },
    { maxPlayers: 11, mafiaCount: 3, optionalRoles: ["magician", "journalist", "soldier", "suicide", "silencer", "sheikh"], mode: "hype" },
  ];
  for (const settings of configs) {
    const agg = newAgg();
    const resends = { together: 0, later: 0, hostTogether: 0, hostLater: 0, voteTogether: 0, voteLater: 0, sheikhTogether: 0, sheikhLater: 0, sheikhStale: 0 };
    const sim = new MafiaSim({ ...CALM, resend: 1, hostKill: 0.2 }, rnd, 0, 4);
    const sum = (r: GameResult) => {
      for (const k of Object.keys(resends) as (keyof typeof resends)[]) resends[k] += r.resends[k];
    };
    for (let i = 0; i < n; i++) {
      const r = await oneGame(sim, settings);
      add(agg, r);
      sum(r);
    }
    // "جولة جديدة" بنفس الغرفة (بإعادتها): 3 جولات ورا بعض
    const rooms = QUICK ? 5 : 20;
    for (let i = 0; i < rooms; i++) {
      const { code, players } = await sim.setup(settings, HOST_USER);
      for (let k = 0; k < 3; k++) {
        if (k > 0) {
          const again = await sim.playAgain(code, HOST_USER);
          agg.violations.push(...again.violations);
          resends.hostTogether += again.hostTogether;
          resends.hostLater += again.hostLater;
        }
        const r = await sim.playRound(code, players, HOST_USER, undefined, label(settings) + " again");
        add(agg, r);
        sum(r);
        clock.advance(60_000);
      }
      for (const t of Object.keys(sim.db.tables)) sim.db.tables[t] = sim.db.tables[t].filter((row) => row.room_code !== code);
    }
    const line =
      `${label(settings)}: ${agg.games} جولة كل طلب فيها ينرسل مرتين | الليل: بنفس اللحظة ${resends.together}، بعد الرد ${resends.later}` +
      ` | المنشئ: ${resends.hostTogether} / ${resends.hostLater} | الأصوات: ${resends.voteTogether} / ${resends.voteLater}` +
      ` | الشيخ: ${resends.sheikhTogether} / ${resends.sheikhLater}، ومن صباح قديم ${resends.sheikhStale} | فائز ${JSON.stringify(agg.winners)}`;
    const problems = [
      ...(agg.hangs.length ? [`تعليق ${agg.hangs.length}: ${agg.hangs.slice(0, 3).join("; ")}`] : []),
      ...(agg.winners.none ? [`${agg.winners.none} جولة بدون فائز`] : []),
      ...(agg.violations.length ? [`${agg.violations.length} مخالفة: ${[...new Set(agg.violations)].slice(0, 6).join(" | ")}`] : []),
    ];
    if (problems.length) fail(`${line}\n  ${problems.join("\n  ")}`);
    else ok(line);
  }
}

/**
 * كل كتابة على الغرفة فيها موعد نهاية (انتقال مرحلة، أو بداية مؤقت الليل السريع) تعلق بالطريق 10–20 ثانية
 * (الساعة الوهمية تتقدم قبل ما توصل القاعدة). المتوقع مع 0019: لحظة ما تنكتب، الباقي = مدة المرحلة كاملة،
 * والأصوات قبل نهاية الوقت الكامل بثانية تنقبل. وعلى قاعدة بدون 0019 نفس الجولات لازم تطلع المشكلة.
 */
async function lateWriteGames() {
  const n = QUICK ? 30 : 150;
  /** المدة المتوقعة لكل نوع كتابة (من الإعدادات نفسها) */
  const expected = (kind: string, settings: MafiaSettings): number | null => {
    const sec: Record<string, number> = {
      reveal: MAFIA_CONFIG.ROLE_REVEAL_MAX_SECONDS,
      night_done: MAFIA_CONFIG.NIGHT_DONE_SECONDS,
      discussion: settings.discussionSeconds ?? MAFIA_CONFIG.DISCUSSION_SECONDS,
      voting: MAFIA_CONFIG.VOTING_SECONDS,
      vote_result: MAFIA_CONFIG.VOTE_RESULT_SECONDS,
      night_act: MAFIA_CONFIG.FAST_ROLE_WAIT_SECONDS + MAFIA_CONFIG.FAST_NIGHT_SECONDS,
      "night_act:armed": MAFIA_CONFIG.FAST_NIGHT_SECONDS,
    };
    return kind in sec ? sec[kind] * 1000 : null;
  };
  const run = async (withTrigger: boolean, settings: MafiaSettings) => {
    const st = {
      delayed: 0,
      delayMs: 0,
      timed: 0,
      full: 0,
      short: 0,
      worstShortMs: 0,
      noFrom: [] as string[],
      durWrong: [] as string[],
      byKind: {} as Record<string, number>,
      rejectedVotes: 0,
      /** مؤقت الليل السريع انكتب أكثر من مرة بنفس الليلة (لازم يبدأ مرة وحدة) */
      doubleArm: 0,
    };
    const armedSeen = new Set<string>();
    const agg = newAgg();
    const sim = new MafiaSim(CALM, rnd);
    sim.voteLate = true;
    sim.db.deadlineAtWrite = withTrigger;
    sim.db.beforeRoomUpdate = (patch) => {
      if (!("phase_ends_at" in patch)) return;
      const ms = 10_000 + Math.floor(rnd() * 10_000);
      // توصل عند لحظة حسابها + تأخيرها: كتابات طلعت بنفس اللحظة تتأخر مع بعض (مو ورا بعض) مثل الواقع
      const from = typeof patch.updated_at === "string" ? Date.parse(patch.updated_at) : Date.now();
      clock.to(from + ms);
      st.delayed++;
      st.delayMs += ms;
    };
    sim.db.afterRoomUpdate = (rows, patch) => {
      for (const r of rows) {
        if ("phase_seq" in patch) sim.landedAt.set(`${r.room_code}:${r.phase_seq}`, Date.now());
        if (!patch.phase_ends_at) continue;
        const kind = "phase_seq" in patch ? String(r.phase) : `${r.phase}:armed`;
        st.timed++;
        st.byKind[kind] = (st.byKind[kind] ?? 0) + 1;
        if (kind.endsWith(":armed")) {
          const key = `${r.room_code}:${r.phase_seq}`;
          if (armedSeen.has(key)) st.doubleArm++;
          armedSeen.add(key);
        }
        if (!("updated_at" in patch)) {
          st.noFrom.push(kind);
          continue;
        }
        const intended = Date.parse(patch.phase_ends_at as string) - Date.parse(patch.updated_at as string);
        const want = expected(kind, r.settings as MafiaSettings);
        if (want !== intended) st.durWrong.push(`${kind}: ${intended} بدل ${want}`);
        const left = Date.parse(r.phase_ends_at as string) - Date.now();
        if (Math.abs(left - intended) <= 5) st.full++;
        else {
          st.short++;
          st.worstShortMs = Math.max(st.worstShortMs, intended - left);
        }
      }
    };
    for (let i = 0; i < n; i++) {
      const r = await oneGame(sim, settings);
      st.rejectedVotes += r.violations.filter((x) => x.startsWith("تصويت مرفوض")).length;
      add(agg, r);
    }
    return { st, agg };
  };
  const configs: MafiaSettings[] = [
    { maxPlayers: 11, mafiaCount: 3, optionalRoles: ["magician", "journalist", "soldier", "suicide", "silencer", "sheikh"], mode: "fast" },
    { maxPlayers: 11, mafiaCount: 3, optionalRoles: ["magician", "journalist", "soldier", "suicide", "silencer", "sheikh"], mode: "hype" },
  ];
  for (const settings of configs) {
    const { st, agg } = await run(true, settings);
    const kinds = Object.entries(st.byKind)
      .map(([k, c]) => `${k} ${c}`)
      .join("، ");
    const line =
      `${label(settings)}: ${agg.games} جولة | ${st.delayed} كتابة تأخرت (معدل ${(st.delayMs / Math.max(1, st.delayed) / 1000).toFixed(1)} ث)` +
      ` | مراحل بمؤقت ${st.timed} (${kinds}) | وصلت بوقتها كامل ${st.full} | فائز ${JSON.stringify(agg.winners)}`;
    const problems = [
      ...(st.timed === 0 ? ["ما فيه ولا مرحلة بمؤقت"] : []),
      ...(st.short ? [`${st.short} مرحلة وصلت ناقصة (أسوأها ${(st.worstShortMs / 1000).toFixed(1)} ث)`] : []),
      ...(st.doubleArm ? [`مؤقت الليل السريع انكتب مرتين بنفس الليلة ${st.doubleArm} مرة`] : []),
      ...(st.noFrom.length ? [`كتابة موعد بدون لحظة حسابها: ${[...new Set(st.noFrom)].join("، ")}`] : []),
      ...(st.durWrong.length ? [`مدة غلط: ${[...new Set(st.durWrong)].slice(0, 5).join("، ")}`] : []),
      ...(agg.hangs.length ? [`تعليق ${agg.hangs.length}: ${agg.hangs.slice(0, 3).join("; ")}`] : []),
      ...(agg.winners.none ? [`${agg.winners.none} جولة بدون فائز`] : []),
      ...(agg.violations.length ? [`${agg.violations.length} مخالفة: ${[...new Set(agg.violations)].slice(0, 6).join(" | ")}`] : []),
    ];
    if (problems.length) fail(`${line}\n  ${problems.join("\n  ")}`);
    else ok(`${line} | الأصوات قبل نهاية الوقت الكامل بثانية انقبلت كلها`);

    // نفس الجولات على قاعدة بدون 0019: لازم يبان الفرق، وإلا القسم ما يفحص شي
    const before = await run(false, settings);
    const detected = before.st.short > 0 && before.st.rejectedVotes > 0;
    const bline =
      `${label(settings)} بدون 0019: ${before.st.short} من ${before.st.timed} مرحلة وصلت ناقصة (أسوأها ${(before.st.worstShortMs / 1000).toFixed(1)} ث)` +
      ` | ${before.st.rejectedVotes} صوت انرفض | تعليق ${before.agg.hangs.length}`;
    if (detected) ok(`القسم يكشف المشكلة — ${bline}`);
    else fail(`القسم ما كشف المشكلة على قاعدة بدون 0019 — ${bline}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
