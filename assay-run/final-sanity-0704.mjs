import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5560/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })
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
await page.screenshot({ path: 'shots-final-sanity-0704-lobby.png' })
await clickText('ENTER THE ASSAY LINE')
await wait(1200)
await page.screenshot({ path: 'shots-final-sanity-0704-planning.png' })
const box = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })
const tile = box.w / 20
for (let i = 0; i < 34; i++) {
  const col = 3 + (i % 15)
  const row = 3 + Math.floor(i / 15) * 2
  await page.mouse.click(box.x + col*tile + tile/2, box.y + row*tile + tile/2)
}
await wait(200)
await page.screenshot({ path: 'shots-final-sanity-0704-committed.png' })
await clickText('THROW BREAKER')
await wait(3500)
await page.screenshot({ path: 'shots-final-sanity-0704-settled.png' })
console.log(JSON.stringify({ errors }, null, 2))
await browser.close()
