// useFightController(): the whole game state machine. All game wiring lives here so the
// UI layer (FightExperience) is presentation-only and can be swapped without touching logic.
//
// StrictMode note: React 18 double-invokes setState UPDATER functions (the callback form,
// `setX(prev => ...)`) in dev to catch impure reducers, and double-invokes effect setup on
// initial mount. This file therefore NEVER puts side effects (RNG draws, transport sends,
// setTimeout scheduling, audio) inside a setState updater -- side effects only ever run from
// plain function bodies triggered by real events (clicks, timer callbacks), and "current
// value" reads use refs kept in sync alongside each setState call, not updater callbacks.
// Resources (the transport) are created/destroyed in effect setup/cleanup so a StrictMode
// mount -> cleanup -> mount cycle simply recreates a fresh, non-disposed instance.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ExchangeOutcome, MatchState, Move } from '../engine/fightEngine';
import { applyExchange, createMatch, randomMove, startNextRound } from '../engine/fightEngine';
import { secureRandom } from '../engine/secureRng';
import type { AiPersonality } from '../engine/fightAi';
import type { MatchEvent, MatchTransport } from '../transport/matchTransport';
import { WsTransport } from '../transport/matchTransport';
import {
  playClash,
  playClockTick,
  playFightBanner,
  playFlawless,
  playHitBlock,
  playHitStrike,
  playHitThrow,
  playKo,
  playLockIn,
  playPayout,
  playRoundBanner,
  playStakeCommit,
  playVictory,
} from '../audio/fightAudio';
import {
  clampStake,
  cpuWinPayout,
  DEFAULT_STAKE,
  INITIAL_BALANCE,
  MIN_STAKE,
  ONE_USDC,
  potLamports,
  settle,
} from '../engine/fightStakes';
import {
  applyCampaignExchange,
  campaignPayout,
  CAMPAIGN_NODE_COUNT,
  defenseAmount,
  guardAmount,
  evaluateCampaignMatch,
  getCampaignNode,
} from '../engine/fightCampaign';
import type { CampaignMatchResult } from '../engine/fightCampaign';

export type Phase =
  | 'title'
  | 'mode'
  | 'campaignMap'
  | 'charSelect'
  | 'stake'
  | 'vsIntro'
  | 'roundIntro'
  | 'fightBanner'
  | 'picking'
  | 'reveal'
  | 'resolve'
  | 'roundEnd'
  | 'matchEnd';

export type Mode = 'cpu' | 'friend' | 'campaign';

// What the stake phase will start once the wager is committed. Captured when the
// player picks a CPU personality / enters the friend flow / selects a campaign node, replayed by
// commitStake.
type PendingStart =
  | { kind: 'cpu'; personality: AiPersonality }
  | { kind: 'friendCreate' }
  | { kind: 'friendJoin'; code: string }
  | { kind: 'campaign'; nodeId: number };

/** Frozen after settle — the numbers the victory/defeat receipt strip prints. `duelMode`
 *  lets the UI render honestly per mode: 'friend' is winner-takes-all (opponentStake/pot are
 *  the 2S pot fiction, unchanged), 'cpu' is house-priced (a win pays cpuWinPayout(stake) = 1.92x;
 *  opponentStake/pot are unused fiction for CPU and the UI drops them). */
export interface StakeReceipt {
  /** Which economy settled this match: 'friend' = winner-takes-all 2S, 'cpu' = 1.92x house price. */
  duelMode: 'cpu' | 'friend';
  stakeLamports: bigint;
  opponentStakeLamports: bigint;
  potLamports: bigint;
  playerWon: boolean;
  payoutLamports: bigint;
  balanceAfterLamports: bigint;
}

// Practice-bank balance persistence. Stored as a plain decimal lamport string
// (BigInt has no JSON form), read once at init; any corrupt/absent value falls
// back to the fresh practice bank.
// NOTE: the game is branded STANDOFF (renamed 2026-07-20); every storage key keeps the
// historic 'frozen-requiem.' prefix ON PURPOSE - renaming keys would silently wipe every
// player's balance and campaign progress. Never rebrand the keys.
const BALANCE_STORAGE_KEY = 'frozen-requiem.balance.v1';

function loadBalance(): bigint {
  try {
    if (typeof localStorage === 'undefined') return INITIAL_BALANCE;
    const raw = localStorage.getItem(BALANCE_STORAGE_KEY);
    if (raw == null || !/^\d+$/.test(raw)) return INITIAL_BALANCE;
    return BigInt(raw);
  } catch {
    return INITIAL_BALANCE;
  }
}

function saveBalance(value: bigint): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(BALANCE_STORAGE_KEY, value.toString());
  } catch {
    /* storage unavailable (private mode / quota) — balance stays in-memory only */
  }
}

/** Frozen after a campaign settle — the numbers the campaign receipt prints. Kept SEPARATE from
 *  StakeReceipt so the quick-duel/friend winner-takes-all path stays byte-identical. */
export interface CampaignReceipt {
  nodeId: number;
  nodeName: string;
  /** Match format the node was fought under (first to 2 or first to 3 round wins). */
  roundsToWin: 2 | 3;
  /** Receipt headline line, e.g. 'FIRST TO 2 ROUNDS'. */
  objective: string;
  met: boolean;
  stakeLamports: bigint;
  multBps: bigint;
  /** TOTAL credited on met (0 on failed); net = met ? payout - stake : -stake (stake gone at commit). */
  payoutLamports: bigint;
  netLamports: bigint;
  balanceAfterLamports: bigint;
}

/** Campaign progression + live-fight campaign facts exposed to the UI. `beaten[i]` = node i+1
 *  conquered; frontier = the first unbeaten index (=== count when all conquered). nodeId = the
 *  active/selected node. defenseRemaining = the enemy's absorb buffer left THIS round (drives the
 *  shield pips / the bulk bar's extra segments); absorbed = the exchange currently resolving was
 *  soaked by the defense (drives the absorb beat). */
export interface CampaignState {
  nodeId: number | null;
  beaten: boolean[];
  frontier: number;
  defenseRemaining: number;
  absorbed: boolean;
  /** The PLAYER's guard buffer left THIS round (bonus HP). Drives the longer p1 health bar. */
  guardRemaining: number;
  /** True iff the ENEMY's decisive hit was absorbed by the player's guard this exchange. */
  guarded: boolean;
  /** The stake this run's progress is locked to (Tim's rule): entering the map ABOVE this wipes
   *  progress, the same or lower keeps it. null = no progress yet, so any stake is free to pick. */
  lockStakeLamports: bigint | null;
  /** True for the entry that just wiped progress, so the UI can say WHY the map reset. */
  stakeReset: boolean;
}

// Campaign progression persistence (spec §5). Shape { v:2, beaten: boolean[10], lockStake: string };
// corrupt/missing/older-version = fresh. Balance stays the shared practice bank
// (BALANCE_STORAGE_KEY) via the existing paths. The KEY NAME is deliberately unchanged — the internal
// `v` carries the schema version, per the "never rebrand the keys" rule above.
const CAMPAIGN_STORAGE_KEY = 'frozen-requiem.campaign.v1';

/** Campaign progress plus THE STAKE THE RUN IS LOCKED TO.
 *  `lockStakeLamports` is null only for a run with no progress yet (nothing to protect). */
export interface CampaignProgress {
  beaten: boolean[];
  lockStakeLamports: bigint | null;
}

const freshBeaten = (): boolean[] => new Array<boolean>(CAMPAIGN_NODE_COUNT).fill(false);

/** Corrupt-safe parse of the persisted campaign progress (pure — exported for unit tests). Anything
 *  malformed (bad JSON, unknown version, non-array) => fresh progress with no lock.
 *
 *  ⚠ A v1 payload is INTENTIONALLY treated as corrupt and reset, not migrated. v1 stored `beaten`
 *  with NO stake stamp, so migrating it would hand the player one free re-stamp: progress earned at a
 *  low stake could adopt an arbitrarily high stake on the next entry, which is precisely the exploit
 *  the lock exists to close. Discarding it also matches this parser's own established contract that an
 *  unrecognised version is fresh. */
export function parseCampaignProgress(raw: string | null): CampaignProgress {
  const none = (): CampaignProgress => ({ beaten: freshBeaten(), lockStakeLamports: null });
  if (raw == null) return none();
  try {
    const data = JSON.parse(raw) as unknown;
    if (typeof data !== 'object' || data === null) return none();
    const rec = data as { v?: unknown; beaten?: unknown; lockStake?: unknown };
    if (rec.v !== 2 || !Array.isArray(rec.beaten)) return none();
    const beaten = freshBeaten();
    for (let i = 0; i < CAMPAIGN_NODE_COUNT; i += 1) beaten[i] = rec.beaten[i] === true;
    // The stamp is stored as a decimal STRING — JSON has no BigInt, and a Number would silently lose
    // precision on large lamport values.
    let lock: bigint | null = null;
    if (typeof rec.lockStake === 'string' && /^\d+$/.test(rec.lockStake)) {
      try { lock = BigInt(rec.lockStake); } catch { lock = null; }
    }
    // Progress with no readable stamp cannot be trusted for the same reason v1 cannot: drop it.
    if (lock === null && beaten.some((b) => b)) return none();
    return { beaten, lockStakeLamports: lock };
  } catch {
    return none();
  }
}

/** Corrupt-safe parse of just the beaten[] — kept for the existing callers and their tests. */
export function parseCampaignBeaten(raw: string | null): boolean[] {
  return parseCampaignProgress(raw).beaten;
}

/** THE STAKE LOCK (Tim's rule, 2026-08-07): a campaign run is locked to the stake it was played at.
 *  Entering the map at a HIGHER stake than the run is locked to WIPES progress and starts again; the
 *  same stake or LOWER keeps it.
 *
 *  Why it exists: node payouts are fixed multipliers of the stake (`campaignPayout` = stake*multBps/1e4,
 *  and node 10 is 39.959x). Without this, a player could conquer nodes 1-9 at a trivial stake and then
 *  raise the stake enormously for the final node, collecting a huge multiplier on progress that was
 *  never paid for at that level. Locking progress to its stake removes that entirely, while still
 *  letting a player drop DOWN to a cheaper stake whenever they like.
 *
 *  PURE. Returns the progress to persist and whether a reset happened (the UI announces it).
 *  A run with nothing beaten simply adopts the stake — there is no progress to protect yet. */
export function applyCampaignStakeLock(
  progress: CampaignProgress,
  stakeLamports: bigint,
): { progress: CampaignProgress; reset: boolean } {
  const hasProgress = progress.beaten.some((b) => b);
  if (!hasProgress) return { progress: { beaten: freshBeaten(), lockStakeLamports: stakeLamports }, reset: false };
  const lock = progress.lockStakeLamports;
  if (lock === null) {
    // LOAD-BEARING, not defensive. This was documented as "unreachable via parseCampaignProgress",
    // which is true of STORAGE but not of memory: `devConquerAll` (?dev=1) fills beaten[] WITHOUT
    // stamping a lockStake, so a fresh profile can hold conquered-but-unstamped progress. Verified
    // live: ?dev=1 -> CONQUER ALL -> open ZERO CITADEL at $25 -> this branch fires, the run resets and
    // the attempt is cancelled, so the 39.959x node cannot be cashed off a dev-conquered ladder
    // ($0 spent, bounced to the map). Wiping on an unverifiable stamp is the safe direction — keep it.
    return { progress: { beaten: freshBeaten(), lockStakeLamports: stakeLamports }, reset: true };
  }
  if (stakeLamports > lock) {
    return { progress: { beaten: freshBeaten(), lockStakeLamports: stakeLamports }, reset: true };
  }
  // Same stake or lower: progress survives and the lock does NOT move down, so a player who drops to a
  // cheaper stake can return to their original level without being punished for it.
  return { progress, reset: false };
}

/** What a campaign stake commit should DO — the whole decision, as data.
 *
 *  This exists because `applyCampaignStakeLock` being correct is NOT enough: the caller also has to
 *  act on it. Shipping the lock while still entering the selected node left the exploit fully open,
 *  and it was proven live — nine nodes conquered at $1, then ZERO CITADEL opened and the stake raised
 *  to $25: progress wiped, and the player was handed the 39.95x final node AT $25 anyway. **A reset
 *  cancels the attempt, it does not merely erase the record.** Keeping that rule in a pure function
 *  makes it unit-testable without rendering the provider, which is how it went unnoticed the first time. */
export type CampaignCommitAction =
  | { kind: 'play'; nodeId: number; progress: CampaignProgress }
  | { kind: 'resetToMap'; progress: CampaignProgress };

export function campaignCommitAction(
  progress: CampaignProgress,
  stakeLamports: bigint,
  nodeId: number,
): CampaignCommitAction {
  const applied = applyCampaignStakeLock(progress, stakeLamports);
  if (applied.reset) return { kind: 'resetToMap', progress: applied.progress };
  return { kind: 'play', nodeId, progress: applied.progress };
}

/** The frontier index: the first unbeaten node (0-based), or the count when all are conquered. Pure. */
export function frontierOf(beaten: boolean[]): number {
  const idx = beaten.findIndex((b) => !b);
  return idx === -1 ? beaten.length : idx;
}

/** Return a NEW beaten[] with node `nodeId` (1-based) marked conquered. Pure (no mutation). */
export function markBeaten(beaten: boolean[], nodeId: number): boolean[] {
  const next = beaten.slice();
  if (nodeId >= 1 && nodeId <= next.length) next[nodeId - 1] = true;
  return next;
}

function loadCampaignProgress(): CampaignProgress {
  try {
    if (typeof localStorage === 'undefined') return parseCampaignProgress(null);
    return parseCampaignProgress(localStorage.getItem(CAMPAIGN_STORAGE_KEY));
  } catch {
    return parseCampaignProgress(null);
  }
}

function saveCampaignProgress(beaten: boolean[], lockStakeLamports: bigint | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify({
      v: 2,
      beaten,
      // decimal string: JSON has no BigInt and a Number would lose lamport precision
      lockStake: lockStakeLamports === null ? null : lockStakeLamports.toString(),
    }));
  } catch {
    /* storage unavailable (private mode / quota) — progress stays in-memory only */
  }
}

export interface PlayerPickState {
  locked: boolean;
  move: Move | null;
}

export interface FriendState {
  roomCode: string | null;
  connected: boolean;
  joinFailed: boolean;
  // Opaque fighter id the peer committed to (relayed verbatim; the provider never names or
  // branches on a character). Null until the peer's profile frame arrives.
  opponentFighterId: string | null;
  // True while the rival's socket is dropped and the server holds the room open for grace.
  connectionLost: boolean;
  // True once the rival is unreachable for good and the absent player's picks are auto-played
  // (uniform random) so the match finishes to a natural KO end. Never settles early.
  autoPlay: boolean;
}

// The match is live (a stake is committed and in play) in exactly these phases. A peerGone
// event in one of them flips the match to AUTO-PLAY (the absent player's picks are generated
// uniformly at random and the fight continues to its natural KO end — the survivor can win OR
// lose honestly); at matchEnd (already settled) or on any menu phase the event is a no-op.
// NO refunds and NO early settle mid-match. MONEY NOTE (Tim's accepted trade-off): if the
// auto-played ghost wins, the survivor loses their stake and the pot goes uncollected (the
// leaver's tab is gone) — money can evaporate, but a disconnector can never PROFIT.
const MATCH_LIVE_PHASES: readonly Phase[] = [
  'vsIntro',
  'roundIntro',
  'fightBanner',
  'picking',
  'reveal',
  'resolve',
  'roundEnd',
];

// --- Module-const timings (RG-C5: all timing is a module const, never derived/dynamic) ---
export const SHOT_CLOCK_MS = 5000;
export const CLOCK_TICK_INTERVAL_MS = 1000;
export const VS_INTRO_MS = 1800;
// ROUND N banner: slam-in 150ms + hold 900ms + out 150ms.
export const ROUND_BANNER_MS = 1200;
// Silence beat between the ROUND banner and FIGHT!.
export const ROUND_INTRO_SILENCE_MS = 350;
// FIGHT! banner: slam-in 100ms + hold 600ms + out 200ms. Picking unlocks when it lands.
export const FIGHT_BANNER_MS = 900;
export const REVEAL_MS = 550;
// Clash window. Sized for the CLIP-DRIVEN clash (contract §1): both fighters play their shared
// attack clip up to the LATER first-contact (worst real pair ~1208ms beat: VOLTA block 2417/CLIP_RATE),
// + the 260ms clip-clash hitstop + the ~220ms rebound to guard. 700ms cut the swing before its
// contact frame; 1800ms fits the whole beat (the clip-less CSS fallback still finishes inside it).
export const RESOLVE_MS = 1800;
// Normal hit: fits the full attack-clip beat (4s clip at CLIP_RATE 2 = 2s: windup,
// contact at ~875ms, hit reaction + recovery to anchor).
export const RESOLVE_HIT_MS = 2000;
// Round/match-ending hit: the clip beat + hitstop + slow-mo zoom + launch.
export const RESOLVE_KO_MS = 2400;
export const ROUND_END_MS = 2000;

interface PendingPicks {
  p1: Move | null;
  p2: Move | null;
}

export interface FightController {
  phase: Phase;
  matchState: MatchState;
  mode: Mode | null;
  aiPersonality: AiPersonality | null;
  shotClockSeconds: number;
  lastOutcome: ExchangeOutcome | null;
  playerPick: PlayerPickState;
  friend: FriendState;
  // --- Wager layer ---
  balanceLamports: bigint;
  stakeLamports: bigint;
  /** False when the practice bank is below MIN_STAKE (commit disabled). */
  canStake: boolean;
  /** Settlement figures for the receipt strip; null until a match settles. */
  receipt: StakeReceipt | null;
  // --- Campaign layer (spec §16). Untouched by quick-duel / friend paths. ---
  campaign: CampaignState;
  /** Settlement figures for the campaign receipt; null until a campaign match settles. */
  campaignReceipt: CampaignReceipt | null;
  /** Mode select -> the conquest map screen. */
  enterCampaign: () => void;
  /** Map -> node card (reuses the stake flow); arms the campaign match for this node. */
  startCampaignNode: (nodeId: number) => void;
  /** Campaign receipt -> re-stake the SAME node. */
  retryNode: () => void;
  /** Campaign receipt (on met, next exists) -> stake the NEXT node. */
  nextNode: () => void;
  /** Campaign receipt / node card -> back to the conquest map. */
  backToMap: () => void;
  /** DEV-ONLY force hook (force-state-hooks law): conquer the frontier node without a fight so
   *  map progression is inspectable. No money moves. UI gates this behind ?dev=1. */
  devConquerNext: () => void;
  /** DEV-ONLY force hook: conquer EVERY node at once, so the whole playable-after-beaten roster
   *  can be inspected in one click instead of stepping the frontier ten times. No money moves. */
  devConquerAll: () => void;
  /** DEV-ONLY force hook: wipe campaign progress back to a fresh map. No money moves. */
  devResetCampaign: () => void;
  setStake: (lamports: bigint) => void;
  stepStake: (dir: 'up' | 'down') => void;
  commitStake: () => void;
  /** Restore the practice bank to INITIAL_BALANCE (mockup convenience). */
  resetBank: () => void;
  enterModeSelect: () => void;
  startCpu: (personality: AiPersonality) => void;
  startFriendCreate: () => void;
  startFriendJoin: (code: string) => void;
  /** charSelect -> stake. The picked identity lives in the Experience; the provider only advances. */
  confirmFighter: () => void;
  /** Re-enter the character-select screen (BACK from stake keeps the armed start). */
  enterCharSelect: () => void;
  /** From the victory screen: pick a new fighter for the next match (re-arms the same start). */
  changeFighter: () => void;
  pick: (move: Move) => void;
  continueNext: () => void;
  rematch: () => void;
  backToTitle: () => void;
  /** Relay our committed fighter id to the peer (friend mode). Opaque string; no-op in CPU mode. */
  sendFighterProfile: (id: string) => void;
}

function outcomeSound(outcome: ExchangeOutcome, roundEnding: boolean): void {
  if (outcome.kind === 'clash') {
    playClash();
    return;
  }
  if (roundEnding) {
    playKo();
    return;
  }
  if (outcome.move === 'strike') {
    playHitStrike();
  } else if (outcome.move === 'throw') {
    playHitThrow();
  } else {
    playHitBlock();
  }
}

export function useFightController(
  // The FRIEND transport factory. Default is the real relay client; tests/sim inject a
  // LocalSimTransport. Acquired lazily per friend match (CPU mode never constructs a transport).
  transportFactory: () => MatchTransport = () => new WsTransport(),
): FightController {
  const [phase, setPhase] = useState<Phase>('title');
  const [matchState, setMatchState] = useState<MatchState>(() => createMatch());
  const [mode, setMode] = useState<Mode | null>(null);
  const [aiPersonality, setAiPersonality] = useState<AiPersonality | null>(null);
  const [shotClockMs, setShotClockMs] = useState<number>(SHOT_CLOCK_MS);
  const [lastOutcome, setLastOutcome] = useState<ExchangeOutcome | null>(null);
  const [playerPick, setPlayerPick] = useState<PlayerPickState>({ locked: false, move: null });
  const [friend, setFriend] = useState<FriendState>({
    roomCode: null,
    connected: false,
    joinFailed: false,
    opponentFighterId: null,
    connectionLost: false,
    autoPlay: false,
  });

  // --- Wager layer state. Balance is read from localStorage ONCE at init; stake
  // defaults to $5 clamped to that balance. ---
  const [balanceLamports, setBalanceLamports] = useState<bigint>(loadBalance);
  const [stakeLamports, setStakeLamports] = useState<bigint>(() => clampStake(DEFAULT_STAKE, balanceLamports));
  const [receipt, setReceipt] = useState<StakeReceipt | null>(null);

  // --- Campaign layer state. Progress is read from localStorage ONCE at init (corrupt-safe). ---
  const [campaignNodeId, setCampaignNodeId] = useState<number | null>(null);
  const initialCampaign = useMemo(loadCampaignProgress, []);
  const [campaignBeaten, setCampaignBeaten] = useState<boolean[]>(() => initialCampaign.beaten);
  // THE STAKE LOCK: the stake this run's progress was earned at. Entering the map above it wipes
  // progress (see applyCampaignStakeLock). null = no progress yet, so nothing to protect.
  const [campaignLockStake, setCampaignLockStake] = useState<bigint | null>(
    () => initialCampaign.lockStakeLamports);
  // True for the entry that just wiped progress, so the UI can tell the player WHY the map reset
  // instead of silently showing them a fresh map.
  const [campaignStakeReset, setCampaignStakeReset] = useState<boolean>(false);
  const [campaignReceipt, setCampaignReceipt] = useState<CampaignReceipt | null>(null);
  // Enemy absorb buffer left this round (shield pips / bulk extra segments) + whether the exchange
  // currently resolving was absorbed (the UI's absorb-beat flag; reset per exchange).
  const [campaignDefense, setCampaignDefense] = useState<number>(0);
  const [campaignAbsorbed, setCampaignAbsorbed] = useState<boolean>(false);
  /** The PLAYER's guard buffer this round (bonus HP). Mirror of campaignDefense — the ~4x LADDER
   *  (2026-08-07) prices the early nodes on it, so if it were not wired the player would win those
   *  fights at 50% while being paid for 72%, i.e. a silent under-payment. */
  const [campaignGuard, setCampaignGuard] = useState<number>(0);
  const [campaignGuarded, setCampaignGuarded] = useState<boolean>(false);

  // Refs mirror balance/stake for synchronous reads inside plain callbacks (the
  // commit deduction + settle credit must never live in a setState updater).
  const balanceRef = useRef<bigint>(balanceLamports);
  const stakeRef = useRef<bigint>(stakeLamports);
  const pendingStartRef = useRef<PendingStart | null>(null);
  // One-shot settle guard: flipped true the first time a match settles so a
  // StrictMode double-invoke / re-render can't credit the pot twice.
  const settledRef = useRef<boolean>(false);
  // One-shot stake tracker: true from commitStake (stake deducted) until the stake is CONSUMED —
  // by settle (win/loss, auto-play included) or by a never-started refund. No path can
  // path: no path can double-refund, refund-after-settle, or lose a committed stake silently.
  const stakeCommittedRef = useRef<boolean>(false);
  /** The stake AS ACTUALLY CHARGED at commit — the only amount settle and refund may use.
   *
   *  `stakeRef` is the LIVE stake picker value and keeps moving as the player nudges the chips.
   *  Paying out against the live value means "charged $1, settled on $25" the moment any future
   *  change lets the picker move after commit; today the stake controls are mounted only in
   *  `phase === 'stake'` (FightExperience.tsx:2621, :2687) so it is not reachable, and this snapshot
   *  is what keeps it unreachable by construction instead of by that coincidence. Audit 2026-08-07. */
  const committedStakeRef = useRef<bigint>(0n);

  // --- Campaign refs (synchronous reads inside plain callbacks / timer bodies). ---
  const campaignNodeIdRef = useRef<number | null>(null);
  const campaignBeatenRef = useRef<boolean[]>(campaignBeaten);
  // Mirrors campaignLockStake for synchronous reads inside commitStake (the lock decision must
  // happen in the same synchronous body that deducts the stake, never in a setState updater).
  const campaignLockStakeRef = useRef<bigint | null>(campaignLockStake);
  // The enemy's absorb buffer for the CURRENT round (refilled to the node's defense amount at
  // every round start; drained by applyCampaignExchange — the shared shield/bulk math).
  const campaignDefenseRef = useRef<number>(0);
  const campaignGuardRef = useRef<number>(0);
  // The campaign enemy's UNIFORM-RANDOM pick source (randomMove ONLY, never aiPick — spec §0.2
  // money law). CSPRNG per the unpredictability law (secureRng.ts): no seed, no recoverable
  // state — the old Date.now-seeded mulberry32 let observed picks predict all future picks.
  const campaignRngRef = useRef<() => number>(secureRandom);
  // One-shot campaign settle guard: flipped true the first time a campaign match settles so a
  // StrictMode double-invoke / re-render can't credit the payout twice (same pattern as settledRef).
  const campaignSettledRef = useRef<boolean>(false);

  // Persist balance on every change (idempotent; safe under StrictMode). This is
  // an effect, never a setState updater, so it does not violate the no-side-
  // effects-in-reducers rule.
  useEffect(() => {
    saveBalance(balanceLamports);
  }, [balanceLamports]);

  // Persist campaign progress on every change (idempotent; StrictMode-safe; same pattern as balance).
  useEffect(() => {
    saveCampaignProgress(campaignBeaten, campaignLockStake);
  }, [campaignBeaten, campaignLockStake]);

  // Refs mirror the state above for synchronous reads inside callbacks/timer bodies --
  // updated directly alongside every setState call, never lagging behind a render.
  const phaseRef = useRef<Phase>(phase);
  const matchStateRef = useRef<MatchState>(matchState);
  const modeRef = useRef<Mode | null>(mode);
  const aiPersonalityRef = useRef<AiPersonality | null>(aiPersonality);
  const playerLockedRef = useRef<boolean>(false);

  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const transportRef = useRef<MatchTransport | null>(null);
  // Money-relevant pick sources: CSPRNG only (unpredictability law, secureRng.ts) — never a
  // seeded PRNG at runtime. aiRng = quick-duel CPU; autoPickRng = shot-clock + friend ghost.
  const aiRngRef = useRef<() => number>(secureRandom);
  const autoPickRngRef = useRef<() => number>(secureRandom);
  const pendingRef = useRef<PendingPicks>({ p1: null, p2: null });
  const unsubOpponentPickRef = useRef<(() => void) | null>(null);
  const unsubPresenceRef = useRef<(() => void) | null>(null);
  const unsubOpponentProfileRef = useRef<(() => void) | null>(null);
  const unsubMatchEventRef = useRef<(() => void) | null>(null);

  // The friend transport is constructed ONCE per mounted controller from this factory (captured
  // on first render so a fresh default-factory identity each render doesn't re-acquire).
  const friendTransportFactoryRef = useRef(transportFactory);

  // Exchange sequencing (friend mode): our current exchange index, and any opponent picks that
  // arrived for a FUTURE (or the current) exchange while we were still in an intro/banner phase.
  // Keyed by exchange number so a pick can never be applied to the wrong round.
  const exchangeIdxRef = useRef<number>(0);
  const oppPickBufferRef = useRef<Map<number, Move>>(new Map());
  // True once the rival is unreachable for good (peerGone): from then on the absent player's
  // picks are auto-generated locally (uniform random — Nash-neutral, unexploitable, value-
  // independent per RG-C5) and nothing is sent to the dead transport.
  const opponentGoneRef = useRef<boolean>(false);
  // Latest-callback ref for applyBufferedOppPick so beginPicking / the pick listener can call it
  // without a useCallback dependency cycle (it transitively depends on beginPicking).
  const applyBufferedOppPickRef = useRef<() => void>(() => {});

  const clearAllTimers = useCallback(() => {
    for (const handle of timersRef.current) {
      clearTimeout(handle);
    }
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const handle = setTimeout(fn, ms);
    timersRef.current.push(handle);
    return handle;
  }, []);

  // Tear down the current friend transport: drop channel subscriptions and dispose the socket.
  // CPU mode never has a transport, so this is a no-op there.
  const disposeFriendTransport = useCallback(() => {
    unsubOpponentPickRef.current?.();
    unsubPresenceRef.current?.();
    unsubOpponentProfileRef.current?.();
    unsubMatchEventRef.current?.();
    unsubOpponentPickRef.current = null;
    unsubPresenceRef.current = null;
    unsubOpponentProfileRef.current = null;
    unsubMatchEventRef.current = null;
    transportRef.current?.dispose();
    transportRef.current = null;
  }, []);

  // Friend mode acquires its transport lazily (per match); the controller only needs to make sure
  // that whatever transport exists is disposed on unmount. A StrictMode dev mount -> cleanup ->
  // mount cycle simply disposes the (possibly-absent) transport and starts clean.
  useEffect(() => {
    return () => {
      clearAllTimers();
      disposeFriendTransport();
    };
  }, [clearAllTimers, disposeFriendTransport]);

  const setPhaseNow = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const setMatchStateNow = useCallback((next: MatchState) => {
    matchStateRef.current = next;
    setMatchState(next);
  }, []);

  const beginPicking = useCallback(() => {
    pendingRef.current = { p1: null, p2: null };
    playerLockedRef.current = false;
    setPlayerPick({ locked: false, move: null });
    setShotClockMs(SHOT_CLOCK_MS);
    setPhaseNow('picking');
    // Real race: the opponent's pick for THIS exchange can arrive while we were still in
    // fightBanner/roundIntro. Now that we are picking, drain any buffered pick for this index.
    if (modeRef.current === 'friend') {
      applyBufferedOppPickRef.current();
    }
  }, [setPhaseNow]);

  const startRoundIntro = useCallback(() => {
    playRoundBanner();
    setPhaseNow('roundIntro');
    schedule(() => {
      playFightBanner();
      setPhaseNow('fightBanner');
      schedule(() => {
        beginPicking();
      }, FIGHT_BANNER_MS);
    }, ROUND_BANNER_MS + ROUND_INTRO_SILENCE_MS);
  }, [schedule, beginPicking, setPhaseNow]);

  // Settle the wager exactly once per match. Runs from a plain scheduled callback in the SAME
  // transition that flips to 'matchEnd' -- never from a setState updater -- and is guarded by
  // settledRef so a StrictMode double-invoke or a re-render cannot credit the payout twice. P1 is
  // ALWAYS the player (whichever fighter they picked). The provider is identity-agnostic and never
  // names a character. MODE-AWARE money:
  //   - friend (winner-takes-all): a P1 win pays the whole 2S pot; a loss keeps the post-commit
  //     balance. Byte-identical to the historic behavior.
  //   - cpu (house-priced): a P1 win credits cpuWinPayout(stake) = 1.92x the stake (96% RTP vs the
  //     uniform-random opponent); a loss credits nothing (the stake is already gone at commit).
  const settleMatch = useCallback((winner: 'p1' | 'p2') => {
    if (settledRef.current) return;
    settledRef.current = true;
    // The committed stake is consumed by this settle: no later path may refund it.
    stakeCommittedRef.current = false;
    const stake = committedStakeRef.current; // as CHARGED, never the live picker value
    const isCpu = modeRef.current === 'cpu';
    const playerWon = winner === 'p1';
    // The stake was already deducted at commit, so balanceRef is the post-commit balance. Friend
    // credits the 2S pot on a win (settle(), byte-identical); CPU credits the 1.92x house payout on
    // a win; both leave the balance untouched on a loss.
    const pot = potLamports(stake);
    const payout = playerWon ? (isCpu ? cpuWinPayout(stake) : pot) : 0n;
    const balanceAfter = isCpu ? balanceRef.current + payout : settle(balanceRef.current, stake, playerWon);
    balanceRef.current = balanceAfter;
    setBalanceLamports(balanceAfter);
    setReceipt({
      duelMode: isCpu ? 'cpu' : 'friend',
      stakeLamports: stake,
      opponentStakeLamports: stake, // friend: the rival matches the stake (unused fiction for CPU)
      potLamports: pot, // friend: the 2S pot (unused fiction for CPU)
      playerWon,
      payoutLamports: payout,
      balanceAfterLamports: balanceAfter,
    });
    if (playerWon) playPayout();
  }, []);

  // Settle a CAMPAIGN match exactly once (phase 17). The match verdict decides the money:
  //   met (match won)  -> balance += campaignPayout(stake, node.multBps)  (net = payout - stake;
  //                       the stake was deducted at commit, so the TOTAL payout is credited here)
  //   failed (lost)    -> nothing credited (the stake is already gone)
  // Guarded by campaignSettledRef (same one-shot pattern as settleMatch's settledRef). On met the
  // node is marked beaten and persisted. Plain callback, never a setState updater. The celebration
  // (playVictory earlier + playPayout here) is value-INDEPENDENT: identical fanfare for x1.92 and
  // x39.95 (RG-C5). P1 is ALWAYS the player, so the judge always scores the player.
  const settleCampaign = useCallback((result: CampaignMatchResult) => {
    if (result === 'open') return; // never settle an open match
    if (campaignSettledRef.current) return;
    campaignSettledRef.current = true;
    // The committed stake is consumed by this settle: no later path may refund it.
    stakeCommittedRef.current = false;
    const stake = committedStakeRef.current; // as CHARGED — this one multiplies by up to 39.959x
    const node = getCampaignNode(campaignNodeIdRef.current);
    const multBps = node ? node.multBps : 0n;
    const roundsToWin: 2 | 3 = node ? node.roundsToWin : 2;
    const met = result === 'met';
    const payout = met ? campaignPayout(stake, multBps) : 0n;
    const balanceAfter = balanceRef.current + payout;
    balanceRef.current = balanceAfter;
    setBalanceLamports(balanceAfter);
    setCampaignReceipt({
      nodeId: node ? node.id : campaignNodeIdRef.current ?? 0,
      nodeName: node ? node.name : '',
      roundsToWin,
      objective: `FIRST TO ${roundsToWin} ROUNDS`,
      met,
      stakeLamports: stake,
      multBps,
      payoutLamports: payout,
      netLamports: met ? payout - stake : -stake,
      balanceAfterLamports: balanceAfter,
    });
    if (met) {
      playPayout();
      if (node) {
        const nextBeaten = markBeaten(campaignBeatenRef.current, node.id);
        campaignBeatenRef.current = nextBeaten;
        setCampaignBeaten(nextBeaten);
      }
    }
  }, []);

  // Refund a committed stake for a match that NEVER started (creator backs out of the waiting
  // room, join fails, connect fails). One-shot: the stakeCommittedRef guard means no path can
  // double-refund or refund after a settle consumed the stake. Plain callback, never an updater.
  const refundStakeIfCommitted = useCallback(() => {
    if (!stakeCommittedRef.current) return;
    stakeCommittedRef.current = false;
    const refunded = balanceRef.current + committedStakeRef.current; // refund exactly what was charged
    balanceRef.current = refunded;
    setBalanceLamports(refunded);
  }, []);

  const resolveExchangeNow = useCallback(
    (p1Move: Move, p2Move: Move) => {
      setPhaseNow('resolve');
      const prev = matchStateRef.current;
      // CAMPAIGN DEFENSE INTERCEPTION (phase 17): campaign exchanges route through the SHARED
      // applyCampaignExchange (the same function the Monte-Carlo sim and the tests use — the
      // absorb rule cannot drift). An absorbed player hit drains the enemy's per-round buffer and
      // the FROZEN ENGINE never processes the exchange; everything else is the plain engine call.
      let next: MatchState;
      let absorbed = false;
      if (modeRef.current === 'campaign') {
        const r = applyCampaignExchange(prev, p1Move, p2Move, campaignDefenseRef.current, campaignGuardRef.current);
        next = r.state;
        absorbed = r.absorbed;
        campaignDefenseRef.current = r.absorbRemaining;
        setCampaignDefense(r.absorbRemaining);
        campaignGuardRef.current = r.guardRemaining;
        setCampaignGuard(r.guardRemaining);
        setCampaignGuarded(r.guarded);
        setCampaignAbsorbed(absorbed);
      } else {
        next = applyExchange(prev, p1Move, p2Move);
      }
      // Advance the exchange counter in lockstep with the engine (both clients resolve the same
      // exchange exactly once, so their indices stay aligned). Harmless/unused in CPU mode.
      exchangeIdxRef.current += 1;
      setMatchStateNow(next);

      const outcome = next.history[next.history.length - 1].outcome;
      setLastOutcome(outcome);
      const roundEnding = Boolean(next.roundOver);
      // Absorb sound: a SHIELD soak reads as a deflection (the block tink), not a landed hit; a
      // BULK soak looks like a normal hit draining the longer bar, so it keeps the normal hit
      // sound. Zero-param audio either way (RG-C5).
      if (absorbed && getCampaignNode(campaignNodeIdRef.current)?.defense?.kind === 'shield') {
        playHitBlock();
      } else {
        outcomeSound(outcome, roundEnding);
      }

      // Hits get a clip-sized window (the attack clip beat is ~2s at CLIP_RATE with contact
      // at ~875ms; a 700ms window cut the swing before its contact frame). The clash window is
      // clip-sized too since the clip-driven clash (contract §1: both swing to the later
      // first-contact, freeze, rebound) - see RESOLVE_MS.
      const resolveDelay = roundEnding
        ? RESOLVE_KO_MS
        : outcome.kind === 'hit'
          ? RESOLVE_HIT_MS
          : RESOLVE_MS;
      schedule(() => {
        // CAMPAIGN (phase 17): the match is judged after every completed ROUND (never mid-round)
        // by evaluateCampaignMatch on ROUND-WIN COUNTS ONLY. Engine matchOver is deliberately
        // IGNORED: the frozen engine hard-codes first-to-2, so first-to-3 nodes keep starting
        // rounds past the engine's own "match over" (safe: applyExchange/startNextRound recompute
        // per-round state from hp/roundsWon — proven in fightCampaign.test.ts). While 'open' the
        // fight continues; on 'met'/'failed' we stop starting rounds and settle ONCE. Every
        // campaign fight ends on a round boundary, so the round beat always plays before settle.
        if (modeRef.current === 'campaign') {
          if (!next.roundOver) {
            beginPicking();
            return;
          }
          const node = getCampaignNode(campaignNodeIdRef.current);
          const roundsToWin: 2 | 3 = node ? node.roundsToWin : 2;
          const result = evaluateCampaignMatch(next.p1.roundsWon, next.p2.roundsWon, roundsToWin);
          if (next.flawless) playFlawless();
          // Let the round-win/loss beat play in the roundEnd dwell (the KO/special/victory chain
          // for this round-ending exchange already fired in the UI choreography, which arms on ANY
          // round-ending win — no engine matchOver required).
          setPhaseNow('roundEnd');
          if (result === 'open') {
            schedule(() => {
              // Round start: the enemy's absorb buffer refills to the node's defense amount.
              const refill = defenseAmount(node);
              campaignDefenseRef.current = refill;
              setCampaignDefense(refill);
              const refillGuard = guardAmount(node);
              campaignGuardRef.current = refillGuard;
              setCampaignGuard(refillGuard);
              setCampaignGuarded(false);
              setMatchStateNow(startNextRound(next));
              startRoundIntro();
            }, ROUND_END_MS);
          } else {
            if (result === 'met') playVictory();
            schedule(() => {
              settleCampaign(result);
              setPhaseNow('matchEnd');
            }, ROUND_END_MS);
          }
          return;
        }
        if (next.matchOver) {
          playVictory();
          settleMatch(next.matchOver);
          setPhaseNow('matchEnd');
        } else if (next.roundOver) {
          if (next.flawless) {
            playFlawless();
          }
          setPhaseNow('roundEnd');
          schedule(() => {
            setMatchStateNow(startNextRound(next));
            startRoundIntro();
          }, ROUND_END_MS);
        } else {
          beginPicking();
        }
      }, resolveDelay);
    },
    [schedule, beginPicking, startRoundIntro, setPhaseNow, setMatchStateNow, settleMatch, settleCampaign],
  );

  const tryReveal = useCallback(() => {
    const { p1, p2 } = pendingRef.current;
    if (p1 && p2) {
      setPhaseNow('reveal');
      schedule(() => {
        resolveExchangeNow(p1, p2);
      }, REVEAL_MS);
    }
  }, [schedule, resolveExchangeNow, setPhaseNow]);

  // Drain the opponent pick buffered for the CURRENT exchange, if we are picking. Called both
  // when a pick arrives (onOpponentPick) and when we (re)enter picking (beginPicking) so a pick
  // that landed early is never lost.
  const applyBufferedOppPick = useCallback(() => {
    if (phaseRef.current !== 'picking') return;
    const idx = exchangeIdxRef.current;
    const buffered = oppPickBufferRef.current.get(idx);
    if (buffered != null) {
      oppPickBufferRef.current.delete(idx);
      pendingRef.current = { ...pendingRef.current, p2: buffered };
      tryReveal();
    }
  }, [tryReveal]);

  // Keep the latest-callback ref current (avoids a useCallback dependency cycle through
  // beginPicking); an effect so nothing is written during render.
  useEffect(() => {
    applyBufferedOppPickRef.current = applyBufferedOppPick;
  }, [applyBufferedOppPick]);

  const pick = useCallback(
    (move: Move) => {
      if (phaseRef.current !== 'picking' || playerLockedRef.current) {
        return;
      }
      playerLockedRef.current = true;
      setPlayerPick({ locked: true, move });
      pendingRef.current = { ...pendingRef.current, p1: move };
      playLockIn();

      if (modeRef.current === 'cpu') {
        // CPU enemy: UNIFORM RANDOM from the seeded rng — NEVER aiPick. The brute/warden/oracle
        // personality still selects which enemy character/flavor you fight, but no longer influences
        // picks: random is Nash-neutral / unexploitable, so the 1.92x house price (96% RTP) holds vs
        // any counter-strategy (aiPick personalities are MEASURED exploitable — up to 88% win / 176%
        // RTP). Same doctrine the campaign uses (fightCampaign.ts money law).
        pendingRef.current = { ...pendingRef.current, p2: randomMove(aiRngRef.current) };
      } else if (modeRef.current === 'campaign') {
        // CAMPAIGN enemy: UNIFORM RANDOM from the seeded per-match rng — NEVER aiPick (spec §0.2
        // money law: random is Nash-neutral, so the tier probability holds vs any player).
        pendingRef.current = { ...pendingRef.current, p2: randomMove(campaignRngRef.current) };
      } else if (modeRef.current === 'friend') {
        if (opponentGoneRef.current) {
          // AUTO-PLAY: the rival is gone for good — generate the ghost's move locally instead
          // of sending to the dead transport. A REAL pick buffered before the drop (current
          // exchange only) wins over generation. Uniform random is deliberate: Nash-neutral,
          // unexploitable, value-independent (RG-C5) — never aiPick.
          const buffered = oppPickBufferRef.current.get(exchangeIdxRef.current);
          if (buffered != null) {
            oppPickBufferRef.current.delete(exchangeIdxRef.current);
            pendingRef.current = { ...pendingRef.current, p2: buffered };
          } else {
            pendingRef.current = { ...pendingRef.current, p2: randomMove(autoPickRngRef.current) };
          }
        } else {
          transportRef.current?.sendPick(move, exchangeIdxRef.current);
        }
      }

      tryReveal();
    },
    [tryReveal],
  );

  // Shot clock countdown: active only while picking and unlocked. Standard setup/cleanup
  // effect (no side effects inside a setState updater) -- safe under StrictMode.
  useEffect(() => {
    if (phase !== 'picking' || playerPick.locked) {
      return;
    }
    if (shotClockMs <= 0) {
      pick(randomMove(autoPickRngRef.current));
      return;
    }
    const handle = setTimeout(() => {
      playClockTick();
      setShotClockMs((ms) => Math.max(0, ms - CLOCK_TICK_INTERVAL_MS));
    }, CLOCK_TICK_INTERVAL_MS);
    timersRef.current.push(handle);
    return () => clearTimeout(handle);
  }, [phase, playerPick.locked, shotClockMs, pick]);

  // Match lifecycle events from the transport's reconnect-grace / auto-play layer. NO refunds
  // and NO early settle mid-match: when the rival is unreachable for good ('peerGone'), the
  // match CONTINUES with the absent player's picks auto-generated (uniform random) until it
  // ends by a real KO and settles normally — the survivor can honestly win OR lose against the
  // ghost. Outside a live match every event is a no-op (matchEnd already settled; menu phases
  // have no stake in play).
  const handleMatchEvent = useCallback(
    (ev: MatchEvent) => {
      if (modeRef.current !== 'friend') return;
      if (!MATCH_LIVE_PHASES.includes(phaseRef.current)) return;
      if (ev === 'peerLost') {
        // Phases/timers keep running — a shot-clock auto-pick just gets relayed into the
        // server's buffer toward the absent peer. Only the banner flag flips.
        setFriend((prev) => ({ ...prev, connectionLost: true }));
      } else if (ev === 'peerBack') {
        setFriend((prev) => ({ ...prev, connectionLost: false }));
      } else {
        // 'peerGone': flip to auto-play. Do NOT clear timers, do NOT settle, do NOT change
        // phase — the match keeps flowing; pick() now generates the ghost's moves.
        opponentGoneRef.current = true;
        setFriend((prev) => ({ ...prev, connectionLost: false, autoPlay: true }));
        // UNSTICK the current exchange: the player may already be locked and waiting on a rival
        // pick that will never come. A REAL pick buffered before the drop always wins over
        // generation (drain it first); only a truly missing pick is auto-generated.
        if (phaseRef.current === 'picking' && pendingRef.current.p1 && !pendingRef.current.p2) {
          applyBufferedOppPickRef.current();
          if (phaseRef.current === 'picking' && pendingRef.current.p1 && !pendingRef.current.p2) {
            pendingRef.current = { ...pendingRef.current, p2: randomMove(autoPickRngRef.current) };
            tryReveal();
          }
        }
      }
    },
    [tryReveal],
  );

  const subscribeFriendChannels = useCallback(() => {
    unsubOpponentPickRef.current?.();
    unsubPresenceRef.current?.();
    unsubOpponentProfileRef.current?.();
    unsubMatchEventRef.current?.();
    const transport = transportRef.current;
    if (!transport) {
      return;
    }
    unsubOpponentPickRef.current = transport.onOpponentPick((move, exchange) => {
      // Buffer by exchange index; apply now if it's the one we're waiting on (else beginPicking
      // drains it when we reach that exchange).
      oppPickBufferRef.current.set(exchange, move);
      applyBufferedOppPickRef.current();
    });
    unsubOpponentProfileRef.current = transport.onOpponentProfile((fighterId) => {
      setFriend((prev) => ({ ...prev, opponentFighterId: fighterId }));
    });
    unsubMatchEventRef.current = transport.onMatchEvent(handleMatchEvent);
    unsubPresenceRef.current = transport.onPresence((connected) => {
      setFriend((prev) => ({ ...prev, connected }));
      if (connected && phaseRef.current === 'mode') {
        setMatchStateNow(createMatch());
        setPhaseNow('vsIntro');
        schedule(() => {
          startRoundIntro();
        }, VS_INTRO_MS);
      }
    });
  }, [schedule, startRoundIntro, setPhaseNow, setMatchStateNow, handleMatchEvent]);

  // Acquire a FRESH friend transport for a new match: dispose any prior one, construct from the
  // captured factory, and (re)subscribe the channels on it.
  const acquireFriendTransport = useCallback(() => {
    disposeFriendTransport();
    transportRef.current = friendTransportFactoryRef.current();
    subscribeFriendChannels();
  }, [disposeFriendTransport, subscribeFriendChannels]);

  const enterModeSelect = useCallback(() => {
    clearAllTimers();
    // Backing out of a friend match that NEVER started (still in the waiting room, 'mode'
    // phase): the committed stake comes back. A live match reached vsIntro+, so this can never
    // refund a fled fight.
    if (modeRef.current === 'friend' && phaseRef.current === 'mode') {
      refundStakeIfCommitted();
    }
    disposeFriendTransport();
    // A clean mode screen: drop any half-selected mode so the CPU/friend cards
    // (not a stale room-code view) always render. Balance/receipt persist.
    modeRef.current = null;
    setMode(null);
    aiPersonalityRef.current = null;
    setAiPersonality(null);
    pendingStartRef.current = null;
    opponentGoneRef.current = false;
    campaignNodeIdRef.current = null;
    setCampaignNodeId(null);
    campaignSettledRef.current = false;
    campaignDefenseRef.current = 0;
    setCampaignDefense(0);
    campaignGuardRef.current = 0;
    setCampaignGuard(0);
    setCampaignGuarded(false);
    setCampaignAbsorbed(false);
    setCampaignReceipt(null);
    setFriend({ roomCode: null, connected: false, joinFailed: false, opponentFighterId: null, connectionLost: false, autoPlay: false });
    setPhaseNow('mode');
  }, [clearAllTimers, refundStakeIfCommitted, disposeFriendTransport, setPhaseNow]);

  // ── The real match starts (run by commitStake once the wager is locked) ──
  const beginCpuMatch = useCallback(
    (personality: AiPersonality) => {
      clearAllTimers();
      modeRef.current = 'cpu';
      setMode('cpu');
      aiPersonalityRef.current = personality;
      setAiPersonality(personality);
      setMatchStateNow(createMatch());
      setLastOutcome(null);
      setPhaseNow('vsIntro');
      schedule(() => {
        startRoundIntro();
      }, VS_INTRO_MS);
    },
    [clearAllTimers, schedule, startRoundIntro, setPhaseNow, setMatchStateNow],
  );

  // Campaign match start (run by commitStake once the wager is locked). Like beginCpuMatch but the
  // opponent is UNIFORM RANDOM (never aiPick) and the settle is objective-based (settleCampaign).
  const beginCampaignMatch = useCallback(
    (nodeId: number) => {
      clearAllTimers();
      modeRef.current = 'campaign';
      setMode('campaign');
      aiPersonalityRef.current = null;
      setAiPersonality(null);
      campaignNodeIdRef.current = nodeId;
      setCampaignNodeId(nodeId);
      campaignSettledRef.current = false;
      // Round 1 starts with the enemy's absorb buffer at the node's defense amount.
      const refill = defenseAmount(getCampaignNode(nodeId));
      campaignDefenseRef.current = refill;
      setCampaignDefense(refill);
      const refillGuard = guardAmount(getCampaignNode(nodeId));
      campaignGuardRef.current = refillGuard;
      setCampaignGuard(refillGuard);
      setCampaignGuarded(false);
      setCampaignAbsorbed(false);
      // No per-match reseed: the pick source is the CSPRNG (secureRng.ts) — seedless by design.
      setMatchStateNow(createMatch());
      setLastOutcome(null);
      setPhaseNow('vsIntro');
      schedule(() => {
        startRoundIntro();
      }, VS_INTRO_MS);
    },
    [clearAllTimers, schedule, startRoundIntro, setPhaseNow, setMatchStateNow],
  );

  const beginFriendCreate = useCallback(() => {
    clearAllTimers();
    modeRef.current = 'friend';
    setMode('friend');
    aiPersonalityRef.current = null;
    setAiPersonality(null);
    setLastOutcome(null);
    exchangeIdxRef.current = 0;
    oppPickBufferRef.current.clear();
    opponentGoneRef.current = false;
    setFriend({ roomCode: null, connected: false, joinFailed: false, opponentFighterId: null, connectionLost: false, autoPlay: false });
    setPhaseNow('mode');
    acquireFriendTransport();
    transportRef.current?.createRoom().then((code) => {
      // '' means the socket failed to open (error / connect timeout): the match never started,
      // so the committed stake comes back and the failure message shows.
      if (code === '') {
        refundStakeIfCommitted();
        setFriend((prev) => ({ ...prev, joinFailed: true }));
      } else {
        setFriend((prev) => ({ ...prev, roomCode: code }));
      }
    });
  }, [clearAllTimers, acquireFriendTransport, refundStakeIfCommitted, setPhaseNow]);

  const beginFriendJoin = useCallback(
    (code: string) => {
      clearAllTimers();
      modeRef.current = 'friend';
      setMode('friend');
      aiPersonalityRef.current = null;
      setAiPersonality(null);
      setLastOutcome(null);
      exchangeIdxRef.current = 0;
      oppPickBufferRef.current.clear();
      opponentGoneRef.current = false;
      setFriend({ roomCode: code, connected: false, joinFailed: false, opponentFighterId: null, connectionLost: false, autoPlay: false });
      setPhaseNow('mode');
      acquireFriendTransport();
      transportRef.current?.join(code).then((ok) => {
        if (!ok) {
          // The match never started (unknown/full room, connect failure, timeout): the
          // committed stake comes back.
          refundStakeIfCommitted();
          setFriend((prev) => ({ ...prev, joinFailed: true }));
        }
      });
    },
    [clearAllTimers, acquireFriendTransport, refundStakeIfCommitted, setPhaseNow],
  );

  // ── Stake phase ──────────────────────────────────────────────────────────
  // Enter the wager screen: preselect the current stake clamped to the bank,
  // clear the previous receipt, and re-arm the one-shot settle guard.
  const enterStake = useCallback(() => {
    clearAllTimers();
    const clamped = clampStake(stakeRef.current, balanceRef.current);
    stakeRef.current = clamped;
    setStakeLamports(clamped);
    settledRef.current = false;
    campaignSettledRef.current = false;
    setReceipt(null);
    setCampaignReceipt(null);
    setPhaseNow('stake');
  }, [clearAllTimers, setPhaseNow]);

  // ── Character select (sits between mode select and stake) ─────────────────
  // Identity-AGNOSTIC: the provider NEVER knows which fighter is chosen — the Experience owns
  // `playerId` state. This phase only gates the flow. Used both to enter from mode select and
  // as the BACK target from the stake screen (the armed PendingStart persists across it).
  const enterCharSelect = useCallback(() => {
    clearAllTimers();
    setPhaseNow('charSelect');
  }, [clearAllTimers, setPhaseNow]);

  // charSelect -> stake once the player confirms their fighter (identity stays in the Experience).
  const confirmFighter = useCallback(() => {
    if (phaseRef.current !== 'charSelect') return;
    enterStake();
  }, [enterStake]);

  const setStake = useCallback((lamports: bigint) => {
    // The wager is only choosable while choosing it. The UI already mounts the picker exclusively in
    // the stake phase, so this changes no behaviour today — it stops a future caller from moving the
    // stake mid-match, which is the shape that turns into "charged $1, paid out on $25".
    if (phaseRef.current !== 'stake') return;
    const clamped = clampStake(lamports, balanceRef.current);
    stakeRef.current = clamped;
    setStakeLamports(clamped);
  }, []);

  const stepStake = useCallback(
    (dir: 'up' | 'down') => {
      const next = stakeRef.current + (dir === 'up' ? ONE_USDC : -ONE_USDC);
      setStake(next);
    },
    [setStake],
  );

  const resetBank = useCallback(() => {
    balanceRef.current = INITIAL_BALANCE;
    setBalanceLamports(INITIAL_BALANCE);
    const clamped = clampStake(stakeRef.current, INITIAL_BALANCE);
    stakeRef.current = clamped;
    setStakeLamports(clamped);
  }, []);

  // Lock in the wager: deduct the stake (plain callback, never a setState
  // updater) and hand off to whatever the stake phase was armed to start.
  const commitStake = useCallback(() => {
    if (phaseRef.current !== 'stake') return;
    if (balanceRef.current < MIN_STAKE) return; // canStake === false
    const stake = clampStake(stakeRef.current, balanceRef.current);
    if (stake < MIN_STAKE) return;
    const newBalance = balanceRef.current - stake;
    balanceRef.current = newBalance;
    stakeRef.current = stake;
    // Freeze the charged amount. Every later money decision (both settles, the refund) reads THIS.
    committedStakeRef.current = stake;
    setBalanceLamports(newBalance);
    setStakeLamports(stake);
    settledRef.current = false;
    campaignSettledRef.current = false;
    // The stake is now in play: consumed by settle (win/loss, auto-play, campaign met/failed) or
    // by a never-started refund — exactly one of the two, enforced by this one-shot.
    stakeCommittedRef.current = true;
    playStakeCommit();
    const pending = pendingStartRef.current;
    if (!pending) return;
    if (pending.kind === 'cpu') {
      beginCpuMatch(pending.personality);
    } else if (pending.kind === 'friendCreate') {
      beginFriendCreate();
    } else if (pending.kind === 'friendJoin') {
      beginFriendJoin(pending.code);
    } else {
      // THE STAKE LOCK (Tim's rule): a campaign run is locked to the stake it was played at. Entering
      // the map ABOVE that stake wipes progress; the same or lower keeps it. Decided HERE — in the same
      // synchronous body that already deducted the stake — so the map the player is taken to already
      // reflects the reset, and `stake` is the CLAMPED value actually charged, never the raw input.
      // GATE THE NODE WHERE THE MONEY MOVES, not only at the map click. `startCampaignNode` validates,
      // but `nextNode` writes pendingStartRef and calls enterStake() directly (it is sound today —
      // only reachable after a win, so its target IS the frontier) — two entry paths, one gate. This
      // is the same shape as the stake-lock bug: the rule has to live where the decision is made.
      // Checked against PRE-lock progress on purpose; the lock is applied below and may reset it.
      const preBeaten = campaignBeatenRef.current;
      const nodeOk = pending.nodeId >= 1 && pending.nodeId <= preBeaten.length
        && (preBeaten[pending.nodeId - 1] || pending.nodeId - 1 === frontierOf(preBeaten));
      if (!nodeOk) {
        refundStakeIfCommitted();
        clearAllTimers();
        setMatchStateNow(createMatch());
        setPhaseNow('campaignMap');
        return;
      }
      const action = campaignCommitAction(
        { beaten: campaignBeatenRef.current, lockStakeLamports: campaignLockStakeRef.current },
        stake,
        pending.nodeId,
      );
      campaignBeatenRef.current = action.progress.beaten;
      campaignLockStakeRef.current = action.progress.lockStakeLamports;
      setCampaignBeaten(action.progress.beaten);
      setCampaignLockStake(action.progress.lockStakeLamports);
      setCampaignStakeReset(action.kind === 'resetToMap');
      if (action.kind === 'resetToMap') {
        // A RESET MUST ALSO CANCEL THIS ATTEMPT — not just the record.
        //
        // Wiping `beaten` while still entering `pending.nodeId` left the exploit the lock exists to
        // close WIDE OPEN, and it was proven live: conquer nodes 1-9 at $1, open ZERO CITADEL, raise
        // to $25, commit. Progress wiped to all-false and the lock re-stamped at $25 — and the player
        // was dropped straight into the 39.95x final node AT $25, i.e. cashing the big multiplier on a
        // run they never earned at that stake. The wipe punished the record and let the cash-out
        // through, which is exactly backwards. It also produced an unreachable map state: winning that
        // node wrote beaten=[F,F,F,...,T], rendering a conquered island sitting behind fogged nodes.
        //
        // So on a reset: refund (this match NEVER started — the same one-shot doctrine as a failed
        // join) and return to the map, which now shows the frontier back at node 1. `campaignStakeReset`
        // stays true so the UI can tell the player WHY their run restarted.
        refundStakeIfCommitted();
        clearAllTimers();
        setMatchStateNow(createMatch());
        setLastOutcome(null);
        campaignDefenseRef.current = 0;
        setCampaignDefense(0);
        campaignGuardRef.current = 0;
        setCampaignGuard(0);
        setCampaignGuarded(false);
        setCampaignAbsorbed(false);
        setPhaseNow('campaignMap');
        return;
      }
      beginCampaignMatch(action.nodeId);
    }
  }, [beginCpuMatch, beginFriendCreate, beginFriendJoin, beginCampaignMatch,
    refundStakeIfCommitted, clearAllTimers, setMatchStateNow, setPhaseNow]);

  // ── Public entries (from mode select): remember the choice, go to char select ──
  const startCpu = useCallback(
    (personality: AiPersonality) => {
      clearAllTimers();
      modeRef.current = 'cpu';
      setMode('cpu');
      aiPersonalityRef.current = personality;
      setAiPersonality(personality);
      pendingStartRef.current = { kind: 'cpu', personality };
      enterCharSelect();
    },
    [clearAllTimers, enterCharSelect],
  );

  const startFriendCreate = useCallback(() => {
    clearAllTimers();
    modeRef.current = 'friend';
    setMode('friend');
    aiPersonalityRef.current = null;
    setAiPersonality(null);
    setFriend({ roomCode: null, connected: false, joinFailed: false, opponentFighterId: null, connectionLost: false, autoPlay: false });
    pendingStartRef.current = { kind: 'friendCreate' };
    enterCharSelect();
  }, [clearAllTimers, enterCharSelect]);

  const startFriendJoin = useCallback(
    (code: string) => {
      clearAllTimers();
      modeRef.current = 'friend';
      setMode('friend');
      aiPersonalityRef.current = null;
      setAiPersonality(null);
      setFriend({ roomCode: code, connected: false, joinFailed: false, opponentFighterId: null, connectionLost: false, autoPlay: false });
      pendingStartRef.current = { kind: 'friendJoin', code };
      enterCharSelect();
    },
    [clearAllTimers, enterCharSelect],
  );

  // ── Campaign entries ───────────────────────────────────────────────────────
  // Mode select -> the conquest map. Campaign never touches the friend transport; drop any prior
  // one and clear friend state so the map is clean.
  const enterCampaign = useCallback(() => {
    clearAllTimers();
    disposeFriendTransport();
    modeRef.current = 'campaign';
    setMode('campaign');
    aiPersonalityRef.current = null;
    setAiPersonality(null);
    pendingStartRef.current = null;
    campaignSettledRef.current = false;
    setCampaignReceipt(null);
    setFriend({ roomCode: null, connected: false, joinFailed: false, opponentFighterId: null, connectionLost: false, autoPlay: false });
    setPhaseNow('campaignMap');
  }, [clearAllTimers, disposeFriendTransport, setPhaseNow]);

  // Map -> node card: arm the campaign match for this node and enter the (reused) stake flow.
  const startCampaignNode = useCallback(
    (nodeId: number) => {
      // Gate the LADDER here, not in the map's render. The map disables locked discs
      // (FightExperience.tsx:347, :361-362), but that is a presentation detail — the provider was
      // taking any nodeId on trust, so the ONLY thing standing between a caller and the 39.959x node
      // was a `disabled` attribute. Playable = already conquered (replayable, and every node is
      // independently <=96% RTP so that is EV-negative, not a farm) or exactly the frontier.
      const beaten = campaignBeatenRef.current;
      const conquered = nodeId >= 1 && nodeId <= beaten.length && beaten[nodeId - 1];
      if (!conquered && nodeId - 1 !== frontierOf(beaten)) return;
      clearAllTimers();
      modeRef.current = 'campaign';
      setMode('campaign');
      campaignNodeIdRef.current = nodeId;
      setCampaignNodeId(nodeId);
      pendingStartRef.current = { kind: 'campaign', nodeId };
      // Opening a node is the player acknowledging the run-restarted notice, so retire it here.
      // Otherwise it only cleared on the next stake commit and lingered across map<->node trips.
      setCampaignStakeReset(false);
      enterStake();
    },
    [clearAllTimers, enterStake],
  );

  // Campaign receipt -> re-stake the SAME node (fresh stake deducted at commit).
  const retryNode = useCallback(() => {
    clearAllTimers();
    const nodeId = campaignNodeIdRef.current;
    if (nodeId == null) return;
    setMatchStateNow(createMatch());
    setLastOutcome(null);
    campaignDefenseRef.current = 0;
    setCampaignDefense(0);
    campaignGuardRef.current = 0;
    setCampaignGuard(0);
    setCampaignGuarded(false);
    setCampaignAbsorbed(false);
    pendingStartRef.current = { kind: 'campaign', nodeId };
    enterStake();
  }, [clearAllTimers, enterStake, setMatchStateNow]);

  // Campaign receipt (on met, if a next node exists) -> stake the NEXT node.
  const nextNode = useCallback(() => {
    clearAllTimers();
    const cur = campaignNodeIdRef.current;
    if (cur == null) return;
    const nextId = cur + 1;
    if (nextId > CAMPAIGN_NODE_COUNT) {
      setPhaseNow('campaignMap');
      return;
    }
    campaignNodeIdRef.current = nextId;
    setCampaignNodeId(nextId);
    setMatchStateNow(createMatch());
    setLastOutcome(null);
    campaignDefenseRef.current = 0;
    setCampaignDefense(0);
    campaignGuardRef.current = 0;
    setCampaignGuard(0);
    setCampaignGuarded(false);
    setCampaignAbsorbed(false);
    pendingStartRef.current = { kind: 'campaign', nodeId: nextId };
    enterStake();
  }, [clearAllTimers, enterStake, setPhaseNow, setMatchStateNow]);

  // Node card / campaign receipt -> back to the conquest map.
  const backToMap = useCallback(() => {
    clearAllTimers();
    setMatchStateNow(createMatch());
    setLastOutcome(null);
    campaignDefenseRef.current = 0;
    setCampaignDefense(0);
    campaignGuardRef.current = 0;
    setCampaignGuard(0);
    setCampaignGuarded(false);
    setCampaignAbsorbed(false);
    setPhaseNow('campaignMap');
  }, [clearAllTimers, setPhaseNow, setMatchStateNow]);

  // DEV-ONLY force hooks (force-state-hooks law). Progress-only: they touch beaten[] (persisted by
  // the effect) and NEVER money, stakes, or a live match. The UI gates them behind ?dev=1.
  const devConquerNext = useCallback(() => {
    const beaten = campaignBeatenRef.current;
    const frontier = frontierOf(beaten);
    if (frontier >= beaten.length) return;
    const next = markBeaten(beaten, frontier + 1);
    campaignBeatenRef.current = next;
    setCampaignBeaten(next);
  }, []);

  const devConquerAll = useCallback(() => {
    const all = new Array<boolean>(CAMPAIGN_NODE_COUNT).fill(true);
    campaignBeatenRef.current = all;
    setCampaignBeaten(all);
  }, []);

  const devResetCampaign = useCallback(() => {
    const fresh = new Array<boolean>(CAMPAIGN_NODE_COUNT).fill(false);
    campaignBeatenRef.current = fresh;
    setCampaignBeaten(fresh);
  }, []);

  const continueNext = useCallback(() => {
    if (phaseRef.current !== 'roundEnd') {
      return;
    }
    clearAllTimers();
    setMatchStateNow(startNextRound(matchStateRef.current));
    startRoundIntro();
  }, [clearAllTimers, startRoundIntro, setMatchStateNow]);

  // REMATCH → back to the stake screen with the same preset preselected; the
  // re-commit deducts the stake again (winner-takes-all, fresh pot each match).
  const rematch = useCallback(() => {
    clearAllTimers();
    if (modeRef.current === 'cpu' && aiPersonalityRef.current) {
      pendingStartRef.current = { kind: 'cpu', personality: aiPersonalityRef.current };
    } else if (modeRef.current === 'friend') {
      // Simulated friend: re-create a room and let the sim rematch match the stake.
      pendingStartRef.current = { kind: 'friendCreate' };
    }
    setMatchStateNow(createMatch());
    setLastOutcome(null);
    enterStake();
  }, [clearAllTimers, enterStake, setMatchStateNow]);

  // CHANGE FIGHTER (victory screen) → back to char select for the next match, same start armed.
  // Like rematch but landing on charSelect; the later confirm/commit re-deducts a fresh stake.
  const changeFighter = useCallback(() => {
    clearAllTimers();
    if (modeRef.current === 'cpu' && aiPersonalityRef.current) {
      pendingStartRef.current = { kind: 'cpu', personality: aiPersonalityRef.current };
    } else if (modeRef.current === 'friend') {
      pendingStartRef.current = { kind: 'friendCreate' };
    }
    setMatchStateNow(createMatch());
    setLastOutcome(null);
    enterCharSelect();
  }, [clearAllTimers, enterCharSelect, setMatchStateNow]);

  const backToTitle = useCallback(() => {
    clearAllTimers();
    // BACK from the friend waiting room ('mode' phase, match never started): refund the
    // committed stake. Any other exit (mid-match flee included) does NOT refund — the stake
    // stays consumed-or-lost; the one-shot flag is dropped so it can never refund later.
    if (modeRef.current === 'friend' && phaseRef.current === 'mode') {
      refundStakeIfCommitted();
    }
    stakeCommittedRef.current = false;
    disposeFriendTransport();
    modeRef.current = null;
    setMode(null);
    aiPersonalityRef.current = null;
    setAiPersonality(null);
    pendingStartRef.current = null;
    settledRef.current = false;
    setReceipt(null);
    campaignNodeIdRef.current = null;
    setCampaignNodeId(null);
    campaignSettledRef.current = false;
    campaignDefenseRef.current = 0;
    setCampaignDefense(0);
    campaignGuardRef.current = 0;
    setCampaignGuard(0);
    setCampaignGuarded(false);
    setCampaignAbsorbed(false);
    setCampaignReceipt(null);
    exchangeIdxRef.current = 0;
    oppPickBufferRef.current.clear();
    opponentGoneRef.current = false;
    setMatchStateNow(createMatch());
    setLastOutcome(null);
    playerLockedRef.current = false;
    setPlayerPick({ locked: false, move: null });
    setFriend({ roomCode: null, connected: false, joinFailed: false, opponentFighterId: null, connectionLost: false, autoPlay: false });
    setPhaseNow('title');
  }, [clearAllTimers, refundStakeIfCommitted, disposeFriendTransport, setPhaseNow, setMatchStateNow]);

  // Relay our committed fighter id to the peer (queue-safe: WsTransport buffers if the socket is
  // not open yet). No-op in CPU mode (no transport).
  const sendFighterProfile = useCallback((id: string) => {
    transportRef.current?.sendProfile(id);
  }, []);

  const shotClockSeconds = Math.ceil(shotClockMs / 1000);
  const canStake = balanceLamports >= MIN_STAKE;

  const campaign: CampaignState = {
    nodeId: campaignNodeId,
    beaten: campaignBeaten,
    lockStakeLamports: campaignLockStake,
    stakeReset: campaignStakeReset,
    frontier: frontierOf(campaignBeaten),
    defenseRemaining: campaignDefense,
    absorbed: campaignAbsorbed,
    guardRemaining: campaignGuard,
    guarded: campaignGuarded,
  };

  return {
    phase,
    matchState,
    mode,
    aiPersonality,
    shotClockSeconds,
    lastOutcome,
    playerPick,
    friend,
    balanceLamports,
    stakeLamports,
    canStake,
    receipt,
    campaign,
    campaignReceipt,
    enterCampaign,
    startCampaignNode,
    retryNode,
    nextNode,
    backToMap,
    devConquerNext,
    devConquerAll,
    devResetCampaign,
    setStake,
    stepStake,
    commitStake,
    resetBank,
    enterModeSelect,
    startCpu,
    startFriendCreate,
    startFriendJoin,
    confirmFighter,
    enterCharSelect,
    changeFighter,
    pick,
    continueNext,
    rematch,
    backToTitle,
    sendFighterProfile,
  };
}
