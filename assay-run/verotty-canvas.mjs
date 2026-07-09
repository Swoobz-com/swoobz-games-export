import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL=process.argv[2]||'http://localhost:5203/'
const wait=(ms)=>new Promise(r=>setTimeout(r,ms))
const b=await puppeteer.launch({executablePath:EXE,headless:'new',defaultViewport:null})
const page=(await b.pages())[0]
await page.setViewport({width:1440,height:900,deviceScaleFactor:1})
await page.goto(URL,{waitUntil:'networkidle2'}); await wait(400)
const clickText=async(t)=>{const h=await page.evaluateHandle((x)=>[...document.querySelectorAll('button')].find(z=>z.textContent&&z.textContent.includes(x))||null,t);const e=h.asElement();if(!e)return false;await e.click();return true}
await clickText('ENTER THE ASSAY LINE'); await wait(300)
// zoom gone: buttons inside the canvas's parent element on desktop
const canvasParentButtons=await page.evaluate(()=>{const c=document.querySelector('canvas');return c?c.parentElement.querySelectorAll('button').length:-1})
// cyan fraction of canvas pixels during PLANNING (paint 8)
const box=await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})
const tile=box.w/32
for(let row=3,n=0;row<30&&n<8;row+=2)for(let col=2;col<30&&n<8;col+=3){await page.mouse.click(box.x+col*tile+tile/2,box.y+row*tile+tile/2);n++;await wait(8)}
await wait(200)
const cyanFrac=()=>page.evaluate(()=>{const c=document.querySelector('canvas');const g=c.getContext('2d');if(!g)return'noctx';const w=c.width,h=c.height;const d=g.getImageData(0,0,w,h).data;let cyan=0,tot=0;for(let i=0;i<d.length;i+=4){const r=d[i],gr=d[i+1],bl=d[i+2],a=d[i+3];if(a<10)continue;tot++;// cyan/volt: low red, high green, high blue
if(r<90&&gr>150&&bl>150)cyan++}return{cyanPct:+(100*cyan/tot).toFixed(3),sampled:tot}})
const planCyan=await cyanFrac()
// switch instant, plunge, sample mid-cascade quickly a few times
await clickText('PACE'); await wait(60)
await clickText('PLUNGE')
let maxCyan=0; for(let i=0;i<8;i++){await wait(45);const f=await cyanFrac(); if(f&&f.cyanPct>maxCyan)maxCyan=f.cyanPct}
console.log(JSON.stringify({canvasParentButtons,planCyanPct:planCyan.cyanPct,planSampled:planCyan.sampled,maxCyanDuringCascadePct:maxCyan},null,2))
await b.close()
