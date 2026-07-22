// Catches the "LINE CLAIMED" hero-pop cartouche+bloom moment on a WIN, on the
// new 14x14/dark-obsidian board, by sampling screenshots at short intervals
// after RUN THE LINE resolves. Loops multiple rounds (different seeds) until
// a WIN is observed, since the round outcome is real RNG.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = path.resolve('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-obsidian-0705/herobloom')
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const GRID_DIM = 14

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
const dismissCoachmark = async (page) => {
  const handle = await page.evaluateHandle(() => document.querySelector('button[aria-label="Dismiss how-to-play tip"]'))
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}
const canvasBox = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})

async function playOneRound(page, roundIdx) {
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(300)
  await dismissCoachmark(page)
  await wait(150)
  const board = await canvasBox(page)
  const tile = board.w / GRID_DIM
  await page.mouse.move(board.x + tile * 0.5, board.y + tile * 0.5)
  await page.mouse.down()
  for (let i = 0; i < 14; i++) {
    const col = i % GRID_DIM, row = Math.floor(i / GRID_DIM)
    await page.mouse.move(board.x + tile * (col + 0.5), board.y + tile * (row + 0.5), { steps: 2 })
    await wait(10)
  }
  await page.mouse.up()
  await wait(150)
  await clickText(page, 'RUN THE LINE')
  // sample frequently to catch the hero-pop + bloom window
  const shots = []
  for (const ms of [300, 600, 900, 1200, 1500, 1800, 2100, 2400, 2800, 3300, 4000]) {
    await wait(ms - (shots.length ? [300, 600, 900, 1200, 1500, 1800, 2100, 2400, 2800, 3300, 4000][shots.length - 1] : 0))
    const bodyText = await page.evaluate(() => document.body.innerText)
    const won = /LINE CLAIMED/i.test(bodyText)
    const busted = /CRACKED DISC|BUSTED/i.test(bodyText)
    const file = `${OUT}/r${roundIdx}-t${ms}.png`
    await page.screenshot({ path: file })
    shots.push({ ms, won, busted, file })
  }
  const wonFinal = shots.some((s) => s.won)
  // reset for next round if busted
  const bodyText = await page.evaluate(() => document.body.innerText)
  const hasAgain = /ASSAY AGAIN/.test(bodyText)
  if (hasAgain) await clickText(page, 'ASSAY AGAIN')
  await wait(400)
  return { roundIdx, shots, wonFinal }
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
  const page = (await browser.pages())[0]
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(700)
  const results = []
  for (let i = 0; i < 6; i++) {
    const r = await playOneRound(page, i)
    results.push(r)
    if (r.wonFinal) break
  }
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results.map((r) => ({ roundIdx: r.roundIdx, wonFinal: r.wonFinal })), null, 2))
  await browser.close()
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
