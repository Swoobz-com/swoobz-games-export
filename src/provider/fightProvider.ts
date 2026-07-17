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
  playRoundBanner,
  playVictory,
} from '../audio/fightAudio';

export type Phase =
  | 'title'
  | 'mode'
  | 'vsIntro'
  | 'roundIntro'
  | 'fightBanner'
  | 'picking'
  | 'reveal'
  | 'resolve'
  | 'roundEnd'
  | 'matchEnd';

export type Mode = 'cpu' | 'friend';

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
    [schedule, beginPicking, startRoundIntro, setPhaseNow, setMatchStateNow],
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
    setPhaseNow('mode');
  }, [clearAllTimers, setPhaseNow]);

  const startCpu = useCallback(
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

  const startFriendCreate = useCallback(() => {
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

  const startFriendJoin = useCallback(
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

  const continueNext = useCallback(() => {
    if (phaseRef.current !== 'roundEnd') {
      return;
    }
    clearAllTimers();
    setMatchStateNow(startNextRound(matchStateRef.current));
    startRoundIntro();
  }, [clearAllTimers, startRoundIntro, setMatchStateNow]);

  const rematch = useCallback(() => {
    clearAllTimers();
    setMatchStateNow(createMatch());
    setLastOutcome(null);
    startRoundIntro();
  }, [clearAllTimers, startRoundIntro, setMatchStateNow]);

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
    setMatchStateNow(createMatch());
    setLastOutcome(null);
    playerLockedRef.current = false;
    setPlayerPick({ locked: false, move: null });
    setFriend({ roomCode: null, connected: false, joinFailed: false });
    setPhaseNow('title');
  }, [clearAllTimers, setPhaseNow, setMatchStateNow]);

  const shotClockSeconds = Math.ceil(shotClockMs / 1000);

  return {
    phase,
    matchState,
    mode,
    aiPersonality,
    shotClockSeconds,
    lastOutcome,
    playerPick,
    friend,
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
