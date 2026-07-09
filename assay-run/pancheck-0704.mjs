import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5189/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
const tapText = async (txt) => {
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
await page.emulate({ viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) Mobile Safari/537.36' })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(400)
await tapText('ENTER THE ASSAY LINE')
await wait(400)
const scrollBox = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  const scroller = c.parentElement
  const sr = scroller.getBoundingClientRect()
  return { x: sr.x, y: sr.y, w: sr.width, h: sr.height, scrollLeft: scroller.scrollLeft, scrollTop: scroller.scrollTop }
})
const before = await scrollBox()
console.log('before', before)
// pure vertical drag
const touch = await page.touchscreen.touchStart(before.x + before.w/2, before.y + before.h/2)
for (let i = 1; i <= 10; i++) { await touch.move(before.x + before.w/2, before.y + before.h/2 - i*14); await wait(16) }
await touch.end()
await wait(300)
const after = await scrollBox()
console.log('after vertical drag', after)
// pointer-events / overlay probe: check topmost element at several canvas offsets is the canvas itself or a pointer-events:none wrapper
const overlayProbe = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  const pts = [
    [r.x + r.width*0.2, r.y + r.height*0.2],
    [r.x + r.width*0.5, r.y + r.height*0.5],
    [r.x + r.width*0.8, r.y + r.height*0.8],
  ]
  return pts.map(([x,y]) => {
    const el = document.elementFromPoint(x,y)
    return { x, y, tag: el ? el.tagName : null, isCanvas: el === c, pointerEvents: el ? getComputedStyle(el).pointerEvents : null }
  })
})
console.log('overlay probe', JSON.stringify(overlayProbe, null, 2))
await browser.close()
