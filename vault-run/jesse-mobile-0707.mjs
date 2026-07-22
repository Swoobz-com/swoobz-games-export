import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5390'
const OUT = 'shots-jesse-0707'
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
const wait2 = wait

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))

// Pixel 7 primary
await p.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(1200)

// what is visible ABOVE the fold at cold start (no scroll)?
const fold = await p.evaluate(() => {
  const H = window.innerHeight
  const seen = (sel) => { const el=document.querySelector(sel); if(!el) return 'MISSING'; const r=el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), aboveFold: r.top < H && r.top >= 0, belowFold: r.top >= H } }
  return {
    innerH: H,
    scrollH: document.documentElement.scrollHeight,
    cta: seen('[data-testid="vault-ctl-cta"]'),
    worldpicker: seen('[data-testid="vault-board-worldpicker"]'),
    bluechips: seen('[data-testid="vault-world-card-bluechips"]'),
    wager: seen('[data-testid="vault-ctl-wager"]'),
    firstScreenText: document.body.innerText.split('\n').filter(l=>l.trim()).slice(0,14).join(' | ')
  }
})
console.log('=== MOBILE COLD FOLD ANALYSIS ===')
console.log(JSON.stringify(fold, null, 2))
await p.screenshot({ path: `${OUT}/mobile-cold-fold.png` })
// full page
await p.screenshot({ path: `${OUT}/mobile-cold-full.png`, fullPage: true })

// Try to play: select a world, set bet, send it. Mimic a player scrolling down.
await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
await wait(500)
await p.screenshot({ path: `${OUT}/mobile-scrolled-bottom.png` })
const afterScroll = await p.evaluate(() => {
  const seen = (sel) => { const el=document.querySelector(sel); if(!el) return 'MISSING'; const r=el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), inVP: r.top < window.innerHeight && r.bottom > 0 } }
  return { cta: seen('[data-testid="vault-ctl-cta"]'), shitcoin: seen('[data-testid="vault-world-card-shitcoin"]') }
})
console.log('after scroll to bottom, CTA:', JSON.stringify(afterScroll.cta), '| shitcoin card:', JSON.stringify(afterScroll.shitcoin))

// pick shitcoin then send it
await clickText(p, 'shitcoin'); await wait(400)
await p.screenshot({ path: `${OUT}/mobile-shitcoin-selected.png` })
await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]'); await wait(1000)
await p.screenshot({ path: `${OUT}/mobile-live.png` })
console.log('mobile live phase:', await p.evaluate(()=>document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent.replace(/\s+/g,' ').trim().slice(0,50)))
// tap a couple safes
const box = await p.evaluate(() => { const c=document.querySelector('canvas'); if(!c) return null; const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })
if (box) { await p.mouse.click(box.x+box.w*0.5, box.y+box.h*0.4); await wait(600) }
await p.screenshot({ path: `${OUT}/mobile-after-tap.png` })
const mliveTxt = await p.evaluate(()=>document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,900))
console.log('=== MOBILE LIVE/SETTLED BODY ===\n'+mliveTxt)
await p.screenshot({ path: `${OUT}/mobile-settled-full.png`, fullPage: true })

await b.close()
console.log('DONE mobile')
