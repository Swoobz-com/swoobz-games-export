import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT=process.argv[2]||'5197'
const OUT=process.argv[3]||`shots-autisk-r2-${Date.now()}`
const wait=(ms)=>new Promise(r=>setTimeout(r,ms))
if(!fs.existsSync(OUT)) fs.mkdirSync(OUT,{recursive:true})
const warnings=[]
async function clickText(page,t,within){
  const h=await page.evaluateHandle(({t,within})=>{
    const root=within?document.querySelector(within):document
    if(!root) return null
    const els=[...root.querySelectorAll('button,[role=button],a')]
    const norm=e=>(e.textContent||'').replace(/\s+/g,' ').trim().toLowerCase()
    const lc=t.toLowerCase()
    return els.find(e=>e.offsetParent!==null&&!e.disabled&&norm(e)===lc)||
      els.find(e=>e.offsetParent!==null&&!e.disabled&&norm(e).includes(lc))||null
  },{t,within})
  const el=h.asElement(); if(!el) return false
  try{await el.click()}catch{return false}
  return true
}
async function clickCell(page,col,row,cols,rows){
  const box=await page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})
  if(!box) return
  const fx=0.05+((col+0.5)/cols)*0.9, fy=0.06+((row+0.5)/rows)*0.82
  await page.mouse.click(box.x+box.w*fx, box.y+box.h*fy)
}
function R(page,sel){return page.evaluate(sel=>{const el=document.querySelector(sel);if(!el)return null;const r=el.getBoundingClientRect();return{y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),top:+r.top.toFixed(1),bottom:+r.bottom.toFixed(1),left:+r.left.toFixed(1),right:+r.right.toFixed(1)}},sel)}
function fontOf(page,sel){return page.evaluate(sel=>{const el=document.querySelector(sel);if(!el)return null;return parseFloat(getComputedStyle(el).fontSize)},sel)}
// scan all visible leaf text elements -> {maxFont, top3, pumpFont}
function largestLiveText(page){return page.evaluate(()=>{
  const out=[]
  const walk=document.querySelectorAll('*')
  for(const el of walk){
    // only elements with a direct visible text node
    const hasText=[...el.childNodes].some(n=>n.nodeType===3 && (n.textContent||'').trim().length>0)
    if(!hasText) continue
    const r=el.getBoundingClientRect()
    if(r.width<1||r.height<1) continue
    const cs=getComputedStyle(el)
    if(cs.visibility==='hidden'||cs.display==='none'||parseFloat(cs.opacity)<0.05) continue
    if(r.bottom<0||r.top>window.innerHeight||r.right<0||r.left>window.innerWidth) continue
    const fs=parseFloat(cs.fontSize)
    const txt=(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,24)
    out.push({fs:+fs.toFixed(1),txt,testid:el.getAttribute('data-testid')||null})
  }
  out.sort((a,b)=>b.fs-a.fs)
  return {max:out[0]||null, top6:out.slice(0,6)}
})}
function gridAttrs(page){return page.evaluate(()=>{const el=document.querySelector('[data-testid="vault-canvas-shell"]');if(!el)return null;return{full:el.getAttribute('data-grid-full'),tile:el.getAttribute('data-grid-tile'),gap:el.getAttribute('data-grid-gap'),plate:el.getAttribute('data-grid-plate')}})}
function cssNum(page,sel,prop){return page.evaluate(({sel,prop})=>{const el=document.querySelector(sel);if(!el)return null;return getComputedStyle(el)[prop]},{sel,prop})}
function chipGap(page){return page.evaluate(()=>{
  // find preset chip rows (gutterChipRow) — buttons whose text is a preset number
  const rows=[...document.querySelectorAll('div')].filter(d=>{
    const btns=[...d.querySelectorAll(':scope > button')]
    return btns.length>=2 && btns.every(b=>/^\d+$/.test((b.textContent||'').trim()))
  })
  const res=[]
  for(const row of rows){
    const cs=getComputedStyle(row)
    const btns=[...row.querySelectorAll(':scope > button')]
    const measured=+(btns[1].getBoundingClientRect().left-btns[0].getBoundingClientRect().right).toFixed(1)
    res.push({cssGap:cs.gap, measured, n:btns.length, sample:btns.map(b=>b.textContent.trim()).join(',')})
  }
  return res
})}
function ctlLabels(page){return page.evaluate(()=>{
  // control column labels use styles.ctlLabel — sample fontSizes of small caps labels in control col
  const col=document.querySelector('[data-testid="DesktopControlColumn"]')||document.querySelector('[style*="grid-area: control"]')
  const scope=col||document
  const out=[]
  for(const el of scope.querySelectorAll('span,div')){
    const hasText=[...el.childNodes].some(n=>n.nodeType===3&&(n.textContent||'').trim())
    if(!hasText) continue
    const cs=getComputedStyle(el)
    const ls=parseFloat(cs.letterSpacing)||0
    const fs=parseFloat(cs.fontSize)
    const txt=(el.textContent||'').replace(/\s+/g,' ').trim()
    if(cs.textTransform==='uppercase'&&ls>2&&fs<=13&&/^[A-Z0-9 ·—+%.$]{2,20}$/.test(txt)) out.push({fs:+fs.toFixed(1),txt:txt.slice(0,16)})
  }
  return out
})}
function worldCardsMeasure(page){return page.evaluate(()=>{
  const modes=['bluechips','altseason','shitcoin']
  const cards=[]
  for(const m of modes){
    const el=document.querySelector(`[data-testid="vault-world-card-${m}"]`)
    if(!el){cards.push({mode:m,present:false});continue}
    const r=el.getBoundingClientRect()
    const icon=el.querySelector('span[aria-hidden="true"]')
    const iconR=icon?icon.getBoundingClientRect():null
    const pill=[...el.querySelectorAll('span')].find(s=>/^(NORMAL|HARD|CRAZY)$/.test((s.textContent||'').trim()))
    const maxLabel=[...el.querySelectorAll('span')].find(s=>(s.textContent||'').trim()==='MAX')
    const maxVal=maxLabel?maxLabel.previousElementSibling:null
    const riskLabel=[...el.querySelectorAll('span')].find(s=>(s.textContent||'').trim()==='RISK')
    const meta=[...el.querySelectorAll('span')].find(s=>/rugs\s*·/.test((s.textContent||'')))
    // risk bar: an absolutely-positioned thin span
    const riskBar=[...el.querySelectorAll('span')].find(s=>{const cs=getComputedStyle(s);return cs.position==='absolute'&&parseFloat(cs.height)<=6&&parseFloat(cs.height)>=2&&!s.querySelector('*')===false})
    const bar=[...el.querySelectorAll('span')].map(s=>({h:parseFloat(getComputedStyle(s).height),pos:getComputedStyle(s).position})).filter(x=>x.pos==='absolute')
    cards.push({mode:m,present:true,
      rect:{x:+r.x.toFixed(1),w:+r.w?.toFixed?.(1)||+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),top:+r.top.toFixed(1)},
      icon: iconR?{w:+iconR.width.toFixed(1),h:+iconR.height.toFixed(1)}:null,
      pill: pill?pill.textContent.trim():null,
      meta: meta?meta.textContent.replace(/\s+/g,' ').trim():null,
      maxVal: maxVal?maxVal.textContent.trim():null,
      maxLabel: maxLabel?maxLabel.textContent.trim():null,
      maxValX: maxVal?+maxVal.getBoundingClientRect().left.toFixed(1):null,
      maxValRight: maxVal?+maxVal.getBoundingClientRect().right.toFixed(1):null,
      riskLabel: riskLabel?true:false,
      absBars: bar,
    })
  }
  const picker=document.querySelector('[data-testid="vault-board-worldpicker"]')
  const txt=picker?picker.textContent||'':''
  return {cards, forbidden:{
    tagline: /more rugs|bigger pumps|pumping|go to zero|hidden/i.test(txt),
    rtpJargon: /RTP\s*97|edge\s*3%/i.test(txt),
    dots: !!(picker&&[...picker.querySelectorAll('span,div')].find(s=>{const t=(s.textContent||'').trim();return /^●+○*$|^[1-3]\s*\/\s*3$/.test(t)})),
    pickerText: txt.replace(/\s+/g,' ').trim().slice(0,240),
  }}
})}
function balanceLineAboveSendit(page){return page.evaluate(()=>{
  // BetConsole balance line: label BALANCE with a value, near the SEND IT button
  const bodyTxt=document.body.textContent||''
  const balSpans=[...document.querySelectorAll('span')].filter(s=>(s.textContent||'').trim()==='BALANCE')
  const visible=balSpans.filter(s=>s.offsetParent!==null).map(s=>{const r=s.getBoundingClientRect();return{top:+r.top.toFixed(1),parent:(s.parentElement?.textContent||'').replace(/\s+/g,' ').trim().slice(0,40)}})
  return {count:visible.length, visible}
})}
async function phaseText(page){return page.evaluate(()=>document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent||'')}
async function driveReady(page){await clickText(page,'ape in');await wait(800)}
async function driveLive(page){await clickText(page,'bluechips');await wait(200);await clickText(page,'send it','[data-testid="vault-ctl-cta"]');await wait(1100)}
async function driveResult(page){await clickCell(page,2,2,5,5);await wait(600);await clickText(page,'take profit');await wait(1300)}
const results={port:PORT,out:OUT,desktop:{},mobile:{},warnings}
async function run(){
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--no-sandbox','--force-device-scale-factor=1','--autoplay-policy=no-user-gesture-required','--window-size=1500,1200']})
  const page=await browser.newPage()
  page.on('console',m=>{const t=m.text();if(/borderColor|border.*shorthand|Warning:/i.test(t))warnings.push({viewport:'?',text:t.slice(0,200)})})
  page.on('pageerror',e=>warnings.push({type:'pageerror',text:String(e).slice(0,200)}))
  // ===== DESKTOP 1440 x {900,1080} =====
  for(const H of [900,1080]){
    await page.setViewport({width:1440,height:H,deviceScaleFactor:1})
    await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'})
    await wait(900);await clickText(page,'got it');await clickText(page,'skip');await wait(300)
    const rec={boardY:{},grid:null}
    await driveReady(page)
    rec.grid=await gridAttrs(page)
    rec.mainGridCols=await cssNum(page,'[data-testid="vault-grid-mainGrid"]','gridTemplateColumns')
    rec.control=await R(page,'[data-testid="DesktopControlColumn"]')
    rec.hudRow=await R(page,'[data-testid="DesktopHudRow"]')
    rec.boardShell=await R(page,'[data-testid="vault-canvas-shell"]')
    rec.boardY.ready=rec.boardShell?rec.boardShell.top:null
    rec.pumpFontReady=await fontOf(page,'[data-testid="vault-hud-pump-value"]')
    rec.chipGap=await chipGap(page)
    rec.ctlLabels=await ctlLabels(page)
    rec.world=await worldCardsMeasure(page)
    rec.sendItBottom=await page.evaluate(()=>{const cta=document.querySelector('[data-testid="vault-ctl-cta"]');if(!cta)return null;const b=[...cta.querySelectorAll('button')].find(x=>/send it/i.test(x.textContent||''))||cta.querySelector('button');if(!b)return null;const r=b.getBoundingClientRect();return{bottom:+r.bottom.toFixed(1),innerH:window.innerHeight,belowFold:r.bottom>window.innerHeight}})
    await page.screenshot({path:`${OUT}/desk-${H}-ready.png`})
    await driveLive(page)
    rec.boardShellLive=await R(page,'[data-testid="vault-canvas-shell"]')
    rec.boardY.live=rec.boardShellLive?rec.boardShellLive.top:null
    rec.pumpFontLive=await fontOf(page,'[data-testid="vault-hud-pump-value"]')
    rec.largestLive=await largestLiveText(page)
    await page.screenshot({path:`${OUT}/desk-${H}-live.png`})
    await driveResult(page)
    rec.boardShellResult=await R(page,'[data-testid="vault-canvas-shell"]')
    rec.boardY.result=rec.boardShellResult?rec.boardShellResult.top:null
    rec.pumpFontResult=await fontOf(page,'[data-testid="vault-hud-pump-value"]')
    rec.largestResult=await largestLiveText(page)
    rec.phaseResult=await phaseText(page)
    await page.screenshot({path:`${OUT}/desk-${H}-result.png`})
    results.desktop[H]=rec
  }
  // ===== MOBILE 390 =====
  await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true})
  await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'})
  await wait(900);await clickText(page,'got it');await clickText(page,'skip');await wait(300)
  await driveReady(page)
  const mrec={}
  mrec.world=await worldCardsMeasure(page)
  mrec.balanceLine=await balanceLineAboveSendit(page)
  mrec.overflow=await page.evaluate(()=>({scrollW:document.documentElement.scrollWidth,clientW:document.documentElement.clientWidth,innerW:window.innerWidth}))
  await page.screenshot({path:`${OUT}/mob-ready.png`,fullPage:false})
  await page.screenshot({path:`${OUT}/mob-ready-full.png`,fullPage:true})
  await driveLive(page)
  mrec.pumpFontLive=await fontOf(page,'[data-testid="vault-hud-pump-value"]')
  await page.screenshot({path:`${OUT}/mob-live.png`})
  await driveResult(page)
  mrec.phaseResult=await phaseText(page)
  await page.screenshot({path:`${OUT}/mob-result.png`})
  results.mobile=mrec
  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`,JSON.stringify(results,null,2))
  console.log(JSON.stringify(results,null,2))
}
run().catch(e=>{console.error('FATAL',e);process.exit(1)})
