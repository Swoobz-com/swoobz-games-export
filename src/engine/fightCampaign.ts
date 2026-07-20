// Frozen Requiem — CONQUEST MAP campaign math (pure, deterministic, no DOM, no React).
//
// This is the money + progression brain of the campaign mode (CAMPAIGN-SPEC.md, phase 16). It
// owns three things and nothing else:
//   1. The tier table — each objective's EXACT probability (stored as an integer rational so it
//      is display- and test-exact) and its payout multiplier in bps.
//   2. The 10-node conquest map registry (data, one row per node — a future character/arena drops
//      in by editing the row, mirroring characters/registry.ts + arenas/arenas.ts).
//   3. `evaluateObjective` — the pure early-exit judge run after every completed ROUND, and
//      `campaignPayout` — the bigint floor-truncated payout.
//
// ECONOMIC LAW (spec §0): every node is priced at <=96% RTP. multBps = floor(0.96 / P) to clean
// bps, so no node ever pays better than 96% and the grind/stake-cap exploit is structurally
// impossible. Money math is all BigInt bps with floor truncation (swoobz-casino-math); the stake
// is deducted at commit, so on `met` the TOTAL credited is `campaignPayout(stake, multBps)` and
// the net is `payout - stake`; on `failed` nothing is credited (the stake is already gone).
//
// Campaign enemies pick UNIFORM RANDOM (engine `randomMove`), NEVER `aiPick` — random is
// Nash-neutral so the measured probabilities below hold vs ANY player (spec §0.2). This module is
// engine-adjacent but imports NOTHING from the frozen engine: it speaks only round-level facts.

/** The six objective tiers, hardest last. Each maps to one payout multiplier. */
export type CampaignTier =
  | 'takeRound'
  | 'winMatch'
  | 'flawlessRound'
  | 'win20'
  | 'winWithFlawless'
  | 'bossRequiem';

/** The judge's verdict after a completed round. 'open' = keep fighting; 'met'/'failed' end it. */
export type ObjectiveResult = 'met' | 'failed' | 'open';

export interface TierDef {
  id: CampaignTier;
  /** Player-facing objective line (spec §1 column 2). No em-dashes (RG-C5 copy law). */
  objective: string;
  /** EXACT probability of meeting the objective vs a uniform-random enemy, as an integer
   *  rational (numerator/denominator) — stored exact so display and the regression tests never
   *  touch a float. Derivations live in fightCampaign.test.ts (closed-form recomputation). */
  pNum: number;
  pDen: number;
  /** Payout multiplier in basis points (10000 = 1.00x). floor(0.96 / P) to clean bps (spec §0). */
  multBps: bigint;
}

// The tier table, EXACT values from CAMPAIGN-SPEC §1. multBps * pNum <= 9600 * pDen for every row
// (RTP <= 96%), asserted in the tests.
export const TIERS: Record<CampaignTier, TierDef> = {
  takeRound: { id: 'takeRound', objective: 'TAKE AT LEAST ONE ROUND', pNum: 3, pDen: 4, multBps: 12800n },
  winMatch: { id: 'winMatch', objective: 'WIN THE MATCH', pNum: 1, pDen: 2, multBps: 19200n },
  flawlessRound: { id: 'flawlessRound', objective: 'WIN ANY ROUND FLAWLESS', pNum: 9, pDen: 32, multBps: 34100n },
  win20: { id: 'win20', objective: 'WIN THE MATCH 2-0', pNum: 1, pDen: 4, multBps: 38400n },
  winWithFlawless: { id: 'winWithFlawless', objective: 'WIN THE MATCH WITH A FLAWLESS ROUND', pNum: 7, pDen: 32, multBps: 43800n },
  bossRequiem: { id: 'bossRequiem', objective: 'WIN 2-0 WITH A FLAWLESS ROUND', pNum: 7, pDen: 64, multBps: 87700n },
};

/** A conquest-map node. ONE row per node — future characters/arenas drop in by editing the row
 *  only (spec §2), the same data-not-code shape as characters/registry.ts + arenas/arenas.ts. */
export interface CampaignNodeDef {
  id: number; // 1..10, the frontier index is id-1
  name: string;
  title: string; // enemy card title
  tier: CampaignTier;
  fighterId: string; // registry id of the enemy fighter (VOLTA fills every slot this phase)
  arenaId: string; // background arena id (cathedral default this phase)
}

// The 10 playable nodes (spec §2, RONIN ZERO season theme). Names are originals in a Japanese
// sengoku register. VOLTA fills every enemy slot for now (node 10 is PRESENTED as RONIN ZERO in
// copy only this phase); cathedral is the only arena until the roster/arenas grow.
export const CAMPAIGN_NODES: CampaignNodeDef[] = [
  { id: 1, name: 'KUROHAMA DOCKS', title: 'Dockmaster of Kurohama', tier: 'takeRound', fighterId: 'volta', arenaId: 'cathedral' },
  { id: 2, name: 'ASHEN TORII', title: 'Keeper of the Ashen Torii', tier: 'takeRound', fighterId: 'volta', arenaId: 'cathedral' },
  { id: 3, name: 'WHISPERING BAMBOO', title: 'Blade of the Bamboo Sea', tier: 'winMatch', fighterId: 'volta', arenaId: 'cathedral' },
  { id: 4, name: 'SNOWFANG PASS', title: 'Sentinel of Snowfang', tier: 'winMatch', fighterId: 'volta', arenaId: 'cathedral' },
  { id: 5, name: 'KAWA CROSSING', title: 'Duelist of the Crossing', tier: 'winMatch', fighterId: 'volta', arenaId: 'cathedral' },
  { id: 6, name: 'HOLLOW SHRINE', title: 'Phantom of the Hollow Shrine', tier: 'flawlessRound', fighterId: 'volta', arenaId: 'cathedral' },
  { id: 7, name: 'BURNED PAGODA', title: 'Ash Warden of the Pagoda', tier: 'win20', fighterId: 'volta', arenaId: 'cathedral' },
  { id: 8, name: 'RED MIST GORGE', title: 'Tyrant of the Red Mist', tier: 'win20', fighterId: 'volta', arenaId: 'cathedral' },
  { id: 9, name: 'CRIMSON GATES', title: 'Warlord of the Crimson Gates', tier: 'winWithFlawless', fighterId: 'volta', arenaId: 'cathedral' },
  { id: 10, name: 'ZERO CITADEL', title: 'RONIN ZERO', tier: 'bossRequiem', fighterId: 'volta', arenaId: 'cathedral' },
];

/** The number of nodes in the campaign (frontier bookkeeping + persistence array length). */
export const CAMPAIGN_NODE_COUNT = CAMPAIGN_NODES.length;

/** The two bonus isles are always visible, always locked this phase (spec §2). UI-only tiles. */
export const LOCKED_ISLE_COUNT = 2;

/** Resolve a node by id (1-based). Returns undefined for an out-of-range id (no throw — callers
 *  gate on it; an unknown id is not a node). */
export function getCampaignNode(id: number | null | undefined): CampaignNodeDef | undefined {
  if (id == null) return undefined;
  return CAMPAIGN_NODES.find((n) => n.id === id);
}

// Match model (mirrors the frozen engine): best of 3 rounds, first to 2 round wins.
const ROUNDS_TO_WIN = 2;

/**
 * THE OBJECTIVE JUDGE (spec §3). PURE. Called after EVERY completed round (never mid-round) with
 * round-level facts only:
 *   - roundsWonP1 / roundsWonP2: rounds each side has won so far
 *   - flawlessWinsP1: how many of P1's round wins were FLAWLESS (won at full HP)
 *   - matchOver: whether the match has ended (either side reached ROUNDS_TO_WIN)
 * Returns 'met' | 'failed' | 'open'. The fight ENDS as soon as this leaves 'open' (early exit).
 * Every branch checks its terminal conditions in the exact order the spec specifies so the
 * snappy fails on the 2-0 tiers and the mid-match flawless met fire at the earliest legal round.
 */
export function evaluateObjective(
  tier: CampaignTier,
  roundsWonP1: number,
  roundsWonP2: number,
  flawlessWinsP1: number,
  matchOver: boolean,
): ObjectiveResult {
  const p1WonMatch = roundsWonP1 >= ROUNDS_TO_WIN;
  const p2WonMatch = roundsWonP2 >= ROUNDS_TO_WIN;

  switch (tier) {
    case 'takeRound':
      // Met the instant P1 takes a round; failed if P2 reaches 2 wins with P1 still at 0.
      if (roundsWonP1 >= 1) return 'met';
      if (p2WonMatch) return 'failed';
      return 'open';

    case 'winMatch':
      if (p1WonMatch) return 'met';
      if (p2WonMatch) return 'failed';
      return 'open';

    case 'flawlessRound':
      // Met on ANY P1 flawless round win (even mid-match, even if the match is later lost — the
      // fight ends there); failed only once the match is over without one.
      if (flawlessWinsP1 >= 1) return 'met';
      if (matchOver) return 'failed';
      return 'open';

    case 'win20':
      // Failed the moment P1 loses a round (P2 has any win); met at a clean 2-0.
      if (roundsWonP2 >= 1) return 'failed';
      if (p1WonMatch) return 'met';
      return 'open';

    case 'winWithFlawless':
      // Failed if P2 wins the match; at a P1 match win, met iff a flawless win happened, else it
      // is too late (match over) so failed. Open while a future round can still be flawless.
      if (p2WonMatch) return 'failed';
      if (p1WonMatch) return flawlessWinsP1 >= 1 ? 'met' : 'failed';
      return 'open';

    case 'bossRequiem':
      // Failed the moment P1 loses a round; at 2-0, met iff a round was flawless, else failed.
      if (roundsWonP2 >= 1) return 'failed';
      if (p1WonMatch) return flawlessWinsP1 >= 1 ? 'met' : 'failed';
      return 'open';

    default: {
      const exhaustive: never = tier;
      return exhaustive;
    }
  }
}

/**
 * The TOTAL credited on a met objective, floor-truncated by bigint division (swoobz-casino-math):
 *   payout = stake * multBps / 10000
 * The stake was already deducted at commit, so the NET on met is `payout - stake` and on failed
 * is `-stake` (nothing credited). All BigInt; never a float near lamports.
 */
export function campaignPayout(stake: bigint, multBps: bigint): bigint {
  return (stake * multBps) / 10000n;
}

/** WIN CHANCE display string (one decimal, e.g. "75.0", "28.1") derived from the EXACT rational —
 *  integer math only, no float rounding drift. */
export function formatWinChance(tier: CampaignTier): string {
  const { pNum, pDen } = TIERS[tier];
  // tenths of a percent, rounded half-up from exact integers: round(pNum * 1000 / pDen).
  const tenths = Math.round((pNum * 1000) / pDen);
  const whole = Math.floor(tenths / 10);
  const frac = tenths % 10;
  return `${whole}.${frac}`;
}

/** PAYS display string (two decimals, e.g. "1.28", "8.77") from multBps — bigint, floor to cents. */
export function formatMult(multBps: bigint): string {
  const whole = multBps / 10000n;
  const frac = (multBps % 10000n) / 100n; // floor to two decimals
  return `${whole.toString()}.${frac.toString().padStart(2, '0')}`;
}
