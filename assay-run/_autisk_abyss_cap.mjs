import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5182/'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const clickText=(page,rs)=>page.evaluate((rs)=>{const r=new RegExp(rs,'i');const b=[...document.querySelectorAll('button,div,span')].find(x=>r.test((x.textContent||'').trim())&&(x.tagName==='BUTTON'||getComputedStyle(x).cursor==='pointer'));if(b){b.click();return (b.textContent||'').trim().slice(0,40)}return null},rs)
const dump=(page)=>page.evaluate(()=>(document.body.innerText||'').replace(/\n+/g,' | ').slice(0,1500))
async function trace(page,n,dim){
  const geo=await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{left:r.left,top:r.top,w:r.width,h:r.height}})
  const T=geo.w/dim
  const cells=[];for(let row=2;row<=13&&cells.length<n;row++){const cols=row%2?[2,3,4,5,6,7,8,9]:[9,8,7,6,5,4,3,2];for(const col of cols){if(cells.length<n)cells.push([col,row])}}
  for(const [col,row] of cells){await page.mouse.click(geo.left+col*T+T/2,geo.top+row*T+T/2);await wait(60)}
}
const b=await puppeteer.launch({executablePath:EXE,headless:false,args:['--autoplay-policy=no-user-gesture-required','--no-sandbox'],defaultViewport:null})
// DESKTOP
{
  const p=await b.newPage();await p.setViewport({width:1440,height:900,deviceScaleFactor:1})
  await p.goto(URL,{waitUntil:'load',timeout:60000});await wait(1200)
  await p.screenshot({path:'au-d-entry.png'})
  console.log('ENTRY TXT>>>',await dump(p))
  console.log('CLICK',await clickText(p,'ENTER THE DIVE'));await wait(500)
  // detect grid dim by canvas aspect / count? just try 14
  await trace(p,14,14);await wait(400)
  await p.screenshot({path:'au-d-plot.png'})
  console.log('PLOT TXT>>>',await dump(p))
  const runlbl=await clickText(p,'RUN THE LINE');console.log('RUNCLICK',runlbl);await wait(500)
  await p.screenshot({path:'au-d-reveal.png'})
  await wait(4500)
  await p.screenshot({path:'au-d-settled.png'})
  console.log('SETTLED TXT>>>',await dump(p))
  await p.close()
}
// MOBILE
{
  const p=await b.newPage();await p.setViewport({width:412,height:915,deviceScaleFactor:2,isMobile:true,hasTouch:true})
  await p.goto(URL,{waitUntil:'load',timeout:60000});await wait(1200)
  await p.screenshot({path:'au-m-entry.png',fullPage:true})
  await clickText(p,'ENTER THE DIVE');await wait(500)
  await trace(p,10,14);await wait(400)
  await p.screenshot({path:'au-m-plot.png',fullPage:true})
  console.log('MOBILE PLOT TXT>>>',await dump(p))
  await p.close()
}
await b.close();console.log('done')
