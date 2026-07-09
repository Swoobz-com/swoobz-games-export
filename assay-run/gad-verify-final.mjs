import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5187/'
const OUT = 'shots-gad-final'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const errors = []
const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  defaultViewport: { width: 520, height: 1000, deviceScaleFactor: 2 },
})
const page = (await browser.pages())[0]
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text())
})

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
const bodyText = () => page.evaluate(() => document.body.innerText)
const canvasBox = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})

async function paintSerpentine(n, box) {
  const tile = box.w / 32
  let count = 0
  for (let row = 3; row < 30 && count < n; row += 2) {
    for (let col = 2; col < 30 && count < n; col += 3) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      count++
      await wait(12)
    }
  }
}

const report = {}

// ── 1) Lobby ──────────────────────────────────────────────────────────────
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(600)
await page.screenshot({ path: `${OUT}/01-lobby.png` })
report.enteredPlanning = await clickText('ENTER THE ASSAY LINE')
await wait(400)

// ── 2) Planning: paint a short, low-bust-risk 10-tile trail ────────────────
let box = await canvasBox()
await paintSerpentine(10, box)
await wait(300)
await page.screenshot({ path: `${OUT}/02-planning-trail.png` })

// ── 3) Plunge + assaying mid-cascade (staggered pace, 90ms/tile) ───────────
report.plunged = await clickText('PLUNGE')
await wait(260) // land mid-cascade to catch the spark + coin-fly + tally swing
await page.screenshot({ path: `${OUT}/03-assaying-cascade.png` })
await wait(120)
await page.screenshot({ path: `${OUT}/03b-assaying-cascade2.png` })

// ── 4) Settle (should be a proven claim on a 10-tile trail, low risk) ──────
await wait(2500)
report.settledText1 = (await bodyText()).replace(/\n/g, ' | ')
await page.screenshot({ path: `${OUT}/04-settled.png` })

// ── 5) Zoom + loupe interaction shot ────────────────────────────────────────
await clickText('ASSAY AGAIN')
await wait(400)
box = await canvasBox()
// zoom in once, then hover-drag to show the loupe + gold glint on planning tiles
await page.mouse.click(box.x + box.w - 10, box.y + box.h - 10) // + zoom knob is near there; recompute after
box = await canvasBox()
await page.mouse.move(box.x + box.w * 0.4, box.y + box.h * 0.35)
await page.mouse.down()
await page.mouse.move(box.x + box.w * 0.45, box.y + box.h * 0.38, { steps: 5 })
await page.screenshot({ path: `${OUT}/05-loupe.png` })
await page.mouse.up()

// ── 6) Bust run: retry a dense 34-tile serpentine until BUSTED ─────────────
let busted = false
for (let attempt = 0; attempt < 6 && !busted; attempt++) {
  await clickText('CLEAR')
  await wait(150)
  box = await canvasBox()
  await paintSerpentine(34, box)
  await wait(250)
  await clickText('PLUNGE')
  await wait(4500)
  const txt = (await bodyText())
  if (txt.includes('BUSTED')) {
    busted = true
    await page.screenshot({ path: `${OUT}/06-bad-vein-bust.png` })
    report.bustText = txt.replace(/\n/g, ' | ')
  } else {
    await clickText('ASSAY AGAIN')
    await wait(300)
  }
}
report.busted = busted

report.errors = errors
console.log(JSON.stringify(report, null, 2))
await browser.close()
process.exit(errors.length === 0 && report.busted ? 0 : 1)
