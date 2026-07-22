import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = path.resolve('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-aztec-visreg-0704')
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

const dismissCoachmark = async (page) => {
  const handle = await page.evaluateHandle(() => {
    return document.querySelector('button[aria-label="Dismiss how-to-play tip"]')
  })
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

// 3x3 grid canvas-pixel variance probe (scenic backdrop guard)
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
  // per-channel variance across the 9 samples
  const chans = [0, 1, 2].map((c2) => pts.map((p) => p.rgb[c2]))
  const variance = (arr) => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length
    return arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length
  }
  const varR = variance(chans[0]), varG = variance(chans[1]), varB = variance(chans[2])
  const maxVar = Math.max(varR, varG, varB)
  return { ok: true, w, h, pts, varR, varG, varB, maxVar }
})

// Doubloon-tile presence: sample dormant tile centers to confirm gold hue
// (not flat dark void) — reads a handful of tile centers in the visible
// board area.
const sampleDoubloonHue = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return { ok: false }
  const ctx = c.getContext('2d')
  const w = c.width, h = c.height
  // sample a 4x4 grid of points across the board, biased away from edges
  const pts = []
  for (let ry = 1; ry < 5; ry++) {
    for (let rx = 1; rx < 5; rx++) {
      const x = Math.floor((rx / 5) * w)
      const y = Math.floor((ry / 5) * h)
      const d = ctx.getImageData(x, y, 1, 1).data
      pts.push([d[0], d[1], d[2]])
    }
  }
  // gold-ish: R and G both notably higher than B, R>=G roughly
  const goldish = pts.filter(([r, g, b]) => r > 90 && r >= b + 20 && g >= b + 5)
  return { ok: true, total: pts.length, goldish: goldish.length, samples: pts }
})

// Banding detector: sample several horizontal scanlines in the upper-left
// hotspot region of bgGrad (0.28w, 0.22h) and look for large flat plateaus
// followed by abrupt jumps that repeat (the visible-ring signature) rather
// than a smooth 1-3-unit-per-pixel ramp.
const bandingProbe = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return { ok: false }
  const ctx = c.getContext('2d')
  const w = c.width, h = c.height
  const rows = [Math.floor(h * 0.05), Math.floor(h * 0.10), Math.floor(h * 0.22), Math.floor(h * 0.35), Math.floor(h * 0.55)]
  const out = {}
  for (const y of rows) {
    if (y < 0 || y >= h) continue
    const vals = []
    for (let x = 0; x < w; x += 2) {
      const d = ctx.getImageData(x, y, 1, 1).data
      vals.push([d[0], d[1], d[2]])
    }
    const plateaus = []
    let last = null
    let runLen = 0
    let maxRun = 0
    for (const v of vals) {
      if (last && v[0] === last[0] && v[1] === last[1] && v[2] === last[2]) {
        runLen++
      } else {
        if (last) plateaus.push({ v: last, runLen })
        maxRun = Math.max(maxRun, runLen)
        last = v
        runLen = 1
      }
    }
    if (last) plateaus.push({ v: last, runLen })
    maxRun = Math.max(maxRun, runLen)
    const deltas = []
    for (let i = 1; i < plateaus.length; i++) {
      const a = plateaus[i - 1].v, b = plateaus[i].v
      deltas.push(Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])))
    }
    // Banding signature: a long flat run (>=6 samples = >=12px at step 2)
    // immediately followed by a visible jump (delta >= 4). Count such events.
    let bandEvents = 0
    for (let i = 0; i < plateaus.length - 1; i++) {
      if (plateaus[i].runLen >= 6 && deltas[i] >= 4) bandEvents++
    }
    out['y' + y] = {
      numPlateaus: plateaus.length,
      sampleCount: vals.length,
      maxRun,
      maxDelta: deltas.length ? Math.max(...deltas) : 0,
      avgDelta: deltas.length ? +(deltas.reduce((a, b) => a + b, 0) / deltas.length).toFixed(2) : 0,
      bandEvents,
    }
  }
  return { ok: true, rows: out }
})

// DOM check for broken <img> tags + 404-style failed image src.
const brokenImageCheck = (page) => page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')]
  return imgs.map((img) => ({
    src: img.src,
    complete: img.complete,
    naturalWidth: img.naturalWidth,
    broken: img.complete && img.naturalWidth === 0,
  })).filter((i) => i.broken)
})

const overflowCheck = (page) => page.evaluate(() => {
  const doc = document.documentElement
  const bodyOverflowX = document.body.scrollWidth > window.innerWidth + 2
  // Check the SUN-STONE RECKONING cert row vs HallmarkSeal overlap
  const certRows = [...document.querySelectorAll('div')].filter((d) => (d.textContent || '').includes('SUN-STONE RECKONING'))
  let certOverlap = null
  if (certRows.length) {
    const certEl = certRows[certRows.length - 1]
    const certRect = certEl.getBoundingClientRect()
    // Measure the ACTUAL rendered text run's bounding box (not the padded
    // container div, which reserves right-side space for the seal by
    // design) via a Range over the element's own text node(s), so we test
    // real glyph pixels vs the seal, not the padding box.
    let textRect = certRect
    try {
      const range = document.createRange()
      range.selectNodeContents(certEl)
      const rects = [...range.getClientRects()]
      if (rects.length) {
        const left = Math.min(...rects.map((r) => r.left))
        const right = Math.max(...rects.map((r) => r.right))
        const top = Math.min(...rects.map((r) => r.top))
        const bottom = Math.max(...rects.map((r) => r.bottom))
        textRect = { left, right, top, bottom, x: left, y: top, width: right - left, height: bottom - top }
      }
    } catch {}
    // find sibling seal element (absolute positioned, likely nearby)
    const parent = certEl.closest('div[style*="position: relative"]') || certEl.parentElement?.parentElement
    let sealRect = null
    if (parent) {
      const svgs = parent.querySelectorAll('svg, canvas')
      if (svgs.length) sealRect = svgs[0].getBoundingClientRect()
    }
    if (sealRect) {
      const overlapX = Math.max(0, Math.min(certRect.right, sealRect.right) - Math.max(certRect.left, sealRect.left))
      const overlapY = Math.max(0, Math.min(certRect.bottom, sealRect.bottom) - Math.max(certRect.top, sealRect.top))
      const textOverlapX = Math.max(0, Math.min(textRect.right, sealRect.right) - Math.max(textRect.left, sealRect.left))
      const textOverlapY = Math.max(0, Math.min(textRect.bottom, sealRect.bottom) - Math.max(textRect.top, sealRect.top))
      certOverlap = {
        certRect: { x: certRect.x, y: certRect.y, w: certRect.width, h: certRect.height },
        textRect: { x: textRect.x, y: textRect.y, w: textRect.width, h: textRect.height },
        sealRect: { x: sealRect.x, y: sealRect.y, w: sealRect.width, h: sealRect.height },
        overlapX, overlapY, // padded-div overlap (expected/harmless by design)
        textOverlapX, textOverlapY, // REAL glyph-vs-seal overlap (the thing that actually matters)
      }
    }
  }
  return { bodyOverflowX, docScrollWidth: doc.scrollWidth, innerWidth: window.innerWidth, certOverlap }
})

const titleCheck = (page) => page.evaluate(() => document.title)

// Mobile-safe paint: the <canvas> DOM element may be the FULL board at a
// fixed size, with only a scrollable VIEWPORT WINDOW visible on screen.
// canvas.getBoundingClientRect() reflects the full element's position, most
// of which can be off-screen — clicking at raw board-relative col/row 0 can
// land on negative/out-of-viewport coordinates and mis-fire as a text-drag
// selection instead of a canvas pointerdown. This derives on-SCREEN tile
// centers from the scrollable wrapper's visible rect + current scroll
// offset instead, so synthetic taps land on an actually-visible tile.
async function paintTrailMobile(page, n) {
  const wrapInfo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    let el = c ? c.parentElement : null
    while (el) {
      const cs = getComputedStyle(el)
      if ((cs.overflow === 'auto' || cs.overflow === 'scroll' || cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth) break
      el = el.parentElement
    }
    if (!el) {
      // no scrollable wrapper found — fall back to the canvas's own onscreen rect
      const r = c ? c.getBoundingClientRect() : null
      if (!r) return null
      return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, scrollLeft: 0, scrollTop: 0, scrollWidth: r.width, clientWidth: r.width, noScroll: true }
    }
    const r = el.getBoundingClientRect()
    return {
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      scrollLeft: el.scrollLeft, scrollTop: el.scrollTop,
      scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
    }
  })
  if (!wrapInfo) return { ok: false, reason: 'no-wrapper-or-canvas' }
  const tile = wrapInfo.scrollWidth / 10
  const colStart = Math.ceil(wrapInfo.scrollLeft / tile)
  const rowStart = Math.ceil(wrapInfo.scrollTop / tile)
  const colsVisible = Math.max(1, Math.floor(wrapInfo.clientWidth / tile) - (wrapInfo.noScroll ? 0 : 1))
  const screenX = (col) => wrapInfo.rect.x - wrapInfo.scrollLeft + col * tile + tile / 2
  const screenY = (row) => wrapInfo.rect.y - wrapInfo.scrollTop + row * tile + tile / 2
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
  return { ok: true, wrapInfo, tile, colStart, rowStart, colsVisible }
}

async function runViewport(vp, label, opts = {}) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: vp })
  const page = (await browser.pages())[0]
  const errors = []
  const failedRequests = []
  page.on('pageerror', (e) => errors.push(`${label} PAGEERROR: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${label} CONSOLE.ERROR: ${m.text()}`) })
  page.on('requestfailed', (req) => failedRequests.push(`${label} REQFAILED: ${req.url()} ${req.failure()?.errorText}`))
  page.on('response', (res) => { if (res.status() >= 400) failedRequests.push(`${label} HTTP${res.status()}: ${res.url()}`) })

  const vr = { label, viewport: vp }

  // ---- LOBBY ----
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(600)
  vr.title = await titleCheck(page)
  await page.screenshot({ path: `${OUT}/${label}-01-lobby.png` })

  // ---- PLANNING ----
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  vr.coachmarkDismissed = await dismissCoachmark(page)
  await wait(150)
  await page.screenshot({ path: `${OUT}/${label}-02-planning.png` })
  vr.boardBox = await canvasBox(page)
  vr.scenic = await sampleCanvasGrid(page)
  vr.doubloonHue = await sampleDoubloonHue(page)
  vr.banding = await bandingProbe(page)
  vr.overflowPlanning = await overflowCheck(page)
  vr.brokenImagesPlanning = await brokenImageCheck(page)

  // exercise all 3 tiers for overflow/label check
  await clickText(page, 'Heavy Floor')
  await wait(250)
  await page.screenshot({ path: `${OUT}/${label}-03-tier-heavy.png` })
  vr.overflowHeavy = await overflowCheck(page)
  await clickText(page, 'Standard Floor')
  await wait(200)
  await clickText(page, 'Lean Floor')
  await wait(200)
  await clickText(page, 'Heavy Floor')
  await wait(200)

  // ---- PAINT trail (bet-entry-ish -> active) ----
  if (vp.isMobile) {
    vr.paintDebug = await paintTrailMobile(page, 14)
  } else {
    const board = await canvasBox(page)
    const tile = board.w / 10
    await page.mouse.move(board.x + tile * 0.5, board.y + tile * 0.5)
    await page.mouse.down()
    for (let i = 0; i < 14; i++) {
      const col = i % 10, row = Math.floor(i / 10)
      await page.mouse.move(board.x + tile * (col + 0.5), board.y + tile * (row + 0.5), { steps: 2 })
      await wait(15)
    }
    await page.mouse.up()
  }
  await wait(250)
  await page.screenshot({ path: `${OUT}/${label}-04-painted.png` })

  // ---- ASSAYING (active, mid-cascade) ----
  vr.runTheLineClicked = await clickText(page, 'RUN THE LINE')
  await wait(900)
  await page.screenshot({ path: `${OUT}/${label}-05-assaying-active.png` })
  vr.scenicActive = await sampleCanvasGrid(page)

  // ---- SETTLED ----
  await wait(3000)
  await page.screenshot({ path: `${OUT}/${label}-06-settled.png` })
  vr.overflowSettled = await overflowCheck(page)
  vr.brokenImagesSettled = await brokenImageCheck(page)
  const bodyText = await page.evaluate(() => document.body.innerText)
  vr.won = /CLAIM PROVEN/.test(bodyText)
  vr.busted = /BAD VEIN\s*\W*\s*BUSTED/i.test(bodyText)
  vr.hasAssayAgain = /ASSAY AGAIN/.test(bodyText)
  vr.hasSunStoneReckoning = /SUN-STONE RECKONING/.test(bodyText)

  vr.consoleErrors = errors
  vr.failedRequests = failedRequests
  await browser.close()
  return vr
}

async function main() {
  const report = {}
  report.desktop1440 = await runViewport({ width: 1440, height: 900, deviceScaleFactor: 1 }, 'desktop-1440x900')
  report.pixel7 = await runViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'pixel7-412x915')
  report.iphone14pro = await runViewport({ width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, 'iphone14pro-393x852')

  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
  console.log('DONE')
  console.log(JSON.stringify(report, null, 2))
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
