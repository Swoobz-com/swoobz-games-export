import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5186/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-fairness-qa-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const TIER_ARG = process.argv[2] || 'standard'
const TIER_LABEL = { lean: 'Lean Floor', standard: 'Standard Floor', flooded: 'Flooded Floor' }[TIER_ARG]

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
const bodyText = (page) => page.evaluate(() => document.body.innerText)
const canvasBox = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(600)

await clickText(page, 'ENTER THE ASSAY LINE')
await wait(400)
await clickText(page, TIER_LABEL)
await wait(300)

const box = await canvasBox(page)
const tile = box.w / 10
for (let col = 0; col < 8; col++) {
  await page.mouse.click(box.x + col * tile + tile / 2, box.y + 0 * tile + tile / 2)
  await wait(30)
}
await wait(200)
await clickText(page, 'THROW BREAKER')

// Poll DOM TEXT (not fiber) for settlement — robust to StrictMode fiber churn.
let settledText = null
for (let i = 0; i < 100; i++) {
  await wait(200)
  const txt = await bodyText(page)
  if (txt.includes('GLASS BOX CERTIFICATE')) { settledText = txt; break }
}

await page.screenshot({ path: `${OUT}/${TIER_ARG}-settled-final.png` })

if (!settledText) {
  console.log('=== RESULT for', TIER_ARG, '=== NO SETTLE REACHED (timeout)')
  await browser.close()
  process.exit(1)
}

// Extract exact seed/hash/round/bombCount via DOM (not screenshot OCR).
const parsed = await page.evaluate(() => {
  const body = document.body.innerText
  const seedMatch = body.match(/seed\s+([0-9a-f]{64})/)
  const hashMatch = body.match(/hash\s+([0-9a-f]{64})/)
  const roundMatch = body.match(/round\s+([0-9a-f]{16})/)
  const certLine = [...document.querySelectorAll('div')].map((d) => d.textContent).find((t) => t && t.includes('GLASS BOX CERTIFICATE'))
  const bombMatch = certLine && certLine.match(/(\d+) bad veins in (\d+)×(\d+)/)
  const outcomeHeader = body.includes('CLAIM PROVEN') ? 'WIN' : body.includes('BAD VEIN') ? 'BUST' : 'UNKNOWN'
  const bustedAt = body.match(/busted at nub (\d+) of (\d+)/)
  return {
    seed: seedMatch && seedMatch[1],
    hash: hashMatch && hashMatch[1],
    round: roundMatch && roundMatch[1],
    bombCount: bombMatch && Number(bombMatch[1]),
    gridDim: bombMatch && Number(bombMatch[2]),
    outcome: outcomeHeader,
    bustedAtNub: bustedAt ? Number(bustedAt[1]) : null,
    trailLen: bustedAt ? Number(bustedAt[2]) : null,
  }
})

// Visual bomb-tile scan: sample each of the 100 tile centers + a small ring,
// flag tiles with elevated RED channel relative to green/blue (bad-vein
// corona + dashed red audit frame are visually distinct from the steel/cyan
// palette used everywhere else on the board).
const scan = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const ctx = c.getContext('2d')
  const rect = c.getBoundingClientRect()
  const scaleX = c.width / rect.width
  const scaleY = c.height / rect.height
  const tileWpx = (rect.width / 10) * scaleX
  const tileHpx = (rect.height / 10) * scaleY
  const results = []
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const idx = row * 10 + col
      const cx = Math.floor(col * tileWpx + tileWpx / 2)
      const cy = Math.floor(row * tileHpx + tileHpx / 2)
      // Sample a small patch near the tile edge (where the dashed red audit
      // frame / corona is strongest) rather than dead-center (which may be
      // covered by the coin/safe sprite art).
      const sampleR = Math.floor(cx - tileWpx * 0.42)
      const sampleC = Math.floor(cy)
      let data
      try {
        data = ctx.getImageData(Math.max(0, sampleR), Math.max(0, sampleC), 3, 3).data
      } catch (e) {
        data = [0, 0, 0, 0]
      }
      let r = 0, g = 0, b = 0, n = 0
      for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++ }
      r /= n; g /= n; b /= n
      results.push({ idx, r, g, b, redness: r - (g + b) / 2 })
    }
  }
  return results
})

const sortedByRedness = [...scan].sort((a, b) => b.redness - a.redness)
const likelyBombs = sortedByRedness.slice(0, parsed.bombCount || 4).map((t) => t.idx).sort((a, b) => a - b)

const report = { tier: TIER_ARG, ...parsed, likelyBombsFromPixelScan: likelyBombs, top10Redness: sortedByRedness.slice(0, 10) }
fs.writeFileSync(`${OUT}/${TIER_ARG}-parsed.json`, JSON.stringify(report, null, 2))
fs.writeFileSync(`${OUT}/${TIER_ARG}-console-errors.json`, JSON.stringify(errors, null, 2))

console.log('=== RESULT for', TIER_ARG, '===')
console.log(JSON.stringify(report, null, 2))
console.log('console/page errors:', errors.length)

await browser.close()
