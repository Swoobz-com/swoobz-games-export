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
const towin = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-ctl-towin"]')?.textContent.replace(/\s+/g,' ').trim() || 'NONE')
const rugsRow = (p) => p.evaluate(() => { const el=[...document.querySelectorAll('*')].find(e=>/^RUGS/.test((e.textContent||'').trim()) && e.querySelector && e.querySelectorAll('button').length>=2); return el?el.textContent.replace(/\s+/g,' ').trim().slice(0,80):'NONE' })
const selectedWorld = (p) => p.evaluate(() => { for (const m of ['bluechips','altseason','shitcoin']) { const c=document.querySelector(`[data-testid="vault-world-card-${m}"]`); if(c){ const s=getComputedStyle(c); if(/rgb\((?!.*0, 0, 0)/.test(s.borderColor) && s.borderColor!=='rgba(0, 0, 0, 0)'){} } } return null })
async function clearAndGo(p, w, h, dsf) {
  await p.setViewport({ width: w, height: h, deviceScaleFactor: dsf })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(1100)
}

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))

// (A) RUGS stepper vs world -- desktop
await clearAndGo(p, 1440, 900, 1)
console.log('--- RUGS STEPPER INTERACTION (bluechips selected) ---')
console.log('TO WIN before:', await towin(p), '| RUGS row:', await rugsRow(p))
// click RUGS +  a few times
const plusHit = await p.evaluate(() => { const row=[...document.querySelectorAll('*')].find(e=>/^RUGS/.test((e.textContent||'').trim()) && e.querySelectorAll('button').length>=2); if(!row) return 'no-row'; const btns=[...row.querySelectorAll('button')]; const plus=btns.find(x=>x.textContent.includes('+')); if(plus){plus.click();plus.click();return 'clicked+2'} return 'no-plus' })
await wait(500)
console.log('RUGS + clicked:', plusHit)
console.log('TO WIN after +2 rugs:', await towin(p), '| RUGS row:', await rugsRow(p))
// which world card is highlighted now?
const sel = await p.evaluate(() => ['bluechips','altseason','shitcoin'].map(m=>{const c=document.querySelector(`[data-testid="vault-world-card-${m}"]`); return {m, border: c?getComputedStyle(c).borderColor:'?'}}))
console.log('world card borders after rug change:', JSON.stringify(sel))
await p.screenshot({ path: `${OUT}/rugs-stepper-changed.png` })

// (B) Shitcoin 7x7 live
await clearAndGo(p, 1440, 900, 1)
await clickText(p, 'shitcoin'); await wait(300)
await p.screenshot({ path: `${OUT}/shitcoin-betentry.png` })
await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]'); await wait(900)
// open 2 safes
const box = await p.evaluate(() => { const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })
await p.mouse.click(box.x + box.w*0.5, box.y + box.h*0.5); await wait(500)
await p.mouse.click(box.x + box.w*0.3, box.y + box.h*0.3); await wait(500)
await p.screenshot({ path: `${OUT}/shitcoin-live.png` })
console.log('--- SHITCOIN live captured ---')

await b.close()
console.log('DONE probe2')
