import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const tapText = async (page, txt) => {
  const h = await page.evaluateHandle((t)=>[...document.querySelectorAll('button')].find((b)=>b.textContent&&b.textContent.includes(t))||null, txt)
  const el = h.asElement(); if(!el) return false
  const box = await el.evaluate((e)=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})
  await page.mouse.click(box.x, box.y); return true
}
const dismissTip = async (page)=>{ // click the × close button on the onboarding tip
  const h = await page.evaluateHandle(()=>[...document.querySelectorAll('button')].find(b=>b.textContent&&b.textContent.trim()==='×')||null)
  const el=h.asElement(); if(el){ const box=await el.evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}}); await page.mouse.click(box.x,box.y) }
}
const canvasRect = (page)=>page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height}})
const tapTile = async (page, rc, cc)=>{ const cr=await canvasRect(page); const t=cr.width/14; await page.mouse.click(cr.left+(cc+0.5)*t, cr.top+(rc+0.5)*t); await wait(140) }

async function run(label, vp, run, far, cursorMoves, cropRC){
  const browser = await puppeteer.launch({ executablePath: EXE, headless:'new', args:['--autoplay-policy=no-user-gesture-required',`--window-size=${vp.width+40},${vp.height+120}`] })
  const page = (await browser.pages())[0]
  await page.setViewport({ width:vp.width, height:vp.height, deviceScaleFactor:2, isMobile:vp.mobile, hasTouch:vp.mobile })
  await page.goto(URL,{waitUntil:'networkidle0',timeout:60000}); await wait(500)
  await tapText(page,'ENTER THE DIVE'); await wait(500)
  await dismissTip(page); await wait(200)
  for(const [r,c] of run) await tapTile(page,r,c)
  for(const [r,c] of far) await tapTile(page,r,c)
  await wait(300)
  const cr = await canvasRect(page); const t=cr.width/14
  const clip = { x:Math.max(0,cr.left), y:Math.max(0,cr.top), width:Math.min(cr.width, vp.width-Math.max(0,cr.left)), height:Math.min(cr.height, vp.height-Math.max(0,cr.top)) }
  await page.screenshot({ path:`${OUT}/${label}_board2.png`, clip })
  // tight crop around picks (rows/cols)
  const cropClip = { x: cr.left+cropRC.c0*t, y: cr.top+cropRC.r0*t, width:(cropRC.c1-cropRC.c0)*t, height:(cropRC.r1-cropRC.r0)*t }
  cropClip.x=Math.max(0,cropClip.x); cropClip.y=Math.max(0,cropClip.y)
  cropClip.width=Math.min(cropClip.width, vp.width-cropClip.x); cropClip.height=Math.min(cropClip.height, vp.height-cropClip.y)
  // keyboard focus -> park cursor on an empty tile near picks
  await page.evaluate(()=>document.querySelector('canvas').focus())
  await page.keyboard.press('Tab').catch(()=>{})
  await page.evaluate(()=>document.querySelector('canvas').focus())
  await wait(100)
  for(const k of cursorMoves){ await page.keyboard.press(k); await wait(60) }
  await wait(200)
  await page.screenshot({ path:`${OUT}/${label}_focuscrop2.png`, clip: cropClip })
  await page.screenshot({ path:`${OUT}/${label}_focusfull2.png`, clip })
  await browser.close()
}
// desktop: run cols4-6 row6 +(7,6); far (2,11)&(11,2); cursor from center(row7,col0) -> right to col5, down to row8 (empty tile just below run)
await run('desktop',{width:1440,height:900,mobile:false},
  [[6,4],[6,5],[6,6],[7,6]], [[2,11],[11,2]],
  ['ArrowRight','ArrowRight','ArrowRight','ArrowRight','ArrowRight','ArrowDown'], {r0:5,r1:9,c0:2,c1:8})
// mobile: keep everything within visible cols 0-8
await run('mobile',{width:412,height:915,mobile:true},
  [[6,3],[6,4],[6,5],[7,5]], [[2,8],[10,2]],
  ['ArrowRight','ArrowRight','ArrowRight','ArrowRight','ArrowDown'], {r0:5,r1:9,c0:1,c1:8})
