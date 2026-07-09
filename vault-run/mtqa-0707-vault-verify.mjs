// mtqa-0707-vault-verify.mjs
// Independent mobile-touch-qa verification of FIX #2 (HUD/board overlap),
// FIX #3 (settled BET AGAIN below fold), FIX #6 (BetConsole touch targets)
// for RUG OR RICHES (vault), live at http://localhost:5312/.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5312'
const OUT = 'shots-mtqa-0707-vault'
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const DEVICES = [
  { name: 'Pixel7', width: 412, height: 915, dpr: 2.625, isChrome: true },
  { name: 'iPhone14Pro', width: 393, height: 852, dpr: 3, isChrome: false },
]

// Estimated real browser-chrome inset (CSS px) consumed on FIRST load / before
// any user scroll, i.e. the actual VISUAL viewport a player sees, smaller
// than the raw layout viewport headless emulation reports. Chrome Android:
// address bar ~56px (Material app-bar height spec). Safari iOS: URL bar +
// bottom tab bar together ~ 100px combined when both are shown (pre-scroll
// / pre-auto-hide state). Documented assumption — see run notes.
const CHROME_INSET = { Pixel7: 56, iPhone14Pro: 100 }

const WORLDS = [
  { key: 'bluechips', label: 'BLUECHIPS', gridSize: 5 },
  { key: 'shitcoin', label: 'SHITCOIN', gridSize: 7 },
]

// Exact replica of VaultGridCanvas.tsx's computeGridLayout (minimalBands=true
// branch only — that's the branch live for playing/settled on mobile since
// domHudActive={isWide || bottomBarPhase}).
function computeGridLayout(W, H, gridSize, minimalBands) {
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

async function clickText(page, t, exact = false) {
  const h = await page.evaluateHandle(
    (t, exact) => {
      const els = [...document.querySelectorAll('button,[role=button],a')]
      const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
      return (
        els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === t.toLowerCase()) ||
        (!exact && els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(t.toLowerCase())))
      )
    },
    t,
    exact,
  )
  const el = h.asElement()
  if (!el) return false
  const box = await el.boundingBox()
  if (!box) return false
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  return true
}

async function findByAriaPrefix(page, prefix) {
  return page.evaluateHandle((prefix) => {
    const els = [...document.querySelectorAll('button[aria-label]')]
    return els.find((e) => (e.getAttribute('aria-label') || '').toLowerCase().startsWith(prefix.toLowerCase()) && e.offsetParent !== null && !e.disabled)
  }, prefix)
}

async function tapHandle(page, handle) {
  const el = handle.asElement()
  if (!el) return false
  const box = await el.boundingBox()
  if (!box) return false
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  return true
}

async function getPhaseText(page) {
  return page.evaluate(() => {
    const t = document.body.innerText || ''
    if (/RUGGED|BUST/i.test(t) && /SETTLED|BET AGAIN/i.test(t)) return 'settled-loss'
    return null
  })
}

async function settledInfo(page) {
  return page.evaluate(() => {
    // Mobile's settled BET AGAIN button has NO data-testid of its own (that
    // testid only exists on the DESKTOP-only gutter card `SettledNextBetCard`
    // — confirmed via source read, VaultExperience.tsx:3250/3518, isWide-only
    // call site). Mobile's real button (Settlement()'s own `nextTier`, inside
    // `[data-testid="vault-settledpanel"]`) is selected by its aria-label
    // prefix "Bet again," (comma distinguishes it from the sibling "Bet again
    // with the same trail pattern," preset button) — see VaultExperience.tsx
    // ~L2344-2353.
    const panel = document.querySelector('[data-testid="vault-settledpanel"]')
    const betAgain = panel
      ? [...panel.querySelectorAll('button[aria-label]')].find((b) => (b.getAttribute('aria-label') || '').toLowerCase().startsWith('bet again,'))
      : null
    const t = document.body.innerText || ''
    let won = null
    if (/RUGGED|BUST/i.test(t)) won = false
    if (/SECURED THE BAG/i.test(t)) won = true
    let betAgainRect = null
    if (betAgain) {
      const r = betAgain.getBoundingClientRect()
      betAgainRect = { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }
    }
    return { settled: !!panel, won, betAgainRect }
  })
}

async function measureHudGap(page, gridSize) {
  return page.evaluate(
    ({ gridSize }) => {
      const hud = document.querySelector('[data-testid="vault-mobile-hud-band"]')
      const shell = document.querySelector('[data-testid="vault-canvas-shell"]')
      const canvas = shell ? shell.querySelector('canvas') : null
      if (!hud || !canvas) return null
      const hudRect = hud.getBoundingClientRect()
      const canvasRect = canvas.getBoundingClientRect()
      return {
        hudTop: hudRect.top,
        hudBottom: hudRect.bottom,
        hudHeight: hudRect.height,
        canvasTop: canvasRect.top,
        canvasW: canvasRect.width,
        canvasH: canvasRect.height,
      }
    },
    { gridSize },
  )
}

async function forceRound(page, canvasSelectorInfo, gridSize, outcome, maxTaps) {
  // canvasSelectorInfo: {x,y,w,h} of canvas bounding box (fresh read each tap)
  for (let i = 0; i < maxTaps; i++) {
    const canvasBox = await page.evaluate(() => {
      const c = document.querySelector('[data-testid="vault-canvas-shell"] canvas')
      if (!c) return null
      const r = c.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    })
    if (!canvasBox) return { ok: false, reason: 'no-canvas' }
    const grid = computeGridLayout(canvasBox.w, canvasBox.h, gridSize, true)
    const col = i % gridSize
    const row = Math.floor(i / gridSize) % gridSize
    const cx = canvasBox.x + grid.x + col * (grid.tile + grid.gap) + grid.tile / 2
    const cy = canvasBox.y + grid.y + row * (grid.tile + grid.gap) + grid.tile / 2
    await page.touchscreen.tap(cx, cy)
    await wait(650)
    const info = await settledInfo(page)
    if (info.settled) return { ok: true, taps: i + 1, won: info.won }
    if (outcome === 'win') {
      // reveal exactly one tile then take profit
      const canCashOutBtn = await findByAriaPrefix(page, 'Take profit')
      const el = canCashOutBtn.asElement()
      if (el) {
        await tapHandle(page, canCashOutBtn)
        await wait(900)
        const info2 = await settledInfo(page)
        if (info2.settled) return { ok: true, taps: i + 1, won: info2.won }
      }
    }
  }
  return { ok: false, reason: 'exhausted' }
}

async function measureTouchTargets(page) {
  return page.evaluate(() => {
    const results = []
    const panel = document.querySelector('[data-testid="bet-console"]')
    if (!panel) return { error: 'no bet-console' }
    const targets = [
      { label: 'stepper-decrease', el: panel.querySelector('button[aria-label="Decrease bet"]') },
      { label: 'stepper-increase', el: panel.querySelector('button[aria-label="Increase bet"]') },
      { label: 'commit (SEND IT)', el: [...panel.querySelectorAll('button')].find((b) => (b.textContent || '').includes('SEND IT')) },
      { label: 'options-pill (AUTO-EXIT)', el: [...panel.querySelectorAll('button')].find((b) => (b.textContent || '').includes('AUTO-EXIT')) },
    ]
    const chips = [...panel.querySelectorAll('button')].filter((b) => /^\d+$/.test((b.textContent || '').trim()))
    chips.forEach((c, idx) => targets.push({ label: `chip-${idx}(${(c.textContent || '').trim()})`, el: c }))
    for (const t of targets) {
      if (!t.el) {
        results.push({ label: t.label, found: false })
        continue
      }
      const rect = t.el.getBoundingClientRect()
      const cs = getComputedStyle(t.el)
      results.push({
        label: t.label,
        found: true,
        width: rect.width,
        height: rect.height,
        touchAction: cs.touchAction,
        disabled: t.el.disabled,
      })
    }
    return { results }
  })
}

async function readWagerText(page) {
  return page.evaluate(() => {
    const btn = document.querySelector('[data-testid="bet-console"] button[aria-label="Decrease bet"]')
    if (!btn) return null
    const wagerWindow = btn.parentElement
    if (!wagerWindow) return null
    const valueEl = [...wagerWindow.children].find((c) => c !== btn && c.tagName !== 'BUTTON')
    return valueEl ? valueEl.textContent : null
  })
}

async function tapEdgesOfStepper(page, label, ariaLabel) {
  // hit-test near the edges of the (invisible) 44x44 hit button, not just center
  const rect = await page.evaluate((ariaLabel) => {
    const el = document.querySelector(`[data-testid="bet-console"] button[aria-label="${ariaLabel}"]`)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  }, ariaLabel)
  if (!rect) return { ok: false }
  const before = await readWagerText(page)
  // tap near an EDGE (3px inset from corner) of the 44x44 box
  const ex = rect.x + 3
  const ey = rect.y + 3
  await page.touchscreen.tap(ex, ey)
  await wait(150)
  const after = await readWagerText(page)
  return { ok: true, before, after, changed: before !== after, rect }
}

async function consoleErrorsSetup(page, bucket) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') bucket.push(msg.text())
  })
  page.on('pageerror', (err) => bucket.push(String(err)))
}

async function dismissOnboarding(page) {
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {}
  })
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox'],
  })
  const results = { touchTargets: {}, hudGap: [], betAgainFold: [], regressions: [], consoleErrors: {} }

  for (const dev of DEVICES) {
    const page = await browser.newPage()
    const errs = []
    await consoleErrorsSetup(page, errs)
    await page.setViewport({ width: dev.width, height: dev.height, isMobile: true, hasTouch: true, deviceScaleFactor: dev.dpr })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await dismissOnboarding(page)
    await page.reload({ waitUntil: 'networkidle0' })
    await wait(600)
    // dismiss onboarding overlay by tap if present
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')]
      const skip = btns.find((b) => /skip|got it|close|start/i.test(b.textContent || ''))
      if (skip) skip.click()
    })
    await wait(300)

    // ── FIX #6: BetConsole touch targets at bet-entry ─────────────────────
    const tt = await measureTouchTargets(page)
    results.touchTargets[dev.name] = tt
    // edge-tap hit-test on both steppers
    const decEdge = await tapEdgesOfStepper(page, 'dec', 'Decrease bet')
    await wait(150)
    const incEdge = await tapEdgesOfStepper(page, 'inc', 'Increase bet')
    results.touchTargets[dev.name].edgeTapDecrease = decEdge
    results.touchTargets[dev.name].edgeTapIncrease = incEdge
    await page.screenshot({ path: `${OUT}/${dev.name}-betentry.png` })

    fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))

    for (const world of WORLDS) {
      for (const outcome of ['win', 'loss']) {
        console.log(`>>> starting ${dev.name}/${world.key}/${outcome}`)
      try {
        let roundResult = null
        let attempts = 0
        const MAX_ATTEMPTS = 6
        let gapPlaying = null
        while (attempts < MAX_ATTEMPTS) {
          attempts++
          // fresh reload for a clean round each time
          await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
          await page.evaluate(() => {
            try {
              localStorage.clear()
              sessionStorage.clear()
            } catch {}
          })
          await page.reload({ waitUntil: 'networkidle0' })
          await wait(600)
          await page.evaluate(() => {
            const btns = [...document.querySelectorAll('button')]
            const skip = btns.find((b) => /skip|got it|close|start/i.test(b.textContent || ''))
            if (skip) skip.click()
          })
          await wait(300)

          await clickText(page, world.label, false)
          await wait(400)
          await clickText(page, 'SEND IT', false)
          await wait(900)

          if (attempts === 1) {
            // horizontal overflow check (once per world/device is enough, but
            // cheap enough to leave here — only recorded on the first attempt)
            const overflow = await page.evaluate(() => ({
              scrollWidth: document.documentElement.scrollWidth,
              innerWidth: window.innerWidth,
            }))
            if (overflow.scrollWidth > overflow.innerWidth + 1) {
              results.regressions.push(`${dev.name}/${world.key}/${outcome}: horizontal overflow ${overflow.scrollWidth} > ${overflow.innerWidth}`)
            }

            // ── FIX #2 during PLAYING ────────────────────────────────────
            const gp = await measureHudGap(page, world.gridSize)
            if (gp) {
              const canvasBox = await page.evaluate(() => {
                const c = document.querySelector('[data-testid="vault-canvas-shell"] canvas')
                const r = c.getBoundingClientRect()
                return { w: r.width, h: r.height }
              })
              const grid = computeGridLayout(canvasBox.w, canvasBox.h, world.gridSize, true)
              const firstTileTopPage = gp.canvasTop + grid.y
              gapPlaying = { hudBottom: gp.hudBottom, firstTileTop: firstTileTopPage, gap: firstTileTopPage - gp.hudBottom }
            }
            await page.screenshot({ path: `${OUT}/${dev.name}-${world.key}-playing.png` })
          }

          // force outcome
          const rr = await forceRound(page, null, world.gridSize, outcome, world.gridSize * world.gridSize)
          await wait(700)
          if (!rr.ok) {
            results.regressions.push(`${dev.name}/${world.key}/${outcome}: could not reach settled (${rr.reason}) [attempt ${attempts}]`)
            continue
          }
          roundResult = rr
          if ((outcome === 'win') === !!rr.won) break // got the outcome we wanted
        }

        if (gapPlaying) {
          results.hudGap.push({ device: dev.name, world: world.key, phase: 'playing', ...gapPlaying })
        }

        if (!roundResult || !roundResult.ok) {
          results.regressions.push(`${dev.name}/${world.key}/${outcome}: never reached settled after ${MAX_ATTEMPTS} attempts`)
          continue
        }
        const actualWon = roundResult.won
        const label = actualWon ? 'win' : 'loss'
        if ((outcome === 'win') !== !!actualWon) {
          results.regressions.push(
            `${dev.name}/${world.key}: wanted ${outcome} but got ${label} after ${MAX_ATTEMPTS} attempts (RNG) — measurements below are for the ACTUAL outcome (${label}), not a defect`,
          )
        }

        // ── FIX #2 during SETTLED ──────────────────────────────────────────
        const gapSettled = await measureHudGap(page, world.gridSize)
        if (gapSettled) {
          const canvasBox = await page.evaluate(() => {
            const c = document.querySelector('[data-testid="vault-canvas-shell"] canvas')
            const r = c.getBoundingClientRect()
            return { w: r.width, h: r.height }
          })
          const grid = computeGridLayout(canvasBox.w, canvasBox.h, world.gridSize, true)
          const firstTileTopPage = gapSettled.canvasTop + grid.y
          const gap = firstTileTopPage - gapSettled.hudBottom
          results.hudGap.push({
            device: dev.name,
            world: world.key,
            phase: `settled-${label}`,
            hudBottom: gapSettled.hudBottom,
            firstTileTop: firstTileTopPage,
            gap,
          })
        }

        // ── FIX #3: BET AGAIN above fold, full-viewport AND chrome-adjusted ─
        const info = await settledInfo(page)
        const scrollInfo = await page.evaluate(() => ({
          scrollY: window.scrollY,
          innerHeight: window.innerHeight,
          scrollHeight: document.documentElement.scrollHeight,
        }))
        const betAgainRect = info.betAgainRect
        const fullViewportMargin = betAgainRect ? dev.height - betAgainRect.bottom : null
        const chromeInset = CHROME_INSET[dev.name]
        const realVisibleHeight = dev.height - chromeInset
        const chromeAdjustedMargin = betAgainRect ? realVisibleHeight - betAgainRect.bottom : null

        results.betAgainFold.push({
          device: dev.name,
          world: world.key,
          outcome: label,
          betAgainRect,
          scrollY: scrollInfo.scrollY,
          fullViewportMargin,
          chromeInset,
          realVisibleHeight,
          chromeAdjustedMargin,
        })

        await page.screenshot({ path: `${OUT}/${dev.name}-${world.key}-settled-${label}.png` })

        // regression: cash-out / bet-again functional check via touchscreen tap
        const betAgainHandle = await page.evaluateHandle(() => {
          const panel = document.querySelector('[data-testid="vault-settledpanel"]')
          return panel
            ? [...panel.querySelectorAll('button[aria-label]')].find((b) => (b.getAttribute('aria-label') || '').toLowerCase().startsWith('bet again,'))
            : null
        })
        const betAgainEl = betAgainHandle.asElement()
        if (betAgainEl) {
          const box = await betAgainEl.boundingBox()
          if (box) {
            await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
            await wait(500)
            const phaseAfter = await page.evaluate(() => document.body.innerText.includes('PUMPING') || !!document.querySelector('[data-testid="vault-mobile-hud-band"]'))
            if (!phaseAfter) results.regressions.push(`${dev.name}/${world.key}/${label}: BET AGAIN tap did not restart round`)
          }
        }
        console.log(`<<< done ${dev.name}/${world.key}/${outcome}`)
      } catch (e) {
        console.error(`!!! ERROR ${dev.name}/${world.key}/${outcome}:`, e && e.message ? e.message : e)
        results.regressions.push(`${dev.name}/${world.key}/${outcome}: driver exception — ${e && e.message ? e.message : e}`)
      }
      fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
      }
    }
    results.consoleErrors[dev.name] = errs
    fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
    await page.close()
  }

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
  await browser.close()
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
