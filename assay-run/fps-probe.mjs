// Assay canvas perf probe — measures (A) redraw cost during pan/drag at max zoom
// and (B) cascade rAF fps. Comparable before/after Change B.
import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5199/'
const LABEL = process.argv[3] || 'run'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist'],
})
const page = (await browser.pages())[0]
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 })
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(500)

const clickText = async (txt) =>
  page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
    if (b) { b.click(); return true }
    return false
  }, txt)

await clickText('ENTER THE ASSAY LINE')
await wait(500) // lands directly in planning (interactive board)

// Locate the ore-board canvas (the big one).
const canvasBox = await page.evaluate(() => {
  const cs = [...document.querySelectorAll('canvas')]
  let best = null
  for (const c of cs) { const r = c.getBoundingClientRect(); if (!best || r.width * r.height > best.w * best.h) best = { x: r.x, y: r.y, w: r.width, h: r.height } }
  return best
})
if (!canvasBox) { console.log('NO CANVAS'); await browser.close(); process.exit(1) }

// Paint a long claim-line by dragging across several rows (add-only paint).
async function paintTrail() {
  const { x, y, w, h } = canvasBox
  const rows = [0.15, 0.25, 0.35, 0.45]
  for (const ry of rows) {
    const py = y + h * ry
    await page.mouse.move(x + w * 0.06, py)
    await page.mouse.down()
    for (let i = 0; i <= 16; i++) { await page.mouse.move(x + w * (0.06 + 0.88 * (i / 16)), py); }
    await page.mouse.up()
  }
}
await paintTrail()
await wait(300)
const trailInfo = await page.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find((n) => n.children.length === 0 && /\/\s*8\s*min/.test(n.textContent || ''))
  return el ? el.parentElement?.textContent?.trim().slice(0, 20) : 'odometer-not-found'
})

// ── METRIC A: redraw cost per synthetic pointermove (drag) at OVERVIEW zoom ──
// (zoom=1 → all 1024 tiles pass the viewport cull → the true 1024-tile stress.)
const metricA = await page.evaluate(async (box) => {
  const canvas = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0]
  const N = 120
  const times = []
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  // Prime a pointerdown so paint/loupe path is active.
  canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: cx, clientY: cy, bubbles: true, pointerId: 1, buttons: 1 }))
  for (let i = 0; i < N; i++) {
    const px = box.x + box.w * (0.2 + 0.6 * Math.abs(((i / 12) % 2) - 1))
    const py = box.y + box.h * (0.2 + 0.6 * ((i % 7) / 7))
    const t0 = performance.now()
    canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: px, clientY: py, bubbles: true, pointerId: 1, buttons: 1 }))
    const t1 = performance.now()
    times.push(t1 - t0)
  }
  canvas.dispatchEvent(new PointerEvent('pointerup', { clientX: cx, clientY: cy, bubbles: true, pointerId: 1 }))
  times.sort((a, b) => a - b)
  const sum = times.reduce((s, v) => s + v, 0)
  return { avgMs: sum / times.length, medianMs: times[Math.floor(times.length / 2)], p95Ms: times[Math.floor(times.length * 0.95)], n: N }
}, canvasBox)

// ── METRIC B: cascade rAF fps — plunge, then count browser rAF frames ──
await clickText('PLUNGE')
await wait(250) // let the cascade start
const metricB = await page.evaluate(async () => {
  const DUR = 2200
  let frames = 0
  const t0 = performance.now()
  await new Promise((resolve) => {
    function loop() {
      frames++
      if (performance.now() - t0 >= DUR) resolve()
      else requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  })
  const elapsed = performance.now() - t0
  return { fps: (frames / elapsed) * 1000, frames, elapsedMs: elapsed }
})

console.log(JSON.stringify({ label: LABEL, canvasBox, trailInfo, metricA_redrawCost: metricA, metricB_cascadeFps: metricB }, null, 2))
await browser.close()
