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
  const el = h.asElement(); if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
const topbar = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent.replace(/\s+/g,' ').trim() || 'NONE')
async function boardBox(p) { return p.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }) }

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))

// ---- DESKTOP: pick BLUECHIPS (few rugs, likely win), go live, reveal, take profit ----
await p.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(700)
await clickText(p, 'got it'); await clickText(p, 'skip'); await wait(250)
await clickText(p, 'ape in'); await wait(900)
await clickText(p, 'bluechips'); await wait(250)
await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]'); await wait(1000)
console.log('LIVE topbar:', await topbar(p))
await p.screenshot({ path: `${OUT}/live-1440.png` })
// reveal a safe tile (center-ish)
let box = await boardBox(p)
if (box) { await p.mouse.click(box.x + box.w * 0.5, box.y + box.h * 0.5); await wait(700) }
await p.screenshot({ path: `${OUT}/live-1440-afterreveal.png` })
console.log('AFTER REVEAL topbar:', await topbar(p))
// take profit -> WIN result
await clickText(p, 'take profit'); await wait(1200)
console.log('RESULT topbar:', await topbar(p))
await p.screenshot({ path: `${OUT}/result-win-1440.png` })

// ---- DESKTOP LOSS: bet again, shitcoin-ish, crack until rug ----
await clickText(p, 'bet again'); await wait(700)
await clickText(p, 'bluechips'); await wait(200)
await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]'); await wait(900)
box = await boardBox(p)
for (let i = 0; i < 8; i++) {
  const t = await topbar(p)
  if (/RUG|SETTLED|BUST/i.test(t)) break
  const fx = 0.12 + (i % 5) * 0.19, fy = 0.15 + Math.floor(i / 5) * 0.22
  if (box) await p.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
  await wait(600)
}
await wait(600)
console.log('LOSS topbar:', await topbar(p))
await p.screenshot({ path: `${OUT}/result-loss-1440.png` })

// ---- MOBILE ----
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(700)
await clickText(p, 'got it'); await clickText(p, 'skip'); await wait(250)
await p.screenshot({ path: `${OUT}/mobile-lobby.png` })
await clickText(p, 'ape in'); await wait(900)
await p.screenshot({ path: `${OUT}/mobile-betentry.png` })
// select shitcoin on mobile to see crazy card
await clickText(p, 'shitcoin'); await wait(250)
await p.screenshot({ path: `${OUT}/mobile-betentry-shitcoin.png` })
await b.close()
console.log('DONE phases')
