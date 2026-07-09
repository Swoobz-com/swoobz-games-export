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
await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) Mobile Safari/537.36' })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(400)
await tapText('ENTER THE ASSAY LINE')
await wait(500)
const sc = await page.evaluate(() => { const c = document.querySelector('canvas'); const rr = c.parentElement.getBoundingClientRect(); const crr = c.getBoundingClientRect(); return { x: rr.x, y: rr.y, w: rr.width, h: rr.height, canvasW: crr.width, canvasH: crr.height, scrollLeft: c.parentElement.scrollLeft, scrollTop: c.parentElement.scrollTop } })
console.log('scroller/canvas info', sc)
const tile = sc.canvasW / 32
console.log('tile px', tile)
for (let i = 0; i < 3; i++) {
  const col = i % 4, row = 0
  const x = sc.x + tile/2 + col*tile, y = sc.y + tile/2 + row*tile
  console.log('tapping at', x, y)
  await page.touchscreen.tap(x, y)
  await wait(150)
  const len = await page.evaluate(() => { const el=[...document.querySelectorAll('*')].find(e=>e.children.length===0 && /^\d{2,3}$/.test(e.textContent||'')); return el?el.textContent:null })
  console.log('len after tap', i, len)
}
await browser.close()
