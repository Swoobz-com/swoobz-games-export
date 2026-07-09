// fabi0706-verify2.mjs — independent re-verification, same-grid (bluechips
// 5x5) WIN vs LOSS apples-to-apples comparison, cross-phase board-Y capture,
// data-grid-* attribute capture, VAULT_PLATE_BORDER computed-style check,
// and 3x3 pixel-sample scrim/backdrop variance check via pngjs.
import puppeteer from 'puppeteer-core'
import fs from 'fs'
import { PNG } from 'pngjs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 6612
const OUT = 'shots-fabi0706-v2'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, t)
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
async function dismiss(page) { await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(200) }

async function rect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }
  }, sel)
}
async function gridAttrs(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-canvas-shell"]')
    if (!el) return null
    return {
      full: el.getAttribute('data-grid-full'),
      tile: el.getAttribute('data-grid-tile'),
      gap: el.getAttribute('data-grid-gap'),
      plate: el.getAttribute('data-grid-plate'),
    }
  })
}
async function countBetAgain(page) {
  return page.evaluate(() => [...document.querySelectorAll('button')].filter((e) => (e.textContent || '').trim().toLowerCase().startsWith('bet again')).length)
}
async function plateBorderCheck(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const cs = getComputedStyle(el)
    return { borderColor: cs.borderColor, borderTopWidth: cs.borderTopWidth, borderRadius: cs.borderRadius, boxShadow: cs.boxShadow.slice(0, 120) }
  }, sel)
}

async function goStart(page) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(500)
  await dismiss(page)
}

async function selectBluechips(page) {
  await clickText(page, 'bluechips')
  await wait(200)
}

// Row-major 5x5 click sequence (used for BOTH win and loss forcing so the
// grid/board metrics are apples-to-apples; win stops early via take-profit,
// loss keeps going until a mine fires).
function seq5x5() {
  const s = []
  for (let cy = 0; cy < 5; cy++) for (let cx = 0; cx < 5; cx++) s.push([cx, cy])
  return s
}

async function clickCell(page, cx, cy, n) {
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  if (!box) return
  const fx = 0.06 + ((cx + 0.5) / n) * 0.88
  const fy = 0.08 + ((cy + 0.5) / n) * 0.8
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
}

async function isSettled(page) { return page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]')) }

async function driveBluechipsWin(page) {
  await selectBluechips(page)
  await clickText(page, 'send it')
  await wait(900)
  for (const [cx, cy] of seq5x5()) {
    if (await isSettled(page)) return true
    const tpVisible = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent||'').trim().toLowerCase().includes('take profit'))
      return !!btn && btn.offsetParent !== null && !btn.disabled
    })
    if (tpVisible) { await clickText(page, 'take profit'); await wait(1000); return true }
    await clickCell(page, cx, cy, 5)
    await wait(350)
  }
  if (!(await isSettled(page))) { await clickText(page, 'take profit'); await wait(1000) }
  return isSettled(page)
}

async function driveBluechipsLoss(page) {
  await selectBluechips(page)
  await clickText(page, 'send it')
  await wait(900)
  for (const [cx, cy] of seq5x5()) {
    if (await isSettled(page)) break
    await clickCell(page, cx, cy, 5)
    await wait(300)
  }
  await wait(500)
  const settled = await isSettled(page)
  if (settled) {
    const won = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-hud-pump-value"]')
      return el ? el.textContent : null
    })
    return { settled, won }
  }
  return { settled: false, won: null }
}

// crude 3x3 sample-grid variance from a PNG buffer (screenshot)
function sampleVariance(png, x0, y0, x1, y1) {
  const pts = []
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const px = Math.round(x0 + (x1 - x0) * (i + 0.5) / 3)
      const py = Math.round(y0 + (y1 - y0) * (j + 0.5) / 3)
      const idx = (png.width * py + px) << 2
      pts.push({ x: px, y: py, r: png.data[idx], g: png.data[idx + 1], b: png.data[idx + 2] })
    }
  }
  const mean = pts.reduce((a, p) => a + (p.r + p.g + p.b) / 3, 0) / pts.length
  const variance = pts.reduce((a, p) => a + ((p.r + p.g + p.b) / 3 - mean) ** 2, 0) / pts.length
  return { pts, mean, variance }
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))

  const desktopViewports = [
    { name: 'd1440x900', w: 1440, h: 900 },
    { name: 'd1920x1080', w: 1920, h: 1080 },
  ]
  const mobileViewports = [
    { name: 'pixel7', w: 412, h: 915 },
    { name: 'iphone14pro', w: 393, h: 852 },
  ]
  const results = { desktop: {}, mobile: {} }

  for (const v of desktopViewports) {
    await page.setViewport({ width: v.w, height: v.h, deviceScaleFactor: 1 })
    const r = {}

    // PHASE 1: bet-entry
    await goStart(page)
    await selectBluechips(page)
    await wait(300)
    r.betEntry = {
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      grid: await gridAttrs(page),
      control: await rect(page, '[data-testid="DesktopControlColumn"]'),
    }

    // PHASE 2: playing (mid-round)
    await clickText(page, 'send it')
    await wait(900)
    await clickCell(page, 2, 2, 5) // one reveal, mid-board
    await wait(500)
    r.playing = {
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      grid: await gridAttrs(page),
      control: await rect(page, '[data-testid="DesktopControlColumn"]'),
    }
    await page.screenshot({ path: `${OUT}/${v.name}-playing.png`, fullPage: false })

    // PHASE 3: settled WIN (continue same round to take-profit)
    let settledWin = false
    for (const [cx, cy] of seq5x5()) {
      if (await isSettled(page)) { settledWin = true; break }
      const tpVisible = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent||'').trim().toLowerCase().includes('take profit'))
        return !!btn && btn.offsetParent !== null && !btn.disabled
      })
      if (tpVisible) { await clickText(page, 'take profit'); await wait(1000); settledWin = true; break }
      await clickCell(page, cx, cy, 5)
      await wait(300)
    }
    if (!settledWin) { await clickText(page, 'take profit'); await wait(1000) }
    r.settledWin = {
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      grid: await gridAttrs(page),
      control: await rect(page, '[data-testid="DesktopControlColumn"]'),
      banner: await rect(page, '[data-testid="vault-settled-banner"]'),
      scrim: await rect(page, '[data-testid="vault-scene-edge-scrim"]'),
      betAgainCount: await countBetAgain(page),
      boardVaultRebetPresent: await page.evaluate(() => !!document.querySelector('[data-testid="vault-board-rebet"]')),
      plateBorder: await plateBorderCheck(page, '[data-testid="DesktopControlColumn"] > *'),
      outcomeText: await page.evaluate(() => document.querySelector('[data-testid="vault-hud-pump-value"]')?.textContent || null),
    }
    await page.screenshot({ path: `${OUT}/${v.name}-settled-win.png`, fullPage: false })

    // PHASE 4: settled LOSS — fresh round, same mode
    await goStart(page)
    const lossOut = await driveBluechipsLoss(page)
    r.lossDriveResult = lossOut
    if (lossOut.settled && lossOut.won !== 'BUST') {
      // retry once with a different click order if we accidentally won
      await goStart(page)
      const retry = await driveBluechipsLoss(page)
      r.lossDriveRetry = retry
    }
    r.settledLoss = {
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      grid: await gridAttrs(page),
      control: await rect(page, '[data-testid="DesktopControlColumn"]'),
      banner: await rect(page, '[data-testid="vault-settled-banner"]'),
      scrim: await rect(page, '[data-testid="vault-scene-edge-scrim"]'),
      betAgainCount: await countBetAgain(page),
      boardVaultRebetPresent: await page.evaluate(() => !!document.querySelector('[data-testid="vault-board-rebet"]')),
      plateBorder: await plateBorderCheck(page, '[data-testid="DesktopControlColumn"] > *'),
      outcomeText: await page.evaluate(() => document.querySelector('[data-testid="vault-hud-pump-value"]')?.textContent || null),
    }
    const shotPath = `${OUT}/${v.name}-settled-loss.png`
    await page.screenshot({ path: shotPath, fullPage: false })

    // pixel-sample scenic backdrop/scrim on the settled-loss shot: 3x3 grid
    // over the whole viewport excluding topbar(56px)/hud(64px)/statusbar zones
    const png = PNG.sync.read(fs.readFileSync(shotPath))
    const boardR = r.settledLoss.board
    if (boardR) {
      r.scenicVariance = sampleVariance(png, boardR.left, boardR.top, boardR.right, boardR.bottom)
    }
    // edge column sample (control-column side, should read darker than mid-board)
    r.controlEdgeSample = sampleVariance(png, Math.round(v.w * 0.82), 100, v.w - 4, v.h - 100)

    results.desktop[v.name] = r
  }

  for (const v of mobileViewports) {
    await page.setViewport({ width: v.w, height: v.h, deviceScaleFactor: 1 })
    const r = {}
    // WIN
    await goStart(page)
    await driveBluechipsWin(page)
    r.win = {
      banner: await rect(page, '[data-testid="vault-settled-banner"]'),
      caption: await rect(page, '[data-testid="vault-settled-board-caption"]'),
      betAgainCount: await countBetAgain(page),
      boardVaultRebetPresent: await page.evaluate(() => !!document.querySelector('[data-testid="vault-board-rebet"]')),
    }
    const ctaWin = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent||'').trim().toLowerCase() === 'bet again →')
      if (!btn) return null
      const rr = btn.getBoundingClientRect()
      return { top: Math.round(rr.top), bottom: Math.round(rr.bottom) }
    })
    r.win.cta = ctaWin
    r.win.ctaBelowFoldPx = ctaWin ? Math.max(0, ctaWin.bottom - v.h) : null
    await page.screenshot({ path: `${OUT}/${v.name}-mobile-win.png`, fullPage: false })

    // LOSS same mode
    await goStart(page)
    const lossOut = await driveBluechipsLoss(page)
    r.lossDriveResult = lossOut
    r.loss = {
      banner: await rect(page, '[data-testid="vault-settled-banner"]'),
      caption: await rect(page, '[data-testid="vault-settled-board-caption"]'),
      betAgainCount: await countBetAgain(page),
      boardVaultRebetPresent: await page.evaluate(() => !!document.querySelector('[data-testid="vault-board-rebet"]')),
    }
    const ctaLoss = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent||'').trim().toLowerCase() === 'bet again →')
      if (!btn) return null
      const rr = btn.getBoundingClientRect()
      return { top: Math.round(rr.top), bottom: Math.round(rr.bottom) }
    })
    r.loss.cta = ctaLoss
    r.loss.ctaBelowFoldPx = ctaLoss ? Math.max(0, ctaLoss.bottom - v.h) : null
    await page.screenshot({ path: `${OUT}/${v.name}-mobile-loss.png`, fullPage: false })

    results.mobile[v.name] = r
  }

  results.consoleErrors = consoleErrors
  fs.writeFileSync(`${OUT}/results2.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
