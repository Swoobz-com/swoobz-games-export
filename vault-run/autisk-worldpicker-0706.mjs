import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6305'
const OUT = process.argv[3] || 'shots-wp'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document
    if (!root) return null
    const els = [...root.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, { t, within })
  const el = h.asElement(); if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
const R = (r) => r ? {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right)} : null
async function rect(page, sel){ return page.evaluate((sel)=>{const el=document.querySelector(sel);if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,top:r.top,bottom:r.bottom,left:r.left,right:r.right}},sel).then(R) }
async function scrollInfo(page){ return page.evaluate(()=>({sh:document.documentElement.scrollHeight,ih:window.innerHeight,sw:document.documentElement.scrollWidth,iw:window.innerWidth})) }
async function worldRows(page){
  return page.evaluate(()=>{
    const wp=document.querySelector('[data-testid="vault-board-worldpicker"]'); if(!wp) return null
    const btns=[...wp.querySelectorAll('button[aria-pressed]')]
    const rows=btns.map(b=>{
      const r=b.getBoundingClientRect(); const cs=getComputedStyle(b)
      const txt=(b.textContent||'').replace(/\s+/g,' ').trim()
      return {
        name: txt.split(' ')[0],
        top:Math.round(r.top), bottom:Math.round(r.bottom), h:Math.round(r.height), left:Math.round(r.left), right:Math.round(r.right),
        pressed: b.getAttribute('aria-pressed'),
        borderTopColor: cs.borderTopColor, borderTopWidth: cs.borderTopWidth,
        background: cs.backgroundColor, backgroundImage: cs.backgroundImage.slice(0,60),
        boxShadow: cs.boxShadow.slice(0,40),
        hasBestPill: /BEST/i.test(txt), text: txt
      }
    }).sort((a,b)=>a.top-b.top)
    const gaps=[]
    for(let i=0;i<rows.length-1;i++) gaps.push(rows[i+1].top-rows[i].bottom)
    return {rows, gaps}
  })
}
async function findText(page,sel,re){ return page.evaluate(({sel,re})=>{const r=sel?document.querySelector(sel):document;if(!r)return false;return new RegExp(re,'i').test(r.textContent||'')},{sel,re}) }
const results={port:PORT,out:OUT,heights:{}}
async function crop(page,r,name,vw){ if(!r)return; try{await page.screenshot({path:OUT+'/'+name+'.png',clip:{x:Math.max(0,Math.round(r.left-6)),y:Math.max(0,Math.round(r.top-6)),width:Math.round(Math.min(vw-r.left+6,r.w+12)),height:Math.round(r.h+12)}})}catch(e){console.log('crop fail',name,e.message)} }
async function run(){
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--no-sandbox','--force-device-scale-factor=1','--autoplay-policy=no-user-gesture-required','--window-size=1480,1200']})
  const page=await browser.newPage()
  for(const H of [900,1000,1080,1118]){
    await page.setViewport({width:1440,height:H,deviceScaleFactor:1})
    await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'})
    await wait(900); await clickText(page,'got it'); await clickText(page,'skip'); await wait(300)
    await clickText(page,'ape in'); await wait(600)
    await clickText(page,'bluechips'); await wait(300)
    const r={
      phase: await page.evaluate(()=>{const e=document.querySelector('[data-testid="vault-grid-topbar"]');return e?e.textContent:''}),
      control: await rect(page,'[data-testid="DesktopControlColumn"]'),
      board: await rect(page,'[data-testid="vault-canvas-shell"]'),
      worldpicker: await rect(page,'[data-testid="vault-board-worldpicker"]'),
      wager: await rect(page,'[data-testid="vault-ctl-wager"]'),
      cta: await rect(page,'[data-testid="vault-ctl-cta"]'),
      status: await rect(page,'[data-testid="vault-grid-status"]'),
      world: await worldRows(page),
      scroll: await scrollInfo(page),
    }
    r.sendBtn = await page.evaluate(()=>{const c=document.querySelector('[data-testid="vault-ctl-cta"]');if(!c)return null;const b=[...c.querySelectorAll('button')].find(x=>/send it/i.test(x.textContent||''));if(!b)return null;const rr=b.getBoundingClientRect();return {top:Math.round(rr.top),bottom:Math.round(rr.bottom),left:Math.round(rr.left),right:Math.round(rr.right),h:Math.round(rr.height)}})
    r.ctaTopMinusWagerBottom = (r.cta&&r.wager)? r.cta.top-r.wager.bottom : null
    r.sendBelowFold = r.sendBtn ? (r.sendBtn.bottom > H) : null
    r.controlBottomVsBoardBottom = (r.control&&r.board)? r.control.bottom-r.board.bottom : null
    r.blankBandBelowColumn = (r.control&&r.status)? r.status.top-r.control.bottom : null
    await page.screenshot({path:OUT+'/full-'+H+'.png'})
    await crop(page,r.control,'ctrl-'+H,1440)
    await crop(page,r.worldpicker,'wp-'+H,1440)
    results.heights[H]=r
    const sel=r.world?r.world.rows.find(x=>x.pressed==='true'):null
    console.log('H'+H+' gaps='+JSON.stringify(r.world&&r.world.gaps)+' sel='+(sel&&sel.name)+' bestPill='+(sel&&sel.hasBestPill)+' ctaGap='+r.ctaTopMinusWagerBottom+' sendBelowFold='+r.sendBelowFold+' blankBelow='+r.blankBandBelowColumn)
  }
  try{
    await page.setViewport({width:1440,height:1080,deviceScaleFactor:1})
    await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'})
    await wait(900); await clickText(page,'got it'); await clickText(page,'skip'); await wait(300)
    await clickText(page,'ape in'); await wait(500); await clickText(page,'bluechips'); await wait(200)
    await clickText(page,'send it','[data-testid="vault-ctl-cta"]'); await wait(1000)
    const box=await page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})
    if(box){const fx=0.05+((1+0.5)/5)*0.9, fy=0.06+((1+0.5)/5)*0.82; await page.mouse.click(box.x+box.w*fx,box.y+box.h*fy)}
    await wait(700); await clickText(page,'take profit'); await wait(1200)
    results.settledPulse = { hasPulse: await findText(page,'[data-testid="DesktopControlColumn"]','SESSION PULSE'), control: await rect(page,'[data-testid="DesktopControlColumn"]'), board: await rect(page,'[data-testid="vault-canvas-shell"]') }
    await crop(page, results.settledPulse.control, 'settled-ctrl-1080', 1440)
    await page.screenshot({path:OUT+'/settled-full-1080.png'})
    await clickText(page,'new setup'); await wait(400); await clickText(page,'bluechips'); await wait(300)
    const r2={ world: await worldRows(page), control: await rect(page,'[data-testid="DesktopControlColumn"]'), worldpicker: await rect(page,'[data-testid="vault-board-worldpicker"]') }
    results.afterWinBetEntry=r2
    await crop(page, r2.worldpicker, 'wp-afterwin-1080', 1440)
    await crop(page, r2.control, 'ctrl-afterwin-1080', 1440)
    const s2=r2.world?r2.world.rows.find(x=>x.pressed==='true'):null
    console.log('AFTERWIN gaps='+JSON.stringify(r2.world&&r2.world.gaps)+' bestPill='+(s2&&s2.hasBestPill))
  }catch(e){console.log('seed-best pass fail',e.message)}
  await browser.close()
  fs.writeFileSync(OUT+'/results.json',JSON.stringify(results,null,2))
  console.log('DONE')
}
run().catch(e=>{console.error('FATAL',e);process.exit(1)})
