// Diagnostic: does tapping an off-viewport (below-the-fold) coordinate via
// page.touchscreen.tap() actually register a click on that element, or does
// it silently miss (the realistic mobile scenario — a finger cannot touch
// pixels that are not rendered on screen)? Compares (A) a raw off-screen tap
// vs (B) a real native page-scroll (touch swipe on a neutral area outside the
// canvas's own pan-x/pan-y region) followed by an on-screen tap.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-mobiletouch-0704'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const tapText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  const box = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
  await page.touchscreen.tap(box.x, box.y)
  return true
}

async function touchDrag(page, cx, cy, dx, dy, steps = 14, stepWaitMs = 16) {
  const touch = await page.touchscreen.touchStart(cx, cy)
  for (let i = 1; i <= steps; i++) {
    await touch.move(cx + (dx * i) / steps, cy + (dy * i) / steps)
    await wait(stepWaitMs)
  }
  await touch.end()
  await wait(250)
}

const breakerInfo = (page) => page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('THROW BREAKER'))
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { top: r.top, bottom: r.bottom, visibleInViewport: r.top >= 0 && r.bottom <= window.innerHeight, x: r.x + r.width / 2, y: r.y + r.height / 2, disabled: b.disabled }
})

const trailLen = (page) => page.evaluate(() => {
  const spans = [...document.querySelectorAll('span')]
  const el = spans.find((s) => /^\d{1,2}$/.test((s.textContent || '').trim()) && s.nextElementSibling && /min/.test(s.nextElementSibling.textContent || ''))
  return el ? parseInt(el.textContent, 10) : null
})

async function main() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
  const page = (await browser.pages())[0]
  await page.emulate({ viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)
  await tapText(page, 'ENTER THE ASSAY LINE')
  await wait(400)

  // Select 8 tiles (min trail) using columns/rows confirmed inside the
  // INITIALLY-CENTERED visible window (scrollLeft/Top ~50, viewport 364px,
  // tile 46px -> columns/rows 1-9 are on-screen with zero panning) — avoids
  // the exact off-viewport-coordinate trap this diagnostic is probing for.
  const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const cr = c.getBoundingClientRect(); return { left: cr.left, top: cr.top } })
  const TILE = 46
  for (let i = 0; i < 8; i++) {
    const col = 2 + (i % 4), row = 2 + Math.floor(i / 4)
    await page.touchscreen.tap(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2)
    await wait(60)
  }
  const trailBeforeAttempt = await trailLen(page)
  console.log('trailBeforeAttempt (expect 8):', trailBeforeAttempt)

  const infoBefore = await breakerInfo(page)
  console.log('BREAKER before any scroll:', infoBefore)

  // ── ATTEMPT A: raw off-viewport tap (what a naive script — or a coordinate
  //    computed without checking visibility — would do). ──────────────────
  // NOTE: phase detection uses CLEAR+PACE button presence (unambiguous —
  // only rendered while phase.kind==='planning', see AssayExperience.tsx
  // ~L829-841), NOT a body-text regex — an earlier pass of this same script
  // used `/BAD VEIN/i` which FALSE-POSITIVE-MATCHED the ALWAYS-PRESENT,
  // phase-independent "N bad veins" VAULT FLOOR tier-description copy
  // (e.g. "8 bad veins" on the Flooded Floor row), silently fabricating a
  // BUST outcome even when the round never actually plunged.
  await page.touchscreen.tap(infoBefore.x, infoBefore.y)
  await wait(1200)
  const stillPlanningA = await page.evaluate(() => {
    const hasClear = [...document.querySelectorAll('button')].some((b) => b.textContent && b.textContent.trim() === 'CLEAR')
    const hasPace = [...document.querySelectorAll('button')].some((b) => b.textContent && b.textContent.includes('PACE:'))
    return hasClear && hasPace
  })
  const stillPlanning = stillPlanningA
  console.log('ATTEMPT A (raw off-viewport tap) — still in planning phase after tap (CLEAR+PACE buttons still present)?', stillPlanning)
  await page.screenshot({ path: `${OUT}/pixel7-BREAKERCHECK-A-after-offscreen-tap.png` })

  if (stillPlanning) {
    // ── ATTEMPT B: a REAL native page-scroll (touch swipe) on a neutral area
    //    (the VAULT FLOOR header text, well outside the canvas's own
    //    touchAction:'pan-x pan-y' region) to bring BREAKER into view, THEN tap. ──
    const vaultFloorHeaderPt = await page.evaluate(() => {
      const el = [...document.querySelectorAll('div')].find((d) => d.textContent.trim() === 'VAULT FLOOR')
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    })
    // Swipe up repeatedly until BREAKER is visible or we give up.
    let visible = false
    let swipes = 0
    for (let i = 0; i < 6 && !visible; i++) {
      await touchDrag(page, vaultFloorHeaderPt.x, vaultFloorHeaderPt.y, 0, -500, 16, 14)
      swipes++
      const info = await breakerInfo(page)
      visible = info.visibleInViewport
      console.log('swipe', swipes, 'breaker info', info)
    }
    await page.screenshot({ path: `${OUT}/pixel7-BREAKERCHECK-B-after-native-page-scroll.png` })
    const infoAfterScroll = await breakerInfo(page)
    console.log('BREAKER after native page-scroll swipes:', infoAfterScroll, 'swipesNeeded', swipes)

    if (infoAfterScroll.visibleInViewport) {
      await page.touchscreen.tap(infoAfterScroll.x, infoAfterScroll.y)
      await wait(3000)
      // Robust outcome check: CLAIM PROVEN / BUSTED are settle-only headline
      // strings (Glass Box), not phase-independent tier copy — safe as-is.
      // Also cross-check via CLEAR/PACE absence (planning UI retires on settle).
      const bodyAfterRealTap = await page.evaluate(() => document.body.innerText)
      const stillHasPlanningButtons = await page.evaluate(() => {
        const hasClear = [...document.querySelectorAll('button')].some((b) => b.textContent && b.textContent.trim() === 'CLEAR')
        const hasPace = [...document.querySelectorAll('button')].some((b) => b.textContent && b.textContent.includes('PACE:'))
        return hasClear && hasPace
      })
      const outcome = /CLAIM PROVEN/i.test(bodyAfterRealTap) ? 'WIN' : /BUSTED/i.test(bodyAfterRealTap) ? 'BUST' : stillHasPlanningButtons ? 'UNKNOWN(still PLANNING - tap did not fire)' : 'UNKNOWN(left planning but no WIN/BUST headline matched)'
      console.log('ATTEMPT B (on-screen tap after real page-scroll) — outcome:', outcome, '| stillHasPlanningButtons:', stillHasPlanningButtons)
      await page.screenshot({ path: `${OUT}/pixel7-BREAKERCHECK-C-after-real-tap-onscreen.png` })
      await wait(1500)
      await page.screenshot({ path: `${OUT}/pixel7-BREAKERCHECK-D-settled.png` })
    } else {
      console.log('FAILED TO BRING BREAKER INTO VIEW VIA NATIVE PAGE SCROLL AFTER', swipes, 'SWIPES')
    }
  }

  await browser.close()
}
main()
