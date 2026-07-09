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
await p.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await clickText(p, 'send it')
await wait(1200)
const info = await p.evaluate(() => {
  const canvases = [...document.querySelectorAll('canvas')]
  return canvases.map((c) => {
    const r = c.getBoundingClientRect()
    return { dataTestId: c.getAttribute('data-testid'), rect: { x: r.x, y: r.y, w: r.width, h: r.height }, cssW: getComputedStyle(c).width, cssH: getComputedStyle(c).height, attrW: c.width, attrH: c.height }
  })
})
console.log('canvas count:', info.length)
console.log(JSON.stringify(info, null, 2))
await b.close()
