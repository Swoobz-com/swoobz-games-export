// 3D-scene-QA style perf+integrity probe (adapted to canvas-2D) for THE ASSAY
// LINE 20x20 revise pass. Measures per-viewport frame-delta cost (idle /
// cascade / bust), gradient-creation temporal distribution (to catch any
// per-frame-forever gradient like the retired drawGaugeStrip), canvas/sprite
// creation count (decode-once proof), static-cache rebuild batching on
// resize, and missing-texture (#FF00FF) pixel sampling.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5555/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const INSTRUMENT = () => {
  window.__frames = [] // {t, selfMs} per rAF callback invocation
  window.__gradients = [] // timestamps of every createLinearGradient/createRadialGradient call
  window.__canvasCreates = 0
  window.__offscreenBatches = [] // {start,end,ops} — static-board rebuild batches (detached canvas ctx ops)

  const origCreateElement = document.createElement.bind(document)
  document.createElement = (tag, ...rest) => {
    const el = origCreateElement(tag, ...rest)
    if (String(tag).toLowerCase() === 'canvas') window.__canvasCreates++
    return el
  }

  const origRAF = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = (cb) => {
    return origRAF((t) => {
      const s = performance.now()
      cb(t)
      window.__frames.push({ t: s, selfMs: performance.now() - s })
    })
  }

  let cur = null
  const GAP_MS = 8
  const markOffscreen = () => {
    const t = performance.now()
    if (!cur || t - cur.end > GAP_MS) {
      cur = { start: t, end: t, ops: 0 }
      window.__offscreenBatches.push(cur)
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
          if (!document.body.contains(el)) markOffscreen()
          return orig(...args)
        }
      }
      const origLin = ctx.createLinearGradient.bind(ctx)
      ctx.createLinearGradient = (...args) => {
        window.__gradients.push({ t: performance.now(), kind: 'linear', attached: document.body.contains(el) })
        return origLin(...args)
      }
      const origRad = ctx.createRadialGradient.bind(ctx)
      ctx.createRadialGradient = (...args) => {
        window.__gradients.push({ t: performance.now(), kind: 'radial', attached: document.body.contains(el) })
        return origRad(...args)
      }
    }
    return ctx
  }
}

const clickText = (page, txt) =>
  page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
    if (b) {
      b.click()
      return true
    }
    return false
  }, txt)

const bodyIncludes = (page, txt) =>
  page.evaluate((t) => document.body.innerText.includes(t), txt)

async function getBiggestCanvasBox(page) {
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

async function paintSerpentine(page, box, n) {
  const tile = box.w / 20
  let count = 0
  outer: for (let row = 0; row < 20; row++) {
    const cols = row % 2 === 0 ? [...Array(20).keys()] : [...Array(20).keys()].reverse()
    for (const col of cols) {
      if (count >= n) break outer
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      count++
    }
  }
  return count
}

function frameStats(frames) {
  if (frames.length < 2) return { n: frames.length }
  const deltas = []
  for (let i = 1; i < frames.length; i++) deltas.push(frames[i].t - frames[i - 1].t)
  deltas.sort((a, b) => a - b)
  const selfMs = frames.map((f) => f.selfMs).sort((a, b) => a - b)
  const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))]
  const over16 = deltas.filter((d) => d > 16.67).length
  const over33 = deltas.filter((d) => d > 33.33).length
  return {
    frames: frames.length,
    avgDeltaMs: +(deltas.reduce((s, v) => s + v, 0) / deltas.length).toFixed(3),
    p50DeltaMs: +pct(deltas, 0.5).toFixed(3),
    p95DeltaMs: +pct(deltas, 0.95).toFixed(3),
    maxDeltaMs: +deltas[deltas.length - 1].toFixed(3),
    pctFramesOver16_67ms: +((over16 / deltas.length) * 100).toFixed(2),
    pctFramesOver33_33ms: +((over33 / deltas.length) * 100).toFixed(2),
    avgSelfMs: +(selfMs.reduce((s, v) => s + v, 0) / selfMs.length).toFixed(4),
    maxSelfMs: +selfMs[selfMs.length - 1].toFixed(4),
    impliedFps: +(1000 / (deltas.reduce((s, v) => s + v, 0) / deltas.length)).toFixed(1),
  }
}

function gradientWindowStats(gradients, winStartMs, winEndMs) {
  const inWin = gradients.filter((g) => g.t >= winStartMs && g.t <= winEndMs)
  const durS = (winEndMs - winStartMs) / 1000
  return { count: inWin.length, perSecond: +(inWin.length / durS).toFixed(2), attachedCount: inWin.filter((g) => g.attached).length }
}

async function samplePixels(page, box) {
  return page.evaluate((b) => {
    const cs = [...document.querySelectorAll('canvas')]
    const c = cs.find((cc) => {
      const r = cc.getBoundingClientRect()
      return Math.abs(r.width - b.w) < 2
    })
    if (!c) return null
    const ctx = c.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const w = c.width
    const h = c.height
    const pts = []
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const x = Math.floor((w * (i + 0.5)) / 3)
        const y = Math.floor((h * (j + 0.5)) / 3)
        pts.push([x, y])
      }
    }
    const hits = []
    for (const [x, y] of pts) {
      const d = ctx.getImageData(x, y, 1, 1).data
      hits.push({ x, y, r: d[0], g: d[1], b: d[2], a: d[3] })
    }
    return hits
  }, box)
}

function magentaHits(pixels) {
  if (!pixels) return 0
  return pixels.filter((p) => Math.abs(p.r - 255) <= 10 && Math.abs(p.g - 0) <= 10 && Math.abs(p.b - 255) <= 10).length
}

async function main() {
  const results = {}
  const viewports = [
    { width: 1440, height: 900, label: '1440x900' },
    { width: 1920, height: 1080, label: '1920x1080' },
    { width: 2560, height: 1440, label: '2560x1440' },
  ]
  for (const vp of viewports) {
    const browser = await puppeteer.launch({
      executablePath: EXE,
      headless: 'new',
      args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist'],
    })
    const page = (await browser.pages())[0]
    const imgRequests = []
    page.on('response', (resp) => {
      const u = resp.url()
      if (/coin-dormant|coin-proven/.test(u)) imgRequests.push({ url: u, status: resp.status() })
    })
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 })
    await page.evaluateOnNewDocument(INSTRUMENT)
    const consoleErrors = []
    page.on('pageerror', (e) => consoleErrors.push(String(e)))
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(400)
    await clickText(page, 'ENTER THE ASSAY LINE')
    await wait(400)
    const box = await getBiggestCanvasBox(page)

    // Paint MIN_TRAIL(8) tiles then measure a true IDLE window (planning,
    // fully-static board except the rAF loop's cheap dynamic-layer branch
    // checks — no reveal/pop/press active).
    await paintSerpentine(page, box, 8)
    await wait(300)
    await page.evaluate(() => {
      window.__frames = []
      window.__gradients = []
    })
    await wait(1200)
    const idleFrames = await page.evaluate(() => window.__frames)
    const idleGradients = await page.evaluate(() => window.__gradients)
    const idleWinEnd = await page.evaluate(() => performance.now())

    // Clear the trail and paint a long serpentine (high bad-vein exposure,
    // 16/400 bomb density) so we can measure a genuine cascade AND attempt a
    // genuine bad-vein bust in the same run.
    await clickText(page, 'CLEAR')
    await wait(150)
    const painted = await paintSerpentine(page, box, 60)
    await wait(200)
    await page.evaluate(() => {
      window.__frames = []
      window.__gradients = []
    })
    const throwStart = await page.evaluate(() => performance.now())
    await clickText(page, 'THROW BREAKER')

    // Poll for bust or settle for up to 6s, sampling frames the whole time.
    let sawBust = false
    let sawSettled = false
    for (let i = 0; i < 60; i++) {
      await wait(100)
      const txt = await page.evaluate(() => document.body.innerText)
      if (/BAD VEIN|BUSTED/i.test(txt)) sawBust = true
      if (/GLASS BOX CERTIFICATE|SECURED/i.test(txt)) sawSettled = true
      if (sawBust || sawSettled) break
    }
    const cascadeEnd = await page.evaluate(() => performance.now())
    await wait(400) // let bad-vein hold / settle finish
    const allFrames = await page.evaluate(() => window.__frames)
    const allGradients = await page.evaluate(() => window.__gradients)

    // Split cascade frames into "cascade" (throw->bust/settle detected) vs
    // "post" (settle hold) purely by timestamp.
    const cascadeFrames = allFrames.filter((f) => f.t <= cascadeEnd)
    const postFrames = allFrames.filter((f) => f.t > cascadeEnd)

    const pixels = await samplePixels(page, box)

    // Static-cache invalidation on resize: count offscreen-canvas rebuild
    // batches triggered by a real viewport resize.
    await page.evaluate(() => {
      window.__offscreenBatches = []
    })
    const resizedH = vp.height + 120
    await page.setViewport({ width: vp.width, height: resizedH, deviceScaleFactor: 1 })
    await wait(500)
    const resizeBatches = await page.evaluate(() => window.__offscreenBatches)

    const shotDir = 'qa3d-shots'
    fs.mkdirSync(shotDir, { recursive: true })
    await page.screenshot({ path: `${shotDir}/${vp.label}-post.png` })

    results[vp.label] = {
      canvasBox: box,
      paintedCount: painted,
      idle: frameStats(idleFrames),
      idleGradientsPerSec: gradientWindowStats(idleGradients, 0, idleWinEnd).perSecond,
      cascade: frameStats(cascadeFrames),
      cascadeGradients: gradientWindowStats(allGradients, throwStart, cascadeEnd),
      post: frameStats(postFrames),
      postGradients: gradientWindowStats(allGradients, cascadeEnd, cascadeEnd + 5000),
      sawBust,
      sawSettled,
      canvasCreatesTotal: await page.evaluate(() => window.__canvasCreates),
      coinImageRequests: imgRequests,
      resizeOffscreenBatches: resizeBatches.map((b) => b.ops),
      resizeBatchCount: resizeBatches.length,
      magentaPixelHits: magentaHits(pixels),
      samplePixels: pixels,
      consoleErrors,
    }
    await browser.close()
  }
  fs.writeFileSync('qa3d-revise-results.json', JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
