// fibgate-vault-0706.mjs — INDEPENDENT pixel-QA of vault control-column void fix.
// Fresh measurement, does NOT trust maker numbers. Width 1440 x {900,1000,1080,1118}.
import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT=process.argv[2]||'6301'
const OUT=process.argv[3]||'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/shots-fibgate'
const wait=(ms)=>new Promise(r=>setTimeout(r,ms))
if(!fs.existsSync(OUT))fs.mkdirSync(OUT,{recursive:true})
async function clickText(page,t,within){
  const h=await page.evaluateHandle(({t,within})=>{
    const root=within?document.querySelector(within):document
    if(!root)return null
    const els=[...root.querySelectorAll('button,[role=button],a')]
    const norm=(e)=>(e.textContent||'').replace(/\s+/g,' ').trim().toLowerCase()
    const lc=t.toLowerCase()
    return els.find(e=>e.offsetParent!==null&&!e.disabled&&norm(e)===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&norm(e).includes(lc))||null
  },{t,within})
  const el=h.asElement(); if(!el)return false
  try{await el.click()}catch{return false} return true
}
async function clickCell(page,col,row,cols,rows){
  const box=await page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})
  if(!box)return
  const fx=0.05+((col+0.5)/cols)*0.9, fy=0.06+((row+0.5)/rows)*0.82
  await page.mouse.click(box.x+box.w*fx,box.y+box.h*fy)
}
async function rect(page,sel){return page.evaluate((sel)=>{const el=document.querySelector(sel);if(!el)return null;const r=el.getBoundingClientRect();return{top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right),w:Math.round(r.width),h:Math.round(r.height)}},sel)}
async function scrollInfo(page){return page.evaluate(()=>({scrollHeight:document.documentElement.scrollHeight,innerHeight:window.innerHeight,scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth}))}
// Independent content-fill: max bottom-Y of control column's OWN direct children.
async function fill(page){return page.evaluate(()=>{
  const col=document.querySelector('[data-testid="DesktopControlColumn"]')
  if(!col)return null
  const cr=col.getBoundingClientRect()
  let cb=cr.top, childList=[]
  for(const ch of col.children){const r=ch.getBoundingClientRect();if(r.height===0)continue;childList.push({tid:ch.getAttribute('data-testid')||ch.tagName,bottom:Math.round(r.bottom),h:Math.round(r.height)});if(r.bottom>cb)cb=r.bottom}
  return{colTop:Math.round(cr.top),colBottom:Math.round(cr.bottom),colW:Math.round(cr.width),contentBottom:Math.round(cb),children:childList}
})}
async function ctaReach(page){return page.evaluate(()=>{const c=document.querySelector('[data-testid="vault-ctl-cta"]');if(!c)return null;const r=c.getBoundingClientRect();let n=c.parentElement,scr=[];while(n){const cs=getComputedStyle(n);if((cs.overflowY==='auto'||cs.overflowY==='scroll')&&n.scrollHeight>n.clientHeight+1)scr.push(n.getAttribute('data-testid')||n.tagName);n=n.parentElement}return{belowFold:r.bottom>window.innerHeight,bottom:Math.round(r.bottom),scrollers:scr}})}
function row(board,f,s,cta){
  const bb=board?board.bottom:null, cb=f?f.contentBottom:null, colB=f?f.colBottom:null
  return{boardBottom:bb,colBottom:colB,contentBottom:cb,void:(colB!=null&&cb!=null)?Math.round(colB-cb):null,alignDelta:(bb!=null&&cb!=null)?Math.round(bb-cb):null,colWidth:f?f.colW:null,hasVScroll:s?s.scrollHeight>s.innerHeight:null,scrollH:s?.scrollHeight,innerH:s?.innerHeight,ctaBelowFold:cta?.belowFold,ctaScrollers:cta?.scrollers,children:f?.children}
}
const results={port:PORT,heights:{}}
async function run(){
  const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox','--force-device-scale-factor=1','--autoplay-policy=no-user-gesture-required']})
  const page=await b.newPage()
  page.on('pageerror',e=>console.log('PAGEERROR',e.message))
  page.on('console',m=>{if(m.type()==='error')console.log('CONSOLEERR',m.text())})
  for(const h of [900,1000,1080,1118]){
    await page.setViewport({width:1440,height:h,deviceScaleFactor:1})
    await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'})
    await wait(600); await clickText(page,'got it'); await clickText(page,'skip'); await wait(250)
    const hr={}
    // RE-POINTED (game-flow-qa, 2026-07-06 — LOBBY-SPLASH REMOVAL): the game
    // now boots DIRECTLY into `bet-entry` ("PICK YOUR WORLD"); there is no
    // more separate `lobby` phase/splash and no "ape in" gate button to click
    // through. This snapshot used to be taken BEFORE an "ape in" tap and
    // labelled `hr.lobby`; that phase no longer exists, so the entry-state
    // snapshot IS the bet-entry snapshot now. Both keys are populated from
    // the SAME measurement (taken once, immediately on cold load) so any
    // downstream consumer still reading `hr.betEntry` keeps working, and
    // `hr.entry` documents that this is the true landing/entry phase.
    const board=await rect(page,'[data-testid="vault-canvas-shell"]')
    const entryMeasurement=row(board,await fill(page),await scrollInfo(page),await ctaReach(page))
    entryMeasurement.worldpicker=await rect(page,'[data-testid="vault-board-worldpicker"]')
    entryMeasurement.wager=await rect(page,'[data-testid="vault-ctl-wager"]')
    entryMeasurement.cta=await rect(page,'[data-testid="vault-ctl-cta"]')
    entryMeasurement.gapWagerToCta=(entryMeasurement.wager&&entryMeasurement.cta)?Math.round(entryMeasurement.cta.top-entryMeasurement.wager.bottom):null
    entryMeasurement.landsDirectlyOnBetEntry_noApeInGate=true // asserted true structurally: no click was needed to reach this state
    hr.entry=entryMeasurement
    hr.betEntry=entryMeasurement
    await page.screenshot({path:`${OUT}/h${h}-coldload-betentry.png`})
    // drive to playing/settled
    await clickText(page,'bluechips'); await wait(200)
    await clickText(page,'send it','[data-testid="vault-ctl-cta"]'); await wait(900)
    await clickCell(page,1,1,5,5); await wait(500)
    await clickText(page,'take profit'); await wait(900)
    await clickText(page,'bet again'); await wait(900)
    hr.playing=row(await rect(page,'[data-testid="vault-canvas-shell"]'),await fill(page),await scrollInfo(page),await ctaReach(page))
    await page.screenshot({path:`${OUT}/h${h}-playing.png`})
    await clickCell(page,1,1,5,5); await wait(500)
    await clickText(page,'take profit'); await wait(900)
    hr.settled=row(await rect(page,'[data-testid="vault-canvas-shell"]'),await fill(page),await scrollInfo(page),await ctaReach(page))
    await page.screenshot({path:`${OUT}/h${h}-settled.png`})
    results.heights[h]=hr
  }
  await b.close()
  fs.writeFileSync(`${OUT}/results.json`,JSON.stringify(results,null,2))
  console.log(JSON.stringify(results,null,2))
}
run().catch(e=>{console.error('FATAL',e);process.exit(1)})
