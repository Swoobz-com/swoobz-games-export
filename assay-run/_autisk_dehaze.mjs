import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/autisk-dehaze-0706'
mkdirSync(OUT, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, rs) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find(x => r.test((x.textContent||'').trim()) && (x.tagName==='BUTTON' || getComputedStyle(x).cursor==='pointer'))
  if (b) { b.click(); return true } return false
}, rs)
async function traceLine(page, n) {
  const geo = await page.evaluate(() => { const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {left:r.left,top:r.top,w:r.width} })
  const TILE = geo.w/14; const cells=[]
  for (let row=3; row<=9 && cells.length<n; row++){ const cols = row%2?[3,4,5,6,7,8]:[8,7,6,5,4,3]; for(const col of cols){ if(cells.length<n) cells.push([col,row]) } }
  for (const [col,row] of cells){ await page.mouse.click(geo.left+col*TILE+TILE/2, geo.top+row*TILE+TILE/2); await wait(45) }
  return geo
}
// Sample gold coin pixels from a canvas crop: report mean RGB + haze metric (blue-red spread over bright golds)
async function sampleBoard(page, tag){
  return await page.evaluate((tag) => {
    const c = document.querySelector('canvas'); if(!c) return {tag, err:'no canvas'}
    const r = c.getBoundingClientRect()
    const off = document.createElement('canvas'); off.width=c.width; off.height=c.height
    const g = off.getContext('2d'); g.drawImage(c,0,0)
    const W=c.width,H=c.height
    // sample the central board area (avoid margins): 20%-80% each axis
    const x0=Math.floor(W*0.2),x1=Math.floor(W*0.8),y0=Math.floor(H*0.2),y1=Math.floor(H*0.8)
    const d = g.getImageData(x0,y0,x1-x0,y1-y0).data
    let goldN=0, gr=0,gg=0,gb=0, cyanN=0
    for(let i=0;i<d.length;i+=16){ // stride
      const R=d[i],G=d[i+1],B=d[i+2]
      // gold: high R, mid-high G, low B, R>B by margin
      if(R>140 && G>90 && B<G && R>B+40){ goldN++; gr+=R; gg+=G; gb+=B }
      // cyan film indicator: B and G elevated while R lower (a cyan wash lifts B over R broadly)
      if(B>120 && B>R+20 && G>R){ cyanN++ }
    }
    const total=(d.length/16)|0
    return {tag, goldN, meanGold: goldN?{R:(gr/goldN)|0,G:(gg/goldN)|0,B:(gb/goldN)|0}:null, cyanPct:+(100*cyanN/total).toFixed(2), sampled: total}
  }, tag)
}
async function crop(page, sel_or_rect, path){
  await page.screenshot({ path, clip: sel_or_rect })
}
const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: null,
  args:['--autoplay-policy=no-user-gesture-required','--window-size=1500,1050'] })

async function run(vw, vh, dpr, isMob, prefix){
  const page = await browser.newPage()
  await page.setViewport({ width:vw, height:vh, deviceScaleFactor:dpr, isMobile:isMob, hasTouch:isMob })
  await page.goto(URL, { waitUntil:'load', timeout:60000 })
  await wait(1400)
  await page.screenshot({ path:`${OUT}/${prefix}-1entry.png` })
  await clickText(page, 'ENTER THE DIVE')
  await wait(700)
  const geo = await traceLine(page, isMob?6:12)
  await wait(500)
  await page.screenshot({ path:`${OUT}/${prefix}-2plan.png` })
  const s1 = await sampleBoard(page, `${prefix}-plan`)
  console.log(JSON.stringify(s1))
  // crop the board (canvas) at native for coin sharpness
  await crop(page, {x:geo.left, y:geo.top, width:geo.w, height:Math.min(geo.w, vh-geo.top)}, `${OUT}/${prefix}-3board-crop.png`)
  // hero region crop: find TO WIN hero by text
  const heroRect = await page.evaluate(() => {
    const el=[...document.querySelectorAll('div')].find(d=>/TO WIN|SECURE THE LINE|CLAIM/i.test(d.textContent||'') && d.querySelector('*') && d.getBoundingClientRect().width<600 && d.getBoundingClientRect().width>150)
    if(!el) return null; const r=el.getBoundingClientRect(); return {x:Math.max(0,r.x-8),y:Math.max(0,r.y-8),width:Math.min(r.width+16,700),height:r.height+16}
  })
  if(heroRect) await crop(page, heroRect, `${OUT}/${prefix}-4hero-crop.png`)
  // DOM font audit
  const fonts = await page.evaluate(() => {
    const out=[]
    for(const el of document.querySelectorAll('div,span,button,p')){
      const t=(el.textContent||'').trim(); if(!t || t.length>40) continue
      if(el.children.length>0 && [...el.children].some(c=>c.textContent.trim())) continue
      const cs=getComputedStyle(el); const fs=parseFloat(cs.fontSize)
      if(fs<12.5) out.push({t:t.slice(0,28), fs:+fs.toFixed(1), col:cs.color})
    }
    return out
  })
  console.log(`${prefix} SMALL-TEXT(<12.5px):`, JSON.stringify(fonts))
  // trigger reveal
  let res='?'
  for(let a=0;a<6 && res==='?';a++){
    await clickText(page, '^RUN THE LINE|^SECURE|^RUN|^DIVE$')
    await wait(1400)
    if(a===0){ await page.screenshot({ path:`${OUT}/${prefix}-5reveal-mid.png` }); const sr=await sampleBoard(page,`${prefix}-reveal`); console.log(JSON.stringify(sr)) }
    await wait(3600)
    res = await page.evaluate(() => /SECURED/i.test(document.body.innerText)?'WON':/RUGGED|RUG|BUST/i.test(document.body.innerText)?'BUST':'?')
  }
  await page.screenshot({ path:`${OUT}/${prefix}-6settled-${res}.png` })
  console.log(`${prefix} settle=${res}`)
  await page.close()
}
await run(1440,900,1,false,'D')
await run(412,915,2,true,'M412')
await run(393,852,3,true,'M393')
await browser.close()
console.log('DONE ->', OUT)
