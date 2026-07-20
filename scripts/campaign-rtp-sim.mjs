// Campaign RTP Monte-Carlo battery (CAMPAIGN-SPEC §6, foreground-sims law).
//
// Plays >= 200k matches PER NODE against the REAL frozen engine + the REAL evaluateObjective, with
// BOTH fighters picking uniform-random via the engine's randomMove (spec §0.2: campaign enemies are
// randomMove ONLY, never aiPick — random is Nash-neutral, so measured P(met) matches the closed-form
// tier probability vs ANY player). Measures P(met) with early exit and the resulting RTP
// (P * multBps / 10000), asserts every node lands in [0.950, 0.961], prints a per-node table, and
// EXITS NONZERO on any violation. Deterministic (fixed seed).
//
// Run in the FOREGROUND:  npx vite-node scripts/campaign-rtp-sim.mjs
// (vite-node resolves the TypeScript engine/campaign modules directly — same strategy the smoke
//  path uses; the scripts/*.mjs image tools stay pure-Node because they touch no TS.)

import { applyExchange, createMatch, mulberry32, randomMove, startNextRound } from '../src/engine/fightEngine.ts';
import { CAMPAIGN_NODES, TIERS, evaluateObjective } from '../src/engine/fightCampaign.ts';

// 2,000,000/node (10x the spec's >=200k floor): shrinks the standard error so the exactly-96.00%
// tiers (takeRound/winMatch/win20) sit comfortably under the 96.1% ceiling. The stream is a pure
// integer PRNG on the frozen engine, so a fixed seed makes the whole battery bit-reproducible.
const MATCHES_PER_NODE = 2_000_000;
const RTP_MIN = 0.95;
const RTP_MAX = 0.961;
const BASE_SEED = 0xc0ffee;

// Play ONE campaign match: both sides uniform-random, early exit the instant the objective leaves
// 'open'. Returns true iff the objective was met.
function playMatch(tier, playerRng, enemyRng) {
  let state = createMatch();
  let flawlessP1 = 0;
  // Hard cap on exchanges as a paranoia guard against a pathological non-terminating loop (random
  // picks make rounds terminate almost surely; this never trips in practice).
  for (let guard = 0; guard < 10_000; guard += 1) {
    state = applyExchange(state, randomMove(playerRng), randomMove(enemyRng));
    if (!state.roundOver) continue;
    if (state.roundOver === 'p1' && state.flawless) flawlessP1 += 1;
    const result = evaluateObjective(
      tier,
      state.p1.roundsWon,
      state.p2.roundsWon,
      flawlessP1,
      Boolean(state.matchOver),
    );
    if (result !== 'open') return result === 'met';
    state = startNextRound(state);
  }
  throw new Error('match failed to terminate (guard tripped)');
}

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}
function padL(s, n) {
  s = String(s);
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

console.log(`Campaign RTP battery — ${MATCHES_PER_NODE.toLocaleString()} matches/node, seed 0x${BASE_SEED.toString(16)}`);
console.log('randomMove vs randomMove on the frozen engine + real evaluateObjective (early exit)\n');
console.log(
  pad('NODE', 4) + pad('NAME', 18) + pad('TIER', 17) + padL('P(met)', 9) + padL('EXP P', 9) + padL('MULT', 8) + padL('RTP', 9) + '  OK',
);
console.log('-'.repeat(77));

let violations = 0;
for (const node of CAMPAIGN_NODES) {
  const tierDef = TIERS[node.tier];
  // Deterministic, per-node independent streams for the player and the enemy.
  const playerRng = mulberry32((BASE_SEED ^ (node.id * 2654435761)) >>> 0);
  const enemyRng = mulberry32((BASE_SEED ^ (node.id * 40503) ^ 0x5bd1e995) >>> 0);

  let met = 0;
  for (let i = 0; i < MATCHES_PER_NODE; i += 1) {
    if (playMatch(node.tier, playerRng, enemyRng)) met += 1;
  }
  const pMet = met / MATCHES_PER_NODE;
  const expP = tierDef.pNum / tierDef.pDen;
  const mult = Number(tierDef.multBps) / 10000;
  const rtp = pMet * mult;
  const ok = rtp >= RTP_MIN && rtp <= RTP_MAX;
  if (!ok) violations += 1;

  console.log(
    pad(node.id, 4) +
      pad(node.name, 18) +
      pad(node.tier, 17) +
      padL((pMet * 100).toFixed(3) + '%', 9) +
      padL((expP * 100).toFixed(3) + '%', 9) +
      padL(mult.toFixed(2) + 'x', 8) +
      padL((rtp * 100).toFixed(3) + '%', 9) +
      '  ' +
      (ok ? 'ok' : 'FAIL'),
  );
}

console.log('-'.repeat(77));
if (violations > 0) {
  console.error(`\nFAILED: ${violations} node(s) outside [${(RTP_MIN * 100).toFixed(1)}%, ${(RTP_MAX * 100).toFixed(1)}%].`);
  process.exit(1);
}
console.log(`\nPASS: all ${CAMPAIGN_NODES.length} nodes within [${(RTP_MIN * 100).toFixed(1)}%, ${(RTP_MAX * 100).toFixed(1)}%].`);
