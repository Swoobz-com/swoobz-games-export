// v2: bucketed frame-cost (rebuild vs blit-only), resize static-cache
// invalidation test, and pixel-level bead-boundary ring-leak check.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5202/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-perf-qa'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const INSTRUMENT = () => {
  window.__q = { frames: [] } // {dt, offDelta}
  window.__offCount = 0
  const origGetContext = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const ctx = origGetContext.call(this, type, ...rest)
    if (type === '2d' && ctx && !this.__qTagged) {
      this.__qTagged = true
      const el = this
      const origDrawImage = ctx.drawImage.bind(ctx)
      ctx.drawImage = (...args) => {
        if (!document.body.contains(el)) window.__offCount++
        return origDrawImage(...args)
      }
    }
    return ctx
  }
  const origRAF = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = (cb) =>
    origRAF((t) => {
      const offBefore = window.__offCount
      const t0 = performance.now()
      cb(t)
      const dt = performance.now() - t0
      window.__q.frames.push({ dt, offDelta: window.__offCount - offBefore })
    })
}
const resetFrames = (page) => page.evaluate(() => { window.__q.frames = [] })
const getFrames = (page) => page.evaluate(() => window.__q.frames)

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
    }
  }
  return count
}
function bucket(frames) {
  const rebuild = frames.filter((f) => f.offDelta > 0)
  const blit = frames.filter((f) => f.offDelta === 0)
  const stats = (arr) => {
    if (arr.length === 0) return null
    const t = arr.map((f) => f.dt).sort((a, b) => a - b)
    return { n: t.length, avg: t.reduce((s, v) => s + v, 0) / t.length, p50: t[Math.floor(t.length * 0.5)], p95: t[Math.floor(t.length * 0.95)], max: t[t.length - 1] }
  }
  return { total: frames.length, rebuildFrames: stats(rebuild), blitOnlyFrames: stats(blit) }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: 'new',
    args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist'],
  })
  const page = (await browser.pages())[0]
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
  await page.evaluateOnNewDocument(INSTRUMENT)
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  let box = await getDesktopCanvasBox(page)
  await paintTrail(page, box, 24)
  await wait(200)

  // ── RESIZE static-cache invalidation test ──────────────────────────────
  await resetFrames(page)
  const offBeforeResize = await page.evaluate(() => window.__offCount)
  await page.screenshot({ path: `${OUT}/resize-A-before-1440x900.png` })
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))
  await wait(300)
  const offAfterResize = await page.evaluate(() => window.__offCount)
  const boxAfterResize = await getDesktopCanvasBox(page)
  await page.screenshot({ path: `${OUT}/resize-B-after-1920x1080.png` })
  const resizeTest = {
    boardBoxBefore: box,
    boardBoxAfter: boxAfterResize,
    offscreenDrawImageCallsBeforeResize: offBeforeResize,
    offscreenDrawImageCallsAfterResize: offAfterResize,
    rebuildTriggered: offAfterResize > offBeforeResize,
    sizeActuallyChanged: boxAfterResize.w !== box.w,
  }

  box = boxAfterResize
  await paintTrail(page, box, 24)
  await wait(200)

  // ── CASCADE bucketed frame cost ─────────────────────────────────────────
  await resetFrames(page)
  await clickText(page, 'PLUNGE')

  // Mid-cascade: pixel sample around the current-bead tile for a ring leak.
  await wait(120)
  const beadSample = await page.evaluate(() => {
    const canvas = [...document.querySelectorAll('canvas')].filter((x) => document.body.contains(x))[0]
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    const dpr = canvas.width / canvas.getBoundingClientRect().width
    // Find the volt-colored region by scanning for a cyan-ish pixel (#00f0ff family).
    const w = canvas.width, h = canvas.height
    const img = ctx.getImageData(0, 0, w, h).data
    let beadX = -1, beadY = -1
    outer: for (let y = 0; y < h; y += 3) {
      for (let x = 0; x < w; x += 3) {
        const i = (y * w + x) * 4
        const r = img[i], g = img[i + 1], b = img[i + 2]
        if (r < 40 && g > 180 && b > 180) { beadX = x; beadY = y; break outer }
      }
    }
    if (beadX < 0) return { found: false }
    // Sample a ring of pixels at increasing radius from the bead center outward,
    // looking for a stray thin gold (#e8b03d ~ 232,176,61) ring pixel right at
    // the tile edge that shouldn't be there under the volt fill.
    const sampleRadii = [4, 8, 12, 16, 20, 24, 28, 32].map((r) => r * dpr)
    const goldHits = []
    for (const r of sampleRadii) {
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2
        const x = Math.round(beadX + Math.cos(ang) * r)
        const y = Math.round(beadY + Math.sin(ang) * r)
        if (x < 0 || y < 0 || x >= w || y >= h) continue
        const i = (y * w + x) * 4
        const r255 = img[i], g255 = img[i + 1], b255 = img[i + 2], al = img[i + 3]
        const goldDist = Math.hypot(r255 - 232, g255 - 176, b255 - 61)
        if (goldDist < 25 && al > 200) goldHits.push({ x, y, radius: Math.round(r / dpr), rgb: [r255, g255, b255] })
      }
    }
    return { found: true, beadPx: [beadX, beadY], dpr, goldHitsNearBead: goldHits }
  })

  await wait(1900)
  const cascadeFrames = bucket(await getFrames(page))
  await page.screenshot({ path: `${OUT}/cascade-mid-1920x1080.png` })

  // ── BUST attempt at this viewport (retry a few times) ───────────────────
  let bustFrames = null
  let busted = false
  for (let attempt = 0; attempt < 6 && !busted; attempt++) {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
    await wait(300)
    await clickText(page, 'ENTER THE ASSAY LINE')
    await wait(300)
    const b2 = await getDesktopCanvasBox(page)
    await paintTrail(page, b2, 40)
    await wait(150)
    await resetFrames(page)
    await clickText(page, 'PLUNGE')
    await wait(4200)
    const text = await page.evaluate(() => document.body.innerText)
    if (/BUSTED|BAD VEIN/i.test(text)) {
      busted = true
      bustFrames = bucket(await getFrames(page))
      await page.screenshot({ path: `${OUT}/bust-1920x1080.png` })
    }
  }

  console.log(JSON.stringify({ resizeTest, beadSample, cascadeFrames, bustBusted: busted, bustFrames }, null, 2))
  await browser.close()
}
main()
