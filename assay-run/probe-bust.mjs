import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const b=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',defaultViewport:{width:520,height:900,deviceScaleFactor:2}})
const p=(await b.pages())[0]
const errs=[]; p.on('pageerror',e=>errs.push(e.message))
const click=async t=>{const h=await p.evaluateHandle(x=>[...document.querySelectorAll('button')].find(b=>b.textContent&&b.textContent.includes(x))||null,t);const el=h.asElement();if(el){await el.click();return true}return false}
let busted=false
for(let attempt=0;attempt<4 && !busted;attempt++){
  await p.goto(process.argv[2],{waitUntil:'networkidle2',timeout:30000}); await wait(500)
  await click('ENTER THE ASSAY LINE'); await wait(400)
  const box=await p.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width}})
  const tile=box.w/32
  // 34-tile serpentine trail → high bust probability
  let n=0
  for(let row=3;row<24 && n<34;row+=2){for(let col=2;col<30 && n<34;col+=3){await p.mouse.click(box.x+col*tile+tile/2,box.y+row*tile+tile/2);n++;await wait(15)}}
  await wait(300); await click('PLUNGE'); await wait(4500)
  const txt=(await p.evaluate(()=>document.body.innerText)).replace(/\n/g,' | ')
  if(txt.includes('BUSTED')){busted=true;fs.mkdirSync('shots',{recursive:true});await p.screenshot({path:'shots/05-busted.png'});console.log('BUST captured (attempt '+attempt+'):',txt.slice(txt.indexOf('BUSTED')-10,txt.indexOf('BUSTED')+120))}
  else console.log('attempt '+attempt+': proven, retrying for a bust…')
}
console.log('errors:',errs)
await b.close()
process.exit(busted&&errs.length===0?0:1)
