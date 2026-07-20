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

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExchangeOutcome, ExchangeRecord, MatchState, Move } from '../engine/fightEngine';
import { applyExchange, createMatch, mulberry32, randomMove, startNextRound } from '../engine/fightEngine';
import type { AiPersonality } from '../engine/fightAi';
import { aiPick } from '../engine/fightAi';
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
  DEFAULT_STAKE,
  INITIAL_BALANCE,
  MIN_STAKE,
  ONE_USDC,
  potLamports,
  settle,
} from '../engine/fightStakes';
import {
  campaignPayout,
  CAMPAIGN_NODE_COUNT,
  evaluateObjective,
  getCampaignNode,
  TIERS,
} from '../engine/fightCampaign';
import type { CampaignTier, ObjectiveResult } from '../engine/fightCampaign';

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

/** Frozen after settle — the numbers the victory/defeat receipt strip prints. */
export interface StakeReceipt {
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
  tier: CampaignTier;
  objective: string;
  met: boolean;
  stakeLamports: bigint;
  multBps: bigint;
  /** TOTAL credited on met (0 on failed); net = met ? payout - stake : -stake (stake gone at commit). */
  payoutLamports: bigint;
  netLamports: bigint;
  balanceAfterLamports: bigint;
}

/** Campaign progression exposed to the UI. `beaten[i]` = node i+1 conquered; frontier = the first
 *  unbeaten index (=== count when all conquered). nodeId = the active/selected node. */
export interface CampaignState {
  nodeId: number | null;
  beaten: boolean[];
  frontier: number;
}

// Campaign progression persistence (spec §5). Shape { v:1, beaten: boolean[10] }; corrupt/missing =
// fresh. Balance stays the shared practice bank (BALANCE_STORAGE_KEY) via the existing paths.
const CAMPAIGN_STORAGE_KEY = 'frozen-requiem.campaign.v1';

/** Corrupt-safe parse of the persisted campaign progress into a fixed-length beaten[] (pure —
 *  exported for unit tests). Anything malformed (bad JSON, wrong version, non-array) => all-false. */
export function parseCampaignBeaten(raw: string | null): boolean[] {
  const fresh = (): boolean[] => new Array<boolean>(CAMPAIGN_NODE_COUNT).fill(false);
  if (raw == null) return fresh();
  try {
    const data = JSON.parse(raw) as unknown;
    if (typeof data !== 'object' || data === null) return fresh();
    const rec = data as { v?: unknown; beaten?: unknown };
    if (rec.v !== 1 || !Array.isArray(rec.beaten)) return fresh();
    const beaten = fresh();
    for (let i = 0; i < CAMPAIGN_NODE_COUNT; i += 1) beaten[i] = rec.beaten[i] === true;
    return beaten;
  } catch {
    return fresh();
  }
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

function loadCampaignBeaten(): boolean[] {
  try {
    if (typeof localStorage === 'undefined') return parseCampaignBeaten(null);
    return parseCampaignBeaten(localStorage.getItem(CAMPAIGN_STORAGE_KEY));
  } catch {
    return parseCampaignBeaten(null);
  }
}

function saveCampaignBeaten(beaten: boolean[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify({ v: 1, beaten }));
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

function flatMatchHistory(state: MatchState): ExchangeRecord[] {
  return [...state.matchHistory.flat(), ...state.history];
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
  const [campaignBeaten, setCampaignBeaten] = useState<boolean[]>(loadCampaignBeaten);
  const [campaignReceipt, setCampaignReceipt] = useState<CampaignReceipt | null>(null);

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

  // --- Campaign refs (synchronous reads inside plain callbacks / timer bodies). ---
  const campaignNodeIdRef = useRef<number | null>(null);
  const campaignBeatenRef = useRef<boolean[]>(campaignBeaten);
  // Running count of the PLAYER's flawless round wins this campaign match (fed to evaluateObjective).
  const campaignFlawlessP1Ref = useRef<number>(0);
  // The seeded per-match RNG for the campaign enemy's UNIFORM-RANDOM picks (randomMove ONLY, never
  // aiPick — spec §0.2 money law). Reseeded at each campaign match start.
  const campaignRngRef = useRef<() => number>(mulberry32((Date.now() ^ 0x1b873593) >>> 0));
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
    saveCampaignBeaten(campaignBeaten);
  }, [campaignBeaten]);

  // Refs mirror the state above for synchronous reads inside callbacks/timer bodies --
  // updated directly alongside every setState call, never lagging behind a render.
  const phaseRef = useRef<Phase>(phase);
  const matchStateRef = useRef<MatchState>(matchState);
  const modeRef = useRef<Mode | null>(mode);
  const aiPersonalityRef = useRef<AiPersonality | null>(aiPersonality);
  const playerLockedRef = useRef<boolean>(false);

  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const transportRef = useRef<MatchTransport | null>(null);
  const aiRngRef = useRef<() => number>(mulberry32(Date.now() ^ 0x2545f491));
  const autoPickRngRef = useRef<() => number>(mulberry32((Date.now() ^ 0x9e3779b9) >>> 0));
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

  // Settle the wager exactly once per match (the winner takes the pot). Runs from
  // a plain scheduled callback in the SAME transition that flips to 'matchEnd' --
  // never from a setState updater -- and is guarded by settledRef so a StrictMode
  // double-invoke or a re-render cannot credit the pot twice. P1 is ALWAYS the
  // player (whichever fighter they picked); a P1 match win pays the pot into the
  // practice bank. The provider is identity-agnostic and never names a character.
  const settleMatch = useCallback((winner: 'p1' | 'p2') => {
    if (settledRef.current) return;
    settledRef.current = true;
    // The committed stake is consumed by this settle: no later path may refund it.
    stakeCommittedRef.current = false;
    const stake = stakeRef.current;
    const playerWon = winner === 'p1';
    const pot = potLamports(stake);
    // The stake was already deducted at commit, so balanceRef is the post-commit
    // balance; settle() credits the pot on a win and leaves it untouched on a loss.
    const balanceAfter = settle(balanceRef.current, stake, playerWon);
    balanceRef.current = balanceAfter;
    setBalanceLamports(balanceAfter);
    setReceipt({
      stakeLamports: stake,
      opponentStakeLamports: stake, // even match: the opponent matches the stake
      potLamports: pot,
      playerWon,
      payoutLamports: playerWon ? pot : 0n,
      balanceAfterLamports: balanceAfter,
    });
    if (playerWon) playPayout();
  }, []);

  // Settle a CAMPAIGN match exactly once (spec §16). The objective verdict decides the money:
  //   met  -> balance += campaignPayout(stake, multBps)  (net = payout - stake; the stake was
  //           deducted at commit, so we credit the TOTAL payout here)
  //   failed -> nothing credited (the stake is already gone)
  // Guarded by campaignSettledRef (same one-shot pattern as settleMatch's settledRef). On met the
  // node is marked beaten and persisted. Plain callback, never a setState updater. The celebration
  // (playVictory earlier + playPayout here) is value-INDEPENDENT: identical fanfare for x1.28 and
  // x8.77 (RG-C5 / RG-C5). P1 is ALWAYS the player, so the objective always judges the player.
  const settleCampaign = useCallback((result: ObjectiveResult) => {
    if (result === 'open') return; // never settle on an open objective
    if (campaignSettledRef.current) return;
    campaignSettledRef.current = true;
    // The committed stake is consumed by this settle: no later path may refund it.
    stakeCommittedRef.current = false;
    const stake = stakeRef.current;
    const node = getCampaignNode(campaignNodeIdRef.current);
    const tierDef = node ? TIERS[node.tier] : null;
    const multBps = tierDef ? tierDef.multBps : 0n;
    const met = result === 'met';
    const payout = met ? campaignPayout(stake, multBps) : 0n;
    const balanceAfter = balanceRef.current + payout;
    balanceRef.current = balanceAfter;
    setBalanceLamports(balanceAfter);
    setCampaignReceipt({
      nodeId: node ? node.id : campaignNodeIdRef.current ?? 0,
      nodeName: node ? node.name : '',
      tier: node ? node.tier : 'takeRound',
      objective: tierDef ? tierDef.objective : '',
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
    const refunded = balanceRef.current + stakeRef.current;
    balanceRef.current = refunded;
    setBalanceLamports(refunded);
  }, []);

  const resolveExchangeNow = useCallback(
    (p1Move: Move, p2Move: Move) => {
      setPhaseNow('resolve');
      const prev = matchStateRef.current;
      const next = applyExchange(prev, p1Move, p2Move);
      // Advance the exchange counter in lockstep with the engine (both clients resolve the same
      // exchange exactly once, so their indices stay aligned). Harmless/unused in CPU mode.
      exchangeIdxRef.current += 1;
      setMatchStateNow(next);

      const outcome = next.history[next.history.length - 1].outcome;
      setLastOutcome(outcome);
      const roundEnding = Boolean(next.roundOver);
      outcomeSound(outcome, roundEnding);

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
        // CAMPAIGN (spec §16): the objective is judged after every completed ROUND (never
        // mid-round). While 'open' the fight continues exactly like a normal match; on 'met' /
        // 'failed' we STOP starting rounds and settle ONCE. The engine is untouched — we simply
        // stop calling startNextRound. Every campaign fight ends on a round boundary (the evaluator
        // is only consulted at round end), so the round-win/loss beat always plays before settle.
        if (modeRef.current === 'campaign') {
          if (!next.roundOver) {
            beginPicking();
            return;
          }
          if (next.roundOver === 'p1' && next.flawless) campaignFlawlessP1Ref.current += 1;
          const node = getCampaignNode(campaignNodeIdRef.current);
          const tier: CampaignTier = node ? node.tier : 'winMatch';
          const result = evaluateObjective(
            tier,
            next.p1.roundsWon,
            next.p2.roundsWon,
            campaignFlawlessP1Ref.current,
            Boolean(next.matchOver),
          );
          if (next.flawless) playFlawless();
          // Let the round-win/loss beat play in the roundEnd dwell (the KO/special/victory chain
          // for this round-ending exchange already fired in the UI choreography, which arms on ANY
          // round-ending win — no engine matchOver required).
          setPhaseNow('roundEnd');
          if (result === 'open') {
            schedule(() => {
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
        if (aiPersonalityRef.current) {
          const opponentMove = aiPick(aiPersonalityRef.current, flatMatchHistory(matchStateRef.current), aiRngRef.current);
          pendingRef.current = { ...pendingRef.current, p2: opponentMove };
        }
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
    campaignFlawlessP1Ref.current = 0;
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
      campaignFlawlessP1Ref.current = 0;
      campaignSettledRef.current = false;
      campaignRngRef.current = mulberry32((Date.now() ^ (nodeId * 0x9e3779b1) ^ 0x1b873593) >>> 0);
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
      beginCampaignMatch(pending.nodeId);
    }
  }, [beginCpuMatch, beginFriendCreate, beginFriendJoin, beginCampaignMatch]);

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
      clearAllTimers();
      modeRef.current = 'campaign';
      setMode('campaign');
      campaignNodeIdRef.current = nodeId;
      setCampaignNodeId(nodeId);
      pendingStartRef.current = { kind: 'campaign', nodeId };
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
    campaignFlawlessP1Ref.current = 0;
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
    campaignFlawlessP1Ref.current = 0;
    pendingStartRef.current = { kind: 'campaign', nodeId: nextId };
    enterStake();
  }, [clearAllTimers, enterStake, setPhaseNow, setMatchStateNow]);

  // Node card / campaign receipt -> back to the conquest map.
  const backToMap = useCallback(() => {
    clearAllTimers();
    setMatchStateNow(createMatch());
    setLastOutcome(null);
    campaignFlawlessP1Ref.current = 0;
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
    campaignFlawlessP1Ref.current = 0;
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
    frontier: frontierOf(campaignBeaten),
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
