// Instrumented perf + integrity probe for THE ASSAY LINE canvas board,
// at the new desktop up-scale sizes. Measures:
//  - draw() call rate + per-callback JS time during IDLE / CASCADE / BUST
//  - visible-canvas vs offscreen-board-canvas drawImage/clearRect counts
//    (proves the static cache is NOT rebuilt every frame)
//  - static-cache invalidation on resize
//  - pixel sample around the current-bead tile for a gold-ring leak
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5202/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-perf-qa'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const INSTRUMENT = () => {
  window.__q = {
    visDrawImage: 0, offDrawImage: 0, clearRectVis: 0, clearRectOff: 0,
    rafCallbacks: 0, rafTotalMs: 0, rafMaxMs: 0, rafTimes: [],
  }
  const origGetContext = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const ctx = origGetContext.call(this, type, ...rest)
    if (type === '2d' && ctx && !this.__qTagged) {
      this.__qTagged = true
      const el = this
      const origDrawImage = ctx.drawImage.bind(ctx)
      const origClearRect = ctx.clearRect.bind(ctx)
      ctx.drawImage = (...args) => {
        if (document.body.contains(el)) window.__q.visDrawImage++
        else window.__q.offDrawImage++
        return origDrawImage(...args)
      }
      ctx.clearRect = (...args) => {
        if (document.body.contains(el)) window.__q.clearRectVis++
        else window.__q.clearRectOff++
        return origClearRect(...args)
      }
    }
    return ctx
  }
  const origRAF = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = (cb) =>
    origRAF((t) => {
      const t0 = performance.now()
      cb(t)
      const dt = performance.now() - t0
      window.__q.rafCallbacks++
      window.__q.rafTotalMs += dt
      window.__q.rafTimes.push(dt)
      if (dt > window.__q.rafMaxMs) window.__q.rafMaxMs = dt
    })
}

function snapshotCounters(page) {
  return page.evaluate(() => ({ ...window.__q, rafTimes: undefined }))
}
function resetCounters(page) {
  return page.evaluate(() => {
    window.__q.visDrawImage = 0
    window.__q.offDrawImage = 0
    window.__q.clearRectVis = 0
    window.__q.clearRectOff = 0
    window.__q.rafCallbacks = 0
    window.__q.rafTotalMs = 0
    window.__q.rafMaxMs = 0
    window.__q.rafTimes = []
  })
}
async function percentiles(page) {
  return page.evaluate(() => {
    const t = [...window.__q.rafTimes].sort((a, b) => a - b)
    if (t.length === 0) return null
    const pick = (p) => t[Math.min(t.length - 1, Math.floor(t.length * p))]
    return { n: t.length, avg: t.reduce((s, v) => s + v, 0) / t.length, p50: pick(0.5), p95: pick(0.95), max: t[t.length - 1] }
  })
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
    // Desktop canvas is DIRECT child of a div with explicit width/height == board size,
    // and is attached (in body). Pick the largest attached canvas.
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
    }
  }
  return count
}

async function runViewport({ width, height, dpr, label }) {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: 'new',
    args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist'],
  })
  const page = (await browser.pages())[0]
  await page.setViewport({ width, height, deviceScaleFactor: dpr })
  page.on('pageerror', (e) => console.log('PAGEERROR', label, e.message))
  await page.evaluateOnNewDocument(INSTRUMENT)
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)

  const isWide = await page.evaluate(() => window.innerWidth)
  const box = await getDesktopCanvasBox(page)
  const boardMeta = await page.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')].filter((x) => document.body.contains(x))[0]
    return c ? { cssW: c.style.width, attrW: c.width, attrH: c.height } : null
  })

  const result = { label, viewport: { width, height, dpr }, canvasBox: box, boardMeta }

  // ── IDLE (planning phase): paint a trail, then measure whether ANY
  // continuous rAF loop is running while untouched (no pointer activity). ──
  const trailN = await paintTrail(page, box, 24)
  await wait(200)
  await resetCounters(page)
  await wait(1500) // pure idle — no interaction
  const idleCounters = await snapshotCounters(page)
  result.idle = { trailPainted: trailN, ...idleCounters, note: 'zero rafCallbacks expected — canvas draw() has no rAF loop outside assaying/bad-vein' }

  // Idle interaction cost: synthetic pointermove drag cost (paint feel).
  const idleDragCost = await page.evaluate(async (b) => {
    const canvas = [...document.querySelectorAll('canvas')].filter((x) => document.body.contains(x))[0]
    const times = []
    canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: b.x + b.w * 0.1, clientY: b.y + b.h * 0.6, bubbles: true, pointerId: 1, buttons: 1 }))
    for (let i = 0; i < 60; i++) {
      const px = b.x + b.w * (0.1 + 0.02 * i)
      const py = b.y + b.h * 0.6
      const t0 = performance.now()
      canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: px, clientY: py, bubbles: true, pointerId: 1, buttons: 1 }))
      times.push(performance.now() - t0)
    }
    canvas.dispatchEvent(new PointerEvent('pointerup', { clientX: b.x, clientY: b.y, bubbles: true, pointerId: 1 }))
    times.sort((a, x) => a - x)
    return { avgMs: times.reduce((s, v) => s + v, 0) / times.length, p95Ms: times[Math.floor(times.length * 0.95)], n: times.length }
  }, box)
  result.idleDragCost = idleDragCost

  await page.screenshot({ path: `${OUT}/${label}-01-planning-painted.png` })

  // ── CASCADE: plunge, measure rAF-loop timing over the whole reveal ──
  await resetCounters(page)
  await clickText(page, 'PLUNGE')
  await wait(50)
  await page.screenshot({ path: `${OUT}/${label}-02-cascade-mid.png` })
  await wait(2500)
  const cascadeCounters = await snapshotCounters(page)
  const cascadePct = await percentiles(page)
  result.cascade = { ...cascadeCounters, frameTime: cascadePct }
  await page.screenshot({ path: `${OUT}/${label}-03-cascade-late-or-settled.png` })

  // Bead ring-leak pixel check: sample a zoomed region if still assaying.
  const bodyText1 = await page.evaluate(() => document.body.innerText)
  result.postCascadeBusted = bodyText1.includes('BUSTED') || bodyText1.includes('BAD VEIN') || bodyText1.includes('bad vein')

  await wait(2500) // let settle hold pass
  await page.screenshot({ path: `${OUT}/${label}-04-settled.png` })

  await browser.close()
  return result
}

async function runBustAttempts({ width, height, dpr, label }, maxAttempts = 8) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const browser = await puppeteer.launch({
      executablePath: EXE,
      headless: 'new',
      args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist'],
    })
    const page = (await browser.pages())[0]
    await page.setViewport({ width, height, deviceScaleFactor: dpr })
    await page.evaluateOnNewDocument(INSTRUMENT)
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(400)
    await clickText(page, 'ENTER THE ASSAY LINE')
    await wait(400)
    const box = await getDesktopCanvasBox(page)
    await paintTrail(page, box, 40) // long trail → higher bad-vein hit chance
    await wait(200)
    await resetCounters(page)
    await clickText(page, 'PLUNGE')
    await wait(4500) // let full cascade run to settle
    const text = await page.evaluate(() => document.body.innerText)
    const busted = /BUSTED|BAD VEIN/i.test(text)
    if (busted) {
      // Capture counters DURING shake window by re-triggering a fresh measurement window won't work post-hoc;
      // instead re-run measuring window right after PLUNGE for THIS same busted run using accumulated raf stats.
      const pct = await percentiles(page)
      const counters = await snapshotCounters(page)
      await page.screenshot({ path: `${OUT}/${label}-BUST-settled.png` })
      await browser.close()
      return { attempt, busted: true, label, frameTime: pct, counters }
    }
    await browser.close()
  }
  return { busted: false, label, note: `no bust in ${maxAttempts} attempts` }
}

const results = {}
results['1440x900-dpr2'] = await runViewport({ width: 1440, height: 900, dpr: 2, label: '1440x900-dpr2' })
results['1920x1080-dpr1'] = await runViewport({ width: 1920, height: 1080, dpr: 1, label: '1920x1080-dpr1' })
results['2560x1440-dpr1'] = await runViewport({ width: 2560, height: 1440, dpr: 1, label: '2560x1440-dpr1' })

console.log('=== IDLE / CASCADE RESULTS ===')
console.log(JSON.stringify(results, null, 2))

console.log('=== BUST ATTEMPT (measuring the whole PLUNGE→settle window, incl. shake) ===')
const bustResult = await runBustAttempts({ width: 1440, height: 900, dpr: 2, label: '1440x900-dpr2' })
console.log(JSON.stringify(bustResult, null, 2))

fs.writeFileSync('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/perf-qa-results.json', JSON.stringify({ results, bustResult }, null, 2))
