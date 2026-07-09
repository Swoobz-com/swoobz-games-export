// fix3-final-reverify-0707.mjs — FOCUSED, INDEPENDENT re-verification of
// FIX #3 ROUND 2 ONLY (settled BET AGAIN above the small chrome-expanded
// fold) on RUG OR RICHES (vault), after the boardHeightCss settled branch
// was changed from 'min(40vh, 340px)' to 'min(30svh, 236px)'.
// Also cross-checks FIX #2 (settled HUD-band-to-first-tile gap stays
// positive) did not regress. #6 is OUT OF SCOPE for this run.
// SELF-CONTAINED: spawns its OWN fresh vite dev server on port 5315, drives
// everything with puppeteer-core + system Chrome via REAL page.touchscreen
// taps, prints one full report to STDOUT, then kills its own dev server +
// browser before exiting. Run in the FOREGROUND: `node fix3-final-reverify-0707.mjs`.
import puppeteer from 'puppeteer-core'
import { spawn } from 'node:child_process'
import { execSync } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 5315
const OUT = path.join(__dirname, 'shots-fix3-final-reverify-0707')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const MARGIN_REQUIRED = 12

// ── Devices under test ──────────────────────────────────────────────────
// Raw CSS viewport per repo convention: Pixel 7 = 412x915 (default),
// iPhone 14 Pro = 393x852 (secondary). "Usable" = brief-specified small
// chrome-expanded visual viewport: iPhone14Pro ~741px, Pixel7 ~824px —
// these equal device.h - chromeReservePx below (91 / 111), so the same
// documented reserve figures used in the earlier independent pass reproduce
// exactly the brief's target usable heights.
const DEVICES = [
  { name: 'Pixel7', w: 412, h: 915, chromeReservePx: 91, usableExpected: 824 },
  { name: 'iPhone14Pro', w: 393, h: 852, chromeReservePx: 111, usableExpected: 741 },
]
const WORLDS = [
  { key: 'bluechips', gridSize: 5 },
  { key: 'shitcoin', gridSize: 7 },
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

function round1(n) {
  return Math.round(n * 10) / 10
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
  // scroll it into view first, otherwise boundingBox() coords can point
  // off-screen (e.g. the known PLAYING-phase TAKE PROFIT CTA on
  // iPhone14Pro+SHITCOIN renders partly below the 852px viewport at initial
  // commit) and touchscreen.tap() silently misses. This is orthogonal to the
  // FIX #3 fold measurement itself, which explicitly re-scrolls to (0,0)
  // before measuring BET AGAIN's position.
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

// Board geometry recovered purely from rendered DOM rects (same technique
// as the prior independent mobile-touch-qa pass): the mobile HUD band's
// marginLeft/width mirror boardLayout.boardPanelLeftX/RightX, so the band's
// box gives the true grid x-span; grid is vertically centered in the canvas
// shell for every domHudActive phase (verified against computeGridLayout).
async function boardGeometry(page) {
  const canvasShell = await rectOf(page, '[data-testid="vault-canvas-shell"]')
  const hudBand = await rectOf(page, '[data-testid="vault-mobile-hud-band"]')
  if (!canvasShell || !hudBand) return null
  const full = hudBand.width
  const H = canvasShell.height
  const gridX = hudBand.left - canvasShell.left
  const gridY = (H - full) / 2
  return { canvasShellLeft: canvasShell.left, canvasShellTop: canvasShell.top, gridX, gridY, full, canvasShell, hudBand }
}

function cellCenterAbs(geo, gridSize, cx, cy) {
  let gap = Math.max(6, geo.full * 0.026)
  let tile = (geo.full - gap * (gridSize - 1)) / gridSize
  const fluidFull = tile * gridSize + gap * (gridSize - 1)
  if (Math.abs(fluidFull - geo.full) > 2 && Math.abs(96 * gridSize + 16 * (gridSize - 1) - geo.full) < 2) {
    tile = 96
    gap = 16
  }
  return {
    x: geo.canvasShellLeft + geo.gridX + cx * (tile + gap) + tile / 2,
    y: geo.canvasShellTop + geo.gridY + cy * (tile + gap) + tile / 2,
  }
}

async function hudGapSettledMeasurement(page) {
  const hudBand = await rectOf(page, '[data-testid="vault-mobile-hud-band"]')
  const canvasShell = await rectOf(page, '[data-testid="vault-canvas-shell"]')
  const geo = await boardGeometry(page)
  if (!hudBand || !geo || !canvasShell) return { ok: false, reason: 'missing hud band / canvas shell' }
  const firstTileRowTopAbs = canvasShell.top + geo.gridY
  const gapPx = firstTileRowTopAbs - hudBand.bottom
  return {
    ok: true,
    hudBandBottom: round1(hudBand.bottom),
    firstTileRowTop: round1(firstTileRowTopAbs),
    canvasShellHeight: round1(canvasShell.height),
    boardFullSizePx: round1(geo.full),
    gapPx: round1(gapPx),
    positive: gapPx > 0,
  }
}

async function betAgainMeasurement(page, device) {
  const h = await findButtonHandle(page, { text: 'bet again' })
  const el = h.asElement()
  if (!el) return { present: false }
  const box = await el.boundingBox()
  if (!box) return { present: false }
  const rawViewportH = device.h
  const usableViewportH = device.h - device.chromeReservePx
  const bottomEdge = box.y + box.height
  const marginRaw = round1(rawViewportH - bottomEdge)
  const marginUsable = round1(usableViewportH - bottomEdge)
  return {
    present: true,
    rectTop: round1(box.y),
    rectBottom: round1(bottomEdge),
    rectHeight: round1(box.height),
    rawViewportH,
    usableViewportH,
    marginRaw,
    marginUsable,
    passUsable12px: marginUsable >= MARGIN_REQUIRED,
  }
}

async function overflowCheck(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }))
}

// ── Full round drive ──────────────────────────────────────────────────────
async function driveRound(page, { device, world, wantWin }) {
  const rec = { device: device.name, world: world.key, gridSize: world.gridSize, wantWin }
  const MAX_ATTEMPTS = wantWin ? 25 : 1
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await loadFresh(page, device)
    await tapText(page, world.key === 'bluechips' ? 'BLUECHIPS' : 'SHITCOIN')
    await wait(200)

    const commitH = await findButtonHandle(page, { text: 'send it' })
    const tapped = await tapEl(page, commitH)
    if (!tapped) {
      rec.error = 'could not find/tap SEND IT'
      continue
    }
    await wait(900)
    await page.evaluate(() => window.scrollTo(0, 0))

    let settled = false
    const seq = []
    for (let cy = 0; cy < world.gridSize; cy++) for (let cx = 0; cx < world.gridSize; cx++) seq.push([cx, cy])
    const canCashOutNowCheck = () =>
      page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim().toLowerCase().startsWith('take profit'))
        return !!btn && btn.offsetParent !== null && !btn.disabled
      })
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
      const geo = await boardGeometry(page)
      if (!geo) {
        if (process.env.DEBUG_ONE === '1') console.log(`  [attempt ${attempt}] cell(${cx},${cy}) geo=NULL, breaking sweep`)
        break
      }
      const { x, y } = cellCenterAbs(geo, world.gridSize, cx, cy)
      await page.touchscreen.tap(x, y)
      const after = await pollAfterTap()
      if (process.env.DEBUG_ONE === '1') console.log(`  [attempt ${attempt}] cell(${cx},${cy}) tap@(${x.toFixed(1)},${y.toFixed(1)}) -> settled=${after.settled} canCashOut=${after.canCashOut}`)
      if (after.settled) {
        settled = true
        break
      }
      if (wantWin && after.canCashOut) {
        await tapText(page, 'take profit')
        await wait(300)
        for (let i = 0; i < 5; i++) {
          settled = await isSettled(page)
          if (settled) break
          await wait(300)
        }
        if (process.env.DEBUG_ONE === '1') console.log(`  [attempt ${attempt}] took profit -> settled=${settled}`)
        break
      }
    }
    settled = await isSettled(page)
    if (!settled) {
      if (process.env.DEBUG_ONE === '1') console.log(`[attempt ${attempt}] end-of-sweep settled=false -> retry`)
      continue
    }
    const outcome = await settledOutcome(page)
    if (process.env.DEBUG_ONE === '1') console.log(`[attempt ${attempt}] settled outcome=${outcome} (want ${wantWin ? 'win' : 'loss'})`)
    if (wantWin && outcome !== 'win') continue
    if (!wantWin && outcome !== 'loss') continue

    // Fresh top-of-page position before the fold measurement.
    await page.evaluate(() => window.scrollTo(0, 0))
    await wait(150)

    const overflowSettled = await overflowCheck(page)
    const hudGapSettled = await hudGapSettledMeasurement(page)
    const betAgain = await betAgainMeasurement(page, device)
    const screenshotPath = path.join(OUT, `${device.name}-${world.key}-settled-${outcome}.png`)
    await page.screenshot({ path: screenshotPath })

    // Tap-confirmation: real touchscreen.tap on BET AGAIN, confirm it fires
    // the re-bet (phase leaves 'settled', settled banner disappears / a
    // fresh bet-entry or auto-committed round begins).
    let tapConfirmation = 'NOT ATTEMPTED'
    try {
      const beforeSettled = await isSettled(page)
      const h = await findButtonHandle(page, { text: 'bet again' })
      const didTap = await tapEl(page, h)
      if (!didTap) {
        tapConfirmation = 'FAIL — could not tap BET AGAIN (not found/no box)'
      } else {
        await wait(600)
        const afterSettled = await isSettled(page)
        tapConfirmation = beforeSettled && !afterSettled ? 'PASS — tap left settled phase (re-bet fired)' : `FAIL — still settled=${afterSettled} after tap`
      }
    } catch (e) {
      tapConfirmation = 'FAIL — exception: ' + e.message
    }

    rec.attempt = attempt
    rec.outcome = outcome
    rec.overflowSettled = overflowSettled
    rec.hudGapSettled = hudGapSettled
    rec.betAgain = betAgain
    rec.tapConfirmation = tapConfirmation
    rec.screenshotPath = screenshotPath
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
  const results = []
  const consoleErrors = []
  try {
    await waitForServer(PORT, 40000)
    console.log('[driver] dev server up. launching Chrome ...')
    await wait(500)

    browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
    const page = await browser.newPage()
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text())
    })
    page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))
    page.setDefaultNavigationTimeout(30000)
    page.setDefaultTimeout(15000)

    const onlyDevice = process.env.ONLY_DEVICE
    const onlyWorld = process.env.ONLY_WORLD
    const onlyWantWin = process.env.ONLY_WANTWIN // 'true' | 'false'
    for (const device of DEVICES) {
      if (onlyDevice && device.name !== onlyDevice) continue
      for (const world of WORLDS) {
        if (onlyWorld && world.key !== onlyWorld) continue
        for (const wantWin of [true, false]) {
          if (onlyWantWin && String(wantWin) !== onlyWantWin) continue
          console.log(`[driver] running ${device.name} / ${world.key} / ${wantWin ? 'WIN' : 'LOSS'} ...`)
          const rec = await driveRound(page, { device, world, wantWin })
          results.push(rec)
        }
      }
    }

    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
    printReport(results, consoleErrors)
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

function printReport(results, consoleErrors) {
  console.log('\n\n================ FIX #3 FINAL RE-VERIFY — RAW MEASUREMENTS ================\n')

  console.log('--- Per-combo table: device | world(grid) | outcome :: BET AGAIN margin(usable/raw) | HUD gap(settled) | overflow | tap-confirm ---')
  let anyFail = false
  for (const r of results) {
    if (r.error) {
      anyFail = true
      console.log(`${r.device} | ${r.world} | wantWin=${r.wantWin} :: ERROR: ${r.error}`)
      continue
    }
    const b = r.betAgain
    const g = r.hudGapSettled
    const bStr = b && b.present ? `rect.bottom=${b.rectBottom} usableH=${b.usableViewportH} marginUsable=${b.marginUsable}px marginRaw=${b.marginRaw}px pass>=12px=${b.passUsable12px}` : 'BET AGAIN NOT FOUND'
    const gStr = g && g.ok ? `gap=${g.gapPx}px positive=${g.positive}` : 'HUD GAP N/A'
    if (!b || !b.present || !b.passUsable12px) anyFail = true
    if (!g || !g.ok || !g.positive) anyFail = true
    if (r.overflowSettled && r.overflowSettled.hasHorizontalOverflow) anyFail = true
    if (!r.tapConfirmation || !r.tapConfirmation.startsWith('PASS')) anyFail = true
    console.log(
      `${r.device} | ${r.world}(${r.gridSize}x${r.gridSize}) | outcome=${r.outcome} :: ` +
        `BET-AGAIN[${bStr}] | HUD-GAP[${gStr}] | overflow=${r.overflowSettled ? r.overflowSettled.hasHorizontalOverflow : 'N/A'} | ` +
        `tap-confirm=${r.tapConfirmation} | screenshot=${r.screenshotPath}`,
    )
  }

  console.log(`\n--- Console errors captured during full sweep: ${consoleErrors.length} ---`)
  consoleErrors.slice(0, 20).forEach((e) => console.log('  ' + e))

  console.log(`\n[driver] OVERALL_ANY_FAIL=${anyFail}`)
  console.log('\n================ END RAW MEASUREMENTS ================\n')
}

main()
