// Independent re-implementation of assayProvider.ts's deriveBombBitmap +
// serverSeedHash, written from scratch (NOT imported from the game's own
// code) to prove the provably-fair claim end to end:
//   1. sha256(serverSeed) == displayed serverSeedHashHex
//   2. Fisher-Yates(serverSeed, "ASSAYVEIN:<tier>") bomb positions ==
//      the positions the live app actually revealed on settle.
import { createHash } from 'node:crypto'

function sha256Hex(buf) {
  return createHash('sha256').update(buf).digest('hex')
}

function u64Le(v) {
  const out = Buffer.alloc(8)
  let x = BigInt(v)
  for (let i = 0; i < 8; i++) {
    out[i] = Number(x & 0xffn)
    x >>= 8n
  }
  return out
}

// Mirrors assayProvider.ts's deriveBombBitmap exactly (same tag format,
// same per-step SHA-256(seed || tag || u64le(step)) draw, same Fisher-Yates
// swap-with-remaining-range logic), independently re-typed here.
function deriveBombBitmap(serverSeedHex, totalTiles, bombCount, tierId) {
  const serverSeed = Buffer.from(serverSeedHex, 'hex')
  const tag = Buffer.from(`ASSAYVEIN:${tierId}`, 'utf8')
  const positions = Array.from({ length: totalTiles }, (_, i) => i)
  for (let step = 0; step < totalTiles; step++) {
    const h = createHash('sha256').update(Buffer.concat([serverSeed, tag, u64Le(step)])).digest()
    let raw = 0n
    for (let i = 0; i < 8; i++) raw |= BigInt(h[i]) << BigInt(8 * i)
    const remaining = BigInt(totalTiles - step)
    const swap = step + Number(raw % remaining)
    const tmp = positions[step]
    positions[step] = positions[swap]
    positions[swap] = tmp
  }
  const bitmap = new Array(totalTiles).fill(false)
  for (let i = 0; i < bombCount; i++) bitmap[positions[i]] = true
  return bitmap
}

const rounds = [
  {
    label: 'STANDARD round (live capture, BUST)',
    seed: 'd995fc817f338579068c1b54497714bd23283c090d2b8347f5ef6a2d7199d9d5',
    hash: '02a5e7534024887dde849f3cf46ac3095cc6b9d70f6918d17f4cdc8210c3d388',
    bombCount: 4,
    tier: 'standard',
    expectedBombsFromLiveScan: [3, 5, 71, 81],
    bustedTile: 3,
  },
  {
    label: 'FLOODED round (live capture, WIN)',
    seed: 'f29cca575a1256863a8ef8286650e59672c82b6800cae4b028a7d3c9f2bec5d1',
    hash: 'a12f67fd6a3899418409d70b076ec40b7498ccfc5075def15e98edf53135ec30',
    bombCount: 8,
    tier: 'flooded',
    expectedBombsFromLiveScan: [11, 12, 47, 60, 79, 83, 86, 89],
    bustedTile: null,
    committedTrail: [0, 1, 2, 3, 4, 5, 6, 7],
  },
]

let allPass = true
for (const r of rounds) {
  console.log('═'.repeat(70))
  console.log(r.label)
  const recomputedHash = sha256Hex(Buffer.from(r.seed, 'hex'))
  const hashOk = recomputedHash === r.hash
  console.log(`  sha256(serverSeed) recomputed: ${recomputedHash}`)
  console.log(`  displayed serverSeedHashHex:   ${r.hash}`)
  console.log(`  HASH MATCH: ${hashOk ? 'PASS' : 'FAIL'}`)
  if (!hashOk) allPass = false

  const bitmap = deriveBombBitmap(r.seed, 100, r.bombCount, r.tier)
  const bombIdx = bitmap.map((b, i) => (b ? i : null)).filter((x) => x !== null)
  console.log(`  independently re-derived bomb tiles (tier=${r.tier}): [${bombIdx.join(', ')}]`)
  console.log(`  live-app pixel-scan bomb tiles:                       [${r.expectedBombsFromLiveScan.join(', ')}]`)
  const setEq =
    bombIdx.length === r.expectedBombsFromLiveScan.length &&
    bombIdx.every((v, i) => v === r.expectedBombsFromLiveScan[i])
  console.log(`  BOMB-SET MATCH: ${setEq ? 'PASS' : 'FAIL'}`)
  if (!setEq) allPass = false
  if (r.bustedTile !== null) {
    console.log(`  busted tile ${r.bustedTile} in re-derived bomb set: ${bombIdx.includes(r.bustedTile) ? 'YES (consistent)' : 'NO (INCONSISTENT)'}`)
  }
  if (r.committedTrail) {
    const overlap = r.committedTrail.filter((t) => bombIdx.includes(t))
    console.log(`  WIN sanity: committed trail ∩ bomb set = [${overlap.join(', ')}] (must be empty on a WIN)`)
    if (overlap.length > 0) allPass = false
  }
}
console.log('═'.repeat(70))
console.log(allPass ? 'ALL ROUNDS: RE-DERIVATION MATCHES — PASS' : 'MISMATCH DETECTED — FAIL')
process.exit(allPass ? 0 : 1)
