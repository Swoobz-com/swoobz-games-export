import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5187/'
const OUT = process.argv[3] || 'shots-vrqa-mobile-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = [
  { name: 'mobile390', width: 390, height: 844 },
  { name: 'mobile412', width: 412, height: 915 },
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
// Mobile board is a deliberate PAN-ONLY large fixed-tile canvas
// (MOBILE_TILE_PX=46 * 32 = 1472px) inside a scrollable `overflow:auto`
// wrapper clamped to viewportBoxPx (260-420px) and centered on first
// mount (see AssayGridCanvas.tsx `dims`/`scrollRef`/`viewportBoxPx`).
// `document.querySelector('canvas')`'s own getBoundingClientRect() returns
// the FULL 1472x1472 intrinsic box (correctly, since it really is that
// big and is merely clipped+scrolled by its ancestor) — the WRAPPER
// (canvas.parentElement) is the actual visible viewport window, and tile
// screen-position must account for the wrapper's current scrollLeft/Top.
const mobileBoardInfo = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const wrap = c.parentElement
  const wr = wrap.getBoundingClientRect()
  const cr = c.getBoundingClientRect()
  return {
    canvasRect: { x: cr.x, y: cr.y, w: cr.width, h: cr.height },
    wrapperRect: { x: wr.x, y: wr.y, w: wr.width, h: wr.height },
    scrollLeft: wrap.scrollLeft,
    scrollTop: wrap.scrollTop,
  }
})
const canvasBox = mobileBoardInfo
const overflow = () => page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  scrollHeight: document.documentElement.scrollHeight,
  innerHeight: window.innerHeight,
}))
// Paint a short compact clump of `n` ADJACENT tiles entirely within the
// initially-centered visible window (no scrolling needed) — tile (col,row)
// screen coords = wrapperRect.xy + (col,row)*tile - (scrollLeft,scrollTop).
async function paintCompactClump(n, info) {
  const MOBILE_TILE_PX = 46
  const tile = MOBILE_TILE_PX
  const centerCol = Math.floor(info.scrollLeft / tile) + Math.floor(info.wrapperRect.w / tile / 2)
  const centerRow = Math.floor(info.scrollTop / tile) + Math.floor(info.wrapperRect.h / tile / 2)
  let count = 0
  const toScreen = (col, row) => ({
    x: info.wrapperRect.x + col * tile + tile / 2 - info.scrollLeft,
    y: info.wrapperRect.y + row * tile + tile / 2 - info.scrollTop,
  })
  outer: for (let rOff = -3; rOff < 6; rOff++) {
    for (let cOff = -6; cOff < 6; cOff++) {
      if (count >= n) break outer
      const col = centerCol + cOff
      const row = centerRow + rOff
      if (col < 0 || col >= 32 || row < 0 || row >= 32) continue
      const pt = toScreen(col, row)
      if (pt.x < info.wrapperRect.x + 2 || pt.x > info.wrapperRect.x + info.wrapperRect.w - 2) continue
      if (pt.y < info.wrapperRect.y + 2 || pt.y > info.wrapperRect.y + info.wrapperRect.h - 2) continue
      await page.touchscreen.tap(pt.x, pt.y)
      count++
      await wait(12)
    }
  }
  return count
}

const report = {}
for (const vp of VIEWPORTS) {
  const vpReport = {}
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(500)
  vpReport.lobbyOverflow = await overflow()
  const lobbyWordmark = await page.evaluate(() => document.querySelectorAll('img[alt="THE ASSAY LINE"]').length)
  vpReport.lobbyWordmarkCount = lobbyWordmark
  const backdropPresent = await page.evaluate(() => [...document.querySelectorAll('div')].some((d) => getComputedStyle(d).backgroundImage.includes('backdrop')))
  vpReport.backdropPresent = backdropPresent
  await page.screenshot({ path: `${OUT}/${vp.name}-01-lobby.png` })

  await clickText('ENTER THE ASSAY LINE')
  await wait(500)
  vpReport.planningOverflow = await overflow()
  const board = await canvasBox()
  vpReport.boardRect = board
  await page.screenshot({ path: `${OUT}/${vp.name}-02-planning.png` })

  const painted9 = await paintCompactClump(9, board)
  vpReport.painted9 = painted9
  await wait(300)
  vpReport.trailOverflow = await overflow()
  await page.screenshot({ path: `${OUT}/${vp.name}-03-trail.png` })

  await clickText('THROW BREAKER')
  await wait(500)
  await page.screenshot({ path: `${OUT}/${vp.name}-04-assaying.png` })
  await wait(2800)

  const settledInfo = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const cta = btns.find((b) => b.textContent && b.textContent.includes('ASSAY AGAIN'))
    const outcome = document.body.innerText.includes('BUSTED') ? 'BUST' : 'WIN'
    if (!cta) return { found: false, outcome }
    const r = cta.getBoundingClientRect()
    return { found: true, outcome, rect: { top: r.top, bottom: r.bottom }, viewportOverlapsCanvas: false }
  })
  vpReport.settledInfo1 = settledInfo
  vpReport.settledOverflow = await overflow()
  await page.screenshot({ path: `${OUT}/${vp.name}-05-settled-${settledInfo.outcome}.png` })

  // Bust attempt on mobile
  let bustReport = { attempts: 0, found: false }
  for (let attempt = 0; attempt < 4 && !bustReport.found; attempt++) {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(400)
    await clickText('ENTER THE ASSAY LINE')
    await wait(400)
    const b2 = await canvasBox()
    const painted38 = await paintCompactClump(38, b2)
    vpReport['painted38_attempt' + (attempt + 1)] = painted38
    await wait(200)
    await clickText('THROW BREAKER')
    await wait(3800)
    const info = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')]
      const cta = btns.find((b) => b.textContent && b.textContent.includes('ASSAY AGAIN'))
      const busted = document.body.innerText.includes('BUSTED')
      if (!cta) return { found: false, busted }
      const r = cta.getBoundingClientRect()
      return { found: true, busted, rect: { top: r.top, bottom: r.bottom } }
    })
    bustReport = { attempts: attempt + 1, ...info }
  }
  vpReport.bustAttemptReport = bustReport
  vpReport.settledBustOverflow = await overflow()
  await page.screenshot({ path: `${OUT}/${vp.name}-06-settled-BUST.png`, fullPage: false })

  report[vp.name] = vpReport
}
report.consoleErrors = errors
fs.writeFileSync(`${OUT}/report-mobile.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
