// Win-settle capture for the premium elevation pass: retry rounds until a
// win (LINE CLAIMED) lands, then screenshot the gold cartouche + board bloom.
// Desktop-only (per task: "desktop is fine if mobile win is hard to script").
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-premium-elevation-0705'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = async (page, txt) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
  if (b) { b.click(); return true }
  return false
}, txt)

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 } })
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`CONSOLE.ERROR: ${m.text()}`) })

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(700)
await clickText(page, 'ENTER THE ASSAY LINE')
await wait(400)
await page.evaluate(() => {
  const b = document.querySelector('button[aria-label="Dismiss how-to-play tip"]')
  if (b) b.click()
})
await wait(200)

let won = false
let attempt = 0
for (; attempt < 80 && !won; attempt++) {
  await clickText(page, 'CLEAR')
  await wait(80)
  const board = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  const tile = board.w / 10
  // MIN_TRAIL = 8 discs (per lobby copy "8-60 discs") — paint exactly 8 in a
  // single row so RUN THE LINE actually becomes eligible; short trail still
  // minimizes cracked-disc exposure to raise win odds within 80 attempts.
  await page.mouse.move(board.x + tile * 0.5, board.y + tile * 0.5)
  await page.mouse.down()
  for (let i = 0; i < 8; i++) {
    const col = i, row = 0
    await page.mouse.move(board.x + tile * (col + 0.5), board.y + tile * (row + 0.5), { steps: 2 })
    await wait(15)
  }
  await page.mouse.up()
  await wait(150)
  await clickText(page, 'RUN THE LINE')
  // Poll for the outcome text every 150ms (up to ~4.5s) instead of one fixed
  // wait, so a WIN capture lands as close as possible to when heroPopVisible
  // first flips true (HERO_POP_HOLD_MS=1700ms window) rather than after it
  // has already faded.
  let txt = ''
  let settledAt = -1
  for (let p = 0; p < 30; p++) {
    await wait(150)
    txt = await page.evaluate(() => document.body.innerText)
    if (/LINE CLAIMED/.test(txt) || /CRACKED DISC|BAD VEIN/i.test(txt)) {
      settledAt = p * 150
      break
    }
  }
  if (/LINE CLAIMED/.test(txt)) {
    won = true
    await page.screenshot({ path: `${OUT}/desktop-1440x900-WIN-cartouche-bloom.png` })
    await page.screenshot({ path: `${OUT}/desktop-1440x900-WIN-cartouche-bloom-fullpage.png`, fullPage: true })
    // a second capture slightly later, in case the first landed just before
    // the cartouche pop-in finished animating in.
    await wait(300)
    await page.screenshot({ path: `${OUT}/desktop-1440x900-WIN-cartouche-bloom-t300.png` })
    console.log('settledAtMs', settledAt)
    break
  } else if (/CRACKED DISC|BAD VEIN/i.test(txt)) {
    await wait(300)
    await clickText(page, 'ASSAY AGAIN')
    await wait(300)
  }
}

console.log(JSON.stringify({ won, attempts: attempt, errors }, null, 2))
await browser.close()
