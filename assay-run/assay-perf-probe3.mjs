// v3: directly time the SYNCHRONOUS static-board rebuild (fired from the
// board-state-change effect, NOT inside the rAF loop) by grouping offscreen
// canvas ops into batches by temporal proximity, so we get the true wall-clock
// cost of a real "staticDirtyRef rebuild" event — separate from the cheap
// blit-only rAF ticks measured in probe/probe2.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5202/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const INSTRUMENT = () => {
  window.__rebuilds = [] // {start,end,ops}
  let cur = null
  const GAP_MS = 8 // new batch if idle gap exceeds this
  const mark = () => {
    const t = performance.now()
    if (!cur || t - cur.end > GAP_MS) {
      cur = { start: t, end: t, ops: 0 }
      window.__rebuilds.push(cur)
    }
    cur.end = t
    cur.ops++
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
async function paintTrail(page, box, n) {
  const tile = box.w / 32
  let count = 0
  for (let row = 3; row < 30 && count < n; row += 2) {
    for (let col = 2; col < 30 && count < n; col += 3) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      count++
      await wait(15) // let each click's rebuild settle into its own batch
    }
  }
  return count
}
function summarize(rebuilds, minOps = 100) {
  const real = rebuilds.filter((r) => r.ops >= minOps) // filter noise batches (bead pulse etc. don't touch offscreen)
  const durations = real.map((r) => r.end - r.start)
  durations.sort((a, b) => a - b)
  if (durations.length === 0) return { n: 0 }
  return {
    n: durations.length,
    avgMs: durations.reduce((s, v) => s + v, 0) / durations.length,
    p50Ms: durations[Math.floor(durations.length * 0.5)],
    p95Ms: durations[Math.floor(durations.length * 0.95)],
    maxMs: durations[durations.length - 1],
    opsPerBatch: real[0].ops,
  }
}

async function main() {
  const results = {}
  for (const vp of [
    { width: 1440, height: 900, dpr: 2, label: '1440x900-dpr2-board660' },
    { width: 2560, height: 1440, dpr: 1, label: '2560x1440-dpr1-board960' },
  ]) {
    const browser = await puppeteer.launch({
      executablePath: EXE, headless: 'new',
      args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist'],
    })
    const page = (await browser.pages())[0]
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dpr })
    await page.evaluateOnNewDocument(INSTRUMENT)
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(400)
    await clickText(page, 'ENTER THE ASSAY LINE')
    await wait(400)
    const box = await getDesktopCanvasBox(page)

    // Drag-paint rebuild cost: each added tile is a real board-state change.
    await page.evaluate(() => { window.__rebuilds = [] })
    await paintTrail(page, box, 24)
    const paintRebuilds = await page.evaluate(() => window.__rebuilds)

    await wait(150)
    await page.evaluate(() => { window.__rebuilds = [] })
    await clickText(page, 'PLUNGE')
    await wait(2600)
    const cascadeRebuilds = await page.evaluate(() => window.__rebuilds)

    results[vp.label] = {
      canvasBox: box,
      dragPaintRebuild: summarize(paintRebuilds),
      cascadeRebuild: summarize(cascadeRebuilds),
      rawBatchCountsPaint: paintRebuilds.map((r) => r.ops),
      rawBatchCountsCascade: cascadeRebuilds.map((r) => r.ops),
    }
    await browser.close()
  }
  console.log(JSON.stringify(results, null, 2))
}
main()
