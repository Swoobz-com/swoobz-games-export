// THE ASSAY LINE — Studio Quality Bar 7-assertion smoke + VAULT FLOOR
// tier-wiring independent verification + mobile far-corner reachability
// probe (swoobz-game-flow-qa, 2026-07-04). Extends the house
// `breaker-journey-0704.mjs` pattern (throwaway puppeteer-core driver under
// assay-run/, real-coordinate taps, chrome at the fixed EXE path).
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const MODE = process.argv[3] || 'desktop' // 'desktop' | 'pixel7' | 'iphone14pro'
const OUT = 'shots-gameflow-qa-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  pixel7: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
  iphone14pro: { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
}
const vp = VIEWPORTS[MODE]
const GRID_DIM = 10
const EXPECTED_BOMBS = { 'Lean Floor': 3, 'Standard Floor': 4, 'Flooded Floor': 8 }

const errors = []
const consoleErrors = []
const report = { mode: MODE, url: URL, assertions: {}, measurements: {}, notes: [] }

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  defaultViewport: vp,
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const page = (await browser.pages())[0]
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push('CONSOLE.ERROR: ' + m.text())
})

// ── helpers ──────────────────────────────────────────────────────────────
// NOTE (mobile fix): the ROUND D bottom-dock layout stacks the whole
// VAULT FLOOR/TRAIL/TO ASSAY/YOUR BET/BALANCE rail in-flow BELOW the 460px
// board on narrow viewports, so the OUTER PAGE (not just the board's own
// internal pan-scroll) is taller than the viewport (measured: 1332px page
// vs 915px viewport on Pixel 7 — THROW BREAKER sits at y=1253, off-screen
// by default). A raw `getBoundingClientRect()` + `touchscreen.tap()` at that
// off-screen y silently misses (no element hit-tests there), which first
// LOOKED like a dead-button/soft-lock regression until traced to the
// harness not scrolling the outer page first — exactly the kind of false
// positive worth catching before reporting a FALSE regression. Every real
// player scrolls the page to reach a below-the-fold control; the harness
// must too. `scrollIntoView` before every measurement makes this authentic.
async function findButton(label) {
  await page.evaluate((t) => {
    const btns = [...document.querySelectorAll('button')]
    const matches = btns.filter((x) => x.textContent && x.textContent.includes(t))
    let best = null, bestArea = Infinity
    for (const b of matches) {
      const r = b.getBoundingClientRect()
      const area = r.width * r.height
      if (area > 0 && area < bestArea) { bestArea = area; best = b }
    }
    if (best) best.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, label)
  return page.evaluate((t) => {
    const btns = [...document.querySelectorAll('button')]
    const matches = btns.filter((x) => x.textContent && x.textContent.includes(t))
    if (matches.length === 0) return null
    // Smallest-area match = the specific button, not an ancestor wrapper.
    let best = null, bestArea = Infinity
    for (const b of matches) {
      const r = b.getBoundingClientRect()
      const area = r.width * r.height
      if (area > 0 && area < bestArea) { bestArea = area; best = b }
    }
    if (!best) return null
    const r = best.getBoundingClientRect()
    return {
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      disabled: best.disabled,
      text: best.textContent,
      ariaCurrent: best.getAttribute('aria-current'),
    }
  }, label)
}
async function realTap(x, y) {
  if (vp.isMobile) await page.touchscreen.tap(x, y)
  else await page.mouse.click(x, y)
}
async function clickButtonReal(label) {
  const info = await findButton(label)
  if (!info) return { found: false }
  if (info.disabled) return { found: true, disabled: true, rect: info.rect }
  const cx = info.rect.x + info.rect.w / 2
  const cy = info.rect.y + info.rect.h / 2
  await realTap(cx, cy)
  return { found: true, disabled: false, rect: info.rect, clicked: { cx, cy } }
}
async function canvasRect() {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    let vis = null
    let el = c.parentElement
    for (let i = 0; i < 8 && el; i++) {
      const cs = getComputedStyle(el)
      if (cs.overflow === 'auto' || cs.overflow === 'scroll' || cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
        const vr = el.getBoundingClientRect()
        vis = { x: vr.x, y: vr.y, w: vr.width, h: vr.height }
        break
      }
      el = el.parentElement
    }
    return { x: r.x, y: r.y, w: r.width, h: r.height, vis }
  })
}
const bodyText = () => page.evaluate(() => document.body.innerText)
function rectsOverlap(a, b) {
  if (!a || !b) return false
  const ax2 = a.x + a.w, ay2 = a.y + a.h
  const bx2 = b.x + b.w, by2 = b.y + b.h
  const ox = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x))
  const oy = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y))
  return ox > 0 && oy > 0 ? ox * oy : 0
}
async function paintTrail(box, tiles) {
  const tile = box.w / GRID_DIM
  for (const [col, row] of tiles) {
    const x = box.x + col * tile + tile / 2
    const y = box.y + row * tile + tile / 2
    await realTap(x, y)
    await wait(30)
  }
}
function safeGridBounds(box) {
  const tile = box.w / GRID_DIM
  const win = box.vis || { x: 0, y: 0, w: vp.width, h: vp.height }
  const margin = 6
  const colMin = Math.max(0, Math.ceil((win.x + margin - box.x) / tile))
  const colMax = Math.min(GRID_DIM - 1, Math.floor((win.x + win.w - margin - box.x) / tile) - 1)
  const rowMin = Math.max(0, Math.ceil((win.y + margin - box.y) / tile))
  const rowMax = Math.min(GRID_DIM - 1, Math.floor((win.y + win.h - margin - box.y) / tile) - 1)
  return { colMin, colMax, rowMin, rowMax }
}
function shortTrail(n, box, startIdx = 0) {
  const pts = []
  if (vp.isMobile && box) {
    const b = safeGridBounds(box)
    const width = Math.max(1, b.colMax - b.colMin + 1)
    for (let i = startIdx; i < startIdx + n; i++) pts.push([b.colMin + (i % width), b.rowMin + Math.floor(i / width)])
  } else {
    for (let i = startIdx; i < startIdx + n; i++) pts.push([1 + (i % 8), 1 + Math.floor(i / 8)])
  }
  return pts
}
function denseTrail(n, box) {
  // Serpentine sweep over the WHOLE 10x10 board (desktop) or the whole
  // scrollable window (mobile) to maximize bust probability for a
  // dense/long claim-line, independent of tier bomb density.
  const pts = []
  if (!vp.isMobile || !box) {
    for (let row = 0; row < GRID_DIM && pts.length < n; row++) {
      for (let col = 0; col < GRID_DIM && pts.length < n; col++) pts.push([col, row])
    }
  } else {
    const b = safeGridBounds(box)
    for (let row = b.rowMin; row <= b.rowMax && pts.length < n; row++) {
      for (let col = b.colMin; col <= b.colMax && pts.length < n; col++) pts.push([col, row])
    }
  }
  return pts.slice(0, n)
}
async function waitForOutcome(timeoutMs) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const txt = await bodyText()
    if (/CLAIM PROVEN/.test(txt)) return { outcome: 'win', text: txt }
    if (/BAD VEIN.{0,5}BUSTED/.test(txt)) return { outcome: 'bust', text: txt }
    await wait(120)
  }
  return { outcome: 'timeout', text: await bodyText() }
}
function parseCertificate(txt) {
  // "GLASS BOX CERTIFICATE · N bad veins in DxD" — D uses the unicode
  // multiplication sign (×), not a literal 'x'.
  const m = txt.match(/GLASS BOX CERTIFICATE[^\d]*(\d+)\s*bad veins in (\d+)\s*[×x]\s*(\d+)/)
  if (!m) return null
  return { bombCount: parseInt(m[1], 10), gridA: parseInt(m[2], 10), gridB: parseInt(m[3], 10) }
}
async function balanceReading() {
  const txt = await bodyText()
  const m = txt.match(/BALANCE\s*\$?([0-9,]+\.[0-9]{2})/)
  return m ? parseFloat(m[1].replace(/,/g, '')) : null
}
async function reload() {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await wait(500)
}
async function openPlanningFromLobby() {
  await reload()
  const open = await clickButtonReal('ENTER THE ASSAY LINE')
  await wait(300)
  return open
}

// ═════════════════════════════════════════════════════════════════════════
// ASSERTION 1 — HTTP 200
// ═════════════════════════════════════════════════════════════════════════
const t0 = Date.now()
const resp = await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
report.assertions.a1_http200 = resp ? resp.status() === 200 : false
report.measurements.httpStatus = resp ? resp.status() : null
await wait(600)
await page.screenshot({ path: `${OUT}/${MODE}-00-lobby.png` })

// ═════════════════════════════════════════════════════════════════════════
// ASSERTION 2 — onboarding-equivalent surfaces (lobby rules copy)
// ═════════════════════════════════════════════════════════════════════════
{
  const lobbyTxt = await bodyText()
  report.assertions.a2_onboarding_equivalent = /Paint a claim-line/.test(lobbyTxt)
  report.notes.push('lobby copy sample: ' + lobbyTxt.slice(0, 160).replace(/\n/g, ' | '))
}

// ═════════════════════════════════════════════════════════════════════════
// ASSERTION 4 pre-check + ASSERTION 5 — visible response within 100ms
// (measured on the min-8→armed BreakerLever tap, captured during the
// tier-wiring loop below) + ASSERTION 6 — active-phase safety/exit
// affordance (PLAY SAFE) + ASSERTION 3/7 loop, ALL per VAULT FLOOR tier.
// ═════════════════════════════════════════════════════════════════════════
report.tierWiring = []
for (const tierLabel of Object.keys(EXPECTED_BOMBS)) {
  const rec = { tier: tierLabel, expectedBombs: EXPECTED_BOMBS[tierLabel] }
  await openPlanningFromLobby()

  // Select the tier — verify the click actually flips aria-current, and that
  // this is a REAL button click (not a fake/disabled affordance).
  const tierBtnBefore = await findButton(tierLabel)
  rec.tierButtonFoundBeforeClick = !!tierBtnBefore
  rec.tierButtonDisabledBeforeClick = tierBtnBefore?.disabled ?? null
  await clickButtonReal(tierLabel)
  await wait(150)
  const tierBtnAfter = await findButton(tierLabel)
  rec.tierActiveAfterClick = tierBtnAfter?.ariaCurrent === 'true'

  // Canvas rect MUST be re-measured HERE, after every scroll-triggering
  // `findButton` call above — `scrollIntoView` on the tier button can move
  // the outer page, which shifts the canvas's own on-screen position too
  // (see the harness-fix note on `findButton`). Painting with a rect
  // captured before that scroll would tap the WRONG screen coordinates.
  const box = await canvasRect()
  rec.canvasBox = box

  // Paint the minimum 8-tile claim-line and plunge.
  await paintTrail(box, shortTrail(8, box))
  await wait(150)
  const breakerInfo = await findButton('THROW BREAKER')
  rec.breakerFound = !!breakerInfo
  rec.breakerDisabledAt8 = breakerInfo?.disabled ?? null

  const preTxt = await bodyText()
  const tStart = Date.now()
  if (breakerInfo && !breakerInfo.disabled) {
    const cx = breakerInfo.rect.x + breakerInfo.rect.w / 2
    const cy = breakerInfo.rect.y + breakerInfo.rect.h / 2
    await realTap(cx, cy)
  }
  await wait(100)
  const postTxt100 = await bodyText()
  rec.visibleResponseWithin100ms = postTxt100 !== preTxt
  rec.responseSampleMs = Date.now() - tStart

  // ASSERTION 6 — during `assaying`, PLAY SAFE must be reachable (the
  // game's actual active-phase safety/exit affordance; this forced-
  // completion game class has no mid-round cash-out by design — see
  // 2026-07-03/04 audits).
  const playSafeDuringActive = await findButton('PLAY SAFE')
  rec.playSafeReachableDuringActive = !!playSafeDuringActive && !playSafeDuringActive.disabled

  const outcome = await waitForOutcome(9000)
  rec.outcome = outcome.outcome
  rec.glassBoxPresent = /GLASS BOX CERTIFICATE/.test(outcome.text)
  const cert = parseCertificate(outcome.text)
  rec.certificateParsed = cert
  rec.bombCountMatchesTier = cert ? cert.bombCount === EXPECTED_BOMBS[tierLabel] : false
  rec.gridDimIs10x10 = cert ? cert.gridA === 10 && cert.gridB === 10 : false
  await page.screenshot({ path: `${OUT}/${MODE}-tier-${tierLabel.replace(/\s+/g, '_')}-settled.png` })

  report.tierWiring.push(rec)
}
report.assertions.a5_visibleResponseWithin100ms = report.tierWiring.every((r) => r.visibleResponseWithin100ms)
report.assertions.a6_playSafeReachableDuringActive = report.tierWiring.every((r) => r.playSafeReachableDuringActive)
report.assertions.a7_glassBoxOnSettle = report.tierWiring.every((r) => r.glassBoxPresent)
report.assertions.tierWiringAllMatch = report.tierWiring.every((r) => r.bombCountMatchesTier)
report.assertions.a3_fullLoopReachesSettled = report.tierWiring.every((r) => r.outcome === 'win' || r.outcome === 'bust')

// ═════════════════════════════════════════════════════════════════════════
// PROBE — RESTART LOOP ("ASSAY AGAIN") + CHANGE-WAGER FLOW (stepper +
// QuickChip), on the LAST tier's settled state above.
// ═════════════════════════════════════════════════════════════════════════
{
  const preRestartTxt = await bodyText()
  const t = Date.now()
  const again = await clickButtonReal('ASSAY AGAIN')
  await wait(50)
  const restartMs = Date.now() - t
  await wait(250)
  const postRestartTxt = await bodyText()
  // NOTE: "Select N more nubs to arm the key" (renderStatusText) is gated
  // `showRail && isWide` — DESKTOP-ONLY (AssayExperience.tsx ~L1240); on
  // mobile/narrow this sentence never renders during planning at all, only
  // the bare TRAIL odometer + CLEAR/PACE buttons do. Check phase-planning
  // markers that are present on BOTH layouts, not the desktop-only copy.
  report.assertions.restart_reachedPlanning =
    /Paint a claim-line|Select \d+ more nub|Claim-line armed/.test(postRestartTxt) ||
    (/\bCLEAR\b/.test(postRestartTxt) && /PACE:/.test(postRestartTxt))
  report.measurements.restart_again = again
  report.measurements.restart_latencyMs = restartMs
  const overlayCounts = await page.evaluate(() => {
    const all = [...document.querySelectorAll('div[role="dialog"]')]
    return all.filter((d) => getComputedStyle(d).display !== 'none').length
  })
  report.assertions.restart_noStaleModal = overlayCounts === 0
  report.assertions.restart_consoleClean = consoleErrors.length === 0
  await page.screenshot({ path: `${OUT}/${MODE}-restart-planning.png` })

  // Change-wager flow: read current wager, tap a QuickChip, verify readout
  // updates, then tap the +/- stepper and verify it updates again.
  const wagerBefore = await bodyText()
  const wagerMatchBefore = wagerBefore.match(/YOUR BET[\s\S]{0,10}?\$([0-9]+\.[0-9]{2})/)
  // Find a QuickChip button by its rendered $-amount text and tap the one
  // that's currently NOT active (guarantees a real value change).
  const chipTexts = await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .map((b) => b.textContent?.trim())
      .filter((t) => t && /^\$?[0-9]+\.00$/.test(t)),
  )
  report.measurements.quickChipAmountsSeen = chipTexts
  let chipClickResult = null
  if (chipTexts.length > 0) {
    const target = chipTexts[chipTexts.length - 1] // pick the last (largest) preset
    chipClickResult = await clickButtonReal(target)
    await wait(150)
  }
  const wagerAfterChip = await bodyText()
  report.assertions.changeWager_quickChipUpdatesReadout =
    chipClickResult?.found && !chipClickResult.disabled ? wagerAfterChip !== wagerBefore : null
  report.measurements.changeWagerChipTarget = chipTexts.length > 0 ? chipTexts[chipTexts.length - 1] : null

  // Stepper +/- : find the '+' CalibKnob and click it, confirm wager display changes again.
  const preStepperTxt = await bodyText()
  const plusBtn = await findButton('+')
  if (plusBtn && !plusBtn.disabled) {
    await clickButtonReal('+')
    await wait(150)
  }
  const postStepperTxt = await bodyText()
  report.assertions.changeWager_stepperUpdatesReadout = plusBtn ? postStepperTxt !== preStepperTxt : null
  await page.screenshot({ path: `${OUT}/${MODE}-change-wager.png` })

  // Commit with the changed wager, verify the wager actually shown pre-plunge
  // matches what hits the balance delta. The QuickChip/stepper controls sit
  // near the BOTTOM of the page (far below the board); on mobile a real
  // player scrolls back UP to see the board again before painting a new
  // claim-line — mirror that explicitly (scrollIntoView the canvas) before
  // re-measuring its rect, otherwise the board can still be off-screen and
  // every paint tap silently misses (exactly the false "trail stuck at 0/8"
  // reading this fix replaces).
  await page.evaluate(() => document.querySelector('canvas')?.scrollIntoView({ block: 'center', inline: 'center' }))
  const box = await canvasRect()
  await paintTrail(box, shortTrail(8, box))
  await wait(150)
  const preBalance = await balanceReading()
  const preCommitTxt = await bodyText()
  const wagerShown = preCommitTxt.match(/\$?([0-9]+\.00)\b/g)
  await clickButtonReal('THROW BREAKER')
  const outcome2 = await waitForOutcome(9000)
  const postBalance = await balanceReading()
  report.measurements.changeWagerCommit = {
    preBalance, postBalance, outcome: outcome2.outcome,
    wagerShownSamples: wagerShown,
  }
  await page.screenshot({ path: `${OUT}/${MODE}-change-wager-committed.png` })
}

// ═════════════════════════════════════════════════════════════════════════
// ASSERTION 4 — no overlay covers canvas (lobby/planning/active/settled)
// ═════════════════════════════════════════════════════════════════════════
{
  await reload()
  const lobbyCanvas = await canvasRect()
  await clickButtonReal('ENTER THE ASSAY LINE')
  await wait(300)
  // `findButton` (THROW BREAKER) scrolls the page — measure it FIRST, then
  // re-measure the canvas SECOND so both rects reflect the SAME final
  // scroll offset (comparing rects captured at different scroll positions
  // would produce a bogus overlap/no-overlap reading).
  const breakerInfoPlanning = await findButton('THROW BREAKER')
  const boxPlanning = await canvasRect()
  const overlapPlanning = rectsOverlap(boxPlanning, breakerInfoPlanning?.rect)
  report.assertions.a4_noOverlay_planning = overlapPlanning === 0 || overlapPlanning === false
  await paintTrail(boxPlanning, shortTrail(9, boxPlanning))
  await wait(150)
  await clickButtonReal('THROW BREAKER')
  await wait(150)
  const railProbe = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('div')].filter((d) => d.textContent && d.textContent.includes('nubs proven'))
    let bestEl = null, bestArea = Infinity
    for (const d of nodes) {
      const r = d.getBoundingClientRect()
      const area = r.width * r.height
      if (area > 0 && area < bestArea) { bestArea = area; bestEl = d }
    }
    if (!bestEl) return null
    bestEl.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    const r2 = bestEl.getBoundingClientRect()
    return { x: r2.x, y: r2.y, w: r2.width, h: r2.height }
  })
  const boxActive = await canvasRect()
  const overlapActive = rectsOverlap(boxActive, railProbe)
  report.assertions.a4_noOverlay_active = overlapActive === 0 || overlapActive === false
  await waitForOutcome(9000)
  const againInfo = await findButton('ASSAY AGAIN')
  const boxSettled = await canvasRect()
  const overlapSettled = rectsOverlap(boxSettled, againInfo?.rect)
  report.assertions.a4_noOverlay_settled = overlapSettled === 0 || overlapSettled === false
  report.measurements.overlapAreas = { planning: overlapPlanning, active: overlapActive, settled: overlapSettled }
  if (vp.isMobile) {
    report.notes.push(
      'MOBILE CAVEAT (established pattern): the pan-only canvas is 460x460 CSS px (MOBILE_TILE_PX 46 * GRID_DIM 10), ' +
        'larger than most narrow viewports once the scroll wrapper is smaller than 460px, so raw canvas-rect vs ' +
        'control-rect overlap can read noisy; screenshots are the ground truth for this assertion on mobile.',
    )
  }
  await page.screenshot({ path: `${OUT}/${MODE}-overlay-check-settled.png` })
}

// ═════════════════════════════════════════════════════════════════════════
// MOBILE-ONLY — far-corner (col 9/row 9) reachability probe. Confirms a
// claim-line reaching the LAST column/row can actually be painted and the
// journey completes, per the task's mobile-reachability flow concern.
// ═════════════════════════════════════════════════════════════════════════
if (vp.isMobile) {
  await reload()
  await clickButtonReal('ENTER THE ASSAY LINE')
  await wait(300)
  const geom = await page.evaluate((GRID_DIM_) => {
    const c = document.querySelector('canvas')
    if (!c) return null
    let el = c.parentElement
    let scrollEl = null
    for (let i = 0; i < 8 && el; i++) {
      const cs = getComputedStyle(el)
      if (cs.overflow === 'auto' || cs.overflow === 'scroll' || cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
        scrollEl = el
        break
      }
      el = el.parentElement
    }
    const cRect = c.getBoundingClientRect()
    const tile = cRect.width / GRID_DIM_
    const before = scrollEl ? { scrollLeft: scrollEl.scrollLeft, scrollTop: scrollEl.scrollTop, w: scrollEl.clientWidth, h: scrollEl.clientHeight } : null
    return { canvasW: cRect.width, canvasH: cRect.height, tile, before, hasScrollWrapper: !!scrollEl }
  }, GRID_DIM)
  report.measurements.mobileFarCornerGeom = geom

  // Pan to the maximum scroll (bottom-right) to bring tile (9,9) — the
  // single hardest-to-reach tile (last column AND last row) — on-screen.
  await page.evaluate(() => {
    const c = document.querySelector('canvas')
    let el = c?.parentElement
    for (let i = 0; i < 8 && el; i++) {
      const cs = getComputedStyle(el)
      if (cs.overflow === 'auto' || cs.overflow === 'scroll' || cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
        el.scrollLeft = el.scrollWidth
        el.scrollTop = el.scrollHeight
        return
      }
      el = el.parentElement
    }
  })
  await wait(200)
  const boxAfterPan = await canvasRect()
  report.measurements.canvasBoxAfterPanToFarCorner = boxAfterPan

  const trailBefore = await page.evaluate(() => {
    const m = document.body.innerText.match(/Select (\d+) more nub/)
    return m ? 8 - parseInt(m[1], 10) : null // MIN_TRAIL(8) - remaining
  })

  // Tile (9,9) screen position = canvas rect origin + col*tile + tile/2.
  const tile = boxAfterPan.w / GRID_DIM
  const targetX = boxAfterPan.x + 9 * tile + tile / 2
  const targetY = boxAfterPan.y + 9 * tile + tile / 2
  const withinViewportX = targetX >= 0 && targetX <= vp.width
  const withinViewportY = targetY >= 0 && targetY <= vp.height
  report.measurements.farCornerTileScreenPos = { targetX, targetY, withinViewportX, withinViewportY }

  if (withinViewportX && withinViewportY) {
    await realTap(targetX, targetY)
    await wait(150)
  }
  const trailAfterTxt = await bodyText()
  const trailAfterMatch = trailAfterTxt.match(/Select (\d+) more nub/)
  const trailAfter = trailAfterMatch ? 8 - parseInt(trailAfterMatch[1], 10) : (/Claim-line armed/.test(trailAfterTxt) ? 8 : null)
  report.measurements.farCornerTapResult = { trailBefore, trailAfter, tileRegisteredAsSelected: trailAfter != null && trailBefore != null && trailAfter > trailBefore }
  await page.screenshot({ path: `${OUT}/${MODE}-farcorner-after-pan-tap.png` })

  // Now finish an 8-tile trail INCLUDING this far-corner tile (top up with
  // safe on-screen tiles at the current scroll position) and confirm the
  // full journey (plunge -> settle) still completes with the far-corner
  // tile included.
  const b = safeGridBounds(boxAfterPan)
  const topUp = []
  for (let row = b.rowMin; row <= b.rowMax && topUp.length < 7; row++) {
    for (let col = b.colMin; col <= b.colMax && topUp.length < 7; col++) {
      if (col === 9 && row === 9) continue
      topUp.push([col, row])
    }
  }
  await paintTrail(boxAfterPan, topUp)
  await wait(150)
  const breaker = await findButton('THROW BREAKER')
  report.measurements.farCornerBreakerState = breaker
  if (breaker && !breaker.disabled) {
    await clickButtonReal('THROW BREAKER')
    const outcome = await waitForOutcome(9000)
    report.assertions.mobileFarCornerJourneyCompletes = outcome.outcome === 'win' || outcome.outcome === 'bust'
    report.measurements.farCornerJourneyOutcome = outcome.outcome
  } else {
    report.assertions.mobileFarCornerJourneyCompletes = false
    report.notes.push('far-corner journey FAILED to reach an armed BreakerLever — trail did not reach MIN_TRAIL including tile (9,9)')
  }
  await page.screenshot({ path: `${OUT}/${MODE}-farcorner-journey-settled.png` })
}

// ═════════════════════════════════════════════════════════════════════════
// FINAL — clean reload, error summary
// ═════════════════════════════════════════════════════════════════════════
await reload()
report.assertions.cleanStateAfterReload = /ENTER THE ASSAY LINE/.test(await bodyText())

report.smoke7 = {
  '1_http200': report.assertions.a1_http200,
  '2_onboarding_equivalent': report.assertions.a2_onboarding_equivalent,
  '3_full_loop': report.assertions.a3_fullLoopReachesSettled,
  '4_no_overlay_covers_canvas': [
    report.assertions.a4_noOverlay_planning,
    report.assertions.a4_noOverlay_active,
    report.assertions.a4_noOverlay_settled,
  ].every(Boolean),
  '5_visible_response_within_100ms': report.assertions.a5_visibleResponseWithin100ms,
  '6_cashout_equivalent_reachable': report.assertions.a6_playSafeReachableDuringActive,
  '7_glassbox_on_settle': report.assertions.a7_glassBoxOnSettle,
}
report.smoke7Verdict = Object.values(report.smoke7).every((v) => v === true)
report.errors = errors
report.consoleErrors = consoleErrors
report.totalDurationMs = Date.now() - t0

fs.writeFileSync(`${OUT}/${MODE}-report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
process.exit(errors.length === 0 ? 0 : 1)
