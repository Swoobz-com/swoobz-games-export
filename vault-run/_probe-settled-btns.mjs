import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els=[...document.querySelectorAll('button,[role=button],a')]
    const n=(e)=>(e.textContent||'').replace(/\s+/g,' ').trim().toLowerCase()
    return els.find(e=>e.offsetParent!==null&&!e.disabled&&n(e).includes(t))||null},t.toLowerCase())
  const el=h.asElement(); if(!el)return false; try{await el.click()}catch{return false}; return true
}
async function clickBoard(p,dx,dy){const b=await p.evaluate(()=>{const e=document.querySelector('[data-testid="vault-canvas-shell"]');const r=e.getBoundingClientRect();return{cx:r.left+r.width/2,cy:r.top+r.height/2}});await p.mouse.click(b.cx+dx,b.cy+dy)}
const br=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--force-device-scale-factor=1']})
const p=await br.newPage()
await p.setViewport({width:1440,height:900})
await p.goto('http://localhost:5190/',{waitUntil:'networkidle0'});await wait(600)
await clickText(p,'got it');await clickText(p,'skip');await wait(200)
await clickText(p,'ape in');await wait(400);await clickText(p,'send it');await wait(500)
await clickBoard(p,-60,-60);await wait(350);await clickBoard(p,60,60);await wait(350)
await clickText(p,'take profit');await wait(250);await clickText(p,'cash');await wait(600)
const btns=await p.evaluate(()=>[...document.querySelectorAll('[data-testid="DesktopControlColumn"] button')].map(b=>({t:(b.textContent||'').replace(/\s+/g,' ').trim().slice(0,22),h:Math.round(b.getBoundingClientRect().height),r:getComputedStyle(b).borderRadius})))
console.log(JSON.stringify(btns,null,1))
await br.close()
