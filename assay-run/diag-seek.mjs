import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
const page = (await browser.pages())[0]
page.on('pageerror', e=>console.log('PAGEERROR', e.message))
page.on('console', m=>{ if(m.type()==='error') console.log('CONSOLE.ERROR', m.text())})
await page.goto('http://localhost:5182/', { waitUntil: 'networkidle2' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle2' })
await wait(400)
async function findButton(t){ return page.evaluate((t)=>{const b=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').includes(t)||(x.getAttribute('aria-label')||'').includes(t)); if(!b) return null; const r=b.getBoundingClientRect(); return {rect:{x:r.x,y:r.y,w:r.width,h:r.height}, disabled:b.disabled, text:b.textContent};}, t)}
async function tap(t){ const i=await findButton(t); if(!i) return {found:false}; if(i.disabled) return {found:true,disabled:true}; await page.mouse.click(i.rect.x+i.rect.w/2, i.rect.y+i.rect.h/2); return {found:true, clicked:true}}
await tap('ENTER THE ASSAY LINE')
await wait(300)
await tap('PACE:')
await wait(150)
// paint 8 tiles quickly via evaluate hit-test coordinates
async function computeVisible(){ return page.evaluate(()=>{const c=document.querySelector('canvas'); const rect=c.getBoundingClientRect(); const tile=rect.width/10; let clip=rect; const parent=c.parentElement; if(parent){const pcs=getComputedStyle(parent); if(['auto','scroll'].includes(pcs.overflow)) clip=parent.getBoundingClientRect();} const margin=5; const visible=[]; for(let row=0;row<10;row++)for(let col=0;col<10;col++){const x=rect.x+col*tile+tile/2,y=rect.y+row*tile+tile/2; if(x>=clip.x+margin&&x<=clip.x+clip.width-margin&&y>=clip.y+margin&&y<=clip.y+clip.height-margin) visible.push({idx:row*10+col,x,y});} return visible;})}
const vis = await computeVisible()
for (const t of vis.slice(0,8)) { await page.mouse.click(t.x,t.y); await wait(30) }
await wait(150)
const run = await findButton('RUN THE LINE')
await page.mouse.click(run.rect.x+run.rect.w/2, run.rect.y+run.rect.h/2)
async function waitFor(re, ms){const start=Date.now(); while(Date.now()-start<ms){const t=await page.evaluate(()=>document.body.innerText); if(re.test(t)) return {found:true,text:t}; await wait(60);} return {found:false}}
const out = await waitFor(/LINE SECURED|CRACKED BOX/, 4000)
console.log('OUTCOME:', /LINE SECURED/.test(out.text)?'win':'bust')
console.log('--- pre ASSAY AGAIN bodyText tail ---')
console.log((out.text||'').slice(-400))
const again = await tap('ASSAY AGAIN')
console.log('ASSAY AGAIN tap result:', again)
await wait(300)
const txtAfter = await page.evaluate(()=>document.body.innerText)
console.log('--- bodyText 300ms after ASSAY AGAIN ---')
console.log(txtAfter.slice(0,600))
const heavy = await findButton('Heavy')
console.log('Heavy tier button:', heavy)
const clear = await findButton('CLEAR')
console.log('CLEAR button:', clear)
await browser.close()
