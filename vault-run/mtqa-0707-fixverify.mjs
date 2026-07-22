// mtqa-0707-fixverify.mjs — INDEPENDENT swoobz-mobile-touch-qa verification of
// THREE maker-reported fixes on RUG OR RICHES (vault):
//   FIX #2 — mobile DOM HUD band never overlaps the board's first tile row
//   FIX #3 — settled BET AGAIN fully above the fold (real-chrome visual viewport)
//   FIX #6 — BetConsole touch targets >=44x44 effective + touch-action:manipulation
// SELF-CONTAINED: spawns its OWN fresh vite dev server (port from argv[2] or
// 5313), drives everything with puppeteer-core + system Chrome, prints one
// full report to STDOUT, then kills its own dev server + browser before
// exiting. Run in the FOREGROUND: `node mtqa-0707-fixverify.mjs`.
import puppeteer from 'puppeteer-core'
import { spawn } from 'node:child_process'
import { execSync } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = Number(process.argv[2] || 5313)
const OUT = path.join(__dirname, 'shots-mtqa-0707-fixverify')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Devices under test ──────────────────────────────────────────────────
// Raw CSS viewport sizes match this repo's own mobile-touch-qa convention
// (Pixel 7 = 412x915 default, iPhone 14 Pro = 393x852 secondary). On TOP of
// that we apply a documented "real mobile browser chrome" reserve to
// simulate the SMALL (worst-case, chrome-expanded, first-load-before-scroll)
// visual viewport a real user actually sees — this is exactly the gap
// 100dvh is designed to protect against and 100vh is not. Reserve figures
// are industry-cited approximations (Android Chrome collapsible top
// toolbar+status bar; iOS Safari compact top bar + bottom tab bar), NOT
// measured off this exact physical device — documented here so the
// assumption is auditable rather than a silent magic number.
const DEVICES = [
  { name: 'Pixel7', w: 412, h: 915, dsf: 2.625, chromeReservePx: 91, chromeNote: 'Android Chrome: ~24px status bar + ~56px collapsible top toolbar + ~11px slack (worst-case, pre-scroll)' },
  { name: 'iPhone14Pro', w: 393, h: 852, dsf: 3, chromeReservePx: 111, chromeNote: 'iOS Safari: ~44pt compact top bar + ~50pt bottom tab bar + ~17pt slack (worst-case, pre-scroll); consistent with WebKit-documented large/small viewport deltas' },
]
const WORLDS = [
  { key: 'bluechips', testid: 'vault-world-card-bluechips', gridSize: 5 },
  { key: 'shitcoin', testid: 'vault-world-card-shitcoin', gridSize: 7 },
]

// ── Dev server lifecycle ────────────────────────────────────────────────
function waitForServer(port, timeoutMs = 40000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get({ host: 'localhost', port, path: '/', timeout: 2000 }, (res) => {
        res.resume()
        resolve(true)
      })
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error('dev server did not come up in time'))
        else setTimeout(tryOnce, 500)
      })
      req.on('timeout', () => {
        req.destroy()
        if (Date.now() - start > timeoutMs) reject(new Error('dev server did not come up in time (timeout)'))
        else setTimeout(tryOnce, 500)
      })
    }
    tryOnce()
  })
}

function killTree(pid) {
  if (!pid) return
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
    else process.kill(-pid, 'SIGKILL')
  } catch {
    /* already dead */
  }
}

// ── Page helpers ─────────────────────────────────────────────────────────
async function rectOf(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
  }, sel)
}

async function findButtonHandle(page, { text, ariaLabel }) {
  return page.evaluateHandle(
    ({ text, ariaLabel }) => {
      const els = [...document.querySelectorAll('button,[role=button],a')]
      const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
      if (ariaLabel) {
        const byAria = els.find((e) => (e.getAttribute('aria-label') || '').toLowerCase() === ariaLabel.toLowerCase() && e.offsetParent !== null)
        if (byAria) return byAria
      }
      if (text) {
        const lc = text.toLowerCase()
        const exact = els.find((e) => e.offsetParent !== null && norm(e) === lc)
        if (exact) return exact
        const inc = els.find((e) => e.offsetParent !== null && norm(e).includes(lc))
        if (inc) return inc
      }
      return null
    },
    { text, ariaLabel },
  )
}

async function tapEl(page, handle, { edge = null } = {}) {
  const el = handle.asElement()
  if (!el) return false
  // Real mobile users can scroll to reach a control that's below the fold —
  // scroll it into view first so a genuinely-off-screen CTA (found live: the
  // PLAYING-phase "TAKE PROFIT" CTA on iPhone14Pro+SHITCOIN renders partly
  // below the 852px viewport) is still reachable via touch, same as a real
  // user would. This does NOT mask an above-the-fold requirement anywhere it
  // actually matters (FIX #3 measures the SETTLED "BET AGAIN" fold position
  // separately, unaffected by this scroll behavior of a different button on
  // a different phase).
  await page.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }), el)
  const box = await el.boundingBox()
  if (!box) return false
  let x = box.x + box.width / 2
  let y = box.y + box.height / 2
  if (edge === 'left') x = box.x + 1.5
  if (edge === 'right') x = box.x + box.width - 1.5
  if (edge === 'top') y = box.y + 1.5
  if (edge === 'bottom') y = box.y + box.height - 1.5
  await page.touchscreen.tap(x, y)
  return true
}

async function tapText(page, text, opts) {
  const h = await findButtonHandle(page, { text })
  const el = h.asElement()
  if (!el) return false
  return tapEl(page, h, opts)
}

async function dismissOnboarding(page) {
  await tapText(page, 'got it')
  await wait(150)
  await tapText(page, 'skip')
  await wait(200)
}

async function loadFresh(page, device) {
  await page.setViewport({ width: device.w, height: device.h, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      /* ignore */
    }
  })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(500)
  await dismissOnboarding(page)
}

async function isSettled(page) {
  return page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
}
async function settledOutcome(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-settled-banner"]')
    if (!el) return null
    const t = el.textContent || ''
    if (/SECURED THE BAG/i.test(t)) return 'win'
    if (/RUGGED/i.test(t)) return 'loss'
    return 'unknown'
  })
}

// Recover live grid geometry PURELY from rendered DOM rects (no source-code
// hook needed): the mobile HUD band's own `marginLeft`/`width` are set
// straight from `boardLayout.boardPanelLeftX/RightX` (VaultExperience.tsx),
// so the band's rendered box tells us the grid's true x-span. The grid is
// mathematically CENTERED in y too (topReserved===bottomReserved for every
// domHudActive===true phase we test, so bandCenterY collapses to H/2) —
// verified by reading computeGridLayout() in VaultGridCanvas.tsx directly.
async function boardGeometry(page, gridSize) {
  const canvasShell = await rectOf(page, '[data-testid="vault-canvas-shell"]')
  const hudBand = await rectOf(page, '[data-testid="vault-mobile-hud-band"]')
  if (!canvasShell || !hudBand) return null
  const full = hudBand.width // grid is square: full width === full height
  const H = canvasShell.height
  const gridX = hudBand.left - canvasShell.left
  const gridY = (H - full) / 2
  let gap = Math.max(6, full * 0.026)
  let tile = (full - gap * (gridSize - 1)) / gridSize
  // Sanity check against the alternate FIXED_TILE(96/16) branch — only ever
  // reachable on a much taller board than mobile renders, but verify anyway.
  const fluidFull = tile * gridSize + gap * (gridSize - 1)
  if (Math.abs(fluidFull - full) > 2 && Math.abs(96 * gridSize + 16 * (gridSize - 1) - full) < 2) {
    tile = 96
    gap = 16
  }
  return {
    canvasShellLeft: canvasShell.left,
    canvasShellTop: canvasShell.top,
    gridX,
    gridY,
    tile,
    gap,
    full,
    firstTileRowTopAbs: canvasShell.top + gridY,
  }
}

function cellCenterAbs(geo, cx, cy) {
  return {
    x: geo.canvasShellLeft + geo.gridX + cx * (geo.tile + geo.gap) + geo.tile / 2,
    y: geo.canvasShellTop + geo.gridY + cy * (geo.tile + geo.gap) + geo.tile / 2,
  }
}

async function hudGapMeasurement(page, gridSize, phaseLabel) {
  const hudBand = await rectOf(page, '[data-testid="vault-mobile-hud-band"]')
  const geo = await boardGeometry(page, gridSize)
  if (!hudBand || !geo) return { ok: false, reason: 'missing hud band or canvas shell', phaseLabel }
  const gapPx = geo.firstTileRowTopAbs - hudBand.bottom
  return {
    ok: true,
    phaseLabel,
    hudBandBottom: round1(hudBand.bottom),
    firstTileRowTop: round1(geo.firstTileRowTopAbs),
    gapPx: round1(gapPx),
    overlap: gapPx < 0,
  }
}

function round1(n) {
  return Math.round(n * 10) / 10
}

async function betAgainMeasurement(page, device) {
  const h = await findButtonHandle(page, { text: 'bet again →' })
  let el = h.asElement()
  if (!el) {
    // fallback: any button starting with "bet again"
    const h2 = await findButtonHandle(page, { text: 'bet again' })
    el = h2.asElement()
  }
  if (!el) return { present: false }
  const box = await el.boundingBox()
  if (!box) return { present: false }
  const rawViewportH = device.h
  const chromeReducedViewportH = device.h - device.chromeReservePx
  const bottomEdge = box.y + box.height
  const aboveFoldRawPx = round1(rawViewportH - bottomEdge)
  const aboveFoldChromeReducedPx = round1(chromeReducedViewportH - bottomEdge)
  return {
    present: true,
    rectTop: round1(box.y),
    rectBottom: round1(bottomEdge),
    rectHeight: round1(box.height),
    rawViewportH,
    chromeReducedViewportH,
    aboveFoldRawPx,
    aboveFoldChromeReducedPx,
    passRaw: aboveFoldRawPx >= 0,
    passChromeReduced: aboveFoldChromeReducedPx >= 0,
  }
}

async function overflowCheck(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }))
}

// ── FIX #6 — BetConsole touch-target probe (bet-entry phase) ────────────
async function betConsoleProbe(page) {
  const out = {}
  // Stepper (real hit target is the wrapping <button aria-label="...">,
  // 44x44 invisible; visible swatch is the inner <span>, NOT the tap target).
  for (const dir of ['Decrease bet', 'Increase bet']) {
    const h = await findButtonHandle(page, { ariaLabel: dir })
    const el = h.asElement()
    if (!el) {
      out[dir] = { present: false }
      continue
    }
    const box = await el.boundingBox()
    const touchAction = await page.evaluate((el) => getComputedStyle(el).touchAction, el)
    // before/after edge-tap functional probe (wager value text changes)
    const before = await page.evaluate(() => document.querySelector('[data-testid="bet-console"]')?.innerText || '')
    await tapEl(page, h, { edge: dir === 'Decrease bet' ? 'left' : 'right' })
    await wait(150)
    const after = await page.evaluate(() => document.querySelector('[data-testid="bet-console"]')?.innerText || '')
    out[dir] = {
      present: true,
      width: round1(box.width),
      height: round1(box.height),
      meetsAAMin: box.width >= 44 && box.height >= 44,
      touchAction,
      edgeTapChangedState: before !== after,
    }
  }
  // Chip (first preset)
  {
    const h = await page.evaluateHandle(() => document.querySelector('[data-testid="bet-console"] .vault-mode-row')) // not chips, placeholder unused
    void h
  }
  const chipHandle = await page.evaluateHandle(() => {
    const chips = [...document.querySelectorAll('[data-testid="bet-console"] button')]
    // presets render as siblings right after the wager stepper row; identify
    // by short numeric/label text and absence of aria-label (steppers have one).
    return chips.find((b) => !b.getAttribute('aria-label') && /^[\d.]+x?$|^\$|^\d/.test((b.textContent || '').trim())) || null
  })
  {
    const el = chipHandle.asElement()
    if (el) {
      const box = await el.boundingBox()
      const touchAction = await page.evaluate((el) => getComputedStyle(el).touchAction, el)
      const beforePressed = await page.evaluate((el) => el.getAttribute('aria-pressed'), el)
      await tapEl(page, chipHandle, { edge: 'left' })
      await wait(150)
      const afterPressed = await page.evaluate((el) => el.getAttribute('aria-pressed'), el)
      out.chip = {
        present: true,
        width: box ? round1(box.width) : null,
        height: box ? round1(box.height) : null,
        meetsAAMin: !!box && box.width >= 44 && box.height >= 44,
        touchAction,
        edgeTapActivated: beforePressed !== afterPressed || afterPressed === 'true',
      }
    } else {
      out.chip = { present: false }
    }
  }
  // OPTIONS pill (AUTO-EXIT)
  {
    const h = await findButtonHandle(page, { text: 'AUTO-EXIT' })
    const el = h.asElement()
    if (el) {
      const box = await el.boundingBox()
      const touchAction = await page.evaluate((el) => getComputedStyle(el).touchAction, el)
      const beforeExpanded = await page.evaluate((el) => el.getAttribute('aria-expanded'), el)
      await tapEl(page, h, { edge: 'bottom' })
      await wait(150)
      const afterExpanded = await page.evaluate((el) => el.getAttribute('aria-expanded'), el)
      out.optionsPill = {
        present: true,
        width: round1(box.width),
        height: round1(box.height),
        meetsAAMin: box.width >= 44 && box.height >= 44,
        touchAction,
        edgeTapToggled: beforeExpanded !== afterExpanded,
      }
      // leave it back in the original (collapsed) state for cleanliness
      if (afterExpanded === 'true') {
        await tapText(page, 'AUTO-EXIT')
        await wait(100)
      }
    } else {
      out.optionsPill = { present: false }
    }
  }
  // cancel (may legitimately be ABSENT on mobile bet-entry — onCancel is
  // omitted by design there; report presence either way, not a fail if absent).
  {
    const h = await findButtonHandle(page, { text: 'cancel' })
    const el = h.asElement()
    if (el) {
      const box = await el.boundingBox()
      const touchAction = await page.evaluate((el) => getComputedStyle(el).touchAction, el)
      out.cancel = { present: true, width: round1(box.width), height: round1(box.height), meetsAAMin: box.width >= 44 && box.height >= 44, touchAction }
    } else {
      out.cancel = { present: false, note: 'onCancel intentionally omitted on mobile bet-entry (no lobby to cancel back to) — not a regression' }
    }
  }
  // commit ("SEND IT →") — measured here only, TAPPED (edge-tap) by the
  // caller as the actual round-start action so the edge-tap probe doubles
  // as the real gameplay commit.
  {
    const h = await findButtonHandle(page, { text: 'send it' })
    const el = h.asElement()
    if (el) {
      const box = await el.boundingBox()
      const touchAction = await page.evaluate((el) => getComputedStyle(el).touchAction, el)
      out.commit = { present: true, width: round1(box.width), height: round1(box.height), meetsAAMin: box.width >= 44 && box.height >= 44, touchAction }
    } else {
      out.commit = { present: false }
    }
  }
  return out
}

// ── Full round drive ──────────────────────────────────────────────────────
async function driveRound(page, { device, world, wantWin, captureBetConsole }) {
  const rec = { device: device.name, world: world.key, gridSize: world.gridSize, wantWin }
  const MAX_ATTEMPTS = wantWin ? 20 : 1
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await loadFresh(page, device)
    await tapText(page, world.key === 'bluechips' ? 'BLUECHIPS' : 'SHITCOIN')
    await wait(200)
    await page.screenshot({ path: path.join(OUT, `${device.name}-${world.key}-betentry.png`) })

    if (captureBetConsole && attempt === 1) {
      rec.betConsole = await betConsoleProbe(page)
    }

    const overflowBetEntry = await overflowCheck(page)

    // Commit — edge-tap on the RIGHT edge of the commit button (doubles as
    // the FIX #6 edge-tappability probe for the primary CTA).
    const commitH = await findButtonHandle(page, { text: 'send it' })
    const tapped = await tapEl(page, commitH, { edge: 'right' })
    if (!tapped) {
      rec.error = 'could not find/tap SEND IT'
      continue
    }
    await wait(900)
    await page.evaluate(() => window.scrollTo(0, 0))

    const overflowPlaying = await overflowCheck(page)
    const hudGapPlaying = await hudGapMeasurement(page, world.gridSize, 'playing')
    // Informational (not one of the 3 fixes under test, but discovered
    // incidentally): is the PLAYING-phase "TAKE PROFIT" cash-out CTA itself
    // reachable within the fold at initial commit, before any scrolling?
    const takeProfitRect = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').toLowerCase().includes('take profit'))
      if (!btn) return null
      const r = btn.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom, height: r.height }
    })
    await page.screenshot({ path: path.join(OUT, `${device.name}-${world.key}-playing.png`) })

    // Reveal loop
    let settled = false
    let outcome = null
    const seq = []
    for (let cy = 0; cy < world.gridSize; cy++) for (let cx = 0; cx < world.gridSize; cx++) seq.push([cx, cy])
    const canCashOutNowCheck = () =>
      page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim().toLowerCase().startsWith('take profit'))
        return !!btn && btn.offsetParent !== null && !btn.disabled
      })
    // Poll (instead of a fixed sleep) for up to ~1.8s after each tap for
    // either "settled" or (win path) "cash-out now enabled" — removes a
    // render-timing race where a fixed wait was shorter than this device/
    // grid's actual re-render latency, which would otherwise make the driver
    // tap a SECOND (possibly mined) tile despite the first tap already
    // having been a safe, cash-out-eligible reveal.
    async function pollAfterTap() {
      const deadline = Date.now() + 1800
      while (Date.now() < deadline) {
        const nowSettled = await isSettled(page)
        if (nowSettled) return { settled: true, canCashOut: false }
        if (wantWin) {
          const ready = await canCashOutNowCheck()
          if (ready) return { settled: false, canCashOut: true }
        }
        await wait(120)
      }
      return { settled: await isSettled(page), canCashOut: wantWin ? await canCashOutNowCheck() : false }
    }
    for (const [cx, cy] of seq) {
      settled = await isSettled(page)
      if (settled) break
      if (wantWin) {
        const canCashOutNow = await canCashOutNowCheck()
        if (canCashOutNow) {
          await tapText(page, 'take profit')
          await wait(900)
          settled = await isSettled(page)
          break
        }
      }
      const geo = await boardGeometry(page, world.gridSize)
      if (!geo) {
        if (process.env.MTQA_DEBUG_ONE === '1') console.log(`  [attempt ${attempt}] cell(${cx},${cy}) geo=NULL, breaking`)
        break
      }
      const { x, y } = cellCenterAbs(geo, cx, cy)
      await page.touchscreen.tap(x, y)
      const after = await pollAfterTap()
      if (process.env.MTQA_DEBUG_ONE === '1') console.log(`  [attempt ${attempt}] cell(${cx},${cy}) tap@(${x.toFixed(1)},${y.toFixed(1)}) -> settled=${after.settled} canCashOut=${after.canCashOut}`)
      if (after.settled) {
        settled = true
        break
      }
      if (wantWin && after.canCashOut) {
        if (process.env.MTQA_DEBUG_ONE === '1') {
          const dbg = await page.evaluate(() => {
            const btns = [...document.querySelectorAll('button')].filter((b) => (b.textContent || '').toLowerCase().includes('take profit'))
            return btns.map((b) => {
              const r = b.getBoundingClientRect()
              return { text: b.textContent, disabled: b.disabled, offsetParentNull: b.offsetParent === null, rect: { x: r.x, y: r.y, w: r.width, h: r.height } }
            })
          })
          console.log(`  [attempt ${attempt}] take-profit candidates:`, JSON.stringify(dbg))
        }
        const tpTapped = await tapText(page, 'take profit')
        if (process.env.MTQA_DEBUG_ONE === '1') console.log(`  [attempt ${attempt}] tapText('take profit') returned ${tpTapped}`)
        await wait(300)
        for (let i = 0; i < 5; i++) {
          settled = await isSettled(page)
          if (settled) break
          await wait(300)
        }
        if (process.env.MTQA_DEBUG_ONE === '1') console.log(`  [attempt ${attempt}] took profit -> settled=${settled}`)
        break
      }
    }
    if (process.env.MTQA_DEBUG_ONE === '1') console.log(`[attempt ${attempt}] end-of-loop settled=${await isSettled(page)} outcome=${await settledOutcome(page)}`)
    settled = await isSettled(page)
    if (!settled) {
      // swept the whole board with no mine (very unlikely) and no take-profit
      // trigger recorded (wantWin path) — treat as a failed attempt, retry.
      continue
    }
    outcome = await settledOutcome(page)
    if (wantWin && outcome !== 'win') continue // retry a fresh round
    if (!wantWin && outcome !== 'loss') continue

    // Reset scroll to top before the fold measurement — "above the fold"
    // is measured from a fresh top-of-page position (matching the maker's
    // own claimed 20.4px/26px methodology), not from wherever the reveal
    // loop's scrollIntoView happened to leave the viewport scrolled.
    await page.evaluate(() => window.scrollTo(0, 0))
    await wait(150)
    const overflowSettled = await overflowCheck(page)
    const hudGapSettled = await hudGapMeasurement(page, world.gridSize, 'settled')
    const betAgain = await betAgainMeasurement(page, device)
    await page.screenshot({ path: path.join(OUT, `${device.name}-${world.key}-settled-${outcome}.png`) })

    rec.attempt = attempt
    rec.outcome = outcome
    rec.overflowBetEntry = overflowBetEntry
    rec.overflowPlaying = overflowPlaying
    rec.overflowSettled = overflowSettled
    rec.hudGapPlaying = hudGapPlaying
    rec.hudGapSettled = hudGapSettled
    rec.betAgain = betAgain
    rec.takeProfitRect = takeProfitRect
    rec.takeProfitBelowFold = takeProfitRect ? takeProfitRect.bottom > device.h : null
    rec.regressionCashOutFired = wantWin ? true : null
    return rec
  }
  rec.error = `failed to reach outcome=${wantWin ? 'win' : 'loss'} after ${MAX_ATTEMPTS} attempts`
  return rec
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[driver] starting fresh vite dev server on port ${PORT} ...`)
  const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: __dirname,
    shell: true,
  })
  let viteLog = ''
  vite.stdout.on('data', (d) => (viteLog += d.toString()))
  vite.stderr.on('data', (d) => (viteLog += d.toString()))

  let browser
  const results = { fix2: [], fix3: [], fix6: {}, regression: [], consoleErrors: [] }
  try {
    await waitForServer(PORT, 40000)
    console.log('[driver] dev server up. launching Chrome ...')
    await wait(500)

    browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
    const page = await browser.newPage()
    page.on('console', (m) => {
      if (m.type() === 'error') results.consoleErrors.push(m.text())
    })
    page.on('pageerror', (e) => results.consoleErrors.push('PAGEERROR: ' + e.message))
    page.setDefaultNavigationTimeout(30000)
    page.setDefaultTimeout(15000)

    for (const device of DEVICES) {
      let firstWorldForDevice = true
      for (const world of WORLDS) {
        for (const wantWin of [true, false]) {
          console.log(`[driver] running ${device.name} / ${world.key} / ${wantWin ? 'WIN' : 'LOSS'} ...`)
          const rec = await driveRound(page, { device, world, wantWin, captureBetConsole: firstWorldForDevice && wantWin })
          firstWorldForDevice = false
          if (rec.betConsole) results.fix6[device.name] = rec.betConsole
          results.fix2.push({ device: device.name, world: world.key, gridSize: world.gridSize, wantWin, hudGapPlaying: rec.hudGapPlaying, hudGapSettled: rec.hudGapSettled, error: rec.error })
          results.fix3.push({ device: device.name, world: world.key, gridSize: world.gridSize, outcome: rec.outcome, betAgain: rec.betAgain, error: rec.error })
          results.regression.push({
            device: device.name,
            world: world.key,
            wantWin,
            outcome: rec.outcome,
            overflowBetEntry: rec.overflowBetEntry,
            overflowPlaying: rec.overflowPlaying,
            overflowSettled: rec.overflowSettled,
            cashOutFired: rec.regressionCashOutFired,
            takeProfitRect: rec.takeProfitRect,
            takeProfitBelowFold: rec.takeProfitBelowFold,
            error: rec.error,
          })
        }
      }
    }

    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
    printReport(results)
  } catch (e) {
    console.error('[driver] FATAL', e)
    process.exitCode = 1
  } finally {
    try {
      if (browser) await browser.close()
    } catch {
      /* ignore */
    }
    killTree(vite.pid)
    console.log('[driver] dev server + chrome shut down. exiting.')
  }
}

function printReport(results) {
  console.log('\n\n================ MOBILE TOUCH QA — RAW MEASUREMENTS ================\n')

  console.log('--- FIX #2 (HUD/board overlap) ---')
  for (const r of results.fix2) {
    const p = r.hudGapPlaying
    const s = r.hudGapSettled
    console.log(
      `${r.device} | ${r.world}(${r.gridSize}x${r.gridSize}) | target=${r.wantWin ? 'WIN' : 'LOSS'} :: ` +
        `PLAYING gap=${p && p.ok ? p.gapPx + 'px' : 'N/A'} overlap=${p && p.ok ? p.overlap : 'N/A'} | ` +
        `SETTLED gap=${s && s.ok ? s.gapPx + 'px' : 'N/A'} overlap=${s && s.ok ? s.overlap : 'N/A'}` +
        (r.error ? ` | ERROR: ${r.error}` : ''),
    )
  }

  console.log('\n--- FIX #3 (settled BET AGAIN above fold) ---')
  for (const r of results.fix3) {
    const b = r.betAgain
    if (!b || !b.present) {
      console.log(`${r.device} | ${r.world}(${r.gridSize}x${r.gridSize}) | outcome=${r.outcome} :: BET AGAIN NOT FOUND${r.error ? ' | ERROR: ' + r.error : ''}`)
      continue
    }
    console.log(
      `${r.device} | ${r.world}(${r.gridSize}x${r.gridSize}) | outcome=${r.outcome} :: ` +
        `rect.bottom=${b.rectBottom} rawViewportH=${b.rawViewportH} aboveFold(raw)=${b.aboveFoldRawPx}px ` +
        `chromeReducedViewportH=${b.chromeReducedViewportH} aboveFold(chromeReduced)=${b.aboveFoldChromeReducedPx}px ` +
        `PASS(raw)=${b.passRaw} PASS(chromeReduced)=${b.passChromeReduced}`,
    )
  }

  console.log('\n--- FIX #6 (BetConsole touch targets) ---')
  for (const [device, bc] of Object.entries(results.fix6)) {
    console.log(`${device}:`)
    for (const [k, v] of Object.entries(bc)) {
      console.log(`  ${k}: ${JSON.stringify(v)}`)
    }
  }

  console.log('\n--- Regression (tap-reveal / cash-out / overflow) ---')
  for (const r of results.regression) {
    console.log(
      `${r.device} | ${r.world} | target=${r.wantWin ? 'WIN' : 'LOSS'} outcome=${r.outcome} :: ` +
        `overflow bet-entry=${r.overflowBetEntry ? r.overflowBetEntry.hasHorizontalOverflow : 'N/A'} ` +
        `playing=${r.overflowPlaying ? r.overflowPlaying.hasHorizontalOverflow : 'N/A'} ` +
        `settled=${r.overflowSettled ? r.overflowSettled.hasHorizontalOverflow : 'N/A'} ` +
        `cashOutFired=${r.cashOutFired}` +
        (r.error ? ` | ERROR: ${r.error}` : ''),
    )
  }

  console.log('\n--- INCIDENTAL FINDING: PLAYING-phase TAKE PROFIT cash-out CTA vs fold (not one of the 3 fixes under test) ---')
  for (const r of results.regression) {
    if (!r.takeProfitRect) continue
    console.log(
      `${r.device} | ${r.world} :: TAKE PROFIT rect.top=${round1(r.takeProfitRect.top)} rect.bottom=${round1(r.takeProfitRect.bottom)} belowFold=${r.takeProfitBelowFold}`,
    )
  }

  console.log(`\n--- Console errors captured during full sweep: ${results.consoleErrors.length} ---`)
  results.consoleErrors.slice(0, 20).forEach((e) => console.log('  ' + e))

  console.log('\n================ END RAW MEASUREMENTS ================\n')
}

main()
