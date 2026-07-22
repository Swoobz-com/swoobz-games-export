// MEASURED overlap sweep for ABYSS LINE (originals/assay), all phases x all viewports.
// swoobz-visual-regression-qa, 2026-07-06. FRESH driver (not reusing any prior
// codotty/qa probe's overlap-detection code — navigation helpers only, per
// AGENT_MEMORY "own driver, not the maker's" pattern). DIAGNOSTIC ONLY: no edits.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const SHOTS = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-overlapaudit-0706'
const OUTJSON = `${SHOTS}/overlap-sweep-results.json`
fs.mkdirSync(SHOTS, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900, deviceScaleFactor: 1 },
  { name: 'desktop-1920x1080', width: 1920, height: 1080, deviceScaleFactor: 1 },
  { name: 'pixel7-412x915', width: 412, height: 915, deviceScaleFactor: 1 },
  { name: 'iphone14pro-393x852', width: 393, height: 852, deviceScaleFactor: 1 },
]

const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const els = [...document.querySelectorAll('button, div, span')]
  const b = els.find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return b.textContent.trim() }
  return null
}, re.source)

async function boardGeo(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { left: r.left, top: r.top, w: r.width, h: r.height, bottom: r.bottom }
  })
}
async function trace(page, cells) {
  const geo = await boardGeo(page)
  const TILE = geo.w / 14 // >= min grid; harmless overshoot on smaller grids since we only use small col/row indices
  for (const [col, row] of cells) {
    await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2)
    await wait(30)
  }
}
const line8 = [[3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3]]

// ---- in-page pairwise overlap auditor (fresh logic, browser-side) ----
async function auditOverlaps(page) {
  return page.evaluate(() => {
    function visible(style, rect) {
      if (style.display === 'none' || style.visibility === 'hidden') return false
      if (parseFloat(style.opacity) === 0) return false
      if (rect.width < 2 || rect.height < 2) return false
      return true
    }
    const all = Array.from(document.querySelectorAll('*'))
    const candidates = []
    for (const el of all) {
      const style = getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      if (!visible(style, rect)) continue
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
      candidates.push({ el, rect, style, hasOwnText })
    }
    function labelFor(c) {
      let text = ''
      if (c.hasOwnText) {
        text = Array.from(c.el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim()
      } else {
        text = (c.el.textContent || '').trim().slice(0, 40)
      }
      return {
        text: text.slice(0, 60),
        aria: c.el.getAttribute('aria-label') || '',
        role: c.el.getAttribute('role') || '',
        tag: c.el.tagName,
      }
    }
    const items = candidates.map((c) => ({
      el: c.el,
      rect: { left: c.rect.left, top: c.rect.top, right: c.rect.right, bottom: c.rect.bottom, width: c.rect.width, height: c.rect.height },
      label: labelFor(c),
      pointerEvents: c.style.pointerEvents,
      position: c.style.position,
      zIndex: c.style.zIndex,
    }))
    const flagged = []
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const A = items[i], B = items[j]
        if (A.el === B.el) continue
        if (A.el.contains(B.el) || B.el.contains(A.el)) continue // ancestor/descendant = nesting, not a collision
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
            A: { label: A.label, rect: A.rect, pointerEvents: A.pointerEvents, position: A.position, zIndex: A.zIndex },
            B: { label: B.label, rect: B.rect, pointerEvents: B.pointerEvents, position: B.position, zIndex: B.zIndex },
            overlapRect: { x: ix, y: iy, w, h },
            overlapArea: w * h,
            coveredBy,
            elementAtCenter: topEl ? { tag: topEl.tagName, text: (topEl.textContent || '').trim().slice(0, 40) } : null,
          })
        }
      }
    }
    return { totalCandidates: items.length, flaggedCount: flagged.length, flagged }
  })
}

async function snapshot(page, viewportName, phaseName, allResults) {
  const audit = await auditOverlaps(page)
  const shotPath = `${SHOTS}/${viewportName}__${phaseName}.png`
  await page.screenshot({ path: shotPath, fullPage: true })
  allResults.push({ viewport: viewportName, phase: phaseName, shot: shotPath, ...audit })
  console.log(`[${viewportName}] [${phaseName}] candidates=${audit.totalCandidates} flaggedRaw=${audit.flaggedCount}`)
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const allResults = []

for (const vp of VIEWPORTS) {
  console.log(`\n=== VIEWPORT ${vp.name} ===`)

  // ---- 1. LOBBY / ENTRY ----
  {
    const page = await browser.newPage()
    await page.setViewport(vp)
    await page.goto(URL, { waitUntil: 'load' })
    await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
    await page.reload({ waitUntil: 'load' })
    await wait(500)
    await snapshot(page, vp.name, '1-lobby', allResults)
    await page.close()
  }

  // ---- 2. BET-ENTRY (post ENTER THE DIVE, zero pods traced: chips/depth visible, zero-state) ----
  // ---- 3. PLANNING (armed: 8 pods traced, TO WIN populated) ----
  // ---- 4. ACTIVE (immediately after RUN THE LINE, pre-settle) ----
  {
    const page = await browser.newPage()
    await page.setViewport(vp)
    await page.goto(URL, { waitUntil: 'load' })
    await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
    await page.reload({ waitUntil: 'load' })
    await wait(500)
    await clickText(page, /ENTER THE DIVE/)
    await wait(400)
    await snapshot(page, vp.name, '2-bet-entry', allResults)

    await trace(page, line8)
    await wait(250)
    await snapshot(page, vp.name, '3-planning-armed', allResults)

    await clickText(page, /^RUN THE LINE/)
    await wait(90) // grab a mid-resolution frame before settle text lands, if any
    await snapshot(page, vp.name, '4-active', allResults)

    // drain to settle so this page doesn't dangle mid-animation
    for (let i = 0; i < 40; i++) {
      await wait(100)
      const t = await page.evaluate(() => document.body.innerText)
      if (/SECURED THE HAUL|RUGGED BY THE DEEP/i.test(t)) break
    }
    await page.close()
  }

  // ---- 5. SETTLED - WIN (retry with REEF depth + short line until a win lands) ----
  {
    let done = false
    for (let attempt = 0; attempt < 24 && !done; attempt++) {
      const page = await browser.newPage()
      await page.setViewport(vp)
      await page.goto(URL, { waitUntil: 'load' })
      await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
      await page.reload({ waitUntil: 'load' })
      await wait(400)
      await clickText(page, /ENTER THE DIVE/)
      await wait(200)
      await clickText(page, /REEF/i)
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
      if (settledText && /SECURED THE HAUL/i.test(settledText)) {
        await wait(150)
        await snapshot(page, vp.name, '5-settled-win', allResults)
        // also open the Glass Box receipt drawer if a toggle exists (best-effort probe)
        const toggled = await page.evaluate(() => {
          const r = /glass box|receipt|wreck reckoning/i
          const els = [...document.querySelectorAll('button, div, span')]
          const b = els.find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
          if (b) { b.click(); return true }
          return false
        })
        if (toggled) {
          await wait(200)
          await snapshot(page, vp.name, '5b-settled-win-gb-toggle', allResults)
        }
        done = true
      }
      await page.close()
    }
    if (!done) console.log(`[${vp.name}] WARNING: could not land a WIN in 24 attempts`)
  }

  // ---- 6. SETTLED - BUST (HADAL depth, force a bust) ----
  {
    let done = false
    for (let attempt = 0; attempt < 16 && !done; attempt++) {
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
        await snapshot(page, vp.name, '6-settled-bust', allResults)
        done = true
      }
      await page.close()
    }
    if (!done) console.log(`[${vp.name}] WARNING: could not land a BUST in 16 attempts`)
  }
}

await browser.close()

fs.writeFileSync(OUTJSON, JSON.stringify(allResults, null, 2))
console.log(`\nWrote ${OUTJSON}`)

// ---- print a compact summary of every flagged pair across the whole sweep ----
console.log('\n=== FLAGGED PAIRS (raw, before intentional-overlay classification) ===')
for (const r of allResults) {
  if (r.flaggedCount === 0) continue
  console.log(`\n--- ${r.viewport} / ${r.phase} (${r.flaggedCount} flagged) ---`)
  for (const f of r.flagged) {
    console.log(JSON.stringify({
      A: f.A.label.text || f.A.label.aria || f.A.label.tag,
      Apos: f.A.position, ApE: f.A.pointerEvents,
      B: f.B.label.text || f.B.label.aria || f.B.label.tag,
      Bpos: f.B.position, BpE: f.B.pointerEvents,
      overlap: f.overlapRect, area: f.overlapArea, coveredBy: f.coveredBy,
      atCenter: f.elementAtCenter,
    }))
  }
}
