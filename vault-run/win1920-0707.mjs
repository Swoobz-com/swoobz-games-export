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
await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })
for (let attempt = 0; attempt < 6; attempt++) {
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
  await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await p.reload({ waitUntil: 'networkidle0' })
  await wait(500)
  await clickText(p, 'got it'); await clickText(p, 'skip'); await wait(250)
  await clickText(p, 'bluechips'); await wait(200)
  await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]')
  await wait(800)
  const box = await p.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  await p.mouse.click(box.x + box.w * 0.5, box.y + box.h * 0.5)
  await wait(700)
  const bodyTxt = await p.evaluate(() => document.body.textContent)
  if (/RUGGED|BUST/.test(bodyTxt)) { console.log(`attempt ${attempt}: busted, retrying`); continue }
  const cashed = await clickText(p, 'take profit')
  await wait(800)
  console.log(`attempt ${attempt}: cashed=${cashed}`)
  await p.screenshot({ path: 'shots-fairnessqa-0707/desktop-1920x1080-REALWIN-settled.png' })
  await p.evaluate(() => document.querySelector('.vault-receipt-toggle')?.click())
  await wait(400)
  await p.screenshot({ path: 'shots-fairnessqa-0707/desktop-1920x1080-REALWIN-settled-receiptopen.png' })
  const snap = await p.evaluate(() => ({
    hasSessionMeta: document.body.textContent.includes('SESSION META'),
    has10x: /1\.0x on the win/.test(document.body.textContent),
    receiptRows: document.querySelectorAll('#vault-gutter-settled-receipt dt').length,
  }))
  console.log('snap', snap)
  break
}
await b.close()
