import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5189/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })
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
const opened = await tapText('PLAY SAFE')
await wait(250)
const panelState = await page.evaluate(() => document.body.innerText.slice(0,300))
console.log('opened via tap:', opened)
console.log('panel body:', panelState)
const closed = await tapText('CLOSE')
await wait(250)
const afterClose = await page.evaluate(() => document.body.innerText.slice(0,120))
console.log('closed via tap:', closed)
console.log('after close body:', afterClose)

// wager knob repeated tap
await page.evaluate(() => window.scrollTo(0,0))
const plusBox = await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='+'); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })
for (let i=0;i<5;i++){ await page.touchscreen.tap(plusBox.x, plusBox.y); await wait(60) }
const wagerVal = await page.evaluate(() => { const els=[...document.querySelectorAll('*')].filter(e=>e.children.length===0 && /^\d+\.\d\d$/.test(e.textContent||'')); return els.map(e=>e.textContent) })
console.log('wager readouts after 5x + taps:', wagerVal)
console.log('errors:', errors)
await browser.close()
