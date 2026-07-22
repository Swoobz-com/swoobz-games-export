// mtqa-0707-full-resweep.mjs — FULL FRESH mobile-touch-qa re-sweep of RUG OR
// RICHES (vault) after 7 fixes landed. Owns FIX #2 (HUD band never overlaps
// grid) and FIX #6 (BetConsole >=44x44 + touchAction:manipulation) directly;
// does a LIGHT spot re-confirm of FIX #3 (settled BET AGAIN clears the fold,
// already independently re-verified PASS earlier today per
// run-20260707T114157Z / AGENT_MEMORY.md); plus a general mobile-touch sweep
// (thumb-zone reachability, no-hover-state, light perf budget, overflow,
// console errors). SELF-CONTAINED: spawns its own fresh vite dev server
// (port from argv[2], default 5283), drives with puppeteer-core + system
// Chrome, prints one full report, kills its own dev server + browser in a
// finally block. Run in the FOREGROUND ONLY — no backgrounding, no watcher.
import puppeteer from 'puppeteer-core'
import { spawn } from 'node:child_process'
import { execSync } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = Number(process.argv[2] || 5283)
const OUT = path.join(__dirname, 'shots-mtqa-0707-full-resweep')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Devices ────────────────────────────────────────────────────────────────
// Raw CSS viewport per repo convention (Pixel 7 = 412x915 default, iPhone 14
// Pro = 393x852 secondary), PLUS a realistic chrome-expanded USABLE height
// per AGENT_MEMORY.md's own prior-round numbers (~741px iPhone14Pro, ~824px
// Pixel7) — used directly for the FIX #3 light re-confirm so this run is
// comparable apples-to-apples against the memory entry we're re-checking.
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

// Recover live grid geometry purely from rendered DOM rects (no source hook
// needed) — see mtqa-0707-fixverify.mjs for the full derivation notes.
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
  const hudText = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-mobile-hud-band"]')
    if (!el) return null
    const txt = (el.textContent || '').replace(/\s+/g, ' ').trim()
    const cs = getComputedStyle(el)
    return { text: txt, len: txt.length, opacity: cs.opacity, visibility: cs.visibility, display: cs.display }
  })
  return {
    ok: true,
    phaseLabel,
    hudBandBottom: round1(hudBand.bottom),
    firstTileRowTop: round1(geo.firstTileRowTopAbs),
    gapPx: round1(gapPx),
    overlap: gapPx < 0,
    hudText,
    legible: !!hudText && hudText.len > 0 && hudText.opacity !== '0' && hudText.visibility !== 'hidden' && hudText.display !== 'none',
  }
}

async function betAgainMeasurement(page, device) {
  const h = await findButtonHandle(page, { text: 'bet again' })
  const el = h.asElement()
  if (!el) return { present: false }
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
    passRaw: marginRaw >= 0,
    passUsable: marginUsable >= 0,
    vertCenterPct: round1(((box.y + box.height / 2) / device.h) * 100),
  }
}

async function overflowCheck(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }))
}

async function thumbZoneOf(page, label, { text, ariaLabel }, device) {
  const h = await findButtonHandle(page, { text, ariaLabel })
  const el = h.asElement()
  if (!el) return { label, present: false }
  const box = await el.boundingBox()
  if (!box) return { label, present: false }
  const centerY = box.y + box.height / 2
  const pct = round1((centerY / device.h) * 100)
  return {
    label,
    present: true,
    width: round1(box.width),
    height: round1(box.height),
    meetsAAMin: box.width >= 44 && box.height >= 44,
    vertCenterPct: pct,
    inThumbZone: pct >= 30 && pct <= 90,
  }
}

// ── FIX #6 — BetConsole touch-target probe (bet-entry phase) ────────────
async function betConsoleProbe(page) {
  const out = {}
  for (const dir of ['Decrease bet', 'Increase bet']) {
    const h = await findButtonHandle(page, { ariaLabel: dir })
    const el = h.asElement()
    if (!el) {
      out[dir] = { present: false }
      continue
    }
    const box = await el.boundingBox()
    const touchAction = await page.evaluate((el) => getComputedStyle(el).touchAction, el)
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
  const chipHandle = await page.evaluateHandle(() => {
    const chips = [...document.querySelectorAll('[data-testid="bet-console"] button')]
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
      if (afterExpanded === 'true') {
        await tapText(page, 'AUTO-EXIT')
        await wait(100)
      }
    } else {
      out.optionsPill = { present: false }
    }
  }
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
  const MAX_ATTEMPTS = wantWin ? 25 : 1
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await loadFresh(page, device)
    await tapText(page, world.key === 'bluechips' ? 'BLUECHIPS' : 'SHITCOIN')
    await wait(200)

    if (captureBetConsole && attempt === 1) {
      rec.betConsole = await betConsoleProbe(page)
    }
    // lobby/bet-entry CTA thumb-zone (commit == the primary bet-entry CTA)
    if (attempt === 1) {
      rec.thumbCommit = await thumbZoneOf(page, 'SEND IT (commit)', { text: 'send it' }, device)
    }

    const overflowBetEntry = await overflowCheck(page)
    await page.screenshot({ path: path.join(OUT, `${device.name}-${world.key}-betentry.png`) })

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
    if (attempt === 1) {
      rec.thumbTakeProfit = await thumbZoneOf(page, 'TAKE PROFIT (cash-out)', { text: 'take profit' }, device)
    }
    await page.screenshot({ path: path.join(OUT, `${device.name}-${world.key}-playing.png`) })

    let settled = false
    let outcome = null
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
      if (!geo) break
      const { x, y } = cellCenterAbs(geo, world.gridSize, cx, cy)
      await page.touchscreen.tap(x, y)
      const after = await pollAfterTap()
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
        break
      }
    }
    settled = await isSettled(page)
    if (!settled) continue
    outcome = await settledOutcome(page)
    if (wantWin && outcome !== 'win') continue
    if (!wantWin && outcome !== 'loss') continue

    await page.evaluate(() => window.scrollTo(0, 0))
    await wait(200)
    const overflowSettled = await overflowCheck(page)
    const hudGapSettled = await hudGapMeasurement(page, 'settled')
    const betAgain = await betAgainMeasurement(page, device)
    const thumbBetAgain = await thumbZoneOf(page, 'BET AGAIN', { text: 'bet again' }, device)
    await page.screenshot({ path: path.join(OUT, `${device.name}-${world.key}-settled-${outcome}.png`) })

    rec.attempt = attempt
    rec.outcome = outcome
    rec.overflowBetEntry = overflowBetEntry
    rec.overflowPlaying = overflowPlaying
    rec.overflowSettled = overflowSettled
    rec.hudGapPlaying = hudGapPlaying
    rec.hudGapSettled = hudGapSettled
    rec.betAgain = betAgain
    rec.thumbBetAgain = thumbBetAgain
    return rec
  }
  rec.error = `failed to reach outcome=${wantWin ? 'win' : 'loss'} after ${MAX_ATTEMPTS} attempts`
  return rec
}

// ── Light mobile-perf budget probe (own device/page, one shot) ──────────
async function perfProbe(browser, device) {
  const page = await browser.newPage()
  const client = await page.target().createCDPSession()
  await client.send('Network.enable')
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.5 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  })
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.setViewport({ width: device.w, height: device.h, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  await page.evaluateOnNewDocument(() => {
    window.__perfMarks = {}
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') window.__perfMarks.fcp = entry.startTime
        if (entry.entryType === 'largest-contentful-paint') window.__perfMarks.lcp = entry.startTime
      }
    })
    try {
      po.observe({ type: 'paint', buffered: true })
      po.observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {
      /* ignore */
    }
  })
  const navStart = Date.now()
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load', timeout: 60000 })
  await wait(1500)
  const marks = await page.evaluate(() => window.__perfMarks || {})
  const wallLoadMs = Date.now() - navStart

  // Drive to `playing` phase and sample rAF-frame deltas for ~2s to estimate fps
  // under the 4x CPU throttle (the reveal/tap-response animation window).
  await page.evaluate(() => {
    try {
      localStorage.clear()
    } catch {
      /* ignore */
    }
  })
  await page.reload({ waitUntil: 'load' })
  await wait(1000)
  await tapText(page, 'got it')
  await wait(150)
  await tapText(page, 'skip')
  await wait(200)
  await tapText(page, 'BLUECHIPS')
  await wait(200)
  const commitH = await findButtonHandle(page, { text: 'send it' })
  await tapEl(page, commitH, { edge: 'right' })
  await wait(600)
  const fpsSample = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const deltas = []
        let last = performance.now()
        let frames = 0
        function tick(t) {
          deltas.push(t - last)
          last = t
          frames++
          if (frames < 90) requestAnimationFrame(tick)
          else resolve(deltas)
        }
        requestAnimationFrame(tick)
      }),
  )
  const avgDelta = fpsSample.reduce((a, b) => a + b, 0) / fpsSample.length
  const estFps = round1(1000 / avgDelta)
  await page.close()
  return { device: device.name, fcp: marks.fcp ? round1(marks.fcp) : null, lcp: marks.lcp ? round1(marks.lcp) : null, wallLoadMs, estFpsUnder4xThrottle: estFps }
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[driver] starting fresh vite dev server on port ${PORT} ...`)
  const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: __dirname, shell: true })
  let viteLog = ''
  vite.stdout.on('data', (d) => (viteLog += d.toString()))
  vite.stderr.on('data', (d) => (viteLog += d.toString()))

  let browser
  const results = { fix2: [], fix3: [], fix6: {}, thumb: [], regression: [], perf: [], consoleErrors: [] }
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
          results.thumb.push({ device: device.name, world: world.key, wantWin, commit: rec.thumbCommit, takeProfit: rec.thumbTakeProfit, betAgain: rec.thumbBetAgain, error: rec.error })
          results.regression.push({
            device: device.name,
            world: world.key,
            wantWin,
            outcome: rec.outcome,
            overflowBetEntry: rec.overflowBetEntry,
            overflowPlaying: rec.overflowPlaying,
            overflowSettled: rec.overflowSettled,
            error: rec.error,
          })
        }
      }
    }

    console.log('[driver] running light mobile perf budget probe (4x CPU throttle + slow-3G-ish) ...')
    for (const device of DEVICES) {
      try {
        const p = await perfProbe(browser, device)
        results.perf.push(p)
      } catch (e) {
        results.perf.push({ device: device.name, error: String(e) })
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
  console.log('\n\n================ MOBILE TOUCH QA — FULL RESWEEP RAW MEASUREMENTS ================\n')

  console.log('--- FIX #2 (HUD/board overlap + legibility) ---')
  for (const r of results.fix2) {
    const p = r.hudGapPlaying
    const s = r.hudGapSettled
    console.log(
      `${r.device} | ${r.world}(${r.gridSize}x${r.gridSize}) | target=${r.wantWin ? 'WIN' : 'LOSS'} :: ` +
        `PLAYING gap=${p && p.ok ? p.gapPx + 'px' : 'N/A'} overlap=${p && p.ok ? p.overlap : 'N/A'} legible=${p && p.ok ? p.legible : 'N/A'} text="${p && p.ok && p.hudText ? p.hudText.text.slice(0, 60) : ''}" | ` +
        `SETTLED gap=${s && s.ok ? s.gapPx + 'px' : 'N/A'} overlap=${s && s.ok ? s.overlap : 'N/A'} legible=${s && s.ok ? s.legible : 'N/A'}` +
        (r.error ? ` | ERROR: ${r.error}` : ''),
    )
  }

  console.log('\n--- FIX #3 light spot re-confirm (settled BET AGAIN vs usable/chrome-expanded height) ---')
  for (const r of results.fix3) {
    const b = r.betAgain
    if (!b || !b.present) {
      console.log(`${r.device} | ${r.world}(${r.gridSize}x${r.gridSize}) | outcome=${r.outcome} :: BET AGAIN NOT FOUND${r.error ? ' | ERROR: ' + r.error : ''}`)
      continue
    }
    console.log(
      `${r.device} | ${r.world}(${r.gridSize}x${r.gridSize}) | outcome=${r.outcome} :: rect.bottom=${b.rectBottom} ` +
        `usableH=${b.usableH} marginUsable=${b.marginUsable}px PASS(usable)=${b.passUsable} | rawViewportH=${b.rawViewportH} marginRaw=${b.marginRaw}px PASS(raw)=${b.passRaw}`,
    )
  }

  console.log('\n--- FIX #6 (BetConsole touch targets, bet-entry phase) ---')
  for (const [device, bc] of Object.entries(results.fix6)) {
    console.log(`${device}:`)
    for (const [k, v] of Object.entries(bc)) {
      console.log(`  ${k}: ${JSON.stringify(v)}`)
    }
  }

  console.log('\n--- General sweep: thumb-zone reachability (primary CTA per phase, 30-90% vertical-center band) ---')
  for (const r of results.thumb) {
    for (const [phase, t] of [
      ['commit', r.commit],
      ['takeProfit', r.takeProfit],
      ['betAgain', r.betAgain],
    ]) {
      if (!t) continue
      console.log(
        `${r.device} | ${r.world} | target=${r.wantWin ? 'WIN' : 'LOSS'} | ${phase} :: present=${t.present} ` +
          (t.present ? `size=${t.width}x${t.height} meetsAAMin=${t.meetsAAMin} vertCenter=${t.vertCenterPct}% inThumbZone=${t.inThumbZone}` : ''),
      )
    }
  }

  console.log('\n--- General sweep: overflow / regression ---')
  for (const r of results.regression) {
    console.log(
      `${r.device} | ${r.world} | target=${r.wantWin ? 'WIN' : 'LOSS'} outcome=${r.outcome} :: ` +
        `overflow bet-entry=${r.overflowBetEntry ? r.overflowBetEntry.hasHorizontalOverflow : 'N/A'} ` +
        `playing=${r.overflowPlaying ? r.overflowPlaying.hasHorizontalOverflow : 'N/A'} ` +
        `settled=${r.overflowSettled ? r.overflowSettled.hasHorizontalOverflow : 'N/A'}` +
        (r.error ? ` | ERROR: ${r.error}` : ''),
    )
  }

  console.log('\n--- General sweep: mobile perf budget (4x CPU throttle, Slow-3G-ish network) ---')
  for (const p of results.perf) {
    if (p.error) {
      console.log(`${p.device} :: ERROR: ${p.error}`)
      continue
    }
    console.log(`${p.device} :: FCP=${p.fcp}ms LCP=${p.lcp}ms wallLoad=${p.wallLoadMs}ms estFPS(round-active,4x throttle)=${p.estFpsUnder4xThrottle}`)
  }

  console.log(`\n--- Console errors captured during full sweep: ${results.consoleErrors.length} ---`)
  const uniq = [...new Set(results.consoleErrors)]
  uniq.slice(0, 30).forEach((e) => console.log('  ' + e))

  console.log('\n================ END RAW MEASUREMENTS ================\n')
}

main()
