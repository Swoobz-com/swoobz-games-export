// The three CPU personalities. Each is a pure function of (past exchange records, rng).
// They never receive the player's current, un-revealed pick -- the type signature makes
// cheating structurally impossible: aiPick only accepts COMPLETED exchanges.

import type { ExchangeRecord, Move } from './fightEngine';
import { MOVES } from './fightEngine';

export type AiPersonality = 'brute' | 'warden' | 'oracle';

// COUNTERS[m] = the move that beats m.
const COUNTERS: Record<Move, Move> = {
  throw: 'strike',
  block: 'throw',
  strike: 'block',
};

function counterOf(m: Move): Move {
  return COUNTERS[m];
}

function uniformMove(rng: () => number): Move {
  const idx = Math.floor(rng() * MOVES.length);
  return MOVES[Math.min(idx, MOVES.length - 1)];
}

function pickFromWeights(rng: () => number, weights: Record<Move, number>): Move {
  const total = weights.strike + weights.throw + weights.block;
  let roll = rng() * total;
  for (const move of MOVES) {
    roll -= weights[move];
    if (roll <= 0) {
      return move;
    }
  }
  return MOVES[MOVES.length - 1];
}

function pickAmongTies(rng: () => number, moves: Move[]): Move {
  const idx = Math.floor(rng() * moves.length);
  return moves[Math.min(idx, moves.length - 1)];
}

function mostFrequent(moves: Move[], rng: () => number): Move | undefined {
  if (moves.length === 0) {
    return undefined;
  }
  const counts: Record<Move, number> = { strike: 0, throw: 0, block: 0 };
  for (const m of moves) {
    counts[m] += 1;
  }
  const max = Math.max(counts.strike, counts.throw, counts.block);
  const tied = MOVES.filter((m) => counts[m] === max);
  return tied.length === 1 ? tied[0] : pickAmongTies(rng, tied);
}

const BRUTE_WEIGHTS: Record<Move, number> = { strike: 0.55, throw: 0.25, block: 0.2 };
const BRUTE_REPEAT_CHANCE = 0.25;
const WARDEN_COUNTER_CHANCE = 0.6;
const ORACLE_PREDICT_CHANCE = 0.5;

function bruteAi(pastExchanges: ExchangeRecord[], rng: () => number): Move {
  const lastOwnPick = pastExchanges.length > 0 ? pastExchanges[pastExchanges.length - 1].p2 : undefined;
  if (lastOwnPick !== undefined && rng() < BRUTE_REPEAT_CHANCE) {
    return lastOwnPick;
  }
  return pickFromWeights(rng, BRUTE_WEIGHTS);
}

function wardenAi(pastExchanges: ExchangeRecord[], rng: () => number): Move {
  const humanMoves = pastExchanges.map((e) => e.p1);
  if (humanMoves.length === 0) {
    return uniformMove(rng);
  }
  if (rng() < WARDEN_COUNTER_CHANCE) {
    const frequent = mostFrequent(humanMoves, rng);
    return frequent !== undefined ? counterOf(frequent) : uniformMove(rng);
  }
  return uniformMove(rng);
}

function oracleAi(pastExchanges: ExchangeRecord[], rng: () => number): Move {
  if (rng() < ORACLE_PREDICT_CHANCE) {
    // Build the human's transition table: what did they play after each of their own moves?
    const followUps: Record<Move, Move[]> = { strike: [], throw: [], block: [] };
    for (let i = 1; i < pastExchanges.length; i += 1) {
      const prev = pastExchanges[i - 1].p1;
      const cur = pastExchanges[i].p1;
      followUps[prev].push(cur);
    }
    const lastHumanMove = pastExchanges.length > 0 ? pastExchanges[pastExchanges.length - 1].p1 : undefined;
    if (lastHumanMove !== undefined && followUps[lastHumanMove].length > 0) {
      const predicted = mostFrequent(followUps[lastHumanMove], rng);
      if (predicted !== undefined) {
        return counterOf(predicted);
      }
    }
    return uniformMove(rng);
  }
  return uniformMove(rng);
}

// pastExchanges: flat list of ALL completed exchanges this match (across rounds), p1 = human.
export function aiPick(personality: AiPersonality, pastExchanges: ExchangeRecord[], rng: () => number): Move {
  switch (personality) {
    case 'brute':
      return bruteAi(pastExchanges, rng);
    case 'warden':
      return wardenAi(pastExchanges, rng);
    case 'oracle':
      return oracleAi(pastExchanges, rng);
    default: {
      const exhaustive: never = personality;
      return exhaustive;
    }
  }
}
