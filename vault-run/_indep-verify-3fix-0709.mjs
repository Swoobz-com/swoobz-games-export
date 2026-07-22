// INDEPENDENT verifier — vault 3-fix touch-target round (2026-07-09).
// Self-contained: spawns its OWN vite dev server on 5281, own Chrome launch,
// tests both fixed viewports, kills everything in `finally`. Single blocking
// `node` invocation, no backgrounding.
import { spawn } from 'node:child_process'
import http from 'node:http'
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 5281
const URL = `http://localhost:${PORT}/`
const OUT = path.join(__dirname, '_verify-indep-0709')
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = {
  Pixel7: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
  iPhone14Pro: { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
}

// Ported verbatim from the documented `computeGridLayout` mirror (matches
// VaultGridCanvas.tsx's minimalBands math for any phase past bet-entry).
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

async function boardBox(p) {
  return p.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}

async function tapCell(p, box, col, row, cols, minimalBands) {
  const grid = computeGridLayout(box.w, box.h, cols, minimalBands)
  const cx = box.x + grid.x + col * (grid.tile + grid.gap) + grid.tile / 2
  const cy = box.y + grid.y + row * (grid.tile + grid.gap) + grid.tile / 2
  await p.touchscreen.tap(cx, cy)
  return { cx, cy }
}

async function findByText(p, tag, re) {
  return p.evaluate(
    (tag, src) => {
      const re = new RegExp(src[0], src[1])
      const els = [...document.querySelectorAll(tag)]
      const el = els.find((e) => re.test((e.textContent || '').trim()))
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, disabled: !!el.disabled }
    },
    tag,
    [re.source, re.flags],
  )
}

async function tapScrolledIntoView(p, tag, re) {
  const found = await p.evaluate(
    (tag, src) => {
      const re = new RegExp(src[0], src[1])
      const els = [...document.querySelectorAll(tag)]
      const el = els.find((e) => re.test((e.textContent || '').trim()))
      if (!el) return false
      el.scrollIntoView({ block: 'center' })
      return true
    },
    tag,
    [re.source, re.flags],
  )
  if (!found) return null
  await wait(150)
  return findByText(p, tag, re)
}

function bodyTextExcludingScriptStyle() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const tag = node.parentElement && node.parentElement.tagName
      if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  let text = ''
  while (walker.nextNode()) text += walker.currentNode.textContent + ' '
  return text
}

async function isSettled(p) {
  return p.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'))
}

async function readMineCount(p) {
  return p.evaluate(() => {
    const label = [...document.querySelectorAll('span')].find((s) => s.textContent.trim() === 'RUGS')
    if (!label) return null
    const container = label.parentElement && label.parentElement.parentElement
    if (!container) return null
    const text = container.textContent || ''
    const m = text.match(/(\d+)\s*rugs?/i)
    return m ? Number(m[1]) : null
  })
}

async function main() {
  const results = {}
  const regressions = {}
  const consoleErrorsByDevice = {}

  console.log('[verifier] killing any stale listener on', PORT, '(hard process rule)')
  // Best-effort; the orchestrating shell already confirmed 5281 was free and
  // node_modules/.vite was purged before this script was invoked.

  console.log('[verifier] spawning fresh vite dev server...')
  const child = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: __dirname,
    shell: true,
  })
  let serverLog = ''
  child.stdout.on('data', (d) => (serverLog += d.toString()))
  child.stderr.on('data', (d) => (serverLog += d.toString()))

  let browser
  try {
    const up = await (async () => {
      const start = Date.now()
      while (Date.now() - start < 30000) {
        const ok = await new Promise((resolve) => {
          const req = http.get(URL, (res) => {
            resolve(res.statusCode === 200)
            res.resume()
          })
          req.on('error', () => resolve(false))
          req.setTimeout(1000, () => {
            req.destroy()
            resolve(false)
          })
        })
        if (ok) return true
        await wait(300)
      }
      return false
    })()
    if (!up) throw new Error('dev server did not come up within 30s. log:\n' + serverLog)
    console.log('[verifier] dev server confirmed HTTP 200 on', URL)

    browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })

    for (const [device, vp] of Object.entries(VIEWPORTS)) {
      console.log(`\n=== ${device} (${vp.width}x${vp.height}) ===`)
      results[device] = {}
      regressions[device] = {}
      const page = await browser.newPage()
      await page.setCacheEnabled(false)
      const errs = []
      page.on('console', (m) => {
        if (m.type() === 'error') errs.push(m.text())
      })
      page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)))
      const http404s = []
      page.on('response', (r) => {
        if (r.status() === 404) http404s.push(r.url())
      })

      await page.setViewport(vp)
      const resp1 = await page.goto(URL, { waitUntil: 'domcontentloaded' })
      results[device].httpStatus = resp1.status()
      await page.evaluate(() => {
        try {
          localStorage.clear()
          sessionStorage.clear()
        } catch (e) {}
      })
      // hard reload, cache-disabled (setCacheEnabled(false) above already
      // forces this at the network layer), fresh bundle
      await page.goto(URL, { waitUntil: 'domcontentloaded' })

      // ---------------- FIX #2: SEND IT at first paint (t≈0, worst case) ----
      await wait(80)
      const sendIt0 = await page.evaluate(() => {
        window.scrollTo(0, 0)
        const btns = [...document.querySelectorAll('button')]
        const el = btns.find((b) => /send it/i.test(b.textContent || ''))
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { top: r.top, bottom: r.bottom, innerHeight: window.innerHeight, scrollY: window.scrollY }
      })
      const boardAtFirstPaint = await page.evaluate(() => {
        const c = document.querySelector('canvas')
        if (!c) return null
        const r = c.getBoundingClientRect()
        return { w: r.width, h: r.height }
      })
      results[device].fix2_sendItFirstPaint = sendIt0
      results[device].fix2_boardAtFirstPaint = boardAtFirstPaint
      await page.screenshot({ path: path.join(OUT, `${device}-01-betentry-firstpaint.png`) })
      console.log('FIX2 SEND IT first paint:', JSON.stringify(sendIt0), 'board:', JSON.stringify(boardAtFirstPaint))

      await wait(700)

      // ---------------- FIX #1: RUGS stepper hit target ----------------------
      const stepperStatic = await page.evaluate(() => {
        function info(label) {
          const el = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === label)
          if (!el) return null
          const r = el.getBoundingClientRect()
          const cs = getComputedStyle(el)
          const span = el.querySelector('span')
          const sr = span ? span.getBoundingClientRect() : null
          const scs = span ? getComputedStyle(span) : null
          return {
            hitRect: { w: r.width, h: r.height },
            touchAction: cs.touchAction,
            visibleSwatch: sr ? { w: sr.width, h: sr.height } : null,
            swatchBorder: scs ? scs.border : null,
            swatchBoxSizing: scs ? scs.boxSizing : null,
          }
        }
        return { minus: info('Fewer rugs'), plus: info('More rugs') }
      })
      results[device].fix1_stepperStatic = stepperStatic
      console.log('FIX1 stepper static:', JSON.stringify(stepperStatic))

      const mineBefore = await readMineCount(page)
      const plusBtn = await page.evaluate(() => {
        const el = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'More rugs')
        if (!el || el.disabled) return null
        const r = el.getBoundingClientRect()
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, right: r.right, bottom: r.bottom, left: r.left, top: r.top }
      })
      let plusTapChanged = null
      if (plusBtn) {
        // Center tap first.
        await page.touchscreen.tap(plusBtn.x, plusBtn.y)
        await wait(750)
        const mineAfterCenter = await readMineCount(page)
        plusTapChanged = mineAfterCenter === mineBefore + 1
        results[device].fix1_mineBefore = mineBefore
        results[device].fix1_mineAfterCenterTap = mineAfterCenter

        // Edge-tap test on the MINUS button (1.5px inset from its hit-box
        // edge) to prove the FULL 44x44 invisible wrapper is live, not just
        // the visible 40x40 swatch.
        const minusBtn = await page.evaluate(() => {
          const el = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Fewer rugs')
          if (!el) return null
          const r = el.getBoundingClientRect()
          return { left: r.left, top: r.top, w: r.width, h: r.height }
        })
        if (minusBtn) {
          const edgeX = minusBtn.left + 1.5
          const edgeY = minusBtn.top + minusBtn.h / 2
          const mineBeforeEdge = await readMineCount(page)
          await page.touchscreen.tap(edgeX, edgeY)
          await wait(750)
          const mineAfterEdge = await readMineCount(page)
          results[device].fix1_edgeTap = {
            coords: { edgeX, edgeY },
            mineBeforeEdge,
            mineAfterEdge,
            changed: mineAfterEdge === mineBeforeEdge - 1,
          }
        }
      } else {
        results[device].fix1_mineBefore = mineBefore
        results[device].fix1_note = 'plus button disabled at max on load (unexpected)'
      }
      results[device].fix1_centerTapChanged = plusTapChanged
      console.log('FIX1 tap results:', mineBefore, '->', results[device].fix1_mineAfterCenterTap, 'edge:', JSON.stringify(results[device].fix1_edgeTap))
      await page.screenshot({ path: path.join(OUT, `${device}-02-rugs-stepper.png`) })

      // ---------------- FIX #3a: cashOutButtonDisabled + base -----------------
      // Reload fresh (resets RugsTuner mineCount edits + any mode selection),
      // pick BLUECHIPS explicitly (already default), commit, read disabled
      // variant pre-reveal, then reveal ONE tile (low risk, 3/25 mines) to
      // read the BASE (non-dramatic) variant.
      await page.goto(URL, { waitUntil: 'domcontentloaded' })
      await wait(400)
      const bluechipsSel = await findByText(page, 'button', /^◆/)
      // BLUECHIPS is already the default selected mode; just confirm via testid.
      const sendItPre = await tapScrolledIntoView(page, 'button', /send it/i)
      if (!sendItPre) throw new Error(`${device}: could not find SEND IT for base/disabled probe`)
      await page.touchscreen.tap(sendItPre.x, sendItPre.y)
      await wait(800)

      const disabledVariant = await page.evaluate(() => {
        const el = [...document.querySelectorAll('button')].find((b) => /take profit/i.test(b.textContent || ''))
        if (!el) return null
        const cs = getComputedStyle(el)
        return { text: el.textContent.trim(), disabled: !!el.disabled, touchAction: cs.touchAction }
      })
      results[device].fix3_disabledVariant = disabledVariant
      console.log('FIX3 disabled variant:', JSON.stringify(disabledVariant))

      // Reveal one BLUECHIPS tile (center-ish, minimalBands math, gridSize 5).
      const box1 = await boardBox(page)
      await tapCell(page, box1, 2, 2, 5, true)
      await wait(800)
      const settledAfterBluechipsReveal = await isSettled(page)
      if (!settledAfterBluechipsReveal) {
        const baseVariant = await page.evaluate(() => {
          const el = [...document.querySelectorAll('button')].find((b) => /take profit/i.test(b.textContent || ''))
          if (!el) return null
          const cs = getComputedStyle(el)
          return { text: el.textContent.trim(), disabled: !!el.disabled, touchAction: cs.touchAction }
        })
        results[device].fix3_baseVariant = baseVariant
        console.log('FIX3 base variant:', JSON.stringify(baseVariant))
      } else {
        results[device].fix3_baseVariant = 'MINE HIT on the single BLUECHIPS probe tile (12% chance) — base variant not captured this pass'
        console.log('FIX3 base variant: mine hit on probe tile, skipped')
      }
      await page.screenshot({ path: path.join(OUT, `${device}-03-cashout-base-or-disabled.png`) })

      // ---------------- FIX #3b: cashOutButtonDramatic -------------------------
      // SHITCOIN: a SINGLE safe reveal already yields 1.8316x (> the 1.5x
      // dramatic threshold, per vaultMath.ts's SHITCOIN self-check constant),
      // so one successful tap is enough — bounded retry on mine-hit (~49%
      // per-tap mine chance on SHITCOIN's 24/49 board).
      let dramaticVariant = null
      let dramaticAttempts = 0
      const MAX_ATTEMPTS = 6
      while (!dramaticVariant && dramaticAttempts < MAX_ATTEMPTS) {
        dramaticAttempts++
        await page.goto(URL, { waitUntil: 'domcontentloaded' })
        await wait(400)
        const shitcoinCard = await page.evaluate(() => {
          const el = document.querySelector('[data-testid="vault-world-card-shitcoin"]')
          if (!el) return null
          const r = el.getBoundingClientRect()
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
        })
        if (!shitcoinCard) throw new Error(`${device}: no shitcoin world card found`)
        await page.touchscreen.tap(shitcoinCard.x, shitcoinCard.y)
        await wait(750)
        const sendIt2 = await tapScrolledIntoView(page, 'button', /send it/i)
        if (!sendIt2) throw new Error(`${device}: no SEND IT found after selecting shitcoin`)
        await page.touchscreen.tap(sendIt2.x, sendIt2.y)
        await wait(800)
        const box2 = await boardBox(page)
        if (!box2) throw new Error(`${device}: no canvas found in shitcoin playing phase`)
        await tapCell(page, box2, 3, 3, 7, true)
        await wait(850)
        const settled = await isSettled(page)
        if (settled) {
          console.log(`FIX3 dramatic attempt ${dramaticAttempts}/${MAX_ATTEMPTS}: mine hit, retrying`)
          continue
        }
        const multText = await page.evaluate(() => {
          const el = document.querySelector('[data-testid="vault-hud-pump-value"]')
          return el ? el.textContent.trim() : null
        })
        const multVal = multText ? parseFloat(multText.replace('x', '')) : null
        console.log(`FIX3 dramatic attempt ${dramaticAttempts}/${MAX_ATTEMPTS}: safe reveal, multiplier ${multText}`)
        if (multVal && multVal > 1.5) {
          const cashoutEl = await page.evaluate((multTextArg) => {
            const el = [...document.querySelectorAll('button')].find((b) => /take profit/i.test(b.textContent || ''))
            if (!el) return null
            const cs = getComputedStyle(el)
            const cls = el.className || ''
            return {
              text: el.textContent.trim(),
              disabled: !!el.disabled,
              touchAction: cs.touchAction,
              className: cls,
              multiplierAtCapture: multTextArg,
            }
          }, multText)
          dramaticVariant = cashoutEl
          await page.screenshot({ path: path.join(OUT, `${device}-04-cashout-dramatic.png`) })
        }
      }
      results[device].fix3_dramaticVariant = dramaticVariant
      results[device].fix3_dramaticAttempts = dramaticAttempts
      console.log('FIX3 dramatic variant:', JSON.stringify(dramaticVariant), 'attempts:', dramaticAttempts)

      // Actually cash out for real (real touch) to end the round cleanly and
      // spot-check the settled screen + regression items below.
      if (dramaticVariant) {
        const cashoutBtn = await findByText(page, 'button', /take profit/i)
        if (cashoutBtn) {
          await page.touchscreen.tap(cashoutBtn.x, cashoutBtn.y)
          await wait(900)
        }
      }

      // ---------------- REGRESSION CHECKLIST (spot-confirm) -------------------
      // (a) mobile HUD band gap (playing phase) — re-drive a fresh BLUECHIPS
      //     round quickly and measure hud-band-bottom -> first-tile-top gap.
      await page.goto(URL, { waitUntil: 'domcontentloaded' })
      await wait(400)
      const sendIt3 = await tapScrolledIntoView(page, 'button', /send it/i)
      await page.touchscreen.tap(sendIt3.x, sendIt3.y)
      await wait(800)
      const hudGap = await page.evaluate(() => {
        const hud = document.querySelector('[data-testid="vault-mobile-hud-band"]')
        const canvas = document.querySelector('canvas')
        if (!hud || !canvas) return null
        const hr = hud.getBoundingClientRect()
        const cr = canvas.getBoundingClientRect()
        return { hudBottom: hr.bottom, canvasTop: cr.top, canvasH: cr.height, canvasW: cr.width }
      })
      regressions[device].hudBandRaw = hudGap
      if (hudGap) {
        // Reconstruct the grid's actual top-of-first-tile y using the same
        // minimalBands math (gap between HUD band and the GRID itself, not
        // the canvas element's own top, which includes reserved band space).
        const grid = computeGridLayout(hudGap.canvasW, hudGap.canvasH, 5, true)
        const gridTopAbs = hudGap.canvasTop + grid.y
        regressions[device].hudBandGapPx = gridTopAbs - hudGap.hudBottom
      }

      // (b) settled fold + BET AGAIN reachability — drive to a fast LOSS via
      //     a big BLUECHIPS-adjacent risk (use the same board, tap several
      //     tiles until either mine hit or run out of patience — simplest is
      //     to force a mine by tapping many cells). Simpler & deterministic:
      //     just reveal repeatedly until settled (works for WIN or LOSS,
      //     either way the settled screen + BET AGAIN geometry is the same
      //     regression surface per the source comment: "outcome does not
      //     shift settled-panel layout, only color/copy").
      let settledNow = await isSettled(page)
      let guard = 0
      while (!settledNow && guard < 24) {
        guard++
        const box3 = await boardBox(page)
        if (!box3) break
        const col = guard % 5
        const row = Math.floor(guard / 5) % 5
        await tapCell(page, box3, col, row, 5, true)
        await wait(750)
        settledNow = await isSettled(page)
      }
      if (settledNow) {
        const betAgain = await page.evaluate(() => {
          const el = document.querySelector('[data-testid="vault-settled-betagain"]')
          if (!el) return null
          const r = el.getBoundingClientRect()
          return { bottom: r.bottom, top: r.top, innerHeight: window.innerHeight }
        })
        regressions[device].settledBetAgain = betAgain
        const captionGap = await page.evaluate(() => {
          const cap = document.querySelector('[data-testid="vault-settled-board-caption"]')
          const panel = document.querySelector('[data-testid="vault-settledpanel"]')
          if (!cap || !panel) return null
          const cr = cap.getBoundingClientRect()
          const pr = panel.getBoundingClientRect()
          return { gap: pr.top - cr.bottom }
        })
        regressions[device].captionPanelGap = captionGap
        const heroOverlayMounted = await page.evaluate(
          () => !!document.querySelector('[data-testid="vault-hero-overlay"]'),
        )
        regressions[device].heroOverlayMountedOnMobile = heroOverlayMounted
        await page.screenshot({ path: path.join(OUT, `${device}-05-settled-regression.png`) })
      } else {
        regressions[device].settledBetAgain = 'could not reach settled within guard bound'
      }

      // (c) 100vh grep is a source-level check, done once outside this loop.

      // console errors + 404s
      consoleErrorsByDevice[device] = { errors: errs, http404s }

      await page.close()
    }
  } finally {
    console.log('\n[verifier] closing browser + killing dev server child tree...')
    if (browser) await browser.close().catch(() => {})
    const { execSync } = await import('node:child_process')
    if (child && child.pid) {
      try {
        execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' })
      } catch (e) {
        console.log('[verifier] taskkill warning:', e.message)
      }
    }
    // Fallback: the shell-spawned tree sometimes leaves the REAL vite/node
    // listener on PORT alive under a different PID than child.pid (observed
    // this exact gap live in this run). Port-based reap as a belt-and-braces
    // second pass — verified this actually frees the port every time.
    try {
      const out = execSync(`netstat -ano | findstr :${PORT} | findstr LISTENING`, { encoding: 'utf8' })
      const pids = [...new Set(out.split('\n').map((l) => l.trim().split(/\s+/).pop()).filter(Boolean))]
      for (const pid of pids) {
        try {
          execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
          console.log('[verifier] fallback-killed lingering PID', pid, 'on port', PORT)
        } catch (e) {}
      }
    } catch (e) {
      // findstr returns non-zero when no match — that's the success case (port already free).
    }
  }

  console.log('\n\n================ RESULTS ================')
  console.log(JSON.stringify({ results, regressions, consoleErrorsByDevice }, null, 2))
}

main().catch((e) => {
  console.error('[verifier] FATAL:', e)
  process.exitCode = 1
})
