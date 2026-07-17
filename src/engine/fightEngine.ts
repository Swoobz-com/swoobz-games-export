// Pure engine for the STRIKE / THROW / BLOCK triangle. No DOM. No React.
// Deterministic: given a seed and a sequence of picks, outcomes are reproducible.

export type Move = 'strike' | 'throw' | 'block';

export const MOVES: readonly Move[] = ['strike', 'throw', 'block'];

// BEATS[a] === b means a beats b (a is the winning move against b).
export const BEATS: Record<Move, Move> = {
  strike: 'throw',
  throw: 'block',
  block: 'strike',
};

export type ExchangeOutcome =
  | { kind: 'clash' }
  | { kind: 'hit'; winner: 'p1' | 'p2'; move: Move; loserMove: Move };

export function resolveExchange(p1: Move, p2: Move): ExchangeOutcome {
  if (p1 === p2) {
    return { kind: 'clash' };
  }
  if (BEATS[p1] === p2) {
    return { kind: 'hit', winner: 'p1', move: p1, loserMove: p2 };
  }
  // Otherwise p2's move must beat p1's move (triangle is total).
  return { kind: 'hit', winner: 'p2', move: p2, loserMove: p1 };
}

export interface FighterState {
  hp: number;
  roundsWon: number;
}

export interface ExchangeRecord {
  p1: Move;
  p2: Move;
  outcome: ExchangeOutcome;
}

export interface MatchState {
  p1: FighterState;
  p2: FighterState;
  round: number; // 1-based
  history: ExchangeRecord[]; // current round only
  matchHistory: ExchangeRecord[][]; // archived rounds (does not include current)
  roundOver?: 'p1' | 'p2';
  matchOver?: 'p1' | 'p2';
  flawless?: boolean;
}

export const HP_MAX = 3;
export const ROUNDS_TO_WIN = 2;

export function createMatch(): MatchState {
  return {
    p1: { hp: HP_MAX, roundsWon: 0 },
    p2: { hp: HP_MAX, roundsWon: 0 },
    round: 1,
    history: [],
    matchHistory: [],
    roundOver: undefined,
    matchOver: undefined,
    flawless: undefined,
  };
}

export function applyExchange(state: MatchState, p1Move: Move, p2Move: Move): MatchState {
  const outcome = resolveExchange(p1Move, p2Move);
  const record: ExchangeRecord = { p1: p1Move, p2: p2Move, outcome };

  let p1: FighterState = { ...state.p1 };
  let p2: FighterState = { ...state.p2 };

  if (outcome.kind === 'hit') {
    if (outcome.winner === 'p1') {
      p2 = { ...p2, hp: Math.max(0, p2.hp - 1) };
    } else {
      p1 = { ...p1, hp: Math.max(0, p1.hp - 1) };
    }
  }

  const history = [...state.history, record];

  let roundOver: 'p1' | 'p2' | undefined;
  let flawless: boolean | undefined;
  let matchOver: 'p1' | 'p2' | undefined;

  if (p1.hp <= 0) {
    roundOver = 'p2';
  } else if (p2.hp <= 0) {
    roundOver = 'p1';
  }

  if (roundOver) {
    const winnerFighter = roundOver === 'p1' ? p1 : p2;
    flawless = winnerFighter.hp === HP_MAX;
    if (roundOver === 'p1') {
      p1 = { ...p1, roundsWon: p1.roundsWon + 1 };
    } else {
      p2 = { ...p2, roundsWon: p2.roundsWon + 1 };
    }
    if (p1.roundsWon >= ROUNDS_TO_WIN) {
      matchOver = 'p1';
    } else if (p2.roundsWon >= ROUNDS_TO_WIN) {
      matchOver = 'p2';
    }
  }

  return {
    p1,
    p2,
    round: state.round,
    history,
    matchHistory: state.matchHistory,
    roundOver,
    matchOver,
    flawless,
  };
}

export function startNextRound(state: MatchState): MatchState {
  return {
    p1: { ...state.p1, hp: HP_MAX },
    p2: { ...state.p2, hp: HP_MAX },
    round: state.round + 1,
    history: [],
    matchHistory: [...state.matchHistory, state.history],
    roundOver: undefined,
    matchOver: state.matchOver,
    flawless: undefined,
  };
}

// mulberry32: small, fast, seeded PRNG. Returns a function producing floats in [0, 1).
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomMove(rng: () => number): Move {
  const idx = Math.floor(rng() * MOVES.length);
  return MOVES[Math.min(idx, MOVES.length - 1)];
}
