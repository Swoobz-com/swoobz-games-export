import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5320'
const DEV = process.argv[3] || 'Pixel7'   // Pixel7 | iPhone14Pro
const DIMS = DEV === 'iPhone14Pro' ? { w: 393, h: 852, dsf: 3 } : { w: 412, h: 915, dsf: 3 }
const OUT = `shots-jesse-sweep-0707/mobile-${DEV}`
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
fs.mkdirSync(OUT, { recursive: true })
async function clickText(page, t, within) {
  try {
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
    const box = await el.boundingBox(); if (box) { await page.touchscreen.tap(box.x + box.width/2, box.y + box.height/2); return true }
    await el.click(); return true
  } catch { return false }
}
const topbar = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent.replace(/\s+/g,' ').trim() || 'NONE').catch(()=>'NONE')
const status = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent.replace(/\s+/g,' ').trim() || 'NONE').catch(()=>'NONE')
const hud = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-hud-inner"]')?.textContent.replace(/\s+/g,' ').trim() || 'NONE').catch(()=>'NONE')
async function boardBox(p) { return p.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }).catch(()=>null) }
const shot = async (p, name) => { await p.screenshot({ path: `${OUT}/${name}.png` }); console.log('  shot', name) }
const isRug = async (p) => /RUGGED|BUST/i.test(await topbar(p)) || /RUGGED|BUST/i.test(await status(p))
async function tap(p, x, y) { await p.touchscreen.tap(x, y) }

// measure HUD vs canvas overlap + list HUD elements
async function hudOverlap(p) {
  return p.evaluate(() => {
    const canvas = document.querySelector('canvas'); if (!canvas) return null
    const cb = canvas.getBoundingClientRect()
    // find DOM elements whose text mentions PUMP or RUG RISK and that are NOT the canvas
    const all = [...document.querySelectorAll('*')].filter(e => {
      const t = (e.textContent||'').replace(/\s+/g,' ')
      return (/PUMP|RUG RISK|BAG/.test(t)) && e.children.length <= 3 && e.getBoundingClientRect().width > 10
    })
    const rects = all.slice(0,6).map(e => { const r = e.getBoundingClientRect(); return { txt:(e.textContent||'').replace(/\s+/g,' ').trim().slice(0,40), x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height) } })
    return { canvas: { x:Math.round(cb.x), y:Math.round(cb.y), w:Math.round(cb.width), h:Math.round(cb.height) }, hudEls: rects, innerH: window.innerHeight, scrollH: document.documentElement.scrollHeight }
  }).catch(()=>null)
}
// measure a settled CTA reachability
async function ctaReach(p, label) {
  return p.evaluate((label) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const btn = els.find(e => (e.textContent||'').replace(/\s+/g,' ').trim().toLowerCase().includes(label.toLowerCase()) && e.offsetParent !== null)
    if (!btn) return { found:false }
    const r = btn.getBoundingClientRect()
    return { found:true, label:(btn.textContent||'').replace(/\s+/g,' ').trim(), x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height),
      inViewportFully: r.top>=0 && r.bottom<=window.innerHeight, belowFold: r.top>window.innerHeight, topPx:Math.round(r.top), bottomPx:Math.round(r.bottom),
      innerH: window.innerHeight, scrollH: document.documentElement.scrollHeight, pageScrollable: document.documentElement.scrollHeight > window.innerHeight + 2, scrollY: window.scrollY }
  }, label).catch(()=>({found:false,err:true}))
}

async function clearAndGo(p) {
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(1300)
}

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await p.setViewport({ width: DIMS.w, height: DIMS.h, deviceScaleFactor: DIMS.dsf, isMobile: true, hasTouch: true })
console.log(`===== ${DEV} (${DIMS.w}x${DIMS.h}) =====`)
await clearAndGo(p)
await shot(p, '01-cold')
console.log('  topbar:', await topbar(p))
// dismiss any intro
await clickText(p, 'ape in'); await wait(300)
await clickText(p, 'got it'); await wait(300)
await shot(p, '02-betentry')
const betBody = await p.evaluate(()=>document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,700)).catch(()=>'')
console.log('  === BETENTRY BODY ===\n' + betBody)

// ---- WIN run bluechips with rhythm ----
console.log('== WIN run ==')
await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]') || await clickText(p, 'send it') || await clickText(p, 'crack a vault')
await wait(1000)
await shot(p, '03-playing')
console.log('  LIVE hud:', await hud(p))
const ov = await hudOverlap(p)
console.log('  HUD/CANVAS geometry:', JSON.stringify(ov))
let box = await boardBox(p)
console.log('  boardBox:', JSON.stringify(box))
// tap centre-ish cells; on mobile board may be panned. Tap several visible cells fast for rhythm.
if (box) {
  const cols = 5
  for (let i=0;i<6;i++){
    if (await isRug(p)) { console.log('  rugged early'); break }
    // tap within the visible board area, spread across
    const cx = box.x + box.w*(0.2 + 0.15*(i%4))
    const cy = box.y + box.h*(0.2 + 0.12*Math.floor(i/4))
    await tap(p, cx, cy)
    await wait(300)
    await shot(p, `04-tap${i+1}`)
    console.log(`  tap#${i+1} hud:`, await hud(p), '| status:', await status(p))
  }
}
await shot(p, '05-preSettle')
const cashed = await clickText(p, 'take profit')
console.log('  cash clicked:', cashed); await wait(1600)
await shot(p, '06-settled-win')
console.log('  SETTLED topbar:', await topbar(p))
// BET AGAIN reachability (win)
const winReach = await ctaReach(p, 'bet again')
console.log('  BET AGAIN reach (win):', JSON.stringify(winReach))
const winBody = await p.evaluate(()=>document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,900)).catch(()=>'')
console.log('  === SETTLED WIN BODY ===\n' + winBody)

// ---- LOSS run shitcoin ----
console.log('== LOSS run shitcoin ==')
await clickText(p, 'bet again') || await clickText(p, 'send it'); await wait(700)
await clickText(p, 'shitcoin'); await wait(500)
await shot(p, '07-shitcoin-betentry')
await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]') || await clickText(p, 'send it'); await wait(1000)
box = await boardBox(p)
let rugged=false
if (box) {
  for (let i=0;i<30;i++){
    if (await isRug(p)) { rugged=true; break }
    const cx = box.x + box.w*(0.15 + 0.14*(i%5))
    const cy = box.y + box.h*(0.15 + 0.14*(Math.floor(i/5)%5))
    await tap(p, cx, cy)
    await wait(320)
    if (await isRug(p)) { rugged=true; break }
  }
}
await wait(700)
await shot(p, '08-settled-loss')
console.log('  rugged:', rugged, '| topbar:', await topbar(p))
const lossReach = await ctaReach(p, 'bet again')
console.log('  BET AGAIN reach (loss):', JSON.stringify(lossReach))
const lossBody = await p.evaluate(()=>document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,900)).catch(()=>'')
console.log('  === SETTLED LOSS BODY ===\n' + lossBody)

await b.close()
console.log('DONE', DEV)
