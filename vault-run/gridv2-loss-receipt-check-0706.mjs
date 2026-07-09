import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6001'
const OUT = 'shots-gridv2-loss-0706'
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document
    if (!root) return null
    const els = [...root.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(t.toLowerCase()))
  }, { t, within })
  const el = h.asElement()
  if (!el) return false
  await el.click()
  return true
}
async function clickCell(page, col, row, cols, rows) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  if (!box) return
  const fx = 0.05 + ((col + 0.5) / cols) * 0.9
  const fy = 0.06 + ((row + 0.5) / rows) * 0.82
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
}
async function isSettled(page) {
  return page.evaluate(() => (document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent || '').includes('SETTLED'))
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(700)
  await clickText(page, 'got it')
  await clickText(page, 'skip')
  await wait(300)
  await clickText(page, 'ape in')
  await wait(500)
  await clickText(page, 'shitcoin')
  await wait(300)
  await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
  await wait(900)

  let hit = false
  outer: for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      await clickCell(page, col, row, 7, 7)
      await wait(500)
      if (await isSettled(page)) { hit = true; break outer }
    }
  }
  await wait(700)
  console.log('rug hit within 49 taps:', hit)

  const banner = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-settled-banner"]')
    return el ? el.innerText : null
  })
  const topbar = await page.evaluate(() => document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent)
  console.log('HUD settled banner text:', banner)
  console.log('topbar:', topbar)
  await page.screenshot({ path: `${OUT}/loss-settled.png` })

  // receipt one-click reachability + content
  const before = await page.evaluate(() => document.querySelector('[data-testid="vault-ctl-receipt"]')?.innerText)
  const clicked = await clickText(page, 'view receipt')
  await wait(400)
  const after = await page.evaluate(() => document.querySelector('[data-testid="vault-ctl-receipt"]')?.innerText)
  console.log('receipt click worked:', clicked)
  console.log('receipt BEFORE (first 80 chars):', (before || '').slice(0, 80))
  console.log('receipt AFTER (first 300 chars):', (after || '').slice(0, 300))
  await page.screenshot({ path: `${OUT}/loss-receipt-expanded.png` })

  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
