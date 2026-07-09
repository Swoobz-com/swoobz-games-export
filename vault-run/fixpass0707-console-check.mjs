import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5390'
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
  const el = h.asElement(); if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
const p = await b.newPage()
const errs = []
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message))
p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ERROR: ' + m.text()) })
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
await p.reload({ waitUntil: 'networkidle0' })
await wait(600)
const lockedText = await p.evaluate(() => document.querySelector('[data-testid="vault-ctl-wager-locked"]')?.textContent.trim())
console.log('locked label (before send it):', lockedText || '(not on this phase)')
await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]')
await wait(700)
const lockedText2 = await p.evaluate(() => document.querySelector('[data-testid="vault-ctl-wager-locked"]')?.textContent.trim())
console.log('locked label (playing):', lockedText2)
console.log('console/page errors:', JSON.stringify(errs, null, 2))
await b.close()
