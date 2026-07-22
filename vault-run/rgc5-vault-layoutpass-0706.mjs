// rgc5-vault-layoutpass-0706.mjs — independent RG-C5/C3 re-verify of the
// vault layout rebuild (uniform world-picker + shell/spacing audit).
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5729'
const OUT = process.argv[3] || `shots-rgc5-layoutpass-${Date.now()}`
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

async function detectSettled(page) {
  return page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
}

async function rect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      background: cs.background, color: cs.color, padding: cs.padding,
      borderRadius: cs.borderRadius, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
    }
  }, sel)
}

async function textOf(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : null
  }, sel)
}

async function bestBadgeVisible(page) {
  return page.evaluate(() => {
    const nodes = [...document.querySelectorAll('span')]
    return nodes.some((n) => (n.textContent || '').trim() === 'BEST' && n.offsetParent !== null)
  })
}

async function worldPickerPresent(page) {
  return page.evaluate(() => !!document.querySelector('[data-testid="vault-board-worldpicker"]'))
}

async function pageText(page) {
  return page.evaluate(() => document.body.innerText)
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

  // ─── PHASE 0: Lobby ────────────────────────────────────────────────
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(600)
  await clickText(page, 'got it')
  await clickText(page, 'skip')
  await wait(300)
  results.lobby = {
    bestVisible: await bestBadgeVisible(page),
    worldPickerPresent: await worldPickerPresent(page),
  }
  await page.screenshot({ path: `${OUT}/00-lobby.png` })

  // ─── PHASE 1: Bet-entry — BEST badge should be visible (config screen) ──
  await clickText(page, 'ape in')
  await wait(500)
  results.betEntry = {
    bestVisible: await bestBadgeVisible(page),
    worldPickerPresent: await worldPickerPresent(page),
  }
  await page.screenshot({ path: `${OUT}/01-betentry.png` })
  await clickText(page, 'bluechips')
  await wait(150)

  // ─── PHASE 2: Playing — BEST badge must be ABSENT (live round) ───────
  await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
  await wait(700)
  await clickCell(page, 1, 1, 5, 5)
  await wait(500)
  results.playing = {
    bestVisible: await bestBadgeVisible(page),
    worldPickerPresent: await worldPickerPresent(page),
  }
  await page.screenshot({ path: `${OUT}/02-playing.png` })

  // ─── WIN settle via TAKE PROFIT ───────────────────────────────────────
  await clickText(page, 'take profit')
  await wait(900)
  results.win = {
    settled: await detectSettled(page),
    bestVisible: await bestBadgeVisible(page),
    worldPickerPresent: await worldPickerPresent(page),
    banner: await rect(page, '[data-testid="vault-settled-banner"]'),
    bannerText: await textOf(page, '[data-testid="vault-settled-banner"]'),
    cta: await rect(page, '[data-testid="vault-ctl-cta"]'),
    betAgainBtn: await rect(page, '[data-testid="vault-settled-betagain"]'),
    betAgainText: await textOf(page, '[data-testid="vault-settled-betagain"]'),
  }
  await page.screenshot({ path: `${OUT}/03-win-settled.png` })
  const winReceiptClicked = await clickText(page, 'view receipt')
  await wait(400)
  results.win.receiptClicked = winReceiptClicked
  results.win.receiptBodyText = (await pageText(page)).includes('seed') || (await pageText(page)).toLowerCase().includes('hash')
  await page.screenshot({ path: `${OUT}/04-win-receipt.png` })

  // ─── LOSS run ──────────────────────────────────────────────────────
  await newRound(page)
  let hitRug = false
  for (let i = 0; i < 24 && !hitRug; i++) {
    const col = i % 5, row = Math.floor(i / 5) % 5
    await clickCell(page, col, row, 5, 5)
    await wait(350)
    hitRug = await detectSettled(page)
    if (hitRug) break
  }
  results.lossHitRug = hitRug
  await wait(700)
  results.loss = {
    bestVisible: await bestBadgeVisible(page),
    worldPickerPresent: await worldPickerPresent(page),
    banner: await rect(page, '[data-testid="vault-settled-banner"]'),
    bannerText: await textOf(page, '[data-testid="vault-settled-banner"]'),
    cta: await rect(page, '[data-testid="vault-ctl-cta"]'),
    betAgainBtn: await rect(page, '[data-testid="vault-settled-betagain"]'),
    betAgainText: await textOf(page, '[data-testid="vault-settled-betagain"]'),
  }
  await page.screenshot({ path: `${OUT}/05-loss-settled.png` })
  const lossReceiptClicked = await clickText(page, 'view receipt')
  await wait(400)
  results.loss.receiptClicked = lossReceiptClicked
  results.loss.receiptBodyText = (await pageText(page)).includes('seed') || (await pageText(page)).toLowerCase().includes('hash')
  await page.screenshot({ path: `${OUT}/06-loss-receipt.png` })

  // ─── copy scan across all captured phases ─────────────────────────────
  results.fullPageTextLossPhase = await pageText(page)

  results.consoleErrors = consoleErrors
  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}

run().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
