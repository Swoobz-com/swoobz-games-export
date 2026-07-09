import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6301'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document
    if (!root) return null
    const els = [...root.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, { t, within })
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 1118, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(600)
  await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(300)
  await clickText(page, 'ape in'); await wait(500)

  const betEntryCensus = await page.evaluate(() => {
    const stepperBtns = [...document.querySelectorAll('[aria-label="Decrease wager"],[aria-label="Increase wager"]')]
    const worldpicker = !!document.querySelector('[data-testid="vault-board-worldpicker"]')
    const wagerCol = document.querySelector('[data-testid="vault-ctl-wager"]')?.getBoundingClientRect()
    const wpCol = document.querySelector('[data-testid="vault-board-worldpicker"]')?.getBoundingClientRect()
    const ctaCol = document.querySelector('[data-testid="vault-ctl-cta"]')?.getBoundingClientRect()
    return {
      stepperCount: stepperBtns.length,
      worldpickerPresent: worldpicker,
      controlWidth: document.querySelector('[data-testid="DesktopControlColumn"]')?.getBoundingClientRect().width,
      edges: {
        wp: wpCol && { left: Math.round(wpCol.left), right: Math.round(wpCol.right) },
        wager: wagerCol && { left: Math.round(wagerCol.left), right: Math.round(wagerCol.right) },
        cta: ctaCol && { left: Math.round(ctaCol.left), right: Math.round(ctaCol.right) },
      },
    }
  })
  console.log('BETENTRY', JSON.stringify(betEntryCensus))

  await clickText(page, 'bluechips'); await wait(200)
  await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]'); await wait(900)

  const playingCensus = await page.evaluate(() => {
    const worldpicker = !!document.querySelector('[data-testid="vault-board-worldpicker"]')
    const lockedBtns = [...document.querySelectorAll('[data-testid="vault-ctl-wager-locked"] button')]
    const unlockedBtns = [...document.querySelectorAll('[aria-label="Decrease wager"],[aria-label="Increase wager"]')]
    return {
      worldpickerPresent: worldpicker,
      lockedStepperCount: lockedBtns.length,
      lockedAllDisabled: lockedBtns.every((b) => b.disabled),
      unlockedStepperCount: unlockedBtns.length,
      controlWidth: document.querySelector('[data-testid="DesktopControlColumn"]')?.getBoundingClientRect().width,
    }
  })
  console.log('PLAYING', JSON.stringify(playingCensus))

  await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    const ev = new MouseEvent('click', { clientX: r.x + r.width * 0.3, clientY: r.y + r.height * 0.3, bubbles: true })
    c.dispatchEvent(ev)
  })
  await wait(500)
  await clickText(page, 'take profit'); await wait(900)

  const settledCensus = await page.evaluate(() => {
    const worldpicker = !!document.querySelector('[data-testid="vault-board-worldpicker"]')
    return { worldpickerPresent: worldpicker, controlWidth: document.querySelector('[data-testid="DesktopControlColumn"]')?.getBoundingClientRect().width }
  })
  console.log('SETTLED', JSON.stringify(settledCensus))

  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
