// INDEPENDENT visual-regression re-verify of the vault CSS-grid-chassis REVERT.
// Fresh port 5783 (5779 is squatted by the maker's own server). Does NOT reuse
// any maker driver. Mirrors VaultGridCanvas.tsx's computeGridLayout exactly
// (verified by reading source) to sanity-check the anchor math, but the
// authoritative gap measurement reads onBoardLayout's actual fed-through
// values via the rendered testid rects (rect math), not a re-derivation.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5783/'
const OUTDIR = 'qa-revreg-shots-0705'
fs.mkdirSync(OUTDIR, { recursive: true })

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function clickText(page, text) {
  const handle = await page.evaluateHandle((t) => {
    const all = Array.from(document.querySelectorAll('button'))
    return all.find((b) => b.textContent && b.textContent.trim().toLowerCase().includes(t.toLowerCase())) || null
  }, text)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

// Verbatim copy of VaultGridCanvas.tsx computeGridLayout (source-verified 2026-07-05).
function computeGridLayout(W, H, gridSize, minimalBands) {
  const wide = W / H > 1.2
  const topReserved = minimalBands ? H * 0.035 : H * (wide ? 0.12 : 0.15)
  const bottomReserved = minimalBands ? H * 0.035 : H * (wide ? 0.14 : 0.18)
  const sideFrac = minimalBands ? 0.04 : 0.08
  const safeW = W * (1 - sideFrac * 2)
  const safeH = (H - topReserved - bottomReserved) * 0.96
  const available = Math.min(safeW, safeH)
  const gap = Math.max(6, available * 0.026)
  const tile = (available - gap * (gridSize - 1)) / gridSize
  const full = tile * gridSize + gap * (gridSize - 1)
  const x = (W - full) / 2
  return { x, full }
}

async function domSnapshot(page) {
  return page.evaluate(() => {
    const q = (id) => document.querySelector(`[data-testid="${id}"]`)
    const rect = (el) => (el ? el.getBoundingClientRect().toJSON() : null)
    const shell = q('vault-canvas-shell')
    const canvas = shell ? shell.querySelector('canvas') : null
    return {
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      docScrollHeight: document.documentElement.scrollHeight,
      docClientHeight: document.documentElement.clientHeight,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
      canvas: canvas ? canvas.getBoundingClientRect().toJSON() : null,
      testids: {
        mainGridRefCount: document.querySelectorAll('[data-testid^="vault-ctl-"], [data-testid="vault-main-grid"]').length,
        gutterCardA: document.querySelectorAll('[data-testid="vault-gutter-card-a"]').length,
        gutterCardARight: document.querySelectorAll('[data-testid="vault-gutter-card-a-right"]').length,
      },
      rects: {
        'vault-lobby-left': rect(q('vault-lobby-left')),
        'vault-lobby-right': rect(q('vault-lobby-right')),
        'vault-betentry-left': rect(q('vault-betentry-left')),
        'vault-betentry-right': rect(q('vault-betentry-right')),
        'vault-betentry-world': rect(q('vault-betentry-world')),
        'vault-betentry-yourbet': rect(q('vault-betentry-yourbet')),
        'vault-betentry-confirm': rect(q('vault-betentry-confirm')),
        'vault-playing-left': rect(q('vault-playing-left')),
        'vault-playing-right': rect(q('vault-playing-right')),
        'vault-settled-left': rect(q('vault-settled-left')),
        'vault-settled-right': rect(q('vault-settled-right')),
        'vault-settled-result': rect(q('vault-settled-result')),
        'vault-settled-meta': rect(q('vault-settled-meta')),
        'vault-settled-next': rect(q('vault-settled-next')),
        'vault-settled-betagain': rect(q('vault-settled-betagain')),
        'vault-gutter-left': rect(q('vault-gutter-left')),
        'vault-gutter-right': rect(q('vault-gutter-right')),
        'vault-gutter-card-a': rect(q('vault-gutter-card-a')),
      },
    }
  })
}

function gapFor(snap, leftId, rightId) {
  if (!snap.canvas) return { error: 'no-canvas' }
  const grid = computeGridLayout(snap.canvas.width, snap.canvas.height, 5, false)
  const boardLeftPageX = snap.canvas.left + grid.x
  const boardRightPageX = snap.canvas.left + grid.x + grid.full
  const out = {}
  const left = snap.rects[leftId]
  const right = snap.rects[rightId]
  if (left) {
    out.leftGap = Number((boardLeftPageX - left.right).toFixed(2))
    out.leftOverlap = left.right > boardLeftPageX
  }
  if (right) {
    out.rightGap = Number((right.left - boardRightPageX).toFixed(2))
    out.rightOverlap = right.left < boardRightPageX
    out.rightOffscreen = right.left + right.width > snap.viewportW
  }
  return out
}

async function gotoFresh(browser, w, h) {
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(BASE, { waitUntil: 'networkidle0' })
  await sleep(300)
  page.__errors = errors
  return page
}

async function driveToBetEntry(page) {
  await clickText(page, 'ape in')
  await sleep(300)
}
async function driveToPlaying(page) {
  const sendIt = await page.$('[data-testid="vault-betentry-confirm"] button')
  if (sendIt) await sendIt.click()
  await sleep(400)
}
async function driveToSettled(page) {
  await clickText(page, 'MANUAL')
  await sleep(150)
  const canvas = await page.$('[data-testid="vault-canvas-shell"] canvas')
  const box = canvas ? await canvas.boundingBox() : null
  if (box) {
    outer: for (let gx = 1; gx <= 9; gx++) {
      for (let gy = 1; gy <= 9; gy++) {
        const settled = await page.$('[data-testid="vault-settled-betagain"]')
        if (settled) break outer
        await page.mouse.click(box.x + (box.width * gx) / 10, box.y + (box.height * gy) / 10)
        await sleep(90)
      }
    }
  }
  await sleep(400)
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
  const result = { widthsGapProbe: {}, phaseGeometry: {}, mobile: {}, errors: {} }

  // ---- Probe C: board-edge anchor gap across 5 widths, BetEntry phase ----
  const WIDTHS = [1000, 1280, 1440, 1920, 2560]
  for (const w of WIDTHS) {
    const page = await gotoFresh(browser, w, 900)
    await driveToBetEntry(page)
    const snap = await domSnapshot(page)
    result.widthsGapProbe[w] = gapFor(snap, 'vault-betentry-left', 'vault-betentry-right')
    result.widthsGapProbe[w].viewportW = snap.viewportW
    result.widthsGapProbe[w].canvasWidth = snap.canvas ? snap.canvas.width : null
    await page.close()
  }

  // ---- Probes B/D/F: full 4-phase geometry at 1440x900 and 1920x1080 ----
  for (const [w, h] of [[1440, 900], [1920, 1080]]) {
    const page = await gotoFresh(browser, w, h)
    const key = `${w}x${h}`
    result.phaseGeometry[key] = {}

    // LOBBY
    let snap = await domSnapshot(page)
    result.phaseGeometry[key].lobby = {
      testids: snap.testids,
      gap: gapFor(snap, 'vault-lobby-left', 'vault-lobby-right'),
      docScrollHeight: snap.docScrollHeight,
      docClientHeight: snap.docClientHeight,
      pageScroll: snap.docScrollHeight > snap.docClientHeight,
    }
    await page.screenshot({ path: `${OUTDIR}/${key}-1-lobby.png`, fullPage: false })

    // BETENTRY
    await driveToBetEntry(page)
    snap = await domSnapshot(page)
    result.phaseGeometry[key].betentry = {
      testids: snap.testids,
      gap: gapFor(snap, 'vault-betentry-left', 'vault-betentry-right'),
      docScrollHeight: snap.docScrollHeight,
      docClientHeight: snap.docClientHeight,
      pageScroll: snap.docScrollHeight > snap.docClientHeight,
    }
    await page.screenshot({ path: `${OUTDIR}/${key}-2-betentry.png`, fullPage: false })

    // PLAYING
    await driveToPlaying(page)
    snap = await domSnapshot(page)
    result.phaseGeometry[key].playing = {
      testids: snap.testids,
      gap: gapFor(snap, 'vault-playing-left', 'vault-playing-right'),
      docScrollHeight: snap.docScrollHeight,
      docClientHeight: snap.docClientHeight,
      pageScroll: snap.docScrollHeight > snap.docClientHeight,
    }
    await page.screenshot({ path: `${OUTDIR}/${key}-3-playing.png`, fullPage: false })

    // SETTLED
    await driveToSettled(page)
    snap = await domSnapshot(page)
    result.phaseGeometry[key].settled = {
      testids: snap.testids,
      gap: gapFor(snap, 'vault-settled-left', 'vault-settled-right'),
      gutterCardA: snap.testids.gutterCardA,
      gutterCardARight: snap.testids.gutterCardARight,
      docScrollHeight: snap.docScrollHeight,
      docClientHeight: snap.docClientHeight,
      pageScroll: snap.docScrollHeight > snap.docClientHeight,
    }
    await page.screenshot({ path: `${OUTDIR}/${key}-4-settled.png`, fullPage: false })

    result.errors[key] = page.__errors
    await page.close()
  }

  // ---- Probe E: narrow-desktop ~1000px scroll behavior across all 4 phases ----
  {
    const page = await gotoFresh(browser, 1000, 900)
    const narrow = {}
    let snap = await domSnapshot(page)
    narrow.lobby = { docScrollHeight: snap.docScrollHeight, docClientHeight: snap.docClientHeight, bodyOverflowY: snap.bodyOverflowY }
    await page.screenshot({ path: `${OUTDIR}/narrow1000-1-lobby.png` })
    await driveToBetEntry(page)
    snap = await domSnapshot(page)
    narrow.betentry = { docScrollHeight: snap.docScrollHeight, docClientHeight: snap.docClientHeight, bodyOverflowY: snap.bodyOverflowY, gap: gapFor(snap, 'vault-betentry-left', 'vault-betentry-right') }
    await page.screenshot({ path: `${OUTDIR}/narrow1000-2-betentry.png` })
    await driveToPlaying(page)
    snap = await domSnapshot(page)
    narrow.playing = { docScrollHeight: snap.docScrollHeight, docClientHeight: snap.docClientHeight, bodyOverflowY: snap.bodyOverflowY }
    await page.screenshot({ path: `${OUTDIR}/narrow1000-3-playing.png` })
    await driveToSettled(page)
    snap = await domSnapshot(page)
    narrow.settled = { docScrollHeight: snap.docScrollHeight, docClientHeight: snap.docClientHeight, bodyOverflowY: snap.bodyOverflowY }
    await page.screenshot({ path: `${OUTDIR}/narrow1000-4-settled.png` })
    result.narrow1000 = narrow
    result.errors['1000x900'] = page.__errors
    await page.close()
  }

  // ---- Probe G: mobile 390x844 ----
  {
    const page = await gotoFresh(browser, 390, 844)
    const mob = {}
    let snap = await domSnapshot(page)
    mob.lobby = { gutterDomCount: Object.values(snap.rects).filter(Boolean).length, docScrollHeight: snap.docScrollHeight }
    await page.screenshot({ path: `${OUTDIR}/mobile390-1-lobby.png` })
    await driveToBetEntry(page)
    snap = await domSnapshot(page)
    mob.betentry = { gutterDomCount: Object.values(snap.rects).filter(Boolean).length }
    await page.screenshot({ path: `${OUTDIR}/mobile390-2-betentry.png` })
    await driveToPlaying(page)
    snap = await domSnapshot(page)
    mob.playing = { gutterDomCount: Object.values(snap.rects).filter(Boolean).length }
    await page.screenshot({ path: `${OUTDIR}/mobile390-3-playing.png` })
    await driveToSettled(page)
    snap = await domSnapshot(page)
    mob.settled = { gutterDomCount: Object.values(snap.rects).filter(Boolean).length }
    await page.screenshot({ path: `${OUTDIR}/mobile390-4-settled.png` })
    result.mobile = mob
    result.errors['390x844'] = page.__errors
    await page.close()
  }

  await browser.close()
  fs.writeFileSync(`${OUTDIR}/results.json`, JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) })
