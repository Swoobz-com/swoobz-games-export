import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const OUT = process.argv[3] || 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-roundd-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
]
const MOBILE_VIEWPORTS = [
  { name: '412x915', width: 412, height: 915 },
]

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })

const clickText = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}
const canvasBox = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
const overflow = () => page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  scrollHeight: document.documentElement.scrollHeight,
  innerHeight: window.innerHeight,
}))
const bodyText = () => page.evaluate(() => document.body.innerText)

const sampleTile = (box, row, col) => page.evaluate((b, row, col) => {
  const c = document.querySelector('canvas')
  const ctx = c.getContext('2d')
  const scaleX = c.width / b.w
  const scaleY = c.height / b.h
  const tileW = (b.w / 10) * scaleX
  const tileH = (b.h / 10) * scaleY
  const cx = Math.floor(col * tileW + tileW / 2)
  const cy = Math.floor(row * tileH + tileH / 2)
  const center = [...ctx.getImageData(cx, cy, 1, 1).data]
  return { center, tileWpx: tileW / scaleX, tileHpx: tileH / scaleY }
}, box, row, col)

async function paintSerpentine(box, n, startRow, rowStep, colStart, colStep) {
  const tile = box.w / 10
  let count = 0
  for (let row = startRow; row < 10 && count < n; row += rowStep) {
    for (let col = colStart; col < 10 && count < n; col += colStep) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      count++
      await wait(15)
    }
  }
  return count
}

const report = {}

for (const vp of VIEWPORTS) {
  const vpReport = {}
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(600)
  vpReport.lobbyOverflow = await overflow()
  await page.screenshot({ path: `${OUT}/${vp.name}-01-lobby.png` })

  await clickText('ENTER THE ASSAY LINE')
  await wait(500)
  const board = await canvasBox()
  vpReport.boardRect = board
  vpReport.tilePx = board ? +(board.w / 10).toFixed(2) : null
  vpReport.planningOverflow = await overflow()
  await page.screenshot({ path: `${OUT}/${vp.name}-02-planning-full.png` })

  // Crop of the right-gutter rail + board seam for cohesion inspection.
  vpReport.coinSample = await sampleTile(board, 3, 3)

  // Paint a short winning trail.
  await paintSerpentine(board, 9, 1, 2, 1, 2)
  await wait(300)
  await page.screenshot({ path: `${OUT}/${vp.name}-03-trail-painted.png` })

  await clickText('THROW BREAKER')
  await wait(400)
  await page.screenshot({ path: `${OUT}/${vp.name}-04-assaying.png` })
  await wait(1500)
  await page.screenshot({ path: `${OUT}/${vp.name}-05-settle-heroeffects.png` })
  await wait(1000)

  const txt1 = await bodyText()
  vpReport.settled1_won = txt1.includes('CLAIM PROVEN')
  vpReport.settled1_busted = txt1.includes('BUSTED')
  await page.screenshot({ path: `${OUT}/${vp.name}-06-settled-${vpReport.settled1_won ? 'WIN' : 'BUST'}.png` })
  vpReport.settledOverflow = await overflow()

  // CTA above-fold check for the rail footer ASSAY AGAIN / THROW BREAKER.
  vpReport.ctaInfo = await page.evaluate((vh) => {
    const btns = [...document.querySelectorAll('button')]
    const cta = btns.find((b) => b.textContent && (b.textContent.includes('ASSAY AGAIN') || b.textContent.includes('THROW BREAKER')))
    if (!cta) return { found: false }
    const r = cta.getBoundingClientRect()
    return { found: true, text: cta.textContent, top: r.top, bottom: r.bottom, aboveFoldPx: Math.max(0, r.bottom - vh) }
  }, vp.height)

  // Force a bust for the second-outcome screenshot + audit-view bomb salience check.
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)
  await clickText('ENTER THE ASSAY LINE')
  await wait(300)
  const b2 = await canvasBox()
  await paintSerpentine(b2, 36, 0, 1, 0, 1)
  await wait(200)
  await clickText('THROW BREAKER')
  await wait(4500)
  const txt2 = await bodyText()
  vpReport.settled2_won = txt2.includes('CLAIM PROVEN')
  vpReport.settled2_busted = txt2.includes('BUSTED')
  await page.screenshot({ path: `${OUT}/${vp.name}-07-settled2-${vpReport.settled2_won ? 'WIN' : 'BUST'}.png` })

  report[vp.name] = vpReport
}

for (const vp of MOBILE_VIEWPORTS) {
  const vpReport = {}
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(600)
  await page.screenshot({ path: `${OUT}/${vp.name}-01-lobby.png` })
  await clickText('ENTER THE ASSAY LINE')
  await wait(500)
  const board = await canvasBox()
  vpReport.boardRect = board
  vpReport.mobileOverflow = await overflow()
  await page.screenshot({ path: `${OUT}/${vp.name}-02-planning.png`, fullPage: true })
  report[vp.name] = vpReport
}

report.consoleErrors = errors
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
