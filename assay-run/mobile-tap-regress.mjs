import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true })
await page.goto('http://localhost:5183/', { waitUntil: 'networkidle0' })
const clickText = async (txt) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent && x.textContent.includes(t))
  if (b) { b.click(); return true }
  return false
}, txt)
await clickText('ENTER THE ASSAY LINE')
await new Promise(r=>setTimeout(r,200))
const box = await page.evaluate(() => {
  const scroller = document.querySelector('canvas').parentElement
  const r = scroller.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
// Tap 5 distinct tiles within the visible scroller viewport
for (let i = 0; i < 5; i++) {
  await page.touchscreen.tap(box.x + 20 + i*15, box.y + 20)
  await new Promise(r=>setTimeout(r,80))
}
const odometer = await page.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find(n => n.children.length===0 && /\/\s*8\s*min/.test(n.textContent||''))
  return el ? el.parentElement.textContent : 'NOT FOUND'
})
console.log('odometer after 5 taps:', odometer)
// A real pan/drag should NOT add a stray tile
await page.touchscreen.touchStart(box.x + 200, box.y + 200)
await page.touchscreen.touchMove(box.x + 100, box.y + 100)
await page.touchscreen.touchEnd()
await new Promise(r=>setTimeout(r,150))
const odometer2 = await page.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find(n => n.children.length===0 && /\/\s*8\s*min/.test(n.textContent||''))
  return el ? el.parentElement.textContent : 'NOT FOUND'
})
console.log('odometer after pan:', odometer2)
await browser.close()
