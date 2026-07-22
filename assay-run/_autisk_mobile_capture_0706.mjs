import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const tapText = async (page, txt) => {
  const h = await page.evaluateHandle((t)=>[...document.querySelectorAll('button')].find((b)=>b.textContent&&b.textContent.includes(t))||null, txt)
  const el=h.asElement(); if(!el) return false
  const box=await el.evaluate((e)=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})
  await page.mouse.click(box.x,box.y); return true
}
const geom = (page)=>page.evaluate(()=>{
  const c=document.querySelector('canvas'); const cr=c.getBoundingClientRect()
  let el=c.parentElement, sc=null
  while(el){ if(el.scrollWidth>el.clientWidth){sc=el;break} el=el.parentElement }
  const scr=sc.getBoundingClientRect()
  return {tile:cr.width/14, cL:scr.left,cT:scr.top,cW:sc.clientWidth,cH:sc.clientHeight,sL:sc.scrollLeft,sT:sc.scrollTop}
})
const tapTile = async (page,row,col)=>{
  const g=await geom(page)
  const cx=(col+0.5)*g.tile, cy=(row+0.5)*g.tile
  const x=g.cL+(cx-g.sL), y=g.cT+(cy-g.sT)
  await page.mouse.click(x,y); await wait(150)
}
const browser = await puppeteer.launch({ executablePath: EXE, headless:'new', args:['--autoplay-policy=no-user-gesture-required'] })
const page=(await browser.pages())[0]
await page.setViewport({width:412,height:915,deviceScaleFactor:2,isMobile:true,hasTouch:true})
await page.goto(URL,{waitUntil:'networkidle0',timeout:60000}); await wait(500)
await tapText(page,'ENTER THE DIVE'); await wait(600)
// dismiss tip
const h=await page.evaluateHandle(()=>[...document.querySelectorAll('button')].find(b=>b.textContent&&b.textContent.trim()==='×')||null)
const xel=h.asElement(); if(xel){const b=await xel.evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});await page.mouse.click(b.x,b.y);await wait(200)}
// contiguous run within visible window (cols/rows 3-6), then a gapped non-adjacent pick
for(const [r,c] of [[3,3],[3,4],[4,4]]) await tapTile(page,r,c)
await tapTile(page,6,6) // gap of 1 tile from (4,4) -> non-adjacent -> NO connector
await wait(300)
const claim = await page.evaluate(()=>{const b=[...document.querySelectorAll('*')].map(e=>e.textContent).find(t=>t&&/DUCATS · MIN/.test(t)); return document.body.innerText.match(/\d+\s+DUCATS · MIN \d+/)?.[0]||'?'})
console.log('CLAIM COUNT:', claim)
const g=await geom(page)
const clip={x:g.cL-8,y:g.cT-8,width:g.cW+16,height:g.cH+16}
await page.screenshot({path:`${OUT}/mobile_board3.png`, clip})
// focus bracket: Tab focus, park cursor on empty visible tile (5,5)
await page.evaluate(()=>document.querySelector('canvas').focus())
await page.keyboard.press('Tab').catch(()=>{})
await page.evaluate(()=>document.querySelector('canvas').focus())
await wait(100)
// default cursor row7col0; bring into view is hard, but bracket shows where cursor is; move toward (5,5)
for(let i=0;i<2;i++){await page.keyboard.press('ArrowUp');await wait(50)}
for(let i=0;i<5;i++){await page.keyboard.press('ArrowRight');await wait(50)}
await wait(200)
await page.screenshot({path:`${OUT}/mobile_focus3.png`, clip})
await browser.close()
