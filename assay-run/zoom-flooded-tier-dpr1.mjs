import puppeteer from 'puppeteer-core'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-visreg-0704'
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

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 } })
const page = (await browser.pages())[0]
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(400)
await clickText(page, 'ENTER THE ASSAY LINE')
await wait(400)
await clickText(page, 'Flooded Floor')
await wait(400)
const rect = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const b = btns.find((b) => /Flooded Floor/.test(b.textContent || ''))
  const r = b.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
// full-res crop (no downscale) at dpr1 exactly matching viewport pixels
await page.screenshot({ path: `${OUT}/flooded-tier-dpr1-crop.png`, clip: { x: rect.x - 10, y: rect.y - 10, width: rect.w + 20, height: rect.h + 20 } })
await browser.close()
console.log('DONE')
