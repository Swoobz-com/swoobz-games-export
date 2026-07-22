import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5188/'
const OUT = 'shots-revise-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '2560x1440', width: 2560, height: 1440 },
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
const overflowInfo = () => page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  scrollHeight: document.documentElement.scrollHeight,
  innerHeight: window.innerHeight,
}))

const results = {}

for (const vp of VIEWPORTS) {
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await wait(400)

  // LOBBY overflow check
  const lobbyOverflow = await overflowInfo()
  await page.screenshot({ path: `${OUT}/${vp.name}-01-lobby.png` })

  await clickText('ENTER THE ASSAY LINE')
  await wait(300)
  const box = await canvasBox()
  await page.screenshot({ path: `${OUT}/${vp.name}-02-planning.png` })

  // Measure tile: board is GRID_DIM=20 square, canvas box.w == board side (no gauge strip anymore)
  const tilePx = box ? box.w / 20 : null

  results[vp.name] = {
    lobbyOverflow,
    canvasBox: box,
    tilePx,
  }

  // paint a claim-line and plunge
  if (box) {
    const tile = box.w / 20
    let count = 0
    for (let row = 2; row < 18 && count < 10; row += 2) {
      for (let col = 2; col < 18 && count < 10; col += 3) {
        await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
        count++
        await wait(15)
      }
    }
  }
  await page.screenshot({ path: `${OUT}/${vp.name}-03-armed.png` })

  await clickText('THROW BREAKER')
  await wait(2500)
  await page.screenshot({ path: `${OUT}/${vp.name}-04-after-plunge.png` })
  await wait(2500)
  const settledOverflow = await overflowInfo()
  await page.screenshot({ path: `${OUT}/${vp.name}-05-settled-or-bust.png` })
  results[vp.name].settledOverflow = settledOverflow
}

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, errors }, null, 2))
console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
