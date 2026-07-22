import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = 'shots-gameflowqa-0707'

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
async function clickCell(page, col, row, cols, rows) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  if (!box) return false
  const fx = 0.06 + ((col + 0.5) / cols) * 0.88
  const fy = 0.08 + ((row + 0.5) / rows) * 0.80
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
  return true
}
async function phaseKind(page) {
  return page.evaluate(() => {
    if (document.querySelector('[data-testid="vault-settled-banner"]')) return 'settled'
    if (document.querySelector('[data-testid="vault-board-worldpicker"]') || document.querySelector('[data-testid="bet-console"]')) return 'bet-entry'
    if (document.querySelector('canvas')) return 'playing'
    return 'unknown'
  })
}
async function text(page, sel) {
  return page.evaluate((sel) => { const el = document.querySelector(sel); return el ? el.textContent.replace(/\s+/g,' ').trim() : null }, sel)
}
async function rect(page, sel) {
  return page.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return {top:Math.round(r.top),left:Math.round(r.left),w:Math.round(r.width),h:Math.round(r.height),bottom:Math.round(r.bottom),right:Math.round(r.right)} }, sel)
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const results = {}

  // ── SHITCOIN 7x7 explicit LOSS (desktop 1440) ──────────────────────
  {
    const page = await browser.newPage()
    const consoleErrors = []
    page.on('console', m => { if (m.type()==='error') consoleErrors.push(m.text()) })
    page.on('pageerror', e => consoleErrors.push('PAGEERROR: '+e.message))
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
    await page.goto('http://localhost:5390/', { waitUntil: 'networkidle0' })
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
    await page.reload({ waitUntil: 'networkidle0' })
    await wait(400)
    await clickText(page, 'shitcoin')
    await wait(200)
    // grid mainGrid rect at bet-entry for shitcoin selected (still 5x5 preview since not committed) -- capture post-commit instead
    await clickText(page, 'send it')
    await wait(700)
    results.shitcoinPlayingBoard = await rect(page, '[data-testid="vault-canvas-shell"]')
    results.shitcoinMainGrid = await rect(page, '[data-testid="vault-grid-mainGrid"]')
    await page.screenshot({ path: `${OUT}/supp-shitcoin-01-playing.png` })
    const cellSeq = [[0,0],[6,6],[3,3],[1,5],[5,1],[2,4],[4,2],[0,6],[6,0],[1,1],[5,5],[2,2],[4,4],[3,0],[0,3],[6,3],[6,1],[1,6],[5,0],[0,5],[4,6],[6,4],[2,0],[0,2],[1,3],[3,1],[5,3],[3,5]]
    let settled = false
    for (const [c,r] of cellSeq) {
      if (await phaseKind(page) === 'settled') { settled = true; break }
      await clickCell(page, c, r, 7, 7)
      await wait(280)
    }
    await wait(500)
    results.shitcoinLossSettled = settled
    results.shitcoinSettledBanner = await text(page, '[data-testid="vault-settled-banner"]')
    results.shitcoinReceiptPresent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-ctl-receipt"]'))
    results.shitcoinBoardCaption = await text(page, '[data-testid="vault-settled-board-caption"]')
    results.shitcoinSettledBoard = await rect(page, '[data-testid="vault-canvas-shell"]')
    await page.screenshot({ path: `${OUT}/supp-shitcoin-02-settled.png` })
    results.shitcoinConsoleErrors = consoleErrors
    await page.close()
  }

  // ── ALTSEASON 5x5 spot check WIN (desktop 1440) ────────────────────
  {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
    await page.goto('http://localhost:5390/', { waitUntil: 'networkidle0' })
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
    await page.reload({ waitUntil: 'networkidle0' })
    await wait(400)
    await clickText(page, 'altseason')
    await wait(200)
    await clickText(page, 'send it')
    await wait(700)
    await page.screenshot({ path: `${OUT}/supp-altseason-01-playing.png` })
    await clickCell(page, 0, 0, 5, 5)
    await wait(400)
    const cashout = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')].filter(b => /take profit/i.test(b.textContent||''))
      const btn = btns.find(b => b.offsetParent !== null)
      if (btn) { btn.click(); return true }
      return false
    })
    await wait(700)
    results.altseasonCashoutClicked = cashout
    results.altseasonSettledBanner = await text(page, '[data-testid="vault-settled-banner"]')
    results.altseasonBoardCaption = await text(page, '[data-testid="vault-settled-board-caption"]')
    await page.screenshot({ path: `${OUT}/supp-altseason-02-settled.png` })
    await page.close()
  }

  // ── Shell-spec structural check: mainGrid width should be 544/592px per
  // layout-spec comment (96px tile x N + 16px gaps), independent of board.top ──
  {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
    await page.goto('http://localhost:5390/', { waitUntil: 'networkidle0' })
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
    await page.reload({ waitUntil: 'networkidle0' })
    await wait(400)
    await clickText(page, 'bluechips')
    await wait(150)
    await clickText(page, 'send it')
    await wait(700)
    results.bluechipsMainGrid = await rect(page, '[data-testid="vault-grid-mainGrid"]')
    results.bluechipsControlCol = await rect(page, '[data-testid="DesktopControlColumn"]')
    await page.close()
  }

  await browser.close()
  fs.writeFileSync(`${OUT}/supplement-results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}
run().catch(e => { console.error('FATAL', e); process.exit(1) })
