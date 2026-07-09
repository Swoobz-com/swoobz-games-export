// gameflowqa-0707-fresh.mjs — FRESH comprehensive game-flow re-sweep of the
// vault "RUG OR RICHES" Original, post 7-fix pass (2026-07-07). Own driver,
// not a re-run of any prior agent's script (patterns borrowed from
// rgc5-fullsweep-0707.mjs, written fresh here). Covers the Studio Quality
// Bar 7-assertion smoke gate + restart loop + change-wager + tap-tutorial +
// in-canvas HUD checks, across 3 worlds x win/loss x 3 viewports.
//
// HARD RULE: runs in the FOREGROUND to completion. No background driver.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5281'
const OUT = process.argv[3] || 'shots-gameflowqa-0707-fresh'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { name: 'desktop-1440x900', w: 1440, h: 900, wide: true },
  { name: 'mobile-pixel7', w: 412, h: 915, wide: false },
  { name: 'mobile-iphone14pro', w: 390, h: 844, wide: false },
]
const WORLDS = [
  { mode: 'bluechips', gridSize: 5 },
  { mode: 'altseason', gridSize: 5 },
  { mode: 'shitcoin', gridSize: 7 },
]
const OUTCOMES = ['win', 'loss']

async function clickText(page, t, opts = {}) {
  const h = await page.evaluateHandle(
    (t, exact) => {
      const els = [...document.querySelectorAll('button,[role=button],a')]
      const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
      const lc = t.toLowerCase()
      const visible = (e) => e.offsetParent !== null && !e.disabled
      return (
        (exact ? els.find((e) => visible(e) && norm(e) === lc) : null) ||
        els.find((e) => visible(e) && norm(e) === lc) ||
        els.find((e) => visible(e) && norm(e).includes(lc)) ||
        null
      )
    },
    t,
    !!opts.exact,
  )
  const el = h.asElement()
  if (!el) return false
  try {
    await el.click()
  } catch {
    return false
  }
  return true
}

async function textOf(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    return el ? (el.textContent || '').trim() : null
  }, sel)
}

async function rectOf(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom, top: r.top }
  }, sel)
}

async function present(page, sel) {
  return page.evaluate((sel) => !!document.querySelector(sel), sel)
}

async function findButtonRect(page, textIncludes) {
  return page.evaluate((t) => {
    const lc = t.toLowerCase()
    const btn = [...document.querySelectorAll('button')].find((e) =>
      (e.textContent || '').trim().toLowerCase().includes(lc),
    )
    if (!btn) return null
    const r = btn.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom, top: r.top, disabled: btn.disabled }
  }, textIncludes)
}

async function loadFresh(page, v) {
  await page.setViewport({ width: v.w, height: v.h, deviceScaleFactor: 1 })
  const resp = await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0', timeout: 30000 })
  const status = resp ? resp.status() : null
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {}
  })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(400)
  return status
}

// Mirrors VaultGridCanvas.tsx's computeGridLayout() EXACTLY (lines ~1132-
// 1183) so synthetic clicks land inside the real tile bounding boxes rather
// than an approximated margin. During 'playing'/'settled' domHudActive is
// {isWide || bottomBarPhase} which is TRUE on every viewport once a round is
// live (bottomBarPhase covers mobile), so minimalBands=true universally for
// the phases this driver clicks tiles in.
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
    return { x, y, tile: FIXED_TILE, gap: FIXED_GAP }
  }
  const gap = Math.max(6, available * 0.026)
  const tile = (available - gap * (gridSize - 1)) / gridSize
  const full = tile * gridSize + gap * (gridSize - 1)
  const x = (W - full) / 2
  const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2
  const y = bandCenterY - full / 2
  return { x, y, tile, gap }
}

async function clickCanvasTile(page, gridSize, col, row) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="vault-canvas-shell"] canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  if (!box) return false
  const grid = computeGridLayout(box.w, box.h, gridSize, true)
  const cx = box.x + grid.x + col * (grid.tile + grid.gap) + grid.tile / 2
  const cy = box.y + grid.y + row * (grid.tile + grid.gap) + grid.tile / 2
  await page.mouse.click(cx, cy)
  return true
}

// One combo drive: viewport x world x outcome. Returns a results object with
// every probe outcome so the caller can build the final PASS/FAIL matrix.
async function driveCombo(page, v, world, outcome, errTracker) {
  const key = `${v.name}__${world.mode}__${outcome}`
  const res = { key, viewport: v.name, world: world.mode, outcome }
  const shot = (tag) => page.screenshot({ path: `${OUT}/${key}__${tag}.png`, fullPage: false }).catch(() => {})

  errTracker.errors.length = 0
  errTracker.pageErrors.length = 0

  // ── Assertion 1: HTTP 200 ────────────────────────────────────────────────
  const status = await loadFresh(page, v)
  res.httpStatus = status
  res.assert1_http200 = status === 200

  // ── Assertion 2: onboarding scrim on first visit (fresh localStorage) ───
  // KNOWN HARNESS LIMITATION: the standalone vault-run harness imports the
  // SHIM `_shared/onboarding` (index.tsx), whose `useOnboardingState` always
  // returns `visible:false` and whose `OnboardingOverlay` always renders
  // null — by design, so the standalone runner is immediately playable.
  // This is NOT part of the 7 fixes and not testable live in this snapshot.
  res.assert2_onboarding = 'HARNESS_STUB_NOT_TESTABLE'

  await wait(200)

  // ── Select world ──────────────────────────────────────────────────────
  await clickText(page, world.mode)
  await wait(200)

  // ── Probe 6 (setup phase): bet-entry CTA in-canvas vs bottom-bar note ───
  const canvasShellRect = await rectOf(page, '[data-testid="vault-canvas-shell"]')
  res.canvasShellRect_betEntry = canvasShellRect

  // ── Probe 3: change-wager flow ───────────────────────────────────────────
  const wagerSelBefore = v.wide ? '[data-testid="vault-ctl-wager"]' : '[data-testid="bet-console"]'
  const wagerTextBefore = await textOf(page, wagerSelBefore)
  const presetOk = await clickText(page, '25', { exact: true })
  await wait(700) // AnimatedUsdc count-roll settle
  const wagerTextAfter = await textOf(page, wagerSelBefore)
  res.probe3_changeWager = {
    presetClicked: presetOk,
    wagerTextBefore: (wagerTextBefore || '').slice(0, 160),
    wagerTextAfter: (wagerTextAfter || '').slice(0, 160),
    wagerTextChanged: wagerTextBefore !== wagerTextAfter,
    commitLabelUnchangedByDesign: true, // "SEND IT ->" is static text, amount lives in wagerValue window
  }

  await shot('01-betentry')

  // ── Commit the bet ────────────────────────────────────────────────────
  const commitOk = await clickText(page, 'send it')
  await wait(1000)
  res.commitClicked = commitOk

  // ── Assertion 3 (partial): reached playing phase? ────────────────────────
  const reachedPlaying = await present(page, 'canvas')
  const cashOutRectPre = await findButtonRect(page, 'take profit')
  res.reachedPlaying = reachedPlaying
  res.cashOutPresentPreReveal = !!cashOutRectPre
  res.cashOutDisabledPreReveal = cashOutRectPre ? cashOutRectPre.disabled : null

  // ── Assertion 6 / Probe 5: cash-out precondition disclosure pre-reveal ──
  const disclosureText = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((e) =>
      (e.textContent || '').toLowerCase().includes('take profit') || (e.textContent||'').toLowerCase().includes('crack one open'),
    )
    return btn ? (btn.textContent || '').trim() : null
  })
  res.cashOutDisclosureText = disclosureText

  // ── Assertion 5: visible response within 100ms of primary tap ───────────
  const statusSelBefore = v.wide ? '[data-testid="vault-grid-status"]' : '[data-testid="vault-grid-hud-inner"]'
  const before100 = await textOf(page, statusSelBefore)
  const t0 = Date.now()
  await clickCanvasTile(page, world.gridSize, 0, 0)
  let respMs = null
  for (let i = 0; i < 12; i++) {
    await wait(10)
    const now = await textOf(page, statusSelBefore)
    if (now !== before100) {
      respMs = Date.now() - t0
      break
    }
  }
  res.assert5_responseWithin100ms = respMs !== null && respMs <= 100
  res.assert5_measuredMs = respMs

  await wait(300)

  // ── Assertion 6: cash-out reachable + enabled after >=1 reveal ──────────
  const cashOutRectPost = await findButtonRect(page, 'take profit')
  res.assert6_cashOutReachableAfterReveal = !!cashOutRectPost && cashOutRectPost.disabled === false

  // ── Probe 6 (gameplay phase): cash-out in bottom action bar, below canvas
  const canvasShellRectActive = await rectOf(page, '[data-testid="vault-canvas-shell"]')
  if (cashOutRectPost && canvasShellRectActive) {
    res.probe6_cashOutBelowCanvas = cashOutRectPost.top >= canvasShellRectActive.bottom - 4 // small tolerance
  } else {
    res.probe6_cashOutBelowCanvas = null
  }

  // ── Fix #1 regression check: keyboard reveal still shares activateTile ──
  if (v.wide) {
    const gridSel = await page.evaluate(() => !!document.querySelector('[role="grid"]'))
    res.fix1_gridRoleQueryable = gridSel
    // Confirm a keyboard Enter on the grid does not throw / does not desync
    // pointer clicks (regression risk called out in the brief).
    try {
      await page.focus('[role="grid"]')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('Enter')
      await wait(250)
      res.fix1_keyboardActivateNoThrow = true
    } catch (e) {
      res.fix1_keyboardActivateNoThrow = false
    }
  } else {
    res.fix1_gridRoleQueryable = 'desktop-only-check-skipped-on-mobile'
    res.fix1_keyboardActivateNoThrow = 'skipped'
  }

  await shot('02-playing-after-reveal')

  // ── Probe 8: tap-to-engage tutorial — wait 3s mid-round, confirm no
  // auto-close (OO-BURST regression class) ───────────────────────────────
  const preWaitPhase = await page.evaluate(() =>
    document.querySelector('[data-testid="vault-settled-banner"]') ? 'settled' : 'playing-or-other',
  )
  await wait(3000)
  const postWaitPhase = await page.evaluate(() =>
    document.querySelector('[data-testid="vault-settled-banner"]') ? 'settled' : 'playing-or-other',
  )
  const cashOutAfterWait = await findButtonRect(page, 'take profit')
  res.probe8_tapTutorial = {
    preWaitPhase,
    postWaitPhase,
    autoClosedDuringWait: preWaitPhase !== 'settled' && postWaitPhase === 'settled',
    cashOutStillReachable: !!cashOutAfterWait && cashOutAfterWait.disabled === false,
  }

  // ── Reveal more tiles / drive to the requested outcome ──────────────────
  const cellSeq = []
  for (let r = 0; r < world.gridSize; r++) for (let c = 0; c < world.gridSize; c++) cellSeq.push([c, r])
  let settledReached = false
  for (const [c, r] of cellSeq) {
    const isSettled = await present(page, '[data-testid="vault-settled-banner"]')
    if (isSettled) {
      settledReached = true
      break
    }
    if (outcome === 'win') {
      const ready = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((e) =>
          (e.textContent || '').trim().toLowerCase().includes('take profit'),
        )
        return !!btn && btn.offsetParent !== null && !btn.disabled
      })
      if (ready) {
        await clickText(page, 'take profit')
        await wait(1000)
        settledReached = await present(page, '[data-testid="vault-settled-banner"]')
        break
      }
    }
    await clickCanvasTile(page, world.gridSize, c, r)
    await wait(280)
  }
  if (!settledReached) {
    await wait(1200)
    settledReached = await present(page, '[data-testid="vault-settled-banner"]')
  }
  res.settledReached = settledReached

  await shot('03-settled')

  // ── Assertion 7: Glass Box receipt renders on settle ─────────────────────
  const verifyChipText = await page.evaluate(() => document.body.innerText.toLowerCase().includes('verified'))
  const receiptCardPresent = await present(page, '[data-testid="vault-settled-receipt-card"]')
  const mismatchPresent = await page.evaluate(() => document.body.innerText.toLowerCase().includes('mismatch'))
  res.assert7_glassBox = {
    verifiedChipOrTextPresent: verifyChipText,
    receiptCardPresent,
    mismatchPresent,
  }

  // ── Fix #7 regression check: no "mixer" row / no crash on settled render ─
  const mixerRowTextPresent = await page.evaluate(() => /\bmixer\b/i.test(document.body.innerText))
  res.fix7_mixerRowAbsent = !mixerRowTextPresent

  // ── Assertion 4: no overlay covers canvas / action bar below canvas ─────
  const canvasShellRectSettled = await rectOf(page, '[data-testid="vault-canvas-shell"]')
  const betAgainRect = await findButtonRect(page, 'bet again')
  res.assert4_betAgainBelowOrBesideCanvas =
    betAgainRect && canvasShellRectSettled
      ? betAgainRect.top >= canvasShellRectSettled.top - 8 // not literally covering canvas top
      : null
  res.betAgainRect = betAgainRect
  res.canvasShellRectSettled = canvasShellRectSettled

  // ── Fix #3 regression check: settled mobile board shrink didn't push BET
  // AGAIN below the fold ──────────────────────────────────────────────────
  if (!v.wide && betAgainRect) {
    res.fix3_betAgainAboveFold = betAgainRect.bottom <= v.h
    res.fix3_betAgainBottomPx = betAgainRect.bottom
    res.fix3_viewportH = v.h
  } else {
    res.fix3_betAgainAboveFold = 'n/a-desktop'
  }

  // ── Fix #5 regression check: rhythm badge doesn't break settle ──────────
  res.fix5_reachedSettledOk = settledReached // if we got here without throw, rhythm-chain logic didn't crash the round

  // ── Fix #6 regression check: BetConsole bigger touch targets didn't break
  // the flow we already exercised (change-wager -> commit succeeded above) ─
  res.fix6_betConsoleFlowOk = res.probe3_changeWager.presetClicked && res.commitClicked

  // ── Probe 2: restart loop ────────────────────────────────────────────────
  // NOTE: vault's `handleBetAgain` = `controller.placeBet()` directly (a
  // documented "phase-collapse" ruling — memory: "a 'remove screen X, land
  // directly on screen Y' phase-collapse ruling for vault"). "BET AGAIN"
  // does NOT return to bet-entry; it immediately places a new bet with the
  // same wager and lands straight in `playing` (round R+1). This is the
  // Stake/Mines-canon "bet again" pattern, not a bug — the restart-complete
  // condition is therefore "settled banner gone + a FRESH interactive round
  // (cash-out disabled, 0 reveals) is live", not "bet-entry reappeared".
  const t1 = Date.now()
  const betAgainClicked = await clickText(page, 'bet again')
  let restartMs = null
  let restartedIntoFreshRound = false
  for (let i = 0; i < 40; i++) {
    await wait(50)
    const stillSettled = await present(page, '[data-testid="vault-settled-banner"]')
    const freshRoundText = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((e) =>
        (e.textContent || '').toLowerCase().includes('take profit'),
      )
      return btn ? (btn.textContent || '').toLowerCase().includes('crack one open first') : false
    })
    if (!stillSettled && freshRoundText) {
      restartedIntoFreshRound = true
      restartMs = Date.now() - t1
      break
    }
  }
  const staleSettledPanel = await present(page, '[data-testid="vault-settled-receipt-card"]')
  res.probe2_restart = {
    betAgainClicked,
    restartedIntoFreshRound,
    restartMs,
    staleSettledPanelAfterRestart: staleSettledPanel,
  }

  await shot('04-after-restart')

  // ── Console/page errors during this whole combo ─────────────────────────
  res.consoleErrors = [...errTracker.errors]
  res.pageErrors = [...errTracker.pageErrors]

  return res
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=1'],
  })
  const page = await browser.newPage()
  const errTracker = { errors: [], pageErrors: [] }
  page.on('console', (m) => {
    if (m.type() === 'error') errTracker.errors.push(m.text())
  })
  page.on('pageerror', (e) => errTracker.pageErrors.push('PAGEERROR: ' + e.message))

  const allResults = []
  for (const v of VIEWPORTS) {
    for (const world of WORLDS) {
      for (const outcome of OUTCOMES) {
        console.log(`--- ${v.name} / ${world.mode} / ${outcome} ---`)
        try {
          const r = await driveCombo(page, v, world, outcome, errTracker)
          allResults.push(r)
          console.log(JSON.stringify({ key: r.key, settledReached: r.settledReached, restart: r.probe2_restart }, null, 0))
        } catch (e) {
          allResults.push({ key: `${v.name}__${world.mode}__${outcome}`, fatalError: String(e && e.stack ? e.stack : e) })
          console.error('FATAL in combo', v.name, world.mode, outcome, e)
        }
      }
    }
  }

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(allResults, null, 2))
  console.log('DONE ->', `${OUT}/results.json`)
  await browser.close()
}

run().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
