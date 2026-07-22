import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5390'
const OUT = 'shots-jesse-0707'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const bodyTxt = (p) => p.evaluate(() => document.body.innerText.replace(/\s+/g,' ').trim())

async function tapButtonByText(p, txt) {
  const rect = await p.evaluate((txt) => {
    const els = [...document.querySelectorAll('button,[role=button]')]
    const el = els.find(e => (e.textContent||'').replace(/\s+/g,' ').trim().toLowerCase().includes(txt.toLowerCase()) && !e.disabled)
    if (!el) return null
    el.scrollIntoView({ block: 'center' })
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width/2, y: r.y + r.height/2 }
  }, txt)
  if (!rect) return false
  await wait(250)
  // re-read after scroll
  const rect2 = await p.evaluate((txt) => {
    const els = [...document.querySelectorAll('button,[role=button]')]
    const el = els.find(e => (e.textContent||'').replace(/\s+/g,' ').trim().toLowerCase().includes(txt.toLowerCase()) && !e.disabled)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width/2, y: r.y + r.height/2 }
  }, txt)
  if (!rect2) return false
  await p.touchscreen.tap(rect2.x, rect2.y)
  return true
}

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await p.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(1200)

// (1) tap a bet-entry board safe -> does anything happen?
const box = await p.evaluate(() => { const c=document.querySelector('canvas'); if(!c) return null; const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })
const before = await bodyTxt(p)
if (box) { await p.touchscreen.tap(box.x + box.w*0.5, box.y + box.h*0.4); await wait(600) }
const after = await bodyTxt(p)
console.log('BET-ENTRY board tap changed anything?', before !== after ? 'YES (changed)' : 'NO (inert preview)')

// (2) tap SEND IT (bluechips default) via touch
const sent = await tapButtonByText(p, 'send it')
await wait(1200)
console.log('SEND IT tapped:', sent, '| phase now contains PUMP/live?', /PUMP|TAKE PROFIT|RUG RISK/i.test(await bodyTxt(p)))
await p.screenshot({ path: `${OUT}/mobile2-live.png` })
// open a safe on the now-live board
const box2 = await p.evaluate(() => { const c=document.querySelector('canvas'); if(!c) return null; const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })
if (box2) { await p.touchscreen.tap(box2.x + box2.w*0.5, box2.y + box2.h*0.4); await wait(700) }
await p.screenshot({ path: `${OUT}/mobile2-afteropen.png` })
console.log('after open, live text sample:', (await bodyTxt(p)).slice(0,160))
// take profit (cash) to force a WIN if survived
const survived = /TAKE PROFIT/i.test(await bodyTxt(p)) && !/RUGGED|BUST/i.test(await bodyTxt(p))
if (survived) { await tapButtonByText(p, 'take profit'); await wait(1400) }
else { await wait(1200) }
await p.screenshot({ path: `${OUT}/mobile2-settled.png` })
await p.screenshot({ path: `${OUT}/mobile2-settled-full.png`, fullPage: true })
console.log('=== MOBILE SETTLED TEXT ===\n' + (await bodyTxt(p)).slice(0,600))

await b.close()
console.log('DONE mobile2')
