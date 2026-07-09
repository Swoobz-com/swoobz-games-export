import puppeteer from 'puppeteer-core'
import fs from 'fs'
import { PNG } from 'pngjs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5931'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/autisk-backdrop'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document
    if (!root) return null
    const els = [...root.querySelectorAll('button,[role=button],a,div')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).startsWith(lc)) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, { t, within })
  const el = h.asElement(); if (!el) return false
  try { await el.click() } catch { return false }; return true
}
function readPng(p){ return PNG.sync.read(fs.readFileSync(p)) }
function px(img,x,y){ const i=(img.width*Math.round(y)+Math.round(x))*4; return [img.data[i],img.data[i+1],img.data[i+2]] }
function bright([r,g,b]){ return Math.round(0.299*r+0.587*g+0.114*b) }

async function enterBet(page){
  await clickText(page,'ape in') || await clickText(page,'got it') || await clickText(page,'skip')
  await wait(900)
}

async function diag(page){
  return page.evaluate(()=>{
    const q=(s)=>document.querySelector(s)
    const r=(e)=>e?e.getBoundingClientRect():null
    const bd=q('[data-testid="vault-grid-backdrop"]')
    const grid=q('[data-testid="vault-grid-mainGrid"]')
    const board=q('[data-testid="vault-canvas-shell"]')
    const control=q('[data-testid="DesktopControlColumn"]')
    const cs=bd?getComputedStyle(bd):null
    // find control panels + their computed bg + opacity
    const panels=[...document.querySelectorAll('[data-testid^="vault-ctl"],[data-testid^="vault-board-worldpicker"]')].map(p=>{
      const c=getComputedStyle(p); const rr=p.getBoundingClientRect()
      return {tid:p.getAttribute('data-testid'), bg:c.backgroundColor, op:c.opacity, bdf:c.backdropFilter, l:Math.round(rr.left),t:Math.round(rr.top),w:Math.round(rr.width),h:Math.round(rr.height)}
    })
    return {
      bgImg: cs?cs.backgroundImage.slice(0,120):null,
      z: cs?cs.zIndex:null,
      bdRect: r(bd)&&{l:Math.round(r(bd).left),r:Math.round(r(bd).right),w:Math.round(r(bd).width),h:Math.round(r(bd).height)},
      gridRect: r(grid)&&{w:Math.round(r(grid).width)},
      boardRect: r(board)&&{l:Math.round(r(board).left),r:Math.round(r(board).right)},
      controlRect: r(control)&&{l:Math.round(r(control).left),r:Math.round(r(control).right)},
      panels,
    }
  })
}

async function run(){
  const b=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required','--force-device-scale-factor=1','--window-size=1460,940']})
  const page=await b.newPage()
  page.on('pageerror',e=>console.log('PAGEERR',e.message))
  await page.setViewport({width:1440,height:900,deviceScaleFactor:1})
  const out={}
  for(const world of ['bluechips','altseason','shitcoin']){
    await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle2'})
    await wait(500); await enterBet(page)
    // pick world
    await clickText(page, world, '[data-testid="vault-board-worldpicker"]') || await clickText(page, world)
    await wait(600)
    const d=await diag(page); out[world]=d
    const f=`${OUT}/betentry-${world}.png`
    await page.screenshot({path:f})
    // seam scanline at top strip y=100 (above panels)
    const img=readPng(f)
    const y=100
    const samples={}
    for(const x of [200,600,1000,1023,1045,1080,1200,1340]) samples['x'+x]=bright(px(img,x,y))
    out[world].seamY100=samples
    // sample behind RUGS row area (~y 445 in maker shot) at control x
    out[world].behindRugs={ x1100:bright(px(img,1100,445)), x1300:bright(px(img,1300,445)) }
  }
  // phases on bluechips
  await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle2'}); await wait(500); await enterBet(page)
  await clickText(page,'bluechips','[data-testid="vault-board-worldpicker"]'); await wait(400)
  await clickText(page,'send it'); await wait(1200)
  await page.screenshot({path:`${OUT}/playing-bluechips.png`})
  out.playing=await diag(page)
  // settle: crack interior tiles then take profit. Board canvas — click grid cells.
  const shell=await page.$('[data-testid="vault-canvas-shell"]')
  if(shell){ const bx=await shell.boundingBox(); if(bx){
    // click center-ish cells (fraction 0.3,0.5) to reveal safe
    await page.mouse.click(bx.x+bx.width*0.35, bx.y+bx.height*0.35); await wait(700)
    await clickText(page,'take profit')||await clickText(page,'cash')||await clickText(page,'take')
    await wait(1200)
  }}
  await page.screenshot({path:`${OUT}/settled-bluechips.png`})
  out.settled=await diag(page)
  // mobile
  await page.setViewport({width:412,height:915,deviceScaleFactor:2})
  await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle2'}); await wait(600); await enterBet(page)
  await wait(500)
  await page.screenshot({path:`${OUT}/mobile-full.png`})
  out.mobile=await page.evaluate(()=>{
    const bd=document.querySelector('[data-testid="vault-grid-backdrop"]')
    const cs=bd?getComputedStyle(bd):null; const r=bd?bd.getBoundingClientRect():null
    // find PhaseSurface panel
    const panel=document.querySelector('[aria-live="polite"]')
    const pr=panel?panel.getBoundingClientRect():null
    return {bgImg:cs?cs.backgroundImage.slice(0,120):null, z:cs?cs.zIndex:null,
      bdRect:r&&{t:Math.round(r.top),h:Math.round(r.height),w:Math.round(r.width)},
      panelRect:pr&&{t:Math.round(pr.top),h:Math.round(pr.height)}, dpr:window.devicePixelRatio}
  })
  fs.writeFileSync(`${OUT}/results.json`,JSON.stringify(out,null,2))
  console.log('DONE')
  await b.close()
}
run().catch(e=>{console.log('FATAL',e.message);process.exit(1)})
