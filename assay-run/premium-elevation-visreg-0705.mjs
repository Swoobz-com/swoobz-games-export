// Premium elevation pass visreg (2026-07-05): TempleSkyline layers,
// TreasureDressing margin clusters, TorchSconce, tonal vignette, retuned
// bgGrad, board-wide light-falloff, gold cartouche + board bloom on settle.
// Adapted from aztec-visreg-0704.mjs + aztec-banding-isolated-0704.mjs.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = path.resolve('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-premium-elevation-0705')
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
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})

// ---- New-layer DOM presence probe ----
const layerProbe = (page) => page.evaluate(() => {
  const svgs = [...document.querySelectorAll('svg')]
  const templeSvgs = svgs.filter((s) => s.getAttribute('viewBox') === '0 0 1440 260')
  const imgs = [...document.querySelectorAll('img')]
  const doubloonImgs = imgs.filter((i) => i.src.startsWith('data:image'))
  // TorchSconce: look for svg with the bracket/flame path structure — approximate
  // by counting small (~40x64-ish) absolutely-positioned svgs near top corners.
  const allDivs = [...document.querySelectorAll('div[aria-hidden]')]
  return {
    templeLayerCount: templeSvgs.length,
    totalSvgCount: svgs.length,
    dataUrlImgCount: doubloonImgs.length,
    ariaHiddenLayerCount: allDivs.length,
  }
})

// Detect whether treasure-dressing doubloon <img> clusters are present +
// their bounding boxes (should be near-viewport-edge on wide, absent on
// narrow).
const treasureDressingProbe = (page) => page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')].filter((i) => i.src.startsWith('data:image'))
  return imgs.map((i) => {
    const r = i.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height, visible: r.width > 0 && r.height > 0 }
  })
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

// Flat-brown-margin-band probe: sample the DOM margin area OUTSIDE the shell
// card (left/right of centerCardWidthPx) at several y-heights, on the page
// background (not canvas) via html2canvas-free DOM color read: we instead
// screenshot-crop is done outside in node; here we just record the shell
// bounding box + viewport width so node can crop the correct margin strip.
const shellBoxProbe = (page) => page.evaluate(() => {
  // The outer relative-position wrapper described in the spec — approximate
  // by finding the widest 'position: relative' div that is a page-level
  // ancestor of the canvas.
  const c = document.querySelector('canvas')
  let el = c
  let best = null
  while (el) {
    const cs = getComputedStyle(el)
    if (cs.position === 'relative' || cs.position === 'absolute') {
      const r = el.getBoundingClientRect()
      if (!best || r.width > best.w) best = { w: r.width, h: r.height, x: r.x, y: r.y }
    }
    el = el.parentElement
  }
  return { viewportW: window.innerWidth, viewportH: window.innerHeight, shellApprox: best }
})

// Banding detector on a horizontal scanline set (page-level bgGrad + canvas)
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

// Page-level (DOM, not canvas) banding probe for the tonal-vignette + bgGrad
// layers, via html canvas capture of a screenshot crop is more reliable than
// getComputedStyle; we approximate by taking a full-page screenshot buffer
// and scanning it in node (see analyzePngBanding below) since these layers
// are CSS gradients composited by the browser, not something JS can sample
// directly without a canvas snapshot.

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
  const tile = wrapInfo.scrollWidth / 10
  const colStart = Math.ceil(wrapInfo.scrollLeft / tile)
  const rowStart = Math.ceil(wrapInfo.scrollTop / tile)
  const colsVisible = Math.max(1, Math.floor(wrapInfo.clientWidth / tile) - (wrapInfo.noScroll ? 0 : 1))
  const screenX = (col) => wrapInfo.rect.x - wrapInfo.scrollLeft + col * tile + tile / 2
  const screenY = (row) => wrapInfo.rect.y - wrapInfo.scrollTop + row * tile + tile / 2
  for (let i = 0; i < n; i++) {
    const col = colStart + (i % colsVisible)
    const row = rowStart + Math.floor(i / colsVisible)
    await page.mouse.move(screenX(col), screenY(row))
    await page.mouse.down()
    await page.mouse.up()
    await wait(30)
  }
  return { ok: true, wrapInfo, tile, colStart, rowStart, colsVisible }
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
  vr.layersLobby = await layerProbe(page)
  vr.treasureDressingLobby = await treasureDressingProbe(page)
  vr.shellBoxLobby = await shellBoxProbe(page)
  await page.screenshot({ path: `${OUT}/${label}-01-lobby.png` })
  await page.screenshot({ path: `${OUT}/${label}-01-lobby-fullpage.png`, fullPage: true })

  // ---- PLANNING ----
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  vr.coachmarkDismissed = await dismissCoachmark(page)
  await wait(200)
  await page.screenshot({ path: `${OUT}/${label}-02-planning.png` })
  vr.boardBox = await canvasBox(page)
  vr.scenic = await sampleCanvasGrid(page)
  vr.banding = await bandingProbeCanvas(page)
  vr.overflowPlanning = await overflowCheck(page)
  vr.brokenImagesPlanning = await brokenImageCheck(page)
  vr.layersPlanning = await layerProbe(page)
  vr.treasureDressingPlanning = await treasureDressingProbe(page)

  // ---- PAINT trail ----
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
  await page.screenshot({ path: `${OUT}/${label}-03-painted.png` })

  // ---- ASSAYING (active) ----
  vr.runTheLineClicked = await clickText(page, 'RUN THE LINE')
  await wait(900)
  await page.screenshot({ path: `${OUT}/${label}-04-assaying-active.png` })
  vr.scenicActive = await sampleCanvasGrid(page)

  // ---- SETTLED ----
  await wait(3000)
  await page.screenshot({ path: `${OUT}/${label}-05-settled.png` })
  await page.screenshot({ path: `${OUT}/${label}-05-settled-fullpage.png`, fullPage: true })
  vr.overflowSettled = await overflowCheck(page)
  vr.brokenImagesSettled = await brokenImageCheck(page)
  const bodyText = await page.evaluate(() => document.body.innerText)
  vr.won = /CLAIM PROVEN|LINE CLAIMED/i.test(bodyText)
  vr.busted = /BAD VEIN|CRACKED DISC|BUSTED/i.test(bodyText)
  vr.hasAssayAgain = /ASSAY AGAIN/.test(bodyText)

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
