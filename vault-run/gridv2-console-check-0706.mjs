import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6001'
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
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  const errors = []
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message))
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(700)
  await clickText(page, 'got it')
  await clickText(page, 'skip')
  await wait(300)
  await clickText(page, 'ape in')
  await wait(500)
  await clickText(page, 'bluechips')
  await wait(200)
  await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
  await wait(800)
  await clickCell(page, 0, 0, 5, 5)
  await wait(500)
  await clickText(page, 'take profit')
  await wait(800)
  await clickText(page, 'bet again')
  await wait(800)
  console.log('console/page errors during full loop:', errors.length)
  errors.forEach((e) => console.log(' -', e))
  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
