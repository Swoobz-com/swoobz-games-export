import { describe, expect, it } from 'vitest';
import { MOVES, randomMove } from './fightEngine';
import { secureRandom } from './secureRng';

describe('secureRandom (the unpredictability law: CSPRNG behind every money pick)', () => {
  it('returns floats in [0, 1)', () => {
    for (let i = 0; i < 10_000; i += 1) {
      const x = secureRandom();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('is not a constant stream and repeat runs do not reproduce each other', () => {
    const a = Array.from({ length: 64 }, () => secureRandom());
    const b = Array.from({ length: 64 }, () => secureRandom());
    expect(new Set(a).size).toBeGreaterThan(60); // 32-bit draws: collisions ~never in 64
    expect(a).not.toEqual(b); // seedless: no way to replay a stream
  });

  it('drives the frozen engine randomMove with roughly uniform moves', () => {
    const counts: Record<string, number> = { strike: 0, throw: 0, block: 0 };
    const N = 30_000;
    for (let i = 0; i < N; i += 1) counts[randomMove(secureRandom)] += 1;
    for (const m of MOVES) {
      // Each move ~N/3; a 6-sigma band on a binomial(N, 1/3) is ~ +-490.
      expect(counts[m]).toBeGreaterThan(N / 3 - 600);
      expect(counts[m]).toBeLessThan(N / 3 + 600);
    }
  });
});
