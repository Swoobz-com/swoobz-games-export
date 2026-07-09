import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5191'
const OUT = process.argv[3] || `shots-autisk-fib-${Date.now()}`
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
async function clickCell(page, col, row, cols, rows) {
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x:r.x,y:r.y,w:r.width,h:r.height } })
  if (!box) return
  const fx = 0.05 + ((col + 0.5) / cols) * 0.9, fy = 0.06 + ((row + 0.5) / rows) * 0.82
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
}
function R(page, sel){ return page.evaluate((sel)=>{const el=document.querySelector(sel); if(!el) return null; const r=el.getBoundingClientRect(); return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),top:+r.top.toFixed(1),bottom:+r.bottom.toFixed(1),left:+r.left.toFixed(1),right:+r.right.toFixed(1)}}, sel) }
function gridAttrs(page){ return page.evaluate(()=>{ const el=document.querySelector('[data-testid="vault-canvas-shell"]'); if(!el) return null; return { full:el.getAttribute('data-grid-full'), tile:el.getAttribute('data-grid-tile'), gap:el.getAttribute('data-grid-gap'), plate:el.getAttribute('data-grid-plate') } }) }
function cssNum(page, sel, prop){ return page.evaluate(({sel,prop})=>{ const el=document.querySelector(sel); if(!el) return null; return getComputedStyle(el)[prop] }, {sel,prop}) }
async function phaseText(page){ return page.evaluate(()=>document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent || '') }
// World-card anatomy census
function worldCards(page){ return page.evaluate(()=>{
  const modes=['bluechips','altseason','shitcoin']
  const out=[]
  for(const m of modes){
    const el=document.querySelector(`[data-testid="vault-world-card-${m}"]`)
    if(!el){ out.push({mode:m,present:false}); continue }
    const r=el.getBoundingClientRect()
    const q=(s)=>el.querySelector(s)
    const icon=el.querySelector('span[aria-hidden="true"]')
    const pill=[...el.querySelectorAll('span')].find(s=>/^(NORMAL|HARD|CRAZY)$/.test((s.textContent||'').trim()))
    const risk=[...el.querySelectorAll('span')].find(s=>getComputedStyle(s).position==='absolute' && parseFloat(getComputedStyle(s).height)<=4)
    const riskFill=risk?risk.querySelector('span'):null
    const maxLabel=[...el.querySelectorAll('span')].find(s=>(s.textContent||'').trim()==='MAX')
    const maxVal=maxLabel?maxLabel.previousElementSibling:null
    const best=[...el.querySelectorAll('span')].find(s=>/^BEST$/.test((s.textContent||'').trim()))
    const cs=getComputedStyle(el)
    const rr=(e)=>{ if(!e) return null; const b=e.getBoundingClientRect(); return {x:+b.x.toFixed(1),y:+b.y.toFixed(1),w:+b.width.toFixed(1),h:+b.height.toFixed(1),right:+b.right.toFixed(1)} }
    out.push({ mode:m, present:true, rect:{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1)},
      pad:cs.padding, radius:cs.borderRadius, borderColor:cs.borderColor,
      icon: icon?{w:+icon.getBoundingClientRect().width.toFixed(1),h:+icon.getBoundingClientRect().height.toFixed(1),radius:getComputedStyle(icon).borderRadius,color:getComputedStyle(icon).color}:null,
      pillText: pill?pill.textContent.trim():null, pillRadius: pill?getComputedStyle(pill).borderRadius:null,
      riskH: risk?+risk.getBoundingClientRect().height.toFixed(1):null, riskFillW: riskFill?getComputedStyle(riskFill).width:null, riskFillBg: riskFill?getComputedStyle(riskFill).backgroundColor:null,
      maxVal: maxVal?maxVal.textContent.trim():null, maxValRect: rr(maxVal), maxValFont: maxVal?getComputedStyle(maxVal).fontSize:null,
      hasBest: !!best,
      titleFont: (()=>{const t=el.querySelector('span span span')||null; return null})(),
    })
  }
  // picker wrapper checks: does the picker container have border/bg (wrapper box)?
  const picker=document.querySelector('[data-testid="vault-board-worldpicker"]')
  let wrapper=null
  if(picker){ const cs=getComputedStyle(picker); wrapper={ border:cs.border, borderWidth:cs.borderWidth, bg:cs.backgroundColor, hasBalanceBox: /BALANCE/i.test(picker.textContent||''), hasTagline: /more rugs|bigger pumps/i.test(picker.textContent||'') } }
  return { cards:out, wrapper }
})}
function textSizes(page){ return page.evaluate(()=>{
  const grab=(sel)=>{const el=document.querySelector(sel); return el?getComputedStyle(el).fontSize:null}
  return { hudLeft: grab('[data-testid="vault-grid-hud-inner"] *') }
})}
async function measurePhase(page){
  return {
    grid: await gridAttrs(page),
    boardShell: await R(page,'[data-testid="vault-canvas-shell"]'),
    control: await R(page,'[data-testid="DesktopControlColumn"]'),
    controlGap: await cssNum(page,'[data-testid="DesktopControlColumn"]','gap'),
    hudRow: await R(page,'[data-testid="DesktopHudRow"]'),
    hudInner: await R(page,'[data-testid="vault-grid-hud-inner"]'),
    banner: await R(page,'[data-testid="vault-settled-banner"]'),
    cta: await R(page,'[data-testid="vault-ctl-cta"]'),
    grid2: await cssNum(page,'[data-testid="vault-grid-mainGrid"]','columnGap'),
    grid2row: await cssNum(page,'[data-testid="vault-grid-mainGrid"]','rowGap'),
    phase: await phaseText(page),
  }
}
const results={ port:PORT, out:OUT, heights:{}, mobile:null, trail:null }
async function run(){
  const browser=await puppeteer.launch({ executablePath:CHROME, headless:false, args:['--no-sandbox','--force-device-scale-factor=1','--autoplay-policy=no-user-gesture-required','--window-size=1500,1200'] })
  const page=await browser.newPage()
  for(const H of [900,1000,1080,1118]){
    await page.setViewport({ width:1440, height:H, deviceScaleFactor:1 })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil:'networkidle0' })
    await wait(900); await clickText(page,'got it'); await clickText(page,'skip'); await wait(300)
    const rec={}
    // ready = bet-entry
    await clickText(page,'ape in'); await wait(700)
    rec.ready = await measurePhase(page)
    rec.world = await worldCards(page)
    rec.mainGridCols = await cssNum(page,'[data-testid="vault-grid-mainGrid"]','gridTemplateColumns')
    // CTA button geometry
    rec.sendItBtn = await page.evaluate(()=>{ const cta=document.querySelector('[data-testid="vault-ctl-cta"]'); if(!cta) return null; const b=[...cta.querySelectorAll('button')].find(x=>/send it|ape in|go|take profit|bet again/i.test(x.textContent||'')); if(!b) return null; const r=b.getBoundingClientRect(); const cs=getComputedStyle(b); return {h:+r.height.toFixed(1),radius:cs.borderRadius,txt:b.textContent.trim().slice(0,20)} })
    // wager panel padding + chip gap
    rec.wager = await page.evaluate(()=>{ const w=document.querySelector('[data-testid="vault-ctl-wager"]'); if(!w) return null; const cs=getComputedStyle(w); const chips=[...w.querySelectorAll('button')].filter(b=>/^(1|5|10|25|50)$/.test((b.textContent||'').trim())); let chipGap=null; if(chips.length>=2){ chipGap=+(chips[1].getBoundingClientRect().left-chips[0].getBoundingClientRect().right).toFixed(1) } const panel=w.querySelector('[style*="padding"]')||w; return { padding:cs.padding, radius:cs.borderRadius, chipGap, chipCount:chips.length } })
    await page.screenshot({ path:`${OUT}/h${H}-ready.png` })
    // clip worldpicker
    const wp=await R(page,'[data-testid="vault-board-worldpicker"]')
    if(wp){ try{ await page.screenshot({ path:`${OUT}/h${H}-wp.png`, clip:{x:Math.max(0,wp.left-4),y:Math.max(0,wp.top-4),width:Math.min(1440-wp.left+4,wp.w+8),height:wp.h+8} }) }catch(e){} }
    // LIVE = playing
    await clickText(page,'bluechips'); await wait(200)
    await clickText(page,'send it','[data-testid="vault-ctl-cta"]'); await wait(1100)
    rec.live = await measurePhase(page)
    await page.screenshot({ path:`${OUT}/h${H}-live.png` })
    // RESULT = settled (win via crack interior + take profit)
    await clickCell(page,2,2,5,5); await wait(600); await clickText(page,'take profit'); await wait(1300)
    rec.result = await measurePhase(page)
    await page.screenshot({ path:`${OUT}/h${H}-result.png` })
    results.heights[H]=rec
  }
  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results,null,2))
  console.log(JSON.stringify(results,null,2))
}
run().catch(e=>{ console.error('FATAL',e); process.exit(1) })
