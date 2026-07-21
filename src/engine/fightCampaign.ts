// STANDOFF (formerly Frozen Requiem) — CONQUEST MAP campaign math (pure, deterministic, no DOM,
// no React).
//
// PHASE 17 DESIGN OF RECORD (Tim's 2026-07-21 rulings, replacing the phase-16 objective tiers):
// no quest objectives — every node is "just play normal rock paper scissors and WIN THE MATCH".
// Difficulty and payout escalate through two per-node knobs instead:
//   - FORMAT: first to 2 round wins (the normal duel) or first to 3 (the longer late-map "war").
//   - DEFENSE: the enemy may absorb the player's first `amount` decisive hits EACH ROUND. Two
//     presentations of the SAME math: 'shield' (shield pips, hits shatter on them, no HP drain)
//     and 'bulk' (the enemy's health bar simply has 3+amount segments and drains normally). The
//     player must land 3+amount blows before taking 3 — identical pricing either way.
//
// This module owns:
//   1. The node ladder (10 rows, each with roundsToWin / defense / multBps) + rewards.
//   2. `applyCampaignExchange` — THE shared absorb-decision wrapper around the frozen engine that
//      the provider, the Monte-Carlo sim and the tests ALL use (single source, no drift).
//   3. `evaluateCampaignMatch` — the pure judge run after every completed round. It reads ONLY
//      round-win counts, never the engine's matchOver: first-to-3 nodes play PAST the engine's
//      2-win matchOver (the engine merely stops being asked to end the match; it is never edited).
//   4. `campaignPayout` + exact win probabilities (bigint rationals) for the Glass Box display.
//
// ECONOMIC LAWS (unchanged from phase 16, spec §0): every node priced at <=96% RTP with bigint bps
// floor truncation; stake deducted at commit; the enemy picks UNIFORM RANDOM (`randomMove`), never
// `aiPick` — Nash-neutral, so the closed-form probabilities below hold vs ANY player.
//
// EXACT MATH (regression-tested): with a fair-coin decisive exchange, the round-win probability is
// q = P(player lands 3+S hits before taking 3), S = defense amount:
//   S=0: q = 1/2      S=1: q = 11/32      S=2: q = 29/128
// Match win: first-to-2 P = q^2(3-2q); first-to-3 P = q^3(1 + 3(1-q) + 6(1-q)^2).

import type { MatchState, Move } from './fightEngine';
import { applyExchange, resolveExchange } from './fightEngine';

/** The judge's verdict after a completed round. 'open' = keep fighting; 'met'/'failed' end it. */
export type CampaignMatchResult = 'met' | 'failed' | 'open';

/** Per-node enemy defense: absorb the player's first `amount` decisive hits each round.
 *  `kind` is PRESENTATION ONLY — the interception math is identical for both kinds. */
export interface CampaignDefense {
  kind: 'shield' | 'bulk';
  amount: 1 | 2;
}

/** A cosmetic cross-game unlock attached to a node (swoobz-engagement-layer: EV-NEUTRAL —
 *  rewards NEVER change the money math; the node's multiplier/payout is untouched). DEMO ONLY
 *  this phase: the unlock is presentational (no real cross-game delivery). */
export interface CampaignReward {
  id: string;
  /** Card headline, e.g. 'AUTOMAT CHARACTER PACK'. No em-dashes (copy law). */
  label: string;
  /** One quiet line under the headline. */
  sub: string;
  /** Art path under the asset base, e.g. 'assets/reward-pack-automat.webp'. */
  art: string;
  /** Visual tier of the card chrome only (gold = rarer framing). Value-independent celebration
   *  still applies: identical fanfare + card choreography for every tier (RG-C5). */
  tier: 'standard' | 'gold';
}

/** A conquest-map node. ONE row per node — future characters/arenas drop in by editing the row
 *  only, the same data-not-code shape as characters/registry.ts + arenas/arenas.ts. */
export interface CampaignNodeDef {
  id: number; // 1..10, the frontier index is id-1
  name: string;
  title: string; // enemy card title
  /** Match format: round wins needed to take the node. The engine's own matchOver fires at 2 and
   *  is IGNORED by the campaign judge — first-to-3 nodes keep playing rounds past it. */
  roundsToWin: 2 | 3;
  /** Enemy defense (absent = none). See CampaignDefense. */
  defense?: CampaignDefense;
  /** Payout multiplier in basis points (10000 = 1.00x): floor(0.96 / P(match win)) to clean bps. */
  multBps: bigint;
  fighterId: string; // registry id of the enemy fighter (VOLTA fills every slot this phase)
  arenaId: string; // background arena id (cathedral default this phase)
  reward?: CampaignReward; // optional cosmetic unlock (see CampaignReward)
}

// The 10 playable nodes (RONIN ZERO season theme; names in a Japanese sengoku register). The
// phase-17 ladder: escalation via format + defense, kinds mixed for variety (Tim's addendum) —
// n1-4 plain x1.92 | n5 bulk+1 x3.51 | n6 shield1 x3.51 | n7 bulk+1 first-to-3 x4.25 |
// n8 shield1 first-to-3 x4.25 | n9 bulk+2 x7.34 | n10 RONIN ZERO shield2 first-to-3 x11.94.
export const CAMPAIGN_NODES: CampaignNodeDef[] = [
  // NOTE: the demo cosmetic rewards (AUTOMAT packs on nodes 2 + 8) were REMOVED for now
  // (Tim, 2026-07-21). The CampaignReward type, `reward?` field, UI surfaces and the webp
  // assets all remain wired — re-adding a reward is one registry-row edit.
  { id: 1, name: 'KUROHAMA DOCKS', title: 'Dockmaster of Kurohama', roundsToWin: 2, multBps: 19200n, fighterId: 'volta', arenaId: 'cathedral' },
  { id: 2, name: 'ASHEN TORII', title: 'Keeper of the Ashen Torii', roundsToWin: 2, multBps: 19200n, fighterId: 'volta', arenaId: 'cathedral' },
  { id: 3, name: 'WHISPERING BAMBOO', title: 'Blade of the Bamboo Sea', roundsToWin: 2, multBps: 19200n, fighterId: 'volta', arenaId: 'cathedral' },
  { id: 4, name: 'SNOWFANG PASS', title: 'Sentinel of Snowfang', roundsToWin: 2, multBps: 19200n, fighterId: 'volta', arenaId: 'cathedral' },
  { id: 5, name: 'KAWA CROSSING', title: 'Duelist of the Crossing', roundsToWin: 2, defense: { kind: 'bulk', amount: 1 }, multBps: 35120n, fighterId: 'volta', arenaId: 'cathedral' },
  { id: 6, name: 'HOLLOW SHRINE', title: 'Phantom of the Hollow Shrine', roundsToWin: 2, defense: { kind: 'shield', amount: 1 }, multBps: 35120n, fighterId: 'volta', arenaId: 'cathedral' },
  { id: 7, name: 'BURNED PAGODA', title: 'Ash Warden of the Pagoda', roundsToWin: 3, defense: { kind: 'bulk', amount: 1 }, multBps: 42530n, fighterId: 'volta', arenaId: 'cathedral' },
  { id: 8, name: 'RED MIST GORGE', title: 'Tyrant of the Red Mist', roundsToWin: 3, defense: { kind: 'shield', amount: 1 }, multBps: 42530n, fighterId: 'volta', arenaId: 'cathedral' },
  { id: 9, name: 'CRIMSON GATES', title: 'Warlord of the Crimson Gates', roundsToWin: 2, defense: { kind: 'bulk', amount: 2 }, multBps: 73430n, fighterId: 'volta', arenaId: 'cathedral' },
  { id: 10, name: 'ZERO CITADEL', title: 'RONIN ZERO', roundsToWin: 3, defense: { kind: 'shield', amount: 2 }, multBps: 119400n, fighterId: 'volta', arenaId: 'cathedral' },
];

/** The number of nodes in the campaign (frontier bookkeeping + persistence array length). */
export const CAMPAIGN_NODE_COUNT = CAMPAIGN_NODES.length;

/** The two bonus isles are always visible, always locked this phase. UI-only tiles. */
export const LOCKED_ISLE_COUNT = 2;

/** Resolve a node by id (1-based). Returns undefined for an out-of-range id (no throw — callers
 *  gate on it; an unknown id is not a node). */
export function getCampaignNode(id: number | null | undefined): CampaignNodeDef | undefined {
  if (id == null) return undefined;
  return CAMPAIGN_NODES.find((n) => n.id === id);
}

/** The enemy's absorb buffer per round for a node (0 when it ships no defense). */
export function defenseAmount(node: CampaignNodeDef | undefined): number {
  return node?.defense?.amount ?? 0;
}

export interface CampaignExchangeResult {
  state: MatchState;
  /** Absorb buffer remaining AFTER this exchange (refilled externally at every round start). */
  absorbRemaining: number;
  /** True iff the player's decisive hit was absorbed by the enemy defense this exchange. */
  absorbed: boolean;
}

/**
 * THE SHARED ABSORB DECISION (Tim's shield/bulk law) — the ONE function the provider, the
 * Monte-Carlo sim and the tests all route campaign exchanges through, so the absorption rule can
 * never drift between them. PURE; the frozen engine is imported, never modified.
 *
 * Rule: when the PLAYER (p1) wins a decisive exchange while the enemy has absorb buffer left, the
 * hit is ABSORBED — the buffer decrements and the frozen engine NEVER processes the exchange (no
 * applyExchange call: hp, roundsWon, round/match state all untouched). The exchange still appends
 * a synthetic history record (same shape applyExchange would write) so the presentation layer
 * (reveal plates, choreography) reads the picks exactly like any other exchange; the engine never
 * reads history content, so the record is inert. Enemy hits on the player are NEVER absorbed
 * (the player has no defense) and clashes pass through unchanged.
 */
export function applyCampaignExchange(
  state: MatchState,
  p1Move: Move,
  p2Move: Move,
  absorbRemaining: number,
): CampaignExchangeResult {
  const outcome = resolveExchange(p1Move, p2Move);
  if (outcome.kind === 'hit' && outcome.winner === 'p1' && absorbRemaining > 0) {
    return {
      state: { ...state, history: [...state.history, { p1: p1Move, p2: p2Move, outcome }] },
      absorbRemaining: absorbRemaining - 1,
      absorbed: true,
    };
  }
  return { state: applyExchange(state, p1Move, p2Move), absorbRemaining, absorbed: false };
}

/**
 * THE MATCH JUDGE. PURE. Called after EVERY completed round (never mid-round) with the round-win
 * counts only. 'met' when the player reaches `roundsToWin` first, 'failed' when the enemy does,
 * 'open' otherwise. Deliberately IGNORES the engine's matchOver: the frozen engine hard-codes
 * first-to-2, so on first-to-3 nodes the campaign keeps starting rounds past the engine's own
 * "match over" (applyExchange/startNextRound recompute per-round state from hp/roundsWon and stay
 * correct past it — proven in fightCampaign.test.ts).
 */
export function evaluateCampaignMatch(
  roundsWonP1: number,
  roundsWonP2: number,
  roundsToWin: 2 | 3,
): CampaignMatchResult {
  if (roundsWonP1 >= roundsToWin) return 'met';
  if (roundsWonP2 >= roundsToWin) return 'failed';
  return 'open';
}

/**
 * The TOTAL credited on a won node, floor-truncated by bigint division (swoobz-casino-math):
 *   payout = stake * multBps / 10000
 * The stake was already deducted at commit, so the NET on a win is `payout - stake` and on a loss
 * is `-stake` (nothing credited). All BigInt; never a float near lamports.
 */
export function campaignPayout(stake: bigint, multBps: bigint): bigint {
  return (stake * multBps) / 10000n;
}

// Round-win probability q per defense amount, as exact rationals: q = P(player lands 3+S decisive
// hits before taking 3) on a fair coin. Derived by first-step enumeration (regression-tested by
// independent recomputation in fightCampaign.test.ts).
const ROUND_Q: Record<number, { num: bigint; den: bigint }> = {
  0: { num: 1n, den: 2n },
  1: { num: 11n, den: 32n },
  2: { num: 29n, den: 128n },
};

/** Exact match-win probability for a defense amount + format, as a bigint rational.
 *  first-to-2: P = q^2(3-2q); first-to-3: P = q^3(1 + 3(1-q) + 6(1-q)^2). */
export function matchWinProbability(amount: number, roundsToWin: 2 | 3): { num: bigint; den: bigint } {
  const q = ROUND_Q[amount];
  if (!q) throw new Error(`No round-win probability for defense amount ${amount}`);
  const { num: qn, den: qd } = q;
  if (roundsToWin === 2) {
    // q^2 * (3 - 2q) = qn^2 * (3qd - 2qn) / qd^3
    return { num: qn * qn * (3n * qd - 2n * qn), den: qd * qd * qd };
  }
  // q^3 * (1 + 3(1-q) + 6(1-q)^2) = qn^3 * (qd^2 + 3(qd-qn)qd + 6(qd-qn)^2) / qd^5
  const r = qd - qn; // (1-q) numerator over qd
  return { num: qn * qn * qn * (qd * qd + 3n * r * qd + 6n * r * r), den: qd * qd * qd * qd * qd };
}

/** WIN CHANCE display string (one decimal, e.g. "50.0", "27.3", "8.0") from the EXACT rational —
 *  integer math only (round half-up on tenths of a percent), no float drift. */
export function formatWinChance(amount: number, roundsToWin: 2 | 3): string {
  const { num, den } = matchWinProbability(amount, roundsToWin);
  // tenths of a percent, rounded half-up: round(num * 1000 / den) in bigint.
  const tenths = (num * 2000n + den) / (2n * den);
  const whole = tenths / 10n;
  const frac = tenths % 10n;
  return `${whole.toString()}.${frac.toString()}`;
}

/** PAYS display string (two decimals, e.g. "1.92", "11.94") from multBps — bigint, floor to cents. */
export function formatMult(multBps: bigint): string {
  const whole = multBps / 10000n;
  const frac = (multBps % 10000n) / 100n; // floor to two decimals
  return `${whole.toString()}.${frac.toString().padStart(2, '0')}`;
}
