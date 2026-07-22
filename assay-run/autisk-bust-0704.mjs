import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5182/'; const OUT='shots-autisk-aztec-0704'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const browser=await puppeteer.launch({executablePath:EXE,headless:'new',defaultViewport:null,args:['--autoplay-policy=no-user-gesture-required']})
const page=(await browser.pages())[0]; const errors=[]; page.on('pageerror',e=>errors.push(e.message))
const clickText=async t=>{const h=await page.evaluateHandle(t=>[...document.querySelectorAll('button')].find(b=>b.textContent&&b.textContent.includes(t))||null,t);const el=h.asElement();if(!el)return false;await el.click();return true}
const canvasBox=()=>page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})
const shot=(n,clip)=>page.screenshot(clip?{path:`${OUT}/${n}.png`,clip}:{path:`${OUT}/${n}.png`})
await page.setViewport({width:1920,height:1080,deviceScaleFactor:2})
let gotBust=false, gotWin=false
for(let round=0; round<10 && !(gotBust&&gotWin); round++){
  await page.goto(URL,{waitUntil:'networkidle2',timeout:60000}); await wait(700)
  await clickText('ENTER THE ASSAY LINE'); await wait(500)
  // select Heavy Floor (most cracked discs)
  await page.evaluate(()=>{const el=[...document.querySelectorAll('*')].find(e=>e.children.length===0&&/Heavy Floor/.test(e.textContent||''));if(el){let n=el;for(let i=0;i<6&&n;i++){if(n.getAttribute&&n.getAttribute('role')==='button'||n.tagName==='BUTTON'){n.click();return}n=n.parentElement}el.click()}})
  await wait(300)
  const box=await canvasBox(); const tile=box.w/10
  const cells=[[2,4],[3,4],[4,4],[5,4],[6,4],[6,5],[6,6],[5,6],[4,6],[3,6],[3,7],[3,8]]
  for(const [c,rr] of cells){ await page.mouse.click(box.x+c*tile+tile/2, box.y+rr*tile+tile/2); await wait(40) }
  await wait(200)
  await clickText('RUN THE LINE')
  // burst to catch reveal-pop / torch flare
  for(let i=0;i<14;i++){ await shot(`H${round}-b${String(i).padStart(2,'0')}`); await wait(85) }
  await wait(1500)
  const txt=await page.evaluate(()=>document.body.innerText)
  const claimed=/LINE CLAIMED/.test(txt)
  const bustTxt=/lost the line|BUST|dud|cracked disc/i.test(txt) && !claimed
  await shot(`H${round}-settled`,{x:Math.round(box.x),y:Math.round(box.y),width:Math.round(box.w),height:Math.round(box.h)})
  fs.appendFileSync(`${OUT}/bust-log.txt`,`H${round}: claimed=${claimed} bust=${bustTxt} :: ${txt.replace(/\n/g,' ').slice(0,200)}\n`)
  if(bustTxt&&!gotBust){gotBust=true;fs.copyFileSync(`${OUT}/H${round}-settled.png`,`${OUT}/BUST2-settled.png`)}
  if(claimed&&!gotWin){gotWin=true;fs.copyFileSync(`${OUT}/H${round}-settled.png`,`${OUT}/WIN2-settled.png`)}
}
console.log('gotBust',gotBust,'gotWin',gotWin,'errors',errors.length)
await browser.close()
