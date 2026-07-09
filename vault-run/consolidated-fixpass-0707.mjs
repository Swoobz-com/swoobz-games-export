import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5390'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document
    if (!root) return null
    const els = [...root.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) ||
      null
    )
  }, { t, within })
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}

async function freshLoad(page) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(500)
  await clickText(page, 'got it')
  await clickText(page, 'skip')
  await wait(250)
}

// Replicate VaultGridCanvas.tsx computeGridLayout exactly (minimalBands path
// used on desktop domHudActive chassis; falls through to fluid path for 7x7).
function gridLayoutJs(W, H, gridSize, minimalBands) {
  const wide = W / H > 1.2
  const topReserved = minimalBands ? H * 0.035 : H * (wide ? 0.12 : 0.15)
  const bottomReserved = minimalBands ? H * 0.035 : H * (wide ? 0.14 : 0.18)
  const sideFrac = minimalBands ? 0.04 : 0.08
  const safeW = W * (1 - sideFrac * 2)
  const safeH = (H - topReserved - bottomReserved) * 0.96
  const available = Math.min(safeW, safeH)
  const FIXED_TILE = 96
  const FIXED_GAP = 16
  const fixedFull = FIXED_TILE * gridSize + FIXED_GAP * (gridSize - 1)
  if (minimalBands && fixedFull <= available + 0.5) {
    const x = (W - fixedFull) / 2
    const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2
    const y = bandCenterY - fixedFull / 2
    return { x, y, tile: FIXED_TILE, gap: FIXED_GAP, full: fixedFull }
  }
  const gap = Math.max(6, available * 0.026)
  const tile = (available - gap * (gridSize - 1)) / gridSize
  const full = tile * gridSize + gap * (gridSize - 1)
  const x = (W - full) / 2
  const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2
  const y = bandCenterY - full / 2
  return { x, y, tile, gap, full }
}

async function cellCenter(page, idx, gridSize, minimalBands) {
  return await page.evaluate(
    ({ idx, gridSize, minimalBands, fn }) => {
      // eslint-disable-next-line no-new-func
      const gridLayoutJs = new Function('return ' + fn)()
      const c = document.querySelector('canvas')
      const r = c.getBoundingClientRect()
      const grid = gridLayoutJs(r.width, r.height, gridSize, minimalBands)
      const col = idx % gridSize
      const row = Math.floor(idx / gridSize)
      const x = grid.x + col * (grid.tile + grid.gap)
      const y = grid.y + row * (grid.tile + grid.gap)
      return { cx: r.left + x + grid.tile / 2, cy: r.top + y + grid.tile / 2, tile: grid.tile, gridX: r.left + x, gridY: r.top + y }
    },
    { idx, gridSize, minimalBands, fn: gridLayoutJs.toString() }
  )
}

function luminance([r, g, b]) {
  const f = (v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
function contrastRatio(a, b) {
  const la = luminance(a), lb = luminance(b)
  const lighter = Math.max(la, lb), darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

async function samplePixel(page, x, y) {
  return await page.evaluate(
    ({ x, y }) => {
      const c = document.querySelector('canvas')
      const r = c.getBoundingClientRect()
      const ctx = c.getContext('2d')
      const px = Math.round((x - r.left) * (c.width / r.width))
      const py = Math.round((y - r.top) * (c.height / r.height))
      const d = ctx.getImageData(px, py, 1, 1).data
      return [d[0], d[1], d[2]]
    },
    { x, y }
  )
}

async function boardTop(page) {
  return await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-canvas-shell"]')
    if (!el) return null
    return Math.round(el.getBoundingClientRect().top)
  })
}

const results = {}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })

  // ── PART A: desktop 1440x900 — WIN with exactly 1 SAFE OPENED, bluechips ──
  {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
    await freshLoad(page)
    // ── Fix 3a: desktop bet-entry intro copy (vault-ctl-intro), em-dash + text ──
    const introText = await page.evaluate(() => document.querySelector('[data-testid="vault-ctl-intro"]')?.textContent || '')
    results.desktopIntroText = introText
    results.desktopIntroHasEmDash = introText.includes('—')
    // ── Fix 2: SAFE(S) LEFT plural, desktop status bar, all 3 worlds ──
    results.safeLeftDesktop = {}
    for (const world of ['bluechips', 'altseason', 'shitcoin']) {
      await clickText(page, world)
      await wait(200)
      const statusText = await page.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent || '')
      results.safeLeftDesktop[world] = statusText
    }
    await clickText(page, 'bluechips')
    await wait(200)

    await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
    await wait(800)
    // Live CTA button text during PLAYING (must remain "TAKE PROFIT", untouched)
    results.liveCtaDuringPlaying = await page.evaluate(
      () => document.querySelector('[data-testid="vault-ctl-cta"]')?.textContent?.trim() || ''
    )
    const boardTopBeforeReveal = await boardTop(page)
    results.boardTop1440BeforeReveal = boardTopBeforeReveal

    // Reveal exactly one tile then cash out -> WIN with revealedTiles.length===1
    let win = false
    let cell = null
    for (let attempt = 0; attempt < 8 && !win; attempt++) {
      const idx = [0, 4, 20, 24, 12, 6, 18, 8][attempt]
      cell = await cellCenter(page, idx, 5, true)
      await page.mouse.click(cell.cx, cell.cy)
      await wait(400)
      const settledAlready = await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'))
      if (settledAlready) {
        // hit a mine on the very first tile -> loss, restart and retry
        await clickText(page, 'bet again')
        await wait(700)
        continue
      }
      await clickText(page, 'take profit', '[data-testid="vault-ctl-cta"]')
      await wait(900)
      win = await page.evaluate(() => document.body.textContent.includes('SECURED THE BAG'))
    }
    results.win1TileAchieved = win
    results.win1TileCell = cell

    // Board caption ("N SAFES OPENED" plural guard)
    results.boardCaptionWin1 = await page.evaluate(
      () => document.querySelector('[data-testid="vault-settled-board-caption"]')?.textContent || ''
    )
    // Settled hero overlay (center) text — must be visible right after settle
    results.heroOverlayTextWin1 = await page.evaluate(
      () => document.querySelector('[data-testid="vault-hero-overlay"]')?.textContent || ''
    )
    // Settled banner text (desktop HUD bar) — must stay "SECURED THE BAG"
    results.settledBannerTextWin1 = await page.evaluate(
      () => document.querySelector('[data-testid="vault-settled-banner"]')?.textContent || ''
    )
    await page.screenshot({ path: 'shots-consolidated-0707/win1-desktop-hero.png' })

    // Wait out HERO_VISIBLE_MS (2000ms) so hero auto-dismisses, banner + board persist
    await wait(1700)
    results.heroOverlayGoneAfterTimeout = await page.evaluate(
      () => document.querySelector('[data-testid="vault-hero-overlay"]') === null
    )
    results.settledBannerTextAfterHeroGone = await page.evaluate(
      () => document.querySelector('[data-testid="vault-settled-banner"]')?.textContent || ''
    )

    // Pick-order number contrast — sample the plate fill vs the numeral fill
    // at the just-revealed tile's numeral position (cx+0.26*size, cy+0.26*size)
    if (cell) {
      const numeralX = cell.cx + cell.tile * 0.26
      const numeralY = cell.cy + cell.tile * 0.26
      // plate edge sample (background, no glyph ink) vs plate center (glyph ink likely present for "1")
      const plateBg = await samplePixel(page, numeralX + cell.tile * 0.06, numeralY - cell.tile * 0.06)
      const plateCenter = await samplePixel(page, numeralX, numeralY)
      results.coinContrastPlateBg = plateBg
      results.coinContrastPlateCenter = plateCenter
      results.coinContrastRatio = contrastRatio(plateBg, plateCenter)
    }

    results.boardTop1440AfterSettle = await boardTop(page)
    await page.screenshot({ path: 'shots-consolidated-0707/win1-desktop-settled.png' })
    await page.close()
  }

  // ── PART B: desktop 1440x900 — LOSS with exactly 1 SAFE OPENED, shitcoin ──
  {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
    await freshLoad(page)
    await clickText(page, 'shitcoin')
    await wait(200)
    await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
    await wait(800)

    let gotLoss1 = false
    for (let outer = 0; outer < 12 && !gotLoss1; outer++) {
      // reveal tile A
      const idxA = Math.floor(Math.random() * 49)
      const cellA = await cellCenter(page, idxA, 7, true)
      await page.mouse.click(cellA.cx, cellA.cy)
      await wait(350)
      let settled = await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'))
      if (settled) {
        // first click hit a mine -> 0 revealed, not what we want; restart
        await clickText(page, 'bet again')
        await wait(600)
        continue
      }
      // reveal tile B, hoping for a mine (24/49 mines makes this likely)
      let idxB = Math.floor(Math.random() * 49)
      while (idxB === idxA) idxB = Math.floor(Math.random() * 49)
      const cellB = await cellCenter(page, idxB, 7, true)
      await page.mouse.click(cellB.cx, cellB.cy)
      await wait(350)
      settled = await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'))
      if (!settled) {
        // still playing -> both safe, this attempt has 2 revealed; restart
        await clickText(page, 'bet again')
        await wait(600)
        continue
      }
      const isWin = await page.evaluate(() => document.body.textContent.includes('SECURED THE BAG'))
      if (isWin) {
        await clickText(page, 'bet again')
        await wait(600)
        continue
      }
      gotLoss1 = true
    }
    results.loss1TileAchieved = gotLoss1
    results.boardCaptionLoss1 = await page.evaluate(
      () => document.querySelector('[data-testid="vault-settled-board-caption"]')?.textContent || ''
    )
    await page.screenshot({ path: 'shots-consolidated-0707/loss1-desktop-settled.png' })
    await page.close()
  }

  // ── PART C: desktop 1920x1080 — board-Y anchor + em-dash re-check ──
  {
    const page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })
    await freshLoad(page)
    results.boardTop1920BetEntry = await boardTop(page)
    const introText1920 = await page.evaluate(() => document.querySelector('[data-testid="vault-ctl-intro"]')?.textContent || '')
    results.desktopIntroText1920 = introText1920
    await page.close()
  }

  // ── PART D: mobile 390x844 — SAFE(S) LEFT (header tape) + hint em-dash ──
  {
    const page = await browser.newPage()
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
    await freshLoad(page)
    results.mobileHint = {}
    results.mobileSafeLeftHeader = {}
    for (const world of ['bluechips', 'altseason', 'shitcoin']) {
      await clickText(page, world)
      await wait(250)
      const hint = await page.evaluate(() => {
        const els = [...document.querySelectorAll('*')]
        const hit = els.find((e) => e.children.length === 0 && /crack compartments to pump your multiplier/i.test(e.textContent || ''))
        return hit ? hit.textContent : ''
      })
      results.mobileHint[world] = hint
      const header = await page.evaluate(() => {
        const els = [...document.querySelectorAll('*')]
        const hit = els.find((e) => e.children.length === 0 && /SAFES? LEFT/.test(e.textContent || ''))
        return hit ? hit.textContent : ''
      })
      results.mobileSafeLeftHeader[world] = header
    }
    results.mobileHintHasEmDash = Object.values(results.mobileHint).some((t) => t.includes('—'))
    await page.screenshot({ path: 'shots-consolidated-0707/mobile-betentry.png' })
    await page.close()
  }

  await browser.close()
}

run()
  .then(() => {
    console.log(JSON.stringify(results, null, 2))
  })
  .catch((e) => {
    console.error('DRIVER ERROR', e)
    console.log(JSON.stringify(results, null, 2))
    process.exit(1)
  })
