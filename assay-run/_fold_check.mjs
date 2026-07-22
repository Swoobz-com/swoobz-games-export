import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const clickText=(page,rs)=>page.evaluate((s)=>{const r=new RegExp(s,'i');const b=[...document.querySelectorAll('button,div,span')].find(x=>r.test((x.textContent||'').trim())&&(x.tagName==='BUTTON'||getComputedStyle(x).cursor==='pointer'));if(b){b.click();return true}return false},rs)
const b=await puppeteer.launch({executablePath:EXE,headless:'new',defaultViewport:null})
const p=await b.newPage()
await p.setViewport({width:393,height:852,deviceScaleFactor:3,isMobile:true,hasTouch:true})
await p.goto('http://localhost:5182/',{waitUntil:'load',timeout:60000});await wait(800)
await clickText(p,'ENTER THE DIVE');await wait(350)
const geo=await p.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{left:r.left,top:r.top,w:r.width}})
const T=geo.w/14
let cells=[];for(let row=3;row<=9&&cells.length<9;row++){const cols=row%2?[3,4,5,6,7,8]:[8,7,6,5,4,3];for(const col of cols){if(cells.length<9)cells.push([col,row])}}
for(const[col,row]of cells){await p.mouse.click(geo.left+col*T+T/2,geo.top+row*T+T/2);await wait(40)}
await wait(250)
const r=await p.evaluate(()=>{const el=[...document.querySelectorAll('button')].find(b=>/RUN THE LINE/i.test(b.textContent||''));if(!el)return'no-cta';const q=el.getBoundingClientRect();return q.bottom<=852?`OK visible bottom=${Math.round(q.bottom)}`:`CLIPPED bottom=${Math.round(q.bottom)}`})
console.log('iphone393 RUN THE LINE:',r)
await p.screenshot({path:'abyss-fixpass/iphone393-plot-fold.png'})
await b.close()
