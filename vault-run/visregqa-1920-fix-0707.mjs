// Targeted re-run for the 1920x1080 gaps left by visregqa-fullsweep-0707.mjs
// (ElementHandle.click() protocol timeouts at the heavier viewport — see
// diag-1920-clickfail.mjs). Uses a robust click helper: race el.click()
// against a short timeout, fall back to page.mouse.click at the element's
// live bounding-box center. Fresh independent measurements, own OUT dir.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.env.PORT || '5390'
const OUT = 'shots-visregqa-fullsweep-0707'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function robustClickSel(page, sel) {
  const h = await page.$(sel)
  if (!h) return false
  let timedOut = false
  try {
    await Promise.race([
      h.click(),
      wait(1200).then(() => {
        timedOut = true
      }),
    ])
  } catch (e) {
    timedOut = true
  }
  if (!timedOut) return true
  const box = await h.boundingBox().catch(() => null)
  if (!box) return false
  try {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    return true
  } catch (e) {
    return false
  }
}

async function robustClickText(page, t) {
  const found = await page.evaluate((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')]
    const lc = t.toLowerCase()
    const el =
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(lc))
    if (!el) return null
    const r = el.getBoundingClientRect()
    return [r.x + r.width / 2, r.y + r.height / 2]
  }, t)
  if (!found) return false
  try {
    await page.mouse.click(found[0], found[1])
    return true
  } catch (e) {
    return false
  }
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
  await robustClickText(page, 'got it')
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
function cellIndices(n) {
  const out = []
  for (let i = 0; i < n * n; i++) out.push(i)
  return out
}

async function probeShell(page) {
  return await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]')
    const ctlCol = document.querySelector('[data-testid="DesktopControlColumn"]')
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
async function probeBackdrop(page) {
  return await page.evaluate(() => {
    const bd = document.querySelector('[data-testid="vault-grid-backdrop"]')
    const c = bd ? getComputedStyle(bd) : null
    return { backdropImg: c ? c.backgroundImage : null, mode: (document.body.textContent.match(/BLUECHIPS|ALTSEASON|SHITCOIN/) || [])[0] }
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
      return {
        id,
        childCount: kids.length,
        iconTileText: iconTile ? iconTile.textContent : null,
        tierPillText: tierPill ? tierPill.textContent : null,
        metaText: metaRow ? metaRow.textContent : null,
        maxAnchorText: maxAnchor ? maxAnchor.textContent : null,
        riskLabelText: riskLabel ? riskLabel.textContent : null,
        cardBoxShadow: getComputedStyle(card).boxShadow,
      }
    })
  })
}
async function probeSettled(page) {
  return await page.evaluate(() => {
    const banner = document.querySelector('[data-testid="vault-settled-banner"]')
    const bannerR = banner ? banner.getBoundingClientRect() : null
    const all = [...document.querySelectorAll('button,[role=button]')]
    const betAgainBtns = all.filter((e) => e.offsetParent !== null && /bet again/i.test(e.textContent || ''))
    return {
      bannerPresent: !!banner,
      bannerRect: bannerR ? [Math.round(bannerR.x), Math.round(bannerR.y), Math.round(bannerR.width), Math.round(bannerR.height)] : null,
      betAgainCount: betAgainBtns.length,
      rugged: /RUGGED/.test(document.body.textContent || ''),
    }
  })
}

async function driveToWin(page, gridSize, isWide, maxAttempts) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const centers = await tileCenters(page, gridSize, isWide)
    const order = shuffled(cellIndices(gridSize))
    const [x, y] = centers[order[0]]
    await page.mouse.click(x, y)
    await wait(550)
    const rugged = await page.evaluate(() => /RUGGED/.test(document.body.textContent || ''))
    if (rugged) continue
    await robustClickText(page, 'take profit')
    await wait(400)
    await robustClickText(page, 'take profit')
    await wait(1300)
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
    await page.mouse.click(x, y)
    clicks++
    await wait(480)
    const rugged = await page.evaluate(() => /RUGGED/.test(document.body.textContent || ''))
    if (rugged) return { ok: true, clicks }
    const settled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
    if (settled) return { ok: false, clicks, note: 'settled-without-rug' }
  }
  return { ok: false, clicks }
}

const OUT_RESULTS = {}

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1980,1100'],
    protocolTimeout: 60000,
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })

  for (const world of ['altseason', 'shitcoin']) {
    await fresh(page)
    await robustClickSel(page, `[data-testid="vault-world-card-${world}"]`)
    await wait(600)
    const bd = await probeBackdrop(page)
    OUT_RESULTS[`d1920-${world}-betentry-mode`] = bd
    OUT_RESULTS[`d1920-${world}-betentry-shell`] = await probeShell(page)
    OUT_RESULTS[`d1920-${world}-betentry-worldpicker`] = await probeWorldPicker(page)
    await page.screenshot({ path: `${OUT}/${world}-betentry-d1920-FIXED.png` })

    await robustClickText(page, 'send it')
    await wait(1300)
    OUT_RESULTS[`d1920-${world}-playing-shell`] = await probeShell(page)
    // reveal 2 tiles for mid-round shot
    const gridSize = world === 'shitcoin' ? 7 : 5
    const centers = await tileCenters(page, gridSize, true)
    const order = shuffled(cellIndices(gridSize))
    let rugged = false
    for (let i = 0; i < 2; i++) {
      const [x, y] = centers[order[i]]
      await page.mouse.click(x, y)
      await wait(500)
      rugged = await page.evaluate(() => /RUGGED/.test(document.body.textContent || ''))
      if (rugged) break
    }
    await page.screenshot({ path: `${OUT}/${world}-playing-d1920-FIXED.png` })
    if (!rugged) {
      await robustClickText(page, 'take profit')
      await wait(400)
      await robustClickText(page, 'take profit')
    }
    await wait(1300)
    const setP = await probeSettled(page)
    const tag = setP.rugged ? 'LOSS' : 'WIN'
    OUT_RESULTS[`d1920-${world}-settled-${tag}`] = { ...setP, shell: await probeShell(page) }
    await page.screenshot({ path: `${OUT}/${world}-settled-d1920-FIXED-${tag}.png` })
  }

  // bluechips WIN/LOSS symmetry, robust
  await fresh(page)
  await robustClickSel(page, '[data-testid="vault-world-card-bluechips"]')
  await wait(500)
  await robustClickText(page, 'send it')
  await wait(1000)
  const winDrive = await driveToWin(page, 5, true, 5)
  await wait(700)
  OUT_RESULTS['sym-d1920-WIN-FIXED'] = { ...(await probeSettled(page)), shell: await probeShell(page), driveOk: winDrive.ok }
  await page.screenshot({ path: `${OUT}/bluechips-settled-d1920-SYMWIN-FIXED.png` })

  await fresh(page)
  await robustClickSel(page, '[data-testid="vault-world-card-bluechips"]')
  await wait(500)
  await robustClickText(page, 'send it')
  await wait(1000)
  const lossDrive = await driveToLoss(page, 5, true, 20)
  await wait(700)
  OUT_RESULTS['sym-d1920-LOSS-FIXED'] = { ...(await probeSettled(page)), shell: await probeShell(page), driveOk: lossDrive.ok, clicks: lossDrive.clicks }
  await page.screenshot({ path: `${OUT}/bluechips-settled-d1920-SYMLOSS-FIXED.png` })

  fs.writeFileSync(OUT + '/results-1920fix.json', JSON.stringify(OUT_RESULTS, null, 1))
  console.log('DONE_1920_FIX')
  await browser.close()
})().catch((e) => {
  console.error('FATAL', e)
  fs.writeFileSync(OUT + '/results-1920fix.json', JSON.stringify(OUT_RESULTS, null, 1))
})
