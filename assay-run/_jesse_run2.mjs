import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5182/'
const OUT='C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const clickText=(page,rs)=>page.evaluate((rs)=>{const r=new RegExp(rs,'i');const b=[...document.querySelectorAll('button')].find(x=>r.test((x.textContent||'').trim()));if(b){b.click();return{found:true,disabled:b.disabled}}return{found:false}},rs)
const browser=await puppeteer.launch({executablePath:EXE,headless:'new',defaultViewport:null})
const page=await browser.newPage()
await page.setViewport({width:1440,height:900,deviceScaleFactor:1})
async function run(pattern,tag){
  await page.goto(URL,{waitUntil:'load'})
  await page.evaluate(()=>{try{localStorage.clear()}catch{}})
  await page.reload({waitUntil:'load'}); await wait(600)
  await clickText(page,'ENTER THE DIVE'); await wait(600)
  await page.evaluate(()=>{const bs=[...document.querySelectorAll('button')];const x=bs.find(b=>/^(×|✕)$/.test((b.textContent||'').trim()));if(x)x.click()})
  const geo=await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{left:r.left,top:r.top,w:r.width}})
  const T=geo.w/14
  for(const [c,r] of pattern){await page.mouse.click(geo.left+c*T+T/2,geo.top+r*T+T/2);await wait(110)}
  await wait(250)
  const rr=await clickText(page,'RUN THE LINE')
  await wait(2600)
  await page.screenshot({path:OUT+tag+'.png'})
  const bt=await page.evaluate(()=>document.body.innerText)
  console.log(tag,'run:',JSON.stringify(rr),'| outcome:', bt.replace(/\n+/g,' | ').slice(0,260))
}
// two full runs to try to see both a win and a bust (8 spread picks each)
await run([[1,3],[11,2],[4,9],[12,10],[6,5],[2,12],[9,12],[13,6]],'pG_run1')
await run([[3,4],[5,4],[7,4],[9,4],[3,8],[5,8],[7,8],[9,8]],'pH_run2')
await page.close(); await browser.close()
