// RE-VERIFY (regression + the 3 fixes) — ABYSS LINE, 4 viewports.
// Own, fresh driver (swoobz-visual-regression-qa, 2026-07-07 re-verify pass).
// Fixes under test:
//  (1) no stale WIN hero cartouche over a real BUST settle.
//  (2) prefers-reduced-motion collapses inline juice + canvas bust FX.
//  (3) "TO WIN" preview is tier-aware (Reef 1.24x / Midnight 1.35x / Hadal 1.93x @8 tiles).
// Plus a full round-2-behavior + board/DIVE-DEPTH/HAUL/panels/receipt regression sweep.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-reverify3fixes-0707d'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = [
  { name: 'desktop1440', width: 1440, height: 900, mobile: false, dsf: 1 },
  { name: 'desktop1920', width: 1920, height: 1080, mobile: false, dsf: 1 },
  { name: 'pixel7', width: 412, height: 915, mobile: true, dsf: 2 },
  { name: 'iphone14pro', width: 393, height: 852, mobile: true, dsf: 2 },
]

// ── DOM helpers (ported/adapted from _finalgate_0707c.mjs, own additions for the 3 fixes) ──
async function bodyText(page) { return page.evaluate(() => document.body.innerText) }
async function clickText(page, txt, mobile) {
  const rect = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find(
      (x) => (x.textContent && x.textContent.includes(t)) || (x.getAttribute('aria-label') || '').includes(t),
    )
    if (!b || b.disabled) return null
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
async function tapDesktopTile(page, idx) {
  const box = await getDesktopCanvasBox(page)
  const dim = 14
  const tile = box.w / dim
  const col = idx % dim, row = Math.floor(idx / dim)
  await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
}
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
    return { x: sRect.left + (targetX - scroller.scrollLeft), y: sRect.top + (targetY - scroller.scrollTop) }
  }, idx)
  if (!rect) throw new Error('mobile board scroller/canvas not found')
  await page.touchscreen.tap(rect.x, rect.y)
}
async function tapTile(page, idx, mobile) {
  if (mobile) await tapMobileTile(page, idx)
  else await tapDesktopTile(page, idx)
  await wait(15)
}
async function setTier(page, label, mobile) {
  await clickText(page, label, mobile)
  await wait(60)
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
    await wait(50)
  }
  return false
}
async function goToPlanning(page, mobile) {
  const txt = await bodyText(page)
  if (txt.includes('ENTER THE DIVE')) { await clickText(page, 'ENTER THE DIVE', mobile); await wait(150) }
}
async function clearTrail(page, mobile) { await clickText(page, 'CLEAR', mobile); await wait(30) }

async function overflowCheck(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
}

// The ephemeral win-styled hero cartouche — only text node whose closest
// ancestor is aria-hidden (distinct from the persistent in-board "TO WIN"/
// "LINE CLAIMED"/"LINE BROKE" HUD strip and the settled Glass Box cert
// heading, both non-aria-hidden regular text) — per swoobz-visual-regression-qa
// 2026-07-07 finding (memory: heroPlaque scoping trap).
async function heroCartouche(page) {
  return page.evaluate(() => {
    const candidates = [...document.querySelectorAll('div')].filter(
      (d) => d.children.length === 0 && (d.textContent === 'SECURED THE HAUL' || d.textContent === 'LINE CLAIMED' || d.textContent === 'RUGGED BY THE DEEP' || d.textContent === 'LINE BROKE'),
    )
    const heroDiv = candidates.find((d) => d.closest('[aria-hidden="true"]'))
    if (!heroDiv) return { present: false, candidateTexts: candidates.map((d) => d.textContent) }
    const wrap = heroDiv.closest('[aria-hidden="true"]')
    const rect = wrap.getBoundingClientRect()
    const allSpans = [...wrap.querySelectorAll('span, div')].map((s) => s.textContent).filter(Boolean)
    return { present: true, text: heroDiv.textContent, rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }, spans: allSpans }
  })
}

// The persistent in-board "TO WIN" hero HUD strip (item 4). Reads the cap
// label text + the adjacent multiplier value.
async function toWinHero(page) {
  return page.evaluate(() => {
    const label = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && d.textContent === 'TO WIN')
    if (!label) return null
    // Walk up to the textAlign:right wrapper, then find the flex row (amount + multiplier).
    let wrap = label.parentElement
    const row = wrap ? [...wrap.querySelectorAll('div')].find((d) => d.style.display === 'flex') : null
    if (!row) return { labelFound: true, row: null }
    const kids = [...row.children].map((c) => c.textContent)
    return { labelFound: true, amount: kids[0] || null, multiplier: kids[1] || null }
  })
}

async function heroPlaque(page) {
  return page.evaluate(() => {
    const candidates = [...document.querySelectorAll('div')].filter(
      (d) => d.children.length === 0 && d.textContent === 'SECURED THE HAUL',
    )
    const heroDiv = candidates.find((d) => d.closest('[aria-hidden="true"]'))
    if (!heroDiv) return { present: false }
    const wrap = heroDiv.closest('[aria-hidden="true"]')
    const rect = wrap.getBoundingClientRect()
    const allSpans = [...wrap.querySelectorAll('span, div')].map((s) => s.textContent).filter(Boolean)
    return { present: true, rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }, spans: allSpans }
  })
}

async function haulReadout(page) {
  return page.evaluate(() => {
    const haulLabel = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && d.textContent === 'HAUL')
    return haulLabel && haulLabel.parentElement ? haulLabel.parentElement.textContent : null
  })
}

async function headerRect(page) {
  return page.evaluate(() => {
    // Header: the div containing the ABYSS wordmark svg/text + BALANCE dial —
    // identified as the first div child of the outermost shell with borderBottom.
    const all = [...document.querySelectorAll('div')]
    const header = all.find((d) => (d.getAttribute('style') || '').includes('space-between') && d.textContent.includes('BALANCE'))
    if (!header) return null
    const r = header.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }
  })
}

async function certPresent(page) {
  return page.evaluate(() => {
    const heading = [...document.querySelectorAll('div')].find(
      (d) => d.children.length === 0 && (d.textContent === 'RUGGED BY THE DEEP' || d.textContent === 'SECURED THE HAUL'),
    )
    return !!heading
  })
}

async function actionBarBelowCanvas(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const canvasRect = c.getBoundingClientRect()
    const btn = [...document.querySelectorAll('button')].find(
      (b) => /RUN THE LINE|DIVE AGAIN|SAME LINE|ENTER THE DIVE/.test(b.textContent || ''),
    )
    if (!btn) return null
    const btnRect = btn.getBoundingClientRect()
    // Overlap check (not strictly "below", since layout may place it to the side on wide).
    const x1 = Math.max(canvasRect.left, btnRect.left), y1 = Math.max(canvasRect.top, btnRect.top)
    const x2 = Math.min(canvasRect.right, btnRect.right), y2 = Math.min(canvasRect.bottom, btnRect.bottom)
    const w = Math.max(0, x2 - x1), h = Math.max(0, y2 - y1)
    return { overlapArea: w * h, canvasRect: { top: canvasRect.top, bottom: canvasRect.bottom, left: canvasRect.left, right: canvasRect.right }, btnRect: { top: btnRect.top, bottom: btnRect.bottom, left: btnRect.left, right: btnRect.right } }
  })
}

// ── synthetic reduced-motion CSS check (per house pattern: throwaway DOM node) ──
async function synthAnimationCheck(page, className) {
  return page.evaluate((cn) => {
    const el = document.createElement('div')
    el.className = cn
    document.body.appendChild(el)
    const cs = getComputedStyle(el)
    const out = { animationName: cs.animationName, animationDuration: cs.animationDuration, animationPlayState: cs.animationPlayState }
    document.body.removeChild(el)
    return out
  }, className)
}

// ── canvas frame-diff sampler (own, simple: sample N points across canvas, compare frame0 vs frame1) ──
async function canvasFrameSample(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const ctx = c.getContext('2d')
    const w = c.width, h = c.height
    const pts = []
    for (let i = 0; i < 30; i++) {
      const x = Math.floor((i % 6) * (w / 6) + w / 12)
      const y = Math.floor(Math.floor(i / 6) * (h / 5) + h / 10)
      const d = ctx.getImageData(x, y, 1, 1).data
      pts.push([d[0], d[1], d[2], d[3]])
    }
    return pts
  })
}
function frameDiff(a, b) {
  if (!a || !b) return null
  let diffCount = 0
  let totalDelta = 0
  for (let i = 0; i < a.length; i++) {
    const da = Math.abs(a[i][0] - b[i][0]) + Math.abs(a[i][1] - b[i][1]) + Math.abs(a[i][2] - b[i][2]) + Math.abs(a[i][3] - b[i][3])
    totalDelta += da
    if (da > 6) diffCount++
  }
  return { diffCount, totalDelta, of: a.length }
}

// ═══════════════════════════════════════════════════════════════════════════
const results = { viewports: {} }

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
  const out = {}

  // ── CHECK 2: TO WIN preview per-tier @ 8 tiles ──────────────────────────
  const trail8 = [0, 1, 20, 21, 45, 68, 90, 91]
  await goToPlanning(page, mobile)
  const tierChecks = {}
  for (const [label, key] of [['REEF SHELF', 'reef'], ['MIDNIGHT ZONE', 'midnight'], ['HADAL TRENCH', 'hadal']]) {
    const tierOk = await setTier(page, label, mobile)
    await wait(50)
    await clearTrail(page, mobile)
    for (const idx of trail8) await tapTile(page, idx, mobile)
    await wait(100)
    const hero = await toWinHero(page)
    tierChecks[key] = { tierOk, hero }
  }
  await page.screenshot({ path: `${OUT}/${vp.name}-1-towin-hadal-8tiles.png` })
  out.toWinPerTier = tierChecks

  // ── CHECK 1: fast win<->bust replay on INSTANT, check no stale hero on bust ──
  await setTier(page, 'HADAL TRENCH', mobile) // ~51% win rate @ 8 tiles, flooded
  await clearTrail(page, mobile)
  for (const idx of trail8) await tapTile(page, idx, mobile)
  await wait(80)
  await setPace(page, 'instant', mobile)

  const roundLog = []
  const staleHeroFails = []
  const N_ROUNDS = 14
  for (let i = 0; i < N_ROUNDS; i++) {
    const beforeTxt = await bodyText(page)
    if (!beforeTxt.includes('ENTER THE DIVE') && !/RUN THE LINE/.test(beforeTxt)) {
      // Not in a runnable planning state (shouldn't happen) — bail this round.
      break
    }
    if (beforeTxt.includes('ENTER THE DIVE')) await goToPlanning(page, mobile)
    const ran = await clickText(page, 'RUN THE LINE', mobile)
    if (!ran) { roundLog.push({ i, error: 'RUN THE LINE not clickable' }); break }
    // Poll fast for settle (instant pace resolves almost immediately).
    let settledTxt = ''
    const start = Date.now()
    while (Date.now() - start < 3000) {
      settledTxt = await bodyText(page)
      if (settledTxt.includes('RUGGED BY THE DEEP') || settledTxt.includes('SECURED THE HAUL')) break
      await wait(8)
    }
    const won = settledTxt.includes('SECURED THE HAUL')
    const bust = settledTxt.includes('RUGGED BY THE DEEP')
    // Immediately + a few times over the next 300ms, check for a stale WIN
    // hero cartouche during a BUST settle.
    let staleDetected = false
    let cartoucheSamples = []
    if (bust) {
      for (let k = 0; k < 6; k++) {
        const hc = await heroCartouche(page)
        cartoucheSamples.push(hc)
        if (hc.present && (hc.text === 'SECURED THE HAUL' || hc.text === 'LINE CLAIMED')) { staleDetected = true }
        await wait(50)
      }
    }
    roundLog.push({ i, won, bust, staleDetected, cartoucheSamples: bust ? cartoucheSamples : undefined })
    if (staleDetected) {
      const p = `${OUT}/${vp.name}-STALE-HERO-FAIL-round${i}.png`
      await page.screenshot({ path: p })
      staleHeroFails.push({ round: i, screenshot: p })
    }
    // Fast replay: SAME LINE (works from both won and bust settled states).
    await clickText(page, 'SAME LINE', mobile)
    await wait(15)
  }
  out.fastReplay = { roundLog, staleHeroFails, nRounds: roundLog.length }

  // ── CHECK 4 (regression): board / DIVE DEPTH / HAUL / panels / receipt, full loop ──
  // Fresh WIN round (lean tier, staggered pace) to check hero $+multiplier, HAUL, cert.
  await clickText(page, 'DIVE AGAIN', mobile) || (await clickText(page, 'SAME LINE', mobile))
  await wait(150)
  await goToPlanning(page, mobile)
  await setTier(page, 'REEF SHELF', mobile)
  await clearTrail(page, mobile)
  for (const idx of trail8) await tapTile(page, idx, mobile)
  await wait(80)
  await setPace(page, 'staggered', mobile)

  let won2 = false, attempts2 = 0
  while (!won2 && attempts2 < 25) {
    attempts2++
    await clickText(page, 'RUN THE LINE', mobile)
    const start = Date.now()
    let txt = ''
    while (Date.now() - start < 6000) {
      txt = await bodyText(page)
      if (txt.includes('RUGGED BY THE DEEP') || txt.includes('SECURED THE HAUL')) break
      await wait(30)
    }
    won2 = txt.includes('SECURED THE HAUL')
    if (!won2) {
      await clickText(page, 'DIVE AGAIN', mobile) || (await clickText(page, 'SAME LINE', mobile))
      await wait(150)
      await goToPlanning(page, mobile)
      await setTier(page, 'REEF SHELF', mobile)
      await clearTrail(page, mobile)
      for (const idx of trail8) await tapTile(page, idx, mobile)
      await wait(60)
      await setPace(page, 'staggered', mobile)
    }
  }
  const winHeroPlaque = await heroPlaque(page)
  const winHaul = await haulReadout(page)
  const winCertPresent = await certPresent(page)
  const winOverlap = await actionBarBelowCanvas(page)
  const winHeaderRect = await headerRect(page)
  await page.screenshot({ path: `${OUT}/${vp.name}-2-settled-win.png` })
  out.win = { attempts: attempts2, heroPlaque: winHeroPlaque, haul: winHaul, certPresent: winCertPresent, overlap: winOverlap, headerRect: winHeaderRect }
  // "mobile hero clears header": hero cartouche rect.top should be >= header.bottom.
  if (mobile && winHeroPlaque.present && winHeaderRect) {
    out.win.heroClearHeader = winHeroPlaque.rect.top >= winHeaderRect.bottom
  }

  // Reset, bust rounds (instant + staggered), HADAL 60-tile trail — HAUL 0 check.
  await clickText(page, 'DIVE AGAIN', mobile) || (await clickText(page, 'SAME LINE', mobile))
  await wait(150)
  await goToPlanning(page, mobile)
  await setTier(page, 'HADAL TRENCH', mobile)
  await clearTrail(page, mobile)
  const bustTrail = Array.from({ length: 60 }, (_, i) => i)
  for (const idx of bustTrail) await tapTile(page, idx, mobile)
  await wait(80)

  // Instant bust
  await setPace(page, 'instant', mobile)
  await clickText(page, 'RUN THE LINE', mobile)
  {
    const start = Date.now()
    let txt = ''
    while (Date.now() - start < 3000) { txt = await bodyText(page); if (txt.includes('RUGGED BY THE DEEP')) break; await wait(15) }
  }
  await wait(300)
  const instantHaul = await haulReadout(page)
  const instantOverflow = await overflowCheck(page)
  const instantCert = await certPresent(page)
  await page.screenshot({ path: `${OUT}/${vp.name}-3-settled-bust-instant.png` })
  out.bustInstant = { haul: instantHaul, overflow: instantOverflow, certPresent: instantCert }

  await clickText(page, 'DIVE AGAIN', mobile) || (await clickText(page, 'SAME LINE', mobile))
  await wait(150)
  await goToPlanning(page, mobile)
  await setTier(page, 'HADAL TRENCH', mobile)
  await clearTrail(page, mobile)
  for (const idx of bustTrail) await tapTile(page, idx, mobile)
  await wait(80)
  await setPace(page, 'staggered', mobile)
  await clickText(page, 'RUN THE LINE', mobile)
  {
    const start = Date.now()
    let txt = ''
    while (Date.now() - start < 9000) { txt = await bodyText(page); if (txt.includes('RUGGED BY THE DEEP')) break; await wait(20) }
  }
  await wait(400)
  const staggeredHaul = await haulReadout(page)
  const staggeredOverflow = await overflowCheck(page)
  const staggeredCert = await certPresent(page)
  const staggeredOverlap = await actionBarBelowCanvas(page)
  await page.screenshot({ path: `${OUT}/${vp.name}-4-settled-bust-staggered.png` })
  out.bustStaggered = { haul: staggeredHaul, overflow: staggeredOverflow, certPresent: staggeredCert, overlap: staggeredOverlap }

  // ── CHECK 3: prefers-reduced-motion ─────────────────────────────────────
  // (a) synthetic CSS-node check for the named juice keyframes, reduce ON.
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(200)
  const synthReduce = {}
  for (const cn of ['assayAmbient']) synthReduce[cn] = await synthAnimationCheck(page, cn)

  // Live win-hero animation check under reduce.
  await goToPlanning(page, mobile)
  await setTier(page, 'REEF SHELF', mobile)
  await clearTrail(page, mobile)
  for (const idx of trail8) await tapTile(page, idx, mobile)
  await wait(60)
  await setPace(page, 'staggered', mobile)
  let wonR = false, attemptsR = 0
  while (!wonR && attemptsR < 25) {
    attemptsR++
    await clickText(page, 'RUN THE LINE', mobile)
    const start = Date.now()
    let txt = ''
    while (Date.now() - start < 6000) { txt = await bodyText(page); if (txt.includes('RUGGED BY THE DEEP') || txt.includes('SECURED THE HAUL')) break; await wait(25) }
    wonR = txt.includes('SECURED THE HAUL')
    if (!wonR) {
      await clickText(page, 'DIVE AGAIN', mobile) || (await clickText(page, 'SAME LINE', mobile))
      await wait(120); await goToPlanning(page, mobile); await setTier(page, 'REEF SHELF', mobile); await clearTrail(page, mobile)
      for (const idx of trail8) await tapTile(page, idx, mobile); await wait(50); await setPace(page, 'staggered', mobile)
    }
  }
  const reduceWinHeroLive = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll('div')].filter((d) => d.children.length === 0 && d.textContent === 'SECURED THE HAUL')
    const heroDiv = candidates.find((d) => d.closest('[aria-hidden="true"]'))
    if (!heroDiv) return { present: false }
    const wrap = heroDiv.closest('[aria-hidden="true"]')
    const cartoucheDiv = wrap.querySelector('div') // first inner div = the cartouche body
    const cs = cartoucheDiv ? getComputedStyle(cartoucheDiv) : null
    return { present: true, animationName: cs ? cs.animationName : null, opacity: cs ? cs.opacity : null, text: heroDiv.textContent }
  })
  const reduceWinShot = `${OUT}/${vp.name}-5-reduce-on-win-hero.png`
  await page.screenshot({ path: reduceWinShot })
  out.reducedMotion = { synthReduce, reduceWinHeroLive, reduceWinShot }

  // Bust canvas FX frame-diff under reduce ON.
  await clickText(page, 'DIVE AGAIN', mobile) || (await clickText(page, 'SAME LINE', mobile))
  await wait(120); await goToPlanning(page, mobile); await setTier(page, 'HADAL TRENCH', mobile); await clearTrail(page, mobile)
  for (const idx of bustTrail) await tapTile(page, idx, mobile); await wait(60); await setPace(page, 'staggered', mobile)
  await clickText(page, 'RUN THE LINE', mobile)
  // Wait for the bad-vein moment.
  {
    const start = Date.now()
    let txt = ''
    while (Date.now() - start < 9000) { txt = await bodyText(page); if (txt.includes('Dive busted')) break; await wait(15) }
  }
  const frameA_reduce = await canvasFrameSample(page)
  await wait(220)
  const frameB_reduce = await canvasFrameSample(page)
  const bustDiffReduce = frameDiff(frameA_reduce, frameB_reduce)
  await wait(600)
  const reduceBustSettledTxt = await bodyText(page)
  const reduceBustShot = `${OUT}/${vp.name}-6-reduce-on-bust-settled.png`
  await page.screenshot({ path: reduceBustShot })
  out.reducedMotion.bustDiffReduce = bustDiffReduce
  out.reducedMotion.reduceBustSettledShowsOutcome = reduceBustSettledTxt.includes('RUGGED BY THE DEEP')
  out.reducedMotion.reduceBustShot = reduceBustShot

  // (b) same bust scenario with reduce OFF, for contrast.
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(200)
  const synthNoReduce = {}
  for (const cn of ['assayAmbient']) synthNoReduce[cn] = await synthAnimationCheck(page, cn)
  await goToPlanning(page, mobile); await setTier(page, 'HADAL TRENCH', mobile); await clearTrail(page, mobile)
  for (const idx of bustTrail) await tapTile(page, idx, mobile); await wait(60); await setPace(page, 'staggered', mobile)
  await clickText(page, 'RUN THE LINE', mobile)
  {
    const start = Date.now()
    let txt = ''
    while (Date.now() - start < 9000) { txt = await bodyText(page); if (txt.includes('Dive busted')) break; await wait(15) }
  }
  const frameA_noreduce = await canvasFrameSample(page)
  await wait(220)
  const frameB_noreduce = await canvasFrameSample(page)
  const bustDiffNoReduce = frameDiff(frameA_noreduce, frameB_noreduce)
  await wait(900)
  out.reducedMotion.synthNoReduce = synthNoReduce
  out.reducedMotion.bustDiffNoReduce = bustDiffNoReduce

  await page.close()
  return { out, netLog, consoleErrors, pageErrors, httpStatus: httpResp.status() }
}

let browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
for (const vp of VIEWPORTS) {
  console.log(`\n\n========== VIEWPORT ${vp.name} (${vp.width}x${vp.height}) ==========`)
  let ok = false
  for (let attempt = 0; attempt < 2 && !ok; attempt++) {
    try {
      const r = await runViewport(browser, vp)
      results.viewports[vp.name] = { ...r.out, netLog: r.netLog, consoleErrors: r.consoleErrors, pageErrors: r.pageErrors, httpStatus: r.httpStatus }
      console.log(`${vp.name} DONE (attempt ${attempt}).`)
      ok = true
    } catch (e) {
      console.log(`${vp.name} ERROR (attempt ${attempt}):`, e && e.stack ? e.stack : e)
      results.viewports[vp.name] = { error: String(e), attempt }
      try { await browser.close() } catch {}
      browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
    }
  }
}
await browser.close()

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2))
console.log('\n\nALL DONE. Results at', `${OUT}/results.json`)
