import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5184/'
const OUT = process.argv[3] || 'shots-holdgate-recolor-0703'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const DESKTOP_VPS = [
  { name: 'd1440x900', width: 1440, height: 900, deviceScaleFactor: 1 },
  { name: 'd1920x1080', width: 1920, height: 1080, deviceScaleFactor: 1 },
  { name: 'd2560x1440', width: 2560, height: 1440, deviceScaleFactor: 1 },
]
const MOBILE_VPS = [
  { name: 'm390x844', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'm412x915', width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
]

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

async function paintSerpentine(page, n, box) {
  const tile = box.w / 32
  let count = 0
  for (let row = 3; row < 30 && count < n; row += 2) {
    for (let col = 2; col < 30 && count < n; col += 3) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      count++
      await wait(10)
    }
  }
  return count
}

const geometry = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  const r = c ? c.getBoundingClientRect() : null
  return {
    board: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }
})

const ctaInfo = (page) => page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const cta = btns.find((b) => b.textContent && b.textContent.includes('ASSAY AGAIN'))
  if (!cta) return { found: false }
  const r = cta.getBoundingClientRect()
  return { found: true, bottom: r.bottom, top: r.top }
})

// Sample the canvas at a grid of points and classify each pixel's hue family:
// warm/gold (brass ~ R>150,G>100,B<110, R>B by a lot) vs cool (blue/cyan-ish
// or neutral steel/ink where B >= R or very dark).
const canvasColorSample = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const ctx = c.getContext('2d')
  const { width, height } = c
  if (!width || !height) return null
  const pts = []
  const N = 12
  for (let i = 1; i < N; i++) {
    for (let j = 1; j < N; j++) {
      pts.push([Math.floor((width * i) / N), Math.floor((height * j) / N)])
    }
  }
  let warm = 0
  let cool = 0
  let dark = 0
  const samples = []
  for (const [x, y] of pts) {
    const d = ctx.getImageData(x, y, 1, 1).data
    const [r, g, b] = d
    samples.push([r, g, b])
    const brightness = (r + g + b) / 3
    if (brightness < 25) {
      dark++
    } else if (r > g + 25 && r > b + 60 && g > b) {
      // warm/gold/brass signature: red-dominant, blue starved, green mid
      warm++
    } else {
      cool++
    }
  }
  return { warm, cool, dark, total: pts.length, samples: samples.slice(0, 8) }
})

// Coin-roundness probe: find a dormant (untouched) tile's screen rect, then
// sample the tile's four CORNERS vs its CENTER. A true circle (r~0.43*tile)
// leaves the corners as bare board background (dark, low-saturation) while
// the center is the lit steel body (visibly brighter / different from corner).
// A square coin would have the corner match the body fill almost exactly.
const coinRoundnessProbe = (page, boardBox) => page.evaluate((box) => {
  const c = document.querySelector('canvas')
  const ctx = c.getContext('2d')
  const dpr = c.width / box.w
  const gridDim = 32
  const tilePx = box.w / gridDim
  // Pick a tile away from the trail/current-bead — bottom-right quadrant, an
  // untouched dormant tile (row 25, col 25 is far from the serpentine paint
  // pattern used by paintSerpentine, which stays in rows 3-29/cols 2-29 with
  // stride 3 - use row/col far from any painted point: row 26, col 27).
  const row = 26
  const col = 27
  const tx = col * tilePx
  const ty = row * tilePx
  const cx = Math.floor((tx + tilePx / 2) * dpr)
  const cy = Math.floor((ty + tilePx / 2) * dpr)
  const cornerOffset = Math.floor(tilePx * 0.46 * dpr) // near the tile's true corner
  const pts = {
    center: [cx, cy],
    cornerTL: [Math.max(0, cx - cornerOffset), Math.max(0, cy - cornerOffset)],
    cornerTR: [cx + cornerOffset, Math.max(0, cy - cornerOffset)],
    cornerBL: [Math.max(0, cx - cornerOffset), cy + cornerOffset],
    cornerBR: [cx + cornerOffset, cy + cornerOffset],
  }
  const out = {}
  for (const [k, [x, y]] of Object.entries(pts)) {
    const d = ctx.getImageData(Math.min(x, c.width - 1), Math.min(y, c.height - 1), 1, 1).data
    out[k] = [d[0], d[1], d[2]]
  }
  return out
}, boardBox)

async function freshGoto(page) {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(500)
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: 'new',
    defaultViewport: null,
    args: ['--autoplay-policy=no-user-gesture-required'],
  })
  const page = (await browser.pages())[0]
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })

  const report = {}

  for (const vp of [...DESKTOP_VPS, ...MOBILE_VPS]) {
    const vr = {}
    await page.setViewport({
      width: vp.width, height: vp.height, deviceScaleFactor: vp.deviceScaleFactor,
      isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch,
    })

    // ── LOBBY ──
    await freshGoto(page)
    vr.lobby = await geometry(page)
    await page.screenshot({ path: `${OUT}/${vp.name}-01-lobby.png` })

    // ── PLANNING (bet-entry / trail painted) ──
    await clickText(page, 'ENTER THE ASSAY LINE')
    await wait(400)
    let box = await canvasBox(page)
    await paintSerpentine(page, 10, box)
    await wait(300)
    vr.planning = await geometry(page)
    vr.planning.colorSample = await canvasColorSample(page)
    if (box) vr.planning.coinRoundness = await coinRoundnessProbe(page, box)
    await page.screenshot({ path: `${OUT}/${vp.name}-02-planning.png` })

    // ── ASSAYING (mid-cascade) ──
    await clickText(page, 'PLUNGE')
    await wait(Math.round((10 * 90) / 2))
    vr.assaying = await geometry(page)
    vr.assaying.colorSample = await canvasColorSample(page)
    await page.screenshot({ path: `${OUT}/${vp.name}-03-assaying.png` })
    await wait(2000)

    // ── SETTLED-WIN ──
    let wonCapture = null
    for (let attempt = 0; attempt < 6 && !wonCapture; attempt++) {
      await freshGoto(page)
      await clickText(page, 'ENTER THE ASSAY LINE')
      await wait(350)
      box = await canvasBox(page)
      await paintSerpentine(page, 8, box)
      await wait(250)
      await clickText(page, 'PLUNGE')
      await wait(8 * 90 + 500)
      const text = (await page.evaluate(() => document.body.innerText))
      if (text.includes('CLAIM PROVEN')) {
        wonCapture = true
        vr.settledWin = await geometry(page)
        vr.settledWin.cta = await ctaInfo(page)
        vr.settledWin.ctaBelowFoldPx = vr.settledWin.cta.found
          ? Math.max(0, vr.settledWin.cta.bottom - vp.height) : null
        await page.screenshot({ path: `${OUT}/${vp.name}-04-settled-win.png` })
        // Glass box open (click to expand certificate if collapsible) — the
        // certificate here is always-expanded in this build, so re-capture
        // is a no-op duplicate flagged as such in the report.
      }
    }
    if (!wonCapture) vr.settledWin = { FAILED_TO_CAPTURE: true }

    // ── SETTLED-BUST ──
    let bustCapture = null
    for (let attempt = 0; attempt < 6 && !bustCapture; attempt++) {
      await freshGoto(page)
      await clickText(page, 'ENTER THE ASSAY LINE')
      await wait(350)
      box = await canvasBox(page)
      await paintSerpentine(page, 34, box)
      await wait(300)
      await clickText(page, 'PLUNGE')
      await wait(4500)
      const text = (await page.evaluate(() => document.body.innerText))
      if (text.includes('BUSTED')) {
        bustCapture = true
        vr.settledBust = await geometry(page)
        vr.settledBust.cta = await ctaInfo(page)
        vr.settledBust.ctaBelowFoldPx = vr.settledBust.cta.found
          ? Math.max(0, vr.settledBust.cta.bottom - vp.height) : null
        await page.screenshot({ path: `${OUT}/${vp.name}-05-settled-bust.png` })
      }
    }
    if (!bustCapture) vr.settledBust = { FAILED_TO_CAPTURE: true }

    report[vp.name] = vr
    console.log(`done: ${vp.name}`)
  }

  report.errors = errors
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
}

main()
