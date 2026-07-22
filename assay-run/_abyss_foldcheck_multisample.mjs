import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const tapText = async (page, txt) => {
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
const measure = (page) => page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('RUN THE LINE'))
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { top: r.top, bottom: r.bottom, viewportH: window.innerHeight }
})
for (let sample = 0; sample < 5; sample++) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
  const page = (await browser.pages())[0]
  await page.emulate({ viewport: { width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(300)
  await tapText(page, 'ENTER THE DIVE')
  await wait(100) // shorter wait to catch closer to first paint
  const m1 = await measure(page)
  await wait(500) // settled paint
  const m2 = await measure(page)
  console.log(`sample ${sample}: t=100ms`, JSON.stringify(m1), ` | t=600ms`, JSON.stringify(m2))
  await browser.close()
}
