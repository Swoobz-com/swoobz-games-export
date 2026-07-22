import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5183/'
const OUT = 'shots-pulse-effects'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  defaultViewport: { width: 1440, height: 900 },
})
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })

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
  for (let row = 0; row < 32 && count < n; row++) {
    const cols = row % 2 === 0 ? [...Array(32).keys()] : [...Array(32).keys()].reverse()
    for (const col of cols) {
      if (count >= n) break
      const x = box.x + col * tile + tile / 2
      const y = box.y + row * tile + tile / 2
      await page.mouse.click(x, y)
      count++
    }
  }
}

async function clipShot(name) {
  const box = await canvasBox()
  await page.screenshot({ path: `${OUT}/${name}.png`, clip: { x: box.x - 4, y: box.y - 4, width: box.w + 8, height: box.h + 8 } })
  console.log('shot', name)
}
async function fullShot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('shot', name)
}

await page.goto(URL, { waitUntil: 'networkidle0' })

// ── PRESS-BOUNCE capture: click a single tile then screenshot almost
// immediately (press-bounce window is 140ms). ────────────────────────────
await clickText('ENTER THE ASSAY LINE')
await wait(150)
{
  const box = await canvasBox()
  const tile = box.w / 32
  await page.mouse.click(box.x + 5 * tile + tile / 2, box.y + 5 * tile + tile / 2)
  await clipShot('press-bounce-t0')
  await wait(60)
  await clipShot('press-bounce-t60')
  await wait(120)
  await clipShot('press-bounce-settled')
}

// ── WIN path: force staggered pace + instant to see reveal-pop + hero-pop +
// win ring. Retry serpentine claim-lines until a full win happens. ─────────
let won = false
for (let attempt = 0; attempt < 40 && !won; attempt++) {
  await clickText('CLEAR')
  const box = await canvasBox()
  // Use a SHORT 8-tile claim-line to maximize win odds per attempt.
  await paintSerpentine(8, box)
  await wait(80)
  // ensure INSTANT pace so all 8 reveal in one batch (chunkier pop + ring test)
  const paceTxt = await bodyText()
  if (paceTxt.includes('PACE: BEAD')) {
    await clickText('PACE:')
    await wait(60)
  }
  await clickText('PLUNGE')
  await wait(250)
  await clipShot(`attempt${attempt}-postplunge`)
  const txt = await bodyText()
  if (txt.includes('CLAIM PROVEN')) {
    won = true
    await fullShot('WIN-full-with-hero-pop')
    await clipShot('WIN-board-ring')
    await wait(500)
    await fullShot('WIN-settled-after-hold')
  } else if (txt.includes('BAD VEIN')) {
    await clipShot(`attempt${attempt}-bust-t0`)
    await wait(80)
    await clipShot(`attempt${attempt}-bust-t80`)
    await wait(150)
    await clipShot(`attempt${attempt}-bust-t230`)
    await wait(300)
    await fullShot(`attempt${attempt}-settled-loss`)
    await clickText('ASSAY AGAIN')
    await wait(150)
  }
}
console.log('won:', won)

console.log('ERRORS:', JSON.stringify(errors, null, 2))
await browser.close()
