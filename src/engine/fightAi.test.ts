import { describe, expect, it } from 'vitest';
import { aiPick } from './fightAi';
import type { AiPersonality } from './fightAi';
import { mulberry32, resolveExchange } from './fightEngine';
import type { ExchangeRecord, Move } from './fightEngine';

describe('aiPick - determinism from seed', () => {
  function simulate(personality: AiPersonality, seed: number, steps: number): Move[] {
    const rng = mulberry32(seed);
    const scripted: Move[] = ['strike', 'throw', 'block', 'strike', 'strike', 'throw', 'block', 'block'];
    const history: ExchangeRecord[] = [];
    const picks: Move[] = [];
    for (let i = 0; i < steps; i += 1) {
      const aiMove = aiPick(personality, history, rng);
      picks.push(aiMove);
      const humanMove = scripted[i % scripted.length];
      history.push({ p1: humanMove, p2: aiMove, outcome: resolveExchange(humanMove, aiMove) });
    }
    return picks;
  }

  for (const personality of ['brute', 'warden', 'oracle'] as AiPersonality[]) {
    it(`${personality}: same seed -> same move sequence`, () => {
      const a = simulate(personality, 777, 100);
      const b = simulate(personality, 777, 100);
      expect(a).toEqual(b);
    });

    it(`${personality}: different seed -> can diverge`, () => {
      const a = simulate(personality, 1, 200);
      const b = simulate(personality, 2, 200);
      expect(a).not.toEqual(b);
    });
  }
});

describe('aiPick - cannot see the in-flight opponent pick (structural, not just behavioral)', () => {
  // The signature is `aiPick(personality, pastExchanges, rng)` -- there is no parameter for
  // "the human's current pick". This is enforced at compile time (a 4th argument would be a
  // type error), but we also demonstrate at runtime: the AI's move is a pure function of
  // ONLY the completed history + rng draw -- an out-of-scope "about to happen" pick that is
  // never threaded through the call cannot influence the result.
  it('output depends only on (personality, pastExchanges, rng), never on unpassed data', () => {
    const history: ExchangeRecord[] = [
      { p1: 'strike', p2: 'block', outcome: resolveExchange('strike', 'block') },
      { p1: 'strike', p2: 'block', outcome: resolveExchange('strike', 'block') },
    ];
    // "the player is secretly about to throw" -- exists in this test's scope only,
    // never passed to aiPick.
    const secretUpcomingHumanMove: Move = 'throw';
    void secretUpcomingHumanMove;

    const moveA = aiPick('warden', history, mulberry32(55));
    const moveB = aiPick('warden', history, mulberry32(55));
    expect(moveA).toBe(moveB);
  });
});

describe('brute - weighted bias (55/25/20) over 10000 independent draws', () => {
  it('matches target weights within +/-3 percentage points, with no history to trigger the repeat-quirk', () => {
    const rng = mulberry32(2024);
    const counts: Record<Move, number> = { strike: 0, throw: 0, block: 0 };
    const trials = 10000;
    for (let i = 0; i < trials; i += 1) {
      // Empty history every draw -> lastOwnPick is always undefined -> pure weighted roll.
      const move = aiPick('brute', [], rng);
      counts[move] += 1;
    }
    const pct: Record<Move, number> = {
      strike: counts.strike / trials,
      throw: counts.throw / trials,
      block: counts.block / trials,
    };
    expect(pct.strike).toBeGreaterThan(0.52);
    expect(pct.strike).toBeLessThan(0.58);
    expect(pct.throw).toBeGreaterThan(0.22);
    expect(pct.throw).toBeLessThan(0.28);
    expect(pct.block).toBeGreaterThan(0.17);
    expect(pct.block).toBeLessThan(0.23);
  });

  it('has a real chance to repeat its own last pick when history exists', () => {
    const rng = mulberry32(4);
    let repeats = 0;
    const trials = 5000;
    let lastAiMove: Move = 'strike';
    const history: ExchangeRecord[] = [];
    for (let i = 0; i < trials; i += 1) {
      const move = aiPick('brute', history, rng);
      if (move === lastAiMove) repeats += 1;
      lastAiMove = move;
      history.length = 0;
      history.push({ p1: 'strike', p2: move, outcome: resolveExchange('strike', move) });
    }
    // Repeats come from both the 25% override AND coincidental weighted re-rolls, so this
    // is a loose sanity bound, not a precise measurement of the 25% constant.
    expect(repeats / trials).toBeGreaterThan(0.2);
  });
});

describe('warden - counters a scripted biased player over 1000 exchanges', () => {
  it('beats an always-STRIKE scripted player more than 55% of the time', () => {
    const rng = mulberry32(31337);
    const history: ExchangeRecord[] = [];
    let wardenWins = 0;
    const trials = 1000;
    for (let i = 0; i < trials; i += 1) {
      const humanMove: Move = 'strike';
      const wardenMove = aiPick('warden', history, rng);
      const outcome = resolveExchange(humanMove, wardenMove);
      if (outcome.kind === 'hit' && outcome.winner === 'p2') {
        wardenWins += 1;
      }
      history.push({ p1: humanMove, p2: wardenMove, outcome });
    }
    expect(wardenWins / trials).toBeGreaterThan(0.55);
  });
});

describe('oracle - fairness vs a uniform-random scripted player over 5000 exchanges', () => {
  it('lands at 33% +/-4% win rate (no exploitable pattern to predict, so no unfair edge)', () => {
    const humanRng = mulberry32(2468);
    const oracleRng = mulberry32(13579);
    const history: ExchangeRecord[] = [];
    let oracleWins = 0;
    const trials = 5000;
    const MOVES_LOCAL: Move[] = ['strike', 'throw', 'block'];
    for (let i = 0; i < trials; i += 1) {
      const humanMove = MOVES_LOCAL[Math.floor(humanRng() * MOVES_LOCAL.length)];
      const oracleMove = aiPick('oracle', history, oracleRng);
      const outcome = resolveExchange(humanMove, oracleMove);
      if (outcome.kind === 'hit' && outcome.winner === 'p2') {
        oracleWins += 1;
      }
      history.push({ p1: humanMove, p2: oracleMove, outcome });
    }
    const rate = oracleWins / trials;
    expect(rate).toBeGreaterThan(0.29);
    expect(rate).toBeLessThan(0.37);
  });

  it('beats a genuinely patterned scripted player better than the uniform-random case', () => {
    // Human always follows STRIKE with THROW, and THROW/BLOCK with STRIKE -- a real,
    // learnable 1-step pattern the predictor half of Oracle should exploit.
    const rng = mulberry32(909090);
    const history: ExchangeRecord[] = [];
    let oracleWins = 0;
    const trials = 2000;
    let lastHuman: Move = 'strike';
    for (let i = 0; i < trials; i += 1) {
      const humanMove: Move = lastHuman === 'strike' ? 'throw' : 'strike';
      const oracleMove = aiPick('oracle', history, rng);
      const outcome = resolveExchange(humanMove, oracleMove);
      if (outcome.kind === 'hit' && outcome.winner === 'p2') {
        oracleWins += 1;
      }
      history.push({ p1: humanMove, p2: oracleMove, outcome });
      lastHuman = humanMove;
    }
    expect(oracleWins / trials).toBeGreaterThan(0.37);
  });
});
