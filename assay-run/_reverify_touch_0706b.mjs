import puppeteer from 'puppeteer-core'
import fs from 'fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-reverify-touch-0706b'
fs.mkdirSync(OUT, { recursive: true })

const DEVICES = [
  { name: 'pixel7', width: 412, height: 915, dsf: 2.625 },
  { name: 'iphone14pro', width: 393, height: 852, dsf: 3 },
]

const measureBtn = async (page, txt) => {
  return page.evaluate((t) => {
    const btns = [...document.querySelectorAll('button')]
    const b = btns.find((x) => x.textContent && x.textContent.includes(t))
    if (!b) return null
    const r = b.getBoundingClientRect()
    const cs = getComputedStyle(b)
    return {
      top: r.top, bottom: r.bottom, left: r.left, right: r.right,
      width: r.width, height: r.height, disabled: b.disabled,
      touchAction: cs.touchAction, text: b.textContent,
    }
  }, txt)
}

const tapBoxCenter = async (page, box) => {
  if (!box) return
  const cx = (box.left + box.right) / 2
  const cy = (box.top + box.bottom) / 2
  await page.touchscreen.tap(cx, cy)
}

async function run(dev) {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: 'new',
    args: ['--autoplay-policy=no-user-gesture-required'],
  })
  const page = (await browser.pages())[0]
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message))

  await page.emulate({
    viewport: { width: dev.width, height: dev.height, deviceScaleFactor: dev.dsf, isMobile: true, hasTouch: true, isLandscape: false },
  })
  const result = { device: dev.name, viewport: `${dev.width}x${dev.height}` }

  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  // dismiss coachmark (already-seen) then reload so we measure the STEADY-STATE
  // layout (coachmark not painted) — matches how a returning player sees it.
  await page.evaluate(() => localStorage.setItem('assay_coachmark_seen_v1', '1'))
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(300)

  // ── Lobby: small-text floor probe (GOLDEN SLEDGE pill + tier sublabels) ──
  const lobbyPill = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('span,div')]
    const n = nodes.find((el) => el.children.length === 0 && /GOLDEN SLEDGE/i.test(el.textContent || ''))
    if (!n) return null
    const cs = getComputedStyle(n)
    return { text: n.textContent, fontSize: parseFloat(cs.fontSize) }
  })
  result.lobbyPill = lobbyPill

  // Tier sublabels are only on the Planning screen (TierChip), so we'll grab
  // them again after tapping ENTER THE DIVE below. Grab lobby-visible small
  // text as a general floor sweep here too.
  const allSmallText = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('div,span,button')]
    const out = []
    for (const n of nodes) {
      const cs = getComputedStyle(n)
      const fs = parseFloat(cs.fontSize)
      const txt = (n.textContent || '').trim()
      if (txt && txt.length < 60 && n.children.length === 0 && fs > 0 && fs < 11) {
        out.push({ txt, fontSize: fs })
      }
    }
    return out
  })
  result.subEleven = allSmallText
  await page.screenshot({ path: `${OUT}/${dev.name}-01-lobby.png` })

  // ── Enter planning ──
  const enterBox = await measureBtn(page, 'ENTER THE DIVE')
  await tapBoxCenter(page, enterBox)
  await wait(400)
  await page.screenshot({ path: `${OUT}/${dev.name}-02-planning.png` })

  // ── Tier sublabels (REEF/MIDNIGHT/HADAL) font size ──
  const tierSublabels = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => /REEF SHELF|MIDNIGHT ZONE|HADAL TRENCH/i.test(b.getAttribute('aria-label') || ''))
    return btns.map((b) => {
      const spans = [...b.querySelectorAll('span')]
      const first = spans[0]
      const cs = first ? getComputedStyle(first) : null
      const r = b.getBoundingClientRect()
      return {
        aria: b.getAttribute('aria-label'),
        sublabelText: first ? first.textContent : null,
        sublabelFontSize: cs ? parseFloat(cs.fontSize) : null,
        chipHeight: r.height,
      }
    })
  })
  result.tierSublabels = tierSublabels

  // ── CalibKnob (bet steppers ± ) ──
  const minusBox = await measureBtn(page, '−')
  const plusBox = await measureBtn(page, '+')
  result.calibKnobMinus = minusBox
  result.calibKnobPlus = plusBox
  // fire test on minus (should decrement bet, but if at floor may be disabled —
  // use plus which should always be able to increment).
  // NB (0706b diag): the wager readout is fontSize 19px specifically — a bare
  // /^\d+\.\d{2}$/ match also catches the top "1000.00" balance display
  // (fontSize 15px), which appears FIRST in DOM order and never changes.
  const wagerSelector = () => {
    const el = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && /^\d+\.\d{2}$/.test((d.textContent || '').trim()) && getComputedStyle(d).fontSize === '19px')
    return el ? el.textContent : null
  }
  const wagerBefore = await page.evaluate(wagerSelector)
  await tapBoxCenter(page, plusBox)
  await wait(150)
  const wagerAfterPlus = await page.evaluate(wagerSelector)
  result.calibKnobPlusFires = { wagerBefore, wagerAfterPlus, changed: wagerBefore !== wagerAfterPlus }

  // ── QuickChip (e.g. "10") ──
  const quickChips = await page.evaluate(() => {
    return [...document.querySelectorAll('button')]
      .filter((b) => /^\d+$/.test((b.textContent || '').trim()))
      .map((b) => {
        const r = b.getBoundingClientRect()
        const cs = getComputedStyle(b)
        return { text: b.textContent, width: r.width, height: r.height, touchAction: cs.touchAction, top: r.top, bottom: r.bottom, left: r.left, right: r.right }
      })
  })
  result.quickChips = quickChips
  if (quickChips.length) {
    const c = quickChips[0]
    const wagerBefore2 = await page.evaluate(wagerSelector)
    await page.touchscreen.tap((c.left + c.right) / 2, (c.top + c.bottom) / 2)
    await wait(150)
    const wagerAfter2 = await page.evaluate(wagerSelector)
    result.quickChipFires = { chip: c.text, wagerBefore2, wagerAfter2, changed: wagerBefore2 !== wagerAfter2 }
  }

  // ── CalibToggle: CLEAR / PACE / SAME LINE ──
  const clearBox = await measureBtn(page, 'CLEAR')
  result.calibToggleClear = clearBox
  const paceBox = await measureBtn(page, 'PACE:')
  result.calibTogglePace = paceBox
  const paceBefore = paceBox ? paceBox.text : null
  if (paceBox) {
    await tapBoxCenter(page, paceBox)
    await wait(100)
  }
  const paceAfter = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').includes('PACE'))
    return b ? b.textContent : null
  })
  result.calibTogglePaceFires = { paceBefore, paceAfter, changed: paceBefore !== paceAfter }

  const sameLineBox = await measureBtn(page, 'SAME LINE')
  result.calibToggleSameLine = sameLineBox

  // ── PLAY SAFE (fixed pill) ──
  const playSafeBox = await measureBtn(page, 'PLAY SAFE')
  result.playSafeBox = playSafeBox
  if (playSafeBox) {
    await tapBoxCenter(page, playSafeBox)
    await wait(200)
    const modalOpen = await page.evaluate(() => !!document.body.textContent.match(/self-exclusion|session limits/i))
    result.playSafeFires = modalOpen
    if (modalOpen) {
      await page.screenshot({ path: `${OUT}/${dev.name}-03-playsafe.png` })
      const closeBox = await measureBtn(page, 'CLOSE')
      await tapBoxCenter(page, closeBox)
      await wait(200)
    }
  }

  // ── Quick re-confirm: pod taps (46px) + board pan ──
  const TILE = 46
  const GRID_DIM = 14
  const canvasGeom = await page.evaluate(() => {
    const scroll = document.querySelector('.assayBoardScroll')
    const canvas = scroll ? scroll.querySelector('canvas') : null
    if (!scroll || !canvas) return null
    const sr = scroll.getBoundingClientRect()
    const cr = canvas.getBoundingClientRect()
    return {
      scrollRect: { top: sr.top, left: sr.left, width: sr.width, height: sr.height },
      canvasRect: { top: cr.top, left: cr.left, width: cr.width, height: cr.height },
    }
  })
  result.canvasGeom = canvasGeom
  result.tileSizePx = canvasGeom ? { w: canvasGeom.canvasRect.width / GRID_DIM, h: canvasGeom.canvasRect.height / GRID_DIM } : null

  if (canvasGeom) {
    const { scrollRect, canvasRect } = canvasGeom
    const visLeft = Math.max(canvasRect.left, scrollRect.left)
    const visRight = Math.min(canvasRect.left + canvasRect.width, scrollRect.left + scrollRect.width)
    const visTop = Math.max(canvasRect.top, scrollRect.top)
    const visBottom = Math.min(canvasRect.top + canvasRect.height, scrollRect.top + scrollRect.height)
    const colStart = Math.ceil((visLeft - canvasRect.left) / TILE)
    const colEnd = Math.floor((visRight - canvasRect.left) / TILE) - 1
    const rowStart = Math.ceil((visTop - canvasRect.top) / TILE)
    const rowEnd = Math.floor((visBottom - canvasRect.top) / TILE) - 1
    const candidates = []
    for (let r = rowStart; r <= rowEnd; r++) {
      for (let cx = colStart; cx <= colEnd; cx++) candidates.push({ r, c: cx })
    }
    const toTap = candidates.slice(0, 8)
    for (const t of toTap) {
      const x = canvasRect.left + (t.c + 0.5) * TILE
      const y = canvasRect.top + (t.r + 0.5) * TILE
      await page.touchscreen.tap(x, y)
      await wait(60)
    }
    result.podTapsAttempted = toTap.length
  }

  const runLineAfterTaps = await page.evaluate(() => {
    const b = document.querySelector('button[aria-label*="Run the line"]')
    if (!b) return null
    return { disabled: b.disabled }
  })
  result.podsLandedTrailArmed = runLineAfterTaps ? !runLineAfterTaps.disabled : null

  // pan
  if (canvasGeom) {
    const { scrollRect } = canvasGeom
    const startX = scrollRect.left + scrollRect.width * 0.7
    const startY = scrollRect.top + scrollRect.height * 0.5
    const endX = scrollRect.left + scrollRect.width * 0.2
    const scrollBefore = await page.evaluate(() => { const s = document.querySelector('.assayBoardScroll'); return { left: s.scrollLeft } })
    await page.touchscreen.touchStart(startX, startY)
    for (let i = 1; i <= 5; i++) {
      const ix = startX + (endX - startX) * (i / 5)
      await page.touchscreen.touchMove(ix, startY)
      await wait(20)
    }
    await page.touchscreen.touchEnd()
    await wait(200)
    const scrollAfter = await page.evaluate(() => { const s = document.querySelector('.assayBoardScroll'); return { left: s.scrollLeft } })
    result.panTest = { scrollBefore, scrollAfter, panned: scrollBefore.left !== scrollAfter.left }
  }
  await wait(400)

  // ── RUN THE LINE fold check (Planning phase, prior to firing) ──
  const runLineFold = await page.evaluate(() => {
    const b = document.querySelector('button[aria-label*="Run the line"]')
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom, height: r.height, viewportH: window.innerHeight, disabled: b.disabled }
  })
  result.runLineFold = runLineFold
  await page.screenshot({ path: `${OUT}/${dev.name}-04-planning-loaded.png` })

  // overflow check
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  result.horizontalOverflow = overflow.scrollWidth > overflow.innerWidth + 2

  result.consoleErrors = consoleErrors
  await browser.close()
  return result
}

const all = []
for (const dev of DEVICES) {
  console.log(`=== ${dev.name} ===`)
  const r = await run(dev)
  all.push(r)
  console.log(JSON.stringify(r, null, 2))
}
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(all, null, 2))
console.log('DONE, results written to', `${OUT}/results.json`)
