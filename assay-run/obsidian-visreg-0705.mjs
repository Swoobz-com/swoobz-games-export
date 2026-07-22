// Visual regression for GRID 10x10=>14x14=196 + DARK OBSIDIAN repalette.
// Adapted from premium-elevation-visreg-0705.mjs: (1) paint loop now walks a
// 14x14 board (was 10x10), (2) added a live tile-px measurement probe on the
// desktop canvas, (3) added a canvas corner-pixel sample (4 corners) to check
// "not dead-flat-black" post-repalette.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = path.resolve('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-obsidian-0705')
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const GRID_DIM = 14

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
  const handle = await page.evaluateHandle(() => document.querySelector('button[aria-label="Dismiss how-to-play tip"]'))
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

const canvasBox = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height, attrW: c.width, attrH: c.height }
})

// Live tile-px measurement: canvas CSS box width / GRID_DIM (desktop only —
// mobile uses a fixed MOBILE_TILE_PX=46 pan window, checked separately).
const tilePxProbe = (page, gridDim) => page.evaluate((gd) => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const r = c.getBoundingClientRect()
  return { cssW: r.width, cssH: r.height, tilePxW: r.width / gd, tilePxH: r.height / gd }
}, gridDim)

// 196-coin render-count probe: canvas is procedural 2D, so we can't query DOM
// nodes for "coins" — instead confirm the full board paints by sampling a
// dense grid of cell-center points and counting how many are "coin-colored"
// (bright, non-background) vs background-colored. A correctly full 14x14
// board should read coin-like at ~(196 - bombCount) safe tiles minimum, and
// EVERY cell should differ from pure canvas-edge-clip (i.e. no row/col is
// uniformly background all the way across, which would indicate clipping).
const boardFullnessProbe = (page, gridDim) => page.evaluate((gd) => {
  const c = document.querySelector('canvas')
  if (!c) return { ok: false }
  const ctx = c.getContext('2d')
  const w = c.width, h = c.height
  const tile = w / gd
  const rows = []
  for (let ry = 0; ry < gd; ry++) {
    let rowNonBg = 0
    for (let rx = 0; rx < gd; rx++) {
      const x = Math.floor((rx + 0.5) * tile)
      const y = Math.floor((ry + 0.5) * tile)
      const d = ctx.getImageData(Math.min(w - 1, x), Math.min(h - 1, y), 1, 1).data
      // "background-like" heuristic: near boardBg (#171310 ~ 23,19,16) or
      // boardBgHi (#2C2016 ~ 44,32,22) within a loose band, low saturation
      // dark brown. Anything brighter/more saturated (gold coin) counts as
      // non-bg.
      const bright = (d[0] + d[1] + d[2]) / 3
      if (bright > 70) rowNonBg++
    }
    rows.push(rowNonBg)
  }
  const totalNonBg = rows.reduce((a, b) => a + b, 0)
  const emptyRows = rows.filter((r) => r === 0).length
  return { ok: true, gridDim: gd, w, h, tile, rows, totalNonBg, emptyRows, expectedCells: gd * gd }
}, gridDim)

// 4-corner + center canvas pixel sample (dead-flat-black check)
const cornerProbe = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const ctx = c.getContext('2d')
  const w = c.width, h = c.height
  const pts = {
    topLeft: [2, 2],
    topRight: [w - 3, 2],
    bottomLeft: [2, h - 3],
    bottomRight: [w - 3, h - 3],
    center: [Math.floor(w / 2), Math.floor(h / 2)],
  }
  const out = {}
  for (const [k, [x, y]] of Object.entries(pts)) {
    const d = ctx.getImageData(x, y, 1, 1).data
    out[k] = { x, y, rgb: [d[0], d[1], d[2]] }
  }
  return out
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
  const chans = [0, 1, 2].map((c2) => pts.map((p) => p.rgb[c2]))
  const variance = (arr) => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length
    return arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length
  }
  const varR = variance(chans[0]), varG = variance(chans[1]), varB = variance(chans[2])
  return { ok: true, w, h, pts, varR, varG, varB, maxVar: Math.max(varR, varG, varB) }
})

// Banding detector on a horizontal scanline set (canvas board gradients)
const bandingProbeCanvas = (page) => page.evaluate(() => {
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
    let last = null, runLen = 0, maxRun = 0
    for (const v of vals) {
      if (last && v[0] === last[0] && v[1] === last[1] && v[2] === last[2]) runLen++
      else {
        if (last) plateaus.push({ v: last, runLen })
        maxRun = Math.max(maxRun, runLen)
        last = v; runLen = 1
      }
    }
    if (last) plateaus.push({ v: last, runLen })
    maxRun = Math.max(maxRun, runLen)
    const deltas = []
    for (let i = 1; i < plateaus.length; i++) {
      const a = plateaus[i - 1].v, b = plateaus[i].v
      deltas.push(Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])))
    }
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

const brokenImageCheck = (page) => page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')]
  return imgs.map((img) => ({
    src: img.src.slice(0, 60),
    complete: img.complete,
    naturalWidth: img.naturalWidth,
    broken: img.complete && img.naturalWidth === 0,
  })).filter((i) => i.broken)
})

const overflowCheck = (page) => page.evaluate(() => {
  const bodyOverflowX = document.body.scrollWidth > window.innerWidth + 2
  return { bodyOverflowX, docScrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }
})

const titleCheck = (page) => page.evaluate(() => document.title)

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
      const r = c ? c.getBoundingClientRect() : null
      if (!r) return null
      return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, scrollLeft: 0, scrollTop: 0, scrollWidth: r.width, clientWidth: r.width, noScroll: true }
    }
    const r = el.getBoundingClientRect()
    return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }
  })
  if (!wrapInfo) return { ok: false, reason: 'no-wrapper-or-canvas' }
  // MOBILE_TILE_PX=46 fixed; GRID_DIM=14 now => scrollWidth should be ~46*14=644.
  const tile = 46
  const colStart = Math.ceil(wrapInfo.scrollLeft / tile)
  const rowStart = Math.ceil(wrapInfo.scrollTop / tile)
  const colsVisible = Math.max(1, Math.floor(wrapInfo.clientWidth / tile) - (wrapInfo.noScroll ? 0 : 1))
  const screenX = (col) => wrapInfo.rect.x - wrapInfo.scrollLeft + col * tile + tile / 2
  const screenY = (row) => wrapInfo.rect.y - wrapInfo.scrollTop + row * tile + tile / 2
  const before = { scrollLeft: wrapInfo.scrollLeft, scrollTop: wrapInfo.scrollTop, scrollWidth: wrapInfo.scrollWidth, scrollHeight: undefined }
  for (let i = 0; i < n; i++) {
    const col = colStart + (i % colsVisible)
    const row = rowStart + Math.floor(i / colsVisible)
    await page.mouse.move(screenX(col), screenY(row))
    await page.mouse.down()
    await page.mouse.up()
    await wait(30)
  }
  // Also perform an explicit pan gesture (drag) and re-measure scroll offset
  // to confirm panning actually works post-grid-change.
  const panStartX = wrapInfo.rect.x + wrapInfo.clientWidth * 0.7
  const panStartY = wrapInfo.rect.y + 40
  await page.mouse.move(panStartX, panStartY)
  await page.mouse.down()
  await page.mouse.move(panStartX - 120, panStartY - 80, { steps: 8 })
  await page.mouse.up()
  await wait(150)
  const afterScroll = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    let el = c ? c.parentElement : null
    while (el) {
      const cs = getComputedStyle(el)
      if ((cs.overflow === 'auto' || cs.overflow === 'scroll' || cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth) break
      el = el.parentElement
    }
    if (!el) return null
    return { scrollLeft: el.scrollLeft, scrollTop: el.scrollTop, scrollWidth: el.scrollWidth, scrollHeight: el.scrollHeight, clientWidth: el.clientWidth, clientHeight: el.clientHeight }
  })
  return { ok: true, wrapInfo, tile, colStart, rowStart, colsVisible, panBefore: before, panAfter: afterScroll }
}

async function runViewport(vp, label) {
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
  await wait(700)
  vr.title = await titleCheck(page)
  await page.screenshot({ path: `${OUT}/${label}-01-lobby.png` })
  await page.screenshot({ path: `${OUT}/${label}-01-lobby-fullpage.png`, fullPage: true })
  vr.overflowLobby = await overflowCheck(page)

  // ---- PLANNING ----
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  vr.coachmarkDismissed = await dismissCoachmark(page)
  await wait(250)
  await page.screenshot({ path: `${OUT}/${label}-02-planning.png` })
  vr.boardBox = await canvasBox(page)
  vr.tilePx = vp.isMobile ? null : await tilePxProbe(page, GRID_DIM)
  vr.boardFullness = await boardFullnessProbe(page, GRID_DIM)
  vr.corners = await cornerProbe(page)
  vr.scenic = await sampleCanvasGrid(page)
  vr.banding = await bandingProbeCanvas(page)
  vr.overflowPlanning = await overflowCheck(page)
  vr.brokenImagesPlanning = await brokenImageCheck(page)

  // ---- PAINT trail (14x14 board) ----
  if (vp.isMobile) {
    vr.paintDebug = await paintTrailMobile(page, 14)
  } else {
    const board = await canvasBox(page)
    const tile = board.w / GRID_DIM
    await page.mouse.move(board.x + tile * 0.5, board.y + tile * 0.5)
    await page.mouse.down()
    for (let i = 0; i < 14; i++) {
      const col = i % GRID_DIM, row = Math.floor(i / GRID_DIM)
      await page.mouse.move(board.x + tile * (col + 0.5), board.y + tile * (row + 0.5), { steps: 2 })
      await wait(15)
    }
    await page.mouse.up()
  }
  await wait(250)
  await page.screenshot({ path: `${OUT}/${label}-03-painted.png` })

  // ---- ASSAYING (active) ----
  vr.runTheLineClicked = await clickText(page, 'RUN THE LINE')
  await wait(900)
  await page.screenshot({ path: `${OUT}/${label}-04-assaying-active.png` })
  vr.scenicActive = await sampleCanvasGrid(page)
  vr.cornersActive = await cornerProbe(page)

  // ---- SETTLED (win-settle) ----
  await wait(3000)
  await page.screenshot({ path: `${OUT}/${label}-05-settled.png` })
  await page.screenshot({ path: `${OUT}/${label}-05-settled-fullpage.png`, fullPage: true })
  vr.overflowSettled = await overflowCheck(page)
  vr.brokenImagesSettled = await brokenImageCheck(page)
  const bodyText = await page.evaluate(() => document.body.innerText)
  vr.won = /CLAIM PROVEN|LINE CLAIMED/i.test(bodyText)
  vr.busted = /BAD VEIN|CRACKED DISC|BUSTED/i.test(bodyText)
  vr.hasAssayAgain = /ASSAY AGAIN/.test(bodyText)
  vr.cornersSettled = await cornerProbe(page)

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
