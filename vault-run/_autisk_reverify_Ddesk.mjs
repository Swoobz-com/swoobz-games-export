import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT=process.env.PORT||'5331'
const OUT='C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/shots'
fs.mkdirSync(OUT,{recursive:true})
const wait=ms=>new Promise(r=>setTimeout(r,ms))
async function clickText(p,t,within){try{const h=await p.evaluateHandle(({t,within})=>{const root=within?document.querySelector(within):document;if(!root)return null;const els=[...root.querySelectorAll('button,[role=button],a')];const norm=e=>(e.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&norm(e)===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&norm(e).includes(lc))||null},{t,within});const el=h.asElement();if(!el)return false;await el.click();return true}catch{return false}}
async function rugsDown(p,times){for(let i=0;i<times;i++){await p.evaluate(()=>{const btns=[...document.querySelectorAll('button')];const minus=btns.find(b=>{const t=(b.textContent||'').trim();const par=(b.closest('[data-testid]')?.textContent||b.parentElement?.parentElement?.textContent||'');return (t==='−'||t==='-')&&/rug/i.test(par)});if(minus)minus.click()});await wait(220)}}
const status=p=>p.evaluate(()=>document.querySelector('[data-testid="vault-grid-status"]')?.textContent.replace(/\s+/g,' ').trim()||'').catch(()=>'')
const openedN=async p=>{const m=(await status(p)).match(/OPEN (\d+) of/);return m?+m[1]:-1}
const isRug=async p=>/RUGGED|BUST/i.test(await status(p))
const boardBox=p=>p.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}}).catch(()=>null)
async function badgeInfo(p){return p.evaluate(()=>{const el=document.querySelector('[data-testid="vault-rhythm-badge"]');if(!el)return{present:false};const cs=getComputedStyle(el);const r=el.getBoundingClientRect();return{present:true,tier:el.getAttribute('data-tier'),text:(el.textContent||'').replace(/\s+/g,' ').trim(),animationName:cs.animationName,animationDuration:cs.animationDuration,opacity:cs.opacity,visible:r.width>0&&r.height>0,rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}}})}
async function runBadge(b,reduced){
  const p=await b.newPage()
  if(reduced)await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}])
  await p.setViewport({width:1440,height:900,deviceScaleFactor:1})
  await p.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'})
  await p.evaluate(()=>{try{localStorage.clear();sessionStorage.clear()}catch(e){}})
  let best={present:false},shotTaken=false
  for(let a=1;a<=6&&!(best.present);a++){
    await p.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'});await wait(1100)
    await clickText(p,'ape in');await wait(200);await clickText(p,'got it');await wait(200)
    await p.evaluate(()=>{const el=document.querySelector('[data-testid="vault-world-card-bluechips"]');if(el)el.click()});await wait(300)
    await rugsDown(p,2)
    await clickText(p,'send it','[data-testid="vault-ctl-cta"]')||await clickText(p,'send it');await wait(900)
    const box=await boardBox(p);if(!box)continue
    const order=[[0,0],[1,0],[2,0],[3,0],[4,0],[0,1],[1,1],[2,1]];let prev=await openedN(p)
    for(const [c,r] of order){
      if(await isRug(p))break
      await p.mouse.click(box.x+box.w*((c+0.5)/5),box.y+box.h*((r+0.5)/5))
      let t=0;while(t<800){await wait(50);t+=50;const o=await openedN(p);if(o>prev){prev=o;break}}
      await wait(40)
      const bi=await badgeInfo(p)
      if(bi.present){best=bi;if(!shotTaken){await p.screenshot({path:`${OUT}/D-badge-${reduced?'reduced':'normal'}.png`});shotTaken=true}
        await p.screenshot({path:`${OUT}/D-badge-${reduced?'reduced':'normal'}-crop.png`,clip:{x:Math.max(0,bi.rect.x-40),y:Math.max(0,bi.rect.y-30),width:Math.min(700,bi.rect.w+120),height:Math.min(200,bi.rect.h+80)}})
        console.log(`  [${reduced?'REDUCED':'NORMAL'}] badge @open${prev}:`,JSON.stringify(bi));break}
    }
    console.log(`  attempt${a} open=${prev} rug=${await isRug(p)} badgePresent=${best.present}`)
  }
  if(!best.present)console.log(`  [${reduced?'REDUCED':'NORMAL'}] NO BADGE captured`)
  await p.close();return best
}
async function desktopRegression(b){
  const p=await b.newPage()
  await p.setViewport({width:1440,height:900,deviceScaleFactor:1})
  await p.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'})
  await p.evaluate(()=>{try{localStorage.clear();sessionStorage.clear()}catch(e){}})
  await p.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'});await wait(1200)
  await clickText(p,'ape in');await wait(250);await clickText(p,'got it');await wait(300)
  const center=await p.evaluate(()=>{const se=document.scrollingElement||document.documentElement;const brand=[...document.querySelectorAll('span,div')].find(e=>/^RUG OR RICHES$/i.test((e.textContent||'').trim()));const br=brand?brand.getBoundingClientRect():null;return{brandTop:br?Math.round(br.top):null,brandVisible:br?br.top>=-1:null,innerH:window.innerHeight,scrollH:se.scrollHeight,scrollable:se.scrollHeight>window.innerHeight+2}})
  console.log('  DESKTOP bet-entry:',JSON.stringify(center))
  await p.screenshot({path:`${OUT}/REG-desktop-betentry.png`})
  await p.evaluate(()=>{const el=document.querySelector('[data-testid="vault-world-card-bluechips"]');if(el)el.click()});await wait(300)
  await clickText(p,'send it','[data-testid="vault-ctl-cta"]')||await clickText(p,'send it');await wait(1000)
  await p.screenshot({path:`${OUT}/REG-desktop-playing.png`})
  const box=await boardBox(p)
  if(box){await p.mouse.click(box.x+box.w*0.3,box.y+box.h*0.3);await wait(400);await p.mouse.click(box.x+box.w*0.7,box.y+box.h*0.7);await wait(400)}
  await clickText(p,'take profit');await wait(700)
  const heroDesk=await p.evaluate(()=>{const h=document.querySelector('[data-testid="vault-hero-overlay"]');return{heroPresent:!!h,heroText:h?(h.textContent||'').replace(/\s+/g,' ').trim().slice(0,30):null}})
  console.log('  DESKTOP settled hero (should be present on desktop):',JSON.stringify(heroDesk))
  await p.screenshot({path:`${OUT}/REG-desktop-settled-win.png`})
  await p.close()
}
const b=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required','--force-device-scale-factor=1']})
console.log('\n########## FIX D reduced-motion rhythm badge ##########')
const normal=await runBadge(b,false)
const reduced=await runBadge(b,true)
console.log('\n########## REGRESSION desktop 1440 ##########')
await desktopRegression(b)
await b.close()
console.log('\nSUMMARY D: normal.animationName=',normal.animationName,'| reduced.animationName=',reduced.animationName,'| reduced.present=',reduced.present)
console.log('DONE D+DESK')
