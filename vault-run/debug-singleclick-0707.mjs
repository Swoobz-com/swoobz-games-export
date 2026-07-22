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
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox','--force-device-scale-factor=1'] })
const p = await b.newPage()
p.on('console', (msg) => console.log('PAGE:', msg.text()))
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
await p.reload({ waitUntil: 'networkidle0' })
await wait(500)
await clickText(p, 'got it'); await clickText(p, 'skip'); await wait(250)
await clickText(p, 'shitcoin'); await wait(200)
await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]')
await wait(1200)
const rect = await p.evaluate(() => { const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {left:r.left,top:r.top,width:r.width,height:r.height} })
// idx=24 row=3,col=3 using same formula
const gridX = 193.17, gridY = 33.77, tile=67.82, gap=14.62
const col=3, row=3
const cx = rect.left + gridX + col*(tile+gap) + tile/2
const cy = rect.top + gridY + row*(tile+gap) + tile/2
console.log('clicking at', cx, cy, 'rect', rect)
await p.mouse.click(cx, cy)
await wait(600)
const status1 = await p.evaluate(() => (document.querySelector('[data-testid="vault-grid-status"]')?.textContent||'').split('recent')[0])
console.log('status after click 1:', status1)
await p.mouse.click(cx, cy)
await wait(600)
const status2 = await p.evaluate(() => (document.querySelector('[data-testid="vault-grid-status"]')?.textContent||'').split('recent')[0])
console.log('status after click 2 (same spot):', status2)
await p.screenshot({ path: 'shots-consolidated-0707/debug-singleclick.png' })
await b.close()
