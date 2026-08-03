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
  it('q(0) = 1/2, q(1) = 11/32, q(2) = 29/128', () => {
    expect(ratEq(qOf(0), { num: 1n, den: 2n })).toBe(true);
    expect(ratEq(qOf(1), { num: 11n, den: 32n })).toBe(true);
    expect(ratEq(qOf(2), { num: 29n, den: 128n })).toBe(true);
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
    // flat. Nodes 3-9 each moved up one rung; node 10 was already at the engine's ceiling
    // (defense.amount is typed 1 | 2 and matchWinProbability throws on 3). Prices are UNCHANGED
    // per-config — each rung keeps the multBps it already carried, so no new number was invented.
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
      [10, 3, 'shield', 2, 119400n],
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
  it('same-defense same-format nodes share one price (bulk vs shield is presentation only)', () => {
    // DERIVED, NOT INDEXED. This used to assert CAMPAIGN_NODES[4] === [5] and [6] === [7] — the
    // array positions that happened to be same-config pairs under one layout. Re-shaping the curve
    // moved every node and it then compared a to2 price against a to3 price. Grouping by
    // (defenseAmount, roundsToWin) states the actual invariant and cannot go stale.
    const byConfig = new Map<string, bigint[]>();
    for (const n of CAMPAIGN_NODES) {
      const key = `${defenseAmount(n)}:${n.roundsToWin}`;
      byConfig.set(key, [...(byConfig.get(key) ?? []), n.multBps]);
    }
    for (const [key, prices] of byConfig) {
      expect(new Set(prices).size, `config ${key} must carry ONE price, got ${[...new Set(prices)].join('/')}`).toBe(1);
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
    expect(getCampaignNode(10)?.defense).toEqual({ kind: 'shield', amount: 2 });
    expect(getCampaignNode(11)).toBeUndefined();
    expect(getCampaignNode(0)).toBeUndefined();
    expect(getCampaignNode(null)).toBeUndefined();
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
    expect(campaignPayout(1_000_000n, 119400n)).toBe(11_940_000n);
  });
  it('floors odd-lamport stakes DOWN (never rounds up)', () => {
    // 1_000_001 * 19200 / 10000 = 1_920_001.92 -> 1_920_001
    expect(campaignPayout(1_000_001n, 19200n)).toBe(1_920_001n);
    // 3 * 119400 / 10000 = 35.82 -> 35
    expect(campaignPayout(3n, 119400n)).toBe(35n);
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
  it('formatWinChance per ladder rung: 50.0 / 27.3 / 22.6 / 13.1 / 8.0', () => {
    expect(formatWinChance(0, 2)).toBe('50.0');
    expect(formatWinChance(0, 3)).toBe('50.0');
    expect(formatWinChance(1, 2)).toBe('27.3');
    expect(formatWinChance(1, 3)).toBe('22.6');
    expect(formatWinChance(2, 2)).toBe('13.1');
    expect(formatWinChance(2, 3)).toBe('8.0');
  });
  it('formatMult is two decimals from multBps', () => {
    expect(formatMult(19200n)).toBe('1.92');
    expect(formatMult(35120n)).toBe('3.51');
    expect(formatMult(42530n)).toBe('4.25');
    expect(formatMult(73430n)).toBe('7.34');
    expect(formatMult(119400n)).toBe('11.94');
  });
});
