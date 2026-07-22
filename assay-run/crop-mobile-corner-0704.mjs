import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5560/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 412, height: 915, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } })
const page = (await browser.pages())[0]
const clickText = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(800)
await clickText('ENTER THE ASSAY LINE')
await wait(1200)
await page.evaluate(() => {
  const els = [...document.querySelectorAll('div')].filter(d => {
    const s = getComputedStyle(d)
    return s.overflow === 'auto' && d.querySelector('canvas')
  })
  const el = els[0]
  el.scrollLeft = el.scrollWidth
  el.scrollTop = el.scrollHeight
})
await wait(200)
await page.screenshot({ path: 'shots-polish-0704-mobile-corner-crop.png', clip: { x: 20, y: 280, width: 140, height: 140 } })
await browser.close()
