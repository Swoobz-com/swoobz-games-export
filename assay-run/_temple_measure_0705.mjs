import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5182/'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:null,args:['--autoplay-policy=no-user-gesture-required',`--window-size=432,1055`]})
const page=(await browser.pages())[0]
await page.setViewport({width:412,height:915,deviceScaleFactor:2,isMobile:true,hasTouch:true})
await page.goto(URL,{waitUntil:'networkidle2',timeout:60000})
await wait(1200)
const m=await page.evaluate(()=>{
  const out={}
  // backdrop svg (viewBox 0 0 412 158)
  const svg=[...document.querySelectorAll('svg')].find(s=>s.getAttribute('viewBox')==='0 0 412 158')
  if(svg){const r=svg.getBoundingClientRect();out.backdrop={top:r.top,left:r.left,w:r.width,h:r.height}}
  // card: div whose backgroundImage has the CARD_BG gradient (rgb(74, 46, 22))
  const card=[...document.querySelectorAll('div')].find(d=>{const bg=getComputedStyle(d).backgroundImage;return bg.includes('linear-gradient')&&bg.includes('74, 46, 22')&&d.getBoundingClientRect().width>200})
  if(card){const r=card.getBoundingClientRect();out.card={top:r.top,left:r.left,w:r.width,h:r.height}}
  // PLAY SAFE pill
  const ps=[...document.querySelectorAll('*')].find(e=>{const t=e.textContent&&e.textContent.trim();return t==='PLAY SAFE'&&e.children.length===0})
  if(ps){const r=ps.getBoundingClientRect();out.playsafe={top:r.top,left:r.left,right:r.right,bottom:r.bottom,w:r.width,h:r.height}}
  // coachmark: element containing coachmark text
  const cm=[...document.querySelectorAll('div')].find(d=>/tap|mark|claim line|disc/i.test(d.textContent||'')&&d.getBoundingClientRect().top<200&&d.getBoundingClientRect().width<412&&d.getBoundingClientRect().width>150&&getComputedStyle(d).position==='absolute')
  if(cm){const r=cm.getBoundingClientRect();out.coachmark={top:r.top,left:r.left,right:r.right,bottom:r.bottom}}
  out.dpr=window.devicePixelRatio
  return out
})
console.log(JSON.stringify(m,null,2))
await browser.close()
