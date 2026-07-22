// Coin-redesign + new-effects perf/integrity probe (2026-07-03).
// Measures per-frame draw() cost via a wrapped requestAnimationFrame (captures
// the actual wall-clock cost of the app's own rAF loop callback every frame),
// cross-checked with the detached-canvas op-batching technique for the
// offscreen static-board rebuild (from assay-perf-probe3.mjs). Also verifies
// desktop-path activation, sprite-cache creation count, static-rebuild count
// on resize, and pixel-level render integrity (missing-texture magenta check,
// ring-leak check).
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5450/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = 'coin-perf-shots-0703'
fs.mkdirSync(OUT, { recursive: true })

const INSTRUMENT = () => {
  // (A) Wrap rAF so we time the app's own per-frame callback wall-clock cost.
  window.__frameTimes = []
  window.__frameCount = 0
  const origRAF = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = (cb) =>
    origRAF((t) => {
      window.__frameCount++
      const s = performance.now()
      cb(t)
      const e = performance.now()
      window.__frameTimes.push(e - s)
    })

  // (B) Tag detached (offscreen) 2d contexts and batch their ops by temporal
  // proximity -> true wall-clock span of a static-board rebuild.
  window.__rebuilds = []
  window.__spriteCanvasCreated = 0
  let cur = null
  const GAP_MS = 8
  const mark = () => {
    const t = performance.now()
    if (!cur || t - cur.end > GAP_MS) {
      cur = { start: t, end: t, ops: 0 }
      window.__rebuilds.push(cur)
    }
    cur.end = t
    cur.ops++
  }
  const origCreateElement = document.createElement.bind(document)
  document.createElement = (tag, ...rest) => {
    const el = origCreateElement(tag, ...rest)
    if (String(tag).toLowerCase() === 'canvas') window.__spriteCanvasCreated++
    return el
  }
  const origGetContext = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const ctx = origGetContext.call(this, type, ...rest)
    if (type === '2d' && ctx && !this.__qTagged) {
      this.__qTagged = true
      const el = this
      for (const m of ['drawImage', 'clearRect', 'fill', 'stroke']) {
        const orig = ctx[m].bind(ctx)
        ctx[m] = (...args) => {
          if (!document.body.contains(el)) mark()
          return orig(...args)
        }
      }
    }
    return ctx
  }
}

const clickText = (page, txt) =>
  page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
    if (b) { b.click(); return true }
    return false
  }, txt)

async function getDesktopCanvasBox(page) {
  return page.evaluate(() => {
    const cs = [...document.querySelectorAll('canvas')]
    let best = null
    for (const c of cs) {
      const r = c.getBoundingClientRect()
      if (r.width <= 0) continue
      if (!best || r.width * r.height > best.w * best.h) best = { x: r.x, y: r.y, w: r.width, h: r.height }
    }
    return best
  })
}

async function paintTrail(page, box, coords) {
  const tile = box.w / 32
  for (const [row, col] of coords) {
    await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
    await wait(15)
  }
}

function summarizeFrames(times) {
  if (times.length === 0) return { n: 0 }
  const sorted = [...times].sort((a, b) => a - b)
  return {
    n: times.length,
    avgMs: +(times.reduce((s, v) => s + v, 0) / times.length).toFixed(4),
    p50Ms: +sorted[Math.floor(sorted.length * 0.5)].toFixed(4),
    p95Ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(4),
    maxMs: +sorted[sorted.length - 1].toFixed(4),
    budgetPct60: +((sorted[Math.floor(sorted.length * 0.95)] / 16.67) * 100).toFixed(2),
  }
}
function summarizeRebuilds(rebuilds, minOps = 100) {
  const real = rebuilds.filter((r) => r.ops >= minOps)
  const durations = real.map((r) => r.end - r.start).sort((a, b) => a - b)
  if (durations.length === 0) return { n: 0 }
  return {
    n: durations.length,
    avgMs: +(durations.reduce((s, v) => s + v, 0) / durations.length).toFixed(3),
    maxMs: +durations[durations.length - 1].toFixed(3),
    opsPerBatch: real[0].ops,
  }
}

// Pixel sample: WebGL missing-texture magenta check (canvas-2D so this is a
// belt-and-suspenders check; the real risk here is corruption, not GL magenta).
async function samplePixels(page, box, label) {
  return page.evaluate(
    ({ box, label }) => {
      const c = [...document.querySelectorAll('canvas')].find((cv) => {
        const r = cv.getBoundingClientRect()
        return Math.abs(r.width - box.w) < 2
      })
      if (!c) return { label, error: 'canvas not found' }
      const ctx = c.getContext('2d')
      const dpr = c.width / box.w
      const pts = []
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const x = Math.floor(((i + 0.5) / 3) * c.width)
          const y = Math.floor(((j + 0.5) / 3) * c.height)
          const d = ctx.getImageData(x, y, 1, 1).data
          pts.push([d[0], d[1], d[2], d[3]])
        }
      }
      const magenta = pts.filter((p) => Math.abs(p[0] - 255) <= 10 && Math.abs(p[1] - 0) <= 10 && Math.abs(p[2] - 255) <= 10)
      return { label, pts, magentaHits: magenta.length }
    },
    { box, label },
  )
}

async function main() {
  const results = {}
  for (const vp of [
    { width: 1440, height: 900, dpr: 1, label: '1440x900' },
    { width: 1920, height: 1080, dpr: 1, label: '1920x1080' },
    { width: 2560, height: 1440, dpr: 1, label: '2560x1440' },
  ]) {
    const browser = await puppeteer.launch({
      executablePath: EXE, headless: 'new',
      args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist'],
    })
    const page = (await browser.pages())[0]
    page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()) })
    page.on('pageerror', (e) => console.log('[pageerror]', e.message))
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dpr })
    await page.evaluateOnNewDocument(INSTRUMENT)
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(400)
    await clickText(page, 'ENTER THE ASSAY LINE')
    await wait(500)

    const box = await getDesktopCanvasBox(page)
    const winW = page.viewport().width
    const desktopActive = winW >= 1360

    // ── IDLE (planning phase, sitting still — the rAF loop now runs for every
    // phase except lobby per the current source, so idle here means "planning,
    // no interaction in flight").
    await page.evaluate(() => { window.__frameTimes = []; window.__rebuilds = [] })
    await wait(1200)
    const idleFrames = await page.evaluate(() => window.__frameTimes)
    const idleRebuilds = await page.evaluate(() => window.__rebuilds)

    const idlePix = await samplePixels(page, box, `${vp.label}-idle`)
    await page.screenshot({ path: `${OUT}/${vp.label}-01-idle.png` })

    // ── CASCADE: short guaranteed-ish trail (8 tiles = MIN_TRAIL), PLUNGE,
    // capture frame cost through the reveal cascade window.
    const shortTrail = []
    let n = 0
    for (let row = 4; row < 30 && n < 8; row += 3) {
      for (let col = 4; col < 30 && n < 8; col += 4) { shortTrail.push([row, col]); n++ }
    }
    await paintTrail(page, box, shortTrail)
    await wait(200)
    await page.evaluate(() => { window.__frameTimes = []; window.__rebuilds = [] })
    await clickText(page, 'PLUNGE')
    await wait(2600)
    const cascadeFrames = await page.evaluate(() => window.__frameTimes)
    const cascadeRebuilds = await page.evaluate(() => window.__rebuilds)
    const cascadeText = (await page.evaluate(() => document.body.innerText)).includes('BUSTED') ? 'BUSTED' : 'other'
    await page.screenshot({ path: `${OUT}/${vp.label}-02-postcascade-${cascadeText}.png` })
    const provenPix = await samplePixels(page, box, `${vp.label}-postcascade`)

    // Reset to a fresh round for the bust attempt.
    await clickText(page, 'ASSAY AGAIN')
    await wait(400)
    await clickText(page, 'CLEAR')
    await wait(200)

    // ── BUST: long 40-tile serpentine trail (high bust probability vs
    // BOMB_COUNT=40/1024), retry until a real bust fires, capture frame cost
    // through the shake+flash+ring+scatter window.
    let busted = false
    let bustFrames = [], bustRebuilds = []
    for (let attempt = 0; attempt < 5 && !busted; attempt++) {
      if (attempt > 0) {
        await clickText(page, 'ASSAY AGAIN')
        await wait(400)
        await clickText(page, 'CLEAR')
        await wait(200)
      }
      const longTrail = []
      let m = 0
      for (let row = 2; row < 30 && m < 40; row += 1) {
        for (let col = 2; col < 30 && m < 40; col += 3) { longTrail.push([row, col]); m++ }
      }
      await paintTrail(page, box, longTrail)
      await wait(200)
      await page.evaluate(() => { window.__frameTimes = []; window.__rebuilds = [] })
      await clickText(page, 'PLUNGE')
      await wait(4500)
      const txt = await page.evaluate(() => document.body.innerText)
      if (txt.includes('BUSTED')) {
        busted = true
        bustFrames = await page.evaluate(() => window.__frameTimes)
        bustRebuilds = await page.evaluate(() => window.__rebuilds)
        await page.screenshot({ path: `${OUT}/${vp.label}-03-bust.png` })
      }
    }
    const bustPix = busted ? await samplePixels(page, box, `${vp.label}-bust`) : null

    // ── Resize invalidation check: grow the viewport, expect exactly ONE
    // rebuild batch with ops == GRID_DIM^2 (1024) tiles, not a storm.
    await page.evaluate(() => { window.__rebuilds = [] })
    await page.setViewport({ width: vp.width, height: vp.height + 120, deviceScaleFactor: vp.dpr })
    await wait(400)
    const resizeRebuilds = await page.evaluate(() => window.__rebuilds)
    const boxAfterResize = await getDesktopCanvasBox(page)

    results[vp.label] = {
      desktopActive,
      canvasBoxPx: Math.round(box.w),
      spriteCanvasCreated: await page.evaluate(() => window.__spriteCanvasCreated),
      idle: { frames: summarizeFrames(idleFrames), rebuildBatches: idleRebuilds.length, pix: idlePix },
      cascade: { frames: summarizeFrames(cascadeFrames), rebuildBatches: summarizeRebuilds(cascadeRebuilds), result: cascadeText, pix: provenPix },
      bust: busted
        ? { frames: summarizeFrames(bustFrames), rebuildBatches: summarizeRebuilds(bustRebuilds), pix: bustPix }
        : { busted: false, note: 'no bust in 5 attempts' },
      resizeInvalidation: {
        rebuildBatchCount: resizeRebuilds.length,
        opsInBatches: resizeRebuilds.map((r) => r.ops),
        boxBefore: Math.round(box.w),
        boxAfter: Math.round(boxAfterResize.w),
      },
    }
    await browser.close()
  }
  fs.writeFileSync('coin-perf-results-0703.json', JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}
main()
