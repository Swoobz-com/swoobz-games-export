// Mobile Touch QA — THE ASSAY LINE (vault-pivot, 10x10 board, fixed-tile
// pan-viewport on mobile). Exercises REAL touch-emulated gestures (CDP touch
// events via puppeteer-core's Touchscreen, not mouse.click) to verify:
//  1. pan-to-reach + tap-to-select for off-screen columns/rows (9/10)
//  2. a >=20-tile claim-line that spans on-screen + off-screen regions
//  3. VAULT FLOOR 3-tier tap + hit-target + visible state change
//  4. thumb-zone reachability of the primary control stack
//  5. no-hover-only affordances (static grep done separately)
//  6. frame timing during pan + reveal cascade
//  7. closes the gap in the prior tap-driver evidence (cols 1-2/rows 1-2 only)
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-mobiletouch-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const GRID_DIM = 10
const TILE = 46 // MOBILE_TILE_PX

const DEVICES = [
  { name: 'pixel7', width: 412, height: 915, ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' },
  { name: 'iphone14pro', width: 393, height: 852, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1' },
]

const tapText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  const box = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
  await page.touchscreen.tap(box.x, box.y)
  return true
}

const buttonBox = (page, label) => page.evaluate((l) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(l))
  if (!b) return null
  const r = b.getBoundingClientRect()
  const cs = getComputedStyle(b)
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, top: r.top, touchAction: cs.touchAction }
}, label)

const tierButtonBox = (page, tierLabel) => page.evaluate((l) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(l))
  if (!b) return null
  const r = b.getBoundingClientRect()
  return {
    x: r.x + r.width / 2, y: r.y + r.height / 2,
    w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
    top: r.top, ariaCurrent: b.getAttribute('aria-current'),
    border: getComputedStyle(b).border,
  }
}, tierLabel)

const trailLen = (page) => page.evaluate(() => {
  const spans = [...document.querySelectorAll('span')]
  const el = spans.find((s) => /^\d{1,2}$/.test((s.textContent || '').trim()) && s.nextElementSibling && /min/.test(s.nextElementSibling.textContent || ''))
  return el ? parseInt(el.textContent, 10) : null
})

const scrollState = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  const s = c.parentElement
  return { scrollLeft: s.scrollLeft, scrollTop: s.scrollTop, scrollWidth: s.scrollWidth, scrollHeight: s.scrollHeight, clientWidth: s.clientWidth, clientHeight: s.clientHeight }
})

const geometry = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  const cr = c.getBoundingClientRect()
  const s = c.parentElement
  const sr = s.getBoundingClientRect()
  return { canvas: { left: cr.left, top: cr.top, width: cr.width, height: cr.height }, viewport: { left: sr.left, top: sr.top, right: sr.right, bottom: sr.bottom, width: sr.width, height: sr.height } }
})

const bodyText = (page) => page.evaluate(() => document.body.innerText)

/** Real touch drag over the scroll viewport by (dx,dy) finger movement in
 *  several incremental steps (not a single teleport) — the same primitive a
 *  human thumb-swipe produces, and the same disambiguation path the app's own
 *  `onPointerUpMobile`/`TAP_MOVE_THRESHOLD_PX` gate depends on (a real drag
 *  must exceed the threshold and get intercepted by native scroll, never
 *  register as a tap-toggle). */
async function touchDrag(page, cx, cy, dx, dy, steps = 12, stepWaitMs = 16) {
  const touch = await page.touchscreen.touchStart(cx, cy)
  for (let i = 1; i <= steps; i++) {
    await touch.move(cx + (dx * i) / steps, cy + (dy * i) / steps)
    await wait(stepWaitMs)
  }
  await touch.end()
  await wait(250) // let momentum/snap settle
}

/** Pans (via real touch drags, several if needed) until the target tile
 *  (col,row) is inside the visible scroll-viewport window (with a safety
 *  margin so the tap doesn't land on the edge-fade scrim). Returns the final
 *  on-screen tap point, or null if unreachable after maxAttempts. */
async function panUntilVisible(page, col, row, log, maxAttempts = 8) {
  const margin = 14
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const g = await geometry(page)
    const targetX = g.canvas.left + col * TILE + TILE / 2
    const targetY = g.canvas.top + row * TILE + TILE / 2
    const visible =
      targetX > g.viewport.left + margin && targetX < g.viewport.right - margin &&
      targetY > g.viewport.top + margin && targetY < g.viewport.bottom - margin
    log.push({ attempt, col, row, targetX: Math.round(targetX), targetY: Math.round(targetY), viewport: g.viewport, visible })
    if (visible) return { x: targetX, y: targetY }
    const cx = (g.viewport.left + g.viewport.right) / 2
    const cy = (g.viewport.top + g.viewport.bottom) / 2
    let dx = 0, dy = 0
    const maxStep = Math.min(g.viewport.width, g.viewport.height) * 0.7
    if (targetX >= g.viewport.right - margin) dx = -maxStep // drag finger left -> reveal right (scrollLeft++)
    else if (targetX <= g.viewport.left + margin) dx = maxStep // drag finger right -> reveal left
    if (targetY >= g.viewport.bottom - margin) dy = -maxStep // drag finger up -> reveal below (scrollTop++)
    else if (targetY <= g.viewport.top + margin) dy = maxStep // drag finger down -> reveal above
    if (dx === 0 && dy === 0) return { x: targetX, y: targetY } // already visible per next-loop check
    await touchDrag(page, cx, cy, dx, dy)
  }
  return null
}

async function run(dev) {
  const OUTP = (f) => `${OUT}/${dev.name}-${f}`
  const report = { device: dev.name, viewport: { w: dev.width, h: dev.height }, errors: [], log: [] }
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: 'new',
    args: ['--autoplay-policy=no-user-gesture-required'],
  })
  const page = (await browser.pages())[0]
  page.on('pageerror', (e) => report.errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') report.errors.push('CONSOLE.ERROR: ' + m.text()) })

  await page.emulate({
    viewport: { width: dev.width, height: dev.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },
    userAgent: dev.ua,
  })
  const resp = await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  report.httpStatus = resp.status()
  await wait(400)
  await page.screenshot({ path: OUTP('01-lobby.png') })

  // ── ENTER via a real tap (not click) ────────────────────────────────────
  const lobbyCta = await buttonBox(page, 'ENTER THE ASSAY LINE')
  report.lobbyCtaHitTarget = lobbyCta ? { w: lobbyCta.w, h: lobbyCta.h, meets44: lobbyCta.w >= 44 && lobbyCta.h >= 44 } : null
  report.lobbyCtaThumbZonePct = lobbyCta ? Math.round(((lobbyCta.top + lobbyCta.h / 2) / dev.height) * 1000) / 10 : null
  await page.touchscreen.tap(lobbyCta.x, lobbyCta.y)
  await wait(400)
  await page.screenshot({ path: OUTP('02-planning-initial.png') })

  // ── CHECK 3: VAULT FLOOR — tap all 3 tiers, confirm hit-target + visible state change ──
  const tierLabels = ['Lean Floor', 'Standard Floor', 'Flooded Floor']
  report.vaultFloor = []
  for (const label of tierLabels) {
    const before = await tierButtonBox(page, label)
    await page.touchscreen.tap(before.x, before.y)
    await wait(200)
    const after = await tierButtonBox(page, label)
    report.vaultFloor.push({
      label,
      hitTarget: { w: before.w, h: before.h, meets44: before.w >= 44 && before.h >= 44 },
      thumbZonePct: Math.round(((before.top + before.h / 2) / dev.height) * 1000) / 10,
      ariaCurrentBefore: before.ariaCurrent,
      ariaCurrentAfter: after.ariaCurrent,
      borderChanged: before.border !== after.border,
      stateChanged: before.ariaCurrent !== after.ariaCurrent || before.border !== after.border,
    })
  }
  await page.screenshot({ path: OUTP('03-vault-floor-flooded-selected.png') })

  // ── CHECK 4: thumb-zone reachability of the primary control stack ──────
  const controlLabels = ['CLEAR', 'PACE', 'THROW BREAKER']
  report.thumbZone = {}
  for (const l of controlLabels) {
    const b = await buttonBox(page, l)
    if (b) {
      report.thumbZone[l] = {
        w: b.w, h: b.h, meets44: b.w >= 44 && b.h >= 44,
        vCenterPct: Math.round(((b.top + b.h / 2) / dev.height) * 1000) / 10,
        touchAction: b.touchAction,
      }
    }
  }
  const vaultFloorBox = await tierButtonBox(page, 'Standard Floor')
  report.thumbZone['VAULT FLOOR (Standard)'] = { vCenterPct: Math.round(((vaultFloorBox.top + vaultFloorBox.h / 2) / dev.height) * 1000) / 10, w: vaultFloorBox.w, h: vaultFloorBox.h }

  // ── CHECK 1: initial scroll state (should be auto-centered) ────────────
  const scroll0 = await scrollState(page)
  report.initialScroll = scroll0

  // ── CHECK 1: reach + select column 9 (index 9, 0-based last col), row 0 ──
  const panLog1 = []
  const beforeLen1 = await trailLen(page)
  const pt1 = await panUntilVisible(page, 9, 0, panLog1)
  const scrollAfterPan1 = await scrollState(page)
  const lenAfterPanOnly1 = await trailLen(page) // must be UNCHANGED — pan must not toggle a tile
  let tapWorked1 = false
  if (pt1) {
    await page.touchscreen.tap(pt1.x, pt1.y)
    await wait(200)
    tapWorked1 = (await trailLen(page)) === beforeLen1 + 1
  }
  await page.screenshot({ path: OUTP('04-reached-col9-row0.png') })
  report.reachCol9Row0 = {
    panLog: panLog1, reached: !!pt1, tapPoint: pt1,
    scrollDelta: { dLeft: scrollAfterPan1.scrollLeft - scroll0.scrollLeft, dTop: scrollAfterPan1.scrollTop - scroll0.scrollTop },
    panDidNotAccidentallySelect: lenAfterPanOnly1 === beforeLen1,
    trailBefore: beforeLen1, trailAfterTap: tapWorked1 ? beforeLen1 + 1 : await trailLen(page),
    tapSelectedTile: tapWorked1,
  }

  // ── CHECK 1: reach + select row 9 (index 9, last row), col 0 ────────────
  const panLog2 = []
  const beforeLen2 = await trailLen(page)
  const pt2 = await panUntilVisible(page, 0, 9, panLog2)
  const lenAfterPanOnly2 = await trailLen(page)
  let tapWorked2 = false
  if (pt2) {
    await page.touchscreen.tap(pt2.x, pt2.y)
    await wait(200)
    tapWorked2 = (await trailLen(page)) === beforeLen2 + 1
  }
  await page.screenshot({ path: OUTP('05-reached-row9-col0.png') })
  report.reachRow9Col0 = {
    panLog: panLog2, reached: !!pt2, tapPoint: pt2,
    panDidNotAccidentallySelect: lenAfterPanOnly2 === beforeLen2,
    trailBefore: beforeLen2, tapSelectedTile: tapWorked2,
  }

  // ── CHECK 1: corner (9,9) reach + select ────────────────────────────────
  const panLog3 = []
  const beforeLen3 = await trailLen(page)
  const pt3 = await panUntilVisible(page, 9, 9, panLog3)
  let tapWorked3 = false
  if (pt3) {
    await page.touchscreen.tap(pt3.x, pt3.y)
    await wait(200)
    tapWorked3 = (await trailLen(page)) === beforeLen3 + 1
  }
  await page.screenshot({ path: OUTP('06-reached-corner-9-9.png') })
  report.reachCorner99 = { panLog: panLog3, reached: !!pt3, trailBefore: beforeLen3, tapSelectedTile: tapWorked3 }

  // Clear the trail before the full journey test.
  await tapText(page, 'CLEAR')
  await wait(200)
  report.trailAfterClear = await trailLen(page)

  // ── CHECK 2: full row 0 (10 tiles) + full row 9 (10 tiles) = 20-tile claim-line,
  //    necessarily spanning the initially-visible region + off-screen regions.
  //    Records: pan-gesture count, per-tap trail-counter correctness, screenshots,
  //    and whether the flow dead-ends/glitches after a canvas repaint post-scroll. ──
  const journey = { steps: [], panGesturesUsed: 0, tapFailures: [], screenshots: [] }
  const targets = []
  for (let col = 0; col < GRID_DIM; col++) targets.push({ col, row: 0 })
  for (let col = 0; col < GRID_DIM; col++) targets.push({ col, row: 9 })

  let expectedLen = await trailLen(page)
  const t0 = performance_now_placeholder()
  const stepTimings = []
  for (let i = 0; i < targets.length; i++) {
    const { col, row } = targets[i]
    const stepStart = Date.now()
    const beforeScroll = await scrollState(page)
    const localLog = []
    const pt = await panUntilVisible(page, col, row, localLog)
    const afterScroll = await scrollState(page)
    const gesturesThisStep = localLog.filter((l) => !l.visible).length
    journey.panGesturesUsed += gesturesThisStep
    if (!pt) {
      journey.tapFailures.push({ col, row, reason: 'UNREACHABLE_AFTER_MAX_PAN_ATTEMPTS', localLog })
      continue
    }
    await page.touchscreen.tap(pt.x, pt.y)
    await wait(120)
    const newLen = await trailLen(page)
    const ok = newLen === expectedLen + 1
    if (!ok) journey.tapFailures.push({ col, row, reason: 'TRAIL_DID_NOT_INCREMENT', expectedLen, newLen })
    else expectedLen = newLen
    journey.steps.push({
      i, col, row, gesturesUsed: gesturesThisStep,
      scrollDelta: { dLeft: afterScroll.scrollLeft - beforeScroll.scrollLeft, dTop: afterScroll.scrollTop - beforeScroll.scrollTop },
      trailAfterTap: newLen, ok, ms: Date.now() - stepStart,
    })
    if (i === 4 || i === 9 || i === 14 || i === 19) {
      const shot = OUTP(`07-journey-step${i}.png`)
      await page.screenshot({ path: shot })
      journey.screenshots.push(shot)
    }
  }
  journey.finalTrailLen = await trailLen(page)
  journey.expectedTrailLen = expectedLen
  journey.completedWithoutDeadEnd = journey.tapFailures.length === 0 && journey.finalTrailLen === 20
  report.fullJourney20Tile = journey

  // No dead-end: THROW BREAKER should be armed (MIN_TRAIL=8, we have 20).
  const breakerBefore = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('THROW BREAKER'))
    return b ? { disabled: b.disabled } : null
  })
  report.breakerArmedAt20 = breakerBefore ? !breakerBefore.disabled : null

  const statusBeforePlunge = await bodyText(page)
  report.statusBeforePlunge = (statusBeforePlunge.match(/Claim-line armed[^\n]*/) || [null])[0]

  // ── Plunge and confirm TRAIL/ASSAY TALLY update correctly through the cascade,
  //    capturing frame timing during the reveal (CHECK 6, reveal portion). ─────
  await page.evaluate(() => { window.__frameTimes = []; let last = performance.now()
    function tick() { const now = performance.now(); window.__frameTimes.push(now - last); last = now; requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  })
  const breakerBox = await buttonBox(page, 'THROW BREAKER')
  report.breakerThumbZonePct = breakerBox ? Math.round(((breakerBox.top + breakerBox.h / 2) / dev.height) * 1000) / 10 : null
  await page.touchscreen.tap(breakerBox.x, breakerBox.y)
  await wait(3500)
  const frameTimesReveal = await page.evaluate(() => window.__frameTimes.slice())
  await page.screenshot({ path: OUTP('08-post-plunge-cascade-or-settled.png') })
  await wait(1500)
  await page.screenshot({ path: OUTP('09-settled.png') })

  const settledBody = await bodyText(page)
  report.outcome = /CLAIM PROVEN/i.test(settledBody) ? 'WIN' : /BUSTED/i.test(settledBody) || /BAD VEIN/i.test(settledBody) ? 'BUST' : 'UNKNOWN'
  report.journeyCompletableToSettle = report.outcome !== 'UNKNOWN'

  // Frame timing analysis (reveal + any pan overlap).
  const fps = (frames) => {
    const long = frames.filter((f) => f > 1000 / 45) // slower than 45fps budget
    return {
      count: frames.length,
      avgMs: frames.length ? Math.round((frames.reduce((a, b) => a + b, 0) / frames.length) * 100) / 100 : null,
      maxMs: frames.length ? Math.round(Math.max(...frames) * 100) / 100 : null,
      framesBelow45fps: long.length,
      pctBelow45fps: frames.length ? Math.round((long.length / frames.length) * 1000) / 10 : null,
    }
  }
  report.frameTimingDuringReveal = fps(frameTimesReveal)

  // ── CHECK 6b: frame timing DURING an active pan gesture (drag while board is live) ──
  // Start a fresh round to have a live board with paintable interactive state.
  await tapText(page, 'ASSAY AGAIN')
  await wait(400)
  await page.evaluate(() => { window.__frameTimes2 = []; let last = performance.now()
    function tick() { const now = performance.now(); window.__frameTimes2.push(now - last); last = now; requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  })
  const gPan = await geometry(page)
  const pcx = (gPan.viewport.left + gPan.viewport.right) / 2
  const pcy = (gPan.viewport.top + gPan.viewport.bottom) / 2
  await touchDrag(page, pcx, pcy, -120, -80, 20, 16)
  await touchDrag(page, pcx, pcy, 120, 80, 20, 16)
  const frameTimesPan = await page.evaluate(() => window.__frameTimes2.slice())
  report.frameTimingDuringPan = fps(frameTimesPan)
  await page.screenshot({ path: OUTP('10-after-pan-perf-probe.png') })

  // ── CHECK 7 evidence-gap closer note ────────────────────────────────────
  report.priorEvidenceGapClosed = {
    note: 'This run explicitly taps col9/row0, col0/row9, and corner(9,9), plus a 20-tile row0+row9 journey — none of which the prior pixel7-tapped-tiles.json evidence (cols 0-1, rows 0-1 only, sequential from canvas origin with no pan) exercised.',
  }

  fs.writeFileSync(`${OUT}/${dev.name}-report.json`, JSON.stringify(report, null, 2))
  await browser.close()
  return report
}

function performance_now_placeholder() { return Date.now() }

const all = {}
for (const dev of DEVICES) {
  console.log('=== running', dev.name, '===')
  all[dev.name] = await run(dev)
}
fs.writeFileSync(`${OUT}/combined-report.json`, JSON.stringify(all, null, 2))
console.log('DONE. Summary:')
for (const dev of DEVICES) {
  const r = all[dev.name]
  console.log(dev.name, {
    lobbyCtaHitTarget: r.lobbyCtaHitTarget,
    vaultFloor: r.vaultFloor.map((v) => ({ label: v.label, meets44: v.hitTarget.meets44, stateChanged: v.stateChanged, thumbZonePct: v.thumbZonePct })),
    reachCol9Row0: { reached: r.reachCol9Row0.reached, tapSelectedTile: r.reachCol9Row0.tapSelectedTile, panDidNotAccidentallySelect: r.reachCol9Row0.panDidNotAccidentallySelect },
    reachRow9Col0: { reached: r.reachRow9Col0.reached, tapSelectedTile: r.reachRow9Col0.tapSelectedTile },
    reachCorner99: { reached: r.reachCorner99.reached, tapSelectedTile: r.reachCorner99.tapSelectedTile },
    fullJourney20Tile: { panGesturesUsed: r.fullJourney20Tile.panGesturesUsed, tapFailures: r.fullJourney20Tile.tapFailures.length, completedWithoutDeadEnd: r.fullJourney20Tile.completedWithoutDeadEnd, finalTrailLen: r.fullJourney20Tile.finalTrailLen },
    breakerArmedAt20: r.breakerArmedAt20,
    outcome: r.outcome,
    frameTimingDuringReveal: r.frameTimingDuringReveal,
    frameTimingDuringPan: r.frameTimingDuringPan,
    thumbZone: r.thumbZone,
    errors: r.errors,
  })
}
