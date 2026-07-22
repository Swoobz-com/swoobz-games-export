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
const errors=[]; page.on('pageerror',e=>errors.push(e.message))
const clickText = async (txt) => { const h=await page.evaluateHandle((t)=>[...document.querySelectorAll('button')].find(b=>b.textContent&&b.textContent.includes(t))||null,txt); const el=h.asElement(); if(!el)return false; await el.click(); return true }
const canvasBox=()=>page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})
const shot=(n,clip)=>page.screenshot(clip?{path:`${OUT}/${n}.png`,clip}:{path:`${OUT}/${n}.png`})

await page.setViewport({width:1920,height:1080,deviceScaleFactor:2})
// run several rounds to catch a WIN (all struck) and a BUST (cracked)
let gotWin=false, gotBust=false
for(let round=0; round<6 && !(gotWin&&gotBust); round++){
  await page.goto(URL,{waitUntil:'networkidle2',timeout:60000}); await wait(800)
  await clickText('ENTER THE ASSAY LINE'); await wait(600)
  const box=await canvasBox(); const tile=box.w/10
  const cells=[[2,4],[3,4],[4,4],[5,4],[6,4],[6,5],[6,6],[5,6],[4,6],[3,6]]
  for(const [c,rr] of cells){ await page.mouse.click(box.x+c*tile+tile/2, box.y+rr*tile+tile/2); await wait(50) }
  await wait(200)
  // zoom the trail (jade thread + green numbers) BEFORE plunge
  if(round===0){ await shot('trailzoom', {x:Math.round(box.x+tile*1.6),y:Math.round(box.y+tile*3.6),width:Math.round(tile*5.6),height:Math.round(tile*3.6)}) }
  await clickText('RUN THE LINE')
  // burst
  for(let i=0;i<20;i++){ await shot(`R${round}-b${String(i).padStart(2,'0')}`); await wait(90) }
  await wait(1500)
  const txt=await page.evaluate(()=>document.body.innerText)
  const won = /LINE CLAIMED|CLAIMED|hoard secured|holds/i.test(txt) && !/BUST|cracked disc lost|lost the line/i.test(txt)
  const bust = /BUST|lost the line|cracked/i.test(txt) && !/Claim line marked/i.test(txt)
  // board crop after settle
  await shot(`R${round}-settled`, {x:Math.round(box.x),y:Math.round(box.y),width:Math.round(box.w),height:Math.round(box.h)})
  // zoom struck/cracked region (the traced line area)
  await shot(`R${round}-zoomLine`, {x:Math.round(box.x+tile*1.6),y:Math.round(box.y+tile*3.6),width:Math.round(tile*5.6),height:Math.round(tile*3.6)})
  fs.appendFileSync(`${OUT}/reveal-log.txt`, `round ${round}: won=${won} bust=${bust} :: ${txt.replace(/\n/g,' ').slice(0,220)}\n`)
  if(won && !gotWin){ gotWin=true; fs.copyFileSync(`${OUT}/R${round}-settled.png`,`${OUT}/WIN-settled.png`); fs.copyFileSync(`${OUT}/R${round}-zoomLine.png`,`${OUT}/WIN-zoomLine.png`) }
  if(bust && !gotBust){ gotBust=true; fs.copyFileSync(`${OUT}/R${round}-settled.png`,`${OUT}/BUST-settled.png`); fs.copyFileSync(`${OUT}/R${round}-zoomLine.png`,`${OUT}/BUST-zoomLine.png`) }
}
console.log('gotWin',gotWin,'gotBust',gotBust,'errors',errors.length)
await browser.close()
