import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'shots-FINAL-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const DESKTOP_VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900, mobile: false },
  { name: '1920x1080', width: 1920, height: 1080, mobile: false },
]
const MOBILE_VIEWPORTS = [
  { name: 'pixel7-412x915', width: 412, height: 915, mobile: true },
  { name: 'iphone14pro-393x852', width: 393, height: 852, mobile: true },
]

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })

const clickByTextOrAria = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return (
      btns.find((b) => b.textContent && b.textContent.includes(t)) ||
      btns.find((b) => (b.getAttribute('aria-label') || '').includes(t)) ||
      null
    )
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

const canvasBox = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})

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
    wrapRect: wrapRect ? { x: wrapRect.x, y: wrapRect.y, w: wrapRect.width, h: wrapRect.height } : null,
    scrollLeft: wrap ? wrap.scrollLeft : null,
    scrollTop: wrap ? wrap.scrollTop : null,
    scrollableW: wrap ? wrap.scrollWidth : null,
    scrollableH: wrap ? wrap.scrollHeight : null,
  }
})

// bounding boxes for the elements we need to overlap-check on every phase.
const overlapProbe = () => page.evaluate(() => {
  const rectOf = (el) => (el ? (() => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom } })() : null)
  const btns = [...document.querySelectorAll('button')]
  const safetyBtn = btns.find((b) => (b.getAttribute('aria-label') || '').includes('Play safe'))
  const cta = btns.find((b) => b.textContent && (b.textContent.includes('RUN THE LINE') || b.textContent.includes('LINE RUNNING') || b.textContent.includes('ENTER THE ASSAY LINE') || b.textContent.includes('ASSAY AGAIN')))
  const coachmark = document.querySelector('[role="note"][aria-label="How to play"]')
  const canvas = document.querySelector('canvas')
  const boardEl = canvas ? (canvas.parentElement || canvas) : null
  return {
    safety: rectOf(safetyBtn),
    cta: rectOf(cta),
    ctaLabel: cta ? cta.textContent : null,
    coachmark: rectOf(coachmark),
    board: rectOf(boardEl),
  }
})

function intersects(a, b) {
  if (!a || !b) return false
  const ix = Math.max(0, Math.min(a.right ?? a.x + a.w, b.right ?? b.x + b.w) - Math.max(a.x, b.x))
  const iy = Math.max(0, Math.min(a.bottom ?? a.y + a.h, b.bottom ?? b.y + b.h) - Math.max(a.y, b.y))
  return ix > 0 && iy > 0 ? { overlapW: +ix.toFixed(1), overlapH: +iy.toFixed(1) } : false
}

const glassBoxCheck = () => page.evaluate(() => {
  const all = [...document.querySelectorAll('div')]
  const cert = all.find((d) => d.textContent && d.textContent.includes('GLASS BOX CERTIFICATE'))
  if (!cert) return { found: false }
  // find the closest ancestor with the GAUGE_WINDOW box styling (the bordered strip) — use cert itself as container
  const r = cert.getBoundingClientRect()
  const scrollW = cert.scrollWidth
  const clientW = cert.clientWidth
  const computed = getComputedStyle(cert)
  // Also inspect the direct line containing the tier label / bomb count text.
  const firstLineDiv = cert.querySelector('div')
  const lineText = firstLineDiv ? firstLineDiv.textContent : cert.textContent
  const lineRect = firstLineDiv ? firstLineDiv.getBoundingClientRect() : r
  return {
    found: true,
    text: cert.textContent,
    lineText,
    containerRect: { x: r.x, y: r.y, w: r.width, h: r.height },
    lineRect: { x: lineRect.x, y: lineRect.y, w: lineRect.width, h: lineRect.height, right: lineRect.right },
    scrollWidth: scrollW,
    clientWidth: clientW,
    overflowsHorizontally: scrollW > clientW + 1,
    wordBreak: computed.wordBreak,
    viewportWidth: window.innerWidth,
    lineRightExceedsViewport: lineRect.right > window.innerWidth,
  }
})

const ctaInfo = () => page.evaluate((vh) => {
  const btns = [...document.querySelectorAll('button')]
  const cta = btns.find((b) => b.textContent && b.textContent.includes('ASSAY AGAIN'))
  const busted = document.body.innerText.includes('BUSTED')
  if (!cta) return { found: false, busted }
  const r = cta.getBoundingClientRect()
  return { found: true, busted, top: r.top, bottom: r.bottom, aboveFoldPx: Math.max(0, r.bottom - vh) }
}, 0)

const selectHeavyFloor = async () => {
  await clickByTextOrAria('Heavy Floor')
  await wait(150)
}

let storageCleared = false
async function freshLoad(page) {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  if (!storageCleared) {
    await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
    storageCleared = true
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  }
  await wait(900)
}

async function paintDesktopTrail(box, n) {
  const tile = box.w / 10
  let count = 0
  for (let row = 2; row < 10 && count < n; row++) {
    for (let col = 2; col < 10 && count < n; col++) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      count++
      await wait(15)
    }
  }
  return count
}

async function paintMobileTrail(info, n) {
  const TILE = 46
  const startCol = Math.max(0, Math.floor(info.scrollLeft / TILE) + 1)
  const startRow = Math.max(0, Math.floor(info.scrollTop / TILE) + 1)
  const wrapScreen = { x: info.wrapRect.x, y: info.wrapRect.y }
  let count = 0
  for (let row = startRow; row < startRow + 4 && count < n; row++) {
    for (let col = startCol; col < startCol + 4 && count < n; col++) {
      const localX = col * TILE + TILE / 2 - info.scrollLeft
      const localY = row * TILE + TILE / 2 - info.scrollTop
      const x = wrapScreen.x + localX
      const y = wrapScreen.y + localY
      if (x < info.wrapRect.x || x > info.wrapRect.x + info.wrapRect.w || y < info.wrapRect.y || y > info.wrapRect.y + info.wrapRect.h) continue
      await page.touchscreen.tap(x, y)
      count++
      await wait(80)
    }
  }
  return count
}

const report = {}

// ───────────────────────────── DESKTOP ─────────────────────────────
for (const vp of DESKTOP_VIEWPORTS) {
  const vpReport = {}
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 })
  storageCleared = false

  await freshLoad(page)
  vpReport.lobbyOverflow = await overflow()
  await page.screenshot({ path: `${OUT}/${vp.name}-01-lobby.png` })

  await clickByTextOrAria('ENTER THE ASSAY LINE')
  await wait(400)
  await selectHeavyFloor()
  const board = await canvasBox()
  vpReport.boardRect = board
  vpReport.tilePxAt10x10 = board ? +(board.w / 10).toFixed(2) : null
  vpReport.planningOverflow = await overflow()
  vpReport.planningOverlap = await overlapProbe()
  await page.screenshot({ path: `${OUT}/${vp.name}-02-planning.png` })

  // ---- WIN attempt: short trail (8 tiles, MIN_TRAIL) ----
  await paintDesktopTrail(board, 8)
  await wait(200)
  await page.screenshot({ path: `${OUT}/${vp.name}-03-trail-painted.png` })
  await clickByTextOrAria('RUN THE LINE')
  await wait(350)
  vpReport.assayingEarlyOverlap = await overlapProbe()
  await page.screenshot({ path: `${OUT}/${vp.name}-04-assaying-early.png` })
  await wait(700)
  await page.screenshot({ path: `${OUT}/${vp.name}-05-assaying-mid.png` })
  await wait(1800)

  const win1 = await ctaInfo()
  vpReport.settledWinAttempt = win1
  vpReport.settledOverlap = await overlapProbe()
  vpReport.settledOverflow = await overflow()
  vpReport.glassBoxWinAttempt = await glassBoxCheck()
  await page.screenshot({ path: `${OUT}/${vp.name}-06-settled-${win1.busted ? 'BUST' : 'WIN'}.png` })

  // ---- Force a BUST for the settled-BUST capture (retry loop, long trail across all 100 tiles w/ 8 bombs) ----
  let bustReport = { attempts: 0, found: false }
  for (let attempt = 0; attempt < 8 && !bustReport.busted; attempt++) {
    await freshLoad(page)
    await clickByTextOrAria('ENTER THE ASSAY LINE')
    await wait(300)
    await selectHeavyFloor()
    const b2 = await canvasBox()
    await paintDesktopTrail(b2, 40)
    await wait(200)
    await clickByTextOrAria('RUN THE LINE')
    await wait(4500)
    const info = await ctaInfo()
    bustReport = { attempts: attempt + 1, ...info }
  }
  vpReport.settledBustAttempt = bustReport
  vpReport.settledBustOverlap = await overlapProbe()
  vpReport.glassBoxBustAttempt = await glassBoxCheck()
  await page.screenshot({ path: `${OUT}/${vp.name}-07-settled-BUST.png` })

  report[vp.name] = vpReport
}

// ───────────────────────────── MOBILE ─────────────────────────────
for (const vp of MOBILE_VIEWPORTS) {
  const vpReport = {}
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  storageCleared = false

  await freshLoad(page)
  vpReport.lobbyOverflow = await overflow()
  await page.screenshot({ path: `${OUT}/${vp.name}-01-lobby.png` })

  await clickByTextOrAria('ENTER THE ASSAY LINE')
  await wait(400)
  await selectHeavyFloor()
  vpReport.planningOverflow = await overflow()
  const mbInfo = await mobileBoardInfo()
  vpReport.mobileBoardInfo = mbInfo
  vpReport.planningOverlap = await overlapProbe()
  await page.screenshot({ path: `${OUT}/${vp.name}-02-planning-coachmark.png` })

  // paint an 8+ tile trail within the visible pan window
  const painted = await paintMobileTrail(mbInfo, 9)
  vpReport.tilesPaintedInViewport = painted
  await wait(200)
  await page.screenshot({ path: `${OUT}/${vp.name}-03-trail-painted.png` })

  await clickByTextOrAria('RUN THE LINE')
  await wait(500)
  vpReport.assayingEarlyOverlap = await overlapProbe()
  await page.screenshot({ path: `${OUT}/${vp.name}-04-assaying-early.png` })
  await wait(1200)
  await page.screenshot({ path: `${OUT}/${vp.name}-05-assaying-mid.png` })
  await wait(2200)

  const win1 = await ctaInfo()
  vpReport.settledWinAttempt = win1
  vpReport.settledOverlap = await overlapProbe()
  vpReport.settledOverflow = await overflow()
  vpReport.glassBoxWinAttempt = await glassBoxCheck()
  await page.screenshot({ path: `${OUT}/${vp.name}-06-settled-${win1.busted ? 'BUST' : 'WIN'}.png` })

  // force a BUST
  let bustReport = { attempts: 0, found: false }
  for (let attempt = 0; attempt < 8 && !bustReport.busted; attempt++) {
    await freshLoad(page)
    await clickByTextOrAria('ENTER THE ASSAY LINE')
    await wait(300)
    await selectHeavyFloor()
    const mb2 = await mobileBoardInfo()
    // paint as many distinct tiles as reachable without panning, repeated across a bigger sweep by shifting start row/col a few times
    let total = 0
    for (let shift = 0; shift < 3 && total < 30; shift++) {
      const shifted = { ...mb2, scrollLeft: mb2.scrollLeft - shift * 40, scrollTop: mb2.scrollTop - shift * 40 }
      total += await paintMobileTrail(shifted, 16)
    }
    await wait(200)
    await clickByTextOrAria('RUN THE LINE')
    await wait(4800)
    const info = await ctaInfo()
    bustReport = { attempts: attempt + 1, ...info, tilesPainted: total }
  }
  vpReport.settledBustAttempt = bustReport
  vpReport.settledBustOverlap = await overlapProbe()
  vpReport.glassBoxBustAttempt = await glassBoxCheck()
  await page.screenshot({ path: `${OUT}/${vp.name}-07-settled-BUST.png` })

  report[vp.name] = vpReport
}

// compute intersects on collected overlap probes
function annotateIntersects(vpReport) {
  const out = {}
  for (const key of Object.keys(vpReport)) {
    if (key.toLowerCase().includes('overlap') && vpReport[key] && typeof vpReport[key] === 'object' && 'safety' in vpReport[key]) {
      const p = vpReport[key]
      out[key] = {
        safetyVsBoard: intersects(p.safety, p.board),
        safetyVsCta: intersects(p.safety, p.cta),
        coachmarkVsCta: intersects(p.coachmark, p.cta),
        coachmarkVsBoard: intersects(p.coachmark, p.board),
        safetyVsCoachmark: intersects(p.safety, p.coachmark),
      }
    }
  }
  return out
}
for (const vpName of Object.keys(report)) {
  report[vpName].intersections = annotateIntersects(report[vpName])
}

report.consoleErrors = errors
fs.writeFileSync(`${OUT}/report-final-holdgate.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
