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

const tile = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const cr = c.getBoundingClientRect()
  const TILE = 46
  return { x: cr.left + 5.5*TILE, y: cr.top + 8.5*TILE }
})
console.log('tapping at', tile)

// Try mouse click first
await page.mouse.click(tile.x, tile.y)
await wait(200)
let claimed = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('RUN THE LINE'))
  return b ? b.textContent : null
})
console.log('after mouse.click:', claimed)

// Try touchscreen tap
await page.touchscreen.tap(tile.x + 46, tile.y)
await wait(200)
claimed = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('RUN THE LINE'))
  return b ? b.textContent : null
})
console.log('after touchscreen.tap:', claimed)

// Try manual touchstart+touchend via CDP directly with a tiny delay
const client = await page.target().createCDPSession()
await client.send('Input.dispatchTouchEvent', {
  type: 'touchStart',
  touchPoints: [{ x: tile.x + 92, y: tile.y }],
})
await wait(30)
await client.send('Input.dispatchTouchEvent', {
  type: 'touchEnd',
  touchPoints: [],
})
await wait(200)
claimed = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('RUN THE LINE'))
  return b ? b.textContent : null
})
console.log('after manual CDP touch with delay:', claimed)

await browser.close()
