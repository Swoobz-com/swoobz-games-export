// Zoomed capture of the live current-bead tile mid-cascade at the coin-redesign
// scale, checking for the previously-fixed "ring-leak" artifact class (a sliver
// of the underlying dormant/committed coin sprite peeking around the live volt
// overlay because of a skipBead/composite-order mismatch).
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5450/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = 'coin-perf-shots-0703'
fs.mkdirSync(OUT, { recursive: true })
const clickText = (page, txt) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
  if (b) { b.click(); return true }
  return false
}, txt)
async function getBox(page) {
  return page.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0]
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}
async function main() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--enable-gpu', '--ignore-gpu-blocklist'] })
  const page = (await browser.pages())[0]
  await page.setViewport({ width: 2560, height: 1440 })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  const box = await getBox(page)
  const tile = box.w / 32
  // Paint a short safe-ish trail; we just need SOME live bead frames, win or lose.
  let n = 0
  for (let row = 4; row < 30 && n < 10; row += 3) {
    for (let col = 4; col < 30 && n < 10; col += 4) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      n++
    }
  }
  await wait(150)
  await clickText(page, 'PLUNGE')
  // Rapid-fire zoomed crops around row 4 (first trail row) through the cascade.
  for (let i = 0; i < 10; i++) {
    await wait(70)
    await page.screenshot({
      path: `${OUT}/beadzoom-${String(i).padStart(2, '0')}.png`,
      clip: { x: box.x + 2 * tile, y: box.y + 2 * tile, width: 20 * tile, height: 6 * tile },
    })
  }
  await browser.close()
}
main()
