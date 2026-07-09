import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5189/'
const OUT = 'shots-mobile-qa'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const DEVICES = [
  {
    key: 'pixel7',
    name: 'Pixel 7 (412x915)',
    viewport: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, isLandscape: false },
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
  },
  {
    key: 'iphone14pro',
    name: 'iPhone 14 Pro (390x844)',
    viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true, isLandscape: false },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  },
]

async function bodyText(page) {
  return page.evaluate(() => document.body.innerText)
}

async function canvasBox(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}

async function allButtons(page) {
  return page.evaluate(() => {
    return [...document.querySelectorAll('button')].map((b) => {
      const r = b.getBoundingClientRect()
      const cs = getComputedStyle(b)
      return {
        text: (b.textContent || '').trim(),
        x: r.x,
        y: r.y,
        w: Math.round(r.width * 100) / 100,
        h: Math.round(r.height * 100) / 100,
        cx: r.x + r.width / 2,
        cy: r.y + r.height / 2,
        disabled: b.disabled,
        borderRadius: cs.borderRadius,
        touchAction: cs.touchAction,
      }
    })
  })
}

async function readOdometer(page) {
  return page.evaluate(() => {
    const spans = [...document.querySelectorAll('span')]
    for (const s of spans) {
      if (/\/\s*8\s*min/.test(s.textContent || '')) {
        const prev = s.previousElementSibling
        return prev ? prev.textContent.trim() : null
      }
    }
    return null
  })
}

async function scrollMetrics(page, vpHeight) {
  return page.evaluate((vh) => {
    return {
      docScrollWidth: document.documentElement.scrollWidth,
      docScrollHeight: document.documentElement.scrollHeight,
      winInnerWidth: window.innerWidth,
      winInnerHeight: window.innerHeight,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    }
  }, vpHeight)
}

async function measureTapLatency(page, btn) {
  if (!btn) return null
  await page.evaluate(
    ({ text }) => {
      const btns = [...document.querySelectorAll('button')]
      const b = btns.find((el) => (el.textContent || '').trim() === text)
      if (!b) return
      window.__tapTimes = {}
      b.addEventListener(
        'pointerdown',
        () => {
          window.__tapTimes.pointerdown = performance.now()
        },
        { once: true },
      )
      b.addEventListener(
        'click',
        () => {
          window.__tapTimes.click = performance.now()
        },
        { once: true },
      )
    },
    { text: btn.text },
  )
  await page.touchscreen.tap(btn.cx, btn.cy)
  await wait(250)
  const t = await page.evaluate(() => window.__tapTimes)
  if (!t || t.pointerdown == null) return { fired: false }
  return { fired: true, pointerdown: t.pointerdown, click: t.click ?? null, deltaMs: t.click != null ? Math.round(t.click - t.pointerdown) : null }
}

async function dragPaint(page, points, moveDelayMs = 30) {
  const first = points[0]
  const touch = await page.touchscreen.touchStart(first.x, first.y)
  await wait(moveDelayMs)
  for (let i = 1; i < points.length; i++) {
    await touch.move(points[i].x, points[i].y)
    await wait(moveDelayMs)
  }
  await touch.end()
}

function tileCenter(box, col, row) {
  const tile = box.w / 32
  return { x: box.x + col * tile + tile / 2, y: box.y + row * tile + tile / 2 }
}

async function runViewport(device) {
  const errors = []
  const report = { device: device.name, viewport: device.viewport }
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: 'new',
    args: ['--autoplay-policy=no-user-gesture-required'],
  })
  const page = (await browser.pages())[0]
  await page.emulate(device)
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text())
  })

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(600)
  await page.screenshot({ path: `${OUT}/${device.key}-01-lobby.png` })

  report.scrollLobby = await scrollMetrics(page, device.viewport.height)

  // ── Lobby CTA: tap-target + tap latency ──────────────────────────────────
  let btns = await allButtons(page)
  const enterBtn = btns.find((b) => b.text.includes('ENTER THE ASSAY LINE'))
  report.lobbyEnterBtn = enterBtn ? { w: enterBtn.w, h: enterBtn.h, touchAction: enterBtn.touchAction } : null
  report.lobbyEnterLatency = await measureTapLatency(page, enterBtn)
  await wait(500)
  await page.screenshot({ path: `${OUT}/${device.key}-02-planning-empty.png` })

  report.reachedPlanning = (await bodyText(page)).includes('Select')
  const box = await canvasBox(page)
  report.canvasBox = box

  // ── Probe: DRAG-PAINT path (real touch drag across 10 tile centers) ──────
  const dragPts = []
  for (let i = 0; i < 10; i++) dragPts.push(tileCenter(box, 3 + i * 2, 4 + (i % 3) * 2))
  await dragPaint(page, dragPts, 35)
  await wait(300)
  const afterDragOdo = await readOdometer(page)
  const afterDragText = (await bodyText(page)).slice(0, 200).replace(/\n/g, ' | ')
  report.dragPaint = { odometer: afterDragOdo, text: afterDragText }
  await page.screenshot({ path: `${OUT}/${device.key}-03-drag-paint.png` })

  // Clear before the tap-sequence probe.
  btns = await allButtons(page)
  const clearBtn = btns.find((b) => b.text === 'CLEAR')
  if (clearBtn) await page.touchscreen.tap(clearBtn.cx, clearBtn.cy)
  await wait(250)
  report.clearedOdometer = await readOdometer(page)

  // ── Probe: TAP-SEQUENCE fallback (discrete taps, no drag) ────────────────
  const tapPts = []
  for (let i = 0; i < 8; i++) tapPts.push(tileCenter(box, 5 + i * 3, 6 + (i % 4) * 3))
  const tapProgress = []
  for (const p of tapPts) {
    await page.touchscreen.tap(p.x, p.y)
    await wait(90)
    tapProgress.push(await readOdometer(page))
  }
  report.tapSequenceProgress = tapProgress
  await page.screenshot({ path: `${OUT}/${device.key}-04-tap-sequence-8.png` })

  // Toggle-off check: tap the SAME last tile again, verify it decrements.
  const lastPt = tapPts[tapPts.length - 1]
  await page.touchscreen.tap(lastPt.x, lastPt.y)
  await wait(120)
  report.toggleOffOdometer = await readOdometer(page)
  // Re-add it so we're back at 8 for the min-gate + commit tests.
  await page.touchscreen.tap(lastPt.x, lastPt.y)
  await wait(120)
  report.reAddOdometer = await readOdometer(page)

  // ── Probe: min-8 gate — remove tiles down to 4, confirm PLUNGE stays gated
  for (let i = 0; i < 4; i++) {
    const p = tapPts[i]
    await page.touchscreen.tap(p.x, p.y) // toggle OFF (already selected)
    await wait(80)
  }
  const belowMinOdo = await readOdometer(page)
  btns = await allButtons(page)
  const plungeBelowMin = btns.find((b) => b.text.includes('PLUNGE'))
  const belowMinPhaseTextBefore = (await bodyText(page)).slice(0, 160).replace(/\n/g, ' | ')
  if (plungeBelowMin) await page.touchscreen.tap(plungeBelowMin.cx, plungeBelowMin.cy)
  await wait(400)
  const belowMinPhaseTextAfter = (await bodyText(page)).slice(0, 160).replace(/\n/g, ' | ')
  report.minGate = {
    odometer: belowMinOdo,
    plungeDisabledAttr: plungeBelowMin ? plungeBelowMin.disabled : null,
    plungeSize: plungeBelowMin ? { w: plungeBelowMin.w, h: plungeBelowMin.h } : null,
    textBefore: belowMinPhaseTextBefore,
    textAfter: belowMinPhaseTextAfter,
    gateHeld: belowMinPhaseTextBefore === belowMinPhaseTextAfter,
  }
  await page.screenshot({ path: `${OUT}/${device.key}-05-below-min-gate-attempt.png` })

  // Re-add the 4 removed tiles to get back to 8 and commit for real.
  for (let i = 0; i < 4; i++) {
    const p = tapPts[i]
    await page.touchscreen.tap(p.x, p.y)
    await wait(80)
  }
  const armedOdo = await readOdometer(page)
  const armedText = (await bodyText(page)).slice(0, 160).replace(/\n/g, ' | ')

  // ── Zoom / edge-pan probe (before committing — interactive only while planning) ──
  btns = await allButtons(page)
  const zoomBtns = btns.filter((b) => (b.text === '+' || b.text === '−') && parseFloat(b.borderRadius) < 15)
  const wagerBtns = btns.filter((b) => (b.text === '+' || b.text === '−') && parseFloat(b.borderRadius) >= 15)
  report.zoomKnobs = zoomBtns.map((b) => ({ text: b.text, w: b.w, h: b.h, borderRadius: b.borderRadius }))
  report.wagerBrassKnobs = wagerBtns.map((b) => ({ text: b.text, w: b.w, h: b.h, borderRadius: b.borderRadius }))

  const zoomInBtn = zoomBtns.find((b) => b.text === '+')
  if (zoomInBtn) {
    for (let i = 0; i < 3; i++) {
      await page.touchscreen.tap(zoomInBtn.cx, zoomInBtn.cy)
      await wait(120)
    }
  }
  await page.screenshot({ path: `${OUT}/${device.key}-06-zoomed-in.png` })
  btns = await allButtons(page)
  const panBtns = btns.filter((b) => ['◀', '▶', '▲', '▼'].includes(b.text))
  report.panButtonsAppearedAfterZoom = panBtns.map((b) => ({ text: b.text, w: b.w, h: b.h }))

  // Screenshot BEFORE a near-edge drag (to compare against after, for the
  // "does dragging near the canvas edge auto-pan?" check).
  const preDragShot = `${OUT}/${device.key}-07a-pre-edge-drag.png`
  await page.screenshot({ path: preDragShot })
  // Drag from board center toward the right edge and HOLD there (no button taps).
  const edgeDragPts = [
    { x: box.x + box.w * 0.5, y: box.y + box.h * 0.5 },
    { x: box.x + box.w * 0.92, y: box.y + box.h * 0.5 },
    { x: box.x + box.w * 0.98, y: box.y + box.h * 0.5 },
  ]
  const edgeTouch = await page.touchscreen.touchStart(edgeDragPts[0].x, edgeDragPts[0].y)
  await wait(60)
  await edgeTouch.move(edgeDragPts[1].x, edgeDragPts[1].y)
  await wait(60)
  await edgeTouch.move(edgeDragPts[2].x, edgeDragPts[2].y)
  // HOLD at the edge for 900ms without further movement, to see if a
  // creep-style auto-pan kicks in purely from dwell time near the edge.
  await wait(900)
  await edgeTouch.end()
  const postDragShot = `${OUT}/${device.key}-07b-post-edge-hold.png`
  await page.screenshot({ path: postDragShot })
  report.edgePanProbe = { preDragShot, postDragShot, note: 'compare screenshots for pan/scroll movement during the 900ms edge-hold' }

  // Reset zoom back to 1 and pan to origin for a clean commit state, then
  // re-verify the trail is still intact (zoom/pan must not mutate selection).
  const zoomOutBtn = zoomBtns.find((b) => b.text === '−')
  btns = await allButtons(page)
  const zoomOutLive = btns.find((b) => b.text === '−' && parseFloat(b.borderRadius) < 15)
  if (zoomOutLive) {
    for (let i = 0; i < 6; i++) {
      await page.touchscreen.tap(zoomOutLive.cx, zoomOutLive.cy)
      await wait(80)
    }
  }
  const trailIntactOdo = await readOdometer(page)

  // ── Thumb-zone check for PLUNGE (planning phase, armed) ───────────────────
  btns = await allButtons(page)
  const plungeArmed = btns.find((b) => b.text.includes('PLUNGE'))
  const plungeCenterPct = plungeArmed ? (plungeArmed.cy / device.viewport.height) * 100 : null
  report.plungeThumbZone = plungeArmed
    ? { w: plungeArmed.w, h: plungeArmed.h, cy: plungeArmed.cy, pctFromTop: Math.round(plungeCenterPct * 10) / 10, inThumbZone: plungeCenterPct >= 30 && plungeCenterPct <= 90 }
    : null
  report.plungeTapLatency = await measureTapLatency(page, plungeArmed)

  report.preCommit = { armedOdometer: armedOdo, armedText, trailIntactAfterZoomOdo: trailIntactOdo }
  await page.screenshot({ path: `${OUT}/${device.key}-08-armed-ready.png` })

  // ── Commit via real touch tap (one-shot, no undo) ─────────────────────────
  btns = await allButtons(page)
  const plungeFinal = btns.find((b) => b.text.includes('PLUNGE'))
  if (plungeFinal && !plungeFinal.disabled) {
    await page.touchscreen.tap(plungeFinal.cx, plungeFinal.cy)
  }
  await wait(400)
  await page.screenshot({ path: `${OUT}/${device.key}-09-assaying.png` })
  report.assayingText = (await bodyText(page)).slice(0, 200).replace(/\n/g, ' | ')

  await wait(2500)
  const settledText = (await bodyText(page)).replace(/\n/g, ' | ')
  report.settledText = settledText.slice(0, 300)
  report.hasOutcome = /CLAIM PROVEN|BAD VEIN — BUSTED/.test(settledText)
  await page.screenshot({ path: `${OUT}/${device.key}-10-settled.png` })

  // ── Settled controls: ASSAY AGAIN + CLOSE tap-target measurement ─────────
  btns = await allButtons(page)
  const assayAgainBtn = btns.find((b) => b.text.includes('ASSAY AGAIN'))
  const closeBtn = btns.find((b) => b.text === 'CLOSE')
  report.settledControls = {
    assayAgain: assayAgainBtn ? { w: assayAgainBtn.w, h: assayAgainBtn.h, cy: assayAgainBtn.cy, pctFromTop: Math.round((assayAgainBtn.cy / device.viewport.height) * 1000) / 10 } : null,
    close: closeBtn ? { w: closeBtn.w, h: closeBtn.h } : null,
  }
  report.assayAgainTapLatency = await measureTapLatency(page, assayAgainBtn)

  // Overlap / horizontal-scroll check at settled state (tallest content state).
  report.scrollSettled = await scrollMetrics(page, device.viewport.height)

  report.errors = errors
  await browser.close()
  return report
}

const results = {}
for (const device of DEVICES) {
  console.log(`\n=== Running ${device.name} ===`)
  results[device.key] = await runViewport(device)
}
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(results, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2))
console.log(JSON.stringify(results, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2))
