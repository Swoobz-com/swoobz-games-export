// Scans the ACTUAL rendered full-page desktop screenshot (post grid 14x14 +
// dark-obsidian repalette) for horizontal/vertical-scanline banding on the
// DOM-composited layers (tonal vignette, temple sky-glow, CARD_BG) — same
// plateau/delta heuristic as premium-elevation-vignette-banding-0705.mjs.
import { PNG } from 'pngjs'
import fs from 'node:fs'

const file = process.argv[2] || 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-obsidian-0705/desktop-1440x900-01-lobby-fullpage.png'
const png = PNG.sync.read(fs.readFileSync(file))
const { width: w, height: h, data } = png

const px = (x, y) => {
  const idx = (w * y + x) << 2
  return [data[idx], data[idx + 1], data[idx + 2]]
}

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
  let bandEvents = 0
  for (let i = 0; i < plateaus.length - 1; i++) {
    if (plateaus[i].runLen >= 20 && deltas[i] >= 4) bandEvents++
  }
  return { numPlateaus: plateaus.length, sampleCount: vals.length, maxRun, maxDelta, avgDelta, bandEvents }
}

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

const out = { file, width: w, height: h }
out.corners = {
  topLeft: px(2, 2),
  topRight: px(w - 3, 2),
  bottomLeft: px(2, h - 3),
  bottomRight: px(w - 3, h - 3),
  center: px(Math.floor(w / 2), Math.floor(h / 2)),
}
// Left margin strip (outside the card) at several heights — tonal vignette +
// temple sky-glow + CARD_BG wash live here with no canvas/tiles to confound.
out.leftMargin = {}
for (const y of [50, 150, 250, 350, 450, 550, 650, 750]) {
  if (y < h) out.leftMargin['y' + y] = scanRow(y, 2, Math.min(300, w))
}
// Right margin strip.
out.rightMargin = {}
for (const y of [50, 150, 250, 350, 450, 550, 650, 750]) {
  if (y < h) out.rightMargin['y' + y] = scanRow(y, Math.max(0, w - 300), w - 1)
}
// Full-width scan across the very top (temple skyline / torch sconce zone).
out.topBand = {}
for (const y of [5, 20, 40, 60, 90]) {
  if (y < h) out.topBand['y' + y] = scanRow(y, 0, w)
}
// Full-width scan across the very bottom (floor darken / corner vignette).
out.bottomBand = {}
for (const y of [h - 6, h - 30, h - 60]) {
  if (y >= 0) out.bottomBand['y' + y] = scanRow(y, 0, w)
}
// Vertical column scans down both margins.
out.leftMarginCol = {}
for (const x of [20, 60, 120, 200]) {
  if (x < w) out.leftMarginCol['x' + x] = scanCol(x, 5, Math.min(895, h))
}
out.rightMarginCol = {}
for (const x of [w - 20, w - 60, w - 120, w - 200]) {
  if (x > 0) out.rightMarginCol['x' + x] = scanCol(x, 5, Math.min(895, h))
}

console.log(JSON.stringify(out, null, 2))
