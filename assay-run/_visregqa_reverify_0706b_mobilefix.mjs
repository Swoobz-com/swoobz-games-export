// MOBILE-ONLY completion pass for _visregqa_reverify_0706b.mjs.
// Root cause of that run's "no WIN in 30 attempts" / capped-at-4/8-armed on
// mobile: my trace() clamped clicks into the CURRENT visible window without
// ever moving scroll, so tiles beyond the initial ~180x180 pan window all
// landed on the same edge pixel (the exact documented gotcha in
// swoobz-visual-regression-qa memory, matches the "4/8 traced pods" pattern
// exactly). Fix: branch like codotty's own traceLine — if a `.assayBoardScroll`
// ancestor exists (mobile), scroll it so the target tile is centered THEN
// click the viewport center; if not (desktop, no scroll ancestor), click the
// tile's raw on-canvas position directly (unchanged, still correct).
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const SHOTS = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-visregqa-reverify-0706b'
const OUTJSON = `${SHOTS}/results-mobilefix.json`
fs.mkdirSync(SHOTS, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))

const VIEWPORTS = [
  { name: 'pixel7-412x915', width: 412, height: 915, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  { name: 'iphone14pro-393x852', width: 393, height: 852, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
]

const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const els = [...document.querySelectorAll('button, div, span')]
  const b = els.find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return b.textContent.trim() }
  return null
}, re.source)

// Branching trace: scroll-aware on mobile (.assayBoardScroll ancestor
// present), direct-tile-position on desktop (no scroll ancestor).
async function trace(page, cells) {
  for (const [col, row] of cells) {
    const clickAt = await page.evaluate(([col, row]) => {
      const c = document.querySelector('.assayBoardScroll canvas') || document.querySelector('canvas')
      const scrollEl = c.closest('.assayBoardScroll')
      const rawRect = c.getBoundingClientRect()
      const TILE = rawRect.width / 14
      if (scrollEl) {
        const targetLocalX = col * TILE + TILE / 2
        const targetLocalY = row * TILE + TILE / 2
        const viewW = scrollEl.clientWidth, viewH = scrollEl.clientHeight
        scrollEl.scrollLeft = Math.min(Math.max(targetLocalX - viewW / 2, 0), scrollEl.scrollWidth - viewW)
        scrollEl.scrollTop = Math.min(Math.max(targetLocalY - viewH / 2, 0), scrollEl.scrollHeight - viewH)
        const er = scrollEl.getBoundingClientRect()
        return { x: er.left + er.width / 2, y: er.top + er.height / 2 }
      }
      return { x: rawRect.left + col * TILE + TILE / 2, y: rawRect.top + row * TILE + TILE / 2 }
    }, [col, row])
    await page.mouse.click(clickAt.x, clickAt.y)
    await wait(40)
  }
}
const line8 = [[3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3]]

async function auditOverlaps(page) {
  return page.evaluate(() => {
    function effectiveRect(el) {
      const rect = el.getBoundingClientRect()
      let cur = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
      let anc = el.parentElement
      let clippedAway = false
      while (anc && anc !== document.documentElement) {
        const s = getComputedStyle(anc)
        if (s.overflow !== 'visible' || s.overflowX !== 'visible' || s.overflowY !== 'visible') {
          const ar = anc.getBoundingClientRect()
          cur = { left: Math.max(cur.left, ar.left), top: Math.max(cur.top, ar.top), right: Math.min(cur.right, ar.right), bottom: Math.min(cur.bottom, ar.bottom) }
        }
        anc = anc.parentElement
      }
      cur.left = Math.max(cur.left, 0); cur.top = Math.max(cur.top, 0)
      cur.right = Math.min(cur.right, window.innerWidth); cur.bottom = Math.min(cur.bottom, window.innerHeight)
      const w = cur.right - cur.left, h = cur.bottom - cur.top
      if (w <= 0 || h <= 0) clippedAway = true
      return { left: cur.left, top: cur.top, right: cur.right, bottom: cur.bottom, width: Math.max(0, w), height: Math.max(0, h), clippedAway, raw: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } }
    }
    function hasPointerEventsNoneInChain(el) {
      let cur = el
      while (cur && cur !== document.documentElement) {
        if (getComputedStyle(cur).pointerEvents === 'none') return true
        cur = cur.parentElement
      }
      return false
    }
    function visible(style, rawRect) {
      if (style.display === 'none' || style.visibility === 'hidden') return false
      if (parseFloat(style.opacity) === 0) return false
      if (rawRect.width < 2 || rawRect.height < 2) return false
      return true
    }
    const all = Array.from(document.querySelectorAll('*'))
    const candidates = []
    for (const el of all) {
      const style = getComputedStyle(el)
      const rawRect = el.getBoundingClientRect()
      if (!visible(style, rawRect)) continue
      let hasOwnText = false
      for (const node of el.childNodes) {
        if (node.nodeType === 3 && node.textContent.trim().length > 0) { hasOwnText = true; break }
      }
      const tag = el.tagName
      const isButton = tag === 'BUTTON' || el.getAttribute('role') === 'button'
      const isCanvas = tag === 'CANVAS'
      const isSvgRoot = tag === 'SVG'
      const isInput = tag === 'INPUT'
      if (!(hasOwnText || isButton || isCanvas || isSvgRoot || isInput)) continue
      const eff = effectiveRect(el)
      if (eff.clippedAway) continue
      candidates.push({ el, eff, hasOwnText, pENone: hasPointerEventsNoneInChain(el) })
    }
    function labelFor(c) {
      let text = ''
      if (c.hasOwnText) {
        text = Array.from(c.el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim()
      } else {
        text = (c.el.textContent || '').trim().slice(0, 40)
      }
      return { text: text.slice(0, 60), aria: c.el.getAttribute('aria-label') || '', role: c.el.getAttribute('role') || '', tag: c.el.tagName }
    }
    const items = candidates.map((c) => ({
      el: c.el,
      rect: { left: c.eff.left, top: c.eff.top, right: c.eff.right, bottom: c.eff.bottom, width: c.eff.width, height: c.eff.height },
      label: labelFor(c),
      pointerEventsNoneInChain: c.pENone,
    }))
    const flagged = []
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const A = items[i], B = items[j]
        if (A.el === B.el) continue
        if (A.el.contains(B.el) || B.el.contains(A.el)) continue
        const ra = A.rect, rb = B.rect
        const ix = Math.max(ra.left, rb.left)
        const iy = Math.max(ra.top, rb.top)
        const ax = Math.min(ra.right, rb.right)
        const ay = Math.min(ra.bottom, rb.bottom)
        const w = ax - ix, h = ay - iy
        if (w > 2 && h > 2 && w * h >= 16) {
          const cx = ix + w / 2, cy = iy + h / 2
          const topEl = document.elementFromPoint(cx, cy)
          let coveredBy = 'unknown'
          if (topEl === A.el || (topEl && A.el.contains(topEl))) coveredBy = 'A'
          else if (topEl === B.el || (topEl && B.el.contains(topEl))) coveredBy = 'B'
          else if (topEl) coveredBy = `OTHER:${topEl.tagName}`
          flagged.push({
            A: { label: A.label, rect: A.rect, pENone: A.pointerEventsNoneInChain },
            B: { label: B.label, rect: B.rect, pENone: B.pointerEventsNoneInChain },
            overlapRect: { x: ix, y: iy, w, h },
            overlapArea: w * h,
            coveredBy,
            eitherPointerEventsNone: A.pointerEventsNoneInChain || B.pointerEventsNoneInChain,
          })
        }
      }
    }
    return { totalCandidates: items.length, flaggedCount: flagged.length, flagged }
  })
}

async function measureReceiptNamed(page) {
  return page.evaluate(() => {
    const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: +r.left.toFixed(1), top: +r.top.toFixed(1), right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) } }
    const all = [...document.querySelectorAll('div')]
    const poly = [...document.querySelectorAll('polygon')].find(p => p.getAttribute('points') === '16,10.8 20.6,16 16,21.2 11.4,16')
    const seal = poly ? poly.closest('div[style*="border-radius: 50%"]') : null
    const headline = seal ? seal.previousElementSibling : null
    const payoutLabel = all.find(d => d.childNodes.length === 1 && d.textContent.trim() === 'PAYOUT')
    const payoutValue = payoutLabel ? payoutLabel.nextElementSibling : null
    const copyBtns = [...document.querySelectorAll('button')].filter(b => (b.getAttribute('aria-label') || '').startsWith('Copy '))
    return {
      seal: R(seal), headline: R(headline), payout: R(payoutValue), copy1: R(copyBtns[0]), copy2: R(copyBtns[1]),
      payoutText: payoutValue ? payoutValue.textContent.trim() : null,
      headlineText: headline ? headline.textContent.trim().slice(0, 60) : null,
    }
  })
}
function inter(a, b) {
  if (!a || !b) return { na: true }
  const ix = Math.max(a.left, b.left), iy = Math.max(a.top, b.top)
  const ax = Math.min(a.right, b.right), ay = Math.min(a.bottom, b.bottom)
  const w = ax - ix, h = ay - iy
  return w > 0 && h > 0 ? { w: +w.toFixed(1), h: +h.toFixed(1), area: +(w * h).toFixed(1) } : { w: 0, h: 0, area: 0 }
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const report = { receipt: [], mobileChip: [], regressionPhases: [] }

for (const vp of VIEWPORTS) {
  console.log(`\n=== ${vp.name} ===`)

  // ---- A. SETTLED-WIN receipt ----
  {
    let done = false
    for (let attempt = 0; attempt < 30 && !done; attempt++) {
      const page = await browser.newPage()
      await page.setViewport(vp)
      await page.goto(URL, { waitUntil: 'load' })
      await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
      await page.reload({ waitUntil: 'load' })
      await wait(450)
      await clickText(page, /ENTER THE DIVE/)
      await wait(220)
      await clickText(page, /REEF/i)
      await wait(150)
      await trace(page, line8)
      await wait(200)
      const armedCheck = await page.evaluate(() => document.body.innerText)
      await clickText(page, /^RUN THE LINE/)
      let settledText = null
      for (let i = 0; i < 45 && !settledText; i++) {
        await wait(120)
        const t = await page.evaluate(() => document.body.innerText)
        if (/SECURED THE HAUL|RUGGED BY THE DEEP/i.test(t)) settledText = t
      }
      if (settledText && /SECURED THE HAUL/i.test(settledText)) {
        await wait(250)
        const named = await measureReceiptNamed(page)
        const sealVsPayout = inter(named.seal, named.payout)
        const sealVsCopy1 = inter(named.seal, named.copy1)
        const sealVsHeadline = inter(named.seal, named.headline)
        const copy1VsCopy2 = inter(named.copy1, named.copy2)
        const fullSweep = await auditOverlaps(page)
        await page.screenshot({ path: `${SHOTS}/receipt-${vp.name}.png`, fullPage: true })
        report.receipt.push({ viewport: vp.name, named, sealVsPayout, sealVsCopy1, sealVsHeadline, copy1VsCopy2, fullSweepFlaggedCount: fullSweep.flaggedCount, fullSweepFlagged: fullSweep.flagged, attempt })
        console.log(`[RECEIPT][${vp.name}] attempt=${attempt} payout=${named.payoutText} seal∩PAYOUT=${sealVsPayout.area} seal∩copy1=${sealVsCopy1.area} seal∩headline=${sealVsHeadline.area} copy1∩copy2=${copy1VsCopy2.area} | fullSweepFlagged=${fullSweep.flaggedCount}`)
        if (fullSweep.flaggedCount > 0) {
          for (const f of fullSweep.flagged) console.log('  FLAG:', JSON.stringify({ A: f.A.label.text || f.A.label.tag, B: f.B.label.text || f.B.label.tag, area: Math.round(f.overlapArea), coveredBy: f.coveredBy, pENone: f.eitherPointerEventsNone }))
        }
        done = true
      } else if (!settledText) {
        console.log(`[RECEIPT][${vp.name}] attempt=${attempt} STUCK, armed-text-snippet=`, armedCheck.match(/Select \d+ more|RUN THE LINE[^\n]*/)?.[0] || 'n/a')
      }
      await page.close()
    }
    if (!done) { console.log(`[RECEIPT][${vp.name}] WARNING no WIN in 30 attempts`); report.receipt.push({ viewport: vp.name, error: 'no-win' }) }
  }

  // ---- B. mobile ACTIVE-phase delta-chip vs zone label ----
  {
    const page = await browser.newPage()
    await page.setViewport(vp)
    await page.goto(URL, { waitUntil: 'load' })
    await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
    await page.reload({ waitUntil: 'load' })
    await wait(450)
    await clickText(page, /ENTER THE DIVE/)
    await wait(220)
    await trace(page, line8)
    await wait(150)
    await clickText(page, /^RUN THE LINE/)
    let worst = { area: 0 }
    let sawChip = false
    for (let i = 0; i < 80; i++) {
      const m = await page.evaluate(() => {
        const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom } }
        const all = [...document.querySelectorAll('div')]
        const chip = all.find(d => d.childNodes.length >= 1 && /→ haul$/.test(d.textContent.trim()) && d.textContent.trim().startsWith('+'))
        const zoneLabel = all.find(d => d.childNodes.length === 1 && /^(REEF SHELF|MIDNIGHT ZONE|HADAL TRENCH)$/.test(d.textContent.trim()))
        const settled = /SECURED THE HAUL|RUGGED BY THE DEEP/i.test(document.body.innerText)
        return { chip: R(chip), zone: R(zoneLabel), settled }
      })
      if (m.chip && m.zone) {
        sawChip = true
        const ov = inter(m.chip, m.zone)
        if (ov.area > worst.area) worst = ov
        await page.screenshot({ path: `${SHOTS}/active-chip-${vp.name}-frame${i}.png` })
      }
      if (m.settled) break
      await wait(35)
    }
    const fullSweepActive = await auditOverlaps(page)
    await page.screenshot({ path: `${SHOTS}/active-final-${vp.name}.png` })
    report.mobileChip.push({ viewport: vp.name, sawChip, worstOverlap: worst, fullSweepFlaggedCount: fullSweepActive.flaggedCount, fullSweepFlagged: fullSweepActive.flagged })
    console.log(`[CHIP][${vp.name}] sawChip=${sawChip} worst delta∩zone=${worst.area || 0} | activeFullSweepFlagged=${fullSweepActive.flaggedCount}`)
    await page.close()
  }

  // ---- C. Regression check: lobby / bet-entry / planning-armed ----
  {
    const page = await browser.newPage()
    await page.setViewport(vp)
    await page.goto(URL, { waitUntil: 'load' })
    await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
    await page.reload({ waitUntil: 'load' })
    await wait(500)
    const lobbyAudit = await auditOverlaps(page)
    await page.screenshot({ path: `${SHOTS}/lobby-${vp.name}.png`, fullPage: true })

    await clickText(page, /ENTER THE DIVE/)
    await wait(400)
    const betEntryAudit = await auditOverlaps(page)
    await page.screenshot({ path: `${SHOTS}/bet-entry-${vp.name}.png`, fullPage: true })

    await trace(page, line8)
    await wait(250)
    const armedText = await page.evaluate(() => document.body.innerText)
    const planningAudit = await auditOverlaps(page)
    await page.screenshot({ path: `${SHOTS}/planning-${vp.name}.png`, fullPage: true })

    report.regressionPhases.push({ viewport: vp.name, phase: 'lobby', flaggedCount: lobbyAudit.flaggedCount, flagged: lobbyAudit.flagged })
    report.regressionPhases.push({ viewport: vp.name, phase: 'bet-entry', flaggedCount: betEntryAudit.flaggedCount, flagged: betEntryAudit.flagged })
    report.regressionPhases.push({ viewport: vp.name, phase: 'planning-armed', flaggedCount: planningAudit.flaggedCount, flagged: planningAudit.flagged })
    console.log(`[REGRESSION][${vp.name}] lobby=${lobbyAudit.flaggedCount} bet-entry=${betEntryAudit.flaggedCount} planning=${planningAudit.flaggedCount} armed=${/RUN THE LINE(?! ·)/.test(armedText)}`)
    await page.close()
  }

  // ---- D. settled-bust ----
  {
    let done = false
    for (let attempt = 0; attempt < 20 && !done; attempt++) {
      const page = await browser.newPage()
      await page.setViewport(vp)
      await page.goto(URL, { waitUntil: 'load' })
      await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
      await page.reload({ waitUntil: 'load' })
      await wait(400)
      await clickText(page, /ENTER THE DIVE/)
      await wait(200)
      await clickText(page, /HADAL/i)
      await wait(150)
      await trace(page, line8)
      await wait(150)
      await clickText(page, /^RUN THE LINE/)
      let settledText = null
      for (let i = 0; i < 40 && !settledText; i++) {
        await wait(120)
        const t = await page.evaluate(() => document.body.innerText)
        if (/SECURED THE HAUL|RUGGED BY THE DEEP/i.test(t)) settledText = t
      }
      if (settledText && /RUGGED BY THE DEEP/i.test(settledText)) {
        await wait(150)
        const bustAudit = await auditOverlaps(page)
        await page.screenshot({ path: `${SHOTS}/settled-bust-${vp.name}.png`, fullPage: true })
        report.regressionPhases.push({ viewport: vp.name, phase: 'settled-bust', flaggedCount: bustAudit.flaggedCount, flagged: bustAudit.flagged })
        console.log(`[REGRESSION][${vp.name}] settled-bust=${bustAudit.flaggedCount}`)
        done = true
      }
      await page.close()
    }
    if (!done) console.log(`[REGRESSION][${vp.name}] WARNING could not land BUST in 20 attempts`)
  }
}

await browser.close()
fs.writeFileSync(OUTJSON, JSON.stringify(report, null, 2))
console.log('\nWROTE', OUTJSON)
