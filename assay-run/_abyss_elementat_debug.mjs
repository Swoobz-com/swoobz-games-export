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
  return { x: cr.left + 5.5*TILE, y: cr.top + 8.5*TILE, canvasRect: cr }
})
console.log('tile probe', tile)

const el = await page.evaluate((t) => {
  const e = document.elementFromPoint(t.x, t.y)
  if (!e) return null
  return { tag: e.tagName, cls: e.className, id: e.id, rect: e.getBoundingClientRect ? (()=>{const r=e.getBoundingClientRect(); return {top:r.top,left:r.left,width:r.width,height:r.height}})() : null }
}, tile)
console.log('elementFromPoint at tile:', JSON.stringify(el))

// also check interactive flag / any disabled overlay text near canvas
const boardInfo = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  return { canvasWidth: c.width, canvasHeight: c.height, cssWidth: c.style.width, cssHeight: c.style.height }
})
console.log('boardInfo', boardInfo)
await browser.close()
