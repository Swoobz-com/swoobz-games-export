// mtqa-0707-shellchange-reverify.mjs — FOCUSED regression re-check of vault
// (RUG OR RICHES) FIX #2 (HUD/board overlap) and FIX #3 (settled BET AGAIN
// above fold) after the mobile app-shell layout change ("FIX A": outer shell
// justify-content center -> flex-start + a marginBlock:auto/minHeight:0
// content-stack wrapper, scoped !isWide only). FIX #6 (BetConsole) is out of
// scope per brief (different component, unaffected).
// SELF-CONTAINED: spawns its own fresh vite dev server on port 5332, drives
// with puppeteer-core + system Chrome, prints one full report, kills its own
// dev server + browser in a finally block. Runs in the FOREGROUND ONLY as one
// blocking `node` invocation — no backgrounding, no watcher.
import puppeteer from 'puppeteer-core'
import { spawn } from 'node:child_process'
import { execSync } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 5332
const OUT = path.join(__dirname, 'shots-mtqa-0707-shellchange-reverify')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Devices (repo convention: Pixel 7 = 412x915 default, iPhone 14 Pro =
// 393x852 secondary) + the SMALL chrome-expanded usable-viewport heights the
// brief specifies for the FIX #3 fold check (iPhone14Pro ~741, Pixel7 ~824).
const DEVICES = [
  { name: 'Pixel7', w: 412, h: 915, usableH: 824 },
  { name: 'iPhone14Pro', w: 393, h: 852, usableH: 741 },
]
const WORLDS = [
  { key: 'bluechips', testid: 'vault-world-card-bluechips', gridSize: 5 },
  { key: 'shitcoin', testid: 'vault-world-card-shitcoin', gridSize: 7 },
]

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

// ── Page helpers (same technique as prior independently-verified drivers) ──
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

// NB (learned from a prior same-day driver bug on this exact task): always
// scrollIntoView before reading boundingBox/tapping — on the documented
// PLAYING-phase-below-fold iPhone14Pro case, skipping this makes the tap
// silently miss and the round never settle.
async function tapEl(page, handle, { edge = null } = {}) {
  const el = handle.asElement()
  if (!el) return false
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
  return page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]') || /SETTLED\s*(·|-)\s*(WIN|LOSS)/i.test(document.body.innerText))
}
async function settledOutcome(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-settled-banner"]')
    const t = (el && el.textContent) || document.body.innerText || ''
    if (/SECURED THE BAG|\bWIN\b/i.test(t)) return 'win'
    if (/RUGGED|\bLOSS\b/i.test(t)) return 'loss'
    return 'unknown'
  })
}

// Recover live grid geometry purely from rendered DOM rects.
async function boardGeometry(page) {
  const canvasShell = await rectOf(page, '[data-testid="vault-canvas-shell"]')
  const hudBand = await rectOf(page, '[data-testid="vault-mobile-hud-band"]')
  if (!canvasShell || !hudBand) return null
  const full = hudBand.width
  const H = canvasShell.height
  const gridX = hudBand.left - canvasShell.left
  const gridY = (H - full) / 2
  return {
    canvasShellLeft: canvasShell.left,
    canvasShellTop: canvasShell.top,
    gridX,
    gridY,
    full,
    firstTileRowTopAbs: canvasShell.top + gridY,
  }
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

async function hudGapMeasurement(page, phaseLabel) {
  const hudBand = await rectOf(page, '[data-testid="vault-mobile-hud-band"]')
  const geo = await boardGeometry(page)
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

async function betAgainMeasurement(page, device) {
  const h = await findButtonHandle(page, { text: 'bet again' })
  const el = h.asElement()
  if (!el) return { present: false }
  // measure raw position WITHOUT forcing scroll-into-view first, then also
  // record whether it needed a scroll (fold-relevant) — but for the fold
  // margin itself we want its natural post-load resting position.
  await page.evaluate(() => window.scrollTo(0, 0))
  const box = await el.boundingBox()
  if (!box) return { present: false }
  const bottomEdge = box.y + box.height
  const marginRaw = round1(device.h - bottomEdge)
  const marginUsable = round1(device.usableH - bottomEdge)
  return {
    present: true,
    rectTop: round1(box.y),
    rectBottom: round1(bottomEdge),
    rectHeight: round1(box.height),
    rawViewportH: device.h,
    usableH: device.usableH,
    marginRaw,
    marginUsable,
    passUsable12: marginUsable >= 12,
  }
}

async function overflowCheck(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }))
}

// ── Full round drive: bet-entry -> tap-reveal -> settle (win via cash-out OR
// loss via mine-hit) -> measure FIX#2 (both phases) + FIX#3 (settled only) +
// regression (overflow every phase, tap-reveal worked, cash-out worked for
// win path) ─────────────────────────────────────────────────────────────────
async function driveRound(page, { device, world, wantWin }) {
  const rec = { device: device.name, world: world.key, gridSize: world.gridSize, wantWin }
  const MAX_ATTEMPTS = wantWin ? 25 : 1
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await loadFresh(page, device)
    await tapText(page, world.key === 'bluechips' ? 'BLUECHIPS' : 'SHITCOIN')
    await wait(200)

    const overflowBetEntry = await overflowCheck(page)
    await page.screenshot({ path: path.join(OUT, `${device.name}-${world.key}-${wantWin ? 'win' : 'loss'}-betentry.png`) })

    const commitH = await findButtonHandle(page, { text: 'send it' })
    const tapped = await tapEl(page, commitH, { edge: 'right' })
    if (!tapped) {
      rec.error = 'could not find/tap SEND IT'
      continue
    }
    await wait(900)
    await page.evaluate(() => window.scrollTo(0, 0))

    const overflowPlaying = await overflowCheck(page)
    const hudGapPlaying = await hudGapMeasurement(page, 'playing')
    await page.screenshot({ path: path.join(OUT, `${device.name}-${world.key}-${wantWin ? 'win' : 'loss'}-playing.png`) })

    let settled = false
    let outcome = null
    let usedCashOut = false
    let tapRevealWorked = false
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
      const geo = await boardGeometry(page)
      if (!geo) break
      const { x, y } = cellCenterAbs(geo, world.gridSize, cx, cy)
      const before = await page.evaluate(() => document.body.innerText)
      await page.touchscreen.tap(x, y)
      const after = await pollAfterTap()
      const afterText = await page.evaluate(() => document.body.innerText)
      if (afterText !== before) tapRevealWorked = true
      if (after.settled) {
        settled = true
        break
      }
      if (wantWin && after.canCashOut) {
        const cpH = await findButtonHandle(page, { text: 'take profit' })
        const cpTapped = await tapEl(page, cpH)
        usedCashOut = usedCashOut || cpTapped
        await wait(300)
        for (let i = 0; i < 5; i++) {
          settled = await isSettled(page)
          if (settled) break
          await wait(300)
        }
        break
      }
    }
    settled = await isSettled(page)
    if (!settled) continue
    outcome = await settledOutcome(page)
    if (wantWin && outcome !== 'win') continue
    if (!wantWin && outcome !== 'loss') continue
    if (wantWin && !usedCashOut) {
      // Win must be reached via explicit TAKE PROFIT tap for the cash-out
      // regression probe to be meaningful.
      continue
    }

    await page.evaluate(() => window.scrollTo(0, 0))
    await wait(200)
    const overflowSettled = await overflowCheck(page)
    const hudGapSettled = await hudGapMeasurement(page, 'settled')
    const betAgain = await betAgainMeasurement(page, device)
    await page.screenshot({ path: path.join(OUT, `${device.name}-${world.key}-settled-${outcome}.png`) })

    // functional regression: BET AGAIN tap actually leaves `settled` phase
    let betAgainTapWorked = false
    {
      const h = await findButtonHandle(page, { text: 'bet again' })
      const tappedBA = await tapEl(page, h)
      if (tappedBA) {
        await wait(400)
        const stillSettled = await isSettled(page)
        betAgainTapWorked = !stillSettled
      }
    }

    rec.attempt = attempt
    rec.outcome = outcome
    rec.usedCashOut = usedCashOut
    rec.tapRevealWorked = tapRevealWorked
    rec.betAgainTapWorked = betAgainTapWorked
    rec.overflowBetEntry = overflowBetEntry
    rec.overflowPlaying = overflowPlaying
    rec.overflowSettled = overflowSettled
    rec.hudGapPlaying = hudGapPlaying
    rec.hudGapSettled = hudGapSettled
    rec.betAgain = betAgain
    return rec
  }
  rec.error = `failed to reach outcome=${wantWin ? 'win' : 'loss'} after ${MAX_ATTEMPTS} attempts`
  return rec
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[driver] starting fresh vite dev server on port ${PORT} ...`)
  const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: __dirname, shell: true })
  let viteLog = ''
  vite.stdout.on('data', (d) => (viteLog += d.toString()))
  vite.stderr.on('data', (d) => (viteLog += d.toString()))

  let browser
  const results = { rows: [], consoleErrors: [] }
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
      for (const world of WORLDS) {
        for (const wantWin of [true, false]) {
          console.log(`[driver] running ${device.name} / ${world.key} / ${wantWin ? 'WIN' : 'LOSS'} ...`)
          const rec = await driveRound(page, { device, world, wantWin })
          results.rows.push(rec)
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
  console.log('\n\n================ SHELL-CHANGE REGRESSION RE-CHECK — RAW MEASUREMENTS ================\n')
  for (const r of results.rows) {
    console.log(`\n=== ${r.device} | ${r.world}(${r.gridSize}x${r.gridSize}) | target=${r.wantWin ? 'WIN' : 'LOSS'} ===`)
    if (r.error) {
      console.log(`  ERROR: ${r.error}`)
      continue
    }
    const p = r.hudGapPlaying
    const s = r.hudGapSettled
    console.log(`  outcome=${r.outcome} usedCashOut=${r.usedCashOut} tapRevealWorked=${r.tapRevealWorked} betAgainTapWorked=${r.betAgainTapWorked}`)
    console.log(`  FIX#2 PLAYING gap=${p && p.ok ? p.gapPx + 'px' : 'N/A'} overlap=${p && p.ok ? p.overlap : 'N/A'} (hudBandBottom=${p?.hudBandBottom} firstTileRowTop=${p?.firstTileRowTop})`)
    console.log(`  FIX#2 SETTLED gap=${s && s.ok ? s.gapPx + 'px' : 'N/A'} overlap=${s && s.ok ? s.overlap : 'N/A'} (hudBandBottom=${s?.hudBandBottom} firstTileRowTop=${s?.firstTileRowTop})`)
    const b = r.betAgain
    if (b && b.present) {
      console.log(
        `  FIX#3 BET AGAIN rect.bottom=${b.rectBottom} usableH=${b.usableH} marginUsable=${b.marginUsable}px (>=12 required) PASS=${b.passUsable12} | rawViewportH=${b.rawViewportH} marginRaw=${b.marginRaw}px`,
      )
    } else {
      console.log('  FIX#3 BET AGAIN NOT FOUND')
    }
    console.log(
      `  overflow: bet-entry=${r.overflowBetEntry.hasHorizontalOverflow} playing=${r.overflowPlaying.hasHorizontalOverflow} settled=${r.overflowSettled.hasHorizontalOverflow}`,
    )
  }
  console.log(`\n--- Console errors captured during full sweep: ${results.consoleErrors.length} ---`)
  const uniq = [...new Set(results.consoleErrors)]
  uniq.slice(0, 30).forEach((e) => console.log('  ' + e))
  console.log('\n================ END RAW MEASUREMENTS ================\n')
}

main()
