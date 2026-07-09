import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5191/'
const OUT = 'shots-rescore-0704'
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
const bodyState = (page) =>
  page.evaluate(() => {
    const t = document.body.innerText
    return {
      won: /CLAIM PROVEN/.test(t),
      bust: /BUSTED|BAD VEIN/.test(t),
    }
  })

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })

// paint a min-length trail (8 tiles) as a connected line near center-bottom
async function paintTrail(page, box, len) {
  const tile = box.w / 20
  let r = 15, c = 8
  let placed = 0
  for (let i = 0; i < len; i++) {
    await page.mouse.click(box.x + c * tile + tile / 2, box.y + r * tile + tile / 2)
    placed++
    await wait(30)
    // snake: move up, occasionally right, to stay connected (adjacency)
    if (i % 2 === 0) r -= 1
    else c += 1
  }
  return placed
}

async function runViewport(vp, dsf, want) {
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: dsf })
  const tag = `${vp.name}`
  let done = false
  for (let attempt = 0; attempt < 14 && !done; attempt++) {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(500)
    if (attempt === 0) await page.screenshot({ path: `${OUT}/${tag}-01-lobby.png` })
    await clickText(page, 'ENTER THE ASSAY LINE')
    await wait(500)
    const box = await canvasBox(page)
    if (!box) { errors.push(`${tag}: no canvas`); return }
    if (attempt === 0) await page.screenshot({ path: `${OUT}/${tag}-02-planning-empty.png` })
    await paintTrail(page, box, 8)
    await wait(150)
    if (attempt === 0) await page.screenshot({ path: `${OUT}/${tag}-03-armed.png` })
    await clickText(page, 'THROW BREAKER')
    // burst capture assaying reveal (dense)
    if (attempt === 0) {
      for (let i = 0; i < 16; i++) {
        await wait(130)
        await page.screenshot({ path: `${OUT}/${tag}-04-assay-${String(i).padStart(2, '0')}.png` })
      }
    } else {
      await wait(2600)
    }
    await wait(900)
    const st = await bodyState(page)
    if (st.won && (want === 'win' || want === 'any')) {
      // dense burst of the hero settle moment
      for (let i = 0; i < 10; i++) {
        await page.screenshot({ path: `${OUT}/${tag}-05-WIN-settle-${String(i).padStart(2, '0')}.png` })
        await wait(160)
      }
      done = true
    } else if (st.bust && want === 'bust') {
      for (let i = 0; i < 6; i++) {
        await page.screenshot({ path: `${OUT}/${tag}-06-BUST-${String(i).padStart(2, '0')}.png` })
        await wait(160)
      }
      done = true
    }
    console.log(tag, 'attempt', attempt, st.won ? 'WON' : st.bust ? 'BUST' : '?')
  }
  return done
}

const DESKTOP = [
  { name: 'd1440', w: 1440, h: 900 },
  { name: 'd1920', w: 1920, h: 1080 },
  { name: 'd2560', w: 2560, h: 1440 },
]
for (const vp of DESKTOP) await runViewport(vp, 1, 'win')
// a bust at 1920
await runViewport({ name: 'd1920b', w: 1920, h: 1080 }, 1, 'bust')
// mobile portrait, win
await runViewport({ name: 'm412', w: 412, h: 915 }, 2, 'win')

fs.writeFileSync(`${OUT}/errors.json`, JSON.stringify(errors, null, 2))
console.log('ERRORS:', errors.length)
await browser.close()
