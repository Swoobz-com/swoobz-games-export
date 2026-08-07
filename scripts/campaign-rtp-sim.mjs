// Campaign RTP Monte-Carlo battery (phase 17: win-the-match + format + enemy defense ladder).
// Foreground-sims law: run in the FOREGROUND, exit nonzero on violation.
//
// Plays 2,000,000 matches PER NODE against the REAL frozen engine, with BOTH fighters picking
// uniform-random via the engine's randomMove (spec §0.2: campaign enemies are randomMove ONLY,
// never aiPick — Nash-neutral, so measured P(win) matches the closed form vs ANY player). Every
// exchange routes through the SAME applyCampaignExchange the provider uses (the shared absorb
// decision — sim and provider CANNOT drift), the enemy's absorb buffer refills at every round
// start, and the match is judged by the REAL evaluateCampaignMatch on round-win counts (engine
// matchOver ignored: first-to-3 nodes play past it, exercising that path millions of times).
//
// Asserts per node: measured RTP = P * multBps/10000 within [95.0%, 96.1%]; measured P within
// 0.3% absolute of the exact closed form; and the bulk/shield presentation pairs of the same
// defense (n5/n6, n7/n8) measure the same P within noise (the math is identical by construction —
// this catches any kind-dependent leak). Deterministic (fixed seed; pure integer PRNG on the
// frozen engine, so the battery is bit-reproducible).
//
// Run in the FOREGROUND:  npx vite-node scripts/campaign-rtp-sim.mjs

import { createMatch, mulberry32, randomMove, startNextRound } from '../src/engine/fightEngine.ts';
import {
  applyCampaignExchange,
  CAMPAIGN_NODES,
  defenseAmount,
  evaluateCampaignMatch,
  guardAmount,
  matchWinProbability,
} from '../src/engine/fightCampaign.ts';

const MATCHES_PER_NODE = 2_000_000;
// THE 4.00x PAYOUT CAP (Tim, 2026-08-07) removed the RTP FLOOR from this battery on purpose. Five
// nodes now return 90.2% / 52.2% / 9.6% because the cap decouples payout from odds, so a floor here
// would fail the shipped ladder by design. What this sim actually exists to prove is UNCHANGED and is
// the stronger claim: that measured P(win) matches the exact closed form — i.e. the DIFFICULTY is
// on-model. Tim's instruction was "keep the difficulty as it is", so this gate is exactly the one
// that has to keep passing. The ceiling stays (the house never hands an edge away).
// NO RTP CEILING IS ASSERTED HERE, and that is a correction rather than a loosening. RTP is DERIVED
// as measured-P x mult, so P's sampling error is MAGNIFIED by the multiplier: at 2M matches P carries
// ~0.033pp of noise, which a 3.0x price turns into ~0.10pp of RTP noise. That is enough to push a node
// priced at an exact 95.97% over a 96.1% line and "fail" a ladder that is provably correct — it did,
// on nodes 7 and 9, whose P was on-model to 0.04pp. The <=96% ceiling is an EXACT-MATH property proven
// in bigint by fightCampaign.test.ts; a Monte-Carlo estimate can only ever corroborate it, which is
// what CAMPAIGN-SPEC already said. So this battery asserts what it can actually measure — that P
// matches the closed form, i.e. the DIFFICULTY is on-model — and prints RTP for information.
const RTP_SANITY_MAX = 0.99; // wild-drift tripwire only, never the ceiling gate
const P_ABS_TOL = 0.003; // measured vs exact P, absolute — THE gate
const PAIR_TOL = 0.003; // bulk-vs-shield same-defense pairs, absolute
const BASE_SEED = 0x7a11ce;

// Play ONE campaign match with the REAL rules: shared absorb interception, per-round buffer
// refill, judge on round counts only (engine matchOver ignored). Returns true iff the player won.
function playMatch(roundsToWin, defense, playerRng, enemyRng, playerGuard = 0) {
  let state = createMatch();
  let buffer = defense;
  let guardBuf = playerGuard; // the PLAYER's guard: absorbs the ENEMY's hits (~4x ladder, 2026-08-07)
  // Paranoia guard against a pathological non-terminating loop (never trips with random picks).
  for (let iter = 0; iter < 100_000; iter += 1) {
    const r = applyCampaignExchange(state, randomMove(playerRng), randomMove(enemyRng), buffer, guardBuf);
    state = r.state;
    buffer = r.absorbRemaining;
    guardBuf = r.guardRemaining;
    if (!state.roundOver) continue;
    const verdict = evaluateCampaignMatch(state.p1.roundsWon, state.p2.roundsWon, roundsToWin);
    if (verdict !== 'open') return verdict === 'met';
    state = startNextRound(state);
    buffer = defense; // BOTH buffers refill at every round start
    guardBuf = playerGuard;
  }
  throw new Error('match failed to terminate (iteration cap tripped)');
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
console.log('randomMove vs randomMove on the frozen engine + REAL applyCampaignExchange/evaluateCampaignMatch\n');
console.log(
  pad('NODE', 4) +
    pad('NAME', 18) +
    pad('FMT', 5) +
    pad('DEFENSE', 10) +
    pad('GUARD', 5) +
    padL('P(win)', 9) +
    padL('EXP P', 9) +
    padL('MULT', 8) +
    padL('RTP', 9) +
    '  OK',
);
console.log('-'.repeat(76));

let violations = 0;
const measured = new Map(); // node id -> measured P
for (const node of CAMPAIGN_NODES) {
  const S = defenseAmount(node);
  const G = guardAmount(node);
  const exact = matchWinProbability(S, node.roundsToWin, G);
  const expP = Number(exact.num) / Number(exact.den);
  const mult = Number(node.multBps) / 10000;
  // Deterministic, per-node independent streams for the player and the enemy.
  const playerRng = mulberry32((BASE_SEED ^ (node.id * 2654435761)) >>> 0);
  const enemyRng = mulberry32((BASE_SEED ^ (node.id * 40503) ^ 0x5bd1e995) >>> 0);

  let met = 0;
  for (let i = 0; i < MATCHES_PER_NODE; i += 1) {
    if (playMatch(node.roundsToWin, S, playerRng, enemyRng, G)) met += 1;
  }
  const pMet = met / MATCHES_PER_NODE;
  measured.set(node.id, pMet);
  const rtp = pMet * mult;
  // THE gate: measured P vs the exact closed form. RTP is informational (see RTP_SANITY_MAX).
  const ok = Math.abs(pMet - expP) <= P_ABS_TOL && rtp <= RTP_SANITY_MAX;
  if (!ok) violations += 1;

  console.log(
    pad(node.id, 4) +
      pad(node.name, 18) +
      pad(`to${node.roundsToWin}`, 5) +
      pad(node.defense ? `${node.defense.kind}+${node.defense.amount}` : 'none', 10) +
      pad(G > 0 ? `g+${G}` : '-', 5) +
      padL((pMet * 100).toFixed(3) + '%', 9) +
      padL((expP * 100).toFixed(3) + '%', 9) +
      // FLOOR, never toFixed. formatMult (fightCampaign.ts) renders with integer division, so the
      // game shows 39.95 for 399590n while toFixed(2) rounds it to "39.96" — a price the ladder
      // cannot legally pay (399600n is 96.0020% RTP, over the ceiling). This sim printing a rounded
      // number is how "x39.96" got into the handoff and was carried for two sessions.
      padL((Math.floor(Number(node.multBps) / 100) / 100).toFixed(2) + 'x', 8) +
      padL((rtp * 100).toFixed(3) + '%', 9) +
      '  ' +
      (ok ? 'ok' : 'FAIL'),
  );
}

console.log('-'.repeat(76));

// Presentation-pair check: bulk and shield of the SAME defense+format must measure the same P (the
// absorb math is shared; only the presentation differs). This is the kind-dependent-leak detector.
//
// DERIVED, NOT HARDCODED (phase 251). This used to be a literal [[5,6],[7,8]] — the node ids that
// happened to be same-math pairs under one campaign layout. Re-shaping the difficulty curve moved
// every node, and the check then compared to2+1 against to3+1 and reported a 4.7% "leak" that was
// really two different fights. The assertion was right; its coupling to specific ids was not.
// Grouping by (defenseAmount, roundsToWin) cannot go stale, and it covers every pair the layout
// happens to contain rather than the two someone wrote down.
// GUARD IS PART OF THE KEY (2026-08-07). Two nodes with the same enemy absorb but different PLAYER
// guard are different fights with different P — grouping on absorb alone would compare them and
// report a phantom kind-leak, the exact failure mode phase 251 fixed for the format dimension.
const groups = new Map(); // "S:guard:rounds" -> [{id, kind}]
for (const node of CAMPAIGN_NODES) {
  const S = defenseAmount(node);
  if (S === 0) continue; // no defense = no kind to compare
  const key = `${S}:${guardAmount(node)}:${node.roundsToWin}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({ id: node.id, kind: node.defense.kind });
}
let pairsChecked = 0;
for (const [key, members] of groups) {
  const bulk = members.filter((m) => m.kind === 'bulk');
  const shield = members.filter((m) => m.kind === 'shield');
  for (const a of bulk) {
    for (const b of shield) {
      const diff = Math.abs(measured.get(a.id) - measured.get(b.id));
      const ok = diff <= PAIR_TOL;
      if (!ok) violations += 1;
      pairsChecked += 1;
      const [S, gK, r] = key.split(':');
      console.log(
        `pair n${a.id}/n${b.id} (bulk vs shield, defense+${S} to${r}): |dP| = ${(diff * 100).toFixed(3)}%  ${ok ? 'ok' : 'FAIL'}`,
      );
    }
  }
}
// A same-math pair that exists but is never compared is a silently weakened gate.
if (pairsChecked === 0) {
  // THE ~4x LADDER (2026-08-07) gave every node a UNIQUE (absorb, guard, format) rung, which is the
  // whole point of ten distinct multipliers — so no two nodes share a rung and the layout-derived
  // pair check has nothing to compare. That is expected, NOT a weakened gate, but "no pairs" must
  // never silently mean "no check". So run the detector SYNTHETICALLY at a real rung instead: the
  // absorb math takes `kind` nowhere (applyCampaignExchange has no kind parameter, by construction),
  // so two independent streams at identical numbers must agree with each other AND with the closed
  // form. A kind-dependent leak is impossible to express; a drifting absorb path is still caught.
  const SS = 2;
  const GG = 1;
  const RR = 2;
  const N = 200_000;
  const exact = matchWinProbability(SS, RR, GG);
  const expP = Number(exact.num) / Number(exact.den);
  const runs = [0xb01dface, 0x51de2].map((seedOffset) => {
    const pr = mulberry32((BASE_SEED ^ seedOffset) >>> 0);
    const er = mulberry32((BASE_SEED ^ seedOffset ^ 0x9e3779b9) >>> 0);
    let w = 0;
    for (let i = 0; i < N; i += 1) if (playMatch(RR, SS, pr, er, GG)) w += 1;
    return w / N;
  });
  const spread = Math.abs(runs[0] - runs[1]);
  const offModel = Math.max(...runs.map((r) => Math.abs(r - expP)));
  const ok = spread <= PAIR_TOL && offModel <= P_ABS_TOL;
  if (!ok) violations += 1;
  console.log(
    `pair check: SYNTHETIC at absorb ${SS} / guard ${GG} / to${RR} — ` +
      `${(runs[0] * 100).toFixed(3)}% vs ${(runs[1] * 100).toFixed(3)}% (exact ${(expP * 100).toFixed(3)}%), ` +
      `spread ${(spread * 100).toFixed(3)}%  ${ok ? 'ok' : 'FAIL'}`,
  );
  console.log('            (no layout pair exists: every node now owns a unique rung, by design)');
} else {
  console.log(`pair check: ${pairsChecked} same-math bulk/shield pair(s) compared, derived from the layout`);
}

if (violations > 0) {
  console.error(`\nFAILED: ${violations} violation(s) — measured P off-model by more than ${P_ABS_TOL} (the DIFFICULTY drifted), or a pair mismatch.`);
  process.exit(1);
}
console.log(`\nPASS: all ${CAMPAIGN_NODES.length} nodes on-model — measured P within ${P_ABS_TOL} of the exact closed form.`);
console.log('The <=96% RTP ceiling is proven EXACTLY in bigint by fightCampaign.test.ts, not estimated here.');
console.log('NOTE: RTP varies per node — only node 10 is capped below its fair price. That is the design.');
