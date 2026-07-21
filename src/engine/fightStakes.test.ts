import { describe, expect, it } from 'vitest';
import {
  clampStake,
  CPU_WIN_BPS,
  cpuWinPayout,
  DEFAULT_STAKE,
  formatUsd,
  INITIAL_BALANCE,
  MIN_STAKE,
  ONE_USDC,
  potLamports,
  settle,
  STAKE_PRESETS,
} from './fightStakes';

describe('constants', () => {
  it('money constants are the agreed lamport values', () => {
    expect(ONE_USDC).toBe(1_000_000n);
    expect(INITIAL_BALANCE).toBe(1_000_000_000n);
    expect(MIN_STAKE).toBe(1_000_000n);
    expect(DEFAULT_STAKE).toBe(5_000_000n);
  });

  it('presets are $1 / $5 / $10 / $25 in lamports', () => {
    expect(STAKE_PRESETS.map((p) => p.value)).toEqual([1_000_000n, 5_000_000n, 10_000_000n, 25_000_000n]);
    expect(STAKE_PRESETS.map((p) => p.label)).toEqual(['$1', '$5', '$10', '$25']);
  });
});

describe('potLamports', () => {
  it('pot is exactly twice the stake (even match)', () => {
    expect(potLamports(5_000_000n)).toBe(10_000_000n);
    expect(potLamports(1_000_000n)).toBe(2_000_000n);
    expect(potLamports(0n)).toBe(0n);
    expect(potLamports(25_000_000n)).toBe(50_000_000n);
  });
});

describe('clampStake', () => {
  it('leaves an in-range stake untouched', () => {
    expect(clampStake(5_000_000n, 1_000_000_000n)).toBe(5_000_000n);
  });

  it('raises a below-minimum stake to MIN_STAKE', () => {
    expect(clampStake(0n, 1_000_000_000n)).toBe(MIN_STAKE);
    expect(clampStake(500_000n, 1_000_000_000n)).toBe(MIN_STAKE);
  });

  it('caps a stake above the balance to the balance', () => {
    expect(clampStake(50_000_000n, 8_000_000n)).toBe(8_000_000n);
  });

  it('when balance is below MIN_STAKE the balance ceiling wins', () => {
    expect(clampStake(DEFAULT_STAKE, 400_000n)).toBe(400_000n);
  });

  it('a stake exactly at the balance stays', () => {
    expect(clampStake(8_000_000n, 8_000_000n)).toBe(8_000_000n);
  });
});

describe('settle', () => {
  it('winner is credited the whole pot', () => {
    // balance already had the stake deducted at commit.
    expect(settle(995_000_000n, 5_000_000n, true)).toBe(1_005_000_000n);
  });

  it('loser keeps the post-commit balance (nothing credited)', () => {
    expect(settle(995_000_000n, 5_000_000n, false)).toBe(995_000_000n);
  });

  it('round-trip win nets +stake over the match', () => {
    const start = INITIAL_BALANCE;
    const stake = DEFAULT_STAKE;
    const afterCommit = start - stake; // deducted on commit
    const afterWin = settle(afterCommit, stake, true);
    expect(afterWin).toBe(start + stake); // net +S
  });

  it('round-trip loss nets -stake over the match', () => {
    const start = INITIAL_BALANCE;
    const stake = DEFAULT_STAKE;
    const afterCommit = start - stake;
    const afterLoss = settle(afterCommit, stake, false);
    expect(afterLoss).toBe(start - stake); // net -S
  });
});

describe('cpuWinPayout (quick duel vs CPU: house-priced 1.92x)', () => {
  it('the house price is 19_200 bps (1.92x)', () => {
    expect(CPU_WIN_BPS).toBe(19_200n);
  });

  it('pays exactly 1.92x the stake at the round-dollar presets', () => {
    expect(cpuWinPayout(1_000_000n)).toBe(1_920_000n); // $1 -> $1.92
    expect(cpuWinPayout(5_000_000n)).toBe(9_600_000n); // $5 -> $9.60
    expect(cpuWinPayout(25_000_000n)).toBe(48_000_000n); // $25 -> $48.00
    expect(formatUsd(cpuWinPayout(1_000_000n))).toBe('$1.92');
    expect(formatUsd(cpuWinPayout(5_000_000n))).toBe('$9.60');
    expect(formatUsd(cpuWinPayout(25_000_000n))).toBe('$48.00');
  });

  it('floor-truncates a non-round lamport stake (house-favored, never rounds up)', () => {
    // 3_333_333 * 19_200 / 10_000 = 6_399_999.36 -> floor 6_399_999 (the .36 lamport-fraction drops).
    expect(cpuWinPayout(3_333_333n)).toBe(6_399_999n);
    // 1_000_001 * 19_200 / 10_000 = 1_920_001.92 -> floor 1_920_001.
    expect(cpuWinPayout(1_000_001n)).toBe(1_920_001n);
  });

  it('pays nothing on a zero stake', () => {
    expect(cpuWinPayout(0n)).toBe(0n);
  });
});

describe('settle mode split (quick duel economy — the settleMatch money law)', () => {
  // Mirrors provider settleMatch: the stake is already deducted at commit, so `postCommit` is the
  // balance settleMatch sees. CPU credits cpuWinPayout on a win; friend credits the 2S pot (settle).
  const start = INITIAL_BALANCE;
  const stake = DEFAULT_STAKE; // $5
  const postCommit = start - stake;

  it('CPU win credits exactly stake * 1.92 (to the cent)', () => {
    const balanceAfter = postCommit + cpuWinPayout(stake);
    expect(balanceAfter - postCommit).toBe(9_600_000n); // $9.60 credited on a $5 win
    expect(balanceAfter).toBe(start - stake + 9_600_000n);
    // Net over the match: +$4.60 (won $9.60, staked $5.00).
    expect(balanceAfter - start).toBe(4_600_000n);
  });

  it('CPU loss credits nothing (stake already gone at commit)', () => {
    const balanceAfter = postCommit; // no credit on a loss
    expect(balanceAfter - postCommit).toBe(0n);
    expect(balanceAfter).toBe(start - stake); // net -$5.00
  });

  it('friend win still credits exactly the 2S pot (byte-identical winner-takes-all)', () => {
    const balanceAfter = settle(postCommit, stake, true);
    expect(balanceAfter - postCommit).toBe(potLamports(stake)); // 2S == $10.00 credited
    expect(balanceAfter).toBe(start + stake); // net +$5.00
  });

  it('friend loss keeps the post-commit balance (byte-identical)', () => {
    const balanceAfter = settle(postCommit, stake, false);
    expect(balanceAfter).toBe(postCommit); // net -$5.00
  });
});

describe('formatUsd', () => {
  it('formats whole dollars with two decimals', () => {
    expect(formatUsd(5_000_000n)).toBe('$5.00');
    expect(formatUsd(10_000_000n)).toBe('$10.00');
    expect(formatUsd(0n)).toBe('$0.00');
    expect(formatUsd(1_000_000_000n)).toBe('$1000.00');
  });

  it('formats fractional dollars', () => {
    expect(formatUsd(1_500_000n)).toBe('$1.50');
    expect(formatUsd(2_050_000n)).toBe('$2.05');
  });

  it('floor-truncates sub-cent lamports (never rounds up)', () => {
    expect(formatUsd(1_234_567n)).toBe('$1.23');
    expect(formatUsd(9_999n)).toBe('$0.00');
    expect(formatUsd(1_009_999n)).toBe('$1.00');
  });

  it('handles negative amounts', () => {
    expect(formatUsd(-5_000_000n)).toBe('-$5.00');
  });
});
