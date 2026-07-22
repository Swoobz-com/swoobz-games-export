import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5200/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-mobile-qa2'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const errors = []
const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const page = (await browser.pages())[0]
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text())
})
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

const bodyText = () => page.evaluate(() => document.body.innerText)

// Measure ALL buttons + interactive controls currently in the DOM.
const measureAllControls = () => page.evaluate(() => {
  const out = []
  document.querySelectorAll('button, a[role], [role="button"]').forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) return // not rendered
    const cs = getComputedStyle(el)
    out.push({
      text: (el.textContent || '').trim().slice(0, 40),
      w: Math.round(r.width * 100) / 100,
      h: Math.round(r.height * 100) / 100,
      top: Math.round(r.top),
      left: Math.round(r.left),
      touchAction: cs.touchAction,
      tag: el.tagName,
    })
  })
  return out
})

const scrollBox = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const scroller = c.parentElement
  const sr = scroller.getBoundingClientRect()
  return {
    scrollerX: sr.x, scrollerY: sr.y,
    scrollerW: Math.round(sr.width),
    scrollerH: Math.round(sr.height),
    canvasW: c.getBoundingClientRect().width,
    canvasH: c.getBoundingClientRect().height,
    touchAction: getComputedStyle(c).touchAction,
    scrollWidth: scroller.scrollWidth,
    scrollHeight: scroller.scrollHeight,
    scrollLeft: scroller.scrollLeft,
    scrollTop: scroller.scrollTop,
  }
})

const trailLenText = () => page.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find(
    (e) => e.children.length === 0 && /^\d{2}$/.test(e.textContent || ''),
  )
  return el ? el.textContent : null
})

const devices = [
  { name: 'pixel7-412x915', width: 412, height: 915 },
  { name: 'iphone14pro-390x844', width: 390, height: 844 },
]

const report = {}

for (const d of devices) {
  const r = {}
  await page.emulate({
    viewport: { width: d.width, height: d.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
  })
  const resp = await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  r.httpStatus = resp.status()
  await wait(500)
  await page.screenshot({ path: `${OUT}/${d.name}-01-lobby.png` })
  r.lobbyControls = await measureAllControls()

  // ── ROUND 1 ──
  await tapText('ENTER THE ASSAY LINE')
  await wait(400)
  r.scrollBoxInitial = await scrollBox()
  r.round1PlanningControls = await measureAllControls()
  await page.screenshot({ path: `${OUT}/${d.name}-02-planning-r1.png` })

  // Tile-size ground truth: sample the actual on-screen tile pitch via hitTest math (tile = canvasW/32)
  r.tilePx = r.scrollBoxInitial ? r.scrollBoxInitial.canvasW / 32 : null

  // Tap-select 7 tiles individually (genuine discrete taps) at the centered scroll window.
  const scroller0 = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const rr = c.parentElement.getBoundingClientRect()
    return { x: rr.x, y: rr.y, w: rr.width, h: rr.height }
  })
  const TILE = r.tilePx
  const tapSeq = []
  for (let i = 0; i < 7; i++) {
    const col = i % 4
    const row = Math.floor(i / 4)
    const tx = TILE / 2 + col * TILE
    const ty = TILE / 2 + row * TILE
    if (tx < scroller0.w && ty < scroller0.h) {
      await page.touchscreen.tap(scroller0.x + tx, scroller0.y + ty)
      tapSeq.push({ tx, ty })
      await wait(90)
    }
  }
  await wait(200)
  r.odometerAfter7Taps = await trailLenText()
  await page.screenshot({ path: `${OUT}/${d.name}-03-after-7taps.png` })

  // MIN-8 GATE: PLUNGE must be disarmed (disabled) with only 7 pinned.
  r.plungeStateAt7 = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const b = btns.find((x) => x.textContent && x.textContent.includes('PLUNGE'))
    return b ? { disabled: b.disabled, opacity: getComputedStyle(b).opacity } : null
  })

  // Tap an 8th tile to cross the min-8 gate.
  const col8 = 7 % 4, row8 = Math.floor(7 / 4)
  await page.touchscreen.tap(scroller0.x + TILE / 2 + col8 * TILE, scroller0.y + TILE / 2 + row8 * TILE)
  await wait(200)
  r.odometerAfter8Taps = await trailLenText()
  r.plungeStateAt8 = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const b = btns.find((x) => x.textContent && x.textContent.includes('PLUNGE'))
    return b ? { disabled: b.disabled, opacity: getComputedStyle(b).opacity } : null
  })
  await page.screenshot({ path: `${OUT}/${d.name}-04-min8-armed.png` })

  // PAN gesture test — must NOT toggle a stray tile (disambiguation check).
  const before = await scrollBox()
  const cx = scroller0.x + scroller0.w / 2
  const cy = scroller0.y + scroller0.h / 2
  const touch = await page.touchscreen.touchStart(cx, cy)
  for (let i = 1; i <= 8; i++) {
    await touch.move(cx - i * 14, cy - i * 9)
    await wait(16)
  }
  await touch.end()
  await wait(300)
  const after = await scrollBox()
  r.panDelta = { dLeft: after.scrollLeft - before.scrollLeft, dTop: after.scrollTop - before.scrollTop }
  r.panMoved = r.panDelta.dLeft !== 0 || r.panDelta.dTop !== 0
  r.odometerAfterPan = await trailLenText()
  await page.screenshot({ path: `${OUT}/${d.name}-05-after-pan.png` })

  // Pan back to a known reachable area, then commit PLUNGE (real touch tap).
  const plungeBox = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const b = btns.find((x) => x.textContent && x.textContent.includes('PLUNGE'))
    if (!b) return null
    const rr = b.getBoundingClientRect()
    return { x: rr.x + rr.width / 2, y: rr.y + rr.height / 2, w: rr.width, h: rr.height, top: rr.top, vh: window.innerHeight }
  })
  r.plungeBoxRound1 = plungeBox
  if (plungeBox) {
    r.plungeThumbZonePct = Math.round(((plungeBox.top + plungeBox.h / 2) / plungeBox.vh) * 1000) / 10
    await page.touchscreen.tap(plungeBox.x, plungeBox.y)
  }
  await wait(700)
  await page.screenshot({ path: `${OUT}/${d.name}-06-assaying-r1.png` })
  await wait(3500)
  await page.screenshot({ path: `${OUT}/${d.name}-07-settled-r1.png` })
  const settledText1 = (await bodyText()).replace(/\n/g, ' | ')
  r.round1Outcome = /CLAIM PROVEN/.test(settledText1) ? 'WIN' : (/BUSTED/.test(settledText1) ? 'BUST' : 'UNKNOWN')

  // Safety link measurement + open panel by tap.
  r.safetyLinkBox = await page.evaluate(() => {
    const cand = [...document.querySelectorAll('a,button,[role="button"],span,div')].find(
      (e) => e.children.length === 0 && /PLAY SAFE|SAFETY/i.test(e.textContent || ''),
    )
    if (!cand) return null
    const rr = cand.getBoundingClientRect()
    return { text: cand.textContent, w: rr.width, h: rr.height, tag: cand.tagName }
  })

  // ── ASSAY AGAIN → ROUND 2 (SAME LINE mounts) ──
  await tapText('ASSAY AGAIN')
  await wait(400)
  await tapText('ENTER THE ASSAY LINE') // if lobby shown again
  await wait(300)
  r.round2PlanningControls = await measureAllControls()
  await page.screenshot({ path: `${OUT}/${d.name}-08-round2-planning.png` })

  report[d.name] = r
}

report.errors = errors
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
process.exit(0)
