// STANDOFF (formerly Frozen Requiem) — STAKES math (pure, deterministic, no DOM).
//
// Winner-takes-all economy (Tim's spec): the player stakes S, the opponent
// matches S, the pot is 2S, and the MATCH winner takes the whole pot while the
// loser gets nothing. Net over one match: winner +S, loser -S.
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
