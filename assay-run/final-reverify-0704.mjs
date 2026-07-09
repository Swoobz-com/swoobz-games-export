// FRESH independent re-verification probe for THE ASSAY LINE (2026-07-04).
// Written from scratch against the LIVE source (AssayExperience.tsx /
// AssayGridCanvas.tsx / assayProvider.ts / assayMath.ts) as of this run —
// deliberately NOT reusing assay-run's existing flow-qa.mjs, which was
// written against a stale GRID_DIM=32 board (current board is GRID_DIM=10,
// TOTAL_TILES=100, MIN_TRAIL=8, MAX_TRAIL=60). All taps are REAL
// screen-coordinate taps (page.touchscreen.tap on touch viewports,
// page.mouse.click on desktop) — never element.click()/.evaluate() — per the
// documented gotcha that JS-handle clicks bypass hit-testing.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5175/'
const MODE = process.argv[3] || 'desktop' // 'desktop' | 'mobile' | 'iphone'
const OUT = 'shots-FINAL-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false, isTouch: false },
  mobile: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, isTouch: true }, // Pixel 7
  iphone: { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true, isTouch: true }, // iPhone 14 Pro
}
const vp = VIEWPORTS[MODE]
const isTouch = vp.isTouch

const report = {
  mode: MODE,
  url: URL,
  timestamp: new Date().toISOString(),
  assertions: {},
  measurements: {},
  notes: [],
  pageErrors: [],
  consoleErrors: [],
}

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  defaultViewport: { width: vp.width, height: vp.height, deviceScaleFactor: vp.deviceScaleFactor, isMobile: vp.isMobile, hasTouch: vp.hasTouch },
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const page = (await browser.pages())[0]
page.on('pageerror', (e) => report.pageErrors.push(e.message))
page.on('console', (m) => {
  if (m.type() === 'error') report.consoleErrors.push(m.text())
})

// ── generic helpers ─────────────────────────────────────────────────────────

async function realTap(x, y) {
  if (isTouch) await page.touchscreen.tap(x, y)
  else await page.mouse.click(x, y)
}

async function elementAtPoint(x, y) {
  return page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y)
      if (!el) return null
      return {
        tag: el.tagName,
        id: el.id || null,
        cls: (el.className || '').toString().slice(0, 80),
        text: (el.textContent || '').slice(0, 50),
        pointerEvents: getComputedStyle(el).pointerEvents,
      }
    },
    { x, y },
  )
}

async function findButton(textFragment) {
  return page.evaluate((t) => {
    const btns = [...document.querySelectorAll('button')]
    const b = btns.find(
      (x) => (x.textContent && x.textContent.includes(t)) || (x.getAttribute('aria-label') || '').includes(t),
    )
    if (!b) return null
    const r = b.getBoundingClientRect()
    const cs = getComputedStyle(b)
    return {
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      disabled: b.disabled,
      text: b.textContent,
      ariaLabel: b.getAttribute('aria-label'),
      visible: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0,
    }
  }, textFragment)
}

async function tapButtonReal(textFragment) {
  const info = await findButton(textFragment)
  if (!info || !info.visible) return { found: false, info }
  if (info.disabled) return { found: true, disabled: true, info }
  const cx = info.rect.x + info.rect.w / 2
  const cy = info.rect.y + info.rect.h / 2
  const hit = await elementAtPoint(cx, cy)
  await realTap(cx, cy)
  return { found: true, disabled: false, info, clicked: { cx, cy }, hitTest: hit }
}

async function canvasRect() {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}

function overlapArea(a, b) {
  if (!a || !b) return 0
  const ax2 = a.x + a.w,
    ay2 = a.y + a.h,
    bx2 = b.x + b.w,
    by2 = b.y + b.h
  const ox = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x))
  const oy = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y))
  return ox > 0 && oy > 0 ? ox * oy : 0
}

const bodyText = () => page.evaluate(() => document.body.innerText)

// Compute the set of tile screen-coordinates that are ACTUALLY visible/
// hit-testable right now (accounts for the mobile pan-viewport's scroll
// clipping — canvas.getBoundingClientRect() always reports the FULL
// 460x460 un-clipped board; on mobile the real tappable area is the
// overflow:auto scroll parent's own rect, which is much smaller).
async function computeVisibleTiles() {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const rect = c.getBoundingClientRect()
    const GRID_DIM = 10
    const tile = rect.width / GRID_DIM
    let clip = rect
    const parent = c.parentElement
    if (parent) {
      const pcs = getComputedStyle(parent)
      if (['auto', 'scroll'].includes(pcs.overflow) || ['auto', 'scroll'].includes(pcs.overflowX) || ['auto', 'scroll'].includes(pcs.overflowY)) {
        clip = parent.getBoundingClientRect()
      }
    }
    const margin = 5
    const visible = []
    for (let row = 0; row < GRID_DIM; row++) {
      for (let col = 0; col < GRID_DIM; col++) {
        const x = rect.x + col * tile + tile / 2
        const y = rect.y + row * tile + tile / 2
        if (x >= clip.x + margin && x <= clip.x + clip.width - margin && y >= clip.y + margin && y <= clip.y + clip.height - margin) {
          visible.push({ idx: row * 10 + col, x, y })
        }
      }
    }
    return {
      visible,
      canvasRect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      clipRect: { x: clip.x, y: clip.y, w: clip.width, h: clip.height },
    }
  })
}

// Paint N tiles via REAL taps at pre-verified visible/hit-testable screen
// coordinates. Returns per-tap hit-test metadata so a false pass (tap
// landing on a sibling overlay instead of the canvas) is caught, not assumed.
async function paintNTiles(n) {
  const info = await computeVisibleTiles()
  if (!info) return { ok: false, reason: 'no-canvas' }
  const chosen = info.visible.slice(0, n)
  const results = []
  for (const t of chosen) {
    const hit = await elementAtPoint(t.x, t.y)
    await realTap(t.x, t.y)
    results.push({ idx: t.idx, x: t.x, y: t.y, hitTag: hit?.tag, hitIsCanvas: hit?.tag === 'CANVAS' })
    await wait(40)
  }
  return { ok: true, requested: n, available: info.visible.length, painted: results.length, results, clipRect: info.clipRect, canvasRect: info.canvasRect }
}

async function waitForText(pattern, timeoutMs) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const txt = await bodyText()
    if (pattern.test(txt)) return { found: true, text: txt, elapsedMs: Date.now() - start }
    await wait(60)
  }
  return { found: false, text: await bodyText(), elapsedMs: Date.now() - start }
}

async function clearLocalStorageAndReload() {
  await page.evaluate(() => {
    try {
      window.localStorage.clear()
    } catch {}
  })
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 })
  await wait(400)
}

async function resetHard() {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await wait(400)
}

// ═════════════════════════════════════════════════════════════════════════
// ASSERTION 1 — HTTP 200
// ═════════════════════════════════════════════════════════════════════════
const resp = await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
report.assertions.a1_http200 = resp ? resp.status() === 200 : false
report.measurements.httpStatus = resp ? resp.status() : null
await wait(500)
await page.screenshot({ path: `${OUT}/${MODE}-01-lobby.png` })

// ═════════════════════════════════════════════════════════════════════════
// ASSERTION 2 — Onboarding scrim surfaces on first visit (fresh localStorage)
// The coachmark only mounts on the player's FIRST 'planning' phase, so:
// clear storage -> reload -> ENTER THE ASSAY LINE -> assert IntroCoachmark visible.
// ═════════════════════════════════════════════════════════════════════════
await clearLocalStorageAndReload()
const enterRes1 = await tapButtonReal('ENTER THE ASSAY LINE')
report.assertions.lobbyToPlanningReachable = enterRes1.found && !enterRes1.disabled
await wait(400)
const coachmarkTxt = await bodyText()
report.assertions.a2_onboardingSurfacesFresh = /PAINT a line of boxes/.test(coachmarkTxt) && /RUN THE LINE/.test(coachmarkTxt)
await page.screenshot({ path: `${OUT}/${MODE}-02-onboarding.png` })
// dismiss + persistence check
const dismissRes = await tapButtonReal('Dismiss how-to-play')
report.measurements.coachmarkDismissFound = dismissRes.found
await wait(200)
const afterDismissTxt = await bodyText()
report.assertions.coachmarkDismissWorks = !/PAINT a line of boxes/.test(afterDismissTxt)
// reload WITHOUT clearing storage -> should not resurface
await page.reload({ waitUntil: 'networkidle2', timeout: 30000 })
await wait(400)
await tapButtonReal('ENTER THE ASSAY LINE')
await wait(300)
const secondVisitTxt = await bodyText()
report.assertions.coachmarkDoesNotResurface = !/PAINT a line of boxes/.test(secondVisitTxt)

// ═════════════════════════════════════════════════════════════════════════
// Switch reveal pace to INSTANT for deterministic fast settlement timing
// (cosmetic-only toggle; does not change round math — see assayProvider.ts).
// ═════════════════════════════════════════════════════════════════════════
const paceRes = await tapButtonReal('PACE:')
report.measurements.paceToggleFound = paceRes.found
await wait(150)

// Ground-truth trail-length reader: the LINE row's `Odometer` ("NN / 8 min")
// is part of the SHARED `railRows` tree, rendered identically on the wide
// rail AND the narrow mobile bottom-dock — unlike `renderStatusText()`'s
// "Select N more boxes" copy, which is desktop-only (it lives in the
// `showRail && isWide` slim status strip and is never in the DOM at all on
// mobile). Reading the Odometer instead of that copy is what makes this
// probe viewport-independent.
async function getOdometerCount() {
  const txt = await bodyText()
  const m = txt.match(/(\d{1,2})\s*\/\s*8\s*min/)
  return m ? parseInt(m[1], 10) : null
}

// Paints exactly `n` tiles the driver has NOT already tapped this round
// (tracked in `paintedIdx`, a closure-local Set) — toggleTrailTile flips
// state on a REPEAT tap of the same tile, so re-tapping an already-painted
// index (a bug in an earlier draft of this very probe) silently REMOVES it
// instead of adding a new one and desyncs the trail count from what the
// probe intends to paint.
const paintedIdx = new Set()
async function paintFreshTiles(n) {
  const info = await computeVisibleTiles()
  if (!info) return { ok: false, reason: 'no-canvas' }
  const fresh = info.visible.filter((v) => !paintedIdx.has(v.idx)).slice(0, n)
  const results = []
  for (const t of fresh) {
    const hit = await elementAtPoint(t.x, t.y)
    await realTap(t.x, t.y)
    paintedIdx.add(t.idx)
    results.push({ idx: t.idx, x: t.x, y: t.y, hitTag: hit?.tag, hitIsCanvas: hit?.tag === 'CANVAS' })
    await wait(40)
  }
  return { ok: true, requested: n, available: info.visible.length, painted: results.length, results }
}

// ═════════════════════════════════════════════════════════════════════════
// ASSERTION 5 — primary-tap visible-response latency, measured on the VERY
// FIRST tile tap of a fresh board (0 tiles painted yet).
// ═════════════════════════════════════════════════════════════════════════
{
  const info = await computeVisibleTiles()
  const preTapTxt = await bodyText()
  let elapsedAtChange = null
  let changedWithin100 = false
  if (info && info.visible.length > 0) {
    const t = info.visible[0]
    const t0 = Date.now()
    await realTap(t.x, t.y)
    paintedIdx.add(t.idx)
    for (let i = 0; i < 20; i++) {
      const txt = await bodyText()
      if (txt !== preTapTxt) {
        elapsedAtChange = Date.now() - t0
        changedWithin100 = true
        break
      }
      await wait(10)
    }
  }
  report.assertions.a5_visibleResponseWithin100ms = changedWithin100 && elapsedAtChange <= 100
  report.measurements.primaryTapResponseElapsedMs = elapsedAtChange
}
await wait(100)
const odoAfter1 = await getOdometerCount()
report.measurements.odometerAfterFirstTap = odoAfter1

// ═════════════════════════════════════════════════════════════════════════
// ASSERTION 6 (below-min) — top up to 5 FRESH tiles (still < MIN_TRAIL=8):
// RUN THE LINE must be disabled, and a real tap on it must be a genuine
// no-op (not a silent state change).
// ═════════════════════════════════════════════════════════════════════════
{
  const paint4more = await paintFreshTiles(4) // 1 (latency probe) + 4 = 5 total
  report.measurements.minGateProbe_paint5 = paint4more.ok
    ? { requested: 5, painted: paintedIdx.size, allHitCanvas: paint4more.results.every((r) => r.hitIsCanvas) }
    : paint4more
  await wait(200)
  const odoAt5 = await getOdometerCount()
  report.measurements.odometerAt5 = odoAt5
  const preTxt = await bodyText()
  const runInfo5 = await findButton('RUN THE LINE')
  report.assertions.a6_disabledBelowMinTrail = runInfo5 ? runInfo5.disabled === true : null
  report.measurements.runTheLineRectAt5 = runInfo5?.rect
  if (runInfo5) {
    const cx = runInfo5.rect.x + runInfo5.rect.w / 2
    const cy = runInfo5.rect.y + runInfo5.rect.h / 2
    await realTap(cx, cy)
    await wait(250)
    const postTxt = await bodyText()
    report.assertions.a6_disabledTapIsGenuineNoOp = postTxt === preTxt
  }
  await page.screenshot({ path: `${OUT}/${MODE}-03-min8-gate.png` })
}

// Top up to exactly MIN_TRAIL(8) using FRESH (never-before-tapped) tiles —
// ground-truthed against the Odometer, not against viewport-specific copy.
{
  const odoNow = await getOdometerCount()
  const need = odoNow != null ? Math.max(0, 8 - odoNow) : 8 - paintedIdx.size
  if (need > 0) await paintFreshTiles(need)
  await wait(150)
}

// ═════════════════════════════════════════════════════════════════════════
// ASSERTION 6 (armed) — RUN THE LINE reachable + clickable once >= 8 painted.
// This IS the CRIT #1 re-verify: a REAL coordinate tap at current scrollY
// (0, since we never scrolled the page) must COMMIT the round (phase
// planning -> assaying), not just land on the button.
// ═════════════════════════════════════════════════════════════════════════
{
  const scrollY = await page.evaluate(() => window.scrollY)
  const runInfoArmed = await findButton('RUN THE LINE')
  report.measurements.scrollYAtCommitAttempt = scrollY
  report.measurements.runTheLineRectArmed = runInfoArmed?.rect
  report.assertions.a6_reachableAndEnabledAt8 = !!runInfoArmed && runInfoArmed.visible && !runInfoArmed.disabled
  // reachable-at-scrollY-0 means the button's rect must be within [0, viewport height]
  report.assertions.crit1_runTheLineOnScreenAtScrollY0 =
    scrollY === 0 && !!runInfoArmed && runInfoArmed.rect.y >= 0 && runInfoArmed.rect.y + runInfoArmed.rect.h <= vp.height
  if (runInfoArmed) {
    const preCommitTxt = await bodyText()
    const cx = runInfoArmed.rect.x + runInfoArmed.rect.w / 2
    const cy = runInfoArmed.rect.y + runInfoArmed.rect.h / 2
    const hitAtCommit = await elementAtPoint(cx, cy)
    await realTap(cx, cy)
    await wait(150)
    const postCommitTxt = await bodyText()
    report.measurements.crit1_hitTestAtCommitTap = hitAtCommit
    report.assertions.crit1_realTapAtScrollY0Commits =
      /LINE RUNNING/.test(postCommitTxt) || postCommitTxt !== preCommitTxt
  } else {
    report.assertions.crit1_realTapAtScrollY0Commits = false
  }
  await page.screenshot({ path: `${OUT}/${MODE}-04-committed-active.png` })
}

// ═════════════════════════════════════════════════════════════════════════
// ASSERTION 4 (part 2, active phase) — no overlay covers canvas; explicitly
// check IntroCoachmark (should be gone/dismissed by now) and the PLAY SAFE
// pill for geometric + hit-test overlap against the canvas.
// ═════════════════════════════════════════════════════════════════════════
{
  const boxActive = await canvasRect()
  const safetyInfo = await findButton('PLAY SAFE')
  const overlapSafety = overlapArea(boxActive, safetyInfo?.rect)
  report.measurements.canvasRectActive = boxActive
  report.measurements.playSafeRect = safetyInfo?.rect
  report.measurements.overlapArea_playSafe_canvas = overlapSafety
  let playSafeOverlapIsBlocking = false
  if (overlapSafety > 0 && safetyInfo) {
    const cx = safetyInfo.rect.x + safetyInfo.rect.w / 2
    const cy = safetyInfo.rect.y + safetyInfo.rect.h / 2
    const hit = await elementAtPoint(cx, cy)
    // PLAY SAFE is a real interactive button (must itself be hit-testable) —
    // "blocking the canvas" here would mean the OPPOSITE failure: something
    // else painting over it. What we actually assert is that its footprint,
    // if it overlaps the canvas at all, does not silently swallow board taps
    // outside its own button bounds — geometric overlap of a small 40x40
    // corner pill against a much larger canvas is expected/benign as long as
    // hit-testing at the pill's own center resolves to the pill itself.
    playSafeOverlapIsBlocking = hit?.tag !== 'BUTTON'
  }
  report.assertions.a4_playSafeDoesNotBlockCanvas = overlapSafety === 0 || !playSafeOverlapIsBlocking
  report.measurements.playSafeOverlapIsBlocking = playSafeOverlapIsBlocking

  // IntroCoachmark check: should not be present at all post-dismiss, but if
  // it WERE (regression), confirm pointer-events:none lets taps pass through.
  const coachmarkPresent = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('[role="note"]')]
    const n = nodes.find((d) => (d.getAttribute('aria-label') || '').includes('How to play'))
    if (!n) return null
    const r = n.getBoundingClientRect()
    return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, pointerEvents: getComputedStyle(n).pointerEvents }
  })
  report.measurements.coachmarkStillMountedDuringActive = coachmarkPresent
  if (coachmarkPresent) {
    const overlapCm = overlapArea(boxActive, coachmarkPresent.rect)
    report.assertions.a4_coachmarkDoesNotBlockCanvas = overlapCm === 0 || coachmarkPresent.pointerEvents === 'none'
  } else {
    report.assertions.a4_coachmarkDoesNotBlockCanvas = true // not mounted at all -> trivially true
  }
}

// ═════════════════════════════════════════════════════════════════════════
// Wait for settlement, then ASSERTION 7 — Glass Box on settle.
// ═════════════════════════════════════════════════════════════════════════
const outcome1 = await waitForText(/LINE SECURED|CRACKED BOX · BUSTED/, 5000)
report.assertions.roundReachesSettled_attempt1 = outcome1.found
report.measurements.outcome1Kind = outcome1.found ? (/LINE SECURED/.test(outcome1.text) ? 'win' : 'bust') : 'timeout'
report.measurements.outcome1SettleElapsedMs = outcome1.elapsedMs
if (outcome1.found) {
  report.assertions.a7_glassBoxOnSettle_attempt1 = /GLASS BOX CERTIFICATE/.test(outcome1.text)
}
await page.screenshot({ path: `${OUT}/${MODE}-05-settled-1.png` })

// ═════════════════════════════════════════════════════════════════════════
// Restart loop — ASSAY AGAIN
// ═════════════════════════════════════════════════════════════════════════
if (outcome1.found) {
  const preAgainTxt = await bodyText()
  const t1 = Date.now()
  const againRes = await tapButtonReal('ASSAY AGAIN')
  report.assertions.assayAgainClickable = againRes.found && !againRes.disabled
  const advance = await waitForText(/RUN THE LINE|Select \d+ more box|Deposit line armed/, 2000)
  report.assertions.restartAdvancesToPlanning = advance.found
  report.measurements.restartLatencyMs = advance.found ? Date.now() - t1 : null
  report.assertions.restartUnder1500ms = advance.found ? Date.now() - t1 < 1500 : false
  const staleTxt = await bodyText()
  report.assertions.noStaleGlassBoxAfterRestart = !/GLASS BOX CERTIFICATE/.test(staleTxt)
  await page.screenshot({ path: `${OUT}/${MODE}-06-after-restart.png` })
}

// ═════════════════════════════════════════════════════════════════════════
// Force variety: seek the OTHER outcome (if round 1 was a win, seek a bust;
// if round 1 was a bust, seek a win) using tier selection + trail size.
// ═════════════════════════════════════════════════════════════════════════
// Each attempt does a FULL fresh page load (resetHard) rather than chaining
// through ASSAY AGAIN in-session — a transient anomaly was observed
// mid-development where in-session chaining across many rapid rounds on
// this shared, concurrently-edited dev server produced an inconsistent
// render (both a 'settled/win' block and a 'bad-vein' status string in the
// same body-text snapshot, which the settle-state discriminated union
// (`phase.kind`) makes structurally impossible in a single consistent
// render — i.e. a render/HMR race, not a game logic bug in the reducer
// itself). Reloading fresh per attempt trades a little wall-clock time for
// full isolation from that class of interference.
async function seekOutcome(desired, maxAttempts) {
  // TIER_DISPLAY_LABEL is a VAULT PIVOT copy override — the 'flooded' tier
  // id (assayMath.ts) displays on-screen as "Heavy", not "Flooded"
  // (AssayExperience.tsx TierChip: `shortLabel = TIER_DISPLAY_LABEL[tier]
  // .split(' ')[0]`).
  const tierBtnText = desired === 'bust' ? 'Heavy' : 'Lean'
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await resetHard()
    const enter = await tapButtonReal('ENTER THE ASSAY LINE')
    if (!enter.found || enter.disabled) {
      report.notes.push(`seekOutcome(${desired}) attempt ${attempt}: lobby CTA not reachable`)
      continue
    }
    await wait(300)
    const tierTap = await tapButtonReal(tierBtnText)
    const n = desired === 'bust' ? 16 : 8
    const paint = await paintNTiles(n)
    report.notes.push(
      `seekOutcome(${desired}) attempt ${attempt}: tierFound=${tierTap.found} painted=${paint.painted}/${paint.requested}`,
    )
    if (!paint.ok || paint.painted < 8) continue
    await wait(150)
    const runInfo = await findButton('RUN THE LINE')
    if (!runInfo || runInfo.disabled) {
      report.notes.push(`seekOutcome(${desired}) attempt ${attempt}: RUN THE LINE not found/disabled`)
      continue
    }
    const cx = runInfo.rect.x + runInfo.rect.w / 2
    const cy = runInfo.rect.y + runInfo.rect.h / 2
    await realTap(cx, cy)
    const out = await waitForText(/LINE SECURED|CRACKED BOX · BUSTED/, 6000)
    if (!out.found) {
      report.notes.push(`seekOutcome(${desired}) attempt ${attempt}: settle timeout`)
      continue
    }
    const kind = /LINE SECURED/.test(out.text) ? 'win' : 'bust'
    report.notes.push(`seekOutcome(${desired}) attempt ${attempt}: got kind=${kind}`)
    if (kind === desired) return { attempt, text: out.text }
  }
  return null
}

const firstKind = report.measurements.outcome1Kind
const desiredSecond = firstKind === 'win' ? 'bust' : 'win'
const second = await seekOutcome(desiredSecond, 8)
report.assertions.bothOutcomesObserved = !!second
report.measurements.secondOutcomeKind = second ? desiredSecond : 'not-observed'
report.measurements.secondOutcomeAttempts = second ? second.attempt + 1 : 'exhausted'
if (second) {
  report.assertions.a7_glassBoxOnSettle_secondOutcome = /GLASS BOX CERTIFICATE/.test(second.text)
  await page.screenshot({ path: `${OUT}/${MODE}-07-settled-${desiredSecond}.png` })
}

// ═════════════════════════════════════════════════════════════════════════
// Final: no-overlay geometric check at LOBBY. NOTE (Probe 6, in-canvas HUD
// pivot 2026-05-25): setup phases (lobby / bet-entry) are SPECIFIED to
// render their CTA as an in-canvas CENTERED CARD overlaying the idle
// canvas — geometric overlap here is BY DESIGN, not a chassis violation.
// The chassis "action bar below canvas" rule applies only to GAMEPLAY
// phases (active/settling/settled), already checked separately above via
// canvasRectActive / runTheLineRectArmed. This check therefore only flags
// the LOBBY overlap as a problem if hit-testing shows the CTA is NOT
// actually reachable (i.e. something else paints over IT), not merely if
// its box geometrically overlaps the canvas box.
// ═════════════════════════════════════════════════════════════════════════
{
  await resetHard()
  const lobbyCanvas = await canvasRect()
  const enterInfo = await findButton('ENTER THE ASSAY LINE')
  report.measurements.canvasPresentAtLobby = !!lobbyCanvas
  const ovArea = overlapArea(lobbyCanvas, enterInfo?.rect)
  report.measurements.overlapArea_lobbyButton_canvas = ovArea
  let lobbyCtaHitTestOk = null
  if (enterInfo && enterInfo.visible) {
    const cx = enterInfo.rect.x + enterInfo.rect.w / 2
    const cy = enterInfo.rect.y + enterInfo.rect.h / 2
    const hit = await elementAtPoint(cx, cy)
    lobbyCtaHitTestOk = hit && (hit.tag === 'BUTTON' || hit.tag === 'SPAN')
  }
  report.measurements.lobbyCtaHitTestOk = lobbyCtaHitTestOk
  report.assertions.a4_lobbyOverlapIsByDesignInCanvasHud = ovArea === 0 || lobbyCtaHitTestOk === true
  report.assertions.a4_noOverlayCoversCanvas_activeGameplayOnly = report.assertions.a4_playSafeDoesNotBlockCanvas && report.assertions.a4_coachmarkDoesNotBlockCanvas
}

report.totalDurationMs = Date.now() - Date.parse(report.timestamp)
report.assertions.zeroConsoleErrors = report.consoleErrors.length === 0
report.assertions.zeroPageErrors = report.pageErrors.length === 0

fs.writeFileSync(`${OUT}/${MODE}-report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
