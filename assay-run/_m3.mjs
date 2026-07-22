import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:null,args:['--window-size=432,1055']})
const page=(await browser.pages())[0]
await page.setViewport({width:412,height:915,deviceScaleFactor:2,isMobile:true,hasTouch:true})
await page.goto('http://localhost:5182/',{waitUntil:'networkidle2'})
await new Promise(r=>setTimeout(r,1200))
const m=await page.evaluate(()=>{
  const marks=[...document.querySelectorAll('*')].filter(e=>{const t=e.textContent&&e.textContent.trim();const r=e.getBoundingClientRect();return t==='SWOOBZ'&&r.top<40&&r.width>10}).map(e=>{const r=e.getBoundingClientRect();return{top:Math.round(r.top),left:Math.round(r.left),right:Math.round(r.right),bottom:Math.round(r.bottom)}})
  return {swoobz:marks}
})
console.log(JSON.stringify(m))
await browser.close()
