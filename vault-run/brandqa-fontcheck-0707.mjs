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
await clickText(page, 'ape in')
await wait(500)
await clickText(page, 'send it')
await wait(600)
const info = await page.evaluate(() => {
  const els = [...document.querySelectorAll('[data-testid="vault-hud-pump-value"]')]
  return els.map(el => ({ text: el.textContent, font: getComputedStyle(el).fontFamily, tag: el.tagName, visible: el.offsetParent !== null }))
})
console.log('pump-value elements:', JSON.stringify(info, null, 2))
const infoHud = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="vault-grid-hud-inner"]')
  return el ? { tag: el.tagName, font: getComputedStyle(el).fontFamily, text: (el.textContent||'').slice(0,80) } : null
})
console.log('grid-hud-inner:', JSON.stringify(infoHud, null, 2))
const rhythmFont = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="vault-rhythm-badge"]')
  return el ? { font: getComputedStyle(el.querySelector('span:last-child')).fontFamily } : 'not visible right now'
})
console.log('rhythm badge font:', JSON.stringify(rhythmFont))
await b.close()
