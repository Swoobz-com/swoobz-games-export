import puppeteer from "puppeteer-core"
import fs from "node:fs"
const EXE = "C:/Program Files/Google/Chrome/Application/chrome.exe"
const URL = "http://localhost:5182/"
const OUT = "C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-autisk-hero-0707"
fs.mkdirSync(OUT, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate(rs => {
  const r = new RegExp(rs, "i")
  const b = [...document.querySelectorAll("button, div, span")].find(x => r.test((x.textContent||"").trim()) && (x.tagName==="BUTTON" || getComputedStyle(x).cursor==="pointer"))
  if (b) { b.click(); return b.textContent.trim() } return null
}, re.source)
const bodyText = page => page.evaluate(() => document.body.innerText)
async function boardGeo(page){ return page.evaluate(() => { const c=document.querySelector("canvas"); if(!c) return null; const r=c.getBoundingClientRect(); return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,w:r.width,h:r.height} }) }
async function trace(page, cells){ const g=await boardGeo(page); const T=g.w/14; for(const cell of cells){ await page.mouse.click(g.left+cell[0]*T+T/2, g.top+cell[1]*T+T/2); await wait(25) } }
async function mobileTrace(page){ const cells=[]; for(const row of [3,4]) for(const col of [3,4,5,6]) cells.push([col,row]); for(const cell of cells){ const g=await boardGeo(page); const T=g.w/14; await page.mouse.click(g.left+(cell[0]+0.5)*T, g.top+(cell[1]+0.5)*T); await wait(70) } }
const line8=[[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3]]
async function ensurePace(page, want){ for(let i=0;i<3;i++){ const lab=await page.evaluate(()=>{ const b=[...document.querySelectorAll("button,div,span")].find(x=>/^PACE:/.test((x.textContent||"").trim())); return b?b.textContent.trim():null }); if(!lab) return false; const inst=/INSTANT/i.test(lab); if((want==="instant"&&inst)||(want==="staggered"&&!inst)) return true; await clickText(page,/^PACE:/); await wait(120) } return false }
async function installCoin(page){ await page.evaluate(()=>{ window.__cf=0; if(window.__o) window.__o.disconnect(); const seen=img=>{try{if((getComputedStyle(img).animationName||"").includes("assayCoinFly"))window.__cf++}catch(e){}}; window.__o=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue; if(n.tagName==="IMG")seen(n); else if(n.querySelectorAll)n.querySelectorAll("img").forEach(seen)}}); window.__o.observe(document.body,{childList:true,subtree:true}) }) }
const coinFlies = page => page.evaluate(()=>window.__cf||0)
function overlap(a,b){ if(!a||!b) return null; const ix=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left)); const iy=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)); return +(ix*iy).toFixed(0) }
async function measure(page){
  return page.evaluate(()=>{
    const R = el => { if(!el) return null; const r=el.getBoundingClientRect(); return {left:+r.left.toFixed(1),top:+r.top.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)} }
    const heroWrap = [...document.querySelectorAll("div[aria-hidden]")].find(d=>getComputedStyle(d).zIndex==="20" && /SECURED THE HAUL/i.test(d.textContent||""))
    let heroCard=null, heroAmount=null, amtFont=null, amtColor=null, amtText=null, heroText=null, labelFont=null
    if(heroWrap){
      const card = heroWrap.querySelector("div")
      heroCard = R(card)
      heroText = (heroWrap.textContent||"").replace(/\s+/g," ").trim()
      const spans=[...heroWrap.querySelectorAll("span")]
      let best=null,bestSz=0
      for(const s of spans){ const cs=getComputedStyle(s); const sz=parseFloat(cs.fontSize); if(/[\d.,]/.test(s.textContent||"") && sz>bestSz){best=s;bestSz=sz} }
      if(best){ heroAmount=R(best); amtFont=getComputedStyle(best).fontSize; amtColor=getComputedStyle(best).color; amtText=best.textContent.trim() }
      const lab=spans.find(s=>/SECURED THE HAUL/i.test(s.textContent||""))
      if(lab) labelFont=getComputedStyle(lab).fontSize
    }
    const toWinLab=[...document.querySelectorAll("div,span")].find(x=>/^TO WIN$/i.test((x.textContent||"").trim()))
    let toWin=null; if(toWinLab){ let el=toWinLab; for(let i=0;i<3&&el.parentElement;i++)el=el.parentElement; toWin=R(el) }
    const payLab=[...document.querySelectorAll("div")].find(d=>d.children.length===0 && (d.textContent||"").trim()==="PAYOUT")
    let payVal=null, payFont=null, payColor=null, payText=null
    if(payLab){ const v=payLab.nextElementSibling; if(v){ payVal=R(v); payFont=getComputedStyle(v).fontSize; payColor=getComputedStyle(v).color; payText=v.textContent.trim() } }
    const poly=[...document.querySelectorAll("polygon")].find(p=>/16,10.8/.test(p.getAttribute("points")||""))
    let seal=null; if(poly){ const c=poly.closest("div"); seal=R(c) }
    const copies=[...document.querySelectorAll("button")].filter(b=>/^Copy /i.test(b.getAttribute("aria-label")||"")).map(R)
    const plabel=[...document.querySelectorAll("div,span")].find(x=>/^(LINE BROKE|LINE CLAIMED)$/i.test((x.textContent||"").trim()))
    let plaque=null; if(plabel){ let el=plabel; for(let i=0;i<3&&el.parentElement;i++)el=el.parentElement; plaque=el.innerText.replace(/\s+/g," ").trim() }
    const haulLab=[...document.querySelectorAll("div,span")].find(x=>(x.textContent||"").trim()==="HAUL" && (x.textContent||"").trim().length<6)
    let haul=null; if(haulLab){ let el=haulLab; for(let i=0;i<4&&el.parentElement;i++)el=el.parentElement; haul=el.innerText.replace(/\s+/g," ").trim() }
    const canvas=document.querySelector("canvas"); const board=R(canvas)
    return {heroCard,heroAmount,amtFont,amtColor,amtText,heroText,labelFont,toWin,payVal,payFont,payColor,payText,seal,copies,plaque,haul,board,vw:window.innerWidth}
  })
}
const browser = await puppeteer.launch({ executablePath: EXE, headless: false, args:["--autoplay-policy=no-user-gesture-required","--window-size=1500,1000"], defaultViewport:null })
const consoleErrors=[]
async function fresh(vp){ const page=await browser.newPage(); page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text())}); page.on("pageerror",e=>consoleErrors.push("pageerror:"+e.message)); await page.setViewport(vp); await page.goto(URL,{waitUntil:"load"}); await page.evaluate(()=>{try{localStorage.clear()}catch(e){}}); await page.reload({waitUntil:"load"}); await wait(500); return page }
async function play(pace, depth, vp, tag, mobile=false){
  const page=await fresh(vp)
  await clickText(page,/ENTER THE DIVE/); await wait(300)
  if(depth){ await clickText(page,new RegExp(depth,"i")); await wait(150) }
  await ensurePace(page,pace)
  if(mobile) await mobileTrace(page); else await trace(page,line8)
  await wait(150)
  await installCoin(page)
  await clickText(page,/^RUN THE LINE/)
  let outcome=null, heroMeas=null
  for(let i=0;i<70 && !outcome;i++){
    await wait(80)
    const t=await bodyText(page)
    if(/SECURED THE HAUL/i.test(t)){ await wait(450); heroMeas=await measure(page); if(tag) await page.screenshot({path:`${OUT}/${tag}-full.png`}); outcome="win" }
    else if(/RUGGED BY THE DEEP/i.test(t)){ outcome="bust" }
  }
  await wait(200)
  const flies=await coinFlies(page)
  const m = heroMeas || await measure(page)
  if(outcome==="bust" && tag) await page.screenshot({path:`${OUT}/${tag}-full.png`})
  if(m.heroCard && tag){ const c=m.heroCard; const pad=16; await page.screenshot({path:`${OUT}/${tag}-herocrop.png`, clip:{x:Math.max(0,c.left-pad),y:Math.max(0,c.top-pad),width:Math.min(vp.width,c.w+pad*2),height:c.h+pad*2}}).catch(e=>{}) }
  if(m.payVal && tag){ const c=m.payVal; const x=Math.max(0,c.left-270); await page.screenshot({path:`${OUT}/${tag}-receiptcrop.png`, clip:{x,y:Math.max(0,c.top-32),width:Math.min(vp.width-x,360),height:180}}).catch(e=>{}) }
  return {page,outcome,flies,m}
}
const log=[]
function rec(name,cond,detail){ log.push({name,pass:!!cond,detail}); console.log(cond?"PASS":"FAIL",name,"::",detail) }
const DESK={width:1440,height:900,deviceScaleFactor:1}
const MOB={width:412,height:915,deviceScaleFactor:2}
let w=null
for(let a=0;a<20 && (!w||w.outcome!=="win");a++){ if(w)await w.page.close(); w=await play("instant","REEF",DESK,"desk-win") }
{ const m=w.m
  rec("WIN reached", w.outcome==="win", w.outcome)
  rec("hero amount font 42px", m.amtFont==="42px", `amtFont=${m.amtFont} text=${m.amtText} color=${m.amtColor}`)
  rec("hero card X receipt PAYOUT = 0", overlap(m.heroCard,m.payVal)===0, `ov=${overlap(m.heroCard,m.payVal)} hero=${JSON.stringify(m.heroCard)} pay=${JSON.stringify(m.payVal)}`)
  rec("hero card X TO WIN = 0", overlap(m.heroCard,m.toWin)===0, `ov=${overlap(m.heroCard,m.toWin)} toWin=${JSON.stringify(m.toWin)}`)
  rec("hero card within board horiz", m.heroCard && m.board && m.heroCard.left>=m.board.left-2 && m.heroCard.right<=m.board.right+2, `hero=${JSON.stringify(m.heroCard)} board=${JSON.stringify(m.board)}`)
  rec("amount within card", m.heroCard&&m.heroAmount && m.heroAmount.left>=m.heroCard.left && m.heroAmount.right<=m.heroCard.right, `amt=${JSON.stringify(m.heroAmount)}`)
  rec("receipt PAYOUT 25px", m.payFont==="25px", `payFont=${m.payFont} text=${m.payText} color=${m.payColor}`)
  rec("receipt PAYOUT X seal = 0", overlap(m.payVal,m.seal)===0, `ov=${overlap(m.payVal,m.seal)} seal=${JSON.stringify(m.seal)}`)
  console.log("WIN heroText:", m.heroText)
  console.log("WIN copies:", JSON.stringify(m.copies))
}
await w.page.close()
let b=null
for(let a=0;a<16 && (!b||b.outcome!=="bust");a++){ if(b)await b.page.close(); b=await play("instant","HADAL",DESK,"desk-bust") }
{ const m=b.m
  rec("BUST reached", b.outcome==="bust", b.outcome)
  rec("BUST 0 coin-flies", b.flies===0, `flies=${b.flies}`)
  rec("BUST HAUL zero-state", m.haul && !/\([1-9]\d*\.\d{2}x\)/.test(m.haul), `haul="${m.haul}"`)
  rec("BUST plaque LINE BROKE 0.00 no nonzero", m.plaque && /LINE BROKE/i.test(m.plaque) && /\b0\.00\b/.test(m.plaque) && !/[1-9]\d*\.\d{2}x/.test(m.plaque), `plaque="${m.plaque}"`)
  rec("BUST receipt PAYOUT 0.00", m.payText && /0\.00/.test(m.payText), `payText="${m.payText}" color=${m.payColor}`)
  rec("BUST receipt PAYOUT X seal = 0", overlap(m.payVal,m.seal)===0, `ov=${overlap(m.payVal,m.seal)}`)
}
await b.page.close()
let mo=null
for(let a=0;a<22 && (!mo||mo.outcome!=="win");a++){ if(mo)await mo.page.close(); mo=await play("instant","REEF",MOB,"mob-win",true) }
{ const m=mo.m
  rec("MOBILE WIN reached", mo.outcome==="win", mo.outcome)
  rec("MOBILE hero amount 42px", m.amtFont==="42px", `amtFont=${m.amtFont} text=${m.amtText}`)
  rec("MOBILE hero fits viewport", m.heroCard && m.heroCard.left>=-2 && m.heroCard.right<=414, `hero=${JSON.stringify(m.heroCard)} vw=${m.vw}`)
  rec("MOBILE amount within card", m.heroCard&&m.heroAmount && m.heroAmount.left>=m.heroCard.left-1 && m.heroAmount.right<=m.heroCard.right+1, `amt=${JSON.stringify(m.heroAmount)} card=${JSON.stringify(m.heroCard)}`)
  console.log("MOBILE cardW=", m.heroCard?m.heroCard.w:null, "heroText:", m.heroText)
}
await mo.page.close()
await browser.close()
console.log("\n=== CONSOLE ERRORS:", consoleErrors.length, consoleErrors.slice(0,6))
const fails=log.filter(r=>!r.pass)
console.log("=== SUMMARY PASS", log.filter(r=>r.pass).length,"/",log.length)
if(fails.length){ console.log("FAILS:"); fails.forEach(f=>console.log(" -",f.name,"::",f.detail)) }
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({log,consoleErrors},null,2))
