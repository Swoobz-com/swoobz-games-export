import puppeteer from 'puppeteer-core'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const tapText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(400)
await tapText(page, 'ENTER THE ASSAY LINE')
await wait(300)
await tapText(page, 'Heavy')
await wait(150)

let settledText = ''
for (let attempt = 0; attempt < 8; attempt++) {
  // Select 40 tiles (out of 100) to raise the odds of hitting one of 8 bombs.
  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const cr = c.getBoundingClientRect()
    return { left: cr.left, top: cr.top, w: cr.width }
  })
  const dim = 10
  const tileCss = geo.w / dim
  for (let i = 0; i < 40; i++) {
    const col = i % dim
    const row = Math.floor(i / dim)
    await page.mouse.click(geo.left + col * tileCss + tileCss / 2, geo.top + row * tileCss + tileCss / 2)
  }
  await tapText(page, 'RUN THE LINE')
  for (let i = 0; i < 60; i++) {
    const t = await page.evaluate(() => document.body.innerText)
    if (t.includes('LINE SECURED') || t.includes('CRACKED BOX · BUSTED')) {
      settledText = t
      break
    }
    await wait(100)
  }
  if (settledText.includes('BUSTED')) break
  if (settledText.includes('SECURED')) {
    await tapText(page, 'ASSAY AGAIN')
    await wait(200)
    await tapText(page, 'Heavy')
    await wait(150)
    settledText = ''
  }
}

console.log('FINAL SETTLED TEXT SNIPPET:')
const idx = settledText.indexOf('CRACKED BOX')
console.log(idx >= 0 ? settledText.slice(Math.max(0, idx - 50), idx + 400) : settledText.slice(0, 400))
await page.screenshot({ path: 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-consolidated-0704/desktop-bust.png' })
await browser.close()
