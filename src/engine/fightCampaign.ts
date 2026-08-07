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
//   S=0: q = 1/2   S=1: q = 11/32   S=2: q = 29/128   S=3: q = 37/256
// Match win: first-to-2 P = q^2(3-2q); first-to-3 P = q^3(1 + 3(1-q) + 6(1-q)^2).

import type { MatchState, Move } from './fightEngine';
import { applyExchange, resolveExchange } from './fightEngine';

/** The judge's verdict after a completed round. 'open' = keep fighting; 'met'/'failed' end it. */
export type CampaignMatchResult = 'met' | 'failed' | 'open';

/** Per-node enemy defense: absorb the player's first `amount` decisive hits each round.
 *  `kind` is PRESENTATION ONLY — the interception math is identical for both kinds. */
export interface CampaignDefense {
  kind: 'shield' | 'bulk';
  /** Any non-negative integer. Was `1 | 2` then `1 | 2 | 3`, each widening tied to a new hardcoded
   *  ROUND_Q row; since the ~4x ladder (2026-08-07) `roundWinProbability` prices ANY rung in exact
   *  integer math, so the union is gone. The RTP-ceiling test is what keeps a new value honest. */
  amount: number;
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
  /** The PLAYER's guard: bonus HP for this node, absorbing the enemy's first `guard` decisive hits
   *  each round (absent = none). The second knob of the ~4x ladder — see roundWinProbability. */
  guard?: number;
  /** Payout multiplier in basis points (10000 = 1.00x): floor(0.96 / P(match win)) to clean bps. */
  multBps: bigint;
  fighterId: string; // registry id of the enemy fighter (VOLTA fills every slot for FIGHT VISUALS)
  arenaId: string; // background arena id (cathedral default this phase)
  reward?: CampaignReward; // optional cosmetic unlock (see CampaignReward)
  /** The CONQUEST-MAP enemy this node reveals (phase 20). Tim's final per-node art, keyed to
   *  public/assets/enemies/<id>.webp (silhouette/cutout) + <id>-pfp.webp (portrait). The engine
   *  stays asset-path-free: the UI derives the paths from `id`. Distinct from `fighterId`, which
   *  still drives the IN-FIGHT animated clips (VOLTA stand-in until per-enemy clips ship). */
  enemy: { id: string; name: string };
}

// The 10 playable nodes (RONIN ZERO season theme; names in a Japanese sengoku register). The
// ladder escalates via format + defense, kinds mixed for variety (Tim's addendum). SIX rungs as of
// the DEFENCE +3 finale (Tim, 2026-08-04) — map 10 no longer shares maps 8-9's defense:
//   n1-2  to2 none      50.00%  x1.92      n6-7  to3 +1      22.55%  x4.25
//   n3-5  to2 +1        27.33%  x3.51      n8-9  to2 +2      13.07%  x7.34
//   n10   to3 +3         2.40% x39.95   <- its OWN rung (was to3 +2, 8.04%, x11.94)
/** THE 4.00x PAYOUT CAP (Tim, 2026-08-07). No node may pay more than 4x the stake.
 *
 *  ⛔ THIS DECOUPLES PAYOUT FROM ODDS, AND THAT IS DELIBERATE. Tim's instruction was explicit and
 *  reaffirmed: "lower the max win to 4 ... keep the difficulty as it is, dont increase win chance or
 *  anything." Since RTP = P(win) x multiplier and the win chances are UNCHANGED, capping the
 *  multiplier necessarily lowers the return on every node it touches:
 *
 *      node  win%      pays        RTP
 *      1,2   50.0000%  1.92x    96.00%   (untouched, already under the cap)
 *      3,4,5 27.3254%  3.512x   95.97%   (untouched)
 *      6,7   22.5546%  4.00x    90.22%   (was 4.256x / 95.92%)
 *      8,9   13.0733%  4.00x    52.29%   (was 7.343x / 96.00%)
 *      10     2.4025%  4.00x     9.61%   (was 39.959x / 96.00%)
 *
 *  So the campaign is no longer a ~96% game: the mean across the ten nodes is 77.45%, and the finale
 *  returns 9.61%. The 39.959x jackpot is gone — max win on a $5 stake drops $199.79 -> $20.00.
 *
 *  BECAUSE OF THAT, THE ON-SCREEN DISCLOSURES ARE NOW COMPUTED, NEVER HARDCODED. The map used to
 *  read "each trial returns 96% to players over time" and the stake screen "96.0% RTP to player";
 *  both were true only while every node sat on the 96% line, and shipping them unchanged would have
 *  made the game state a false number to the player. `nodeRtpPercent()` derives each node's real
 *  return from the SAME exact rationals that price it, so the copy can never drift from the math
 *  again. If a future ladder returns to a uniform RTP, the copy follows automatically.
 *
 *  Anything that assumed "96%" — the RTP-ceiling test's lower bound, the Monte-Carlo battery's
 *  assertion band, CAMPAIGN-SPEC.md, FIGHT-SPEC §8 — was updated in the same commit. */
export const MAX_MULT_BPS = 40000n;

export const CAMPAIGN_NODES: CampaignNodeDef[] = [
  // NOTE: the demo cosmetic rewards (AUTOMAT packs on nodes 2 + 8) were REMOVED for now
  // (Tim, 2026-07-21). The CampaignReward type, `reward?` field, UI surfaces and the webp
  // assets all remain wired — re-adding a reward is one registry-row edit.
  { id: 1, name: 'KUROHAMA DOCKS', title: 'Dockmaster of Kurohama', roundsToWin: 2, multBps: 19200n, fighterId: 'sora-yari', arenaId: 'docks', enemy: { id: 'sora-yari', name: 'SORA YARI' } },
  // phase 283: fighterId was 'volta' (a deleted placeholder house fighter). Repointed to oni-tetsubo,
  // which is a real 11-clip kit. The ENEMY IDENTITY is unchanged — the map card, name and reveal art
  // stay KITSUNE TANTO; only the animated body that fights you is now the oni.
  { id: 2, name: 'ASHEN TORII', title: 'Keeper of the Ashen Torii', roundsToWin: 2, multBps: 19200n, fighterId: 'oni-tetsubo', arenaId: 'torii', enemy: { id: 'kitsune-tanto', name: 'KITSUNE TANTO' } },
  { id: 3, name: 'WHISPERING BAMBOO', title: 'Blade of the Bamboo Sea', roundsToWin: 2, defense: { kind: 'bulk', amount: 1 }, multBps: 35120n, fighterId: 'thorn-warden', arenaId: 'bamboo', enemy: { id: 'thorn-warden', name: 'THORN WARDEN' } },
  { id: 4, name: 'SNOWFANG PASS', title: 'Sentinel of Snowfang', roundsToWin: 2, defense: { kind: 'shield', amount: 1 }, multBps: 35120n, fighterId: 'hollow-pale', arenaId: 'snowfang', enemy: { id: 'hollow-pale', name: 'HOLLOW PALE' } },
  { id: 5, name: 'KAWA CROSSING', title: 'Duelist of the Crossing', roundsToWin: 2, defense: { kind: 'bulk', amount: 1 }, multBps: 35120n, fighterId: 'satoshi-odachi', arenaId: 'kawa', enemy: { id: 'satoshi-odachi', name: 'SATOSHI ODACHI' } },
  { id: 6, name: 'HOLLOW SHRINE', title: 'Phantom of the Hollow Shrine', roundsToWin: 3, defense: { kind: 'shield', amount: 1 }, multBps: MAX_MULT_BPS, fighterId: 'eclipse-ofuda', arenaId: 'shrine', enemy: { id: 'eclipse-ofuda', name: 'ECLIPSE OFUDA' } },
  { id: 7, name: 'BURNED PAGODA', title: 'Ash Warden of the Pagoda', roundsToWin: 3, defense: { kind: 'bulk', amount: 1 }, multBps: MAX_MULT_BPS, fighterId: 'ir37-pink-tessen', arenaId: 'pagoda', enemy: { id: 'ir37-pink-tessen', name: 'IR-37 PINK TESSEN' } },
  { id: 8, name: 'RED MIST GORGE', title: 'Tyrant of the Red Mist', roundsToWin: 2, defense: { kind: 'shield', amount: 2 }, multBps: MAX_MULT_BPS, fighterId: 'ir56-lion-serpent', arenaId: 'gorge', enemy: { id: 'ir56-lion-serpent', name: 'IR-56 LION-SERPENT' } },
  { id: 9, name: 'CRIMSON GATES', title: 'Warlord of the Crimson Gates', roundsToWin: 2, defense: { kind: 'bulk', amount: 2 }, multBps: MAX_MULT_BPS, fighterId: 'lady-kurotachi', arenaId: 'moat', enemy: { id: 'lady-kurotachi', name: 'LADY KUROTACHI' } },
  // Tim's ruling (2026-07-22): the finalboss art IS the final boss - IR-48 HEX PAPER LORD is the
  // name; the lore line follows the other nodes' register. RONIN ZERO stays as the SEASON brand
  // (map header), not the boss identity.
  // THE FINALE RUNG (Tim, 2026-08-04): defense 3 / first-to-3. P = 13207617791/549755813888 =
  // 2.4024%, so the largest ladder-convention price (multiple of 10) under the 96% ceiling is
  // 399590n -> RTP 95.9996%. 399600n would be 96.0020% and is OUT of band. Stake/price surfaces,
  // arena, enemy and fighterId are untouched; only defense.amount and multBps moved.
  { id: 10, name: 'ZERO CITADEL', title: 'Lord of the Zero Citadel', roundsToWin: 3, defense: { kind: 'shield', amount: 3 }, multBps: MAX_MULT_BPS, fighterId: 'ir48-hex-paper-lord', arenaId: 'sanctum', enemy: { id: 'ir48-hex-paper-lord', name: 'IR-48 HEX PAPER LORD' } },
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

/** The PLAYER's guard buffer per round for a node (0 when the node grants none). The mirror of
 *  `defenseAmount`: it absorbs the ENEMY's first `guard` decisive hits each round, i.e. it is bonus
 *  player HP. Added with the ~4x ladder (Tim, 2026-08-07) — it is the second knob that makes ten
 *  distinct multipliers reachable while the top one stays near 4x. */
export function guardAmount(node: CampaignNodeDef | undefined): number {
  return node?.guard ?? 0;
}

export interface CampaignExchangeResult {
  state: MatchState;
  /** Absorb buffer remaining AFTER this exchange (refilled externally at every round start). */
  absorbRemaining: number;
  /** Player GUARD buffer remaining AFTER this exchange (also refilled at every round start). */
  guardRemaining: number;
  /** True iff the player's decisive hit was absorbed by the enemy defense this exchange. */
  absorbed: boolean;
  /** True iff the ENEMY's decisive hit was absorbed by the player's guard this exchange. */
  guarded: boolean;
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
 * reads history content, so the record is inert. Clashes pass through unchanged.
 *
 * SYMMETRIC SINCE THE ~4x LADDER (Tim, 2026-08-07): the ENEMY's decisive hit is absorbed the same
 * way while the player has GUARD left. Guard is bonus player HP expressed as a buffer so it reuses
 * this exact interception path instead of touching the frozen engine's hp. The two buffers cannot
 * both fire on one exchange — a decisive exchange has exactly one winner — so the order of the two
 * checks below is irrelevant to the outcome, and the round-win race stays a fair coin between
 * A = 3 + absorb and B = 3 + guard hits, which is precisely what roundWinProbability() prices.
 */
export function applyCampaignExchange(
  state: MatchState,
  p1Move: Move,
  p2Move: Move,
  absorbRemaining: number,
  guardRemaining = 0,
): CampaignExchangeResult {
  const outcome = resolveExchange(p1Move, p2Move);
  const intercepted = (): MatchState => ({
    ...state,
    history: [...state.history, { p1: p1Move, p2: p2Move, outcome }],
  });
  if (outcome.kind === 'hit' && outcome.winner === 'p1' && absorbRemaining > 0) {
    return {
      state: intercepted(),
      absorbRemaining: absorbRemaining - 1,
      guardRemaining,
      absorbed: true,
      guarded: false,
    };
  }
  if (outcome.kind === 'hit' && outcome.winner === 'p2' && guardRemaining > 0) {
    return {
      state: intercepted(),
      absorbRemaining,
      guardRemaining: guardRemaining - 1,
      absorbed: false,
      guarded: true,
    };
  }
  return {
    state: applyExchange(state, p1Move, p2Move),
    absorbRemaining,
    guardRemaining,
    absorbed: false,
    guarded: false,
  };
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

// ── ROUND-WIN PROBABILITY, TWO KNOBS ──────────────────────────────────────────────────────────
// A round is a RACE on a fair coin (conditioned on being decisive, an exchange is 50/50):
//   the player must land  A = 3 + enemyAbsorb  hits before the enemy lands  B = 3 + playerGuard.
// So q = P(A successes before B failures) = sum over k=0..B-1 of C(A-1+k, k) / 2^(A+k).
//
// This REPLACES the old hardcoded ROUND_Q table (Tim, 2026-08-07, the ~4x ladder). That table only
// varied the enemy's absorb with the player fixed at 3 HP, which pinned the rungs to
// 50% / 34.4% / 22.6% / 14.5% with nothing in between — and since RTP = P * mult is held at 96%,
// coarse rungs mean coarse multipliers (1.92x then a jump to 3.51x). Giving the PLAYER a guard
// buffer opens the band above 50% and the gaps between, which is what lets all ten nodes carry a
// distinct multiplier while the top one stays near 4x.
//
// PINNED: with playerGuard = 0 this function reproduces the four shipped values EXACTLY
// (1/2, 11/32, 29/128, 37/256) — asserted in fightCampaign.test.ts, so the retired table remains
// the regression oracle for the general formula rather than being deleted on trust.
const binom = (n: bigint, k: bigint): bigint => {
  let r = 1n;
  for (let i = 0n; i < k; i += 1n) r = (r * (n - i)) / (i + 1n);
  return r;
};
const gcdBig = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcdBig(b, a % b));
const reduce = (num: bigint, den: bigint): { num: bigint; den: bigint } => {
  const g = gcdBig(num, den) || 1n;
  return { num: num / g, den: den / g };
};

/** Exact q = P(player wins a ROUND), as a reduced bigint rational. Pure integer math. */
export function roundWinProbability(enemyAbsorb: number, playerGuard: number): { num: bigint; den: bigint } {
  if (enemyAbsorb < 0 || playerGuard < 0) throw new Error(`negative rung: absorb ${enemyAbsorb} guard ${playerGuard}`);
  const A = 3n + BigInt(enemyAbsorb);
  const B = 3n + BigInt(playerGuard);
  // Common denominator 2^(A+B-1): pad the race to exactly A+B-1 tosses (tosses after it is settled
  // cannot change who got there first), so every term is an integer over one power of two.
  const den = 1n << (A + B - 1n);
  let num = 0n;
  for (let k = 0n; k < B; k += 1n) num += binom(A - 1n + k, k) * (1n << (B - 1n - k));
  return reduce(num, den);
}

/** Exact match-win probability for a rung + format, as a bigint rational.
 *  first-to-2: P = q^2(3-2q); first-to-3: P = q^3(1 + 3(1-q) + 6(1-q)^2). */
export function matchWinProbability(
  amount: number,
  roundsToWin: 2 | 3,
  playerGuard = 0,
): { num: bigint; den: bigint } {
  const { num: qn, den: qd } = roundWinProbability(amount, playerGuard);
  if (roundsToWin === 2) {
    // q^2 * (3 - 2q) = qn^2 * (3qd - 2qn) / qd^3
    return reduce(qn * qn * (3n * qd - 2n * qn), qd * qd * qd);
  }
  // q^3 * (1 + 3(1-q) + 6(1-q)^2) = qn^3 * (qd^2 + 3(qd-qn)qd + 6(qd-qn)^2) / qd^5
  const r = qd - qn; // (1-q) numerator over qd
  return reduce(qn * qn * qn * (qd * qd + 3n * r * qd + 6n * r * r), qd * qd * qd * qd * qd);
}

/** WIN CHANCE display string (one decimal, e.g. "50.0", "27.3", "8.0") from the EXACT rational —
 *  integer math only (round half-up on tenths of a percent), no float drift. */
export function formatWinChance(amount: number, roundsToWin: 2 | 3, playerGuard = 0): string {
  const { num, den } = matchWinProbability(amount, roundsToWin, playerGuard);
  // tenths of a percent, rounded half-up: round(num * 1000 / den) in bigint.
  const tenths = (num * 2000n + den) / (2n * den);
  const whole = tenths / 10n;
  const frac = tenths % 10n;
  return `${whole.toString()}.${frac.toString()}`;
}

/** A node's ACTUAL return to player, in basis points of 1.0 (9600 == 96.00%). Exact integer math:
 *  RTP = P(win) x multBps/10000, so bps = P.num * multBps / P.den. Floors, so the displayed number
 *  never overstates what the node returns.
 *
 *  This exists because the 4.00x cap (see MAX_MULT_BPS) made the per-node return NON-UNIFORM. Every
 *  RTP shown to the player is derived from here, never typed as a literal — a hardcoded "96%" is
 *  exactly how a game ends up telling the player a number its own math contradicts. */
export function nodeRtpBps(node: CampaignNodeDef): bigint {
  const P = matchWinProbability(defenseAmount(node), node.roundsToWin, guardAmount(node));
  return (P.num * node.multBps) / P.den;
}

/** A node's return as a display string with one decimal, e.g. "96.0", "52.2", "9.6". Floors. */
export function nodeRtpPercent(node: CampaignNodeDef): string {
  const bps = nodeRtpBps(node); // hundredths of a percent
  const tenths = bps / 10n;
  return `${(tenths / 10n).toString()}.${(tenths % 10n).toString()}`;
}

/** The lowest and highest node return in the shipped ladder, for the map's honest range line. */
export function campaignRtpRange(): { min: string; max: string } {
  const all = CAMPAIGN_NODES.map((n) => nodeRtpBps(n));
  const min = all.reduce((a, b) => (b < a ? b : a));
  const max = all.reduce((a, b) => (b > a ? b : a));
  const fmt = (bps: bigint): string => `${(bps / 100n).toString()}.${((bps / 10n) % 10n).toString()}`;
  return { min: fmt(min), max: fmt(max) };
}

/** PAYS display string (two decimals, e.g. "1.92", "39.95") from multBps — bigint, floor to cents.
 *  FLOORS, never rounds: 399590n -> "39.95", not "39.96". Anything re-deriving a displayed price with
 *  toFixed(2) will disagree with the game by a cent and land on a price the 96% ceiling forbids. */
export function formatMult(multBps: bigint): string {
  const whole = multBps / 10000n;
  const frac = (multBps % 10000n) / 100n; // floor to two decimals
  return `${whole.toString()}.${frac.toString().padStart(2, '0')}`;
}
