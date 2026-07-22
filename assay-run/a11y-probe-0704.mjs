import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const OUT = 'shots-a11y-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = {}

async function clickText(page, txt) {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080 },
  })
  const page = (await browser.pages())[0]
  const consoleErrors = []
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('CONSOLE: ' + m.text()) })

  await page.goto(URL, { waitUntil: 'networkidle0' })
  await wait(400)
  await page.screenshot({ path: `${OUT}/01-lobby.png` })

  // ---- CHECK 5/6/4 prep: aria-live census + canvas a11y attrs (lobby phase) ----
  results.ariaLiveLobby = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-live]')].map((e) => ({
      tag: e.tagName, ariaLive: e.getAttribute('aria-live'), text: e.textContent?.slice(0, 80),
    }))
  )

  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  await page.screenshot({ path: `${OUT}/02-planning.png` })

  // ---- CHECK 4: canvas a11y attrs ----
  results.canvasAttrs = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    return {
      ariaLabel: c.getAttribute('aria-label'),
      role: c.getAttribute('role'),
      tabIndex: c.tabIndex,
      hasOnKeyDownAttr: c.hasAttribute('onkeydown'),
    }
  })

  // ---- CHECK 5: aria-live census across planning phase ----
  results.ariaLivePlanning = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-live]')].map((e) => ({
      tag: e.tagName, ariaLive: e.getAttribute('aria-live'), text: e.textContent?.slice(0, 80),
    }))
  )

  // ---- CHECK 6: aria-current state-transition test ----
  const getTierInfo = () => page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const tierBtns = btns.filter((b) => /Floor/.test(b.textContent || ''))
    return tierBtns.map((b) => ({ text: b.textContent.slice(0, 20), ariaCurrent: b.getAttribute('aria-current') }))
  })
  const clickTier = (label) => page.evaluate((lbl) => {
    const btns = [...document.querySelectorAll('button')]
    const b = btns.find((b) => b.textContent && b.textContent.includes(lbl))
    if (b) { b.click(); return true }
    return false
  }, label)

  results.tierTransition = {}
  results.tierTransition.initial = await getTierInfo()
  await clickTier('Lean Floor'); await wait(150)
  results.tierTransition.afterLean = await getTierInfo()
  await clickTier('Flooded Floor'); await wait(150)
  results.tierTransition.afterFlooded = await getTierInfo()
  await clickTier('Standard Floor'); await wait(150)
  results.tierTransition.afterStandard = await getTierInfo()
  await clickTier('Lean Floor'); await wait(150)
  results.tierTransition.afterLean2 = await getTierInfo()

  await page.screenshot({ path: `${OUT}/03-after-tier-transitions.png` })

  fs.writeFileSync(`${OUT}/results-partial.json`, JSON.stringify(results, null, 2))
  console.log('PART 1 DONE')

  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
