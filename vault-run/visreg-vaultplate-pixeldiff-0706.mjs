// visreg-vaultplate-pixeldiff-0706.mjs — pixel-diff the pre-VAULT-PLATE
// baseline (shots-cohesion-0706/) against the post-change capture
// (shots-visreg-vaultplate-0706/), bucketing diff pixels into named
// screen-region bands so we can classify each diff as
// "control-column chrome" (intended) vs "layout/board/HUD" (would be a
// regression). Bands are hardcoded from the known 1440x900 desktop layout
// (board/canvas ~73..1023 wide, control column ~1046..1366) and the mobile
// 390x844 stacked layout (control column is the bottom action bar band).
import { PNG } from 'pngjs'
import fs from 'fs'

const BEFORE_DIR = 'shots-cohesion-0706'
const AFTER_DIR = 'shots-visreg-vaultplate-0706'
const files = [
  'bluechips-lobby-desktop.png', 'bluechips-playing-desktop.png', 'bluechips-settled-desktop.png',
  'altseason-lobby-desktop.png', 'altseason-playing-desktop.png', 'altseason-settled-desktop.png',
  'shitcoin-lobby-desktop.png', 'shitcoin-playing-desktop.png', 'shitcoin-settled-desktop.png',
  'altseason-lobby-mobile.png', 'altseason-playing-mobile.png', 'altseason-settled-mobile.png',
]

function loadPNG(path) {
  return PNG.sync.read(fs.readFileSync(path))
}

// desktop 1440x900 region bands (x-ranges), from the known chassis layout
// (mainGrid backdrop 73..1023 board-ish region incl. corner icons, control
// column 1046..1366 per memory's "share edges 1046/1366@1440").
function bandForXDesktop(x) {
  if (x < 73) return 'left-margin'
  if (x >= 73 && x < 1040) return 'board-backdrop'
  if (x >= 1040 && x <= 1370) return 'control-column'
  return 'right-margin'
}
function bandForYDesktop(y) {
  if (y < 40) return 'header'
  return null
}
// mobile 390x844@dpr2 (so PNG pixel dims are 780x1688) — action bar / bet
// console lives at the BOTTOM of the viewport; board+backdrop occupies the
// rest. Bottom ~200*2=400px (scaled) treated as control-column-equivalent.
function bandForMobile(x, y, w, h) {
  if (y > h - 420) return 'control-column(bottom-bar)'
  if (y < 80) return 'header'
  return 'board-backdrop'
}

function diffOne(beforePath, afterPath, isMobile) {
  if (!fs.existsSync(beforePath) || !fs.existsSync(afterPath)) {
    return { skipped: true, reason: !fs.existsSync(beforePath) ? 'no-before' : 'no-after' }
  }
  const a = loadPNG(beforePath)
  const b = loadPNG(afterPath)
  if (a.width !== b.width || a.height !== b.height) {
    return { skipped: true, reason: `dim-mismatch ${a.width}x${a.height} vs ${b.width}x${b.height}` }
  }
  const w = a.width, h = a.height
  const THRESH = 18 // per-channel abs diff tolerance (anti-aliasing slack)
  const bandCounts = {}
  let totalDiff = 0
  let maxDiffRegion = { count: 0, minX: w, maxX: 0, minY: h, maxY: 0 }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (w * y + x) << 2
      const dr = Math.abs(a.data[idx] - b.data[idx])
      const dg = Math.abs(a.data[idx + 1] - b.data[idx + 1])
      const db = Math.abs(a.data[idx + 2] - b.data[idx + 2])
      const d = Math.max(dr, dg, db)
      if (d > THRESH) {
        totalDiff++
        const band = isMobile ? bandForMobile(x, y, w, h) : (bandForYDesktop(y) || bandForXDesktop(x))
        bandCounts[band] = (bandCounts[band] || 0) + 1
        if (x < maxDiffRegion.minX) maxDiffRegion.minX = x
        if (x > maxDiffRegion.maxX) maxDiffRegion.maxX = x
        if (y < maxDiffRegion.minY) maxDiffRegion.minY = y
        if (y > maxDiffRegion.maxY) maxDiffRegion.maxY = y
      }
    }
  }
  const ratio = totalDiff / (w * h)
  return {
    width: w, height: h, totalDiffPixels: totalDiff, ratio: +ratio.toFixed(5),
    bandCounts, boundingBoxOfAllDiffs: totalDiff > 0 ? maxDiffRegion : null,
  }
}

const out = {}
for (const f of files) {
  const isMobile = f.includes('mobile')
  out[f] = diffOne(`${BEFORE_DIR}/${f}`, `${AFTER_DIR}/${f}`, isMobile)
}
fs.writeFileSync('visreg-vaultplate-pixeldiff-results.json', JSON.stringify(out, null, 2))
console.log(JSON.stringify(out, null, 2))
