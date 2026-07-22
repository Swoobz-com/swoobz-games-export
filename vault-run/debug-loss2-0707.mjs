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
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
await p.reload({ waitUntil: 'networkidle0' })
await wait(600)
await clickText(p, 'got it'); await clickText(p, 'skip'); await wait(300)
await clickText(p, 'shitcoin'); await wait(300)
await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]')
await wait(1000)
for (let i = 0; i < 10; i++) {
  const box = await p.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  const fx = 0.06 + (i % 7) * 0.13, fy = 0.08 + Math.floor(i / 7) * 0.13
  const cx = box.x + box.w * fx, cy = box.y + box.h * fy
  await p.mouse.click(cx, cy)
  await wait(450)
  const open = await p.evaluate(() => document.body.textContent.match(/OPEN \d+ OF \d+|RUGGED|SETTLED|BUST/)?.[0])
  console.log(`click ${i} at`, Math.round(cx), Math.round(cy), '->', open)
}
await b.close()
