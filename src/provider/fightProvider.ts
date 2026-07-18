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
import type { MatchTransport } from '../transport/matchTransport';
import { LocalSimTransport } from '../transport/matchTransport';
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

export type Phase =
  | 'title'
  | 'mode'
  | 'stake'
  | 'vsIntro'
  | 'roundIntro'
  | 'fightBanner'
  | 'picking'
  | 'reveal'
  | 'resolve'
  | 'roundEnd'
  | 'matchEnd';

export type Mode = 'cpu' | 'friend';

// What the stake phase will start once the wager is committed. Captured when the
// player picks a CPU personality / enters the friend flow, replayed by commitStake.
type PendingStart =
  | { kind: 'cpu'; personality: AiPersonality }
  | { kind: 'friendCreate' }
  | { kind: 'friendJoin'; code: string };

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

export interface PlayerPickState {
  locked: boolean;
  move: Move | null;
}

export interface FriendState {
  roomCode: string | null;
  connected: boolean;
  joinFailed: boolean;
}

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
export const RESOLVE_MS = 700;
// Round/match-ending hit: 120ms hitstop + ~800ms slow-mo zoom + snap back.
export const RESOLVE_KO_MS = 1400;
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
  setStake: (lamports: bigint) => void;
  stepStake: (dir: 'up' | 'down') => void;
  commitStake: () => void;
  /** Restore the practice bank to INITIAL_BALANCE (mockup convenience). */
  resetBank: () => void;
  enterModeSelect: () => void;
  startCpu: (personality: AiPersonality) => void;
  startFriendCreate: () => void;
  startFriendJoin: (code: string) => void;
  pick: (move: Move) => void;
  continueNext: () => void;
  rematch: () => void;
  backToTitle: () => void;
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
  transportFactory: () => MatchTransport = () => new LocalSimTransport(),
): FightController {
  const [phase, setPhase] = useState<Phase>('title');
  const [matchState, setMatchState] = useState<MatchState>(() => createMatch());
  const [mode, setMode] = useState<Mode | null>(null);
  const [aiPersonality, setAiPersonality] = useState<AiPersonality | null>(null);
  const [shotClockMs, setShotClockMs] = useState<number>(SHOT_CLOCK_MS);
  const [lastOutcome, setLastOutcome] = useState<ExchangeOutcome | null>(null);
  const [playerPick, setPlayerPick] = useState<PlayerPickState>({ locked: false, move: null });
  const [friend, setFriend] = useState<FriendState>({ roomCode: null, connected: false, joinFailed: false });

  // --- Wager layer state. Balance is read from localStorage ONCE at init; stake
  // defaults to $5 clamped to that balance. ---
  const [balanceLamports, setBalanceLamports] = useState<bigint>(loadBalance);
  const [stakeLamports, setStakeLamports] = useState<bigint>(() => clampStake(DEFAULT_STAKE, balanceLamports));
  const [receipt, setReceipt] = useState<StakeReceipt | null>(null);

  // Refs mirror balance/stake for synchronous reads inside plain callbacks (the
  // commit deduction + settle credit must never live in a setState updater).
  const balanceRef = useRef<bigint>(balanceLamports);
  const stakeRef = useRef<bigint>(stakeLamports);
  const pendingStartRef = useRef<PendingStart | null>(null);
  // One-shot settle guard: flipped true the first time a match settles so a
  // StrictMode double-invoke / re-render can't credit the pot twice.
  const settledRef = useRef<boolean>(false);

  // Persist balance on every change (idempotent; safe under StrictMode). This is
  // an effect, never a setState updater, so it does not violate the no-side-
  // effects-in-reducers rule.
  useEffect(() => {
    saveBalance(balanceLamports);
  }, [balanceLamports]);

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

  // Own the transport's lifecycle in effect setup/cleanup (not lazy-ref-in-render) so a
  // StrictMode dev mount -> cleanup -> mount cycle disposes the FIRST instance and hands us
  // a fresh, non-disposed SECOND instance -- never a permanently-disposed transport.
  useEffect(() => {
    const transport = transportFactory();
    transportRef.current = transport;
    return () => {
      clearAllTimers();
      unsubOpponentPickRef.current?.();
      unsubPresenceRef.current?.();
      unsubOpponentPickRef.current = null;
      unsubPresenceRef.current = null;
      transport.dispose();
      if (transportRef.current === transport) {
        transportRef.current = null;
      }
    };
    // Intentionally empty: transportFactory is a constructor-injected default that should
    // only be invoked once per mounted controller, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearAllTimers]);

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
  // double-invoke or a re-render cannot credit the pot twice. GORVAK is P1 (the
  // player); a P1 match win pays the pot into the practice bank.
  const settleMatch = useCallback((winner: 'p1' | 'p2') => {
    if (settledRef.current) return;
    settledRef.current = true;
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

  const resolveExchangeNow = useCallback(
    (p1Move: Move, p2Move: Move) => {
      setPhaseNow('resolve');
      const prev = matchStateRef.current;
      const next = applyExchange(prev, p1Move, p2Move);
      setMatchStateNow(next);

      const outcome = next.history[next.history.length - 1].outcome;
      setLastOutcome(outcome);
      const roundEnding = Boolean(next.roundOver);
      outcomeSound(outcome, roundEnding);

      const resolveDelay = roundEnding ? RESOLVE_KO_MS : RESOLVE_MS;
      schedule(() => {
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
    [schedule, beginPicking, startRoundIntro, setPhaseNow, setMatchStateNow, settleMatch],
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
      } else if (modeRef.current === 'friend') {
        transportRef.current?.sendPick(move);
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

  const subscribeFriendChannels = useCallback(() => {
    unsubOpponentPickRef.current?.();
    unsubPresenceRef.current?.();
    const transport = transportRef.current;
    if (!transport) {
      return;
    }
    unsubOpponentPickRef.current = transport.onOpponentPick((move) => {
      pendingRef.current = { ...pendingRef.current, p2: move };
      tryReveal();
    });
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
  }, [schedule, startRoundIntro, tryReveal, setPhaseNow, setMatchStateNow]);

  const enterModeSelect = useCallback(() => {
    clearAllTimers();
    // A clean mode screen: drop any half-selected mode so the CPU/friend cards
    // (not a stale room-code view) always render. Balance/receipt persist.
    modeRef.current = null;
    setMode(null);
    aiPersonalityRef.current = null;
    setAiPersonality(null);
    pendingStartRef.current = null;
    setFriend({ roomCode: null, connected: false, joinFailed: false });
    setPhaseNow('mode');
  }, [clearAllTimers, setPhaseNow]);

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

  const beginFriendCreate = useCallback(() => {
    clearAllTimers();
    modeRef.current = 'friend';
    setMode('friend');
    aiPersonalityRef.current = null;
    setAiPersonality(null);
    setLastOutcome(null);
    setFriend({ roomCode: null, connected: false, joinFailed: false });
    setPhaseNow('mode');
    subscribeFriendChannels();
    transportRef.current?.createRoom().then((code) => {
      setFriend((prev) => ({ ...prev, roomCode: code }));
    });
  }, [clearAllTimers, subscribeFriendChannels, setPhaseNow]);

  const beginFriendJoin = useCallback(
    (code: string) => {
      clearAllTimers();
      modeRef.current = 'friend';
      setMode('friend');
      aiPersonalityRef.current = null;
      setAiPersonality(null);
      setLastOutcome(null);
      setFriend({ roomCode: code, connected: false, joinFailed: false });
      setPhaseNow('mode');
      subscribeFriendChannels();
      transportRef.current?.join(code).then((ok) => {
        if (!ok) {
          setFriend((prev) => ({ ...prev, joinFailed: true }));
        }
      });
    },
    [clearAllTimers, subscribeFriendChannels, setPhaseNow],
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
    setReceipt(null);
    setPhaseNow('stake');
  }, [clearAllTimers, setPhaseNow]);

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
    playStakeCommit();
    const pending = pendingStartRef.current;
    if (!pending) return;
    if (pending.kind === 'cpu') {
      beginCpuMatch(pending.personality);
    } else if (pending.kind === 'friendCreate') {
      beginFriendCreate();
    } else {
      beginFriendJoin(pending.code);
    }
  }, [beginCpuMatch, beginFriendCreate, beginFriendJoin]);

  // ── Public entries (from mode select): remember the choice, go to stake ──
  const startCpu = useCallback(
    (personality: AiPersonality) => {
      clearAllTimers();
      modeRef.current = 'cpu';
      setMode('cpu');
      aiPersonalityRef.current = personality;
      setAiPersonality(personality);
      pendingStartRef.current = { kind: 'cpu', personality };
      enterStake();
    },
    [clearAllTimers, enterStake],
  );

  const startFriendCreate = useCallback(() => {
    clearAllTimers();
    modeRef.current = 'friend';
    setMode('friend');
    aiPersonalityRef.current = null;
    setAiPersonality(null);
    setFriend({ roomCode: null, connected: false, joinFailed: false });
    pendingStartRef.current = { kind: 'friendCreate' };
    enterStake();
  }, [clearAllTimers, enterStake]);

  const startFriendJoin = useCallback(
    (code: string) => {
      clearAllTimers();
      modeRef.current = 'friend';
      setMode('friend');
      aiPersonalityRef.current = null;
      setAiPersonality(null);
      setFriend({ roomCode: code, connected: false, joinFailed: false });
      pendingStartRef.current = { kind: 'friendJoin', code };
      enterStake();
    },
    [clearAllTimers, enterStake],
  );

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

  const backToTitle = useCallback(() => {
    clearAllTimers();
    unsubOpponentPickRef.current?.();
    unsubPresenceRef.current?.();
    unsubOpponentPickRef.current = null;
    unsubPresenceRef.current = null;
    modeRef.current = null;
    setMode(null);
    aiPersonalityRef.current = null;
    setAiPersonality(null);
    pendingStartRef.current = null;
    settledRef.current = false;
    setReceipt(null);
    setMatchStateNow(createMatch());
    setLastOutcome(null);
    playerLockedRef.current = false;
    setPlayerPick({ locked: false, move: null });
    setFriend({ roomCode: null, connected: false, joinFailed: false });
    setPhaseNow('title');
  }, [clearAllTimers, setPhaseNow, setMatchStateNow]);

  const shotClockSeconds = Math.ceil(shotClockMs / 1000);
  const canStake = balanceLamports >= MIN_STAKE;

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
    setStake,
    stepStake,
    commitStake,
    resetBank,
    enterModeSelect,
    startCpu,
    startFriendCreate,
    startFriendJoin,
    pick,
    continueNext,
    rematch,
    backToTitle,
  };
}
