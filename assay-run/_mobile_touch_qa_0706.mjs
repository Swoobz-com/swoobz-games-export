import puppeteer from 'puppeteer-core'
import fs from 'fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-mobile-touch-qa-0706'
fs.mkdirSync(OUT, { recursive: true })

const DEVICES = [
  { name: 'pixel7', width: 412, height: 915, dsf: 2.625 },
  { name: 'iphone14pro', width: 393, height: 852, dsf: 3 },
]

const tapText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return null
  const box = await el.evaluate((e) => {
    const r = e.getBoundingClientRect()
    const cs = getComputedStyle(e)
    return {
      x: r.x + r.width / 2, y: r.y + r.height / 2,
      top: r.top, bottom: r.bottom, left: r.left, right: r.right,
      width: r.width, height: r.height,
      touchAction: cs.touchAction, disabled: e.disabled,
    }
  })
  await page.touchscreen.tap(box.x, box.y)
  return box
}

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
  // dismiss coachmark before it happens (set localStorage seen key), reload
  await page.evaluate(() => localStorage.setItem('assay_coachmark_seen_v1', '1'))
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(300)

  // ── LOBBY screenshot ──
  await page.screenshot({ path: `${OUT}/${dev.name}-01-lobby.png` })

  // ── Lobby readability probe: wordmark + THE DIVE + DIVE DEPTH font sizes ──
  const lobbyText = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('div,span,button')]
    const out = []
    for (const n of nodes) {
      const cs = getComputedStyle(n)
      const fs = parseFloat(cs.fontSize)
      const txt = (n.textContent || '').trim()
      if (txt && txt.length < 40 && n.children.length === 0 && fs > 0) {
        out.push({ txt, fontSize: fs, color: cs.color })
      }
    }
    return out
  })
  const smallLobbyText = lobbyText.filter((t) => t.fontSize < 10)
  result.lobbySmallText = smallLobbyText

  // ── Tap ENTER THE DIVE ──
  const enterBox = await tapText(page, 'ENTER THE DIVE')
  result.enterTheDive = enterBox
  await wait(400)
  await page.screenshot({ path: `${OUT}/${dev.name}-02-planning.png` })

  // ── TO WIN hero readability ──
  const hero = await page.evaluate(() => {
    const labelNode = [...document.querySelectorAll('div')].find((d) => (d.textContent || '').trim() === 'TO WIN')
    if (!labelNode) return null
    const heroBlock = labelNode.parentElement
    const csLabel = getComputedStyle(labelNode)
    let amountInfo = null
    let contrastSample = null
    if (heroBlock) {
      // walk ALL descendants (not just direct children — the amount+multiplier
      // row is a nested flex div), find the biggest font-size text node
      const all = heroBlock.querySelectorAll('*')
      let best = null
      for (const k of all) {
        if (k.children.length > 0) continue // only leaf text nodes
        const csK = getComputedStyle(k)
        const fs = parseFloat(csK.fontSize)
        if (!best || fs > best.fontSize) {
          best = { text: (k.textContent || '').trim(), fontSize: fs, color: csK.color, fontWeight: csK.fontWeight }
        }
      }
      amountInfo = best
    }
    const rect = labelNode.getBoundingClientRect()
    // sample the actual pixel behind the hero block for contrast context
    const heroRect = heroBlock ? heroBlock.getBoundingClientRect() : null
    return {
      labelText: labelNode.textContent,
      labelFontSize: parseFloat(csLabel.fontSize),
      labelColor: csLabel.color,
      labelRect: { top: rect.top, left: rect.left },
      heroBlockRect: heroRect ? { top: heroRect.top, left: heroRect.left, width: heroRect.width, height: heroRect.height } : null,
      amountInfo,
    }
  })
  result.toWinHero = hero

  // ── Depth-ceiling / route label readability (11px labels) ──
  const routeLabels = await page.evaluate(() => {
    const out = []
    document.querySelectorAll('div').forEach((d) => {
      const txt = (d.textContent || '').trim()
      if (d.children.length === 0 && /cracked|ceiling|depth/i.test(txt)) {
        const cs = getComputedStyle(d)
        out.push({ txt, fontSize: parseFloat(cs.fontSize), color: cs.color })
      }
    })
    return out
  })
  result.routeLabels = routeLabels

  // ── DIVE DEPTH tier chips (depth cards) — measure tap targets ──
  const tierChips = await page.evaluate(() => {
    return [...document.querySelectorAll('button')]
      .filter((b) => /REEF SHELF|MIDNIGHT ZONE|HADAL TRENCH/i.test(b.getAttribute('aria-label') || ''))
      .map((b) => {
        const r = b.getBoundingClientRect()
        return { label: b.getAttribute('aria-label'), width: r.width, height: r.height, top: r.top, bottom: r.bottom }
      })
  })
  result.tierChips = tierChips
  // tap the first tier chip to confirm it fires
  if (tierChips.length) {
    const idx = tierChips.findIndex((c) => true)
    const chipHandle = await page.evaluateHandle((lab) => {
      return [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === lab)
    }, tierChips[0].label)
    const el = chipHandle.asElement()
    if (el) {
      const before = await page.evaluate((e) => e.getAttribute('aria-current'), el)
      const box = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
      await page.touchscreen.tap(box.x, box.y)
      await wait(150)
      const after = await page.evaluate((e) => e.getAttribute('aria-current'), el)
      result.tierChipTapFires = { before, after, changed: before !== after }
    }
  }

  // ── Bet steppers (CalibKnob −/+) and quick chips ──
  const stepperMinus = await measureBtn(page, '−')
  result.stepperMinus = stepperMinus
  const quickChips = await page.evaluate(() => {
    return [...document.querySelectorAll('button')]
      .filter((b) => /^\d+$/.test((b.textContent || '').trim()))
      .map((b) => {
        const r = b.getBoundingClientRect()
        const cs = getComputedStyle(b)
        return { text: b.textContent, width: r.width, height: r.height, touchAction: cs.touchAction }
      })
  })
  result.quickChips = quickChips
  // tap a quick chip, confirm wager value changes
  const wagerBefore = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && /^\d+\.\d{2}$/.test((d.textContent || '').trim()) && getComputedStyle(d).fontSize === '19px')
    return el ? el.textContent : null
  })
  const chip10 = await tapText(page, '10')
  await wait(150)
  const wagerAfter = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && /^\d+\.\d{2}$/.test((d.textContent || '').trim()) && getComputedStyle(d).fontSize === '19px')
    return el ? el.textContent : null
  })
  result.quickChipTapFires = { wagerBefore, wagerAfter, changed: wagerBefore !== wagerAfter, chip10Box: chip10 }

  // ── PACE toggle ──
  const paceBefore = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').includes('PACE:'))
    return b ? b.textContent : null
  })
  await tapText(page, 'PACE:')
  await wait(100)
  const paceAfter = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').includes('PACE') || (x.textContent||'').includes('INSTANT') || (x.textContent||'').includes('DUCAT-BY-DUCAT'))
    return b ? b.textContent : null
  })
  result.paceToggleTapFires = { paceBefore, paceAfter, changed: paceBefore !== paceAfter }

  // ── PLAY SAFE ──
  const playSafeBox = await measureBtn(page, 'PLAY SAFE')
  result.playSafeBox = playSafeBox
  if (playSafeBox) {
    const cx = (playSafeBox.left + playSafeBox.right) / 2
    const cy = (playSafeBox.top + playSafeBox.bottom) / 2
    await page.touchscreen.tap(cx, cy)
    await wait(200)
    const modalOpen = await page.evaluate(() => !!document.body.textContent.match(/self-exclusion|session limits/i))
    result.playSafeTapFires = modalOpen
    if (modalOpen) {
      await page.screenshot({ path: `${OUT}/${dev.name}-03-playsafe.png` })
      await tapText(page, 'CLOSE')
      await wait(200)
    }
  }

  // ── Pan window + pod tap coverage ──
  const canvasGeom = await page.evaluate(() => {
    const scroll = document.querySelector('.assayBoardScroll')
    const canvas = scroll ? scroll.querySelector('canvas') : null
    if (!scroll || !canvas) return null
    const sr = scroll.getBoundingClientRect()
    const cr = canvas.getBoundingClientRect()
    return {
      scrollRect: { top: sr.top, left: sr.left, width: sr.width, height: sr.height },
      canvasRect: { top: cr.top, left: cr.left, width: cr.width, height: cr.height },
      scrollLeft: scroll.scrollLeft, scrollTop: scroll.scrollTop,
      scrollWidth: scroll.scrollWidth, scrollHeight: scroll.scrollHeight,
    }
  })
  result.canvasGeom = canvasGeom

  const TILE = 46
  const GRID_DIM = 14
  let tapResults = []
  if (canvasGeom) {
    const { scrollRect, canvasRect } = canvasGeom
    result.panWindowPx = { w: scrollRect.width, h: scrollRect.height }
    result.tileSizePx = { w: canvasRect.width / GRID_DIM, h: canvasRect.height / GRID_DIM }

    // Find visible tile range (intersection of canvas rect & scroll rect)
    const visLeft = Math.max(canvasRect.left, scrollRect.left)
    const visRight = Math.min(canvasRect.left + canvasRect.width, scrollRect.left + scrollRect.width)
    const visTop = Math.max(canvasRect.top, scrollRect.top)
    const visBottom = Math.min(canvasRect.top + canvasRect.height, scrollRect.top + scrollRect.height)

    const colStart = Math.ceil((visLeft - canvasRect.left) / TILE)
    const colEnd = Math.floor((visRight - canvasRect.left) / TILE) - 1
    const rowStart = Math.ceil((visTop - canvasRect.top) / TILE)
    const rowEnd = Math.floor((visBottom - canvasRect.top) / TILE) - 1
    result.visibleTileRange = { colStart, colEnd, rowStart, rowEnd }

    // Tap 8 distinct visible tiles (MIN_TRAIL) in the visible window
    const candidates = []
    for (let r = rowStart; r <= rowEnd; r++) {
      for (let cx = colStart; cx <= colEnd; cx++) {
        candidates.push({ r, c: cx })
      }
    }
    const toTap = candidates.slice(0, 8)
    for (const t of toTap) {
      const x = canvasRect.left + (t.c + 0.5) * TILE
      const y = canvasRect.top + (t.r + 0.5) * TILE
      await page.touchscreen.tap(x, y)
      await wait(60)
    }
    tapResults = toTap
  }
  result.podTapsAttempted = tapResults.length

  // ── TO WIN hero readability AFTER arming (trail.length >= MIN_TRAIL) —
  // THIS is the moment the actual GOLD amount+multiplier renders (before pod
  // selection the hero shows the "arming" select-N-more prompt instead). ──
  const heroArmed = await page.evaluate(() => {
    const labelNode = [...document.querySelectorAll('div')].find((d) => (d.textContent || '').trim() === 'TO WIN')
    if (!labelNode) return null
    const heroBlock = labelNode.parentElement
    const csLabel = getComputedStyle(labelNode)
    let amountInfo = null
    if (heroBlock) {
      const all = heroBlock.querySelectorAll('*')
      let best = null
      for (const k of all) {
        if (k.children.length > 0) continue
        const csK = getComputedStyle(k)
        const fs = parseFloat(csK.fontSize)
        if (!best || fs > best.fontSize) {
          best = { text: (k.textContent || '').trim(), fontSize: fs, color: csK.color, fontWeight: csK.fontWeight }
        }
      }
      amountInfo = best
    }
    const rect = labelNode.getBoundingClientRect()
    const heroRect = heroBlock ? heroBlock.getBoundingClientRect() : null
    return {
      labelText: labelNode.textContent,
      labelFontSize: parseFloat(csLabel.fontSize),
      labelColor: csLabel.color,
      labelRect: { top: rect.top, left: rect.left },
      heroBlockRect: heroRect ? { top: heroRect.top, left: heroRect.left, width: heroRect.width, height: heroRect.height } : null,
      amountInfo,
    }
  })
  result.toWinHeroArmed = heroArmed
  await page.screenshot({ path: `${OUT}/${dev.name}-04b-hero-armed.png` })

  // check trail length / armed state via BreakerLever aria-label / disabled
  const runLineAfterTaps = await page.evaluate(() => {
    const b = document.querySelector('button[aria-label*="Run the line"]')
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { disabled: b.disabled, top: r.top, bottom: r.bottom, height: r.height, viewportH: window.innerHeight }
  })
  result.runLineAfterTaps = runLineAfterTaps
  await page.screenshot({ path: `${OUT}/${dev.name}-04-line-selected.png` })

  // ── Board pan test: drag on the scroll wrapper ──
  if (canvasGeom) {
    const { scrollRect } = canvasGeom
    const startX = scrollRect.left + scrollRect.width * 0.7
    const startY = scrollRect.top + scrollRect.height * 0.5
    const endX = scrollRect.left + scrollRect.width * 0.2
    const endY = scrollRect.top + scrollRect.height * 0.5
    const scrollBefore = await page.evaluate(() => {
      const s = document.querySelector('.assayBoardScroll')
      return { left: s.scrollLeft, top: s.scrollTop }
    })
    await page.touchscreen.touchStart(startX, startY)
    for (let i = 1; i <= 5; i++) {
      const ix = startX + (endX - startX) * (i / 5)
      await page.touchscreen.touchMove(ix, startY)
      await wait(20)
    }
    await page.touchscreen.touchEnd()
    await wait(200)
    const scrollAfter = await page.evaluate(() => {
      const s = document.querySelector('.assayBoardScroll')
      return { left: s.scrollLeft, top: s.scrollTop }
    })
    result.panTest = { scrollBefore, scrollAfter, panned: scrollBefore.left !== scrollAfter.left }
  }
  await wait(400) // let any fling/inertial scroll from the pan probe fully settle before the next tap

  // ── RUN THE LINE (BreakerLever) fold + fire ──
  const runLineFinal = await page.evaluate(() => {
    const b = document.querySelector('button[aria-label*="Run the line"]')
    if (!b) return null
    const r = b.getBoundingClientRect()
    const cs = getComputedStyle(b)
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, width: r.width, disabled: b.disabled, viewportH: window.innerHeight, touchAction: cs.touchAction }
  })
  result.runLineFinal = runLineFinal

  if (runLineFinal && !runLineFinal.disabled) {
    const cx = (runLineFinal.left + runLineFinal.right) / 2
    const cy = (runLineFinal.top + runLineFinal.bottom) / 2
    await page.touchscreen.tap(cx, cy)
    await wait(150)
    const phaseAfterRun = await page.evaluate(() => document.body.textContent.includes('RUN THE LINE') ? 'still-planning' : 'transitioned')
    result.runLineTapFires = phaseAfterRun
    await page.screenshot({ path: `${OUT}/${dev.name}-05-running.png` })
  }

  // wait for settle
  await wait(2500)
  await page.screenshot({ path: `${OUT}/${dev.name}-06-settled.png` })
  const settledText = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').includes('DIVE AGAIN'))
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { found: true, top: r.top, bottom: r.bottom, height: r.height, viewportH: window.innerHeight }
  })
  result.diveAgainBox = settledText

  // overflow check
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
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
