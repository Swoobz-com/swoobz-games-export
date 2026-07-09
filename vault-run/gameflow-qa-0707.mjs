// gameflow-qa-0707.mjs — swoobz-game-flow-qa comprehensive pre-release sweep
// of RUG OR RICHES (vault) post-11-structural-change composed state.
// Independent driver, own port arg, own screenshots dir. Pattern-matched from
// rgc5-lobbyremoval-audit-0706.mjs + round4-holdgate-visreg-0706.mjs but
// written fresh for this brief's 9-check matrix.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5390'
const OUT = process.argv[3] || `shots-gameflowqa-0707`
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(
    ({ t, within }) => {
      const root = within ? document.querySelector(within) : document
      if (!root) return null
      const els = [...root.querySelectorAll('button,[role=button],a')]
      const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
      const lc = t.toLowerCase()
      return (
        els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
        els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) ||
        null
      )
    },
    { t, within },
  )
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}

async function present(page, sel) {
  return page.evaluate((sel) => !!document.querySelector(sel), sel)
}

async function rect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }
  }, sel)
}

async function text(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : null
  }, sel)
}

async function phaseKind(page) {
  // Container-agnostic phase detector — vault-board-worldpicker/vault-ctl-cta/
  // vault-ctl-wager-locked are DESKTOP-ONLY testids (confirmed live: mobile's
  // BetEntry uses `bet-console` + `vault-world-card-<mode>` instead), so a
  // detector keyed only to desktop testids silently misreports 'unknown' on
  // mobile. Use testids confirmed present on BOTH viewports.
  return page.evaluate(() => {
    if (document.querySelector('[data-testid="vault-settled-banner"]')) return 'settled'
    if (document.querySelector('[data-testid="vault-board-worldpicker"]') || document.querySelector('[data-testid="bet-console"]')) return 'bet-entry'
    if (document.querySelector('canvas')) return 'playing'
    return 'unknown'
  })
}

// Generic (viewport-agnostic) cash-out button locator — on wide desktop the
// button lives in the right-side DesktopControlColumn gutter card; on
// mobile/narrow it lives in the `.vault-actionbar` bottom bar. Search
// document-wide instead of assuming a container class.
async function takeProfitButtonInfo(page) {
  return page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => /take profit/i.test(b.textContent || ''))
    const btn = btns.find((b) => b.offsetParent !== null) || btns[0]
    if (!btn) return { found: false }
    const cs = getComputedStyle(btn)
    const spans = [...btn.querySelectorAll('span')]
    const subSpan = spans[spans.length - 1]
    const subCs = subSpan ? getComputedStyle(subSpan) : null
    const r = btn.getBoundingClientRect()
    return {
      found: true,
      disabled: btn.disabled,
      fullText: (btn.textContent || '').trim(),
      subText: subSpan ? subSpan.textContent : null,
      subFontSize: subCs ? subCs.fontSize : null,
      subColor: subCs ? subCs.color : null,
      buttonColor: cs.color,
      buttonBg: cs.backgroundColor,
      buttonRect: { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) },
      viewportHeight: window.innerHeight,
      belowFold: r.bottom > window.innerHeight,
    }
  })
}

async function clickTakeProfitButton(page) {
  return page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => /take profit/i.test(b.textContent || ''))
    const btn = btns.find((b) => b.offsetParent !== null) || btns[0]
    if (!btn) return false
    btn.click()
    return true
  })
}

async function clearStorageAndGoto(page, port) {
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'networkidle0' })
}

async function clickCell(page, col, row, cols, rows) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  if (!box) return false
  const fx = 0.06 + ((col + 0.5) / cols) * 0.88
  const fy = 0.08 + ((row + 0.5) / rows) * 0.80
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
  return true
}

// MutationObserver-based "visible response within N ms" probe. Attach the
// observer BEFORE the input, dispatch the click as soon as the observer is
// listening, resolve with elapsed ms of the FIRST mutation (or -1 if none
// within the budget).
async function tapAndMeasureResponse(page, dispatchFn, budgetMs = 1000) {
  const observerPromise = page.evaluate((budgetMs) => {
    return new Promise((resolve) => {
      const start = performance.now()
      const obs = new MutationObserver(() => {
        obs.disconnect()
        resolve(performance.now() - start)
      })
      obs.observe(document.body, { subtree: true, attributes: true, childList: true, characterData: true })
      setTimeout(() => { obs.disconnect(); resolve(-1) }, budgetMs)
    })
  }, budgetMs)
  await wait(30) // let the observer attach before we fire the real input
  await dispatchFn()
  return observerPromise
}

async function consoleTracker(page) {
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  return errors
}

async function overlayAudit(page) {
  // Any overlay claiming to cover the canvas (position fixed/absolute,
  // z-index high, bounding box intersects vault-canvas-shell) — count how
  // many DISTINCT overlay-like elements are simultaneously visible.
  return page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]')
    const shellRect = shell ? shell.getBoundingClientRect() : null
    const candidates = [
      '[data-testid="vault-hero-overlay"]',
      '[role="dialog"]',
      '[data-testid*="onboarding" i]',
      '[data-testid*="modal" i]',
    ]
    const seen = new Set()
    const visible = []
    for (const sel of candidates) {
      document.querySelectorAll(sel).forEach((el) => {
        if (seen.has(el)) return
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) return
        seen.add(el)
        visible.push({ sel, testid: el.getAttribute('data-testid'), rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } })
      })
    }
    let overlapsCanvas = null
    if (shellRect) {
      overlapsCanvas = visible.map((v) => {
        const noOverlap = v.rect.x + v.rect.w <= shellRect.left || v.rect.x >= shellRect.right ||
          v.rect.y + v.rect.h <= shellRect.top || v.rect.y >= shellRect.bottom
        return { testid: v.testid, overlapsCanvas: !noOverlap }
      })
    }
    return { visibleOverlayCount: visible.length, visible, shellRect: shellRect ? { top: Math.round(shellRect.top), left: Math.round(shellRect.left), bottom: Math.round(shellRect.bottom), right: Math.round(shellRect.right) } : null, overlapsCanvas }
  })
}

async function actionBarBelowCanvas(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]')
    const bar = document.querySelector('.vault-actionbar') || document.querySelector('[data-testid="vault-ctl-cta"]')
    if (!shell || !bar) return { ok: null, reason: 'missing element', shellPresent: !!shell, barPresent: !!bar }
    const sr = shell.getBoundingClientRect()
    const br = bar.getBoundingClientRect()
    return { ok: br.top >= sr.top, shellBottom: Math.round(sr.bottom), barTop: Math.round(br.top), barBottom: Math.round(br.bottom) }
  })
}

const results = { port: PORT, out: OUT, timestamp: new Date().toISOString(), checks: {} }

async function runDesktopFullSweep(browser, viewport, tag) {
  const page = await browser.newPage()
  const consoleErrors = await consoleTracker(page)
  await page.setViewport({ ...viewport, deviceScaleFactor: 1 })
  const R = { viewport, tag }

  // ── CHECK 1: HTTP 200 ──────────────────────────────────────────────
  const resp = await page.goto(`http://localhost:${PORT}/originals/vault`, { waitUntil: 'networkidle0' })
  R.httpStatus = resp ? resp.status() : null

  // ── CHECK 2: first-time landing, fresh storage ──────────────────────
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'networkidle0' })
  // Snapshot IMMEDIATELY (t~0) before any settle/dismiss, to catch a lobby-flash frame
  await page.screenshot({ path: `${OUT}/${tag}-00-coldload-t0.png` })
  const t0 = {
    worldPickerPresent: await present(page, '[data-testid="vault-board-worldpicker"]'),
    wagerPresent: await present(page, '[data-testid="vault-ctl-wager"]'),
    ctaPresent: await present(page, '[data-testid="vault-ctl-cta"]'),
    canvasPresent: await present(page, 'canvas'),
    onboardingOverlayPresent: await page.evaluate(() => !!document.querySelector('[data-testid*="onboarding" i]') || !!document.querySelector('[role="dialog"][aria-label*="onboard" i]')),
    settledBannerPresent: await present(page, '[data-testid="vault-settled-banner"]'),
  }
  R.coldLoad = t0
  // idle-watch 3x1s to be sure nothing auto-advances or a delayed onboarding overlay mounts
  R.coldLoadIdleWatch = []
  for (let i = 0; i < 3; i++) {
    await wait(500)
    R.coldLoadIdleWatch.push({
      tMs: (i + 1) * 500,
      worldPickerPresent: await present(page, '[data-testid="vault-board-worldpicker"]'),
      onboardingOverlayPresent: await page.evaluate(() => !!document.querySelector('[data-testid*="onboarding" i]')),
    })
  }
  await page.screenshot({ path: `${OUT}/${tag}-01-coldload-after1.5s.png` })

  // ── CHECK 5 (partial, bet-entry phase): no-overlay + action-bar position ──
  R.betEntryOverlayAudit = await overlayAudit(page)

  // ── CHECK 9 structural sanity: board anchor + shell widths at bet-entry ──
  R.betEntryBoard = await rect(page, '[data-testid="vault-canvas-shell"]')
  R.betEntryControlCol = await rect(page, '[data-testid="DesktopControlColumn"]')

  // ── CHECK 3 (WIN loop): bluechips 5x5, default world, reveal 1 tile, cash out ──
  await clickText(page, 'bluechips')
  await wait(200)
  const wagerBefore = await text(page, '[data-testid="vault-ctl-wager"]')
  const sentIt1 = await clickText(page, 'send it')
  await wait(700)
  R.win = { pickedWorld: 'bluechips', sentIt: sentIt1, wagerBeforeCommit: wagerBefore }
  R.win.playingPhasePresent = await present(page, '[data-testid="vault-ctl-wager-locked"]')
  await page.screenshot({ path: `${OUT}/${tag}-02-win-playing-t0.png` })

  // CHECK 6: response within 100ms of primary tap (tile reveal)
  const tileResp = await tapAndMeasureResponse(page, () => clickCell(page, 2, 2, 5, 5), 1000)
  R.win.tileTapResponseMs = tileResp
  await wait(300)
  await page.screenshot({ path: `${OUT}/${tag}-03-win-after1reveal.png` })

  // CHECK 6b: cash-out button response (unscoped — on wide desktop the
  // cash-out button lives in the right-side DesktopControlColumn gutter
  // card, NOT inside a `.vault-actionbar` bottom bar or `vault-ctl-cta`).
  const cashoutResp = await tapAndMeasureResponse(page, async () => {
    await clickText(page, 'take profit')
  }, 1000)
  R.win.cashOutTapResponseMs = cashoutResp
  await wait(700)

  // CHECK 3 continued: settled reached?
  R.win.settledReached = await present(page, '[data-testid="vault-settled-banner"]')
  R.win.settledBannerText = await text(page, '[data-testid="vault-settled-banner"]')
  await page.screenshot({ path: `${OUT}/${tag}-04-win-settled.png` })

  // CHECK 8: Glass Box receipt on WIN settle
  R.win.receiptPresent = await present(page, '[data-testid="vault-ctl-receipt"]')
  R.win.receiptText = await text(page, '[data-testid="vault-ctl-receipt"]')

  // CHECK 7 (double-popup): count overlays at settled
  R.win.settledOverlayAudit = await overlayAudit(page)
  R.win.settledActionBarBelowCanvas = await actionBarBelowCanvas(page)

  // ── PROBE 3 — change-wager flow via vault-settled-next stepper ──────
  const wagerBeforeStep = await text(page, '[data-testid="vault-settled-next"]')
  // click "+" inside vault-settled-next twice
  await page.evaluate(() => {
    const wrap = document.querySelector('[data-testid="vault-settled-next"]')
    if (!wrap) return
    const btn = [...wrap.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === '+')
    if (btn) { btn.click(); btn.click() }
  })
  await wait(200)
  const wagerAfterStep = await text(page, '[data-testid="vault-settled-next"]')
  R.win.wagerStepper = { present: !!wagerBeforeStep, before: wagerBeforeStep, after: wagerAfterStep, changed: wagerBeforeStep !== wagerAfterStep }
  await page.screenshot({ path: `${OUT}/${tag}-05-win-settled-wagerstepped.png` })

  // ── PROBE 2 — restart loop ──────────────────────────────────────────
  const restartStart = Date.now()
  const betAgainClicked = await clickText(page, 'bet again') || await clickText(page, 'play again') || await clickText(page, 'another')
  await wait(400)
  const restartMs = Date.now() - restartStart
  R.win.restart = { betAgainClicked, restartMs }
  R.win.postRestartPhase = await phaseKind(page)
  R.win.postRestartOverlayAudit = await overlayAudit(page)
  await page.screenshot({ path: `${OUT}/${tag}-06-win-post-restart.png` })

  // ── CHECK 3 (LOSS loop): shitcoin 7x7 (high mine density), force a rug ──
  // Need to get back to bet-entry if not already there
  if (R.win.postRestartPhase !== 'bet-entry') {
    // settle already advanced into playing (bet-again re-armed same wager) — settle it quickly with a loss instead of separate cold flow
  }
  const nowPhase = await phaseKind(page)
  R.loss = { enteredFrom: nowPhase }
  if (nowPhase === 'bet-entry') {
    await clickText(page, 'shitcoin')
    await wait(200)
    const wagerBeforeLoss = await text(page, '[data-testid="vault-ctl-wager"]')
    R.loss.wagerBeforeCommit = wagerBeforeLoss
    await clickText(page, 'send it')
    await wait(700)
  }
  R.loss.playingPhasePresent = await present(page, '[data-testid="vault-ctl-wager-locked"]')
  await page.screenshot({ path: `${OUT}/${tag}-07-loss-playing-t0.png` })

  // force a rug: click many distinct cells on the 7x7 board until settled
  const cellSeq = [
    [0, 0], [6, 6], [3, 3], [1, 5], [5, 1], [2, 4], [4, 2], [0, 6],
    [6, 0], [1, 1], [5, 5], [2, 2], [4, 4], [3, 0], [0, 3], [6, 3],
    [6, 1], [1, 6], [5, 0], [0, 5], [4, 6], [6, 4], [2, 0], [0, 2],
  ]
  let lossSettled = false
  for (const [c, r] of cellSeq) {
    const kind = await phaseKind(page)
    if (kind === 'settled') { lossSettled = true; break }
    await clickCell(page, c, r, 7, 7)
    await wait(300)
  }
  await wait(600)
  R.loss.settledReached = await present(page, '[data-testid="vault-settled-banner"]')
  R.loss.settledViaMine = lossSettled
  R.loss.settledBannerText = await text(page, '[data-testid="vault-settled-banner"]')
  await page.screenshot({ path: `${OUT}/${tag}-08-loss-settled.png` })
  R.loss.receiptPresent = await present(page, '[data-testid="vault-ctl-receipt"]')
  R.loss.receiptText = await text(page, '[data-testid="vault-ctl-receipt"]')
  R.loss.settledOverlayAudit = await overlayAudit(page)

  // grammar check "N SAFES OPENED" live text (win + loss)
  R.loss.boardCaptionText = await text(page, '[data-testid="vault-settled-board-caption"]')
  R.win.boardCaptionText = null // captured above pre-restart if present; re-check quickly on a fresh 1-reveal win below

  // hero overlay occlusion check (loss) — capture immediately post mine-hit
  R.loss.heroOverlayPresent = await present(page, '[data-testid="vault-hero-overlay"]')

  // ── PROBE 5 — cash-out precondition disclosure (0 reveals state) ────
  // Restart to bet-entry, commit a fresh round, and capture the cash-out
  // button BEFORE any tile is revealed (canCashOut === false state).
  const backToLobbyOk = (await clickText(page, 'bet again')) || (await clickText(page, 'play again'))
  await wait(400)
  if (await phaseKind(page) === 'bet-entry') {
    await clickText(page, 'bluechips')
    await wait(150)
    await clickText(page, 'send it')
    await wait(700)
  }
  R.cashOutPrecondition = await takeProfitButtonInfo(page)
  await page.screenshot({ path: `${OUT}/${tag}-09-cashout-precondition.png` })
  // crop-ish: also grab a tight screenshot of just the button's own container
  const barBox = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => /take profit/i.test(b.textContent || ''))
    const btn = btns.find((b) => b.offsetParent !== null)
    const el = btn ? (btn.closest('[data-testid="DesktopControlColumn"]') || btn.closest('.vault-actionbar') || btn.parentElement) : null
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }
  })
  if (barBox && barBox.width > 0 && barBox.height > 0) {
    await page.screenshot({ path: `${OUT}/${tag}-09b-actionbar-crop.png`, clip: barBox })
  }

  // Tap the disabled cash-out — must NOT silently no-op AND must not advance phase
  const phaseBeforeTap = await phaseKind(page)
  await clickTakeProfitButton(page)
  await wait(300)
  const phaseAfterTap = await phaseKind(page)
  R.cashOutPrecondition.phaseUnchangedAfterTapWhileDisabled = phaseBeforeTap === phaseAfterTap

  // ── CHECK 9: reveal 1 tile then re-check board anchor + shell during 'playing' ──
  await clickCell(page, 2, 2, 5, 5)
  await wait(400)
  R.playingBoard = await rect(page, '[data-testid="vault-canvas-shell"]')
  R.playingActionBarBelowCanvas = await actionBarBelowCanvas(page)
  await page.screenshot({ path: `${OUT}/${tag}-10-playing-post1reveal.png` })

  // settle it as a win for one more grammar check ("1 SAFES OPENED" if exactly 1 reveal)
  await clickTakeProfitButton(page)
  await wait(700)
  R.singleRevealGrammarCheck = {
    boardCaptionText: await text(page, '[data-testid="vault-settled-board-caption"]'),
    settledBannerText: await text(page, '[data-testid="vault-settled-banner"]'),
  }
  await page.screenshot({ path: `${OUT}/${tag}-11-singlereveal-settled.png` })

  R.consoleErrors = consoleErrors
  await page.close()
  return R
}

async function runMobileSweep(browser, viewport, tag) {
  const page = await browser.newPage()
  const consoleErrors = await consoleTracker(page)
  await page.setViewport({ ...viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const R = { viewport, tag }

  await clearStorageAndGoto(page, PORT)
  await page.screenshot({ path: `${OUT}/${tag}-00-coldload.png`, fullPage: true })
  R.coldLoad = {
    // vault-board-worldpicker/vault-ctl-wager/vault-ctl-cta are DESKTOP-ONLY
    // testids (confirmed live) — mobile BetEntry uses `bet-console` +
    // `vault-world-card-<mode>` instead. Check both families.
    worldPickerPresent: (await present(page, '[data-testid="vault-board-worldpicker"]')) || (await present(page, '[data-testid="bet-console"]')),
    wagerPresent: (await present(page, '[data-testid="vault-ctl-wager"]')) || (await present(page, '[data-testid="bet-console"]')),
    ctaPresent: (await present(page, '[data-testid="vault-ctl-cta"]')) || (await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => /send it/i.test(b.textContent || '')))),
    onboardingOverlayPresent: await page.evaluate(() => !!document.querySelector('[data-testid*="onboarding" i]')),
  }

  // no-overlay + action bar check at bet-entry
  R.betEntryOverlayAudit = await overlayAudit(page)

  // WIN flow bluechips: reveal 1, cash out
  await clickText(page, 'bluechips')
  await wait(200)
  await clickText(page, 'send it')
  await wait(800)
  R.playingPhasePresent = (await phaseKind(page)) === 'playing'
  await page.screenshot({ path: `${OUT}/${tag}-01-playing.png`, fullPage: true })

  const tileResp = await tapAndMeasureResponse(page, () => clickCell(page, 2, 2, 5, 5), 1000)
  R.tileTapResponseMs = tileResp
  await wait(400)

  await clickTakeProfitButton(page)
  await wait(700)
  R.settledReached = await present(page, '[data-testid="vault-settled-banner"]')
  R.receiptPresent = (await present(page, '[data-testid="vault-ctl-receipt"]')) || (await page.evaluate(() => /verified/i.test(document.body.innerText) && /view receipt/i.test(document.body.innerText)))
  await page.screenshot({ path: `${OUT}/${tag}-02-settled.png`, fullPage: true })
  R.settledOverlayAudit = await overlayAudit(page)
  R.settledBoardCaptionText = await text(page, '[data-testid="vault-settled-board-caption"]')

  // restart -> fresh commit -> capture 0-reveal cash-out precondition disclosure
  await clickText(page, 'bet again')
  await wait(400)
  if (await phaseKind(page) === 'bet-entry') {
    await clickText(page, 'bluechips')
    await wait(150)
    await clickText(page, 'send it')
    await wait(800)
  }
  R.mobileCashOutPrecondition = await takeProfitButtonInfo(page)
  await page.screenshot({ path: `${OUT}/${tag}-03-cashout-precondition-mobile.png`, fullPage: true })
  const barBox = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => /take profit/i.test(b.textContent || ''))
    const btn = btns.find((b) => b.offsetParent !== null)
    const el = btn ? (btn.closest('.vault-actionbar') || btn.parentElement) : null
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)), width: Math.round(r.width), height: Math.round(r.height) }
  })
  if (barBox && barBox.width > 0 && barBox.height > 0) {
    await page.screenshot({ path: `${OUT}/${tag}-03b-actionbar-crop-mobile.png`, clip: barBox })
  }
  // Tap the disabled cash-out to confirm no silent no-op / no phase advance
  const mobilePhaseBeforeTap = await phaseKind(page)
  await clickTakeProfitButton(page)
  await wait(300)
  R.mobileCashOutPrecondition.phaseUnchangedAfterTapWhileDisabled = mobilePhaseBeforeTap === (await phaseKind(page))

  // reveal one then take profit to get back to settled/bet-entry quickly
  await clickCell(page, 2, 2, 5, 5)
  await wait(400)
  await clickTakeProfitButton(page)
  await wait(700)
  await clickText(page, 'bet again')
  await wait(400)
  if (await phaseKind(page) === 'bet-entry') {
    await clickText(page, 'shitcoin')
    await wait(200)
    await clickText(page, 'send it')
    await wait(800)
  }
  const cellSeq = [[0,0],[6,6],[3,3],[1,5],[5,1],[2,4],[4,2],[0,6],[6,0],[1,1],[5,5],[2,2],[4,4],[3,0],[0,3],[6,3],[6,1],[1,6],[5,0],[0,5]]
  let lossSettled = false
  for (const [c, r] of cellSeq) {
    if (await phaseKind(page) === 'settled') { lossSettled = true; break }
    await clickCell(page, c, r, 7, 7)
    await wait(300)
  }
  await wait(500)
  R.mobileLoss = {
    settledViaMine: lossSettled,
    settledReached: await present(page, '[data-testid="vault-settled-banner"]'),
    receiptPresent: (await present(page, '[data-testid="vault-ctl-receipt"]')) || (await page.evaluate(() => /verified/i.test(document.body.innerText) && /view receipt/i.test(document.body.innerText))),
    boardCaptionText: await text(page, '[data-testid="vault-settled-board-caption"]'),
  }
  await page.screenshot({ path: `${OUT}/${tag}-04-loss-settled-mobile.png`, fullPage: true })

  R.consoleErrors = consoleErrors
  await page.close()
  return R
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=1'],
  })

  results.checks.desktop1440 = await runDesktopFullSweep(browser, { width: 1440, height: 900 }, 'd1440')
  results.checks.desktop1920 = await runDesktopFullSweep(browser, { width: 1920, height: 1080 }, 'd1920')
  results.checks.pixel7 = await runMobileSweep(browser, { width: 412, height: 915 }, 'pixel7')
  results.checks.iphone14pro = await runMobileSweep(browser, { width: 393, height: 852 }, 'iphone14pro')

  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log('DONE. Results written to', `${OUT}/results.json`)
}

run().catch((e) => {
  console.error('FATAL', e)
  fs.writeFileSync(`${OUT}/fatal-error.txt`, String(e && e.stack || e))
  process.exit(1)
})
