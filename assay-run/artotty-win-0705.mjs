import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-artotty-win-0705'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = async (page, txt) => {
  const h = await page.evaluateHandle((t) => {
    const b = [...document.querySelectorAll('button')]
    return b.find((x) => x.textContent && x.textContent.includes(t)) || null
  }, txt)
  const el = h.asElement(); if (!el) return false; await el.click(); return true
}
const canvasBox = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas'); if (!c) return null
  const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }
})

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

let won = false
for (let attempt = 0; attempt < 12 && !won; attempt++) {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(500)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  await clickText(page, 'Outer') // shallowest depth = fewest cracked discs
  await wait(200)
  const box = await canvasBox(page)
  const tile = box.w / 10
  // paint a straight 8-disc vertical line in column 4, rows 1..8
  for (let r = 1; r <= 8; r++) {
    await page.mouse.click(box.x + 4 * tile + tile / 2, box.y + r * tile + tile / 2)
    await wait(45)
  }
  await wait(200)
  await clickText(page, 'RUN THE LINE')
  const frames = []
  for (let i = 0; i < 22; i++) {
    await wait(90)
    const p = `${OUT}/try${attempt}-reveal-${String(i).padStart(2, '0')}.png`
    await page.screenshot({ path: p }); frames.push(p)
  }
  await wait(700)
  const info = await page.evaluate(() => {
    const t = document.body.innerText
    return { won: /CLAIM PROVEN|PROVEN|SECURED|WIN/.test(t) && !/BUSTED|BAD VEIN/.test(t), bust: /BUSTED|BAD VEIN/.test(t), snip: t.slice(0, 160).replace(/\s+/g, ' ') }
  })
  if (info.won) {
    won = true
    await page.screenshot({ path: `${OUT}/WIN-settled.png` })
    // keep the reveal frames of this attempt renamed
    for (const f of frames) fs.copyFileSync(f, f.replace('try' + attempt, 'WIN'))
    console.log('WON on attempt', attempt, info.snip)
  } else {
    console.log('attempt', attempt, info.bust ? 'BUST' : '???', info.snip)
  }
}
if (!won) console.log('no win captured in attempts')
await browser.close()
