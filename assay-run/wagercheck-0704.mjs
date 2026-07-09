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
await wait(400)
const before = await page.evaluate(() => { const els=[...document.querySelectorAll('*')].filter(e=>e.children.length===0 && /^\d+\.\d\d$/.test(e.textContent||'')); return els.map(e=>e.textContent) })
const plusBox = await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='+'); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height} })
console.log('plus button box', plusBox)
for (let i=0;i<5;i++){ await page.touchscreen.tap(plusBox.x, plusBox.y); await wait(60) }
const after = await page.evaluate(() => { const els=[...document.querySelectorAll('*')].filter(e=>e.children.length===0 && /^\d+\.\d\d$/.test(e.textContent||'')); return els.map(e=>e.textContent) })
console.log('wager before', before, 'after 5x+', after)
const minusBox = await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='−'); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height} })
console.log('minus button box', minusBox)
await browser.close()
