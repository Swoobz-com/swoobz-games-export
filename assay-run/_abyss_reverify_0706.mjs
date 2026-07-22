import puppeteer from 'puppeteer-core'
import { PNG } from 'pngjs'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-abyss-reverify-0706'
fs.mkdirSync(OUT, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return true } return false
}, re.source)
async function boardGeo(page){ return page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height } }) }
async function trace(page, cells){ const geo = await boardGeo(page); const TILE = geo.w/14; for(const [col,row] of cells){ await page.mouse.click(geo.left+col*TILE+TILE/2, geo.top+row*TILE+TILE/2); await wait(25) } }
const line8 = [[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3]]

function load(p){ return PNG.sync.read(fs.readFileSync(p)) }
// brightest-sat pixel classifier in a box
function scan(img,x,y,w,h,label){
  let best=null,bs=-1
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
    if(xx<0||yy<0||xx>=img.width||yy>=img.height)continue
    const i=(img.width*yy+xx)<<2; const r=img.data[i],g=img.data[i+1],b=img.data[i+2]
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b),sat=mx-mn
    if(mx>90 && sat>bs){bs=sat;best=[r,g,b]}
  }
  if(!best){console.log(label.padEnd(26),'no bright pixel');return null}
  const [r,g,b]=best
  const kind=(r>g&&g>=b&&r-b>25)?'GOLD':(b>=r&&g>=r&&g+b-2*r>20)?'TEAL/CYAN':(Math.abs(r-g)<14&&Math.abs(g-b)<14)?'NEUTRAL':'other'
  console.log(label.padEnd(26),`rgb(${r},${g},${b})`,'sat='+bs,'=>',kind)
  return {r,g,b,kind,sat:bs}
}
// average color of a box (for wash / warm-brown detection: R-B > 0 = warm)
function avg(img,x,y,w,h,label){
  let R=0,G=0,B=0,n=0
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
    if(xx<0||yy<0||xx>=img.width||yy>=img.height)continue
    const i=(img.width*yy+xx)<<2; R+=img.data[i];G+=img.data[i+1];B+=img.data[i+2];n++
  }
  R=Math.round(R/n);G=Math.round(G/n);B=Math.round(B/n)
  const rb=R-B
  console.log(label.padEnd(26),`avg rgb(${R},${G},${B})`,'R-B='+rb,rb>15?'WARM(brown leak?)':rb<-4?'COOL(water)':'neutral')
  return {R,G,B,rb}
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })

// ---------- DESKTOP 1440 ----------
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'load' }); await wait(700)
  await page.screenshot({ path: `${OUT}/d-entry.png` })
  const entryTxt = await page.evaluate(()=>document.body.innerText)
  console.log('DESKTOP entry has THE DIVE:', /THE DIVE/i.test(entryTxt), '| DIVE DEPTH:', /DIVE DEPTH/i.test(entryTxt))
  await clickText(page, /ENTER THE DIVE/); await wait(400)
  await trace(page, line8); await wait(200)
  await page.screenshot({ path: `${OUT}/d-plot.png` })
  await page.close()
}

// ---------- MOBILE 412 ----------
{
  const page = await browser.newPage()
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 })
  await page.goto(URL, { waitUntil: 'load' }); await wait(700)
  await page.screenshot({ path: `${OUT}/m-entry.png` })
  await clickText(page, /ENTER THE DIVE/); await wait(400)
  await trace(page, line8); await wait(200)
  await page.screenshot({ path: `${OUT}/m-plot.png` })
  await page.close()
}

// ---------- WIN SETTLE (REEF = fewest bombs) ----------
let won=false
for(let a=0;a<14 && !won;a++){
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'load' }); await wait(500)
  await clickText(page, /ENTER THE DIVE/); await wait(300)
  await clickText(page, /REEF/); await wait(200)
  await trace(page, line8); await wait(120)
  await clickText(page, /^RUN THE LINE/); await wait(120)
  let settled=false
  for(let i=0;i<26 && !settled;i++){
    await wait(110)
    const t=await page.evaluate(()=>document.body.innerText)
    if(/SECURED THE HAUL/i.test(t)){ won=true; settled=true }
    else if(/RUGGED/i.test(t)){ settled=true }
  }
  if(won){ await wait(150); await page.screenshot({ path: `${OUT}/win-settle.png` }); console.log('WON on attempt',a) }
  await page.close()
}
console.log('win captured:', won)
await browser.close()

// ---------- PIXEL VERIFY ----------
console.log('\n=== PIXEL VERIFY ===')
// entry wordmark region (desktop hero). Find via full-width center band upper-mid.
const de = load(`${OUT}/d-entry.png`)
console.log('desktop entry', de.width+'x'+de.height)
// wordmark hero sits centered; scan a wide central band for its brightest text pixel + check it's NOT split gold/teal
scan(de, 400, 120, 640, 420, 'wordmark hero band')
// control column is the right gutter on plot; sample its panel wash
const dp = load(`${OUT}/d-plot.png`)
avg(dp, 1120, 300, 260, 260, 'ctrl-column wash (desk)')
scan(dp, 1120, 120, 300, 60, 'ctrl card border/hdr')
// mobile control zone wash (below board)
const mp = load(`${OUT}/m-plot.png`)
console.log('mobile plot', mp.width+'x'+mp.height)
avg(mp, 40, mp.height-360, mp.width-80, 200, 'mobile ctrl-zone wash')
// win banner
if(won){
  const w = load(`${OUT}/win-settle.png`)
  // banner heading sits at top-left of the settled card; scan a wide band
  scan(w, 300, 690, 260, 30, 'WIN banner heading')
  scan(w, 780, 700, 90, 34, 'PAYOUT value')
}
console.log('=== done ===')
