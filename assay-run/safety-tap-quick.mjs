import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5185/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-safety-tap-quick'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })
const devices = [{ name: 'pixel7', width: 412, height: 915 }, { name: 'iphone14pro', width: 390, height: 844 }]
const report = {}
for (const d of devices) {
  await page.emulate({ viewport: { width: d.width, height: d.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false }, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Mobile Safari/537.36' })
  await page.goto(URL, { waitUntil: 'networkidle2' })
  await wait(300)
  const box = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x=>/PLAY SAFE/.test(x.textContent||'')); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })
  await page.touchscreen.tap(box.x, box.y)
  await wait(200)
  const dialogPresent = await page.evaluate(() => !!document.querySelector('[role="dialog"]'))
  await page.screenshot({ path: `${OUT}/${d.name}-safety-modal.png` })
  const closeBtnBox = await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent && x.textContent.trim()==='CLOSE'); if(!b) return null; const r=b.getBoundingClientRect(); return {w:r.width,h:r.height} })
  report[d.name] = { dialogPresent, closeBtnBox }
}
report.errors = errors
console.log(JSON.stringify(report, null, 2))
await browser.close()
