import puppeteer from "puppeteer-core"
import fs from "node:fs"
const EXE = "C:/Program Files/Google/Chrome/Application/chrome.exe"
const URL = "http://localhost:5182/"
const OUT = "C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-autisk-final-0707"
fs.mkdirSync(OUT, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate(rs => {
  const r = new RegExp(rs, "i")
  const b = [...document.querySelectorAll("button, div, span")].find(x => r.test((x.textContent||"").trim()) && (x.tagName==="BUTTON" || getComputedStyle(x).cursor==="pointer"))
  if (b) { b.click(); return b.textContent.trim() } return null
}, re.source)
const bodyText = page => page.evaluate(() => document.body.innerText)
async function boardGeo(page){ return page.evaluate(() => { const c=document.querySelector("canvas"); if(!c) return null; const r=c.getBoundingClientRect(); return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,w:r.width,h:r.height} }) }
async function trace(page, cells){ const g=await boardGeo(page); const T=g.w/14; for(const cell of cells){ await page.mouse.click(g.left+cell[0]*T+T/2, g.top+cell[1]*T+T/2); await wait(30) } }
async function mobileTrace(page){ const cells=[]; for(const row of [3,4]) for(const col of [3,4,5,6]) cells.push([col,row]); for(const cell of cells){ const g=await boardGeo(page); const T=g.w/14; await page.mouse.click(g.left+(cell[0]+0.5)*T, g.top+(cell[1]+0.5)*T); await wait(70) } }
const line8=[[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3]]
async function ensurePace(page, want){ for(let i=0;i<3;i++){ const lab=await page.evaluate(()=>{ const b=[...document.querySelectorAll("button,div,span")].find(x=>/^PACE:/.test((x.textContent||"").trim())); return b?b.textContent.trim():null }); if(!lab) return false; const inst=/INSTANT/i.test(lab); if((want==="instant"&&inst)||(want==="staggered"&&!inst)) return true; await clickText(page,/^PACE:/); await wait(120) } return false }
const browser = await puppeteer.launch({ executablePath: EXE, headless: false, args:["--autoplay-policy=no-user-gesture-required","--window-size=1500,1050"], defaultViewport:null })
const consoleErrors=[]
async function fresh(vp){ const page=await browser.newPage(); page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text())}); page.on("pageerror",e=>consoleErrors.push("pageerror:"+e.message)); await page.setViewport(vp); await page.goto(URL,{waitUntil:"load"}); await page.evaluate(()=>{try{localStorage.clear()}catch(e){}}); await page.reload({waitUntil:"load"}); await wait(600); return page }
async function shot(page,name){ await page.screenshot({path:`${OUT}/${name}.png`}) }
async function fullshot(page,name){ await page.screenshot({path:`${OUT}/${name}.png`, fullPage:true}) }

async function sweep(vp, pref, mobile){
  // LOBBY
  const page=await fresh(vp)
  await wait(400)
  await shot(page,`${pref}-01-lobby`)
  // PLANNING (enter dive)
  await clickText(page,/ENTER THE DIVE/); await wait(700)
  await shot(page,`${pref}-02-planning`)
  await fullshot(page,`${pref}-02b-planning-full`)
  // depth selector - click through depths to capture selector
  await clickText(page,/REEF/i); await wait(250)
  await shot(page,`${pref}-03-depth-reef`)
  // trace picks -> connector + focus bracket
  if(mobile) await mobileTrace(page); else await trace(page,line8)
  await wait(300)
  await shot(page,`${pref}-04-traced`)
  await fullshot(page,`${pref}-04b-traced-full`)
  await ensurePace(page,"instant")
  await shot(page,`${pref}-05-armed`)
  return page
}

async function playToOutcome(page, want, mobile, pace){
  await ensurePace(page, pace)
  await clickText(page,/^RUN THE LINE/)
  let outcome=null
  for(let i=0;i<80 && !outcome;i++){
    await wait(70)
    const t=await bodyText(page)
    if(/SECURED THE HAUL/i.test(t)) outcome="win"
    else if(/RUGGED BY THE DEEP/i.test(t)) outcome="bust"
  }
  await wait(500)
  return outcome
}

// re-run from planning until desired outcome
async function getOutcome(vp,pref,mobile,depth,want,pace){
  for(let a=0;a<26;a++){
    const page=await fresh(vp)
    await clickText(page,/ENTER THE DIVE/); await wait(500)
    await clickText(page,new RegExp(depth,"i")); await wait(200)
    if(mobile) await mobileTrace(page); else await trace(page,line8)
    await wait(200)
    // capture a mid-reveal frame on staggered
    await ensurePace(page,pace)
    await clickText(page,/^RUN THE LINE/)
    let outcome=null, gotMid=false
    for(let i=0;i<90 && !outcome;i++){
      await wait(60)
      const t=await bodyText(page)
      if(pace==="staggered" && !gotMid && i>=3 && i<=6){ await shot(page,`${pref}-06-reveal-staggered-mid`); gotMid=true }
      if(/SECURED THE HAUL/i.test(t)) outcome="win"
      else if(/RUGGED BY THE DEEP/i.test(t)) outcome="bust"
    }
    if(outcome===want){
      await wait(550)
      await shot(page,`${pref}-${want==="win"?"07-win":"08-bust"}`)
      await fullshot(page,`${pref}-${want==="win"?"07b-win-full":"08b-bust-full"}`)
      // settled certificate = full page bottom
      return page
    }
    await page.close()
  }
  return null
}

const DESK={width:1440,height:900,deviceScaleFactor:2}
const MOB={width:412,height:915,deviceScaleFactor:2}

// DESKTOP sweep planning phases
let d=await sweep(DESK,"desk",false); await d.close()
// DESKTOP win + certificate (staggered to also grab mid-reveal)
let dw=await getOutcome(DESK,"desk",false,"REEF","win","staggered"); if(dw) await dw.close()
// DESKTOP bust (instant)
let db=await getOutcome(DESK,"desk",false,"HADAL","bust","instant"); if(db) await db.close()

// MOBILE sweep
let m=await sweep(MOB,"mob",true); await m.close()
let mw=await getOutcome(MOB,"mob",true,"REEF","win","instant"); if(mw) await mw.close()
let mb=await getOutcome(MOB,"mob",true,"HADAL","bust","instant"); if(mb) await mb.close()

await browser.close()
console.log("CONSOLE ERRORS:", consoleErrors.length, JSON.stringify(consoleErrors.slice(0,8)))
console.log("DONE. desk win?",!!dw,"desk bust?",!!db,"mob win?",!!mw,"mob bust?",!!mb)
