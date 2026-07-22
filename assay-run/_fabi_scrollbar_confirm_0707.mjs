import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import { PNG } from 'pngjs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
function readPixel(png, x, y) {
  x = Math.round(x); y = Math.round(y)
  const idx = (png.width * y + x) << 2
  return { r: png.data[idx], g: png.data[idx + 1], b: png.data[idx + 2], a: png.data[idx + 3] }
}
async function main() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: false, args: ['--window-size=1500,1000'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto('http://localhost:5182/', { waitUntil: 'networkidle0' })
  await wait(500)
  const dims0 = await page.evaluate(() => ({ scrollH: document.documentElement.scrollHeight, innerH: window.innerHeight, hasVScroll: document.documentElement.scrollHeight > window.innerHeight }))
  console.log('LOBBY dims:', dims0)

  // navigate to settled quickly (reuse prior known path)
  function clickText(page, re) {
    return page.evaluate((rs) => {
      const r = new RegExp(rs, 'i')
      const els = [...document.querySelectorAll('button, div, span')]
      const b = els.find((x) => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
      if (b) { b.click(); return b.textContent.trim() }
      return null
    }, re.source)
  }
  await clickText(page, /HADAL TREN/i)
  await wait(150)
  await clickText(page, /ENTER THE DIVE|RUN THE LINE|DIVE|START/i)
  await wait(400)
  const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height } })
  const dim = 14, TILE = geo.w / dim
  const cells = [[3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9,6],[10,6],[3, 7], [8, 7]]
  for (const [col, row] of cells) { await page.mouse.click(geo.left + (col + 0.5) * TILE, geo.top + (row + 0.5) * TILE); await wait(15) }
  await wait(150)
  await clickText(page, /RUN THE LINE|COMMIT|GO/i)
  await wait(300)
  let settled = false
  for (let i = 0; i < 40; i++) {
    const t = await page.evaluate(() => document.body.innerText)
    if (/SECURED THE HAUL|RUGGED BY THE DEEP/.test(t)) { settled = true; break }
    await wait(150)
  }
  await wait(400)
  const dims1 = await page.evaluate(() => ({ scrollH: document.documentElement.scrollHeight, innerH: window.innerHeight, hasVScroll: document.documentElement.scrollHeight > window.innerHeight, bodyOverflowY: getComputedStyle(document.body).overflowY, htmlOverflowY: getComputedStyle(document.documentElement).overflowY }))
  console.log('SETTLED dims:', dims1, 'settled=', settled)

  const outp = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-fabi-finalend-0707/scrollbar-confirm.png'
  await page.screenshot({ path: outp })
  const png = PNG.sync.read(fs.readFileSync(outp))
  const cols = [1439, 1435, 1430, 1425, 1420, 1410, 1400]
  for (const x of cols) {
    const top = readPixel(png, x, 5)
    const bot = readPixel(png, x, 895)
    console.log(`x=${x} top=(${top.r},${top.g},${top.b}) bottom=(${bot.r},${bot.g},${bot.b})`)
  }
  await wait(200)
  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
