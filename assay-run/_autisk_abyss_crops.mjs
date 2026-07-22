import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5182/'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const R=n=>Math.round(n)
const clickText=(page,rs)=>page.evaluate((rs)=>{const r=new RegExp(rs,'i');const b=[...document.querySelectorAll('button,div,span')].find(x=>r.test((x.textContent||'').trim())&&(x.tagName==='BUTTON'||getComputedStyle(x).cursor==='pointer'));if(b){b.click();return true}return false},rs)
const geoOf=page=>page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{left:r.left,top:r.top,w:r.width,h:r.height}})
const b=await puppeteer.launch({executablePath:EXE,headless:false,args:['--autoplay-policy=no-user-gesture-required','--no-sandbox'],defaultViewport:null})
const p=await b.newPage();await p.setViewport({width:1440,height:900,deviceScaleFactor:2})
await p.goto(URL,{waitUntil:'load',timeout:60000});
await wait(1400)
let g=await geoOf(p)
const T=g.w/14
// ENTRY: crop top-left 4x4 coins region
await p.screenshot({path:'crop-idle.png',clip:{x:R(g.left+T*0.3),y:R(g.top+T*0.3),width:R(T*4),height:R(T*4)}})
// go to plot
await clickText(p,'ENTER THE DIVE');await wait(600)
g=await geoOf(p)
// trace a short line row 3-4
const cells=[];for(let row=3;row<=4;row++){const cols=row%2?[3,4,5,6,7,8]:[8,7,6,5,4,3];for(const c of cols)cells.push([c,row])}
for(const [c,row] of cells){await p.mouse.click(g.left+c*T+T/2,g.top+row*T+T/2);await wait(70)}
await wait(400)
// dismiss coachmark if present
await clickText(p,'^×$').catch(()=>{})
await wait(300)
await p.screenshot({path:'crop-selected.png',clip:{x:R(g.left+T*2.3),y:R(g.top+T*2.3),width:R(T*7),height:R(T*3)}})
// run and settle
await clickText(p,'^RUN THE LINE');await wait(6000)
g=await geoOf(p)
await p.screenshot({path:'crop-settled.png',clip:{x:R(g.left+T*2.3),y:R(g.top+T*2.3),width:R(T*8),height:R(T*5)}})
await b.close();console.log('done crops')
