// rgc5-holdgate-round2-0706.mjs — INDEPENDENT RG-C5 compliance driver.
// Own port, own screenshots dir, own measurement code. Forces BOTH a WIN
// (tap 1 safe tile, cash out via TAKE PROFIT) and a LOSS (tap tiles until a
// rug hits) and measures/screenshots the settled banner + CTA + receipt for
// structural win/loss symmetry per the RG-C5 compliance brief.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6101'
const OUT = process.argv[3] || `shots-rgc5-round2-${Date.now()}`
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(
    ({ t, within }) => {
      const root = within ? document.querySelector(within) : document
      if (!root) return null
      const els = [...root.querySelectorAll('button,[role=button],a')]
      const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
      const lc = t.toLowerCase()
      return (
        els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
        els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) ||
        null
      )
    },
    { t, within },
  )
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}

async function clickCell(page, col, row, cols, rows) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  if (!box) return false
  const fx = 0.05 + ((col + 0.5) / cols) * 0.9
  const fy = 0.06 + ((row + 0.5) / rows) * 0.82
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
  return true
}

async function detectPhase(page) {
  return page.evaluate(() => {
    if (document.querySelector('[data-testid="vault-settled-banner"]')) return 'settled'
    return null
  })
}

async function rect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      background: cs.background, backgroundColor: cs.backgroundColor, backgroundImage: cs.backgroundImage,
      color: cs.color, padding: cs.padding, borderRadius: cs.borderRadius, fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
    }
  }, sel)
}

async function textOf(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : null
  }, sel)
}

async function newRound(page) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(600)
  await clickText(page, 'got it')
  await clickText(page, 'skip')
  await wait(200)
  await clickText(page, 'ape in')
  await wait(400)
  await clickText(page, 'bluechips')
  await wait(150)
  await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
  await wait(700)
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=1'],
  })
  const page = await browser.newPage()
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push('PAGE ERROR: ' + e.message))

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

  const results = { port: PORT, out: OUT }

  // ─── WIN RUN: tap tile(0,0), then TAKE PROFIT ─────────────────────────
  await newRound(page)
  await clickCell(page, 1, 1, 5, 5)
  await wait(600)
  const midPhase = await page.evaluate(() => !!document.querySelector('[data-testid="vault-ctl-wager-locked"]'))
  await clickText(page, 'take profit')
  await wait(900)
  let phase = await detectPhase(page)
  results.winPhaseReached = phase
  results.win = {}
  results.win.banner = await rect(page, '[data-testid="vault-settled-banner"]')
  results.win.bannerText = await textOf(page, '[data-testid="vault-settled-banner"]')
  results.win.cta = await rect(page, '[data-testid="vault-ctl-cta"]')
  results.win.betAgainBtn = await rect(page, '[data-testid="vault-settled-betagain"]')
  results.win.betAgainText = await textOf(page, '[data-testid="vault-settled-betagain"]')
  results.win.receiptToggle = await rect(page, '.vault-receipt-toggle')
  results.win.receiptToggleText = await textOf(page, '.vault-receipt-toggle')
  results.win.receiptCard = await rect(page, '[data-testid="vault-settled-receipt-card"]')
  results.win.heroOverlayText = await textOf(page, '[data-testid="vault-hero-overlay"]')
  await page.screenshot({ path: `${OUT}/win-settled-full.png` })
  // click receipt toggle, verify one-click expand
  await clickText(page, 'view receipt')
  await wait(300)
  results.win.receiptExpandedBody = await textOf(page, '#vault-gutter-settled-receipt')
  await page.screenshot({ path: `${OUT}/win-settled-receipt-expanded.png` })

  // ─── LOSS RUN: tap tiles repeatedly until rug hits (up to 24 taps on 5x5) ─
  await newRound(page)
  let hitRug = false
  for (let i = 0; i < 24 && !hitRug; i++) {
    const col = i % 5, row = Math.floor(i / 5) % 5
    await clickCell(page, col, row, 5, 5)
    await wait(350)
    hitRug = await detectPhase(page) === 'settled'
    if (hitRug) break
  }
  results.lossHitRug = hitRug
  await wait(700)
  results.loss = {}
  results.loss.banner = await rect(page, '[data-testid="vault-settled-banner"]')
  results.loss.bannerText = await textOf(page, '[data-testid="vault-settled-banner"]')
  results.loss.cta = await rect(page, '[data-testid="vault-ctl-cta"]')
  results.loss.betAgainBtn = await rect(page, '[data-testid="vault-settled-betagain"]')
  results.loss.betAgainText = await textOf(page, '[data-testid="vault-settled-betagain"]')
  results.loss.receiptToggle = await rect(page, '.vault-receipt-toggle')
  results.loss.receiptToggleText = await textOf(page, '.vault-receipt-toggle')
  results.loss.receiptCard = await rect(page, '[data-testid="vault-settled-receipt-card"]')
  results.loss.heroOverlayText = await textOf(page, '[data-testid="vault-hero-overlay"]')
  await page.screenshot({ path: `${OUT}/loss-settled-full.png` })
  await clickText(page, 'view receipt')
  await wait(300)
  results.loss.receiptExpandedBody = await textOf(page, '#vault-gutter-settled-receipt')
  await page.screenshot({ path: `${OUT}/loss-settled-receipt-expanded.png` })

  // ─── TAKE PROFIT reachability during Playing (unconditional render check) ─
  await newRound(page)
  results.takeProfitPreTap = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const b = btns.find((x) => (x.textContent || '').toLowerCase().includes('take profit') || (x.textContent||'').toLowerCase()==='take profit')
    return b ? { present: true, disabled: b.disabled, text: (b.textContent||'').trim() } : { present: false }
  })
  await clickCell(page, 2, 2, 5, 5)
  await wait(500)
  results.takeProfitPostTap = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const b = btns.find((x) => (x.textContent || '').toLowerCase().includes('take profit'))
    return b ? { present: true, disabled: b.disabled, text: (b.textContent||'').trim() } : { present: false }
  })
  await page.screenshot({ path: `${OUT}/takeprofit-playing.png` })

  results.consoleErrors = consoleErrors

  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}

run().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
