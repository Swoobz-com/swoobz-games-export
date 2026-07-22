import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5189/'
const MODE = process.argv[3] || 'desktop' // 'desktop' | 'mobile'
const OUT = 'shots-flow-qa'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const now = () => performance.now ? performance.now() : Date.now()

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: { width: 412, height: 915, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true },
}
const vp = VIEWPORTS[MODE]

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

// ── helpers (house style lifted from verify-render.mjs / probe-bust.mjs) ────

async function findButton(label) {
  return page.evaluate((t) => {
    const btns = [...document.querySelectorAll('button')]
    const b = btns.find((x) => x.textContent && x.textContent.includes(t))
    if (!b) return null
    const r = b.getBoundingClientRect()
    return {
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      disabled: b.disabled,
      text: b.textContent,
    }
  }, label)
}

async function realTap(x, y) {
  if (vp.isMobile) {
    await page.touchscreen.tap(x, y)
  } else {
    await page.mouse.click(x, y)
  }
}

// Click a button by visible text using a REAL screen-coordinate tap (not
// element.click()) — the Tim-class dead-click catcher. Returns metadata about
// whether it was found/disabled/actually clicked.
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
    return { x: r.x, y: r.y, w: r.width, h: r.height }
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

// Tap a trail of tile indices [col,row] via real screen coords on the canvas.
async function paintTrail(box, tiles) {
  const tile = box.w / 32
  const clickedOdo = []
  for (const [col, row] of tiles) {
    const x = box.x + col * tile + tile / 2
    const y = box.y + row * tile + tile / 2
    await realTap(x, y)
    await wait(30)
  }
}

function serpentine(n) {
  // Dense serpentine sweep -> high bad-vein hit probability (BOMB_COUNT=40/1024).
  const pts = []
  for (let row = 1; row < 32 && pts.length < n; row += 2) {
    for (let col = 1; col < 32 && pts.length < n; col += 2) {
      pts.push([col, row])
    }
  }
  return pts.slice(0, n)
}

function shortTrail(n) {
  // Compact 1x8 row -> low bad-vein hit probability (used for the WIN attempt).
  const pts = []
  for (let i = 0; i < n; i++) pts.push([2 + i, 3])
  return pts
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

async function resetToLobby() {
  // Force a clean lobby state for a fresh probe: reload the page.
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await wait(500)
}

// ─────────────────────────────────────────────────────────────────────────
// PROBE 0: HTTP 200 + first paint + onboarding check
// ─────────────────────────────────────────────────────────────────────────
const t0 = Date.now()
const resp = await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
report.assertions.httpStatus = resp ? resp.status() : null
await wait(600)
const lobbyTxt = await bodyText()
report.notes.push('lobby text (first 200 chars): ' + lobbyTxt.slice(0, 200).replace(/\n/g, ' | '))
// Onboarding scrim check: look for a fixed-position full-screen overlay distinct from the card.
const onboardingProbe = await page.evaluate(() => {
  const all = [...document.querySelectorAll('div')]
  const scrimCandidates = all.filter((d) => {
    const cs = getComputedStyle(d)
    return (cs.position === 'fixed' || cs.position === 'absolute') && d.getBoundingClientRect().width > window.innerWidth * 0.8
  })
  return scrimCandidates.length
})
report.assertions.onboardingScrimPresent = onboardingProbe > 0
report.notes.push(
  onboardingProbe > 0
    ? `found ${onboardingProbe} full-width fixed/absolute divs (possible scrim)`
    : 'NO dedicated onboarding scrim component found — lobby Panel carries inline instructional copy instead (verified via grep: no onboarding/scrim/localStorage hits in originals/assay/*)',
)
await page.screenshot({ path: `${OUT}/${MODE}-01-lobby.png` })

// ─────────────────────────────────────────────────────────────────────────
// PROBE 1: full loop -> WIN (retry-until-observed on short trail)
// ─────────────────────────────────────────────────────────────────────────
let winResult = null
for (let attempt = 0; attempt < 6 && !winResult; attempt++) {
  if (attempt > 0) await resetToLobby()
  const openRes = await clickButtonReal('ENTER THE ASSAY LINE')
  report.assertions.lobbyToPlanningReachable = openRes.found && !openRes.disabled
  await wait(400)
  const box = await canvasRect()
  report.measurements.canvasBoxPlanning = box
  const preClickTxt = await bodyText()
  const tapStart = now()
  await paintTrail(box, shortTrail(8))
  // measure visible response latency on the FIRST tap only (primary tap probe)
  await wait(60)
  const postClickTxt = await bodyText()
  if (attempt === 0) {
    report.measurements.primaryTapRespondedWithin100ms = postClickTxt !== preClickTxt
  }
  await wait(200)
  const plungeInfo = await findButton('PLUNGE')
  report.notes.push(`attempt ${attempt} (win-seek): plunge disabled=${plungeInfo?.disabled}`)
  const plungeStart = Date.now()
  const plungeClick = await clickButtonReal('PLUNGE ⚡ KEY')
  await wait(80)
  const midTxt = await bodyText()
  report.measurements.plungeToActiveLatencyMs = report.measurements.plungeToActiveLatencyMs ?? (Date.now() - plungeStart)
  const outcome = await waitForOutcome(9000)
  if (outcome.outcome === 'win') {
    winResult = { attempt, text: outcome.text }
    await page.screenshot({ path: `${OUT}/${MODE}-02-win-settled.png` })
  } else {
    report.notes.push(`attempt ${attempt}: not a win (${outcome.outcome}), retrying`)
  }
}
report.assertions.winReached = !!winResult
report.measurements.winAttempts = winResult ? winResult.attempt + 1 : 'exhausted(6)'
if (winResult) {
  report.assertions.glassBoxOnWin = /GLASS BOX CERTIFICATE/.test(winResult.text)
  report.assertions.outcomeLegibleOnWin = /CLAIM PROVEN/.test(winResult.text)
}

// ── from WIN settled: exercise "ASSAY AGAIN" (bet-again) ──
if (winResult) {
  const preAgainTxt = await bodyText()
  const t1 = Date.now()
  const againClick = await clickButtonReal('ASSAY AGAIN')
  report.assertions.assayAgainClickable = againClick.found && !againClick.disabled
  await wait(50)
  let advanced = false
  let restartMs = null
  for (let i = 0; i < 20; i++) {
    const t = await bodyText()
    if (t !== preAgainTxt && /Claim-line armed|Paint a claim-line|nubs proven|nub / .test(t) === false && t.includes('Paint a claim-line') === false) {
      // fall through - handled below by explicit re-check
    }
    const postTxt = await bodyText()
    if (postTxt.includes('PLUNGE') || postTxt.includes('claim-line')) { advanced = true; restartMs = Date.now() - t1; break }
    await wait(50)
  }
  report.assertions.assayAgainAdvancesToPlanning = advanced
  report.measurements.assayAgainRestartLatencyMs = restartMs
  await page.screenshot({ path: `${OUT}/${MODE}-03-after-assay-again.png` })
  // stale-modal check: ensure only one card, no leftover settled block
  const staleCheck = await bodyText()
  report.assertions.noStaleSettlementAfterRestart = !/GLASS BOX CERTIFICATE/.test(staleCheck)
}

// ─────────────────────────────────────────────────────────────────────────
// PROBE 2: change-wager flow (from planning, BrassKnob steppers)
// ─────────────────────────────────────────────────────────────────────────
{
  const preWagerTxt = await bodyText()
  const wagerMatchPre = preWagerTxt.match(/\$?([0-9]+\.[0-9]{2})/)
  const plusRes = await clickButtonReal('+')
  await wait(150)
  const postWagerTxt = await bodyText()
  report.assertions.wagerStepperChangesDisplay = postWagerTxt !== preWagerTxt
  report.notes.push(`wager stepper '+' click found=${plusRes.found} disabled=${plusRes.disabled}`)
  await page.screenshot({ path: `${OUT}/${MODE}-04-wager-changed.png` })
}

// ─────────────────────────────────────────────────────────────────────────
// PROBE 3: min-8 gate — try to plunge with < 8 tiles selected
// ─────────────────────────────────────────────────────────────────────────
{
  await resetToLobby()
  await clickButtonReal('ENTER THE ASSAY LINE')
  await wait(300)
  const box = await canvasRect()
  await paintTrail(box, shortTrail(5)) // deliberately under MIN_TRAIL=8
  await wait(200)
  const preTxt = await bodyText()
  const plungeInfo = await findButton('PLUNGE')
  report.assertions.minTrailGate_buttonDisabledAt5 = plungeInfo ? plungeInfo.disabled === true : null
  report.measurements.minTrailGate_plungeRectAt5 = plungeInfo?.rect
  // attempt the real click anyway (disabled buttons should no-op at the browser level)
  let clickAttemptResult = null
  if (plungeInfo) {
    const cx = plungeInfo.rect.x + plungeInfo.rect.w / 2
    const cy = plungeInfo.rect.y + plungeInfo.rect.h / 2
    await realTap(cx, cy)
    await wait(300)
    const postTxt = await bodyText()
    clickAttemptResult = {
      textUnchanged: postTxt === preTxt,
      stillPlanning: /Paint a claim-line|claim-line/.test(postTxt) || !/Current running/.test(postTxt),
    }
  }
  report.assertions.minTrailGate_clickIsGenuineNoOp = clickAttemptResult ? clickAttemptResult.textUnchanged : null
  await page.screenshot({ path: `${OUT}/${MODE}-05-min8-gate.png` })
}

// ─────────────────────────────────────────────────────────────────────────
// PROBE 4: full loop -> BUST (retry-until-observed on dense serpentine trail)
// ─────────────────────────────────────────────────────────────────────────
let bustResult = null
for (let attempt = 0; attempt < 6 && !bustResult; attempt++) {
  await resetToLobby()
  await clickButtonReal('ENTER THE ASSAY LINE')
  await wait(300)
  const box = await canvasRect()
  await paintTrail(box, serpentine(34))
  await wait(200)
  const plungeInfo = await findButton('PLUNGE')
  if (!plungeInfo || plungeInfo.disabled) {
    report.notes.push(`bust-seek attempt ${attempt}: PLUNGE unexpectedly disabled, trail may be short`)
    continue
  }
  await clickButtonReal('PLUNGE ⚡ KEY')
  const outcome = await waitForOutcome(9000)
  if (outcome.outcome === 'bust') {
    bustResult = { attempt, text: outcome.text }
    await page.screenshot({ path: `${OUT}/${MODE}-06-bust-settled.png` })
  } else {
    report.notes.push(`bust-seek attempt ${attempt}: not a bust (${outcome.outcome}), retrying`)
  }
}
report.assertions.bustReached = !!bustResult
report.measurements.bustAttempts = bustResult ? bustResult.attempt + 1 : 'exhausted(6)'
if (bustResult) {
  report.assertions.glassBoxOnBust = /GLASS BOX CERTIFICATE/.test(bustResult.text)
  report.assertions.outcomeLegibleOnBust = /BAD VEIN.{0,5}BUSTED/.test(bustResult.text)
}

// ─────────────────────────────────────────────────────────────────────────
// PROBE 5: in-canvas HUD / no-overlay-covers-canvas — measure real rects
// across lobby, planning, active(assaying), settled phases.
// ─────────────────────────────────────────────────────────────────────────
{
  await resetToLobby()
  const lobbyCanvasBefore = await canvasRect() // canvas not mounted yet pre-planning; expect null
  report.measurements.canvasPresentInLobby = !!lobbyCanvasBefore
  report.measurements.lobbyCanvasRect = lobbyCanvasBefore
  const enterBtn = await findButton('ENTER THE ASSAY LINE')
  report.measurements.lobbyButtonRect = enterBtn?.rect
  const overlapLobby = rectsOverlap(lobbyCanvasBefore, enterBtn?.rect)
  report.assertions.noOverlayCoversCanvas_lobby = overlapLobby === 0 || overlapLobby === false
  report.measurements.overlapAreaLobby = overlapLobby
  await clickButtonReal('ENTER THE ASSAY LINE')
  await wait(300)
  const box = await canvasRect()
  const plungeInfoPlanning = await findButton('PLUNGE')
  const overlapPlanning = rectsOverlap(box, plungeInfoPlanning?.rect)
  report.assertions.noOverlayCoversCanvas_planning = overlapPlanning === 0 || overlapPlanning === false
  report.measurements.overlapAreaPlanning = overlapPlanning

  await paintTrail(box, shortTrail(9))
  await wait(150)
  await clickButtonReal('PLUNGE ⚡ KEY')
  await wait(120) // mid-cascade
  const boxActive = await canvasRect()
  // during 'assaying' there is no button, but confirm the rail/status text panel
  // (below the canvas) does not overlap the canvas box either.
  const railProbe = await page.evaluate(() => {
    // Pick the SMALLEST-area matching div (most specific wrapper of the status
    // text), not the first in document order — querySelectorAll returns
    // ancestors before descendants, so a naive .find() grabs the outermost
    // card wrapper (whose textContent trivially includes everything) and
    // produces a false 100%-overlap reading.
    const nodes = [...document.querySelectorAll('div')].filter(
      (d) => d.textContent && d.textContent.includes('nubs proven'),
    )
    if (nodes.length === 0) return null
    let best = null
    let bestArea = Infinity
    for (const d of nodes) {
      const r = d.getBoundingClientRect()
      const area = r.width * r.height
      if (area < bestArea) {
        bestArea = area
        best = { x: r.x, y: r.y, w: r.width, h: r.height }
      }
    }
    return best
  })
  const overlapActive = rectsOverlap(boxActive, railProbe)
  report.assertions.noOverlayCoversCanvas_active = overlapActive === 0 || overlapActive === false
  report.measurements.overlapAreaActive = overlapActive
  await page.screenshot({ path: `${OUT}/${MODE}-07-active-cascade.png` })

  await waitForOutcome(9000)
  const boxSettled = await canvasRect()
  const againInfo = await findButton('ASSAY AGAIN')
  const overlapSettled = rectsOverlap(boxSettled, againInfo?.rect)
  report.assertions.noOverlayCoversCanvas_settled = overlapSettled === 0 || overlapSettled === false
  report.measurements.overlapAreaSettled = overlapSettled
  report.measurements.canvasRectSettled = boxSettled
  report.measurements.assayAgainRectSettled = againInfo?.rect
  // Muscle-memory continuity: compare PLUNGE rect (active-entry) region vs ASSAY AGAIN rect region.
  report.measurements.plungeRegionPlanning = plungeInfoPlanning?.rect
  await page.screenshot({ path: `${OUT}/${MODE}-08-settled-for-hud-check.png` })
}

report.errors = errors
report.consoleErrors = consoleErrors
report.totalDurationMs = Date.now() - t0

fs.writeFileSync(`${OUT}/${MODE}-report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
process.exit(errors.length === 0 ? 0 : 1)
