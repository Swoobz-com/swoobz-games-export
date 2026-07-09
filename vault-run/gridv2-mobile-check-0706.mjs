import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6001'
const OUT = 'shots-gridv2-mobilecheck-0706'
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(t.toLowerCase()))
  }, t)
  const el = h.asElement()
  if (!el) return false
  await el.click()
  return true
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(700)
  await clickText(page, 'got it')
  await clickText(page, 'skip')
  await wait(300)

  const info1 = await page.evaluate(() => ({
    hasMainGrid: !!document.querySelector('[data-testid="vault-grid-mainGrid"]'),
    hasHeaderTapeBrand: !!document.querySelector('[data-testid="vault-canvas-shell"]'),
    tapeBrandText: document.body.innerText.slice(0, 60),
    consoleWagerFields: [...document.querySelectorAll('button[aria-label]')].map((b) => b.getAttribute('aria-label')).filter((l) => /wager/i.test(l)),
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }))
  console.log('LOBBY mobile:', JSON.stringify(info1, null, 2))
  await page.screenshot({ path: `${OUT}/mobile-lobby.png`, fullPage: true })

  await clickText(page, 'ape in')
  await wait(600)
  const info2 = await page.evaluate(() => ({
    consoleWagerFields: [...document.querySelectorAll('button[aria-label]')].map((b) => b.getAttribute('aria-label')).filter((l) => /wager/i.test(l)),
    hasBetConsole: document.body.innerText.includes('YOUR BET'),
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }))
  console.log('BETENTRY mobile:', JSON.stringify(info2, null, 2))
  await page.screenshot({ path: `${OUT}/mobile-betentry.png`, fullPage: true })

  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
