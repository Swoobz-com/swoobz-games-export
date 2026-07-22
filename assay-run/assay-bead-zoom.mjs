// Zoomed screenshots of the current-bead tile during cascade at the new
// (bigger) desktop tile size, for a visual gold-ring-leak / render-artifact check.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5202/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-perf-qa'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = (page, txt) =>
  page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
    if (b) { b.click(); return true }
    return false
  }, txt)
async function getDesktopCanvasBox(page) {
  return page.evaluate(() => {
    const cs = [...document.querySelectorAll('canvas')]
    let best = null
    for (const c of cs) {
      const r = c.getBoundingClientRect()
      if (r.width <= 0) continue
      if (!best || r.width * r.height > best.w * best.h) best = { x: r.x, y: r.y, w: r.width, h: r.height }
    }
    return best
  })
}
async function main() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--enable-gpu', '--ignore-gpu-blocklist'] })
  const page = (await browser.pages())[0]
  await page.setViewport({ width: 2560, height: 1440, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  const box = await getDesktopCanvasBox(page)
  const tile = box.w / 32
  // Paint a short, known trail: row3 col2, col5, col8, col11 (matches paintTrail's pattern).
  const cells = [[3, 2], [3, 5], [3, 8], [3, 11], [5, 2], [5, 5], [5, 8], [5, 11], [7, 2], [7, 5]]
  for (const [row, col] of cells) {
    await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
    await wait(20)
  }
  await wait(150)
  await clickText(page, 'PLUNGE')
  // Sweep a wide range of delays over the first two cells to actually land a
  // frame showing the live VOLT bead (not just the pre-cascade gold outline).
  const [r0, c0] = cells[0]
  const [r1, c1] = cells[1]
  const shots = [
    ['cell0', 30, r0, c0], ['cell0', 80, r0, c0], ['cell0', 150, r0, c0], ['cell0', 250, r0, c0],
    ['cell0', 400, r0, c0], ['cell1', 550, r1, c1], ['cell1', 750, r1, c1], ['cell1', 950, r1, c1],
  ]
  let i = 0
  for (const [tag, delayMs, row, col] of shots) {
    await wait(i === 0 ? delayMs : delayMs - shots[i - 1][1])
    i++
    const cx = box.x + col * tile
    const cy = box.y + row * tile
    const pad = tile * 1.5
    await page.screenshot({
      path: `${OUT}/zoom-${tag}-t${delayMs}ms.png`,
      clip: { x: Math.max(0, cx - pad), y: Math.max(0, cy - pad), width: tile + pad * 2, height: tile + pad * 2 },
    })
  }
  await wait(3500)
  await page.screenshot({ path: `${OUT}/zoom-settled-full.png` })
  await browser.close()
}
main()
