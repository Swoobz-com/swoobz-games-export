import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5282'
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
  try { await el.click() } catch { return false }; return true
}
async function dismiss(page) { await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(150) }
async function loadFresh(page) {
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(350); await dismiss(page)
}
async function boardBox(page) {
  return page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
}
function shuffledSeq(gridSize) {
  const seq = []
  for (let cy = 0; cy < gridSize; cy++) for (let cx = 0; cx < gridSize; cx++) seq.push([cx, cy])
  for (let i = seq.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[seq[i], seq[j]] = [seq[j], seq[i]] }
  return seq
}
async function attempt(page) {
  await clickText(page, 'shitcoin'); await wait(150)
  await clickText(page, 'send it'); await wait(700)
  const seq = shuffledSeq(7)
  let bestTier = null
  for (let i = 0; i < 49; i++) {
    const settledNow = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
    if (settledNow) return bestTier
    const box = await boardBox(page); if (!box) return bestTier
    const [cx, cy] = seq[i]
    const fx = 0.06 + ((cx + 0.5) / 7) * 0.88
    const fy = 0.08 + ((cy + 0.5) / 7) * 0.8
    await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
    await wait(70)
    const tier = await page.evaluate(() => document.querySelector('[data-testid="vault-rhythm-badge"]')?.getAttribute('data-tier') || null)
    if (tier === 'perfect') return 'perfect'
    if (tier === 'rhythm' && bestTier !== 'perfect') bestTier = 'rhythm'
  }
  return bestTier
}
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  const outcomes = []
  for (let a = 0; a < 20; a++) {
    await loadFresh(page)
    const t = await attempt(page)
    outcomes.push(t)
    console.log('attempt', a, '->', t)
    if (t === 'perfect') break
  }
  console.log('FINAL', JSON.stringify(outcomes))
  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
