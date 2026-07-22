// ABYSS LINE (assay) — trail-vs-pointer diagnostic.
// Hooks CanvasRenderingContext2D.fillText/strokeText to record every numeric
// "claim-order" glyph draw (cx,cy) — this is the render-layer's factual
// projection of `state.trail`/`committedTrail` order (assayProvider.ts +
// AssayGridCanvas.tsx L1096: `order = trailIndex.get(idx)+1`, drawn at the
// tile's own (cx,cy) center). We independently compute expected tile idx
// from OUR dispatched pointer coordinates and diff against what actually
// got order-numbered on the board. No source file is modified.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const GRID_DIM = 14
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT_DIR = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad'

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900 })

const consoleErrors = []
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text())
})
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message))

// Instrument BEFORE any app script runs, so React's first render is captured.
await page.evaluateOnNewDocument(() => {
  window.__orderLog = []
  window.__lineLog = [] // moveTo/lineTo for the route_link connector (grid-jump visual proof)
  const origFillText = CanvasRenderingContext2D.prototype.fillText
  CanvasRenderingContext2D.prototype.fillText = function (text, x, y, ...rest) {
    // Restrict to the board's own render surfaces (onscreen canvas + its
    // offscreen static-bake canvas) — both are square and share the same
    // pixel dims (dims.w x dims.w) — to avoid any unrelated same-digit UI
    // text elsewhere on the page confounding the read.
    const c = this.canvas
    if (/^\d+$/.test(String(text)) && c && c.width === c.height && c.width > 200) {
      window.__orderLog.push({ text: String(text), x, y, t: performance.now() })
    }
    return origFillText.call(this, text, x, y, ...rest)
  }
  const origMoveTo = CanvasRenderingContext2D.prototype.moveTo
  const origLineTo = CanvasRenderingContext2D.prototype.lineTo
  CanvasRenderingContext2D.prototype.moveTo = function (x, y) {
    window.__lineLog.push({ op: 'move', x, y })
    return origMoveTo.call(this, x, y)
  }
  CanvasRenderingContext2D.prototype.lineTo = function (x, y) {
    window.__lineLog.push({ op: 'line', x, y })
    return origLineTo.call(this, x, y)
  }
})

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await page.evaluate(() => localStorage.setItem('assay_coachmark_seen_v1', '1'))
await page.reload({ waitUntil: 'networkidle0' })
await wait(300)

// Open planning.
const tapText = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}
const openedPlanning = await tapText('ENTER THE DIVE')
console.log('opened planning:', openedPlanning)
await wait(400)

// Locate the desktop canvas + compute tile size independently of app source.
const geom = await page.evaluate(() => {
  const canvases = [...document.querySelectorAll('canvas')]
  const board = canvases.find((c) => (c.getAttribute('aria-label') || '').includes('Abyss floor board'))
  if (!board) return null
  const r = board.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height }
})
console.log('board geom:', geom)
if (!geom) {
  console.log('FAIL: could not locate board canvas — aborting')
  await browser.close()
  process.exit(1)
}
const tile = geom.width / GRID_DIM
const idxToXY = (idx) => {
  const col = idx % GRID_DIM
  const row = Math.floor(idx / GRID_DIM)
  return { x: geom.left + (col + 0.5) * tile, y: geom.top + (row + 0.5) * tile }
}
// IMPORTANT: ctx.fillText(text, x, y) coordinates are CANVAS-LOCAL (0..dims.w),
// NOT page/viewport coordinates — unlike the mouse click coordinates we
// dispatch (which ARE page-relative, hence idxToXY adds geom.left/top). Do
// NOT offset by geom.left/top here, or every readback maps to the wrong tile
// (this was caught and fixed after an initial false-positive in this same probe).
const xyToIdx = (x, y) => {
  const col = Math.floor(x / tile)
  const row = Math.floor(y / tile)
  if (col < 0 || col >= GRID_DIM || row < 0 || row >= GRID_DIM) return null
  return row * GRID_DIM + col
}

const readOrderSet = async () => {
  const log = await page.evaluate(() => window.__orderLog)
  const set = new Set()
  const detail = []
  for (const e of log) {
    const idx = xyToIdx(e.x, e.y)
    if (idx != null) {
      set.add(idx)
      detail.push({ idx, order: Number(e.text) })
    }
  }
  return { set, detail, raw: log.length }
}
const clearOrderLog = async () => page.evaluate(() => { window.__orderLog = [] })
const clearLineLog = async () => page.evaluate(() => { window.__lineLog = [] })

// ─────────────────────────────────────────────────────────────────────────
// PROBE A — discrete single taps on KNOWN, deliberately NON-ADJACENT tiles.
// ─────────────────────────────────────────────────────────────────────────
console.log('\n=== PROBE A: discrete taps on known non-adjacent tiles ===')
const tapPlanA = [12, 5, 130, 40, 187] // spread across the 14x14=196 grid, non-adjacent
const tappedSoFar = []
const probeAResults = []
for (const idx of tapPlanA) {
  await clearOrderLog()
  const { x, y } = idxToXY(idx)
  await page.mouse.click(x, y)
  await wait(120)
  tappedSoFar.push(idx)
  const { set, detail } = await readOrderSet()
  const expected = new Set(tappedSoFar)
  const extra = [...set].filter((i) => !expected.has(i))
  const missing = [...expected].filter((i) => !set.has(i))
  probeAResults.push({ justTapped: idx, expectedTrail: [...expected].sort((a,b)=>a-b), actualOrderedSet: [...set].sort((a,b)=>a-b), extra, missing, detail })
  console.log(`tap idx=${idx} -> board order-numbered set=${JSON.stringify([...set].sort((a,b)=>a-b))} extra=${JSON.stringify(extra)} missing=${JSON.stringify(missing)}`)
}

// Screenshot after probe A.
await page.screenshot({ path: `${OUT_DIR}/probeA-after-discrete-taps.png` })

// Clear the trail before probe B (tap each currently-selected tile to untoggle, or use clearTrail button).
const clearHandle = await page.evaluateHandle(() => {
  const btns = [...document.querySelectorAll('button')]
  return btns.find((b) => (b.getAttribute('aria-label') || '').toLowerCase().includes('clear')) || null
})
const clearEl = clearHandle.asElement()
if (clearEl) {
  await clearEl.click()
  console.log('cleared trail via explicit clear control')
} else {
  // fallback: re-tap each to toggle off
  for (const idx of tapPlanA) {
    const { x, y } = idxToXY(idx)
    await page.mouse.click(x, y)
    await wait(40)
  }
  console.log('cleared trail via re-tap toggle-off (no clear button found)')
}
await wait(200)

// ─────────────────────────────────────────────────────────────────────────
// PROBE B — controlled FAST drag: dispatch pointermove at WIDELY spaced
// waypoints (no interpolation — mirrors "no interpolation between move
// samples" per source read) to see whether the painted trail contains
// tiles NEVER under a dispatched pointer coordinate.
// ─────────────────────────────────────────────────────────────────────────
console.log('\n=== PROBE B: controlled fast drag (widely-spaced waypoints) ===')
await clearOrderLog()
await clearLineLog()
const dragWaypoints = [20, 22, 24, 52, 54, 82, 84, 112, 141, 168] // deliberately skips many tiles between jumps
const touchedIdxSet = new Set()
{
  const first = idxToXY(dragWaypoints[0])
  await page.mouse.move(first.x, first.y, { steps: 1 })
  await page.mouse.down()
  touchedIdxSet.add(dragWaypoints[0])
  for (let i = 1; i < dragWaypoints.length; i++) {
    const p = idxToXY(dragWaypoints[i])
    await page.mouse.move(p.x, p.y, { steps: 1 }) // steps:1 = ONE mousemove event, no interpolation
    touchedIdxSet.add(dragWaypoints[i])
    await wait(20)
  }
  await page.mouse.up()
}
await wait(200)
const { set: dragSet, detail: dragDetail } = await readOrderSet()
const dragExtra = [...dragSet].filter((i) => !touchedIdxSet.has(i))
const dragMissingFromTouched = [...touchedIdxSet].filter((i) => !dragSet.has(i))
console.log('dispatched pointer waypoints (idx):', [...touchedIdxSet].sort((a,b)=>a-b))
console.log('resulting trail (order-numbered idx set):', [...dragSet].sort((a,b)=>a-b))
console.log('EXTRA (in trail but NEVER under a dispatched pointer coord):', dragExtra)
console.log('touched-but-not-in-trail (waypoint that did not register):', dragMissingFromTouched)

// Confirm non-contiguity: are there gaps in the painted set relative to a
// straight/contiguous path? (evidence for "jumping connector" read)
const sortedDrag = [...dragSet].sort((a, b) => a - b)
console.log('is drag-painted set CONTIGUOUS in idx-space?', sortedDrag.every((v, i) => i === 0 || v === sortedDrag[i - 1] + 1))

await page.screenshot({ path: `${OUT_DIR}/probeB-after-fast-drag.png` })

// Read the connector line-segment log to prove it connects SELECTION-ORDER
// neighbours (not grid-adjacency neighbours) — i.e. the jump pattern.
const lineLog = await page.evaluate(() => window.__lineLog)
// Map the last contiguous move/line run (the connector draw happens as one
// beginPath+moveTo+lineTo*N run near the end of the frame) back to idx pairs.
const lineLogIdx = lineLog
  .map((e) => ({ op: e.op, idx: xyToIdx(e.x, e.y) }))
  .filter((e) => e.idx != null)
console.log('connector path (last 20 segments, in idx space):', JSON.stringify(lineLogIdx.slice(-20)))

// ─────────────────────────────────────────────────────────────────────────
// PROBE C — free-pick / non-adjacency confirmation: two FAR-apart single
// taps, confirm both land in trail with no adjacency requirement, and that
// a connector is drawn straight across the gap between them.
// ─────────────────────────────────────────────────────────────────────────
console.log('\n=== PROBE C: free-pick confirmation (two far-apart taps) ===')
// clear first
const clearHandle2 = await page.evaluateHandle(() => {
  const btns = [...document.querySelectorAll('button')]
  return btns.find((b) => (b.getAttribute('aria-label') || '').toLowerCase().includes('clear')) || null
})
const clearEl2 = clearHandle2.asElement()
if (clearEl2) await clearEl2.click()
await wait(150)
await clearOrderLog()
const far1 = 8 // near top row
const far2 = 191 // near bottom row, far column offset
{
  const p1 = idxToXY(far1)
  await page.mouse.click(p1.x, p1.y)
  await wait(80)
  const p2 = idxToXY(far2)
  await page.mouse.click(p2.x, p2.y)
  await wait(150)
}
const { set: farSet } = await readOrderSet()
console.log(`tapped ${far1} and ${far2} (far apart, non-adjacent) -> trail set:`, [...farSet].sort((a,b)=>a-b))
await page.screenshot({ path: `${OUT_DIR}/probeC-free-pick-far-apart.png` })

// ─────────────────────────────────────────────────────────────────────────
// PROBE D — reproduce the mark.jpg "spread route with jumping connector"
// look: paint a spread/drag-mixed pattern and screenshot for visual proof.
// ─────────────────────────────────────────────────────────────────────────
console.log('\n=== PROBE D: reproduce spread/jump-read pattern (mark.jpg analog) ===')
const clearHandle3 = await page.evaluateHandle(() => {
  const btns = [...document.querySelectorAll('button')]
  return btns.find((b) => (b.getAttribute('aria-label') || '').toLowerCase().includes('clear')) || null
})
const clearEl3 = clearHandle3.asElement()
if (clearEl3) await clearEl3.click()
await wait(150)
// A contiguous drag-run (row) mixed with isolated far taps, mirroring mark.jpg's
// mix of a solid contiguous row + isolated jump-numbered pods.
const rowRun = [70, 71, 72, 73, 74, 75] // contiguous row segment via drag
{
  const p0 = idxToXY(rowRun[0])
  await page.mouse.move(p0.x, p0.y, { steps: 1 })
  await page.mouse.down()
  for (let i = 1; i < rowRun.length; i++) {
    const p = idxToXY(rowRun[i])
    await page.mouse.move(p.x, p.y, { steps: 1 })
    await wait(15)
  }
  await page.mouse.up()
}
await wait(80)
// then isolated taps far from the row
for (const idx of [3, 100, 165]) {
  const p = idxToXY(idx)
  await page.mouse.click(p.x, p.y)
  await wait(80)
}
await wait(150)
await page.screenshot({ path: `${OUT_DIR}/probeD-spread-jump-pattern.png` })
const { set: spreadSet } = await readOrderSet()
console.log('spread pattern final trail idx set:', [...spreadSet].sort((a,b)=>a-b))

console.log('\nconsole errors captured during whole run:', consoleErrors.length ? consoleErrors : 'NONE')

fs.writeFileSync(`${OUT_DIR}/probeA-results.json`, JSON.stringify(probeAResults, null, 2))
fs.writeFileSync(
  `${OUT_DIR}/probeB-results.json`,
  JSON.stringify({ dispatchedWaypoints: [...touchedIdxSet], resultingTrail: sortedDrag, extra: dragExtra, missing: dragMissingFromTouched }, null, 2),
)

await browser.close()
console.log('\nDONE')
