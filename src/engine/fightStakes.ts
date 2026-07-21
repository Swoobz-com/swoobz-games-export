// STANDOFF (formerly Frozen Requiem) — STAKES math (pure, deterministic, no DOM).
//
// Two economies live here:
//   - Quick duel vs the CPU is HOUSE-PRICED at 1.92x: the CPU opponent picks
//     UNIFORM RANDOM only (Nash baseline, unexploitable — the brute/warden/oracle
//     personalities are pure flavor, they never touch picks), so a fair 50/50 match
//     that pays a 1.92x win lands at 96% RTP. See cpuWinPayout / CPU_WIN_BPS.
//   - Friend PvP stays WINNER-TAKES-ALL: the player stakes S, the rival matches S,
//     the pot is 2S, and the MATCH winner takes the whole pot while the loser gets
//     nothing (two humans trading stakes, no house edge). Net: winner +S, loser -S.
//     See potLamports / settle.
//
// All money is BigInt USDC lamports (1_000_000n == 1 USDC), mirroring
// originals/assay/assayProvider.ts. NO floating point anywhere — display goes
// through formatUsd only (floor truncation, tabular). RG-C5 / swoobz-casino-math:
// integer arithmetic, house-neutral floor, identical output across runs.

/** 1 USDC in lamports. */
export const ONE_USDC = 1_000_000n;
/** Fresh practice-bank balance (1000 USDC). */
export const INITIAL_BALANCE = 1_000_000_000n;
/** Smallest stake the player can commit ($1). */
export const MIN_STAKE = 1_000_000n;
/** Default preselected stake ($5). */
export const DEFAULT_STAKE = 5_000_000n;

/** Quick-pick stake chips shown on the stake screen. */
export const STAKE_PRESETS: readonly { label: string; value: bigint }[] = [
  { label: '$1', value: 1_000_000n },
  { label: '$5', value: 5_000_000n },
  { label: '$10', value: 10_000_000n },
  { label: '$25', value: 25_000_000n },
];

/** The whole pot for a given stake: player S + opponent S = 2S. */
export function potLamports(stake: bigint): bigint {
  return stake * 2n;
}

/**
 * Quick-duel-vs-CPU house price in basis points of the stake: a win pays 1.92x
 * (19_200 bps). Against a uniform-random opponent (a fair 50/50 match) this is
 * a 96% RTP — the campaign's Nash-baseline pricing doctrine applied to the quick
 * duel. Friend PvP does NOT use this (it stays winner-takes-all 2S).
 */
export const CPU_WIN_BPS = 19_200n;

/**
 * Payout credited on a CPU-duel WIN: stake * 1.92, floor-truncated (house-favored,
 * never rounds up — same bigint discipline as the rest of this file). A loss pays
 * nothing (the stake was already deducted at commit).
 */
export function cpuWinPayout(stake: bigint): bigint {
  return (stake * CPU_WIN_BPS) / 10_000n;
}

/**
 * Clamp a proposed stake into the playable range: at least MIN_STAKE, at most
 * the current balance. When the balance is below MIN_STAKE the balance ceiling
 * wins (you can never stake more than you hold); the caller gates commit on
 * `balance >= MIN_STAKE` separately.
 */
export function clampStake(stake: bigint, balance: bigint): bigint {
  let s = stake;
  if (s < MIN_STAKE) s = MIN_STAKE;
  if (s > balance) s = balance;
  return s;
}

/**
 * Settle a finished match. The stake was ALREADY deducted from `balance` at
 * commit time, so:
 *   - win  -> credit the whole pot (2S): net over the match is +S.
 *   - loss -> balance unchanged here: net over the match is -S (the commit).
 */
export function settle(balance: bigint, stake: bigint, playerWon: boolean): bigint {
  return playerWon ? balance + potLamports(stake) : balance;
}

/**
 * Format lamports as a fixed "$5.00" string with FLOOR truncation (never rounds
 * up). Tabular-friendly: always two decimal places. Handles negatives for
 * completeness (net readouts), though payouts are never negative.
 */
export function formatUsd(lamports: bigint): string {
  const neg = lamports < 0n;
  const abs = neg ? -lamports : lamports;
  const dollars = abs / ONE_USDC;
  const cents = (abs % ONE_USDC) / 10_000n; // floor to whole cents
  return `${neg ? '-' : ''}$${dollars.toString()}.${cents.toString().padStart(2, '0')}`;
}
