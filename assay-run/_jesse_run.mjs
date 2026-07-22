import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5182/'
const OUT='C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const clickText=(page,rs)=>page.evaluate((rs)=>{const r=new RegExp(rs,'i');const b=[...document.querySelectorAll('button')].find(x=>r.test((x.textContent||'').trim()));if(b){b.click();return{found:true,disabled:b.disabled}}return{found:false}},rs)
const browser=await puppeteer.launch({executablePath:EXE,headless:'new',defaultViewport:null})
const page=await browser.newPage()
await page.setViewport({width:1440,height:900,deviceScaleFactor:1})
async function freshDive(tier){
  await page.goto(URL,{waitUntil:'load'})
  await page.evaluate(()=>{try{localStorage.clear()}catch{}})
  await page.reload({waitUntil:'load'}); await wait(600)
  await clickText(page,'ENTER THE DIVE'); await wait(600)
  if(tier) await clickText(page,tier)
  await wait(300)
  const geo=await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{left:r.left,top:r.top,w:r.width,h:r.height}})
  return geo
}
// lowest tier (REEF SHELF, 6 picks) to raise win odds
let geo=await freshDive('REEF SHELF'); const T=geo.w/14
const tap=async(c,r)=>{await page.mouse.click(geo.left+c*T+T/2,geo.top+r*T+T/2);await wait(120)}
for(const [c,r] of [[3,4],[9,4],[5,8],[11,9],[6,11],[2,6]]) await tap(c,r)
await wait(300)
await clickText(page,'RUN THE LINE'); await wait(900)
await page.screenshot({path:OUT+'pE_running.png'})
await wait(1600)
await page.screenshot({path:OUT+'pF_result.png'})
const bt=await page.evaluate(()=>document.body.innerText)
console.log('result text:', bt.replace(/\n+/g,' | ').slice(0,500))
await page.close(); await browser.close()
