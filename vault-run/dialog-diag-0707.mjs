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
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
const topbarText = (p) => p.evaluate(() => (document.querySelector('[data-testid="vault-grid-topbar"]') || document.body).textContent.replace(/\s+/g,' ').trim().slice(0,200))
async function boardBox(p) { return p.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} }) }

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox','--force-device-scale-factor=1'] })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
await p.reload({ waitUntil: 'networkidle0' })
await wait(600)
await clickText(p, 'got it'); await clickText(p, 'skip'); await clickText(p, 'ape in'); await wait(300)
await clickText(p, 'bluechips'); await wait(250)
await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]') || await clickText(p, 'send it')
await wait(900)
let box = await boardBox(p)
await p.mouse.click(box.x + box.w*0.5, box.y + box.h*0.5)
await wait(700)
await clickText(p, 'take profit') || await clickText(p, 'cash out')
await wait(900)
console.log('topbar', await topbarText(p))
const dialogs = await p.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].map(d => ({
  outer: d.outerHTML.slice(0, 300), visible: d.offsetParent !== null, testid: d.getAttribute('data-testid')
})))
console.log('dialogs before toggle:', JSON.stringify(dialogs, null, 2))
await b.close()
