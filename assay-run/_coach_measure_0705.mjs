import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5182/'
const OUT='assay-run/shots-temple-fix-0705'
fs.mkdirSync(OUT,{recursive:true})
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const clickText=async(page,txt)=>{const h=await page.evaluateHandle(t=>{const b=[...document.querySelectorAll('button')];return b.find(x=>x.textContent&&x.textContent.includes(t))||null},txt);const el=h.asElement();if(!el)return false;await el.click();return true}
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:null,args:['--autoplay-policy=no-user-gesture-required',`--window-size=432,1055`]})
const page=(await browser.pages())[0]
await page.setViewport({width:412,height:915,deviceScaleFactor:2,isMobile:true,hasTouch:true})
await page.goto(URL,{waitUntil:'networkidle2',timeout:60000})
await page.evaluate(()=>{try{localStorage.removeItem('assay_coachmark_seen_v1')}catch{}})
await page.reload({waitUntil:'networkidle2'})
await wait(800)
await clickText(page,'ENTER THE ASSAY LINE')
await wait(1200)
const m=await page.evaluate(()=>{
  const find=(pred)=>{const e=[...document.querySelectorAll('*')].find(pred);if(!e)return null;const r=e.getBoundingClientRect();return{top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right)}}
  const coach=find(e=>e.getAttribute&&e.getAttribute('role')==='note'&&/TRACE a claim/i.test(e.textContent||''))
  const title=find(e=>{const t=e.textContent&&e.textContent.trim();return t==='THE ASSAY LINE'&&e.children.length<=1})
  const balance=[...document.querySelectorAll('*')].filter(e=>{const t=e.textContent&&e.textContent.trim();return t==='BALANCE'&&e.children.length===0}).map(e=>{const r=e.getBoundingClientRect();return{top:Math.round(r.top),bottom:Math.round(r.bottom)}})
  // board / first disc tiles: find canvas or tile grid; here discs are DOM buttons
  const runBtn=[...document.querySelectorAll('button')].filter(b=>/RUN THE LINE/i.test(b.textContent||'')).map(b=>{const r=b.getBoundingClientRect();return{top:Math.round(r.top),bottom:Math.round(r.bottom)}})
  return {coach,title,balance,runBtn}
})
console.log(JSON.stringify(m,null,2))
await page.screenshot({path:`${OUT}/coach-planning.png`,clip:{x:0,y:0,width:412,height:200}})
await browser.close()
