// visreg-vaultplate-capture-0706.mjs — INDEPENDENT swoobz-visual-regression-qa
// driver for the VAULT-PLATE control-column-chrome-unification change.
// Fresh port (6612, --strictPort), own screenshots dir. Mirrors the EXACT
// viewport/click/wait sequence of the pre-change baseline capture
// (autisk-cohesion-0706.mjs -> shots-cohesion-0706/) so the new PNGs are
// pixel-comparable frame-for-frame against that prior baseline, PLUS a
// from-scratch DOM-geometry + scenic-backdrop-variance pass across
// lobby/betEntry/playing/settled on desktop (1440x900) AND mobile
// (Pixel 7 412x915, iPhone 14 Pro 393x852).
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 6612
const OUT = 'shots-visreg-vaultplate-0706'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(
    ({ t, within }) => {
      const root = within ? document.querySelector(within) : document
      if (!root) return null
      const els = [...root.querySelectorAll('button,[role=button],a')]
      const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
      const lc = t.toLowerCase()
      return (
        els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
        els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) ||
        null
      )
    },
    { t, within },
  )
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
async function clickSel(page, sel) {
  const h = await page.$(sel)
  if (!h) return false
  try { await h.click() } catch { return false }
  return true
}
async function dismiss(page) {
  await clickText(page, 'got it')
  await clickText(page, 'skip')
  await wait(150)
}
async function rect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }
  }, sel)
}
async function ctaAudit(page) {
  return page.evaluate(() => {
    const wrap = document.querySelector('[data-testid="vault-ctl-cta"]')
    if (!wrap) return null
    const r = wrap.getBoundingClientRect()
    return { bottom: Math.round(r.bottom), top: Math.round(r.top), innerHeight: window.innerHeight, aboveFold: r.bottom <= window.innerHeight }
  })
}
// scenic-backdrop 3x3 sample variance probe (Probe 2), sampled on the
// board/backdrop canvas region, excluding the control column.
async function scenicVariance(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]') || document.querySelector('canvas')
    if (!shell) return null
    const r = shell.getBoundingClientRect()
    const c = document.createElement('canvas')
    c.width = 300; c.height = 200
    const ctx = c.getContext('2d')
    // draw the current DOM paint isn't directly readable without html2canvas;
    // fall back to reading the underlying <canvas> pixel buffer directly if present.
    const gameCanvas = document.querySelector('canvas')
    if (!gameCanvas) return { note: 'no-canvas-found' }
    let gctx
    try { gctx = gameCanvas.getContext('2d', { willReadFrequently: true }) } catch { gctx = null }
    if (!gctx) return { note: 'canvas-context-unreadable(webgl-or-tainted)' }
    const cw = gameCanvas.width, ch = gameCanvas.height
    const pts = []
    for (let iy = 0; iy < 3; iy++) {
      for (let ix = 0; ix < 3; ix++) {
        const fx = 0.12 + ix * 0.38
        const fy = 0.12 + iy * 0.38
        const px = Math.min(cw - 1, Math.round(cw * fx))
        const py = Math.min(ch - 1, Math.round(ch * fy))
        try {
          const d = gctx.getImageData(px, py, 1, 1).data
          pts.push([d[0], d[1], d[2]])
        } catch (e) {
          pts.push(null)
        }
      }
    }
    return { pts, cw, ch }
  })
}
function varianceOfSamples(pts) {
  if (!pts || pts.some((p) => !p)) return null
  const variances = pts.map((p, i) => {
    // compare each sample to the mean of all samples (channel-wise), report max channel variance-like spread
    return p
  })
  // compute per-channel stddev across the 9 points as a single scalar proxy
  const chans = [0, 1, 2].map((c) => pts.map((p) => p[c]))
  const means = chans.map((arr) => arr.reduce((a, b) => a + b, 0) / arr.length)
  const vars = chans.map((arr, ci) => arr.reduce((a, b) => a + (b - means[ci]) ** 2, 0) / arr.length)
  return Math.max(...vars) ** 0.5 // stddev, treat like "variance" proxy per spec's loose usage
}

const results = { port: PORT, out: OUT, desktop: {}, mobile: {} }
const PHASES = ['lobby', 'betEntry', 'playing', 'settled']

async function capturePhaseGeom(page, obj) {
  obj.control = await rect(page, '[data-testid="DesktopControlColumn"]')
  obj.board = await rect(page, '[data-testid="vault-canvas-shell"]')
  obj.mainGrid = await rect(page, '[data-testid="vault-grid-mainGrid"]')
  obj.header = await rect(page, '[data-testid="vault-grid-topbar"]') || await rect(page, '[data-testid="vault-grid-status"]')
  obj.cta = await ctaAudit(page)
  const sv = await scenicVariance(page)
  obj.scenic = sv && sv.pts ? { stddev: varianceOfSamples(sv.pts), raw: sv.pts } : sv
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))

  // ── PART A: pixel-comparable capture mirroring shots-cohesion-0706 exactly ──
  const WORLDS = ['bluechips', 'altseason', 'shitcoin']
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  const deskGeom = {}
  for (const world of WORLDS) {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(700)
    await dismiss(page)
    await clickText(page, 'ape in')
    await wait(900)
    await clickSel(page, `[data-testid="vault-world-card-${world}"]`)
    await wait(500)
    deskGeom[world] = {}
    deskGeom[world].lobby = {}
    await capturePhaseGeom(page, deskGeom[world].lobby)
    await page.screenshot({ path: `${OUT}/${world}-lobby-desktop.png` })

    await clickText(page, 'send it')
    await wait(1100)
    deskGeom[world].playing = {}
    await capturePhaseGeom(page, deskGeom[world].playing)
    await page.screenshot({ path: `${OUT}/${world}-playing-desktop.png` })

    const bx = Math.round(1440 * 0.30), by = Math.round(900 * 0.42)
    try { await page.mouse.click(bx, by) } catch {}
    await wait(700)
    try { await page.mouse.click(Math.round(1440 * 0.38), Math.round(900 * 0.50)) } catch {}
    await wait(700)
    await clickText(page, 'take profit')
    await wait(1200)
    deskGeom[world].settled = {}
    await capturePhaseGeom(page, deskGeom[world].settled)
    await page.screenshot({ path: `${OUT}/${world}-settled-desktop.png` })
  }
  results.desktop.geom = deskGeom

  // mobile altseason 3 phases, mirroring the 390x844@dpr2 baseline framing
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(700)
  await dismiss(page)
  await clickText(page, 'ape in')
  await wait(900)
  await clickSel(page, '[data-testid="vault-world-card-altseason"]')
  await wait(500)
  await page.screenshot({ path: `${OUT}/altseason-lobby-mobile.png` })
  await clickText(page, 'send it')
  await wait(1100)
  await page.screenshot({ path: `${OUT}/altseason-playing-mobile.png` })
  try { await page.mouse.click(Math.round(390 * 0.5), Math.round(844 * 0.42)) } catch {}
  await wait(700)
  try { await page.mouse.click(Math.round(390 * 0.5), Math.round(844 * 0.55)) } catch {}
  await wait(700)
  await clickText(page, 'take profit')
  await wait(1200)
  await page.screenshot({ path: `${OUT}/altseason-settled-mobile.png` })

  // ── PART B: full 4-phase geometry pass on desktop 1440x900 + Pixel 7 + iPhone14Pro ──
  const devices = [
    { name: 'desktop-1440x900', w: 1440, h: 900 },
    { name: 'pixel7', w: 412, h: 915 },
    { name: 'iphone14pro', w: 393, h: 852 },
  ]
  results.fullGeom = {}
  for (const d of devices) {
    await page.setViewport({ width: d.w, height: d.h, deviceScaleFactor: 1 })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(700)
    await dismiss(page)
    results.fullGeom[d.name] = {}

    results.fullGeom[d.name].lobby = {}
    await capturePhaseGeom(page, results.fullGeom[d.name].lobby)
    await page.screenshot({ path: `${OUT}/geom-${d.name}-lobby.png`, fullPage: true })

    await clickText(page, 'ape in')
    await wait(700)
    results.fullGeom[d.name].betEntry = {}
    await capturePhaseGeom(page, results.fullGeom[d.name].betEntry)
    await page.screenshot({ path: `${OUT}/geom-${d.name}-betentry.png`, fullPage: true })

    await clickText(page, 'shitcoin')
    await wait(200)
    await clickText(page, 'send it')
    await wait(900)
    results.fullGeom[d.name].playing = {}
    await capturePhaseGeom(page, results.fullGeom[d.name].playing)
    await page.screenshot({ path: `${OUT}/geom-${d.name}-playing.png`, fullPage: true })

    // force settle
    const cellSeq = [[0,0],[6,6],[3,3],[1,5],[5,1],[2,4],[4,2],[0,6],[6,0],[1,1],[5,5],[2,2],[4,4],[3,0],[0,3],[6,3]]
    for (const [cx, cy] of cellSeq) {
      const settledNow = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
      if (settledNow) break
      const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
      if (box) {
        const fx = 0.05 + ((cx + 0.5) / 7) * 0.9
        const fy = 0.06 + ((cy + 0.5) / 7) * 0.82
        await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
      }
      await wait(350)
    }
    await wait(600)
    results.fullGeom[d.name].settled = {}
    await capturePhaseGeom(page, results.fullGeom[d.name].settled)
    await page.screenshot({ path: `${OUT}/geom-${d.name}-settled.png`, fullPage: true })

    const tops = PHASES.map((p) => results.fullGeom[d.name][p]?.board?.top)
    results.fullGeom[d.name].boardTopsAcrossPhases = tops
    results.fullGeom[d.name].boardTopStable = tops.every((t) => t === tops[0])
    const ctlEdges = PHASES.map((p) => ({ left: results.fullGeom[d.name][p]?.control?.left, right: results.fullGeom[d.name][p]?.control?.right }))
    results.fullGeom[d.name].controlEdgesAcrossPhases = ctlEdges
  }

  results.consoleErrors = consoleErrors
  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log('DONE')
  console.log(JSON.stringify(results, null, 2))
}

run().catch((e) => { console.error('FATAL', e); process.exit(1) })
