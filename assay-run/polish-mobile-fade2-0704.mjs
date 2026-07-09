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
const info = await page.evaluate(() => {
  const els = [...document.querySelectorAll('div[aria-hidden]')]
  return els.map(d => {
    const s = getComputedStyle(d)
    const r = d.getBoundingClientRect()
    return { bg: s.backgroundImage.slice(0, 300), position: s.position, inset: s.inset, rect: { x: r.x, y: r.y, w: r.width, h: r.height } }
  })
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
