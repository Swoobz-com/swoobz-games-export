// Mobile-only completion pass for the v2 sweep. Root cause of the earlier
// "could not land a WIN/BUST in N attempts" + partial-arm (4/8) on mobile:
// the board <canvas> is 644x644 but only a 180x180 window of it is visible
// through `.assayBoardScroll` (overflow:auto, scrollLeft/scrollTop start at
// 142/142, NOT auto-following taps) — clicking a tile beyond ~col7 clamped
// to the same edge pixel over and over, toggling the SAME tile on/off
// instead of reaching 8 distinct tiles. Fix: scroll the tile into the
// window's center via el.scrollLeft/scrollTop before every click.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const SHOTS = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-overlapaudit-0706'
const OUTJSON = `${SHOTS}/overlap-sweep-results-mobilefix.json`
const wait = ms => new Promise(r => setTimeout(r, ms))

const VIEWPORTS = [
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

// Scroll-aware tile trace: bring each target tile to the center of the
// assayBoardScroll viewport, THEN click at that viewport's own center.
async function traceScrollAware(page, cells) {
  for (const [col, row] of cells) {
    await page.evaluate(([col, row]) => {
      const c = document.querySelector('canvas')
      const scrollEl = c.closest('.assayBoardScroll') || c.parentElement
      const rawRect = c.getBoundingClientRect()
      const TILE = rawRect.width / 14
      const targetLocalX = col * TILE + TILE / 2
      const targetLocalY = row * TILE + TILE / 2
      const viewW = scrollEl.clientWidth, viewH = scrollEl.clientHeight
      const maxScrollL = scrollEl.scrollWidth - viewW
      const maxScrollT = scrollEl.scrollHeight - viewH
      scrollEl.scrollLeft = Math.min(Math.max(targetLocalX - viewW / 2, 0), maxScrollL)
      scrollEl.scrollTop = Math.min(Math.max(targetLocalY - viewH / 2, 0), maxScrollT)
    }, [col, row])
    await wait(20)
    const clickAt = await page.evaluate(() => {
      const c = document.querySelector('canvas')
      const scrollEl = c.closest('.assayBoardScroll') || c.parentElement
      const er = scrollEl.getBoundingClientRect()
      return { x: er.left + er.width / 2, y: er.top + er.height / 2 }
    })
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
      if (c.hasOwnText) text = Array.from(c.el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim()
      else text = (c.el.textContent || '').trim().slice(0, 40)
      return { text: text.slice(0, 60), aria: c.el.getAttribute('aria-label') || '', role: c.el.getAttribute('role') || '', tag: c.el.tagName }
    }
    const items = candidates.map((c) => ({
      el: c.el,
      rect: { left: c.eff.left, top: c.eff.top, right: c.eff.right, bottom: c.eff.bottom, width: c.eff.width, height: c.eff.height },
      rawRect: c.eff.raw, label: labelFor(c), pointerEventsNoneInChain: c.pENone,
    }))
    const flagged = []
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const A = items[i], B = items[j]
        if (A.el === B.el) continue
        if (A.el.contains(B.el) || B.el.contains(A.el)) continue
        const ra = A.rect, rb = B.rect
        const ix = Math.max(ra.left, rb.left), iy = Math.max(ra.top, rb.top)
        const ax = Math.min(ra.right, rb.right), ay = Math.min(ra.bottom, rb.bottom)
        const w = ax - ix, h = ay - iy
        if (w > 2 && h > 2 && w * h >= 16) {
          const cx = ix + w / 2, cy = iy + h / 2
          const topEl = document.elementFromPoint(cx, cy)
          let coveredBy = 'unknown'
          if (topEl === A.el || (topEl && A.el.contains(topEl))) coveredBy = 'A'
          else if (topEl === B.el || (topEl && B.el.contains(topEl))) coveredBy = 'B'
          else if (topEl) coveredBy = `OTHER:${topEl.tagName}`
          flagged.push({
            A: { label: A.label, rect: A.rect, rawRect: A.rawRect, pENone: A.pointerEventsNoneInChain },
            B: { label: B.label, rect: B.rect, rawRect: B.rawRect, pENone: B.pointerEventsNoneInChain },
            overlapRect: { x: ix, y: iy, w, h }, overlapArea: w * h, coveredBy,
            eitherPointerEventsNone: A.pointerEventsNoneInChain || B.pointerEventsNoneInChain,
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
  const shotPath = `${SHOTS}/v2fix-${viewportName}__${phaseName}.png`
  await page.screenshot({ path: shotPath, fullPage: true })
  allResults.push({ viewport: viewportName, phase: phaseName, shot: shotPath, ...audit })
  console.log(`[${viewportName}] [${phaseName}] candidates=${audit.totalCandidates} flaggedRaw=${audit.flaggedCount}`)
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const allResults = []

for (const vp of VIEWPORTS) {
  console.log(`\n=== VIEWPORT ${vp.name} (mobile fix pass) ===`)

  // 3. PLANNING (fully armed, 8/8) + 4. ACTIVE
  {
    const page = await browser.newPage()
    await page.setViewport(vp)
    await page.goto(URL, { waitUntil: 'load' })
    await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
    await page.reload({ waitUntil: 'load' })
    await wait(500)
    await clickText(page, /ENTER THE DIVE/)
    await wait(300)
    await traceScrollAware(page, line8)
    await wait(250)
    const armedTxt = await page.evaluate(() => document.body.innerText)
    const fullyArmed = /^RUN THE LINE$/im.test(armedTxt.split('\n').find(l => /RUN THE LINE/.test(l))?.trim() || '')
    console.log(`[${vp.name}] fully armed after scroll-aware trace: ${/RUN THE LINE\s*$/m.test(armedTxt) || !/MORE/.test(armedTxt.match(/RUN THE LINE[^\n]*/)?.[0] || 'MORE')}`)
    await snapshot(page, vp.name, '3-planning-armed-fixed', allResults)

    await clickText(page, /^RUN THE LINE/)
    await wait(90)
    await snapshot(page, vp.name, '4-active-fixed', allResults)
    for (let i = 0; i < 40; i++) {
      await wait(100)
      const t = await page.evaluate(() => document.body.innerText)
      if (/SECURED THE HAUL|RUGGED BY THE DEEP/i.test(t)) break
    }
    await page.close()
  }

  // 5. SETTLED WIN
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
      await clickText(page, /REEF/i)
      await wait(150)
      await traceScrollAware(page, line8)
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
        await snapshot(page, vp.name, '5-settled-win-fixed', allResults)
        const toggled = await page.evaluate(() => {
          const r = /glass box|receipt|wreck reckoning/i
          const els = [...document.querySelectorAll('button, div, span')]
          const b = els.find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
          if (b) { b.click(); return true }
          return false
        })
        if (toggled) { await wait(200); await snapshot(page, vp.name, '5b-settled-win-gb-toggle-fixed', allResults) }
        done = true
      }
      await page.close()
    }
    if (!done) console.log(`[${vp.name}] WARNING: still could not land a WIN in 20 attempts (post-fix)`)
  }

  // 6. SETTLED BUST
  {
    let done = false
    for (let attempt = 0; attempt < 12 && !done; attempt++) {
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
      await traceScrollAware(page, line8)
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
        await snapshot(page, vp.name, '6-settled-bust-fixed', allResults)
        done = true
      }
      await page.close()
    }
    if (!done) console.log(`[${vp.name}] WARNING: still could not land a BUST in 12 attempts (post-fix)`)
  }
}

await browser.close()
fs.writeFileSync(OUTJSON, JSON.stringify(allResults, null, 2))
console.log(`\nWrote ${OUTJSON}`)
console.log('\n=== FLAGGED PAIRS (mobile fix pass) ===')
for (const r of allResults) {
  if (r.flaggedCount === 0) continue
  console.log(`\n--- ${r.viewport} / ${r.phase} (${r.flaggedCount} flagged) ---`)
  for (const f of r.flagged) {
    console.log(JSON.stringify({ A: f.A.label.text || f.A.label.aria || f.A.label.tag, B: f.B.label.text || f.B.label.aria || f.B.label.tag, overlap: f.overlapRect, area: Math.round(f.overlapArea), coveredBy: f.coveredBy, eitherPENone: f.eitherPointerEventsNone, atCenter: f.elementAtCenter }))
  }
}
