import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5779/'
const OUTDIR = 'shots-revert-0705'
fs.mkdirSync(OUTDIR, { recursive: true })

const results = {}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function clickTestId(page, testid) {
  const el = await page.$(`[data-testid="${testid}"]`)
  if (!el) return false
  await el.click()
  return true
}

async function clickText(page, text) {
  const handle = await page.evaluateHandle((t) => {
    const all = Array.from(document.querySelectorAll('button'))
    return all.find((b) => b.textContent && b.textContent.trim().toLowerCase().includes(t.toLowerCase())) || null
  }, text)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

async function gridSweepReveal(page) {
  // Ensure MANUAL mode so plain taps reveal tiles.
  await clickText(page, 'MANUAL')
  const canvas = await page.$('[data-testid="vault-canvas-shell"] canvas')
  if (!canvas) return
  const box = await canvas.boundingBox()
  if (!box) return
  for (let gx = 1; gx <= 9 && gx <= 9; gx++) {
    for (let gy = 1; gy <= 9; gy++) {
      const settled = await page.$('[data-testid="vault-settled-betagain"]')
      const settledMobile = await page.$('[data-testid="vault-settledpanel"]')
      if (settled || settledMobile) return
      const x = box.x + (box.width * gx) / 10
      const y = box.y + (box.height * gy) / 10
      await page.mouse.click(x, y)
      await sleep(120)
    }
  }
}

async function runPhaseSet(browser, width, height, label) {
  const page = await browser.newPage()
  await page.setViewport({ width, height })
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(String(e)))
  await page.goto(BASE, { waitUntil: 'networkidle0' })
  await sleep(400)

  const out = { pageErrors: [] }

  // LOBBY
  await page.screenshot({ path: `${OUTDIR}/${label}-lobby.png`, fullPage: true })
  out.lobby = await page.evaluate(() => {
    const doc = document
    const scrollH = doc.documentElement.scrollHeight
    const innerH = window.innerHeight
    return {
      lobbyLeft: !!doc.querySelector('[data-testid="vault-lobby-left"]'),
      lobbyRight: !!doc.querySelector('[data-testid="vault-lobby-right"]'),
      gutterLeftA: !!doc.querySelector('[data-testid="vault-gutter-left"]'),
      pageScroll: scrollH > innerH + 2,
      scrollH,
      innerH,
    }
  })

  // -> BetEntry
  await clickText(page, 'ape in')
  await sleep(300)
  await page.screenshot({ path: `${OUTDIR}/${label}-betentry.png`, fullPage: true })
  out.betentry = await page.evaluate(() => {
    const doc = document
    const scrollH = doc.documentElement.scrollHeight
    const innerH = window.innerHeight
    const shell = doc.querySelector('[data-testid="vault-canvas-shell"]')
    const left = doc.querySelector('[data-testid="vault-betentry-left"]')
    const right = doc.querySelector('[data-testid="vault-betentry-right"]')
    const canvas = shell ? shell.querySelector('canvas') : null
    let gap = null
    let overlap = false
    if (canvas && right) {
      const cRect = canvas.getBoundingClientRect()
      const rRect = right.getBoundingClientRect()
      gap = rRect.left - cRect.right
      overlap = rRect.left < cRect.right
    }
    return {
      left: !!left,
      right: !!right,
      world: !!doc.querySelector('[data-testid="vault-betentry-world"]'),
      yourbet: !!doc.querySelector('[data-testid="vault-betentry-yourbet"]'),
      confirm: !!doc.querySelector('[data-testid="vault-betentry-confirm"]'),
      pageScroll: scrollH > innerH + 2,
      scrollH,
      innerH,
      gapRightOfBoard: gap,
      overlap,
    }
  })

  // -> Playing (SEND IT inside vault-betentry-confirm)
  const sendItBtn = await page.$('[data-testid="vault-betentry-confirm"] button')
  if (sendItBtn) await sendItBtn.click()
  await sleep(400)
  out.playing = await page.evaluate(() => {
    const doc = document
    return {
      playingLeft: !!doc.querySelector('[data-testid="vault-playing-left"]'),
      playingRight: !!doc.querySelector('[data-testid="vault-playing-right"]'),
      gutterLeftAAtZeroRounds: !!doc.querySelector('[data-testid="vault-gutter-left"]'),
    }
  })
  await page.screenshot({ path: `${OUTDIR}/${label}-playing-r0.png`, fullPage: true })

  // Reveal one tile then check for Card A appearance mid-round (should still be absent since history is round-count, not reveal-count)
  await gridSweepReveal(page)
  await sleep(500)
  await page.screenshot({ path: `${OUTDIR}/${label}-settled-1.png`, fullPage: true })

  out.settled1 = await page.evaluate(() => {
    const doc = document
    const scrollH = doc.documentElement.scrollHeight
    const innerH = window.innerHeight
    const changeBtns = Array.from(doc.querySelectorAll('button')).map((b) => b.textContent?.trim())
    return {
      settledLeft: !!doc.querySelector('[data-testid="vault-settled-left"]'),
      settledRight: !!doc.querySelector('[data-testid="vault-settled-right"]'),
      gutterRight: !!doc.querySelector('[data-testid="vault-gutter-right"]'),
      betAgainBtn: !!doc.querySelector('[data-testid="vault-settled-betagain"]'),
      gutterLeftA_shouldBeAbsent: !!doc.querySelector('[data-testid="vault-gutter-left"]'),
      newSetupPresent: changeBtns.some((t) => t && t.toLowerCase().includes('new setup')),
      changeModePresent: changeBtns.some((t) => t && t.toLowerCase().includes('change mode')),
      pageScroll: scrollH > innerH + 2,
      scrollH,
      innerH,
    }
  })

  // Bet again -> play a 2nd round so Card A (history>0) shows in Playing/Lobby-equivalent
  const betAgain = await page.$('[data-testid="vault-settled-betagain"]')
  if (betAgain) await betAgain.click()
  await sleep(400)
  await gridSweepReveal(page)
  await sleep(500)
  out.settled2 = await page.evaluate(() => {
    const doc = document
    return {
      settledLeft: !!doc.querySelector('[data-testid="vault-settled-left"]'),
      settledRight: !!doc.querySelector('[data-testid="vault-settled-right"]'),
      gutterRight: !!doc.querySelector('[data-testid="vault-gutter-right"]'),
    }
  })
  await page.screenshot({ path: `${OUTDIR}/${label}-settled-2.png`, fullPage: true })

  // acknowledge -> lobby again, then check Playing's Card A shows now (history=2)
  await clickText(page, 'new setup')
  await sleep(300)
  await clickText(page, 'ape in')
  await sleep(300)
  const sendIt2 = await page.$('[data-testid="vault-betentry-confirm"] button')
  if (sendIt2) await sendIt2.click()
  await sleep(400)
  out.playingRound3 = await page.evaluate(() => {
    const doc = document
    const cardA = doc.querySelectorAll('[data-testid="vault-gutter-card-a"]')
    return {
      cardACount: cardA.length,
      gutterLeftPresent: !!doc.querySelector('[data-testid="vault-gutter-left"]'),
    }
  })
  await page.screenshot({ path: `${OUTDIR}/${label}-playing-r3-cardA.png`, fullPage: true })

  out.pageErrors = pageErrors
  await page.close()
  return out
}

async function runNarrowWideAnchorCheck(browser) {
  const widths = [960, 1024, 1150, 1440, 1920]
  const rows = {}
  for (const w of widths) {
    const page = await browser.newPage()
    await page.setViewport({ width: w, height: 900 })
    await page.goto(BASE, { waitUntil: 'networkidle0' })
    await sleep(300)
    await clickText(page, 'ape in')
    await sleep(300)
    const m = await page.evaluate(() => {
      const shell = document.querySelector('[data-testid="vault-canvas-shell"]')
      const canvas = shell ? shell.querySelector('canvas') : null
      const right = document.querySelector('[data-testid="vault-betentry-right"]')
      if (!canvas || !right) return null
      const cRect = canvas.getBoundingClientRect()
      const rRect = right.getBoundingClientRect()
      return {
        gap: rRect.left - cRect.right,
        overlap: rRect.left < cRect.right,
        rightEdgeX: rRect.right,
        viewportW: window.innerWidth,
        offscreen: rRect.right > window.innerWidth,
      }
    })
    rows[w] = m
    await page.close()
  }
  return rows
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
  results.desktop_1440x900 = await runPhaseSet(browser, 1440, 900, 'd1440')
  results.desktop_1920x1080 = await runPhaseSet(browser, 1920, 1080, 'd1920')
  results.mobile_390x844 = await runMobileCheck(browser)
  results.anchorSweep = await runNarrowWideAnchorCheck(browser)
  await browser.close()
  fs.writeFileSync(`${OUTDIR}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}

async function runMobileCheck(browser) {
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 })
  await page.goto(BASE, { waitUntil: 'networkidle0' })
  await sleep(400)
  await page.screenshot({ path: `${OUTDIR}/mobile-lobby.png`, fullPage: true })
  const lobbyCheck = await page.evaluate(() => {
    const gutterTestIds = [
      'vault-lobby-left', 'vault-lobby-right', 'vault-playing-left', 'vault-playing-right',
      'vault-settled-left', 'vault-settled-right', 'vault-gutter-left', 'vault-gutter-right',
      'vault-betentry-left', 'vault-betentry-right', 'vault-betentry-world', 'vault-betentry-yourbet',
      'vault-betentry-confirm',
    ]
    const found = gutterTestIds.filter((t) => document.querySelector(`[data-testid="${t}"]`))
    return { desktopGutterTestIdsFoundOnMobile: found }
  })
  await clickText(page, 'ape in')
  await sleep(300)
  await page.screenshot({ path: `${OUTDIR}/mobile-betentry.png`, fullPage: true })
  const betEntryCheck = await page.evaluate(() => {
    return {
      hasBetConsole: !!document.querySelector('.vault-mode-row'),
      wagerStepperCount: document.querySelectorAll('[aria-label="Decrease next bet"], [aria-label="Increase next bet"]').length,
    }
  })
  await page.close()
  return { lobbyCheck, betEntryCheck }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
