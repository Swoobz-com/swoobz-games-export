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
const overlayProbe = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const scroller = c.parentElement
  const r = scroller.getBoundingClientRect()
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
console.log('overlay probe (viewport-relative)', JSON.stringify(overlayProbe, null, 2))
// Genuine tap-to-engine check: tap 3 offsets, confirm trail length increments each time (engine receives it)
const lenFn = () => page.evaluate(() => { const el=[...document.querySelectorAll('*')].find(e=>e.children.length===0 && /^\d{2,3}$/.test(e.textContent||'')); return el?el.textContent:null })
const before = await lenFn()
const c = await page.evaluate(() => { const cc=document.querySelector('canvas'); const r=cc.parentElement.getBoundingClientRect(); const crr=cc.getBoundingClientRect(); return {x:r.x,y:r.y,canvasW:crr.width} })
const tile = c.canvasW/32
await page.touchscreen.tap(c.x + tile*0.3, c.y + tile*0.3)
await wait(100)
const after1 = await lenFn()
console.log('trail before/after tap', before, after1)
await browser.close()
