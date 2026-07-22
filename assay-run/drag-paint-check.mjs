import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5200/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.emulate({
  viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
})
await page.goto(URL, { waitUntil: 'networkidle2' })
await wait(400)
const enterBtn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /ENTER THE ASSAY LINE/.test(b.textContent || '')))
await enterBtn.asElement().click()
await wait(400)

const trailLenText = () => page.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /^\d{2}$/.test(e.textContent || ''))
  return el ? el.textContent : null
})

const scroller = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const r = c.parentElement.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
console.log('trail before drag:', await trailLenText())

// A drag across 3 tile-widths (46*3=138px) horizontally within the canvas —
// on DESKTOP this would paint 3 tiles; on MOBILE this should be pure pan
// (native scroll takes over) and NOT add any tiles.
const startX = scroller.x + 30
const startY = scroller.y + 30
const touch = await page.touchscreen.touchStart(startX, startY)
for (let i = 1; i <= 6; i++) {
  await touch.move(startX + i * 23, startY, { steps: 1 })
  await wait(20)
}
await touch.end()
await wait(300)
console.log('trail after 138px horizontal drag:', await trailLenText())

const scrollAfter = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const s = c.parentElement
  return { scrollLeft: s.scrollLeft, scrollTop: s.scrollTop }
})
console.log('scroll after drag:', scrollAfter)
await browser.close()
process.exit(0)
