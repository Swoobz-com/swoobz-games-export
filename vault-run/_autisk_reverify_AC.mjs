import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT=process.env.PORT||'5331'
const OUT='C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/shots'
fs.mkdirSync(OUT,{recursive:true})
const wait=ms=>new Promise(r=>setTimeout(r,ms))
async function clickText(p,t,within){try{const h=await p.evaluateHandle(({t,within})=>{const root=within?document.querySelector(within):document;if(!root)return null;const els=[...root.querySelectorAll('button,[role=button],a')];const norm=e=>(e.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&norm(e)===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&norm(e).includes(lc))||null},{t,within});const el=h.asElement();if(!el)return false;const box=await el.boundingBox();if(box){await p.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);return true}await el.click();return true}catch{return false}}
const boardBox=p=>p.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}}).catch(()=>null)
const status=p=>p.evaluate(()=>document.querySelector('[data-testid="vault-grid-status"]')?.textContent.replace(/\s+/g,' ').trim()||'').catch(()=>'')
const topbar=p=>p.evaluate(()=>document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent.replace(/\s+/g,' ').trim()||'NONE').catch(()=>'NONE')
const isRug=async p=>/RUGGED|BUST/i.test(await status(p))||/RUGGED|BUST/i.test(await topbar(p))
async function headerFooter(p){return p.evaluate(()=>{
  const se=document.scrollingElement||document.documentElement
  se.scrollTop=0
  const brand=[...document.querySelectorAll('span,div')].find(e=>/^RUG OR RICHES$/i.test((e.textContent||'').trim()))
  const roundEl=[...document.querySelectorAll('span,div')].find(e=>/^R\d{4}$/.test((e.textContent||'').trim()))
  const br=brand?brand.getBoundingClientRect():null
  const rr=roundEl?roundEl.getBoundingClientRect():null
  const innerH=window.innerHeight
  const scrollH=se.scrollHeight
  const scrollable=scrollH>innerH+2
  const footEl=[...document.querySelectorAll('div')].reverse().find(e=>/OPEN/.test(e.textContent||'')&&e.children.length<=4&&e.getBoundingClientRect().height<80)
  se.scrollTop=scrollH
  const fr=footEl?footEl.getBoundingClientRect():null
  se.scrollTop=0
  return {brandTopAtScroll0:br?Math.round(br.top):null,brandVisible:br?(br.top>=-1):null,roundTopAtScroll0:rr?Math.round(rr.top):null,roundText:roundEl?(roundEl.textContent||'').trim():'MISSING',innerH,scrollH,scrollable,maxScroll:Math.max(0,scrollH-innerH),footerBottomAtBottomScroll:fr?Math.round(fr.bottom):null,footerReachable:fr?(fr.bottom<=innerH+2):null}
}).catch(e=>({err:String(e)}))}
async function newDev(b,DEV){const DIMS=DEV==='iPhone14Pro'?{w:393,h:852,dsf:3}:{w:412,h:915,dsf:3};const p=await b.newPage();p.on('pageerror',e=>console.log('PAGEERR',DEV,e.message));await p.setViewport({width:DIMS.w,height:DIMS.h,deviceScaleFactor:DIMS.dsf,isMobile:true,hasTouch:true});return p}
async function reach(p){await p.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'});await p.evaluate(()=>{try{localStorage.clear();sessionStorage.clear()}catch(e){}});await p.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'});await wait(1300);await clickText(p,'ape in');await wait(250);await clickText(p,'got it');await wait(300)}
async function heroCap(p){return p.evaluate(()=>{const hero=document.querySelector('[data-testid="vault-hero-overlay"]');const cap=document.querySelector('[data-testid="vault-settled-board-caption"]');const R=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}};return{heroPresent:!!hero,heroText:hero?(hero.textContent||'').replace(/\s+/g,' ').trim().slice(0,40):null,heroRect:R(hero),capPresent:!!cap,capText:cap?(cap.textContent||'').replace(/\s+/g,' ').trim():null,capRect:R(cap)}})}
const b=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']})
for(const DEV of ['Pixel7','iPhone14Pro']){
  const W=DEV==='iPhone14Pro'?393:412
  const p=await newDev(b,DEV)
  await reach(p)
  console.log(`\n########## ${DEV} FIX A bet-entry ##########`)
  for(const world of ['bluechips','altseason','shitcoin']){
    await p.evaluate(m=>{const el=document.querySelector(`[data-testid="vault-world-card-${m}"]`);if(el)el.click()},world)
    await wait(500)
    const hf=await headerFooter(p)
    console.log(`  [${world}] bet-entry:`,JSON.stringify(hf))
    await p.evaluate(()=>{(document.scrollingElement||document.documentElement).scrollTop=0})
    await p.screenshot({path:`${OUT}/A-${DEV}-${world}-betentry-topstrip.png`,clip:{x:0,y:0,width:W,height:150}})
    await p.screenshot({path:`${OUT}/A-${DEV}-${world}-betentry-full.png`})
  }
  await p.evaluate(()=>{const el=document.querySelector('[data-testid="vault-world-card-bluechips"]');if(el)el.click()});await wait(400)
  await clickText(p,'send it','[data-testid="vault-ctl-cta"]')||await clickText(p,'send it')||await clickText(p,'crack a vault');await wait(1200)
  const hfPlay=await headerFooter(p)
  const tbTop=await p.evaluate(()=>{const t=document.querySelector('[data-testid="vault-grid-topbar"]');if(!t)return null;(document.scrollingElement||document.documentElement).scrollTop=0;const r=t.getBoundingClientRect();return{top:Math.round(r.top),text:(t.textContent||'').replace(/\s+/g,' ').trim().slice(0,60)}})
  console.log(`  PLAYING header/footer:`,JSON.stringify(hfPlay))
  console.log(`  PLAYING topbar:`,JSON.stringify(tbTop))
  await p.evaluate(()=>{(document.scrollingElement||document.documentElement).scrollTop=0})
  await p.screenshot({path:`${OUT}/A-${DEV}-playing-topstrip.png`,clip:{x:0,y:0,width:W,height:150}})
  await p.screenshot({path:`${OUT}/A-${DEV}-playing-full.png`})
  console.log(`\n########## ${DEV} FIX C settled ##########`)
  let box=await boardBox(p)
  for(const [c,r] of [[0,0],[2,0],[4,0],[1,2],[3,2]]){if(await isRug(p))break;await p.touchscreen.tap(box.x+box.w*((c+0.5)/5),box.y+box.h*((r+0.5)/5));await wait(350)}
  await clickText(p,'take profit');await wait(120)
  const cWin=[];let prev=0
  for(const d of [120,500,1000,1800]){await wait(d-prev);prev=d;cWin.push({t:d,...await heroCap(p)})}
  console.log('  WIN settle frames:',JSON.stringify(cWin))
  await p.screenshot({path:`${OUT}/C-${DEV}-settled-win.png`})
  await clickText(p,'bet again')||await clickText(p,'send it');await wait(700)
  await p.evaluate(()=>{const el=document.querySelector('[data-testid="vault-world-card-shitcoin"]');if(el)el.click()});await wait(400)
  await clickText(p,'send it','[data-testid="vault-ctl-cta"]')||await clickText(p,'send it');await wait(1100)
  box=await boardBox(p);let rugged=false
  for(let i=0;i<28&&box;i++){if(await isRug(p)){rugged=true;break}await p.touchscreen.tap(box.x+box.w*(0.12+0.14*(i%5)),box.y+box.h*(0.12+0.14*(Math.floor(i/5)%5)));await wait(300);if(await isRug(p)){rugged=true;break}}
  await wait(150)
  const cLoss=[];prev=0
  for(const d of [120,500,1000,1800]){await wait(d-prev);prev=d;cLoss.push({t:d,...await heroCap(p)})}
  console.log('  rugged:',rugged,'LOSS settle frames:',JSON.stringify(cLoss))
  await p.screenshot({path:`${OUT}/C-${DEV}-settled-loss.png`})
  await p.close()
}
await b.close()
console.log('\nDONE A+C')
