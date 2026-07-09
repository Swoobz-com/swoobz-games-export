// ROUND-2 INDEPENDENT re-verify of the vault CSS-grid-chassis revert AFTER the
// boxSizing:'border-box' fix (+ PLAYING_HUD_CLEARANCE_PX nudge + settled
// whiteSpace:'nowrap' fixes). Fresh port 5973 (5779/5960/5971 squatted).
// Does NOT reuse the maker's own re-verify script or the round-1 driver
// (qa-revreg-independent-0705.mjs / boxsizing-probe.mjs) verbatim — new file,
// but reuses the round-1-proven computeGridLayout mirror + gapFor approach,
// EXTENDED to measure the CHILD card's own rect + computedStyle box-model
// (the exact signal round-1 found missing at the container-only level).
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5973/'
const OUTDIR = 'shots-revreg-round2-0705'
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

// Verbatim copy of VaultGridCanvas.tsx computeGridLayout (source-verified).
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

// containerTestId -> [ {label, testid | null (=> firstElementChild)} ]
const CARD_MAP = {
  'vault-lobby-left': [{ label: 'lobby-hero', testid: null, cap: 260 }],
  'vault-lobby-right': [{ label: 'lobby-cta', testid: null, cap: 260 }],
  'vault-playing-left': [{ label: 'playing-status', testid: null, cap: 260 }],
  'vault-playing-right': [{ label: 'playing-actions', testid: null, cap: 260 }],
  'vault-settled-left': [
    { label: 'settled-result', testid: 'vault-settled-result', cap: 260 },
    { label: 'settled-meta', testid: 'vault-settled-meta', cap: 260 },
  ],
  'vault-settled-right': [{ label: 'settled-next', testid: 'vault-settled-next', cap: 260 }],
  'vault-gutter-right': [{ label: 'settled-receipt', testid: 'vault-settled-receipt-card', cap: 200 }],
  'vault-gutter-left': [{ label: 'gutter-card-a', testid: 'vault-gutter-card-a', cap: 200 }],
  'vault-betentry-right': [
    { label: 'betentry-world', testid: 'vault-betentry-world', cap: 260 },
    { label: 'betentry-yourbet', testid: 'vault-betentry-yourbet', cap: 260 },
    { label: 'betentry-confirm', testid: 'vault-betentry-confirm', cap: 260 },
  ],
}

async function measureCards(page) {
  return page.evaluate((CARD_MAP) => {
    const q = (id) => document.querySelector(`[data-testid="${id}"]`)
    const out = {}
    for (const [containerId, children] of Object.entries(CARD_MAP)) {
      const container = q(containerId)
      if (!container) continue
      const containerRect = container.getBoundingClientRect()
      for (const child of children) {
        const el = child.testid ? q(child.testid) : container.firstElementChild
        if (!el) {
          out[`${containerId}::${child.label}`] = { present: false, cap: child.cap }
          continue
        }
        const rect = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        out[`${containerId}::${child.label}`] = {
          present: true,
          cap: child.cap,
          rectWidth: Number(rect.width.toFixed(2)),
          rectLeft: Number(rect.left.toFixed(2)),
          rectRight: Number(rect.right.toFixed(2)),
          rectTop: Number(rect.top.toFixed(2)),
          boxSizing: cs.boxSizing,
          cssWidth: cs.width,
          paddingLeft: cs.paddingLeft,
          paddingRight: cs.paddingRight,
          borderLeftWidth: cs.borderLeftWidth,
          borderRightWidth: cs.borderRightWidth,
          containerRectWidth: Number(containerRect.width.toFixed(2)),
          exceedsCap: rect.width > child.cap + 0.5,
        }
      }
    }
    return out
  }, CARD_MAP)
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
      rects: {
        'vault-lobby-left': rect(q('vault-lobby-left')),
        'vault-lobby-right': rect(q('vault-lobby-right')),
        'vault-betentry-left': rect(q('vault-betentry-left')),
        'vault-betentry-right': rect(q('vault-betentry-right')),
        'vault-playing-left': rect(q('vault-playing-left')),
        'vault-playing-right': rect(q('vault-playing-right')),
        'vault-settled-left': rect(q('vault-settled-left')),
        'vault-settled-right': rect(q('vault-settled-right')),
        'vault-gutter-left': rect(q('vault-gutter-left')),
        'vault-gutter-right': rect(q('vault-gutter-right')),
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
  await sleep(500) // let the +40px nudge / HUD settle mid-round
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

// F: settled NEXT BET value + VIEW RECEIPT single-line check via clientRects.
async function measureSingleLine(page) {
  return page.evaluate(() => {
    const out = {}
    const nextCard = document.querySelector('[data-testid="vault-settled-next"]')
    if (nextCard) {
      // AnimatedUsdc value — find the span with fontSize 20 sibling structure;
      // fall back to any span inside the wager window.
      const window_ = nextCard.querySelector('div') // settledWagerWindow first div
      const spans = nextCard.querySelectorAll('span')
      let valueSpan = null
      for (const s of spans) {
        if (/[\d.]+\s*USDC|[\d.]/.test(s.textContent || '') && s.textContent.includes('USDC')) { valueSpan = s; break }
      }
      const distinctLines = (el) => {
        const rects = Array.from(el.getClientRects())
        const tops = new Set(rects.map((r) => Math.round(r.top)))
        return tops.size
      }
      if (valueSpan) {
        out.nextBetValueClientRects = valueSpan.getClientRects().length
        out.nextBetValueDistinctLines = distinctLines(valueSpan)
        out.nextBetValueText = valueSpan.textContent
      } else out.nextBetValueClientRects = 'not-found'
    }
    const receiptCard = document.querySelector('[data-testid="vault-settled-receipt-card"]')
    if (receiptCard) {
      const toggle = Array.from(receiptCard.querySelectorAll('button')).find((b) => /view receipt/i.test(b.textContent || ''))
      if (toggle) {
        const distinctLines = (el) => {
          const rects = Array.from(el.getClientRects())
          const tops = new Set(rects.map((r) => Math.round(r.top)))
          return tops.size
        }
        out.viewReceiptClientRects = toggle.getClientRects().length
        out.viewReceiptDistinctLines = distinctLines(toggle)
        out.viewReceiptText = toggle.textContent
      } else out.viewReceiptClientRects = 'not-found'
    }
    return out
  })
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
  const result = { widthsGapProbe: {}, phaseGeometry: {}, cardBoxModel: {}, narrow1000: {}, mobile: {}, errors: {} }

  // ---- A/B/C: board-edge anchor gap + child-card box-model across 5 widths, BetEntry phase ----
  const WIDTHS = [1000, 1280, 1440, 1920, 2560]
  for (const w of WIDTHS) {
    const page = await gotoFresh(browser, w, 900)
    await driveToBetEntry(page)
    const snap = await domSnapshot(page)
    result.widthsGapProbe[w] = gapFor(snap, 'vault-betentry-left', 'vault-betentry-right')
    result.widthsGapProbe[w].viewportW = snap.viewportW
    result.widthsGapProbe[w].canvasWidth = snap.canvas ? snap.canvas.width : null
    result.cardBoxModel[`betentry@${w}`] = await measureCards(page)
    await page.close()
  }

  // ---- B/D/E: full 4-phase geometry + card box-model at 1440x900 and 1920x1080 ----
  for (const [w, h] of [[1440, 900], [1920, 1080]]) {
    const page = await gotoFresh(browser, w, h)
    const key = `${w}x${h}`
    result.phaseGeometry[key] = {}

    // LOBBY
    let snap = await domSnapshot(page)
    result.phaseGeometry[key].lobby = {
      gap: gapFor(snap, 'vault-lobby-left', 'vault-lobby-right'),
      docScrollHeight: snap.docScrollHeight,
      docClientHeight: snap.docClientHeight,
      pageScroll: snap.docScrollHeight > snap.docClientHeight,
    }
    result.cardBoxModel[`lobby@${key}`] = await measureCards(page)
    await page.screenshot({ path: `${OUTDIR}/${key}-1-lobby.png`, fullPage: false })

    // BETENTRY
    await driveToBetEntry(page)
    snap = await domSnapshot(page)
    result.phaseGeometry[key].betentry = {
      gap: gapFor(snap, 'vault-betentry-left', 'vault-betentry-right'),
      docScrollHeight: snap.docScrollHeight,
      docClientHeight: snap.docClientHeight,
      pageScroll: snap.docScrollHeight > snap.docClientHeight,
    }
    result.cardBoxModel[`betentry@${key}`] = await measureCards(page)
    await page.screenshot({ path: `${OUTDIR}/${key}-2-betentry.png`, fullPage: false })

    // PLAYING
    await driveToPlaying(page)
    snap = await domSnapshot(page)
    result.phaseGeometry[key].playing = {
      gap: gapFor(snap, 'vault-playing-left', 'vault-playing-right'),
      docScrollHeight: snap.docScrollHeight,
      docClientHeight: snap.docClientHeight,
      pageScroll: snap.docScrollHeight > snap.docClientHeight,
    }
    result.cardBoxModel[`playing@${key}`] = await measureCards(page)
    // E: Playing +40px nudge check vs lobby (same left/right stack, playing uses BETENTRY_GUTTER.topOffset+40)
    result.phaseGeometry[key].playingNudge = await page.evaluate(() => {
      const q = (id) => document.querySelector(`[data-testid="${id}"]`)
      const pl = q('vault-playing-left')
      const pr = q('vault-playing-right')
      return {
        playingLeftTop: pl ? pl.getBoundingClientRect().top : null,
        playingRightTop: pr ? pr.getBoundingClientRect().top : null,
      }
    })
    await page.screenshot({ path: `${OUTDIR}/${key}-3-playing.png`, fullPage: false })

    // SETTLED
    await driveToSettled(page)
    snap = await domSnapshot(page)
    result.phaseGeometry[key].settled = {
      gap: gapFor(snap, 'vault-settled-left', 'vault-settled-right'),
      docScrollHeight: snap.docScrollHeight,
      docClientHeight: snap.docClientHeight,
      pageScroll: snap.docScrollHeight > snap.docClientHeight,
    }
    result.cardBoxModel[`settled@${key}`] = await measureCards(page)
    result.phaseGeometry[key].settledSingleLine = await measureSingleLine(page)
    await page.screenshot({ path: `${OUTDIR}/${key}-4-settled.png`, fullPage: false })
    // also capture Glass Box / receipt drawer open state
    const toggle = await page.evaluateHandle(() => {
      const receiptCard = document.querySelector('[data-testid="vault-settled-receipt-card"]')
      if (!receiptCard) return null
      return Array.from(receiptCard.querySelectorAll('button')).find((b) => /view receipt/i.test(b.textContent || '')) || null
    })
    const toggleEl = toggle.asElement()
    if (toggleEl) {
      await toggleEl.click()
      await sleep(250)
      await page.screenshot({ path: `${OUTDIR}/${key}-5-settled-receipt-open.png`, fullPage: false })
      result.cardBoxModel[`settled-receiptopen@${key}`] = await measureCards(page)
    }

    result.errors[key] = page.__errors
    await page.close()
  }

  // ---- Also lobby-left top for comparison against Playing +40 nudge ----
  {
    const page = await gotoFresh(browser, 1440, 900)
    const snap = await page.evaluate(() => {
      const q = (id) => document.querySelector(`[data-testid="${id}"]`)
      const l = q('vault-lobby-left')
      const r = q('vault-lobby-right')
      return {
        lobbyLeftTop: l ? l.getBoundingClientRect().top : null,
        lobbyRightTop: r ? r.getBoundingClientRect().top : null,
      }
    })
    result.lobbyTopReference = snap
    await page.close()
  }

  // ---- Probe narrow ~1000px scroll/overflow across all 4 phases ----
  {
    const page = await gotoFresh(browser, 1000, 900)
    const narrow = {}
    let snap = await domSnapshot(page)
    narrow.lobby = { docScrollHeight: snap.docScrollHeight, docClientHeight: snap.docClientHeight, bodyOverflowY: snap.bodyOverflowY }
    await page.screenshot({ path: `${OUTDIR}/narrow1000-1-lobby.png` })
    await driveToBetEntry(page)
    snap = await domSnapshot(page)
    narrow.betentry = { docScrollHeight: snap.docScrollHeight, docClientHeight: snap.docClientHeight, bodyOverflowY: snap.bodyOverflowY, gap: gapFor(snap, 'vault-betentry-left', 'vault-betentry-right') }
    narrow.betentryCards = await measureCards(page)
    await page.screenshot({ path: `${OUTDIR}/narrow1000-2-betentry.png` })
    await driveToPlaying(page)
    snap = await domSnapshot(page)
    narrow.playing = { docScrollHeight: snap.docScrollHeight, docClientHeight: snap.docClientHeight, bodyOverflowY: snap.bodyOverflowY }
    narrow.playingCards = await measureCards(page)
    await page.screenshot({ path: `${OUTDIR}/narrow1000-3-playing.png` })
    await driveToSettled(page)
    snap = await domSnapshot(page)
    narrow.settled = { docScrollHeight: snap.docScrollHeight, docClientHeight: snap.docClientHeight, bodyOverflowY: snap.bodyOverflowY }
    narrow.settledCards = await measureCards(page)
    narrow.settledSingleLine = await measureSingleLine(page)
    await page.screenshot({ path: `${OUTDIR}/narrow1000-4-settled.png` })
    result.narrow1000 = narrow
    result.errors['1000x900'] = page.__errors
    await page.close()
  }

  // ---- Probe mobile (Pixel 7 = 412x915) ----
  {
    const page = await gotoFresh(browser, 412, 915)
    const mob = {}
    let snap = await domSnapshot(page)
    mob.lobby = { docScrollHeight: snap.docScrollHeight, docClientHeight: snap.docClientHeight }
    await page.screenshot({ path: `${OUTDIR}/mobile412-1-lobby.png` })
    await driveToBetEntry(page)
    snap = await domSnapshot(page)
    mob.betentry = { docScrollHeight: snap.docScrollHeight, docClientHeight: snap.docClientHeight }
    await page.screenshot({ path: `${OUTDIR}/mobile412-2-betentry.png` })
    await driveToPlaying(page)
    snap = await domSnapshot(page)
    mob.playing = { docScrollHeight: snap.docScrollHeight, docClientHeight: snap.docClientHeight }
    await page.screenshot({ path: `${OUTDIR}/mobile412-3-playing.png` })
    await driveToSettled(page)
    snap = await domSnapshot(page)
    mob.settled = { docScrollHeight: snap.docScrollHeight, docClientHeight: snap.docClientHeight }
    mob.settledSingleLine = await measureSingleLine(page)
    await page.screenshot({ path: `${OUTDIR}/mobile412-4-settled.png` })
    result.mobile = mob
    result.errors['412x915'] = page.__errors
    await page.close()
  }

  await browser.close()
  fs.writeFileSync(`${OUTDIR}/results.json`, JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) })
