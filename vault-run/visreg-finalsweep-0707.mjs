// COMPREHENSIVE PRE-RELEASE SWEEP driver — RUG OR RICHES (vault), FINAL/LEAN.
// swoobz-visual-regression-qa, 2026-07-07 (re-run of an earlier attempt that
// was killed mid-flight, no results.json ever produced by it — treated as a
// clean run per task instructions). Own output dir; sampled scope per task
// brief ("may reasonably sample... MUST cover every phase per viewport,
// every world at least once at desktop, win+loss for symmetry checks").
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.env.PORT || '5390'
const OUT = 'shots-visregqa-finalsweep-0707'
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

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
  try { await el.click() } catch (e) { return false }
  return true
}
async function clickSel(page, sel) {
  const h = await page.$(sel)
  if (!h) return false
  try { await h.click() } catch (e) { return false }
  return true
}

async function fresh(page) {
  await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'domcontentloaded' })
  await wait(500)
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch (e) {} })
  await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'domcontentloaded' })
  await wait(700)
  await clickText(page, 'got it')
  await wait(250)
}

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

async function probeWorldPicker(page) {
  return await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-testid^="vault-world-card-"]')]
    return cards.map((card) => {
      const id = card.getAttribute('data-testid')
      const kids = [...card.children]
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
        cardRect: (() => { const r = card.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] })(),
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
      backdropPresent: !!bd,
      backdropImg: bdC ? bdC.backgroundImage.slice(0, 160) : null,
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
    const settledCtl = document.querySelector('[data-testid="SettledControlColumn"]')
    const sessionCard = document.querySelector('[data-testid="vault-ctl-session"]')
    const all = [...document.querySelectorAll('button,[role=button]')]
    const betAgainBtns = all.filter((e) => e.offsetParent !== null && /bet again/i.test(e.textContent || ''))
    const rugged = /RUGGED/.test(document.body.textContent || '')
    return {
      bannerPresent: !!banner,
      bannerInHudRow: !!bannerParent,
      bannerRect: bannerR ? [Math.round(bannerR.x), Math.round(bannerR.y), Math.round(bannerR.width), Math.round(bannerR.height)] : null,
      betAgainCount: betAgainBtns.length,
      betAgainTexts: betAgainBtns.map((e) => (e.textContent || '').trim().slice(0, 40)),
      rugged,
      settledCtlPresent: !!settledCtl,
      settledCtlRect: settledCtl ? (() => { const r = settledCtl.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] })() : null,
      sessionCardPresentInSettled: !!sessionCard,
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
    try { await page.mouse.click(x, y) } catch (e) {}
    await wait(450)
    const rugged = await page.evaluate(() => /RUGGED/.test(document.body.textContent || ''))
    if (rugged) {
      // this attempt lost; start a fresh round in the same mode via bet-again/CTA path if possible
      await wait(300)
      const started = await clickText(page, 'send it')
      if (!started) return { ok: false, note: 'lost-mid-retry-no-restart' }
      await wait(700)
      continue
    }
    await clickText(page, 'take profit')
    await wait(300)
    await clickText(page, 'take profit')
    await wait(1200)
    const settled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
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
    try { await page.mouse.click(x, y) } catch (e) {}
    clicks++
    await wait(380)
    const rugged = await page.evaluate(() => /RUGGED/.test(document.body.textContent || ''))
    if (rugged) return { ok: true, clicks }
    const settled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
    if (settled) return { ok: false, clicks, note: 'settled-without-rug(board-cleared)' }
  }
  return { ok: false, clicks }
}

const RESULTS = { measurements: {}, worldPicker: {}, plates: {}, backdrop: {}, settled: {}, errors: [] }

async function captureWorldAtDesktop(page, world, gridSize, tag, isWide) {
  const errs = []
  const onErr = (m) => { if (m.type && m.type() === 'error') errs.push(m.text().slice(0, 160)) }
  page.on('console', onErr)
  const worldTag = `${tag}-${world}`

  await fresh(page)
  await clickSel(page, `[data-testid="vault-world-card-${world}"]`)
  await wait(500)
  RESULTS.measurements[worldTag + '-betentry'] = await probeShell(page)
  RESULTS.plates[worldTag + '-betentry'] = await probePlates(page)
  RESULTS.backdrop[worldTag + '-betentry'] = await probeBackdrop(page)
  RESULTS.worldPicker[worldTag] = await probeWorldPicker(page)
  await page.screenshot({ path: `${OUT}/${world}-betentry-${tag}.png` })

  await clickText(page, 'send it')
  await wait(1000)
  // mid-round: 2 reveals (or until rugged)
  const centers = await tileCenters(page, gridSize, isWide)
  const order = shuffled(cellIndices(gridSize))
  let rugged = false
  for (let i = 0; i < 2; i++) {
    const [x, y] = centers[order[i]]
    try { await page.mouse.click(x, y) } catch (e) {}
    await wait(450)
    rugged = await page.evaluate(() => /RUGGED/.test(document.body.textContent || ''))
    if (rugged) break
  }
  RESULTS.measurements[worldTag + '-playing'] = await probeShell(page)
  RESULTS.plates[worldTag + '-playing'] = await probePlates(page)
  await page.screenshot({ path: `${OUT}/${world}-playing-${tag}.png` })

  if (!rugged) {
    await clickText(page, 'take profit')
    await wait(300)
    await clickText(page, 'take profit')
  }
  await wait(1200)
  const setProbe = await probeSettled(page)
  const outcomeTag = setProbe.rugged ? 'LOSS' : 'WIN'
  RESULTS.measurements[worldTag + '-settled-' + outcomeTag] = await probeShell(page)
  RESULTS.plates[worldTag + '-settled-' + outcomeTag] = await probePlates(page)
  RESULTS.settled[worldTag + '-' + outcomeTag] = setProbe
  await page.screenshot({ path: `${OUT}/${world}-settled-${tag}-${outcomeTag}.png` })

  page.off('console', onErr)
  RESULTS.errors.push({ combo: worldTag, errs: [...new Set(errs)] })
  return outcomeTag
}

async function captureSymmetryPair(page, tag) {
  // WIN
  await fresh(page)
  await clickSel(page, '[data-testid="vault-world-card-bluechips"]')
  await wait(400)
  await clickText(page, 'send it')
  await wait(900)
  const winDrive = await driveToWin(page, 5, true, 5)
  await wait(600)
  RESULTS.measurements[`sym-${tag}-WIN`] = await probeShell(page)
  RESULTS.plates[`sym-${tag}-WIN`] = await probePlates(page)
  RESULTS.settled[`sym-${tag}-WIN`] = { ...(await probeSettled(page)), driveOk: winDrive.ok }
  await page.screenshot({ path: `${OUT}/bluechips-settled-${tag}-SYMWIN.png` })

  // LOSS
  await fresh(page)
  await clickSel(page, '[data-testid="vault-world-card-bluechips"]')
  await wait(400)
  await clickText(page, 'send it')
  await wait(900)
  const lossDrive = await driveToLoss(page, 5, true, 15)
  await wait(600)
  RESULTS.measurements[`sym-${tag}-LOSS`] = await probeShell(page)
  RESULTS.plates[`sym-${tag}-LOSS`] = await probePlates(page)
  RESULTS.settled[`sym-${tag}-LOSS`] = { ...(await probeSettled(page)), driveOk: lossDrive.ok, clicks: lossDrive.clicks }
  await page.screenshot({ path: `${OUT}/bluechips-settled-${tag}-SYMLOSS.png` })
}

async function captureMobile(page, vw, vh, tag) {
  await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 2 })
  await fresh(page)
  RESULTS.worldPicker[tag + '-bluechips'] = await probeWorldPicker(page)
  await page.screenshot({ path: `${OUT}/bluechips-betentry-${tag}.png` })

  await clickSel(page, '[data-testid="vault-world-card-bluechips"]')
  await wait(500)
  await clickText(page, 'send it')
  await wait(1000)
  const centers = await tileCenters(page, 5, false)
  const order = shuffled(cellIndices(5))
  let rugged = false
  for (let i = 0; i < 2; i++) {
    const [x, y] = centers[order[i]]
    try { await page.touchscreen.tap(x, y) } catch (e) { try { await page.mouse.click(x, y) } catch (e2) {} }
    await wait(500)
    rugged = await page.evaluate(() => /RUGGED/.test(document.body.textContent || ''))
    if (rugged) break
  }
  await page.screenshot({ path: `${OUT}/bluechips-playing-${tag}.png` })

  if (!rugged) {
    await clickText(page, 'take profit')
    await wait(300)
    await clickText(page, 'take profit')
  }
  await wait(1200)
  const setProbe = await probeSettled(page)
  const outcomeTag = setProbe.rugged ? 'LOSS' : 'WIN'
  RESULTS.settled[tag + '-' + outcomeTag] = setProbe
  await page.screenshot({ path: `${OUT}/bluechips-settled-${tag}-${outcomeTag}.png` })
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
    const phase = process.argv[2] || 'all'

    if (phase === 'all' || phase === 'd1440') {
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
      await captureWorldAtDesktop(page, 'bluechips', 5, 'd1440', true)
      await captureWorldAtDesktop(page, 'altseason', 5, 'd1440', true)
      await captureWorldAtDesktop(page, 'shitcoin', 7, 'd1440', true)
      await captureSymmetryPair(page, 'd1440')
      fs.writeFileSync(OUT + '/results-d1440.json', JSON.stringify(RESULTS, null, 1))
      console.log('d1440 DONE')
    }

    if (phase === 'all' || phase === 'd1920') {
      await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })
      await captureWorldAtDesktop(page, 'bluechips', 5, 'd1920', true)
      await captureSymmetryPair(page, 'd1920')
      fs.writeFileSync(OUT + '/results-d1920.json', JSON.stringify(RESULTS, null, 1))
      console.log('d1920 DONE')
    }

    if (phase === 'all' || phase === 'mobile') {
      await captureMobile(page, 412, 915, 'pixel7')
      await captureMobile(page, 393, 852, 'iphone14pro')
      fs.writeFileSync(OUT + '/results-mobile.json', JSON.stringify(RESULTS, null, 1))
      console.log('mobile DONE')
    }
  } catch (e) {
    RESULTS.fatal = String(e && e.stack ? e.stack : e)
    console.error('FATAL', e)
  }

  fs.writeFileSync(OUT + '/results-' + (process.argv[2] || 'all') + '-FINAL.json', JSON.stringify(RESULTS, null, 1))
  console.log('DONE.')
  await browser.close()
})()
