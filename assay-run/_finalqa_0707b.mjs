import puppeteer from 'puppeteer-core'
import fs from 'fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-finalqa-0707b'
fs.mkdirSync(OUT, { recursive: true })

const DEVICES = [
  { name: 'pixel7', width: 412, height: 915, dsf: 2.625, ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' },
  { name: 'iphone14pro', width: 393, height: 852, dsf: 3, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1' },
]

const GRID_DIM = 14

async function measureAllButtons(page) {
  return page.evaluate(() => {
    const els = [...document.querySelectorAll('button, [role="button"]')]
    return els.map((b) => {
      const r = b.getBoundingClientRect()
      const cs = getComputedStyle(b)
      const txt = (b.textContent || '').trim().slice(0, 40)
      return {
        text: txt, aria: b.getAttribute('aria-label'),
        width: +r.width.toFixed(1), height: +r.height.toFixed(1),
        top: +r.top.toFixed(1), left: +r.left.toFixed(1),
        touchAction: cs.touchAction,
        visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none',
        disabled: !!b.disabled,
      }
    }).filter((b) => b.visible)
  })
}
const findBtn = (list, matcher) => list.find(matcher)
const tapAt = async (page, x, y) => page.touchscreen.tap(x, y)

async function getBoardGeom(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return null
    let node = canvas.parentElement
    let scrollAncestor = null
    while (node) {
      const cs = getComputedStyle(node)
      if (cs.overflowX === 'auto' || cs.overflowY === 'auto' || cs.overflow === 'auto') { scrollAncestor = node; break }
      node = node.parentElement
    }
    if (!scrollAncestor) return { canvasOnly: true, canvasRect: canvas.getBoundingClientRect() }
    const sr = scrollAncestor.getBoundingClientRect()
    const cr = canvas.getBoundingClientRect()
    return {
      scrollClass: scrollAncestor.className,
      scrollRect: { top: sr.top, left: sr.left, width: sr.width, height: sr.height },
      canvasRect: { top: cr.top, left: cr.left, width: cr.width, height: cr.height },
      scrollLeft: scrollAncestor.scrollLeft, scrollTop: scrollAncestor.scrollTop,
      scrollWidth: scrollAncestor.scrollWidth, scrollHeight: scrollAncestor.scrollHeight,
    }
  })
}

async function readWager(page) {
  // the wager amount is the ONLY leaf div at fontSize:19 rendered in FONT_MONO gold (ACCENT_NUM)
  return page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && getComputedStyle(d).fontSize === '19px')
    return el ? el.textContent : null
  })
}
async function readArmingPrompt(page) {
  return page.evaluate(() => {
    const n = [...document.querySelectorAll('div,span,b')].find((d) => /more ducat/i.test(d.textContent || '') && d.children.length <= 2)
    return n ? n.textContent.trim() : null
  })
}
async function readTrailCount(page) {
  return page.evaluate(() => {
    const n = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && /^\d+$/.test((d.textContent || '').trim()) && d.previousElementSibling === null && d.parentElement && /CLAIM LINE/i.test(d.parentElement.textContent || ''))
    if (n) return n.textContent.trim()
    // fallback: read from RUN THE LINE aria/text "N MORE"
    const b = document.querySelector('button[aria-label*="Run the line"]')
    return b ? b.textContent : null
  })
}

// sample a small patch of canvas pixels around (screenX, screenY) in CSS px,
// mapped to backing-store px via devicePixelRatio, and report whether a
// cyan route_link-ish pixel (~R53,G224,B210) is present nearby.
async function sampleCyanNear(page, cssX, cssY, radius = 10) {
  return page.evaluate((cx, cy, r) => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const ctx = canvas.getContext('2d')
    const bx = Math.round((cx - rect.left) * scaleX)
    const by = Math.round((cy - rect.top) * scaleY)
    const sx = Math.max(0, bx - r * scaleX)
    const sy = Math.max(0, by - r * scaleY)
    const sw = Math.min(canvas.width - sx, r * 2 * scaleX)
    const sh = Math.min(canvas.height - sy, r * 2 * scaleY)
    if (sw <= 0 || sh <= 0) return { error: 'out-of-bounds', bx, by }
    let data
    try {
      data = ctx.getImageData(sx, sy, sw, sh).data
    } catch (e) {
      return { error: String(e) }
    }
    let cyanHits = 0
    for (let i = 0; i < data.length; i += 4) {
      const R = data[i], G = data[i + 1], B = data[i + 2], A = data[i + 3]
      if (A > 40 && G > 140 && B > 120 && R < 130 && G > R + 40 && B > R + 30) cyanHits++
    }
    return { cyanHits, totalPx: data.length / 4 }
  }, cssX, cssY, radius)
}

async function run(dev) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
  const page = (await browser.pages())[0]
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message))
  await page.setUserAgent(dev.ua)
  await page.emulate({ viewport: { width: dev.width, height: dev.height, deviceScaleFactor: dev.dsf, isMobile: true, hasTouch: true, isLandscape: false } })
  const result = { device: dev.name, viewport: `${dev.width}x${dev.height}` }

  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await page.evaluate(() => localStorage.setItem('assay_coachmark_seen_v1', '1'))
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(300)

  result.metaViewport = await page.evaluate(() => document.querySelector('meta[name="viewport"]')?.content || null)

  await page.screenshot({ path: `${OUT}/${dev.name}-01-lobby.png` })
  let btns = await measureAllButtons(page)
  const enterBtn = findBtn(btns, (b) => /ENTER THE DIVE/i.test(b.text))
  result.lobbyCTA = enterBtn
  if (enterBtn) await tapAt(page, enterBtn.left + enterBtn.width / 2, enterBtn.top + enterBtn.height / 2)
  await wait(400)
  await page.screenshot({ path: `${OUT}/${dev.name}-02-planning.png` })

  btns = await measureAllButtons(page)
  result.allButtonsPlanning = btns

  const tierBtn = findBtn(btns, (b) => /REEF SHELF/i.test(b.aria || ''))
  if (tierBtn) {
    const before = await page.evaluate((a) => document.querySelector(`button[aria-label="${a}"]`)?.getAttribute('aria-current'), tierBtn.aria)
    await tapAt(page, tierBtn.left + tierBtn.width / 2, tierBtn.top + tierBtn.height / 2)
    await wait(150)
    const after = await page.evaluate((a) => document.querySelector(`button[aria-label="${a}"]`)?.getAttribute('aria-current'), tierBtn.aria)
    result.tierTapFires = { aria: tierBtn.aria, before, after, changed: before !== after, box: { w: tierBtn.width, h: tierBtn.height } }
  }

  const plusBtn = findBtn(btns, (b) => b.text === '+')
  result.calibKnobPlus = plusBtn
  result.calibKnobMinus = findBtn(btns, (b) => b.text === '−' || b.text === '-')
  if (plusBtn) {
    const wagerBefore = await readWager(page)
    await tapAt(page, plusBtn.left + plusBtn.width / 2, plusBtn.top + plusBtn.height / 2)
    await wait(150)
    const wagerAfter = await readWager(page)
    result.calibKnobPlusFires = { wagerBefore, wagerAfter, changed: wagerBefore !== wagerAfter }
  }

  const chip10 = findBtn(btns, (b) => b.text === '10')
  result.quickChip10 = chip10
  if (chip10) {
    const wagerBefore = await readWager(page)
    await tapAt(page, chip10.left + chip10.width / 2, chip10.top + chip10.height / 2)
    await wait(150)
    const wagerAfter = await readWager(page)
    result.quickChip10Fires = { wagerBefore, wagerAfter, changed: wagerBefore !== wagerAfter }
  }

  const playSafe = findBtn(btns, (b) => /PLAY SAFE/i.test(b.text))
  result.playSafeBtn = playSafe
  if (playSafe) {
    await tapAt(page, playSafe.left + playSafe.width / 2, playSafe.top + playSafe.height / 2)
    await wait(200)
    const modalOpen = await page.evaluate(() => !!document.body.textContent.match(/self-exclusion|session limits/i))
    result.playSafeTapFires = modalOpen
    if (modalOpen) {
      await page.screenshot({ path: `${OUT}/${dev.name}-03-playsafe.png` })
      const closeBtns = await measureAllButtons(page)
      const closeBtn = findBtn(closeBtns, (b) => /CLOSE/i.test(b.text))
      if (closeBtn) await tapAt(page, closeBtn.left + closeBtn.width / 2, closeBtn.top + closeBtn.height / 2)
      await wait(200)
    }
  }

  btns = await measureAllButtons(page)
  result.paceToggleBtn = findBtn(btns, (b) => /PACE/i.test(b.text))

  // ── BOARD GEOMETRY ──
  const geom0 = await getBoardGeom(page)
  result.boardGeomInitial = geom0
  const tile = geom0.canvasRect.width / GRID_DIM
  result.measuredTilePx = +tile.toFixed(2)
  result.effectiveTapTargetPx = { w: +tile.toFixed(2), h: +tile.toFixed(2) }

  const visColStart = Math.max(0, Math.round((geom0.scrollRect.left - geom0.canvasRect.left) / tile))
  const visRowStart = Math.max(0, Math.round((geom0.scrollRect.top - geom0.canvasRect.top) / tile))
  result.visibleTileWindowStart = { col: visColStart, row: visRowStart }

  // Plan: ALL picks stay INSIDE the currently visible ~4x4 pan window,
  // with a deliberate NON-ADJACENT jump at pick 5 (gap > 1 tile from pick 4,
  // per the 8-neighbourhood adjacency check in AssayGridCanvas.tsx L1571-1574).
  const c0 = visColStart, r0 = visRowStart
  const plan = [
    { col: c0, row: r0, note: 'pick1' },
    { col: c0 + 1, row: r0, note: 'pick2-adjacent' },
    { col: c0 + 1, row: r0 + 1, note: 'pick3-adjacent' },
    { col: c0 + 2, row: r0 + 1, note: 'pick4-adjacent' },
    { col: c0, row: r0 + 2, note: 'pick5-NON-ADJACENT-JUMP' }, // gap of 2 from pick4 (dx2,dy1 -> not 8-adjacent)
    { col: c0 + 1, row: r0 + 2, note: 'pick6-adjacent-to-pick5' },
    { col: c0 + 2, row: r0 + 2, note: 'pick7-adjacent' },
    { col: c0 + 3, row: r0 + 2, note: 'pick8-adjacent' },
  ]

  const pickLog = []
  for (const p of plan) {
    const g = await getBoardGeom(page)
    const x = g.canvasRect.left + (p.col + 0.5) * tile
    const y = g.canvasRect.top + (p.row + 0.5) * tile
    const insideView = x >= g.scrollRect.left && x <= g.scrollRect.left + g.scrollRect.width && y >= g.scrollRect.top && y <= g.scrollRect.top + g.scrollRect.height
    const elAtPoint = await page.evaluate((px, py) => { const el = document.elementFromPoint(px, py); return el ? el.tagName + '.' + (el.className || '') : null }, x, y)
    const promptBefore = await readArmingPrompt(page)
    await page.touchscreen.tap(x, y)
    await wait(90)
    const promptAfter = await readArmingPrompt(page)
    pickLog.push({ ...p, x: +x.toFixed(1), y: +y.toFixed(1), insideView, elAtPoint, promptBefore, promptAfter, registered: promptBefore !== promptAfter })
  }
  result.freePickLog = pickLog
  await page.screenshot({ path: `${OUT}/${dev.name}-04-freepick-numbered-line.png` })

  // ── Connector pixel-proof: adjacent pair (pick1->pick2) SHOULD show a cyan
  // dashed connector at their midpoint; the non-adjacent pair (pick4->pick5)
  // should NOT. ──
  const gMid = await getBoardGeom(page)
  const midAdjX = gMid.canvasRect.left + ((plan[0].col + plan[1].col) / 2 + 0.5) * tile
  const midAdjY = gMid.canvasRect.top + ((plan[0].row + plan[1].row) / 2 + 0.5) * tile
  const midNonAdjX = gMid.canvasRect.left + ((plan[3].col + plan[4].col) / 2 + 0.5) * tile
  const midNonAdjY = gMid.canvasRect.top + ((plan[3].row + plan[4].row) / 2 + 0.5) * tile
  result.connectorProof = {
    adjacentMidpoint: await sampleCyanNear(page, midAdjX, midAdjY, 8),
    nonAdjacentMidpoint: await sampleCyanNear(page, midNonAdjX, midNonAdjY, 8),
  }

  const trailStateAfter8 = await page.evaluate(() => {
    const b = document.querySelector('button[aria-label*="Run the line"]')
    return b ? { disabled: b.disabled, text: b.textContent } : null
  })
  result.trailStateAfter8Picks = trailStateAfter8

  // ── PAN-WINDOW PROOF ──
  const outOfViewCol = GRID_DIM - 1 // col 13, far right — should be off-screen from the centered pan window
  const outOfViewRow = r0
  const gBeforePan = await getBoardGeom(page)
  const preX = gBeforePan.canvasRect.left + (outOfViewCol + 0.5) * tile
  const preY = gBeforePan.canvasRect.top + (outOfViewRow + 0.5) * tile
  const outsidePre = !(preX >= gBeforePan.scrollRect.left && preX <= gBeforePan.scrollRect.left + gBeforePan.scrollRect.width && preY >= gBeforePan.scrollRect.top && preY <= gBeforePan.scrollRect.top + gBeforePan.scrollRect.height)
  result.panTargetTile = { col: outOfViewCol, row: outOfViewRow }
  result.panTargetOutsideViewportBeforePan = outsidePre
  await page.screenshot({ path: `${OUT}/${dev.name}-05a-before-pan.png` })

  const scrollBeforeDrag = { left: gBeforePan.scrollLeft, top: gBeforePan.scrollTop }
  // Repeat a real touch-drag gesture (native pan-x pan-y touch-scroll) until the
  // scroll wrapper reaches (near) its max scrollLeft, proving REAL touch-driven
  // panning (not a page.evaluate scroll hack) reveals off-screen content.
  for (let pass = 0; pass < 4; pass++) {
    const g = await getBoardGeom(page)
    const startX = g.scrollRect.left + g.scrollRect.width * 0.85
    const startY = g.scrollRect.top + g.scrollRect.height * 0.5
    const endX = g.scrollRect.left + g.scrollRect.width * 0.1
    const endY = startY
    await page.touchscreen.touchStart(startX, startY)
    for (let i = 1; i <= 6; i++) {
      await page.touchscreen.touchMove(startX + (endX - startX) * (i / 6), startY)
      await wait(18)
    }
    await page.touchscreen.touchEnd()
    await wait(150)
    const gAfter = await getBoardGeom(page)
    if (gAfter.scrollLeft >= gAfter.scrollWidth - gAfter.scrollRect.width - 1) break
  }
  const gAfterPan = await getBoardGeom(page)
  result.panDrag = { scrollBeforeDrag, scrollAfterDrag: { left: gAfterPan.scrollLeft, top: gAfterPan.scrollTop }, maxPossibleScrollLeft: gAfterPan.scrollWidth - gAfterPan.scrollRect.width, panned: scrollBeforeDrag.left !== gAfterPan.scrollLeft }
  await page.screenshot({ path: `${OUT}/${dev.name}-05b-after-pan.png` })

  const postX = gAfterPan.canvasRect.left + (outOfViewCol + 0.5) * tile
  const postY = gAfterPan.canvasRect.top + (outOfViewRow + 0.5) * tile
  const insidePost = postX >= gAfterPan.scrollRect.left && postX <= gAfterPan.scrollRect.left + gAfterPan.scrollRect.width && postY >= gAfterPan.scrollRect.top && postY <= gAfterPan.scrollRect.top + gAfterPan.scrollRect.height
  result.panTargetInsideViewportAfterPan = insidePost
  const elAtPointPostPan = await page.evaluate((px, py) => { const el = document.elementFromPoint(px, py); return el ? el.tagName + '.' + (el.className || '') : null }, postX, postY)
  const promptBeforePostPanTap = await readArmingPrompt(page)
  await page.touchscreen.tap(postX, postY)
  await wait(120)
  const promptAfterPostPanTap = await readArmingPrompt(page)
  result.postPanTap = { x: +postX.toFixed(1), y: +postY.toFixed(1), elAtPointPostPan, promptBeforePostPanTap, promptAfterPostPanTap, registered: promptBeforePostPanTap !== promptAfterPostPanTap }
  await page.screenshot({ path: `${OUT}/${dev.name}-05c-post-pan-tap.png` })

  // ── READABILITY SWEEP ──
  const readability = await page.evaluate(() => {
    const leafText = (pred) => [...document.querySelectorAll('div,span,b')]
      .filter((n) => n.children.length === 0 && (n.textContent || '').trim().length > 0 && pred((n.textContent || '').trim()))
      .map((n) => { const cs = getComputedStyle(n); return { txt: n.textContent.trim().slice(0, 30), fontSize: parseFloat(cs.fontSize), color: cs.color } })
    return {
      haulLabels: leafText((t) => /HAUL|DUCATS/i.test(t)),
      tierLabels: leafText((t) => /REEF|MIDNIGHT|HADAL/i.test(t)),
      toWinLabel: leafText((t) => t === 'TO WIN'),
      allSmallText: leafText(() => true).filter((t) => t.fontSize > 0 && t.fontSize < 10),
    }
  })
  result.readability = readability

  // ── header plaque bottom (for later hero clearance calc) ──
  const headerPlaqueBottom = await page.evaluate(() => {
    const leaf = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && /cracked ducats/i.test(d.textContent || ''))
    if (!leaf) return null
    let node = leaf.parentElement
    for (let i = 0; i < 6 && node; i++) {
      const cs = getComputedStyle(node)
      if (cs.display === 'flex' && cs.justifyContent === 'space-between') return node.getBoundingClientRect().bottom
      node = node.parentElement
    }
    return leaf.getBoundingClientRect().bottom
  })
  result.headerPlaqueBottomPreRun = headerPlaqueBottom

  // ── RUN THE LINE ──
  btns = await measureAllButtons(page)
  const runBtn = findBtn(btns, (b) => /Run the line/i.test(b.aria || ''))
  result.runLineBtn = runBtn
  await page.screenshot({ path: `${OUT}/${dev.name}-06-armed-preRun.png` })
  if (runBtn && !runBtn.disabled) {
    await tapAt(page, runBtn.left + runBtn.width / 2, runBtn.top + runBtn.height / 2)
    await wait(150)
    await page.screenshot({ path: `${OUT}/${dev.name}-07-running.png` })
  }
  result.runLineWasEnabled = runBtn ? !runBtn.disabled : false

  await wait(2800)
  await page.screenshot({ path: `${OUT}/${dev.name}-08-settled.png` })

  // ── outcome / win-hero clearance vs header plaque ──
  const heroInfo = await page.evaluate(() => {
    const heroWrap = document.querySelector('div[aria-hidden]')
    if (!heroWrap) return { present: false }
    const r = heroWrap.getBoundingClientRect()
    const leaf = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && /cracked ducats/i.test(d.textContent || ''))
    let headerBottom = null
    if (leaf) {
      let node = leaf.parentElement
      for (let i = 0; i < 6 && node; i++) {
        const cs = getComputedStyle(node)
        if (cs.display === 'flex' && cs.justifyContent === 'space-between') { headerBottom = node.getBoundingClientRect().bottom; break }
        node = node.parentElement
      }
    }
    return { present: true, heroTop: r.top, heroText: heroWrap.textContent.trim().slice(0, 60), headerBottom, clearance: headerBottom != null ? r.top - headerBottom : null, viewportH: window.innerHeight, heroTopPct: (r.top / window.innerHeight * 100).toFixed(1) }
  })
  result.heroInfo = heroInfo

  const outcomeKind = await page.evaluate(() => {
    if (document.body.textContent.includes('LINE CLAIMED')) return 'win'
    if (document.body.textContent.includes('CRACKED')) return 'bust'
    return 'unknown'
  })
  result.outcomeKind = outcomeKind

  // ── restart CTAs + copy glyphs on the settled screen ──
  btns = await measureAllButtons(page)
  result.restartBtns = btns.filter((b) => /DIVE AGAIN|SAME LINE/i.test(b.text))
  result.copyBtns = btns.filter((b) => /copy/i.test(b.text) || /Copy /i.test(b.aria || ''))

  // Glass Box cert readability + seed/hash presence
  const certReadability = await page.evaluate(() => {
    const out = []
    for (const n of document.querySelectorAll('div,span')) {
      const txt = (n.textContent || '').trim()
      if (n.children.length === 0 && txt.length > 0 && txt.length < 80 && /seed|hash|round|glass box/i.test(txt)) {
        const cs = getComputedStyle(n)
        out.push({ txt: txt.slice(0, 40), fontSize: parseFloat(cs.fontSize), color: cs.color })
      }
    }
    return out
  })
  result.certReadability = certReadability

  // ── env(safe-area-inset-bottom) presence check (computed style probe on the
  // bottom-most fixed/action-bar-like element) ──
  const safeAreaCheck = await page.evaluate(() => {
    const cands = [...document.querySelectorAll('*')].filter((el) => {
      const cs = getComputedStyle(el)
      return cs.position === 'fixed' && parseFloat(cs.bottom) >= 0 && el.getBoundingClientRect().bottom > window.innerHeight - 5
    })
    return cands.map((el) => ({ tag: el.tagName, cls: el.className, paddingBottom: getComputedStyle(el).paddingBottom }))
  })
  result.safeAreaBottomFixedElements = safeAreaCheck

  const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }))
  result.horizontalOverflow = overflow.scrollWidth > overflow.innerWidth + 2
  result.consoleErrors = consoleErrors

  await browser.close()
  return result
}

const all = []
for (const dev of DEVICES) {
  console.log(`=== ${dev.name} ===`)
  let attempt = 0
  let r
  // retry once if the round settled as a bust before reaching a WIN (we want at
  // least one WIN screenshot per device to prove the hero-clearance regression
  // risk item); if bust, just report bust, no forced retry loop needed for the
  // touch/pan probes which already completed regardless of outcome.
  r = await run(dev)
  all.push(r)
}
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(all, null, 2))
console.log('DONE ->', `${OUT}/results.json`)
