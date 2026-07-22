import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
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
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  for (const vp of [{w:1440,h:900},{w:1920,h:1080}]) {
    const page = await browser.newPage()
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 })
    await page.goto('http://localhost:5390/', { waitUntil: 'networkidle0' })
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
    await page.reload({ waitUntil: 'networkidle0' })
    await wait(400)
    await clickText(page, 'bluechips')
    await wait(150)
    await clickText(page, 'send it')
    await wait(700)
    const attrs = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-canvas-shell"]')
      return el ? { full: el.getAttribute('data-grid-full'), tile: el.getAttribute('data-grid-tile'), gap: el.getAttribute('data-grid-gap'), plate: el.getAttribute('data-grid-plate') } : null
    })
    console.log(`${vp.w}x${vp.h} grid attrs:`, JSON.stringify(attrs))
    await page.close()
  }
  await browser.close()
}
run().catch(e => { console.error(e); process.exit(1) })
