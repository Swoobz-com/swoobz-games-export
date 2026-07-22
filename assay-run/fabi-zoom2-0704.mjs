import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = './fabi-shots-0704'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(500)
await page.screenshot({ path: `${OUT}/crop-balance-hires.png`, clip: { x: 900, y: 20, width: 120, height: 60 } })
// Grab the element and its computed color directly
const info = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('*'))
  const target = els.find(e => e.textContent && e.textContent.trim() === '1000.00' && e.children.length === 0)
  if (!target) return null
  const cs = getComputedStyle(target)
  return { text: target.textContent, color: cs.color, fontFamily: cs.fontFamily, className: target.className, outerHTML: target.outerHTML.slice(0,300) }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
