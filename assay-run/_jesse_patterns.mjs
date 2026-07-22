import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5182/'
const OUT='C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const clickText=(page,rs)=>page.evaluate((rs)=>{const r=new RegExp(rs,'i');const b=[...document.querySelectorAll('button')].find(x=>r.test((x.textContent||'').trim()));if(b){b.click();return{found:true,disabled:b.disabled}}return{found:false}},rs)
const browser=await puppeteer.launch({executablePath:EXE,headless:'new',defaultViewport:null})
const page=await browser.newPage()
await page.setViewport({width:1440,height:900,deviceScaleFactor:1})
await page.goto(URL,{waitUntil:'load'})
await page.evaluate(()=>{try{localStorage.clear()}catch{}})

async function freshDive(){
  await page.reload({waitUntil:'load'}); await wait(600)
  await clickText(page,'ENTER THE DIVE'); await wait(600)
  // dismiss coachmark: click the × (small button) if present
  await page.evaluate(()=>{const bs=[...document.querySelectorAll('button')];const x=bs.find(b=>/^(×|✕|x)$/i.test((b.textContent||'').trim()));if(x)x.click()})
  await wait(300)
  const geo=await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{left:r.left,top:r.top,w:r.width,h:r.height}})
  return geo
}
function mk(geo){const T=geo.w/14; return async(col,row)=>{await page.mouse.click(geo.left+col*T+T/2, geo.top+row*T+T/2); await wait(120)}}

// PATTERN A: contiguous horizontal run
let geo=await freshDive(); let tap=mk(geo)
for(const [c,r] of [[3,7],[4,7],[5,7],[6,7],[7,7],[8,7],[9,7],[10,7]]) await tap(c,r)
await wait(300)
await page.screenshot({path:OUT+'pA_contiguous.png'})
console.log('A claimline:',(await page.evaluate(()=>document.body.innerText)).match(/CLAIM LINE\s*\S+/i)?.[0])

// PATTERN B: spread far-apart isolated taps
geo=await freshDive(); tap=mk(geo)
for(const [c,r] of [[1,3],[11,2],[4,9],[12,10],[6,5],[2,12],[9,12],[13,6]]) await tap(c,r)
await wait(300)
await page.screenshot({path:OUT+'pB_spread.png'})

// PATTERN C: mix (short run + far taps)
geo=await freshDive(); tap=mk(geo)
for(const [c,r] of [[2,3],[3,3],[4,3],[10,8],[11,8],[6,12],[13,2],[1,11]]) await tap(c,r)
await wait(300)
await page.screenshot({path:OUT+'pC_mix.png'})

// keyboard focus bracket: fresh dive, Tab to focus a tile
geo=await freshDive()
await page.evaluate(()=>{const c=document.querySelector('canvas'); c&&c.focus()})
for(let i=0;i<4;i++){await page.keyboard.press('Tab'); await wait(120)}
await page.keyboard.press('ArrowRight'); await wait(120)
await page.keyboard.press('ArrowDown'); await wait(200)
await page.screenshot({path:OUT+'pD_focus.png'})
console.log('done')
await page.close(); await browser.close()
