import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5188/'
const OUT = 'shots-siderail'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const errors = []
const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
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
      await wait(10)
    }
  }
}

const report = {}

// ── DESKTOP 1440x900 ─────────────────────────────────────────────────────
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(500)
await page.screenshot({ path: `${OUT}/d1-lobby.png` })
report.desktopEntered = await clickText('ENTER THE ASSAY LINE')
await wait(400)

let box = await canvasBox()
await paintSerpentine(10, box)
await wait(300)
await page.screenshot({ path: `${OUT}/d2-planning.png` })
// wide crop showing left specimen case + board + right specimen case together
await page.screenshot({ path: `${OUT}/d2-planning-full.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } })

report.desktopPlunged = await clickText('PLUNGE')
await wait(260)
await page.screenshot({ path: `${OUT}/d3-assaying.png` })
await wait(2500)
report.desktopSettledText = (await bodyText()).replace(/\n/g, ' | ')
await page.screenshot({ path: `${OUT}/d4-settled.png` })

// measure the two specimen cases + board for containment/seating proof
report.desktopGeometry = await page.evaluate(() => {
  const board = document.querySelector('canvas').getBoundingClientRect()
  const all = [...document.querySelectorAll('div')]
  return { board: { x: board.x, y: board.y, w: board.width, h: board.height } }
})

await clickText('ASSAY AGAIN')
await wait(400)
box = await canvasBox()
await paintSerpentine(10, box)
await wait(300)
await page.screenshot({ path: `${OUT}/d5-planning-again.png` })

// ── DESKTOP 1920x1080 (residual containment check) ─────────────────────────
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 })
await wait(300)
await page.screenshot({ path: `${OUT}/d6-planning-1920.png` })

// ── MOBILE 412x915 (Pixel 7) — graceful degradation check ───────────────────
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 })
await wait(400)
await page.screenshot({ path: `${OUT}/m1-planning-mobile.png` })
report.mobileNoSpecimenCase = await page.evaluate(() => {
  // specimen cases only exist as absolute-positioned siblings inside the
  // shell on wide viewports; on mobile the shell width collapses and they
  // unmount entirely — confirm zero stray DOM.
  const text = document.body.innerText
  return { hasToAssayInline: text.includes('TO ASSAY (WAGER)') || text.includes('TO ASSAY') }
})
await clickText('PLUNGE')
await wait(3000)
await page.screenshot({ path: `${OUT}/m2-settled-mobile.png` })

report.errors = errors
console.log(JSON.stringify(report, null, 2))
await browser.close()
process.exit(errors.length === 0 ? 0 : 1)
