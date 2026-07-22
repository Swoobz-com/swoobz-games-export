import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 5390
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, t)
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
async function dismiss(page) { await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(200) }
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(500)
  await dismiss(page)
  await clickText(page, 'bluechips')
  await wait(200)
  await clickText(page, 'send it')
  await wait(1200)
  const cellSeq = []
  for (let cy = 0; cy < 5; cy++) for (let cx = 0; cx < 5; cx++) cellSeq.push([cx, cy])
  for (const [cx, cy] of cellSeq.slice(0,6)) {
    const settledNow = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
    if (settledNow) { console.log('settled early, stop'); break }
    const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
    if (box) {
      const fx = 0.06 + ((cx + 0.5) / 5) * 0.88
      const fy = 0.08 + ((cy + 0.5) / 5) * 0.8
      await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
    }
    await wait(80)
    const badge = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-rhythm-badge"]')
      return el ? el.textContent : null
    })
    const mult = await page.evaluate(() => document.body.innerText.match(/PUMP\s*[×x]\s*([\d.]+)x/i)?.[0] || null)
    console.log(cx, cy, 'badge=', badge, 'mult=', mult)
  }
  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
