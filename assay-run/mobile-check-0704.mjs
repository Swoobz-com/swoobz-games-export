import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5188/'
const OUT = 'shots-mobile-check-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
const VIEWPORTS = [
  { name: 'iphone14pro-390x844', width: 390, height: 844 },
  { name: 'pixel7-412x915', width: 412, height: 915 },
]
for (const vp of VIEWPORTS) {
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await wait(300)
  await page.screenshot({ path: `${OUT}/${vp.name}-01-lobby.png` })
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(300)
  await page.screenshot({ path: `${OUT}/${vp.name}-02-planning.png` })
  // Check header is one line + measure CopyGlyph/CalibToggle sizes
  const measurements = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const calibToggle = btns.find((b) => b.textContent && b.textContent.includes('CLEAR'))
    const rect = calibToggle ? calibToggle.getBoundingClientRect() : null
    return {
      calibToggleBox: rect ? { w: rect.width, h: rect.height } : null,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }
  })
  fs.writeFileSync(`${OUT}/${vp.name}-measurements.json`, JSON.stringify(measurements, null, 2))
  console.log(vp.name, JSON.stringify(measurements))
}
await browser.close()
