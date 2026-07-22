import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-jesse-0705'
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
const screenText = (page) => page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n').trim())

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })

// 1. COLD OPEN (lobby)
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(800)
await page.screenshot({ path: `${OUT}/01-lobby.png` })
console.log('=== LOBBY TEXT ===\n' + (await screenText(page)))

// 2. ENTER -> planning (empty)
await clickText(page, 'ENTER THE ASSAY LINE')
await wait(700)
await page.screenshot({ path: `${OUT}/02-planning-empty.png` })
console.log('\n=== PLANNING TEXT ===\n' + (await screenText(page)))

// 3. paint an 8-disc vertical line col4 rows1..8
let box = await canvasBox(page)
let tile = box.w / 10
for (let r = 1; r <= 8; r++) {
  await page.mouse.click(box.x + 4 * tile + tile / 2, box.y + r * tile + tile / 2)
  await wait(60)
}
await wait(400)
await page.screenshot({ path: `${OUT}/03-planning-painted.png` })
console.log('\n=== PAINTED TEXT ===\n' + (await screenText(page)))

// 4. RUN THE LINE disc-by-disc -> dense reveal frames
await clickText(page, 'RUN THE LINE')
for (let i = 0; i < 26; i++) {
  await wait(80)
  await page.screenshot({ path: `${OUT}/04-reveal-${String(i).padStart(2, '0')}.png` })
}
await wait(600)
await page.screenshot({ path: `${OUT}/05-settled-a.png` })
console.log('\n=== SETTLED-A TEXT ===\n' + (await screenText(page)))

// 5. retry until a WIN, dense-capture the settle beat
async function freshRunTo(state) {
  for (let attempt = 0; attempt < 45; attempt++) {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(450)
    await clickText(page, 'ENTER THE ASSAY LINE')
    await wait(450)
    const b = await canvasBox(page)
    const t = b.w / 10
    for (let r = 1; r <= 8; r++) {
      await page.mouse.click(b.x + 4 * t + t / 2, b.y + r * t + t / 2)
      await wait(45)
    }
    await wait(250)
    await clickText(page, 'RUN THE LINE')
    let got = 'none'
    for (let p = 0; p < 30; p++) {
      await wait(120)
      got = await page.evaluate(() => {
        const t = document.body.innerText
        if (/LINE CLAIMED/.test(t)) return 'won'
        if (/BUSTED/.test(t)) return 'bust'
        return 'none'
      })
      if (got !== 'none') break
    }
    if (got === state) return attempt
    // reset for next attempt
  }
  return -1
}

// WIN settle dense capture: paint, run, sample the first 1200ms densely
let wonAttempt = -1
for (let attempt = 0; attempt < 45 && wonAttempt < 0; attempt++) {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(450)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(450)
  const b = await canvasBox(page)
  const t = b.w / 10
  for (let r = 1; r <= 8; r++) {
    await page.mouse.click(b.x + 4 * t + t / 2, b.y + r * t + t / 2)
    await wait(45)
  }
  await wait(250)
  // switch to instant reveal so settle lands fast, then dense-sample settle
  await clickText(page, 'PACE: DISC-BY-DISC')
  await wait(120)
  await clickText(page, 'RUN THE LINE')
  // poll quickly for LINE CLAIMED then dense capture
  let claimed = false
  for (let p = 0; p < 40; p++) {
    await wait(60)
    const s = await page.evaluate(() => {
      const t = document.body.innerText
      if (/LINE CLAIMED/.test(t)) return 'won'
      if (/BUSTED/.test(t)) return 'bust'
      return 'none'
    })
    if (s === 'won') { claimed = true; break }
    if (s === 'bust') break
  }
  if (claimed) {
    wonAttempt = attempt
    for (let i = 0; i < 16; i++) {
      await page.screenshot({ path: `${OUT}/06-winsettle-${String(i).padStart(2, '0')}.png` })
      await wait(90)
    }
    await wait(400)
    await page.screenshot({ path: `${OUT}/07-win-final.png` })
    console.log('\n=== WIN TEXT (attempt ' + attempt + ') ===\n' + (await screenText(page)))
  }
}
if (wonAttempt < 0) console.log('NO WIN captured')

// 6. capture a BUST
let bustAttempt = -1
for (let attempt = 0; attempt < 30 && bustAttempt < 0; attempt++) {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(450)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(450)
  const b = await canvasBox(page)
  const t = b.w / 10
  for (let r = 1; r <= 8; r++) {
    await page.mouse.click(b.x + 4 * t + t / 2, b.y + r * t + t / 2)
    await wait(45)
  }
  await wait(250)
  await clickText(page, 'PACE: DISC-BY-DISC')
  await wait(120)
  await clickText(page, 'RUN THE LINE')
  let busted = false
  for (let p = 0; p < 40; p++) {
    await wait(60)
    const s = await page.evaluate(() => {
      const t = document.body.innerText
      if (/BUSTED/.test(t)) return 'bust'
      if (/LINE CLAIMED/.test(t)) return 'won'
      return 'none'
    })
    if (s === 'bust') { busted = true; break }
    if (s === 'won') break
  }
  if (busted) {
    bustAttempt = attempt
    await wait(200)
    await page.screenshot({ path: `${OUT}/08-bust.png` })
    console.log('\n=== BUST TEXT (attempt ' + attempt + ') ===\n' + (await screenText(page)))
  }
}
if (bustAttempt < 0) console.log('NO BUST captured')

await browser.close()
console.log('\nDONE')
