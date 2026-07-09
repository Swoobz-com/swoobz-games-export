import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5333/'
const OUT = 'shots-mobile-pan'
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

const scrollBox = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const scroller = c.parentElement
  const sr = scroller.getBoundingClientRect()
  return {
    scrollerW: Math.round(sr.width),
    scrollerH: Math.round(sr.height),
    canvasW: c.getBoundingClientRect().width,
    canvasH: c.getBoundingClientRect().height,
    overflow: getComputedStyle(scroller).overflow,
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
  { name: '390x844-iphone14pro', width: 390, height: 844 },
  { name: '412x915-pixel7', width: 412, height: 915 },
]

const report = {}

for (const d of devices) {
  await page.emulate({
    viewport: { width: d.width, height: d.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
  })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(500)
  const r = {}
  r.lobbyShot = `${OUT}/${d.name}-01-lobby.png`
  await page.screenshot({ path: r.lobbyShot })

  await clickText('ENTER THE ASSAY LINE')
  await wait(400)
  r.scrollBoxInitial = await scrollBox()
  r.planningShot = `${OUT}/${d.name}-02-planning.png`
  await page.screenshot({ path: r.planningShot })

  // Tap-select 8 tiles at the current (centered) scroll position — genuine
  // touchscreen taps, not mouse clicks, to exercise the real tap path. Tap
  // coordinates must be relative to the SCROLLER's visible viewport rect
  // (the on-screen window), NOT the full (mostly off-screen, scrolled)
  // canvas rect — a scrolled canvas's own getBoundingClientRect() reports
  // deeply negative/off-screen coordinates for its top-left.
  const scroller0 = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.parentElement.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  const TILE = 46
  for (let i = 0; i < 8; i++) {
    const col = i % 4
    const row = Math.floor(i / 4)
    const tx = 16 + col * TILE
    const ty = 16 + row * TILE
    if (tx < scroller0.w && ty < scroller0.h) {
      await page.touchscreen.tap(scroller0.x + tx, scroller0.y + ty)
      await wait(80)
    }
  }
  await wait(300)
  r.trailShot = `${OUT}/${d.name}-03-trail-tapped.png`
  await page.screenshot({ path: r.trailShot })
  r.odometerAfterTaps = await trailLenText()

  // Simulate a PAN: a real touch drag across the scroll container should
  // move its scrollLeft/scrollTop (native browser scroll, not our code).
  const before = await scrollBox()
  const cx = scroller0.x + scroller0.w / 2
  const cy = scroller0.y + scroller0.h / 2
  const touch = await page.touchscreen.touchStart(cx, cy)
  for (let i = 1; i <= 6; i++) {
    await touch.move(cx - i * 15, cy - i * 10)
    await wait(16)
  }
  await touch.end()
  await wait(300)
  const after = await scrollBox()
  r.panBefore = { scrollLeft: before.scrollLeft, scrollTop: before.scrollTop }
  r.panAfter = { scrollLeft: after.scrollLeft, scrollTop: after.scrollTop }
  r.panMoved = after.scrollLeft !== before.scrollLeft || after.scrollTop !== before.scrollTop
  r.panShot = `${OUT}/${d.name}-04-after-pan.png`
  await page.screenshot({ path: r.panShot })

  // Confirm the tap-vs-pan gesture did NOT ALSO toggle a stray tile (a tap
  // immediately followed by a big drag should read as pan-only).
  r.odometerAfterPan = await trailLenText()

  // Full round-trip: PLUNGE (real touch tap on the DOM button, outside the
  // scroll canvas) → cascade → settle.
  const plungeHandle = await page.evaluateHandle(() => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes('PLUNGE')) || null
  })
  const plungeEl = plungeHandle.asElement()
  r.plungeFound = !!plungeEl
  if (plungeEl) {
    const pr = await plungeEl.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }
    })
    r.plungeButtonBox = { w: Math.round(pr.w), h: Math.round(pr.h) }
    await page.touchscreen.tap(pr.x, pr.y)
  }
  await wait(600)
  r.assayingShot = `${OUT}/${d.name}-05-assaying.png`
  await page.screenshot({ path: r.assayingShot })
  await wait(3200)
  r.settledShot = `${OUT}/${d.name}-06-settled.png`
  await page.screenshot({ path: r.settledShot })
  const settledText = (await bodyText()).replace(/\n/g, ' | ')
  r.hasOutcome = /CLAIM PROVEN|BUSTED/.test(settledText)

  report[d.name] = r
}

report.errors = errors
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
process.exit(0)
