// Re-verify FIX 3 (hudHeroKicker / desktopGridHudRight T.textMuted swap) live.
import puppeteer from 'puppeteer-core'
import { PNG } from 'pngjs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5390'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
function luminance([r, g, b]) {
  const a = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) })
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
}
function ratio(fg, bg) { const L1 = luminance(fg) + 0.05, L2 = luminance(bg) + 0.05; return L1 > L2 ? L1 / L2 : L2 / L1 }
function px(png, x, y) {
  const idx = (png.width * Math.min(Math.max(y, 0), png.height - 1) + Math.min(Math.max(x, 0), png.width - 1)) << 2
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2]]
}
function extremes(png) {
  let minL = Infinity, maxL = -Infinity, minC = null, maxC = null
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const c = px(png, x, y); const l = luminance(c)
    if (l < minL) { minL = l; minC = c }
    if (l > maxL) { maxL = l; maxC = c }
  }
  return { minC, maxC }
}
async function measureText(page, matcher, label) {
  const rect = await page.evaluate((m) => {
    const spans = [...document.querySelectorAll('span')]
    const el = spans.find((s) => new RegExp(m, 'i').test((s.textContent || '').trim()) && s.offsetParent !== null)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height, text: el.textContent }
  }, matcher)
  if (!rect || rect.width === 0) return { label, error: 'not found', matcher }
  const clip = { x: Math.max(0, rect.x - 2), y: Math.max(0, rect.y - 2), width: rect.width + 4, height: rect.height + 4 }
  const buf = await page.screenshot({ clip })
  const png = PNG.sync.read(Buffer.from(buf))
  const { minC, maxC } = extremes(png)
  return { label, text: rect.text, ratio: +ratio(maxC, minC).toFixed(2), textPx: maxC, bgPx: minC }
}

async function run(world) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 })
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(800)
  await page.evaluate((s) => { document.querySelector(`[data-testid="vault-world-card-${s}"]`).click() }, world)
  await wait(300)
  const results = []
  results.push(await measureText(page, '^\\d+ RUGS? .* FIRST TAP', 'bet-entry: N RUGS · FIRST TAP'))
  await page.evaluate(() => { [...document.querySelectorAll('button')].find((b) => /send it/i.test(b.textContent)).click() })
  await wait(700)
  results.push(await measureText(page, '^PUMP$', 'playing: PUMP kicker'))
  results.push(await measureText(page, '^RUG RISK', 'playing: RUG RISK N%'))
  await page.close()
  await browser.close()
  console.log(world, JSON.stringify(results, null, 2))
}
run(process.argv[3] || 'bluechips').catch((e) => { console.error('FATAL', e); process.exit(1) })
