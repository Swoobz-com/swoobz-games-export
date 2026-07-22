import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5302'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
const p = await b.newPage()
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
let errCount = 0
p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) { errCount++; console.log('[console-error]', m.text()) } })
p.on('pageerror', (e) => { errCount++; console.log('[pageerror]', e.message) })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
await p.reload({ waitUntil: 'networkidle0' })
await wait(600)
await p.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('button, [role="button"]'))
  const el = buttons.find((e) => /SHITCOIN/.test(e.textContent || ''))
  if (el) el.click()
})
await wait(300)
await p.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'))
  const btn = btns.find((b) => /send it/i.test(b.textContent || ''))
  if (btn) btn.click()
})
await wait(1200)
console.log('total non-404 console errors:', errCount)
await b.close()
console.log('done')
