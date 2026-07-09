// rgc5-lobbyremoval-audit-0706.mjs — structural RG-C5/RG-C3 re-verify of the
// "remove lobby splash, land directly on bet-entry" diff. Confirms cold-load
// idles on PICK YOUR WORLD (no auto-bet, no auto-advance into playing) and
// that the manual world-pick -> wager -> SEND IT flow still works.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5213'
const OUT = process.argv[3] || `shots-rgc5-lobbyremoval-${Date.now()}`
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

async function pageText(page) {
  return page.evaluate(() => document.body.innerText)
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=1'],
  })
  const page = await browser.newPage()
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push('PAGE ERROR: ' + e.message))
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

  const results = { port: PORT, out: OUT }

  // ─── COLD LOAD ─────────────────────────────────────────────────────
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(500)
  await clickText(page, 'got it')
  await clickText(page, 'skip')
  await wait(300)
  await page.screenshot({ path: `${OUT}/00-coldload.png` })

  results.coldLoad = {
    worldPickerPresent: await present(page, '[data-testid="vault-board-worldpicker"]'),
    wagerPanelPresent: await present(page, '[data-testid="vault-ctl-wager"]'),
    ctaPresent: await present(page, '[data-testid="vault-ctl-cta"]'),
    canvasPresent: await present(page, 'canvas'),
  }
  const coldLoadText = await pageText(page)
  results.coldLoad.hasPickYourWorldCopy = /PICK YOUR WORLD|APE IN\. DODGE THE RUG\./i.test(coldLoadText)
  results.coldLoad.hasSendItCta = /SEND IT/i.test(coldLoadText)

  // ─── IDLE WATCH — sit for 6s with ZERO interaction, re-check every 1s ──
  // If any timer/effect auto-advances the phase (into 'playing' or beyond)
  // without a click, the worldpicker/wager surfaces will disappear and a
  // canvas reveal state would begin. We snapshot at t=0,2,4,6s.
  results.idleWatch = []
  for (let i = 0; i < 3; i++) {
    await wait(2000)
    const snap = {
      tMs: (i + 1) * 2000,
      worldPickerPresent: await present(page, '[data-testid="vault-board-worldpicker"]'),
      wagerPanelPresent: await present(page, '[data-testid="vault-ctl-wager"]'),
      ctaPresent: await present(page, '[data-testid="vault-ctl-cta"]'),
    }
    results.idleWatch.push(snap)
  }
  await page.screenshot({ path: `${OUT}/01-after-idle-watch.png` })

  // ─── Balance should be UNCHANGED (no bet was silently placed) ─────────
  const balanceText1 = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-corner-world"]')
    return el ? el.getAttribute('aria-label') : null
  })
  results.coldLoad.worldGlanceAriaLabel = balanceText1

  // ─── MANUAL FLOW: pick a world, confirm CTA still requires a click ────
  const pickedWorld = await clickText(page, 'bluechips')
  await wait(200)
  await page.screenshot({ path: `${OUT}/02-world-picked.png` })
  results.manualFlow = { pickedWorld }

  // Confirm we are STILL on bet-entry after picking a world (no auto-advance
  // from a mode pick alone).
  results.manualFlow.stillBetEntryAfterPick = await present(page, '[data-testid="vault-board-worldpicker"]')

  // Now press SEND IT explicitly.
  const sentIt = await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
  await wait(600)
  results.manualFlow.sentIt = sentIt
  results.manualFlow.canvasPresentAfterSendIt = await present(page, 'canvas')
  results.manualFlow.worldPickerGoneAfterSendIt = !(await present(page, '[data-testid="vault-board-worldpicker"]'))
  await page.screenshot({ path: `${OUT}/03-playing.png` })

  // ─── VaultCornerChrome world-glance badge — confirm non-interactive ───
  const worldGlanceHasOnClick = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-corner-world"]')
    if (!el) return null
    return el.tagName.toLowerCase() === 'button' || el.getAttribute('role') === 'button'
  })
  results.worldGlanceIsButtonLike = worldGlanceHasOnClick

  results.consoleErrors = consoleErrors
  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}

run().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
