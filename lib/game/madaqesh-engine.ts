import { MADAQESH_CONFIG, formatMoney } from "@/constants/madaqesh";
import type {
  MadaqeshBid,
  MadaqeshBidKind,
  MadaqeshDecision,
  MadaqeshResponse,
  MadaqeshRound,
  MadaqeshSettings,
} from "@/types/madaqesh";

// =====================================================================
// محرك حاسبة مداقش — حسابات بحتة بدون قاعدة بيانات، عشان تنختبر لحالها.
//
// القوانين باختصار:
// - السوم دورة وحدة. كل لاعب: يرفع (أقل فتح 1000، وبعدها مضاعفات 500 فوق
//   أعلى سومة، وفي حدود رصيده)، أو يدخل بكل فلوسه لو ما تكفي لأقل سومة، أو ينسحب.
//   أعلى سومة = صاحب القرار.
// - "سومة" كل لاعب = المبلغ اللي يداقش عليه. اللي انسحب من السوم ما يداقش.
// - صاحب القرار (سومته B): يوزع B (بالتساوي أو على مزاجه) والباقي له،
//   ويقدر يثبّت لاعبين / يعطي فرصة انسحاب / يخلي الجميع ثابت.
// - المداقشة: المنشئ يسجّل صاحب أقوى ورق (أو تعادل بين أكثر من واحد).
//     فاز صاحب القرار: كل اللي داقشوه ينخصم منهم سومتهم، والتوزيعة تعتمد،
//       وهو ياخذ B ناقص اللي وزعه.
//     فاز لاعب: ياخذ سومته (ولو داخل بكل فلوسه ياخذ B)، وصاحب القرار ينخصم B،
//       والباقين ينخصم منهم سومتهم، والتوزيعة تنلغي.
//     تعادل مع صاحب القرار: المتعادلين على رصيدهم، والخسرانين ينخصم منهم،
//       والتوزيعة تنلغي.
//     تعادل بين المداقشين: يتقاسمون B، وصاحب القرار ينخصم B، والخسرانين ينخصم منهم.
// - اللي يوصل صفر يرجع 5000 وتنحسب عليه "إفلاسة"، ولو خلصت فرصه يطلع.
// =====================================================================

export interface MadaqeshEnginePlayer {
  id: string;
  seat: number;
  balance: number;
  bankrupts: number;
  is_out: boolean;
}

// ---------------------------------------------------------------------
// ترتيب الجولة
// ---------------------------------------------------------------------

/** بادئ الجولة الجاية: أول لاعب باقي بعد بادئ الجولة اللي قبل (بالدور). */
export function nextRoundOrder(players: MadaqeshEnginePlayer[], prevStarterId: string | null): string[] {
  const bySeat = [...players].sort((a, b) => a.seat - b.seat);
  const active = bySeat.filter((p) => !p.is_out);
  if (active.length === 0) return [];

  let start = 0;
  const prevIdx = prevStarterId ? bySeat.findIndex((p) => p.id === prevStarterId) : -1;
  if (prevIdx >= 0) {
    // نمشي من اللي بعده لين نلقى أول واحد باقي
    for (let step = 1; step <= bySeat.length; step++) {
      const candidate = bySeat[(prevIdx + step) % bySeat.length];
      if (!candidate.is_out) {
        start = active.findIndex((p) => p.id === candidate.id);
        break;
      }
    }
  }
  return [...active.slice(start), ...active.slice(0, start)].map((p) => p.id);
}

export function newRound(order: string[]): MadaqeshRound {
  return { order, turn: 0, bids: {}, deciderId: null, decision: null, responses: {}, result: null };
}

// ---------------------------------------------------------------------
// السوم
// ---------------------------------------------------------------------

export function currentHighBid(round: MadaqeshRound): number {
  return Math.max(0, ...Object.values(round.bids).filter((b) => b.kind !== "pass").map((b) => b.amount));
}

export function currentBidderId(round: MadaqeshRound): string | null {
  return round.turn < round.order.length ? round.order[round.turn] : null;
}

/** أقل سومة مسموحة الحين: الفتح 1000، وبعدها أول مضاعف لـ 500 فوق أعلى سومة */
export function minBid(round: MadaqeshRound): number {
  const step = MADAQESH_CONFIG.BID_STEP;
  const high = currentHighBid(round);
  return Math.max(MADAQESH_CONFIG.MIN_OPEN_BID, (Math.floor(high / step) + 1) * step);
}

/** يدخل بكل فلوسه: بس لو رصيده ما يكفي لأقل سومة مسموحة */
export function canAllIn(round: MadaqeshRound, balance: number): boolean {
  return balance > 0 && balance < minBid(round);
}

export function validateBid(
  round: MadaqeshRound,
  balance: number,
  kind: MadaqeshBidKind,
  amount: number
): { ok: true; bid: MadaqeshBid } | { ok: false; error: string } {
  if (kind === "pass") return { ok: true, bid: { amount: 0, kind: "pass" } };
  if (kind === "allin") {
    if (!canAllIn(round, balance)) return { ok: false, error: "تقدر تسوم — الدخول بكل فلوسك بس لو رصيدك ما يكفي لأقل سومة." };
    return { ok: true, bid: { amount: balance, kind: "allin" } };
  }
  const min = minBid(round);
  const step = MADAQESH_CONFIG.BID_STEP;
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: "اكتب مبلغ صحيح." };
  if (amount % step !== 0) return { ok: false, error: `السومة لازم تكون من مضاعفات ${formatMoney(step)}.` };
  if (amount < min) {
    return { ok: false, error: currentHighBid(round) > 0 ? `أقل سومة ${formatMoney(min)}.` : `أقل فتح للسوم ${formatMoney(min)}.` };
  }
  if (amount > balance) return { ok: false, error: "المبلغ أكثر من رصيدك." };
  return { ok: true, bid: { amount, kind: "bid" } };
}

/** أعلى سومة (والتعادل للي سام أول). null = الكل انسحبوا */
export function pickDecider(round: MadaqeshRound): string | null {
  let best: string | null = null;
  let bestAmount = 0;
  round.order.forEach((id) => {
    const b = round.bids[id];
    if (b && b.kind !== "pass" && b.amount > bestAmount) {
      best = id;
      bestAmount = b.amount;
    }
  });
  return best;
}

/** سومة اللاعب = المبلغ اللي يداقش عليه (0 = ما سام / انسحب) */
export function stakeOf(round: MadaqeshRound, playerId: string): number {
  const b = round.bids[playerId];
  return b && b.kind !== "pass" ? b.amount : 0;
}

/** اللي سامو (غير صاحب القرار) — هم بس اللي يقدرون يداقشون */
export function stakedOpponents(round: MadaqeshRound): string[] {
  return round.order.filter((id) => id !== round.deciderId && stakeOf(round, id) > 0);
}

// ---------------------------------------------------------------------
// قرار صاحب أعلى سومة
// ---------------------------------------------------------------------

/**
 * قسمة مبلغ بالتساوي: كل واحد نفس الحصة (مضاعفات 500 لتحت)،
 * والباقي كله لصاحب أقل رصيد بينهم (لو تساووا: الأول بالترتيب).
 * مثال: 10000 على 3 = 3000 لكل واحد، و 4000 لصاحب أقل رصيد.
 */
export function splitEvenly(
  total: number,
  ids: string[],
  balanceOf: (id: string) => number,
  unit: number = MADAQESH_CONFIG.SPLIT_UNIT
): Record<string, number> {
  if (ids.length === 0) return {};
  const each = Math.floor(total / ids.length / unit) * unit;
  const rest = total - each * ids.length;
  const poorest = ids.reduce((a, b) => (balanceOf(b) < balanceOf(a) ? b : a));
  return Object.fromEntries(ids.map((id) => [id, each + (id === poorest ? rest : 0)]));
}

/**
 * التوزيع بالتساوي: السومة تتقسم على صاحب القرار واللي ياخذون، والباقي لصاحب أقل رصيد.
 * يرجع أنصبة اللي ياخذون بس — نصيب صاحب القرار هو اللي يبقى من السومة.
 */
export function equalShares(
  total: number,
  recipientIds: string[],
  deciderId: string,
  balanceOf: (id: string) => number
): Record<string, number> {
  const all = splitEvenly(total, [deciderId, ...recipientIds], balanceOf);
  return Object.fromEntries(recipientIds.map((id) => [id, all[id]]));
}

export function sumShares(shares: Record<string, number>): number {
  return Object.values(shares).reduce((a, b) => a + b, 0);
}

export function validateDecision(
  round: MadaqeshRound,
  decision: MadaqeshDecision
): { ok: true; decision: MadaqeshDecision } | { ok: false; error: string } {
  const deciderId = round.deciderId;
  if (!deciderId) return { ok: false, error: "ما فيه صاحب قرار." };
  const total = stakeOf(round, deciderId);
  const staked = new Set(stakedOpponents(round));

  if (decision.mode !== "distribute") {
    return { ok: true, decision: { mode: decision.mode, shares: {}, fixed: [] } };
  }

  const fixed = Array.from(new Set(decision.fixed)).filter((id) => staked.has(id));
  if (fixed.length !== new Set(decision.fixed).size) return { ok: false, error: "تقدر تثبّت بس اللي سامو." };

  const shares: Record<string, number> = {};
  for (const [id, raw] of Object.entries(decision.shares)) {
    // اللي انسحب من السوم ما ياخذ شي — التوزيع بس على اللي سامو
    if (!staked.has(id) || fixed.includes(id)) continue;
    if (!Number.isInteger(raw) || raw < 0) return { ok: false, error: "مبالغ التوزيع لازم تكون أرقام صحيحة." };
    if (raw > 0) shares[id] = raw;
  }
  if (sumShares(shares) > total) return { ok: false, error: "وزعت أكثر من سومتك." };
  return { ok: true, decision: { mode: "distribute", shares, fixed } };
}

// ---------------------------------------------------------------------
// ردود اللاعبين
// ---------------------------------------------------------------------

/** مين لازم يرد، ووش خياراته */
export function respondersFor(round: MadaqeshRound): { id: string; options: MadaqeshResponse[] }[] {
  const d = round.decision;
  if (!d) return [];
  if (d.mode === "withdraw") return stakedOpponents(round).map((id) => ({ id, options: ["withdraw", "stay"] }));
  if (d.mode === "all_fixed") return [];
  // التوزيع: كل اللي سامو وما انثبّتوا يقدرون يعترضون — حتى لو نصيبهم صفر
  return stakedOpponents(round)
    .filter((id) => !d.fixed.includes(id))
    .map((id) => ({ id, options: ["accept", "object"] }));
}

/** الرد الافتراضي لو انعتمد بدون ما يرد */
export function defaultResponse(round: MadaqeshRound): MadaqeshResponse {
  return round.decision?.mode === "withdraw" ? "withdraw" : "accept";
}

export function responseOf(round: MadaqeshRound, id: string): MadaqeshResponse {
  return round.responses[id] ?? defaultResponse(round);
}

/** اللي بيداقشون صاحب القرار */
export function contestants(round: MadaqeshRound): string[] {
  const d = round.decision;
  if (!d) return [];
  if (d.mode === "all_fixed") return stakedOpponents(round);
  if (d.mode === "withdraw") return stakedOpponents(round).filter((id) => responseOf(round, id) === "stay");
  const objectors = respondersFor(round)
    .map((r) => r.id)
    .filter((id) => responseOf(round, id) === "object");
  return [...d.fixed, ...objectors];
}

// ---------------------------------------------------------------------
// حساب الجولة
// ---------------------------------------------------------------------

export interface MadaqeshSettlement {
  deltas: Record<string, number>;
  updates: { id: string; balance: number; bankrupts: number; is_out: boolean }[];
  revived: string[];
  eliminated: string[];
}

/** الفايزين المعتمدين: بس اللي في المداقشة (صاحب القرار واللي داقشوه)، بدون تكرار */
export function showdownWinners(round: MadaqeshRound, winnerIds: string[]): string[] {
  if (!round.deciderId) return [];
  const inShowdown = new Set([round.deciderId, ...contestants(round)]);
  return [...new Set(winnerIds)].filter((id) => inShowdown.has(id));
}

/**
 * winnerIds: صاحب أقوى ورق بين صاحب القرار واللي داقشوه — أو أكثر من واحد لو تعادل.
 * لو ما فيه أحد يداقش (أو ما انسجّل فايز)، النتيجة كأن صاحب القرار فاز (التوزيعة تعتمد).
 */
export function settleRound(
  round: MadaqeshRound,
  players: MadaqeshEnginePlayer[],
  winnerIds: string[],
  settings: Pick<MadaqeshSettings, "maxBankrupts">
): MadaqeshSettlement {
  const deltas: Record<string, number> = {};
  const add = (id: string, n: number) => {
    if (n !== 0) deltas[id] = (deltas[id] ?? 0) + n;
  };
  const balanceOf = (id: string) => players.find((p) => p.id === id)?.balance ?? 0;

  const deciderId = round.deciderId;
  if (deciderId && round.decision) {
    const total = stakeOf(round, deciderId);
    const fighters = contestants(round);
    const winners = showdownWinners(round, winnerIds);
    const losers = fighters.filter((id) => !winners.includes(id));
    const deciderWins = fighters.length === 0 || winners.length === 0 || (winners.length === 1 && winners[0] === deciderId);

    if (deciderWins) {
      // التوزيعة تعتمد للي رضوا، وصاحب القرار ياخذ الباقي
      let paid = 0;
      if (round.decision.mode === "distribute") {
        Object.entries(round.decision.shares).forEach(([id, amount]) => {
          if (fighters.includes(id)) return; // اعترض = داقش، ما ياخذ نصيب
          add(id, amount);
          paid += amount;
        });
      }
      add(deciderId, total - paid);
      fighters.forEach((id) => add(id, -stakeOf(round, id)));
    } else if (winners.includes(deciderId)) {
      // تعادل مع صاحب القرار: المتعادلين على رصيدهم، والتوزيعة تنلغي، والخسرانين ينخصم منهم
      losers.forEach((id) => add(id, -stakeOf(round, id)));
    } else {
      // فاز لاعب (أو أكثر): صاحب القرار ينخصم سومته كاملة، والتوزيعة تنلغي، والخسرانين ينخصم منهم
      add(deciderId, -total);
      losers.forEach((id) => add(id, -stakeOf(round, id)));
      if (winners.length === 1) {
        // ياخذ سومته — إلا لو داخل بكل فلوسه: ياخذ فلوس صاحب القرار
        const w = winners[0];
        add(w, round.bids[w]?.kind === "allin" ? total : stakeOf(round, w));
      } else {
        // تعادل بين المداقشين: يتقاسمون فلوس صاحب القرار
        Object.entries(splitEvenly(total, winners, balanceOf)).forEach(([id, n]) => add(id, n));
      }
    }
  }

  const revived: string[] = [];
  const eliminated: string[] = [];
  const updates = players.map((p) => {
    let balance = p.balance + (deltas[p.id] ?? 0);
    let bankrupts = p.bankrupts;
    let is_out = p.is_out;
    if (!p.is_out && balance <= 0) {
      bankrupts += 1;
      if (bankrupts > settings.maxBankrupts) {
        is_out = true;
        balance = 0;
        eliminated.push(p.id);
      } else {
        balance = MADAQESH_CONFIG.REVIVE_BALANCE;
        revived.push(p.id);
      }
    }
    return { id: p.id, balance, bankrupts, is_out };
  });

  return { deltas, updates, revived, eliminated };
}

/** الفائز: أول واحد يوصل المبلغ (لو أكثر من واحد بنفس الجولة: الأعلى)، أو آخر واحد باقي */
export function checkMadaqeshWinner(
  players: { id: string; balance: number; is_out: boolean }[],
  target: number
): string | null {
  const active = players.filter((p) => !p.is_out);
  const reached = active.filter((p) => p.balance >= target).sort((a, b) => b.balance - a.balance);
  if (reached.length > 0) return reached[0].id;
  if (active.length === 1) return active[0].id;
  return null;
}
