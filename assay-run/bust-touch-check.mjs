import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5200/'
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

const tapText = async (txt) => {
  const box = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, txt)
  if (!box) return false
  await page.touchscreen.tap(box.x, box.y)
  return true
}
const bodyText = () => page.evaluate(() => document.body.innerText)

await tapText('ENTER THE ASSAY LINE')
await wait(400)

let outcome = null
for (let round = 0; round < 12 && outcome !== 'BUST'; round++) {
  const scroller = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.parentElement.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  const TILE = 46
  for (let i = 0; i < 8; i++) {
    const col = i % 4, row = Math.floor(i / 4)
    const tx = TILE / 2 + col * TILE, ty = TILE / 2 + row * TILE
    await page.touchscreen.tap(scroller.x + tx, scroller.y + ty)
    await wait(40)
  }
  await tapText('PLUNGE')
  await wait(600)
  await wait(3500)
  const txt = (await bodyText()).replace(/\n/g, ' | ')
  outcome = /CLAIM PROVEN/.test(txt) ? 'WIN' : (/BUSTED/.test(txt) ? 'BUST' : 'UNKNOWN')
  console.log(`round ${round + 1}: ${outcome}`)
  if (outcome === 'BUST') {
    await page.screenshot({ path: 'shots-mobile-qa2/bust-settled-touch.png' })
    // Verify ASSAY AGAIN reachable + works from a bust state, via real touch.
    const assayAgainBox = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /ASSAY AGAIN/.test(x.textContent || ''))
      if (!b) return null
      const r = b.getBoundingClientRect()
      return { w: r.width, h: r.height, x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top, vh: window.innerHeight }
    })
    console.log('assayAgainBox (from BUST):', assayAgainBox)
    break
  }
  // Not busted: acknowledge and go again for another attempt.
  await tapText('ASSAY AGAIN')
  await wait(400)
}
console.log('final outcome:', outcome)
console.log('errors:', errors)
await browser.close()
process.exit(0)
