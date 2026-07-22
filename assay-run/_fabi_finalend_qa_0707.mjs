// CONSOLIDATED FULL-QA END-GATE driver (swoobz-brand-cohesion-qa, 2026-07-07)
// ABYSS LINE (assay), CHECK ROUND ONLY. Independent driver, own screenshots dir.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import { PNG } from 'pngjs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-fabi-finalend-0707'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function clickText(page, re) {
  return page.evaluate((rs) => {
    const r = new RegExp(rs, 'i')
    const els = [...document.querySelectorAll('button, div, span')]
    const b = els.find((x) => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
    if (b) { b.click(); return b.textContent.trim() }
    return null
  }, re.source)
}
const bodyText = (page) => page.evaluate(() => document.body.innerText)

async function boardGeo(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { left: r.left, top: r.top, w: r.width, h: r.height }
  })
}

async function ensurePace(page, desired) {
  for (let i = 0; i < 3; i++) {
    const label = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button, div, span')].find((x) => /^PACE:/.test((x.textContent || '').trim()))
      return b ? b.textContent.trim() : null
    })
    if (!label) return null
    const isInstant = /INSTANT/i.test(label)
    if ((desired === 'instant' && isInstant) || (desired === 'staggered' && !isInstant)) return label
    await clickText(page, /^PACE:/)
    await wait(120)
  }
  return null
}

async function selectTier(page, re) {
  return clickText(page, re)
}

function readPixel(png, x, y) {
  x = Math.round(x); y = Math.round(y)
  const idx = (png.width * y + x) << 2
  return { r: png.data[idx], g: png.data[idx + 1], b: png.data[idx + 2], a: png.data[idx + 3] }
}
function relLum({ r, g, b }) {
  const toLin = (c) => { c = c / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b)
}
function hex({ r, g, b }) { return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('') }

async function shotPng(page, name) {
  const p = `${OUT}/${name}.png`
  await page.screenshot({ path: p })
  return PNG.sync.read(fs.readFileSync(p))
}

const report = { title: null, mtimeCheck: null, screens: {}, luminance: {}, cyanSweep: {}, fontFamily: {}, wordmark: {}, colorRoleGrep: {} }

async function main() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: false, args: ['--window-size=1500,1000'] })
  const page = await browser.newPage()
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message))
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  report.title = await page.title()
  await wait(400)

  // ---- LOBBY screenshot + wordmark check ----
  await shotPng(page, 'lobby-full')
  const wm = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('span')]
    const s = spans.find((x) => x.textContent.trim() === 'SWOOBZ' && x.children.length === 0)
    if (!s) return null
    const r = s.getBoundingClientRect()
    const cs = getComputedStyle(s)
    return {
      rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height },
      color: cs.color, fontFamily: cs.fontFamily, opacity: cs.opacity, fontSize: cs.fontSize,
      withinViewport: r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
      textContent: s.textContent,
    }
  })
  report.wordmark.lobby = wm
  if (wm) {
    await page.screenshot({ path: `${OUT}/wordmark-crop.png`, clip: { x: Math.max(0, wm.rect.left - 40), y: Math.max(0, wm.rect.top - 20), width: wm.rect.w + 80, height: wm.rect.h + 40 } })
  }

  // ---- Font family probe: numerals vs prose ----
  const fonts = await page.evaluate(() => {
    const leaves = [...document.querySelectorAll('div,span,button')].filter((e) => e.children.length === 0 && e.textContent.trim().length > 0)
    const numeric = leaves.filter((e) => /^\s*[$]?[\d.,]+\s*(x|X|USDC|%)?\s*$/.test(e.textContent) || /\d/.test(e.textContent) && e.textContent.trim().length < 20 && /[\d]/.test(e.textContent[0] || ''))
    const out = []
    for (const e of numeric.slice(0, 40)) {
      out.push({ text: e.textContent.trim().slice(0, 30), fontFamily: getComputedStyle(e).fontFamily })
    }
    return out
  })
  report.fontFamily.numericSamples = fonts

  const proseFonts = await page.evaluate(() => {
    const leaves = [...document.querySelectorAll('div,span,button')].filter((e) => e.children.length === 0 && e.textContent.trim().length > 8 && /[a-z]{4,}/i.test(e.textContent))
    return leaves.slice(0, 15).map((e) => ({ text: e.textContent.trim().slice(0, 40), fontFamily: getComputedStyle(e).fontFamily }))
  })
  report.fontFamily.proseSamples = proseFonts

  // ---- DOM/canvas cyan-family live sweep ----
  const cyanDom = await page.evaluate(() => {
    const hits = []
    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el)
      for (const prop of ['color', 'backgroundColor', 'borderColor']) {
        const v = cs[prop]
        const m = v && v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        if (m) {
          const [_, r, g, b] = m.map(Number)
          if (b > 180 && g > 150 && r < 100) hits.push({ tag: el.tagName, cls: el.className?.toString().slice(0, 40), prop, v })
        }
      }
    })
    return hits.length
  })
  report.cyanSweep.domHitCount = cyanDom

  const canvasCyan = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    try {
      const ctx = c.getContext('2d')
      const w = c.width, h = c.height
      const step = 6
      let cyanPx = 0, goldPx = 0, redPx = 0, otherAccentPx = 0, total = 0
      const data = ctx.getImageData(0, 0, w, h).data
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (w * y + x) * 4
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
          if (a < 10) continue
          total++
          const isCyan = b > 170 && g > 140 && r < 110
          const isGold = r > 150 && g > 90 && g < 220 && b < 140 && r > b + 60
          const isRed = r > 150 && g < 110 && b < 110
          const isPurple = r > 90 && b > 150 && g < r * 0.7 && g < b * 0.7
          if (isCyan) cyanPx++
          else if (isGold) goldPx++
          else if (isRed) redPx++
          else if (isPurple) otherAccentPx++
        }
      }
      return { total, cyanPx, goldPx, redPx, otherAccentPx }
    } catch (e) { return { error: String(e) } }
  })
  report.cyanSweep.canvasSample = canvasCyan

  // ---- Enter planning: pick a tier + pace, get to a mid-frame reveal state for pixel sampling ----
  await clickText(page, /REEF SHELF|LEAN|STANDARD/i)
  await wait(150)
  await clickText(page, /ENTER THE DIVE|RUN THE LINE|DIVE|START/i)
  await wait(400)
  await ensurePace(page, 'staggered')
  await wait(150)

  const geo = await boardGeo(page)
  if (geo) {
    const dim = 14
    const TILE = geo.w / dim
    // Paint a short trail (contiguous run of 8 tiles along row 6, non-adjacent test too)
    const cells = [[3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [3, 7], [8, 7]]
    for (const [col, row] of cells) {
      await page.mouse.click(geo.left + (col + 0.5) * TILE, geo.top + (row + 0.5) * TILE)
      await wait(15)
    }
    await wait(150)
    await shotPng(page, 'planning-trail')

    // find + click RUN THE LINE / commit
    await clickText(page, /RUN THE LINE|COMMIT|GO/i)
    await wait(300)
  }

  // capture a mid-reveal frame (dense poll for a few hundred ms while board animates)
  for (let i = 0; i < 8; i++) {
    await wait(90)
  }
  await shotPng(page, 'mid-reveal')

  // wait for settle
  let settledText = null
  for (let i = 0; i < 40; i++) {
    const t = await bodyText(page)
    if (/SECURED THE HAUL|RUGGED BY THE DEEP/.test(t)) { settledText = t; break }
    await wait(150)
  }
  await wait(300)
  await shotPng(page, 'settled')

  // ---- Luminance sampling: true corners + visually-dominant mid-frame regions ----
  const fullPng = await shotPng(page, 'full-for-luminance')
  const W = fullPng.width, H = fullPng.height
  const samplePts = {
    topLeftCorner: [5, 5],
    topRightCorner: [W - 5, 5],
    bottomLeftCorner: [5, H - 5],
    bottomRightCorner: [W - 5, H - 5],
    pageMidLeft: [Math.round(W * 0.05), Math.round(H * 0.5)],
    pageMidRight: [Math.round(W * 0.95), Math.round(H * 0.5)],
    boardCenter: geo ? [Math.round(geo.left + geo.w / 2), Math.round(geo.top + geo.h / 2)] : [Math.round(W / 2), Math.round(H / 2)],
    boardUpperLeftHotspot: geo ? [Math.round(geo.left + geo.w * 0.28), Math.round(geo.top + geo.h * 0.22)] : null,
    headerBg: [Math.round(W / 2), 20],
  }
  const lumResults = {}
  for (const [name, pt] of Object.entries(samplePts)) {
    if (!pt) continue
    const px = readPixel(fullPng, pt[0], pt[1])
    lumResults[name] = { xy: pt, rgb: [px.r, px.g, px.b], hex: hex(px), luminance: +relLum(px).toFixed(4) }
  }
  report.luminance = lumResults

  await stop(browser)
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({ ...report, consoleErrors, settledText }, null, 2))
  console.log(JSON.stringify({ ...report, consoleErrors, settledText }, null, 2))
}

async function stop(browser) {
  await wait(200)
  await browser.close()
}

main().catch((e) => { console.error('FATAL', e); process.exit(1) })
