import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 5390
const OUT = 'shots-rgc5-scrolldiag-0707'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

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
async function loadFresh(page, v) {
  await page.setViewport({ width: v.w, height: v.h, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(500)
  await dismiss(page)
}
async function forceSettle(page, { win }) {
  await clickText(page, 'bluechips')
  await wait(200)
  await clickText(page, 'send it')
  await wait(1200)
  const cellSeq = []
  for (let cy = 0; cy < 5; cy++) for (let cx = 0; cx < 5; cx++) cellSeq.push([cx, cy])
  for (const [cx, cy] of cellSeq) {
    const settledNow = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
    if (settledNow) break
    if (win) {
      const takeProfitReady = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim().toLowerCase().includes('take profit'))
        return !!btn && btn.offsetParent !== null && !btn.disabled
      })
      if (takeProfitReady) { await clickText(page, 'take profit'); await wait(900); break }
    }
    const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
    if (box) {
      const fx = 0.06 + ((cx + 0.5) / 5) * 0.88
      const fy = 0.08 + ((cy + 0.5) / 5) * 0.8
      await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
    }
    await wait(400)
  }
  await wait(700)
}
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  const v = { w: 393, h: 852 }
  const results = {}
  for (const outcome of ['win', 'loss']) {
    await loadFresh(page, v)
    await forceSettle(page, { win: outcome === 'win' })
    const info = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent||'').trim().toLowerCase() === 'bet again →')
      const r = btn ? btn.getBoundingClientRect() : null
      return {
        scrollY: window.scrollY,
        docScrollHeight: document.documentElement.scrollHeight,
        viewportH: window.innerHeight,
        ctaViewportY: r ? r.y : null,
        ctaDocY: r ? r.y + window.scrollY : null,
        ctaRect: r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null,
      }
    })
    results[outcome] = info
    await page.screenshot({ path: `${OUT}/${outcome}-full.png`, fullPage: true })
  }
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
