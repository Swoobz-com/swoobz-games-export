// FRESH, independent mobile-touch re-verification of CRIT #1 (RUN THE LINE
// below-the-fold) + the IntroCoachmark pass-through claim, for
// swoobz-mobile-touch-qa's own holdgate. Deliberately NOT a reuse of
// assay-run/indep-mobile-verify.mjs or any of the maker's own harnesses —
// written from scratch against the live dev server, using REAL
// coordinate-based touchscreen taps (never element.click()/.evaluate()
// synthetic dispatch) so hit-testing (pointer-events, z-order, overlap) is
// actually exercised, not bypassed.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
// NOTE (2026-07-04, this run): the task brief's claimed port (5175) is NOT
// The Assay Line — curl/puppeteer confirmed 5175 serves an unrelated
// landscape-only Phaser game ("Lucky Derby"). The live Assay Line standalone
// runner (`<title>The Assay Line — standalone runner</title>`) was found on
// port 6303 via `netstat -ano | grep LISTENING` + curl title-probe. Always
// pass the confirmed port as argv[2]; do not trust a claimed port blind.
const URL = process.argv[2] || 'http://localhost:6303/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-FINAL-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const DEVICES = [
  { name: 'pixel7', width: 412, height: 915 },
  { name: 'iphone14pro', width: 393, height: 852 },
]

const COACHMARK_KEY = 'assay_coachmark_seen_v1'

// ---- DOM probes (read-only; do not synthesize input here) -----------------
const findButtonByText = (page, txt) =>
  page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)

const boxCenter = async (handle) => {
  const el = handle.asElement()
  if (!el) return null
  return el.evaluate((e) => {
    const r = e.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }
  })
}

// Real coordinate tap + return what the browser's OWN hit-test resolves to,
// both BEFORE and AFTER, so a pointer-events:none pass-through claim is
// falsifiable rather than assumed from source reading alone.
const tapAndHitTest = async (page, x, y) => {
  const before = await page.evaluate(
    (px, py) => {
      const el = document.elementFromPoint(px, py)
      return el ? { tag: el.tagName, aria: el.getAttribute('aria-label'), cls: el.className?.toString().slice(0, 60) } : null
    },
    x,
    y,
  )
  await page.touchscreen.tap(x, y)
  await wait(80)
  const after = await page.evaluate(
    (px, py) => {
      const el = document.elementFromPoint(px, py)
      return el ? { tag: el.tagName, aria: el.getAttribute('aria-label'), cls: el.className?.toString().slice(0, 60) } : null
    },
    x,
    y,
  )
  return { before, after }
}

const readPhaseSignal = (page) =>
  page.evaluate(() => {
    const bodyText = document.body.innerText
    return {
      showsLineRunning: bodyText.includes('Line running'),
      showsCrackedBox: bodyText.includes('CRACKED BOX'),
      showsPlanningPrompt: bodyText.includes('to arm the key') || bodyText.includes('Deposit line armed'),
      showsSettledCert: !!document.body.innerText.match(/SETTLED|CERTIFICATE|Glass Box|PROVEN|ASSAY AGAIN/i),
      showsAssayAgainBtn: [...document.querySelectorAll('button')].some((b) => b.textContent?.includes('ASSAY AGAIN')),
      runBtnText: (() => {
        const b = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label')?.includes('Run the line'))
        return b ? b.textContent : null
      })(),
    }
  })

const measureRects = (page) =>
  page.evaluate(() => {
    const findBtn = (txt) => [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(txt)) || null
    const run = findBtn('RUN THE LINE') || findBtn('LINE RUNNING')
    const coachmark = document.querySelector('[aria-label="How to play"]')
    const canvas = document.querySelector('canvas')
    const rectOf = (el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }
    }
    return {
      scrollY: window.scrollY,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      run: rectOf(run),
      coachmark: rectOf(coachmark),
      canvas: rectOf(canvas),
    }
  })

async function newPage(dev, consoleErrors) {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: 'new',
    args: ['--autoplay-policy=no-user-gesture-required'],
  })
  const page = (await browser.pages())[0]
  await page.emulate({
    viewport: { width: dev.width, height: dev.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },
  })
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(String(err)))
  return { browser, page }
}

async function enterFreshPlanning(page) {
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await page.evaluate((k) => window.localStorage.removeItem(k), COACHMARK_KEY)
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(500)
  const lobbyBtn = await findButtonByText(page, 'ENTER THE ASSAY LINE')
  const lobbyBox = await boxCenter(lobbyBtn)
  if (!lobbyBox) throw new Error('ENTER THE ASSAY LINE button not found')
  await page.touchscreen.tap(lobbyBox.x, lobbyBox.y)
  await wait(600)
}

// ── SESSION 1: coachmark pass-through probe, in total isolation from the
// CRIT#1 board-paint flow below (a real tap that lands on the canvas here
// DOES mutate trail state as a side effect of proving pass-through — that
// mutation must never leak into the separate clean-paint session, which is
// exactly the cross-contamination bug this rewrite fixes: v1 of this script
// ran both in ONE session and the coachmark-overlap probe tap silently
// toggled a tile that the later 8-tile paint loop also targeted, net
// cancelling it out to 7/8 and leaving RUN THE LINE falsely-disabled on
// iPhone 14 Pro — a self-inflicted test artifact, not a game bug.
async function coachmarkSession(dev, result) {
  const consoleErrors = []
  const { browser, page } = await newPage(dev, consoleErrors)
  try {
    await enterFreshPlanning(page)
    const planningRects0 = await measureRects(page)
    result.planningOnEntry = planningRects0
    await page.screenshot({ path: `${OUT}/${dev.name}-01-planning-fresh-coachmark.png` })

    // Text-zone point: inside the coachmark's visual footprint, away from
    // its own dismiss (X) button, and NOT over the canvas (pure page
    // background underneath) — proves the wrapper itself never intercepts.
    let coachmarkPassThrough = null
    if (planningRects0.coachmark) {
      const cm = planningRects0.coachmark
      const textPointX = cm.left + Math.min(30, cm.width * 0.25)
      const textPointY = cm.top + cm.height / 2
      const hit = await tapAndHitTest(page, textPointX, textPointY)
      coachmarkPassThrough = { point: { x: textPointX, y: textPointY }, ...hit }
    }
    result.coachmarkTextZonePassThrough = coachmarkPassThrough

    // Dismiss (X) button: pointerEvents:'auto' restored there — a tap must
    // resolve TO the button itself, not pass through it.
    const dismissHandle = await page.evaluateHandle(() =>
      document.querySelector('button[aria-label="Dismiss how-to-play tip"]'),
    )
    const dismissBox = await boxCenter(dismissHandle)
    result.dismissButtonFound = !!dismissBox
    result.dismissButtonBox = dismissBox
    if (dismissBox) {
      const dismissHit = await page.evaluate(
        (px, py) => {
          const el = document.elementFromPoint(px, py)
          return el ? { tag: el.tagName, aria: el.getAttribute('aria-label') } : null
        },
        dismissBox.x,
        dismissBox.y,
      )
      result.dismissButtonElementFromPoint = dismissHit
    }

    // Board-overlap point: the ACTUAL visible clipped scroll-viewport rect
    // (`scrollRef`, overflow:auto) intersected with the coachmark rect — NOT
    // the raw <canvas> DOM rect, which reports the full un-clipped board
    // (460x460, wider than the viewport on mobile pan-only mode) and gives a
    // false "overlap" outside what a finger can actually reach on screen.
    const viewportRect = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      const scrollport = canvas ? canvas.parentElement : null // scrollRef div, overflow:auto, direct parent of <canvas>
      if (!scrollport) return null
      const r = scrollport.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }
    })
    result.scrollportRect = viewportRect

    let boardOverlapCheck = null
    if (planningRects0.coachmark && viewportRect) {
      const cm = planningRects0.coachmark
      const cv = viewportRect
      const overlapLeft = Math.max(cm.left, cv.left)
      const overlapRight = Math.min(cm.right, cv.right)
      const overlapTop = Math.max(cm.top, cv.top)
      const overlapBottom = Math.min(cm.bottom, cv.bottom)
      const overlaps = overlapLeft < overlapRight && overlapTop < overlapBottom
      if (overlaps) {
        const px = (overlapLeft + overlapRight) / 2
        const py = (overlapTop + overlapBottom) / 2
        // GOTCHA (found live, this run): the JSX status copy read from
        // source ("Select N more box... to arm the key") does NOT actually
        // appear in this build's rendered DOM at all (grepped/confirmed via
        // a raw innerText dump) — it must render only on a desktop/isWide
        // branch not present at this viewport. The one number that DOES
        // reliably reflect trail length at every viewport is the `Odometer`
        // readout under the "LINE" rail row (rendered "00".."08" etc,
        // followed by "/ 8 min"). Use THAT, not source-assumed copy.
        const readLineCount = () =>
          page.evaluate(() => {
            const m = document.body.innerText.match(/LINE\s*\n?\s*0?(\d+)\s*\n?\s*\/\s*8 min/i)
            return m ? Number(m[1]) : null
          })
        const beforeCount = await readLineCount()
        const hit = await tapAndHitTest(page, px, py)
        await wait(120)
        const afterCount = await readLineCount()
        boardOverlapCheck = {
          overlaps: true,
          point: { x: px, y: py },
          coachmarkRect: cm,
          scrollportRect: cv,
          elementFromPointBefore: hit.before,
          elementFromPointAfter: hit.after,
          lineCountBefore: beforeCount,
          lineCountAfter: afterCount,
          // Real proof the tap reached the board through the coachmark's
          // visual footprint: the LINE odometer count must have moved
          // (a toggle-on increments it, a toggle-off on an already-selected
          // tile decrements it — either way it must CHANGE, not stay put).
          tileRegistered: beforeCount !== null && afterCount !== null && afterCount !== beforeCount,
        }
      } else {
        boardOverlapCheck = { overlaps: false, coachmarkRect: cm, scrollportRect: cv }
      }
    }
    result.coachmarkBoardOverlapCheck = boardOverlapCheck
    await page.screenshot({ path: `${OUT}/${dev.name}-01b-coachmark-overlap-probed.png` })
  } catch (err) {
    result.coachmarkSessionError = String(err && err.stack ? err.stack : err)
  } finally {
    await browser.close()
  }
  result.consoleErrorsCoachmarkSession = consoleErrors
}

// ── SESSION 2: clean CRIT#1 flow — fresh reload, coachmark left UNDISMISSED
// (worst case: still visually covering the top ~2 rows) and the standard
// 8-tile paint done as a normal player would, immediately, with NO
// exploratory taps beforehand — so if the coachmark silently ate any of the
// top-row taps, the trail count will fall short and RUN THE LINE will stay
// disabled, exactly the regression this is re-checking for.
async function critFlowSession(dev, result) {
  const consoleErrors = []
  const { browser, page } = await newPage(dev, consoleErrors)
  try {
    await enterFreshPlanning(page)
    const preP = await measureRects(page)
    result.coachmarkPresentDuringPaint = !!preP.coachmark

    // GOTCHA (found live, this run): the mobile pan-viewport board
    // auto-scrolls to a non-zero, non-fully-centered offset by default
    // (empirically scrollTop=scrollLeft=50px on a 460x460 canvas inside a
    // 220x220 clipped scrollport — NOT (0,0) and NOT the fully-centered
    // (dims-viewport)/2=120px either). `canvas.getBoundingClientRect()`
    // reports the FULL unclipped 460x460 element regardless of that scroll
    // offset or of the parent's `overflow:auto` clipping, so computing tap
    // coordinates from the raw canvas rect WITHOUT first resetting scroll
    // put several of the intended top-row taps outside the ACTUALLY VISIBLE
    // clipped window — they landed on nothing (or on the page background
    // outside the board), not on a real tile, silently under-registering
    // the trail (this run's own v1 attempt got a false "3/8" from exactly
    // this mistake, not from any real coachmark interception — confirmed by
    // taking canvas+scrollport geometry before/after an explicit reset).
    // A real player could of course leave the board un-panned too, but the
    // deterministic, reproducible repro for CRIT#1 needs a KNOWN tile grid,
    // so reset scroll to the true origin first — this is an orthogonal
    // action to "coachmark dismissed", so the coachmark stays live for the
    // paint loop below either way.
    await page.evaluate(() => {
      const c = document.querySelector('canvas')
      const sp = c ? c.parentElement : null
      if (sp) {
        sp.scrollLeft = 0
        sp.scrollTop = 0
      }
    })
    await wait(100)
    const canvasGeo = await page.evaluate(() => {
      const c = document.querySelector('canvas')
      const r = c.getBoundingClientRect()
      return { left: r.left, top: r.top, width: r.width, height: r.height }
    })
    result.canvasGeoAfterScrollReset = canvasGeo
    // Re-measure the coachmark's overlap against this NOW-deterministic
    // canvas position (top-left tile block) so the report states exactly
    // how many top-row pixels of the real paint target sit under the
    // coachmark's visual footprint at the moment these taps fire.
    const coachAtPaintTime = preP.coachmark
    result.coachmarkOverlapAtPaintTimePx = coachAtPaintTime
      ? Math.max(0, Math.round(coachAtPaintTime.bottom - canvasGeo.top))
      : 0
    const TILE_PX = 46 // MOBILE_TILE_PX, AssayGridCanvas.tsx
    const paintedTiles = []
    for (let i = 0; i < 8; i++) {
      const col = i % 4
      const row = Math.floor(i / 4)
      const tx = canvasGeo.left + col * TILE_PX + TILE_PX / 2
      const ty = canvasGeo.top + row * TILE_PX + TILE_PX / 2
      await page.touchscreen.tap(tx, ty)
      paintedTiles.push({ x: tx, y: ty })
      await wait(70)
    }
    await wait(200)
    result.tileHitTargetPx = TILE_PX
    result.paintedTileCoordsRelativeToCoachmark = paintedTiles

    // Confirm all 8 taps registered DESPITE the coachmark's presence (this
    // is the real, end-to-end proof the pass-through works for gameplay,
    // not just for the isolated hit-test probe above).
    const armedCheck = await page.evaluate(() => ({
      armed: document.body.innerText.includes('Deposit line armed'),
      lineCount: document.body.innerText.match(/LINE\s*\n?\s*0?(\d+)\s*\n?\s*\/\s*8 min/i)?.[1] ?? null,
      remainingBoxesText: document.body.innerText.match(/Select \d+ more box(?:es)? to arm the key/)?.[0] ?? null,
    }))
    result.allEightTapsRegisteredDespiteCoachmark = armedCheck

    // === CRIT #1: fold measurement, scrollY must be 0, no manual scroll ===
    const armedRects = await measureRects(page)
    result.armedRects = armedRects
    await page.screenshot({ path: `${OUT}/${dev.name}-02-planning-armed-8boxes.png` })

    const runRect = armedRects.run
    const foldCheck = runRect
      ? {
          found: true,
          top: runRect.top,
          bottom: runRect.bottom,
          innerHeight: armedRects.innerHeight,
          scrollY: armedRects.scrollY,
          fullyOnScreen: runRect.top >= 0 && runRect.bottom <= armedRects.innerHeight,
          overflowPastFoldPx: runRect.bottom > armedRects.innerHeight ? Math.round(runRect.bottom - armedRects.innerHeight) : 0,
        }
      : { found: false }
    result.crit1FoldCheck = foldCheck
    result.boardBox = armedRects.canvas

    // === REAL TAP ON RUN THE LINE — verify phase state transition ========
    const beforePhaseSignal = await readPhaseSignal(page)
    result.beforeTapPhaseSignal = beforePhaseSignal
    const runHandle = await findButtonByText(page, 'RUN THE LINE')
    const runBox = await boxCenter(runHandle)
    result.runButtonBoxForTap = runBox
    const runBtnDisabled = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label')?.includes('Run the line'))
      return b ? b.disabled : null
    })
    result.runButtonDisabledBeforeTap = runBtnDisabled
    if (runBox) {
      await page.touchscreen.tap(runBox.x, runBox.y)
    }
    let transitioned = false
    let afterPhaseSignal = null
    for (const delay of [50, 150, 300, 600, 1000, 1500, 2000]) {
      await wait(delay)
      afterPhaseSignal = await readPhaseSignal(page)
      if (afterPhaseSignal.showsLineRunning || afterPhaseSignal.showsCrackedBox || afterPhaseSignal.showsSettledCert) {
        transitioned = true
        break
      }
    }
    result.afterTapPhaseSignal = afterPhaseSignal
    result.phaseTransitioned = transitioned
    await page.screenshot({ path: `${OUT}/${dev.name}-03-after-run-the-line-tap.png` })

    await wait(2500)
    result.finalPhaseSignal = await readPhaseSignal(page)
    await page.screenshot({ path: `${OUT}/${dev.name}-04-settled.png`, fullPage: true })
  } catch (err) {
    result.critFlowSessionError = String(err && err.stack ? err.stack : err)
  } finally {
    await browser.close()
  }
  result.consoleErrorsCritFlowSession = consoleErrors
}

async function run(dev) {
  const result = { device: dev.name, viewport: dev }
  await coachmarkSession(dev, result)
  await critFlowSession(dev, result)
  return result
}

const all = {}
for (const dev of DEVICES) {
  console.log('===', dev.name, '===')
  all[dev.name] = await run(dev)
  console.log(JSON.stringify(all[dev.name], null, 2))
}
fs.writeFileSync(`${OUT}/mobile-touch-qa-report.json`, JSON.stringify(all, null, 2))
console.log('DONE. Report written to', `${OUT}/mobile-touch-qa-report.json`)
