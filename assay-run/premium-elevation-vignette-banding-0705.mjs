// Scans the ACTUAL rendered full-page desktop screenshot (DOM-composited,
// includes the CSS tonal-vignette + retuned page-level radial wash — layers
// that only the browser's own compositor draws, not something a JS canvas
// probe can sample directly) for horizontal-scanline banding, the same
// plateau/delta heuristic used for the canvas gradients.
import { PNG } from 'pngjs'
import fs from 'node:fs'

const file = process.argv[2] || 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-premium-elevation-0705/desktop-1440x900-01-lobby-fullpage.png'
const png = PNG.sync.read(fs.readFileSync(file))
const { width: w, height: h, data } = png

const px = (x, y) => {
  const idx = (w * y + x) << 2
  return [data[idx], data[idx + 1], data[idx + 2]]
}

// Sample scanlines across the LEFT margin strip (outside the shell card,
// where the tonal vignette + temple + page wash are the ONLY content — no
// canvas/tiles to confound the read) and a vertical ray through the corner
// vignette hotspot toward the bottom-right.
function scanRow(y, x0, x1) {
  const vals = []
  for (let x = x0; x < x1; x++) vals.push(px(x, y))
  const plateaus = []
  let last = null, runLen = 0
  for (const v of vals) {
    if (last && v[0] === last[0] && v[1] === last[1] && v[2] === last[2]) runLen++
    else {
      if (last) plateaus.push({ v: last, runLen })
      last = v
      runLen = 1
    }
  }
  if (last) plateaus.push({ v: last, runLen })
  const deltas = []
  for (let i = 1; i < plateaus.length; i++) {
    const a = plateaus[i - 1].v, b = plateaus[i].v
    deltas.push(Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])))
  }
  const maxRun = plateaus.length ? Math.max(...plateaus.map((p) => p.runLen)) : 0
  const maxDelta = deltas.length ? Math.max(...deltas) : 0
  const avgDelta = deltas.length ? +(deltas.reduce((a, b) => a + b, 0) / deltas.length).toFixed(3) : 0
  // Visible-banding signature on a DOM/CSS gradient: a long flat run (>=20px,
  // since these are wider spans than the canvas board) followed by a jump
  // of >=4 (multiple 8-bit levels at once).
  let bandEvents = 0
  for (let i = 0; i < plateaus.length - 1; i++) {
    if (plateaus[i].runLen >= 20 && deltas[i] >= 4) bandEvents++
  }
  return { numPlateaus: plateaus.length, sampleCount: vals.length, maxRun, maxDelta, avgDelta, bandEvents }
}

const out = { file, width: w, height: h }
// Left margin strip (outside the card, x in [10, 130]) at several heights.
out.leftMargin = {}
for (const y of [100, 200, 300, 400, 500, 600, 700]) {
  if (y < h) out.leftMargin['y' + y] = scanRow(y, 10, Math.min(130, w))
}
// Full-width scan across the very top (temple skyline / torch sconce zone).
out.topBand = {}
for (const y of [20, 60, 100]) {
  if (y < h) out.topBand['y' + y] = scanRow(y, 0, w)
}
// Vertical column scan down the left margin (catches vertical banding too).
function scanCol(x, y0, y1) {
  const vals = []
  for (let y = y0; y < y1; y++) vals.push(px(x, y))
  const plateaus = []
  let last = null, runLen = 0
  for (const v of vals) {
    if (last && v[0] === last[0] && v[1] === last[1] && v[2] === last[2]) runLen++
    else {
      if (last) plateaus.push({ v: last, runLen })
      last = v
      runLen = 1
    }
  }
  if (last) plateaus.push({ v: last, runLen })
  const deltas = []
  for (let i = 1; i < plateaus.length; i++) {
    const a = plateaus[i - 1].v, b = plateaus[i].v
    deltas.push(Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])))
  }
  const maxRun = plateaus.length ? Math.max(...plateaus.map((p) => p.runLen)) : 0
  const maxDelta = deltas.length ? Math.max(...deltas) : 0
  let bandEvents = 0
  for (let i = 0; i < plateaus.length - 1; i++) {
    if (plateaus[i].runLen >= 20 && deltas[i] >= 4) bandEvents++
  }
  return { numPlateaus: plateaus.length, sampleCount: vals.length, maxRun, maxDelta, bandEvents }
}
out.leftMarginCol = {}
for (const x of [40, 80, 120]) {
  if (x < w) out.leftMarginCol['x' + x] = scanCol(x, 10, Math.min(850, h))
}

console.log(JSON.stringify(out, null, 2))
