// Follow-up targeted probe (own script, independent) to fix a flaw discovered
// in the first pass: a vertical strip through the BOARD CENTER crosses every
// coin's circular edge (14 rows), which the naive "hardStep" detector
// mis-registers as banding. Real banding must be sampled in the INTER-COIN GAP
// (a tile-column boundary, where coin diameter 0.86x tile leaves an empty
// margin) so the strip touches ONLY the baked bgGrad bed, never a coin edge.
import puppeteer from 'puppeteer-core'
import { PNG } from 'pngjs'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-evenboard-visreg-0706'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function luminance(r, g, b) { return 0.2126 * r + 0.7152 * g + 0.0722 * b }

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: 'pixel7-412', width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'iphone14pro-393', width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
]

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
    const r = c.getBoundingClientRect()
    let el = c.parentElement, containerRect = null
    for (let i = 0; i < 4 && el; i++) {
      const cs = getComputedStyle(el)
      if (/(auto|scroll)/.test(cs.overflowX) || /(auto|scroll)/.test(cs.overflow)) { containerRect = el.getBoundingClientRect(); break }
      el = el.parentElement
    }
    const vLeft = containerRect ? Math.max(r.left, containerRect.left) : r.left
    const vTop = containerRect ? Math.max(r.top, containerRect.top) : r.top
    const vRight = containerRect ? Math.min(r.right, containerRect.right) : r.right
    const vBottom = containerRect ? Math.min(r.bottom, containerRect.bottom) : r.bottom
    // ALSO clamp to the actual browser viewport (a scroll container can still
    // extend past window edges on some layouts) — this is what bit the first
    // pass of this probe: it picked an x that was mathematically "least
    // banding" only because it fell OUTSIDE window.innerWidth entirely.
    const vw = window.innerWidth, vh = window.innerHeight
    const fLeft = Math.max(vLeft, 0), fTop = Math.max(vTop, 0)
    const fRight = Math.min(vRight, vw), fBottom = Math.min(vBottom, vh)
    return { left: r.left, top: r.top, w: r.width, h: r.height,
      visibleLeft: fLeft, visibleTop: fTop, visibleW: fRight - fLeft, visibleH: fBottom - fTop }
  })
}

async function gapBandScan(page, x, y, h) {
  const buf = await page.screenshot({ type: 'png', clip: { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)), width: 1, height: Math.max(2, Math.round(h)) } })
  const png = PNG.sync.read(Buffer.from(buf))
  const col = []
  for (let yy = 0; yy < png.height; yy++) {
    const i = yy * 4
    col.push(luminance(png.data[i], png.data[i + 1], png.data[i + 2]))
  }
  let runLen = 1, hardSteps = 0
  const steps = []
  for (let i = 1; i < col.length; i++) {
    const d = Math.abs(col[i] - col[i - 1])
    if (d < 0.5) runLen++
    else { if (runLen >= 5 && d > 3) { hardSteps++; steps.push({ atPx: i, from: +col[i-1].toFixed(1), to: +col[i].toFixed(1) }) } runLen = 1 }
  }
  return { sampled: col.length, hardSteps, steps, lumMin: +Math.min(...col).toFixed(2), lumMax: +Math.max(...col).toFixed(2) }
}

const results = {}
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
for (const vp of VIEWPORTS) {
  const page = await browser.newPage()
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.deviceScaleFactor, isMobile: vp.isMobile, hasTouch: vp.hasTouch })
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
  await wait(700)
  await page.evaluate(() => { try { localStorage.setItem('assay_coachmark_seen_v1', '1') } catch (e) {} })
  await page.reload({ waitUntil: 'load', timeout: 60000 })
  await wait(700)
  await clickText(page, /ENTER THE DIVE/)
  await wait(400)
  const g = await boardGeo(page)
  const tile = g.w / 14
  // Try boundary columns 4..10 (avoid extreme edges), but ONLY consider a
  // candidate whose x actually lands inside the visible window (both the
  // canvas's own box AND any scroll-clip ancestor AND window.innerWidth) —
  // otherwise the "lowest range" heuristic can be fooled by an off-screen
  // capture that returns a flat, meaningless constant (the bug in pass 1).
  const candidates = [4, 5, 6, 7, 8, 9, 10]
  const y0 = Math.max(g.top, g.visibleTop)
  const h0 = Math.min(g.h, g.visibleH)
  let best = null
  for (const col of candidates) {
    const x = g.left + col * tile
    if (x < g.visibleLeft || x > g.visibleLeft + g.visibleW - 1) continue // off-screen, skip
    const scan = await gapBandScan(page, x, y0, h0)
    if (!best || (scan.lumMax - scan.lumMin) < (best.scan.lumMax - best.scan.lumMin)) best = { col, x, y0, h0, scan }
  }
  results[vp.name] = best || { note: 'NO on-screen gap column candidate found', geo: g }
  await page.close()
}
await browser.close()
fs.writeFileSync(`${OUT}/gapband-report.json`, JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
