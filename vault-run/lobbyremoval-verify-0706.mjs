// lobbyremoval-verify-0706.mjs — live verification for the LOBBY-SPLASH
// REMOVAL (Tim, 2026-07-06): game must open DIRECTLY on bet-entry ("PICK YOUR
// WORLD"), no extra "ape in" tap, explainer copy relocated + visible, CTA
// stays above the fold at 1440x900 + 1920x1080, full loop still works, mobile
// intro visible via BetConsole eyebrow/hint.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6402'
const OUT = process.argv[3] || 'shots-lobbyremoval-verify-0706'
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

function textOf(page, sel) {
  return page.evaluate((sel) => document.querySelector(sel)?.textContent ?? null, sel)
}

function existsAny(page, texts) {
  return page.evaluate((texts) => {
    const all = [...document.querySelectorAll('button,[role=button],a,span,div')]
    const norm = (e) => (e.textContent || '').trim().toLowerCase()
    return texts.some((t) => all.some((e) => norm(e) === t.toLowerCase()))
  }, texts)
}

function rect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }
  }, sel)
}

async function clickCell(page, col, row, cols, rows) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  if (!box) return false
  const fx = 0.05 + ((col + 0.5) / cols) * 0.9
  const fy = 0.06 + ((row + 0.5) / rows) * 0.82
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
  return true
}

const results = { port: PORT, checks: {} }

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=1'],
  })
  const page = await browser.newPage()
  const consoleErrors = []
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push('CONSOLEERR: ' + m.text())
  })

  // ── CHECK 1+2+3: desktop 1440x900 cold load ──────────────────────────────
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(700)
  await page.screenshot({ path: `${OUT}/1-coldload-1440x900.png` })

  const topbarText1440 = await textOf(page, '[data-testid="vault-grid-topbar"]')
  const hasApeIn1440 = await existsAny(page, ['ape in', 'ape in →'])
  const worldPicker1440 = await rect(page, '[data-testid="vault-board-worldpicker"]')
  const introRow1440 = await rect(page, '[data-testid="vault-ctl-intro"]')
  const introText1440 = await textOf(page, '[data-testid="vault-ctl-intro"]')
  const cta1440 = await rect(page, '[data-testid="vault-ctl-cta"]')

  results.checks.desktop1440x900 = {
    topbarText: topbarText1440,
    landsOnBetEntry: /BET ENTRY/i.test(topbarText1440 || ''),
    hasApeInSplashCta: hasApeIn1440,
    worldPickerVisible: !!worldPicker1440,
    introRowVisible: !!introRow1440,
    introText: introText1440,
    ctaRect: cta1440,
    ctaAboveFold: cta1440 ? cta1440.bottom <= 900 : null,
    viewportHeight: 900,
  }

  // ── CHECK 3b: desktop 1920x1080 ──────────────────────────────────────────
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(700)
  await page.screenshot({ path: `${OUT}/2-coldload-1920x1080.png` })
  const topbarText1920 = await textOf(page, '[data-testid="vault-grid-topbar"]')
  const cta1920 = await rect(page, '[data-testid="vault-ctl-cta"]')
  const introText1920 = await textOf(page, '[data-testid="vault-ctl-intro"]')
  results.checks.desktop1920x1080 = {
    topbarText: topbarText1920,
    landsOnBetEntry: /BET ENTRY/i.test(topbarText1920 || ''),
    introText: introText1920,
    ctaRect: cta1920,
    ctaAboveFold: cta1920 ? cta1920.bottom <= 1080 : null,
    viewportHeight: 1080,
  }

  // ── CHECK 4: full loop at 1440x900 (land -> pick world -> bet -> SEND IT
  //    -> play -> settle -> bet again -> back to bet-entry, not lobby) ─────
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(700)
  const landedDirectly = /BET ENTRY/i.test((await textOf(page, '[data-testid="vault-grid-topbar"]')) || '')
  await clickText(page, 'bluechips')
  await wait(200)
  const clickedSendIt = await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
  await wait(900)
  const phaseAfterSendIt = await textOf(page, '[data-testid="vault-grid-topbar"]')
  await clickCell(page, 1, 1, 5, 5)
  await wait(500)
  await clickText(page, 'take profit')
  await wait(900)
  const phaseAfterCashout = await textOf(page, '[data-testid="vault-grid-topbar"]')
  await page.screenshot({ path: `${OUT}/3-settled-1440x900.png` })
  // "BET AGAIN" is a PRE-EXISTING one-click re-bet (placeBet() straight into
  // `playing`, unrelated to this change) — test it separately from the
  // acknowledgeSettlement("new setup") path, which is the actual
  // settled -> bet-entry loop this task must verify still works.
  const clickedBetAgain = await clickText(page, 'bet again')
  await wait(900)
  const phaseAfterBetAgain = await textOf(page, '[data-testid="vault-grid-topbar"]')
  await page.screenshot({ path: `${OUT}/4-betagain-quick-rebet-1440x900.png` })
  // Settle this SECOND round too (whatever the outcome) so we can reach
  // settled again and test "new setup". cashOut requires >=1 revealed tile.
  await clickCell(page, 2, 2, 5, 5)
  await wait(500)
  await clickText(page, 'take profit')
  await wait(900)
  const phaseAfterSecondSettle = await textOf(page, '[data-testid="vault-grid-topbar"]')
  const clickedNewSetup = await clickText(page, 'new setup')
  await wait(900)
  const phaseAfterNewSetup = await textOf(page, '[data-testid="vault-grid-topbar"]')
  await page.screenshot({ path: `${OUT}/5-newsetup-backto-betentry-1440x900.png` })

  results.checks.fullLoop = {
    landedDirectlyOnBetEntry: landedDirectly,
    clickedSendIt,
    phaseAfterSendIt,
    phaseAfterCashout,
    settledReached: /SETTLED/i.test(phaseAfterCashout || ''),
    clickedBetAgain,
    phaseAfterBetAgain,
    betAgainStartsNewRoundImmediately_preExistingBehaviorNotAffectedByThisChange: /PUMPING/i.test(phaseAfterBetAgain || ''),
    phaseAfterSecondSettle,
    clickedNewSetup,
    phaseAfterNewSetup,
    newSetupReturnsToBetEntry: /BET ENTRY/i.test(phaseAfterNewSetup || ''),
  }

  // ── CHECK 5: mobile Pixel 7 (390x844 per task ask; also try 412x915) ────
  for (const dev of [{ name: 'pixel7-390x844', w: 390, h: 844 }, { name: 'pixel7-412x915', w: 412, h: 915 }]) {
    await page.setViewport({ width: dev.w, height: dev.h, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(700)
    await page.screenshot({ path: `${OUT}/5-mobile-${dev.name}-coldload.png`, fullPage: true })
    const consoleEyebrow = await textOf(page, '[data-testid="bet-console"]')
    const hasApeInMobile = await existsAny(page, ['ape in', 'ape in →'])
    // `vault-board-worldpicker` is the DESKTOP-only wrapper testid
    // (BetEntryControlColumn); mobile renders <ModeSelector> as a direct
    // BetConsole child with no such wrapper — check by visible text instead.
    const introVisibleMobile = (consoleEyebrow || '').includes('APE IN. DODGE THE RUG.')
    const worldPickerTextVisibleMobile = (consoleEyebrow || '').includes('PICK YOUR WORLD')
    results.checks[`mobile_${dev.name}`] = {
      betConsoleText: consoleEyebrow,
      hasApeInSplashCta: hasApeInMobile,
      introVisibleMobile,
      worldPickerTextVisibleMobile,
    }

    // full loop on mobile too
    await clickText(page, 'bluechips')
    await wait(200)
    const sentMobile = await clickText(page, 'send it')
    await wait(900)
    await clickCell(page, 1, 1, 5, 5)
    await wait(500)
    await clickText(page, 'take profit')
    await wait(900)
    await page.screenshot({ path: `${OUT}/6-mobile-${dev.name}-settled.png`, fullPage: true })
    results.checks[`mobile_${dev.name}`].sentBet = sentMobile
  }

  results.consoleErrors = consoleErrors
  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}

run().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
