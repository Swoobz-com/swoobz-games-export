import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5182/'
const wait=(ms)=>new Promise(r=>setTimeout(r,ms))
const clickText=(page,re)=>page.evaluate((rs)=>{const r=new RegExp(rs,'i');const b=[...document.querySelectorAll('button,div,span')].find(x=>r.test((x.textContent||'').trim())&&(x.tagName==='BUTTON'||getComputedStyle(x).cursor==='pointer'));if(b){b.click();return true}return false},re.source)
const browser=await puppeteer.launch({executablePath:EXE,headless:'new',defaultViewport:null})
const page=await browser.newPage()
await page.setViewport({width:412,height:915,deviceScaleFactor:2})
await page.goto(URL,{waitUntil:'load'});await wait(450)
await page.keyboard.press('Escape').catch(()=>{})
await clickText(page,/ENTER THE DIVE/);await wait(350)
await clickText(page,/REEF/);await wait(200)
const info=await page.evaluate(()=>{
  const c=document.querySelector('canvas');const r=c.getBoundingClientRect()
  const pts=[[44,85],[136,85],[228,85]]
  const hits=pts.map(([x,y])=>{const el=document.elementFromPoint(x,y);return{x,y,tag:el?el.tagName:null,cls:el?(el.className||'').toString().slice(0,30):null,isCanvas:el===c,cursor:el?getComputedStyle(el).cursor:null}})
  // does canvas have pointer/click listeners? check parent scroll
  const sc=c.parentElement
  return {canvasRect:{left:r.left,top:r.top,w:r.width,h:r.height},hits,scrollParent:{tag:sc.tagName,overflowX:getComputedStyle(sc).overflowX,scrollLeft:sc.scrollLeft,cls:(sc.className||'').toString().slice(0,40)}}
})
console.log(JSON.stringify(info,null,2))
// try clicking via dispatching pointer + mouse events directly on canvas center of a tile
await page.evaluate(()=>{
  const c=document.querySelector('canvas');const r=c.getBoundingClientRect()
  const TILE=r.width/14
  const fire=(x,y)=>{for(const type of ['pointerdown','mousedown','pointerup','mouseup','click']){const ev=new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,view:window});c.dispatchEvent(ev)}}
  for(let i=0;i<8;i++){const x=r.left+(i+0.5)*TILE, y=r.top+0.5*TILE; fire(x,y)}
})
await wait(300)
const btn=await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/RUN THE LINE/i.test(x.textContent||''));return b?{text:b.textContent.trim(),disabled:b.disabled}:null})
console.log('after synthetic dispatch, RUN:',JSON.stringify(btn))
await browser.close()
