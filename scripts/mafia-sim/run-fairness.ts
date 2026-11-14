// يشغّل فحوص العدالة ويطبع الجداول.
// الاستخدام: npx tsx --tsconfig scripts/mafia-sim/tsconfig.json scripts/mafia-sim/run-fairness.ts [games] [--deck]
// --deck: توزيع البطاقات بس (القسم 1) — للإعادة بعدد كبير (مثلاً 100000) لما يطلع إعداد بانحراف بين 4 و5
import { deckFairness, flowFairness, fmtSeats, leaderFairness } from "./fairness";
import { MAFIA_OPTIONAL_ROLES } from "@/constants/mafia";
import { randomUUID } from "node:crypto";

async function main() {
  const games = Number(process.argv[2] || 10000);
  const deckOnly = process.argv.includes("--deck");
  console.log(`# 1) buildRoleDeck × ${games} لكل إعداد (المحرك الحقيقي)`);
  console.log("players mafia optional | max|z| | worst z per role | mafia count per seat");
  const t0 = performance.now();
  const deck = deckFairness(games);
  for (const r of deck) {
    console.log(
      `${String(r.players).padStart(2)} ${r.mafia} ${r.optional === "-" ? "none" : "all6"}`.padEnd(14),
      "|",
      String(r.maxAbsZ).padStart(5),
      r.biased ? "BIASED" : "ok    ",
      "|",
      Object.entries(r.worstZByRole).map(([k, v]) => `${k}=${v}`).join(" "),
      "|",
      fmtSeats(r.mafiaBySeat)
    );
  }
  const over4 = deck.filter((r) => r.biased);
  console.log(`\nمجموع الإعدادات: ${deck.length}، فوق 4: ${over4.length}${over4.length ? " — " + over4.map((r) => `${r.players}p ${r.mafia}m ${r.optional === "-" ? "none" : "all6"} (${r.maxAbsZ})`).join(", ") : ""} | أعلى |z| ${Math.max(...deck.map((r) => r.maxAbsZ))} | ${((performance.now() - t0) / 1000).toFixed(0)} ثانية`);
  if (deckOnly) return;

  console.log(`\n# 2) المسار الكامل على القاعدة الوهمية`);
  const flowGames = Math.min(games, 10000);
  for (const mode of ["hype", "fast"] as const) {
    for (const [players, mafiaCount] of [[11, 3], [8, 2], [20, 4]] as const) {
      for (const path of ["again", "newRoom"] as const) {
        const n = path === "newRoom" ? Math.min(flowGames, 2000) : flowGames;
        // الفئات الإضافية بقدر ما يسمح العدد (كل فئة تاخذ مكان مواطن)
        const optionalRoles = MAFIA_OPTIONAL_ROLES.slice(0, Math.min(MAFIA_OPTIONAL_ROLES.length, players - mafiaCount - 2));
        const r = await flowFairness(n, { maxPlayers: players, mafiaCount, optionalRoles: [...optionalRoles], mode }, path);
        console.log(`${mode} ${r.label} ${players}p ${mafiaCount}m × ${n}: max|z|=${r.maxAbsZ} ${r.biased ? "BIASED" : "ok"} | mafia/seat ${fmtSeats(r.mafiaBySeat)} | roles ${Object.entries(r.worstZByRole).map(([k, v]) => `${k}=${v}`).join(" ")}`);
      }
    }
  }

  console.log(`\n# 3) قائد المافيا بالليلة الأولى × ${games}`);
  for (const [players, mafiaCount] of [[7, 2], [11, 3], [16, 4]] as const) {
    for (const seeded of [false, true]) {
      const r = leaderFairness(games, { maxPlayers: players, mafiaCount, optionalRoles: [] }, () => (seeded ? randomUUID() : undefined));
      console.log(
        `${players}p ${mafiaCount}m ${r.label}: القائد = أقل مقعد بين المافيا ${(r.night1LowestSeatShare * 100).toFixed(1)}% (المتوقع العادل ${(100 / mafiaCount).toFixed(1)}%) | المنشئ يقود لما يكون مافيا ${(r.hostLeadsWhenMafiaShare * 100).toFixed(1)}% | حسب ترتيب المقعد بين المافيا [${r.night1ByMafiaRank.join(", ")}] | max|z| على المقاعد ${r.maxAbsZ} ${r.biased ? "BIASED" : "ok"}`
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
