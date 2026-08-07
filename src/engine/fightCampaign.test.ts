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
  matchWinProbability,
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
    expect(rows).toEqual([
      [1, 2, 'none', 0, 19200n],
      [2, 2, 'none', 0, 19200n],
      [3, 2, 'bulk', 1, 35120n],
      [4, 2, 'shield', 1, 35120n],
      [5, 2, 'bulk', 1, 35120n],
      [6, 3, 'shield', 1, 42530n],
      [7, 3, 'bulk', 1, 42530n],
      [8, 2, 'shield', 2, 73430n],
      [9, 2, 'bulk', 2, 73430n],
      [10, 3, 'shield', 3, 399590n],
    ]);
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
  it('every node is priced inside [95.00%, 96.00%] RTP exactly (multBps * P vs 9500/9600 bps)', () => {
    for (const n of CAMPAIGN_NODES) {
      const p = matchWinProbability(defenseAmount(n), n.roundsToWin);
      expect(n.multBps * p.num <= 9600n * p.den).toBe(true); // never better than 96%
      expect(n.multBps * p.num >= 9500n * p.den).toBe(true); // never worse than 95%
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
    for (const [key, { prices }] of byConfig) {
      expect(new Set(prices).size, `config ${key} must carry ONE price, got ${[...new Set(prices)].join('/')}`).toBe(1);
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
    // (2) THE HOUSE EDGE IS UNIFORM ACROSS THE LADDER. The RTP band test only says [95, 96]; a full
    // percentage point of slack is enough to hide a rung that quietly hands the player an extra
    // 0.9% while every other assertion stays green. The shipped rungs sit inside a 0.08pp spread
    // (95.9247% .. 96.0000%), so hold new rungs to the same standard: no rung may return less than
    // 95.85%. A finale priced by feel rather than from P lands outside this immediately.
    for (const r of rungs) {
      const p = matchWinProbability(Number(r.key.split(':')[0]), Number(r.key.split(':')[1]) as 2 | 3);
      const rtpTimes1e4 = (r.price * p.num * 10000n) / (100n * p.den); // RTP %, truncated to 4dp
      expect(rtpTimes1e4 >= 958500n, `config ${r.key} returns ${Number(rtpTimes1e4) / 1e4}% — below the 95.85% ladder floor`).toBe(true);
      expect(rtpTimes1e4 <= 960000n, `config ${r.key} returns ${Number(rtpTimes1e4) / 1e4}% — above the 96% ceiling`).toBe(true);
    }
    // (3) ORDERING ACROSS CONFIGS: harder must pay more, and an equal win chance must cost the same.
    for (let i = 1; i < rungs.length; i += 1) {
      const prev = rungs[i - 1];
      const cur = rungs[i];
      if (Math.abs(cur.p - prev.p) < 1e-12) {
        // Two configs, identical win chance (e.g. to2 and to3 with no defense are both exactly
        // 1/2): the same fight for the player, so it must carry the same price.
        expect(cur.price, `${cur.key} and ${prev.key} are the same win chance and must share a price`).toBe(prev.price);
      } else {
        expect(
          cur.price > prev.price,
          `${cur.key} (P ${(cur.p * 100).toFixed(4)}%) is harder than ${prev.key} (P ${(prev.p * 100).toFixed(4)}%) so it must pay MORE: got ${cur.price} vs ${prev.price}`,
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

  it('399590n is DERIVED: the largest multiple of 10 whose RTP stays under the 96% ceiling', () => {
    // Price follows P and the ceiling, in that order (never a number picked to look nice).
    const maxBps = (9600n * P.den) / P.num;
    expect(maxBps).toBe(399591n);
    expect(maxBps * P.num <= 9600n * P.den).toBe(true);
    expect((maxBps + 1n) * P.num <= 9600n * P.den).toBe(false); // the bound is tight
    expect((maxBps / 10n) * 10n).toBe(399590n); // ladder convention: multiples of 10
    expect(NODE.multBps).toBe(399590n);
    // And the next ladder step really is out of reach — 399590n is a ceiling, not a rounding.
    expect(399600n * P.num <= 9600n * P.den).toBe(false);
  });

  it('RTP at the shipped price is 95.9996% — inside [95.00%, 96.00%]', () => {
    expect(NODE.multBps * P.num >= 9500n * P.den).toBe(true);
    expect(NODE.multBps * P.num <= 9600n * P.den).toBe(true);
    // RTP percent = multBps * num / (100 * den), truncated to four decimals in exact bigint.
    expect((NODE.multBps * P.num * 10000n) / (100n * P.den)).toBe(959995n);
  });

  it('the player reads "2.4" win chance and "x39.95" pays — formatMult FLOORS, it never rounds', () => {
    expect(formatWinChance(3, 3)).toBe('2.4');
    expect(formatMult(NODE.multBps)).toBe('39.95');
    // THE TRAP that keeps re-appearing in handoff text: toFixed ROUNDS 39.959 up to "39.96", and
    // 399600n (the bps that would honestly display 39.96) is out of band per the test above. So
    // x39.96 is unreachable at this P, and anyone "correcting" 39.95 to 39.96 is wrong.
    expect((Number(NODE.multBps) / 10000).toFixed(2)).toBe('39.96');
    expect(formatMult(399600n)).toBe('39.96');
  });

  it('it is the hardest node, the best-paying node, and the sole occupant of its rung', () => {
    const pWin = Number(P.num) / Number(P.den);
    for (const n of CAMPAIGN_NODES.filter((x) => x.id !== 10)) {
      const p = matchWinProbability(defenseAmount(n), n.roundsToWin);
      expect(pWin, `node ${n.id} must be easier than the finale`).toBeLessThan(Number(p.num) / Number(p.den));
      expect(NODE.multBps > n.multBps, `node ${n.id} must pay less than the finale`).toBe(true);
    }
    expect(CAMPAIGN_NODES.filter((n) => defenseAmount(n) === 3).map((n) => n.id)).toEqual([10]);
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

  it('every shipped node is <= 96.00% and >= 95.5% RTP', () => {
    for (const node of CAMPAIGN_NODES) {
      const bps = rtpBps(node); // basis points of 1.0, i.e. 9600 == 96.00%
      expect(bps, `node ${node.id} ${node.name} RTP ${Number(bps) / 100}%`).toBeLessThanOrEqual(9600n);
      expect(bps, `node ${node.id} ${node.name} RTP ${Number(bps) / 100}%`).toBeGreaterThanOrEqual(9550n);
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
