import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5194/'
const OUT = 'shots-vrqa-full-mobile-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 },
]

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
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
const overflow = () => page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  scrollHeight: document.documentElement.scrollHeight,
  innerHeight: window.innerHeight,
}))
const ctaInfo = () => page.evaluate((vh) => {
  const btns = [...document.querySelectorAll('button')]
  const cta = btns.find((b) => b.textContent && b.textContent.includes('ASSAY AGAIN'))
  const busted = document.body.innerText.includes('BUSTED')
  if (!cta) return { found: false, busted }
  const r = cta.getBoundingClientRect()
  return { found: true, busted, top: r.top, bottom: r.bottom, aboveFoldPx: Math.max(0, r.bottom - vh) }
}, 0)

// mobile board: canvas is oversized inside a scrollable wrapper; get wrapper rect + canvas intrinsic size
const mobileBoardInfo = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const wrap = c.parentElement
  const wrapRect = wrap ? wrap.getBoundingClientRect() : null
  return {
    canvasCssW: c.getBoundingClientRect().width,
    canvasCssH: c.getBoundingClientRect().height,
    canvasIntrinsicW: c.width,
    canvasIntrinsicH: c.height,
    wrapRect: wrapRect ? { w: wrapRect.width, h: wrapRect.height } : null,
    scrollLeft: wrap ? wrap.scrollLeft : null,
    scrollTop: wrap ? wrap.scrollTop : null,
    scrollableW: wrap ? wrap.scrollWidth : null,
    scrollableH: wrap ? wrap.scrollHeight : null,
  }
})

// sample coin at a tile visible in the current scroll window (near center of scroll)
const sampleVisibleCoin = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  const ctx = c.getContext('2d')
  const wrap = c.parentElement
  const wrapRect = wrap.getBoundingClientRect()
  // pick a point near the center of the VISIBLE scroll window, convert to canvas-intrinsic coords
  const visX = wrapRect.width / 2
  const visY = wrapRect.height / 2
  const canvasCssRect = c.getBoundingClientRect()
  // canvas css rect x/y is relative to viewport; the wrap's scrollLeft/Top already shifted it
  const localX = (wrap.scrollLeft + visX) // css px within the (oversized) canvas content
  const localY = (wrap.scrollTop + visY)
  const scaleX = c.width / c.getBoundingClientRect().width
  const scaleY = c.height / c.getBoundingClientRect().height
  const px = Math.floor(localX * scaleX)
  const py = Math.floor(localY * scaleY)
  const d = ctx.getImageData(Math.max(0, px), Math.max(0, py), 1, 1).data
  return { px, py, rgba: [...d] }
})

const report = {}

for (const vp of VIEWPORTS) {
  const vpReport = {}
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

  // ---------- LOBBY ----------
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(600)
  vpReport.lobbyOverflow = await overflow()
  vpReport.lobbyOverflowPx = Math.max(0, vpReport.lobbyOverflow.scrollWidth - vpReport.lobbyOverflow.innerWidth)
  await page.screenshot({ path: `${OUT}/${vp.name}-01-lobby.png` })

  // ---------- PLANNING ----------
  await clickText('ENTER THE ASSAY LINE')
  await wait(500)
  vpReport.planningOverflow = await overflow()
  vpReport.mobileBoardInfo = await mobileBoardInfo()
  await page.screenshot({ path: `${OUT}/${vp.name}-02-planning.png` })
  vpReport.coinSampleCenterOfScroll = await sampleVisibleCoin()

  // tap 10 DISTINCT tiles (2-tile spacing, MOBILE_TILE_PX=46 CSS) within the
  // visible scroll window to build a trail past MIN_TRAIL=8, via real touch tap.
  const info = vpReport.mobileBoardInfo
  const TILE = 46
  const startCol = Math.floor(info.scrollLeft / TILE) + 2
  const startRow = Math.floor(info.scrollTop / TILE) + 2
  const wrapScreen = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.parentElement.getBoundingClientRect()
    return { x: r.x, y: r.y }
  })
  const tapPoints = []
  for (let i = 0; i < 16; i++) {
    const col = startCol + (i % 4)
    const row = startRow + Math.floor(i / 4)
    const localX = col * TILE + TILE / 2 - info.scrollLeft
    const localY = row * TILE + TILE / 2 - info.scrollTop
    tapPoints.push({ x: wrapScreen.x + localX, y: wrapScreen.y + localY })
  }
  for (const p of tapPoints) {
    await page.touchscreen.tap(p.x, p.y)
    await wait(80)
  }
  await wait(300)
  vpReport.trailPaintedOverflow = await overflow()
  await page.screenshot({ path: `${OUT}/${vp.name}-03-trail-painted.png` })

  // ---------- PLUNGE ----------
  await clickText('THROW BREAKER')
  await wait(600)
  await page.screenshot({ path: `${OUT}/${vp.name}-04-assaying-early.png` })
  await wait(1200)
  await page.screenshot({ path: `${OUT}/${vp.name}-05-assaying-mid.png` })
  await wait(2000)

  // ---------- SETTLED ----------
  const win1 = await ctaInfo()
  vpReport.settledCta = win1
  vpReport.settledOverflow = await overflow()
  await page.screenshot({ path: `${OUT}/${vp.name}-06-settled-${win1.busted ? 'BUST' : 'WIN'}.png` })

  report[vp.name] = vpReport
}

report.consoleErrors = errors
fs.writeFileSync(`${OUT}/report-mobile.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
