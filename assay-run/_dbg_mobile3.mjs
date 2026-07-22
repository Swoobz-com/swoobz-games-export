import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5182/'
const OUT='shots-dbg-mobile'; fs.mkdirSync(OUT,{recursive:true})
const wait=(ms)=>new Promise(r=>setTimeout(r,ms))
const clickText=(page,re)=>page.evaluate((rs)=>{const r=new RegExp(rs,'i');const b=[...document.querySelectorAll('button,div,span')].find(x=>r.test((x.textContent||'').trim())&&(x.tagName==='BUTTON'||getComputedStyle(x).cursor==='pointer'));if(b){b.click();return true}return false},re.source)
const browser=await puppeteer.launch({executablePath:EXE,headless:'new',defaultViewport:null})
const page=await browser.newPage()
await page.setViewport({width:412,height:915,deviceScaleFactor:2})
await page.goto(URL,{waitUntil:'load'});await wait(450)
await page.keyboard.press('Escape').catch(()=>{})
await clickText(page,/ENTER THE DIVE/);await wait(350)
await clickText(page,/REEF/);await wait(200)
const geo=await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{left:r.left,top:r.top,w:r.width,h:r.height}})
const DIM=14,TILE=geo.w/DIM;let picks=[]
for(let row=0;row<DIM&&picks.length<8;row++)for(let col=0;col<DIM&&picks.length<8;col++){const cx=geo.left+col*TILE+TILE/2,cy=geo.top+row*TILE+TILE/2;if(cx>10&&cx<402&&cy>geo.top+6&&cy<Math.min(915,geo.top+geo.h)-10)picks.push([cx,cy])}
console.log('picks:',JSON.stringify(picks.map(p=>[Math.round(p[0]),Math.round(p[1])])))
for(const[cx,cy]of picks){await page.mouse.click(cx,cy);await wait(30)}
await wait(200)
// find the RUN button exact
const btn=await page.evaluate(()=>{const els=[...document.querySelectorAll('button')];const b=els.find(x=>/RUN THE LINE/i.test(x.textContent||''));if(!b)return null;const r=b.getBoundingClientRect();return{text:b.textContent.trim(),disabled:b.disabled,cx:r.left+r.width/2,cy:r.top+r.height/2,visible:r.width>0&&r.top<915&&r.bottom>0,top:r.top,bottom:r.bottom}})
console.log('RUN button:',JSON.stringify(btn))
await page.screenshot({path:`${OUT}/dbg3-traced.png`})
if(btn&&!btn.disabled){await page.mouse.click(btn.cx,btn.cy);console.log('clicked button by coords')}
for(let i=0;i<40;i++){await wait(100);const st=await page.evaluate(()=>{const t=document.body.innerText;return t.includes('SECURED THE HAUL')?'win':t.includes('RUGGED BY THE DEEP')?'bust':t.includes('Line running')?'assaying':'planning'});if(st!=='planning'){console.log(i*100+'ms',st);if(st==='win'||st==='bust')break}}
await browser.close()
