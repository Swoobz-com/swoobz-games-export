import puppeteer from "puppeteer-core"
import fs from "node:fs"
const EXE = "C:/Program Files/Google/Chrome/Application/chrome.exe"
const URL = "http://localhost:5182/"
const OUT = "C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-autisk-regate-0707"
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
function overlap(a,b){ if(!a||!b) return null; const ix=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left)); const iy=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)); return +(ix*iy).toFixed(0) }
async function measure(page){
  return page.evaluate(()=>{
    const R = el => { if(!el) return null; const r=el.getBoundingClientRect(); return {left:+r.left.toFixed(1),top:+r.top.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)} }
    const heroWrap = [...document.querySelectorAll("div[aria-hidden]")].find(d=>getComputedStyle(d).zIndex==="20" && /SECURED THE HAUL/i.test(d.textContent||""))
    let heroCard=null, heroText=null, labelRect=null, labelLines=null, labelFont=null, labelLS=null
    let amtRect=null, amtFont=null, dollarRect=null, dollarFont=null, dollarVA=null, amtText=null, glyphRect=null
    if(heroWrap){
      const card = heroWrap.querySelector("div")
      heroCard = R(card)
      heroText = (heroWrap.textContent||"").replace(/\s+/g," ").trim()
      const spans=[...heroWrap.querySelectorAll("span")]
      const lab=spans.find(s=>/^SECURED THE HAUL$/i.test((s.textContent||"").trim()))
      if(lab){ labelRect=R(lab); labelLines=lab.getClientRects().length; const cs=getComputedStyle(lab); labelFont=cs.fontSize; labelLS=cs.letterSpacing }
      let amt=null, big=0
      for(const s of spans){ const cs=getComputedStyle(s); const sz=parseFloat(cs.fontSize); if(/\d/.test(s.textContent||"") && !/x\)?$/.test((s.textContent||"").trim()) && sz>=big && sz>=30){ big=sz; amt=s } }
      if(amt){ amtRect=R(amt); amtFont=getComputedStyle(amt).fontSize; amtText=amt.textContent.trim()
        const dollar=[...amt.querySelectorAll("span")].find(s=>((s.textContent||"").trim()==="$"))
        if(dollar){ dollarRect=R(dollar); const dc=getComputedStyle(dollar); dollarFont=dc.fontSize; dollarVA=dc.verticalAlign }
      }
      const g=heroWrap.querySelector("svg"); if(g) glyphRect=R(g)
    }
    let headerPlaque=null
    const claimedEl=[...document.querySelectorAll("div")].find(d=>d.children.length===0 && /^LINE CLAIMED$/i.test((d.textContent||"").trim()))
    if(claimedEl){ let el=claimedEl; for(let i=0;i<4&&el.parentElement;i++){ el=el.parentElement; const cs=getComputedStyle(el); if(cs.display==="flex" && cs.justifyContent==="space-between"){ break } } headerPlaque=R(el) }
    let receipt=null, receiptHeadTop=null
    const settledHeads=[...document.querySelectorAll("div")].filter(d=>d.children.length===0 && /^(SECURED THE HAUL|RUGGED BY THE DEEP)$/i.test((d.textContent||"").trim()))
    for(const h of settledHeads){ let anc=h, hidden=false; for(let i=0;i<6&&anc;i++){ if(anc.getAttribute && anc.getAttribute("aria-hidden")!==null && getComputedStyle(anc).zIndex==="20"){hidden=true;break} anc=anc.parentElement }
      if(!hidden){ receiptHeadTop=R(h); let el=h; for(let i=0;i<4&&el.parentElement;i++){ el=el.parentElement; const cs=getComputedStyle(el); if(cs.borderTopWidth && parseFloat(cs.borderTopWidth)>=1 && cs.borderTopStyle==="solid"){ break } } receipt=R(el); break }
    }
    const canvas=document.querySelector("canvas"); const board=R(canvas)
    return {heroCard,heroText,labelRect,labelLines,labelFont,labelLS,amtRect,amtFont,amtText,dollarRect,dollarFont,dollarVA,glyphRect,headerPlaque,receipt,receiptHeadTop,board,vw:window.innerWidth}
  })
}
const browser = await puppeteer.launch({ executablePath: EXE, headless: false, args:["--autoplay-policy=no-user-gesture-required","--window-size=1500,1050"], defaultViewport:null })
const consoleErrors=[]
async function fresh(vp){ const page=await browser.newPage(); page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text())}); page.on("pageerror",e=>consoleErrors.push("pageerror:"+e.message)); await page.setViewport(vp); await page.goto(URL,{waitUntil:"load"}); await page.evaluate(()=>{try{localStorage.clear()}catch(e){}}); await page.reload({waitUntil:"load"}); await wait(500); return page }
async function play(depth, vp, tag, mobile=false){
  const page=await fresh(vp)
  await clickText(page,/ENTER THE DIVE/); await wait(300)
  if(depth){ await clickText(page,new RegExp(depth,"i")); await wait(150) }
  await ensurePace(page,"instant")
  if(mobile) await mobileTrace(page); else await trace(page,line8)
  await wait(150)
  await clickText(page,/^RUN THE LINE/)
  let outcome=null, m=null
  for(let i=0;i<70 && !outcome;i++){
    await wait(80)
    const t=await bodyText(page)
    if(/SECURED THE HAUL/i.test(t)){ await wait(450); m=await measure(page); if(tag) await page.screenshot({path:`${OUT}/${tag}-full.png`}); outcome="win" }
    else if(/RUGGED BY THE DEEP/i.test(t)){ await wait(300); m=await measure(page); if(tag) await page.screenshot({path:`${OUT}/${tag}-full.png`}); outcome="bust" }
  }
  m = m || await measure(page)
  if(m.heroCard && tag){ const c=m.heroCard; const pad=18; await page.screenshot({path:`${OUT}/${tag}-herocrop.png`, clip:{x:Math.max(0,c.left-pad),y:Math.max(0,c.top-pad),width:Math.min(vp.width,c.w+pad*2),height:c.h+pad*2}}).catch(e=>{}) }
  if(m.amtRect && tag){ const c=m.amtRect; const pad=14; await page.screenshot({path:`${OUT}/${tag}-amountzoom.png`, clip:{x:Math.max(0,c.left-pad),y:Math.max(0,c.top-pad),width:c.w+pad*2,height:c.h+pad*2}}).catch(e=>{}) }
  return {page,outcome,m}
}
const log=[]
function rec(name,cond,detail){ log.push({name,pass:!!cond,detail}); console.log(cond?"PASS":"FAIL",name,"::",detail) }
const DESK={width:1440,height:900,deviceScaleFactor:1}
const MOB={width:412,height:915,deviceScaleFactor:2}
let mo=null
for(let a=0;a<24 && (!mo||mo.outcome!=="win");a++){ if(mo)await mo.page.close(); mo=await play("REEF",MOB,"mob-win",true) }
{ const m=mo.m
  rec("MOBILE WIN reached", mo.outcome==="win", mo.outcome)
  const clrTop = (m.heroCard&&m.headerPlaque)? +(m.heroCard.top - m.headerPlaque.bottom).toFixed(1) : null
  const rc = m.receipt||m.receiptHeadTop
  const clrBot = (m.heroCard&&rc)? +(rc.top - m.heroCard.bottom).toFixed(1) : null
  rec("MOBILE cartouche clears header plaque (>0)", clrTop!==null && clrTop>0, `clearanceTop=${clrTop}px heroTop=${m.heroCard&&m.heroCard.top} plaqueBottom=${m.headerPlaque&&m.headerPlaque.bottom}`)
  rec("MOBILE cartouche X header overlap=0", overlap(m.heroCard,m.headerPlaque)===0, `ov=${overlap(m.heroCard,m.headerPlaque)}`)
  rec("MOBILE cartouche clears receipt (>0)", clrBot!==null && clrBot>0, `clearanceBot=${clrBot}px heroBottom=${m.heroCard&&m.heroCard.bottom} receiptTop=${rc&&rc.top}`)
  rec("MOBILE cartouche X receipt overlap=0", overlap(m.heroCard,m.receipt)===0, `ov=${overlap(m.heroCard,m.receipt)} receipt=${JSON.stringify(m.receipt)}`)
  rec("MOBILE cartouche fits viewport", m.heroCard && m.heroCard.left>=-2 && m.heroCard.right<=414, `hero=${JSON.stringify(m.heroCard)} vw=${m.vw}`)
  rec("MOBILE label ON ONE LINE", m.labelLines===1, `lines=${m.labelLines} rect=${JSON.stringify(m.labelRect)} font=${m.labelFont} ls=${m.labelLS}`)
  rec("MOBILE glyph centered above label", m.glyphRect&&m.labelRect && Math.abs(((m.glyphRect.left+m.glyphRect.right)/2)-((m.labelRect.left+m.labelRect.right)/2))<6 && m.glyphRect.bottom<=m.labelRect.top+2, `glyphCx=${m.glyphRect&&((m.glyphRect.left+m.glyphRect.right)/2).toFixed(1)} labCx=${m.labelRect&&((m.labelRect.left+m.labelRect.right)/2).toFixed(1)} glyphBottom=${m.glyphRect&&m.glyphRect.bottom} labTop=${m.labelRect&&m.labelRect.top}`)
  rec("MOBILE amount font 42px", m.amtFont==="42px", `amtFont=${m.amtFont} text=${m.amtText}`)
  rec("MOBILE dollar present + 24px", m.dollarRect && m.dollarFont==="24px", `dollarFont=${m.dollarFont} rect=${JSON.stringify(m.dollarRect)} va=${m.dollarVA}`)
  const dBaseGap = (m.dollarRect&&m.amtRect)? +(m.amtRect.bottom - m.dollarRect.bottom).toFixed(1):null
  rec("MOBILE dollar inside amount L edge", m.dollarRect&&m.amtRect && m.dollarRect.left>=m.amtRect.left-1 && m.dollarRect.left<m.amtRect.left+30, `dollarLeft=${m.dollarRect&&m.dollarRect.left} amtLeft=${m.amtRect&&m.amtRect.left} baseGap=${dBaseGap}`)
  console.log("MOBILE heroText:", m.heroText, "| clrTop",clrTop,"clrBot",clrBot,"| headerPlaque",JSON.stringify(m.headerPlaque),"receiptHeadTop",JSON.stringify(m.receiptHeadTop))
}
await mo.page.close()
let dw=null
for(let a=0;a<20 && (!dw||dw.outcome!=="win");a++){ if(dw)await dw.page.close(); dw=await play("REEF",DESK,"desk-win") }
{ const m=dw.m
  rec("DESKTOP WIN reached", dw.outcome==="win", dw.outcome)
  rec("DESKTOP label ON ONE LINE", m.labelLines===1, `lines=${m.labelLines} font=${m.labelFont} ls=${m.labelLS} rect=${JSON.stringify(m.labelRect)}`)
  rec("DESKTOP glyph centered above label", m.glyphRect&&m.labelRect && Math.abs(((m.glyphRect.left+m.glyphRect.right)/2)-((m.labelRect.left+m.labelRect.right)/2))<6 && m.glyphRect.bottom<=m.labelRect.top+2, `glyphCx=${m.glyphRect&&((m.glyphRect.left+m.glyphRect.right)/2).toFixed(1)} labCx=${m.labelRect&&((m.labelRect.left+m.labelRect.right)/2).toFixed(1)}`)
  rec("DESKTOP amount font 42px", m.amtFont==="42px", `amtFont=${m.amtFont} text=${m.amtText}`)
  rec("DESKTOP dollar present + 24px", m.dollarRect && m.dollarFont==="24px", `dollarFont=${m.dollarFont} va=${m.dollarVA}`)
  rec("DESKTOP hero within board horiz", m.heroCard && m.board && m.heroCard.left>=m.board.left-3 && m.heroCard.right<=m.board.right+3, `hero=${JSON.stringify(m.heroCard)} board=${JSON.stringify(m.board)}`)
  rec("DESKTOP hero X receipt overlap=0", overlap(m.heroCard,m.receipt)===0, `ov=${overlap(m.heroCard,m.receipt)}`)
  console.log("DESKTOP heroText:", m.heroText)
}
await dw.page.close()
let db=null
for(let a=0;a<16 && (!db||db.outcome!=="bust");a++){ if(db)await db.page.close(); db=await play("HADAL",DESK,"desk-bust") }
{ const m=db.m
  rec("DESKTOP BUST reached", db.outcome==="bust", db.outcome)
  console.log("BUST heroText:", m.heroText, "receipt:", JSON.stringify(m.receipt))
}
await db.page.close()
let mb=null
for(let a=0;a<18 && (!mb||mb.outcome!=="bust");a++){ if(mb)await mb.page.close(); mb=await play("HADAL",MOB,"mob-bust",true) }
{ const m=mb.m
  rec("MOBILE BUST reached", mb.outcome==="bust", mb.outcome)
}
await mb.page.close()
await browser.close()
console.log("\n=== CONSOLE ERRORS:", consoleErrors.length, consoleErrors.slice(0,6))
const fails=log.filter(r=>!r.pass)
console.log("=== SUMMARY PASS", log.filter(r=>r.pass).length,"/",log.length)
if(fails.length){ console.log("FAILS:"); fails.forEach(f=>console.log(" -",f.name,"::",f.detail)) }
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({log,consoleErrors},null,2))
