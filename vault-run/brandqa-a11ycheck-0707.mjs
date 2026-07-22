import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5286'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, t)
  const el = h.asElement(); if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
await page.reload({ waitUntil: 'networkidle0' })
await wait(600)
await page.evaluate(() => document.querySelector('[data-testid="vault-world-card-shitcoin"]')?.click())
await wait(300)
await clickText(page, 'ape in')
await wait(500)
await clickText(page, 'send it')
await wait(700)
const labels = await page.evaluate(() => {
  return [...document.querySelectorAll('[role=gridcell]')].map(el => el.getAttribute('aria-label')).filter(l => /jackpot/i.test(l))
})
console.log('gridcell aria-labels containing jackpot:', JSON.stringify(labels))
await b.close()
