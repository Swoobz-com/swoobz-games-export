import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe', URL='http://localhost:5182/'
const wait=ms=>new Promise(r=>setTimeout(r,ms)), OUT='shots-jesse-abyss-0706'
const ct=(p,s)=>p.evaluate(x=>{const r=new RegExp(x,'i');const b=[...document.querySelectorAll('button,div,span')].find(e=>r.test((e.textContent||'').trim())&&(e.tagName==='BUTTON'||getComputedStyle(e).cursor==='pointer'));if(b){b.click();return true}return false},s)
const b=await puppeteer.launch({executablePath:EXE,headless:'new',defaultViewport:null,args:['--autoplay-policy=no-user-gesture-required']})
const p=await b.newPage()
await p.setViewport({width:412,height:915,deviceScaleFactor:2,isMobile:true,hasTouch:true})
await p.goto(URL,{waitUntil:'load',timeout:60000});await wait(800)
await ct(p,'ENTER THE DIVE');await wait(500)
await p.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='×');if(x)x.click()});await wait(300)
const g=await p.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{left:r.left,top:r.top,w:r.width}})
const TILE=g.w/14
// connected snake rows 2-3 cols 1..8
const cells=[]; for(const c of [1,2,3,4,5,6,7,8]) cells.push([c,2]); 
for(let i=0;i<8;i++){const[c,r]=cells[i];await p.touchscreen.tap(g.left+(c+0.5)*TILE, g.top+(r+0.5)*TILE);await wait(140)}
await wait(400)
await p.screenshot({path:OUT+'/m-armed2.png'})
const t=await p.evaluate(()=>{let z='';for(const e of document.querySelectorAll('*')){if((e.textContent||'').trim().startsWith('TO WIN')&&e.getBoundingClientRect().width<360){z=e.textContent.trim().replace(/\s+/g,' ');break}}const cta=[...document.querySelectorAll('button')].map(x=>x.textContent.trim()).find(x=>/RUN THE LINE|SECURED/i.test(x));return{toWin:z,cta}})
console.log('MOBILE ARMED2:',JSON.stringify(t))
await b.close();console.log('done')
