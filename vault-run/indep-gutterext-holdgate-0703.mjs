// INDEPENDENT (fresh, own-driver) verification of the RoR vault GUTTER
// MIGRATION ROUND 4/4 (Lobby+Playing+Settled bottom bars -> gutter cards).
// Written from scratch by swoobz-visual-regression-qa — does NOT import or
// reuse gutterext0703-verify.mjs (the maker's own driver). Own selectors
// (structural DOM-sibling walk for the panel, hand-derived computeGridLayout
// re-implementation for tile clicks), own arithmetic, own screenshots.
//
// Usage: node indep-gutterext-holdgate-0703.mjs <port>
import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5192'
const URL = `http://localhost:${PORT}/`
const OUT = path.join(process.cwd(), 'shots-indepgutterext0703')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const results = {}
const log = (k, v) => {
  results[k] = v
  console.log(`\n=== ${k} ===`)
  console.log(JSON.stringify(v, null, 2))
}

// ── Own click helper (text search, NOT copied from any existing script) ──
async function clickByText(page, txt) {
  const handle = await page.evaluateHandle((txt) => {
    const nodes = [...document.querySelectorAll('button')]
    const lower = txt.toLowerCase()
    return (
      nodes.find((n) => n.offsetParent !== null && n.textContent.trim().toLowerCase() === lower) ||
      nodes.find((n) => n.offsetParent !== null && n.textContent.toLowerCase().includes(lower))
    )
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

async function waitForText(page, txt, timeout = 5000) {
  await page.waitForFunction(
    (txt) => document.body.innerText.toLowerCase().includes(txt.toLowerCase()),
    { timeout },
    txt,
  )
}

// ── Own re-derivation of computeGridLayout (VaultGridCanvas.tsx:842-862),
// hand-copied from the SOURCE FUNCTION (not from any driver script) so tile
// clicks land deterministically regardless of viewport aspect. gridSize=5
// confirmed via vaultMath.ts mirrorRoundtripCheck (totalTiles:25, mineCount:3
// = bluechips default). ──
function tileCenter(W, H, gridSize, idx) {
  const wide = W / H > 1.2
  const topReserved = H * (wide ? 0.12 : 0.15)
  const bottomReserved = H * (wide ? 0.14 : 0.18)
  const sideFrac = 0.08
  const safeW = W * (1 - sideFrac * 2)
  const safeH = (H - topReserved - bottomReserved) * 0.96
  const available = Math.min(safeW, safeH)
  const gap = Math.max(6, available * 0.026)
  const tile = (available - gap * (gridSize - 1)) / gridSize
  const full = tile * gridSize + gap * (gridSize - 1)
  const x = (W - full) / 2
  const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2
  const y = bandCenterY - full / 2
  const r = Math.floor(idx / gridSize)
  const c = idx % gridSize
  return { cx: x + c * (tile + gap) + tile / 2, cy: y + r * (tile + gap) + tile / 2 }
}

async function clickTile(page, idx) {
  const canvasRect = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]')
    const canvas = shell ? shell.querySelector('canvas') : null
    if (!canvas) return null
    const r = canvas.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  })
  if (!canvasRect) throw new Error('canvas not found')
  const { cx, cy } = tileCenter(canvasRect.width, canvasRect.height, 5, idx)
  await page.mouse.click(canvasRect.left + cx, canvasRect.top + cy)
}

// ── Own DOM probes (structural, not testid-string-copied from maker) ──
async function panelInfo(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]')
    if (!shell) return { shellFound: false }
    const panel = shell.nextElementSibling
    if (!panel) return { shellFound: true, panelFound: false }
    const cs = getComputedStyle(panel)
    return {
      shellFound: true,
      panelFound: true,
      panelTag: panel.tagName,
      childElementCount: panel.childElementCount,
      outerHTMLLength: panel.outerHTML.length,
      display: cs.display,
      visibility: cs.visibility,
    }
  })
}

async function overflowInfo(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    delta: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
}

async function rectOf(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
  }, sel)
}

async function chassisRects(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]')
    if (!shell) return null
    const cabinet = shell.parentElement
    const pageDiv = cabinet.parentElement
    const header = pageDiv.children[0]
    const footer = cabinet.nextElementSibling
    const canvas = shell.querySelector('canvas')
    const vh = window.innerHeight
    const hR = header.getBoundingClientRect()
    const cR = cabinet.getBoundingClientRect()
    const fR = footer ? footer.getBoundingClientRect() : null
    const shR = shell.getBoundingClientRect()
    const cvR = canvas ? canvas.getBoundingClientRect() : null
    return {
      viewportHeight: vh,
      headerTop: hR.top,
      headerBottom: hR.bottom,
      cabinetTop: cR.top,
      cabinetBottom: cR.bottom,
      footerTop: fR ? fR.top : null,
      footerBottom: fR ? fR.bottom : null,
      shellHeight: shR.height,
      canvasCssHeight: cvR ? cvR.height : null,
      topGap: hR.top,
      bottomGap: fR ? vh - fR.bottom : null,
    }
  })
}

async function testidPresence(page, ids) {
  return page.evaluate((ids) => {
    const out = {}
    for (const id of ids) out[id] = !!document.querySelector(`[data-testid="${id}"]`)
    return out
  }, ids)
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
  try {
    // ══════════════════════════════════════════════════════════════════
    // SESSION 1 — LOBBY: cycle 3 desktop viewports (no reload, SAME
    // React session) for height-invariance, then shrink to mobile.
    // ══════════════════════════════════════════════════════════════════
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto(URL, { waitUntil: 'networkidle0' })
    await waitForText(page, 'ape in')

    const desktopViewports = [
      { w: 1440, h: 900, tag: '1440x900' },
      { w: 1440, h: 1920, tag: '1440x1920' },
      { w: 1920, h: 1080, tag: '1920x1080' },
    ]

    const lobbyCardSel = {
      left: '[data-testid="vault-lobby-left"]',
      hero: '[data-testid="vault-lobby-hero"]',
      right: '[data-testid="vault-lobby-right"]',
      apein: '[data-testid="vault-lobby-apein"]',
      cardA: '[data-testid="vault-gutter-card-a"]',
      cardAMirror: '[data-testid="vault-gutter-card-a-right"]',
      gutterLeft: '[data-testid="vault-gutter-left"]',
      gutterRight: '[data-testid="vault-gutter-right"]',
    }

    const lobbyByViewport = {}
    for (const vp of desktopViewports) {
      await page.setViewport({ width: vp.w, height: vp.h })
      await wait(250)
      const panel = await panelInfo(page)
      const overflow = await overflowInfo(page)
      const rects = {}
      for (const [k, sel] of Object.entries(lobbyCardSel)) rects[k] = await rectOf(page, sel)
      lobbyByViewport[vp.tag] = { panel, overflow, rects }
    }
    log('LOBBY_by_viewport', lobbyByViewport)

    // crops at 1440x900 for see-through view
    await page.setViewport({ width: 1440, height: 900 })
    await wait(200)
    await page.screenshot({ path: path.join(OUT, 'lobby-1440x900-full.png') })
    const lb1440 = lobbyByViewport['1440x900'].rects
    if (lb1440.left) {
      await page.screenshot({
        path: path.join(OUT, 'lobby-1440x900-left-gutter-crop.png'),
        clip: { x: 0, y: 0, width: Math.min(400, 1440), height: 900 },
      })
    }
    if (lb1440.right) {
      await page.screenshot({
        path: path.join(OUT, 'lobby-1440x900-right-gutter-crop.png'),
        clip: { x: 1040, y: 0, width: 400, height: 900 },
      })
    }
    await page.screenshot({ path: path.join(OUT, 'lobby-1440x1920-full.png'), clip: undefined })

    // mobile shrink, same session — Lobby
    await page.setViewport({ width: 390, height: 844 })
    await wait(300)
    const lobbyMobile = await testidPresence(page, [
      'vault-controlcard',
      'vault-lobby-left',
      'vault-lobby-right',
      'vault-lobby-hero',
      'vault-lobby-apein',
      'vault-gutter-left',
      'vault-gutter-right',
    ])
    const lobbyMobileText = await page.evaluate(() => document.body.innerText.toLowerCase())
    log('LOBBY_mobile_390', {
      testids: lobbyMobile,
      hasApeInText: lobbyMobileText.includes('ape in'),
    })
    await page.screenshot({ path: path.join(OUT, 'lobby-mobile-390.png') })

    // back to desktop, open bet-entry
    await page.setViewport({ width: 1440, height: 900 })
    await wait(250)
    await clickByText(page, 'ape in')
    await waitForText(page, 'send it')

    const betEntryPanelDesktop = await panelInfo(page)
    log('BETENTRY_panel_desktop_sanity', betEntryPanelDesktop)

    await page.setViewport({ width: 390, height: 844 })
    await wait(300)
    const betEntryMobileText = await page.evaluate(() => document.body.innerText)
    const betEntryMobile = await testidPresence(page, [
      'vault-betentry-yourbet',
      'vault-betentry-confirm',
      'vault-betentry-world',
      'vault-betentry-left',
      'vault-betentry-right',
    ])
    log('BETENTRY_mobile_390', {
      testids: betEntryMobile,
      hasSetYourPlay: betEntryMobileText.includes('SET YOUR PLAY'),
      hasSendIt: betEntryMobileText.toUpperCase().includes('SEND IT'),
    })
    await page.screenshot({ path: path.join(OUT, 'betentry-mobile-390.png') })

    // ══════════════════════════════════════════════════════════════════
    // Commit round 1 bet, drive to PLAYING (mid-round ~50%), measure at
    // 3 desktop viewports, then FORCE settle. This round is used for the
    // active/mid-round + first settled sample (whichever class it lands
    // on — reported honestly either way).
    // ══════════════════════════════════════════════════════════════════
    await page.setViewport({ width: 1440, height: 900 })
    await wait(250)
    await clickByText(page, 'send it')
    await waitForText(page, 'pump', 6000).catch(() => {})
    await wait(400)

    // reveal ~half of the 22 safe tiles (11), stop early if we bust
    let round1Class = 'unknown'
    let revealedCount = 0
    for (let i = 0; i < 25 && revealedCount < 11; i++) {
      await clickTile(page, i)
      await wait(180)
      const bodyText = await page.evaluate(() => document.body.innerText)
      if (bodyText.includes('RUGGED') || bodyText.toLowerCase().includes('settling')) {
        round1Class = 'rug'
        break
      }
      revealedCount++
    }
    if (round1Class === 'unknown') round1Class = 'still-playing'
    log('ROUND1_reveal_progress', { revealedCount, round1Class })

    if (round1Class === 'still-playing') {
      // measure PLAYING mid-round at 3 desktop viewports
      const playingCardSel = {
        left: '[data-testid="vault-playing-left"]',
        status: '[data-testid="vault-playing-status"]',
        right: '[data-testid="vault-playing-right"]',
        actions: '[data-testid="vault-playing-actions"]',
        cardA: '[data-testid="vault-gutter-card-a"]',
        cardAMirror: '[data-testid="vault-gutter-card-a-right"]',
      }
      const playingByViewport = {}
      for (const vp of desktopViewports) {
        await page.setViewport({ width: vp.w, height: vp.h })
        await wait(250)
        const panel = await panelInfo(page)
        const overflow = await overflowInfo(page)
        const rects = {}
        for (const [k, sel] of Object.entries(playingCardSel)) rects[k] = await rectOf(page, sel)
        playingByViewport[vp.tag] = { panel, overflow, rects }
      }
      log('PLAYING_by_viewport', playingByViewport)

      await page.setViewport({ width: 1440, height: 900 })
      await wait(200)
      await page.screenshot({ path: path.join(OUT, 'playing-1440x900-full.png') })
      await page.screenshot({
        path: path.join(OUT, 'playing-1440x900-left-gutter-crop.png'),
        clip: { x: 0, y: 0, width: 400, height: 900 },
      })
      await page.screenshot({
        path: path.join(OUT, 'playing-1440x900-right-gutter-crop.png'),
        clip: { x: 1040, y: 0, width: 400, height: 900 },
      })

      await page.setViewport({ width: 390, height: 844 })
      await wait(300)
      const playingMobile = await testidPresence(page, [
        'vault-playing-left',
        'vault-playing-right',
        'vault-playing-status',
        'vault-playing-actions',
      ])
      const playingMobileHasActionBar = await page.evaluate(
        () => !!document.querySelector('.vault-actionbar') || document.body.innerText.toLowerCase().includes('take profit'),
      )
      log('PLAYING_mobile_390', { testids: playingMobile, hasOriginalActionBar: playingMobileHasActionBar })
      await page.screenshot({ path: path.join(OUT, 'playing-mobile-390.png') })

      // cash out -> settled WIN
      await page.setViewport({ width: 1440, height: 900 })
      await wait(250)
      await clickByText(page, 'take profit')
      await waitForText(page, 'bet again', 6000)
      await wait(400)
      round1Class = 'settled-win'
    }

    // measure whatever round1 settled into
    const settledCardSel = {
      left: '[data-testid="vault-settled-left"]',
      result: '[data-testid="vault-settled-result"]',
      meta: '[data-testid="vault-settled-meta"]',
      rightNew: '[data-testid="vault-settled-right-new"]',
      nextbet: '[data-testid="vault-settled-nextbet"]',
      betagain: '[data-testid="vault-settled-betagain"]',
      cardA: '[data-testid="vault-gutter-card-a"]',
      cardAMirror: '[data-testid="vault-gutter-card-a-right"]',
      gutterRight: '[data-testid="vault-gutter-right"]',
      cardB: '[data-testid="vault-gutter-card-b"]',
      cardC: '[data-testid="vault-gutter-card-c"]',
    }
    const round1Outcome = await page.evaluate(() => document.body.innerText.includes('BUST') ? 'rug' : 'win')
    const settled1ByViewport = {}
    for (const vp of desktopViewports) {
      await page.setViewport({ width: vp.w, height: vp.h })
      await wait(250)
      const panel = await panelInfo(page)
      const overflow = await overflowInfo(page)
      const rects = {}
      for (const [k, sel] of Object.entries(settledCardSel)) rects[k] = await rectOf(page, sel)
      settled1ByViewport[vp.tag] = { panel, overflow, rects }
    }
    log(`SETTLED_ROUND1_${round1Outcome}_by_viewport`, settled1ByViewport)

    await page.setViewport({ width: 1440, height: 900 })
    await wait(200)
    await page.screenshot({ path: path.join(OUT, `settled-round1-${round1Outcome}-1440x900-full.png`) })
    await page.screenshot({
      path: path.join(OUT, `settled-round1-${round1Outcome}-1440x900-left-gutter-crop.png`),
      clip: { x: 0, y: 0, width: 400, height: 900 },
    })
    await page.screenshot({
      path: path.join(OUT, `settled-round1-${round1Outcome}-1440x900-right-gutter-crop.png`),
      clip: { x: 1040, y: 0, width: 400, height: 900 },
    })
    await page.setViewport({ width: 1440, height: 1920 })
    await wait(300)
    await page.screenshot({ path: path.join(OUT, `settled-round1-${round1Outcome}-1440x1920-full.png`) })
    const chassisSettled1_1440x1920 = await chassisRects(page)
    log('CHASSIS_settled_round1_1440x1920', chassisSettled1_1440x1920)

    await page.setViewport({ width: 390, height: 844 })
    await wait(300)
    const settledMobile1 = await testidPresence(page, [
      'vault-settledpanel',
      'vault-settled-left',
      'vault-settled-right-new',
      'vault-settled-result',
      'vault-settled-betagain',
    ])
    log('SETTLED_ROUND1_mobile_390', settledMobile1)
    await page.screenshot({ path: path.join(OUT, `settled-round1-${round1Outcome}-mobile-390.png`) })

    // ══════════════════════════════════════════════════════════════════
    // ROUND 2 — force a RUG deterministically (or WIN if round1 was rug)
    // by clicking every tile position in order until phase leaves
    // 'playing'. With 25 tiles / 3 mines / 22 safe, this MUST end in a
    // mine hit within <=25 distinct clicks. Also gives history.length=2
    // -> tests Card B/C.
    // ══════════════════════════════════════════════════════════════════
    await page.setViewport({ width: 1440, height: 900 })
    await wait(250)
    await clickByText(page, 'bet again')
    await waitForText(page, 'pump', 6000).catch(() => {})
    await wait(400)

    let round2HitMine = false
    let mineHitCapture = null
    for (let i = 0; i < 25; i++) {
      await clickTile(page, i)
      // poll fast right after each click to try to CATCH the transient
      // mine-hit phase live (760ms window) as the letterbox control state
      for (let poll = 0; poll < 6; poll++) {
        await wait(90)
        const txt = await page.evaluate(() => document.body.innerText)
        if (txt.includes('RUGGED') && !mineHitCapture) {
          mineHitCapture = await chassisRects(page)
          await page.screenshot({ path: path.join(OUT, 'mine-hit-caught-1440x900.png') })
        }
        if (txt.toLowerCase().includes('bet again')) {
          round2HitMine = true
          break
        }
      }
      if (round2HitMine) break
    }
    log('ROUND2_force_result', { round2HitMine, caughtMineHitFrame: !!mineHitCapture })
    if (mineHitCapture) log('CHASSIS_mine_hit_live_capture_1440x900', mineHitCapture)

    await wait(600) // let verifyMineBitmap resolve -> verifyState 'matched'
    const round2Outcome = await page.evaluate(() => (document.body.innerText.includes('BUST') ? 'rug' : 'win'))
    const historyAndVerify = await page.evaluate(() => {
      const b = document.querySelector('[data-testid="vault-gutter-card-b"]')
      const c = document.querySelector('[data-testid="vault-gutter-card-c"]')
      return { cardBPresent: !!b, cardCPresent: !!c }
    })
    log('ROUND2_history_verify_gate', { round2Outcome, ...historyAndVerify })

    const settled2ByViewport = {}
    for (const vp of desktopViewports) {
      await page.setViewport({ width: vp.w, height: vp.h })
      await wait(250)
      const panel = await panelInfo(page)
      const overflow = await overflowInfo(page)
      const rects = {}
      for (const [k, sel] of Object.entries(settledCardSel)) rects[k] = await rectOf(page, sel)
      settled2ByViewport[vp.tag] = { panel, overflow, rects }
    }
    log(`SETTLED_ROUND2_${round2Outcome}_by_viewport`, settled2ByViewport)

    await page.setViewport({ width: 1440, height: 900 })
    await wait(200)
    await page.screenshot({ path: path.join(OUT, `settled-round2-${round2Outcome}-1440x900-full.png`) })
    await page.screenshot({
      path: path.join(OUT, `settled-round2-${round2Outcome}-1440x900-left-gutter-crop.png`),
      clip: { x: 0, y: 0, width: 400, height: 900 },
    })
    await page.screenshot({
      path: path.join(OUT, `settled-round2-${round2Outcome}-1440x900-right-gutter-crop.png`),
      clip: { x: 1040, y: 0, width: 400, height: 900 },
    })

    await page.setViewport({ width: 1440, height: 1920 })
    await wait(300)
    await page.screenshot({ path: path.join(OUT, `settled-round2-${round2Outcome}-1440x1920-full.png`) })
    const chassisSettled2_1440x1920 = await chassisRects(page)
    log('CHASSIS_settled_round2_1440x1920', chassisSettled2_1440x1920)

    await page.setViewport({ width: 1920, height: 1080 })
    await wait(300)
    const chassisSettled2_1920x1080 = await chassisRects(page)
    log('CHASSIS_settled_round2_1920x1080', chassisSettled2_1920x1080)

    await page.setViewport({ width: 390, height: 844 })
    await wait(300)
    const settledMobile2 = await testidPresence(page, [
      'vault-settledpanel',
      'vault-settled-left',
      'vault-settled-right-new',
    ])
    log('SETTLED_ROUND2_mobile_390', settledMobile2)
    await page.screenshot({ path: path.join(OUT, `settled-round2-${round2Outcome}-mobile-390.png`) })

    // ══════════════════════════════════════════════════════════════════
    // LETTERBOX CONTROL — bet-entry (round-3 change, NOT this final
    // round) at 1440x1920, for cross-phase comparison.
    // ══════════════════════════════════════════════════════════════════
    await page.setViewport({ width: 1440, height: 900 })
    await wait(200)
    await clickByText(page, 'bet again')
    await waitForText(page, 'change mode', 4000).catch(() => {})
    // acknowledge settlement to get back to lobby/bet-entry for a clean control read
    await clickByText(page, 'change mode').catch(() => {})
    await wait(300)
    await clickByText(page, 'ape in').catch(() => {})
    await waitForText(page, 'send it', 4000).catch(() => {})
    await page.setViewport({ width: 1440, height: 1920 })
    await wait(300)
    const chassisBetEntry_1440x1920 = await chassisRects(page)
    log('CHASSIS_betentry_control_1440x1920', chassisBetEntry_1440x1920)
  } finally {
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
    await browser.close()
  }
}

main().catch((e) => {
  console.error('DRIVER FAILED', e)
  fs.writeFileSync(path.join(OUT, 'results-partial-error.json'), JSON.stringify({ ...results, error: String(e) }, null, 2))
  process.exit(1)
})
