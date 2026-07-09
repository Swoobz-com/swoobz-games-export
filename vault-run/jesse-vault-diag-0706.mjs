import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5192'
const OUT = 'shots-jesse-0706'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
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
function worldCards() {
  const wp = document.querySelector('[data-testid="vault-board-worldpicker"]')
  if (!wp) return { err: 'no worldpicker' }
  const WORLDS = ['BLUECHIPS', 'ALTSEASON', 'SHITCOIN']
  const cards = [...wp.querySelectorAll('button')].filter((b) => WORLDS.some((w) => (b.textContent || '').includes(w))).map((b) => {
    const r = b.getBoundingClientRect(); const cs = getComputedStyle(b)
    return {
      text: (b.textContent || '').replace(/\s+/g, ' ').trim(),
      w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top),
      selected: b.getAttribute('aria-pressed'),
      bg: cs.backgroundColor, borderColor: cs.borderColor, borderWidth: cs.borderWidth, opacity: cs.opacity,
    }
  })
  // header/label of picker
  const label = wp.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)
  return { label, cards }
}
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLEERR', m.text()) })
await p.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await wait(700)
await clickText(p, 'got it'); await clickText(p, 'skip'); await wait(250)
await p.screenshot({ path: `${OUT}/00-coldopen.png` })
await clickText(p, 'ape in'); await wait(900)
await p.screenshot({ path: `${OUT}/01-betentry-default.png` })
console.log('DEFAULT SELECTED:', JSON.stringify(await p.evaluate(worldCards), null, 2))
// select each world and dump
for (const w of ['bluechips', 'altseason', 'shitcoin']) {
  await clickText(p, w); await wait(220)
  const info = await p.evaluate(worldCards)
  console.log(`\n=== after clicking ${w} ===`)
  console.log(JSON.stringify(info, null, 2))
  await p.screenshot({ path: `${OUT}/wp-${w}.png` })
}
// crop just the worldpicker for close inspection
const wpBox = await p.evaluate(() => { const el = document.querySelector('[data-testid="vault-board-worldpicker"]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
if (wpBox) await p.screenshot({ path: `${OUT}/wp-crop.png`, clip: { x: Math.max(0, wpBox.x - 4), y: Math.max(0, wpBox.y - 4), width: wpBox.w + 8, height: wpBox.h + 8 } })
console.log('WP BOX', JSON.stringify(wpBox))
await b.close()
console.log('DONE diag')
