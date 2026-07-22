import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5184/'
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
const canvasBox = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
async function paintSerpentine(page, n, box) {
  const tile = box.w / 32
  let count = 0
  for (let row = 3; row < 30 && count < n; row += 2) {
    for (let col = 2; col < 30 && count < n; col += 3) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      count++
      await wait(8)
    }
  }
}
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
let bustShot = null
for (let attempt = 0; attempt < 10 && !bustShot; attempt++) {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(300)
  const box = await canvasBox(page)
  await paintSerpentine(page, 40, box)
  await wait(200)
  await clickText(page, 'PLUNGE')
  // Poll for bad-vein phase text, then screenshot immediately (transient window)
  for (let i = 0; i < 60; i++) {
    const txt = await page.evaluate(() => document.body.innerText)
    if (txt.includes('BAD VEIN')) {
      await page.screenshot({ path: `shots-holdgate-recolor-0703/bust-transient-attempt${attempt}.png` })
      await wait(80)
      await page.screenshot({ path: `shots-holdgate-recolor-0703/bust-transient-attempt${attempt}-b.png` })
      bustShot = true
      break
    }
    await wait(30)
  }
}
console.log('captured:', bustShot)
await browser.close()
