import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT=6612, OUT='shots-autisk-fibgate-0706'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
async function clickText(page,t){ const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button],a')];const norm=e=>(e.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&norm(e)===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&norm(e).includes(lc))||null},t);const el=h.asElement();if(!el)return false;try{await el.click()}catch(e){return false}return true }
async function dismiss(page){await clickText(page,'got it');await clickText(page,'skip');await wait(300)}
async function rect(page,sel){return page.evaluate(sel=>{const el=document.querySelector(sel);if(!el)return null;const r=el.getBoundingClientRect();return{w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top),right:Math.round(r.right),left:Math.round(r.left)}},sel)}
async function phase(page){return page.evaluate(()=>{const h=document.querySelector('[data-testid="vault-grid-topbar"]');return document.body.textContent.includes('SETTLED')?'settled':document.querySelector('[data-testid="vault-settled-banner"]')?'settled':(document.querySelector('canvas')?'live?':'?')})}
async function greenCoin(page){return page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const ctx=c.getContext('2d');let d;try{d=ctx.getImageData(0,0,c.width,c.height).data}catch(e){return{error:1}}let s=0,n=0;for(let i=0;i<d.length;i+=16){const r=d[i],g=d[i+1],b=d[i+2];if(g>90&&g>r+30&&g>b+20){s+=0.2126*r+0.7152*g+0.0722*b;n++}}return{px:n,mean:n?Math.round(s/n):0}})}
async function startRound(page,world){
  await clickText(page,world); await wait(500)
  for(let attempt=0;attempt<4;attempt++){
    await clickText(page,'send it'); await wait(1200)
    const started=await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].some(e=>(e.textContent||'').toLowerCase().includes('take profit'));const hud=!!document.querySelector('[data-testid="vault-hud-pump-hero"]');const settled=!!document.querySelector('[data-testid="vault-settled-banner"]');return b||hud||settled})
    if(started)return true
  }
  return false
}
async function run(){
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--no-sandbox','--force-device-scale-factor=1','--autoplay-policy=no-user-gesture-required']})
  const page=await browser.newPage(); const res={}
  page.on('console',m=>{}); 
  for(const outcome of ['win','loss']){
    await page.setViewport({width:1920,height:1080,deviceScaleFactor:1})
    await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'}); await wait(900); await dismiss(page)
    const key='d1920-'+outcome; res[key]={}
    const ok=await startRound(page,outcome==='win'?'bluechips':'shitcoin')
    res[key].roundStarted=ok
    if(outcome==='win'){
      const seq=[[0,0],[4,4],[0,4],[4,0],[2,2],[1,1]]
      for(const cc of seq){ const s=await page.evaluate(()=>!!document.querySelector('[data-testid="vault-settled-banner"]'));if(s)break
        const tp=await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(e=>(e.textContent||'').toLowerCase().includes('take profit'));return !!b&&b.offsetParent!==null&&!b.disabled})
        if(tp){await clickText(page,'take profit');await wait(1300);break}
        const box=await page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})
        if(box){const fx=0.06+((cc[0]+0.5)/5)*0.88,fy=0.08+((cc[1]+0.5)/5)*0.8;await page.mouse.click(box.x+box.w*fx,box.y+box.h*fy)}
        await wait(500) }
      const live=await page.evaluate(()=>!!document.querySelector('[data-testid="vault-settled-banner"]'));if(!live){await clickText(page,'take profit');await wait(1300)}
    } else {
      const seq=[[0,0],[6,6],[3,3],[1,5],[5,1],[2,4],[4,2],[0,6],[6,0],[1,1],[5,5],[2,2],[4,4],[3,0],[0,3],[6,3],[6,6],[2,0]]
      for(const cc of seq){ const s=await page.evaluate(()=>!!document.querySelector('[data-testid="vault-settled-banner"]'));if(s)break
        const box=await page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})
        if(box){const fx=0.05+((cc[0]+0.5)/7)*0.9,fy=0.06+((cc[1]+0.5)/7)*0.82;await page.mouse.click(box.x+box.w*fx,box.y+box.h*fy)}
        await wait(360) }
      await wait(800)
    }
    res[key].settledReached=await page.evaluate(()=>!!document.querySelector('[data-testid="vault-settled-banner"]'))
    res[key].betAgainCount=await page.evaluate(()=>[...document.querySelectorAll('button')].filter(e=>(e.textContent||'').trim().toLowerCase().startsWith('bet again')).length)
    res[key].vaultBoardRebetPresent=await page.evaluate(()=>!!document.querySelector('[data-testid="vault-board-rebet"]'))
    res[key].board=await rect(page,'[data-testid="vault-canvas-shell"]')
    res[key].banner=await rect(page,'[data-testid="vault-settled-banner"]')
    res[key].bannerStyle=await page.evaluate(()=>{const e=document.querySelector('[data-testid="vault-settled-banner"]');if(!e)return null;const cs=getComputedStyle(e);return{bg:cs.backgroundImage!=='none'?cs.backgroundImage.slice(0,80):cs.backgroundColor,border:cs.borderTopColor,h:Math.round(e.getBoundingClientRect().height)}})
    res[key].greenCoin=await greenCoin(page)
    await page.screenshot({path:OUT+'/'+key+'-v2.png'})
  }
  fs.writeFileSync(OUT+'/results-1920.json',JSON.stringify(res,null,2))
  console.log('DONE1920 '+JSON.stringify(res).slice(0,400))
  await browser.close()
}
run().catch(e=>{console.error('FATAL',e);process.exit(1)})
