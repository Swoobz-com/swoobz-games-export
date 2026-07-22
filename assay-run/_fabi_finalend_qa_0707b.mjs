// CONSOLIDATED FULL-QA END-GATE driver, round 2 (fixes scrollbar-gutter false
// read from round 1; adds WON-state hero-cartouche sample + purple-dot check
// + DOM cyan-hit detail dump).
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
  return page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height } })
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

async function playOneRound(page, tierRe, cells) {
  await clickText(page, tierRe)
  await wait(150)
  await clickText(page, /ENTER THE DIVE|RUN THE LINE|DIVE|START/i)
  await wait(400)
  const geo = await boardGeo(page)
  const dim = 14, TILE = geo.w / dim
  for (const [col, row] of cells) { await page.mouse.click(geo.left + (col + 0.5) * TILE, geo.top + (row + 0.5) * TILE); await wait(15) }
  await wait(150)
  await clickText(page, /RUN THE LINE|COMMIT|GO/i)
  await wait(300)
  let text = null
  for (let i = 0; i < 40; i++) {
    const t = await bodyText(page)
    if (/SECURED THE HAUL|RUGGED BY THE DEEP/.test(t)) { text = t; break }
    await wait(150)
  }
  await wait(250)
  return text
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: false, args: ['--window-size=1500,1000'] })
  const page = await browser.newPage()
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message))
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await wait(400)

  const report = {}

  // ---- LOBBY corner luminance (no scrollbar at lobby, confirmed earlier) ----
  const lobbyPng = await shotPng(page, 'r2-lobby')
  const lobbyPts = {
    topLeft: [5, 5], topRight: [1435, 5], bottomLeft: [5, 895], bottomRight: [1435, 895],
    purpleDotApprox1: [240, 150], purpleDotApprox2: [1200, 150],
    headerWordmarkBg: [720, 8],
  }
  report.lobbyLuminance = {}
  for (const [k, [x, y]] of Object.entries(lobbyPts)) {
    const px = readPixel(lobbyPng, x, y)
    report.lobbyLuminance[k] = { xy: [x, y], rgb: [px.r, px.g, px.b], hex: hex(px), luminance: +relLum(px).toFixed(4) }
  }

  // ---- Force a WIN via REEF SHELF + exactly MIN_TRAIL(8) contiguous tiles ----
  const winText = await playOneRound(page, /REEF SHELF/i, [[3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6]])
  report.winAttemptText = winText
  // If it happened to bust, retry a couple times (short trail, low bomb tier -> usually wins fast)
  let tries = 0
  let finalWinText = winText
  while (!/SECURED THE HAUL/.test(finalWinText || '') && tries < 5) {
    await clickText(page, /SAME LINE|DIVE AGAIN/i)
    await wait(400)
    finalWinText = await playOneRound(page, /REEF SHELF/i, [[3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6]])
    tries++
  }
  report.finalWinText = finalWinText
  report.winTries = tries

  if (/SECURED THE HAUL/.test(finalWinText || '')) {
    // capture during the ~1.7s hero-pop hold window (dense sample)
    let heroShot = null
    for (let i = 0; i < 6; i++) {
      const has = await page.evaluate(() => !!document.body.innerText.match(/SECURED THE HAUL/))
      if (has) {
        const heroRect = await page.evaluate(() => {
          const wraps = [...document.querySelectorAll('div[aria-hidden]')]
          const w = wraps.find((d) => /SECURED THE HAUL/i.test(d.textContent || ''))
          if (!w) return null
          const r = w.getBoundingClientRect()
          return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height }
        })
        if (heroRect && heroRect.w > 10) { heroShot = heroRect; break }
      }
      await wait(150)
    }
    report.heroRect = heroShot
    const winPng = await shotPng(page, 'r2-win-hero')
    if (heroShot) {
      const cx = Math.round(heroShot.left + heroShot.w / 2)
      const cy = Math.round(heroShot.top + heroShot.h * 0.75) // amount text area (lower part of cartouche)
      const px = readPixel(winPng, cx, cy)
      report.heroAmountAreaSample = { xy: [cx, cy], rgb: [px.r, px.g, px.b], hex: hex(px), luminance: +relLum(px).toFixed(4) }
    }
    await page.screenshot({ path: `${OUT}/r2-win-hero-crop.png`, clip: heroShot ? { x: Math.max(0, heroShot.left - 20), y: Math.max(0, heroShot.top - 20), width: heroShot.w + 40, height: heroShot.h + 40 } : { x: 300, y: 200, width: 600, height: 400 } })
  }

  // ---- DOM cyan sweep detail ----
  const cyanDomDetail = await page.evaluate(() => {
    const hits = []
    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el)
      for (const prop of ['color', 'backgroundColor', 'borderColor']) {
        const v = cs[prop]
        const m = v && v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        if (m) {
          const [_, r, g, b] = m.map(Number)
          if (b > 180 && g > 150 && r < 100) hits.push({ tag: el.tagName, text: (el.textContent || '').trim().slice(0, 30), prop, v })
        }
      }
    })
    return hits
  })
  report.cyanDomDetail = cyanDomDetail

  fs.writeFileSync(`${OUT}/report2.json`, JSON.stringify({ ...report, consoleErrors }, null, 2))
  console.log(JSON.stringify({ ...report, consoleErrors }, null, 2))
  await wait(200)
  await browser.close()
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
