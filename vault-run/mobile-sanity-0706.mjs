import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6302'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, t)
  const el = h.asElement()
  if (!el) return false
  await el.click().catch(() => {})
  return true
}
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await wait(500)
await clickText(page, 'got it')
await clickText(page, 'skip')
await wait(250)
await clickText(page, 'ape in')
await wait(500)
await page.screenshot({ path: 'shots-mobile-sanity-0706-betentry.png', fullPage: true })
await browser.close()
console.log('done')
