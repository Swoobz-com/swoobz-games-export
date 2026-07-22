import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5182/'
const OUT='C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/shots-uxfix'
const wait=(ms)=>new Promise(r=>setTimeout(r,ms))
const tapText=async(page,txt)=>{const h=await page.evaluateHandle((t)=>{const b=[...document.querySelectorAll('button')];return b.find(x=>x.textContent&&x.textContent.includes(t))||null},txt);const el=h.asElement();if(!el)return false;const box=await el.evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});await page.touchscreen.tap(box.x,box.y);return true}

async function run(dev){
  const browser=await puppeteer.launch({executablePath:EXE,headless:'new',args:['--autoplay-policy=no-user-gesture-required']})
  const page=(await browser.pages())[0]
  await page.emulate({viewport:{width:dev.w,height:dev.h,deviceScaleFactor:2,isMobile:true,hasTouch:true,isLandscape:false}})
  // dismiss the one-time coachmark up front so the hero is unobstructed
  await page.evaluateOnNewDocument(()=>{try{localStorage.setItem('assay_coachmark_seen_v1','1')}catch{}})
  await page.goto(URL,{waitUntil:'networkidle0',timeout:60000});await wait(500)
  await tapText(page,'ENTER THE DIVE');await wait(400)
  // Arm within the VISIBLE pan-window: tap adjacent on-screen tiles (46px apart)
  const vp=await page.evaluate(()=>{const c=document.querySelector('canvas');const sc=c.parentElement;const r=sc.getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height}})
  const T=46, inset=24
  // 3 cols x 3 rows block (9 tiles) — contiguous, fits the ~180px window
  const pts=[]
  for(let r=0;r<3;r++)for(let c=0;c<3;c++)pts.push([vp.left+inset+c*T, vp.top+inset+r*T])
  for(const [x,y] of pts){await page.touchscreen.tap(x,y);await wait(50)}
  await wait(350)
  await page.screenshot({path:`${OUT}/${dev.name}-hero-armed.png`,fullPage:false})
  // crop the hero strip (top of board card)
  const heroRect=await page.evaluate(()=>{const d=[...document.querySelectorAll('div')].filter(x=>x.textContent&&x.textContent.includes('TO WIN'));let best=null,a=Infinity;for(const el of d){const r=el.getBoundingClientRect();const ar=r.width*r.height;if(ar<a&&r.height>30&&r.height<160){a=ar;best=r}}return best?{x:Math.round(best.left),y:Math.round(best.top),w:Math.round(best.width),h:Math.round(best.height)}:null})
  const armState=await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent&&x.textContent.includes('RUN THE LINE'));return b?b.textContent.trim():null})
  const fold=await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent&&x.textContent.includes('RUN THE LINE'));const r=b?b.getBoundingClientRect():null;return{runBottom:r?Math.round(r.bottom):null,viewportH:window.innerHeight,clears:r?r.bottom<=window.innerHeight:null}})
  console.log(dev.name, 'armState=',armState,'fold=',JSON.stringify(fold))
  if(heroRect){await page.screenshot({path:`${OUT}/${dev.name}-hero-crop.png`,clip:{x:Math.max(0,heroRect.x-4),y:Math.max(0,heroRect.y-4),width:Math.min(dev.w,heroRect.w+8),height:heroRect.h+8}})}
  await browser.close()
}
await run({name:'iphone14pro',w:393,h:852})
await run({name:'pixel7',w:412,h:915})
console.log('done')
