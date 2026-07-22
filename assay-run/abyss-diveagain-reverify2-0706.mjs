import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
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
// dismiss the coachmark tooltip if present (the little X)
await page.evaluate(() => {
  const x = [...document.querySelectorAll('button, [role=button], span')].find(el => el.textContent === '×' || el.textContent === '✕' || el.getAttribute('aria-label') === 'dismiss')
})
await tapText(page, 'REEF')
await wait(150)

const tiles = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const cr = c.getBoundingClientRect()
  const GRID = 14, TILE = 46
  const visible = []
  for (let r = 0; r < GRID; r++) {
    for (let col = 0; col < GRID; col++) {
      const x = cr.left + (col + 0.5) * TILE
      const y = cr.top + (r + 0.5) * TILE
      if (x >= 5 && x <= window.innerWidth - 5 && y >= 400 && y <= 700) {
        visible.push({ r, col, x, y })
      }
    }
  }
  return visible
})
console.log('candidate tiles:', tiles.length)
for (let i = 0; i < 8 && i < tiles.length; i++) {
  await page.touchscreen.tap(tiles[i].x, tiles[i].y)
  await wait(70)
}

const preRun = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('RUN THE LINE'))
  return b ? { text: b.textContent, disabled: b.disabled } : null
})
console.log('pre-run button state:', JSON.stringify(preRun))

const fired = await tapText(page, 'RUN THE LINE')
console.log('RUN THE LINE tap fired:', fired)

let settled = null
for (let i = 0; i < 40; i++) {
  await wait(200)
  settled = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const dive = btns.find((b) => b.textContent && b.textContent.includes('DIVE AGAIN'))
    if (!dive) return { found: false }
    const r = dive.getBoundingClientRect()
    return { found: true, top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), width: Math.round(r.width) }
  })
  if (settled.found) break
}
console.log('DIVE AGAIN settle state:', JSON.stringify(settled))
await page.screenshot({ path: 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/abyss-fixpass/iphone14pro-reverify-settled.png' })
await browser.close()
