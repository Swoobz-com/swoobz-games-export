// ABYSS LINE (assay) — GRINDING MECHANICS QA end-gate driver (check-round only,
// NO source edits). Drives the LIVE app at localhost:5182 with real Chrome via
// puppeteer-core.
//
// Probes (per swoobz-grinding-mechanics-qa brief, 2026-07-07):
//   1. HAUL gauge ticks up live during STAGGERED reveal (multi-sample) and
//      reflects final state immediately on INSTANT reveal.
//   2. Depth-tier selector (DIVE DEPTH) communicates bomb count + payout
//      ceiling BEFORE commit, desktop (TierRow) + mobile (TierChip).
//   3. Celebration (HeroPopCallout) is NOT escalated between a low-multiplier
//      win and a high-multiplier win on the SAME tier (computed-style diff).
//   4. Win-hero cartouche shows two DIFFERENT, mathematically-correct
//      multiplier values for two different trail lengths on the SAME tier
//      (Reef Shelf / lean, 6 bombs), cross-checked against assayMath.ts's
//      T(L) ladder.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'shots-grindingqa-0707'
fs.mkdirSync(OUT, { recursive: true })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Ground truth: T(L)_bps = floor(TARGET_RTP_BPS * Sden / Snum), lean tier
// (safeTiles=190, TOTAL_TILES=196, TARGET_RTP_BPS=9650) — reproduced from
// assayMath.ts's own formula (read via source, this is the SAME algorithm,
// not a re-derivation of a different one). ─────────────────────────────────
function coinLadderBps(L, safe, total = 196n, target = 9650n) {
  let num = 1n
  let den = 1n
  for (let i = 0n; i < BigInt(L); i++) {
    num *= BigInt(safe) - i
    den *= total - i
  }
  return (target * den) / num
}
function formatMultiplier(bps) {
  if (bps < 0n) return '0.00x'
  const whole = bps / 10000n
  const hundredths = (bps % 10000n) / 100n
  return `${whole}.${hundredths.toString().padStart(2, '0')}x`
}
const EXPECT_L8 = formatMultiplier(coinLadderBps(8, 190n))
const EXPECT_L20 = formatMultiplier(coinLadderBps(20, 190n))
console.log('EXPECTED (from assayMath.ts formula, lean tier): L=8 ->', EXPECT_L8, ' L=20 ->', EXPECT_L20)

async function clickText(page, txt) {
  return page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
    if (b && !b.disabled) {
      b.click()
      return true
    }
    return false
  }, txt)
}
async function bodyText(page) {
  return page.evaluate(() => document.body.innerText)
}
async function getCanvasBox(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}
async function paintTiles(page, n) {
  const box = await getCanvasBox(page)
  const dim = 14
  const tile = box.w / dim
  const coords = []
  let count = 0
  for (let row = 0; row < dim && count < n; row++) {
    for (let col = 0; col < dim && count < n; col++) {
      coords.push([row, col])
      count++
    }
  }
  for (const [row, col] of coords) {
    await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
    await wait(6)
  }
  return count
}
async function setPace(page, target) {
  for (let i = 0; i < 3; i++) {
    const txt = await bodyText(page)
    const isInstant = txt.includes('PACE: INSTANT')
    const isStaggered = txt.includes('PACE: DUCAT-BY-DUCAT')
    if (target === 'instant' && isInstant) return true
    if (target === 'staggered' && isStaggered) return true
    if (!isInstant && !isStaggered) return false
    await clickText(page, 'PACE:')
    await wait(60)
  }
  return false
}
async function setTier(page, label) {
  await clickText(page, label)
  await wait(60)
  const txt = await bodyText(page)
  return txt.includes(label)
}
async function goToPlanning(page) {
  const txt = await bodyText(page)
  if (txt.includes('ENTER THE DIVE')) {
    await clickText(page, 'ENTER THE DIVE')
    await wait(150)
  }
}
async function clearTrail(page) {
  await clickText(page, 'CLEAR')
  await wait(40)
}
async function readHaulRow(page) {
  return page.evaluate(() => {
    const labelDiv = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && d.textContent === 'HAUL')
    if (!labelDiv || !labelDiv.parentElement) return null
    return labelDiv.parentElement.textContent
  })
}
async function readHeroPlaque(page) {
  return page.evaluate(() => {
    const labelDiv = [...document.querySelectorAll('div')].find(
      (d) => d.children.length === 0 && (d.textContent === 'LINE BROKE' || d.textContent === 'LINE CLAIMED' || d.textContent === 'TO WIN' || d.textContent === 'HAUL · LIVE'),
    )
    if (!labelDiv) return null
    const row = labelDiv.parentElement ? labelDiv.parentElement.children[1] : null
    if (!row) return { label: labelDiv.textContent, amount: null, mult: null }
    return { label: labelDiv.textContent, amount: row.children[0]?.textContent ?? null, mult: row.children[1]?.textContent ?? null }
  })
}
async function readSettledCert(page) {
  return page.evaluate(() => {
    const headingDiv = [...document.querySelectorAll('div')].find(
      (d) => d.children.length === 0 && (d.textContent === 'RUGGED BY THE DEEP' || d.textContent === 'SECURED THE HAUL'),
    )
    if (!headingDiv) return null
    const payoutLabel = [...document.querySelectorAll('div')].find((d) => d.textContent === 'PAYOUT')
    const payoutVal = payoutLabel && payoutLabel.parentElement ? payoutLabel.parentElement.children[1]?.textContent : null
    return { heading: headingDiv.textContent, payout: payoutVal }
  })
}
/** Reads the settled HeroPopCallout's amount span, mult span and the
 *  cartouche div's computed style (fontSize/animation/padding/boxShadow) —
 *  used to diff two DIFFERENT-magnitude wins for RG-C5 byte-identity. */
async function readHeroPopStyle(page) {
  return page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find(
      (d) => d.textContent && d.textContent.includes('SECURED THE HAUL') && d.getAttribute('aria-hidden') === 'true',
    )
    if (!el) return { present: false }
    const cartouche = el.querySelector('div')
    const spans = cartouche ? [...cartouche.querySelectorAll('span')] : []
    const amountSpan = spans.find((s) => /^\$?[\d.]+$/.test((s.textContent || '').trim()) === false && /\d/.test(s.textContent || '') && !s.textContent.includes('x'))
    const multSpan = spans.find((s) => /\d+\.\d+x/.test(s.textContent || ''))
    const csCart = cartouche ? getComputedStyle(cartouche) : null
    const csAmount = amountSpan ? getComputedStyle(amountSpan) : null
    const csMult = multSpan ? getComputedStyle(multSpan) : null
    return {
      present: true,
      wrapperPointerEvents: getComputedStyle(el).pointerEvents,
      cartoucheAnimation: csCart ? csCart.animation : null,
      cartouchePadding: csCart ? csCart.padding : null,
      cartoucheBoxShadow: csCart ? csCart.boxShadow : null,
      amountFontSize: csAmount ? csAmount.fontSize : null,
      amountText: amountSpan ? amountSpan.textContent : null,
      multFontSize: csMult ? csMult.fontSize : null,
      multText: multSpan ? multSpan.textContent : null,
    }
  })
}
async function waitForSettled(page, maxMs) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    const txt = await bodyText(page)
    if ((txt.includes('RUGGED BY THE DEEP') || txt.includes('SECURED THE HAUL')) && txt.includes('WRECK RECKONING')) {
      return true
    }
    await wait(30)
  }
  return false
}

const log = { tierPreviewDesktop: null, tierPreviewMobile: null, staggeredHaulSamples: [], instantHaulCheck: null, winL8: null, winL20: null, bustCheck: null, celebrationDiff: null }

// ══════════════════════════════ DESKTOP PASS ══════════════════════════════
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 } })
const page = (await browser.pages())[0]
const consoleErrors = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))

const resp = await page.goto(URL, { waitUntil: 'networkidle0' })
console.log('HTTP status:', resp.status())
await wait(200)

// ── ITEM 2 (desktop): pre-commit tier-selector risk/reward preview ──
await goToPlanning(page)
await wait(150)
const tierRowsText = await page.evaluate(() => {
  const labels = ['REEF SHELF', 'MIDNIGHT ZONE', 'HADAL TRENCH']
  return labels.map((lab) => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent && b.textContent.includes(lab))
    return btn ? btn.textContent : null
  })
})
console.log('\n=== ITEM 2: DIVE DEPTH pre-commit preview (desktop) ===')
console.log(JSON.stringify(tierRowsText, null, 2))
log.tierPreviewDesktop = tierRowsText
const railShellBox = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent && b.textContent.includes('REEF SHELF'))
  if (!btn) return null
  // walk up to the RailRow / RailShell container for a clean crop
  let node = btn.parentElement
  for (let i = 0; i < 4 && node; i++) node = node.parentElement
  const r = (node || btn).getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
await page.screenshot({ path: `${OUT}/01-desktop-tierselector-full.png` })
if (railShellBox) {
  await page.screenshot({
    path: `${OUT}/02-desktop-tierselector-crop.png`,
    clip: { x: Math.max(0, railShellBox.x - 8), y: Math.max(0, railShellBox.y - 8), width: railShellBox.w + 16, height: Math.min(900, railShellBox.h + 16) },
  })
}

// ── ITEM 1 + 4a: REEF SHELF (lean), STAGGERED, trail=8 ──
console.log('\n=== ROUND A: REEF SHELF, staggered, L=8 ===')
await clearTrail(page)
await setTier(page, 'REEF SHELF')
await setPace(page, 'staggered')
const paintedA = await paintTiles(page, 8)
console.log('painted:', paintedA)
await wait(60)
await page.screenshot({ path: `${OUT}/03-desktop-armed-L8.png` })
const armedHero = await readHeroPlaque(page)
console.log('armed TO WIN hero (pre-commit):', JSON.stringify(armedHero))

// install an in-page HAUL sampler BEFORE clicking RUN THE LINE (dense,
// in-page setInterval — proven pattern from prior same-day runs, avoids
// Node round-trip jitter).
await page.evaluate(() => {
  window.__haulSamples = []
  window.__t0 = performance.now()
  window.__haulPoll = setInterval(() => {
    const labelDiv = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && d.textContent === 'HAUL')
    const text = labelDiv && labelDiv.parentElement ? labelDiv.parentElement.textContent : null
    window.__haulSamples.push({ t: Math.round(performance.now() - window.__t0), haul: text })
  }, 25)
})
const clickedA = await clickText(page, 'RUN THE LINE')
console.log('RUN THE LINE clicked:', clickedA)
const settledA = await waitForSettled(page, 8000)
await wait(120)
await page.evaluate(() => clearInterval(window.__haulPoll))
const samplesA = await page.evaluate(() => window.__haulSamples)
// de-dupe consecutive identical readings -> the DISTINCT haul states seen
const distinctA = []
for (const s of samplesA) {
  if (!distinctA.length || distinctA[distinctA.length - 1].haul !== s.haul) distinctA.push(s)
}
console.log(`staggered L=8: ${samplesA.length} raw samples -> ${distinctA.length} distinct HAUL states:`)
console.log(JSON.stringify(distinctA, null, 2))
log.staggeredHaulSamples = distinctA

const certA = await readSettledCert(page)
const heroPlaqueA = await readHeroPlaque(page)
const heroPopStyleA = await readHeroPopStyle(page)
console.log('settled cert A:', JSON.stringify(certA))
console.log('hero plaque A:', JSON.stringify(heroPlaqueA))
console.log('hero pop style A:', JSON.stringify(heroPopStyleA, null, 2))
await page.screenshot({ path: `${OUT}/04-desktop-settled-L8-win.png` })
log.winL8 = { painted: paintedA, cert: certA, heroPlaque: heroPlaqueA, heroPopStyle: heroPopStyleA, expected: EXPECT_L8 }

// ── ITEM 1 + 4b: REEF SHELF (lean), INSTANT, trail=20 (retry until win, cap 15) ──
console.log('\n=== ROUND B: REEF SHELF, instant, L=20 (retry-until-win) ===')
let winB = null
for (let attempt = 0; attempt < 15 && !winB; attempt++) {
  await clickText(page, 'SAME LINE') // benign no-op if not present at this phase
  await wait(80)
  const txt0 = await bodyText(page)
  if (txt0.includes('ENTER THE DIVE')) await goToPlanning(page)
  await clearTrail(page)
  await setTier(page, 'REEF SHELF')
  await setPace(page, 'instant')
  const paintedB = await paintTiles(page, 20)
  await wait(60)
  const clickedB = await clickText(page, 'RUN THE LINE')
  // read HAUL almost immediately after commit on INSTANT pace — should
  // already reflect the FINAL tally, not a partial/zero value.
  await wait(35)
  const instantHaulImmediate = await readHaulRow(page)
  const settledB = await waitForSettled(page, 5000)
  await wait(120)
  const certB = await readSettledCert(page)
  console.log(`attempt ${attempt}: painted=${paintedB} clicked=${clickedB} immediateHaul="${instantHaulImmediate}" cert=${JSON.stringify(certB)}`)
  if (certB && certB.heading === 'SECURED THE HAUL') {
    const heroPlaqueB = await readHeroPlaque(page)
    const heroPopStyleB = await readHeroPopStyle(page)
    await page.screenshot({ path: `${OUT}/05-desktop-settled-L20-win.png` })
    winB = { painted: paintedB, cert: certB, heroPlaque: heroPlaqueB, heroPopStyle: heroPopStyleB, immediateHaulAfterInstantCommit: instantHaulImmediate, expected: EXPECT_L20 }
  } else if (certB && certB.heading === 'RUGGED BY THE DEEP') {
    await clickText(page, 'DIVE AGAIN')
    await wait(200)
  }
}
log.winL20 = winB
console.log('ROUND B result:', JSON.stringify(winB, null, 2))

// ── ITEM 3: celebration-escalation diff between the low-mult (L8) and
// high-mult (L20) win, both on the SAME Reef Shelf tier ──
if (log.winL8?.heroPopStyle?.present && log.winL20?.heroPopStyle?.present) {
  const a = log.winL8.heroPopStyle
  const b = log.winL20.heroPopStyle
  log.celebrationDiff = {
    multiplierDiffers: a.multText !== b.multText,
    animationIdentical: a.cartoucheAnimation === b.cartoucheAnimation,
    paddingIdentical: a.cartouchePadding === b.cartouchePadding,
    boxShadowIdentical: a.cartoucheBoxShadow === b.cartoucheBoxShadow,
    amountFontSizeIdentical: a.amountFontSize === b.amountFontSize,
    multFontSizeIdentical: a.multFontSize === b.multFontSize,
    aMult: a.multText,
    bMult: b.multText,
  }
}
console.log('\n=== ITEM 3: celebration escalation diff (L8 win vs L20 win) ===')
console.log(JSON.stringify(log.celebrationDiff, null, 2))

// ── Item 1 sanity + near-miss check: HADAL TRENCH bust, staggered, L=30 ──
console.log('\n=== ROUND C: HADAL TRENCH, staggered, L=30 (bust expected) ===')
let bustResult = null
for (let attempt = 0; attempt < 6 && !bustResult; attempt++) {
  const txt0 = await bodyText(page)
  if (txt0.includes('ENTER THE DIVE')) await goToPlanning(page)
  await clearTrail(page)
  await setTier(page, 'HADAL TRENCH')
  await setPace(page, 'staggered')
  const paintedC = await paintTiles(page, 30)
  await wait(60)
  await page.evaluate(() => {
    window.__haulSamplesC = []
    window.__t0c = performance.now()
    window.__haulPollC = setInterval(() => {
      const labelDiv = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && d.textContent === 'HAUL')
      const text = labelDiv && labelDiv.parentElement ? labelDiv.parentElement.textContent : null
      window.__haulSamplesC.push({ t: Math.round(performance.now() - window.__t0c), haul: text })
    }, 25)
  })
  await clickText(page, 'RUN THE LINE')
  const settledC = await waitForSettled(page, 8000)
  await wait(150)
  await page.evaluate(() => clearInterval(window.__haulPollC))
  const samplesC = await page.evaluate(() => window.__haulSamplesC)
  const distinctC = []
  for (const s of samplesC) {
    if (!distinctC.length || distinctC[distinctC.length - 1].haul !== s.haul) distinctC.push(s)
  }
  const certC = await readSettledCert(page)
  const heroPopStyleC = await readHeroPopStyle(page)
  console.log(`attempt ${attempt}: painted=${paintedC} cert=${JSON.stringify(certC)} distinctHaulStates=${distinctC.length}`)
  if (certC && certC.heading === 'RUGGED BY THE DEEP') {
    await page.screenshot({ path: `${OUT}/06-desktop-settled-bust.png` })
    bustResult = { painted: paintedC, cert: certC, distinctHaulStates: distinctC, heroPopPresentOnBust: heroPopStyleC.present, lastHaulState: distinctC[distinctC.length - 1] }
  } else if (certC) {
    await clickText(page, 'DIVE AGAIN')
    await wait(200)
  }
}
log.bustCheck = bustResult
console.log('ROUND C (bust) result:', JSON.stringify(bustResult, null, 2))

await page.close()

// ══════════════════════════════ MOBILE PASS (Pixel 7) ══════════════════════
const mobilePage = await browser.newPage()
await mobilePage.emulate({
  viewport: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36',
})
await mobilePage.goto(URL, { waitUntil: 'networkidle0' })
await wait(200)
await goToPlanning(mobilePage)
await wait(200)
const tierChipsText = await mobilePage.evaluate(() => {
  return [...document.querySelectorAll('button')]
    .filter((b) => b.getAttribute('aria-label') && /up to/i.test(b.getAttribute('aria-label')))
    .map((b) => ({ ariaLabel: b.getAttribute('aria-label'), visibleText: b.textContent }))
})
console.log('\n=== ITEM 2: DIVE DEPTH pre-commit preview (mobile Pixel 7) ===')
console.log(JSON.stringify(tierChipsText, null, 2))
log.tierPreviewMobile = tierChipsText
await mobilePage.screenshot({ path: `${OUT}/07-mobile-lobby-full.png` })
const chipBox = await mobilePage.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') && /up to/i.test(x.getAttribute('aria-label')))
  if (!b || !b.parentElement) return null
  const r = b.parentElement.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
if (chipBox) {
  await mobilePage.screenshot({
    path: `${OUT}/08-mobile-tierselector-crop.png`,
    clip: { x: Math.max(0, chipBox.x - 6), y: Math.max(0, chipBox.y - 6), width: chipBox.w + 12, height: chipBox.h + 12 },
  })
}

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(log, null, 2))
console.log('\n\n=== CONSOLE ERRORS (desktop pass) ===', consoleErrors.length)
consoleErrors.forEach((e) => console.log(e))

await browser.close()
console.log('\nDONE. See', OUT)
