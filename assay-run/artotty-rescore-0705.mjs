import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-artotty-rescore-0705'
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
const errs = []
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errs.push('CE ' + m.text()) })

// ---- DESKTOP 1440 idle / planning (background + margins + coins + dial at rest) ----
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(700)
await page.screenshot({ path: `${OUT}/d1440-01-lobby.png` })
await clickText(page, 'ENTER THE ASSAY LINE')
await wait(700)
await page.screenshot({ path: `${OUT}/d1440-02-planning.png`, fullPage: false })
// paint a partial trail so coins/dial show in-context
const box = await canvasBox(page)
if (box) {
  const tile = box.w / 10
  for (let r = 8; r >= 4; r--) {
    await page.mouse.click(box.x + 4 * tile + tile / 2, box.y + r * tile + tile / 2)
    await wait(45)
  }
}
await wait(300)
await page.screenshot({ path: `${OUT}/d1440-03-trail.png` })

// ---- MOBILE 412 idle ----
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(700)
await page.screenshot({ path: `${OUT}/m412-01-lobby.png` })
await clickText(page, 'ENTER THE ASSAY LINE')
await wait(700)
await page.screenshot({ path: `${OUT}/m412-02-planning.png` })

// ---- WIN settle capture (cartouche + board bloom) on DESKTOP ----
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
let won = false
for (let attempt = 0; attempt < 14 && !won; attempt++) {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(500)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  await clickText(page, 'Outer')
  await wait(200)
  const b = await canvasBox(page)
  if (!b) continue
  const tile = b.w / 10
  for (let r = 1; r <= 8; r++) {
    await page.mouse.click(b.x + 4 * tile + tile / 2, b.y + r * tile + tile / 2)
    await wait(45)
  }
  await wait(200)
  await clickText(page, 'RUN THE LINE')
  const frames = []
  for (let i = 0; i < 26; i++) {
    await wait(70)
    const p = `${OUT}/try${attempt}-reveal-${String(i).padStart(2, '0')}.png`
    await page.screenshot({ path: p }); frames.push(p)
  }
  await wait(600)
  const info = await page.evaluate(() => {
    const t = document.body.innerText
    return { won: /LINE CLAIMED|CLAIM PROVEN|PROVEN|SECURED/.test(t) && !/BUSTED|CRACKED DISC/.test(t), bust: /BUSTED|CRACKED DISC/.test(t), snip: t.slice(0, 160).replace(/\s+/g, ' ') }
  })
  if (info.won) {
    won = true
    await page.screenshot({ path: `${OUT}/WIN-settled.png` })
    for (const f of frames) fs.copyFileSync(f, f.replace('try' + attempt, 'WIN'))
    console.log('WON on attempt', attempt, info.snip)
  } else {
    console.log('attempt', attempt, info.bust ? 'BUST' : '???', info.snip)
  }
}
if (!won) console.log('NO WIN captured')
fs.writeFileSync(`${OUT}/errs.json`, JSON.stringify(errs, null, 2))
console.log('ERRS', errs.length)
await browser.close()
