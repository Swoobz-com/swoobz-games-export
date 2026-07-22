import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, txt) { return page.evaluate((t) => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent&&x.textContent.includes(t)); if(b&&!b.disabled){b.click();return true} return false }, txt) }
async function bodyText(page){ return page.evaluate(()=>document.body.innerText) }
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'networkidle0' })
await page.evaluate(() => { try { localStorage.clear() } catch(e){} })
await page.reload({ waitUntil: 'load' }); await wait(500)
await clickText(page,'ENTER THE DIVE'); await wait(300)
await clickText(page,'CLEAR'); await wait(40)
await clickText(page,'REEF'); await wait(80)
// ensure instant
for (let i=0;i<3;i++){ const t=await bodyText(page); if(t.includes('PACE: INSTANT')) break; await clickText(page,'PACE:'); await wait(60) }
const box = await page.evaluate(()=>{ const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width} })
const tile = box.w/14
for (const [r,c] of [[3,3],[3,4],[3,5],[3,6],[4,3],[4,4],[4,5],[4,6]]) {
  await page.mouse.click(box.x+c*tile+tile/2, box.y+r*tile+tile/2)
  await wait(50)
}
await page.evaluate(() => { window.__flies=[]; window.__t0=performance.now(); const mo=new MutationObserver(muts=>{ const now=performance.now()-window.__t0; for(const m of muts) for(const n of m.addedNodes) if(n.nodeType===1&&n.tagName==='IMG') window.__flies.push(now) }); mo.observe(document.body,{childList:true,subtree:true}); window.__mo=mo })
await clickText(page,'RUN THE LINE')
await wait(2500) // generous window, well past COIN_FLY_MS=520 x8 staggered
const flies = await page.evaluate(() => window.__flies)
const txt = await bodyText(page)
console.log('flies:', JSON.stringify(flies), 'count:', flies.length)
console.log('won:', /SECURED THE HAUL/.test(txt))
await browser.close()
