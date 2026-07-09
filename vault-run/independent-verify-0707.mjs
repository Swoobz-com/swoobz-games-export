// Independent re-derivation of vault Glass Box receipts — NOT calling the
// app's own vaultProvider.ts functions, re-implemented from scratch reading
// only the receipt fields + the documented algorithm in vaultProvider.ts
// comments (deriveMineBitmap: SHA-256(serverSeed || "VAULTILE" || u64LE(step))
// Fisher-Yates, first 8 bytes of hash as LE u64 for the swap offset).
import fs from 'fs'

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16)
  return out
}
function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}
async function sha256(parts) {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const buf = new Uint8Array(total)
  let off = 0
  for (const p of parts) { buf.set(p, off); off += p.length }
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return new Uint8Array(digest)
}
function u64Le(value) {
  const out = new Uint8Array(8)
  let v = value
  for (let i = 0; i < 8; i++) { out[i] = Number(v & 0xffn); v >>= 8n }
  return out
}
async function deriveMineBitmap(serverSeed, totalTiles, mineCount) {
  const mixerTag = new TextEncoder().encode('VAULTILE')
  const positions = Array.from({ length: totalTiles }, (_, i) => i)
  for (let step = 0; step < totalTiles; step++) {
    const hash = await sha256([serverSeed, mixerTag, u64Le(BigInt(step))])
    let raw = 0n
    for (let i = 0; i < 8; i++) raw |= BigInt(hash[i]) << BigInt(8 * i)
    const remaining = BigInt(totalTiles - step)
    const swapOffset = Number(raw % remaining)
    const swapIndex = step + swapOffset
    const tmp = positions[step]; positions[step] = positions[swapIndex]; positions[swapIndex] = tmp
  }
  const bitmap = new Array(totalTiles).fill(false)
  for (let i = 0; i < mineCount; i++) bitmap[positions[i]] = true
  return bitmap
}

const rows = JSON.parse(fs.readFileSync('shots-fairnessqa-0707/receipt-summary.json', 'utf8'))
let allPass = true
for (const r of rows) {
  const seedBytes = hexToBytes(r.seed)
  const recomputedHash = bytesToHex(await sha256([seedBytes]))
  const hashMatch = recomputedHash === r.seedHash
  const [gs] = r.grid.split('×').map(Number)
  const total = gs * gs
  const mineCount = Number(r.rugs)
  const bitmap = await deriveMineBitmap(seedBytes, total, mineCount)
  const actualMineCount = bitmap.filter(Boolean).length
  const revealedIdx = r.trace === '' ? [] : r.trace.split(' → ').map(Number)
  const revealedAreSafe = revealedIdx.every((i) => bitmap[i] === false)
  let rugStruckIsMine = true
  if (r.rugStruck) {
    const idx1 = Number(r.rugStruck.replace('tile ', ''))
    const idx0 = idx1 - 1
    rugStruckIsMine = bitmap[idx0] === true
  }
  const pass = hashMatch && actualMineCount === mineCount && revealedAreSafe && rugStruckIsMine
  allPass = allPass && pass
  console.log(
    `${r.viewport}/${r.outcome}: hashMatch=${hashMatch} mineCountMatch=${actualMineCount === mineCount} revealedAreSafe=${revealedAreSafe} rugStruckIsMine=${rugStruckIsMine} => ${pass ? 'PASS' : 'FAIL'}`,
  )
}
console.log('\nOVERALL:', allPass ? 'ALL 8 ROUNDS PASS — deterministic, self-consistent, independently reproducible' : 'SOME ROUNDS FAILED')
