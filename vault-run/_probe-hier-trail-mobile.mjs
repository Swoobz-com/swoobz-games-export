import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT=process.argv[2]||'5191'
const OUT=process.argv[3]||'shots-autisk-fib-0706'
const wait=(ms)=>new Promise(r=>setTimeout(r,ms))
async function clickText(page,t,within){ const h=await page.evaluateHandle(({t,within})=>{const root=within?document.querySelector(within):document; if(!root)return null; const els=[...root.querySelectorAll('button,[role=button],a')]; const norm=e=>(e.textContent||'').replace(/\s+/g,' ').trim().toLowerCase(); const lc=t.toLowerCase(); return els.find(e=>e.offsetParent!==null&&!e.disabled&&norm(e)===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&norm(e).includes(lc))||null},{t,within}); const el=h.asElement(); if(!el)return false; try{await el.click()}catch{return false} return true }
async function clickCell(page,col,row,cols,rows){ const box=await page.evaluate(()=>{const c=document.querySelector('canvas'); if(!c)return null; const r=c.getBoundingClientRect(); return{x:r.x,y:r.y,w:r.width,h:r.height}}); if(!box)return; const fx=0.05+((col+0.5)/cols)*0.9,fy=0.06+((row+0.5)/rows)*0.82; await page.mouse.click(box.x+box.w*fx,box.y+box.h*fy) }
// find biggest text element on screen + specific pump/bag/labels
function hier(page){ return page.evaluate(()=>{
  const vis=el=>{const r=el.getBoundingClientRect(); return r.width>0&&r.height>0&&el.offsetParent!==null}
  const leaf=el=>el.children.length===0&&(el.textContent||'').trim().length>0
  const all=[...document.querySelectorAll('*')].filter(el=>vis(el)&&leaf(el))
  const withSize=all.map(el=>({txt:(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,28),fs:parseFloat(getComputedStyle(el).fontSize)}))
  withSize.sort((a,b)=>b.fs-a.fs)
  const findTxt=re=>{const el=all.find(e=>re.test((e.textContent||'').trim())); return el?{txt:el.textContent.trim().slice(0,24),fs:parseFloat(getComputedStyle(el).fontSize)}:null}
  return { top5: withSize.slice(0,5), pump: findTxt(/PUMP|^\d+\.\d+x/), rugrisk: findTxt(/RUG RISK/), toWinLabel: findTxt(/^TO WIN$/) }
})}
async function run(){
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--no-sandbox','--force-device-scale-factor=1','--autoplay-policy=no-user-gesture-required','--window-size=1500,1200']})
  const page=await browser.newPage()
  const res={}
  // Desktop 1440x1080 - LIVE hierarchy
  await page.setViewport({width:1440,height:1080,deviceScaleFactor:1})
  await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'}); await wait(900); await clickText(page,'got it'); await clickText(page,'skip'); await wait(300)
  await clickText(page,'ape in'); await wait(600)
  // panel value font (wager)
  res.wagerValueFs = await page.evaluate(()=>{const w=document.querySelector('[data-testid="vault-ctl-wager"]'); if(!w)return null; const spans=[...w.querySelectorAll('*')].filter(e=>e.children.length===0&&/USDC|\d/.test(e.textContent||'')); const big=spans.map(s=>parseFloat(getComputedStyle(s).fontSize)).sort((a,b)=>b-a)[0]; return big})
  res.labelFs = await page.evaluate(()=>{const l=document.querySelector('[data-testid="vault-ctl-wager"] span'); return l?parseFloat(getComputedStyle(l).fontSize):null})
  await clickText(page,'bluechips'); await wait(150); await clickText(page,'send it','[data-testid="vault-ctl-cta"]'); await wait(1100)
  res.live_hier = await hier(page)
  // TRAIL mode -> settled-after-trail secondary 36px button. Switch to TRAIL, run, then check settled secondary buttons
  await clickText(page,'trail'); await wait(400)
  await page.screenshot({path:`${OUT}/trail-live.png`})
  // go / start trail: click a couple cells to plan, then GO
  await clickCell(page,1,1,5,5); await wait(200); await clickCell(page,2,2,5,5); await wait(200)
  await clickText(page,'go'); await wait(1500)
  await page.screenshot({path:`${OUT}/trail-after-go.png`})
  // measure any secondary buttons in CTA (36px expected for secondary)
  res.trail_cta_buttons = await page.evaluate(()=>{const cta=document.querySelector('[data-testid="vault-ctl-cta"]'); if(!cta)return null; return [...cta.querySelectorAll('button')].map(b=>({txt:(b.textContent||'').replace(/\s+/g,' ').trim().slice(0,24),h:+b.getBoundingClientRect().height.toFixed(1),radius:getComputedStyle(b).borderRadius}))})
  // Also try to reach settled with trail to see secondary 36 button
  res.settled_after_trail = res.trail_cta_buttons
  // MOBILE 390
  await page.setViewport({width:390,height:844,deviceScaleFactor:2})
  await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'}); await wait(900); await clickText(page,'got it'); await clickText(page,'skip'); await wait(300)
  await clickText(page,'ape in'); await wait(700)
  await page.screenshot({path:`${OUT}/mobile-ready.png`,fullPage:true})
  res.mobile = await page.evaluate(()=>({ hasDesktopGrid:!!document.querySelector('[data-testid="vault-grid-mainGrid"]'), scrollW:document.documentElement.scrollWidth, innerW:window.innerWidth, worldCards:['bluechips','altseason','shitcoin'].map(m=>{const el=document.querySelector(`[data-testid="vault-world-card-${m}"]`); if(!el)return{m,present:false}; const r=el.getBoundingClientRect(); return{m,present:true,w:+r.width.toFixed(1),h:+r.height.toFixed(1)}}) }))
  await browser.close()
  fs.writeFileSync(`${OUT}/hier-trail-mobile.json`,JSON.stringify(res,null,2))
  console.log(JSON.stringify(res,null,2))
}
run().catch(e=>{console.error('FATAL',e);process.exit(1)})
