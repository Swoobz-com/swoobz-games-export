// Catch the gold cartouche mid-hold (HERO_POP_HOLD_MS=1700) right after a win.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-fabi-holdgate-0705'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = async (page, txt) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
  if (b) { b.click(); return true }
  return false
}, txt)

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 } })
const page = (await browser.pages())[0]
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
for (; attempt < 20 && !won; attempt++) {
  await clickText(page, 'CLEAR')
  await wait(60)
  const board = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  const tile = board.w / 10
  await page.mouse.move(board.x + tile * 0.5, board.y + tile * 0.5)
  await page.mouse.down()
  for (let i = 0; i < 8; i++) {
    const col = i % 10, row = Math.floor(i / 10)
    await page.mouse.move(board.x + tile * (col + 0.5), board.y + tile * (row + 0.5), { steps: 2 })
    await wait(10)
  }
  await page.mouse.up()
  await wait(100)
  await clickText(page, 'RUN THE LINE')
  // poll rapidly for the win text right as it lands
  let sawWin = false
  for (let p = 0; p < 40; p++) {
    await wait(80)
    const txt = await page.evaluate(() => document.body.innerText)
    if (/LINE CLAIMED/.test(txt)) { sawWin = true; break }
    if (/CRACKED DISC|BAD VEIN/i.test(txt)) break
  }
  if (sawWin) {
    won = true
    await page.screenshot({ path: `${OUT}/06-cartouche-hold.png` })
    await wait(200)
    await page.screenshot({ path: `${OUT}/06-cartouche-hold-b.png` })
    break
  } else {
    await wait(200)
    await clickText(page, 'ASSAY AGAIN')
    await wait(200)
  }
}
console.log(JSON.stringify({ won, attempts: attempt }))
await browser.close()
