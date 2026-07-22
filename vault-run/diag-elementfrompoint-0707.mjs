import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5287'
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
  try { await el.click() } catch { return false }
  return true
}
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))
p.on('console', (m) => console.log('CONSOLE', m.text()))
await p.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await clickText(p, 'send it')
await wait(1200)
const cx = 128.73, cy = 336.31
const el = await p.evaluate(({ cx, cy }) => {
  const e = document.elementFromPoint(cx, cy)
  if (!e) return null
  return { tag: e.tagName, testid: e.getAttribute('data-testid'), cls: e.className, rect: e.getBoundingClientRect ? (({ x, y, width, height }) => ({ x, y, width, height }))(e.getBoundingClientRect()) : null }
}, { cx, cy })
console.log('elementFromPoint:', JSON.stringify(el))
const statusBefore = await p.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent)
console.log('status before:', statusBefore)
await p.mouse.click(cx, cy)
await wait(500)
const statusAfter = await p.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent)
console.log('status after click:', statusAfter)
// Also try Puppeteer's touchscreen tap since hasTouch is enabled
await p.touchscreen.tap(cx + 60, cy + 60).catch((e) => console.log('touch tap err', e.message))
await wait(500)
const statusAfterTouch = await p.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent)
console.log('status after touch tap:', statusAfterTouch)
await b.close()
