import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5193/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-touchqa-gridresize-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const devices = [
  { name: 'pixel7-412x915', width: 412, height: 915 },
  { name: 'iphone14pro-390x844', width: 390, height: 844 },
]

const GRID_DIM = 20 // updated grid this pass (was 32)

const report = {}

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })
page.on('response', (r) => { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url()) })

const tapText = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.evaluate((e) => e.scrollIntoView({ block: 'center' }))
  await wait(120)
  const box = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
  await page.touchscreen.tap(box.x, box.y)
  return true
}

const bodyText = () => page.evaluate(() => document.body.innerText)

const measureAllControls = () => page.evaluate(() => {
  const out = []
  document.querySelectorAll('button, a[role], [role="button"]').forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) return
    out.push({
      text: (el.textContent || '').trim().slice(0, 40),
      w: Math.round(r.width * 100) / 100,
      h: Math.round(r.height * 100) / 100,
      top: Math.round(r.top),
      left: Math.round(r.left),
      touchAction: getComputedStyle(el).touchAction,
    })
  })
  return out
})

// Specifically hunt CopyGlyph "copy"/"copied" buttons for the fix-verify.
const measureCopyGlyphs = () => page.evaluate(() => {
  return [...document.querySelectorAll('button')]
    .filter((b) => /^copy(ied)?$/i.test((b.textContent || '').trim()))
    .map((b) => {
      const r = b.getBoundingClientRect()
      return { text: b.textContent.trim(), w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100, ariaLabel: b.getAttribute('aria-label') }
    })
})

const overflowCheck = () => page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  scrollHeight: document.documentElement.scrollHeight,
  bodyScrollWidth: document.body.scrollWidth,
  bodyClientWidth: document.body.clientWidth,
}))

const headerOneLineCheck = () => page.evaluate(() => {
  const playSafe = [...document.querySelectorAll('button')].find((b) => /PLAY SAFE/i.test(b.textContent || ''))
  if (!playSafe) return { found: false }
  const r = playSafe.getBoundingClientRect()
  let row = playSafe.parentElement
  let hops = 0
  while (row && hops < 4) {
    const cs = getComputedStyle(row)
    if (cs.display === 'flex') break
    row = row.parentElement
    hops++
  }
  const rowRect = row ? row.getBoundingClientRect() : null
  return {
    found: true,
    playSafeRect: { w: r.width, h: r.height, top: r.top },
    rowHeight: rowRect ? rowRect.height : null,
    rowChildrenTops: row ? [...row.children].map((c) => Math.round(c.getBoundingClientRect().top)) : null,
  }
})

const railOverflowCheck = () => page.evaluate(() => {
  // Look for the narrow ASSAY RAIL panel (plate-specimen background) and confirm
  // it never forces the page wider than the viewport / never clips its own content.
  const canvas = document.querySelector('canvas')
  if (!canvas) return null
  const rail = canvas.parentElement.nextElementSibling
  if (!rail) return { found: false }
  const r = rail.getBoundingClientRect()
  return { found: true, w: r.width, left: r.left, right: r.right, viewportW: window.innerWidth, overflowsRight: r.right > window.innerWidth + 1, overflowsLeft: r.left < -1 }
})

const scrollBox = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const scroller = c.parentElement
  const sr = scroller.getBoundingClientRect()
  return {
    scrollerX: sr.x, scrollerY: sr.y, scrollerW: Math.round(sr.width), scrollerH: Math.round(sr.height),
    canvasW: c.getBoundingClientRect().width, canvasH: c.getBoundingClientRect().height,
    touchAction: getComputedStyle(c).touchAction,
    scrollWidth: scroller.scrollWidth, scrollHeight: scroller.scrollHeight,
    scrollLeft: scroller.scrollLeft, scrollTop: scroller.scrollTop,
  }
})

const trailLenText = () => page.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /^\d{1,3}$/.test(e.textContent || ''))
  return el ? el.textContent : null
})

const sessionChipText = () => page.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /SESSION ·/.test(e.textContent || ''))
  return el ? el.textContent : null
})

const buttonState = (label) => page.evaluate((l) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(l))
  return b ? { disabled: b.disabled, opacity: getComputedStyle(b).opacity, text: b.textContent } : null
}, label)

const buttonBox = (label) => page.evaluate((l) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(l))
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, top: r.top, vh: window.innerHeight }
}, label)

const outcomeText = async () => {
  const t = (await bodyText()).replace(/\n/g, ' | ')
  if (/CLAIM PROVEN/.test(t)) return 'WIN'
  if (/BUSTED/.test(t)) return 'BUST'
  return 'UNKNOWN'
}

for (const d of devices) {
  const r = { checks: [] }
  await page.emulate({
    viewport: { width: d.width, height: d.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
  })
  const resp = await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  r.httpStatus = resp.status()
  await wait(500)
  await page.screenshot({ path: `${OUT}/${d.name}-01-lobby.png`, fullPage: false })
  r.lobbyControls = await measureAllControls()
  const lobbyCta = r.lobbyControls.find((c) => /ENTER THE ASSAY LINE/.test(c.text))
  r.lobbyCtaThumbZonePct = lobbyCta ? Math.round(((lobbyCta.top + lobbyCta.h / 2) / d.height) * 1000) / 10 : null
  r.lobbyOverflow = await overflowCheck()

  await tapText('ENTER THE ASSAY LINE')
  await wait(400)
  r.headerOneLine = await headerOneLineCheck()
  r.scrollBoxInitial = await scrollBox()
  r.tilePx = r.scrollBoxInitial ? Math.round((r.scrollBoxInitial.canvasW / GRID_DIM) * 100) / 100 : null
  r.railOverflow = await railOverflowCheck()
  r.round1PlanningControls = await measureAllControls()
  r.breakerLeverR1 = r.round1PlanningControls.find((c) => /THROW BREAKER/.test(c.text))
  r.planningOverflow = await overflowCheck()
  await page.screenshot({ path: `${OUT}/${d.name}-02-planning-r1.png` })

  await tapText('PACE: BEAD')
  await wait(150)

  const scroller0 = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const rr = c.parentElement.getBoundingClientRect()
    return { x: rr.x, y: rr.y, w: rr.width, h: rr.height }
  })
  const TILE = r.tilePx

  // ── MIN-8 GATE: tap 7 individual coins (real touch), confirm BREAKER disarmed ──
  for (let i = 0; i < 7; i++) {
    const col = i % 4, row = Math.floor(i / 4)
    const tx = TILE / 2 + col * TILE, ty = TILE / 2 + row * TILE
    if (tx < scroller0.w && ty < scroller0.h) {
      await page.touchscreen.tap(scroller0.x + tx, scroller0.y + ty)
      await wait(80)
    }
  }
  await wait(150)
  r.odometerAfter7Taps = await trailLenText()
  r.breakerStateAt7 = await buttonState('THROW BREAKER')
  await page.screenshot({ path: `${OUT}/${d.name}-03-after-7taps.png` })

  const col8 = 7 % 4, row8 = Math.floor(7 / 4)
  await page.touchscreen.tap(scroller0.x + TILE / 2 + col8 * TILE, scroller0.y + TILE / 2 + row8 * TILE)
  await wait(150)
  r.odometerAfter8Taps = await trailLenText()
  r.breakerStateAt8 = await buttonState('THROW BREAKER')
  r.breakerBoxAt8 = await buttonBox('THROW BREAKER')
  r.breakerThumbZonePct = r.breakerBoxAt8 ? Math.round(((r.breakerBoxAt8.top + r.breakerBoxAt8.h / 2) / d.height) * 1000) / 10 : null
  await page.screenshot({ path: `${OUT}/${d.name}-04-min8-armed.png` })

  // ── PAN disambiguation: real drag over the canvas must scroll, not add a tile ──
  const before = await scrollBox()
  const cx = scroller0.x + scroller0.w / 2
  const cy = scroller0.y + scroller0.h / 2
  const touch = await page.touchscreen.touchStart(cx, cy)
  for (let i = 1; i <= 10; i++) { await touch.move(cx - i * 16, cy - i * 10); await wait(16) }
  await touch.end()
  await wait(300)
  const after = await scrollBox()
  r.panDelta = { dLeft: after.scrollLeft - before.scrollLeft, dTop: after.scrollTop - before.scrollTop }
  r.panMoved = r.panDelta.dLeft !== 0 || r.panDelta.dTop !== 0
  r.odometerAfterPan = await trailLenText()
  await page.screenshot({ path: `${OUT}/${d.name}-05-after-pan.png` })

  // ── MAX-TRAIL=100 via discrete real taps across successive scrolled pages (20x20 board now smaller) ──
  const dims = await page.evaluate(() => { const c = document.querySelector('canvas'); const s = c.parentElement; return { vw: s.clientWidth, vh: s.clientHeight, sw: s.scrollWidth, sh: s.scrollHeight } })
  const cols = Math.floor(dims.vw / TILE)
  const rows = Math.floor(dims.vh / TILE)
  const perPage = cols * rows
  // Build a page-offset grid covering the whole (now smaller, 920x920) scrollable canvas.
  const pageOffsets = []
  for (let ty = 0; ty <= dims.sh - dims.vh + 1; ty += dims.vh) {
    for (let tx = 0; tx <= dims.sw - dims.vw + 1; tx += dims.vw) {
      pageOffsets.push({ l: Math.min(tx, dims.sw - dims.vw), t: Math.min(ty, dims.sh - dims.vh) })
    }
  }
  let reached100 = false
  for (const off of pageOffsets) {
    await page.evaluate((o) => { const c = document.querySelector('canvas'); const s = c.parentElement; s.scrollLeft = o.l; s.scrollTop = o.t }, off)
    await wait(120)
    const sc = await page.evaluate(() => { const c = document.querySelector('canvas'); const rr = c.parentElement.getBoundingClientRect(); return { x: rr.x, y: rr.y } })
    for (let row = 0; row < rows; row++) {
      for (let c2 = 0; c2 < cols; c2++) {
        await page.touchscreen.tap(sc.x + TILE / 2 + c2 * TILE, sc.y + TILE / 2 + row * TILE)
        const len = parseInt((await trailLenText()) || '0', 10)
        if (len >= 100) { reached100 = true; break }
      }
      if (reached100) break
    }
    if (reached100) break
  }
  r.trailLenAfterTapTo100 = await trailLenText()
  r.perPageVisible = perPage
  r.pageOffsetsUsed = pageOffsets.length
  await page.screenshot({ path: `${OUT}/${d.name}-06-after-tap-to-100.png` })

  // Cap check: 3 more taps on unpinned tiles must not exceed 100.
  await page.evaluate(() => { const c = document.querySelector('canvas'); const s = c.parentElement; s.scrollLeft = s.scrollWidth - s.clientWidth; s.scrollTop = s.scrollHeight - s.clientHeight })
  await wait(120)
  const scCap = await page.evaluate(() => { const c = document.querySelector('canvas'); const rr = c.parentElement.getBoundingClientRect(); return { x: rr.x, y: rr.y } })
  for (let i = 0; i < 3; i++) {
    await page.touchscreen.tap(scCap.x + TILE / 2 + i * TILE, scCap.y + TILE / 2)
    await wait(60)
  }
  r.trailLenAfterCapAttempt = await trailLenText()
  r.breakerStateAt100 = await buttonState('THROW BREAKER')
  await page.screenshot({ path: `${OUT}/${d.name}-07-cap-at-100.png` })

  // ── CLEAR back to a clean 8-tile line for a fast, controllable settle ──
  await tapText('CLEAR')
  await wait(150)
  r.odometerAfterClear = await trailLenText()
  await page.evaluate(() => { const c = document.querySelector('canvas'); const s = c.parentElement; s.scrollLeft = (s.scrollWidth - s.clientWidth) / 2; s.scrollTop = (s.scrollHeight - s.clientHeight) / 2 })
  await wait(150)
  const scroller3 = await page.evaluate(() => {
    const c = document.querySelector('canvas'); const rr = c.parentElement.getBoundingClientRect()
    return { x: rr.x, y: rr.y }
  })
  for (let i = 0; i < 8; i++) {
    const col = i % 4, row = Math.floor(i / 4)
    await page.touchscreen.tap(scroller3.x + TILE / 2 + col * TILE, scroller3.y + TILE / 2 + row * TILE)
    await wait(60)
  }
  await wait(150)
  r.odometerRound1Final = await trailLenText()
  r.breakerBoxRound1 = await buttonBox('THROW BREAKER')
  r.breakerThumbZonePctRound1 = r.breakerBoxRound1 ? Math.round(((r.breakerBoxRound1.top + r.breakerBoxRound1.h / 2) / d.height) * 1000) / 10 : null

  if (r.breakerBoxRound1) await page.touchscreen.tap(r.breakerBoxRound1.x, r.breakerBoxRound1.y)
  await wait(900)
  await page.screenshot({ path: `${OUT}/${d.name}-08-settled-r1.png` })
  r.round1Outcome = await outcomeText()
  r.sessionChipAfterR1 = await sessionChipText()
  r.assayAgainBoxR1 = await buttonBox('ASSAY AGAIN')
  r.closeBoxR1 = await buttonBox('CLOSE')
  r.claimBoxR1 = await buttonBox('CLAIM')
  r.settledOverflow = await overflowCheck()
  r.settledControls = await measureAllControls()
  r.copyGlyphsR1 = await measureCopyGlyphs()

  // ── ROUND 2: ASSAY AGAIN → new independent line on a re-seeded board ──
  await tapText('ASSAY AGAIN')
  await wait(400)
  r.round2PlanningControls = await measureAllControls()
  await page.screenshot({ path: `${OUT}/${d.name}-09-round2-planning.png` })
  r.sameLineBoxR2 = await buttonBox('SAME LINE')
  r.clearBoxR2 = await buttonBox('CLEAR')
  r.paceBoxR2 = await buttonBox('PACE')
  r.breakerBoxR2Predisable = await buttonBox('THROW BREAKER')

  await tapText('SAME LINE')
  await wait(200)
  r.odometerAfterSameLine = await trailLenText()
  r.breakerBoxRound2 = await buttonBox('THROW BREAKER')
  r.breakerThumbZonePctRound2 = r.breakerBoxRound2 ? Math.round(((r.breakerBoxRound2.top + r.breakerBoxRound2.h / 2) / d.height) * 1000) / 10 : null
  if (r.breakerBoxRound2) await page.touchscreen.tap(r.breakerBoxRound2.x, r.breakerBoxRound2.y)
  await wait(900)
  await page.screenshot({ path: `${OUT}/${d.name}-10-settled-r2.png` })
  r.round2Outcome = await outcomeText()
  r.sessionChipAfterR2 = await sessionChipText()

  // ── ROUND 3+: force additional lines with a LONGER trail to see the
  // opposite outcome if not already observed — up to 4 more attempts. ──
  const outcomesSeen = new Set([r.round1Outcome, r.round2Outcome])
  let extraRounds = 0
  while (outcomesSeen.size < 2 && extraRounds < 4) {
    extraRounds++
    await tapText('ASSAY AGAIN')
    await wait(350)
    await page.evaluate(() => { const c = document.querySelector('canvas'); const s = c.parentElement; s.scrollLeft = (s.scrollWidth - s.clientWidth) / 2; s.scrollTop = (s.scrollHeight - s.clientHeight) / 2 })
    await wait(150)
    const sc = await page.evaluate(() => { const c = document.querySelector('canvas'); const rr = c.parentElement.getBoundingClientRect(); return { x: rr.x, y: rr.y } })
    for (let i = 0; i < 40; i++) {
      const col = i % 8, row = Math.floor(i / 8)
      await page.touchscreen.tap(sc.x + TILE / 2 + col * TILE, sc.y + TILE / 2 + row * TILE)
      await wait(20)
    }
    await wait(150)
    const pbox = await buttonBox('THROW BREAKER')
    if (pbox) await page.touchscreen.tap(pbox.x, pbox.y)
    await wait(900)
    const outc = await outcomeText()
    outcomesSeen.add(outc)
    r.checks.push({ extraRound: extraRounds, trailLen: 40, outcome: outc })
    await page.screenshot({ path: `${OUT}/${d.name}-11-extra-round-${extraRounds}.png` })
  }
  r.outcomesSeen = [...outcomesSeen]
  r.sessionChipFinal = await sessionChipText()
  r.copyGlyphsFinal = await measureCopyGlyphs()

  // No dead-end check: ASSAY AGAIN must still open a fresh planning phase now.
  await tapText('ASSAY AGAIN')
  await wait(300)
  r.postAllRoundsPhaseIsPlanning = await page.evaluate(() => !!document.body.innerText.match(/Select \d+ more nub/) || !!document.body.innerText.match(/Claim-line armed/))
  await page.screenshot({ path: `${OUT}/${d.name}-12-final-planning-check.png` })

  // ── CLAIM tap-target measurement (in a WIN settle, tap CLAIM/expand receipt) ──
  await page.evaluate(() => { const c = document.querySelector('canvas'); const s = c.parentElement; s.scrollLeft = (s.scrollWidth - s.clientWidth) / 2; s.scrollTop = (s.scrollHeight - s.clientHeight) / 2 })
  await wait(120)
  const scClaim = await page.evaluate(() => { const c = document.querySelector('canvas'); const rr = c.parentElement.getBoundingClientRect(); return { x: rr.x, y: rr.y } })
  for (let i = 0; i < 8; i++) {
    const col = i % 4, row = Math.floor(i / 4)
    await page.touchscreen.tap(scClaim.x + TILE / 2 + col * TILE, scClaim.y + TILE / 2 + row * TILE)
    await wait(50)
  }
  const bboxFinal = await buttonBox('THROW BREAKER')
  if (bboxFinal) await page.touchscreen.tap(bboxFinal.x, bboxFinal.y)
  await wait(900)
  r.finalOutcomeForClaimCheck = await outcomeText()
  r.claimButtonBoxFinal = await buttonBox('CLAIM')
  r.closeButtonBoxFinal = await buttonBox('CLOSE')
  await page.screenshot({ path: `${OUT}/${d.name}-13-final-claim-check.png` })

  // Tap CLAIM/expand to view certificate + measure CopyGlyph live (if a WIN this round).
  if (r.claimButtonBoxFinal) {
    await page.touchscreen.tap(r.claimButtonBoxFinal.x, r.claimButtonBoxFinal.y)
    await wait(250)
    r.copyGlyphsAfterClaimExpand = await measureCopyGlyphs()
    await page.screenshot({ path: `${OUT}/${d.name}-14-certificate-expanded.png` })
    // Actually tap the copy button and confirm the label flips to "copied".
    const cg = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /^copy$/i.test((b.textContent || '').trim())))
    const cgEl = cg.asElement()
    if (cgEl) {
      const box = await cgEl.evaluate((e) => { const rr = e.getBoundingClientRect(); return { x: rr.x + rr.width / 2, y: rr.y + rr.height / 2 } })
      await page.touchscreen.tap(box.x, box.y)
      await wait(150)
      r.copyGlyphFiredLabel = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => /^copied$/i.test((x.textContent || '').trim()))
        return b ? b.textContent.trim() : null
      })
    }
  }

  report[d.name] = r
}

report.errors = errors
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
process.exit(0)
