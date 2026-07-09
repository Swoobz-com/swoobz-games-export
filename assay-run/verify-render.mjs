import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5185/'
const OUT = 'shots'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const errors = []
const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  defaultViewport: { width: 520, height: 900, deviceScaleFactor: 2 },
  args: ['--autoplay-policy=no-user-gesture-required'],
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
  if (!c) return null
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
// Non-blank check: sample canvas pixels, count non-background.
const canvasNonBlank = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return { ok: false }
  const ctx = c.getContext('2d')
  const { width, height } = c
  const data = ctx.getImageData(0, 0, width, height).data
  let nonBg = 0
  for (let i = 0; i < data.length; i += 4 * 97) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    if (r > 30 || g > 25 || b > 20) nonBg++
  }
  return { ok: true, nonBg, width, height }
})

const report = {}

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(800)
report.lobbyText = (await bodyText()).slice(0, 120).replace(/\n/g, ' | ')
await page.screenshot({ path: `${OUT}/01-lobby.png` })

// Enter planning.
report.enteredPlanning = await clickText('ENTER THE ASSAY LINE')
await wait(600)
const box = await canvasBox()
report.canvasBox = box ? `${Math.round(box.w)}x${Math.round(box.h)}` : 'NONE'
report.canvasBlank01 = await canvasNonBlank()

// Paint a claim-line of 10 tiles: click a diagonal-ish path across the board.
if (box) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const col = 4 + i * 2
    const row = 6 + (i % 3) * 2
    const tile = box.w / 32
    pts.push({ x: box.x + col * tile + tile / 2, y: box.y + row * tile + tile / 2 })
  }
  for (const p of pts) {
    await page.mouse.click(p.x, p.y)
    await wait(40)
  }
}
await wait(400)
report.planningText = (await bodyText()).replace(/\n/g, ' | ')
report.canvasAfterTrail = await canvasNonBlank()
await page.screenshot({ path: `${OUT}/02-trail-selected.png` })

// Plunge the key.
report.plunged = await clickText('PLUNGE')
await wait(400)
await page.screenshot({ path: `${OUT}/03-assaying.png` })
report.assayingText = (await bodyText()).replace(/\n/g, ' | ').slice(0, 200)

// Wait for cascade + settlement.
await wait(3000)
report.settledText = (await bodyText()).replace(/\n/g, ' | ')
report.hasCertificate = report.settledText.includes('GLASS BOX')
report.hasOutcome = /CLAIM PROVEN|BUSTED/.test(report.settledText)
await page.screenshot({ path: `${OUT}/04-settled.png` })

report.errors = errors
console.log(JSON.stringify(report, null, 2))
await browser.close()
process.exit(errors.length === 0 && report.hasOutcome ? 0 : 1)
