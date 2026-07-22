import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 6612
const OUT = 'shots-autisk-fibgate-0706'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, t)
  const el = h.asElement(); if (!el) return false
  try { await el.click() } catch (e) { return false }
  return true
}
async function dismiss(page){ await clickText(page,'got it'); await clickText(page,'skip'); await wait(200) }
async function rect(page, sel){ return page.evaluate((sel)=>{ const el=document.querySelector(sel); if(!el)return null; const r=el.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top),right:Math.round(r.right),bottom:Math.round(r.bottom),left:Math.round(r.left)} }, sel) }
async function canvasProbe(page){
  return page.evaluate(()=>{
    const c=document.querySelector('canvas'); if(!c)return null
    const ctx=c.getContext('2d'); if(!ctx)return {error:'no2d'}
    let img; try{ img=ctx.getImageData(0,0,c.width,c.height) }catch(e){ return {error:String(e)} }
    const d=img.data,W=img.width,H=img.height,N=10,grid=[]
    for(let gy=0;gy<N;gy++){ const row=[]; for(let gx=0;gx<N;gx++){
      let sum=0,cnt=0,green=0
      const x0=Math.floor(gx*W/N),x1=Math.floor((gx+1)*W/N),y0=Math.floor(gy*H/N),y1=Math.floor((gy+1)*H/N)
      for(let y=y0;y<y1;y+=4)for(let x=x0;x<x1;x+=4){ const i=(y*W+x)*4,r=d[i],g=d[i+1],b=d[i+2]
        sum+=0.2126*r+0.7152*g+0.0722*b; cnt++; if(g>90&&g>r+30&&g>b+20)green++ }
      row.push({lum:Math.round(sum/cnt),gf:+(green/cnt).toFixed(3)}) } grid.push(row) }
    let gSum=0,gCnt=0
    for(let i=0;i<d.length;i+=16){ const r=d[i],g=d[i+1],b=d[i+2]
      if(g>90&&g>r+30&&g>b+20){ gSum+=0.2126*r+0.7152*g+0.0722*b; gCnt++ } }
    return {W,H,grid,greenCoinMeanLum:gCnt?Math.round(gSum/gCnt):0,greenCoinPx:gCnt}
  })
}
async function forceWin(page){ await clickText(page,'bluechips'); await wait(200); await clickText(page,'send it'); await wait(1000) }
async function revealAndCash(page){
  const seq=[[0,0],[4,4],[0,4],[4,0],[2,2],[1,1],[3,3]]
  for(const cc of seq){ const cx=cc[0],cy=cc[1]
    const settled=await page.evaluate(()=>!!document.querySelector('[data-testid="vault-settled-banner"]')); if(settled)break
    const tp=await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(e=>(e.textContent||'').toLowerCase().includes('take profit'));return !!b&&b.offsetParent!==null&&!b.disabled})
    if(tp){await clickText(page,'take profit');await wait(1100);break}
    const box=await page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})
    if(box){const fx=0.06+((cx+0.5)/5)*0.88,fy=0.08+((cy+0.5)/5)*0.8;await page.mouse.click(box.x+box.w*fx,box.y+box.h*fy)}
    await wait(450) }
  const live=await page.evaluate(()=>!!document.querySelector('[data-testid="vault-settled-banner"]'))
  if(!live){await clickText(page,'take profit');await wait(1100)}
}
async function forceLoss(page){
  await clickText(page,'shitcoin'); await wait(200); await clickText(page,'send it'); await wait(900)
  const seq=[[0,0],[6,6],[3,3],[1,5],[5,1],[2,4],[4,2],[0,6],[6,0],[1,1],[5,5],[2,2],[4,4],[3,0],[0,3],[6,3]]
  for(const cc of seq){ const cx=cc[0],cy=cc[1]
    const s=await page.evaluate(()=>!!document.querySelector('[data-testid="vault-settled-banner"]')); if(s)break
    const box=await page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})
    if(box){const fx=0.05+((cx+0.5)/7)*0.9,fy=0.06+((cy+0.5)/7)*0.82;await page.mouse.click(box.x+box.w*fx,box.y+box.h*fy)}
    await wait(320) }
  await wait(700)
}
async function panelSweep(page){
  return page.evaluate(()=>{
    const col=document.querySelector('[data-testid="DesktopControlColumn"]'); if(!col)return null
    const out=[]
    const walk=(el,depth)=>{ for(const ch of el.children){ const cs=getComputedStyle(ch); const r=ch.getBoundingClientRect()
      const hasBg=cs.backgroundImage!=='none'||(cs.backgroundColor!=='rgba(0, 0, 0, 0)'&&cs.backgroundColor!=='transparent')
      if(r.height>24&&hasBg){ const bg=cs.backgroundImage!=='none'?cs.backgroundImage:cs.backgroundColor
        out.push({testid:ch.getAttribute('data-testid')||('('+ch.tagName.toLowerCase()+' d'+depth+')'),
          bg:bg.length>92?bg.slice(0,92):bg, border:cs.borderTopWidth+' '+cs.borderTopStyle+' '+cs.borderTopColor,
          radius:cs.borderTopLeftRadius, pad:cs.paddingTop+'/'+cs.paddingRight+'/'+cs.paddingBottom+'/'+cs.paddingLeft, w:Math.round(r.width)}) }
      if(depth<2)walk(ch,depth+1) } }
    walk(col,0); return out
  })
}
async function run(){
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--no-sandbox','--force-device-scale-factor=1','--autoplay-policy=no-user-gesture-required']})
  const page=await browser.newPage()
  const errs=[]; page.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); page.on('pageerror',e=>errs.push('PAGEERR:'+e.message))
  const res={}
  const vps=[{name:'d1440',w:1440,h:900},{name:'d1920',w:1920,h:1080}]
  for(const v of vps){ for(const outcome of ['win','loss']){
    await page.setViewport({width:v.w,height:v.h,deviceScaleFactor:1})
    await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'}); await wait(700); await dismiss(page)
    const key=v.name+'-'+outcome; res[key]={}
    if(outcome==='win'){ await forceWin(page); await wait(400)
      res[key].playCanvas=await canvasProbe(page); await page.screenshot({path:OUT+'/'+key+'-PLAY.png'})
      await revealAndCash(page)
    } else { await forceLoss(page) }
    res[key].settledCanvas=await canvasProbe(page)
    res[key].betAgainCount=await page.evaluate(()=>[...document.querySelectorAll('button')].filter(e=>(e.textContent||'').trim().toLowerCase().startsWith('bet again')).length)
    res[key].vaultBoardRebetPresent=await page.evaluate(()=>!!document.querySelector('[data-testid="vault-board-rebet"]'))
    res[key].board=await rect(page,'[data-testid="vault-canvas-shell"]')
    res[key].banner=await rect(page,'[data-testid="vault-settled-banner"]')
    res[key].caption=await rect(page,'[data-testid="vault-settled-board-caption"]')
    res[key].scrim=await rect(page,'[data-testid="vault-scene-edge-scrim"]')
    res[key].control=await rect(page,'[data-testid="DesktopControlColumn"]')
    res[key].controlRightMargin=res[key].control?(v.w-res[key].control.right):null
    res[key].scrimBg=await page.evaluate(()=>{const e=document.querySelector('[data-testid="vault-scene-edge-scrim"]');if(!e)return null;const cs=getComputedStyle(e);return{backgroundImage:cs.backgroundImage,filter:cs.filter,backdropFilter:cs.backdropFilter,size:cs.backgroundSize}})
    res[key].bannerStyle=await page.evaluate(()=>{const e=document.querySelector('[data-testid="vault-settled-banner"]');if(!e)return null;const cs=getComputedStyle(e);return{bg:cs.backgroundImage!=='none'?cs.backgroundImage:cs.backgroundColor,border:cs.borderTopColor,radius:cs.borderTopLeftRadius,h:Math.round(e.getBoundingClientRect().height)}})
    res[key].captionStyle=await page.evaluate(()=>{const e=document.querySelector('[data-testid="vault-settled-board-caption"]');if(!e)return null;const cs=getComputedStyle(e);return{bg:cs.backgroundColor,radius:cs.borderTopLeftRadius,text:(e.textContent||'').trim()}})
    res[key].panels=await panelSweep(page)
    await page.screenshot({path:OUT+'/'+key+'.png'})
  }}
  res.consoleErrors=errs
  fs.writeFileSync(OUT+'/results.json',JSON.stringify(res,null,2))
  console.log('DONE keys='+Object.keys(res).join(','))
  await browser.close()
}
run().catch(e=>{console.error('FATAL',e);process.exit(1)})
