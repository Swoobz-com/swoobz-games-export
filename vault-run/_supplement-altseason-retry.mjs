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
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  const fx = 0.06 + ((col + 0.5) / cols) * 0.88
  const fy = 0.08 + ((row + 0.5) / rows) * 0.80
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
}
async function text(page, sel) { return page.evaluate((sel) => { const el = document.querySelector(sel); return el ? el.textContent.replace(/\s+/g,' ').trim() : null }, sel) }
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
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
  await clickCell(page, 2, 2, 5, 5)
  await wait(500)
  const cashout = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => /take profit/i.test(b.textContent||''))
    const btn = btns.find(b => b.offsetParent !== null && !b.disabled)
    if (btn) { btn.click(); return true }
    return false
  })
  await wait(700)
  const result = {
    cashoutClicked: cashout,
    settledBanner: await text(page, '[data-testid="vault-settled-banner"]'),
    boardCaption: await text(page, '[data-testid="vault-settled-board-caption"]'),
  }
  await page.screenshot({ path: `${OUT}/supp-altseason-retry-settled.png` })
  console.log(JSON.stringify(result, null, 2))
  await browser.close()
}
run().catch(e => { console.error('FATAL', e); process.exit(1) })
