// CONSOLIDATED FULL-QA END-GATE (check-round only, no fixes) — ABYSS LINE.
// Fresh, independently-written driver (swoobz-visual-regression-qa, 2026-07-07).
// 4 viewports x 7 phases. Live localhost:5182. No Playwright in this export —
// puppeteer-core + pngjs, throwaway script inside assay-run/.
import puppeteer from 'puppeteer-core'
import fs from 'fs'
import { PNG } from 'pngjs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-finalgate-0707c-mobile'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = [
  { name: 'pixel7', width: 412, height: 915, mobile: true, dsf: 2 },
  { name: 'iphone14pro', width: 393, height: 852, mobile: true, dsf: 2 },
]

// ── DOM helpers ──────────────────────────────────────────────────────────
async function bodyText(page) { return page.evaluate(() => document.body.innerText) }
async function clickText(page, txt, mobile) {
  // Matches on visible textContent OR aria-label (TierChip on narrow viewports
  // renders only the first word — "REEF"/"MIDNIGHT"/"HADAL" — visibly, but
  // carries the FULL "REEF SHELF, up to 8.95x" string in aria-label; matching
  // both keeps one call site correct on every viewport/layout).
  const rect = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find(
      (x) => (x.textContent && x.textContent.includes(t)) || (x.getAttribute('aria-label') || '').includes(t),
    )
    if (!b || b.disabled) return null
    // Real users scroll a normal in-flow page to reach a CTA that's below the
    // fold (this page is NOT overflow:hidden) — scrollIntoView before reading
    // the rect so a tap lands correctly regardless of any post-round page
    // growth (e.g. the session-summary/"SAME LINE" row added after round 1).
    b.scrollIntoView({ block: 'center' })
    const r = b.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, txt)
  if (!rect) return false
  if (mobile) await page.touchscreen.tap(rect.x, rect.y)
  else await page.mouse.click(rect.x, rect.y)
  return true
}
async function getDesktopCanvasBox(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}
// Desktop tap: direct board-canvas coordinates.
async function tapDesktopTile(page, idx) {
  const box = await getDesktopCanvasBox(page)
  const dim = 14
  const tile = box.w / dim
  const col = idx % dim, row = Math.floor(idx / dim)
  await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
}
// Mobile tap: self-derived scroll-then-tap against `.assayBoardScroll` (fixed
// 644x644 canvas inside a small pan/loupe window) — scroll the target tile to
// the viewport centre, then tap the resulting on-screen coordinate.
async function tapMobileTile(page, idx) {
  const rect = await page.evaluate((idx) => {
    const GRID_DIM = 14
    const scroller = document.querySelector('.assayBoardScroll')
    const canvas = document.querySelector('canvas')
    if (!scroller || !canvas) return null
    const canvasRect = canvas.getBoundingClientRect()
    const tile = canvasRect.width / GRID_DIM
    const col = idx % GRID_DIM, row = Math.floor(idx / GRID_DIM)
    const targetX = col * tile + tile / 2
    const targetY = row * tile + tile / 2
    const viewW = scroller.clientWidth, viewH = scroller.clientHeight
    const maxScrollX = Math.max(0, canvasRect.width - viewW)
    const maxScrollY = Math.max(0, canvasRect.height - viewH)
    scroller.scrollLeft = Math.max(0, Math.min(maxScrollX, targetX - viewW / 2))
    scroller.scrollTop = Math.max(0, Math.min(maxScrollY, targetY - viewH / 2))
    const sRect = scroller.getBoundingClientRect()
    return {
      x: sRect.left + (targetX - scroller.scrollLeft),
      y: sRect.top + (targetY - scroller.scrollTop),
    }
  }, idx)
  if (!rect) throw new Error('mobile board scroller/canvas not found')
  await page.touchscreen.tap(rect.x, rect.y)
}
async function tapTile(page, idx, mobile) {
  if (mobile) await tapMobileTile(page, idx)
  else await tapDesktopTile(page, idx)
  await wait(20)
}
async function setTier(page, label, mobile) {
  await clickText(page, label, mobile)
  await wait(60)
  // Verify via aria-current on the matched button (works for both the
  // desktop full-text TierRow and the mobile short-label TierChip, whose
  // visible text never contains the full label).
  return page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find(
      (x) => (x.textContent && x.textContent.includes(t)) || (x.getAttribute('aria-label') || '').includes(t),
    )
    return !!b && b.getAttribute('aria-current') === 'true'
  }, label)
}
async function setPace(page, target, mobile) {
  for (let i = 0; i < 3; i++) {
    const txt = await bodyText(page)
    if (target === 'instant' && txt.includes('PACE: INSTANT')) return true
    if (target === 'staggered' && txt.includes('PACE: DUCAT-BY-DUCAT')) return true
    if (!txt.includes('PACE:')) return false
    await clickText(page, 'PACE:', mobile)
    await wait(60)
  }
  return false
}
async function goToPlanning(page, mobile) {
  const txt = await bodyText(page)
  if (txt.includes('ENTER THE DIVE')) { await clickText(page, 'ENTER THE DIVE', mobile); await wait(150) }
}
async function clearTrail(page, mobile) { await clickText(page, 'CLEAR', mobile); await wait(40) }

// ── Geometry / overflow probes ──────────────────────────────────────────
async function overflowCheck(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
}
function rectsOverlap(a, b) {
  if (!a || !b) return { overlap: false, area: 0 }
  const x1 = Math.max(a.left, b.left), y1 = Math.max(a.top, b.top)
  const x2 = Math.min(a.right, b.right), y2 = Math.min(a.bottom, b.bottom)
  const w = Math.max(0, x2 - x1), h = Math.max(0, y2 - y1)
  return { overlap: w > 0 && h > 0, area: w * h }
}
async function certGeometry(page) {
  return page.evaluate(() => {
    const headingDiv = [...document.querySelectorAll('div')].find(
      (d) => d.children.length === 0 && (d.textContent === 'RUGGED BY THE DEEP' || d.textContent === 'SECURED THE HAUL'),
    )
    if (!headingDiv) return null
    // Walk up to the outer settled block (has borderTop brass in inline style).
    let block = headingDiv
    for (let i = 0; i < 6 && block; i++) block = block.parentElement
    const certBlock = block
    const hexSpans = [...document.querySelectorAll('span')].filter(
      (s) => s.textContent && (s.textContent.startsWith('seed') || s.textContent.startsWith('hash')),
    )
    // HallmarkSeal has no data-attribute; identify it structurally: a 32x32
    // box whose getComputedStyle borderRadius resolves to a PX value (percent
    // border-radius is resolved to px in computed style, e.g. "16px"), rotated,
    // inside the cert block. offsetWidth/offsetHeight===32 is the reliable part.
    const seal = certBlock
      ? [...certBlock.querySelectorAll('div')].find((e) => {
          const cs = getComputedStyle(e)
          const br = parseFloat(cs.borderTopLeftRadius) || 0
          return e.offsetWidth === 32 && e.offsetHeight === 32 && br >= 15
        })
      : null
    const r = (el) => (el ? el.getBoundingClientRect() : null)
    const toObj = (rect) => (rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null)
    const sealRect = toObj(r(seal))
    // Overlap of seal vs each hex-copy row (seed/hash) — the prior-fixed
    // regression class ("longer cert string wrapped under the medallion").
    const overlaps = hexSpans.map((s) => {
      const sr = r(s), gr = seal ? seal.getBoundingClientRect() : null
      if (!sr || !gr) return null
      const x1 = Math.max(sr.left, gr.left), y1 = Math.max(sr.top, gr.top)
      const x2 = Math.min(sr.right, gr.right), y2 = Math.min(sr.bottom, gr.bottom)
      const w = Math.max(0, x2 - x1), h = Math.max(0, y2 - y1)
      return { area: w * h }
    })
    return {
      certBlock: toObj(r(certBlock)),
      sealRect,
      hexSpanRects: hexSpans.map((s) => toObj(r(s))),
      sealHexOverlapAreas: overlaps,
      docWidth: document.documentElement.clientWidth,
      certScrollWidth: certBlock ? certBlock.scrollWidth : null,
      certClientWidth: certBlock ? certBlock.clientWidth : null,
      // horizontal clipping proxy: any hex span whose right edge exceeds the
      // viewport's clientWidth is running under the fold / clipped.
      hexOverflowsViewport: hexSpans.map((s) => {
        const sr = r(s)
        return sr ? sr.right > document.documentElement.clientWidth + 0.5 : null
      }),
    }
  })
}
async function coinFlyAndHaulSignal(page) {
  return page.evaluate(() => {
    const imgs = document.querySelectorAll('img').length
    const haulLabel = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && d.textContent === 'HAUL')
    const haulText = haulLabel && haulLabel.parentElement ? haulLabel.parentElement.textContent : null
    return { coinImgCount: imgs, haulText }
  })
}
async function heroPlaque(page) {
  // The ephemeral HeroPopCallout cartouche is the ONLY 'SECURED THE HAUL'
  // text node that lives inside an aria-hidden ancestor (the persistent
  // in-board "TO WIN"->"LINE CLAIMED"/"LINE BROKE" HUD strip and the settled
  // Glass Box cert heading are both regular, non-aria-hidden text) — filter
  // on that ancestor directly instead of relying on DOM-order .find() luck.
  return page.evaluate(() => {
    const candidates = [...document.querySelectorAll('div')].filter(
      (d) => d.children.length === 0 && d.textContent === 'SECURED THE HAUL',
    )
    const heroDiv = candidates.find((d) => d.closest('[aria-hidden="true"]'))
    if (!heroDiv) return { present: false, candidateCount: candidates.length }
    const wrap = heroDiv.closest('[aria-hidden="true"]')
    const rect = wrap.getBoundingClientRect()
    const amountEl = wrap.querySelector('span') // first span walk below finds $amount span via textContent scan
    const allSpans = [...wrap.querySelectorAll('span')].map((s) => s.textContent)
    return { present: true, text: heroDiv.textContent, rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }, spans: allSpans }
  })
}

// pngjs luminance sampler (own-derived, per house dark-register technique).
function luminance(r, g, b) {
  const s = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]
}
function samplePng(buf, points) {
  const png = PNG.sync.read(buf)
  return points.map(([px, py]) => {
    const x = Math.min(png.width - 1, Math.max(0, Math.round(px)))
    const y = Math.min(png.height - 1, Math.max(0, Math.round(py)))
    const idx = (png.width * y + x) << 2
    const r = png.data[idx], g = png.data[idx + 1], b = png.data[idx + 2]
    return { x, y, r, g, b, hex: `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`, lum: Math.round(luminance(r, g, b) * 1000) / 1000 }
  })
}

// ── Main per-viewport sweep ───────────────────────────────────────────────
const results = { viewports: {}, network: {}, consoleErrors: {}, pageErrors: {} }

async function runViewport(browser, vp) {
  const page = await browser.newPage()
  await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: vp.dsf })
  const netLog = []
  page.on('response', (r) => netLog.push({ url: r.url(), status: r.status() }))
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(String(e)))

  const httpResp = await page.goto(URL, { waitUntil: 'networkidle0' })
  await page.evaluate(() => { try { localStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(200)

  const mobile = vp.mobile
  const phases = {}

  // Phase 1: lobby
  phases.lobby = {
    overflow: await overflowCheck(page),
  }
  const lobbyShot = `${OUT}/${vp.name}-1-lobby.png`
  await page.screenshot({ path: lobbyShot })
  phases.lobby.screenshot = lobbyShot

  // Phase 2: bet-entry (planning, 0 picks, select lean tier "REEF SHELF")
  await goToPlanning(page, mobile)
  await wait(150)
  const tierOk = await setTier(page, 'REEF SHELF', mobile)
  await wait(80)
  phases.betEntry = { tierOk, overflow: await overflowCheck(page) }
  const betEntryShot = `${OUT}/${vp.name}-2-bet-entry.png`
  await page.screenshot({ path: betEntryShot })
  phases.betEntry.screenshot = betEntryShot

  // Phase 3: planning/free-pick — 8 non-adjacent-mixed picks (2 adjacent
  // pairs + 2 isolated jumps) to exercise the adjacency-gated connector.
  const winTrail = [0, 1, 20, 21, 45, 68, 90, 91]
  for (const idx of winTrail) await tapTile(page, idx, mobile)
  await wait(120)
  const trailText = await bodyText(page)
  phases.planningFreePick = {
    armed: /RUN THE LINE/.test(trailText) && !trailText.includes('RUN THE LINE ·'),
    overflow: await overflowCheck(page),
  }
  const planningShot = `${OUT}/${vp.name}-3-planning-freepick.png`
  await page.screenshot({ path: planningShot })
  phases.planningFreePick.screenshot = planningShot

  // Commit WIN attempt (lean tier, staggered) — retry a few times if it busts.
  let won = false, winAttempts = 0
  let winMidShot = null
  while (!won && winAttempts < 20) {
    winAttempts++
    await setPace(page, 'staggered', mobile)
    await clickText(page, 'RUN THE LINE', mobile)
    await wait(4 * 90 + 30) // mid-cascade, ~4 of 8 tiles revealed
    if (winAttempts === 1) {
      winMidShot = `${OUT}/${vp.name}-3b-active-staggered-win-midcascade.png`
      await page.screenshot({ path: winMidShot })
    }
    const start = Date.now()
    let settledTxt = ''
    while (Date.now() - start < 6000) {
      settledTxt = await bodyText(page)
      if (settledTxt.includes('WRECK RECKONING')) break
      await wait(40)
    }
    won = settledTxt.includes('SECURED THE HAUL')
    if (!won) {
      await clickText(page, 'DIVE AGAIN', mobile) || (await clickText(page, 'SAME LINE', mobile))
      await wait(200)
      await goToPlanning(page, mobile)
      await setTier(page, 'REEF SHELF', mobile)
      await clearTrail(page, mobile)
      for (const idx of winTrail) await tapTile(page, idx, mobile)
      await wait(100)
    }
  }
  const winHero = await heroPlaque(page)
  const winCert = await certGeometry(page)
  const winOverflow = await overflowCheck(page)
  const settledWinShot = `${OUT}/${vp.name}-6-settled-win.png`
  await page.screenshot({ path: settledWinShot })
  phases.settledWin = { won, winAttempts, hero: winHero, cert: winCert, overflow: winOverflow, screenshot: settledWinShot, midCascadeScreenshot: winMidShot }

  // Reset for BUST rounds (flooded tier, 60-tile trail — near-certain bust).
  await clickText(page, 'DIVE AGAIN', mobile) || (await clickText(page, 'SAME LINE', mobile))
  await wait(200)
  await goToPlanning(page, mobile)
  const bustTierOk = await setTier(page, 'HADAL TRENCH', mobile)
  await wait(60)
  const bustTrail = Array.from({ length: 60 }, (_, i) => i)

  // BUST attempt #1 — INSTANT pace ("active-instant")
  await clearTrail(page, mobile)
  for (const idx of bustTrail) await tapTile(page, idx, mobile)
  await wait(100)
  await setPace(page, 'instant', mobile)
  await clickText(page, 'RUN THE LINE', mobile)
  let instantBustFrame = null, instantSignal = null
  {
    const start = Date.now()
    while (Date.now() - start < 2000) {
      const txt = await bodyText(page)
      if (txt.includes('Dive busted')) {
        instantSignal = await coinFlyAndHaulSignal(page)
        const p = `${OUT}/${vp.name}-4-active-instant-bustmoment.png`
        await page.screenshot({ path: p })
        instantBustFrame = p
        break
      }
      await wait(6)
    }
  }
  await wait(900)
  const instantBustSettledTxt = await bodyText(page)
  const instantBustSettled = instantBustSettledTxt.includes('RUGGED BY THE DEEP')
  const instantSettleShot = `${OUT}/${vp.name}-7-settled-bust-instant.png`
  await page.screenshot({ path: instantSettleShot })
  const instantBustCert = await certGeometry(page)
  const instantBustOverflow = await overflowCheck(page)
  phases.activeInstant = {
    bustTierOk, instantBustFrame, instantSignal, instantBustSettled,
    settledScreenshot: instantSettleShot, cert: instantBustCert, overflow: instantBustOverflow,
  }

  // BUST attempt #2 — STAGGERED pace ("active-staggered")
  await clickText(page, 'DIVE AGAIN', mobile) || (await clickText(page, 'SAME LINE', mobile))
  await wait(200)
  await goToPlanning(page, mobile)
  await setTier(page, 'HADAL TRENCH', mobile)
  await clearTrail(page, mobile)
  for (const idx of bustTrail) await tapTile(page, idx, mobile)
  await wait(100)
  await setPace(page, 'staggered', mobile)
  await clickText(page, 'RUN THE LINE', mobile)
  let staggeredBustFrame = null, staggeredSignal = null
  {
    const start = Date.now()
    while (Date.now() - start < 8000) {
      const txt = await bodyText(page)
      if (txt.includes('Dive busted')) {
        staggeredSignal = await coinFlyAndHaulSignal(page)
        const p = `${OUT}/${vp.name}-5-active-staggered-bustmoment.png`
        await page.screenshot({ path: p })
        staggeredBustFrame = p
        break
      }
      await wait(6)
    }
  }
  await wait(900)
  const staggeredBustSettledTxt = await bodyText(page)
  const staggeredBustSettled = staggeredBustSettledTxt.includes('RUGGED BY THE DEEP')
  const staggeredSettleShot = `${OUT}/${vp.name}-7b-settled-bust-staggered.png`
  await page.screenshot({ path: staggeredSettleShot })
  const staggeredBustCert = await certGeometry(page)
  const staggeredBustOverflow = await overflowCheck(page)
  phases.activeStaggered = {
    staggeredBustFrame, staggeredSignal, staggeredBustSettled,
    settledScreenshot: staggeredSettleShot, cert: staggeredBustCert, overflow: staggeredBustOverflow,
  }
  phases.settledBust = {
    instant: { settled: instantBustSettled, screenshot: instantSettleShot, cert: instantBustCert },
    staggered: { settled: staggeredBustSettled, screenshot: staggeredSettleShot, cert: staggeredBustCert },
  }

  // Dark-register / vignette-banding sample on the settled-bust frame (own
  // pngjs read of the just-saved screenshot, multiple regions per house
  // technique — corners + mid-frame hotspot).
  let darkRegisterSample = null
  try {
    const buf = fs.readFileSync(staggeredSettleShot)
    const png = PNG.sync.read(buf)
    const w = png.width, h = png.height
    const pts = [
      [w * 0.1, h * 0.1], [w * 0.5, h * 0.1], [w * 0.9, h * 0.1],
      [w * 0.1, h * 0.5], [w * 0.5, h * 0.5], [w * 0.9, h * 0.5],
      [w * 0.1, h * 0.9], [w * 0.5, h * 0.9], [w * 0.9, h * 0.9],
    ]
    darkRegisterSample = samplePng(buf, pts)
  } catch (e) {
    darkRegisterSample = { error: String(e) }
  }
  phases.darkRegisterSample = darkRegisterSample

  await page.close()
  return { phases, netLog, consoleErrors, pageErrors, httpStatus: httpResp.status() }
}

let browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
for (const vp of VIEWPORTS) {
  console.log(`\n\n========== VIEWPORT ${vp.name} (${vp.width}x${vp.height}) ==========`)
  let ok = false
  for (let attempt = 0; attempt < 2 && !ok; attempt++) {
    try {
      const r = await runViewport(browser, vp)
      results.viewports[vp.name] = r.phases
      results.network[vp.name] = r.netLog
      results.consoleErrors[vp.name] = r.consoleErrors
      results.pageErrors[vp.name] = r.pageErrors
      results.viewports[vp.name].httpStatus = r.httpStatus
      console.log(`${vp.name} DONE (attempt ${attempt}).`)
      ok = true
    } catch (e) {
      console.log(`${vp.name} ERROR (attempt ${attempt}):`, e && e.stack ? e.stack : e)
      results.viewports[vp.name] = { error: String(e), attempt }
      // Renderer/target crash — the whole browser process may be unhealthy;
      // relaunch fresh before the retry.
      try { await browser.close() } catch {}
      browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
    }
  }
}
await browser.close()

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2))
console.log('\n\nALL DONE. Results at', `${OUT}/results.json`)
