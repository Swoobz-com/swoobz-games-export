// Re-verify FIX 2 (pick-order numeral contrast) live on port 5390.
// Reuses the exact fillText-hook + tight-crop pixel-sampling method the
// original a11y QA sweep used (a11ysweep0707-pickorder-final.mjs).
import puppeteer from 'puppeteer-core'
import { PNG } from 'pngjs'
import fs from 'node:fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5390'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
function luminance([r, g, b]) {
  const a = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) })
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
}
function ratio(fg, bg) { const L1 = luminance(fg) + 0.05, L2 = luminance(bg) + 0.05; return L1 > L2 ? L1 / L2 : L2 / L1 }
function px(png, x, y) {
  const idx = (png.width * Math.min(Math.max(y, 0), png.height - 1) + Math.min(Math.max(x, 0), png.width - 1)) << 2
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2]]
}
function extremes(png) {
  let minL = Infinity, maxL = -Infinity, minC = null, maxC = null
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const c = px(png, x, y); const l = luminance(c)
    if (l < minL) { minL = l; minC = c }
    if (l > maxL) { maxL = l; maxC = c }
  }
  return { minC, maxC }
}
// Sample a pixel a fixed offset AWAY from the glyph crop center (still on the
// coin, past the stroke halo) — the "flat coin face, not the rim" background.
async function facePixelAt(page, pageX, pageY, dx, dy) {
  const clip = { x: Math.max(0, pageX + dx - 2), y: Math.max(0, pageY + dy - 2), width: 4, height: 4 }
  const buf = await page.screenshot({ clip })
  const png = PNG.sync.read(Buffer.from(buf))
  return px(png, 2, 2)
}

async function run(world, g) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
  let out = null
  for (let attempt = 0; attempt < 12 && !out; attempt++) {
    const page = await browser.newPage()
    await page.evaluateOnNewDocument(() => {
      localStorage.clear(); sessionStorage.clear(); window.__log = []
      const o = CanvasRenderingContext2D.prototype.fillText
      CanvasRenderingContext2D.prototype.fillText = function (t, x, y) {
        if (/^\d{1,3}$/.test(String(t))) window.__log.push({ t: String(t), x, y, style: String(this.fillStyle), font: String(this.font) })
        return o.apply(this, arguments)
      }
    })
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 3 })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(1000)
    await page.evaluate((s) => { document.querySelector(`[data-testid="vault-world-card-${s}"]`).click() }, world)
    await wait(300)
    await page.evaluate(() => { [...document.querySelectorAll('button')].find((b) => /send it/i.test(b.textContent)).click() })
    await wait(700)
    for (let k = 0; k < 2; k++) {
      const settled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]') || !!document.querySelector('[data-testid="vault-settled-banner"]'))
      if (settled) break
      const c = await page.evaluate(({ idx, g }) => {
        const cv = document.querySelector('canvas'); const r = cv.getBoundingClientRect()
        const W = r.width, H = r.height, tR = H * 0.15, bR = H * 0.18, sF = 0.08
        const sW = W * (1 - sF * 2), sH = (H - tR - bR) * 0.96, av = Math.min(sW, sH)
        const gap = Math.max(6, av * 0.026), tile = (av - gap * (g - 1)) / g, full = tile * g + gap * (g - 1)
        const x0 = (W - full) / 2, by = tR + (H - tR - bR) / 2, y0 = by - full / 2
        const col = idx % g, row = Math.floor(idx / g)
        return { cx: r.left + x0 + col * (tile + gap) + tile / 2, cy: r.top + y0 + row * (tile + gap) + tile / 2 }
      }, { idx: attempt * 2 + k, g })
      await page.mouse.click(c.cx, c.cy)
      await wait(700)
    }
    const canvasRect = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top } })
    const log = await page.evaluate(() => window.__log || [])
    const cands = log.filter((e) => /^rgba\(255,\s*255,\s*255,/.test(e.style))
    const seen = new Map(); for (const e of cands) seen.set(`${e.t}@${Math.round(e.x)},${Math.round(e.y)}`, e)
    const uniq = [...seen.values()]
    if (uniq.length) {
      const samples = []
      for (const e of uniq) {
        const pageX = canvasRect.left + e.x, pageY = canvasRect.top + e.y
        const m = /([\d.]+)px/.exec(e.font); const fontPx = m ? parseFloat(m[1]) : 12
        const halfW = Math.max(6, fontPx * 0.55 * e.t.length), halfH = Math.max(6, fontPx * 0.62)
        const clip = { x: Math.max(0, pageX - halfW), y: Math.max(0, pageY - halfH), width: halfW * 2, height: halfH * 2 }
        const buf = await page.screenshot({ clip })
        fs.writeFileSync(`shots-fixpass0707/pickorder-${world}-${e.t}-tight.png`, buf)
        const png = PNG.sync.read(Buffer.from(buf))
        const { minC, maxC } = extremes(png)
        const glyphRatio = +ratio(maxC, minC).toFixed(2)
        // "not a rim edge" flat-face background sample: probe several
        // offsets around the glyph and keep the first one that lands on
        // genuine green coin body (green-dominant, not the dark vignette/
        // stroke halo or the coin's black rim).
        const offsets = [
          [-halfW * 1.1, -halfH * 1.6], [halfW * 1.1, -halfH * 1.6],
          [-halfW * 1.6, 0], [halfW * 1.6, 0],
          [-halfW * 0.9, -halfH * 1.1], [halfW * 0.9, -halfH * 1.1],
        ]
        let faceBg = null
        for (const [dx, dy] of offsets) {
          const cand = await facePixelAt(page, pageX, pageY, Math.round(dx), Math.round(dy))
          const [r0, g0, b0] = cand
          if (g0 > r0 + 15 && g0 > b0 + 15 && g0 > 60) { faceBg = cand; break }
        }
        if (!faceBg) faceBg = await facePixelAt(page, pageX, pageY, Math.round(-halfW * 1.1), Math.round(-halfH * 1.6))
        const faceRatio = +ratio(maxC, faceBg).toFixed(2)
        samples.push({ text: e.t, glyphVsStrokeRatio: glyphRatio, fg: maxC, strokeBg: minC, flatFaceBg: faceBg, glyphVsFlatFaceRatio: faceRatio })
        const wide = { x: Math.max(0, pageX - 24), y: Math.max(0, pageY - 24), width: 48, height: 48 }
        const bufw = await page.screenshot({ clip: wide })
        fs.writeFileSync(`shots-fixpass0707/pickorder-${world}-${e.t}-wide.png`, bufw)
      }
      out = { attempt, samples }
    }
    await page.close()
  }
  console.log(world, JSON.stringify(out, null, 2))
  await browser.close()
}
const world = process.argv[3] || 'bluechips'
const g = parseInt(process.argv[4]) || 5
run(world, g).catch((e) => { console.error('FATAL', e); process.exit(1) })
