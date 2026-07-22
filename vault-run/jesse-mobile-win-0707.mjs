import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5320'
const DEV = process.argv[3] || 'Pixel7'
const DIMS = DEV === 'iPhone14Pro' ? { w: 393, h: 852, dsf: 3 } : { w: 412, h: 915, dsf: 3 }
const OUT = `shots-jesse-sweep-0707/mobile-${DEV}`
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
fs.mkdirSync(OUT, { recursive: true })
async function tapText(page, t, within) {
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
    return false
  } catch { return false }
}
const body = (p) => p.evaluate(()=>document.body.innerText.replace(/\s+/g,' ')).catch(()=>'')
const status = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent.replace(/\s+/g,' ').trim() || '').catch(()=>'')
async function boardBox(p) { return p.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }).catch(()=>null) }
const shot = async (p, name) => { await p.screenshot({ path: `${OUT}/${name}.png` }); console.log('  shot', name) }
async function ctaReach(p, label) {
  return p.evaluate((label) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const btn = els.find(e => (e.textContent||'').replace(/\s+/g,' ').trim().toLowerCase().includes(label.toLowerCase()) && e.offsetParent !== null)
    if (!btn) return { found:false }
    const r = btn.getBoundingClientRect()
    return { found:true, label:(btn.textContent||'').replace(/\s+/g,' ').trim(), topPx:Math.round(r.top), bottomPx:Math.round(r.bottom),
      inViewportFully: r.top>=0 && r.bottom<=window.innerHeight, belowFold: r.top>window.innerHeight,
      innerH: window.innerHeight, scrollH: document.documentElement.scrollHeight, pageScrollable: document.documentElement.scrollHeight > window.innerHeight + 2 }
  }, label).catch(()=>({found:false}))
}
async function fresh(p) {
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(1200)
}
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
await p.setViewport({ width: DIMS.w, height: DIMS.h, deviceScaleFactor: DIMS.dsf, isMobile: true, hasTouch: true })
console.log(`===== ${DEV} WIN chase =====`)
let won = false
for (let attempt=1; attempt<=6 && !won; attempt++) {
  await fresh(p)
  await tapText(p, 'send it', '[data-testid="vault-ctl-cta"]') || await tapText(p, 'send it')
  await wait(1000)
  const box = await boardBox(p); if (!box) continue
  // tap 2 distinct cells (cols 5)
  const cells = [[0,0],[2,0]]
  let rug=false, opened=0
  for (const [c,r] of cells) {
    await p.touchscreen.tap(box.x + box.w*((c+0.5)/5), box.y + box.h*0.30 + box.h*0.14*r)
    await wait(650)
    const st = await status(p)
    if (/RUGGED|BUST/i.test(st) || /RUGGED|BUST/i.test(await body(p))) { rug=true; break }
    opened++
  }
  if (rug) { console.log(`  attempt${attempt}: rugged`); continue }
  console.log(`  attempt${attempt}: opened ${opened}, cashing`)
  const cashed = await tapText(p, 'take profit')
  await wait(1700)
  const bt = await body(p)
  if (/SETTLED . WIN|SECURED THE BAG|WON/i.test(bt) && !/RUGGED|BUST/i.test(bt)) {
    won = true
    await shot(p, 'WIN-settled')
    const reach = await ctaReach(p, 'bet again')
    console.log('  WIN BET AGAIN reach:', JSON.stringify(reach))
    console.log('  WIN body:', bt.slice(0,600))
    // also test tapping BET AGAIN actually starts a new round
    const again = await tapText(p, 'bet again'); await wait(900)
    console.log('  tapped BET AGAIN ->', again, '| phase body:', (await body(p)).slice(0,120))
  } else { console.log(`  attempt${attempt}: not a clean win, body:`, bt.slice(0,120)) }
}
console.log('  won:', won)
await b.close(); console.log('DONE', DEV)
