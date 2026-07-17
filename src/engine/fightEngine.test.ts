import { describe, expect, it } from 'vitest';
import {
  applyExchange,
  createMatch,
  HP_MAX,
  MOVES,
  mulberry32,
  randomMove,
  resolveExchange,
  ROUNDS_TO_WIN,
  startNextRound,
} from './fightEngine';
import type { Move } from './fightEngine';

describe('resolveExchange - full 9-pair triangle truth table', () => {
  const expected: Record<string, { kind: string; winner?: 'p1' | 'p2' }> = {
    'strike,strike': { kind: 'clash' },
    'strike,throw': { kind: 'hit', winner: 'p1' },
    'strike,block': { kind: 'hit', winner: 'p2' },
    'throw,strike': { kind: 'hit', winner: 'p2' },
    'throw,throw': { kind: 'clash' },
    'throw,block': { kind: 'hit', winner: 'p1' },
    'block,strike': { kind: 'hit', winner: 'p1' },
    'block,throw': { kind: 'hit', winner: 'p2' },
    'block,block': { kind: 'clash' },
  };

  for (const p1 of MOVES) {
    for (const p2 of MOVES) {
      it(`p1=${p1} vs p2=${p2}`, () => {
        const outcome = resolveExchange(p1, p2);
        const key = `${p1},${p2}`;
        const exp = expected[key];
        expect(outcome.kind).toBe(exp.kind);
        if (outcome.kind === 'hit') {
          expect(outcome.winner).toBe(exp.winner);
        }
      });
    }
  }

  it('covers all 9 pairs', () => {
    expect(Object.keys(expected)).toHaveLength(9);
  });
});

describe('applyExchange - HP and clash', () => {
  it('clash does not change HP', () => {
    const state = createMatch();
    const next = applyExchange(state, 'strike', 'strike');
    expect(next.p1.hp).toBe(HP_MAX);
    expect(next.p2.hp).toBe(HP_MAX);
    expect(next.history).toHaveLength(1);
    expect(next.history[0].outcome.kind).toBe('clash');
  });

  it('a hit decrements the loser HP by exactly 1', () => {
    const state = createMatch();
    const next = applyExchange(state, 'strike', 'throw'); // p1 wins
    expect(next.p1.hp).toBe(HP_MAX);
    expect(next.p2.hp).toBe(HP_MAX - 1);
  });

  it('is pure: does not mutate the input state', () => {
    const state = createMatch();
    const snapshotHp = state.p2.hp;
    applyExchange(state, 'strike', 'throw');
    expect(state.p2.hp).toBe(snapshotHp);
    expect(state.history).toHaveLength(0);
  });
});

describe('round win at 0 HP + flawless', () => {
  it('p2 hits 0 HP -> p1 wins the round', () => {
    let state = createMatch();
    state = applyExchange(state, 'strike', 'throw'); // p2 -1
    state = applyExchange(state, 'strike', 'throw'); // p2 -1
    state = applyExchange(state, 'strike', 'throw'); // p2 -1 -> 0
    expect(state.p2.hp).toBe(0);
    expect(state.roundOver).toBe('p1');
    expect(state.p1.roundsWon).toBe(1);
  });

  it('flawless is true when the round is won without taking any damage', () => {
    let state = createMatch();
    state = applyExchange(state, 'strike', 'throw');
    state = applyExchange(state, 'strike', 'throw');
    state = applyExchange(state, 'strike', 'throw');
    expect(state.p1.hp).toBe(HP_MAX);
    expect(state.flawless).toBe(true);
  });

  it('flawless is false when the winner also took damage this round', () => {
    let state = createMatch();
    state = applyExchange(state, 'throw', 'strike'); // p1 -1 (block beats strike... wait throw loses to nothing here)
    // throw vs strike: strike beats throw -> p2 wins -> p1 -1
    state = applyExchange(state, 'strike', 'throw'); // p1 wins -> p2 -1
    state = applyExchange(state, 'strike', 'throw'); // p1 wins -> p2 -1
    state = applyExchange(state, 'strike', 'throw'); // p1 wins -> p2 -1 -> 0, p1 hp = 2
    expect(state.p2.hp).toBe(0);
    expect(state.p1.hp).toBe(HP_MAX - 1);
    expect(state.roundOver).toBe('p1');
    expect(state.flawless).toBe(false);
  });
});

describe('match win at 2 rounds', () => {
  function loseRoundFor(loser: 'p1' | 'p2', state: ReturnType<typeof createMatch>) {
    const winnerMove: Move = 'strike';
    const loserMove: Move = 'throw';
    for (let i = 0; i < HP_MAX; i += 1) {
      state = loser === 'p2' ? applyExchange(state, winnerMove, loserMove) : applyExchange(state, loserMove, winnerMove);
    }
    return state;
  }

  it('matchOver is set once a fighter reaches ROUNDS_TO_WIN', () => {
    let state = createMatch();
    state = loseRoundFor('p2', state);
    expect(state.matchOver).toBeUndefined();
    expect(state.p1.roundsWon).toBe(1);

    state = startNextRound(state);
    state = loseRoundFor('p2', state);
    expect(state.p1.roundsWon).toBe(ROUNDS_TO_WIN);
    expect(state.matchOver).toBe('p1');
  });
});

describe('startNextRound', () => {
  it('resets HP to HP_MAX, increments round, archives history, preserves roundsWon', () => {
    let state = createMatch();
    state = applyExchange(state, 'strike', 'throw');
    const roundsWonBefore = state.p1.roundsWon;
    const next = startNextRound(state);
    expect(next.p1.hp).toBe(HP_MAX);
    expect(next.p2.hp).toBe(HP_MAX);
    expect(next.round).toBe(state.round + 1);
    expect(next.history).toHaveLength(0);
    expect(next.matchHistory).toHaveLength(1);
    expect(next.matchHistory[0]).toHaveLength(1);
    expect(next.p1.roundsWon).toBe(roundsWonBefore);
    expect(next.roundOver).toBeUndefined();
    expect(next.flawless).toBeUndefined();
  });
});

describe('mulberry32 + randomMove determinism', () => {
  it('same seed produces the same sequence of raw floats', () => {
    const rngA = mulberry32(12345);
    const rngB = mulberry32(12345);
    const seqA = Array.from({ length: 20 }, () => rngA());
    const seqB = Array.from({ length: 20 }, () => rngB());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds produce different sequences', () => {
    const rngA = mulberry32(1);
    const rngB = mulberry32(2);
    const seqA = Array.from({ length: 20 }, () => rngA());
    const seqB = Array.from({ length: 20 }, () => rngB());
    expect(seqA).not.toEqual(seqB);
  });

  it('same seed produces the same sequence of randomMove picks', () => {
    const rngA = mulberry32(999);
    const rngB = mulberry32(999);
    const seqA = Array.from({ length: 50 }, () => randomMove(rngA));
    const seqB = Array.from({ length: 50 }, () => randomMove(rngB));
    expect(seqA).toEqual(seqB);
  });

  it('randomMove always returns a valid Move', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 200; i += 1) {
      expect(MOVES).toContain(randomMove(rng));
    }
  });
});
