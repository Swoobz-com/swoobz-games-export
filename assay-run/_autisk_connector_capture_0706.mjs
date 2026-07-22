import puppeteer from 'puppeteer-core'
import fs from 'fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const GRID = 14
const tapText = async (page, txt) => {
  const h = await page.evaluateHandle((t)=>[...document.querySelectorAll('button')].find((b)=>b.textContent&&b.textContent.includes(t))||null, txt)
  const el = h.asElement(); if(!el) return false
  const box = await el.evaluate((e)=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})
  await page.mouse.click(box.x, box.y); return true
}
const canvasRect = (page)=>page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height}})
const tapTile = async (page, rc, cc)=>{
  const cr = await canvasRect(page)
  const t = cr.width/14
  const x = cr.left+(cc+0.5)*t, y = cr.top+(rc+0.5)*t
  await page.mouse.click(x,y); await wait(140)
  return {x,y,t,cr}
}
// cyan connector token = rgba(53,224,210,~0.7) over dark board
const isCyan = (r,g,b)=> g>150 && b>130 && r<130 && (g-r)>55 && (b-r)>35

async function run(label, vp){
  const browser = await puppeteer.launch({ executablePath: EXE, headless:'new', args:['--autoplay-policy=no-user-gesture-required',`--window-size=${vp.width+40},${vp.height+80}`] })
  const page = (await browser.pages())[0]
  await page.setViewport({ width:vp.width, height:vp.height, deviceScaleFactor:vp.dsf, isMobile:vp.mobile, hasTouch:vp.mobile })
  await page.goto(URL,{waitUntil:'networkidle0',timeout:60000}); await wait(500)
  await tapText(page,'ENTER THE DIVE'); await wait(500)
  // contiguous adjacent run (tap order = trail order)
  const run = [[6,4],[6,5],[6,6],[7,6]]
  const far = [[2,11],[11,2]]
  for(const [r,c] of run) await tapTile(page,r,c)
  for(const [r,c] of far) await tapTile(page,r,c)
  await wait(300)
  const cr = await canvasRect(page)
  const clip = { x:Math.max(0,cr.left), y:Math.max(0,cr.top), width:Math.min(cr.width, vp.width-Math.max(0,cr.left)), height:Math.min(cr.height, vp.height-Math.max(0,cr.top)) }
  await page.screenshot({ path:`${OUT}/${label}_board.png`, clip })
  // Pixel gap test: sample the straight segment between the two FAR picks (long diagonal
  // across empty board). Read from the live canvas composite via getImageData.
  const t = cr.width/14
  const seg = await page.evaluate(({run,far,t,GRID})=>{
    const c=document.querySelector('canvas'); const ctx=c.getContext('2d');
    const dpr = c.width/c.getBoundingClientRect().width
    const center=(r,cc)=>({x:(cc+0.5)*t*dpr, y:(r+0.5)*t*dpr})
    const isCyan=(r,g,b)=> g>150 && b>130 && r<130 && (g-r)>55 && (b-r)>35
    function scan(a,b,skip){
      const A=center(a[0],a[1]), B=center(b[0],b[1])
      const N=40; let hits=0, samples=[]
      for(let i=1;i<N;i++){ const f=i/N; const x=Math.round(A.x+(B.x-A.x)*f), y=Math.round(A.y+(B.y-A.y)*f)
        // skip near endpoints (rings) — skip first/last 18%
        if(f<skip||f>1-skip) continue
        const d=ctx.getImageData(x,y,1,1).data; const cy=isCyan(d[0],d[1],d[2])
        if(cy){hits++; samples.push({f:+f.toFixed(2),rgb:[d[0],d[1],d[2]]})}
      }
      return {hits, total:N, samples}
    }
    return {
      farToFar: scan(far[0],far[1],0.18),        // (2,11)->(11,2) long diagonal, must be 0
      lastRunToFar: scan(run[3],far[0],0.18),      // (7,6)->(2,11) gap, must be 0
      insideRun_AB: scan(run[0],run[1],0.30),      // (6,4)->(6,5) adjacent, SHOULD have cyan dashes
      insideRun_CD: scan(run[2],run[3],0.30),      // (6,6)->(7,6) adjacent, SHOULD have cyan
    }
  }, {run,far,t,GRID})
  console.log(`\n===== ${label} (${vp.width}x${vp.height}) =====`)
  console.log('canvasRect', JSON.stringify(cr))
  console.log('GAP farToFar (expect hits=0):', JSON.stringify(seg.farToFar))
  console.log('GAP lastRunToFar (expect hits=0):', JSON.stringify(seg.lastRunToFar))
  console.log('RUN AB (expect hits>0):', JSON.stringify(seg.insideRun_AB))
  console.log('RUN CD (expect hits>0):', JSON.stringify(seg.insideRun_CD))
  // Focus bracket: real Tab focus then arrow to an empty tile, screenshot
  await page.evaluate(()=>{const c=document.querySelector('canvas'); c.focus()})
  await page.keyboard.press('Tab').catch(()=>{})
  await page.evaluate(()=>{const c=document.querySelector('canvas'); c.focus()})
  await wait(100)
  for(let i=0;i<3;i++){ await page.keyboard.press('ArrowUp'); await wait(60) }
  for(let i=0;i<4;i++){ await page.keyboard.press('ArrowLeft'); await wait(60) }
  await wait(200)
  await page.screenshot({ path:`${OUT}/${label}_focus.png`, clip })
  const copy = await page.evaluate(()=>{const bt=document.body.innerText; return bt.split('\n').filter(l=>/connect|free|tap any/i.test(l))})
  console.log('COPY:', JSON.stringify(copy))
  console.log('COPY has em-dash(—):', copy.some(l=>l.includes('—')), '| has middot(·):', copy.some(l=>l.includes('·')))
  await browser.close()
}
await run('desktop', {width:1440,height:900,dsf:1,mobile:false})
await run('mobile', {width:412,height:915,dsf:2,mobile:true})
