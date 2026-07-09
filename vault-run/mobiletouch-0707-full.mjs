// mobiletouch-0707-full.mjs — swoobz-mobile-touch-qa comprehensive live sweep
// for RUG OR RICHES (vault) against the LIVE dev server on :5390.
// Drives Pixel 7 (412x915) and iPhone 14 Pro (393x852), real mobile UA + touch
// emulation, clears storage before every drive, uses page.touchscreen.tap()
// (not click) for the whole loop, and measures WIN + LOSS settled CTA fold
// geometry fresh.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 5390
const OUT = 'shots-mobiletouch-0707'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const DEVICES = [
  { name: 'pixel7', w: 412, h: 915, ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' },
  { name: 'iphone14pro', w: 393, h: 852, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1' },
]

async function findByText(page, selector, pattern, opts = {}) {
  return page.evaluate((selector, pattern, opts) => {
    const re = new RegExp(pattern, 'i')
    const els = [...document.querySelectorAll(selector)]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim()
    const visible = (e) => e.offsetParent !== null && (!opts.notDisabled || !e.disabled)
    const el = els.find((e) => visible(e) && re.test(norm(e)))
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      text: norm(el),
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      width: Math.round(r.width),
      height: Math.round(r.height),
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      touchAction: cs.touchAction,
      disabled: !!el.disabled,
    }
  }, selector, pattern, opts)
}

async function findByTestId(page, testid) {
  return page.evaluate((testid) => {
    const el = document.querySelector(`[data-testid="${testid}"]`)
    if (!el || el.offsetParent === null) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), touchAction: cs.touchAction }
  }, testid)
}

async function tileCenter(page, gridSize, col, row) {
  return page.evaluate((gridSize, col, row) => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const rect = c.getBoundingClientRect()
    const W = rect.width, H = rect.height
    const wide = W / H > 1.2
    const topReserved = H * (wide ? 0.12 : 0.15)
    const bottomReserved = H * (wide ? 0.14 : 0.18)
    const sideFrac = 0.08
    const safeW = W * (1 - sideFrac * 2)
    const safeH = (H - topReserved - bottomReserved) * 0.96
    const available = Math.min(safeW, safeH)
    const gap = Math.max(6, available * 0.026)
    const tile = (available - gap * (gridSize - 1)) / gridSize
    const full = tile * gridSize + gap * (gridSize - 1)
    const x0 = (W - full) / 2
    const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2
    const y0 = bandCenterY - full / 2
    return {
      x: rect.left + x0 + col * (tile + gap) + tile / 2,
      y: rect.top + y0 + row * (tile + gap) + tile / 2,
      tileW: tile,
    }
  }, gridSize, col, row)
}

async function phaseText(page) {
  return page.evaluate(() => document.body.innerText.slice(0, 4000))
}

async function clearStorageAndReload(page) {
  await page.evaluate(() => { try { localStorage.clear() } catch {} try { sessionStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(600)
}

async function tapEl(page, rect) {
  await page.touchscreen.tap(rect.x, rect.y)
}

// Real mobile users scroll to reach off-screen controls before tapping —
// scroll the matched element into view, then RE-MEASURE its rect (so the
// tap lands on the post-scroll coordinates), returning the fresh rect.
async function scrollIntoViewAndRemeasure(page, selector, pattern) {
  await page.evaluate((selector, pattern) => {
    const re = new RegExp(pattern, 'i')
    const els = [...document.querySelectorAll(selector)]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim()
    const el = els.find((e) => e.offsetParent !== null && re.test(norm(e)))
    if (el) el.scrollIntoView({ block: 'center' })
  }, selector, pattern)
  await wait(200)
  return findByText(page, selector, pattern, { notDisabled: true })
}

async function measureLatency(page, checkFn, timeoutMs = 1500) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeoutMs) {
    if (await checkFn()) return Date.now() - t0
    await wait(16)
  }
  return -1
}

async function runOutcome(page, device, world, outcomeLabel, consoleErrors) {
  const result = { device: device.name, world, outcome: outcomeLabel }

  await clearStorageAndReload(page)

  // ── BET-ENTRY PHASE ──────────────────────────────────────────────────
  await page.evaluate(() => window.scrollTo(0, 0))
  const modeSelector = { bluechips: 'vault-world-card-bluechips', shitcoin: 'vault-world-card-shitcoin' }[world]
  // Record the RAW unscrolled fold position first (this is the live number
  // that matters for the thumb-zone/reachability probe) BEFORE doing
  // anything a real user wouldn't do (a real user has to scroll manually).
  const worldCard = await findByTestId(page, modeSelector)
  result.worldCardHit = worldCard ? { w: worldCard.width, h: worldCard.height, meetsMin: worldCard.width >= 44 && worldCard.height >= 44, top: worldCard.top, bottom: worldCard.bottom, initiallyAboveFold: worldCard.bottom <= device.h } : null

  const stepUpRaw = await findByText(page, 'button', '^\\+$')
  result.stepperHit = stepUpRaw ? { w: stepUpRaw.width, h: stepUpRaw.height, touchAction: stepUpRaw.touchAction, meetsMin: stepUpRaw.width >= 44 && stepUpRaw.height >= 44, initiallyAboveFold: stepUpRaw.bottom <= device.h } : null

  const commitRaw = await findByText(page, 'button', '^send it', { notDisabled: true })
  result.commitHit = commitRaw
    ? { w: commitRaw.width, h: commitRaw.height, touchAction: commitRaw.touchAction, meetsMin: commitRaw.width >= 44 && commitRaw.height >= 44, vCenterPct: Math.round(((commitRaw.top + commitRaw.bottom) / 2 / device.h) * 1000) / 10, top: commitRaw.top, bottom: commitRaw.bottom, initiallyAboveFold: commitRaw.bottom <= device.h, overflowPx: commitRaw.bottom > device.h ? Math.round(commitRaw.bottom - device.h) : 0 }
    : null
  await page.screenshot({ path: `${OUT}/${device.name}-${world}-betentry-initial-unscrolled.png` })

  // NOW behave like a real mobile user: scroll each control into view before
  // tapping it (this is the only way the game is actually playable given the
  // measured fold position above).
  if (worldCard) {
    await page.evaluate((testid) => document.querySelector(`[data-testid="${testid}"]`)?.scrollIntoView({ block: 'center' }), modeSelector)
    await wait(200)
    const wc = await findByTestId(page, modeSelector)
    if (wc) await tapEl(page, wc)
    await wait(250)
  }

  const stepUp = await scrollIntoViewAndRemeasure(page, 'button', '^\\+$')
  let wagerBefore = null, wagerAfter = null
  if (stepUp) {
    wagerBefore = await page.evaluate(() => (document.querySelector('[data-testid="bet-console"]')?.innerText || '').match(/[\d,]+\.\d{2}\s*USDC/)?.[0] || null)
    await tapEl(page, stepUp)
    await wait(250)
    wagerAfter = await page.evaluate(() => (document.querySelector('[data-testid="bet-console"]')?.innerText || '').match(/[\d,]+\.\d{2}\s*USDC/)?.[0] || null)
  }
  result.stepperFires = wagerBefore !== null && wagerAfter !== null && wagerBefore !== wagerAfter

  const commitBtn = await scrollIntoViewAndRemeasure(page, 'button', '^send it')
  if (commitBtn) {
    await tapEl(page, commitBtn)
    const latency = await measureLatency(page, async () => (await phaseText(page)).match(/PUMPING|TRAIL READY|RUNNING TRAIL/i) !== null)
    result.commitToPlayingLatencyMs = latency
    await wait(300)
  } else {
    result.commitToPlayingLatencyMs = -1
  }

  // ── PLAYING PHASE ────────────────────────────────────────────────────
  const gridSize = world === 'shitcoin' ? 7 : 5
  let mineHit = false
  let tapLatencies = []

  if (world === 'shitcoin') {
    const cellSeq = [[0, 0], [3, 3], [6, 6], [1, 5], [5, 1], [2, 4], [4, 2], [0, 6], [6, 0], [3, 0]]
    for (const [cx, cy] of cellSeq) {
      const p = await tileCenter(page, gridSize, cx, cy)
      if (!p) break
      const before = await phaseText(page)
      await page.touchscreen.tap(p.x, p.y)
      const changed = await measureLatency(page, async () => (await phaseText(page)) !== before, 1200)
      tapLatencies.push(changed)
      await wait(250)
      const now = await phaseText(page)
      if (/RUGGED|BUST/i.test(now)) { mineHit = true; break }
    }
  } else {
    // bluechips (3/25 mines, ~12% density) — RNG board each round, so a
    // single fixed tile sequence can unluckily hit a mine on the "win"
    // attempt. Retry with a fresh round (BET AGAIN -> re-commit) up to 4x
    // so the WIN-branch settled geometry is genuinely measured, not an
    // accidental loss.
    for (let attempt = 0; attempt < 4; attempt++) {
      mineHit = false
      tapLatencies = []
      const cellSeq = [[0, 2], [2, 0]]
      for (const [cx, cy] of cellSeq) {
        const p = await tileCenter(page, gridSize, cx, cy)
        if (!p) break
        const before = await phaseText(page)
        await page.touchscreen.tap(p.x, p.y)
        const changed = await measureLatency(page, async () => (await phaseText(page)) !== before, 1200)
        tapLatencies.push(changed)
        await wait(250)
        const now = await phaseText(page)
        if (/RUGGED|BUST/i.test(now)) { mineHit = true; break }
      }
      if (!mineHit) break // got a live board with 2 safe reveals — proceed to cash out
      // rugged — bet again (scroll into view) and retry with a fresh board
      const again = await scrollIntoViewAndRemeasure(page, 'button', '^bet again')
      if (!again) break
      await tapEl(page, again)
      await wait(500)
      const commitBtn2 = await scrollIntoViewAndRemeasure(page, 'button', '^send it')
      if (!commitBtn2) break
      await tapEl(page, commitBtn2)
      await wait(600)
    }
  }
  result.tileTapLatenciesMs = tapLatencies
  result.mineHitDuringSweep = mineHit

  await page.evaluate(() => window.scrollTo(0, 0))
  await wait(100)
  if (!mineHit && outcomeLabel === 'win') {
    const cashOutRaw = await findByText(page, 'button', '^take profit', { notDisabled: true })
    if (cashOutRaw) {
      result.cashOutHit = { w: cashOutRaw.width, h: cashOutRaw.height, touchAction: cashOutRaw.touchAction, meetsMin: cashOutRaw.width >= 44 && cashOutRaw.height >= 44, vCenterPct: Math.round(((cashOutRaw.top + cashOutRaw.bottom) / 2 / device.h) * 1000) / 10, initiallyAboveFold: cashOutRaw.bottom <= device.h }
      const cashOut = await scrollIntoViewAndRemeasure(page, 'button', '^take profit')
      if (cashOut) await tapEl(page, cashOut)
      await wait(700)
    }
  } else if (!mineHit && outcomeLabel === 'loss') {
    // force loss by hammering more tiles until a mine is hit
    for (const [cx, cy] of [[1, 1], [2, 2], [4, 4], [5, 5], [6, 1], [1, 6], [3, 5], [5, 3], [0, 3], [3, 0]]) {
      const p = await tileCenter(page, gridSize, cx, cy)
      if (!p) break
      await page.touchscreen.tap(p.x, p.y)
      await wait(250)
      const now = await phaseText(page)
      if (/RUGGED|BUST/i.test(now)) { mineHit = true; break }
    }
  }
  await wait(700)
  await page.evaluate(() => window.scrollTo(0, 0))
  await wait(150)

  // ── SETTLED PHASE ────────────────────────────────────────────────────
  const settledPanel = await findByTestId(page, 'vault-settledpanel')
  result.settledPanelPresent = !!settledPanel
  const betAgain = await findByText(page, 'button', '^bet again')
  if (betAgain) {
    const vCenter = (betAgain.top + betAgain.bottom) / 2
    result.betAgainCta = {
      w: betAgain.width, h: betAgain.height,
      meetsMin: betAgain.width >= 44 && betAgain.height >= 44,
      top: betAgain.top, bottom: betAgain.bottom,
      touchAction: betAgain.touchAction,
      vCenterPct: Math.round((vCenter / device.h) * 1000) / 10,
      overflowPx: betAgain.bottom > device.h ? Math.round(betAgain.bottom - device.h) : 0,
      aboveFold: betAgain.bottom <= device.h,
    }
  } else {
    result.betAgainCta = null
  }

  // scroll metrics — reachable via scroll vs truly clipped
  const scrollInfo = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
    bodyOverflowY: getComputedStyle(document.body).overflowY,
  }))
  result.scrollInfo = scrollInfo

  // gutter/plate chrome expected-absent check
  const chromePresence = await page.evaluate(() => {
    const ids = ['vault-gutter-left', 'vault-gutter-right', 'vault-corner-gear', 'vault-corner-world', 'vault-corner-help', 'vault-playing-left', 'vault-playing-right', 'vault-settled-left', 'vault-settled-right']
    return ids.map((id) => ({ id, present: !!document.querySelector(`[data-testid="${id}"]`) }))
  })
  result.gutterChromePresent = chromePresence.filter((c) => c.present)

  // backdrop layer check
  const backdrop = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-grid-backdrop"]')
    if (!el) return null
    const cs = getComputedStyle(el)
    return { pointerEvents: cs.pointerEvents, zIndex: cs.zIndex, hasBgImage: cs.backgroundImage !== 'none' }
  })
  result.backdrop = backdrop

  // screenshot (unscrolled settled state, top of page — matches the raw
  // fold measurement above)
  const fname = `${OUT}/${device.name}-${world}-${outcomeLabel}-settled.png`
  await page.screenshot({ path: fname })
  result.screenshot = fname

  // NOW confirm BET AGAIN actually fires via a real touchscreen tap
  // (scroll into view first, matching real-user behavior — done AFTER the
  // screenshot/fold capture so it doesn't disturb the measured state).
  if (betAgain) {
    const btn2 = await scrollIntoViewAndRemeasure(page, 'button', '^bet again')
    if (btn2) {
      const before = await phaseText(page)
      await tapEl(page, btn2)
      const fireLatency = await measureLatency(page, async () => (await phaseText(page)) !== before, 1200)
      result.betAgainFiresMs = fireLatency
    }
  }

  return result
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const allResults = {}
  for (const device of DEVICES) {
    const page = await browser.newPage()
    await page.setUserAgent(device.ua)
    await page.setViewport({ width: device.w, height: device.h, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
    const consoleErrors = []
    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`))
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(`console.error: ${msg.text()}`) })

    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0', timeout: 60000 })
    await wait(600)

    const httpCheck = await page.evaluate(() => document.readyState)
    allResults[`${device.name}_ready`] = httpCheck

    console.log(`\n=== ${device.name} WIN (bluechips) ===`)
    const win = await runOutcome(page, device, 'bluechips', 'win', consoleErrors)
    console.log(JSON.stringify(win, null, 2))

    console.log(`\n=== ${device.name} LOSS (shitcoin) ===`)
    const loss = await runOutcome(page, device, 'shitcoin', 'loss', consoleErrors)
    console.log(JSON.stringify(loss, null, 2))

    allResults[device.name] = { win, loss, consoleErrors: [...new Set(consoleErrors)] }
    await page.close()
  }
  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(allResults, null, 2))
  console.log('\n\nDONE. Results written to', `${OUT}/results.json`)
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
