// gridv2-polish-verify-0706.mjs — maker's own re-measurement driver for the
// control-column void polish (FIX 1) + INZET-VERGRENDELD copy fix (FIX 2)
// on top of the FIXED 5-ZONE CSS-GRID CHASSIS (VaultExperience.tsx,
// 2026-07-06). Extends gridv2-holdgate-0706.mjs's own selectors/testids —
// adds explicit gap measurements + the new `vault-ctl-trailing` testid.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6201'
const OUT = process.argv[3] || `shots-gridv2-polish-${Date.now()}`
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
  try {
    await el.click()
  } catch {
    return false
  }
  return true
}

async function clickCell(page, col, row, cols, rows) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  if (!box) return
  const fx = 0.05 + ((col + 0.5) / cols) * 0.9
  const fy = 0.06 + ((row + 0.5) / rows) * 0.82
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
}

async function phaseText(page) {
  return page.evaluate(() => document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent || '')
}

async function rect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      left: Math.round(r.left),
      right: Math.round(r.right),
    }
  }, sel)
}

async function textOf(page, sel) {
  return page.evaluate((sel) => document.querySelector(sel)?.textContent?.trim() || null, sel)
}

async function scrollInfo(page) {
  return page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
}

async function controlColScroll(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="DesktopControlColumn"]')
    if (!el) return null
    return {
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      hasScroll: el.scrollHeight > el.clientHeight + 1,
    }
  })
}

function gapBetween(a, b) {
  if (!a || !b) return null
  return Math.round(b.top - a.bottom)
}

const results = { port: PORT, out: OUT, title: null, viewports: {} }

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=1'],
  })
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('CONSOLEERR', m.text())
  })

  results.title = await (async () => {
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    return page.title()
  })()
  console.log('PAGE TITLE:', results.title)

  const viewports = [
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1920x1080', width: 1920, height: 1080 },
  ]

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(700)
    await clickText(page, 'got it')
    await clickText(page, 'skip')
    await wait(300)

    const vpResults = {}

    // ── LOBBY (untouched — confirm no regression) ───────────────────────
    vpResults.lobby = {
      phaseText: await phaseText(page),
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      control: await rect(page, '[data-testid="DesktopControlColumn"]'),
      hudInner: await rect(page, '[data-testid="vault-grid-hud-inner"]'),
      controlScroll: await controlColScroll(page),
      scroll: await scrollInfo(page),
    }
    await page.screenshot({ path: `${OUT}/${vp.name}-lobby.png` })

    // ── BET ENTRY ─────────────────────────────────────────────────────
    await clickText(page, 'ape in')
    await wait(500)
    const beWager = await rect(page, '[data-testid="vault-ctl-wager"]')
    const beCta = await rect(page, '[data-testid="vault-ctl-cta"]')
    vpResults.betEntry = {
      phaseText: await phaseText(page),
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      control: await rect(page, '[data-testid="DesktopControlColumn"]'),
      hudInner: await rect(page, '[data-testid="vault-grid-hud-inner"]'),
      worldpicker: await rect(page, '[data-testid="vault-board-worldpicker"]'),
      wager: beWager,
      cta: beCta,
      gapWagerToCta: gapBetween(beWager, beCta),
      controlScroll: await controlColScroll(page),
      scroll: await scrollInfo(page),
    }
    await page.screenshot({ path: `${OUT}/${vp.name}-betentry.png` })

    await clickText(page, 'bluechips')
    await wait(200)

    // Priming round (no measurement) — settle one round FIRST so
    // `state.history.length > 0` by the time we measure the SECOND round's
    // Playing phase (matching the realistic mid-session look — SESSIE card
    // rendered — instead of the atypical brand-new-session zero-history case).
    await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
    await wait(900)
    await clickCell(page, 1, 1, 5, 5)
    await wait(500)
    await clickText(page, 'take profit')
    await wait(900)
    await clickText(page, 'bet again')
    await wait(900)

    // ── PLAYING (round 2 — history.length===1, SESSIE card present) ────
    const pLocked = await rect(page, '[data-testid="vault-ctl-wager-locked"]')
    const pCta = await rect(page, '[data-testid="vault-ctl-cta"]')
    const pTrailing = await rect(page, '[data-testid="vault-ctl-trailing"]')
    const pPath = await rect(page, '[data-testid="vault-ctl-path"]')
    const pSession = await rect(page, '[data-testid="vault-ctl-session"]')
    vpResults.playing = {
      phaseText: await phaseText(page),
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      control: await rect(page, '[data-testid="DesktopControlColumn"]'),
      hudInner: await rect(page, '[data-testid="vault-grid-hud-inner"]'),
      lockedWager: pLocked,
      lockedWagerLabelText: await textOf(page, '[data-testid="vault-ctl-wager-locked"] span'),
      cta: pCta,
      gapLockedToCta: gapBetween(pLocked, pCta),
      trailing: pTrailing,
      path: pPath,
      session: pSession,
      gapCtaToTrailing: gapBetween(pCta, pTrailing),
      gapCtaToFirstTrailingChild: gapBetween(pCta, pPath || pSession),
      controlScroll: await controlColScroll(page),
      scroll: await scrollInfo(page),
    }
    vpResults.playing.lockedWagerButtonsDisabled = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-ctl-wager-locked"]')
      if (!el) return null
      const btns = [...el.querySelectorAll('button')]
      return { count: btns.length, allDisabled: btns.every((b) => b.disabled) }
    })
    await page.screenshot({ path: `${OUT}/${vp.name}-playing.png` })

    await clickCell(page, 1, 1, 5, 5)
    await wait(500)
    await clickText(page, 'take profit')
    await wait(900)

    // ── SETTLED ───────────────────────────────────────────────────────
    const sCta = await rect(page, '[data-testid="vault-ctl-cta"]')
    const sTrailing = await rect(page, '[data-testid="vault-ctl-trailing"]')
    const sSession = await rect(page, '[data-testid="vault-ctl-session"]')
    const sReceipt = await rect(page, '[data-testid="vault-ctl-receipt"]')
    vpResults.settled = {
      phaseText: await phaseText(page),
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      control: await rect(page, '[data-testid="DesktopControlColumn"]'),
      hudInner: await rect(page, '[data-testid="vault-settled-banner"]'),
      cta: sCta,
      trailing: sTrailing,
      session: sSession,
      receipt: sReceipt,
      gapCtaToSession: gapBetween(sCta, sSession),
      gapSessionToReceipt: gapBetween(sSession, sReceipt),
      gapCtaToTrailing: gapBetween(sCta, sTrailing),
      controlScroll: await controlColScroll(page),
      scroll: await scrollInfo(page),
    }
    await page.screenshot({ path: `${OUT}/${vp.name}-settled.png` })

    results.viewports[vp.name] = vpResults
  }

  // ── mobile (390x844) — confirm mobile path untouched ────────────────
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(700)
  await clickText(page, 'got it')
  await clickText(page, 'skip')
  await wait(300)
  results.mobile = {
    hasDesktopGrid: await page.evaluate(() => !!document.querySelector('[data-testid="vault-grid-mainGrid"]')),
    scroll: await scrollInfo(page),
  }
  await page.screenshot({ path: `${OUT}/mobile-390x844-lobby.png` })

  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}

run().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
