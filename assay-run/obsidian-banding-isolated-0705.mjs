// Isolated banding test for the DARK OBSIDIAN repalette's board gradients,
// composited exactly as AssayGridCanvas.tsx does today:
//   1) bgGrad (3-stop, boardBgHi -> mid -> boardBg, all now near-black obsidian)
//   2) board-wide falloff, 'multiply' composite (hi rgba(255,244,214,1) -> lo
//      rgba(46,36,24,1) — the current-shipped far-corner floor, replacing the
//      prior warm-brown rgba(90,64,40,1))
// Sampled together (bgGrad -> dither -> multiply falloff), matching the real
// bake order, on an offscreen canvas with NO tiles, isolating the gradient's
// OWN banding behavior from coin-edge deltas.
import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.goto('about:blank')

const result = await page.evaluate(() => {
  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5)
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  const w = 530, h = 530 // desktop board size (grid-independent, height-driven)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')

  // 1) bgGrad (current dark-obsidian 3-stop)
  const bgGrad = ctx.createRadialGradient(w * 0.28, h * 0.22, 8, w * 0.28, h * 0.22, w * 1.05)
  bgGrad.addColorStop(0, '#2C2016') // COL.boardBgHi
  bgGrad.addColorStop(0.5, '#20180F')
  bgGrad.addColorStop(1, '#171310') // COL.boardBg
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, w, h)

  // static dither (same seed/params as source)
  const ditherRnd = mulberry32(4242)
  for (let i = 0; i < 140; i++) {
    const dx = ditherRnd() * w
    const dy = ditherRnd() * h
    const da = 0.015 + ditherRnd() * 0.02
    ctx.fillStyle = `rgba(168,122,74,${da.toFixed(3)})`
    ctx.fillRect(dx, dy, 1, 1)
  }

  // 2) board-wide light falloff, multiply composite (current dark-obsidian stops)
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  const falloff = ctx.createRadialGradient(w * 0.28, h * 0.22, 0, w * 0.28, h * 0.22, w * 0.95)
  falloff.addColorStop(0, 'rgba(255,244,214,1)')
  falloff.addColorStop(1, 'rgba(46,36,24,1)')
  ctx.fillStyle = falloff
  ctx.fillRect(0, 0, w, h)
  ctx.restore()

  function rayAnalysis(cx, cy, ex, ey) {
    const dist = Math.hypot(ex - cx, ey - cy)
    const steps = Math.floor(dist)
    const vals = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = Math.round(cx + (ex - cx) * t)
      const y = Math.round(cy + (ey - cy) * t)
      const d = ctx.getImageData(Math.min(w - 1, x), Math.min(h - 1, y), 1, 1).data
      vals.push([d[0], d[1], d[2]])
    }
    const plateaus = []
    let last = null, runLen = 0
    for (const v of vals) {
      if (last && v[0] === last[0] && v[1] === last[1] && v[2] === last[2]) runLen++
      else {
        if (last) plateaus.push({ v: last, runLen })
        last = v
        runLen = 1
      }
    }
    if (last) plateaus.push({ v: last, runLen })
    const deltas = []
    for (let i = 1; i < plateaus.length; i++) {
      const a = plateaus[i - 1].v, b = plateaus[i].v
      deltas.push(Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])))
    }
    const maxRun = Math.max(...plateaus.map((p) => p.runLen))
    const maxDelta = deltas.length ? Math.max(...deltas) : 0
    const avgDelta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0
    const bandEvents = plateaus.filter((p) => p.runLen >= 8).length
    return { totalSamples: vals.length, numPlateaus: plateaus.length, maxRun, maxDelta, avgDelta: +avgDelta.toFixed(3), bandEvents, endValue: vals[vals.length - 1] }
  }

  const cx = w * 0.28, cy = h * 0.22
  return {
    toBottomRight: rayAnalysis(cx, cy, w, h),
    toBottomLeft: rayAnalysis(cx, cy, 0, h),
    toTopRight: rayAnalysis(cx, cy, w, 0),
    toRight: rayAnalysis(cx, cy, w, cy),
    toBottom: rayAnalysis(cx, cy, cx, h),
    farCornerPixel: (() => {
      const d = ctx.getImageData(w - 1, h - 1, 1, 1).data
      return [d[0], d[1], d[2]]
    })(),
  }
})
console.log(JSON.stringify(result, null, 2))
await browser.close()
