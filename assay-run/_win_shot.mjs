import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const clickText=(page,rs)=>page.evaluate((s)=>{const r=new RegExp(s,'i');const b=[...document.querySelectorAll('button,div,span')].find(x=>r.test((x.textContent||'').trim())&&(x.tagName==='BUTTON'||getComputedStyle(x).cursor==='pointer'));if(b){b.click();return true}return false},rs)
const b=await puppeteer.launch({executablePath:EXE,headless:'new',defaultViewport:null})
const p=await b.newPage()
await p.setViewport({width:1440,height:900,deviceScaleFactor:1})
async function traceShort(n){const geo=await p.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{left:r.left,top:r.top,w:r.width}});const T=geo.w/14;const cells=[];for(let row=6;row<=7&&cells.length<n;row++){const cols=row%2?[3,4,5,6,7,8,9,10]:[10,9,8,7,6,5,4,3];for(const col of cols){if(cells.length<n)cells.push([col,row])}}for(const[col,row]of cells){await p.mouse.click(geo.left+col*T+T/2,geo.top+row*T+T/2);await wait(35)}}
let res='?'
for(let attempt=0;attempt<12 && res!=='WON';attempt++){
  await p.goto('http://localhost:5182/',{waitUntil:'load',timeout:60000});await wait(600)
  await clickText(p,'ENTER THE DIVE');await wait(250)
  await clickText(p,'REEF SHELF');await wait(150)
  await traceShort(8);await wait(150)
  await clickText(p,'INSTANT');await wait(120) // instant pace to settle fast
  await clickText(p,'^RUN THE LINE');await wait(1600)
  res=await p.evaluate(()=>/SECURED/i.test(document.body.innerText)?'WON':/RUGGED/i.test(document.body.innerText)?'BUST':'?')
  if(res==='WON'){await p.screenshot({path:'abyss-fixpass/desktop-settled-WON.png'});console.log('WON on attempt',attempt)}
}
console.log('final:',res)
await b.close()
