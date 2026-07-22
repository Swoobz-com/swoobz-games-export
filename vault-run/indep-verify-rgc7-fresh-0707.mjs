// Independent, from-scratch re-implementation of vault's provably-fair
// derivation -- deliberately NOT importing vaultProvider.ts's own functions.
// Verifies, for each REAL live-driven round captured in
// shots-fairnessqa-0707/results.json:
//   (1) commitment: SHA-256(serverSeed) === serverSeedHashHex
//   (2) mine bitmap: Fisher-Yates over SHA-256(serverSeed || 'VAULTILE' || u64le(step))
//       re-derives a bitmap consistent with the FACTS the receipt discloses:
//         - every revealed (safe) tile is NOT a mine
//         - (loss rounds) the struck tile IS a mine
//         - total derived mine count === outcome.mineCount
//   (3) determinism: running the derivation twice on the same seed gives a
//       bit-identical bitmap.
import { createHash } from 'node:crypto';
import fs from 'node:fs';

function sha256(buf) {
  return createHash('sha256').update(buf).digest();
}

function hexToBytes(hex) {
  const out = Buffer.alloc(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(2 * i, 2 * i + 2), 16);
  return out;
}

function u64le(n) {
  const out = Buffer.alloc(8);
  let v = BigInt(n);
  for (let i = 0; i < 8; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

function deriveMineBitmap(serverSeedHex, totalTiles, mineCount) {
  const serverSeed = hexToBytes(serverSeedHex);
  const mixerTag = Buffer.from('VAULTILE', 'utf8');
  const positions = Array.from({ length: totalTiles }, (_, i) => i);
  for (let step = 0; step < totalTiles; step++) {
    const concat = Buffer.concat([serverSeed, mixerTag, u64le(step)]);
    const hash = sha256(concat);
    let raw = 0n;
    for (let i = 0; i < 8; i++) raw |= BigInt(hash[i]) << BigInt(8 * i);
    const remaining = BigInt(totalTiles - step);
    const swapOffset = Number(raw % remaining);
    const swapIndex = step + swapOffset;
    const tmp = positions[step];
    positions[step] = positions[swapIndex];
    positions[swapIndex] = tmp;
  }
  const bitmap = new Array(totalTiles).fill(false);
  for (let i = 0; i < mineCount; i++) bitmap[positions[i]] = true;
  return bitmap;
}

const results = JSON.parse(fs.readFileSync('shots-fairnessqa-0707/results.json', 'utf8'));

let allPass = true;
for (const r of results) {
  const rows = r.receipt.rows;
  const seedHex = rows['server seed'];
  const claimedHash = rows['server seed hash'];
  const gridSize = Number(rows.grid.split('×')[0]);
  const totalTiles = gridSize * gridSize;
  const mineCount = Number(rows.rugs);
  const ruggedTileMatch = rows['rug struck'] ? Number(rows['rug struck'].match(/\d+/)[0]) - 1 : null;

  // (1) commitment check
  const recomputedHash = sha256(hexToBytes(seedHex)).toString('hex');
  const commitmentOk = recomputedHash === claimedHash;

  // (2) mine bitmap derivation, run TWICE to also prove determinism (3)
  const bitmapA = deriveMineBitmap(seedHex, totalTiles, mineCount);
  const bitmapB = deriveMineBitmap(seedHex, totalTiles, mineCount);
  const deterministic = JSON.stringify(bitmapA) === JSON.stringify(bitmapB);
  const derivedMineCount = bitmapA.filter(Boolean).length;

  const revealTraceRaw = rows['reveal trace'] ? rows['reveal trace'].split('→').map((s) => Number(s.trim())) : [];
  const revealedAllSafe = revealTraceRaw.every((idx) => bitmapA[idx] === false);
  const struckIsMine = ruggedTileMatch === null ? null : bitmapA[ruggedTileMatch] === true;
  const mineCountMatches = derivedMineCount === mineCount;

  const pass =
    commitmentOk && deterministic && revealedAllSafe && mineCountMatches && (struckIsMine === null || struckIsMine === true);
  allPass = allPass && pass;

  console.log('====', r.tag, '====');
  console.log('  seed            :', seedHex);
  console.log('  claimed hash    :', claimedHash);
  console.log('  recomputed hash :', recomputedHash);
  console.log('  commitment OK   :', commitmentOk);
  console.log('  grid/mines      :', gridSize + 'x' + gridSize, mineCount);
  console.log('  derived mineCount:', derivedMineCount, 'matches:', mineCountMatches);
  console.log('  revealTraceRaw  :', revealTraceRaw, 'all-safe:', revealedAllSafe);
  console.log('  ruggedTile(0idx):', ruggedTileMatch, 'is-mine:', struckIsMine);
  console.log('  determinism OK  :', deterministic);
  console.log('  ROUND VERDICT   :', pass ? 'PASS' : 'FAIL');
}

console.log('\n=== OVERALL:', allPass ? 'ALL PASS' : 'SOME FAILED', '===');
