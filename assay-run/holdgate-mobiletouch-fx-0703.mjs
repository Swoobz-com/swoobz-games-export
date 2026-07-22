import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5185/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-holdgate-mobiletouch-fx-0703'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const devices = [
  { name: 'pixel7-412x915', width: 412, height: 915 },
  { name: 'iphone14pro-390x844', width: 390, height: 844 },
]

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })
page.on('response', (r) => { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url()) })

const tapText = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  const box = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
  await page.touchscreen.tap(box.x, box.y)
  return true
}

const report = {}

for (const d of devices) {
  const r = {}
  await page.emulate({
    viewport: { width: d.width, height: d.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
  })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)
  await tapText('ENTER THE ASSAY LINE')
  await wait(300)
  // Stays on default STAGGERED pace (BEAD) — exercise the full juice pipeline
  // (coin-fly, per-tile reveal-pop, travelling spark, tally pulse/spark) under
  // genuine touch taps, at CASCADE_INTERVAL_MS=90/tile.
  const scroller = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const rr = c.parentElement.getBoundingClientRect()
    return { x: rr.x, y: rr.y }
  })
  const TILE = 46
  for (let i = 0; i < 8; i++) {
    const col = i % 4, row = Math.floor(i / 4)
    await page.touchscreen.tap(scroller.x + TILE / 2 + col * TILE, scroller.y + TILE / 2 + row * TILE)
    await wait(60)
  }
  await wait(150)
  // Real touch tap on PLUNGE.
  const pbox = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('PLUNGE'))
    const rr = b.getBoundingClientRect()
    return { x: rr.x + rr.width / 2, y: rr.y + rr.height / 2 }
  })
  await page.touchscreen.tap(pbox.x, pbox.y)

  // Sample rAF-driven frame cadence + capture mid-cascade screenshots across
  // the ~8*90=720ms staggered reveal window.
  const frameSample = await page.evaluate(() => new Promise((resolve) => {
    let n = 0
    const t0 = performance.now()
    function tick() { n++; if (performance.now() - t0 < 700) requestAnimationFrame(tick); else resolve({ frames: n, elapsedMs: performance.now() - t0 }) }
    requestAnimationFrame(tick)
  }))
  r.frameSampleDuringCascade = frameSample
  r.approxFps = Math.round((frameSample.frames / frameSample.elapsedMs) * 1000)

  await wait(120)
  await page.screenshot({ path: `${OUT}/${d.name}-mid-cascade-a.png` })
  await wait(200)
  await page.screenshot({ path: `${OUT}/${d.name}-mid-cascade-b.png` })
  await wait(600)
  await page.screenshot({ path: `${OUT}/${d.name}-settled.png` })
  r.bodyTextTail = (await page.evaluate(() => document.body.innerText)).slice(0, 400)

  report[d.name] = r
}

report.errors = errors
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
process.exit(0)
