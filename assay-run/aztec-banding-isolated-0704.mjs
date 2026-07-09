// Isolated banding test: replicate the EXACT bgGrad definition from
// AssayGridCanvas.tsx (hotspot 0.28w/0.22h, stops boardBgHi->#3A2411->boardBg,
// plus the same 140-dot static dither) on an offscreen canvas with NO tiles
// drawn over it, so we measure the raw gradient's own banding behavior,
// independent of tile-edge silhouette transitions (which produced large
// deltas in the in-page probe and are NOT banding).
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
  const w = 530, h = 530 // desktop board size
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  const bgGrad = ctx.createRadialGradient(w * 0.28, h * 0.22, 8, w * 0.28, h * 0.22, w * 1.05)
  bgGrad.addColorStop(0, '#4A2E16')
  bgGrad.addColorStop(0.5, '#3A2411')
  bgGrad.addColorStop(1, '#2A1B0E')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, w, h)
  // static dither (same as source)
  const ditherRnd = mulberry32(4242)
  for (let i = 0; i < 140; i++) {
    const dx = ditherRnd() * w
    const dy = ditherRnd() * h
    const da = 0.015 + ditherRnd() * 0.02
    ctx.fillStyle = `rgba(168,122,74,${da.toFixed(3)})`
    ctx.fillRect(dx, dy, 1, 1)
  }

  // Sample a radial ray outward from the hotspot (0.28w,0.22h) toward the
  // farthest corner (bottom-right), at 1px resolution, since that is the
  // longest, slowest falloff and most banding-prone path.
  const cx = w * 0.28, cy = h * 0.22
  const ex = w, ey = h
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
  // plateau/delta analysis along the ray
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
  // A visible-ring banding artifact along a monotonic radial ray shows up as
  // long flat plateaus (>=8px at 1x) each followed by a jump of >=3 (multiple
  // 8-bit levels at once) -- since ideal dithered smooth falloff has runs of
  // 1-3px with deltas of 0-1.
  const bandEvents = plateaus.filter((p) => p.runLen >= 8).length
  return { totalSamples: vals.length, numPlateaus: plateaus.length, maxRun, maxDelta, avgDelta: +avgDelta.toFixed(3), bandEvents, sampleTail: vals.slice(0, 20) }
})
console.log(JSON.stringify(result, null, 2))
await browser.close()
