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
await p.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
await p.reload({ waitUntil: 'networkidle0' })
await wait(600)
const betEntryH = await p.evaluate(() => document.querySelector('canvas').getBoundingClientRect().height)
console.log('bet-entry board height (mobile):', betEntryH)
const clicked = await clickText(p, 'send it')
console.log('clicked send it:', clicked)
await wait(700)
const playingH = await p.evaluate(() => document.querySelector('canvas').getBoundingClientRect().height)
console.log('playing board height (mobile, should be full ~500):', playingH)
await b.close()
