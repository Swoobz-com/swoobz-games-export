import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const tapText = async (page, txt) => {
  const h = await page.evaluateHandle((t)=>[...document.querySelectorAll('button')].find((b)=>b.textContent&&b.textContent.includes(t))||null, txt)
  const el=h.asElement(); if(!el) return false
  const box=await el.evaluate((e)=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})
  await page.mouse.click(box.x,box.y); return true
}
const browser = await puppeteer.launch({ executablePath: EXE, headless:'new', args:['--autoplay-policy=no-user-gesture-required'] })
const page=(await browser.pages())[0]
await page.setViewport({width:412,height:915,deviceScaleFactor:2,isMobile:true,hasTouch:true})
await page.goto(URL,{waitUntil:'networkidle0',timeout:60000}); await wait(500)
await tapText(page,'ENTER THE DIVE'); await wait(600)
const info = await page.evaluate(()=>{
  const c=document.querySelector('canvas'); const cr=c.getBoundingClientRect()
  // find nearest scrollable ancestor
  let el=c.parentElement, sc=null
  while(el){ const s=getComputedStyle(el); if(/(auto|scroll)/.test(s.overflowX+s.overflowY) || el.scrollWidth>el.clientWidth){ sc=el; break } el=el.parentElement }
  const scr = sc? sc.getBoundingClientRect():null
  return {
    canvas:{left:cr.left,top:cr.top,width:cr.width,height:cr.height},
    scroll: sc? {left:scr.left,top:scr.top,width:scr.width,height:scr.height,clientW:sc.clientWidth,clientH:sc.clientHeight,scrollLeft:sc.scrollLeft,scrollTop:sc.scrollTop,scrollW:sc.scrollWidth,scrollH:sc.scrollHeight}:null,
  }
})
console.log(JSON.stringify(info,null,2))
// what element is at a few probe points?
for(const [px,py] of [[206,400],[150,400],[300,400],[206,300],[206,500]]){
  const tag = await page.evaluate(({x,y})=>{const e=document.elementFromPoint(x,y); return e? e.tagName+'.'+(e.className||'').toString().slice(0,20):'null'},{x:px,y:py})
  console.log(`elementFromPoint(${px},${py}) = ${tag}`)
}
await browser.close()
