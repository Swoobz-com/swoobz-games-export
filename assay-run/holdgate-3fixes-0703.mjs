import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5501/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-holdgate-3fixes-0703'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

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
const canvasBox = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
async function paintSerpentine(page, n, box) {
  const tile = box.w / 32
  let count = 0
  for (let row = 3; row < 30 && count < n; row += 2) {
    for (let col = 2; col < 30 && count < n; col += 3) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      count++
      await wait(8)
    }
  }
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })
page.on('response', (r) => { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url()) })

const report = {}

// ── PART A: FIX 3 — no OS-colored emoji on the plunge label, at desktop ──
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(400)
await clickText(page, 'ENTER THE ASSAY LINE')
await wait(300)
const plungeText = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('PLUNGE'))
  return b ? b.textContent : null
})
report.fix3_plungeLabelText = plungeText
report.fix3_hasLightningEmoji = plungeText ? plungeText.includes('⚡') : null
await page.screenshot({ path: `${OUT}/fix3-desktop-plunge-label.png` })

// ── PART B: FIX 1 — bust-scatter still renders correctly (visual regression
// on the shard trajectory), forcing a bad-vein via a wide serpentine trail.
let bustShot = false
for (let attempt = 0; attempt < 10 && !bustShot; attempt++) {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(300)
  const box = await canvasBox(page)
  await paintSerpentine(page, 40, box)
  await wait(200)
  await clickText(page, 'PLUNGE')
  for (let i = 0; i < 60; i++) {
    const txt = await page.evaluate(() => document.body.innerText)
    if (txt.includes('BAD VEIN')) {
      // Sample rAF cadence across the SCATTER_MS (~520ms) window right after
      // the punch fires — proves no per-frame jank was introduced by the fix.
      const frameSample = await page.evaluate(() => new Promise((resolve) => {
        let n = 0
        const t0 = performance.now()
        function tick() { n++; if (performance.now() - t0 < 520) requestAnimationFrame(tick); else resolve({ frames: n, elapsedMs: performance.now() - t0 }) }
        requestAnimationFrame(tick)
      }))
      report.fix1_scatterWindowFrameSample = frameSample
      report.fix1_approxFpsDuringScatter = Math.round((frameSample.frames / frameSample.elapsedMs) * 1000)
      await page.screenshot({ path: `${OUT}/fix1-bust-scatter-a.png` })
      await wait(80)
      await page.screenshot({ path: `${OUT}/fix1-bust-scatter-b.png` })
      await wait(200)
      await page.screenshot({ path: `${OUT}/fix1-bust-scatter-c.png` })
      bustShot = true
      break
    }
    await wait(30)
  }
}
report.fix1_bustCaptured = bustShot

// ── PART C: FIX 2 — PLAY SAFE stays one line at iPhone 14 Pro (390x844),
// after building session history so the SESSION chip has a long string.
await page.emulate({
  viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
})
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(400)
await clickText(page, 'ENTER THE ASSAY LINE')
await wait(300)

// Play several small claim-lines (min 8 tiles each) and PLUNGE, then
// "ASSAY AGAIN" to accumulate SESSION rounds/claimed/delta into a long chip
// string like "SESSION · 3 LINES · 24 CLAIMED · -1.00". Uses the scrollable
// mobile viewport's own parentElement rect (the scroll window), NOT the raw
// canvas rect (which can exceed the visible viewport on mobile), mirroring
// the proven holdgate-mobiletouch-fx-0703.mjs touch-tap technique.
for (let round = 0; round < 4; round++) {
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
  const pbox = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('PLUNGE'))
    if (!b) return null
    const rr = b.getBoundingClientRect()
    return { x: rr.x + rr.width / 2, y: rr.y + rr.height / 2 }
  })
  if (pbox) await page.touchscreen.tap(pbox.x, pbox.y)
  await wait(1800)
  const abox = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('ASSAY AGAIN'))
    if (!b) return null
    const rr = b.getBoundingClientRect()
    return { x: rr.x + rr.width / 2, y: rr.y + rr.height / 2 }
  })
  if (abox) await page.touchscreen.tap(abox.x, abox.y)
  await wait(400)
}

await wait(300)
const headerCheck = await page.evaluate(() => {
  const sessionSpan = [...document.querySelectorAll('span')].find((s) => s.textContent && s.textContent.includes('SESSION'))
  const safetyBtn = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('Play safe'))
  if (!safetyBtn) return { found: false }
  const sr = safetyBtn.getBoundingClientRect()
  const cs = getComputedStyle(safetyBtn)
  return {
    found: true,
    sessionText: sessionSpan ? sessionSpan.textContent : null,
    sessionRect: sessionSpan ? sessionSpan.getBoundingClientRect().toJSON() : null,
    safetyRect: sr.toJSON(),
    safetyLineHeight: cs.lineHeight,
    safetyFontSize: cs.fontSize,
    safetyWhiteSpace: cs.whiteSpace,
    safetyText: safetyBtn.textContent,
    // Single line iff the button's rendered height is close to one line
    // (well under 2x a single text-line height, e.g. < 30px content height
    // once the 40px min-height floor and 4px vertical padding are excluded).
  }
})
report.fix2_headerCheck = headerCheck
await page.screenshot({ path: `${OUT}/fix2-iphone14pro-390-header.png` })
report.fix2_scroll = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  hasHScroll: document.documentElement.scrollWidth > window.innerWidth,
}))

report.errors = errors
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
process.exit(0)
