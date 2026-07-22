import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-autisk-aztec-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null,
  args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message))
page.on('console', (m) => { if (m.type()==='error') errors.push('CONSOLE.ERR: ' + m.text().slice(0,200)) })
const clickText = async (txt) => {
  const h = await page.evaluateHandle((t) => [...document.querySelectorAll('button')].find(b=>b.textContent&&b.textContent.includes(t))||null, txt)
  const el = h.asElement(); if (!el) return false; await el.click(); return true
}
const canvasBox = () => page.evaluate(() => { const c=document.querySelector('canvas'); if(!c) return null; const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })
const shot = (n, clip) => page.screenshot(clip?{path:`${OUT}/${n}.png`, clip}:{path:`${OUT}/${n}.png`})
const report = { errors:[], runs:{} }

async function desktop(vpn, w, h, dsf){
  await page.setViewport({width:w,height:h,deviceScaleFactor:dsf})
  await page.goto(URL,{waitUntil:'networkidle2',timeout:60000}); await wait(900)
  await shot(`${vpn}-01-lobby`)
  await clickText('ENTER THE ASSAY LINE'); await wait(700)
  await shot(`${vpn}-02-planning`)
  // tier selector crop (top of right rail / temple depth) - full frame is fine, also crop board
  const box = await canvasBox()
  const r = {}
  if(box){
    const tile = box.w/10
    // contiguous snake of 10 tiles from row 4
    const cells = [[2,4],[3,4],[4,4],[5,4],[6,4],[6,5],[6,6],[5,6],[4,6],[3,6]]
    for(const [c,rr] of cells){ await page.mouse.click(box.x+c*tile+tile/2, box.y+rr*tile+tile/2); await wait(60) }
    await wait(300)
    await shot(`${vpn}-03-trail`)
    // full board crop
    await shot(`${vpn}-03b-board`, {x:Math.round(box.x),y:Math.round(box.y),width:Math.round(box.w),height:Math.round(box.h)})
    // tight 3x3 zoom top-left of board (dormant coins + torch key corner)
    await shot(`${vpn}-03c-zoomTL`, {x:Math.round(box.x),y:Math.round(box.y),width:Math.round(tile*3.2),height:Math.round(tile*3.2)})
    // single-coin zoom (a dormant tile)
    await shot(`${vpn}-03d-coin`, {x:Math.round(box.x+tile*7),y:Math.round(box.y+tile*1),width:Math.round(tile*1.4),height:Math.round(tile*1.4)})
    r.tile = tile
  }
  // plunge
  const plunged = await clickText('PLUNGE') || await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>/plunge|breaker|commit/i.test(b.textContent||''));if(b){b.click();return true}return false})
  r.plunged = plunged
  // burst capture reveal
  for(let i=0;i<16;i++){ await shot(`${vpn}-04-burst-${String(i).padStart(2,'0')}`); await wait(110) }
  await wait(1600)
  await shot(`${vpn}-05-settled`)
  if(box){ const tile=box.w/10; await shot(`${vpn}-05b-boardAfter`, {x:Math.round(box.x),y:Math.round(box.y),width:Math.round(box.w),height:Math.round(box.h)}) }
  r.text = await page.evaluate(()=>document.body.innerText.slice(0,400))
  report.runs[vpn]=r
}

await desktop('d1920', 1920, 1080, 2)
await desktop('d1440', 1440, 900, 2)

// Mobile
await page.setViewport({width:412,height:915,deviceScaleFactor:2})
await page.goto(URL,{waitUntil:'networkidle2',timeout:60000}); await wait(900)
await shot('m412-01-lobby')
await clickText('ENTER THE ASSAY LINE'); await wait(700)
await shot('m412-02-planning')
const mbox = await canvasBox()
if(mbox){
  const tile=mbox.w/10
  const cells=[[2,4],[3,4],[4,4],[5,4],[6,4],[6,5],[6,6],[5,6],[4,6],[3,6]]
  for(const [c,rr] of cells){ await page.mouse.click(mbox.x+c*tile+tile/2, mbox.y+rr*tile+tile/2); await wait(60) }
  await wait(300)
  await shot('m412-03-trail')
  await shot('m412-03b-board', {x:Math.round(mbox.x),y:Math.round(mbox.y),width:Math.round(mbox.w),height:Math.round(Math.min(mbox.h, tile*10))})
}

report.errors=errors
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report,null,2))
console.log('ERRORS:', errors.length)
console.log(JSON.stringify(report.runs,null,2))
await browser.close()
