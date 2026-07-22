// COMPREHENSIVE PRE-RELEASE SWEEP driver — RUG OR RICHES (vault)
// swoobz-visual-regression-qa, 2026-07-07. Fresh, independent driver (not a
// clone of any prior round's number) targeting the ALREADY-RUNNING dev
// server at :5390. Own output dir: shots-visregqa-fullsweep-0707/.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.env.PORT || '5390'
const OUT = 'shots-visregqa-fullsweep-0707'
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const WORLDS = [
  { mode: 'bluechips', gridSize: 5, mines: 3 },
  { mode: 'altseason', gridSize: 5, mines: 5 },
  { mode: 'shitcoin', gridSize: 7, mines: 24 },
]

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')]
    const lc = t.toLowerCase()
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(lc)) ||
      null
    )
  }, t)
  const el = h.asElement()
  if (!el) return false
  try {
    await el.click()
  } catch (e) {
    return false
  }
  return true
}
async function clickSel(page, sel) {
  const h = await page.$(sel)
  if (!h) return false
  try {
    await h.click()
  } catch (e) {
    return false
  }
  return true
}

async function fresh(page) {
  await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'networkidle0' })
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch (e) {}
  })
  await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'networkidle0' })
  await wait(900)
  await clickText(page, 'got it')
  await wait(250)
}

// ── Replicates VaultGridCanvas.tsx computeGridLayout() EXACTLY (source read
//    2026-07-07) so tile-click centers are derived from LIVE canvas rect +
//    the real formula, not hardcoded prior-round pixel guesses. ────────────
function computeGridLayoutJs(W, H, gridSize, minimalBands) {
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
  const bandCenterY2 = topReserved + (H - topReserved - bottomReserved) / 2
  const y = bandCenterY2 - full / 2
  return { x, y, tile, gap, full }
}

async function getCanvasRect(page) {
  return await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  })
}

async function tileCenters(page, gridSize, isWide) {
  const cr = await getCanvasRect(page)
  if (!cr) return []
  const grid = computeGridLayoutJs(cr.width, cr.height, gridSize, isWide)
  const out = []
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cx = cr.left + grid.x + col * (grid.tile + grid.gap) + grid.tile / 2
      const cy = cr.top + grid.y + row * (grid.tile + grid.gap) + grid.tile / 2
      out.push([Math.round(cx), Math.round(cy)])
    }
  }
  return out
}

function shuffled(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── DOM probes ───────────────────────────────────────────────────────────
async function probeShell(page) {
  return await page.evaluate(() => {
    const q = (s) => document.querySelector(s)
    const shell = q('[data-testid="vault-canvas-shell"]')
    const ctlCol = q('[data-testid="DesktopControlColumn"]')
    const shellR = shell ? shell.getBoundingClientRect() : null
    const ctlR = ctlCol ? ctlCol.getBoundingClientRect() : null
    return {
      boardTop: shellR ? Math.round(shellR.top) : null,
      boardLeft: shellR ? Math.round(shellR.left) : null,
      gridFull: shell ? shell.getAttribute('data-grid-full') : null,
      gridPlate: shell ? shell.getAttribute('data-grid-plate') : null,
      gridTile: shell ? shell.getAttribute('data-grid-tile') : null,
      gridGap: shell ? shell.getAttribute('data-grid-gap') : null,
      controlColWidth: ctlR ? Math.round(ctlR.width) : null,
      controlColLeft: ctlR ? Math.round(ctlR.left) : null,
    }
  })
}

async function probePlates(page) {
  return await page.evaluate(() => {
    const out = {}
    document.querySelectorAll('[data-testid^="vault-ctl-"]').forEach((e) => {
      const id = e.getAttribute('data-testid')
      const r = e.getBoundingClientRect()
      if (r.width < 2) return
      const c = getComputedStyle(e)
      out[id] = {
        rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
        border: c.borderTopColor + ' ' + c.borderTopWidth,
        radius: c.borderTopLeftRadius,
        shadow: c.boxShadow,
        bg: c.backgroundImage !== 'none' ? c.backgroundImage.slice(0, 55) : c.backgroundColor,
      }
    })
    // world cards (P1a) — NOT vault-ctl-* prefixed
    document.querySelectorAll('[data-testid^="vault-world-card-"]').forEach((e) => {
      const id = e.getAttribute('data-testid')
      const r = e.getBoundingClientRect()
      const c = getComputedStyle(e)
      out[id] = {
        rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
        border: c.borderTopColor + ' ' + c.borderTopWidth,
        radius: c.borderTopLeftRadius,
        shadow: c.boxShadow,
        bg: c.backgroundImage !== 'none' ? c.backgroundImage.slice(0, 55) : c.backgroundColor,
      }
    })
    const rb = document.querySelector('[data-testid="vault-rhythm-badge"]')
    if (rb) {
      const r = rb.getBoundingClientRect()
      const c = getComputedStyle(rb)
      out['vault-rhythm-badge'] = {
        rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
        border: c.borderTopColor + ' ' + c.borderTopWidth,
        radius: c.borderTopLeftRadius,
        shadow: c.boxShadow,
        bg: c.backgroundImage !== 'none' ? c.backgroundImage.slice(0, 55) : c.backgroundColor,
      }
    }
    return out
  })
}

// world-picker 5-element anatomy probe (icon tile / tier pill / meta+BEST /
// max anchor / risk bar) — structural, no dedicated sub-testids exist so we
// walk DOM children in JSX-authored order.
async function probeWorldPicker(page) {
  return await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-testid^="vault-world-card-"]')]
    return cards.map((card) => {
      const id = card.getAttribute('data-testid')
      const kids = [...card.children] // [iconTile, worldBody, worldMaxAnchor, worldRiskLabel, worldRiskBar]
      const iconTile = kids[0]
      const worldBody = kids[1]
      const maxAnchor = kids[2]
      const riskLabel = kids[3]
      const riskBar = kids[4]
      const bodyKids = worldBody ? [...worldBody.children] : []
      const titleRow = bodyKids[0]
      const metaRow = bodyKids[1]
      const tierPill = titleRow ? titleRow.children[1] : null
      const hasBest = metaRow ? /BEST/.test(metaRow.textContent || '') : false
      const fill = riskBar ? riskBar.querySelector('span') : null
      const fillW = fill ? getComputedStyle(fill).width : null
      const barW = riskBar ? getComputedStyle(riskBar).width : null
      return {
        id,
        childCount: kids.length,
        iconTileText: iconTile ? iconTile.textContent : null,
        tierPillText: tierPill ? tierPill.textContent : null,
        metaText: metaRow ? metaRow.textContent : null,
        hasBestBadge: hasBest,
        maxAnchorText: maxAnchor ? maxAnchor.textContent : null,
        riskLabelText: riskLabel ? riskLabel.textContent : null,
        riskBarWidth: barW,
        riskFillWidth: fillW,
        cardBoxShadow: getComputedStyle(card).boxShadow,
      }
    })
  })
}

async function probeBackdrop(page) {
  return await page.evaluate(() => {
    const bd = document.querySelector('[data-testid="vault-grid-backdrop"]')
    const scrim = document.querySelector('[data-testid="vault-scene-edge-scrim"]')
    const bdC = bd ? getComputedStyle(bd) : null
    const scrimC = scrim ? getComputedStyle(scrim) : null
    return {
      backdropImg: bdC ? bdC.backgroundImage : null,
      backdropZ: bdC ? bdC.zIndex : null,
      scrimPresent: !!scrim,
      scrimImg: scrimC ? scrimC.backgroundImage.slice(0, 140) : null,
      scrimZ: scrimC ? scrimC.zIndex : null,
    }
  })
}

async function probeSettled(page) {
  return await page.evaluate(() => {
    const banner = document.querySelector('[data-testid="vault-settled-banner"]')
    const bannerR = banner ? banner.getBoundingClientRect() : null
    const bannerParent = banner ? banner.closest('[data-testid="DesktopHudRow"]') : null
    // count visible "bet again" CTAs anywhere on screen
    const all = [...document.querySelectorAll('button,[role=button]')]
    const betAgainBtns = all.filter(
      (e) => e.offsetParent !== null && /bet again/i.test(e.textContent || ''),
    )
    const rugged = /RUGGED/.test(document.body.textContent || '')
    return {
      bannerPresent: !!banner,
      bannerInHudRow: !!bannerParent,
      bannerRect: bannerR ? [Math.round(bannerR.x), Math.round(bannerR.y), Math.round(bannerR.width), Math.round(bannerR.height)] : null,
      betAgainCount: betAgainBtns.length,
      betAgainTexts: betAgainBtns.map((e) => (e.textContent || '').trim().slice(0, 40)),
      rugged,
    }
  })
}

function cellIndices(gridSize) {
  const out = []
  for (let i = 0; i < gridSize * gridSize; i++) out.push(i)
  return out
}

async function driveToWin(page, gridSize, isWide, maxAttempts) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const centers = await tileCenters(page, gridSize, isWide)
    const order = shuffled(cellIndices(gridSize))
    const [x, y] = centers[order[0]]
    try {
      await page.mouse.click(x, y)
    } catch (e) {}
    await wait(500)
    const rugged = await page.evaluate(() => /RUGGED/.test(document.body.textContent || ''))
    if (rugged) continue // this attempt hit a mine -> settled as loss, retry a fresh round upstream
    await clickText(page, 'take profit')
    await wait(300)
    await clickText(page, 'take profit')
    await wait(1200)
    const settled = await page.evaluate(() =>
      !!document.querySelector('[data-testid="vault-settled-banner"]'),
    )
    if (settled) return { ok: true, attempt }
  }
  return { ok: false }
}

async function driveToLoss(page, gridSize, isWide, maxClicks) {
  const centers = await tileCenters(page, gridSize, isWide)
  const order = shuffled(cellIndices(gridSize))
  let clicks = 0
  for (const idx of order) {
    if (clicks >= maxClicks) break
    const [x, y] = centers[idx]
    try {
      await page.mouse.click(x, y)
    } catch (e) {}
    clicks++
    await wait(420)
    const rugged = await page.evaluate(() => /RUGGED/.test(document.body.textContent || ''))
    if (rugged) return { ok: true, clicks }
    const settled = await page.evaluate(() =>
      !!document.querySelector('[data-testid="vault-settled-banner"]'),
    )
    if (settled) return { ok: false, clicks, note: 'settled-without-rug(board-cleared)' }
  }
  return { ok: false, clicks }
}

async function midRoundShot(page, world, gridSize, isWide, tag) {
  const centers = await tileCenters(page, gridSize, isWide)
  const order = shuffled(cellIndices(gridSize))
  let rugged = false
  for (let i = 0; i < 2; i++) {
    const [x, y] = centers[order[i]]
    try {
      await page.mouse.click(x, y)
    } catch (e) {}
    await wait(450)
    rugged = await page.evaluate(() => /RUGGED/.test(document.body.textContent || ''))
    if (rugged) break
  }
  await page.screenshot({ path: `${OUT}/${world}-playing-${tag}.png` })
  return { rugged }
}

const RESULTS = { measurements: {}, worldPicker: {}, plates: {}, backdrop: {}, settled: {}, errors: [] }

async function runViewport(page, vw, vh, dsf, tag, isWide) {
  await page.setViewport({ width: vw, height: vh, deviceScaleFactor: dsf })
  const errs = []
  const onErr = (m) => {
    if (m.type && m.type() === 'error') errs.push(m.text().slice(0, 160))
  }
  page.on('console', onErr)

  for (const w of WORLDS.filter((w) => (vw >= 960 ? true : w.mode === 'bluechips'))) {
    const worldTag = `${tag}-${w.mode}`
    // ── BET-ENTRY ──────────────────────────────────────────────────────
    await fresh(page)
    await clickSel(page, `[data-testid="vault-world-card-${w.mode}"]`)
    await wait(500)
    if (vw >= 960) {
      RESULTS.measurements[worldTag + '-betentry'] = await probeShell(page)
      RESULTS.plates[worldTag + '-betentry'] = await probePlates(page)
      RESULTS.backdrop[worldTag + '-betentry'] = await probeBackdrop(page)
    }
    RESULTS.worldPicker[worldTag] = await probeWorldPicker(page)
    await page.screenshot({ path: `${OUT}/${w.mode}-betentry-${tag}.png` })

    // ── PLAYING (mid-round, ~2 reveals) ─────────────────────────────────
    await clickText(page, 'send it')
    await wait(1200)
    if (vw >= 960) {
      RESULTS.measurements[worldTag + '-playing'] = await probeShell(page)
      RESULTS.plates[worldTag + '-playing'] = await probePlates(page)
    }
    const mid = await midRoundShot(page, w.mode, w.gridSize, isWide, tag)

    // ── SETTLED (finish this same round: win if not already rugged) ────
    if (!mid.rugged) {
      await clickText(page, 'take profit')
      await wait(300)
      await clickText(page, 'take profit')
    }
    await wait(1200)
    const setProbe = await probeSettled(page)
    const outcomeTag = setProbe.rugged ? 'LOSS' : 'WIN'
    await page.screenshot({ path: `${OUT}/${w.mode}-settled-${tag}-${outcomeTag}.png` })
    if (vw >= 960) {
      RESULTS.measurements[worldTag + '-settled-' + outcomeTag] = await probeShell(page)
      RESULTS.plates[worldTag + '-settled-' + outcomeTag] = await probePlates(page)
      RESULTS.settled[worldTag + '-' + outcomeTag] = setProbe
    } else {
      RESULTS.settled[worldTag + '-' + outcomeTag + '-mobile'] = setProbe
    }
  }

  // ── DEDICATED WIN vs LOSS SYMMETRY RUN (bluechips only, this viewport) ──
  if (vw >= 960) {
    // WIN
    await fresh(page)
    await clickSel(page, '[data-testid="vault-world-card-bluechips"]')
    await wait(400)
    await clickText(page, 'send it')
    await wait(900)
    const winDrive = await driveToWin(page, 5, isWide, 4)
    await wait(600)
    const winProbe = await probeShell(page)
    const winSettled = await probeSettled(page)
    await page.screenshot({ path: `${OUT}/bluechips-settled-${tag}-SYMWIN.png` })
    RESULTS.measurements[`sym-${tag}-WIN`] = winProbe
    RESULTS.settled[`sym-${tag}-WIN`] = { ...winSettled, driveOk: winDrive.ok }

    // LOSS
    await fresh(page)
    await clickSel(page, '[data-testid="vault-world-card-bluechips"]')
    await wait(400)
    await clickText(page, 'send it')
    await wait(900)
    const lossDrive = await driveToLoss(page, 5, isWide, 15)
    await wait(600)
    const lossProbe = await probeShell(page)
    const lossSettled = await probeSettled(page)
    await page.screenshot({ path: `${OUT}/bluechips-settled-${tag}-SYMLOSS.png` })
    RESULTS.measurements[`sym-${tag}-LOSS`] = lossProbe
    RESULTS.settled[`sym-${tag}-LOSS`] = { ...lossSettled, driveOk: lossDrive.ok, clicks: lossDrive.clicks }
  }

  page.off('console', onErr)
  RESULTS.errors.push({ viewport: tag, errs: [...new Set(errs)] })
}

async function runBestBadgeCheck(page) {
  // Win a bluechips round WITHOUT clearing storage afterward, then revisit
  // bet-entry to confirm the BEST badge appears on that world's card only
  // (hide-until-data design, per AGENT_MEMORY.md).
  await fresh(page)
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await clickSel(page, '[data-testid="vault-world-card-bluechips"]')
  await wait(400)
  await clickText(page, 'send it')
  await wait(900)
  await driveToWin(page, 5, true, 4)
  await wait(800)
  await clickText(page, 'bet again')
  await wait(700)
  const wp = await probeWorldPicker(page)
  await page.screenshot({ path: `${OUT}/bluechips-betentry-AFTERWIN-bestbadge.png` })
  return wp
}

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1980,1100'],
  })
  const page = await browser.newPage()
  page.on('pageerror', (e) => RESULTS.errors.push({ pageerror: e.message.slice(0, 200) }))

  try {
    await runViewport(page, 1440, 900, 1, 'd1440', true)
    await runViewport(page, 1920, 1080, 1, 'd1920', true)
    await runViewport(page, 412, 915, 2, 'pixel7', false)
    await runViewport(page, 393, 852, 2, 'iphone14pro', false)
    RESULTS.bestBadge = await runBestBadgeCheck(page)
  } catch (e) {
    RESULTS.fatal = String(e)
    console.error('FATAL', e)
  }

  fs.writeFileSync(OUT + '/results.json', JSON.stringify(RESULTS, null, 1))
  console.log('DONE. results.json written to', OUT)
  await browser.close()
})()
