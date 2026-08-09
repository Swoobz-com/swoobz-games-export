import { describe, expect, it } from 'vitest';
import {
  applyCampaignExchange,
  CAMPAIGN_NODES,
  CAMPAIGN_NODE_COUNT,
  campaignPayout,
  defenseAmount,
  evaluateCampaignMatch,
  formatMult,
  formatWinChance,
  getCampaignNode,
  guardAmount,
  matchWinProbability,
  MAX_MULT_BPS,
  nodeRtpPercent,
  campaignRtpRange,
  roundWinProbability,
} from './fightCampaign';
import { CPU_WIN_BPS } from './fightStakes';
import { applyExchange, createMatch, startNextRound } from './fightEngine';
import type { MatchState } from './fightEngine';

// ── Independent first-principles recomputation (never reuses the module's formulas) ──────────
// q(S) = P(player lands 3+S decisive hits before taking 3) on a fair coin, by direct recursion
// over (hitsStillNeeded, livesLeft) with exact bigint rationals.
function qOf(shield: number): { num: bigint; den: bigint } {
  const rec = (need: number, lives: number): { num: bigint; den: bigint } => {
    if (need === 0) return { num: 1n, den: 1n };
    if (lives === 0) return { num: 0n, den: 1n };
    const a = rec(need - 1, lives);
    const b = rec(need, lives - 1);
    // (a + b) / 2
    return { num: a.num * b.den + b.num * a.den, den: 2n * a.den * b.den };
  };
  return rec(3 + shield, 3);
}

// A SECOND derivation of the same q, structurally unrelated to the first — a new rung must never
// be accepted on one method's word. Conditioned on being decisive an exchange is a fair coin, and
// the race is always settled inside (3+S)+3-1 = S+5 decisive exchanges, so padding it to exactly
// S+5 tosses cannot change who got there first: q(S) = P(at least 3+S heads in S+5 fair tosses).
// Three binomial terms, one per enemy life. No recursion, nothing shared with qOf.
function binom(n: number, k: number): bigint {
  let r = 1n;
  for (let i = 0n; i < BigInt(k); i += 1n) r = (r * (BigInt(n) - i)) / (i + 1n);
  return r;
}
function qBinomial(shield: number): { num: bigint; den: bigint } {
  const tosses = shield + 5;
  let num = 0n;
  for (let heads = 3 + shield; heads <= tosses; heads += 1) num += binom(tosses, heads);
  return { num, den: 2n ** BigInt(tosses) };
}

// P(match) = P(reach R round wins before the enemy does), rounds independent with win prob q.
function matchPOf(q: { num: bigint; den: bigint }, roundsToWin: number): { num: bigint; den: bigint } {
  const rec = (w1: number, w2: number): { num: bigint; den: bigint } => {
    if (w1 >= roundsToWin) return { num: 1n, den: 1n };
    if (w2 >= roundsToWin) return { num: 0n, den: 1n };
    const win = rec(w1 + 1, w2);
    const lose = rec(w1, w2 + 1);
    // q*win + (1-q)*lose
    const num = q.num * win.num * lose.den + (q.den - q.num) * lose.num * win.den;
    return { num, den: q.den * win.den * lose.den };
  };
  return rec(0, 0);
}

function ratEq(a: { num: bigint; den: bigint }, b: { num: bigint; den: bigint }): boolean {
  return a.num * b.den === b.num * a.den;
}

describe('exact round-win probabilities q (regression vs first-principles recursion)', () => {
  // RE-DERIVED, not restated: two methods that share no subexpression must land on the same
  // rational for every defense the ladder can express (0..3). This is the acceptance condition for
  // a money number — a single derivation agreeing with itself proves nothing.
  it('the recursion and the binomial closed form agree on q(0..3)', () => {
    for (const S of [0, 1, 2, 3]) {
      expect(ratEq(qOf(S), qBinomial(S)), `q(${S}) disagrees between the two derivations`).toBe(true);
    }
  });
  it('q(0) = 1/2, q(1) = 11/32, q(2) = 29/128, q(3) = 37/256', () => {
    expect(ratEq(qOf(0), { num: 1n, den: 2n })).toBe(true);
    expect(ratEq(qOf(1), { num: 11n, den: 32n })).toBe(true);
    expect(ratEq(qOf(2), { num: 29n, den: 128n })).toBe(true);
    // The DEFENCE +3 finale rung (Tim, 2026-08-04): (C(8,6)+C(8,7)+C(8,8))/256 = (28+8+1)/256.
    expect(ratEq(qOf(3), { num: 37n, den: 256n })).toBe(true);
  });
});

describe('matchWinProbability — closed forms match independent enumeration + the exact fractions', () => {
  const CASES: { amount: number; r: 2 | 3; frac: { num: bigint; den: bigint } }[] = [
    { amount: 0, r: 2, frac: { num: 1n, den: 2n } },
    { amount: 0, r: 3, frac: { num: 1n, den: 2n } },
    { amount: 1, r: 2, frac: { num: 4477n, den: 16384n } },
    { amount: 1, r: 3, frac: { num: 3784033n, den: 16777216n } },
    { amount: 2, r: 2, frac: { num: 137083n, den: 1048576n } },
    { amount: 2, r: 3, frac: { num: 1380490567n, den: 17179869184n } },
    // The finale rung's q feeds BOTH closed forms, so both are pinned (only to3 is on the ladder).
    { amount: 3, r: 2, frac: { num: 475043n, den: 8388608n } },
    { amount: 3, r: 3, frac: { num: 13207617791n, den: 549755813888n } },
  ];
  for (const c of CASES) {
    it(`P(S=${c.amount}, first-to-${c.r}) = ${c.frac.num}/${c.frac.den}`, () => {
      const p = matchWinProbability(c.amount, c.r);
      expect(ratEq(p, c.frac)).toBe(true); // the module's closed form
      expect(ratEq(matchPOf(qOf(c.amount), c.r), c.frac)).toBe(true); // independent enumeration
    });
  }
  it('both formats are exactly fair (1/2) with no defense — the symmetric coin race', () => {
    expect(ratEq(matchWinProbability(0, 2), { num: 1n, den: 2n })).toBe(true);
    expect(ratEq(matchWinProbability(0, 3), { num: 1n, den: 2n })).toBe(true);
  });
});

describe('the node ladder (phase 17) — formats, defenses, multipliers', () => {
  it('has exactly 10 nodes with sequential ids', () => {
    expect(CAMPAIGN_NODE_COUNT).toBe(10);
    expect(CAMPAIGN_NODES.map((n) => n.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
  it('ladder rows are exactly the agreed table (format / defense kind+amount / multBps)', () => {
    const rows = CAMPAIGN_NODES.map((n) => [n.id, n.roundsToWin, n.defense?.kind ?? 'none', defenseAmount(n), n.multBps] as const);
    // DIFFICULTY CURVE SHIFTED LEFT BY TWO NODES (Tim, 2026-08-03): the old ladder spent FOUR of
    // ten nodes on the easiest rung (1-4 all to2/none/50%), so the first 40% of the campaign was
    // flat. Nodes 3-9 each moved up one rung and kept the multBps their config already carried.
    //
    // DEFENCE +3 FINALE (Tim, 2026-08-04). Map 10 used to sit on maps 8-9's rung shape — same
    // defense (+2), differing only by format — so the ladder's top was one rung wearing two hats.
    // It now owns rung six: defense 3 / first-to-3 / P = 2.4024% / x39.95. The comment that used to
    // stand here said this was impossible ("node 10 was already at the engine's ceiling:
    // defense.amount is typed 1 | 2 and matchWinProbability throws on 3"). Both were widened and
    // ROUND_Q gained q(3) = 37/256. The one NEW number, 399590n, is DERIVED from P and the 96%
    // ceiling in that order (proven in the finale describe below), never chosen to look nice.
    //
    // THE 1.32x -> 4.00x PAYOUT LADDER (Tim, 2026-08-07: "go from 1.32 first round to 4x make it
    // ladder", plus "dont change the win % keep them the same"). Every DIFFICULTY below is
    // byte-identical to the previous ladder — not one defense or format moved — and ALL TEN prices
    // were rewritten as even multiplicative steps (ratio ~1.131) from 13200n to 40000n.
    // This DECOUPLES payout from odds everywhere, so RTP is no longer ~96% on any node: it runs
    // 66.0 / 74.6 / 46.1 / 52.1 / 59.0 / 55.1 / 62.3 / 40.8 / 46.2 / 9.6, mean 51.2%. Non-monotonic
    // because the price climbs smoothly while the win chances step down in chunks. That is the
    // decision, not a defect; the pinned-returns test below is what keeps it exact.
    expect(rows).toEqual([
      [1, 2, 'none', 0, 13200n],
      [2, 2, 'none', 0, 14930n],
      [3, 2, 'bulk', 1, 16890n],
      [4, 2, 'shield', 1, 19100n],
      [5, 2, 'bulk', 1, 21610n],
      [6, 3, 'shield', 1, 24440n],
      [7, 3, 'bulk', 1, 27640n],
      [8, 2, 'shield', 2, 31260n],
      [9, 2, 'bulk', 2, 35360n],
      [10, 3, 'shield', 3, MAX_MULT_BPS],
    ]);
  });
  it('THE PRICING LAW: bounded by the fair 96% price AND by the 4.00x cap, and the cap binds exactly', () => {
    // Re-derives itself if a difficulty ever changes. NOTE the uncapped rows are not exactly the fair
    // price — the original ladder chose slightly more conservative multiples (node 3 pays 35120n where
    // fair is 35132n, i.e. 95.97% not 96.00%). So the law is an upper BOUND, not an equality; the
    // 95.85% floor test above is what stops an uncapped row drifting too far the other way.
    for (const n of CAMPAIGN_NODES) {
      const p = matchWinProbability(defenseAmount(n), n.roundsToWin, guardAmount(n));
      const fair = (9600n * p.den) / p.num; // price returning exactly 96% at this P
      expect(n.multBps <= fair, `node ${n.id} pays ${n.multBps} > fair ${fair} (over 96%)`).toBe(true);
      expect(n.multBps <= MAX_MULT_BPS, `node ${n.id} pays ${n.multBps} > cap ${MAX_MULT_BPS}`).toBe(true);
    }
    // THE LADDER: price never DROPS as the fight gets harder, and the top rung is exactly Tim's cap.
    // Tiers C/D/E are deliberately priced BELOW their ceilings (3.70x / 3.85x against 4.26x / 7.34x /
    // 39.96x) — that headroom is what lets the price ascend at all once the cap is in place, so there
    // is no "must equal fair" rule and no RTP floor. Equal difficulty keeps an equal price.
    for (let i = 1; i < CAMPAIGN_NODES.length; i += 1) {
      const prev = CAMPAIGN_NODES[i - 1];
      const cur = CAMPAIGN_NODES[i];
      expect(cur.multBps >= prev.multBps, `node ${cur.id} pays less than node ${prev.id}`).toBe(true);
    }
    expect(CAMPAIGN_NODES[CAMPAIGN_NODE_COUNT - 1].multBps).toBe(MAX_MULT_BPS);
    // Exactly one node sits at the cap, and it is the finale — or the ladder has a flat top.
    expect(CAMPAIGN_NODES.filter((n) => n.multBps === MAX_MULT_BPS).map((n) => n.id)).toEqual([10]);
    // TEN distinct prices, STRICTLY ascending, opening at 1.32x and closing at the 4.00x cap.
    expect(new Set(CAMPAIGN_NODES.map((n) => n.multBps)).size).toBe(10);
    expect(CAMPAIGN_NODES[0].multBps).toBe(13200n);
    for (let i = 1; i < CAMPAIGN_NODES.length; i += 1) {
      expect(CAMPAIGN_NODES[i].multBps > CAMPAIGN_NODES[i - 1].multBps, `node ${i + 1} must pay strictly more`).toBe(true);
    }
  });

  it('the general two-knob formula reproduces the RETIRED ROUND_Q table exactly', () => {
    // roundWinProbability replaced a hardcoded table when the player-guard knob landed. The retired
    // values are kept HERE as the regression oracle, so the generalisation is proven rather than
    // trusted — with guard 0 it must return the four numbers the ladder was priced from.
    expect(roundWinProbability(0, 0)).toEqual({ num: 1n, den: 2n });
    expect(roundWinProbability(1, 0)).toEqual({ num: 11n, den: 32n });
    expect(roundWinProbability(2, 0)).toEqual({ num: 29n, den: 128n });
    expect(roundWinProbability(3, 0)).toEqual({ num: 37n, den: 256n });
    // Guard is the mirror of absorb: equal buffers are a symmetric fight, so q is exactly 1/2.
    for (const k of [0, 1, 2, 3, 5]) expect(roundWinProbability(k, k)).toEqual({ num: 1n, den: 2n });
    // And guard strictly HELPS the player at a fixed absorb.
    const a = roundWinProbability(2, 0);
    const b = roundWinProbability(2, 1);
    expect(Number(b.num) / Number(b.den)).toBeGreaterThan(Number(a.num) / Number(a.den));
  });
  it('no node pays more than the 4.00x cap', () => {
    for (const n of CAMPAIGN_NODES) expect(n.multBps <= MAX_MULT_BPS, `node ${n.id} pays ${n.multBps}`).toBe(true);
    // The cap must actually BIND somewhere, or this test and the law above are vacuous.
    expect(CAMPAIGN_NODES.some((n) => n.multBps === MAX_MULT_BPS)).toBe(true);
  });
  it('difficulty never goes DOWN as the map advances (monotonic curve)', () => {
    // The property Tim actually asked for. A later node must never be EASIER than an earlier one —
    // this is what stops a future ladder edit from silently creating a soft spot late in the run.
    let prev = 1;
    for (const n of CAMPAIGN_NODES) {
      const p = matchWinProbability(defenseAmount(n), n.roundsToWin);
      const pWin = Number(p.num) / Number(p.den);
      expect(pWin).toBeLessThanOrEqual(prev + 1e-9);
      prev = pWin;
    }
  });
  it('no node returns MORE than 96% (the ceiling survives the cap)', () => {
    // The ceiling is still the law: the house never gives an edge away. The FLOOR is deliberately
    // gone — the 4.00x cap pushes five nodes below it on purpose (down to 9.6%), so a lower bound
    // here would just be a test asserting the design is something Tim decided it is not. The exact
    // per-node returns are pinned in the test below instead, which catches drift without pretending
    // the ladder is uniform.
    for (const n of CAMPAIGN_NODES) {
      const p = matchWinProbability(defenseAmount(n), n.roundsToWin, guardAmount(n));
      expect(n.multBps * p.num <= 9600n * p.den, `node ${n.id} returns more than 96%`).toBe(true);
    }
  });
  it('EVERY node is -EV at EVERY stake — this is what makes the stake lock unnecessary', () => {
    // ⚠ THIS TEST IS MORE THAN IT LOOKS: it is the load-bearing justification for DELETING the
    // campaign stake lock (Tim, 2026-08-09). That lock wiped a run whenever the player raised their
    // stake above the one the run was played at, and it existed to stop "conquer nodes cheap at $1,
    // then cash a big multiplier at $25". Under the 4.00x cap that threat does not exist: the BEST
    // node in the game returns 74.6%, so cashing at a high stake is simply a worse bet, not a better
    // one. There is no stake, and no order of play, that turns campaign progress into an edge.
    //
    // So if this test ever fails, the deletion is no longer safe. Any re-tune that lifts a node to or
    // above 100% re-opens the exploit and the lock (or an equivalent) has to come back WITH it.
    // The wipe cost a real player a real run before it was removed; do not restore it casually, and
    // do not lift a node past 100% without restoring something.
    for (const n of CAMPAIGN_NODES) {
      const p = matchWinProbability(defenseAmount(n), n.roundsToWin, guardAmount(n));
      // RTP = P x mult. Strictly below 1.0 means the player loses money in expectation, always.
      expect(
        n.multBps * p.num < 10_000n * p.den,
        `node ${n.id} returns >= 100% — it is now +EV, so removing the stake lock is UNSAFE`,
      ).toBe(true);
    }
  });
  it('the per-node RETURN is exactly this, and the map/card disclose it', () => {
    // Pinned so a price or difficulty edit cannot quietly move what the player is told. These are the
    // numbers nodeRtpPercent() renders on the node card and campaignRtpRange() renders on the map.
    // NON-MONOTONIC BY CONSTRUCTION: the price climbs smoothly while the win chances step down in
    // chunks, so the ratio saws (node 2 returns 74.6%, node 3 returns 46.1%). Pinned so a price edit
    // cannot quietly move what the player is told.
    expect(CAMPAIGN_NODES.map((n) => nodeRtpPercent(n))).toEqual([
      '66.0', '74.6', '46.1', '52.1', '59.0', '55.1', '62.3', '40.8', '46.2', '9.6',
    ]);
    expect(campaignRtpRange()).toEqual({ min: '9.6', max: '74.6' });
    // And the displayed number must never OVERSTATE the real return (it floors).
    for (const n of CAMPAIGN_NODES) {
      const shown = Number(nodeRtpPercent(n)) / 100;
      const p = matchWinProbability(defenseAmount(n), n.roundsToWin, guardAmount(n));
      const real = (Number(p.num) / Number(p.den)) * Number(n.multBps) / 10000;
      expect(shown, `node ${n.id} shows ${shown} but returns ${real}`).toBeLessThanOrEqual(real + 1e-9);
    }
  });
  it('same-config nodes share one price, and a harder rung always pays MORE (singletons included)', () => {
    // DERIVED, NOT INDEXED. This used to assert CAMPAIGN_NODES[4] === [5] and [6] === [7] — the
    // array positions that happened to be same-config pairs under one layout. Re-shaping the curve
    // moved every node and it then compared a to2 price against a to3 price. Grouping by
    // (defenseAmount, roundsToWin) states the actual invariant and cannot go stale.
    const byConfig = new Map<string, { prices: bigint[]; p: number }>();
    for (const n of CAMPAIGN_NODES) {
      const key = `${defenseAmount(n)}:${n.roundsToWin}`;
      const exact = matchWinProbability(defenseAmount(n), n.roundsToWin);
      const entry = byConfig.get(key) ?? { prices: [], p: Number(exact.num) / Number(exact.den) };
      entry.prices.push(n.multBps);
      byConfig.set(key, entry);
    }
    // ONE-PRICE-PER-CONFIG IS GONE (Tim, 2026-08-07: ten distinct prices over five distinct win
    // chances requires it). Nodes 3/4/5 are the same 27.3254% fight paying 1.68x/1.91x/2.16x. What
    // must still hold is the CEILING on every one of them, which the loop below asserts.
    for (const [key, { prices }] of byConfig) {
      expect(prices.length, `config ${key} must hold at least one node`).toBeGreaterThan(0);
    }
    // TEETH FOR A SINGLETON CONFIG. "One price per config" is VACUOUSLY true of a config holding a
    // single node — which map 10 became the moment it got its own defense-3 rung. Three assertions
    // below hold a lone row to account; each is stated over the DERIVED price, so none of them can
    // be satisfied by copying a literal out of the row above.
    const rungs = [...byConfig.entries()]
      .map(([key, v]) => ({ key, p: v.p, price: v.prices[0] }))
      .sort((a, b) => b.p - a.p); // easiest first
    expect(rungs.length, 'the ladder must expose more than one rung or this check is vacuous too').toBeGreaterThan(1);

    // (1) LADDER CONVENTION: every price is a whole multiple of 10 bps. Fires on a singleton and
    // on a price nobody else shares — the one rule the per-config grouping cannot see.
    for (const r of rungs) {
      expect(r.price % 10n, `config ${r.key} price ${r.price} must be a multiple of 10 bps`).toBe(0n);
    }
    // (2) THE CEILING ONLY. The old "house edge is uniform across the ladder" floor (95.85%) is GONE:
    // the 4.00x cap forces tiers C/D/E to be priced below what their difficulty is worth, so a floor
    // would fail the shipped ladder by design. The exact per-tier returns are pinned by the
    // nodeRtpPercent test instead, which catches drift without asserting uniformity that no longer
    // exists. The ceiling survives — the house never hands an edge away at any rung.
    for (const r of rungs) {
      const p = matchWinProbability(Number(r.key.split(':')[0]), Number(r.key.split(':')[1]) as 2 | 3);
      const rtpTimes1e4 = (r.price * p.num * 10000n) / (100n * p.den); // RTP %, truncated to 4dp
      expect(rtpTimes1e4 <= 960000n, `config ${r.key} returns ${Number(rtpTimes1e4) / 1e4}% — above the 96% ceiling`).toBe(true);
      expect(rtpTimes1e4 > 0n, `config ${r.key} must return something`).toBe(true);
    }
    // (3) ORDERING ACROSS CONFIGS, CAP-AWARE: harder pays more UNTIL the cap binds, and once two
    // rungs are both capped they pay exactly the same. The old form ("harder ALWAYS pays more") is
    // now false by design — nodes 6..10 span 22.6% down to 2.4% and all pay 4.00x — so asserting it
    // would be asserting the pre-cap ladder. What must still hold: no rung pays more than a HARDER
    // rung, i.e. price is non-increasing as the fight gets easier.
    for (let i = 1; i < rungs.length; i += 1) {
      const prev = rungs[i - 1]; // easier
      const cur = rungs[i]; // harder
      if (Math.abs(cur.p - prev.p) < 1e-12) {
        expect(cur.price, `${cur.key} and ${prev.key} are the same win chance and must share a price`).toBe(prev.price);
      } else if (prev.price === MAX_MULT_BPS) {
        // The easier rung is already at the cap, so the harder one cannot exceed it — it must EQUAL it.
        expect(cur.price, `${cur.key} is harder than a capped rung so it must also sit at the cap`).toBe(MAX_MULT_BPS);
      } else {
        expect(
          cur.price >= prev.price,
          `${cur.key} (P ${(cur.p * 100).toFixed(4)}%) is harder than ${prev.key} (P ${(prev.p * 100).toFixed(4)}%) so it must not pay LESS: got ${cur.price} vs ${prev.price}`,
        ).toBe(true);
      }
    }
  });
  it('no node carries a bonus reward (removed for now, Tim 2026-07-21)', () => {
    expect(CAMPAIGN_NODES.filter((n) => n.reward)).toEqual([]);
  });
  it('user-facing copy carries no em-dashes (RG-C5 copy law)', () => {
    for (const n of CAMPAIGN_NODES) {
      expect(n.name).not.toContain('—');
      expect(n.title).not.toContain('—');
      if (n.reward) {
        expect(n.reward.label).not.toContain('—');
        expect(n.reward.sub).not.toContain('—');
      }
    }
  });
  it('getCampaignNode resolves by id and is safe on bad ids', () => {
    expect(getCampaignNode(1)?.name).toBe('KUROHAMA DOCKS');
    expect(getCampaignNode(10)?.name).toBe('ZERO CITADEL');
    expect(getCampaignNode(10)?.defense).toEqual({ kind: 'shield', amount: 3 });
    expect(getCampaignNode(11)).toBeUndefined();
    expect(getCampaignNode(0)).toBeUndefined();
    expect(getCampaignNode(null)).toBeUndefined();
  });
});

// ── THE DEFENCE +3 FINALE (map 10, ZERO CITADEL) — the whole rung pinned end to end ──────────
// Money math gets its own describe: every step from q(3) to the pixels the player reads, with the
// price DERIVED here rather than asserted as a literal someone typed.
describe('the finale rung: defense 3 / first-to-3 (map 10, ZERO CITADEL)', () => {
  const NODE = CAMPAIGN_NODES.find((n) => n.id === 10)!;
  const P = matchWinProbability(3, 3);

  it('map 10 is defense 3 / shield / first-to-3', () => {
    expect(NODE.defense).toEqual({ kind: 'shield', amount: 3 });
    expect(NODE.roundsToWin).toBe(3);
  });

  it('q(3) = 37/256, re-derived two independent ways (never read back from the module)', () => {
    expect(ratEq(qOf(3), qBinomial(3))).toBe(true);
    expect(ratEq(qOf(3), { num: 37n, den: 256n })).toBe(true);
  });

  it('P = 13207617791/549755813888 = 2.4024%, module closed form == independent enumeration', () => {
    expect(ratEq(P, matchPOf(qOf(3), 3))).toBe(true);
    expect(ratEq(P, { num: 13207617791n, den: 549755813888n })).toBe(true);
    // Percent truncated to four decimals, in exact bigint — 2.4024%. (Rounded half-up it would be
    // 2.4025%; the ladder quotes the truncated form, and formatWinChance shows "2.4" either way.)
    expect((P.num * 100n * 10000n) / P.den).toBe(24024n);
  });

  it('its FAIR price would be 399590n, and the 4.00x cap overrides it', () => {
    // The derivation is kept because it still documents what this rung is WORTH: price follows P and
    // the 96% ceiling, in that order. What changed (Tim, 2026-08-07) is that the ladder no longer
    // pays what the rung is worth — MAX_MULT_BPS caps it at 4.00x, so the finale returns 9.6%.
    const maxBps = (9600n * P.den) / P.num;
    expect(maxBps).toBe(399591n);
    expect((maxBps + 1n) * P.num <= 9600n * P.den).toBe(false); // the fair bound is still tight
    const fairLadderPrice = (maxBps / 10n) * 10n; // ladder convention: multiples of 10
    expect(fairLadderPrice).toBe(399590n);
    // THE CAP WINS. This is the assertion that would fail if someone "restored" the fair price.
    expect(NODE.multBps).toBe(MAX_MULT_BPS);
    expect(NODE.multBps < fairLadderPrice).toBe(true);
  });

  it('RTP at the CAPPED price is 9.61% — the deliberate consequence, pinned', () => {
    expect(NODE.multBps * P.num <= 9600n * P.den).toBe(true); // ceiling still respected
    // RTP percent = multBps * num / (100 * den), truncated to four decimals in exact bigint.
    expect((NODE.multBps * P.num * 10000n) / (100n * P.den)).toBe(96098n); // 9.6098%
    expect(nodeRtpPercent(NODE)).toBe('9.6');
  });

  it('the player reads "2.4" win chance and "x4.00" pays — and is TOLD the 9.6% return', () => {
    expect(formatWinChance(3, 3)).toBe('2.4'); // difficulty untouched by the cap
    expect(formatMult(NODE.multBps)).toBe('4.00');
    expect(nodeRtpPercent(NODE)).toBe('9.6');
    // formatMult still FLOORS — the lesson that outlived the price. 399590n would read 39.95, never
    // 39.96, and toFixed(2) disagrees. Kept as a pure-function check now that no node carries it.
    expect(formatMult(399590n)).toBe('39.95');
    expect((399590 / 10000).toFixed(2)).toBe('39.96');
  });

  it('it is the hardest node AND the top of the price ladder, but the worst-RETURNING', () => {
    const pWin = Number(P.num) / Number(P.den);
    for (const n of CAMPAIGN_NODES.filter((x) => x.id !== 10)) {
      const p = matchWinProbability(defenseAmount(n), n.roundsToWin, guardAmount(n));
      expect(pWin, `node ${n.id} must be easier than the finale`).toBeLessThan(Number(p.num) / Number(p.den));
      // The finale tops the ladder at 4.00x, so it strictly out-pays every other node again.
      expect(NODE.multBps > n.multBps, `node ${n.id} must pay less than the finale`).toBe(true);
    }
    expect(CAMPAIGN_NODES.filter((n) => defenseAmount(n) === 3).map((n) => n.id)).toEqual([10]);
    // The finale is the WORST-returning node on the ladder now. That is the cap's whole effect.
    const returns = CAMPAIGN_NODES.map((n) => Number(nodeRtpPercent(n)));
    expect(Math.min(...returns)).toBe(Number(nodeRtpPercent(NODE)));
  });
});

describe('evaluateCampaignMatch — met/failed/open orderings', () => {
  it('first-to-2: met at 2 wins, failed at 2 losses, open before', () => {
    expect(evaluateCampaignMatch(0, 0, 2)).toBe('open');
    expect(evaluateCampaignMatch(1, 1, 2)).toBe('open');
    expect(evaluateCampaignMatch(2, 0, 2)).toBe('met');
    expect(evaluateCampaignMatch(2, 1, 2)).toBe('met');
    expect(evaluateCampaignMatch(0, 2, 2)).toBe('failed');
    expect(evaluateCampaignMatch(1, 2, 2)).toBe('failed');
  });
  it('first-to-3: OPEN at 2 wins (the engine would call the match over here — we do not)', () => {
    expect(evaluateCampaignMatch(2, 0, 3)).toBe('open');
    expect(evaluateCampaignMatch(0, 2, 3)).toBe('open');
    expect(evaluateCampaignMatch(2, 2, 3)).toBe('open');
  });
  it('first-to-3: met at 3 wins, failed at 3 losses', () => {
    expect(evaluateCampaignMatch(3, 0, 3)).toBe('met');
    expect(evaluateCampaignMatch(3, 2, 3)).toBe('met');
    expect(evaluateCampaignMatch(0, 3, 3)).toBe('failed');
    expect(evaluateCampaignMatch(2, 3, 3)).toBe('failed');
  });
});

// ── applyCampaignExchange — the shared absorb decision ──────────────────────────────────────
describe('applyCampaignExchange — absorb ordering (shield/bulk share this exact rule)', () => {
  it('the player s first hits are absorbed: buffer drains BEFORE any HP damage', () => {
    let state = createMatch();
    let buf = 2;
    // Hit 1: absorbed. Engine untouched, buffer 2 -> 1, history grew by a synthetic record.
    let r = applyCampaignExchange(state, 'strike', 'throw', buf); // p1 wins
    expect(r.absorbed).toBe(true);
    expect(r.absorbRemaining).toBe(1);
    expect(r.state.p2.hp).toBe(3);
    expect(r.state.p1.hp).toBe(3);
    expect(r.state.history).toHaveLength(1);
    expect(r.state.history[0]).toEqual({
      p1: 'strike',
      p2: 'throw',
      outcome: { kind: 'hit', winner: 'p1', move: 'strike', loserMove: 'throw' },
    });
    state = r.state;
    buf = r.absorbRemaining;
    // Hit 2: absorbed, buffer 1 -> 0.
    r = applyCampaignExchange(state, 'throw', 'block', buf);
    expect(r.absorbed).toBe(true);
    expect(r.absorbRemaining).toBe(0);
    expect(r.state.p2.hp).toBe(3);
    state = r.state;
    buf = r.absorbRemaining;
    // Hit 3: buffer empty -> REAL damage through the frozen engine.
    r = applyCampaignExchange(state, 'strike', 'throw', buf);
    expect(r.absorbed).toBe(false);
    expect(r.absorbRemaining).toBe(0);
    expect(r.state.p2.hp).toBe(2);
    expect(r.state.history).toHaveLength(3);
  });

  it('enemy hits on the player are NEVER absorbed (buffer untouched, player hp drains)', () => {
    const state = createMatch();
    const r = applyCampaignExchange(state, 'throw', 'strike', 2); // p2 wins
    expect(r.absorbed).toBe(false);
    expect(r.absorbRemaining).toBe(2);
    expect(r.state.p1.hp).toBe(2);
    expect(r.state.p2.hp).toBe(3);
  });

  it('clashes pass through unchanged (no absorb, no damage, buffer untouched)', () => {
    const state = createMatch();
    const r = applyCampaignExchange(state, 'block', 'block', 1);
    expect(r.absorbed).toBe(false);
    expect(r.absorbRemaining).toBe(1);
    expect(r.state.p1.hp).toBe(3);
    expect(r.state.p2.hp).toBe(3);
    expect(r.state.history[0].outcome.kind).toBe('clash');
  });

  it('with zero buffer it is byte-equivalent to the plain engine exchange', () => {
    const state = createMatch();
    const viaCampaign = applyCampaignExchange(state, 'strike', 'throw', 0);
    const viaEngine = applyExchange(state, 'strike', 'throw');
    expect(viaCampaign.absorbed).toBe(false);
    expect(viaCampaign.state).toEqual(viaEngine);
  });

  it('a defended round needs 3+S player hits to end: 2 absorbed + 3 real -> flawless round win', () => {
    let state = createMatch();
    let buf = 2;
    for (let hit = 1; hit <= 5; hit += 1) {
      expect(state.roundOver).toBeUndefined();
      const r = applyCampaignExchange(state, 'strike', 'throw', buf);
      state = r.state;
      buf = r.absorbRemaining;
      expect(r.absorbed).toBe(hit <= 2);
    }
    expect(state.roundOver).toBe('p1');
    expect(state.flawless).toBe(true);
    expect(state.p1.roundsWon).toBe(1);
  });
});

// ── Playing PAST the frozen engine's matchOver (first-to-3 formats) ─────────────────────────
describe('first-to-3 plays past engine matchOver (the frozen engine stays sane beyond 2 wins)', () => {
  function winRound(state: MatchState, winner: 'p1' | 'p2'): MatchState {
    let s = state;
    for (let i = 0; i < 3; i += 1) {
      s = winner === 'p1' ? applyExchange(s, 'strike', 'throw') : applyExchange(s, 'throw', 'strike');
    }
    return s;
  }

  it('rounds 4-5 behave normally after the engine declared the match over', () => {
    let s = createMatch();
    s = winRound(s, 'p1'); // 1-0
    s = startNextRound(s);
    s = winRound(s, 'p1'); // 2-0: the ENGINE says match over...
    expect(s.matchOver).toBe('p1');
    // ...but the first-to-3 judge keeps it open, so the campaign starts round 3.
    expect(evaluateCampaignMatch(s.p1.roundsWon, s.p2.roundsWon, 3)).toBe('open');
    s = startNextRound(s);
    expect(s.round).toBe(3);
    expect(s.p1.hp).toBe(3);
    expect(s.p2.hp).toBe(3);
    expect(s.roundOver).toBeUndefined();
    // Damage still applies normally past matchOver.
    s = applyExchange(s, 'throw', 'strike');
    expect(s.p1.hp).toBe(2);
    s = applyExchange(s, 'throw', 'strike');
    s = applyExchange(s, 'throw', 'strike');
    expect(s.roundOver).toBe('p2'); // 2-1
    expect(s.p2.roundsWon).toBe(1);
    s = startNextRound(s);
    s = winRound(s, 'p2'); // 2-2
    expect(s.p2.roundsWon).toBe(2);
    expect(evaluateCampaignMatch(2, 2, 3)).toBe('open');
    s = startNextRound(s);
    expect(s.round).toBe(5);
    s = winRound(s, 'p2'); // 2-3: the campaign LOSS...
    expect(s.p2.roundsWon).toBe(3);
    expect(evaluateCampaignMatch(s.p1.roundsWon, s.p2.roundsWon, 3)).toBe('failed');
    // ...while the frozen engine still claims 'p1' won (it checks p1's 2 wins first). THIS is why
    // the campaign judge must never read engine matchOver.
    expect(s.matchOver).toBe('p1');
  });

  it('comeback met: down 0-2, winning three straight rounds is met at 3-2', () => {
    let s = createMatch();
    s = winRound(s, 'p2');
    s = startNextRound(s);
    s = winRound(s, 'p2'); // 0-2, engine says over
    expect(s.matchOver).toBe('p2');
    expect(evaluateCampaignMatch(0, 2, 3)).toBe('open');
    for (let i = 0; i < 3; i += 1) {
      s = startNextRound(s);
      s = winRound(s, 'p1');
    }
    expect(s.p1.roundsWon).toBe(3);
    expect(evaluateCampaignMatch(s.p1.roundsWon, s.p2.roundsWon, 3)).toBe('met');
  });
});

// ── campaignPayout — bigint floor truncation ──────────────────────────────────────────────
describe('campaignPayout — floor truncation (swoobz-casino-math)', () => {
  it('clean cases across the ladder multipliers', () => {
    expect(campaignPayout(5_000_000n, 19200n)).toBe(9_600_000n);
    expect(campaignPayout(5_000_000n, 35120n)).toBe(17_560_000n);
    expect(campaignPayout(1_000_000n, 399590n)).toBe(39_959_000n);
  });
  it('floors odd-lamport stakes DOWN (never rounds up)', () => {
    // 1_000_001 * 19200 / 10000 = 1_920_001.92 -> 1_920_001
    expect(campaignPayout(1_000_001n, 19200n)).toBe(1_920_001n);
    // 3 * 399590 / 10000 = 119.877 -> 119 (the finale multiplier floors like every other)
    expect(campaignPayout(3n, 399590n)).toBe(119n);
    // 7 * 42530 / 10000 = 29.771 -> 29
    expect(campaignPayout(7n, 42530n)).toBe(29n);
    // 9 * 73430 / 10000 = 66.087 -> 66
    expect(campaignPayout(9n, 73430n)).toBe(66n);
  });
  it('net on a win is positive for every node (mult > 1.00x)', () => {
    const stake = 3_333_333n; // odd
    for (const n of CAMPAIGN_NODES) {
      expect(campaignPayout(stake, n.multBps) > stake).toBe(true);
    }
  });
});

// ── display helpers ────────────────────────────────────────────────────────────────────────
describe('display helpers', () => {
  // The five SHIPPED rungs read 50.0 / 27.3 / 22.6 / 13.1 / 2.4; the other configs are still
  // exercised because the closed forms must stay right for any rung a future ladder edit picks up.
  it('formatWinChance per config: 50.0 / 27.3 / 22.6 / 13.1 / 8.0 / 2.4', () => {
    expect(formatWinChance(0, 2)).toBe('50.0');
    expect(formatWinChance(0, 3)).toBe('50.0');
    expect(formatWinChance(1, 2)).toBe('27.3');
    expect(formatWinChance(1, 3)).toBe('22.6');
    expect(formatWinChance(2, 2)).toBe('13.1');
    expect(formatWinChance(2, 3)).toBe('8.0'); // retired rung, math still pinned
    expect(formatWinChance(3, 3)).toBe('2.4'); // the finale
  });
  it('formatMult is two decimals from multBps', () => {
    expect(formatMult(19200n)).toBe('1.92');
    expect(formatMult(35120n)).toBe('3.51');
    expect(formatMult(42530n)).toBe('4.25');
    expect(formatMult(73430n)).toBe('7.34');
    expect(formatMult(399590n)).toBe('39.95'); // FLOORS: toFixed(2) would say 39.96
  });
});

// ── THE RTP CEILING (economy audit, 2026-08-07) ───────────────────────────────────────────────
// The whole reason STANDOFF is not a money printer is that EVERY node prices its own win chance at
// or under 96%. That invariant lived only in a 2M-match script nobody runs in CI, so a one-character
// slip in a multBps could ship a >100% node and no gate would notice. This pins it in exact integer
// arithmetic — no Monte-Carlo, no float, no tolerance to argue about.
//
// RTP = P(win) * mult = (P.num/P.den) * (multBps/10000). Cross-multiplied to stay in BigInt:
//   RTP <= C  <=>  P.num * multBps * 10000 <= C_bps * P.den * 10000  (with C in bps)
describe('THE RTP CEILING — no node may return more than 96% to the player', () => {
  const rtpBps = (node: (typeof CAMPAIGN_NODES)[number]): bigint => {
    const P = matchWinProbability(defenseAmount(node), node.roundsToWin);
    // (num/den) * (multBps/10000) expressed in basis points, floor — deliberately generous to the
    // player, so a node sitting exactly on the line still passes and anything over it fails.
    return (P.num * node.multBps) / P.den;
  };

  it('every shipped node is <= 96.00% RTP (the ceiling; there is no floor any more)', () => {
    // The >= 95.5% floor this test shipped with was REMOVED when Tim capped payouts at 4.00x
    // (2026-08-07): five nodes now return 90.2% / 52.2% / 9.6% ON PURPOSE, so a floor here would
    // assert a design that no longer exists. The ceiling is the surviving law — the house never
    // hands an edge away — and the exact returns are pinned in the ladder suite instead.
    for (const node of CAMPAIGN_NODES) {
      const bps = rtpBps(node); // basis points of 1.0, i.e. 9600 == 96.00%
      expect(bps, `node ${node.id} ${node.name} RTP ${Number(bps) / 100}%`).toBeLessThanOrEqual(9600n);
      expect(bps, `node ${node.id} ${node.name} RTP must be positive`).toBeGreaterThan(0n);
    }
  });

  it('the CPU duel is exactly 96% (1.92x on a true 50/50)', () => {
    // 0.5 * 1.92 == 0.96 exactly; assert on the integers so no float can hide a drift.
    expect(CPU_WIN_BPS * 1n).toBe(19_200n);
    expect((CPU_WIN_BPS * 5000n) / 10_000n).toBe(9_600n); // 50% of 1.92x, in bps
  });

  it('a deliberately over-priced node WOULD fail this test (the guard can actually fire)', () => {
    // Positive control: the check is worthless if it cannot detect a bad row. 2.4% at 45x = 108%.
    const overpriced = { ...CAMPAIGN_NODES[CAMPAIGN_NODE_COUNT - 1], multBps: 450_000n };
    expect(rtpBps(overpriced)).toBeGreaterThan(9600n);
  });

  it('payout can never exceed stake * mult, at any stake (floor favours the house)', () => {
    const stakes = [1n, 3n, 999_999n, 1_000_000n, 5_000_000n, 25_000_000n, 1_137_515_000n];
    for (const node of CAMPAIGN_NODES) {
      for (const s of stakes) {
        expect(campaignPayout(s, node.multBps) * 10_000n).toBeLessThanOrEqual(s * node.multBps);
      }
    }
  });
});
