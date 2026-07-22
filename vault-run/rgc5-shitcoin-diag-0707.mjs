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
  const clicked = await clickText(page, 'shitcoin')
  console.log('clicked shitcoin:', clicked)
  await wait(150)
  const modeText = await page.evaluate(() => document.body.innerText.match(/SHITCOIN|BLUECHIPS|ALTSEASON/g))
  console.log('mode text present:', modeText)
  const sendItClicked = await clickText(page, 'send it')
  console.log('clicked send it:', sendItClicked)
  await wait(700)
  const status = await page.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent || 'NO STATUS EL')
  console.log('status:', status)
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  console.log('box:', box)
  for (let i = 0; i < 8; i++) {
    const fx = 0.06 + ((0 + 0.5) / 7) * 0.88
    const fy = 0.08 + ((i + 0.5) / 7) * 0.8
    await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
    await wait(90)
    const st = await page.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent || 'settled?')
    const tier = await page.evaluate(() => document.querySelector('[data-testid="vault-rhythm-badge"]')?.getAttribute('data-tier') || null)
    console.log(i, st, 'tier=', tier)
  }
  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
