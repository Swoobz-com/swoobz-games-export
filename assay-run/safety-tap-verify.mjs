import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5200/'
const OUT = 'shots-mobile-qa2'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.emulate({
  viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
})
await page.goto(URL, { waitUntil: 'networkidle2' })
await wait(400)

const safetyBox = await page.evaluate(() => {
  const el = [...document.querySelectorAll('button')].find((b) => /PLAY SAFE/.test(b.textContent || ''))
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }
})
console.log('safetyBox', safetyBox)
if (safetyBox) {
  await page.touchscreen.tap(safetyBox.x, safetyBox.y)
  await wait(300)
}
await page.screenshot({ path: `${OUT}/safety-panel-open.png` })
const dialogOpen = await page.evaluate(() => !!document.querySelector('[role="dialog"]'))
console.log('dialogOpen', dialogOpen)
const closeBox = await page.evaluate(() => {
  const el = [...document.querySelectorAll('button')].find((b) => /CLOSE/.test(b.textContent || ''))
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }
})
console.log('closeBox', closeBox)
if (closeBox) {
  await page.touchscreen.tap(closeBox.x, closeBox.y)
  await wait(300)
}
const dialogClosedAfterTap = await page.evaluate(() => !document.querySelector('[role="dialog"]'))
console.log('dialogClosedAfterTap', dialogClosedAfterTap)
console.log('errors', errors)
await browser.close()
process.exit(0)
