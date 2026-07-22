import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5182/'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const clickText=async(page,txt)=>{const h=await page.evaluateHandle(t=>{const b=[...document.querySelectorAll('button')];return b.find(x=>x.textContent&&x.textContent.includes(t))||null},txt);const el=h.asElement();if(!el)return false;await el.click();return true}
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:null,args:['--autoplay-policy=no-user-gesture-required',`--window-size=432,1055`]})
const page=(await browser.pages())[0]
await page.setViewport({width:412,height:915,deviceScaleFactor:2,isMobile:true,hasTouch:true})
await page.goto(URL,{waitUntil:'networkidle2',timeout:60000})
await wait(1000)
await clickText(page,'ENTER THE ASSAY LINE')
await wait(1200)
const m=await page.evaluate(()=>{
  const out={}
  const svg=[...document.querySelectorAll('svg')].find(s=>s.getAttribute('viewBox')==='0 0 412 158')
  if(svg){const r=svg.getBoundingClientRect();out.backdrop={top:r.top,h:r.height}}
  const cards=[...document.querySelectorAll('div')].filter(d=>{const bg=getComputedStyle(d).backgroundImage;return bg.includes('linear-gradient')&&bg.includes('74, 46, 22')&&d.getBoundingClientRect().width>200}).map(d=>{const r=d.getBoundingClientRect();return{top:Math.round(r.top),left:Math.round(r.left),w:Math.round(r.width),h:Math.round(r.height)}})
  out.cards=cards
  const ps=[...document.querySelectorAll('*')].find(e=>{const t=e.textContent&&e.textContent.trim();return t==='PLAY SAFE'&&e.children.length===0})
  if(ps){const r=ps.getBoundingClientRect();out.playsafe={top:Math.round(r.top),left:Math.round(r.left),right:Math.round(r.right),bottom:Math.round(r.bottom)}}
  // coachmark: find any absolutely/fixed positioned banner in top region with instructional text
  const cm=[...document.querySelectorAll('div')].filter(d=>{const t=(d.textContent||'');const r=d.getBoundingClientRect();const pos=getComputedStyle(d).position;return /disc|claim|mark|tap|run the line|line/i.test(t)&&t.length<160&&r.width>150&&r.width<412&&r.top<160&&(pos==='absolute'||pos==='fixed')}).map(d=>{const r=d.getBoundingClientRect();return{top:Math.round(r.top),left:Math.round(r.left),right:Math.round(r.right),bottom:Math.round(r.bottom),txt:(d.textContent||'').slice(0,40)}})
  out.coachmarks=cm.slice(0,4)
  return out
})
console.log(JSON.stringify(m,null,2))
await browser.close()
