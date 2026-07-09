import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const OUT = path.resolve('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-visreg-0704')
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const report = {}
const allErrors = []

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
  if (!c) return null
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})

// 3x3 grid variance probe over a given rect (viewport coords), excluding HUD.
const scenicVariance = (page, rect) => page.evaluate((rect) => {
  // Sample the page itself (composited), not just canvas — the backdrop is
  // a CSS background-image behind the DOM, so we need html2canvas-less
  // approach: read via a temp canvas drawWindow is not available in headless
  // chrome without extra flags, so instead sample getComputedStyle background
  // at those points + also read canvas pixel content directly for the board.
  return null
}, rect)

// Direct canvas pixel sampler (for the 10x10 board + backdrop-adjacent margins
// drawn to <canvas>). Falls back gracefully if no canvas found.
const sampleCanvasGrid = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return { ok: false, reason: 'no-canvas' }
  const ctx = c.getContext('2d')
  const w = c.width, h = c.height
  const pts = []
  for (let ry = 0; ry < 3; ry++) {
    for (let rx = 0; rx < 3; rx++) {
      const x = Math.floor((rx + 0.5) * (w / 3))
      const y = Math.floor((ry + 0.5) * (h / 3))
      const d = ctx.getImageData(Math.max(0, Math.min(w - 1, x)), Math.max(0, Math.min(h - 1, y)), 1, 1).data
      pts.push({ x, y, rgb: [d[0], d[1], d[2]] })
    }
  }
  return { ok: true, w, h, pts }
})

// Backdrop margin sampler: sample the PAGE (outside the counter-card/canvas
// bounding box) at fixed offsets from left/right edges to confirm the vault
// backdrop image (gold bullion stacks) is visible there, not clipped/solid.
const marginSamples = (page) => page.evaluate(() => {
  // Use a hidden temp <canvas> + drawImage of a screenshot is not possible
  // purely in-page; instead read computed background presence + take actual
  // pixel via document.elementFromPoint + getComputedStyle chain to confirm
  // the backdrop div is the visible element at those points (not opaque
  // covered by another div).
  function elementAt(x, y) {
    const el = document.elementFromPoint(x, y)
    if (!el) return null
    const cs = getComputedStyle(el)
    return {
      tag: el.tagName,
      cls: el.className && typeof el.className === 'string' ? el.className.slice(0, 60) : '',
      bg: cs.backgroundImage !== 'none' ? cs.backgroundImage.slice(0, 80) : null,
      bgColor: cs.backgroundColor,
    }
  }
  const w = window.innerWidth, h = window.innerHeight
  return {
    leftMargin: elementAt(Math.floor(w * 0.03), Math.floor(h * 0.5)),
    rightMargin: elementAt(Math.floor(w * 0.97), Math.floor(h * 0.5)),
    topCenter: elementAt(Math.floor(w * 0.5), Math.floor(h * 0.06)),
  }
})

const overlapCheck = (page) => page.evaluate(() => {
  const canvas = document.querySelector('canvas')
  if (!canvas) return { ok: false, reason: 'no-canvas' }
  const boardRect = canvas.getBoundingClientRect()
  // Candidate chrome panels: any element whose text mentions VAULT FLOOR,
  // TRAIL, YOUR BET, or is a RailRow/RailShell-style card. We heuristically
  // grab elements with role button ancestry or headings, then check AABB
  // overlap against the board's rect.
  const candidates = [...document.querySelectorAll('div,section,aside')].filter((el) => {
    const t = (el.textContent || '')
    return /VAULT FLOOR|YOUR BET|TRAIL|Lean Floor|Standard Floor|Flooded Floor/.test(t) && el.children.length > 0
  })
  const overlaps = []
  for (const el of candidates) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    const overlapX = Math.max(0, Math.min(r.right, boardRect.right) - Math.max(r.left, boardRect.left))
    const overlapY = Math.max(0, Math.min(r.bottom, boardRect.bottom) - Math.max(r.top, boardRect.top))
    if (overlapX > 2 && overlapY > 2) {
      overlaps.push({
        text: (el.textContent || '').slice(0, 40),
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        overlapPx: { x: overlapX, y: overlapY },
      })
    }
  }
  return { ok: true, boardRect: { x: boardRect.x, y: boardRect.y, w: boardRect.width, h: boardRect.height }, overlaps }
})

const tierCardText = (page) => page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  return btns
    .filter((b) => /Floor/.test(b.textContent || ''))
    .map((b) => {
      const r = b.getBoundingClientRect()
      const spans = [...b.querySelectorAll('span')]
      const multSpan = spans.find((s) => /up to/.test(s.textContent || ''))
      const multRect = multSpan ? multSpan.getBoundingClientRect() : null
      return {
        text: b.textContent,
        rectW: r.width,
        multText: multSpan ? multSpan.textContent : null,
        multScrollWidth: multSpan ? multSpan.scrollWidth : null,
        multClientWidth: multRect ? multRect.width : null,
        clipped: multSpan ? multSpan.scrollWidth > multSpan.clientWidth + 1 : null,
      }
    })
})

// Mobile-safe paint: the <canvas> DOM element is the FULL 460x460 board
// (fixed-size), but only a smaller scrollable VIEWPORT WINDOW is visible on
// screen (see AssayGridCanvas.tsx MOBILE_VIEWPORT_MIN/MAX_PX). canvas.
// getBoundingClientRect() reflects the full element's position, which is
// mostly scrolled OFF-screen — clicking at raw board-relative col/row 0
// lands on negative/out-of-viewport coordinates and mis-fires as a text-drag
// selection instead of a canvas pointerdown. This helper derives on-SCREEN
// tile centers from the scrollable wrapper's visible rect + current scroll
// offset instead, so every synthetic click lands on an actually-visible tile.
async function paintTrailMobile(page, n) {
  const wrapInfo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    let el = c ? c.parentElement : null
    while (el) {
      const cs = getComputedStyle(el)
      if ((cs.overflow === 'auto' || cs.overflow === 'scroll' || cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth) break
      el = el.parentElement
    }
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      scrollLeft: el.scrollLeft, scrollTop: el.scrollTop,
      scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
    }
  })
  if (!wrapInfo) throw new Error('paintTrailMobile: scrollable wrapper not found')
  const tile = wrapInfo.scrollWidth / 10
  const colStart = Math.ceil(wrapInfo.scrollLeft / tile)
  const rowStart = Math.ceil(wrapInfo.scrollTop / tile)
  const colsVisible = Math.max(1, Math.floor(wrapInfo.clientWidth / tile) - 1) // stay clear of the trailing edge
  const screenX = (col) => wrapInfo.rect.x - wrapInfo.scrollLeft + col * tile + tile / 2
  const screenY = (row) => wrapInfo.rect.y - wrapInfo.scrollTop + row * tile + tile / 2
  // Mobile requires a genuine TAP (pointerdown->pointerup near the SAME spot,
  // under TAP_MOVE_THRESHOLD_PX — see AssayGridCanvas.tsx onPointerUpMobile);
  // a continuous drag is deliberately treated as a native pan/scroll gesture
  // and ignored for painting. So: discrete tap per tile, not one drag.
  for (let i = 0; i < n; i++) {
    const col = colStart + (i % colsVisible)
    const row = rowStart + Math.floor(i / colsVisible)
    const x = screenX(col)
    const y = screenY(row)
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.up()
    await wait(30)
  }
  return { wrapInfo, tile, colStart, rowStart, colsVisible }
}

async function paintTrail(page, box, n) {
  const tile = box.w / 10
  await page.mouse.move(box.x + tile * 0.5, box.y + tile * 0.5)
  await page.mouse.down()
  for (let i = 0; i < n; i++) {
    const col = i % 10
    const row = Math.floor(i / 10)
    const cx = box.x + tile * (col + 0.5)
    const cy = box.y + tile * (row + 0.5)
    await page.mouse.move(cx, cy, { steps: 2 })
    await wait(15)
  }
  await page.mouse.up()
}

async function runDesktop(vp, label) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: vp })
  const page = (await browser.pages())[0]
  const errors = []
  page.on('pageerror', (e) => errors.push(`${label} PAGEERROR: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${label} CONSOLE.ERROR: ${m.text()}`) })

  const vr = {}

  // ---- LOBBY ----
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(500)
  await page.screenshot({ path: `${OUT}/${label}-01-lobby.png` })
  vr.lobbyMargins = await marginSamples(page)

  // ---- PLANNING / TIER SELECT ----
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  await page.screenshot({ path: `${OUT}/${label}-02-planning.png` })
  vr.overlapPlanning = await overlapCheck(page)
  vr.tierCardsBefore = await tierCardText(page)

  const board = await canvasBox(page)
  vr.boardRect = board
  vr.canvasScenic = await sampleCanvasGrid(page)

  await clickText(page, 'Flooded Floor')
  await wait(300)
  await page.screenshot({ path: `${OUT}/${label}-03-tier-flooded.png` })
  vr.tierCardsAfterFlooded = await tierCardText(page)
  vr.overlapTierSelect = await overlapCheck(page)

  await clickText(page, 'Standard Floor')
  await wait(200)
  await page.screenshot({ path: `${OUT}/${label}-03b-tier-standard.png` })

  await clickText(page, 'Lean Floor')
  await wait(200)
  await page.screenshot({ path: `${OUT}/${label}-03c-tier-lean.png` })

  // back to flooded for the actual paint/plunge sequence
  await clickText(page, 'Flooded Floor')
  await wait(200)

  // ---- PAINTED (claim-line, ABOVE MIN_TRAIL=8 so THROW BREAKER actually arms) ----
  const board2 = await canvasBox(page)
  await paintTrail(page, board2, 12)
  await wait(250)
  await page.screenshot({ path: `${OUT}/${label}-04-painted.png` })
  vr.overlapPainted = await overlapCheck(page)
  vr.paintedArmedText = await page.evaluate(() => document.body.innerText.match(/Select \d+ more nubs.*|potential [\d.]+x?/i)?.[0] || null)

  // ---- PLUNGE -> ASSAYING (mid-cascade) -> SETTLED ----
  await clickText(page, 'THROW BREAKER')
  await wait(900)
  await page.screenshot({ path: `${OUT}/${label}-05-assaying-active.png` })
  await wait(3000)
  await page.screenshot({ path: `${OUT}/${label}-06-settled.png` })
  vr.overlapSettled = await overlapCheck(page)
  const bodyText1 = await page.evaluate(() => document.body.innerText)
  vr.settled1HasAssayAgain = /ASSAY AGAIN/.test(bodyText1)
  vr.settled1Won = /CLAIM PROVEN/.test(bodyText1)
  vr.settled1Busted = /BAD VEIN\s*\W*\s*BUSTED/i.test(bodyText1)

  await browser.close()
  vr.consoleErrors = errors
  allErrors.push(...errors)
  return vr
}

async function runNarrowOverlap(width, height, label) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width, height, deviceScaleFactor: 1 } })
  const page = (await browser.pages())[0]
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  await page.screenshot({ path: `${OUT}/narrow-${label}-02-planning.png` })
  const overlapPlanning = await overlapCheck(page)
  const board = await canvasBox(page)
  await paintTrail(page, board, 5)
  await wait(250)
  await page.screenshot({ path: `${OUT}/narrow-${label}-04-painted.png` })
  const overlapPainted = await overlapCheck(page)
  const isWide = await page.evaluate(() => window.innerWidth >= 1080)
  await browser.close()
  return { width, height, isWide, overlapPlanning, overlapPainted }
}

async function runMobilePan() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true } })
  const page = (await browser.pages())[0]
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)

  const info = {}
  const scrollInfo = () => page.evaluate(() => {
    // find the scrollable wrapper: an element that is the parent of <canvas>
    // with overflow scroll/auto and scrollWidth > clientWidth
    const c = document.querySelector('canvas')
    let el = c ? c.parentElement : null
    while (el) {
      const cs = getComputedStyle(el)
      if ((cs.overflow === 'auto' || cs.overflow === 'scroll' || cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth) break
      el = el.parentElement
    }
    if (!el) return null
    return {
      scrollLeft: el.scrollLeft, scrollTop: el.scrollTop,
      scrollWidth: el.scrollWidth, scrollHeight: el.scrollHeight,
      clientWidth: el.clientWidth, clientHeight: el.clientHeight,
      maxScrollLeft: el.scrollWidth - el.clientWidth,
      maxScrollTop: el.scrollHeight - el.clientHeight,
    }
  })

  // INITIAL (centered)
  await page.screenshot({ path: `${OUT}/mobile-pan-00-initial.png` })
  info.initial = await scrollInfo()

  const setScroll = (left, top) => page.evaluate((left, top) => {
    const c = document.querySelector('canvas')
    let el = c ? c.parentElement : null
    while (el) {
      const cs = getComputedStyle(el)
      if ((cs.overflow === 'auto' || cs.overflow === 'scroll' || cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth) break
      el = el.parentElement
    }
    if (!el) return false
    el.scrollLeft = left
    el.scrollTop = top
    return true
  }, left, top)

  if (info.initial) {
    const { maxScrollLeft, maxScrollTop } = info.initial
    const corners = [
      ['top-left', 0, 0],
      ['top-right', maxScrollLeft, 0],
      ['bottom-left', 0, maxScrollTop],
      ['bottom-right', maxScrollLeft, maxScrollTop],
    ]
    for (const [name, left, top] of corners) {
      await setScroll(left, top)
      await wait(150)
      await page.screenshot({ path: `${OUT}/mobile-pan-${name}.png` })
    }
    info.corners = corners.map(([name]) => name)
  }

  await browser.close()
  return info
}

async function main() {
  report['1440x900'] = await runDesktop({ width: 1440, height: 900, deviceScaleFactor: 1 }, '1440x900')
  report['1920x1080'] = await runDesktop({ width: 1920, height: 1080, deviceScaleFactor: 1 }, '1920x1080')
  report['narrow-1024x768'] = await runNarrowOverlap(1024, 768, '1024x768')
  report['mobilePan'] = await runMobilePan()

  // Pixel7 mobile full phase set
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true } })
  const page = (await browser.pages())[0]
  const errors = []
  page.on('pageerror', (e) => errors.push(`pixel7 PAGEERROR: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`pixel7 CONSOLE.ERROR: ${m.text()}`) })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(500)
  await page.screenshot({ path: `${OUT}/pixel7-01-lobby.png` })
  const mobileVR = {}
  mobileVR.lobbyMargins = await marginSamples(page)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  await page.screenshot({ path: `${OUT}/pixel7-02-planning.png` })
  mobileVR.tierCardsBefore = await tierCardText(page)
  await clickText(page, 'Flooded Floor')
  await wait(300)
  await page.screenshot({ path: `${OUT}/pixel7-03-tier-flooded.png` })
  mobileVR.tierCardsAfterFlooded = await tierCardText(page)
  mobileVR.canvasScenic = await sampleCanvasGrid(page)
  mobileVR.paintDebug = await paintTrailMobile(page, 12)
  await wait(250)
  await page.screenshot({ path: `${OUT}/pixel7-04-painted.png` })
  await clickText(page, 'THROW BREAKER')
  await wait(900)
  await page.screenshot({ path: `${OUT}/pixel7-05-assaying-active.png` })
  await wait(3000)
  await page.screenshot({ path: `${OUT}/pixel7-06-settled.png` })
  const bodyTextM = await page.evaluate(() => document.body.innerText)
  mobileVR.settledHasAssayAgain = /ASSAY AGAIN/.test(bodyTextM)
  mobileVR.settledWon = /CLAIM PROVEN/.test(bodyTextM)
  mobileVR.settledBusted = /BAD VEIN\s*\W*\s*BUSTED/i.test(bodyTextM)
  mobileVR.consoleErrors = errors
  await browser.close()
  report.pixel7 = mobileVR
  allErrors.push(...errors)

  // Force a BUST outcome (desktop 1440) for settled-bust baseline — Flooded
  // tier, long trail (30 tiles, 8 bad veins/100) for high bust odds.
  const browser2 = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 } })
  const page2 = (await browser2.pages())[0]
  let bustFound = false
  for (let attempt = 0; attempt < 8 && !bustFound; attempt++) {
    await page2.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
    await wait(400)
    await clickText(page2, 'ENTER THE ASSAY LINE')
    await wait(300)
    await clickText(page2, 'Flooded Floor')
    await wait(200)
    const b = await canvasBox(page2)
    await paintTrail(page2, b, 30)
    await wait(200)
    await clickText(page2, 'THROW BREAKER')
    await wait(4200)
    const bodyText = await page2.evaluate(() => document.body.innerText)
    bustFound = /BAD VEIN\s*\W*\s*BUSTED/i.test(bodyText)
    if (bustFound) {
      await page2.screenshot({ path: `${OUT}/1440x900-07-settled-BUST.png` })
    }
  }
  report.bustCapture = { found: bustFound }
  await browser2.close()

  // Force a WIN outcome (desktop 1440) for settled-win baseline — Lean tier
  // (only 3 bad veins/100), short MIN_TRAIL=8-length line for best odds.
  const browser3 = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 } })
  const page3 = (await browser3.pages())[0]
  let winFound = false
  for (let attempt = 0; attempt < 12 && !winFound; attempt++) {
    await page3.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
    await wait(400)
    await clickText(page3, 'ENTER THE ASSAY LINE')
    await wait(300)
    await clickText(page3, 'Lean Floor')
    await wait(200)
    const b = await canvasBox(page3)
    await paintTrail(page3, b, 8)
    await wait(200)
    await clickText(page3, 'THROW BREAKER')
    await wait(3200)
    const bodyText = await page3.evaluate(() => document.body.innerText)
    winFound = /CLAIM PROVEN/.test(bodyText)
    if (winFound) {
      await page3.screenshot({ path: `${OUT}/1440x900-08-settled-WIN.png` })
      const gbOpened = await clickText(page3, 'GLASS BOX')
      await wait(350)
      await page3.screenshot({ path: `${OUT}/1440x900-09-settled-WIN-glassbox-open.png` })
      report.glassBoxOpened = gbOpened
    }
  }
  report.winCapture = { found: winFound }
  await browser3.close()

  report.allConsoleErrors = allErrors
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
  console.log('DONE')
  console.log(JSON.stringify(report, null, 2))
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
