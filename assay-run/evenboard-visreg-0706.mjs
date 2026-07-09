// INDEPENDENT verification driver (swoobz-visual-regression-qa, 2026-07-06).
// NOT a reuse of codotty's _codotty_evenlight2_0706.mjs / dehaze-visreg-0706.mjs —
// written from scratch against the live DOM/canvas to cross-check the
// EVEN-BOARD-LIGHT fix (multiply falloff deleted + bgGrad far/mid stops lifted
// to #0f2e40/#0e2c3d) independently of the maker's own measurement code.
import puppeteer from 'puppeteer-core'
import { PNG } from 'pngjs'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = process.argv[2] || 'shots-evenboard-visreg-0706'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: 'pixel7-412', width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'iphone14pro-393', width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
]

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b // 0-255 scale, plain (not sRGB-linearized) — fine for relative even-ness comparisons
}

async function sampleRegionStats(page, x, y, w, h) {
  x = Math.max(0, Math.round(x)); y = Math.max(0, Math.round(y))
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h))
  const buf = await page.screenshot({ type: 'png', clip: { x, y, width: w, height: h } })
  const png = PNG.sync.read(Buffer.from(buf))
  const lums = []
  for (let yy = 0; yy < png.height; yy++) {
    for (let xx = 0; xx < png.width; xx++) {
      const i = (png.width * yy + xx) * 4
      lums.push(luminance(png.data[i], png.data[i + 1], png.data[i + 2]))
    }
  }
  lums.sort((a, b) => a - b)
  const n = lums.length
  const mean = lums.reduce((s, v) => s + v, 0) / n
  const podFace = lums.slice(Math.floor(n * 0.8)).reduce((s, v) => s + v, 0) / (n - Math.floor(n * 0.8)) // top 20% brightest = coin faces
  const bed = lums.slice(0, Math.floor(n * 0.2)).reduce((s, v) => s + v, 0) / Math.floor(n * 0.2) // bottom 20% = inter-coin bed
  return { mean: +mean.toFixed(2), podFace: +podFace.toFixed(2), bed: +bed.toFixed(2), n }
}

// Independent banding check: sample a 1px-wide vertical strip DOWN THE MIDDLE OF
// THE BOARD BED itself (not the margin) and count runs of >=5 identical RGB
// pixels in a row that then jump by a visible step (>3 levels) — a genuine
// banding "stair-step", vs smooth 1-level dither noise.
async function bandingOnBoard(page, x, y, h) {
  const buf = await page.screenshot({ type: 'png', clip: { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)), width: 3, height: Math.max(2, Math.round(h)) } })
  const png = PNG.sync.read(Buffer.from(buf))
  const col = []
  for (let yy = 0; yy < png.height; yy++) {
    const i = (png.width * yy + 1) * 4 // middle of the 3px strip
    col.push(luminance(png.data[i], png.data[i + 1], png.data[i + 2]))
  }
  let runLen = 1
  let hardSteps = 0 // a flat run of >=5px followed by a jump of >3 luminance levels = a visible band edge
  for (let i = 1; i < col.length; i++) {
    if (Math.abs(col[i] - col[i - 1]) < 0.5) {
      runLen++
    } else {
      if (runLen >= 5 && Math.abs(col[i] - col[i - 1]) > 3) hardSteps++
      runLen = 1
    }
  }
  return { sampled: col.length, hardSteps, lumMin: Math.min(...col).toFixed(2), lumMax: Math.max(...col).toFixed(2) }
}

const clickText = (page, re) =>
  page.evaluate((rs) => {
    const r = new RegExp(rs, 'i')
    const els = [...document.querySelectorAll('button, div, span')]
    const b = els.find((x) => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
    if (b) { b.click(); return true }
    return false
  }, re.source)

async function boardGeo(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    let el = c.parentElement
    let containerRect = null
    for (let i = 0; i < 4 && el; i++) {
      const cs = getComputedStyle(el)
      if (/(auto|scroll)/.test(cs.overflowX) || /(auto|scroll)/.test(cs.overflow)) { containerRect = el.getBoundingClientRect(); break }
      el = el.parentElement
    }
    const vLeft = containerRect ? Math.max(r.left, containerRect.left) : r.left
    const vTop = containerRect ? Math.max(r.top, containerRect.top) : r.top
    const vRight = containerRect ? Math.min(r.right, containerRect.right) : r.right
    const vBottom = containerRect ? Math.min(r.bottom, containerRect.bottom) : r.bottom
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height,
      visible: { left: vLeft, top: vTop, w: vRight - vLeft, h: vBottom - vTop } }
  })
}

async function clickTile(page, col, row, isMobile) {
  const g = await boardGeo(page)
  const tile = g.w / 14
  const x = g.left + col * tile + tile / 2
  const y = g.top + row * tile + tile / 2
  if (isMobile) await page.touchscreen.tap(x, y)
  else await page.mouse.click(x, y)
  return { x, y, tile }
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
  const report = { url: URL, viewports: {} }

  for (const vp of VIEWPORTS) {
    const vpReport = { console: [], pageerrors: [], failedRequests: [] }
    const page = await browser.newPage()
    page.on('console', (msg) => { if (msg.type() === 'error') vpReport.console.push(msg.text()) })
    page.on('pageerror', (err) => vpReport.pageerrors.push(String(err)))
    page.on('requestfailed', (req) => vpReport.failedRequests.push(req.url() + ' :: ' + (req.failure()?.errorText || '')))
    page.on('response', (res) => { if (res.status() >= 400) vpReport.failedRequests.push(res.url() + ' :: HTTP ' + res.status()) })

    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.deviceScaleFactor, isMobile: vp.isMobile, hasTouch: vp.hasTouch })
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
    await wait(700)
    // dismiss onboarding coachmark deterministically (own storage-key probe, same
    // key family used elsewhere in this line) then reload so it never occludes the board
    await page.evaluate(() => { try { localStorage.setItem('assay_coachmark_seen_v1', '1') } catch (e) {} })
    await page.reload({ waitUntil: 'load', timeout: 60000 })
    await wait(700)

    await page.screenshot({ path: `${OUT}/${vp.name}-01-lobby.png`, fullPage: vp.isMobile })

    // reach PLANNING phase
    const opened = await clickText(page, /ENTER THE DIVE/)
    await wait(400)
    await page.screenshot({ path: `${OUT}/${vp.name}-02-planning.png`, fullPage: vp.isMobile })

    // full-board crop for eyeballing + corner/center sampling. Use the VISIBLE
    // (post-scroll-clip) box so mobile's pan-window never causes an off-canvas read.
    let g = await boardGeo(page)
    const vw = Math.max(1, Math.round(g.visible.w)), vh = Math.max(1, Math.round(g.visible.h))
    await page.screenshot({ path: `${OUT}/${vp.name}-03-board-crop.png`, clip: { x: Math.max(0, Math.round(g.visible.left)), y: Math.max(0, Math.round(g.visible.top)), width: vw, height: vh } })

    // 4 corners + center: large patch (~26% of board dim) so coin/bed ratio is
    // stable per quadrant (avoids the coin-vs-gap sampling artifact noted in
    // memory — a small patch can land on a coin FACE in one corner and a BED gap
    // in another, producing a false vignette reading that is really sampling noise).
    const pw = Math.round(g.w * 0.26), ph = Math.round(g.h * 0.26)
    const insX = Math.round(g.w * 0.04), insY = Math.round(g.h * 0.04)
    const cx = Math.round((g.left + g.right) / 2 - pw / 2), cy = Math.round((g.top + g.bottom) / 2 - ph / 2)
    // clamp all patches inside the VISIBLE window (mobile pan-clip) so we never sample off-canvas
    const clampPatch = (px, py) => ({
      x: Math.max(g.visible.left, Math.min(g.visible.left + g.visible.w - pw, px)),
      y: Math.max(g.visible.top, Math.min(g.visible.top + g.visible.h - ph, py)),
    })
    const rawPts = {
      TL: [g.left + insX, g.top + insY],
      TR: [g.right - insX - pw, g.top + insY],
      BL: [g.left + insX, g.bottom - insY - ph],
      BR: [g.right - insX - pw, g.bottom - insY - ph], // the previously-dark corner
      CENTER: [cx, cy],
    }
    const corners = {}
    for (const [k, [px, py]] of Object.entries(rawPts)) {
      const c = clampPatch(px, py)
      corners[k] = await sampleRegionStats(page, c.x, c.y, pw, ph)
    }
    const C = corners.CENTER
    const ratios = {}
    for (const k of ['TL', 'TR', 'BL', 'BR']) {
      ratios[k] = { mean: +(corners[k].mean / C.mean).toFixed(3), podFace: +(corners[k].podFace / C.podFace).toFixed(3), bed: +(corners[k].bed / C.bed).toFixed(3) }
    }

    // banding: vertical strip straight through board center (through the bed, not the margin)
    const bandCenterX = (g.left + g.right) / 2
    const bandProbe = await bandingOnBoard(page, bandCenterX, Math.max(g.visible.top, g.top), Math.min(g.visible.h, g.h))

    // reveal-flare check: click ONE fresh never-before-touched tile in the
    // middle of the board and capture immediately (mid reveal-pop, when
    // SUB_FLARE peaks) vs a baseline shot of an adjacent untouched tile, then a
    // settled shot ~500ms later once the transient has decayed.
    const flareCol = 7, flareRow = 7
    g = await boardGeo(page) // re-read (mobile scroll may have moved since corner sampling)
    const before = await sampleRegionStats(page, g.left + flareCol * (g.w / 14) - (g.w / 14) * 0.9, g.top + flareRow * (g.h / 14) - (g.h / 14) * 0.9, (g.w / 14) * 2.8, (g.h / 14) * 2.8)
    const tapInfo = await clickTile(page, flareCol, flareRow, vp.isMobile)
    await wait(70) // land inside the reveal-pop / flare peak window
    const mid = await sampleRegionStats(page, g.left + flareCol * (g.w / 14) - (g.w / 14) * 0.9, g.top + flareRow * (g.h / 14) - (g.h / 14) * 0.9, (g.w / 14) * 2.8, (g.h / 14) * 2.8)
    await page.screenshot({ path: `${OUT}/${vp.name}-04-flare-peak.png`, clip: { x: Math.max(0, Math.round(g.left + flareCol * (g.w / 14) - (g.w / 14) * 2)), y: Math.max(0, Math.round(g.top + flareRow * (g.h / 14) - (g.h / 14) * 2)), width: Math.round((g.w / 14) * 6), height: Math.round((g.h / 14) * 6) } })
    await wait(700)
    const after = await sampleRegionStats(page, g.left + flareCol * (g.w / 14) - (g.w / 14) * 0.9, g.top + flareRow * (g.h / 14) - (g.h / 14) * 0.9, (g.w / 14) * 2.8, (g.h / 14) * 2.8)

    // full page settled shot for eyeball + overflow probe
    await page.screenshot({ path: `${OUT}/${vp.name}-05-post-reveal.png`, fullPage: vp.isMobile })
    const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }))

    vpReport.corners = corners
    vpReport.ratiosVsCenter = ratios
    vpReport.bandProbe = bandProbe
    vpReport.flare = { before: before.mean, midPeak: mid.mean, afterSettle: after.mean, deltaMidVsBefore: +(mid.mean - before.mean).toFixed(2) }
    vpReport.overflow = overflow
    vpReport.openedPlan = opened

    report.viewports[vp.name] = vpReport
    await page.close()
  }

  await browser.close()
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}

run().catch((e) => { console.error('FATAL', e); process.exit(1) })
