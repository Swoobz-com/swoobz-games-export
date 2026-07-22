import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const tapText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  const box = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
  await page.touchscreen.tap(box.x, box.y)
  return true
}
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
await page.emulate({ viewport: { width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(400)
await tapText(page, 'ENTER THE DIVE')
await wait(400)
await tapText(page, 'REEF')
await wait(150)
const info = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const cr = c.getBoundingClientRect()
  const GRID = 14, TILE = 46
  const visible = []
  for (let r = 0; r < GRID; r++) {
    for (let col = 0; col < GRID; col++) {
      const x = cr.left + (col + 0.5) * TILE
      const y = cr.top + (r + 0.5) * TILE
      if (x >= 0 && x <= window.innerWidth && y >= 0 && y <= window.innerHeight) {
        visible.push({ r, col, x: Math.round(x), y: Math.round(y) })
      }
    }
  }
  return { canvasRect: { left: cr.left, top: cr.top, width: cr.width, height: cr.height }, viewportW: window.innerWidth, viewportH: window.innerHeight, visibleCount: visible.length, first10: visible.slice(0, 10) }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
