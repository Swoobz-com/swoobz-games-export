// gridv2-holdgate-0706.mjs — maker's own live measurement driver for the
// FIXED 5-ZONE CSS-GRID CHASSIS rebuild (VaultExperience.tsx, 2026-07-06).
// Own testids, own selectors — NOT reusing any old gutter-card verifier.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6001'
const OUT = process.argv[3] || `shots-gridv2-${Date.now()}`
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
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }
  }, sel)
}

async function scrollInfo(page) {
  return page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
}

async function betStepperCount(page, scopeSel) {
  return page.evaluate((scopeSel) => {
    const root = scopeSel ? document.querySelector(scopeSel) : document
    if (!root) return { steppers: 0, buttons: 0 }
    const labels = [...root.querySelectorAll('button[aria-label]')].map((b) => b.getAttribute('aria-label') || '')
    const wagerBtns = labels.filter((l) => /wager|bet/i.test(l))
    return { buttons: wagerBtns.length, labels: wagerBtns }
  }, scopeSel)
}

async function controlColScroll(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="DesktopControlColumn"]')
    if (!el) return null
    return { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, hasScroll: el.scrollHeight > el.clientHeight + 1 }
  })
}

const results = { port: PORT, out: OUT, title: null, viewports: {} }

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=1'],
  })
  const page = await browser.newPage()
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
    // dismiss onboarding if present
    await clickText(page, 'got it')
    await clickText(page, 'skip')
    await wait(300)

    const vpResults = {}

    // ── LOBBY ──────────────────────────────────────────────────────────
    vpResults.lobby = {
      phaseText: await phaseText(page),
      mainGrid: await rect(page, '[data-testid="vault-grid-mainGrid"]'),
      topbar: await rect(page, '[data-testid="vault-grid-topbar"]'),
      hud: await rect(page, '[data-testid="DesktopHudRow"]'),
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      control: await rect(page, '[data-testid="DesktopControlColumn"]'),
      status: await rect(page, '[data-testid="vault-grid-status"]'),
      cta: await rect(page, '[data-testid="vault-ctl-cta"]'),
      scroll: await scrollInfo(page),
    }
    await page.screenshot({ path: `${OUT}/${vp.name}-lobby.png` })

    // ── BET ENTRY ──────────────────────────────────────────────────────
    await clickText(page, 'ape in')
    await wait(500)
    vpResults.betEntry = {
      phaseText: await phaseText(page),
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      control: await rect(page, '[data-testid="DesktopControlColumn"]'),
      cta: await rect(page, '[data-testid="vault-ctl-cta"]'),
      worldpicker: await rect(page, '[data-testid="vault-board-worldpicker"]'),
      wager: await rect(page, '[data-testid="vault-ctl-wager"]'),
      wagerSteppers: await betStepperCount(page, '[data-testid="DesktopControlColumn"]'),
      controlScroll: await controlColScroll(page),
      scroll: await scrollInfo(page),
    }
    await page.screenshot({ path: `${OUT}/${vp.name}-betentry.png` })

    // pick bluechips explicitly (default is already bluechips, but be explicit)
    await clickText(page, 'bluechips')
    await wait(200)
    await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
    await wait(900)

    // ── PLAYING ────────────────────────────────────────────────────────
    vpResults.playing = {
      phaseText: await phaseText(page),
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      control: await rect(page, '[data-testid="DesktopControlColumn"]'),
      cta: await rect(page, '[data-testid="vault-ctl-cta"]'),
      worldpicker: await rect(page, '[data-testid="vault-board-worldpicker"]'),
      lockedWager: await rect(page, '[data-testid="vault-ctl-wager-locked"]'),
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

    // Take profit for a fast WIN (bluechips is safe enough to reveal a tile then cash out)
    await clickCell(page, 1, 1, 5, 5)
    await wait(500)
    await clickText(page, 'take profit')
    await wait(900)

    // ── SETTLED ────────────────────────────────────────────────────────
    vpResults.settled = {
      phaseText: await phaseText(page),
      board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      control: await rect(page, '[data-testid="DesktopControlColumn"]'),
      cta: await rect(page, '[data-testid="vault-ctl-cta"]'),
      worldpicker: await rect(page, '[data-testid="vault-board-worldpicker"]'),
      banner: await rect(page, '[data-testid="vault-settled-banner"]'),
      controlScroll: await controlColScroll(page),
      scroll: await scrollInfo(page),
    }
    await page.screenshot({ path: `${OUT}/${vp.name}-settled.png` })

    results.viewports[vp.name] = vpResults
  }

  // ── mobile (390x844) — confirm mobile path untouched, DesktopChassis absent ──
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(700)
  await clickText(page, 'got it')
  await clickText(page, 'skip')
  await wait(300)
  results.mobile = {
    hasDesktopGrid: await page.evaluate(() => !!document.querySelector('[data-testid="vault-grid-mainGrid"]')),
    hasHeaderTape: await page.evaluate(() => !!document.querySelector('[data-testid="vault-canvas-shell"]')),
    scroll: await scrollInfo(page),
  }
  await page.screenshot({ path: `${OUT}/mobile-390x844-lobby.png` })
  await clickText(page, 'ape in')
  await wait(500)
  await page.screenshot({ path: `${OUT}/mobile-390x844-betentry.png` })

  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}

run().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
