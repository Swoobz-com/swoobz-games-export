import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5182/'
const OUT='shots-autisk-reverify-0705'
fs.mkdirSync(OUT,{recursive:true})
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const clickText=async(page,txt)=>{const h=await page.evaluateHandle(t=>{const b=[...document.querySelectorAll('button')];return b.find(x=>x.textContent&&x.textContent.includes(t))||null},txt);const el=h.asElement();if(!el)return false;await el.click();return true}
const canvasBox=page=>page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})
const census=page=>page.evaluate(()=>{const vw=innerWidth,vh=innerHeight;const sw=document.documentElement.scrollWidth,sh=document.documentElement.scrollHeight;const wide=[...document.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.right>vw+2||r.left<-2}).slice(0,6).map(e=>({tag:e.tagName,cls:(e.className&&e.className.toString().slice(0,30)),right:Math.round(e.getBoundingClientRect().right)}));return{vw,vh,sw,sh,overflowX:sw>vw+1,overflowY:sh>vh+1,wideCount:wide.length,wide}})

async function desktop(){
  const W=1440,H=900
  const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:null,args:['--autoplay-policy=no-user-gesture-required',`--window-size=${W},${H+120}`]})
  const page=(await browser.pages())[0]
  await page.setViewport({width:W,height:H,deviceScaleFactor:1})
  await page.goto(URL,{waitUntil:'networkidle2',timeout:60000})
  await wait(1000)
  console.log('desktop lobby census',JSON.stringify(await census(page)))
  await clickText(page,'ENTER THE ASSAY LINE')
  await wait(800)
  const box=await canvasBox(page); const tile=box.w/10
  for(let r=1;r<=8;r++){await page.mouse.click(box.x+4*tile+tile/2,box.y+r*tile+tile/2);await wait(70)}
  await wait(500)
  await page.screenshot({path:`${OUT}/d-planning.png`})
  console.log('desktop planning census',JSON.stringify(await census(page)))
  // win loop with early burst capture
  let won=false
  for(let a=0;a<40&&!won;a++){
    if(a>0){await page.goto(URL,{waitUntil:'networkidle2',timeout:60000});await wait(500);await clickText(page,'ENTER THE ASSAY LINE');await wait(500);const b=await canvasBox(page);const t=b.w/10;for(let r=1;r<=8;r++){await page.mouse.click(b.x+4*t+t/2,b.y+r*t+t/2);await wait(55)}await wait(250)}
    await clickText(page,'RUN THE LINE')
    // burst early frames to catch cartouche
    for(let f=0;f<6;f++){await page.screenshot({path:`${OUT}/d-win-f${f}.png`});await wait(90)}
    const body=await page.evaluate(()=>document.body.innerText)
    if(/LINE CLAIMED/.test(body)){won=true;await page.screenshot({path:`${OUT}/d-win.png`});console.log('WON attempt',a)}
    else if(/BUSTED|CRACKED DISC/.test(body)){/*bust,retry*/}
  }
  console.log('won=',won)
  await browser.close()
}
async function mobile(){
  const W=412,H=915
  const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:null,args:['--autoplay-policy=no-user-gesture-required',`--window-size=${W+20},${H+140}`]})
  const page=(await browser.pages())[0]
  await page.setViewport({width:W,height:H,deviceScaleFactor:2,isMobile:true,hasTouch:true})
  await page.goto(URL,{waitUntil:'networkidle2',timeout:60000})
  await wait(1000)
  await page.screenshot({path:`${OUT}/m-lobby.png`})
  console.log('mobile lobby census',JSON.stringify(await census(page)))
  await clickText(page,'ENTER THE ASSAY LINE')
  await wait(900)
  await page.screenshot({path:`${OUT}/m-planning.png`})
  console.log('mobile planning census',JSON.stringify(await census(page)))
  await browser.close()
}
await desktop()
await mobile()
console.log('DONE')
