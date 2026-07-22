import puppeteer from "puppeteer-core"
import fs from "node:fs"
const EXE = "C:/Program Files/Google/Chrome/Application/chrome.exe"
const URL = "http://localhost:5182/"
const OUT = "C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-artotty-shipgate-0707"
fs.mkdirSync(OUT, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate(rs => {
  const r = new RegExp(rs, "i")
  const b = [...document.querySelectorAll("button, div, span")].find(x => r.test((x.textContent||"").trim()) && (x.tagName==="BUTTON" || getComputedStyle(x).cursor==="pointer"))
  if (b) { b.click(); return b.textContent.trim() } return null
}, re.source)
const bodyText = page => page.evaluate(() => document.body.innerText)
async function boardGeo(page){ return page.evaluate(() => { const c=document.querySelector("canvas"); if(!c) return null; const r=c.getBoundingClientRect(); return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,w:r.width,h:r.height} }) }
async function trace(page, cells){ const g=await boardGeo(page); const T=g.w/14; for(const cell of cells){ await page.mouse.click(g.left+cell[0]*T+T/2, g.top+cell[1]*T+T/2); await wait(35) } }
async function mobileTrace(page){ const cells=[]; for(const row of [3,4]) for(const col of [3,4,5,6]) cells.push([col,row]); for(const cell of cells){ const g=await boardGeo(page); const T=g.w/14; await page.mouse.click(g.left+(cell[0]+0.5)*T, g.top+(cell[1]+0.5)*T); await wait(80) } }
const line8=[[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3]]
async function ensurePace(page, want){ for(let i=0;i<3;i++){ const lab=await page.evaluate(()=>{ const b=[...document.querySelectorAll("button,div,span")].find(x=>/^PACE:/.test((x.textContent||"").trim())); return b?b.textContent.trim():null }); if(!lab) return false; const inst=/INSTANT/i.test(lab); if((want==="instant"&&inst)||(want==="staggered"&&!inst)) return true; await clickText(page,/^PACE:/); await wait(120) } return false }
const browser = await puppeteer.launch({ executablePath: EXE, headless: false, args:["--autoplay-policy=no-user-gesture-required","--window-size=1500,1050"], defaultViewport:null })
const consoleErrors=[]
async function fresh(vp){ const page=await browser.newPage(); page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text())}); page.on("pageerror",e=>consoleErrors.push("pageerror:"+e.message)); await page.setViewport(vp); await page.goto(URL,{waitUntil:"load"}); await page.evaluate(()=>{try{localStorage.clear()}catch(e){}}); await page.reload({waitUntil:"load"}); await wait(700); return page }
const DESK={width:1440,height:900,deviceScaleFactor:1}
const MOB={width:412,height:915,deviceScaleFactor:2}
async function shot(page,name){ await page.screenshot({path:`${OUT}/${name}.png`}); console.log("shot",name) }

async function captureSet(vp, pfx, mobile){
  // 1. LOBBY / ENTRY
  const page=await fresh(vp)
  await wait(400)
  await shot(page,`${pfx}-01-lobby`)
  // depth selector visible on entry column; capture then enter
  await clickText(page,/ENTER THE DIVE/); await wait(500)
  await shot(page,`${pfx}-02-plan-empty`)
  // select a depth (REEF for win path capture, but capture the selector interaction)
  await clickText(page,/REEF/i); await wait(250)
  await shot(page,`${pfx}-03-depth-reef`)
  // trace a partial line to show planning board + route connector + HAUL gauge + TO WIN
  const partial = mobile ? null : [[3,3],[4,3],[5,3],[6,3]]
  if(mobile){ // partial mobile trace
    const cells=[[3,3],[4,3],[5,3]]
    for(const cell of cells){ const g=await boardGeo(page); const T=g.w/14; await page.mouse.click(g.left+(cell[0]+0.5)*T, g.top+(cell[1]+0.5)*T); await wait(90) }
  } else { await trace(page, partial) }
  await wait(250)
  await shot(page,`${pfx}-04-plan-partial`)
  await page.close()
}

// WIN + BUST + settle capture on a given viewport
async function playOutcome(vp, pfx, depth, wantWin, pace, mobile){
  for(let a=0;a<24;a++){
    const page=await fresh(vp)
    await clickText(page,/ENTER THE DIVE/); await wait(300)
    if(depth) await clickText(page,new RegExp(depth,"i")); await wait(150)
    await ensurePace(page, pace)
    if(mobile) await mobileTrace(page); else await trace(page,line8)
    await wait(150)
    await clickText(page,/^RUN THE LINE/)
    // dense capture during reveal
    let mid=false, outcome=null
    for(let i=0;i<80 && !outcome;i++){
      await wait(70)
      if(!mid && i>2){ await shot(page,`${pfx}-05-reveal-${pace}`); mid=true }
      const t=await bodyText(page)
      if(/SECURED THE HAUL/i.test(t)){ await wait(500); outcome="win" }
      else if(/RUGGED BY THE DEEP/i.test(t)){ await wait(350); outcome="bust" }
    }
    if(outcome==="win" && wantWin){ await shot(page,`${pfx}-06-win-hero`); await wait(1800); await shot(page,`${pfx}-07-win-settled`); await page.close(); return "win" }
    if(outcome==="bust" && !wantWin){ await shot(page,`${pfx}-06-bust`); await wait(1500); await shot(page,`${pfx}-07-bust-settled`); await page.close(); return "bust" }
    await page.close()
  }
  return null
}

// DESKTOP
await captureSet(DESK,"desk",false)
const dw=await playOutcome(DESK,"desk","REEF",true,"staggered",false)
console.log("desk win:",dw)
const dwi=await playOutcome(DESK,"deskI","REEF",true,"instant",false)
console.log("desk win instant:",dwi)
const db=await playOutcome(DESK,"desk","HADAL",false,"staggered",false)
console.log("desk bust:",db)
// MOBILE
await captureSet(MOB,"mob",true)
const mw=await playOutcome(MOB,"mob","REEF",true,"staggered",true)
console.log("mob win:",mw)
const mb=await playOutcome(MOB,"mob","HADAL",false,"staggered",true)
console.log("mob bust:",mb)

await browser.close()
console.log("\n=== CONSOLE ERRORS:", consoleErrors.length)
consoleErrors.slice(0,15).forEach(e=>console.log("  ERR:",e))
fs.writeFileSync(`${OUT}/errors.json`, JSON.stringify(consoleErrors,null,2))
