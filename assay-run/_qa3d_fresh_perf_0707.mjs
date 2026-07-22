// FRESH full-gate perf re-measurement (2026-07-07) — re-verify codotty's O(9)
// incremental-bake fix is STILL INTACT on today's build, across the 3 render
// paths that shipped since the 07-05 fix (win-hero pop, instant-bust
// coin-fly-suppression, mobile pan/loupe). Uses the call-count instrumentation
// (drawImage calls bucketed per rAF frame) as PRIMARY evidence (immune to
// shared-machine CPU noise), plus rAF-interval ms-timing as SECONDARY.
import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const GRID = 14
const HERO_POP_HOLD_MS = 1700

function instrument(page) {
  return page.evaluateOnNewDocument(() => {
    window.__frameCounts = []
    window.__curCount = 0
    window.__frameTimes = []
    let raf0 = null
    let lastT = null
    const orig = CanvasRenderingContext2D.prototype.drawImage
    CanvasRenderingContext2D.prototype.drawImage = function (...a) {
      window.__curCount++
      return orig.apply(this, a)
    }
    function tick(t) {
      window.__frameCounts.push(window.__curCount)
      window.__curCount = 0
      if (lastT !== null) window.__frameTimes.push(t - lastT)
      lastT = t
      raf0 = requestAnimationFrame(tick)
    }
    window.__startCounting = () => {
      window.__frameCounts = []
      window.__curCount = 0
      window.__frameTimes = []
      lastT = null
      raf0 = requestAnimationFrame(tick)
    }
    window.__stopCounting = () => {
      if (raf0) cancelAnimationFrame(raf0)
      return { counts: window.__frameCounts.slice(), times: window.__frameTimes.slice() }
    }
  })
}

async function clickBtn(page, re) {
  return page.evaluate((pattern) => {
    const rx = new RegExp(pattern, 'i')
    const b = [...document.querySelectorAll('button')].find((x) => rx.test(x.textContent || ''))
    if (!b) return false
    b.click()
    return true
  }, re)
}

async function textNow(page) {
  return page.evaluate(() => document.body.innerText)
}

async function canvasGeo(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { left: r.left, top: r.top, w: r.width, h: r.height }
  })
}

async function enterPlanning(page, tierRe) {
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
  await wait(300)
  const okEnter = await clickBtn(page, 'ENTER THE DIVE')
  await wait(400)
  if (tierRe) {
    await clickBtn(page, tierRe)
    await wait(150)
  }
  return okEnter
}

async function setPace(page, wantInstant) {
  const t = await textNow(page)
  const isInstant = /PACE:\s*INSTANT/i.test(t)
  if (isInstant !== wantInstant) {
    await clickBtn(page, 'PACE:')
    await wait(120)
  }
}

async function paintTrail(page, len) {
  const geo = await canvasGeo(page)
  const TILE = geo.w / GRID
  const cells = []
  for (let i = 0; i < len; i++) cells.push([2 + (i % 6), 2 + Math.floor(i / 6)])
  for (const [col, row] of cells) {
    await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2)
    await wait(30)
  }
  return geo
}

function analyze(counts) {
  const full = counts.filter((c) => c >= 100)
  const mid = counts.filter((c) => c > 12 && c < 100)
  const idle = counts.filter((c) => c <= 12)
  return {
    totalFrames: counts.length,
    max: counts.length ? Math.max(...counts) : 0,
    fullBakeCount: full.length,
    fullBakeValues: full,
    midCount: mid.length,
    midValues: mid.slice(0, 30),
    idleCount: idle.length,
    histogramFirst80: counts.slice(0, 80),
  }
}

function msStats(times) {
  if (!times.length) return { n: 0 }
  const sorted = [...times].sort((a, b) => a - b)
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const max = sorted[sorted.length - 1]
  const p95 = sorted[Math.floor(sorted.length * 0.95)]
  const overBudget = times.filter((t) => t > 22.2).length // mobile-ish budget
  const overBudget60 = times.filter((t) => t > 16.7).length
  return { n: times.length, avgMs: +avg.toFixed(2), maxMs: +max.toFixed(2), p95Ms: +p95.toFixed(2), overBudget22_2: overBudget, overBudget16_7: overBudget60 }
}

const results = {}

// ── Concurrent CPU-noise check ──────────────────────────────────────────────
console.log('=== ENVIRONMENT ===')

// ── Scenario A/B: 8-tile and 16-tile reveal (staggered pace, default tier) ──
async function revealScenario(trailLen) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
  const page = (await browser.pages())[0]
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await instrument(page)
  await enterPlanning(page, null)
  await setPace(page, false) // staggered / ducat-by-ducat
  const geo = await paintTrail(page, trailLen)
  await wait(200)
  await page.evaluate(() => window.__startCounting())
  await clickBtn(page, 'RUN THE LINE')
  await wait(200 + trailLen * 90 + 900) // staggered reveal + settle buffer
  const { counts, times } = await page.evaluate(() => window.__stopCounting())
  const outcome = await page.evaluate(() => {
    const t = document.body.innerText
    return { won: /LINE CLAIMED/.test(t), bust: /LINE BROKE/.test(t) }
  })
  await browser.close()
  return { trailLen, boardW: geo.w, tilePx: geo.w / GRID, outcome: outcome.won ? 'WON' : outcome.bust ? 'BUST' : '?', ...analyze(counts), msStats: msStats(times) }
}

console.log('=== SCENARIO A: 8-tile reveal (staggered pace) ===')
results.reveal8 = await revealScenario(8)
console.log(JSON.stringify(results.reveal8, null, 2))

console.log('=== SCENARIO B: 16-tile reveal (staggered pace) ===')
results.reveal16 = await revealScenario(16)
console.log(JSON.stringify(results.reveal16, null, 2))

// ── Scenario C: WIN settle -> win-hero pop (instant pace, easy tier, retry) ─
async function winHeroScenario() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
  const page = (await browser.pages())[0]
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await instrument(page)
  let attempt = 0
  let won = false
  let counts = [], times = []
  for (; attempt < 20 && !won; attempt++) {
    await enterPlanning(page, 'REEF SHELF')
    await setPace(page, true) // instant
    await paintTrail(page, 8)
    await wait(150)
    await page.evaluate(() => window.__startCounting())
    await clickBtn(page, 'RUN THE LINE')
    let settled = false
    for (let p = 0; p < 60 && !settled; p++) {
      await wait(50)
      const t = await textNow(page)
      if (/LINE CLAIMED/.test(t)) { won = true; settled = true }
      else if (/LINE BROKE/.test(t)) { settled = true }
    }
    if (won) {
      // keep counting through the full hero-pop hold window + buffer
      await wait(HERO_POP_HOLD_MS + 400)
      const r = await page.evaluate(() => window.__stopCounting())
      counts = r.counts; times = r.times
    } else {
      await page.evaluate(() => window.__stopCounting())
    }
  }
  await browser.close()
  return { attempts: attempt, won, ...analyze(counts), postSettleWindow: counts.slice(-120), msStats: msStats(times) }
}

console.log('=== SCENARIO C: WIN settle -> win-hero pop (instant pace, REEF SHELF tier) ===')
results.winHero = await winHeroScenario()
console.log(JSON.stringify(results.winHero, null, 2))

// ── Scenario D: instant-BUST -> coin-fly-suppression + HAUL-zeroing ─────────
async function instantBustScenario() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
  const page = (await browser.pages())[0]
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await instrument(page)
  let attempt = 0
  let busted = false
  let counts = [], times = []
  for (; attempt < 30 && !busted; attempt++) {
    await enterPlanning(page, 'HADAL TRENCH')
    await setPace(page, true) // instant
    await paintTrail(page, 8)
    await wait(150)
    await page.evaluate(() => window.__startCounting())
    await clickBtn(page, 'RUN THE LINE')
    let settled = false
    for (let p = 0; p < 60 && !settled; p++) {
      await wait(50)
      const t = await textNow(page)
      if (/LINE BROKE/.test(t)) { busted = true; settled = true }
      else if (/LINE CLAIMED/.test(t)) { settled = true }
    }
    if (busted) {
      await wait(1200) // settle transition + HAUL-zeroing window
      const r = await page.evaluate(() => window.__stopCounting())
      counts = r.counts; times = r.times
    } else {
      await page.evaluate(() => window.__stopCounting())
    }
  }
  await browser.close()
  return { attempts: attempt, busted, ...analyze(counts), postSettleWindow: counts.slice(-80), msStats: msStats(times) }
}

console.log('=== SCENARIO D: instant-BUST -> coin-fly-suppression + HAUL-zeroing (instant pace, HADAL TRENCH tier) ===')
results.instantBust = await instantBustScenario()
console.log(JSON.stringify(results.instantBust, null, 2))

// ── Scenario E: mobile pan/loupe window, PURE pan, no tile interaction ──────
async function mobilePanScenario() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
  const page = (await browser.pages())[0]
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36')
  await instrument(page)
  await enterPlanning(page, null)
  await paintTrail(page, 4) // a few tiles so the board isn't fully empty, but no RUN THE LINE (no reveal)
  await wait(300)

  // baseline idle window (planning phase, canvas RAF loop running, no pan)
  await page.evaluate(() => window.__startCounting())
  await wait(600)
  const idle = await page.evaluate(() => window.__stopCounting())

  // find the scroll container and pan it programmatically (native scroll, not a canvas redraw)
  const hasScroller = await page.evaluate(() => !!document.querySelector('.assayBoardScroll'))
  await page.evaluate(() => window.__startCounting())
  if (hasScroller) {
    await page.evaluate(() => {
      const el = document.querySelector('.assayBoardScroll')
      el.scrollBy({ left: 40, top: 30, behavior: 'auto' })
    })
    await wait(150)
    await page.evaluate(() => {
      const el = document.querySelector('.assayBoardScroll')
      el.scrollBy({ left: -25, top: -15, behavior: 'auto' })
    })
    await wait(150)
  } else {
    // fallback: page-level touch pan gesture over the canvas
    const geo = await canvasGeo(page)
    await page.touchscreen.touchStart(geo.left + geo.w / 2, geo.top + geo.h / 2)
    await page.touchscreen.touchMove(geo.left + geo.w / 2 - 40, geo.top + geo.h / 2 - 30)
    await wait(80)
    await page.touchscreen.touchMove(geo.left + geo.w / 2 - 10, geo.top + geo.h / 2 - 5)
    await page.touchscreen.touchEnd()
    await wait(150)
  }
  await wait(300)
  const pan = await page.evaluate(() => window.__stopCounting())
  await browser.close()
  return { hasScroller, idle: analyze(idle.counts), idleMsStats: msStats(idle.times), pan: analyze(pan.counts), panMsStats: msStats(pan.times) }
}

console.log('=== SCENARIO E: mobile pan/loupe, pure pan (no tile interaction) ===')
results.mobilePan = await mobilePanScenario()
console.log(JSON.stringify(results.mobilePan, null, 2))

console.log('\n\n=== FULL JSON DUMP ===')
console.log(JSON.stringify(results))
