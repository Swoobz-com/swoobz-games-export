import puppeteer from 'puppeteer-core'
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait=(ms)=>new Promise(r=>setTimeout(r,ms))
async function click(p,t){const h=await p.evaluateHandle((t)=>{const e=[...document.querySelectorAll('button,[role=button],a')];const n=(x)=>(x.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();return e.find(x=>x.offsetParent!==null&&!x.disabled&&n(x).includes(t))||null},t.toLowerCase());const el=h.asElement();if(!el)return false;try{await el.click()}catch{return false}return true}
async function tapBoard(p,dx,dy){const b=await p.evaluate(()=>{const e=document.querySelector('[data-testid="vault-canvas-shell"]');const r=e.getBoundingClientRect();return{cx:r.left+r.width/2,cy:r.top+r.height/2}});await p.mouse.click(b.cx+dx,b.cy+dy)}
const br=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--force-device-scale-factor=1']})
const p=await br.newPage();await p.setViewport({width:1440,height:900})
await p.goto('http://localhost:5190/',{waitUntil:'networkidle0'});await wait(600)
await click(p,'got it');await click(p,'skip');await wait(200)
await click(p,'ape in');await wait(300)
await click(p,'trail');await wait(200)          // switch to TRAIL mode
await click(p,'send it');await wait(400)         // -> playing (trail plan)
await tapBoard(p,-60,-60);await wait(250)         // add tile to trail
await tapBoard(p,60,60);await wait(250)
await click(p,'go');await wait(600)               // execute trail
// if not settled, take profit
await click(p,'take profit');await wait(200);await click(p,'cash');await wait(600)
const info=await p.evaluate(()=>{
  const btns=[...document.querySelectorAll('[data-testid="DesktopControlColumn"] button')].map(b=>({t:(b.textContent||'').replace(/\s+/g,' ').trim().slice(0,26),h:Math.round(b.getBoundingClientRect().height),r:getComputedStyle(b).borderRadius}))
  const phase=document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent?.trim()
  return {phase,btns}
})
console.log(JSON.stringify(info,null,1))
await br.close()
