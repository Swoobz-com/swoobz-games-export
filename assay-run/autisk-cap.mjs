import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5192/'
const OUT = 'shots-autisk-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null,
  args: ['--autoplay-policy=no-user-gesture-required','--force-device-scale-factor=1'] })
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message))
page.on('console', (m) => { if (m.type()==='error') errors.push('CONSOLE.ERR: ' + m.text().slice(0,200)) })
const clickText = async (txt) => {
  const h = await page.evaluateHandle((t) => [...document.querySelectorAll('button')].find(b=>b.textContent&&b.textContent.includes(t))||null, txt)
  const el = h.asElement(); if (!el) return false; await el.click(); return true
}
const canvasBox = () => page.evaluate(() => { const c=document.querySelector('canvas'); if(!c) return null; const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })

// coin alpha corner probe (once)
async function coinProbe(){
  return page.evaluate(async () => {
    const img = new Image(); img.src = '/../originals/assay/assets/coin-dormant-v2.png'
    try { await img.decode() } catch(e){ return {err:String(e)} }
    const cv = document.createElement('canvas'); cv.width=img.naturalWidth; cv.height=img.naturalHeight
    const cx = cv.getContext('2d'); cx.drawImage(img,0,0)
    const px = (x,y)=>{const d=cx.getImageData(x,y,1,1).data; return [d[0],d[1],d[2],d[3]]}
    const w=cv.width,h=cv.height
    return { w,h, tl:px(2,2), tr:px(w-3,2), br:px(w-3,h-3), center:px(w>>1,h>>1) }
  })
}

const report = { errors:[] }
const VPS = [ {n:'1440',w:1440,h:900},{n:'1920',w:1920,h:1080},{n:'2560',w:2560,h:1440} ]
let coinDone=false
for (const vp of VPS){
  await page.setViewport({width:vp.w,height:vp.h,deviceScaleFactor:1})
  await page.goto(URL,{waitUntil:'networkidle2',timeout:60000}); await wait(700)
  if(!coinDone){ report.coinProbe = await coinProbe(); coinDone=true }
  await page.screenshot({path:`${OUT}/${vp.n}-01-lobby.png`})
  await clickText('ENTER THE ASSAY LINE'); await wait(500)
  await page.screenshot({path:`${OUT}/${vp.n}-02-planning.png`})
  const box = await canvasBox()
  // paint a short safe-ish trail near centre (contiguous-ish taps)
  if(box){
    const tile = box.w/20
    const cells = [[8,8],[9,8],[10,8],[10,9],[10,10],[11,10],[12,10]]
    for(const [c,r] of cells){ await page.mouse.click(box.x+c*tile+tile/2, box.y+r*tile+tile/2); await wait(40) }
  }
  await wait(200)
  await page.screenshot({path:`${OUT}/${vp.n}-03-trail.png`})
  // tight board crop (centre) for coin sharpness
  if(box){
    const cw=Math.min(box.w, 12*(box.w/20)); 
    await page.screenshot({path:`${OUT}/${vp.n}-03b-boardcrop.png`, clip:{x:Math.round(box.x+box.w*0.30),y:Math.round(box.y+box.h*0.30),width:Math.round(box.w*0.40),height:Math.round(box.h*0.40)}})
  }
  // throw breaker -> burst capture hero
  await clickText('THROW BREAKER')
  for(let i=0;i<14;i++){ await page.screenshot({path:`${OUT}/${vp.n}-04-burst-${String(i).padStart(2,'0')}.png`}); await wait(120) }
  await wait(1500)
  const settled = await page.evaluate(()=>{
    const won = document.body.innerText.match(/SECURED|PROVEN|CLAIM|ASSAY AGAIN/)?[...document.body.innerText.matchAll(/(SECURED|PROVEN|BUST|VEIN)/g)].map(m=>m[0]):[]
    return { text: document.body.innerText.slice(0,300) }
  })
  report[vp.n] = { settled }
  await page.screenshot({path:`${OUT}/${vp.n}-05-settled.png`})
}
// Mobile
for (const mv of [{n:'m390',w:390,h:844},{n:'m412',w:412,h:915}]){
  await page.setViewport({width:mv.w,height:mv.h,deviceScaleFactor:2})
  await page.goto(URL,{waitUntil:'networkidle2',timeout:60000}); await wait(600)
  await page.screenshot({path:`${OUT}/${mv.n}-01-lobby.png`})
  await clickText('ENTER THE ASSAY LINE'); await wait(500)
  await page.screenshot({path:`${OUT}/${mv.n}-02-planning.png`, fullPage:true})
}
report.errors = errors
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report,null,2))
console.log(JSON.stringify(report,null,2))
await browser.close()
