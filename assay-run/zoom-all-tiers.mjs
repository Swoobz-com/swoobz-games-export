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

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 3 } })
const page = (await browser.pages())[0]
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(400)
await clickText(page, 'ENTER THE ASSAY LINE')
await wait(400)

const rect = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const tierBtns = btns.filter((b) => /Floor/.test(b.textContent || ''))
  const first = tierBtns[0].getBoundingClientRect()
  const last = tierBtns[tierBtns.length - 1].getBoundingClientRect()
  return { x: first.x, y: first.y, w: first.width, h: (last.bottom - first.top) }
})
await page.screenshot({ path: `${OUT}/all-three-tiers-dpr3-native.png`, clip: { x: rect.x - 6, y: rect.y - 6, width: rect.w + 12, height: rect.h + 12 } })
await browser.close()
console.log('DONE')
