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
for(const[cx,cy]of picks){await page.mouse.click(cx,cy);await wait(25)}
await wait(150)
// pace label
const pace=await page.evaluate(()=>{const el=[...document.querySelectorAll('button,div,span')].find(x=>/^PACE:/.test((x.textContent||'').trim()));return el?el.textContent.trim():null})
console.log('pace:',pace,'picks:',picks.length)
const runClicked=await clickText(page,/^RUN THE LINE/)
console.log('runClicked:',runClicked)
for(let i=0;i<40;i++){await wait(100);const st=await page.evaluate(()=>{const t=document.body.innerText;return{assaying:t.includes('Line running'),badVein:t.includes('the line broke'),win:t.includes('SECURED THE HAUL'),bust:t.includes('RUGGED BY THE DEEP'),haul:(()=>{const d=[...document.querySelectorAll('div')].find(x=>x.children.length===0&&x.textContent.trim()==='HAUL');return d&&d.parentElement?d.parentElement.innerText.replace(/\s+/g,' ').trim():null})()}});if(i%3===0||st.win||st.bust||st.badVein)console.log(i*100+'ms',JSON.stringify(st));if(st.win||st.bust)break}
await page.screenshot({path:`${OUT}/dbg2-final.png`})
await browser.close()
