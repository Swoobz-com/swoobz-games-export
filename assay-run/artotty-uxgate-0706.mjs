import puppeteer from 'puppeteer-core'
import { PNG } from 'pngjs'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-artotty-uxgate-0706'
fs.mkdirSync(OUT, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return true } return false
}, re.source)
async function boardGeo(page){ return page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height } }) }
async function trace(page, cells){
  const geo = await boardGeo(page); const TILE = geo.w/14
  for(const [col,row] of cells){ await page.mouse.click(geo.left+col*TILE+TILE/2, geo.top+row*TILE+TILE/2); await wait(30) }
}
// full 8-disc line on row 3
const line8 = [[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3]]

function lum(r,g,b){ const f=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)}; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b) }
// sample a rect; return mean + the brightest-gold pixel (max r-b among bright px) + darkest water
async function analyze(page, x, y, w, h, dsf){
  const buf = await page.screenshot({ type:'png', clip:{x,y,width:w,height:h} })
  const png = PNG.sync.read(Buffer.from(buf))
  let rs=0,gs=0,bs=0,n=0
  let goldRB=-999, goldPx=null
  let darkL=999, darkPx=null
  let cyanCount=0 // pixels where b is top channel & bright (cyan film signature)
  for(let i=0;i<png.data.length;i+=4){
    const r=png.data[i],g=png.data[i+1],b=png.data[i+2]
    rs+=r;gs+=g;bs+=b;n++
    const L=lum(r,g,b)*255
    if(L>90 && (r-b)>goldRB){ goldRB=r-b; goldPx={r,g,b,L:Math.round(L)} }
    if(L<darkL){ darkL=L; darkPx={r,g,b,L:Math.round(L)} }
    if(b>r+18 && b>g+6 && L>55) cyanCount++
  }
  return { mean:{r:Math.round(rs/n),g:Math.round(gs/n),b:Math.round(bs/n)}, meanL:Math.round(lum(rs/n,gs/n,bs/n)*255), goldPx, goldRB, darkPx, cyanFilmPxPct:+(100*cyanCount/n).toFixed(2) }
}

const browser = await puppeteer.launch({ executablePath: EXE, headless:'new', defaultViewport:null })
const report = {}

// ---------- DESKTOP 1440 (dsf2 for crisp crops) ----------
{
  const page = await browser.newPage()
  await page.setViewport({ width:1440, height:900, deviceScaleFactor:2 })
  await page.goto(URL, { waitUntil:'load' }); await wait(700)
  await page.screenshot({ path:`${OUT}/d0-lobby.png` })
  await clickText(page, /ENTER THE DIVE/); await wait(400)
  await clickText(page, /MIDNIGHT|STANDARD/); await wait(200) // default midnight tier
  // partial line (4 discs) -> arming hero
  await trace(page, line8.slice(0,4)); await wait(150)
  await page.screenshot({ path:`${OUT}/d1-arming.png` })
  // full 8 -> armed, TO WIN gold hero
  await trace(page, line8.slice(4)); await wait(200)
  await page.screenshot({ path:`${OUT}/d2-armed.png` })
  const geo = await boardGeo(page)
  report.desktopBoardGeo = geo
  // crop hero strip: it sits just above the board card (canvas). Grab band above board top.
  const heroTop = Math.max(0, geo.top-120)
  await page.screenshot({ path:`${OUT}/d2-hero-crop.png`, clip:{x:Math.round(geo.left), y:Math.round(heroTop), width:Math.round(geo.w), height:Math.round(geo.top-heroTop+20)} })
  // crop board pods (center of board)
  const bw=Math.round(geo.w), bx=Math.round(geo.left), by=Math.round(geo.top)
  await page.screenshot({ path:`${OUT}/d2-board-crop.png`, clip:{x:bx, y:by, width:bw, height:Math.min(Math.round(geo.h), 900-by-4)} })
  // HAZE probe: sample the plotted-line band (has gold pods over water)
  const TILE=geo.w/14
  // a pod center (col5,row3) and adjacent water gap (between rows)
  const podX=Math.round((geo.left+5*TILE)*2), podY=Math.round((geo.top+3*TILE)*2) // dsf2 -> screenshot clip is in CSS px though
  // NOTE clip coords are CSS px (not dsf). use CSS px:
  const pod = await analyze(page, Math.round(geo.left+5*TILE), Math.round(geo.top+3*TILE), Math.round(TILE), Math.round(TILE))
  const water = await analyze(page, Math.round(geo.left+5*TILE), Math.round(geo.top+3*TILE+TILE*1.2), Math.round(TILE), Math.round(TILE*0.6)) // gap below the line
  const boardWide = await analyze(page, bx, by, bw, Math.min(Math.round(geo.h),900-by-4))
  report.desktopHaze = { podTile:pod, waterGap:water, boardWide, goldWaterContrast: (pod.goldPx?pod.goldPx.L:0) - (water.meanL) }
  await page.close()
}

// ---------- MOBILE 412 ----------
{
  const page = await browser.newPage()
  await page.setViewport({ width:412, height:915, deviceScaleFactor:2, isMobile:true })
  await page.goto(URL, { waitUntil:'load' }); await wait(700)
  await page.screenshot({ path:`${OUT}/m0-lobby.png` })
  await clickText(page, /ENTER THE DIVE/); await wait(400)
  await clickText(page, /MIDNIGHT|STANDARD/); await wait(200)
  await trace(page, line8); await wait(200)
  await page.screenshot({ path:`${OUT}/m2-armed.png` })
  const geo = await boardGeo(page)
  report.mobileBoardGeo = geo
  // count visible tiles across board width at pod pitch ~46px
  const TILE=geo.w/14
  report.mobileTilePx = +TILE.toFixed(1)
  const pod = await analyze(page, Math.round(geo.left+geo.w*0.4), Math.round(geo.top+geo.h*0.35), Math.round(geo.w*0.2), Math.round(geo.h*0.15))
  report.mobileHaze = { podRegion:pod }
  await page.close()
}

fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report,null,2))
console.log(JSON.stringify(report,null,2))
await browser.close()
