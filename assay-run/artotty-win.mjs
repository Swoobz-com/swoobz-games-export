import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const OUT = 'shots-artotty-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = async (page, txt) => {
  const h = await page.evaluateHandle((t) => {
    const b = [...document.querySelectorAll('button')]
    return b.find((x) => x.textContent && x.textContent.includes(t)) || null
  }, txt)
  const el = h.asElement()
  if (!el) return false
  await el.click()
  return true
}
const canvasBox = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

let won = false
for (let attempt = 0; attempt < 10 && !won; attempt++) {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  const box = await canvasBox(page)
  const tile = box.w / 32
  // short connected trail of 9 nubs starting near bottom center
  let r = 24, c = 16
  for (let i = 0; i < 9; i++) {
    await page.mouse.click(box.x + c * tile + tile / 2, box.y + r * tile + tile / 2)
    await wait(35)
    r -= 1
    if (i % 2 === 1) c += 1
  }
  await wait(150)
  await clickText(page, 'THROW BREAKER')
  // burst capture the reveal + claim
  const shots = []
  for (let i = 0; i < 20; i++) {
    await wait(120)
    const p = `${OUT}/d1440-WIN-reveal-${String(i).padStart(2, '0')}.png`
    await page.screenshot({ path: p })
    shots.push(p)
  }
  await wait(700)
  const info = await page.evaluate(() => {
    const t = document.body.innerText
    return { won: /CLAIM PROVEN/.test(t), bust: /BUSTED/.test(t), snip: t.slice(0, 200).replace(/\s+/g, ' ') }
  })
  await page.screenshot({ path: `${OUT}/d1440-WIN-settled.png` })
  console.log('attempt', attempt, info.won ? 'WON' : info.bust ? 'BUST' : '?', '|', info.snip)
  won = info.won
  if (won) fs.writeFileSync(`${OUT}/win-report.json`, JSON.stringify(info, null, 2))
}
console.log('final won =', won)
await browser.close()
