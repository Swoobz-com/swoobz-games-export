// Captures the LIVE bust-punch moment (shake+flash+ring+scatter) before the
// settle transition replaces the board with the Glass Box certificate —
// render-integrity check for the new juice effects, not just the final state.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5450/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = 'coin-perf-shots-0703'
fs.mkdirSync(OUT, { recursive: true })

const clickText = (page, txt) =>
  page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
    if (b) { b.click(); return true }
    return false
  }, txt)
async function getBox(page) {
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
  await page.setViewport({ width: 1920, height: 1080 })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  const box = await getBox(page)
  const tile = box.w / 32
  let busted = false
  for (let attempt = 0; attempt < 6 && !busted; attempt++) {
    if (attempt > 0) { await clickText(page, 'ASSAY AGAIN'); await wait(400); await clickText(page, 'CLEAR'); await wait(150) }
    let m = 0
    for (let row = 2; row < 30 && m < 40; row += 1) {
      for (let col = 2; col < 30 && m < 40; col += 3) {
        await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
        m++
      }
    }
    await wait(150)
    await clickText(page, 'PLUNGE')
    // Poll body text every 40ms for up to 3600ms; the instant BUSTED text
    // appears, screenshot every tick for the next 700ms (covers shake 320ms,
    // flash 180ms, ring 420ms, scatter 520ms — all fire together at vein-enter).
    let hitAt = -1
    for (let t = 0; t < 3600; t += 40) {
      const txt = await page.evaluate(() => document.body.innerText)
      if (txt.includes('BAD VEIN') || txt.includes('BUSTED')) { hitAt = t; break }
      await wait(40)
    }
    if (hitAt >= 0) {
      busted = true
      for (let i = 0; i < 6; i++) {
        await page.screenshot({ path: `${OUT}/punch-${String(i).padStart(2, '0')}-t${i * 90}ms.png`, clip: { x: box.x, y: box.y, width: box.w, height: box.h } })
        await wait(90)
      }
    }
  }
  console.log('busted:', busted)
  await browser.close()
}
main()
