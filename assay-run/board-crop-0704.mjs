import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5188/'
const OUT = 'shots-board-crop-0704'
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
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'networkidle0' })
await wait(300)
await clickText(page, 'ENTER THE ASSAY LINE')
await wait(300)
const box = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
// crop top-left quadrant of the board, zoomed
await page.screenshot({
  path: `${OUT}/board-topleft.png`,
  clip: { x: box.x, y: box.y, width: Math.min(box.w, 300), height: Math.min(box.h, 300) },
})
// pin a few tiles into the claim-line for pinned-ring visual + proven color check
let count = 0
const tile = box.w / 20
for (let row = 2; row < 18 && count < 10; row += 2) {
  for (let col = 2; col < 18 && count < 10; col += 3) {
    await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
    count++
    await wait(10)
  }
}
await page.screenshot({ path: `${OUT}/board-pinned-full.png`, clip: { x: box.x, y: box.y, width: box.w, height: box.h } })
await clickText(page, 'THROW BREAKER')
await wait(3200)
await page.screenshot({ path: `${OUT}/board-after-full.png`, clip: { x: box.x, y: box.y, width: box.w, height: box.h } })
await wait(2200)
await page.screenshot({ path: `${OUT}/board-settled-full.png` })
await browser.close()
