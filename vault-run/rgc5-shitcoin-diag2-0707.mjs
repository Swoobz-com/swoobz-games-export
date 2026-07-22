import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5282'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, t)
  const el = h.asElement(); if (!el) return false
  try { await el.click() } catch { return false }; return true
}
async function dismiss(page) { await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(150) }
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(350); await dismiss(page)
  await clickText(page, 'shitcoin'); await wait(300)
  await clickText(page, 'send it'); await wait(1200)
  const status1 = await page.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent)
  console.log('status after send it:', status1)
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  console.log('box', box)
  // click dead center
  await page.mouse.click(box.x + box.w * 0.5, box.y + box.h * 0.5)
  await wait(400)
  const status2 = await page.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent)
  console.log('status after center click:', status2)
  // click near top-left inset
  await page.mouse.click(box.x + box.w * 0.15, box.y + box.h * 0.15)
  await wait(400)
  const status3 = await page.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent)
  console.log('status after TL click:', status3)
  await page.screenshot({ path: 'shots-rgc5-resweep-0707/diag-shitcoin.png' })
  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
